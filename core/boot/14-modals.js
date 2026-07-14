// ==========================================================================
// Modal handlers: new batch, racking, photo journal, failure postmortem, settings actions (split out of 14-bootstrap.js).
// ==========================================================================

// ==================== MODAL HANDLERS ====================
function closeModal(){var m=document.querySelector('.modal-overlay');if(m)m.remove();}

function openNewBatchModal(recipeId,scaledVol,opts){
  closeModal();
  opts=opts||{};
  var isCider=activeBevMode()==='cider';
  // Carry the recipe page's configurator selections (honey/yeast/nutrient/schedule)
  // into the modal so "Brew This Recipe" reflects exactly what the user picked.
  // Only fills fields the caller didn't already set, and only for the same recipe.
  if(recipeId&&window.recipeConfig&&window.recipeConfig._rid===recipeId){
    var _rc=window.recipeConfig;
    if(opts.yeast==null)opts.yeast=_rc.yeast;
    if(opts.nutrient==null)opts.nutrient=_rc.nutrient;
    if(opts.honeyType==null)opts.honeyType=_rc.honey;
    if(opts.schedule==null)opts.schedule=_rc.schedule;
  }
  // When deploying a planned batch, remember which plan to retire on success.
  // A plain new batch clears it so a stale id can't consume an unrelated plan.
  window._deployingPlanId=opts.plannedId||null;
  window._batchDangerOverride=false;
  window._batchFermenterOverride=false;
  window._lastBatchYeastCheck=null;
  // View filter (cider mode): only offer recipes matching the active
  // beverage mode — APP.recipes itself always keeps every recipe.
  var modeRecipes=visibleRecipes();
  var preselect=recipeId||(modeRecipes[0]&&modeRecipes[0].id);
  var recipeOpts=modeRecipes.map(function(r){return'<option value="'+r.id+'"'+(r.id===preselect?' selected':'')+'>'+escHtml(r.name)+' ('+r.style+')</option>';}).join('');
  var initial=modeRecipes.find(function(r){return r.id===preselect;})||modeRecipes[0];
  var volPrefSI=scaledVol||(initial?initial.volume:4.5);      // metric litres
  // Display values honour the chosen unit system (storage stays metric).
  var us=currentUnitSystem();
  var volPref=(volPrefSI/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  var initialHoneyKg,initialCost,initialHoney;
  if(isCider){
    // Cider's primary fermentable IS the juice — no separate "addition" to
    // water the way honey is added, so default the quantity to the batch
    // volume itself (in whatever unit the batch volume is displayed in).
    initialHoneyKg=volPrefSI;
    initialCost='';
    initialHoney=volPref;
  }else{
    // Estimate honey amount from OG + volume (metric kg)
    initialHoneyKg=initial?((initial.ogTarget-1)*1000*volPrefSI/292):0;
    initialCost=APP.settings.honeyPricePerKg?(initialHoneyKg*APP.settings.honeyPricePerKg).toFixed(2):'';
    initialHoney=initialHoneyKg?(initialHoneyKg/UNIT_WT[us].toSI).toFixed(2):'';
  }
  var unitBtns=['metric','us','imperial'].map(function(s){
    var lbl={metric:'Metric · L / kg',us:'US · gal / lb',imperial:'Imperial · gal / lb'}[s];
    var on=(s===us);
    return'<button type="button" id="nb-unit-'+s+'" data-action="onBatchUnitChange" data-args=\''+JSON.stringify([s])+'\' style="flex:1;padding:7px 4px;border-radius:var(--radius);cursor:pointer;font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.3px;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+';color:'+(on?'var(--gold2)':'var(--text3)')+'">'+lbl+'</button>';
  }).join('');
  // Fermenter picker — show all fermenters with availability badges
  var defaultFermId=defaultFermenterIdForNewBatch();
  var fermenterOpts=(APP.fermenters||[]).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var label=f.name+(f.capacity?' ('+f.capacity+'L)':'');
    if(occ)label+=' — occupied by '+occ.name;
    else label+=' — free';
    return'<option value="'+f.id+'"'+(f.id===defaultFermId?' selected':'')+(occ?' style="color:#a07060"':'')+'>'+escHtml(label)+'</option>';
  }).join('');
  var fermenterRow=fermenterOpts?
    '<div class="form-group"><label class="form-label">Fermenter</label><select class="form-select" id="nb-fermenter">'+fermenterOpts+'</select><div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Occupied fermenters can still be selected (e.g., if you bottle and re-pitch the same day).</div></div>':
    '';
  var html='<div class="modal-overlay"><div class="modal"><div class="modal-title">⚗ NEW BATCH</div>'
    +'<div class="form-group"><label class="form-label">Choose Recipe</label><select class="form-select" id="nb-recipe" onchange="updateRecipeFields();updateYeastCompatibility()">'+recipeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Batch Name</label><input class="form-input" id="nb-name" placeholder="e.g., Spring Batch #1" value="'+escHtml((initial?initial.name:(activeBevMode()==='cider'?'Cider':'Mead'))+' #'+(visibleBatches().length+1))+'"></div>'
    +'<div class="form-group"><label class="form-label">Units</label><div style="display:flex;gap:6px">'+unitBtns+'</div></div>'
    +fermenterRow
    +'<div class="form-row"><div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="nb-date" type="date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label" id="nb-vol-label">Volume ('+UNIT_VOL[us].label+')</label><input class="form-input" id="nb-vol" type="number" step="0.1" value="'+volPref+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="nb-og" type="number" step="0.001" value="'+(initial?initial.ogTarget:1.095)+'" onchange="updateYeastCompatibility()"></div>'
    +'<div class="form-group"><label class="form-label" id="nb-honey-label">'+(isCider?'Juice ('+UNIT_VOL[us].label+')':'Honey ('+UNIT_WT[us].label+')')+'</label><input class="form-input" id="nb-honey" type="number" step="0.01" value="'+initialHoney+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(isCider?'Apple / Juice Blend':'Honey Type')+'</label><select class="form-select" id="nb-honey-type" onchange="updateYeastCompatibility()">'
    +(function(){
      // Build two-group dropdown: what you actually have in supplies first,
      // then every other variety. Quantities and units shown for stocked ones
      // so the user picks "what's available" rather than "what's nice in theory".
      var stockType=isCider?'juice':'honey';
      var varietyList=isCider?CIDER_FRUIT_TYPES:HONEY_TYPES;
      var defaultVariety=isCider?'Mixed / Orchard Blend':'Wildflower';
      var honeySupplies=(APP.supplies||[]).filter(function(s){return s.type===stockType&&parseFloat(s.qty)>0;});
      // Match each supply to a canonical variety entry by substring; track which canonical names are stocked
      var stockedCanonical={};
      var inStockOptions=honeySupplies.map(function(s){
        var name=String(s.name||'').trim();
        var canonical=varietyList.find(function(t){
          var lt=t.toLowerCase(),ln=name.toLowerCase();
          return ln.indexOf(lt)!==-1||lt.indexOf(ln)!==-1;
        });
        var displayValue=canonical||name;
        if(canonical)stockedCanonical[canonical]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        var brandSuffix=s.brand?' · '+s.brand:'';
        return'<option value="'+escHtml(displayValue)+'">'+escHtml(name)+' ('+qtyLabel+brandSuffix+')</option>';
      }).join('');
      var otherOptions=varietyList.filter(function(t){return!stockedCanonical[t];})
        .map(function(t){return'<option value="'+escHtml(t)+'"'+(t===defaultVariety&&!inStockOptions?' selected':'')+'>'+escHtml(t)+'</option>';}).join('');
      // If user has stocked varieties, default-select the first one
      if(inStockOptions){
        return'<optgroup label="'+uiL('🟢 In your supplies')+'">'+inStockOptions+'</optgroup>'
          +'<optgroup label="'+uiL('Other varieties (not stocked)')+'">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Yeast Strain</label><select class="form-select" id="nb-yeast" onchange="updateYeastCompatibility()">'
    +(function(){
      // Same treatment for yeast — show what you have first. Filtered to
      // strains valid for the active beverage: most of this library is
      // written up in mead-only terms, so a cider batch shouldn't offer M05.
      var defaultStrainId=isCider?'nottingham':'m05';
      var modeStrains=YEAST_STRAINS.filter(function(y){return(y.beverageTypes||['mead']).indexOf(isCider?'cider':'mead')>=0;});
      var yeastSupplies=(APP.supplies||[]).filter(function(s){return s.type==='yeast'&&parseFloat(s.qty)>0;});
      var stockedStrains={};
      var inStockOptions=yeastSupplies.map(function(s){
        var name=String(s.name||'').trim();
        var strain=modeStrains.find(function(y){
          var ln=name.toLowerCase(),lyn=y.name.toLowerCase(),lyid=y.id.toLowerCase();
          return ln.indexOf(lyid)!==-1||ln.indexOf(lyn.split(' ').pop().toLowerCase())!==-1;
        });
        var value=strain?strain.id:defaultStrainId;
        if(strain)stockedStrains[strain.id]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        return'<option value="'+escHtml(value)+'">'+escHtml(name)+' ('+qtyLabel+')</option>';
      }).join('');
      var otherOptions=modeStrains.filter(function(y){return!stockedStrains[y.id];})
        .map(function(y){return'<option value="'+escHtml(y.id)+'"'+(y.id===defaultStrainId&&!inStockOptions?' selected':'')+'>'+escHtml(y.name)+'</option>';}).join('');
      if(inStockOptions){
        return'<optgroup label="'+uiL('🟢 In your supplies')+'">'+inStockOptions+'</optgroup>'
          +'<optgroup label="'+uiL('Other strains (not stocked)')+'">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select>'
    +'<div id="nb-yeast-check" style="margin-top:8px"></div>'
    +'</div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Nutrient Product</label><select class="form-select" id="nb-nutrient" onchange="onNutrientChange()">'
    +(function(){
      // Group: nutrients you have in supplies (matched by product name) first,
      // then the rest. Selection sets batch.nutrient which drives the protocol
      // (Fermaid-O → TOSNA, everything else → SNA).
      var nutSupplies=(APP.supplies||[]).filter(function(s){return s.type==='nutrient'&&parseFloat(s.qty)>0;});
      var stockedProducts={};
      var inStockOptions=nutSupplies.map(function(s){
        var name=String(s.name||'').trim();
        var product=NUTRIENT_PRODUCTS.find(function(p){
          var ln=name.toLowerCase(),lpn=p.name.toLowerCase();
          // Match by full name or by salient keyword
          return ln.indexOf(lpn)!==-1||lpn.indexOf(ln)!==-1||
            (p.id==='mj-mead'&&/mangrove|mead\s*yeast\s*nutrient/i.test(name))||
            (p.id==='fermaid-o'&&/fermaid-?o/i.test(name))||
            (p.id==='fermaid-k'&&/fermaid-?k/i.test(name))||
            (p.id==='vinoferm-nutrivit'&&/nutrivit/i.test(name))||
            (p.id==='vinoferm-nutrisal'&&/nutrisal/i.test(name))||
            (p.id==='goferm'&&/go-?ferm/i.test(name))||
            (p.id==='generic-dap'&&/^dap$|diammonium/i.test(name));
        });
        var value=product?product.id:'other';
        if(product)stockedProducts[product.id]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        var protocolTag=product?' ['+(product.protocol==='tosna'?'TOSNA':product.protocol==='goferm'?'rehydration':'SNA')+']':'';
        return'<option value="'+escHtml(value)+'">'+escHtml(name)+' ('+qtyLabel+')'+protocolTag+'</option>';
      }).join('');
      var otherOptions=NUTRIENT_PRODUCTS.filter(function(p){return!stockedProducts[p.id];})
        .map(function(p){var tag=' ['+(p.protocol==='tosna'?'TOSNA':p.protocol==='goferm'?'rehydration':'SNA')+']';return'<option value="'+escHtml(p.id)+'"'+(p.id==='mj-mead'&&!inStockOptions?' selected':'')+'>'+escHtml(p.name)+tag+'</option>';}).join('');
      if(inStockOptions){
        return'<optgroup label="'+uiL('🟢 In your supplies')+'">'+inStockOptions+'</optgroup>'
          +'<optgroup label="'+uiL('Other products (not stocked)')+'">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select>'
    +'<div id="nb-nutrient-hint" style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic"></div>'
    +'</div>'
    +'<div class="form-group"><label class="form-label">Nutrient schedule</label><select class="form-select" id="nb-protocol" onchange="onNutrientChange()">'
    +'<option value="auto" selected>Auto — match the nutrient</option>'
    +'<option value="tosca2">TOSCA 2.0 — organic, GoFerm + 24/48/72h + 1/3 break</option>'
    +'<option value="tosna2">TOSNA (classic) — organic, GoFerm + 24/48/72/96h</option>'
    +'<option value="tiosna">TiOSNA — organic, GoFerm + pitch/24/48h + 1/3 break</option>'
    +'<option value="sna">SNA — standard (2 doses, days 1 &amp; 3)</option>'
    +'<option value="sna-high">SNA — high-gravity (3 doses, days 1/3/7)</option>'
    +'</select></div></div>'
    +'<div id="nb-protocol-warn"></div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:14px 0 8px;text-transform:uppercase">Cost Tracking (optional)</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(isCider?'Juice Cost':'Honey Cost')+' ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="nb-cost-honey" type="number" step="0.01" value="'+initialCost+'" placeholder="e.g. 18.00"></div>'
    +'<div class="form-group"><label class="form-label">Extras Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="nb-cost-extras" type="number" step="0.01" placeholder="'+(isCider?'spices, oak, etc.':'fruit, spices, etc.')+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="nb-notes" placeholder="'+(isCider?'Juice source, pressing date, intentions…':'Honey source, intentions, anything worth remembering…')+'"></textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button><button class="btn btn-primary" data-action="createBatch">Create Batch</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  // Deploy pre-fills: when launched from a planned batch, seed the target
  // vessel, brew date, and notes so the brewer just confirms.
  if(opts.fermenterId){var fe=document.getElementById('nb-fermenter');if(fe)fe.value=opts.fermenterId;}
  if(opts.startDate){var de=document.getElementById('nb-date');if(de)de.value=opts.startDate;}
  if(opts.notes){var ne=document.getElementById('nb-notes');if(ne)ne.value=opts.notes;}
  // Deploy from a plan also seeds the chosen yeast / nutrient / honey type.
  if(opts.yeast){var ye=document.getElementById('nb-yeast');if(ye){ye.value=opts.yeast;if(typeof updateYeastCompatibility==='function')updateYeastCompatibility();}}
  if(opts.nutrient){var nu=document.getElementById('nb-nutrient');if(nu){nu.value=opts.nutrient;if(typeof onNutrientChange==='function')onNutrientChange();}}
  if(opts.honeyType){var ht=document.getElementById('nb-honey-type');if(ht)ht.value=opts.honeyType;}
  if(opts.schedule){var pe=document.getElementById('nb-protocol');if(pe)pe.value=opts.schedule;}
  if(typeof onNutrientChange==='function')onNutrientChange();
  if(typeof updateYeastCompatibility==='function')updateYeastCompatibility();
}

// Read the new-batch form's yeast + recipe + OG fields and render a coloured
// compatibility panel below the yeast dropdown. Severity drives:
//   - the visible banner colour/icon
//   - whether createBatch() will gate behind a confirmation
// The check is non-modal — the user sees feedback as they pick options.
function updateYeastCompatibility(){
  var box=document.getElementById('nb-yeast-check');
  if(!box)return;
  var yeastEl=document.getElementById('nb-yeast');
  var recipeEl=document.getElementById('nb-recipe');
  var ogEl=document.getElementById('nb-og');
  if(!yeastEl||!recipeEl)return;
  var yeastId=yeastEl.value;
  var recipeId=recipeEl.value;
  var recipe=getRecipe(recipeId);
  if(!recipe){box.innerHTML='';return;}
  // Override recipe's OG/ABV target with the user's chosen OG (so a high-OG
  // pick triggers ABV warnings even if the recipe normally targets less).
  var liveRecipe=Object.assign({},recipe);
  if(ogEl){
    var og=parseFloat(ogEl.value);
    if(og>1){
      liveRecipe.ogTarget=og;
      // Re-derive ABV target if recipe declared a finishing gravity
      if(recipe.fgTarget){
        liveRecipe.abvTarget=parseFloat(((og-recipe.fgTarget)*131.25).toFixed(1));
      }
    }
  }
  var result=evaluateYeastForRecipe(yeastId,liveRecipe);
  // Fructose-stall alert: a high/critical-fructose honey paired
  // with a non-fructophilic yeast stalls at the 1/3 break. Uses the honey's
  // F:G tech data + the strain's fructophilic flag.
  (function(){
    var honeyEl=document.getElementById('nb-honey-type');
    var honey=honeyEl&&HONEY_PROFILES[honeyEl.value];
    var tech=honey&&honey.tech;
    var y=getYeastById(yeastId);
    if(!tech||!y||y.fructophilic)return;
    var rank={recommended:0,good:1,caveat:2,warning:3,danger:4};
    var yn=y.name.split('—')[0].trim();
    if(tech.fructoseRisk==='critical'){
      result.messages.push({tone:'danger',text:honeyEl.value+' is critically fructose-dominant (F:G ~'+(tech.fgRatio||'?')+') and '+yn+' is not fructophilic — it will likely stall at the 1/3 sugar break. Use a fructophilic strain: K1-V1116, Fermentis BC-S103, or UVAFERM 43.'});
      if(rank[result.severity]<rank.danger)result.severity='danger';
    }else if(tech.fructoseRisk==='high'){
      result.messages.push({tone:'caveat',text:honeyEl.value+' is high-fructose (F:G ~'+(tech.fgRatio||'?')+') and '+yn+' isn\'t fructophilic — watch gravity closely near the 1/3 break, or switch to a fructophilic strain to be safe.'});
      if(rank[result.severity]<rank.caveat)result.severity='caveat';
    }
  })();
  var conf={
    recommended:{bg:'rgba(122,160,64,0.15)',border:'var(--green2)',icon:'✓',label:'RECOMMENDED',textColor:'var(--green2)'},
    good:{bg:'rgba(201,163,80,0.10)',border:'var(--gold2)',icon:'•',label:'ACCEPTABLE',textColor:'var(--gold2)'},
    caveat:{bg:'rgba(214,165,67,0.14)',border:'#d6a543',icon:'⚠',label:'CAVEAT',textColor:'#d6a543'},
    warning:{bg:'rgba(218,108,52,0.16)',border:'#da6c34',icon:'⚠',label:'NOT RECOMMENDED',textColor:'#da6c34'},
    danger:{bg:'rgba(200,60,60,0.18)',border:'var(--red2)',icon:'⛔',label:'WILL FAIL',textColor:'var(--red2)'}
  };
  var c=conf[result.severity]||conf.good;
  // Cache the result so createBatch() can read it without re-computing
  window._lastBatchYeastCheck={severity:result.severity,yeastId:yeastId,recipeId:recipeId,messages:result.messages};
  box.innerHTML='<div style="background:'+c.bg+';border:1px solid '+c.border+'66;border-left:3px solid '+c.border+';border-radius:var(--radius);padding:9px 12px;font-size:12.5px;line-height:1.55">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(result.messages.length>1?'6px':'0')+'">'
      +'<span style="color:'+c.textColor+';font-size:14px">'+c.icon+'</span>'
      +'<span style="font-family:var(--font-mono);font-size:10px;color:'+c.textColor+';letter-spacing:1.5px;font-weight:bold">'+c.label+'</span>'
      +'<span style="color:var(--text3);font-family:var(--font-mono);font-size:9.5px;letter-spacing:1px;margin-left:auto">'+escHtml(result.yeast.name.split('—')[0].trim())+' × '+escHtml(recipe.style||recipe.name)+'</span>'
    +'</div>'
    +result.messages.map(function(m){
      var mc=conf[m.tone]||c;
      return '<div style="color:var(--text2);padding:'+(result.messages.length>1?'4px 0':'2px 0')+';'+(result.messages.length>1?'border-top:1px dotted var(--border);':'')+'">'+(result.messages.length>1?'<span style="color:'+mc.textColor+';font-family:var(--font-mono);font-size:9.5px;margin-right:6px">'+(m.tone||'').toUpperCase()+'</span>':'')+escHtml(m.text)+'</div>';
    }).join('')
  +'</div>';
}

// Updates the helper hint below the nutrient dropdown to show the protocol
// description for the currently-selected product. Fires on change AND once on
// modal open so the first selection's hint is populated.
function onNutrientChange(){
  var sel=document.getElementById('nb-nutrient');
  var hint=document.getElementById('nb-nutrient-hint');
  if(!sel||!hint)return;
  var product=getNutrientById(sel.value);
  if(!product)return;
  var protocolName=product.protocol==='tosna'?'TOSNA':(product.protocol==='goferm'?'Rehydration only':'SNA');
  var color=product.protocol==='tosna'?'var(--green2)':(product.protocol==='goferm'?'var(--blue2)':'var(--gold2)');
  hint.innerHTML='<span style="color:'+color+';font-family:var(--font-mono);font-size:10px;letter-spacing:1px">→ '+protocolName+'</span> · '+escHtml(product.notes||'');
  // Dummy-proof compatibility check between the chosen schedule and nutrient.
  var protoSel=document.getElementById('nb-protocol');
  var warnEl=document.getElementById('nb-protocol-warn');
  if(protoSel&&warnEl){
    var chosen=protoSel.value;            // auto | tosca2 | tosna2 | tiosna | sna | sna-high
    var isOrganicProtocol=(chosen==='tosca2'||chosen==='tosna2'||chosen==='tiosna');
    var isOrganic=(product.id==='fermaid-o');
    var w='';
    if(isOrganicProtocol&&!isOrganic){
      w='<div style="margin:4px 0 12px;padding:10px 12px;border-radius:var(--radius);border-left:4px solid var(--red2);background:rgba(176,58,46,0.09);font-size:12px;color:var(--text2);line-height:1.55">'
        +'<strong style="color:var(--red2)">⛔ '+escHtml(product.name)+' isn\'t an organic (TOSCA/TOSNA) nutrient.</strong> These protocols are organic-only — they need <strong>Fermaid-O</strong>. '+(product.id==='mj-mead'?'The MJ/M05 sachet is a pre-blended SNA product; ':(/dap/i.test(product.id)||product.protocol==='sna'?'This product contains DAP; ':''))+'either switch the nutrient to Fermaid-O, or pick an <strong>SNA</strong> schedule above.</div>';
    }else if((chosen==='sna'||chosen==='sna-high')&&isOrganic){
      w='<div style="margin:4px 0 12px;padding:10px 12px;border-radius:var(--radius);border-left:4px solid #e0843c;background:rgba(224,132,60,0.08);font-size:12px;color:var(--text2);line-height:1.55">'
        +'<strong style="color:#e0843c">⚠ Fermaid-O on an SNA schedule.</strong> Fermaid-O is organic and is normally run as <strong>TOSCA 2.0 / TOSNA</strong> (staggered doses to the 1/3 break) for the cleanest result. SNA still works, but consider switching the schedule.</div>';
    }
    warnEl.innerHTML=w;
  }
}

// Convert the open new-batch modal's volume/honey fields between unit systems
// in place (no re-render, so other fields are preserved) and persist the
// preference. Storage stays metric; this is presentation only.
function onBatchUnitChange(sys){
  if(sys!=='metric'&&sys!=='us'&&sys!=='imperial')return;
  var isCider=activeBevMode()==='cider';
  var honeyUnit=isCider?UNIT_VOL:UNIT_WT; // cider's "honey" field holds juice liters, not weight
  var old=currentUnitSystem();
  var volEl=document.getElementById('nb-vol'),honeyEl=document.getElementById('nb-honey');
  if(volEl&&volEl.value!==''){
    var si=parseFloat(volEl.value)*UNIT_VOL[old].toSI;
    volEl.value=(si/UNIT_VOL[sys].toSI).toFixed(sys==='metric'?2:3);
  }
  if(honeyEl&&honeyEl.value!==''){
    var sik=parseFloat(honeyEl.value)*honeyUnit[old].toSI;
    honeyEl.value=(sik/honeyUnit[sys].toSI).toFixed(2);
  }
  APP.settings.unitSystem=sys;
  if(typeof saveSettings==='function')saveSettings();
  var vl=document.getElementById('nb-vol-label');if(vl)vl.textContent='Volume ('+UNIT_VOL[sys].label+')';
  var hl=document.getElementById('nb-honey-label');if(hl)hl.textContent=(isCider?'Juice (':'Honey (')+honeyUnit[sys].label+')';
  ['metric','us','imperial'].forEach(function(s){
    var b=document.getElementById('nb-unit-'+s);if(!b)return;var on=(s===sys);
    b.style.border='1px solid '+(on?'var(--gold)':'var(--border)');
    b.style.background=on?'rgba(201,168,76,0.14)':'var(--bg3)';
    b.style.color=on?'var(--gold2)':'var(--text3)';
  });
}

function updateRecipeFields(){
  var id=document.getElementById('nb-recipe').value;
  var r=getRecipe(id);
  if(!r)return;
  var isCider=(r.beverageType||'mead')==='cider';
  var us=currentUnitSystem();
  document.getElementById('nb-name').value=r.name+' #'+(APP.batches.length+1);
  // r.volume is metric litres; convert to the displayed unit.
  document.getElementById('nb-vol').value=(r.volume/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  document.getElementById('nb-og').value=r.ogTarget;
  if(isCider){
    // Juice ≈ batch volume — no separate "addition" the way honey is added to water.
    document.getElementById('nb-honey').value=(r.volume/UNIT_VOL[us].toSI).toFixed(2);
    document.getElementById('nb-cost-honey').value='';
  }else{
    var honeyKg=((r.ogTarget-1)*1000*r.volume/292);      // metric kg
    document.getElementById('nb-honey').value=(honeyKg/UNIT_WT[us].toSI).toFixed(2);
    if(APP.settings.honeyPricePerKg){
      // Cost is always computed from the metric kg, regardless of display unit.
      document.getElementById('nb-cost-honey').value=(honeyKg*APP.settings.honeyPricePerKg).toFixed(2);
    }
  }
}

function createBatch(){
  var name=document.getElementById('nb-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  // Compatibility gate — if the live check flagged danger (yeast can't reach the
  // recipe's target ABV, ferment temp out of yeast range, etc.), make the user
  // explicitly confirm. This is the "stop me from ruining a batch" guard rail.
  var check=window._lastBatchYeastCheck;
  if(check&&check.severity==='danger'&&!window._batchDangerOverride){
    var msgList=(check.messages||[]).map(function(m){return'• '+m.text;}).join('\n');
    var ok=confirm('⛔ This yeast/recipe combination will likely fail:\n\n'+msgList+'\n\nContinue anyway? (Tip: pick a different yeast from the dropdown — see the Yeast Library for guidance.)');
    if(!ok)return;
    window._batchDangerOverride=true; // skip prompt on retry within same modal session
  }
  var costHoney=parseFloat(document.getElementById('nb-cost-honey').value)||0;
  var costExtras=parseFloat(document.getElementById('nb-cost-extras').value)||0;
  var fermenterSel=document.getElementById('nb-fermenter');
  // Assigning an already-occupied vessel is allowed on purpose (bottle and
  // re-pitch the same day is a real workflow) — but doing it BY ACCIDENT is
  // how two active batches end up silently sharing one fermenter with no
  // warning anywhere. Make it a deliberate choice instead of a silent one.
  var chosenFermId=(fermenterSel&&fermenterSel.value)||'';
  if(chosenFermId&&!window._batchFermenterOverride){
    var already=fermenterActiveOccupants(chosenFermId);
    if(already.length){
      var f=getFermenter(chosenFermId);
      var ok=confirm('⚠ '+(f?f.name:'This fermenter')+' already has '+already.map(function(x){return x.name;}).join(', ')+' assigned and active.\n\nAssign this new batch to the same vessel anyway?');
      if(!ok)return;
      window._batchFermenterOverride=true;
    }
  }
  var startDate=document.getElementById('nb-date').value||today();
  var isCider=activeBevMode()==='cider';
  // Volume/honey are entered in the user's chosen unit — convert back to the
  // metric values MeadOS stores and calculates with everywhere else. Cider's
  // "honey" field holds juice liters, so it converts via UNIT_VOL, not UNIT_WT.
  var volIn=parseFloat(document.getElementById('nb-vol').value);
  var honeyIn=parseFloat(document.getElementById('nb-honey').value);
  var honeyUnit=isCider?UNIT_VOL:UNIT_WT;
  var volumeSI=(!isNaN(volIn)?volIn*UNIT_VOL[currentUnitSystem()].toSI:4.5);
  var honeySI=(!isNaN(honeyIn)?honeyIn*honeyUnit[currentUnitSystem()].toSI:null);
  var protoSel=(document.getElementById('nb-protocol')||{}).value||'auto';
  var b={
    id:genId(),
    // Human-readable batch serial number — YEAR-NNN, sequenced per calendar
    // year of the batch's startDate. Stable from creation, unique even when
    // names collide (e.g. several "Traditional Mead" boxes side by side).
    // The internal id stays the random hex string for technical references;
    // the serial is what you see on labels, in the UI, and in search.
    serial:assignBatchSerial(startDate),
    name:name,
    recipeId:document.getElementById('nb-recipe').value,
    startDate:startDate,
    volume:Math.round(volumeSI*1000)/1000,
    og:parseFloat(document.getElementById('nb-og').value)||1.095,
    honey:honeySI!=null?Math.round(honeySI*1000)/1000:null,
    honeyType:(document.getElementById('nb-honey-type')||{}).value||(isCider?'Mixed / Orchard Blend':'Wildflower'),
    yeast:(document.getElementById('nb-yeast')||{}).value||'m05',
    nutrient:(document.getElementById('nb-nutrient')||{}).value||'mj-mead',
    // Nutrient schedule the batch follows: 'auto' defers to the nutrient's own
    // protocol; otherwise an explicit tosna2 / sna / sna-high choice.
    nutrientProtocol:(protoSel!=='auto'?protoSel:undefined),
    fermenterId:(fermenterSel&&fermenterSel.value)||defaultFermenterIdForNewBatch(),
    cost:(costHoney||costExtras)?{honey:costHoney,extras:costExtras}:null,
    notes:document.getElementById('nb-notes').value.trim()
  };
  var r=getRecipe(b.recipeId);
  if(r)b.style=r.style;
  // Every batch is tagged so mode-filtered views (visibleBatches()) know
  // which side it belongs to — inherit from the recipe, falling back to
  // whichever mode was active when the batch was created (e.g. a custom
  // recipe that never got a beverageType of its own).
  b.beverageType=(r&&r.beverageType)||activeBevMode();
  APP.batches.push(b);
  APP.logs[b.id]=[];
  // Auto-complete day-0 recipe step(s) ("Brew Day") — filling in this modal
  // (OG, yeast, honey, all recorded) IS the brew-day action, so requiring a
  // second, separate manual checkbox for the same thing just produced a
  // guaranteed false "overdue — DO NOW" nag the moment a day passed, on
  // every single new batch.
  (function(){
    if(!APP.tasksDone)APP.tasksDone={};
    (getEffectiveSteps(b,r)||[]).forEach(function(s){
      if(s.day===0)APP.tasksDone[b.id+'-step-0']=today();
    });
  })();
  // If this batch was deployed from the brew plan, retire that plan entry now
  // that it's a real, supply-deducting batch.
  if(window._deployingPlanId){
    APP.plannedBatches=(APP.plannedBatches||[]).filter(function(p){return p.id!==window._deployingPlanId;});
    window._deployingPlanId=null;
  }
  // Auto-deduct supplies (honey, yeast, nutrient). Returns array of
  // {supply, amount, unit, before, after, insufficient}. Build a summary
  // line for the toast so the user sees what got debited.
  var deductions=(typeof deductSuppliesForBatch==='function')?deductSuppliesForBatch(b,r):[];
  closeModal();
  scheduleSave();
  if(deductions.length){
    var anyInsufficient=deductions.some(function(d){return d.insufficient;});
    var unmatched=deductions.filter(function(d){return d.unmatched;});
    var matched=deductions.filter(function(d){return!d.unmatched;});
    var parts=[];
    if(matched.length)parts.push('deducted: '+matched.map(function(d){
      // Round display amount for readability
      var amt=d.amount;
      var amtStr=(Math.abs(amt-Math.round(amt))<0.01)?String(Math.round(amt)):String(parseFloat(amt.toFixed(2)));
      return amtStr+' '+(d.unit||'')+' '+(d.supply.name||'').replace(/\s*honey\s*$/i,'');
    }).join(' · '));
    if(unmatched.length)parts.push('⚠ no supply matched "'+unmatched.map(function(d){return d.attemptedName;}).join(', ')+'" — stock not adjusted, check Supplies');
    toast('✦ Batch created '+(anyInsufficient?'⚠ ':'· ')+parts.join(' · '),unmatched.length?7000:5000);
  }else{
    toast('✦ Batch created');
  }
  showView('batch',b.id);
}

// ==================== RACKING (move batch to different vessel) ====================
// Opens a modal letting the user pick a target vessel and a racking date.
// Saves to b.rackings[] and updates b.fermenterId. The Fermenter Schedule
// then renders the batch as separate segments across the relevant vessels.
function openRackModal(batchId){
  closeModal();
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var currentVessel=getFermenter(b.fermenterId);
  if(!APP.fermenters||APP.fermenters.length<2){
    toast('⚠ Add a second fermenter first');showView('settings');return;
  }
  // Build options excluding current vessel, annotating each with occupancy
  var opts=APP.fermenters.filter(function(f){return f.id!==b.fermenterId;}).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var label=f.name+(f.capacity?' ('+f.capacity+'L)':'')+(occ?' — currently has '+occ.name:' — free');
    return'<option value="'+f.id+'"'+(occ?' style="color:#a07060"':'')+'>'+escHtml(label)+'</option>';
  }).join('');
  var html='<div class="modal-overlay"><div class="modal">'
    +'<div class="modal-title">🔁 RACK '+escHtml(b.name)+' TO NEW VESSEL</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Currently in: <strong style="color:'+(currentVessel&&currentVessel.color||'var(--gold2)')+'">'+escHtml(currentVessel?currentVessel.name:'(unassigned)')+'</strong>. This records the move on the Fermenter Schedule and frees up the current vessel for new batches.</div>'
    +'<div class="form-group"><label class="form-label">Rack To</label><select class="form-select" id="rack-target">'+opts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Racking Date</label><input class="form-input" id="rack-date" type="date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="rack-notes" placeholder="e.g. left lees behind, added 0.5g K-meta, gravity 1.012"></textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button><button class="btn btn-primary" data-action="saveRack" data-args=\''+JSON.stringify([batchId])+'\'>Rack Batch</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveRack(batchId){
  var target=document.getElementById('rack-target').value;
  var date=document.getElementById('rack-date').value||today();
  var notes=document.getElementById('rack-notes').value.trim();
  // Racking is the original motivating case for the resolved-item toast (a
  // move to a bigger/properly-sized vessel can clear blowoff-headspace, or
  // resolve headspace/oxygen concerns) — snapshot before the mutation.
  var _advBatch=(typeof APP!=='undefined'&&APP.batches)?getBatch(batchId):null;
  var _advBefore=(_advBatch&&typeof _advSnapshotItems==='function')?_advSnapshotItems(_advBatch):[];
  if(rackBatch(batchId,target,date,notes)){
    closeModal();
    var _advMsg='✦ Racked to new vessel';
    if(_advBatch&&typeof _advResolvedSuffix==='function')_advMsg+=_advResolvedSuffix(_advBatch,_advBefore);
    toast(_advMsg);
    renderMain();
  }
}

function openEditBatchModal(id){
  closeModal();
  var b=getBatch(id);
  if(!b)return;
  var isCider=(b.beverageType||'mead')==='cider';
  var cost=b.cost||{};
  var fermenterOpts=(APP.fermenters||[]).map(function(f){
    return'<option value="'+f.id+'"'+(f.id===b.fermenterId?' selected':'')+'>'+escHtml(f.name+(f.capacity?' ('+f.capacity+'L)':''))+'</option>';
  }).join('');
  var fermenterRow=fermenterOpts?'<div class="form-group"><label class="form-label">Fermenter</label><select class="form-select" id="eb-fermenter">'+fermenterOpts+'</select></div>':'';
  // Honey type — datalist with all known varieties (free-text still allowed
  // for custom additions). Defaults to whatever was stored on the batch. The
  // same b.honey/b.honeyType fields double as "primary fermentable" for cider
  // batches (liters of juice / apple blend) rather than a separate schema —
  // only the label and datalist change, so existing data keeps working.
  var honeyDatalist=(!isCider&&typeof HONEY_TYPES!=='undefined'&&HONEY_TYPES.length)
    ?'<datalist id="eb-honey-types">'+HONEY_TYPES.map(function(h){return'<option value="'+escHtml(h)+'"></option>';}).join('')+'</datalist>':'';
  // Yeast strain — dropdown of known strains plus the raw value (for legacy
  // data that may not match any known id). Filtered to the batch's own
  // beverage (not the currently active mode — editing shouldn't change
  // which batch you're looking at), but the batch's existing yeast always
  // stays selectable even if it's a cross-mode/legacy strain, so editing
  // never silently swaps out what's actually fermenting.
  var currentYeast=b.yeast||(isCider?'nottingham':'m05');
  var modeYeastStrains=(typeof YEAST_STRAINS!=='undefined'?YEAST_STRAINS:[]).filter(function(y){
    return y.id===currentYeast||(y.beverageTypes||['mead']).indexOf(isCider?'cider':'mead')>=0;
  });
  var yeastOpts='';
  if(modeYeastStrains.length){
    var found=false;
    yeastOpts=modeYeastStrains.map(function(y){
      var sel=(y.id===currentYeast);
      if(sel)found=true;
      return'<option value="'+y.id+'"'+(sel?' selected':'')+'>'+escHtml(y.name)+'</option>';
    }).join('');
    if(!found&&currentYeast){
      yeastOpts='<option value="'+escHtml(currentYeast)+'" selected>'+escHtml(currentYeast)+' (custom)</option>'+yeastOpts;
    }
  }
  // Only worth the warning once there's actual gravity history that a yeast
  // change could retroactively reinterpret — a fresh batch with no readings
  // yet has nothing to misattribute.
  var hasGravityHistory=((APP.logs&&APP.logs[b.id])||[]).some(function(l){return l.gravity!=null&&l.gravity!=='';});
  var yeastRow=yeastOpts?'<div class="form-group"><label class="form-label">Yeast</label><select class="form-select" id="eb-yeast">'+yeastOpts+'</select>'
    +(hasGravityHistory?'<div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Changing this updates how the advisor judges temperature range, attenuation and tolerance for the WHOLE batch going forward — it doesn\'t reinterpret past readings differently. If this is correcting a mistake, that\'s exactly right. If it\'s recording a real mid-ferment repitch, know that early-fermentation advice will now be judged against the new strain, not the one that was actually there.</div>':'')
    +'</div>':'';
  var html='<div class="modal-overlay"><div class="modal"><div class="modal-title">EDIT BATCH</div>'
    +'<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="eb-name" value="'+escHtml(b.name)+'"></div>'
    +fermenterRow
    +'<div class="form-row"><div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="eb-date" type="date" value="'+b.startDate+'"></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="eb-vol" type="number" step="0.1" value="'+(b.volume||4.5)+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">OG</label><input class="form-input" id="eb-og" type="number" step="0.001" value="'+(b.og||1.095)+'"></div>'
    +'<div class="form-group"><label class="form-label">'+(isCider?'Juice (L)':'Honey (kg)')+'</label><input class="form-input" id="eb-honey" type="number" step="0.1" value="'+(b.honey||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(isCider?'Apple / Juice Blend':'Honey Type')+'</label><input class="form-input" id="eb-honey-type" value="'+escHtml(b.honeyType||'')+'" list="eb-honey-types" placeholder="'+(isCider?'Golden Delicious, Kingston Black…':'Wildflower, Acacia, Buckwheat…')+'">'+honeyDatalist+'</div>'
    +yeastRow+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(isCider?'Juice Cost':'Honey Cost')+' ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="eb-cost-honey" type="number" step="0.01" value="'+(cost.honey||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Extras Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="eb-cost-extras" type="number" step="0.01" value="'+(cost.extras||'')+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="eb-notes">'+escHtml(b.notes||'')+'</textarea></div>'
    +'<div class="form-group"><label class="form-label">🔄 Lessons Learned <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">what you\'d change next time — resurfaces automatically on "Brew Again"</span></label><textarea class="form-textarea" id="eb-lessons" placeholder="e.g. Less raisins next time, went too tannic. Or: switch to a lower-tolerance yeast, finished sweeter than planned.">'+escHtml(b.lessonsLearned||'')+'</textarea></div>'
    +'<div class="form-group" style="background:var(--bg);border-left:3px solid var(--gold2);border-radius:var(--radius);padding:12px 14px">'
      +'<label class="form-label">📡 Gravity sensor entity <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional · iSpindel / Tilt / RAPT / generic HA sensor</span></label>'
      +'<input class="form-input" id="eb-gravsensor" type="text" placeholder="sensor.ispindel_floor_gravity (leave blank if you measure manually)" value="'+escHtml(b.gravitySensorEntity||'')+'" style="font-family:var(--font-mono);font-size:12px">'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:6px;line-height:1.55;font-style:italic">When set, a 📡 button appears on the gravity-log form to pull the current sensor reading with one tap. You still confirm and save each reading manually — automated logging would create noisy data, so this is just a convenience shortcut. Compatible with iSpindel, Tilt Hydrometer, RAPT Pill, or any HA sensor reporting SG (e.g. 1.045).</div>'
    +'</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button><button class="btn btn-primary" data-action="saveBatchEdit" data-args=\''+JSON.stringify([id])+'\'>Save</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveBatchEdit(id){
  var b=getBatch(id);
  if(!b)return;
  b.name=document.getElementById('eb-name').value.trim()||b.name;
  b.startDate=document.getElementById('eb-date').value||b.startDate;
  b.volume=parseFloat(document.getElementById('eb-vol').value)||b.volume;
  b.og=parseFloat(document.getElementById('eb-og').value)||b.og;
  b.honey=parseFloat(document.getElementById('eb-honey').value)||null;
  // Honey type — optional free-text/datalist. Empty leaves the field cleared.
  var htEl=document.getElementById('eb-honey-type');
  if(htEl){var ht=htEl.value.trim();b.honeyType=ht||null;}
  // Yeast — read from the strain dropdown if present.
  var yEl=document.getElementById('eb-yeast');
  if(yEl&&yEl.value)b.yeast=yEl.value;
  var fermSel=document.getElementById('eb-fermenter');
  if(fermSel&&fermSel.value)b.fermenterId=fermSel.value;
  var ch=parseFloat(document.getElementById('eb-cost-honey').value)||0;
  var ce=parseFloat(document.getElementById('eb-cost-extras').value)||0;
  b.cost=(ch||ce)?{honey:ch,extras:ce}:null;
  b.notes=document.getElementById('eb-notes').value.trim();
  var lEl=document.getElementById('eb-lessons');
  if(lEl)b.lessonsLearned=lEl.value.trim()||null;
  // Gravity-sensor binding — empty string clears the binding cleanly
  var gsEl=document.getElementById('eb-gravsensor');
  if(gsEl)b.gravitySensorEntity=gsEl.value.trim();
  closeModal();scheduleSave();toast('✦ Updated');renderMain();
}

function addLog(batchId){
  // Snapshot BEFORE the mutation — logging a reading is the single most
  // common action that resolves a stalled/missing-reading/complete-ferment
  // recommendation, so it's the highest-value hook for the transient
  // resolved-item acknowledgment (see _advResolvedSuffix, 12-advisor.js).
  var _advBatch=(typeof APP!=='undefined'&&APP.batches)?getBatch(batchId):null;
  var _advBefore=(_advBatch&&typeof _advSnapshotItems==='function')?_advSnapshotItems(_advBatch):[];
  var rawG=parseFloat(document.getElementById('log-gravity').value);
  if(!rawG){toast('⚠ Gravity required');return;}
  var temp=parseFloat(document.getElementById('log-temp').value);
  // Hydrometer temp correction. Most home hydrometers calibrate at 20°C.
  // Standard approximation: correction = (T - 20) × 0.00013 per °C.
  // Apply only when temp is provided and meaningfully different from 20°C.
  var correctedG=rawG;
  var corrApplied=false;
  if(temp!=null&&!isNaN(temp)&&Math.abs(temp-20)>=1){
    correctedG=rawG+(temp-20)*0.00013;
    correctedG=Math.round(correctedG*1000)/1000;
    corrApplied=true;
  }
  // pH is fully optional. Only stored when the user actually enters a value;
  // null is preserved as null so charts and aggregates can ignore it cleanly.
  var phEl=document.getElementById('log-ph');
  var phRaw=phEl?phEl.value.trim():'';
  var ph=phRaw!==''?parseFloat(phRaw):null;
  if(ph!==null&&(isNaN(ph)||ph<2||ph>5))ph=null; // reject obvious garbage
  var entry={
    id:genId(),
    date:document.getElementById('log-date').value||today(),
    gravity:correctedG,
    temp:isNaN(temp)?null:temp,
    ph:ph,
    airlock:document.getElementById('log-airlock').value||'',
    note:document.getElementById('log-note').value.trim()
  };
  if(corrApplied){
    entry.gravityRaw=rawG;
    entry.tempCorrected=true;
  }
  if(!APP.logs[batchId])APP.logs[batchId]=[];
  APP.logs[batchId].push(entry);
  APP.logs[batchId].sort(function(a,b){return a.date.localeCompare(b.date);});
  scheduleSave();
  var _advMsg=corrApplied?'✦ Logged (corrected '+rawG.toFixed(3)+' → '+correctedG.toFixed(3)+' @ '+temp+'°C)':'✦ Reading logged';
  if(_advBatch&&typeof _advResolvedSuffix==='function')_advMsg+=_advResolvedSuffix(_advBatch,_advBefore);
  toast(_advMsg);
  renderMain();
}

function deleteLog(batchId,logId){
  if(!confirm('Delete this reading?'))return;
  APP.logs[batchId]=(getBatchLogs(batchId)).filter(function(l){return l.id!==logId;});
  scheduleSave();toast('Reading deleted');renderMain();
}

function setTastingStars(n){
  document.getElementById('t-rating').value=n;
  for(var i=1;i<=5;i++){
    var s=document.getElementById('t-star-'+i);
    if(s)s.classList.toggle('active',i<=n);
  }
}

function addTasting(batchId){
  var wheel=window._tastingWheel||{};
  var entry={
    id:genId(),
    date:document.getElementById('t-date').value||today(),
    rating:parseInt(document.getElementById('t-rating').value)||0,
    color:document.getElementById('t-color').value.trim(),
    aroma:document.getElementById('t-aroma').value.trim(),
    flavor:document.getElementById('t-flavor').value.trim(),
    finish:document.getElementById('t-finish').value.trim(),
    wheel:wheel,
    bjcp:(typeof readBJCPScore==='function')?readBJCPScore():null,
    note:document.getElementById('t-note').value.trim()
  };
  var hasWheel=Object.values(wheel).some(function(v){return v>0;});
  if(!entry.color&&!entry.aroma&&!entry.flavor&&!entry.finish&&!entry.note&&!entry.rating&&!hasWheel&&!entry.bjcp){toast('⚠ Add at least one note or rating');return;}
  if(!APP.tastings[batchId])APP.tastings[batchId]=[];
  APP.tastings[batchId].push(entry);
  APP.tastings[batchId].sort(function(a,b){return a.date.localeCompare(b.date);});
  window._tastingWheel={};  // reset for next entry
  scheduleSave();toast('✦ Tasting saved');renderMain();
}

function deleteTasting(batchId,id){
  if(!confirm('Delete this tasting note?'))return;
  APP.tastings[batchId]=(APP.tastings[batchId]||[]).filter(function(t){return t.id!==id;});
  scheduleSave();toast('Deleted');renderMain();
}

// ==================== PHOTO JOURNAL ====================
// Per-batch photo gallery. Images are resized client-side then uploaded to
// /api/asset (stored as files under labels/); only the /labels/<hash> URL and
// metadata ride the state blob. Stages let you tell brew-day from bottling.
var PHOTO_STAGES=[
  {key:'brew',label:'Brew Day',color:'#c9a84c'},
  {key:'ferment',label:'Fermentation',color:'#7aa850'},
  {key:'racking',label:'Racking',color:'#7aa8c0'},
  {key:'bottling',label:'Bottling',color:'#a87aa0'},
  {key:'tasting',label:'Tasting',color:'#c04858'},
  {key:'other',label:'Other',color:'#8a8a8a'}
];
function photoStage(key){return PHOTO_STAGES.find(function(s){return s.key===key;})||PHOTO_STAGES[PHOTO_STAGES.length-1];}

function renderBatchPhotos(b){
  var photos=(APP.photos[b.id]||[]).slice().sort(function(a,c){return(c.date||c.addedAt||'').localeCompare(a.date||a.addedAt||'');});
  var addBtn='<button class="btn btn-primary btn-sm" data-action="addBatchPhoto" data-args=\''+JSON.stringify([b.id])+'\'>📷 Add Photo</button>';
  var head='<div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><div class="card-title">📷 PHOTO JOURNAL</div>'+addBtn+'</div>';
  if(!photos.length){
    return'<div class="card">'+head
      +'<div style="text-align:center;padding:30px 16px;color:var(--text3)"><div style="font-size:32px;margin-bottom:8px">📷</div>'
      +'<div style="font-size:13px;font-style:italic;line-height:1.5">'+(appLang()==='nl'?'Nog geen foto\'s. Leg de brouwdag, de gisting, het overhevelen of de afgewerkte flessen vast —<br>een visueel dagboek van het leven van deze partij.':'No photos yet. Capture brew day, the fermentation, racking, or the finished bottles —<br>a visual diary of this batch\'s life.')+'</div></div></div>';
  }
  var grid=photos.map(function(p){
    var st=photoStage(p.stage);
    var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
    return'<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg3)">'
      +'<div style="position:relative;aspect-ratio:4/3;background:var(--bg);cursor:pointer;overflow:hidden" data-action="openPhotoLightbox" data-args=\''+JSON.stringify([b.id,p.id])+'\'>'
      +'<img src="'+escHtml(src)+'" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" alt="'+escHtml(p.caption||st.label)+'">'
      +'<span style="position:absolute;top:6px;left:6px;font-family:var(--font-mono);font-size:9px;letter-spacing:1px;padding:2px 7px;border-radius:8px;background:'+st.color+'cc;color:#0f0f0a">'+st.label.toUpperCase()+'</span></div>'
      +'<div style="padding:8px 10px">'
      +'<div style="font-size:12.5px;color:var(--text2);line-height:1.4;min-height:18px">'+escHtml(p.caption||'')+'</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+fmtDate(p.date||p.addedAt)+'</span>'
      +'<button class="btn-icon" style="font-size:12px" data-action="deleteBatchPhoto" data-args=\''+JSON.stringify([b.id,p.id])+'\' title="Delete photo">🗑</button></div>'
      +'</div></div>';
  }).join('');
  return'<div class="card">'+head
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:8px">'+grid+'</div></div>';
}

function addBatchPhoto(batchId){
  var input=document.createElement('input');
  input.type='file';input.accept='image/*';
  input.onchange=function(){
    var file=input.files&&input.files[0];
    if(!file)return;
    toast('⏳ Processing photo…');
    readImageAsDataUrl(file,{maxDim:1400},function(err,dataUrl){
      if(err){toast('⚠ '+err.message);return;}
      storeImageAsset(dataUrl,'photos').then(function(url){
        openPhotoMetaModal(batchId,url);
      });
    });
  };
  input.click();
}

// After upload, collect caption + stage + date before committing the entry.
function openPhotoMetaModal(batchId,url){
  closeModal();
  var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(url))||url;
  var stageOpts=PHOTO_STAGES.map(function(s){return'<option value="'+s.key+'">'+s.label+'</option>';}).join('');
  var html='<div class="modal-overlay"><div class="modal">'
    +'<div class="modal-title">📷 ADD PHOTO</div>'
    +'<div style="text-align:center;margin-bottom:14px"><img src="'+escHtml(src)+'" style="max-width:100%;max-height:240px;border-radius:var(--radius);border:1px solid var(--border)"></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Stage</label><select class="form-select" id="ph-stage">'+stageOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Date</label><input class="form-input" id="ph-date" type="date" value="'+today()+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Caption (optional)</label><input class="form-input" id="ph-caption" placeholder="e.g. vigorous krausen on day 3"></div>'
    +'<input type="hidden" id="ph-url" value="'+escHtml(url)+'">'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button><button class="btn btn-primary" data-action="savePhoto" data-args=\''+JSON.stringify([batchId])+'\'>Save Photo</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function savePhoto(batchId){
  var url=document.getElementById('ph-url').value;
  if(!url){toast('⚠ No image');return;}
  var entry={
    id:genId(),
    url:url,
    stage:document.getElementById('ph-stage').value,
    date:document.getElementById('ph-date').value||today(),
    caption:document.getElementById('ph-caption').value.trim(),
    addedAt:new Date().toISOString()
  };
  if(!APP.photos[batchId])APP.photos[batchId]=[];
  APP.photos[batchId].push(entry);
  closeModal();scheduleSave();toast('✦ Photo added');renderMain();
}

function deleteBatchPhoto(batchId,photoId){
  if(!confirm('Delete this photo? This removes it from the journal and deletes the image file.'))return;
  var photo=(APP.photos[batchId]||[]).find(function(p){return p.id===photoId;});
  var url=photo&&photo.url;
  APP.photos[batchId]=(APP.photos[batchId]||[]).filter(function(p){return p.id!==photoId;});
  if(!APP.photos[batchId].length)delete APP.photos[batchId];
  scheduleSave();
  // Remove the underlying file now that the reference is gone (if unused).
  if(typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(url);
  toast('Deleted');renderMain();
}

// Full-screen lightbox with prev/next across the batch's photos.
function openPhotoLightbox(batchId,photoId){
  var photos=(APP.photos[batchId]||[]).slice().sort(function(a,c){return(c.date||c.addedAt||'').localeCompare(a.date||a.addedAt||'');});
  var idx=photos.findIndex(function(p){return p.id===photoId;});
  if(idx<0)return;
  window._lightbox={batchId:batchId,ids:photos.map(function(p){return p.id;}),idx:idx};
  renderPhotoLightbox();
}
function renderPhotoLightbox(){
  var lb=window._lightbox;if(!lb)return;
  var existing=document.getElementById('photo-lightbox');if(existing)existing.remove();
  var photos=APP.photos[lb.batchId]||[];
  var p=photos.find(function(x){return x.id===lb.ids[lb.idx];});
  if(!p)return;
  var st=photoStage(p.stage);
  var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
  var multi=lb.ids.length>1;
  var html='<div id="photo-lightbox" class="modal-overlay" style="z-index:9999;background:rgba(8,8,6,0.94)" data-backdrop-action="closePhotoLightbox">'
    +'<div style="max-width:92vw;max-height:92vh;display:flex;flex-direction:column;align-items:center;gap:10px">'
    +'<img src="'+escHtml(src)+'" style="max-width:92vw;max-height:78vh;object-fit:contain;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,0.6)">'
    +'<div style="text-align:center;color:var(--text2)">'
    +'<span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;padding:2px 8px;border-radius:8px;background:'+st.color+';color:#0f0f0a">'+st.label.toUpperCase()+'</span>'
    +(p.caption?'<div style="font-size:14px;margin-top:8px">'+escHtml(p.caption)+'</div>':'')
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-top:4px">'+fmtDate(p.date||p.addedAt)+(multi?' · '+(lb.idx+1)+'/'+lb.ids.length:'')+'</div></div>'
    +(multi?'<div style="display:flex;gap:10px;margin-top:4px"><button class="btn btn-secondary" data-action="navPhotoLightbox" data-args=\'[-1]\'>← Prev</button><button class="btn btn-secondary" data-action="navPhotoLightbox" data-args=\'[1]\'>Next →</button></div>':'')
    +'<button class="btn btn-secondary btn-sm" data-action="closePhotoLightbox" style="margin-top:2px">Close</button>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function navPhotoLightbox(delta){
  var lb=window._lightbox;if(!lb)return;
  lb.idx=(lb.idx+delta+lb.ids.length)%lb.ids.length;
  renderPhotoLightbox();
}
function closePhotoLightbox(){
  var el=document.getElementById('photo-lightbox');if(el)el.remove();
  window._lightbox=null;
}

function updateBottlingTotalDisplay(){
  var el=document.getElementById('bt-total-display');
  if(!el)return;
  var c500=parseInt((document.getElementById('bt-count-500')||{}).value)||0;
  var c750=parseInt((document.getElementById('bt-count-750')||{}).value)||0;
  var customSize=parseInt((document.getElementById('bt-count-custom-size')||{}).value)||0;
  var customQty=parseInt((document.getElementById('bt-count-custom-qty')||{}).value)||0;
  var totalBottles=c500+c750+(customSize>0?customQty:0);
  var totalMl=c500*500+c750*750+(customSize>0?customQty*customSize:0);
  if(totalBottles===0){
    el.innerHTML='<span style="color:var(--text3)">Enter bottle counts above to see total volume.</span>';
    return;
  }
  var parts=[];
  if(c500>0)parts.push(c500+'×500ml');
  if(c750>0)parts.push(c750+'×750ml');
  if(customSize>0&&customQty>0)parts.push(customQty+'×'+customSize+'ml');
  el.innerHTML='<span style="color:var(--gold2)">TOTAL: '+totalBottles+' bottle'+(totalBottles!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L</span> &nbsp; <span style="color:var(--text3);font-size:11px">('+parts.join(' + ')+')</span>';
}

function updateBottlingSweetHint(batchId){
  var el=document.getElementById('bt-sweet-hint');
  if(!el)return;
  var b=getBatch(batchId);
  var fg=(document.getElementById('bt-fg')||{}).value;
  el.innerHTML=_bottlingSweetHintHtml(fg,b&&b.beverageType);
}

function saveBottling(batchId){
  // Bottling resolves the whole packaging-phase recommendation cluster
  // (ferment-complete, cold-crash, stabilise-first, extended-bulk-aging) in
  // one action — snapshot before the mutation for the transient
  // acknowledgment on the final toast below (see _advResolvedSuffix).
  var _advBatch=(typeof APP!=='undefined'&&APP.batches)?getBatch(batchId):null;
  var _advBefore=(_advBatch&&typeof _advSnapshotItems==='function')?_advSnapshotItems(_advBatch):[];
  var count500=parseInt(document.getElementById('bt-count-500').value)||0;
  var count750=parseInt(document.getElementById('bt-count-750').value)||0;
  var customSize=parseInt((document.getElementById('bt-count-custom-size')||{}).value)||0;
  var customCount=parseInt((document.getElementById('bt-count-custom-qty')||{}).value)||0;
  var countsAtBottling={};
  if(count500>0)countsAtBottling[500]=count500;
  if(count750>0)countsAtBottling[750]=count750;
  if(customSize>0&&customCount>0)countsAtBottling[customSize]=customCount;
  var total=Object.keys(countsAtBottling).reduce(function(s,k){return s+countsAtBottling[k];},0);
  if(total===0){toast('⚠ Enter at least one bottle count (500ml or 750ml)');return;}
  var existing=APP.bottling[batchId];
  var existingTotal=existing?totalBottles(existing):0;
  // Build new locations map
  var locations={cellar:{},fridge:{},gifted:{},other:{}};
  if(existing&&existing.locations&&existingTotal>0){
    // Editing meaningful existing inventory — preserve splits, rebalance delta per size
    Object.assign(locations,{
      cellar:Object.assign({},_coerceLocations(existing.locations.cellar)),
      fridge:Object.assign({},_coerceLocations(existing.locations.fridge)),
      gifted:Object.assign({},_coerceLocations(existing.locations.gifted)),
      other:Object.assign({},_coerceLocations(existing.locations.other))
    });
    // For each size, rebalance: delta goes to/from cellar
    Object.keys(countsAtBottling).forEach(function(size){
      var sz=parseInt(size);
      var newCount=countsAtBottling[size];
      var oldCount=Object.keys(locations).reduce(function(s,loc){return s+(locations[loc][sz]||0);},0);
      var delta=newCount-oldCount;
      if(delta>0)locations.cellar[sz]=(locations.cellar[sz]||0)+delta;
      else if(delta<0){
        var toRemove=-delta;
        ['cellar','fridge','other','gifted'].forEach(function(loc){
          if(toRemove<=0)return;
          var avail=locations[loc][sz]||0;
          var take=Math.min(toRemove,avail);
          locations[loc][sz]=avail-take;
          if(locations[loc][sz]<=0)delete locations[loc][sz];
          toRemove-=take;
        });
      }
    });
    // Remove sizes that aren't in the new count map at all (probably user removed them entirely)
    ['cellar','fridge','gifted','other'].forEach(function(loc){
      Object.keys(locations[loc]).forEach(function(sz){
        if(!countsAtBottling[sz]&&locations[loc][sz]>0){
          // size removed entirely from bottling — clear from all locations
          delete locations[loc][sz];
        }
      });
    });
  }else{
    // Fresh bottling — all bottles go to cellar
    Object.keys(countsAtBottling).forEach(function(size){
      locations.cellar[parseInt(size)]=countsAtBottling[size];
    });
  }
  APP.bottling[batchId]={
    date:document.getElementById('bt-date').value||today(),
    bottleCount:total,                       // IMMUTABLE total — legacy field
    bottlesAtBottling:total,                 // explicit as-bottled snapshot
    countsAtBottling:countsAtBottling,       // per-size immutable map
    bottleSizes:Object.keys(countsAtBottling).map(function(s){return parseInt(s);}).sort(function(a,b){return a-b;}),
    locations:locations,
    fg:parseFloat(document.getElementById('bt-fg').value)||null,
    abv:parseFloat(document.getElementById('bt-abv').value)||null,
    sweetness:document.getElementById('bt-sweet').value,
    notes:document.getElementById('bt-notes').value.trim(),
    closure:((document.getElementById('bt-closure')||{}).value)||(existing&&existing.closure)||'crown',
    // Bottling auto-places everything in the cellar, so the cellar IS filled —
    // mark it so a later drink-to-zero reads as "Finished", not "needs fill".
    cellarFilled:true,
    // Preserve gifts log from existing
    gifts:(existing&&existing.gifts)||[]
  };
  // Deduct bottles + closures from tracked supplies — but ONLY on the first
  // (fresh) bottling, so editing an existing record doesn't double-deduct.
  // (The guided workflow has its own deduction path.)
  if((!existing||existingTotal===0)&&typeof consumePackagingSupplies==='function'){
    var pkg=consumePackagingSupplies(countsAtBottling,total,APP.bottling[batchId].closure);
    APP.bottling[batchId].packaging=pkg;
    if(pkg&&pkg.items&&pkg.items.length){
      var deducted=pkg.items.filter(function(i){return i.tracked;}).map(function(i){return i.qty+' '+i.label;});
      if(deducted.length)toast('📦 Deducted: '+deducted.join(' · '),4000);
    }
  }
  scheduleSave();
  try{console.log('[MeadOS] saveBottling — total',total,'counts',countsAtBottling,'locations',JSON.parse(JSON.stringify(locations)));}catch(e){}
  var _advMsg='✦ '+total+' bottle'+(total!==1?'s':'')+' bottled · cellar populated';
  if(_advBatch&&typeof _advResolvedSuffix==='function')_advMsg+=_advResolvedSuffix(_advBatch,_advBefore);
  toast(_advMsg);
  showView('cellar');
}

function clearBottling(batchId){
  if(!confirm('Clear bottling record? Batch will return to active.'))return;
  delete APP.bottling[batchId];
  scheduleSave();toast('Bottling cleared');renderMain();
}

function deleteBatch(id){
  var b=getBatch(id);
  if(!b)return;
  if(!confirm('Permanently delete "'+b.name+'" and all associated logs, tastings, and bottling data?'))return;
  APP.batches=APP.batches.filter(function(x){return x.id!==id;});
  delete APP.logs[id];delete APP.tastings[id];delete APP.bottling[id];
  scheduleSave();toast('Batch deleted');showView('batches');
}

// ==================== FAILURE POSTMORTEM ====================
// When a batch goes wrong — contamination, irrecoverable stuck ferment,
// off-flavors, accident, planned-experiment-that-flopped — recording a
// postmortem preserves the lesson without losing the data. Unlike Delete,
// the batch stays in the database, just flagged as failed. Useful because:
//   - Year-end stats are honest (you brewed 30, dumped 4)
//   - Pattern-mining shows what failed batches share (counterpart to the
//     "best batches share" insights view)
//   - Future-you doesn't repeat the same mistake from forgetting

// Categories chosen for mead specifically — bacteria/wild yeast contamination
// is the #1 cause; oxidation and stuck-beyond-rescue are next.
var FAILURE_CATEGORIES=[
  {id:'contamination',label:'Contamination (bacteria / wild yeast)',icon:'🦠'},
  {id:'stuck',label:'Stuck ferment beyond rescue',icon:'⏸'},
  {id:'off-flavor',label:'Off-flavors / autolysis',icon:'🙊'},
  {id:'oxidation',label:'Oxidation / acetification',icon:'🍶'},
  {id:'accident',label:'Accident (spill, breakage, mishap)',icon:'💥'},
  {id:'process',label:'Process error (wrong yeast, miscalc, etc.)',icon:'🧪'},
  {id:'experiment',label:'Planned experiment that didn\'t work',icon:'🔬'},
  {id:'other',label:'Other',icon:'❓'}
];

function _selectFailureCategory(catId){
  document.querySelectorAll('.fail-cat-chip').forEach(function(el){
    el.classList.remove('sel');
    el.style.background='var(--bg)';
    el.style.color='var(--text2)';
    el.style.borderColor='var(--border)';
  });
  this.classList.add('sel');
  this.style.background='rgba(232,196,106,0.15)';
  this.style.color='var(--gold2)';
  this.style.borderColor='var(--gold)';
  document.getElementById('fail-cat').value=catId;
}
function openFailureModal(batchId){
  closeModal();
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var f=b.failed||{};
  var isEdit=!!b.failed;
  var catChips=FAILURE_CATEGORIES.map(function(c){
    var isSel=f.category===c.id;
    return'<span data-action="_selectFailureCategory" data-args=\''+JSON.stringify([c.id])+'\' class="fail-cat-chip'+(isSel?' sel':'')+'" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;background:'+(isSel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(isSel?'var(--gold)':'var(--border)')+';color:'+(isSel?'var(--gold2)':'var(--text2)')+';padding:5px 11px;border-radius:14px;margin:3px 4px 3px 0;transition:all 0.15s">'+c.icon+' '+escHtml(proseL(c.label))+'</span>';
  }).join('');
  var html='<div class="modal-overlay"><div class="modal" style="max-width:680px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">⚰ '+(isEdit?'EDIT POSTMORTEM':'MARK BATCH AS FAILED')+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.6">Recording a postmortem preserves the lesson — far better than just deleting the batch. The batch stays in your database (so year-end stats are honest) but is marked failed: it stops appearing on aging timelines and fermenter schedules, but contributes to "what your failed batches share" analysis. You can unfail it later if you change your mind.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div style="background:var(--bg);padding:12px;border-radius:var(--radius);margin-bottom:14px;border-left:3px solid var(--gold)">'
      +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(b.name)+(b.serial?' <span style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">#'+escHtml(b.serial)+'</span>':'')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:4px">Started '+fmtDate(b.startDate)+' · OG '+(b.og||'?')+' · '+(b.honeyType||'?')+'</div>'
    +'</div>'
    +'<div class="form-group"><label class="form-label">Date of failure</label><input class="form-input" type="date" id="fail-date" value="'+(f.date||today())+'"></div>'
    +'<div class="form-group"><label class="form-label">Failure category</label><div style="line-height:2.2">'+catChips+'</div><input type="hidden" id="fail-cat" value="'+escHtml(f.category||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">What went wrong?</label><textarea class="form-textarea" id="fail-what" placeholder="Be specific: aromas, gravity readings, timeline, anything visual. Future-you will thank present-you for the detail." style="min-height:100px">'+escHtml(f.whatWentWrong||'')+'</textarea></div>'
    +'<div class="form-group"><label class="form-label">What would you do differently next time?</label><textarea class="form-textarea" id="fail-next" placeholder="Concrete corrective action. e.g. \'Pitch yeast at 22°C not 28°C\', \'Use Chemipro SAN with 2min contact time, not just rinse\'" style="min-height:80px">'+escHtml(f.whatToTryNext||'')+'</textarea></div>'
    +'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)"><input type="checkbox" id="fail-saved" '+(f.wasSaved?'checked':'')+' style="width:16px;height:16px;cursor:pointer;accent-color:var(--gold2)"> The mead was salvaged (bottled as cooking mead, vinegar, etc.) rather than dumped</label></div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
      +'<button class="btn btn-primary" data-action="saveFailurePostmortem" data-args=\''+JSON.stringify([batchId])+'\'>'+(isEdit?'Save Postmortem':'Mark Failed & Save')+'</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveFailurePostmortem(batchId){
  var b=getBatch(batchId);
  if(!b)return;
  var cat=document.getElementById('fail-cat').value;
  var what=document.getElementById('fail-what').value.trim();
  if(!cat){toast('⚠ Pick a failure category');return;}
  if(!what){toast('⚠ Describe what went wrong');return;}
  b.failed={
    date:document.getElementById('fail-date').value||today(),
    category:cat,
    whatWentWrong:what,
    whatToTryNext:document.getElementById('fail-next').value.trim(),
    wasSaved:document.getElementById('fail-saved').checked,
    markedAt:Date.now()
  };
  scheduleSave();
  closeModal();
  toast('⚰ Marked as failed — postmortem saved');
  renderMain();
}

function unmarkBatchFailed(batchId){
  var b=getBatch(batchId);
  if(!b||!b.failed)return;
  if(!confirm('Restore "'+b.name+'" to its previous active state? The postmortem notes will be deleted.'))return;
  delete b.failed;
  scheduleSave();
  toast('Batch restored');
  renderMain();
}

// Prominent banner shown at the top of the batch detail view when failed.
function renderFailureBanner(b){
  if(!b||!b.failed)return'';
  var f=b.failed;
  var cat=FAILURE_CATEGORIES.find(function(c){return c.id===f.category;})||{label:f.category||'Unknown',icon:'⚰'};
  return'<div style="background:rgba(180,40,40,0.10);border-left:4px solid var(--red2);border-radius:var(--radius);padding:14px 18px;margin:12px 0">'
    +'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="font-family:var(--font-display);font-size:16px;color:var(--red2)">'+cat.icon+' '+(appLang()==='nl'?'Mislukte partij':'Failed batch')+' — '+escHtml(proseL(cat.label))+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+(f.date?fmtDate(f.date):'')+(appLang()==='nl'?(f.wasSaved?' · GERED':' · WEGGEGOOID'):(f.wasSaved?' · SALVAGED':' · DUMPED'))+'</div>'
    +'</div>'
    +(f.whatWentWrong?'<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:6px"><strong style="color:var(--red2);font-family:var(--font-mono);font-size:10px;letter-spacing:1px;text-transform:uppercase">What went wrong</strong><br>'+escHtml(f.whatWentWrong)+'</div>':'')
    +(f.whatToTryNext?'<div style="font-size:12.5px;color:var(--text2);line-height:1.6"><strong style="color:var(--gold2);font-family:var(--font-mono);font-size:10px;letter-spacing:1px;text-transform:uppercase">What to try next time</strong><br>'+escHtml(f.whatToTryNext)+'</div>':'')
    +'</div>';
}

// ==================== SETTINGS ACTIONS ====================
function saveHASettings(){
  function normUrl(v){
    v=(v||'').trim().replace(/\/+$/,'');
    if(v&&!/^https?:\/\//i.test(v))v='http://'+v;
    return v;
  }
  var urlEl=document.getElementById('set-url');
  if(urlEl)APP.settings.haUrl=normUrl(urlEl.value);
  var extUrlEl=document.getElementById('set-url-external');
  if(extUrlEl)APP.settings.haUrlExternal=normUrl(extUrlEl.value);
  // The token is write-only: only a freshly-typed value is sent to the server;
  // a blank field keeps whatever token is already stored there.
  var tokEl=document.getElementById('set-token');
  var typedToken=tokEl?tokEl.value.trim():'';
  var brewerEl=document.getElementById('set-brewer');
  if(brewerEl)APP.settings.brewerName=brewerEl.value.trim();
  var extEl=document.getElementById('set-external-url');
  if(extEl)APP.settings.externalUrl=extEl.value.trim().replace(/\/+$/,'');
  var usehaEl=document.getElementById('set-useha');
  if(usehaEl)APP.settings.useHA=usehaEl.checked;
  var pubEl=document.getElementById('set-publish-summary');
  if(pubEl)APP.settings.haPublishSummary=pubEl.checked;
  var tempEl=document.getElementById('set-temp');
  if(tempEl)APP.settings.tempSensorEntity=tempEl.value.trim();
  var cellarTempEl=document.getElementById('set-cellar-temp');
  if(cellarTempEl)APP.settings.cellarTempSensorEntity=cellarTempEl.value.trim();
  var notifyEl=document.getElementById('set-notify');
  if(notifyEl)APP.settings.notificationService=notifyEl.value.trim();
  var notifEnEl=document.getElementById('set-notif-enabled');
  if(notifEnEl)APP.settings.notificationsEnabled=notifEnEl.checked;
  var sachetEl=document.getElementById('set-sachet');
  if(sachetEl)APP.settings.sachetSize=parseFloat(sachetEl.value)||6;
  var hpEl=document.getElementById('set-honey-price');
  if(hpEl)APP.settings.honeyPricePerKg=parseFloat(hpEl.value)||0;
  var ccyEl=document.getElementById('set-currency');
  if(ccyEl)APP.settings.currency=ccyEl.value;
  saveSettings();
  scheduleSave(); // brewer name rides the shared blob — sync it too
  // Push the HA connection to the server: URLs + (only if typed) the token.
  // The token is stored server-side and proxied — never in the synced blob.
  var cfg={url:APP.settings.haUrl,urlExternal:APP.settings.haUrlExternal};
  if(typedToken)cfg.token=typedToken;
  fetch('/api/ha-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)})
    .then(function(r){return r.json();})
    .then(function(j){
      APP._haTokenSet=!!(j&&j.hasToken);
      APP._haTokenExp=(j&&j.tokenExp)||null;
      if(tokEl)tokEl.value='';  // clear the field; status now reads "stored"
      toast('Settings saved');
      startTempPolling();
      if(haConfigured())testConnection();
    })
    .catch(function(){toast('Settings saved — but HA config sync failed');});
}

// Clear the server-side HA token (e.g. on rotation or disconnect).
function clearHAToken(){
  if(!confirm('Remove the stored Home Assistant token from the server?'))return;
  fetch('/api/ha-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clearToken:true})})
    .then(function(r){return r.json();})
    .then(function(j){
      APP._haTokenSet=!!(j&&j.hasToken);
      APP._haTokenExp=(j&&j.tokenExp)||null;
      toast('HA token cleared');
      if(typeof showView==='function')showView('settings');
    })
    .catch(function(){toast('Could not clear token');});
}

// Auto-save handler for the Costs & Supplies card. Wired to each input's
// onchange. Doesn't touch HA-connection state — just persists locally and
// schedules a background sync.
function saveCostsSettings(){
  var hpEl=document.getElementById('set-honey-price');
  if(hpEl)APP.settings.honeyPricePerKg=parseFloat(hpEl.value)||0;
  var jpEl=document.getElementById('set-juice-price');
  if(jpEl)APP.settings.juicePricePerL=parseFloat(jpEl.value)||0;
  var ccyEl=document.getElementById('set-currency');
  if(ccyEl)APP.settings.currency=ccyEl.value;
  var sachetEl=document.getElementById('set-sachet');
  if(sachetEl)APP.settings.sachetSize=parseFloat(sachetEl.value)||12;
  var deductEl=document.getElementById('set-auto-deduct');
  if(deductEl)APP.settings.autoDeductSupplies=deductEl.checked;
  var sanEl=document.getElementById('set-sanitizer');
  if(sanEl&&SANITIZERS[sanEl.value])APP.settings.sanitizer=sanEl.value;
  saveSettings();
  toast('✓ Saved');
}

// E8: advisor explanation-density persona. View-layer only — renderBatchAdvisor
// reads APP.settings.advisorVerbosity directly, no other state depends on it.
function saveAdvisorVerbosity(){
  var el=document.getElementById('set-advisor-verbosity');
  if(!el||!/^(beginner|experienced|pro)$/.test(el.value))return;
  APP.settings.advisorVerbosity=el.value;
  saveSettings();
  if(typeof renderMain==='function')renderMain();
  toast('✓ Saved');
}

function forceSyncNow_button(){
  // Thin wrapper kept for backward compatibility with onclick handlers that
  // may have referenced this name; delegates to the canonical forceSyncNow.
  return forceSyncNow();
}

async function testConnection(){
  var status=document.getElementById('ha-conn-status')||document.getElementById('conn-status');
  if(status)status.innerHTML='<span style="color:var(--text2)">⟳ Testing…</span>';
  var r=await haTestConnection();
  if(!status)return;
  // Per-URL results already carry their own ✓/✗ markers — only prepend one
  // for single-sentence messages (e.g. "No Home Assistant URL").
  var prefix=(r.msg.charAt(0)==='✓'||r.msg.charAt(0)==='✗')?'':(r.ok?'✓ ':'✗ ');
  status.innerHTML='<span style="color:'+(r.ok?'var(--green2)':'var(--red2)')+'">'+prefix+r.msg+'</span>';
}

async function pullFromServer(){
  if(APP.batches.length>0||Object.keys(APP.bottling||{}).length>0){
    if(!confirm('Reload data from the server?\n\nThis will REPLACE all current local data with whatever is stored in the server database. Local changes that haven\'t synced will be lost.\n\nContinue?'))return;
  }
  toast('⟳ Loading from server…');
  await loadData();
  if(typeof rebuildRecipes==='function')rebuildRecipes();
  renderMain();
  toast('✓ '+APP.batches.length+' batch'+(APP.batches.length!==1?'es':'')+' loaded');
}
var pullFromHA=pullFromServer; // legacy name

// Scan the server for orphaned uploaded images (not referenced by any batch,
// recipe, or restorable snapshot) and offer to delete them.
async function scanOrphanImages(){
  var el=document.getElementById('orphan-result');
  if(el)el.innerHTML='Scanning…';
  try{
    var res=await apiFetch('/api/assets/orphans');
    var j=res&&res.ok?await res.json():null;
    if(!j||!j.ok){if(el)el.innerHTML='<span style="color:var(--red2)">Scan failed.</span>';return;}
    var n=(j.orphans||[]).length;
    if(!n){if(el)el.innerHTML='<span style="color:var(--green2)">✓ No unused images — everything on disk is in use.</span>';return;}
    window._orphanNames=j.orphans.map(function(o){return o.name;});
    if(el)el.innerHTML='<div style="margin-bottom:10px"><strong style="color:var(--gold2)">'+n+'</strong> unused image'+(n===1?'':'s')+' · '+fmtBytes(j.totalBytes||0)+' reclaimable.</div>'
      +'<button class="btn btn-danger btn-sm" data-action="deleteOrphanImages">🗑 Delete '+n+' unused image'+(n===1?'':'s')+'</button>';
  }catch(e){if(el)el.innerHTML='<span style="color:var(--red2)">Scan failed.</span>';}
}
async function deleteOrphanImages(){
  if(!window._orphanNames||!window._orphanNames.length)return;
  if(!confirm('Permanently delete '+window._orphanNames.length+' unused image file'+(window._orphanNames.length===1?'':'s')+' from the server? Images still referenced anywhere (including version history) are kept automatically.'))return;
  var el=document.getElementById('orphan-result');
  if(el)el.innerHTML='Deleting…';
  try{
    var res=await apiFetch('/api/assets/cleanup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:window._orphanNames})});
    var j=res&&res.ok?await res.json():null;
    if(j&&j.ok){
      window._orphanNames=null;
      if(el)el.innerHTML='<span style="color:var(--green2)">✓ Deleted '+j.deleted+' image'+(j.deleted===1?'':'s')+' · freed '+fmtBytes(j.freedBytes||0)+'.</span>';
    }else if(res&&res.status===403){
      if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup is only allowed from inside your LAN.</span>';
    }else{
      if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup failed.</span>';
    }
  }catch(e){if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup failed.</span>';}
}

function exportData(){
  // Full snapshot — every persisted bucket. Versioned with CURRENT_SCHEMA_VERSION
  // so older exports can be migrated on import. Anything in packageState should
  // also be exportable here.
  APP.settings.lastBackupAt=new Date().toISOString();
  if(typeof saveSettings==='function')saveSettings();
  var data={
    exportedAt:APP.settings.lastBackupAt,
    dataVersion:(typeof CURRENT_SCHEMA_VERSION!=='undefined'?CURRENT_SCHEMA_VERSION:8),
    settings:APP.settings,
    batches:APP.batches,
    logs:APP.logs,
    additions:APP.additions||{},
    tasksDone:APP.tasksDone,
    tastings:APP.tastings,
    bottling:APP.bottling,
    supplies:APP.supplies,
    customRecipes:APP.customRecipes||[],
    fermenters:APP.fermenters||[],
    suppliers:APP.suppliers||[],
    cabinets:APP.cabinets||[],
    templates:APP.templates||[],
    stepTemplates:APP.stepTemplates||[],
    celebrated:APP.celebrated||{},
    tempAnomalies:APP.tempAnomalies||[],
    notifiedTasks:APP.notifiedTasks||{},
    competitions:APP.competitions||{},
    plannedBatches:APP.plannedBatches||[],
    photos:APP.photos||{},
    shareTokens:APP.shareTokens||{}
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='meadows-backup-'+today()+'.json';a.click();
  URL.revokeObjectURL(url);
  toast('✦ Backup exported');
  if(typeof renderMain==='function')renderMain();
}

function importData(event){
  var file=event.target.files[0];
  if(!file)return;
  if(!confirm('Replace ALL current data with imported backup? Cannot be undone.'))return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      // A destructive, explicit "replace everything" action deserves a hard
      // rejection for a wholesale-wrong file (wrong export, truncated
      // download, unrelated JSON) rather than silently "importing" garbage —
      // see validateState() in 14-schema.js. Bucket-level issues in an
      // otherwise-real backup are still sanitized + reported below via the
      // same check inside applyState(), which is the more common case (an
      // older/partial backup missing a field entirely is fine).
      if(typeof validateState==='function'){
        var rootCheck=validateState(d);
        var knownBuckets=STATE_ARRAY_BUCKETS.concat(STATE_OBJECT_BUCKETS);
        var looksLikeBackup=rootCheck.sanitized&&knownBuckets.some(function(k){return k in d;});
        if(!looksLikeBackup){
          toast('⚠ That file doesn\'t look like a MeadOS backup — import cancelled');
          return;
        }
      }
      // Run migrations on the imported payload so older backups (v1-v5) come
      // up to the current shape before we apply them. migrateData mutates in
      // place and stamps dataVersion.
      if(typeof migrateData==='function'){
        var report=migrateData(d);
        d=report.result;
      }
      // Apply EVERY bucket. Use applyState if available so cross-field
      // normalization (bottle location shape, fermenter assignment, etc) runs;
      // otherwise fall back to direct assignment.
      if(typeof applyState==='function'){
        applyState(d);
      }else{
        if(d.settings)APP.settings=Object.assign(APP.settings,d.settings);
        APP.batches=d.batches||[];
        APP.logs=d.logs||{};
        APP.additions=d.additions||{};
        APP.tasksDone=d.tasksDone||{};
        APP.tastings=d.tastings||{};
        APP.bottling=d.bottling||{};
        APP.supplies=d.supplies||[];
        APP.customRecipes=d.customRecipes||[];
        APP.fermenters=d.fermenters||[];
        APP.plannedBatches=d.plannedBatches||[];
        APP.photos=d.photos||{};
        APP.templates=d.templates||[];
        APP.celebrated=d.celebrated||{};
        APP.tempAnomalies=d.tempAnomalies||[];
        APP.notifiedTasks=d.notifiedTasks||{};
      }
      if(typeof rebuildRecipes==='function')rebuildRecipes();
      saveSettings();scheduleSave();
      toast('✦ Backup imported');renderMain();
    }catch(err){toast('⚠ Invalid backup file');}
  };
  reader.readAsText(file);
}

function resetAllData(){
  // Clears every batch-related data bucket but preserves the things the brewer
  // has invested time in customizing: label designs, custom recipes, brand logo,
  // HA connection settings, supply prices and the brewer's display name.
  var warning=
    'RESET DUMMY / TEST DATA — PERMANENT, CANNOT BE UNDONE\n\n'+
    'This will DELETE:\n'+
    '  • All batches and their gravity logs\n'+
    '  • All bottling records (bottle counts, drunk/gifted history)\n'+
    '  • All tasting notes and ratings\n'+
    '  • All brew-day task completion state\n'+
    '  • All supply inventory entries\n'+
    '  • Per-batch additions log\n'+
    '  • Celebrated milestones (so future confetti fires correctly)\n'+
    '  • Temperature anomaly history\n'+
    '  • Compare-batches selection\n'+
    '  • Sent-notification cache\n\n'+
    'This will PRESERVE:\n'+
    '  • Label designs and recipe overlays (Label Designer)\n'+
    '  • Brand logo and brewer name\n'+
    '  • Custom recipes you authored\n'+
    '  • Favorite recipes\n'+
    '  • Server & Home Assistant connection settings, sensor bindings\n'+
    '  • Honey price, currency, sachet size\n'+
    '  • Fermenter list (vessels themselves, but their assigned batches will clear)\n\n'+
    'Proceed?';
  if(!confirm(warning))return;
  if(!confirm('Are you absolutely sure? Type-equivalent of "yes" — there is no undo.'))return;
  APP.batches=[];
  APP.logs={};
  APP.tasksDone={};
  APP.tastings={};
  APP.bottling={};
  APP.supplies=[];
  APP.notifiedTasks={};
  APP.additions={};
  APP.celebrated={};
  APP.tempAnomalies=[];
  APP.compareSelection=[];
  APP.plannedBatches=[];
  APP.photos={};
  // Clear any batch assignments on fermenters but keep the vessels themselves
  if(APP.fermenters&&APP.fermenters.length){
    APP.fermenters.forEach(function(f){f.batchId=null;});
  }
  scheduleSave();
  toast('All batch data reset · labels & recipes preserved');
  showView('dashboard');
}
