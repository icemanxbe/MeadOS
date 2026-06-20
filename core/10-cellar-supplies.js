// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// cellar, label images, storage-box labels, compare, supplies, suppliers
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== BOTTLE AGING HELPERS ====================
function bottleDaysAged(b){
  var bot=APP.bottling[b.id];
  if(!bot||!bot.date)return null;
  return daysSince(bot.date);
}

function getAgingProfile(b){
  // Returns { minDays, peakDays, maxDays } pulled from recipe or sensible defaults
  var r=APP.recipes.find(function(x){return x.id===b.recipeId;});
  if(r&&r.peakAgeDays)return{minDays:r.minAgeDays||30,peakDays:r.peakAgeDays,maxDays:r.maxAgeDays||(r.peakAgeDays*3)};
  return{minDays:60,peakDays:180,maxDays:730};
}

function getAgingStatus(daysAged,profile){
  if(daysAged===null||daysAged===undefined)return{key:'unknown',label:'No bottle date'};
  if(daysAged<profile.minDays)return{key:'not-ready',label:'Maturing'};
  if(daysAged<profile.peakDays*0.7)return{key:'maturing',label:'Drinkable'};
  if(daysAged<profile.peakDays*1.3)return{key:'peak',label:'At Peak'};
  if(daysAged<profile.maxDays)return{key:'past-peak',label:'Past Peak'};
  return{key:'declining',label:'Drink Now'};
}

function fmtDaysShort(d){
  if(d===null)return'—';
  if(d<60)return d+'d';
  if(d<730)return Math.round(d/30)+'mo';
  return(d/365).toFixed(1)+'y';
}

// Visual icon grid: shows the initial bottle count (at bottling time) per
// size, with bottles that are no longer in cellar/fridge/other greyed out.
// 500ml = narrow icon, 750ml = standard, 1000ml+ = wider. So you can scan
// size at a glance.
function renderBottleIconRow(bot,batchId){
  var sizes=activeBottleSizes(bot);
  if(!sizes||!sizes.length)return'';
  var rows=sizes.map(function(size){
    var original=bottlesOriginalBySize(bot,size);
    if(!original)return'';
    var onHand=bottlesInLocationBySize(bot,'cellar',size)+bottlesInLocationBySize(bot,'fridge',size)+bottlesInLocationBySize(bot,'other',size);
    var drunk=bottlesInLocationBySize(bot,'gifted',size);
    var w=Math.max(8,Math.min(20,Math.round(8+(parseInt(size)/750)*5)));
    var h=Math.round(w*2.6);
    var icons=[];
    for(var i=0;i<original;i++){
      var inStock=i<onHand;
      var col=inStock?'#3a6d52':'#3a302a';
      var capCol=inStock?'#a07a32':'#5a4a40';
      var op=inStock?'1':'0.35';
      icons.push(
        '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="opacity:'+op+';display:inline-block;vertical-align:bottom" title="'+(inStock?'In stock':'Gone — drunk or gifted')+'">'
        +'<rect x="'+(w*0.35)+'" y="0" width="'+(w*0.3)+'" height="'+(h*0.06)+'" fill="'+capCol+'"/>'
        +'<rect x="'+(w*0.4)+'" y="'+(h*0.06)+'" width="'+(w*0.2)+'" height="'+(h*0.22)+'" fill="'+col+'"/>'
        +'<path d="M '+(w*0.4)+' '+(h*0.28)+' L '+(w*0.15)+' '+(h*0.36)+' L '+(w*0.15)+' '+(h*0.94)+' Q '+(w*0.15)+' '+h+' '+(w*0.3)+' '+h+' L '+(w*0.7)+' '+h+' Q '+(w*0.85)+' '+h+' '+(w*0.85)+' '+(h*0.94)+' L '+(w*0.85)+' '+(h*0.36)+' L '+(w*0.6)+' '+(h*0.28)+' Z" fill="'+col+'"/>'
        +'<rect x="'+(w*0.2)+'" y="'+(h*0.42)+'" width="'+(w*0.06)+'" height="'+(h*0.4)+'" fill="rgba(255,255,255,0.18)"/>'
        +'</svg>'
      );
    }
    var sizeLabel=size+'ml';
    var summary=onHand+' / '+original+(drunk?' · '+drunk+' gifted':'');
    return'<div style="margin:6px 0">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px"><span>'+sizeLabel+'</span><span>'+summary+'</span></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:2px;align-items:flex-end;background:var(--bg);padding:6px 8px;border-radius:4px;border:1px solid var(--border)">'+icons.join('')+'</div>'
      +'</div>';
  }).join('');
  return rows?'<div style="margin-bottom:10px">'+rows+'</div>':'';
}

// ==================== CELLAR VIEW (Bottle Aging) ====================
// Cellar live-temp pill — surfaces a small pill next to the page title when
// a cellar sensor is bound and reporting. Hidden completely otherwise so
// the UI stays clean for users without sensor integration.
function renderCellarTempPill(){
  if(typeof getCellarLiveTemp!=='function')return'';
  var t=getCellarLiveTemp();
  if(!t)return'';
  var zone=cellarTempZone(t.value);
  var color={optimal:'#7aa850',cold:'#7aa8c0',warm:'#c89040',danger:'#c83030'}[zone]||'var(--text3)';
  return'<span title="'+escHtml(cellarTempZoneLabel(zone))+' · live from '+escHtml(APP.settings.cellarTempSensorEntity)+'" style="font-family:var(--font-mono);font-size:11px;background:'+color+'22;color:'+color+';border:1px solid '+color+'55;padding:3px 9px;border-radius:10px;letter-spacing:0.5px;display:inline-flex;align-items:center;gap:4px;margin-left:10px;vertical-align:middle">🌡 '+t.value.toFixed(1)+t.unit+'</span>';
}

function renderCellar(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&APP.bottling[b.id].date;});
  if(!bottled.length){
    return'<div class="page-title">The Cellar</div><div class="page-subtitle">Bottle Aging Tracker</div>'
      +'<div class="empty-state"><div class="es-icon">🍾</div><p>No bottled batches yet.</p><br>'
      +'<p style="font-size:13px">Bottles you record will appear here with aging progress against optimal drinking windows.</p>'
      +'<p style="margin-top:18px"><button class="btn btn-secondary btn-sm" onclick="showView(\'cellar-map\')" title="Configure your storage cabinet with shelves and sensors">🏠 My Cellar →</button></p></div>';
  }
  // Finished batches (bottled, then every bottle drunk or gifted away) are
  // hidden by default so the cellar shows only what you can still pour. A
  // toggle reveals them. Batches that read 0-on-hand but were never filled in
  // ("needs fill") stay visible so they can still be resolved.
  function isFinishedBatch(b){
    var bot=APP.bottling[b.id];
    if(!bot||bottlesOnHand(bot)>0||bottlesOriginal(bot)<=0)return false;
    return !!(bot.cellarFilled||(APP.tastings[b.id]||[]).length||(bot.gifts&&bot.gifts.length));
  }
  var showFinished=!!window._cellarShowFinished;
  var finishedCount=bottled.filter(isFinishedBatch).length;
  if(!showFinished)bottled=bottled.filter(function(b){return!isFinishedBatch(b);});
  // Reusable toggle chip (shown whenever any finished batch exists).
  var finishedToggle=finishedCount?'<button class="btn btn-secondary btn-sm" onclick="window._cellarShowFinished='+(showFinished?'false':'true')+';renderMain()" style="margin-left:8px">'+(showFinished?'🙈 Hide '+finishedCount+' finished':'👁 Show '+finishedCount+' finished')+'</button>':'';
  if(!bottled.length){
    return'<div class="page-title">The Cellar</div><div class="page-subtitle">Bottle Aging Tracker</div>'
      +'<div class="empty-state"><div class="es-icon">🍷</div><p>Cellar is empty — all bottles drunk or gifted.</p><br>'
      +'<p style="font-size:13px">Finished batches are kept in the Batches view as history.'+(finishedCount?' '+finishedToggle:'')+'</p></div>';
  }
  // Sort by user-selected criterion. Default: aging status (peak → ready →
  // past-peak → maturing → not-ready → declining), which surfaces actionable
  // batches first. State lives in window._cellarSort (in-memory only).
  window._cellarSort=window._cellarSort||'status';
  var statusOrder={peak:0,ready:1,'past-peak':2,maturing:3,'not-ready':4,declining:5,unknown:6};
  var sortKey=window._cellarSort;
  bottled.sort(function(a,b){
    var bota=APP.bottling[a.id],botb=APP.bottling[b.id];
    if(sortKey==='oldest'){
      return(bota.date||'').localeCompare(botb.date||'');
    }
    if(sortKey==='newest'){
      return(botb.date||'').localeCompare(bota.date||'');
    }
    if(sortKey==='name'){
      return(a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'});
    }
    if(sortKey==='bottles'){
      return bottlesOnHand(botb)-bottlesOnHand(bota);
    }
    if(sortKey==='abv'){
      return(parseFloat(botb.abv)||0)-(parseFloat(bota.abv)||0);
    }
    // Default: 'status'
    var sa=getAgingStatus(bottleDaysAged(a),getAgingProfile(a));
    var sb=getAgingStatus(bottleDaysAged(b),getAgingProfile(b));
    return(statusOrder[sa.key]||9)-(statusOrder[sb.key]||9);
  });

  // Stats
  var totalBottlesAll=bottled.reduce(function(s,b){return s+totalBottles(APP.bottling[b.id]);},0);
  var totalCellar=bottled.reduce(function(s,b){return s+bottlesInCellar(APP.bottling[b.id]);},0);
  var atPeak=bottled.filter(function(b){return getAgingStatus(bottleDaysAged(b),getAgingProfile(b)).key==='peak';}).length;
  var ready=bottled.filter(function(b){var k=getAgingStatus(bottleDaysAged(b),getAgingProfile(b)).key;return k==='peak'||k==='past-peak';}).length;
  // Total cellar value (cost of bottles still in cellar+fridge) — with
  // optional age multiplier reflecting that mature mead is worth more than
  // cost basis. Multipliers: ramping from 1.0× at bottling → 1.5× at peak →
  // 0.7× past max-drink-by (oxidation discount).
  var ccy=APP.settings.currency||'€';
  function ageMultiplier(b){
    var bot=APP.bottling[b.id];
    if(!bot)return 1.0;
    var profile=(typeof getAgingProfile==='function')?getAgingProfile(b):null;
    if(!profile)return 1.0;
    var aged=(typeof bottleDaysAged==='function')?bottleDaysAged(b):0;
    if(aged<=0)return 1.0;
    if(aged>=profile.maxDays)return 0.7;
    if(aged>=profile.peakDays)return 1.5;
    // Linear ramp from 1.0 (at bottling) to 1.5 (at peak)
    return 1.0+0.5*(aged/profile.peakDays);
  }
  var inStockValue=bottled.reduce(function(s,b){
    if(!b.cost)return s;
    var bot=APP.bottling[b.id];
    var perL=costPerLitre(b,bot);
    if(!perL)return s;
    var onHandML=totalVolumeMLOnHand(bot);
    return s+(perL*(onHandML/1000));
  },0);
  var matureValue=bottled.reduce(function(s,b){
    if(!b.cost)return s;
    var bot=APP.bottling[b.id];
    var perL=costPerLitre(b,bot);
    if(!perL)return s;
    var onHandML=totalVolumeMLOnHand(bot);
    return s+(perL*(onHandML/1000)*ageMultiplier(b));
  },0);
  var hasCostData=bottled.some(function(b){return b.cost;});

  var cards=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    // bot.locations is guaranteed to be present and properly size-keyed by
    // applyState's normalization. Earlier this had a defensive fallback that
    // would create the wrong (number-shaped) layout if it ever ran — removed
    // since it was unreachable and would corrupt if hit.
    var aged=bottleDaysAged(b);
    var profile=getAgingProfile(b);
    var status=getAgingStatus(aged,profile);
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var color=getBatchColor(b);
    var pct=Math.min(100,(aged/profile.maxDays)*100);
    var minPct=(profile.minDays/profile.maxDays)*100;
    var peakPct=(profile.peakDays/profile.maxDays)*100;
    var gradientColor=color;
    if(status.key==='peak')gradientColor='linear-gradient(90deg,'+color+',var(--gold2))';
    else if(status.key==='past-peak')gradientColor='linear-gradient(90deg,'+color+',var(--honey))';
    else if(status.key==='declining')gradientColor='linear-gradient(90deg,'+color+',var(--red2))';

    var nextMilestone='';
    if(aged<profile.minDays)nextMilestone='Ready in '+(profile.minDays-aged)+' days';
    else if(aged<profile.peakDays)nextMilestone='Peak in '+(profile.peakDays-aged)+' days';
    else if(aged<profile.maxDays)nextMilestone=(profile.maxDays-aged)+' days until past prime';
    else nextMilestone='Drink remaining bottles';

    var total=totalBottles(bot);
    var origCount=bottlesOriginal(bot);
    // "Needs fill" only when the cellar was genuinely never populated — NOT when
    // a batch was bottled, placed, and then drunk/gifted down to zero (that's
    // just Finished). cellarFilled is set whenever bottles are placed or drunk.
    var inconsistent=(total===0&&origCount>0&&!bot.cellarFilled&&!(APP.tastings[b.id]||[]).length&&!(bot.gifts&&bot.gifts.length));
    var statusBadgeText=total===0?(origCount>0?(inconsistent?'⚠ NEEDS FILL':'Finished'):'Finished'):status.label;
    var statusBadgeClass=total===0?(inconsistent?'finished':'finished'):status.key;
    // Expand state: default collapsed. Auto-expand batches that need attention
    // (the "NEEDS FILL" recovery banner is critical info — show it open).
    window._cellarExpanded=window._cellarExpanded||{};
    if(inconsistent&&window._cellarExpanded[b.id]==null)window._cellarExpanded[b.id]=true;
    var isOpen=!!window._cellarExpanded[b.id];

    // Compact header — always visible. Tap toggles expansion.
    var ccy=APP.settings.currency||'€';
    var perLStr=(b.cost&&costPerLitre(b,bot)>0)?ccy+costPerLitre(b,bot).toFixed(2)+'/L':'';
    // Build per-size bottle price string for each active bottle size, e.g.
    // "€4.50/750ml · €3.00/500ml". Only computed when we have cost data.
    var perBottleStr='';
    if(b.cost&&costPerLitre(b,bot)>0){
      var activeSizes=activeBottleSizes(bot);
      if(activeSizes.length){
        perBottleStr=activeSizes.map(function(sz){
          return ccy+costForBottle(b,bot,sz).toFixed(2)+'/'+sz+'ml';
        }).join(' · ');
      }
    }
    var onHandSummary=fmtBottleSummary(bot);
    // Aging duration — days since this batch was bottled. Coloured by the
    // same aging-status palette as the badge on the right so you can read
    // the maturity at a glance without expanding the card.
    //   green  → past minDays, before peak (drinkable, still maturing)
    //   gold   → in the peak window
    //   amber  → past peak, approaching max
    //   red    → past max (drink soon)
    //   gray   → still in the early/maturing phase before minDays
    var agingDayCount=bottleDaysAged(b);
    var agingStr='';
    if(agingDayCount!=null){
      var agingColor='var(--text3)';
      if(status.key==='peak')agingColor='var(--gold2)';
      else if(status.key==='past-peak')agingColor='#d4a040';
      else if(status.key==='past-max')agingColor='var(--red2)';
      else if(status.key==='drinkable')agingColor='var(--green2)';
      agingStr=' · <span style="color:'+agingColor+';font-family:var(--font-mono);font-size:11px">'+fmtDuration(agingDayCount)+' aging</span>';
    }
    var headerLeft='<div style="flex:1;min-width:0">'
      +'<div style="font-family:var(--font-display);font-size:15px;color:'+color+';letter-spacing:1px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span style="overflow:hidden;text-overflow:ellipsis;min-width:0">'+escHtml(b.name)+'</span>'
      +(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:8px;letter-spacing:0.5px;white-space:nowrap">#'+escHtml(b.serial)+'</span>':'')
      +'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:3px;line-height:1.7">'+escHtml(recipe?recipe.style:(b.style||'Custom'))+' · Bottled '+fmtDate(bot.date)
      +agingStr
      +(perLStr?' · <span style="color:var(--green2);font-family:var(--font-mono)">'+perLStr+'</span>':'')
      +(perBottleStr?' · <span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+perBottleStr+'</span>':'')
      +' · <span style="color:var(--text2);font-family:var(--font-mono);font-size:11px">'+escHtml(onHandSummary)+'</span>'
      +'</div></div>';
    var headerRight='<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">'
      +'<div class="aging-status '+statusBadgeClass+'" style="'+(inconsistent?'color:var(--red2);border-color:var(--red);background:#1a0808':'')+'">'+statusBadgeText+'</div>'
      +'<div id="cellar-chev-'+b.id+'" style="font-family:var(--font-mono);font-size:14px;color:var(--text3);width:18px;text-align:center;transition:transform 0.2s;'+(isOpen?'transform:rotate(0deg)':'')+'">'+(isOpen?'▼':'▶')+'</div>'
      +'</div>';
    var header='<div onclick="toggleCellarCard(\''+b.id+'\',event)" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none" title="Click to '+(isOpen?'collapse':'expand')+' inventory and aging details">'
      +headerLeft+headerRight+'</div>';

    // Expanded body — bottle grid, aging bar, actions, etc.
    var body='<div id="cellar-body-'+b.id+'"><div style="padding:0 16px 16px">'
      +(inconsistent?'<div class="stock-alert" style="margin-bottom:14px;flex-wrap:wrap"><span class="icon">⚠</span><span style="flex:1;min-width:200px"><strong>No bottles on hand</strong> — you recorded '+origCount+' bottled. Did you already drink/gift them, or was the cellar never filled in?</span><span style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();markBatchFinished(\''+b.id+'\')" style="white-space:nowrap">Mark finished</button><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();fillCellarFromOriginal(\''+b.id+'\')" style="white-space:nowrap">Fill cellar ('+origCount+')</button></span></div>':'')
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">'
      +'<div style="text-align:center;padding:8px 4px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+fmtDaysShort(aged)+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">AGED</div></div>'
      +'<div style="text-align:center;padding:8px 4px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:18px;color:var(--blue2)">'+(bot.abv||'?')+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">ABV</div></div>'
      +'<div style="text-align:center;padding:8px 4px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:14px;color:var(--text2);font-style:italic;line-height:1.2;padding-top:2px">'+escHtml(bot.sweetness||'—')+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">PROFILE</div></div>'
      +'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:6px">BOTTLE INVENTORY · '+fmtBottleSummary(bot)+' on-hand'+(bottlesOriginal(bot)!==totalBottles(bot)?' (of '+bottlesOriginal(bot)+' filled)':'')+'</div>'
      +renderBottleIconRow(bot,b.id)
      +(function(){
        var sizes=activeBottleSizes(bot);
        var locDefs=[{key:'cellar',icon:'🍷',label:'Cellar'},{key:'fridge',icon:'❄',label:'Fridge'},{key:'gifted',icon:'🎁',label:'Gifted'},{key:'other',icon:'📦',label:'Other'}];
        var headerRow='<div style="display:grid;grid-template-columns:60px repeat(4,1fr);gap:4px;align-items:center;font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-bottom:4px">'
          +'<div></div>'
          +locDefs.map(function(l){return'<div style="text-align:center">'+l.icon+' '+l.label.toUpperCase()+'</div>';}).join('')
          +'</div>';
        var rows=sizes.map(function(size){
          return'<div style="display:grid;grid-template-columns:60px repeat(4,1fr);gap:4px;align-items:center;margin-bottom:4px">'
            +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);text-align:right;padding-right:6px">'+size+'ml</div>'
            +locDefs.map(function(l){
              var n=bottlesInLocationBySize(bot,l.key,size);
              return'<div class="loc-cell" style="margin:0"><input type="number" min="0" value="'+n+'" onchange="setBottleLocation(\''+b.id+'\',\''+l.key+'\','+size+',this.value)" onclick="event.stopPropagation()" style="text-align:center;width:100%"></div>';
            }).join('')
            +'</div>';
        }).join('');
        return'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px">'+headerRow+rows+'</div>';
      }())
      +(typeof renderGiftHistory==='function'?renderGiftHistory(bot,b.id):'')
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin:14px 0 2px">AGING PROGRESS</div>'
      +'<div class="aging-bar-bg">'
      +'<div class="aging-bar-fill" style="width:'+pct+'%;background:'+gradientColor+'"></div>'
      +'<div style="position:absolute;left:'+minPct+'%;top:-2px;width:1px;height:12px;background:var(--green2)" title="Ready"></div>'
      +'<div style="position:absolute;left:'+peakPct+'%;top:-2px;width:1px;height:12px;background:var(--gold2)" title="Peak"></div>'
      +'</div>'
      +'<div class="aging-bar-markers"><span>0d</span><span style="color:var(--green2)">Ready · '+fmtDaysShort(profile.minDays)+'</span><span style="color:var(--gold2)">Peak · '+fmtDaysShort(profile.peakDays)+'</span><span>Max · '+fmtDaysShort(profile.maxDays)+'</span></div>'
      +'<div style="margin-top:8px;font-size:12px;color:var(--text2);font-style:italic">⏳ '+nextMilestone+'</div>'
      +'<div class="cellar-actions" onclick="event.stopPropagation()">'
      +(function(){
        var sizes=activeBottleSizes(bot);
        var buttons=sizes.map(function(size){
          var avail=bottlesInLocationBySize(bot,'cellar',size)+bottlesInLocationBySize(bot,'fridge',size)+bottlesInLocationBySize(bot,'other',size);
          if(sizes.length>1)return'<button class="btn btn-secondary btn-sm" onclick="drinkBottle(\''+b.id+'\','+size+')"'+(avail<=0?' disabled':'')+'>🍷 Drank '+size+'ml</button>';
          return'<button class="btn btn-secondary btn-sm" onclick="drinkBottle(\''+b.id+'\','+size+')"'+(avail<=0?' disabled':'')+'>🍷 Drank One</button>';
        });
        return buttons.join(' ');
      }())
      +' <button class="btn btn-secondary btn-sm" onclick="openCellarEditModal(\''+b.id+'\')">✏ Edit</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="showView(\'batch\',\''+b.id+'\');setTimeout(function(){setBatchTab(\''+b.id+'\',\'tasting\');},10)">⭐ Tasting</button>'
      +'<button class="btn btn-primary btn-sm" onclick="showView(\'batch\',\''+b.id+'\')" style="margin-left:6px">↗ Open Batch</button>'
      +'<button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="removeFromCellar(\''+b.id+'\')" title="Return to active batches">🗑</button>'
      +'</div>'
      +'</div></div>';

    return'<div class="aging-card" id="aging-'+b.id+'">'
      +'<div style="height:3px;background:'+color+'"></div>'
      +header+'<div class="collapse-y'+(isOpen?' open':'')+'">'+body+'</div>'
      +'</div>';
  }).join('');

  // Sort chooser options (label shown in dropdown, key matches sort logic above)
  var sortOpts=[
    {key:'status',label:'Aging status (default)'},
    {key:'oldest',label:'Bottled date · oldest first'},
    {key:'newest',label:'Bottled date · newest first'},
    {key:'name',label:'Name A→Z'},
    {key:'bottles',label:'Bottles on hand · most first'},
    {key:'abv',label:'ABV · highest first'}
  ];
  var sortSelect='<select class="form-select" style="height:30px;padding:0 28px 0 10px;font-size:12px;min-width:200px" onchange="setCellarSort(this.value)">'
    +sortOpts.map(function(o){return'<option value="'+o.key+'"'+(window._cellarSort===o.key?' selected':'')+'>'+escHtml(o.label)+'</option>';}).join('')
    +'</select>';

  return'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px"><div><div class="page-title" style="margin-bottom:0;display:inline-block">The Cellar</div>'+renderCellarTempPill()+'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">SORT BY</span>'
    +sortSelect
    +(bottled.length>1?'<button class="btn btn-secondary btn-sm" onclick="cellarExpandAll(true)" title="Expand all batches">▼ Expand All</button>':'')
    +(bottled.length>1?'<button class="btn btn-secondary btn-sm" onclick="cellarExpandAll(false)" title="Collapse all batches">▶ Collapse All</button>':'')
    +finishedToggle
    +(bottled.length?'<button class="btn btn-secondary btn-sm" onclick="showView(\'review\')">★ Year in Review</button>':'')
    +'<button class="btn btn-secondary btn-sm" onclick="showView(\'cellar-map\')" title="Visual storage cabinet with shelves and sensor-linked temperature">🏠 My Cellar</button>'
    +(bottled.length?'<button class="btn btn-secondary btn-sm" onclick="printAllLabels()">📑 Print Label Sheet</button>':'')
    +(bottled.length?'<button class="btn btn-secondary btn-sm" onclick="openStorageLabelPicker()" title="Pick which bottled batches to print storage labels for">📦 Print Storage Labels</button>':'')
    +'</div>'
    +'</div>'
    +'<div class="page-subtitle">Bottle Aging Tracker · '+bottled.length+' batch'+(bottled.length!==1?'es':'')+' resting · tap a header to expand</div>'
    +'<div class="grid-4" style="margin-bottom:20px">'
    +'<div class="stat-card"><div class="stat-val">'+bottled.length+'</div><div class="stat-label">Bottled Batches</div></div>'
    +'<div class="stat-card"><div class="stat-val">'+totalCellar+'</div><div class="stat-label">In Cellar</div></div>'
    +'<div class="stat-card"><div class="stat-val" style="color:var(--gold)">'+atPeak+'</div><div class="stat-label">At Peak</div></div>'
    +(hasCostData?'<div class="stat-card" style="border-color:var(--green)" title="Cost basis at top. Age-adjusted notional value below — 1.0× at bottling, 1.5× at peak, 0.7× past max-drink-by."><div class="stat-val" style="color:var(--green2);font-size:24px">'+ccy+inStockValue.toFixed(0)+'</div><div class="stat-label">Cellar Value</div>'+(matureValue-inStockValue>1?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);margin-top:4px;letter-spacing:1px">≈'+ccy+matureValue.toFixed(0)+' MATURE</div>':'')+'</div>':'<div class="stat-card"><div class="stat-val" style="color:var(--green2)">'+ready+'</div><div class="stat-label">Ready to Drink</div></div>')
    +'</div>'
    +(atPeak>0?'<div class="info-box" style="border-left-color:var(--gold2);margin-bottom:16px"><div style="font-size:14px;color:var(--gold2)"><strong>🏆 '+atPeak+' batch'+(atPeak!==1?'es':'')+' at peak drinking window.</strong> Now is the perfect time to taste, share, and savor.</div></div>':'')
    +cards
    // ponytail: analytics merged into one collapsed <details> at the bottom — native, no JS.
    +(function(){var a=renderCellarInventoryByStyle()+renderYeastAnalytics();
      return a?'<details class="card" style="margin-top:16px;background:var(--bg2)"><summary style="cursor:pointer;font-family:var(--font-display);font-size:12px;color:var(--text3);letter-spacing:2px">CELLAR ANALYTICS</summary><div style="margin-top:14px">'+a+'</div></details>':'';}());
}

// Renders an empty card structure (canvas + range chips). The actual chart
// is drawn asynchronously by initCellarCharts() once HA history has loaded —
// otherwise this would block the page while waiting on a network round-trip.
// One temp-history entry per cabinet that has a temp sensor bound, plus a
// legacy entry when only the old settings-level sensor exists. Each entry
// gets its own card + chart; charts draw asynchronously via initCellarCharts.
function cellarHistoryEntities(){
  var list=[];
  (APP.cabinets||[]).forEach(function(cab){
    if(cab.tempSensorEntity)list.push({id:cab.id,entity:cab.tempSensorEntity,label:cab.name||cab.model||'Cabinet'});
  });
  if(!list.length&&APP.settings&&APP.settings.cellarTempSensorEntity){
    list.push({id:'legacy',entity:APP.settings.cellarTempSensorEntity,label:'Cellar'});
  }
  return list;
}

function renderCellarTempHistoryCard(){
  var entries=cellarHistoryEntities();
  if(!entries.length)return'';
  if(window._cellarTempRange==null)window._cellarTempRange=168; // default 7 days (hours)
  var ranges=[
    {hours:24,label:'24h'},
    {hours:168,label:'7d'},
    {hours:720,label:'30d'}
  ];
  var chips=ranges.map(function(r){
    var isActive=r.hours===window._cellarTempRange;
    return'<button class="btn btn-secondary btn-sm" onclick="setCellarTempRange('+r.hours+')" style="'+(isActive?'background:rgba(232,196,106,0.18);color:var(--gold2);border-color:var(--gold)':'')+'">'+r.label+'</button>';
  }).join('');
  return entries.map(function(en){
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🌡 '+escHtml(en.label.toUpperCase())+' · TEMPERATURE HISTORY</div><div style="display:flex;gap:6px">'+chips+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px;line-height:1.55">Live trace from <code style="font-family:var(--font-mono);font-size:11px;color:var(--text2)">'+escHtml(en.entity)+'</code>. The shaded band is the ideal cellar window (8–18°C, optimum 10–14°C). Excursions outside the band — especially wide daily swings — accelerate aging and risk oxidation.</div>'
      +'<div style="position:relative;height:240px" id="cellar-temp-chart-wrap-'+escHtml(en.id)+'">'
      +'<canvas id="cellar-temp-chart-'+escHtml(en.id)+'"></canvas>'
      +'<div id="cellar-temp-loading-'+escHtml(en.id)+'" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:13px;font-style:italic">Loading history…</div>'
      +'</div>'
      +'<div id="cellar-temp-summary-'+escHtml(en.id)+'" style="font-size:11px;color:var(--text3);margin-top:10px;font-family:var(--font-mono);letter-spacing:1px;text-align:center"></div>'
      +'</div>';
  }).join('');
}

function setCellarTempRange(hours){
  window._cellarTempRange=hours;
  // Re-render cellar to redraw the cards and re-trigger init
  renderMain();
}

async function drawCellarTempChart(en){
  var canvas=document.getElementById('cellar-temp-chart-'+en.id);
  var loading=document.getElementById('cellar-temp-loading-'+en.id);
  var summary=document.getElementById('cellar-temp-summary-'+en.id);
  if(!canvas||typeof Chart==='undefined')return;
  var hours=window._cellarTempRange||168;
  var data=await haFetchHistory(en.entity,hours);
  if(loading)loading.style.display='none';
  if(!data||!data.length){
    if(loading){loading.style.display='flex';loading.textContent='No history yet — HA may still be collecting samples';}
    return;
  }
  // Compute summary stats
  var values=data.map(function(d){return d.value;});
  var minV=Math.min.apply(null,values);
  var maxV=Math.max.apply(null,values);
  var avgV=values.reduce(function(s,v){return s+v;},0)/values.length;
  var outOfBand=data.filter(function(d){return d.value<8||d.value>18;}).length;
  var outOfOptimum=data.filter(function(d){return d.value<10||d.value>14;}).length;
  var inBandPct=Math.round((1-outOfBand/data.length)*100);
  var inOptPct=Math.round((1-outOfOptimum/data.length)*100);
  if(summary){
    summary.innerHTML='AVG '+avgV.toFixed(1)+'°C · MIN '+minV.toFixed(1)+'°C · MAX '+maxV.toFixed(1)+'°C · '
      +'<span style="color:'+(inBandPct>=95?'var(--green2)':inBandPct>=80?'var(--gold2)':'var(--red2)')+'">'+inBandPct+'% IN SAFE BAND</span> · '
      +'<span style="color:'+(inOptPct>=80?'var(--green2)':inOptPct>=60?'var(--gold2)':'var(--text3)')+'">'+inOptPct+'% IN OPTIMUM</span>';
  }
  // Destroy any prior chart on this canvas
  if(!window._cellarTempCharts)window._cellarTempCharts={};
  if(window._cellarTempCharts[en.id]){try{window._cellarTempCharts[en.id].destroy();}catch(e){}}
  var ctx=canvas.getContext('2d');
  // Build a horizontal-band annotation by injecting two thin "ideal range"
  // datasets via filler regions. Chart.js doesn't natively render bands without
  // the annotation plugin, so we simulate with two flat-line datasets that
  // share a fill between them.
  var t0=data[0].timestamp.getTime();
  var t1=data[data.length-1].timestamp.getTime();
  // Determine sensible Y axis bounds — extend slightly past min/max + ideal range
  var yMin=Math.floor(Math.min(minV,7)*2)/2-1;
  var yMax=Math.ceil(Math.max(maxV,19)*2)/2+1;

  window._cellarTempCharts[en.id]=new Chart(ctx,{
    type:'line',
    data:{
      datasets:[
        // Optimum band lower edge (10°C) and upper edge (14°C) with fill
        {label:'_opt_low',data:[{x:t0,y:10},{x:t1,y:10}],borderColor:'transparent',backgroundColor:'transparent',pointRadius:0,fill:false,tension:0},
        {label:'_opt_high',data:[{x:t0,y:14},{x:t1,y:14}],borderColor:'transparent',backgroundColor:'rgba(122,160,64,0.10)',pointRadius:0,fill:'-1',tension:0},
        // Safe band lower edge (8°C) and upper edge (18°C)
        {label:'_safe_low',data:[{x:t0,y:8},{x:t1,y:8}],borderColor:'rgba(122,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        {label:'_safe_high',data:[{x:t0,y:18},{x:t1,y:18}],borderColor:'rgba(122,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        // Actual temperature trace
        {label:'Cellar temp',data:data.map(function(d){return{x:d.timestamp.getTime(),y:d.value};}),
          borderColor:'#c9a350',backgroundColor:'rgba(201,163,80,0.05)',
          tension:0.25,pointRadius:0,borderWidth:2,fill:false}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:function(item){return!String(item.dataset.label||'').startsWith('_');},
          callbacks:{
            label:function(item){return item.parsed.y.toFixed(1)+'°C';},
            title:function(items){if(!items.length)return'';return new Date(items[0].parsed.x).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
          }
        }
      },
      scales:{
        x:{type:'linear',min:t0,max:t1,
          ticks:{color:'#6a5f50',font:{size:10},maxTicksLimit:7,callback:function(v){
            var d=new Date(v);
            return hours<=24
              ?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              :d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
          }},
          grid:{color:'#2a2a35'}
        },
        y:{min:yMin,max:yMax,
          ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v+'°C';}},
          grid:{color:'#2a2a35'}
        }
      },
      interaction:{mode:'nearest',axis:'x',intersect:false}
    }
  });
}

function initCellarCharts(){
  cellarHistoryEntities().forEach(function(en){
    setTimeout(function(){drawCellarTempChart(en);},150);
  });
}

// ==================== MY CELLAR ====================
// The Cellar is a first-class storage location with sensors, target temp band,
// and a structured shelves[] layout. Replaces the older free-text
// cellarSublocation grouping with a visual cabinet rendering.
//
// Architecture:
//   - APP.cabinets[] — one or more cabinets, each with name/model/sensors + shelves[]
//   - Each shelf has {id, label, type, note, batches[]} where batches[] is
//     a derived list at render-time from bot.cellarShelfId references.
//   - When a batch is bottled, the user can optionally assign it to a shelf.
//   - Legacy cellarSublocation strings still display but are migrated to the
//     new model gradually as the user re-assigns.

function allCabinets(){return Array.isArray(APP.cabinets)?APP.cabinets:[];}

function getCabinet(id){return allCabinets().find(function(c){return c.id===id;})||null;}

// Resolve a shelf id to {shelf, cabinet} across all cabinets. Shelf ids are
// globally unique, so references on batches/bottling/fermenters don't need
// to know which cabinet a shelf lives in.
function findShelfById(shelfId){
  if(!shelfId)return null;
  var cabs=allCabinets();
  for(var i=0;i<cabs.length;i++){
    var s=(cabs[i].shelves||[]).find(function(x){return x.id===shelfId;});
    if(s)return{shelf:s,cabinet:cabs[i]};
  }
  return null;
}

function isCellarConfigured(){
  return allCabinets().some(function(c){return!!(c.name||c.model||(c.shelves&&c.shelves.length));});
}

// Generate a unique shelf ID. Uses crypto.getRandomValues when available,
// falls back to timestamp + random suffix.
function nextShelfId(){
  if(window.crypto&&crypto.getRandomValues){
    var arr=new Uint8Array(6);
    crypto.getRandomValues(arr);
    return'shelf-'+Array.from(arr).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }
  return'shelf-'+Date.now().toString(16)+'-'+Math.floor(Math.random()*1e6).toString(16);
}

// Default shelf layout for a typical wine fridge. Numbered top-to-bottom with
// shelf 1 at the top. All marked as bottle_rack by default — user can change
// to 'open' (no rack, for fermenters) per shelf.
function defaultWineFridgeShelves(count){
  var arr=[];
  count=parseInt(count)||18;
  for(var i=1;i<=count;i++){
    arr.push({id:nextShelfId(),label:'Shelf '+i,type:'bottle_rack',note:'',capacity:14});
  }
  return arr;
}

// Build a map of shelfId → batches[] for fast rendering. A shelf can hold
// multiple batches — bottle-storage shelves are typically wide enough for
// several bottled batches side by side; fermenter shelves can host multiple
// active vessels at once. No exclusivity constraint anywhere in the code.
function batchesByShelf(){
  var map={};
  if(!APP.batches||!APP.bottling)return map;
  APP.batches.forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.cellarShelfId)return;
    if(!map[bot.cellarShelfId])map[bot.cellarShelfId]=[];
    map[bot.cellarShelfId].push(b);
  });
  // Also include unbottled batches that were assigned to a shelf for bulk aging
  APP.batches.forEach(function(b){
    if(!b.cellarShelfId)return;
    if(!map[b.cellarShelfId])map[b.cellarShelfId]=[];
    if(map[b.cellarShelfId].indexOf(b)<0)map[b.cellarShelfId].push(b);
  });
  return map;
}

// Returns an array of batches that are bottled OR bulk-aging but unassigned.
// These appear in the "Loose batches" sidebar in the cellar view so the user
// can quickly drag them onto a shelf.
function unassignedCellarBatches(){
  if(!APP.batches||!APP.bottling)return[];
  return APP.batches.filter(function(b){
    if(b.failed)return false; // failed batches don't get cellar space
    var bot=APP.bottling[b.id];
    if(bot&&!bot.cellarShelfId&&bottlesOnHand(bot)>0)return true;
    return false;
  });
}

// Build a map of shelfId → fermenters[] for shelves that hold vessels.
// Mirrors batchesByShelf — multiple fermenters per shelf is fine; wide
// shelves comfortably host two or three 5 L vessels.
function fermentersByShelf(){
  var map={};
  (APP.fermenters||[]).forEach(function(f){
    if(!f.cellarShelfId)return;
    if(!map[f.cellarShelfId])map[f.cellarShelfId]=[];
    map[f.cellarShelfId].push(f);
  });
  return map;
}

// Returns the active batch currently occupying a given fermenter, or null.
// "Active" means not bottled, not complete, not failed — the fermenter is
// physically holding mead that hasn't been racked out yet. When the batch is
// bottled, this returns null automatically, so the shelf visualization shows
// the fermenter as "empty" without any manual cleanup. That's the "auto-clear
// on bottling" behavior — the fermenter object itself stays on the shelf
// (because it physically didn't move), but its "currently brewing" tag clears.
function activeBatchForFermenter(fermenterId){
  if(!fermenterId)return null;
  return(APP.batches||[]).find(function(b){
    if(b.fermenterId!==fermenterId)return false;
    var s=getBatchStatus(b);
    return s!=='bottled'&&s!=='complete'&&s!=='failed';
  })||null;
}

// Returns fermenters that haven't been placed on any shelf yet. Surfaces
// in the "unassigned" sidebar so the user can drag them onto a shelf.
function unassignedFermenters(){
  return(APP.fermenters||[]).filter(function(f){return!f.cellarShelfId;});
}

function renderMyCellar(){
  var cabs=allCabinets();
  if(!cabs.length){
    return'<div class="page-title">My Cellar</div><div class="page-subtitle">Storage cabinets with shelves and sensor-linked temperature tracking</div>'
      +'<div class="card" style="padding:32px;text-align:center">'
        +'<div style="font-size:48px;margin-bottom:14px">🏠</div>'
        +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);margin-bottom:10px">No cabinets configured yet</div>'
        +'<div style="font-size:13px;color:var(--text3);max-width:480px;margin:0 auto 18px;line-height:1.6">Add one or more storage cabinets — a wine fridge, a basement rack, a closet shelf — to track which batches sit where, monitor live temperature and humidity, and get alerts when conditions drift outside the aging band.</div>'
        +'<button class="btn btn-primary" onclick="addCabinet()">＋ Add cabinet</button>'
        +'<button class="btn btn-secondary" style="margin-left:10px" onclick="quickSetupWineFridge()" title="Pre-configures a wine fridge with numbered shelves">Quick setup: wine fridge</button>'
      +'</div>'
      +renderLegacyCellarSublocations();
  }

  var byShelf=batchesByShelf();
  var byShelfFerm=fermentersByShelf();
  var unassigned=unassignedCellarBatches();
  var unassignedFerm=unassignedFermenters();
  var totalShelves=cabs.reduce(function(s,c){return s+((c.shelves&&c.shelves.length)||0);},0);
  var cabinetsHtml=cabs.map(function(c){
    return'<div style="margin-bottom:18px">'
      +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(c.name||c.model||'Cabinet')+(c.location?' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">· '+escHtml(c.location.toUpperCase())+'</span>':'')+'</div>'
        +'<div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" onclick="openCellarConfigModal(\''+c.id+'\')">⚙ Configure</button><button class="btn btn-secondary btn-sm" onclick="deleteCabinet(\''+c.id+'\')" style="color:var(--red2)" title="Remove this cabinet">✕</button></div>'
      +'</div>'
      +renderCellarShelves(c,byShelf,byShelfFerm)
    +'</div>';
  }).join('');

  return'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px">'
      +'<div><div class="page-title" style="margin-bottom:6px">My Cellar</div><div class="page-subtitle" style="margin-bottom:0">'+cabs.length+' cabinet'+(cabs.length===1?'':'s')+' · '+totalShelves+' shelves</div></div>'
      +'<button class="btn btn-primary btn-sm" onclick="addCabinet()">＋ Add cabinet</button>'
    +'</div>'
    +'<div class="cellar-layout" style="display:grid;gap:18px;align-items:start" id="cellar-layout-grid">'
      +'<div>'+cabinetsHtml+'</div>'
      +'<div>'+renderCellarSidePanel(unassigned,unassignedFerm)+'</div>'
    +'</div>'
    +renderCellarTempHistoryCard();
}

// LED display strip — lives at the top of the cabinet. Shows the cabinet name,
// live temperature + humidity from HA sensors (color-coded against target band),
// and the inventory summary. Styled like an actual wine fridge control panel:
// black background, monospaced green digit-display font, status LED dot.
function renderCellarLedStrip(c){
  var tempReading=getCellarLiveTemp(c);
  var humidityReading=getCellarLiveHumidity(c);
  // Resolve display values + status colors. Three states per reading: configured
  // and live (green/amber/red depending on band), configured but waiting (dim),
  // not configured at all (very dim).
  var tempStr='—',tempColor='#5a5040',tempSub='NO SENSOR',ledColor='#5a5040';
  if(c.tempSensorEntity){
    if(tempReading){
      var tv=tempReading.value;
      tempStr=tv.toFixed(1)+'°C';
      var inBand=tv>=c.targetTempMin&&tv<=c.targetTempMax;
      var inOpt=tv>=(c.targetTemp-1)&&tv<=(c.targetTemp+1);
      tempColor=inOpt?'#7ad87a':(inBand?'#e8c46a':'#e87a7a');
      ledColor=tempColor;
      tempSub=c.targetHumidityMin?'AGING':'TARGET '+c.targetTemp+'°C';
    }else{
      tempStr='...';tempColor='#5a5040';tempSub='WAITING';
    }
  }
  var humStr='',humCls='';
  if(c.humiditySensorEntity){
    if(humidityReading){
      var hv=humidityReading.value;
      humStr=' · '+hv.toFixed(0)+'% RH';
      var hBand=hv>=c.targetHumidityMin&&hv<=c.targetHumidityMax;
      humCls=hBand?'':' rh-warn';
    }else{
      humStr=' · ...% RH';
    }
  }
  // Inventory summary — counts only THIS cabinet's shelves
  var byShelf=batchesByShelf();
  var assignedBottles=0;
  (c.shelves||[]).forEach(function(s){
    (byShelf[s.id]||[]).forEach(function(b){var bot=APP.bottling[b.id];if(bot)assignedBottles+=bottlesInLocation(bot,'cellar');});
  });
  var shelfIdSet={};
  (c.shelves||[]).forEach(function(s){shelfIdSet[s.id]=true;});
  var fermCount=(APP.fermenters||[]).filter(function(f){return f.cellarShelfId&&shelfIdSet[f.cellarShelfId];}).length;
  // Top control strip — outside dark frame, inner LED display
  return'<div style="background:#0a0806;border-radius:3px;padding:10px 14px;margin-bottom:3px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:1px solid #1a1612">'
    +'<div style="min-width:0">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:#e8c46a;letter-spacing:2px;text-transform:uppercase">'+escHtml(c.name||c.model||'Storage Cabinet')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:#5a4530;letter-spacing:1.5px;margin-top:2px">'+escHtml((c.location||'').toUpperCase()||'MEAD CELLAR')+'</div>'
    +'</div>'
    +'<div onclick="event.stopPropagation();showCabinetTempAdvice(\''+c.id+'\')" title="'+(c.tempSensorEntity?'Click for temperature advice (fermenting + aging)':'')+'" style="background:#000000;border-radius:3px;padding:7px 14px;display:flex;align-items:center;gap:10px;border:1px solid #1a1612;min-width:200px;justify-content:center'+(c.tempSensorEntity?';cursor:pointer':'')+'">'
      +'<div style="text-align:center">'
        +'<div style="font-family:var(--font-mono);font-size:17px;color:'+tempColor+';letter-spacing:2px;font-weight:500">🌡 '+tempStr+humStr+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:'+tempColor+';opacity:0.7;letter-spacing:1.5px;margin-top:2px">'+tempSub+'  ·  '+assignedBottles+' BOTTLES'+(fermCount?' · '+fermCount+' ⚗':'')+'</div>'
      +'</div>'
      +'<div style="width:6px;height:6px;border-radius:50%;background:'+ledColor+';box-shadow:0 0 4px '+ledColor+'"></div>'
    +'</div>'
  +'</div>';
}

// Kept as a thin alias so any external code still calling the old name works.
// The strip used to live outside the cabinet; now it's the LED panel inside.
function renderCellarStatusBar(){return'';}

// Compute lighter/darker variants of a hex color for the radial gradient.
// Linear RGB interpolation toward white (lighter) or black (darker).
function _cellarMixHex(c1,c2,t){
  function parse(c){
    c=String(c||'#000').replace('#','');
    if(c.length===3)c=c.split('').map(function(x){return x+x;}).join('');
    return[parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)];
  }
  function hx(n){return('0'+Math.round(Math.max(0,Math.min(255,n))).toString(16)).slice(-2);}
  var a=parse(c1),b=parse(c2);
  return'#'+hx(a[0]*(1-t)+b[0]*t)+hx(a[1]*(1-t)+b[1]*t)+hx(a[2]*(1-t)+b[2]*t);
}

// The outer cabinet: dark frame containing the LED strip, all shelves, and
// the slim compressor footer. Renders the visual "wine fridge" — actual
// shelf content (bottles as CSS-styled circles, fermenters as cylinders) is
// delegated to renderCellarShelfRow per shelf.
function renderCellarShelves(c,byShelf,byShelfFerm){
  if(!c.shelves||!c.shelves.length){
    return'<div class="card" style="padding:20px;text-align:center"><div style="color:var(--text3);font-size:13px;margin-bottom:14px">No shelves configured.</div><button class="btn btn-secondary btn-sm" onclick="openCellarConfigModal(\''+c.id+'\')">Add shelves</button></div>';
  }
  // Outer cabinet frame — dark wood + subtle inner shadow to suggest depth
  return'<div style="background:#0a0806;border:1px solid #3a2c1e;border-radius:8px;padding:6px;box-shadow:inset 0 0 40px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.6)">'
    +renderCellarLedStrip(c)
    +c.shelves.map(function(s){
      return renderCellarShelfRow(s,byShelf[s.id]||[],byShelfFerm[s.id]||[]);
    }).join('')
    // Slim compressor footer
    +'<div style="background:#0a0806;height:14px;border-radius:0 0 4px 4px;display:flex;align-items:center;justify-content:center;gap:16px;margin-top:3px;border-top:1px solid #1a1612">'
      +'<div style="flex:1;height:1px;background:#2a2018;margin:0 16px"></div>'
      +'<span style="font-family:var(--font-mono);font-size:7.5px;color:#5a4530;letter-spacing:2px">▲ COMPRESSOR ▲</span>'
      +'<div style="flex:1;height:1px;background:#2a2018;margin:0 16px"></div>'
    +'</div>'
  +'</div>';
}

// Single shelf row — dispatches to bottle-grid or fermenter-cylinder rendering
// based on whether the shelf currently holds fermenters. Each shelf is a
// clickable container that opens the detail modal; individual remove/place
// actions happen inside the modal, not in the cabinet view.
function renderCellarShelfRow(s,batches,fermenters){
  fermenters=fermenters||[];
  // A shelf renders as a fermenter slot if vessels are placed there OR the
  // user marked it as fermenter type. Otherwise bottle grid. The data model
  // allows mixed (bottles + fermenters on same shelf); we render fermenters
  // above bottles in that case via the renderBottleShelfHTML continuation.
  if(fermenters.length>0||s.type==='fermenter_slot'){
    return renderFermenterShelfHTML(s,batches,fermenters);
  }
  return renderBottleShelfHTML(s,batches);
}

// Bottle-rack shelf: circles in batch colors (filled = bottle present,
// dotted outline = empty slot). Uses flex-wrap so circles flow naturally
// across the available width — more per row when the shelf is wider,
// wrapping to extra rows only when horizontal space runs out. Capacity
// still determines the total number of circles drawn.
function renderBottleShelfHTML(s,batches){
  var capacity=parseInt(s.capacity)||14;
  if(capacity<1)capacity=1;
  // Flatten batches into a slot array (color per slot, null for empty).
  // Each batch contributes `onHand` filled slots in batch color.
  var slots=[];
  var batchLabelParts=[];
  var totalBottles=0;
  var shelfReserved=0;
  batches.forEach(function(b){
    var bot=APP.bottling[b.id];
    // Only bottles physically located in the cellar belong on the shelf —
    // fridge/"other"/gifted bottles left this cabinet, so drinking or gifting
    // one removes its circle here immediately.
    var inCellar=bot?bottlesInLocation(bot,'cellar'):0;
    // Time-capsule reservations render as locked circles with a tooltip.
    var reserved=Math.min((typeof getReservedBottleCount==='function')?getReservedBottleCount(b):0,inCellar);
    var free=inCellar-reserved;
    var color=getBatchColor(b);
    var capTitle='';
    if(reserved>0&&typeof getActiveTimeCapsules==='function'){
      capTitle=getActiveTimeCapsules(b).map(function(tc){
        return(parseInt(tc.count)||0)+' until '+(typeof fmtDate==='function'?fmtDate(tc.openDate):tc.openDate)+(tc.reason?' ('+tc.reason+')':'');
      }).join(' · ');
    }
    for(var i=0;i<free&&slots.length<capacity;i++){slots.push({color:color,name:b.name});}
    for(var j=0;j<reserved&&slots.length<capacity;j++){
      slots.push({color:color,name:b.name,reserved:true,title:'🕰 Time capsule — do not open: '+capTitle+' — '+b.name});
    }
    shelfReserved+=reserved;
    totalBottles+=inCellar;
    if(inCellar>0)batchLabelParts.push(escHtml(b.name)+(b.serial?' · '+escHtml(b.serial):'')+(reserved>0?' <span style="color:#e8c46a">🔒'+reserved+'</span>':''));
  });
  while(slots.length<capacity)slots.push(null);
  // Build circles as styled <div>s — radial-gradient gives the glass look,
  // a small white highlight blob suggests the bottle shoulder catching light.
  // Empty slots are dashed-border divs of the same size.
  var circleSize=26;
  var circles=slots.map(function(s){
    if(s){
      var lighter=_cellarMixHex(s.color,'#ffffff',0.4);
      var darker=_cellarMixHex(s.color,'#000000',0.55);
      var bg='radial-gradient(circle at 35% 30%,'+lighter+' 0%,'+s.color+' 65%,'+darker+' 100%)';
      if(s.reserved){
        // Time-capsule bottle: gold ring + cross-hatch + padlock so it stands
        // out at a glance; hover explains the reservation.
        return'<div title="'+escHtml(s.title||'Time capsule reservation')+'" style="width:'+circleSize+'px;height:'+circleSize+'px;border-radius:50%;background:'+bg+';position:relative;box-shadow:0 0 0 2px rgba(232,196,106,0.9),0 0 9px rgba(232,196,106,0.4);flex-shrink:0;cursor:help">'
          +'<div style="position:absolute;inset:0;border-radius:50%;background:repeating-linear-gradient(45deg,rgba(10,8,6,0.6) 0 3px,transparent 3px 7px)"></div>'
          +'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;text-shadow:0 1px 2px #000">🔒</div>'
        +'</div>';
      }
      return'<div title="'+escHtml(s.name||'')+'" style="width:'+circleSize+'px;height:'+circleSize+'px;border-radius:50%;background:'+bg+';position:relative;box-shadow:0 1px 2px rgba(0,0,0,0.4);flex-shrink:0">'
        +'<div style="position:absolute;top:14%;left:14%;width:22%;height:22%;border-radius:50%;background:rgba(255,255,255,0.28)"></div>'
      +'</div>';
    }
    return'<div style="width:'+circleSize+'px;height:'+circleSize+'px;border-radius:50%;border:1px dashed #3a3025;box-sizing:border-box;flex-shrink:0"></div>';
  }).join('');
  // Header subtitle: capacity ratio, batch count, type hint
  var subtitle;
  if(totalBottles===0)subtitle='BOTTLE RACK · EMPTY';
  else if(batches.length>1)subtitle='BOTTLE RACK · '+totalBottles+'/'+capacity+' · '+batches.length+' BATCHES';
  else subtitle='BOTTLE RACK · '+totalBottles+'/'+capacity;
  if(shelfReserved>0)subtitle+=' · 🔒'+shelfReserved+' RESERVED';
  // Bottom label line — joined batch names with serials, or a placeholder
  var bottomLabel=batchLabelParts.length
    ?batchLabelParts.join('  +  ')
    :(s.note?escHtml(s.note):'<span style="opacity:0.6;font-style:italic">click to place a batch here</span>');
  // We can't know the actual rendered row count until layout happens (depends
  // on container width), so use a heuristic min-height: assume worst-case 3
  // rows would fit on a narrow viewport for big capacities, but no more than
  // capacity/8 rows on a generous viewport. Cap min-height conservatively.
  var assumedRows=capacity<=8?1:(capacity<=20?2:(capacity<=40?3:Math.ceil(capacity/14)));
  var shelfMinHeight=60+assumedRows*36;
  // Flex-wrap layout: circles flow naturally based on container width.
  // - More space: more bottles fit per row (fewer rows)
  // - Less space: bottles wrap to more rows
  // - `gap` provides consistent spacing in both directions
  // - `justify-content:center` keeps things visually balanced when the
  //   last row is partially filled
  return'<div onclick="openShelfDetailModal(\''+s.id+'\')" '
    +'style="background:#1a140e;border:1px solid #2a2018;border-radius:2px;padding:14px 14px 24px;margin-bottom:2px;cursor:pointer;position:relative;min-height:'+shelfMinHeight+'px;transition:background 0.15s" '
    +'onmouseover="this.style.background=\'#221a13\'" onmouseout="this.style.background=\'#1a140e\'">'
    +'<div style="font-family:var(--font-display);font-size:11px;color:#e8c46a;letter-spacing:1px">'+escHtml(s.label)+'</div>'
    +'<div style="font-family:var(--font-mono);font-size:9px;color:#8a6a30;letter-spacing:1.5px;margin-top:3px">'+subtitle+'</div>'
    +'<div style="margin:14px auto 14px;width:100%;max-width:1100px;padding:0 6px;box-sizing:border-box">'
      +'<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px">'+circles+'</div>'
    +'</div>'
    +'<div style="position:absolute;left:14px;right:14px;bottom:8px;font-family:var(--font-mono);font-size:8.5px;color:#7a6240;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+bottomLabel+'</div>'
    +'<div style="position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(180deg,#5c4830,#3a2c1e)"></div>'
  +'</div>';
}

// Fermenter-slot shelf: upright cylindrical vessels with bung + airlock,
// arranged in a row (max 4 across before wrapping). Each fermenter shows
// the active batch's color liquid fill inside if a batch is being aged in
// it, otherwise stays clear. Auto-derived — no manual update needed when
// a batch is bottled, the liquid disappears on next render.
function renderFermenterShelfHTML(s,batches,fermenters){
  var subtitle='FERMENTER SLOT';
  if(fermenters.length)subtitle+=' · '+fermenters.length+' VESSEL'+(fermenters.length===1?'':'S');
  // Bottom label: list active batches inside fermenters here
  var bottomParts=fermenters.map(function(f){
    var active=activeBatchForFermenter(f.id);
    return escHtml(f.name)+(active?': '+escHtml(active.name)+(active.serial?' #'+escHtml(active.serial):''):': empty');
  });
  var bottomLabel=bottomParts.length?bottomParts.join('  ·  '):'click to place a fermenter here';
  // Each fermenter is its own HTML cell so the labels get proper text-overflow
  // handling instead of overflowing the SVG viewport. Cells flex-wrap so they
  // re-flow on narrow viewports, just like the bottle circles do.
  var cellW=130;
  var cells=fermenters.map(function(f){
    var color=f.color||'#c9a350';
    var active=activeBatchForFermenter(f.id);
    var liquidColor=active?(getBatchColor(active)||color):null;
    // Liquid level: the top of the liquid surface sits around y=42 (out of
    // the body that runs 24-100, so ~75% full). Higher opacity sells the
    // "this vessel is currently brewing mead" read. Active fermenters look
    // visibly full; empty ones stay clear.
    var liquidPath=liquidColor
      ?'<path d="M 7 42 L 7 96 Q 7 99 10 99 L 40 99 Q 43 99 43 96 L 43 42 Q 25 47 7 42 Z" fill="'+liquidColor+'" opacity="0.65"/>'
      :'';
    // CO2 bubbles rising through the mead while this vessel is actively fermenting.
    var fermenting=active&&typeof getBatchStatus==='function'&&getBatchStatus(active)==='fermenting';
    var bubbles=fermenting
      ?'<g class="cellar-bubbles">'
        +'<circle class="cb1" cx="17" cy="92" r="1.5" fill="#fff" opacity="0.5"/>'
        +'<circle class="cb2" cx="25" cy="94" r="1.1" fill="#fff" opacity="0.45"/>'
        +'<circle class="cb3" cx="33" cy="90" r="1.4" fill="#fff" opacity="0.5"/>'
        +'</g>'
      :'';
    var activeText=active?active.name+(active.serial?' #'+active.serial:''):'empty';
    var activeStyle=active?'':'font-style:italic;opacity:0.6';
    var fullTooltip=f.name+(f.capacity?' ('+f.capacity+'L)':'')+(active?' — '+active.name+(active.serial?' #'+active.serial:''):' — empty');
    return'<div title="'+escHtml(fullTooltip)+'" style="width:'+cellW+'px;flex-shrink:0;text-align:center">'
      +'<svg width="50" height="108" viewBox="0 0 50 108" style="display:block;margin:0 auto">'
        +'<ellipse cx="25" cy="100" rx="22" ry="3" fill="#000000" opacity="0.7"/>'
        +'<path d="M 6 30 L 6 96 Q 6 100 10 100 L 40 100 Q 44 100 44 96 L 44 30 Q 44 26 40 24 L 32 24 L 32 18 L 18 18 L 18 24 L 10 24 Q 6 26 6 30 Z" fill="#2a2520" fill-opacity="0.55" stroke="'+color+'" stroke-width="1"/>'
        +liquidPath
        +bubbles
        +'<rect x="12" y="35" width="2" height="55" fill="#fff" opacity="0.18"/>'
        +'<rect x="20" y="10" width="10" height="10" fill="#3a2c1e" stroke="#5a4530" stroke-width="0.5"/>'
        +'<line x1="25" y1="10" x2="25" y2="4" stroke="'+color+'" stroke-width="1" fill="none"/>'
        +'<circle cx="25" cy="2" r="2.5" fill="#0a0806" stroke="'+color+'" stroke-width="0.8"/>'
      +'</svg>'
      +'<div style="font-family:Georgia,serif;font-size:10px;color:#c9a350;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px">'+escHtml(f.name)+'</div>'
      +'<div style="font-family:Courier New,monospace;font-size:8.5px;color:#7a6240;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;'+activeStyle+'">'+escHtml(activeText)+'</div>'
    +'</div>';
  }).join('');
  var content;
  if(fermenters.length){
    content='<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px 18px;width:100%;max-width:1100px;margin:0 auto">'+cells+'</div>';
  }else{
    content='<div style="text-align:center;padding:30px 0;color:#5a4530;font-family:var(--font-mono);font-size:11px;font-style:italic">no fermenters placed here</div>';
  }
  // Plus any batches placed directly (legacy/edge case) — render as chips below
  var extraBatchChips='';
  if(batches.length){
    extraBatchChips='<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center">'
      +batches.map(function(b){
        var color=getBatchColor(b);
        var bot=APP.bottling[b.id];
        var onHand=bot?bottlesOnHand(bot):0;
        return'<span onclick="event.stopPropagation();showView(\'batch\',\''+b.id+'\')" style="background:#0a0806;border-left:2px solid '+color+';padding:3px 8px;font-size:10.5px;color:#c9a350;border-radius:3px;cursor:pointer;font-family:Georgia,serif">'+escHtml(b.name)+(onHand?' <span style="font-family:var(--font-mono);font-size:9px;color:#7a6240">'+onHand+'</span>':'')+'</span>';
      }).join('')
    +'</div>';
  }
  // No rigid min-height — let the natural flex content height drive the box
  // size. The bottom label is in normal flow (not absolute) so it pushes the
  // box down to fit everything. This removes the huge empty space below the
  // fermenters that used to result from over-generous min-height heuristics.
  return'<div onclick="openShelfDetailModal(\''+s.id+'\')" '
    +'style="background:#1a140e;border:1px solid #2a2018;border-radius:2px;padding:14px 14px 14px;margin-bottom:2px;cursor:pointer;position:relative;transition:background 0.15s" '
    +'onmouseover="this.style.background=\'#221a13\'" onmouseout="this.style.background=\'#1a140e\'">'
    +'<div style="font-family:var(--font-display);font-size:11px;color:#e8c46a;letter-spacing:1px">'+escHtml(s.label)+'</div>'
    +'<div style="font-family:var(--font-mono);font-size:9px;color:#8a6a30;letter-spacing:1.5px;margin-top:3px">'+subtitle+'</div>'
    +'<div style="margin:14px 0">'+content+'</div>'
    +extraBatchChips
    +'<div style="margin-top:10px;font-family:var(--font-mono);font-size:8.5px;color:#7a6240;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:4px">'+escHtml(bottomLabel)+'</div>'
    +'<div style="height:4px;background:linear-gradient(180deg,#5c4830,#3a2c1e);margin:6px -14px -14px"></div>'
  +'</div>';
}

function renderCellarSidePanel(unassigned,unassignedFerm){
  unassignedFerm=unassignedFerm||[];
  var html='<div class="card" style="padding:14px;position:sticky;top:14px">';

  // Unassigned bottled batches
  html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--gold);letter-spacing:1.5px;margin-bottom:10px">UNPLACED BATCHES ('+unassigned.length+')</div>';
  if(!unassigned.length){
    html+='<div style="font-size:11.5px;color:var(--text3);font-style:italic;line-height:1.5;margin-bottom:14px">All bottled batches have a shelf.</div>';
  }else{
    html+='<div style="font-size:11.5px;color:var(--text3);margin-bottom:8px;line-height:1.5">Click to assign:</div>';
    unassigned.forEach(function(b){
      var bot=APP.bottling[b.id];
      var onHand=bot?bottlesOnHand(bot):0;
      var color=getBatchColor(b);
      html+='<div onclick="openShelfAssignmentModal(\''+b.id+'\')" style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
        +'<div style="font-family:var(--font-display);font-size:12px;color:'+color+'">'+escHtml(b.name)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;margin-top:2px">'+(b.serial?'#'+escHtml(b.serial)+' · ':'')+onHand+' bottle'+(onHand===1?'':'s')+'</div>'
      +'</div>';
    });
  }

  // Unassigned fermenters (vessels not yet placed on any shelf)
  html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--gold);letter-spacing:1.5px;margin:14px 0 10px;border-top:1px solid var(--border);padding-top:14px">UNPLACED FERMENTERS ('+unassignedFerm.length+')</div>';
  if(!unassignedFerm.length){
    html+='<div style="font-size:11.5px;color:var(--text3);font-style:italic;line-height:1.5">All fermenters have a home (or you haven\'t added any to the cellar yet).</div>';
  }else{
    html+='<div style="font-size:11.5px;color:var(--text3);margin-bottom:8px;line-height:1.5">Click to place on a shelf:</div>';
    unassignedFerm.forEach(function(f){
      var active=activeBatchForFermenter(f.id);
      html+='<div onclick="openFermenterShelfAssignmentModal(\''+f.id+'\')" style="background:var(--bg);border-left:3px solid '+(f.color||'var(--gold)')+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
        +'<div style="font-family:var(--font-display);font-size:12px;color:var(--gold2)">⚗ '+escHtml(f.name)+(f.capacity?' <span style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+f.capacity+'L</span>':'')+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;margin-top:2px">'+(active?escHtml(active.name):'empty')+'</div>'
      +'</div>';
    });
  }

  html+='</div>';
  return html;
}

// Backwards-compat: shows old free-text cellarSublocation values so users
// don't lose context if they had sub-locations set before v11.
function renderLegacyCellarSublocations(){
  var legacy={};
  (APP.batches||[]).forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot)return;
    var loc=(bot.cellarSublocation||'').trim();
    if(!loc)return;
    if(!legacy[loc])legacy[loc]=[];
    legacy[loc].push(b);
  });
  var keys=Object.keys(legacy);
  if(!keys.length)return'';
  var html='<div class="card" style="margin-top:20px;border-left:3px solid var(--text3)"><div class="card-header"><div class="card-title">📦 LEGACY SUBLOCATIONS</div></div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.55">Free-text sub-locations from before the structured cellar feature. These will keep showing up until you configure shelves and re-assign the batches.</div>';
  keys.sort().forEach(function(loc){
    html+='<div style="background:var(--bg);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px"><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2);margin-bottom:6px">📍 '+escHtml(loc)+'</div>';
    legacy[loc].forEach(function(b){
      html+='<span onclick="showView(\'batch\',\''+b.id+'\')" style="display:inline-block;background:var(--bg2);border-radius:4px;padding:3px 8px;margin:2px 4px 2px 0;font-size:11px;cursor:pointer;color:var(--text2)">'+escHtml(b.name)+'</span>';
    });
    html+='</div>';
  });
  html+='</div>';
  return html;
}

// ---- Cabinet management ----
function newCabinetObject(){
  return{id:genId(),name:'',model:'',location:'',capacity:0,tempSensorEntity:'',humiditySensorEntity:'',targetTemp:13,targetTempMin:8,targetTempMax:18,targetHumidityMin:50,targetHumidityMax:75,shelves:[]};
}

function addCabinet(){
  if(!Array.isArray(APP.cabinets))APP.cabinets=[];
  var cab=newCabinetObject();
  APP.cabinets.push(cab);
  openCellarConfigModal(cab.id);
}

function quickSetupWineFridge(){
  var count=parseInt(prompt('How many shelves does the cabinet have?','18'));
  if(!count||count<1)return;
  if(!Array.isArray(APP.cabinets))APP.cabinets=[];
  var cab=newCabinetObject();
  cab.name='Wine fridge';
  cab.shelves=defaultWineFridgeShelves(count);
  APP.cabinets.push(cab);
  scheduleSave();
  toast('🏠 Cabinet added — '+count+' shelves ready');
  renderMain();
}

function deleteCabinet(cabinetId){
  var cab=getCabinet(cabinetId);
  if(!cab)return;
  var shelfIds=(cab.shelves||[]).map(function(s){return s.id;});
  if(!confirm('Remove cabinet "'+(cab.name||cab.model||'Cabinet')+'"'+(shelfIds.length?' and its '+shelfIds.length+' shelves':'')+'?\n\nBatches and fermenters placed in it become unassigned.'))return;
  (APP.batches||[]).forEach(function(b){
    if(shelfIds.indexOf(b.cellarShelfId)>=0)delete b.cellarShelfId;
    var bot=APP.bottling[b.id];
    if(bot&&shelfIds.indexOf(bot.cellarShelfId)>=0)delete bot.cellarShelfId;
  });
  (APP.fermenters||[]).forEach(function(f){
    if(shelfIds.indexOf(f.cellarShelfId)>=0)delete f.cellarShelfId;
  });
  APP.cabinets=allCabinets().filter(function(c){return c.id!==cabinetId;});
  scheduleSave();
  toast('Cabinet removed');
  renderMain();
}

// ---- Shelf assignment for a batch ----
function openShelfAssignmentModal(batchId){
  closeModal();
  if(!isCellarConfigured()){toast('⚠ Configure your cellar first');openCellarConfigModal();return;}
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[batchId]||{};
  var current=bot.cellarShelfId||b.cellarShelfId||'';
  var byShelf=batchesByShelf();
  var shelfOptions=allCabinets().map(function(cab){
    var header=allCabinets().length>1?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px;margin:10px 0 6px">'+escHtml((cab.name||cab.model||'CABINET').toUpperCase())+'</div>':'';
    return header+(cab.shelves||[]).map(function(s){
    var on=byShelf[s.id]||[];
    var bottles=on.reduce(function(sum,bb){var bbot=APP.bottling[bb.id];return sum+(bbot?bottlesInLocation(bbot,'cellar'):0);},0);
    var sel=current===s.id?'sel':'';
    var bg=current===s.id?'rgba(232,196,106,0.15)':'var(--bg)';
    var borderColor=current===s.id?'var(--gold)':'var(--border)';
    return'<div onclick="document.querySelectorAll(\'.shelf-pick\').forEach(function(el){el.classList.remove(\'sel\');el.style.background=\'var(--bg)\';el.style.borderColor=\'var(--border)\'});this.classList.add(\'sel\');this.style.background=\'rgba(232,196,106,0.15)\';this.style.borderColor=\'var(--gold)\';document.getElementById(\'shelf-pick-id\').value=\''+s.id+'\'" class="shelf-pick '+sel+'" style="background:'+bg+';border:1px solid '+borderColor+';border-radius:6px;padding:9px 12px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s">'
      +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+escHtml(s.label)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">'+(s.type==='open'?'OPEN':(s.type==='fermenter_slot'?'FERMENTER':'RACK'))+(s.capacity?' · '+bottles+'/'+s.capacity:'')+'</div></div>'
      +(on.length?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+on.length+' batch'+(on.length===1?'':'es')+'</div>':'<div style="font-size:11px;color:var(--text3);font-style:italic">empty</div>')
      +'</div>';
    }).join('');
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📍 ASSIGN TO SHELF</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick a shelf for <strong style="color:var(--gold2)">'+escHtml(b.name)+'</strong>'+(b.serial?' (#'+escHtml(b.serial)+')':'')+'.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'+shelfOptions+'</div>'
    +'<input type="hidden" id="shelf-pick-id" value="'+escHtml(current)+'">'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +(current?'<button class="btn btn-danger" style="margin-right:auto" onclick="removeBatchFromShelf(\''+batchId+'\');closeModal()">Remove assignment</button>':'')
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" onclick="saveShelfAssignment(\''+batchId+'\')">Save</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveShelfAssignment(batchId){
  var shelfId=document.getElementById('shelf-pick-id').value;
  if(!shelfId){toast('⚠ Pick a shelf');return;}
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  if(APP.bottling[batchId]){
    APP.bottling[batchId].cellarShelfId=shelfId;
  }else{
    b.cellarShelfId=shelfId;
  }
  scheduleSave();
  closeModal();
  toast('📍 Batch placed');
  renderMain();
}

function removeBatchFromShelf(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  if(APP.bottling[batchId])delete APP.bottling[batchId].cellarShelfId;
  delete b.cellarShelfId;
  scheduleSave();
  toast('Removed from shelf');
  renderMain();
}

function openShelfDetailModal(shelfId){
  var hit=findShelfById(shelfId);
  if(!hit)return;
  var s=hit.shelf;
  var byShelf=batchesByShelf();
  var batches=byShelf[shelfId]||[];
  var byShelfFerm=fermentersByShelf();
  var fermenters=byShelfFerm[shelfId]||[];
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">'+(s.type==='open'?'⏐':(s.type==='fermenter_slot'?'⚗':'🍾'))+' '+escHtml(s.label)+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Type: '+(s.type==='open'?'Open (rack removed)':(s.type==='fermenter_slot'?'Fermenter slot':'Bottle rack'))+(s.capacity?' · Capacity '+s.capacity+' bottles':'')+(s.note?'<br>Note: '+escHtml(s.note):'')+'</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">';

  // ---- Fermenters on this shelf ----
  if(fermenters.length){
    html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--gold);letter-spacing:1.5px;margin-bottom:8px">FERMENTERS ON THIS SHELF</div>';
    fermenters.forEach(function(f){
      var active=activeBatchForFermenter(f.id);
      var activeStr=active?'<span style="color:'+(getBatchColor(active)||'var(--gold2)')+'">'+escHtml(active.name)+(active.serial?' #'+escHtml(active.serial):'')+'</span>':'<span style="color:var(--text3);font-style:italic">empty (no active batch)</span>';
      html+='<div style="background:var(--bg);border-left:3px solid '+(f.color||'var(--gold)')+';border-radius:4px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">⚗ '+escHtml(f.name)+(f.capacity?' <span style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+f.capacity+'L</span>':'')+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:3px">Currently: '+activeStr+'</div></div>'
        +'<div onclick="removeFermenterFromShelf(\''+f.id+'\');closeModal();renderMain();" style="color:var(--red2);font-size:14px;padding:4px 8px;cursor:pointer" title="Remove fermenter from shelf">✕</div>'
      +'</div>';
    });
  }

  // ---- Batches on this shelf ----
  if(batches.length){
    html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--gold);letter-spacing:1.5px;margin:'+(fermenters.length?'14px':'0')+' 0 8px">BATCHES ON THIS SHELF</div>';
    batches.forEach(function(b){
      var bot=APP.bottling[b.id];
      var onHand=bot?bottlesInLocation(bot,'cellar'):0; // the shelf holds cellar-located bottles
      var color=getBatchColor(b);
      html+='<div onclick="closeModal();showView(\'batch\',\''+b.id+'\')" style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(b.serial?'#'+escHtml(b.serial)+' · ':'')+onHand+' bottle'+(onHand===1?'':'s')+'</div></div>'
        +'<div onclick="event.stopPropagation();removeBatchFromShelf(\''+b.id+'\');closeModal();renderMain();" style="color:var(--red2);font-size:14px;padding:4px 8px;cursor:pointer" title="Remove from shelf">✕</div>'
      +'</div>';
    });
  }

  if(!batches.length&&!fermenters.length){
    html+='<div style="text-align:center;padding:18px;color:var(--text3);font-style:italic;font-size:13px">This shelf is empty.</div>';
  }

  // ---- Place things here ----
  var unassigned=unassignedCellarBatches();
  var unassignedFerm=unassignedFermenters();

  if(unassignedFerm.length){
    html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1.5px;margin:18px 0 8px">PLACE FERMENTER HERE</div>';
    unassignedFerm.forEach(function(f){
      var active=activeBatchForFermenter(f.id);
      html+='<div onclick="quickPlaceFermenterOnShelf(\''+f.id+'\',\''+shelfId+'\')" style="background:var(--bg);border-left:3px solid '+(f.color||'var(--gold)')+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">⚗ '+escHtml(f.name)+(f.capacity?' '+fmtVol(f.capacity):'')+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(active?escHtml(active.name):'empty')+'</div></div>'
        +'<div style="color:var(--gold2);font-size:12px">+</div>'
      +'</div>';
    });
  }

  if(unassigned.length){
    html+='<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1.5px;margin:18px 0 8px">PLACE BATCH HERE</div>';
    unassigned.forEach(function(b){
      var bot=APP.bottling[b.id];
      var onHand=bot?bottlesOnHand(bot):0;
      var color=getBatchColor(b);
      html+='<div onclick="quickPlaceOnShelf(\''+b.id+'\',\''+shelfId+'\')" style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(b.serial?'#'+escHtml(b.serial)+' · ':'')+onHand+' bottle'+(onHand===1?'':'s')+'</div></div>'
        +'<div style="color:var(--gold2);font-size:12px">+</div>'
      +'</div>';
    });
  }

  html+='</div><div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button><button class="btn btn-secondary" onclick="closeModal();openCellarConfigModal(\''+hit.cabinet.id+'\')">Edit shelves</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function quickPlaceOnShelf(batchId,shelfId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  if(APP.bottling[batchId]){
    APP.bottling[batchId].cellarShelfId=shelfId;
  }else{
    b.cellarShelfId=shelfId;
  }
  scheduleSave();
  closeModal();
  toast('📍 Placed');
  renderMain();
}

// ---- Fermenter ↔ shelf assignment ----
// Fermenters are physical vessels that sit on a shelf. The assignment is
// stable — a fermenter stays where it is until you physically move it. The
// "what batch is in this fermenter" question is answered separately by
// activeBatchForFermenter, which derives the answer from APP.batches at
// render time. That means bottling a batch automatically clears the
// fermenter's "occupied" indicator without any extra bookkeeping.
function quickPlaceFermenterOnShelf(fermenterId,shelfId){
  var f=(APP.fermenters||[]).find(function(x){return x.id===fermenterId;});
  if(!f)return;
  f.cellarShelfId=shelfId;
  scheduleSave();
  closeModal();
  toast('⚗ Fermenter placed');
  renderMain();
}

function removeFermenterFromShelf(fermenterId){
  var f=(APP.fermenters||[]).find(function(x){return x.id===fermenterId;});
  if(!f)return;
  delete f.cellarShelfId;
  scheduleSave();
  toast('Fermenter removed from shelf');
  renderMain();
}

// Modal for picking which shelf to place a fermenter on. Same pattern as
// openShelfAssignmentModal for batches, but lists all shelves regardless of
// type — the user knows their cabinet better than we do.
function openFermenterShelfAssignmentModal(fermenterId){
  closeModal();
  if(!isCellarConfigured()){toast('⚠ Configure your cellar first');openCellarConfigModal();return;}
  var f=(APP.fermenters||[]).find(function(x){return x.id===fermenterId;});
  if(!f){toast('⚠ Fermenter not found');return;}
  var current=f.cellarShelfId||'';
  var byShelf=batchesByShelf();
  var byShelfFerm=fermentersByShelf();
  var shelfOptions=allCabinets().map(function(cab){
    var header=allCabinets().length>1?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px;margin:10px 0 6px">'+escHtml((cab.name||cab.model||'CABINET').toUpperCase())+'</div>':'';
    return header+(cab.shelves||[]).map(function(s){
    var batchesOn=byShelf[s.id]||[];
    var fermsOn=byShelfFerm[s.id]||[];
    var sel=current===s.id?'sel':'';
    var bg=current===s.id?'rgba(232,196,106,0.15)':'var(--bg)';
    var borderColor=current===s.id?'var(--gold)':'var(--border)';
    var subtitle=[];
    if(fermsOn.length)subtitle.push(fermsOn.length+' ferm'+(fermsOn.length===1?'':'s'));
    if(batchesOn.length)subtitle.push(batchesOn.length+' batch'+(batchesOn.length===1?'':'es'));
    if(!subtitle.length)subtitle.push('empty');
    return'<div onclick="document.querySelectorAll(\'.ferm-shelf-pick\').forEach(function(el){el.classList.remove(\'sel\');el.style.background=\'var(--bg)\';el.style.borderColor=\'var(--border)\'});this.classList.add(\'sel\');this.style.background=\'rgba(232,196,106,0.15)\';this.style.borderColor=\'var(--gold)\';document.getElementById(\'ferm-shelf-pick-id\').value=\''+s.id+'\'" class="ferm-shelf-pick '+sel+'" style="background:'+bg+';border:1px solid '+borderColor+';border-radius:6px;padding:9px 12px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s">'
      +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+escHtml(s.label)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">'+(s.type==='open'?'OPEN':(s.type==='fermenter_slot'?'FERMENTER':'RACK'))+'</div></div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+subtitle.join(' · ')+'</div>'
      +'</div>';
    }).join('');
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">⚗ PLACE FERMENTER</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick a shelf for <strong style="color:var(--gold2)">'+escHtml(f.name)+'</strong>'+(f.capacity?' ('+f.capacity+'L)':'')+'. Multiple fermenters can share a wide shelf.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'+shelfOptions+'</div>'
    +'<input type="hidden" id="ferm-shelf-pick-id" value="'+escHtml(current)+'">'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +(current?'<button class="btn btn-danger" style="margin-right:auto" onclick="removeFermenterFromShelf(\''+fermenterId+'\');closeModal()">Remove from shelf</button>':'')
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" onclick="saveFermenterShelfAssignment(\''+fermenterId+'\')">Save</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveFermenterShelfAssignment(fermenterId){
  var shelfId=document.getElementById('ferm-shelf-pick-id').value;
  if(!shelfId){toast('⚠ Pick a shelf');return;}
  var f=(APP.fermenters||[]).find(function(x){return x.id===fermenterId;});
  if(!f)return;
  f.cellarShelfId=shelfId;
  scheduleSave();
  closeModal();
  toast('⚗ Fermenter placed');
  renderMain();
}

// ---- Cabinet config modal ----
// Edits ONE cabinet. The cabinet being edited is tracked in
// window._editingCabinetId so the inline shelf-row handlers can resolve it
// after re-renders without stale closures.
function openCellarConfigModal(cabinetId){
  closeModal();
  var c=getCabinet(cabinetId)||allCabinets()[0];
  if(!c){addCabinet();return;}
  window._editingCabinetId=c.id;
  var shelfRows=(c.shelves||[]).map(function(s,idx){
    return'<div style="background:var(--bg);border-radius:6px;padding:8px 10px;margin-bottom:5px;display:flex;gap:8px;align-items:center">'
      +'<input class="form-input" style="flex:1.5" placeholder="Label" value="'+escHtml(s.label||'')+'" oninput="getCabinet(window._editingCabinetId).shelves['+idx+'].label=this.value">'
      +'<select class="form-input" style="flex:1" onchange="getCabinet(window._editingCabinetId).shelves['+idx+'].type=this.value">'
        +'<option value="bottle_rack"'+(s.type==='bottle_rack'?' selected':'')+'>Bottle rack</option>'
        +'<option value="open"'+(s.type==='open'?' selected':'')+'>Open (rack removed)</option>'
        +'<option value="fermenter_slot"'+(s.type==='fermenter_slot'?' selected':'')+'>Fermenter slot</option>'
      +'</select>'
      +'<input class="form-input" style="width:70px" type="number" min="0" placeholder="Cap" value="'+(s.capacity||'')+'" oninput="getCabinet(window._editingCabinetId).shelves['+idx+'].capacity=parseInt(this.value)||0" title="Bottle capacity">'
      +'<button class="btn btn-danger btn-sm" onclick="removeShelfFromConfig(\''+s.id+'\')" title="Delete shelf">✕</button>'
    +'</div>';
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:680px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">⚙ CABINET CONFIGURATION</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
      +'<div class="form-group"><label class="form-label">Cabinet name</label><input class="form-input" id="cellar-name" value="'+escHtml(c.name||'')+'" placeholder="e.g. Wine fridge, Basement rack, Attic shelf"></div>'
      +'<div class="form-group"><label class="form-label">Model (optional)</label><input class="form-input" id="cellar-model" value="'+escHtml(c.model||'')+'" placeholder="e.g. Climadiff CLV254"></div>'
      +'<div class="form-group"><label class="form-label">Location</label><input class="form-input" id="cellar-location" value="'+escHtml(c.location||'')+'" placeholder="e.g. Living room corner, basement"></div>'
      +'<div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label class="form-label">Temp sensor (optional, via HA)</label><input class="form-input" id="cellar-temp-sensor" value="'+escHtml(c.tempSensorEntity||'')+'" placeholder="sensor.cabinet_temperature" style="font-family:var(--font-mono);font-size:12px"></div>'
        +'<div><label class="form-label">Humidity sensor (optional)</label><input class="form-input" id="cellar-humidity-sensor" value="'+escHtml(c.humiditySensorEntity||'')+'" placeholder="sensor.cabinet_humidity" style="font-family:var(--font-mono);font-size:12px"></div>'
      +'</div>'
      +'<div class="form-group" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
        +'<div><label class="form-label">Target °C</label><input class="form-input" id="cellar-target-temp" type="number" min="0" max="25" step="0.5" value="'+(c.targetTemp||13)+'"></div>'
        +'<div><label class="form-label">Min °C</label><input class="form-input" id="cellar-target-min" type="number" min="0" max="25" step="0.5" value="'+(c.targetTempMin||8)+'"></div>'
        +'<div><label class="form-label">Max °C</label><input class="form-input" id="cellar-target-max" type="number" min="0" max="25" step="0.5" value="'+(c.targetTempMax||18)+'"></div>'
      +'</div>'
      +'<div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label class="form-label">Min humidity %</label><input class="form-input" id="cellar-humidity-min" type="number" min="0" max="100" value="'+(c.targetHumidityMin||50)+'"></div>'
        +'<div><label class="form-label">Max humidity %</label><input class="form-input" id="cellar-humidity-max" type="number" min="0" max="100" value="'+(c.targetHumidityMax||75)+'"></div>'
      +'</div>'
      +'<div style="border-top:1px solid var(--border);margin:14px 0 10px;padding-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">Shelves ('+(c.shelves||[]).length+')</div><div><button class="btn btn-secondary btn-sm" onclick="addShelfToConfig()">+ Add shelf</button> <button class="btn btn-secondary btn-sm" onclick="resetShelvesToDefault()" title="Replace all shelves with a numbered default set">↻ Reset shelves…</button></div></div>'
        +'<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Reorder by editing the labels (e.g. \'01 Top\', \'02 Upper\'). Set type to \'Open\' for shelves you removed to fit fermenters.</div>'
        +'<div id="cellar-shelves-list">'+shelfRows+'</div>'
      +'</div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" onclick="saveCellarConfig()">Save</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function addShelfToConfig(){
  var c=getCabinet(window._editingCabinetId);
  if(!c)return;
  if(!Array.isArray(c.shelves))c.shelves=[];
  c.shelves.push({id:nextShelfId(),label:'Shelf '+(c.shelves.length+1),type:'bottle_rack',note:'',capacity:14});
  openCellarConfigModal(c.id);
}

function removeShelfFromConfig(shelfId){
  var c=getCabinet(window._editingCabinetId);
  if(!c||!Array.isArray(c.shelves))return;
  if(!confirm('Delete this shelf? Any batches and fermenters assigned to it will be unassigned.'))return;
  c.shelves=c.shelves.filter(function(s){return s.id!==shelfId;});
  // Unassign any batches that were on this shelf
  (APP.batches||[]).forEach(function(b){
    if(b.cellarShelfId===shelfId)delete b.cellarShelfId;
    var bot=APP.bottling[b.id];
    if(bot&&bot.cellarShelfId===shelfId)delete bot.cellarShelfId;
  });
  // Unassign any fermenters that were on this shelf
  (APP.fermenters||[]).forEach(function(f){
    if(f.cellarShelfId===shelfId)delete f.cellarShelfId;
  });
  openCellarConfigModal(c.id);
}

function resetShelvesToDefault(){
  var c=getCabinet(window._editingCabinetId);
  if(!c)return;
  var count=parseInt(prompt('How many shelves should this cabinet have?','18'));
  if(!count||count<1)return;
  if(!confirm('Replace current shelves with '+count+' numbered default shelves? Batch and fermenter assignments in THIS cabinet will be cleared.'))return;
  var oldIds=(c.shelves||[]).map(function(s){return s.id;});
  c.shelves=defaultWineFridgeShelves(count);
  (APP.batches||[]).forEach(function(b){
    if(oldIds.indexOf(b.cellarShelfId)>=0)delete b.cellarShelfId;
    var bot=APP.bottling[b.id];
    if(bot&&oldIds.indexOf(bot.cellarShelfId)>=0)delete bot.cellarShelfId;
  });
  (APP.fermenters||[]).forEach(function(f){
    if(oldIds.indexOf(f.cellarShelfId)>=0)delete f.cellarShelfId;
  });
  openCellarConfigModal(c.id);
}

function saveCellarConfig(){
  var c=getCabinet(window._editingCabinetId);
  if(!c)return;
  c.name=document.getElementById('cellar-name').value.trim();
  c.model=document.getElementById('cellar-model').value.trim();
  c.location=document.getElementById('cellar-location').value.trim();
  c.tempSensorEntity=document.getElementById('cellar-temp-sensor').value.trim();
  c.humiditySensorEntity=document.getElementById('cellar-humidity-sensor').value.trim();
  c.targetTemp=parseFloat(document.getElementById('cellar-target-temp').value)||13;
  c.targetTempMin=parseFloat(document.getElementById('cellar-target-min').value)||8;
  c.targetTempMax=parseFloat(document.getElementById('cellar-target-max').value)||18;
  c.targetHumidityMin=parseInt(document.getElementById('cellar-humidity-min').value)||50;
  c.targetHumidityMax=parseInt(document.getElementById('cellar-humidity-max').value)||75;
  scheduleSave();
  closeModal();
  toast('🏠 Cabinet saved');
  renderMain();
}

// Legacy renderCellarMap stays as an alias so any cached hashes still work.
function renderCellarMap(){return renderMyCellar();}


// Cellar inventory broken down by mead style — useful at-a-glance for "what
// should I open / gift / restock" decisions. Renders nothing if cellar empty
// or only one style is present (in which case the breakdown adds no info).
function renderCellarInventoryByStyle(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length)return'';
  var byStyle={};
  bottled.forEach(function(b){
    var bot=APP.bottling[b.id];
    var onHand=(typeof bottlesOnHand==='function')?bottlesOnHand(bot):(bot.bottleCount||0);
    if(!onHand)return;
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var style=(recipe&&recipe.style)||b.style||'Custom';
    if(!byStyle[style])byStyle[style]={bottles:0,batches:0,color:(recipe&&recipe.brandColor)||getBatchColor(b)};
    byStyle[style].bottles+=onHand;
    byStyle[style].batches+=1;
  });
  var keys=Object.keys(byStyle);
  if(keys.length<2)return''; // only one style — not worth a card
  // Sort by bottle count descending
  keys.sort(function(a,b){return byStyle[b].bottles-byStyle[a].bottles;});
  var totalBottles=keys.reduce(function(s,k){return s+byStyle[k].bottles;},0);
  var rows=keys.map(function(k){
    var d=byStyle[k];
    var pct=Math.round(d.bottles/totalBottles*100);
    return'<div style="display:flex;align-items:center;gap:10px;padding:6px 0">'
      +'<div style="width:80px;font-family:var(--font-display);font-size:13px;color:'+d.color+';flex-shrink:0">'+escHtml(k)+'</div>'
      +'<div style="flex:1;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;position:relative"><div style="height:100%;width:'+pct+'%;background:'+d.color+';border-radius:4px;transition:width 0.3s"></div></div>'
      +'<div style="width:80px;text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--text2);flex-shrink:0">'+d.bottles+' · '+d.batches+'<span style="color:var(--text3)"> batch'+(d.batches===1?'':'es')+'</span></div>'
      +'</div>';
  }).join('');
  return'<div style="margin-bottom:18px"><div class="card-header" style="margin-bottom:10px"><div class="card-title">📊 INVENTORY BY STYLE</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+totalBottles+' BOTTLES · '+keys.length+' STYLES</div></div>'+rows+'</div>';
}

// ==================== CELLAR ACTIONS ====================
// Editing a non-cellar location TRANSFERS bottles of the SAME SIZE to/from cellar.
// Increasing fridge[750] by 1 pulls 1 from cellar[750]. Cellar is the home location.
function setBottleLocation(batchId,loc,size,val){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  bot.cellarFilled=true; // any manual placement means the cellar is being managed
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if(!bot.locations[loc])bot.locations[loc]={};
  if(!bot.locations.cellar)bot.locations.cellar={};
  var sz=parseInt(size);
  var n=Math.max(0,parseInt(val)||0);
  var oldVal=bot.locations[loc][sz]||0;
  var delta=n-oldVal;
  if(delta===0){renderMain();return;}
  // Gifted increase → recipient prompt (handles the transfer itself)
  if(loc==='gifted'&&delta>0){
    var availCellar=bot.locations.cellar[sz]||0;
    if(availCellar<delta){
      toast('⚠ Not enough '+sz+'ml bottles in cellar to gift '+delta);
      renderMain();
      return;
    }
    if(typeof openGiftRecipientModal==='function'){
      openGiftRecipientModal(batchId,delta,sz);
      return;
    }
  }
  if(loc==='cellar'){
    bot.locations.cellar[sz]=n;
  }else{
    var newCellar=(bot.locations.cellar[sz]||0)-delta;
    if(newCellar<0){
      toast('⚠ Not enough '+sz+'ml bottles in cellar');
      renderMain();
      return;
    }
    bot.locations[loc][sz]=n;
    bot.locations.cellar[sz]=newCellar;
  }
  scheduleSave();
  renderMain();
}

function drinkBottle(batchId,size){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  var sz=parseInt(size||DEFAULT_BOTTLE_SIZE);
  // Prefer cellar, then fridge, then other
  var loc=(bot.locations.cellar[sz]||0)>0?'cellar':(bot.locations.fridge[sz]||0)>0?'fridge':(bot.locations.other&&bot.locations.other[sz]>0)?'other':null;
  if(!loc){toast('🍷 No '+sz+'ml bottles available');return;}
  bot.locations[loc][sz]=(bot.locations[loc][sz]||0)-1;
  if(bot.locations[loc][sz]<=0)delete bot.locations[loc][sz];
  bot.cellarFilled=true; // drinking from it proves it was filled — never "needs fill"
  scheduleSave();
  var onHand=bottlesOnHand(bot);
  if(onHand===0)toast('🍷 Last bottle gone — batch marked complete');
  else toast('🍷 '+onHand+' bottle'+(onHand!==1?'s':'')+' left on-hand');
  renderMain();
}

function adjustBottleCount(batchId,delta){
  // Legacy — adjust default-size cellar count only
  var bot=APP.bottling[batchId];
  if(!bot)return;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if(!bot.locations.cellar)bot.locations.cellar={};
  var current=bot.locations.cellar[DEFAULT_BOTTLE_SIZE]||0;
  setBottleLocation(batchId,'cellar',DEFAULT_BOTTLE_SIZE,Math.max(0,current+delta));
}

// Emergency restore: put all originally-bottled bottles back into cellar (per size).
function fillCellarFromOriginal(batchId){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  var orig=bottlesOriginal(bot);
  if(orig<=0){toast('⚠ No bottle count on record. Edit the batch and set a count first.');return;}
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  // Reset locations: all originals back in cellar
  bot.locations.cellar={};
  bot.locations.fridge={};
  bot.locations.gifted={};
  bot.locations.other={};
  if(bot.countsAtBottling){
    var m=_coerceLocations(bot.countsAtBottling);
    Object.keys(m).forEach(function(size){
      bot.locations.cellar[parseInt(size)]=m[size];
    });
  }else{
    bot.locations.cellar[DEFAULT_BOTTLE_SIZE]=orig;
  }
  bot.cellarFilled=true;
  scheduleSave();
  toast('✦ '+orig+' bottle'+(orig!==1?'s':'')+' placed in cellar');
  renderMain();
}

// User confirms a 0-bottle batch was drunk/gifted (not an un-filled cellar).
// Marks it filled so it reads as "Finished" instead of "⚠ NEEDS FILL".
function markBatchFinished(batchId){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  bot.cellarFilled=true;
  scheduleSave();
  toast('✦ Marked finished — enjoy the memory');
  renderMain();
}

function removeFromCellar(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  if(!confirm('Remove "'+b.name+'" from cellar?\n\nThe bottling record will be cleared and this batch will return to active status. Gravity logs and tasting notes are preserved.'))return;
  delete APP.bottling[batchId];
  scheduleSave();
  toast('Removed from cellar');
  renderMain();
}

function openCellarEditModal(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  var bot=APP.bottling[batchId]||{};
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  closeModal();
  var sweetOpts=['','Bone Dry','Dry','Off-Dry','Semi-Sweet','Sweet','Dessert']
    .map(function(o){return'<option'+(bot.sweetness===o?' selected':'')+'>'+escHtml(o)+'</option>';}).join('');
  var sizes=activeBottleSizes(bot);
  // Inventory grid: rows = sizes, columns = 4 locations
  var locDefs=[{key:'cellar',label:'Cellar'},{key:'fridge',label:'Fridge'},{key:'gifted',label:'Gifted'},{key:'other',label:'Other'}];
  var invHeader='<div style="display:grid;grid-template-columns:70px repeat(4,1fr);gap:6px;align-items:center;font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:4px"><div></div>'+locDefs.map(function(l){return'<div style="text-align:center">'+l.label.toUpperCase()+'</div>';}).join('')+'</div>';
  var invRows=sizes.map(function(size){
    return'<div style="display:grid;grid-template-columns:70px repeat(4,1fr);gap:6px;align-items:center;margin-bottom:6px">'
      +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);text-align:right">'+size+'ml</div>'
      +locDefs.map(function(l){
        var n=bottlesInLocationBySize(bot,l.key,size);
        return'<input class="form-input" type="number" min="0" id="ce-'+l.key+'-'+size+'" value="'+n+'" data-loc="'+l.key+'" data-size="'+size+'">';
      }).join('')
      +'</div>';
  }).join('');
  // Per-size original count inputs (countsAtBottling)
  var origCountsHTML=sizes.map(function(size){
    var origN=bottlesOriginalBySize(bot,size);
    return'<div class="form-group"><label class="form-label">Originally bottled ('+size+'ml)</label><input class="form-input" type="number" min="0" id="ce-orig-'+size+'" value="'+origN+'"></div>';
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">EDIT BOTTLING · '+escHtml(b.name)+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Bottle Date</label><input class="form-input" type="date" id="ce-date" value="'+(bot.date||today())+'"></div>'
    +'<div class="form-group"><label class="form-label">Final ABV %</label><input class="form-input" type="number" step="0.1" id="ce-abv" value="'+(bot.abv||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" type="number" step="0.001" id="ce-fg" value="'+(bot.fg||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Sweetness</label><select class="form-select" id="ce-sweet">'+sweetOpts+'</select></div></div>'
    +'<div style="margin:10px 0 4px;font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">INVENTORY · CURRENT</div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px">'+invHeader+invRows+'</div>'
    +'<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12px;color:var(--text3);padding:4px 0">Advanced: Edit originally-bottled counts</summary>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin:6px 0">These are immutable normally — edit only to correct historical data. Drives per-bottle cost math.</div>'
    +'<div class="form-row">'+origCountsHTML+'</div>'
    +'</details>'
    +'<div class="form-group" style="margin-top:14px"><label class="form-label">Notes</label><textarea class="form-textarea" id="ce-notes" placeholder="Bottle type, cap/cork, storage location…">'+escHtml(bot.notes||'')+'</textarea></div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-danger" style="margin-right:auto" onclick="closeModal();removeFromCellar(\''+batchId+'\')">Remove from Cellar</button>'
    +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-primary" onclick="saveCellarEdit(\''+batchId+'\')">Save</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveCellarEdit(batchId){
  var existing=APP.bottling[batchId]||{};
  var sizes=activeBottleSizes(existing);
  var locations={cellar:{},fridge:{},gifted:{},other:{}};
  var countsAtBottling={};
  ['cellar','fridge','gifted','other'].forEach(function(loc){
    sizes.forEach(function(size){
      var el=document.getElementById('ce-'+loc+'-'+size);
      var n=el?Math.max(0,parseInt(el.value)||0):0;
      if(n>0)locations[loc][size]=n;
    });
  });
  sizes.forEach(function(size){
    var el=document.getElementById('ce-orig-'+size);
    if(el){
      var n=Math.max(0,parseInt(el.value)||0);
      if(n>0)countsAtBottling[size]=n;
    }
  });
  // If countsAtBottling empty, derive from existing
  if(Object.keys(countsAtBottling).length===0&&existing.countsAtBottling){
    countsAtBottling=_coerceLocations(existing.countsAtBottling);
  }
  var totalOrig=Object.keys(countsAtBottling).reduce(function(s,k){return s+countsAtBottling[k];},0);
  APP.bottling[batchId]={
    date:document.getElementById('ce-date').value||today(),
    locations:locations,
    countsAtBottling:countsAtBottling,
    bottleSizes:Object.keys(countsAtBottling).map(function(k){return parseInt(k);}).sort(function(a,b){return a-b;}),
    bottleCount:totalOrig,
    bottlesAtBottling:totalOrig,
    fg:parseFloat(document.getElementById('ce-fg').value)||null,
    abv:parseFloat(document.getElementById('ce-abv').value)||null,
    sweetness:document.getElementById('ce-sweet').value,
    notes:document.getElementById('ce-notes').value.trim(),
    gifts:existing.gifts||[]
  };
  closeModal();
  scheduleSave();
  toast('✦ Bottling updated');
  renderMain();
}

// ==================== BRAND CREST (MeadOS logo) ====================
function brandCrestSVG(size){
  size=size||300;
  if(typeof MEADOS_LOGO!=='undefined'&&MEADOS_LOGO){
    var src=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():MEADOS_LOGO;
    return'<img src="'+src+'" alt="MeadOS" style="display:block;width:100%;max-width:'+size+'px;height:auto;margin:0 auto" loading="lazy">';
  }
  var src=getLabelImage('r1');
  if(!src)return'<div style="color:var(--text3)">Brand identity not available</div>';
  return'<img src="'+src+'" alt="Brand crest" style="display:block;width:100%;max-width:'+size+'px;height:auto;margin:0 auto" loading="lazy">';
}

// ==================== CELLAR CARD EXPAND/COLLAPSE ====================
// In-page state for which cellar cards are currently expanded. Kept in
// window memory (not localStorage) so the cellar opens clean each session.
// Auto-expand applies to batches needing user attention (e.g. NEEDS FILL).
function toggleCellarCard(batchId,event){
  if(event)event.stopPropagation();
  window._cellarExpanded=window._cellarExpanded||{};
  var open=!window._cellarExpanded[batchId];
  window._cellarExpanded[batchId]=open;
  var body=document.getElementById('cellar-body-'+batchId);
  var chev=document.getElementById('cellar-chev-'+batchId);
  if(body&&body.parentElement)body.parentElement.classList.toggle('open',open);
  if(chev)chev.textContent=open?'▼':'▶';
}

// Expand or collapse every visible cellar card at once.
function cellarExpandAll(open){
  window._cellarExpanded=window._cellarExpanded||{};
  var bodies=document.querySelectorAll('[id^="cellar-body-"]');
  bodies.forEach(function(b){
    var id=b.id.replace('cellar-body-','');
    window._cellarExpanded[id]=!!open;
    if(b.parentElement)b.parentElement.classList.toggle('open',!!open);
    var chev=document.getElementById('cellar-chev-'+id);
    if(chev)chev.textContent=open?'▼':'▶';
  });
}

// Persist the chosen cellar sort in window memory and re-render.
function setCellarSort(key){
  window._cellarSort=key||'status';
  renderMain();
}

// ==================== LABEL IMAGE HELPERS ====================
// LABEL_IMAGES is defined in part2b_labels.js (base64 data URLs for r1..r8)
// Recipes with useGenericLabel:true fall back to a programmatically rendered SVG
// with the brand crest, recipe name, and ABV.

function recipeUsesGenericLabel(recipeId){
  var r=(APP.recipes||[]).find(function(x){return x.id===recipeId;});
  if(!r)return true;
  if(r.useGenericLabel)return true;
  // Custom recipes without specific artwork also use generic
  if(!LABEL_IMAGES||!LABEL_IMAGES[recipeId])return true;
  return false;
}

// Build a small QR-code SVG fragment for a batch, sized to fit the 900-viewBox label.
// Position: bottom-left corner, fully inside the viewBox (y0+size+pad ≤ 900).
// Encodes a SHARE URL — the recipient's browser loads live data from the
// MeadOS server. Falls back to a direct batch hash if share-URL building fails.
function buildBatchQRSVG(batch,cfg){
  if(!batch||typeof QR==='undefined')return'';
  var url;
  // Prefer the public share URL (encodes batch snapshot in the hash — works for anyone)
  if(typeof buildShareURL==='function'){
    url=buildShareURL(batch);
  }
  if(!url){
    // Fallback to direct deep-link. Prefer serial for readability of any
    // intermediate URL that ever leaks (e.g. someone shares the QR target
    // via copy/paste). findBatchByRef accepts either form.
    var base=appBaseUrl();
    url=base+'#batch='+(batch.serial||batch.id);
  }
  var qr;
  try{qr=QR.generate(url,{ecLevel:'L'});}catch(e){return'';}
  var n=qr.size;
  // Geometry — bigger inner QR (was 85) so the modules print large enough to
  // scan reliably off a small bottle label; generous padding gives the quiet
  // zone scanners need. Users can scale it further with the Designer SIZE slider.
  var size=120;
  var pad=14;
  var totalW=size+pad*2;
  var totalH=size+pad*2;
  // Position from cfg (interpreted as the CENTER of the card in % of viewBox);
  // default nudged in from the corner so the larger card stays on-canvas.
  var cx=(cfg&&cfg.x!=null?cfg.x:9)*9;
  var cy=(cfg&&cfg.y!=null?cfg.y:90.5)*9;
  var bx=cx-totalW/2, by=cy-totalH/2;
  var x0=bx+pad, y0=by+pad;
  // Theme — backing + dot color combinations chosen to stay legible across
  // light, dark, and transparent label backgrounds.
  var theme=(cfg&&cfg.theme)||'light';
  var bg,dot,stroke;
  if(theme==='dark'){bg='#1a1208';dot='#f0e6cc';stroke='#c9a350';}
  else if(theme==='transparent'){bg=null;dot='#1a1208';stroke=null;}
  else{bg='#faf3e0';dot='#222';stroke='#8a6a30';}
  var cell=size/n;
  var rects=[];
  for(var r=0;r<n;r++){
    for(var c=0;c<n;c++){
      if(qr.matrix[r][c]){
        rects.push('<rect x="'+(x0+c*cell).toFixed(2)+'" y="'+(y0+r*cell).toFixed(2)+'" width="'+(cell*1.05).toFixed(2)+'" height="'+(cell*1.05).toFixed(2)+'" fill="'+dot+'"/>');
      }
    }
  }
  var sc=(cfg&&parseFloat(cfg.scale))||1;
  var tf=sc!==1?' transform="translate('+cx.toFixed(2)+' '+cy.toFixed(2)+') scale('+sc+') translate('+(-cx).toFixed(2)+' '+(-cy).toFixed(2)+')"':'';
  return'<g'+tf+'>'
    +(bg?'<rect x="'+bx+'" y="'+by+'" width="'+totalW+'" height="'+totalH+'" fill="'+bg+'"'+(stroke?' stroke="'+stroke+'" stroke-width="0.5"':'')+' rx="4"/>':'')
    +rects.join('')
    +'</g>';
}

// Best-drink-between box: mirrors the QR position into the bottom-RIGHT corner.
// White card, black border, two dates from the recipe's aging window applied
// to the bottling date. Lets people glance-read whether a bottle is in window.
function buildBestDrinkBoxSVG(batch,cfg){
  if(!batch)return'';
  var bot=APP.bottling&&APP.bottling[batch.id];
  if(!bot||!bot.date)return'';
  var recipe=APP.recipes.find(function(r){return r.id===batch.recipeId;});
  if(!recipe)return'';
  var minD=recipe.minAgeDays||30;
  var peakD=recipe.peakAgeDays||(minD*3);
  var maxD=recipe.maxAgeDays||(peakD*2);
  var botDate=new Date(bot.date);
  if(isNaN(botDate.getTime()))return'';
  function fmtShort(d){
    var dd=String(d.getDate()).padStart(2,'0');
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return dd+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  var readyDate=new Date(botDate.getTime()+minD*86400000);
  var peakDate=new Date(botDate.getTime()+peakD*86400000);
  var maxDate=new Date(botDate.getTime()+maxD*86400000);
  // Geometry: 105×105 card. Position cfg.x/cfg.y is the CENTER, in % of viewBox.
  // Defaults match original bottom-right placement (mirrored from QR).
  var size=120,pad=14;
  var bw=size+pad*2, bh=size+pad*2;
  var cx=(cfg&&cfg.x!=null?cfg.x:91)*9;
  var cy=(cfg&&cfg.y!=null?cfg.y:90.5)*9;
  var bx=cx-bw/2, by=cy-bh/2;
  // Theme — light (default white card) / dark / transparent
  var theme=(cfg&&cfg.theme)||'light';
  var bg,stroke,headFill,dateFill,subFill,peakFill;
  if(theme==='dark'){bg='#1a1208';stroke='#c9a350';headFill='#f0e6cc';dateFill='#fff8e8';subFill='#a89878';peakFill='#c9a350';}
  else if(theme==='transparent'){bg=null;stroke=null;headFill='#1a1208';dateFill='#1a1208';subFill='#4a3020';peakFill='#8a6a30';}
  else{bg='#ffffff';stroke='#000000';headFill='#000';dateFill='#000';subFill='#444';peakFill='#8a6a30';}
  var bottledMY=fmtShort(botDate).replace(/^\d+\s+/,''); // "Jun 2026"
  var ry=readyDate.getFullYear(), my=maxDate.getFullYear();
  var windowStr=(ry===my)?String(ry):ry+'–'+my;        // big, glanceable year range
  var winFont=windowStr.length<=4?34:22;               // single year can go larger
  var cxm=bx+bw/2;
  var sc=(cfg&&parseFloat(cfg.scale))||1;
  var tf=sc!==1?' transform="translate('+cx.toFixed(2)+' '+cy.toFixed(2)+') scale('+sc+') translate('+(-cx).toFixed(2)+' '+(-cy).toFixed(2)+')"':'';
  return'<g'+tf+'>'
    +(bg?'<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="'+bg+'"'+(stroke?' stroke="'+stroke+'" stroke-width="1.5"':'')+' rx="4"/>':'')
    +'<text x="'+cxm+'" y="'+(by+32)+'" font-family="Georgia,serif" font-size="13" font-weight="700" fill="'+headFill+'" text-anchor="middle" letter-spacing="2">BEST ENJOYED</text>'
    +'<text x="'+cxm+'" y="'+(by+90)+'" font-family="Georgia,serif" font-size="'+winFont+'" font-weight="700" fill="'+dateFill+'" text-anchor="middle" letter-spacing="1">'+windowStr+'</text>'
    +'<text x="'+cxm+'" y="'+(by+124)+'" font-family="Georgia,serif" font-size="12" fill="'+subFill+'" text-anchor="middle" letter-spacing="0.5">Bottled '+bottledMY+'</text>'
    +'</g>';
}

// Returns the URL to use as <img src> for a recipe's label.
// Priority order:
//   1. User custom label (APP.settings.customLabels[recipeId])
//      — data URL  → return as-is
//      — media-source ID → return cached resolved URL; null fall-through
//        triggers async resolution + re-render once URL arrives
//      — direct URL  → return as-is
//   2. Recipe-specific baked image (LABEL_IMAGES[recipeId])
//   3. Generic baked image (LABEL_IMAGES.generic)
function getLabelImage(recipeId){
  var custom=(APP.settings&&APP.settings.customLabels)?APP.settings.customLabels[recipeId]:null;
  if(custom&&typeof getResolvedMediaUrl==='function'){
    var resolved=getResolvedMediaUrl(custom);
    if(resolved)return resolved;
    // Media ref not yet resolved → fall through to baked default this render
  }
  if(LABEL_IMAGES&&LABEL_IMAGES[recipeId])return LABEL_IMAGES[recipeId];
  return LABEL_IMAGES&&LABEL_IMAGES['generic']?LABEL_IMAGES['generic']:'';
}

// Split a recipe name across up to 2 lines for the generic-label banner.
// The empty banner is ~600px wide × ~70px tall at 900-viewBox scale.
function splitLabelName(name,maxChars){
  maxChars=maxChars||20;
  if(!name)return[''];
  if(name.length<=maxChars)return[name];
  // Try splitting on natural separators first
  var sep=name.split(/[·,—–]/).map(function(s){return s.trim();}).filter(Boolean);
  if(sep.length===2&&sep[0].length<=maxChars&&sep[1].length<=maxChars)return sep;
  // Otherwise word-wrap to two lines
  var words=name.split(/\s+/);
  var line1='',line2='';
  for(var i=0;i<words.length;i++){
    if((line1+' '+words[i]).trim().length<=maxChars||!line1)line1=(line1+' '+words[i]).trim();
    else line2=(line2+' '+words[i]).trim();
  }
  return line2?[line1,line2]:[line1];
}

// SVG overlay text for the generic label: batch name in the empty banner + ABV above "% ALC."
// Coordinates calibrated to the 900×900 generic_label image:
//   - Empty banner spans y≈700-750, usable inner x≈260-640 (≈380 wide between the curls).
//   - ABV slot is the trapezoidal plaque at y≈775-870; "% ALC." text is at y=860.
// Cinzel is an all-caps display font, so character widths are wide. We dynamically size
// the font so any name fits in ~380 viewBox units.
// The banner shows the BATCH NAME only (user-chosen). If a batch has no name, banner is blank.
function buildGenericLabelOverlay(recipe,batch,abvText){
  var displayAbv=(abvText==='—'||abvText===''||abvText==null)?'':String(abvText).replace(/%$/,'').trim();
  var name=(batch&&batch.name)?String(batch.name).trim():'';
  // Cinzel cap width ≈ 0.55 × font-size with letter-spacing. Target inner width ~380.
  var maxInnerWidth=380;
  var charWidthRatio=0.55;
  var idealFontSize=name.length>0?Math.floor(maxInnerWidth/(name.length*charWidthRatio)):36;
  var nameFontSize=Math.max(14,Math.min(36,idealFontSize));
  return(name?'<text x="450" y="725" dominant-baseline="central" font-family="Cinzel,&quot;Times New Roman&quot;,serif" font-size="'+nameFontSize+'" font-weight="700" fill="#3a2010" text-anchor="middle" letter-spacing="0.5">'+escHtml(name)+'</text>':'')
    +(displayAbv?'<text x="450" y="830" font-family="Cinzel,&quot;Times New Roman&quot;,serif" font-size="48" font-weight="700" fill="#3a2010" text-anchor="middle" letter-spacing="1">'+escHtml(displayAbv)+'</text>':'');
}

// Renders an <img> + SVG overlay layer using the per-recipe overlay
// configuration (see renderOverlayLayer in part2c_extensions.js). With default
// config this produces output identical to the original baked-in positions;
// recipes with custom overrides get their personalized layout.
function renderLabelWithABV(recipeId,abvText,opts){
  opts=opts||{};
  var src=getLabelImage(recipeId);
  if(!src){
    // No custom label assigned and no baked image. Prompt the user toward
    // setting one — this used to silently render a generic WebP fallback,
    // but the baked images were removed (Kim hosts label art in HA media).
    return'<div style="border:1px dashed var(--border);border-radius:var(--radius);padding:24px 16px;text-align:center;color:var(--text3);font-size:13px;line-height:1.6">'
      +'<div style="font-size:22px;opacity:0.4;margin-bottom:6px">🏷</div>'
      +'<div>Label not yet configured for this recipe.</div>'
      +'<div style="font-size:11px;margin-top:6px;color:var(--text3);font-style:italic">Set one in <span style="color:var(--gold2);cursor:pointer;text-decoration:underline" onclick="showView(\'settings\')">Settings → Custom Labels</span> — upload an image, paste an image URL, or pick a Home Assistant media file.</div>'
      +'</div>';
  }
  var recipe=(APP.recipes||[]).find(function(x){return x.id===recipeId;});
  var batch=opts.batch||null;
  var overlayMarkup=(typeof renderOverlayLayer==='function')
    ?renderOverlayLayer(recipe,batch,abvText,{qr:opts.qr,bestDrink:opts.bestDrink,overlays:opts.overlays})
    :'';
  return'<div class="label-display" style="position:relative;width:100%;max-width:'+(opts.maxWidth||'100%')+';display:block;line-height:0">'
    +'<img src="'+src+'" alt="Mead Label" style="display:block;width:100%;height:auto;border-radius:'+(opts.radius||'4px')+'" loading="lazy">'
    +(overlayMarkup?'<svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'+overlayMarkup+'</svg>':'')
    +'</div>';
}

// Bake the overlay onto the image via canvas, then download as PNG (print-ready).
// Unified label download. Builds the same SVG that the on-screen preview shows
// (image + renderOverlayLayer output), rasterizes it to a canvas, then exports
// as PNG. By delegating the entire overlay to renderOverlayLayer, the PNG
// always matches the preview — including any Label Designer customizations.
// Previously this function hardcoded overlay coordinates separately, which
// meant Designer tweaks (font size, position, theme) silently vanished on
// export.
function downloadLabel(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  if(!recipe){toast('⚠ Recipe not found');return;}
  var logs=APP.logs[b.id]||[];
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var bot=APP.bottling[b.id];
  var abv=(bot&&bot.abv)||(b.og&&lastG?calcABV(b.og,lastG):null);
  if(abv===null){toast('⚠ Need OG and a reading or bottling ABV');return;}
  var src=getLabelImage(recipe.id);
  if(!src){toast('⚠ Label image not available');return;}

  // Step 1: ensure the base label image is a data URL. SVGs containing remote
  // <image href="..."> taint the canvas on draw (security restriction), so any
  // non-data URL must be fetched and inlined first.
  function ensureDataUrl(url,cb){
    if(/^data:/i.test(url)){cb(url);return;}
    fetch(url).then(function(r){return r.blob();}).then(function(blob){
      var reader=new FileReader();
      reader.onload=function(){cb(reader.result);};
      reader.onerror=function(){cb(null);};
      reader.readAsDataURL(blob);
    }).catch(function(){cb(null);});
  }

  ensureDataUrl(src,function(dataUrl){
    if(!dataUrl){toast('⚠ Image failed to load');return;}
    // Step 2: build the same SVG the preview uses. Single source of truth.
    // QR is explicitly enabled (opts.qr:true) — the bottle preview suppresses
    // it at small sizes, but the downloaded label should always carry it.
    var overlayMarkup=renderOverlayLayer(recipe,b,String(abv),{qr:true});
    // Escape any " inside the data URL just in case the encoder produced one
    // (rare but possible with some image content). Most data URLs are safe.
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" width="900" height="900" preserveAspectRatio="xMidYMid meet">'
      +'<image href="'+dataUrl+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'
      +overlayMarkup
      +'</svg>';
    // Step 3: rasterize via Image → canvas. Encode SVG as data URL using
    // base64 (avoids URL-encoding edge cases with the embedded data URL).
    var svgDataUrl='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
    var img=new Image();
    img.onload=function(){
      // Render at 1800×1800 for high-DPI print quality
      var out=1800;
      var canvas=document.createElement('canvas');
      canvas.width=out;canvas.height=out;
      var ctx=canvas.getContext('2d');
      // White background so any transparent label artwork prints clean
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,out,out);
      ctx.drawImage(img,0,0,out,out);
      canvas.toBlob(function(blob){
        if(!blob){toast('⚠ Could not encode PNG');return;}
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download=(b.name||'mead').replace(/[^\w-]+/g,'_')+'-label.png';
        document.body.appendChild(a);a.click();
        setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
        toast('✦ Label saved');
      },'image/png');
    };
    img.onerror=function(){toast('⚠ Could not rasterize label');};
    img.src=svgDataUrl;
  });
}

// Print the label via a popup window — opens browser print dialog with just the label sized to fit.
function printLabel(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  if(!recipe)return;
  var logs=APP.logs[b.id]||[];
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var bot=APP.bottling[b.id];
  var abv=(bot&&bot.abv)||(b.og&&lastG?calcABV(b.og,lastG):'');
  var labelHtml=renderLabelWithABV(recipe.id,abv,{radius:'0',batch:b});
  var w=window.open('','_blank','width=700,height=800');
  if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(b.name)+' Label</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:sans-serif;background:#fafafa}'
    +'.label-display{width:90mm;max-width:100%}'
    +'.meta{margin-top:14px;font-size:11px;color:#444;text-align:center}'
    +'@page{size:A4;margin:18mm}'
    +'@media print{.no-print{display:none}body{padding:0;background:#fff}.meta{color:#000}}'
    +'.btns{margin:14px 0}.btns button{padding:8px 16px;font-size:13px;cursor:pointer;margin:0 4px}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +labelHtml
    +'<div class="meta"><strong>'+escHtml(b.name)+'</strong> · '+escHtml((recipe&&recipe.style)||'Mead')+'<br>'
    +'Bottled '+(bot&&bot.date?fmtDate(bot.date):fmtDate(b.startDate))+' · '+(b.volume||'?')+'L batch · '+(abv?abv+'% ABV':'')+'</div>'
    +'</body></html>');
  w.document.close();
}

// ==================== STORAGE BOX LABELS ====================
// Big landscape labels you stick on the side of an aging-storage box, so when
// you have multiple boxes in a cellar you can identify each at a glance. They
// carry the info you actually need across the room: batch name, style, ABV,
// bottled date, drinking window (ready / peak / drink-by), contents (bottle
// counts by size), and a QR code that links to the batch in this app.
//
// Format: 1500×1000 SVG (3:2 landscape). Prints cleanly at 15cm × 10cm on a
// 6×4" label sticker or 2-up on A4. Single source of truth via SVG — same
// rasterize-to-PNG pipeline as the bottle label download.

function renderStorageLabelSVG(b){
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var bot=APP.bottling[b.id]||{};
  var logs=APP.logs[b.id]||[];
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var abv=bot.abv||(b.og&&(bot.fg||lastG)?calcABV(b.og,bot.fg||lastG):null);
  var color=(recipe&&recipe.brandColor)||getBatchColor(b)||'#c9a84c';
  var style=(recipe&&recipe.style)||b.style||'Custom Mead';
  var brandName=APP.settings.brewerName||'MeadOS';

  // Aging window using getAgingProfile (the same source the timeline uses, so
  // the storage label matches what the app says about the batch).
  var profile=(typeof getAgingProfile==='function')?getAgingProfile(b):null;
  var bottleDate=bot.date?new Date(bot.date):null;
  function addDays(d,n){return new Date(d.getTime()+n*86400000);}
  function fmtShort(d){
    if(!d||isNaN(d.getTime()))return'—';
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2,'0')+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  var readyDate=(bottleDate&&profile&&profile.minDays)?addDays(bottleDate,profile.minDays):null;
  var peakDate=(bottleDate&&profile&&profile.peakDays)?addDays(bottleDate,profile.peakDays):null;
  var drinkByDate=(bottleDate&&profile&&profile.maxDays)?addDays(bottleDate,profile.maxDays):null;

  // Bottle contents — "6×750ml + 2×500ml" style breakdown
  var counts=bot.countsAtBottling?(typeof _coerceLocations==='function'?_coerceLocations(bot.countsAtBottling):bot.countsAtBottling):{};
  var contentsParts=[];
  Object.keys(counts).map(Number).sort(function(a,b){return b-a;}).forEach(function(sz){
    if(counts[sz]>0)contentsParts.push(counts[sz]+'×'+sz+'ml');
  });
  var contentsStr=contentsParts.join(' + ')||((bot.bottleCount||'?')+' bottles');

  // QR code linking to the batch's share page in this app
  var qrTarget;
  if(typeof buildShareURL==='function')qrTarget=buildShareURL(b);
  if(!qrTarget){
    var base=appBaseUrl();
    qrTarget=base+'#batch='+(b.serial||b.id);
  }
  var qrSVG='';
  try{
    if(typeof QR!=='undefined'){
      var qr=QR.generate(qrTarget,{ecLevel:'M'});
      var qrSize=qr.size,cell=320/qrSize;
      var rects='';
      for(var r=0;r<qrSize;r++){
        for(var c=0;c<qrSize;c++){
          if(qr.matrix[r][c]){
            rects+='<rect x="'+(c*cell)+'" y="'+(r*cell)+'" width="'+(cell*1.04)+'" height="'+(cell*1.04)+'" fill="#1a0f08"/>';
          }
        }
      }
      qrSVG='<g transform="translate(110,360)"><rect x="-20" y="-20" width="360" height="360" fill="#fff" stroke="#3a2010" stroke-width="2"/>'+rects+'</g>';
    }
  }catch(e){}

  // Compute a luminance contrast so name text stays readable on the color band
  function pickContrast(hex){
    var m=/^#?([0-9a-f]{6})$/i.exec(hex||'');
    if(!m)return'#1a0f08';
    var n=parseInt(m[1],16);
    var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    var L=0.299*r+0.587*g+0.114*b;
    return L>140?'#1a0f08':'#faf3e0';
  }
  var bandText=pickContrast(color);

  // Build the SVG. ViewBox 1500×1000 (3:2 landscape).
  var nameStr=b.name||'Untitled';
  // Auto-scale the name font so long names still fit. Reserve ~970px width.
  var nameFontSize=nameStr.length<=14?92:(nameStr.length<=20?72:(nameStr.length<=28?58:48));

  var svgParts=[];
  svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1000" width="1500" height="1000">');
  // Background — warm cream
  svgParts.push('<rect x="0" y="0" width="1500" height="1000" fill="#faf3e0"/>');
  // Color band along the top (12% height)
  svgParts.push('<rect x="0" y="0" width="1500" height="120" fill="'+color+'"/>');
  // Bottom hairline accent
  svgParts.push('<rect x="0" y="985" width="1500" height="15" fill="'+color+'"/>');

  // Brewer name in the top band
  svgParts.push('<text x="60" y="78" font-family="Cinzel, Times New Roman, serif" font-size="36" font-weight="600" fill="'+bandText+'" letter-spacing="3">'+escHtml(brandName.toUpperCase())+'</text>');
  // Serial badge in the band (right side) — the batch's unique identifier.
  // Big and legible so you can call out "Box 2024-007" across the cellar.
  var serialStr=b.serial?('#'+b.serial):'';
  if(serialStr){
    svgParts.push('<text x="1440" y="78" text-anchor="end" font-family="Cinzel, Times New Roman, serif" font-size="42" font-weight="700" fill="'+bandText+'" letter-spacing="3">'+escHtml(serialStr)+'</text>');
  }else{
    svgParts.push('<text x="1440" y="78" text-anchor="end" font-family="Inter, sans-serif" font-size="22" fill="'+bandText+'" letter-spacing="2" font-style="italic">STORAGE LABEL</text>');
  }

  // Batch name (huge, centered horizontally in left column)
  svgParts.push('<text x="60" y="240" font-family="Cinzel, Times New Roman, serif" font-size="'+nameFontSize+'" font-weight="700" fill="'+color+'">'+escHtml(nameStr)+'</text>');
  // Style + ABV line
  var subline=style+(abv?'  ·  '+abv+'% ABV':'')+(b.volume?'  ·  '+b.volume+' L batch':'');
  svgParts.push('<text x="60" y="295" font-family="Inter, sans-serif" font-size="32" fill="#5a3a20" font-style="italic">'+escHtml(subline)+'</text>');

  // Separator
  svgParts.push('<line x1="60" y1="335" x2="1440" y2="335" stroke="#c9a84c" stroke-width="2" stroke-dasharray="4,4"/>');

  // QR (left, around y=360 set above)
  if(qrSVG)svgParts.push(qrSVG);

  // Information block (right of QR)
  var infoX=500,infoY=410,infoLineH=68;
  function infoRow(label,value,offset){
    var y=infoY+offset*infoLineH;
    return'<text x="'+infoX+'" y="'+y+'" font-family="Inter, sans-serif" font-size="22" fill="#8a6a30" letter-spacing="3">'+escHtml(label.toUpperCase())+'</text>'
      +'<text x="'+(infoX+340)+'" y="'+y+'" font-family="Cinzel, Times New Roman, serif" font-size="36" font-weight="600" fill="#1a0f08">'+escHtml(value)+'</text>';
  }
  svgParts.push(infoRow('Bottled', fmtShort(bottleDate), 0));
  svgParts.push(infoRow('Ready from', fmtShort(readyDate), 1));
  svgParts.push(infoRow('Peak', fmtShort(peakDate), 2));
  svgParts.push(infoRow('Drink by', fmtShort(drinkByDate), 3));
  svgParts.push(infoRow('Contents', contentsStr, 4));
  if(b.honeyType){
    svgParts.push(infoRow('Honey', b.honeyType, 5));
  }

  // Footer (just above the bottom band)
  // Show cellar shelf prominently when set — that's where the label
  // actually earns its keep ("where do I put this box? Shelf 4.").
  // New v11 cellarShelfId takes priority; falls back to legacy free-text.
  var sublocation='';
  if(bot.cellarShelfId&&typeof findShelfById==='function'){
    var hit=findShelfById(bot.cellarShelfId);
    if(hit)sublocation=hit.shelf.label+((hit.cabinet.name||hit.cabinet.model)?' · '+(hit.cabinet.name||hit.cabinet.model):'');
  }
  if(!sublocation)sublocation=bot.cellarSublocation||'';
  if(sublocation){
    svgParts.push('<text x="60" y="935" font-family="Inter, sans-serif" font-size="24" fill="#5a3a20" font-weight="600">📍 '+escHtml(sublocation)+'</text>');
    svgParts.push('<text x="60" y="970" font-family="Inter, sans-serif" font-size="16" fill="#8a6a30" letter-spacing="1">'+escHtml('Scan QR for full batch details')+'</text>');
  }else{
    svgParts.push('<text x="60" y="955" font-family="Inter, sans-serif" font-size="20" fill="#8a6a30" letter-spacing="2">'+escHtml('Scan QR to view full batch journey, tasting notes, and label.')+'</text>');
  }

  svgParts.push('</svg>');
  return svgParts.join('');
}

// Open a print-ready window with a single storage label. Cardboard-stick size.
function printStorageLabel(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id];
  if(!bot){toast('⚠ Batch is not bottled — bottle it first to generate a storage label');return;}
  var svg=renderStorageLabelSVG(b);
  var w=window.open('','_blank','width=900,height=700');
  if(!w){toast('⚠ Popup blocked — allow popups for this site to print labels');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Storage Label · '+escHtml(b.name)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:20px;font-family:Inter,sans-serif;background:#f3f3f3;display:flex;flex-direction:column;align-items:center}'
    +'.label{width:150mm;max-width:100%;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.15)}'
    +'.label svg{display:block;width:100%;height:auto}'
    +'.btns{margin-bottom:14px}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'.btns button:hover{background:#f0f0f0}'
    +'.hint{font-size:11px;color:#666;text-align:center;margin-top:14px;max-width:600px;line-height:1.5}'
    +'@page{size:A4 portrait;margin:15mm}'
    +'@media print{body{padding:0;background:#fff}.no-print{display:none}.label{box-shadow:none;width:150mm}.hint{display:none}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +'<div class="label">'+svg+'</div>'
    +'<div class="hint no-print">This label prints at 150mm × 100mm. Stick it on the side of your aging-storage box for quick identification across the cellar. The QR code scans to this batch\'s page in MeadŌS — handy for a guest browsing your collection. Use a 4×6\" sticker label or print on A4 and trim.</div>'
    +'</body></html>');
  w.document.close();
}

// Rasterize the storage label SVG to a high-DPI PNG. Same SVG → canvas pipeline
// used for bottle labels — single source of truth.
function downloadStorageLabel(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id];
  if(!bot){toast('⚠ Batch is not bottled — bottle it first to generate a storage label');return;}
  var svg=renderStorageLabelSVG(b);
  var svgDataUrl='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
  var img=new Image();
  img.onload=function(){
    // 3000×2000 → 300 DPI for a 10cm × ~6.7cm print (the label is rendered at
    // 1500×1000 viewBox, 3:2). Good enough for crisp printing.
    var outW=3000,outH=2000;
    var canvas=document.createElement('canvas');
    canvas.width=outW;canvas.height=outH;
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(img,0,0,outW,outH);
    canvas.toBlob(function(blob){
      if(!blob){toast('⚠ Could not encode PNG');return;}
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=(b.name||'mead').replace(/[^\w-]+/g,'_')+'-storage-label.png';
      document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
      toast('✦ Storage label saved');
    },'image/png');
  };
  img.onerror=function(){toast('⚠ Could not rasterize label');};
  img.src=svgDataUrl;
}

// Sheet of storage labels — all bottled batches, 2-up on A4. Useful when you
// bottle several batches in one session and want to print one stack.
// Top-level entry: open the selection modal. Replaces the old "just print
// everything" behavior because cellars accumulate — printing all of them
// produces a 30-page stack of labels for boxes that already have them.
function printAllStorageLabels(){
  openStorageLabelPicker();
}

function openStorageLabelPicker(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length){toast('⚠ No bottled batches yet');return;}
  // Selection state lives on window so re-renders within the modal don't lose
  // the user's checkbox state. Default to NOTHING selected — safer when the
  // typical workflow is "I just bottled one batch and want a label for it".
  if(!window._storagePrintSel)window._storagePrintSel={};
  // Drop any selections referring to batches that no longer exist
  Object.keys(window._storagePrintSel).forEach(function(id){
    if(!APP.batches.find(function(b){return b.id===id;}))delete window._storagePrintSel[id];
  });
  renderStorageLabelPicker();
}

function renderStorageLabelPicker(){
  closeModal();
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  // Sort most-recently-bottled first — newest are most likely to need labels.
  bottled.sort(function(a,b){
    var da=(APP.bottling[a.id]&&APP.bottling[a.id].date)||'';
    var db=(APP.bottling[b.id]&&APP.bottling[b.id].date)||'';
    return db.localeCompare(da);
  });
  var sel=window._storagePrintSel||{};
  var selCount=bottled.filter(function(b){return sel[b.id];}).length;

  var rows=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    var isSel=!!sel[b.id];
    var color=getBatchColor(b);
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var style=(recipe&&recipe.style)||b.style||'Custom';
    var bottleDate=bot.date?fmtDate(bot.date):'—';
    var ageDays=bot.date?Math.floor((new Date()-new Date(bot.date))/86400000):null;
    var ageLabel=ageDays!=null?(ageDays<30?ageDays+'d ago':ageDays<365?Math.floor(ageDays/30)+'mo ago':Math.floor(ageDays/365)+'y'+(ageDays>=365*2?'s':'')+' ago'):'';
    var onHand=typeof bottlesOnHand==='function'?bottlesOnHand(bot):(bot.bottleCount||0);
    var origTotal=typeof bottlesOriginal==='function'?bottlesOriginal(bot):(bot.bottleCount||0);
    var bottleInfo=onHand+' / '+origTotal+' bottle'+(origTotal!==1?'s':'')+' on hand';
    return'<div onclick="toggleStoragePrintSelection(\''+b.id+'\')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:'+(isSel?'rgba(232,196,106,0.10)':'var(--bg)')+';border-left:3px solid '+color+';border-radius:var(--radius);cursor:pointer;margin-bottom:6px;transition:background 0.15s">'
      +'<input type="checkbox" '+(isSel?'checked':'')+' onclick="event.stopPropagation();toggleStoragePrintSelection(\''+b.id+'\')" style="width:18px;height:18px;cursor:pointer;accent-color:var(--gold2)">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:'+color+'">'+escHtml(b.name)+'</div>'
        +(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:1px 6px;border-radius:6px">#'+escHtml(b.serial)+'</span>':'')
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase">'+escHtml(style)+'</div>'
      +'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:3px">'
        +'Bottled '+bottleDate+(ageLabel?' · '+ageLabel:'')+' · '+bottleInfo
      +'</div></div>'
      +'</div>';
  }).join('');

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:720px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📦 PRINT STORAGE LABELS</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Select which batches to print labels for. Sorted newest-bottled first so a recent batch is at the top. Each selection prints a 15×10 cm label, stacked one per page on A4.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--border)">'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionAll(true)">Select all</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionAll(false)">Clear</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionRecent(30)" title="Select batches bottled in the last 30 days">Recent (30d)</button>'
      +'<div style="margin-left:auto;font-family:var(--font-mono);font-size:11px;color:'+(selCount?'var(--gold2)':'var(--text3)')+'">'+selCount+' / '+bottled.length+' selected</div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;margin:0 -4px;padding:0 4px">'+rows+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" '+(selCount===0?'disabled style="opacity:0.4;cursor:not-allowed"':'')+' onclick="printSelectedStorageLabels()">🖨 Print '+(selCount?selCount+' label'+(selCount===1?'':'s'):'…')+'</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function toggleStoragePrintSelection(batchId){
  if(!window._storagePrintSel)window._storagePrintSel={};
  if(window._storagePrintSel[batchId])delete window._storagePrintSel[batchId];
  else window._storagePrintSel[batchId]=true;
  renderStorageLabelPicker();
}

function setStoragePrintSelectionAll(state){
  window._storagePrintSel=window._storagePrintSel||{};
  if(state){
    APP.batches.forEach(function(b){
      if(APP.bottling[b.id])window._storagePrintSel[b.id]=true;
    });
  }else{
    window._storagePrintSel={};
  }
  renderStorageLabelPicker();
}

function setStoragePrintSelectionRecent(days){
  window._storagePrintSel={};
  var cutoff=Date.now()-days*86400000;
  APP.batches.forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var t=new Date(bot.date).getTime();
    if(!isNaN(t)&&t>=cutoff)window._storagePrintSel[b.id]=true;
  });
  renderStorageLabelPicker();
}

function printSelectedStorageLabels(){
  var sel=window._storagePrintSel||{};
  var selected=APP.batches.filter(function(b){return sel[b.id]&&APP.bottling[b.id];});
  if(!selected.length){toast('⚠ Nothing selected');return;}
  // Preserve newest-first ordering for the print stack
  selected.sort(function(a,b){
    var da=(APP.bottling[a.id]&&APP.bottling[a.id].date)||'';
    var db=(APP.bottling[b.id]&&APP.bottling[b.id].date)||'';
    return db.localeCompare(da);
  });
  var w=window.open('','_blank','width=900,height=700');
  if(!w){toast('⚠ Popup blocked');return;}
  var labels=selected.map(function(b){
    return'<div class="label">'+renderStorageLabelSVG(b)+'</div>';
  }).join('');
  var title='Storage Labels · '+selected.length+' batch'+(selected.length===1?'':'es');
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(title)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:20px;font-family:Inter,sans-serif;background:#f3f3f3}'
    +'.btns{position:sticky;top:0;background:#fff;padding:12px;text-align:center;margin-bottom:14px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'.grid{display:grid;grid-template-columns:1fr;gap:14px;max-width:160mm;margin:0 auto}'
    +'.label{width:150mm;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);page-break-inside:avoid}'
    +'.label svg{display:block;width:100%;height:auto}'
    +'@page{size:A4 portrait;margin:10mm}'
    +'@media print{body{padding:0;background:#fff}.no-print{display:none}.label{box-shadow:none}.grid{grid-template-columns:1fr;gap:5mm}.label{page-break-inside:avoid;break-inside:avoid}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print '+selected.length+' label'+(selected.length===1?'':'s')+'</button><button onclick="window.close()">Close</button></div>'
    +'<div class="grid">'+labels+'</div>'
    +'</body></html>');
  w.document.close();
  closeModal();
}

// ==================== COMPARE VIEW ====================
function renderCompare(){
  var selected=APP.compareSelection||[];
  // Filter out batches that no longer exist
  selected=selected.filter(function(id){return APP.batches.find(function(b){return b.id===id;});});
  APP.compareSelection=selected;
  // Build selection grid
  var cards=APP.batches.map(function(b){
    var color=getBatchColor(b);
    var sel=selected.indexOf(b.id)!==-1;
    var status=getBatchStatus(b);
    var logs=APP.logs[b.id]||[];
    var lastG=logs.length?logs[logs.length-1].gravity:b.og;
    return'<div class="compare-card '+(sel?'selected':'')+'" onclick="toggleCompare(\''+b.id+'\')" style="border-left:3px solid '+color+'">'
      +'<div class="check">✓</div>'
      +'<div style="font-family:var(--font-display);font-size:14px;color:'+color+';margin-bottom:4px;padding-right:24px">'+escHtml(b.name)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">'+(b.style||'Custom')+' · '+(b.og||'?')+' → '+(lastG||'?')+' · '+(b.volume||'?')+'L</div>'
      +'<div style="margin-top:6px">'+statusBadge(status)+'</div>'
      +'</div>';
  }).join('');

  // Build comparison panel
  var comparisonHtml='';
  if(selected.length>=1){
    var selBatches=selected.map(function(id){return APP.batches.find(function(b){return b.id===id;});});
    // Value helpers
    function lastG(b){var lg=APP.logs[b.id]||[];return lg.length?lg[lg.length-1].gravity:null;}
    function protoLabel(b){
      var pr=b.nutrientProtocol;
      var map={tosca2:'TOSCA 2.0',tosna2:'TOSNA',tiosna:'TiOSNA',sna:'SNA','sna-high':'SNA (high-gravity)'};
      if(pr&&map[pr])return map[pr];
      var p=getNutrientById(b.nutrient);
      return p?(p.protocol==='tosna'?'TOSNA / TOSCA':p.protocol==='goferm'?'Rehydration':'SNA'):'—';
    }
    function honeyRisk(b){
      var hp=HONEY_PROFILES[b.honeyType];var t=hp&&hp.tech;
      if(!t)return'—';
      return (t.fgRatio?t.fgRatio.toFixed(2)+':1':'?')+' · '+(t.fructoseRisk||'—');
    }
    var ccy=APP.settings.currency||'€';
    // Comprehensive, grouped rows. {section} = sub-header; [label,fn] = data.
    var statRows=[
      {section:'🍯 Recipe & ingredients'},
      ['Recipe',function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return r?r.name:(b.style||'—');}],
      ['Style',function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return(r&&r.style)||b.style||'—';}],
      ['Honey type',function(b){return b.honeyType||'—';}],
      ['Honey amount',function(b){return b.honey?fmtWt(b.honey):'—';}],
      ['F:G · stall risk',honeyRisk],
      ['Yeast',function(b){var y=getYeastById(b.yeast);return y?y.name.split('—')[0].trim():(b.yeast||'—');}],
      ['Nutrient',function(b){var p=getNutrientById(b.nutrient);return p?p.name:(b.nutrient||'—');}],
      ['Schedule',protoLabel],
      {section:'⚗ Fermentation'},
      ['Volume',function(b){return fmtVol(b.volume||0);}],
      ['OG',function(b){return b.og||'—';}],
      ['Current / Final',function(b){return lastG(b)||b.og||'—';}],
      ['Est. ABV',function(b){var g=lastG(b);return b.og&&g?calcABV(b.og,g)+'%':'—';}],
      ['Attenuation',function(b){var g=lastG(b);return b.og&&g?((b.og-g)/(b.og-1)*100).toFixed(1)+'%':'—';}],
      ['Fermenter',function(b){var f=getFermenter&&getFermenter(b.fermenterId);return f?f.name:'—';}],
      ['Readings logged',function(b){return(APP.logs[b.id]||[]).length;}],
      ['Status',function(b){return getBatchStatus(b);}],
      {section:'🍾 Outcome'},
      ['Bottled',function(b){var bo=APP.bottling[b.id];return bo&&bo.date?fmtDate(bo.date):'—';}],
      ['Final gravity',function(b){var bo=APP.bottling[b.id];return bo&&bo.fg?bo.fg:'—';}],
      ['Final ABV',function(b){var bo=APP.bottling[b.id];return bo&&bo.abv?bo.abv+'%':'—';}],
      ['Sweetness',function(b){var bo=APP.bottling[b.id];return(bo&&bo.sweetness)||'—';}],
      ['Bottles',function(b){var bo=APP.bottling[b.id];if(!bo)return'—';var sz=fmtBottleSizes((bo.countsAtBottling?(function(){var m={};(bo.bottleSizes||Object.keys(bo.countsAtBottling)).forEach(function(s){m[parseInt(s)]=bottlesOriginalBySize(bo,s);});return m;})():{}));return bottlesOriginal(bo)+(sz?' ('+sz+')':'');}],
      ['Brew → bottle',function(b){var bo=APP.bottling[b.id];if(!bo||!bo.date||!b.startDate)return'—';return Math.round((new Date(bo.date)-new Date(b.startDate))/86400000)+' days';}],
      ['Cost',function(b){return(b.cost&&(b.cost.honey||0)+(b.cost.extras||0))?ccy+((b.cost.honey||0)+(b.cost.extras||0)).toFixed(2):'—';}],
      ['Cost / bottle',function(b){var bo=APP.bottling[b.id];var tot=b.cost?(b.cost.honey||0)+(b.cost.extras||0):0;var n=bo?bottlesOriginal(bo):0;return(tot&&n)?ccy+(tot/n).toFixed(2):'—';}],
      ['Tastings',function(b){var ts=APP.tastings[b.id]||[];if(!ts.length)return'0';var avg=ts.reduce(function(s,t){return s+(t.rating||0);},0)/ts.length;return ts.length+(avg>0?' · ★'+avg.toFixed(1):'');}]
    ];
    // A data row is a "difference" when its values aren't all identical.
    function rowDiffers(fn){
      if(selBatches.length<2)return false;
      var first=String(fn(selBatches[0]));
      return selBatches.some(function(b){return String(fn(b))!==first;});
    }
    comparisonHtml='<div class="card" style="margin-top:20px"><div class="card-header"><div class="card-title">SIDE BY SIDE</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">◆ = differs</div></div>'
      +'<div style="overflow-x:auto"><table class="data-table" style="min-width:600px"><thead><tr><th></th>'
      +selBatches.map(function(b){return'<th style="color:'+getBatchColor(b)+'">'+escHtml(b.name)+'</th>';}).join('')
      +'</tr></thead><tbody>'
      +statRows.map(function(row){
        if(row.section){
          return'<tr><td colspan="'+(selBatches.length+1)+'" style="padding-top:12px;color:var(--gold);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;border-bottom:1px solid var(--border)">'+row.section+'</td></tr>';
        }
        var differs=rowDiffers(row[1]);
        return'<tr'+(differs?' style="background:rgba(201,168,76,0.05)"':'')+'><td style="color:'+(differs?'var(--gold2)':'var(--text3)')+';font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:1px">'+(differs?'◆ ':'')+row[0]+'</td>'
          +selBatches.map(function(b){return'<td>'+escHtml(String(row[1](b)))+'</td>';}).join('')
          +'</tr>';}).join('')
      +'</tbody></table></div></div>';
    if(selected.length>=2){
      comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">GRAVITY OVERLAY</div></div><div style="position:relative;height:300px"><canvas id="compare-gravity"></canvas></div></div>';
      comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">ABV OVERLAY</div></div><div style="position:relative;height:300px"><canvas id="compare-abv"></canvas></div></div>';
      // Tasting wheel overlay — pulls each batch's latest tasting wheel and
      // draws them all on a single radar with different colors.
      var batchesWithTasting=selBatches.filter(function(b){
        var ts=APP.tastings[b.id];
        if(!ts||!ts.length)return false;
        var latest=ts[ts.length-1];
        return latest&&latest.wheel&&Object.values(latest.wheel).some(function(v){return v>0;});
      });
      if(batchesWithTasting.length>=2){
        comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">TASTING WHEEL OVERLAY</div></div>'
          +'<div style="font-size:12px;color:var(--text3);margin-bottom:12px;font-style:italic">Comparing the latest tasting profile of each batch. Each color is a batch — see which dimensions diverge.</div>'
          +renderTastingOverlayRadar(batchesWithTasting)
          +'</div>';
      }else if(selected.length>=2){
        comparisonHtml+='<div class="info-box" style="margin-top:16px;border-left-color:var(--text3)"><div style="font-size:12px;color:var(--text3)">💡 Add tasting notes to at least 2 selected batches to see the tasting wheel overlay.</div></div>';
      }
    }
  }

  return'<div class="page-title">Compare</div><div class="page-subtitle">Side-by-side analysis · select 2-4 batches to overlay gravity curves and stats'+(selected.length?' · '+selected.length+' selected':'')+'</div>'
    +(selected.length>0?'<div style="margin-bottom:12px"><button class="btn btn-secondary btn-sm" onclick="APP.compareSelection=[];renderMain()">Clear Selection</button></div>':'')
    +(APP.batches.length?'<div class="grid-3" style="gap:10px">'+cards+'</div>':'<div class="empty-state"><p>No batches to compare yet.</p></div>')
    +comparisonHtml;
}

function toggleCompare(id){
  var sel=APP.compareSelection||[];
  var idx=sel.indexOf(id);
  if(idx>=0)sel.splice(idx,1);
  else{
    if(sel.length>=4){toast('⚠ Max 4 batches for comparison');return;}
    sel.push(id);
  }
  APP.compareSelection=sel;
  renderMain();
}

function initCompareCharts(){
  setTimeout(function(){
    var sel=APP.compareSelection||[];
    if(sel.length<2)return;
    var selBatches=sel.map(function(id){return APP.batches.find(function(b){return b.id===id;});}).filter(Boolean);
    // Days-since-start as x axis for fair overlay
    function buildSeries(b){
      var og=b.og||1.095;
      var logs=APP.logs[b.id]||[];
      var data=[{x:0,y:og}].concat(logs.map(function(l){return{x:daysSince(b.startDate)-daysSince(l.date)+daysSince(l.date)-daysSince(b.startDate),y:l.gravity};}));
      // Recompute x properly: days from batch start to reading date
      var startMs=new Date(b.startDate).getTime();
      data=[{x:0,y:og}].concat(logs.map(function(l){return{x:Math.max(0,Math.round((new Date(l.date)-startMs)/86400000)),y:l.gravity};}));
      return data;
    }
    function buildAbv(b){
      var og=b.og||1.095;
      var logs=APP.logs[b.id]||[];
      var startMs=new Date(b.startDate).getTime();
      return[{x:0,y:0}].concat(logs.map(function(l){return{x:Math.max(0,Math.round((new Date(l.date)-startMs)/86400000)),y:l.gravity?parseFloat(calcABV(og,l.gravity)):0};}));
    }
    var gctx=document.getElementById('compare-gravity');
    if(gctx){
      new Chart(gctx,{
        type:'line',
        data:{datasets:selBatches.map(function(b){return{label:b.name,data:buildSeries(b),borderColor:getBatchColor(b),backgroundColor:'transparent',tension:0.3,pointRadius:3,borderWidth:2};})},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,labels:{color:'#a89880',font:{size:11}}}},
          scales:{x:{type:'linear',title:{display:true,text:'Days since brew day',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10}},grid:{color:'#2a2a35'}},
            y:{title:{display:true,text:'Gravity (SG)',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(3);}},grid:{color:'#2a2a35'}}}}
      });
    }
    var actx=document.getElementById('compare-abv');
    if(actx){
      new Chart(actx,{
        type:'line',
        data:{datasets:selBatches.map(function(b){return{label:b.name,data:buildAbv(b),borderColor:getBatchColor(b),backgroundColor:'transparent',tension:0.3,pointRadius:3,borderWidth:2};})},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,labels:{color:'#a89880',font:{size:11}}}},
          scales:{x:{type:'linear',title:{display:true,text:'Days since brew day',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10}},grid:{color:'#2a2a35'}},
            y:{beginAtZero:true,title:{display:true,text:'ABV %',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(1)+'%';}},grid:{color:'#2a2a35'}}}}
      });
    }
  },100);
}

// ==================== SUPPLIES VIEW ====================
// Each supply item: {id, name, type, qty, unit, openDate, expiryDate, notes}
var SUPPLY_TYPES=[
  {key:'yeast',label:'Yeast Packets',icon:'✦',unit:'packets',defaultName:"Mangrove Jack's M05"},
  {key:'nutrient',label:'Yeast Nutrient',icon:'⚡',unit:'packets',defaultName:"M.J. Mead Yeast Nutrient"},
  {key:'sanitizer',label:'Sanitizer (no-rinse)',icon:'🧼',unit:'ml',defaultName:''},
  {key:'cleaner',label:'Cleaner (oxygen-based)',icon:'🧴',unit:'g',defaultName:'Chemipro OXI'},
  {key:'sulfite',label:'Potassium Metabisulfite',icon:'🧪',unit:'g',defaultName:'Potassium Metabisulfite'},
  {key:'sorbate',label:'Potassium Sorbate',icon:'🧪',unit:'g',defaultName:'Potassium Sorbate'},
  {key:'pectic',label:'Pectic Enzyme',icon:'🧪',unit:'g',defaultName:'Pectic Enzyme'},
  {key:'bottle750',label:'Bottles · 750 ml',icon:'🍷',unit:'pcs',defaultName:'750 ml bottles'},
  {key:'bottle500',label:'Bottles · 500 ml',icon:'🍶',unit:'pcs',defaultName:'500 ml bottles'},
  {key:'cork',label:'Corks',icon:'🪵',unit:'pcs',defaultName:'Natural corks'},
  {key:'crowncap',label:'Crown Caps',icon:'⭕',unit:'pcs',defaultName:'Crown caps (26mm)'},
  {key:'honey',label:'Honey',icon:'🍯',unit:'kg',defaultName:'Wildflower Honey'},
  {key:'other',label:'Other',icon:'📦',unit:'',defaultName:''}
];

function renderSupplies(){
  var items=APP.supplies||[];
  var byType={};
  SUPPLY_TYPES.forEach(function(t){byType[t.key]=[];});
  items.forEach(function(it){
    var k=it.type||'other';
    if(!byType[k])byType[k]=[];
    byType[k].push(it);
  });
  // Compute total inventory value across all supplies that have a price set
  var totalValue=0,pricedCount=0;
  items.forEach(function(it){
    var price=parseFloat(it.pricePerUnit)||0;
    var qty=parseFloat(it.qty)||0;
    if(price>0){totalValue+=price*qty;pricedCount++;}
  });
  var currency=APP.settings.currency||'€';
  var inventoryCard=pricedCount?'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 INVENTORY VALUE</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;text-align:center">'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)">'+currency+totalValue.toFixed(2)+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">CURRENT VALUE ON HAND</div></div>'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--text)">'+pricedCount+'/'+items.length+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">PRICED SUPPLIES</div></div>'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--text)">'+items.length+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">TOTAL TRACKED</div></div>'
    +'</div></div>':'';
  var sections=SUPPLY_TYPES.map(function(t){
    var arr=byType[t.key]||[];
    var rows=arr.length?arr.map(function(it){
      var expired=it.expiryDate&&new Date(it.expiryDate)<new Date();
      var low=parseFloat(it.qty)<=0.5;
      var cls=(expired?'expired ':'')+(low?'low':'');
      var price=parseFloat(it.pricePerUnit)||0;
      var qty=parseFloat(it.qty)||0;
      var lineValue=price*qty;
      var priceLine=price>0?'<span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+currency+price.toFixed(2)+'/'+escHtml(it.unit||'unit')+(qty>0?' · '+currency+lineValue.toFixed(2)+' total':'')+'</span>':'';
      return'<div class="supplies-row '+cls+'">'
        +'<div class="qty">'+(it.qty||'0')+'<span style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:2px">'+(it.unit||'')+'</span></div>'
        +'<div class="info">'
        +'<div class="name">'+escHtml(it.name)+(it.brand?' <span style="color:var(--text3);font-size:12px;font-style:italic">· '+escHtml(it.brand)+'</span>':'')+'</div>'
        +'<div class="meta">'
        +(it.openDate?'Opened '+fmtDate(it.openDate)+' · ':'')
        +(it.expiryDate?'<span style="color:'+(expired?'var(--red2)':'var(--text3)')+'">Expires '+fmtDate(it.expiryDate)+'</span>':'')
        +(priceLine?(it.openDate||it.expiryDate?' · ':'')+priceLine:'')
        +(it.notes?' · '+escHtml(it.notes):'')
        +'</div></div>'
        +'<div style="display:flex;gap:4px"><button class="cellar-mini-btn" onclick="adjustSupply(\''+it.id+'\',-1)" title="Use one">−</button>'
        +'<button class="cellar-mini-btn" onclick="adjustSupply(\''+it.id+'\',1)" title="Add one">+</button>'
        +'<button class="btn-icon" style="width:26px;height:26px" onclick="openSupplyEditModal(\''+it.id+'\')" title="Edit">✏</button>'
        +'<button class="btn-icon" style="width:26px;height:26px;border-color:var(--red);color:var(--red2)" onclick="deleteSupply(\''+it.id+'\')" title="Delete">🗑</button></div>'
        +'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:8px 0">None tracked</div>';
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+t.icon+' '+t.label.toUpperCase()+' · '+arr.length+'</div><button class="btn btn-secondary btn-sm" onclick="openSupplyEditModal(null,\''+t.key+'\')">＋ Add</button></div>'+rows+'</div>';
  }).join('');
  return'<div class="page-title">Supplies</div><div class="page-subtitle">Inventory of yeast, chemicals, and consumables · '+items.length+' tracked · stored in the shared server database</div>'
    +renderShoppingListCard()
    +renderBrewWhatYouHaveCard()
    +inventoryCard
    +sections;
}

// ==================== SUPPLIER ROLODEX ====================
// Lightweight contact-book of beekeepers, mead shops, brewing-supply stores.
// Each entry: name, type (beekeeper/shop/online), location, honey/product
// specialties as a free-text tag list, opening hours / contact, notes, and
// "rating" (1-5 stars) for personal quality ranking.
//
// Cross-linked with the Honey Library: when viewing a honey type, suppliers
// who carry it appear in the sources section.

// Supply categories a supplier can carry — so the rolodex isn't honey-only.
var SUPPLY_CATEGORIES=['Honey','Bottles','Crown caps','Corks','Yeast','Nutrient','Fruit & adjuncts','Spices & herbs','Oak','Acids & chemicals','Equipment','Other'];
function renderSuppliersView(){
  var suppliers=APP.suppliers||[];
  // Sort: rated > unrated, then by name
  suppliers=suppliers.slice().sort(function(a,b){
    if(b.rating!==a.rating)return(b.rating||0)-(a.rating||0);
    return(a.name||'').localeCompare(b.name||'');
  });
  var rows=suppliers.map(function(s){
    var stars=s.rating?'★'.repeat(s.rating)+'<span style="color:var(--bg4)">'+'★'.repeat(5-s.rating)+'</span>':'<span style="color:var(--text3);font-size:11px">unrated</span>';
    var typeBadge='<span style="font-family:var(--font-mono);font-size:9px;color:var(--gold2);background:rgba(232,196,106,0.12);border:1px solid var(--gold2);padding:2px 7px;border-radius:8px;letter-spacing:1px">'+escHtml((s.type||'shop').toUpperCase())+'</span>';
    var honeyTags=(s.honeys||[]).map(function(h){
      var prof=HONEY_PROFILES[h];
      var color=(prof&&prof.color)||'var(--gold)';
      return'<span onclick="event.stopPropagation();currentHoneyName=\''+h.replace(/\'/g,"\\\'")+'\';showView(\'honey-detail\')" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-family:var(--font-mono);font-size:9.5px;background:rgba(0,0,0,0.20);color:'+color+';border:1px solid '+color+'66;padding:1px 6px;border-radius:6px;margin:2px 3px 2px 0">'+escHtml(h)+'</span>';
    }).join('');
    var catTags=(s.categories||[]).map(function(c){
      return'<span style="font-family:var(--font-mono);font-size:9px;color:var(--text2);background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:6px;margin:2px 3px 2px 0;letter-spacing:0.5px">'+escHtml(c)+'</span>';
    }).join('');
    var contactLine=[s.location,s.hours,s.contact,s.url].filter(Boolean).join(' · ');
    return'<div class="card" style="margin-bottom:10px;cursor:default;padding:0;overflow:hidden">'
      +'<div style="display:flex;align-items:stretch">'
      +'<div style="width:4px;background:var(--gold)"></div>'
      +'<div style="flex:1;padding:12px 16px">'
      +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div style="font-family:var(--font-display);font-size:15px;color:var(--gold2)">'+escHtml(s.name)+'</div>'+typeBadge+'<div>'+stars+'</div></div>'
      +'<div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" onclick="openEditSupplierModal(\''+s.id+'\')">✏</button><button class="btn btn-secondary btn-sm" onclick="deleteSupplier(\''+s.id+'\')" style="color:var(--red2)">✕</button></div>'
      +'</div>'
      +(contactLine?'<div style="font-size:11.5px;color:var(--text3);margin-bottom:6px;font-style:italic">'+escHtml(contactLine)+(s.url?' <a href="'+escHtml(s.url)+'" target="_blank" rel="noopener" style="color:var(--gold2);text-decoration:none;margin-left:4px">↗</a>':'')+'</div>':'')
      +(catTags?'<div style="margin:6px 0">'+catTags+'</div>':'')
      +(honeyTags?'<div style="margin:6px 0">'+honeyTags+'</div>':'')
      +(s.notes?'<div style="font-size:12.5px;color:var(--text2);line-height:1.55;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">'+escHtml(s.notes)+'</div>':'')
      +'</div></div></div>';
  }).join('');
  return'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px"><div><div class="page-title" style="margin-bottom:0">Suppliers</div></div>'
    +'<button class="btn btn-primary btn-sm" onclick="openEditSupplierModal()">＋ Add Supplier</button>'
    +'</div>'
    +'<div class="page-subtitle">Beekeepers, mead shops, brewing-supply stores · '+suppliers.length+' entries</div>'
    +(suppliers.length
      ?rows
      :'<div class="empty-state"><div class="es-icon">🏪</div><p>No suppliers yet. Add your trusted beekeepers and brewing-supply shops to keep track of where to source each honey type and ingredient.</p></div>');
}

function openEditSupplierModal(id){
  closeModal();
  var s=id?(APP.suppliers||[]).find(function(x){return x.id===id;}):null;
  var isNew=!s;
  if(isNew)s={name:'',type:'shop',location:'',hours:'',contact:'',url:'',rating:0,categories:[],honeys:[],notes:''};
  // Supply-category checkboxes (bottles, caps, yeast, additions, …) — what they sell.
  var catChecks=SUPPLY_CATEGORIES.map(function(c){
    var sel=(s.categories||[]).indexOf(c)>=0;
    return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;margin:2px 4px 2px 0;cursor:pointer;background:'+(sel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(sel?'var(--gold)':'var(--border)')+';padding:3px 7px;border-radius:6px;color:'+(sel?'var(--gold2)':'var(--text2)')+'"><input type="checkbox" data-cat="'+escHtml(c)+'" '+(sel?'checked':'')+' style="margin:0;cursor:pointer;accent-color:var(--gold2)">'+escHtml(c)+'</label>';
  }).join('');
  // Pre-build honey-variety checkboxes from HONEY_TYPES (for honey sellers)
  var honeyChecks=HONEY_TYPES.filter(function(h){return h!=='Mixed'&&h!=='Other';}).map(function(h){
    var sel=(s.honeys||[]).indexOf(h)>=0;
    return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;margin:2px 4px 2px 0;cursor:pointer;background:'+(sel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(sel?'var(--gold)':'var(--border)')+';padding:3px 7px;border-radius:6px;color:'+(sel?'var(--gold2)':'var(--text2)')+'"><input type="checkbox" data-honey="'+escHtml(h)+'" '+(sel?'checked':'')+' style="margin:0;cursor:pointer;accent-color:var(--gold2)">'+escHtml(h)+'</label>';
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:640px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">'+(isNew?'＋ ADD SUPPLIER':'✏ EDIT SUPPLIER')+'</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div class="form-row"><div class="form-group" style="flex:2"><label class="form-label">Name</label><input class="form-input" id="sup-name" value="'+escHtml(s.name)+'" placeholder="e.g. Local Beekeeper Co / Homebrew Shop / Online Apiary"></div>'
    +'<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sup-type">'
    +['beekeeper','shop','online','market','other'].map(function(t){return'<option value="'+t+'"'+(s.type===t?' selected':'')+'>'+t+'</option>';}).join('')
    +'</select></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Location</label><input class="form-input" id="sup-location" value="'+escHtml(s.location||'')+'" placeholder="e.g. city / region / online only"></div>'
    +'<div class="form-group"><label class="form-label">Hours / Availability</label><input class="form-input" id="sup-hours" value="'+escHtml(s.hours||'')+'" placeholder="e.g. Sat 9-13 / mail-order"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Contact (phone/email)</label><input class="form-input" id="sup-contact" value="'+escHtml(s.contact||'')+'" placeholder="email or phone"></div>'
    +'<div class="form-group"><label class="form-label">Website</label><input class="form-input" id="sup-url" value="'+escHtml(s.url||'')+'" placeholder="https://…" style="font-family:var(--font-mono);font-size:12px"></div></div>'
    +'<div class="form-group"><label class="form-label">Rating</label><div style="display:flex;gap:4px" id="sup-rating-row">'
    +[1,2,3,4,5].map(function(n){return'<span onclick="document.getElementById(\'sup-rating\').value='+n+';renderSupRatingStars()" style="font-size:24px;cursor:pointer;color:'+(s.rating>=n?'var(--gold2)':'var(--bg4)')+';transition:color 0.15s" class="sup-star" data-n="'+n+'">★</span>';}).join('')
    +'<input type="hidden" id="sup-rating" value="'+(s.rating||0)+'"></div></div>'
    +'<div class="form-group"><label class="form-label">What they supply <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">click to toggle</span></label><div id="sup-cats" style="line-height:2">'+catChecks+'</div></div>'
    +'<div class="form-group"><label class="form-label">Honey varieties <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">if they sell honey · click to toggle</span></label><div id="sup-honeys" style="line-height:2">'+honeyChecks+'</div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="sup-notes" placeholder="What\'s the best they sell? Pricing notes? Any quality remarks?" style="min-height:90px">'+escHtml(s.notes||'')+'</textarea></div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-primary" onclick="saveSupplier('+(isNew?'null':'\''+s.id+'\'')+')">'+(isNew?'Add Supplier':'Save')+'</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('sup-name');if(el&&isNew)el.focus();},50);
}

function renderSupRatingStars(){
  var n=parseInt(document.getElementById('sup-rating').value)||0;
  document.querySelectorAll('.sup-star').forEach(function(el){
    var v=parseInt(el.dataset.n);
    el.style.color=v<=n?'var(--gold2)':'var(--bg4)';
  });
}

function saveSupplier(id){
  var honeys=[];
  document.querySelectorAll('#sup-honeys input[type=checkbox]:checked').forEach(function(cb){
    honeys.push(cb.dataset.honey);
  });
  var categories=[];
  document.querySelectorAll('#sup-cats input[type=checkbox]:checked').forEach(function(cb){
    categories.push(cb.dataset.cat);
  });
  var data={
    name:document.getElementById('sup-name').value.trim(),
    type:document.getElementById('sup-type').value,
    categories:categories,
    location:document.getElementById('sup-location').value.trim(),
    hours:document.getElementById('sup-hours').value.trim(),
    contact:document.getElementById('sup-contact').value.trim(),
    url:document.getElementById('sup-url').value.trim(),
    rating:parseInt(document.getElementById('sup-rating').value)||0,
    honeys:honeys,
    notes:document.getElementById('sup-notes').value.trim()
  };
  if(!data.name){toast('⚠ Name required');return;}
  if(!Array.isArray(APP.suppliers))APP.suppliers=[];
  if(id){
    var idx=APP.suppliers.findIndex(function(x){return x.id===id;});
    if(idx>=0)APP.suppliers[idx]=Object.assign(APP.suppliers[idx],data);
  }else{
    data.id=genId();
    APP.suppliers.push(data);
  }
  scheduleSave();closeModal();toast('✦ Supplier saved');renderMain();
}

function deleteSupplier(id){
  if(!confirm('Remove this supplier from the rolodex?'))return;
  APP.suppliers=(APP.suppliers||[]).filter(function(x){return x.id!==id;});
  scheduleSave();toast('Supplier removed');renderMain();
}

function adjustSupply(id,delta){
  var it=APP.supplies.find(function(x){return x.id===id;});
  if(!it)return;
  var q=parseFloat(it.qty)||0;
  var nq=Math.max(0,q+delta);
  it.qty=nq;
  scheduleSave();
  if(nq===0)toast('⚠ '+it.name+' is out — order more');
  renderMain();
}

function openSupplyEditModal(id,defaultType){
  closeModal();
  var it=id?APP.supplies.find(function(x){return x.id===id;}):null;
  var isNew=!it;
  var typeKey=isNew?(defaultType||'other'):(it.type||'other');
  var typeInfo=SUPPLY_TYPES.find(function(t){return t.key===typeKey;})||SUPPLY_TYPES[SUPPLY_TYPES.length-1];
  var typeOpts=SUPPLY_TYPES.map(function(t){return'<option value="'+t.key+'"'+(typeKey===t.key?' selected':'')+'>'+t.icon+' '+t.label+'</option>';}).join('');
  // Datalist of honey varieties — only suggests when type=honey and user is typing
  var honeyVarietyOpts=(typeof HONEY_TYPES!=='undefined'&&HONEY_TYPES.length)?
    '<datalist id="honey-variety-list">'+HONEY_TYPES.map(function(h){return'<option value="'+escHtml(h)+'"></option>';}).join('')+'</datalist>':'';
  // Yeast variety datalist — same idea, suggests yeast strains
  var yeastVarietyOpts=(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS.length)?
    '<datalist id="yeast-variety-list">'+YEAST_STRAINS.map(function(y){return'<option value="'+escHtml(y.name)+'"></option>';}).join('')+'</datalist>':'';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'
    +'<div class="modal-title">'+(isNew?'ADD':'EDIT')+' SUPPLY</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sup-type" onchange="onSupplyTypeChange()">'+typeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label" id="sup-name-label">Name</label>'
    +'<input class="form-input" id="sup-name" value="'+escHtml(it?it.name:(typeKey==='sanitizer'?getSanitizer().name:typeInfo.defaultName))+'" list="'+(typeKey==='honey'?'honey-variety-list':typeKey==='yeast'?'yeast-variety-list':'')+'" placeholder="'+(typeKey==='honey'?'e.g. Wildflower, Buckwheat, Acacia':typeKey==='yeast'?'e.g. M05, EC-1118':'')+'">'
    +honeyVarietyOpts+yeastVarietyOpts
    +'<div id="sup-name-hint" style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">'+(typeKey==='honey'?'Pick a variety from the suggestions or type your own. Track each honey separately.':(typeKey==='yeast'?'Start typing to pick a yeast strain. Track each strain separately.':''))+'</div>'
    +'</div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" step="0.01" id="sup-qty" value="'+(it?it.qty:1)+'"></div>'
    +'<div class="form-group"><label class="form-label">Unit</label><input class="form-input" id="sup-unit" value="'+escHtml(it?it.unit:typeInfo.unit)+'"></div>'
    +'<div class="form-group"><label class="form-label">Brand (optional)</label><input class="form-input" id="sup-brand" value="'+escHtml(it&&it.brand||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Opened Date</label><input class="form-input" type="date" id="sup-opened" value="'+(it&&it.openDate?it.openDate:'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Expiry Date</label><input class="form-input" type="date" id="sup-expiry" value="'+(it&&it.expiryDate?it.expiryDate:'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Price per '+escHtml(it?it.unit:typeInfo.unit)+' ('+(APP.settings.currency||'€')+', optional)</label><input class="form-input" type="number" step="0.01" id="sup-price" value="'+(it&&it.pricePerUnit||'')+'" placeholder="e.g. 3.50"></div>'
    +'<div class="form-group"><label class="form-label">Low-Stock Threshold (optional)</label><input class="form-input" type="number" step="0.5" id="sup-threshold" value="'+(it&&it.threshold||'')+'" placeholder="Alert at this level"></div></div>'
    // Packet-size field — visible for yeast and nutrient supplies, where
    // packets/sachets are the natural unit but recipes scale in grams.
    // The displayed packet count in recipe scaling uses this value.
    +'<div class="form-row" id="sup-packet-row" style="display:'+((typeKey==='yeast'||typeKey==='nutrient')?'grid':'none')+'">'
    +'<div class="form-group"><label class="form-label" id="sup-packet-label">Packet size (g)</label>'
    +'<input class="form-input" type="number" step="0.5" min="0" id="sup-packet-size" value="'+(it&&it.packetSize||'')+'" placeholder="'+(typeKey==='yeast'?'e.g. 10 for M05':typeKey==='nutrient'?'e.g. 12 for MJ':'10')+'">'
    +'<div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Grams per packet/sachet. Recipes show grams + computed packet count using this. Defaults to 10g (yeast) or 12g (nutrient) if left blank.</div>'
    +'</div><div class="form-group"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="sup-notes">'+escHtml(it&&it.notes||'')+'</textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveSupply(\''+(it?it.id:'')+'\')">Save</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// When the user changes the supply type in the modal, swap the autocomplete
// list and helper hint so honey/yeast supplies get useful suggestions while
// other types remain free-text.
function onSupplyTypeChange(){
  var typeKey=document.getElementById('sup-type').value;
  var nameInput=document.getElementById('sup-name');
  var hint=document.getElementById('sup-name-hint');
  var unitInput=document.getElementById('sup-unit');
  var typeInfo=SUPPLY_TYPES.find(function(t){return t.key===typeKey;})||SUPPLY_TYPES[SUPPLY_TYPES.length-1];
  if(typeKey==='honey'){
    nameInput.setAttribute('list','honey-variety-list');
    nameInput.placeholder='e.g. Wildflower, Buckwheat, Acacia';
    hint.textContent='Pick a variety from the suggestions or type your own. Track each honey separately.';
  }else if(typeKey==='yeast'){
    nameInput.setAttribute('list','yeast-variety-list');
    nameInput.placeholder='e.g. M05, EC-1118';
    hint.textContent='Start typing to pick a yeast strain. Track each strain separately.';
  }else{
    nameInput.removeAttribute('list');
    nameInput.placeholder='';
    hint.textContent='';
  }
  // Default unit for the type if user hasn't customized it
  if(unitInput&&typeInfo.unit&&!unitInput.dataset.touched){unitInput.value=typeInfo.unit;}
  unitInput.addEventListener('input',function(){this.dataset.touched='1';},{once:true});
  // Show/hide packet-size row + update placeholder based on type
  var packetRow=document.getElementById('sup-packet-row');
  var packetInput=document.getElementById('sup-packet-size');
  if(packetRow){
    if(typeKey==='yeast'){
      packetRow.style.display='grid';
      if(packetInput)packetInput.placeholder='e.g. 10 for M05';
    }else if(typeKey==='nutrient'){
      packetRow.style.display='grid';
      if(packetInput)packetInput.placeholder='e.g. 12 for MJ';
    }else{
      packetRow.style.display='none';
    }
  }
}

function saveSupply(id){
  var packetSizeEl=document.getElementById('sup-packet-size');
  var packetSize=packetSizeEl?(parseFloat(packetSizeEl.value)||0):0;
  var data={
    id:id||genId(),
    type:document.getElementById('sup-type').value,
    name:document.getElementById('sup-name').value.trim(),
    qty:parseFloat(document.getElementById('sup-qty').value)||0,
    unit:document.getElementById('sup-unit').value.trim(),
    brand:document.getElementById('sup-brand').value.trim(),
    openDate:document.getElementById('sup-opened').value||null,
    expiryDate:document.getElementById('sup-expiry').value||null,
    pricePerUnit:parseFloat((document.getElementById('sup-price')||{}).value)||0,
    threshold:parseFloat(document.getElementById('sup-threshold').value)||0,
    packetSize:packetSize>0?packetSize:undefined,
    notes:document.getElementById('sup-notes').value.trim()
  };
  if(!data.name){toast('⚠ Name required');return;}
  var idx=APP.supplies.findIndex(function(x){return x.id===data.id;});
  if(idx>=0)APP.supplies[idx]=data;
  else APP.supplies.push(data);
  closeModal();scheduleSave();
  toast('✦ Supply saved');renderMain();
}

function deleteSupply(id){
  var it=APP.supplies.find(function(x){return x.id===id;});
  if(!it)return;
  if(!confirm('Delete "'+it.name+'"?'))return;
  APP.supplies=APP.supplies.filter(function(x){return x.id!==id;});
  scheduleSave();toast('Deleted');renderMain();
}

// ==================== BREW AGAIN ====================
function brewAgain(originalBatchId){
  var ob=APP.batches.find(function(x){return x.id===originalBatchId;});
  if(!ob){toast('⚠ Source batch not found');return;}
  // Pre-populate the new batch modal with values from the original
  openNewBatchModal(ob.recipeId);
  setTimeout(function(){
    var nameField=document.getElementById('nb-name');
    if(nameField){
      // Append batch number / increment
      var baseName=ob.name.replace(/\s*#\d+\s*$/,'').trim();
      var existing=APP.batches.filter(function(b){return b.name.startsWith(baseName);}).length;
      nameField.value=baseName+' #'+(existing+1);
    }
    var volField=document.getElementById('nb-vol');
    if(volField&&ob.volume)volField.value=ob.volume;
    var ogField=document.getElementById('nb-og');
    if(ogField&&ob.og)ogField.value=ob.og;
    var honeyField=document.getElementById('nb-honey');
    if(honeyField&&ob.honey)honeyField.value=ob.honey;
    // Carry over the qualitative choices too — honey variety, yeast strain,
    // and nutrient amount — so "Brew Again" actually reproduces the batch
    // instead of resetting to recipe defaults.
    var honeyTypeField=document.getElementById('nb-honey-type');
    if(honeyTypeField&&ob.honeyType)honeyTypeField.value=ob.honeyType;
    var yeastField=document.getElementById('nb-yeast');
    if(yeastField&&ob.yeast)yeastField.value=ob.yeast;
    var nutrientField=document.getElementById('nb-nutrient');
    if(nutrientField&&ob.nutrient)nutrientField.value=ob.nutrient;
    var notesField=document.getElementById('nb-notes');
    if(notesField&&ob.notes)notesField.value='Previous batch notes:\n'+ob.notes;
  },50);
}

// ==================== TEST NOTIFICATION ====================
async function testNotification(){
  // Read directly from the settings inputs so the user doesn't have to click Save first
  var svcInput=document.getElementById('set-notify');
  var svc=(svcInput&&svcInput.value.trim())||APP.settings.notificationService;
  if(!svc){toast('⚠ Enter notification service first');return;}
  if(!haConfigured()){toast('⚠ Configure HA first');return;}
  toast('Sending test…');
  var ok=await haCallService('notify',svc,{
    title:'⚗ MeadOS Test',
    message:'Push notifications are working. Your mead awaits.',
    data:{tag:'meados-test'}
  });
  toast(ok?'✓ Test sent — check your phone':'✗ Failed — verify the service name');
}

// ==================== MULTI-UP LABEL SHEET ====================
function printAllLabels(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length){toast('⚠ No bottled batches yet');return;}
  openLabelSheetModal(bottled.map(function(b){return b.id;}));
}

// Layout cell counts
var LABEL_LAYOUTS={
  '2x3':{c:2,r:3,cells:6,label:'2 × 3 = 6 per page (90×80mm)'},
  '2x4':{c:2,r:4,cells:8,label:'2 × 4 = 8 per page (90×62mm)'},
  '3x4':{c:3,r:4,cells:12,label:'3 × 4 = 12 per page (60×62mm)'},
  '1x2':{c:1,r:2,cells:2,label:'1 × 2 = 2 large per page (180×130mm)'}
};

function openLabelSheetModal(batchIds){
  closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:540px">'
    +'<div class="modal-title">PRINT LABEL SHEET</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">A4 sheet with multiple labels. Pick batches and how many of each — by default the sheet auto-fills.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Layout per A4 page</label><select class="form-select" id="ls-layout" onchange="updateLabelSheetTotals()">'
    +Object.keys(LABEL_LAYOUTS).map(function(k){return'<option value="'+k+'"'+(k==='2x3'?' selected':'')+'>'+LABEL_LAYOUTS[k].label+'</option>';}).join('')
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Copies of each batch</label><input class="form-input" type="number" id="ls-copies" value="6" min="1" max="100" oninput="updateLabelSheetTotals()"></div></div>'
    +'<div style="background:var(--bg4);border-radius:var(--radius);padding:10px;font-family:var(--font-mono);font-size:12px;color:var(--text2);margin-bottom:14px" id="ls-summary">—</div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:8px 0">SELECT BATCHES</div>'
    +'<div style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:8px">'
    +APP.batches.filter(function(b){return APP.bottling[b.id];}).map(function(b){
      var checked=batchIds.indexOf(b.id)!==-1;
      return'<label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;border-radius:4px" class="ls-batch-row"><input type="checkbox" data-batch="'+b.id+'" '+(checked?'checked':'')+' style="cursor:pointer" onchange="updateLabelSheetTotals()"><span style="color:'+getBatchColor(b)+';font-family:var(--font-display);font-size:13px;letter-spacing:1px;flex:1">'+escHtml(b.name)+'</span><span style="color:var(--text3);font-size:11px">'+(APP.bottling[b.id].abv||'?')+'% · '+totalBottles(APP.bottling[b.id])+' btl</span></label>';
    }).join('')
    +'</div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-secondary" onclick="setLabelCopiesPerBottle()" title="One copy per bottle in cellar+fridge">Match Bottle Counts</button>'
    +'<button class="btn btn-primary" onclick="generateLabelSheet()">Generate &amp; Print</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(updateLabelSheetTotals,30);
}

function updateLabelSheetTotals(){
  var layout=document.getElementById('ls-layout').value;
  var copies=Math.max(1,parseInt(document.getElementById('ls-copies').value)||1);
  var checked=Array.from(document.querySelectorAll('.ls-batch-row input:checked'));
  var batchCount=checked.length;
  var layoutInfo=LABEL_LAYOUTS[layout];
  var total=batchCount*copies;
  var pages=Math.ceil(total/layoutInfo.cells);
  var s=document.getElementById('ls-summary');
  if(s){
    if(batchCount===0)s.innerHTML='<span style="color:var(--text3)">No batches selected</span>';
    else s.innerHTML=batchCount+' batch'+(batchCount!==1?'es':'')+' × '+copies+' copies = <strong style="color:var(--gold2)">'+total+' labels</strong> across <strong>'+pages+' A4 page'+(pages!==1?'s':'')+'</strong>'+(total<layoutInfo.cells?' <span style="color:var(--text3)">(page will have '+(layoutInfo.cells-total)+' empty cells)</span>':'');
  }
}

function setLabelCopiesPerBottle(){
  // Sum bottles across all checked batches and set copies = max bottles
  var checked=Array.from(document.querySelectorAll('.ls-batch-row input:checked'));
  if(!checked.length){toast('⚠ Select batches first');return;}
  var maxBottles=Math.max.apply(null,checked.map(function(cb){
    var bid=cb.dataset.batch;
    return totalBottles(APP.bottling[bid])||1;
  }));
  document.getElementById('ls-copies').value=Math.max(1,maxBottles);
  updateLabelSheetTotals();
  toast('Copies set to '+maxBottles+' (highest bottle count)');
}

function generateLabelSheet(){
  var layout=document.getElementById('ls-layout').value;
  var copies=Math.max(1,parseInt(document.getElementById('ls-copies').value)||1);
  var checked=Array.from(document.querySelectorAll('.ls-batch-row input:checked'));
  if(!checked.length){toast('⚠ Select at least one batch');return;}
  var batchIds=checked.map(function(cb){return cb.dataset.batch;});
  var info=LABEL_LAYOUTS[layout];
  // Label dimensions per layout (slightly smaller than cell so they fit + breathing room)
  var dims={
    '2x3':{w:'90mm',h:'85mm',fs:'13px',abvFs:'15px'},
    '2x4':{w:'90mm',h:'62mm',fs:'12px',abvFs:'13px'},
    '3x4':{w:'58mm',h:'62mm',fs:'9px',abvFs:'10px'},
    '1x2':{w:'180mm',h:'130mm',fs:'18px',abvFs:'24px'}
  }[layout];
  // Build queue: each batch × copies times, interleaved so similar labels group naturally
  var queue=[];
  for(var c=0;c<copies;c++){
    batchIds.forEach(function(id){queue.push(id);});
  }
  // Render labels
  var labelHtmls=queue.map(function(id){
    var b=APP.batches.find(function(x){return x.id===id;});
    if(!b)return'';
    var bot=APP.bottling[id]||{};
    var abv=bot.abv||(b.og&&bot.fg?calcABV(b.og,bot.fg):null);
    var labelImg=getLabelImage(b.recipeId);
    if(!labelImg)return'<div class="lbl placeholder">No label</div>';
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var overlay=(typeof renderOverlayLayer==='function')
      ?renderOverlayLayer(recipe,b,abv||'')
      :'';
    return'<div class="lbl">'
      +'<svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
      +'<image href="'+labelImg+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'
      +overlay
      +'</svg>'
      +'</div>';
  }).join('');
  closeModal();
  var w=window.open('','_blank');
  if(!w){toast('⚠ Pop-up blocked — allow pop-ups for this site');return;}
  w.document.write('<!DOCTYPE html><html><head><title>MeadOS — Label Sheet</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:A4;margin:6mm}'
    +'*{box-sizing:border-box}'
    +'body{margin:0;padding:0;font-family:Georgia,serif;background:#fff}'
    +'.sheet{display:grid;grid-template-columns:repeat('+info.c+',1fr);grid-auto-rows:'+dims.h+';gap:3mm;padding:0;width:100%}'
    +'.lbl{position:relative;width:100%;height:100%;overflow:hidden;break-inside:avoid;page-break-inside:avoid;'
      +'border:1px dashed rgba(120,120,120,0.45);'
      // ✂ — subtle cut guides on all four sides
    +'}'
    +'.lbl svg{width:100%;height:100%;display:block}'
    +'.lbl.placeholder{font-size:'+dims.fs+';color:#888;display:flex;align-items:center;justify-content:center}'
    +'.toolbar{padding:12px;background:#222;color:#fff;text-align:center;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}'
    +'.toolbar button{padding:10px 20px;font-size:14px;cursor:pointer;border:0;border-radius:4px;background:var(--gold);color:#0a0a0b;font-weight:600;font-family:Georgia,serif}'
    +'.toolbar .toolbar-toggle{font-size:12px;color:#bbb;display:flex;align-items:center;gap:6px;cursor:pointer}'
    +'.no-guides .lbl{border-color:transparent!important}'
    +'@media print{.toolbar{display:none!important}body{background:#fff}}'
    +'</style></head><body>'
    +'<div class="toolbar"><button onclick="window.print()">🖨 Print '+queue.length+' Labels</button><label class="toolbar-toggle"><input type="checkbox" checked onchange="document.body.classList.toggle(\'no-guides\',!this.checked)"> Show cut guides</label><span>'+queue.length+' labels · '+info.c+'×'+info.r+' grid · '+Math.ceil(queue.length/info.cells)+' page'+(Math.ceil(queue.length/info.cells)!==1?'s':'')+'</span></div>'
    +'<div class="sheet">'+labelHtmls+'</div>'
    +'</body></html>');
  w.document.close();
  setTimeout(function(){try{w.focus();}catch(e){}},500);
}

// ==================== YEAST ATTENUATION ANALYTICS ====================
function calcAttenuationStats(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&b.og&&(APP.bottling[b.id].fg||(APP.logs[b.id]||[]).length);});
  if(!bottled.length)return null;
  var vals=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    var fg=bot.fg||(APP.logs[b.id]&&APP.logs[b.id].length?APP.logs[b.id][APP.logs[b.id].length-1].gravity:null);
    if(!fg||!b.og||b.og<=fg)return null;
    return{
      name:b.name,
      og:b.og,
      fg:fg,
      attenuation:((b.og-fg)/(b.og-1))*100,
      color:getBatchColor(b)
    };
  }).filter(Boolean);
  if(!vals.length)return null;
  var avg=vals.reduce(function(s,v){return s+v.attenuation;},0)/vals.length;
  var min=Math.min.apply(null,vals.map(function(v){return v.attenuation;}));
  var max=Math.max.apply(null,vals.map(function(v){return v.attenuation;}));
  return{avg:avg,min:min,max:max,count:vals.length,batches:vals};
}

// ==================== STORAGE HELPERS ====================
async function verifyServerStorage(){
  var st=document.getElementById('conn-status');
  if(st)st.innerHTML='<span style="color:var(--text2)">⟳ Verifying…</span>';
  var results=[];
  var res=await apiFetch('/api/health');
  if(res&&res.ok){
    try{
      var h=await res.json();
      results.push('✓ <strong>server</strong>: reachable · SQLite database <code>'+escHtml(h.db||'meados.db')+'</code>');
      if(h.found)results.push('✓ <strong>stored state</strong>: '+((h.bytes||0)/1024).toFixed(1)+' KB · updated '+(h.updatedAt?fmtDateTime(h.updatedAt):'unknown')+(h.historyCount?' · '+h.historyCount+' snapshot'+(h.historyCount===1?'':'s')+' in history':''));
      else results.push('⊘ <strong>stored state</strong>: empty — nothing saved yet');
    }catch(e){
      results.push('✗ <strong>server</strong>: unexpected response');
    }
  }else{
    results.push('✗ <strong>server</strong>: unreachable — is server.py running?');
  }
  var ls=localStorage.getItem('meadows_data');
  if(ls)results.push('✓ <strong>local cache</strong>: '+(ls.length/1024).toFixed(1)+' KB');
  else results.push('✗ <strong>local cache</strong>: empty');
  if(st)st.innerHTML='<div style="font-size:12px;line-height:1.8">'+results.join('<br>')+'</div>';
}
var verifyHAStorage=verifyServerStorage; // legacy name

// ==================== EXTERNAL ACCESS PASSWORD ====================
// Server-enforced: when a password is set, requests from outside the LAN
// must pass HTTP Basic auth (the browser's native password prompt). LAN
// clients are never prompted, and only LAN clients may change the password.
async function refreshSecurityStatus(){
  var el=document.getElementById('security-status');
  if(!el)return;
  var res=await apiFetch('/api/security');
  if(!res||!res.ok){el.innerHTML='Server unreachable — status unknown.';return;}
  var s=null;
  try{s=await res.json();}catch(e){}
  if(!s){el.textContent='—';return;}
  var status=s.protected
    ?'<span style="color:var(--green2)">✓ Enabled.</span> Connections from outside the LAN get a styled login page. LAN devices are not asked'+(s.lanRequiresPassword?' — except you\'ve required it on LAN too.':' (unless you require it below).')
    :'<span style="color:var(--text2)">Off.</span> Anyone who can reach the server has full access (fine on a trusted LAN; enable this before exposing the server externally).';
  // Show how THIS connection is classified — makes proxy/CDN/hairpin issues
  // (public client IPs on requests that are really yours) self-diagnosing.
  status+='<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-top:6px">This connection appears as <span style="color:var(--text2)">'+escHtml(s.ip||'?')+'</span> → '+(s.lan?'<span style="color:var(--green2)">LAN</span>':'<span style="color:var(--honey)">EXTERNAL</span>')+'</div>';
  var controls='';
  if(s.lan){
    controls='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">'
      +'<input class="form-input" id="sec-password" type="password" placeholder="'+(s.protected?'New password':'Choose a password')+'" style="max-width:240px" onkeydown="if(event.key===\'Enter\')setExternalPassword()">'
      +'<button class="btn btn-secondary btn-sm" onclick="setExternalPassword()">'+(s.protected?'Change password':'Enable')+'</button>'
      +(s.protected?'<button class="btn btn-danger btn-sm" onclick="disableExternalPassword()">Disable</button>':'')
      +'</div>'
      +(s.protected?'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text2);cursor:pointer;margin-top:10px"><input type="checkbox" id="sec-lan-req" '+(s.lanRequiresPassword?'checked':'')+' onchange="saveLanRequiresPassword()" style="cursor:pointer"> Require the password on LAN devices too (no automatic bypass)</label>':'')
      +'<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px;margin-bottom:6px">TRUSTED NETWORKS — COUNT AS LAN</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      +'<input class="form-input" id="sec-trusted" type="text" placeholder="e.g. 100.64.0.0/10, 81.x.x.x/32" value="'+escHtml((s.trustedNets||[]).join(', '))+'" style="max-width:340px;font-family:var(--font-mono);font-size:12px">'
      +'<button class="btn btn-secondary btn-sm" onclick="saveTrustedNetworks()">Save</button>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text2);cursor:pointer;margin-top:8px"><input type="checkbox" id="sec-trust-cf" '+(s.trustCf?'checked':'')+' onchange="saveTrustedNetworks()" style="cursor:pointer"> Behind Cloudflare: identify clients via the <code style="font-size:11px">CF-Connecting-IP</code> header</label>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:6px;font-style:italic;line-height:1.5">Comma-separated CIDRs that never get the password prompt — your WAN IP for hairpin access, VPN ranges, Tailscale (add 100.64.0.0/10). Standard private ranges (10.x, 172.16-31.x, 192.168.x) always count as LAN. Only enable the Cloudflare option if the domain actually goes through Cloudflare — otherwise the header is spoofable.</div>'
      +'</div>';
  }else{
    controls='<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">You are connected from outside the LAN — these settings can only be changed from a device inside the LAN.</div>';
  }
  el.innerHTML=status+controls;
}

async function setExternalPassword(){
  var inp=document.getElementById('sec-password');
  var pw=inp?inp.value:'';
  if(!pw||pw.length<4){toast('⚠ Password must be at least 4 characters');return;}
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(res&&res.ok){toast('🔒 External access password set');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed to set password');
}

async function saveLanRequiresPassword(){
  var cb=document.getElementById('sec-lan-req');
  var on=!!(cb&&cb.checked);
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lanRequiresPassword:on})});
  if(res&&res.ok){toast(on?'🔒 LAN devices will need the password (applies on next load)':'LAN devices no longer need the password');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

async function saveTrustedNetworks(){
  var inp=document.getElementById('sec-trusted');
  var cf=document.getElementById('sec-trust-cf');
  var nets=(inp?inp.value:'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trustedNets:nets,trustCf:!!(cf&&cf.checked)})});
  if(res&&res.ok){toast('✓ Trusted networks saved');refreshSecurityStatus();}
  else if(res&&res.status===400){var e=null;try{e=await res.json();}catch(x){}toast('⚠ '+((e&&e.error)||'Invalid network'));}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

async function disableExternalPassword(){
  if(!confirm('Disable the external access password?\n\nAnyone who can reach the server will have full access again.'))return;
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:''})});
  if(res&&res.ok){toast('External access password disabled');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

// ==================== TASTING WHEEL OVERLAY ====================
// Renders multiple batches' latest tasting wheels overlaid on a single radar
// for direct comparison. Each batch is a translucent polygon in its color.
function renderTastingOverlayRadar(batches){
  if(!batches||!batches.length||typeof TASTING_AXES==='undefined')return'';
  var size=300,cx=size/2,cy=size/2,r=size/2-44;
  var n=TASTING_AXES.length;
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(level/5);
      return(cx+Math.cos(angle)*dist).toFixed(1)+','+(cy+Math.sin(angle)*dist).toFixed(1);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>';
  }).join('');
  // Axis lines
  var axes=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var ex=cx+Math.cos(angle)*r;
    var ey=cy+Math.sin(angle)*r;
    return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex.toFixed(1)+'" y2="'+ey.toFixed(1)+'" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>';
  }).join('');
  // Axis labels
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+22);
    var ly=cy+Math.sin(angle)*(r+22)+4;
    return'<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle" fill="#a89880" font-family="ui-monospace,monospace" font-size="10" style="text-transform:uppercase;letter-spacing:1px">'+ax.label+'</text>';
  }).join('');
  // Each batch's polygon
  var polygons=batches.map(function(b){
    var color=getBatchColor(b);
    var tastings=APP.tastings[b.id]||[];
    var latest=tastings[tastings.length-1];
    if(!latest||!latest.wheel)return'';
    var pts=TASTING_AXES.map(function(ax,i){
      var v=latest.wheel[ax.key]||0;
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(v/5);
      return(cx+Math.cos(angle)*dist).toFixed(1)+','+(cy+Math.sin(angle)*dist).toFixed(1);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="'+color+'" fill-opacity="0.18" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/>'
      +TASTING_AXES.map(function(ax,i){
        var v=latest.wheel[ax.key]||0;
        if(!v)return'';
        var angle=(Math.PI*2*i/n)-Math.PI/2;
        var dist=r*(v/5);
        return'<circle cx="'+(cx+Math.cos(angle)*dist).toFixed(1)+'" cy="'+(cy+Math.sin(angle)*dist).toFixed(1)+'" r="3" fill="'+color+'"/>';
      }).join('');
  }).join('');
  var legend=batches.map(function(b){
    var color=getBatchColor(b);
    var tastings=APP.tastings[b.id]||[];
    var latest=tastings[tastings.length-1];
    return'<div style="display:flex;align-items:center;gap:8px;padding:5px 0">'
      +'<div style="width:14px;height:14px;background:'+color+';border-radius:50%;flex-shrink:0"></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:'+color+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(b.name)+'</div>'
      +'<div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">'+(latest&&latest.date?fmtDate(latest.date):'—')+(latest&&latest.rating?' · '+latest.rating+'★':'')+'</div></div>'
      +'</div>';
  }).join('');
  // viewBox expanded for label space (same approach as the standalone radar)
  return'<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px;align-items:center">'
    +'<div style="max-width:380px;margin:0 auto;width:100%">'
    +'<svg viewBox="-50 -10 400 320" width="100%" overflow="visible" style="display:block;overflow:visible" preserveAspectRatio="xMidYMid meet">'
    +rings+axes+polygons+labels
    +'</svg></div>'
    +'<div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">BATCHES</div>'
    +legend+'</div>'
    +'</div>';
}
