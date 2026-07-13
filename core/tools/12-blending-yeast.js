// ==========================================================================
// Blending calculator, cross-batch yeast analytics.
// Split out of the former 12-features2.js. Globals, no behaviour change.
// ==========================================================================

// ==================== BLENDING CALCULATOR ====================
function renderBlendingTool(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&bottlesOnHand(APP.bottling[b.id])>0;});
  if(bottled.length<1){
    return'<div class="card"><div class="card-header"><div class="card-title">🥂 BLENDING CALCULATOR</div></div>'
      +'<div style="color:var(--text3);font-style:italic;padding:10px 0;font-size:13px">You need at least 1 bottled batch with bottles on-hand to blend (with another batch, or with water to lower strength). Currently you have '+bottled.length+'.</div></div>';
  }
  var opts=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    return'<option value="'+b.id+'">'+escHtml(b.name)+' · '+(bot.abv||'?')+'% ABV · '+(bot.sweetness||'—')+' · '+bottlesOnHand(bot)+' avail</option>';
  }).join('');
  // Water as a B-side option — classic dilution of an over-strong mead.
  var optsB=opts+'<option value="__water">Plain water · 0% ABV (dilution)</option>';
  var idA=window._blendA||bottled[0].id;
  var idB=window._blendB||(bottled[1]?bottled[1].id:'__water');
  var ratioA=window._blendRatio||50;
  // Pre-compute the initial output HTML inline. Previously this used a trailing
  // <script>updateBlendOutput()<\/script> tag, but main.innerHTML=... refuses to
  // execute inline <script> nodes — so the output stayed blank until the user
  // first interacted with a control. By computing the markup here we render
  // useful output on first paint.
  var initialOutput=computeBlendOutputHTML(idA,idB,ratioA);
  return'<div class="card"><div class="card-header"><div class="card-title">🥂 BLENDING CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Blend two bottled meads in any ratio to predict the resulting ABV, sweetness, and per-litre cost. Useful for dialing in a balanced finish before committing.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Batch A</label><select class="form-select" id="blend-a" onchange="window._blendA=this.value;renderMain()">'+opts.replace('value="'+idA+'"','value="'+idA+'" selected')+'</select></div>'
    +'<div class="form-group"><label class="form-label">Batch B</label><select class="form-select" id="blend-b" onchange="window._blendB=this.value;renderMain()">'+optsB.replace('value="'+idB+'"','value="'+idB+'" selected')+'</select></div></div>'
    +'<div class="form-group"><label class="form-label">Total blend volume (L) — for the litre breakdown</label><input class="form-input" id="blend-vol" type="number" min="0.1" step="0.1" value="'+(window._blendVol||5)+'" oninput="window._blendVol=parseFloat(this.value)||5;updateBlendOutput()"></div>'
    +'<div class="form-group"><label class="form-label">Blend Ratio · A : B = <span id="blend-ratio-display">'+ratioA+' : '+(100-ratioA)+'</span></label>'
    +'<input type="range" min="10" max="90" step="5" value="'+ratioA+'" id="blend-ratio" oninput="window._blendRatio=parseInt(this.value);document.getElementById(\'blend-ratio-display\').textContent=this.value+\' : \'+(100-this.value);updateBlendOutput()" style="width:100%;cursor:pointer"></div>'
    +'<div id="blend-output" style="margin-top:14px">'+initialOutput+'</div>'
    +'<button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="createBlendedBatch()" title="Commit this blend as a new batch with lineage back to its sources">🥂 '+(appLang()==='nl'?'Maak er een partij van':'Create as a batch')+'</button>'
    +'</div>';
}

// Commit the current blend selection as a new batch, volume-weighting OG/FG/ABV
// from the sources and recording lineage in blendOf. ponytail: no auto bottle-
// deduction from sources — adjust source counts by hand if needed.
function createBlendedBatch(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var idA=window._blendA,idB=window._blendB,fa=(window._blendRatio||50)/100,vol=parseFloat(window._blendVol)||5;
  var bA=getBatch(idA);
  if(!bA||!APP.bottling[bA.id]){toast(nl?'⚠ Kies geldige partijen':'⚠ Pick valid batches');return;}
  var isWater=(idB==='__water'),botA=APP.bottling[bA.id];
  var bB=isWater?null:getBatch(idB);
  if(!isWater&&(!bB||!APP.bottling[bB.id])){toast(nl?'⚠ Kies geldige partijen':'⚠ Pick valid batches');return;}
  var botB=isWater?null:APP.bottling[bB.id];
  function abvOf(b,bot){return bot.abv?parseFloat(bot.abv):((b.og&&bot.fg)?parseFloat(calcABV(b.og,bot.fg)):null);}
  var partA={og:parseFloat(bA.og)||null,fg:parseFloat(botA.fg)||null,abv:abvOf(bA,botA),vol:fa*vol};
  var partB=isWater?{og:1.000,fg:1.000,abv:0,vol:(1-fa)*vol}:{og:parseFloat(bB.og)||null,fg:parseFloat(botB.fg)||null,abv:abvOf(bB,botB),vol:(1-fa)*vol};
  var r=mwBlend([partA,partB]);
  var defName='Blend: '+bA.name+' + '+(isWater?(nl?'water':'water'):bB.name);
  var name=prompt(nl?'Naam voor de blend:':'Name for the blend:',defName);
  if(!name||!name.trim())return;
  var nb={id:genId(),name:name.trim(),recipeId:bA.recipeId,startDate:today(),volume:Math.round(vol*100)/100,
    og:r.og!=null?Math.round(r.og*1000)/1000:bA.og,yeast:bA.yeast,honeyType:bA.honeyType,
    blendOf:[{batchId:idA,fraction:Math.round(fa*100)/100},{batchId:isWater?'__water':idB,fraction:Math.round((1-fa)*100)/100}]};
  APP.batches.push(nb);
  if(!APP.logs)APP.logs={};
  APP.logs[nb.id]=[{id:genId(),date:today(),gravity:r.fg!=null?Math.round(r.fg*1000)/1000:null,note:(nl?'Blend samengesteld':'Blend composed')}];
  if(typeof saveData==='function')saveData();
  showView('batch',nb.id);
  toast('🥂 '+(nl?'Blend aangemaakt':'Blend created')+(r.abv!=null?' · '+r.abv.toFixed(1)+'%':''));
}

// Pure-data version of the blend rendering. Returns HTML string for the
// blend-output container based on the two selected batch IDs and ratio.
// Shared between initial render (renderBlendingTool) and live update
// (updateBlendOutput).
function computeBlendOutputHTML(idA,idB,ratioA){
  if(!idA||!idB)return'';
  var bA=getBatch(idA);
  if(!bA)return'';
  var botA=APP.bottling[bA.id];
  if(!botA)return'';
  // Batch B may be the synthetic "water" entry — a 0% ABV, FG 1.000, no-cost,
  // no-flavour diluent. This is the classic fix for an over-strong or
  // over-sweet mead. Treat it as a pseudo-batch so the rest of the math is
  // identical.
  var isWater=(idB==='__water');
  var bB=isWater?null:getBatch(idB);
  var botB=isWater?null:(bB&&APP.bottling[bB.id]);
  if(!isWater&&(!bB||!botB))return'';
  var fa=ratioA/100,fb=1-fa;
  var abvA=botA.abv||(bA.og&&botA.fg?parseFloat(calcABV(bA.og,botA.fg)):null);
  var abvB=isWater?0:(botB.abv||(bB.og&&botB.fg?parseFloat(calcABV(bB.og,botB.fg)):null));
  var blendedABV=(abvA!=null&&abvB!=null)?(abvA*fa+abvB*fb):null;
  var fgA=botA.fg||1.010;
  var fgB=isWater?1.000:(botB.fg||1.010);
  var blendedFG=fgA*fa+fgB*fb;
  // Blending assumes both batches share a beverage type (blending mead with
  // cider isn't a real workflow this app supports elsewhere), so batch A's
  // own scale — mead's 6 labels or cider's 4 — drives the index for both.
  var sLabels=sweetnessScaleFor(bA.beverageType).map(function(s){return s.label;});
  var neutralIdx=Math.floor((sLabels.length-1)/2);
  var sweetIdxOf=function(label){var i=sLabels.indexOf(label);return i>=0?i:neutralIdx;};
  // Water has no sugar — pull sweetness DOWN toward bone-dry, scaled by how
  // much water is in the blend, rather than parking it at the neutral midpoint.
  var sA=sweetIdxOf(botA.sweetness||'');
  var sB=isWater?0:sweetIdxOf(botB.sweetness||'');
  var sIdx=sA*fa+sB*fb;
  var blendedSweet=sLabels[Math.round(Math.max(0,Math.min(sLabels.length-1,sIdx)))];
  var ccy=APP.settings.currency||'€';
  var costA=(bA.cost&&bottlesOriginal(botA)>0)?((bA.cost.honey||0)+(bA.cost.extras||0))/bottlesOriginal(botA):0;
  var costB=isWater?0:((bB.cost&&bottlesOriginal(botB)>0)?((bB.cost.honey||0)+(bB.cost.extras||0))/bottlesOriginal(botB):0);
  var blendedCost=costA*fa+costB*fb;
  var colorA=getBatchColor(bA),colorB=isWater?'#5a7a8a':getBatchColor(bB);
  var nameB=isWater?'Water':bB.name;
  // Litre breakdown for the chosen total volume — what you actually pour.
  var totVol=window._blendVol||5;
  var litA=totVol*fa, litB=totVol*fb;
  var unit=(typeof currentUnitSystem==='function'&&currentUnitSystem()!=='metric');
  function volStr(L){
    if(!unit)return L.toFixed(2)+' L';
    var q=L*1.05669; return L.toFixed(2)+' L ('+q.toFixed(2)+' qt)';
  }
  return'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px">'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)">'+(blendedABV!=null?blendedABV.toFixed(1)+'%':'—')+'</div><div class="micro-label">BLENDED ABV</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--blue2)">'+blendedFG.toFixed(3)+'</div><div class="micro-label">BLENDED FG</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:16px;color:var(--text2);font-style:italic">'+blendedSweet+'</div><div class="micro-label">PROFILE</div></div>'
    +(blendedCost>0?'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--green2)">'+ccy+blendedCost.toFixed(2)+'</div><div class="micro-label">PER-BOTTLE COST</div></div>':'')
    +'</div>'
    +'<div style="display:flex;gap:0;height:40px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);margin-bottom:8px">'
    +'<div style="width:'+ratioA+'%;background:'+colorA+';display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-display);font-size:12px;letter-spacing:1px">'+escHtml(bA.name.slice(0,18))+(bA.name.length>18?'…':'')+' · '+ratioA+'%</div>'
    +'<div style="width:'+(100-ratioA)+'%;background:'+colorB+';display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-display);font-size:12px;letter-spacing:1px">'+escHtml(nameB.slice(0,18))+(nameB.length>18?'…':'')+' · '+(100-ratioA)+'%</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:8px;font-family:var(--font-mono);font-size:11.5px;color:var(--text2)">'
    +'<div style="flex:1;text-align:center;padding:7px;background:var(--bg4);border-radius:var(--radius)"><span style="color:'+colorA+'">●</span> '+escHtml(bA.name.slice(0,16))+': <strong>'+volStr(litA)+'</strong></div>'
    +'<div style="flex:1;text-align:center;padding:7px;background:var(--bg4);border-radius:var(--radius)"><span style="color:'+colorB+'">●</span> '+escHtml(nameB.slice(0,16))+': <strong>'+volStr(litB)+'</strong></div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;text-align:center">Approximate values. Sweetness blends linearly on a '+sLabels.length+'-point scale; real blending may shift slightly with carbonation, oxidation, or rest time. '+(isWater?'Diluting with water also thins body and aroma — taste as you go.':'Bench-trial a small measured blend before committing the whole batch.')+'</div>';
}

function updateBlendOutput(){
  var idA=window._blendA||(document.getElementById('blend-a')&&document.getElementById('blend-a').value);
  var idB=window._blendB||(document.getElementById('blend-b')&&document.getElementById('blend-b').value);
  var ratioA=window._blendRatio||50;
  var out=document.getElementById('blend-output');
  if(!out)return;
  out.innerHTML=computeBlendOutputHTML(idA,idB,ratioA);
}

// ==================== CROSS-BATCH YEAST ANALYTICS ====================
function renderYeastAnalytics(){
  // Group bottled batches by yeast (or 'M05' default if not set)
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length)return'';
  var byYeast={};
  bottled.forEach(function(b){
    var yeast=b.yeast||'M05';
    if(!byYeast[yeast])byYeast[yeast]={batches:[],attenuations:[],abvs:[],ferments:[],ogToFG:[]};
    byYeast[yeast].batches.push(b);
    var bot=APP.bottling[b.id];
    if(b.og&&bot.fg){
      byYeast[yeast].attenuations.push(((b.og-bot.fg)/(b.og-1))*100);
      byYeast[yeast].ogToFG.push({og:b.og,fg:bot.fg});
    }
    if(bot.abv)byYeast[yeast].abvs.push(bot.abv);
    if(bot.date){
      var ferment=Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000);
      if(ferment>0&&ferment<400)byYeast[yeast].ferments.push(ferment);
    }
  });
  function stats(arr){
    if(!arr.length)return null;
    var sum=arr.reduce(function(a,v){return a+v;},0);
    return{avg:sum/arr.length,min:Math.min.apply(null,arr),max:Math.max.apply(null,arr),n:arr.length};
  }
  var cards=Object.keys(byYeast).map(function(yeast){
    var d=byYeast[yeast];
    var attS=stats(d.attenuations);
    var abvS=stats(d.abvs);
    var fermS=stats(d.ferments);
    // Color for yeast
    var c=yeast==='M05'?'#c9a84c':yeast==='K1V-1116'?'#8a3838':yeast==='71B'?'#5a8db8':yeast==='EC-1118'?'#6a8a4a':'#a0a0a0';
    return'<div style="background:var(--bg3);border:1px solid var(--border);border-left:3px solid '+c+';border-radius:var(--radius);padding:14px;margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><div style="font-family:var(--font-display);font-size:15px;color:'+c+';letter-spacing:1.5px">'+escHtml(yeast)+'</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">'+d.batches.length+' batch'+(d.batches.length!==1?'es':'')+'</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px">'
      +(attS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+attS.avg.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG ATTEN.</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+attS.min.toFixed(0)+'–'+attS.max.toFixed(0)+'%</div></div>':'')
      +(abvS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+abvS.avg.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG ABV</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+abvS.min.toFixed(1)+'–'+abvS.max.toFixed(1)+'%</div></div>':'')
      +(fermS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+fmtDurationCompact(Math.round(fermS.avg))+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG FERMENT</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+fmtDurationCompact(fermS.min)+'–'+fmtDurationCompact(fermS.max)+'</div></div>':'')
      +'</div>'
      +(yeast==='M05'&&attS?'<div style="font-size:11px;color:var(--text3);margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-style:italic">Mangrove Jack spec: 95-100% attenuation, up to 18% ABV tolerance. Your '+attS.avg.toFixed(1)+'% '+(attS.avg<90?'is below spec — check temp/nutrients':attS.avg>95?'matches the published profile':'is close to spec')+'.</div>':'')
      +'</div>';
  }).join('');
  return'<div><div class="card-header" style="margin-bottom:10px"><div class="card-title">🧪 YEAST PERFORMANCE · LONGITUDINAL</div></div>'+cards+'</div>';
}
