// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// cellar, label images, storage-box labels, compare, supplies, suppliers
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
function _toggleCellarShowFinished(){
  window._cellarShowFinished=!window._cellarShowFinished;
  renderMain();
}
function _openBatchTastingTab(id){
  showView('batch',id);
  setTimeout(function(){setBatchTab(id,'tasting');},10);
}
function _selectShelfPick(shelfId){
  document.querySelectorAll('.shelf-pick').forEach(function(el){
    el.classList.remove('sel');
    el.style.background='var(--bg)';
    el.style.borderColor='var(--border)';
  });
  this.classList.add('sel');
  this.style.background='rgba(232,196,106,0.15)';
  this.style.borderColor='var(--gold)';
  document.getElementById('shelf-pick-id').value=shelfId;
}
function _selectFermShelfPick(shelfId){
  document.querySelectorAll('.ferm-shelf-pick').forEach(function(el){
    el.classList.remove('sel');
    el.style.background='var(--bg)';
    el.style.borderColor='var(--border)';
  });
  this.classList.add('sel');
  this.style.background='rgba(232,196,106,0.15)';
  this.style.borderColor='var(--gold)';
  document.getElementById('ferm-shelf-pick-id').value=shelfId;
}
function _removeBatchFromShelfAndClose(id){
  removeBatchFromShelf(id);
  closeModal();
}
function _removeBatchFromShelfCloseRender(id){
  removeBatchFromShelf(id);
  closeModal();
  renderMain();
}
function _removeFermenterFromShelfCloseRender(id){
  removeFermenterFromShelf(id);
  closeModal();
  renderMain();
}
function _removeFermenterFromShelfAndClose(id){
  removeFermenterFromShelf(id);
  closeModal();
}
function _closeAndOpenBatch(id){
  closeModal();
  showView('batch',id);
}
function _closeAndEditCabinet(id){
  closeModal();
  openCellarConfigModal(id);
}
function _closeAndRemoveFromCellar(id){
  closeModal();
  removeFromCellar(id);
}
// ==================== BOTTLE AGING HELPERS ====================
function bottleDaysAged(b){
  var bot=APP.bottling[b.id];
  if(!bot||!bot.date)return null;
  return daysSince(bot.date);
}

function getAgingProfile(b){
  // Returns { minDays, peakDays, maxDays } pulled from recipe or sensible
  // defaults. Custom/wizard-built recipes historically saved minDays/
  // peakDays/maxDays (no "Age") while built-ins use minAgeDays/peakAgeDays/
  // maxAgeDays — check both so a custom recipe's own values are used.
  var r=getRecipe(b.recipeId);
  var peak=r&&(r.peakAgeDays||r.peakDays);
  if(peak)return{minDays:(r.minAgeDays||r.minDays)||30,peakDays:peak,maxDays:(r.maxAgeDays||r.maxDays)||(peak*3)};
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
  var bottled=visibleBatches().filter(function(b){return APP.bottling[b.id]&&APP.bottling[b.id].date;});
  if(!bottled.length){
    return'<div class="page-title">The Cellar</div><div class="page-subtitle">Bottle Aging Tracker</div>'
      +'<div class="empty-state"><div class="es-icon">🍾</div><p>No bottled batches yet.</p><br>'
      +'<p style="font-size:13px">Bottles you record will appear here with aging progress against optimal drinking windows.</p>'
      +'<p style="margin-top:18px"><button class="btn btn-secondary btn-sm" data-action="showView" data-args=\'["cellar-map"]\' title="Configure your storage cabinet with shelves and sensors">🏠 My Cellar →</button></p></div>';
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
  var finishedToggle=finishedCount?'<button class="btn btn-secondary btn-sm" data-action="_toggleCellarShowFinished" style="margin-left:8px">'+(showFinished?'🙈 Hide '+finishedCount+' finished':'👁 Show '+finishedCount+' finished')+'</button>':'';
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

  // Window the cards (stats above still count the full set) so a large cellar
  // renders only a page of cards at a time.
  var CELLAR_PAGE=48;
  if(window._cellarLimit==null)window._cellarLimit=CELLAR_PAGE;
  var _rmap={};(APP.recipes||[]).forEach(function(r){_rmap[r.id]=r;});
  var shownBottled=bottled.slice(0,window._cellarLimit);
  var cards=shownBottled.map(function(b){
    var bot=APP.bottling[b.id];
    // bot.locations is guaranteed to be present and properly size-keyed by
    // applyState's normalization. Earlier this had a defensive fallback that
    // would create the wrong (number-shaped) layout if it ever ran — removed
    // since it was unreachable and would corrupt if hit.
    var aged=bottleDaysAged(b);
    var profile=getAgingProfile(b);
    var status=getAgingStatus(aged,profile);
    var recipe=_rmap[b.recipeId];
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
      +'<div style="font-size:12px;color:var(--text3);margin-top:3px;line-height:1.7">'+escHtml(recipe?recipe.style:(b.style||'Custom'))+' · '+(appLang()==='nl'?'Gebotteld':'Bottled')+' '+fmtDate(bot.date)
      +agingStr
      +(perLStr?' · <span style="color:var(--green2);font-family:var(--font-mono)">'+perLStr+'</span>':'')
      +(perBottleStr?' · <span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+perBottleStr+'</span>':'')
      +' · <span style="color:var(--text2);font-family:var(--font-mono);font-size:11px">'+escHtml(onHandSummary)+'</span>'
      +'</div></div>';
    var headerRight='<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">'
      +'<div class="aging-status '+statusBadgeClass+'" style="'+(inconsistent?'color:var(--red2);border-color:var(--red);background:#1a0808':'')+'">'+statusBadgeText+'</div>'
      +'<div id="cellar-chev-'+b.id+'" style="font-family:var(--font-mono);font-size:14px;color:var(--text3);width:18px;text-align:center;transition:transform 0.2s;'+(isOpen?'transform:rotate(0deg)':'')+'">'+(isOpen?'▼':'▶')+'</div>'
      +'</div>';
    var header='<div data-action="toggleCellarCard" data-args=\''+JSON.stringify([b.id])+'\' style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none" title="Click to '+(isOpen?'collapse':'expand')+' inventory and aging details">'
      +headerLeft+headerRight+'</div>';

    // Expanded body — bottle grid, aging bar, actions, etc.
    var body='<div id="cellar-body-'+b.id+'"><div style="padding:0 16px 16px">'
      +(inconsistent?'<div class="stock-alert" style="margin-bottom:14px;flex-wrap:wrap"><span class="icon">⚠</span><span style="flex:1;min-width:200px"><strong>No bottles on hand</strong> — you recorded '+origCount+' bottled. Did you already drink/gift them, or was the cellar never filled in?</span><span style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" data-action="markBatchFinished" data-args=\''+JSON.stringify([b.id])+'\' style="white-space:nowrap">Mark finished</button><button class="btn btn-primary btn-sm" data-action="fillCellarFromOriginal" data-args=\''+JSON.stringify([b.id])+'\' style="white-space:nowrap">Fill cellar ('+origCount+')</button></span></div>':'')
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
              return'<div class="loc-cell" style="margin:0"><input type="number" min="0" value="'+n+'" onchange="setBottleLocation(\''+b.id+'\',\''+l.key+'\','+size+',this.value)" style="text-align:center;width:100%"></div>';
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
      +'<div class="cellar-actions">'
      +(function(){
        var sizes=activeBottleSizes(bot);
        var buttons=sizes.map(function(size){
          var avail=bottlesInLocationBySize(bot,'cellar',size)+bottlesInLocationBySize(bot,'fridge',size)+bottlesInLocationBySize(bot,'other',size);
          if(sizes.length>1)return'<button class="btn btn-secondary btn-sm" data-action="drinkBottle" data-args=\''+JSON.stringify([b.id,size])+'\''+(avail<=0?' disabled':'')+'>🍷 Drank '+size+'ml</button>';
          return'<button class="btn btn-secondary btn-sm" data-action="drinkBottle" data-args=\''+JSON.stringify([b.id,size])+'\''+(avail<=0?' disabled':'')+'>🍷 Drank One</button>';
        });
        return buttons.join(' ');
      }())
      +' <button class="btn btn-secondary btn-sm" data-action="openCellarEditModal" data-args=\''+JSON.stringify([b.id])+'\'>✏ Edit</button>'
      +'<button class="btn btn-secondary btn-sm" data-action="_openBatchTastingTab" data-args=\''+JSON.stringify([b.id])+'\'>⭐ Tasting</button>'
      +'<button class="btn btn-primary btn-sm" data-action="showView" data-args=\''+JSON.stringify(['batch',b.id])+'\' style="margin-left:6px">↗ Open Batch</button>'
      +'<button class="btn btn-danger btn-sm" style="margin-left:auto" data-action="removeFromCellar" data-args=\''+JSON.stringify([b.id])+'\' title="Return to active batches">🗑</button>'
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
    +(bottled.length>1?'<button class="btn btn-secondary btn-sm" data-action="cellarExpandAll" data-args=\'[true]\' title="Expand all batches">▼ Expand All</button>':'')
    +(bottled.length>1?'<button class="btn btn-secondary btn-sm" data-action="cellarExpandAll" data-args=\'[false]\' title="Collapse all batches">▶ Collapse All</button>':'')
    +finishedToggle
    +(bottled.length?'<button class="btn btn-secondary btn-sm" data-action="showView" data-args=\'["review"]\'>★ Year in Review</button>':'')
    +'<button class="btn btn-secondary btn-sm" data-action="showView" data-args=\'["cellar-map"]\' title="Visual storage cabinet with shelves and sensor-linked temperature">🏠 My Cellar</button>'
    +(bottled.length?'<button class="btn btn-secondary btn-sm" data-action="printAllLabels">📑 Print Label Sheet</button>':'')
    +(bottled.length?'<button class="btn btn-secondary btn-sm" data-action="openStorageLabelPicker" title="Pick which bottled batches to print storage labels for">📦 Print Storage Labels</button>':'')
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
    +(bottled.length>window._cellarLimit?'<div style="text-align:center;margin:16px 0"><button class="btn btn-secondary btn-sm" data-action="showMoreCellar">Show more · '+(bottled.length-window._cellarLimit)+' more</button></div>':'')
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
    return'<button class="btn btn-secondary btn-sm" data-action="setCellarTempRange" data-args=\''+JSON.stringify([r.hours])+'\' style="'+(isActive?'background:rgba(232,196,106,0.18);color:var(--gold2);border-color:var(--gold)':'')+'">'+r.label+'</button>';
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

  window._cellarTempCharts[en.id]=makeChart(ctx,{
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
            title:function(items){if(!items.length)return'';return new Date(items[0].parsed.x).toLocaleString(_dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
          }
        }
      },
      scales:{
        x:{type:'linear',min:t0,max:t1,
          ticks:{color:'#6a5f50',font:{size:10},maxTicksLimit:7,callback:function(v){
            var d=new Date(v);
            return hours<=24
              ?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              :d.toLocaleDateString(_dloc(),{day:'2-digit',month:'short'});
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
        +'<button class="btn btn-primary" data-action="addCabinet">＋ Add cabinet</button>'
        +'<button class="btn btn-secondary" style="margin-left:10px" data-action="quickSetupWineFridge" title="Pre-configures a wine fridge with numbered shelves">Quick setup: wine fridge</button>'
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
        +'<div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" data-action="openCellarConfigModal" data-args=\''+JSON.stringify([c.id])+'\'>⚙ Configure</button><button class="btn btn-secondary btn-sm" data-action="deleteCabinet" data-args=\''+JSON.stringify([c.id])+'\' style="color:var(--red2)" title="Remove this cabinet">✕</button></div>'
      +'</div>'
      +renderCellarShelves(c,byShelf,byShelfFerm)
    +'</div>';
  }).join('');

  return'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px">'
      +'<div><div class="page-title" style="margin-bottom:6px">My Cellar</div><div class="page-subtitle" style="margin-bottom:0">'+cabs.length+' cabinet'+(cabs.length===1?'':'s')+' · '+totalShelves+' shelves</div></div>'
      +'<button class="btn btn-primary btn-sm" data-action="addCabinet">＋ Add cabinet</button>'
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
    +'<div data-action="showCabinetTempAdvice" data-args=\''+JSON.stringify([c.id])+'\' title="'+(c.tempSensorEntity?'Click for temperature advice (fermenting + aging)':'')+'" style="background:#000000;border-radius:3px;padding:7px 14px;display:flex;align-items:center;gap:10px;border:1px solid #1a1612;min-width:200px;justify-content:center'+(c.tempSensorEntity?';cursor:pointer':'')+'">'
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
    return'<div class="card" style="padding:20px;text-align:center"><div style="color:var(--text3);font-size:13px;margin-bottom:14px">No shelves configured.</div><button class="btn btn-secondary btn-sm" data-action="openCellarConfigModal" data-args=\''+JSON.stringify([c.id])+'\'>Add shelves</button></div>';
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
  return'<div data-action="openShelfDetailModal" data-args=\''+JSON.stringify([s.id])+'\' '
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
        return'<span data-action="showView" data-args=\''+JSON.stringify(['batch',b.id])+'\' style="background:#0a0806;border-left:2px solid '+color+';padding:3px 8px;font-size:10.5px;color:#c9a350;border-radius:3px;cursor:pointer;font-family:Georgia,serif">'+escHtml(b.name)+(onHand?' <span style="font-family:var(--font-mono);font-size:9px;color:#7a6240">'+onHand+'</span>':'')+'</span>';
      }).join('')
    +'</div>';
  }
  // No rigid min-height — let the natural flex content height drive the box
  // size. The bottom label is in normal flow (not absolute) so it pushes the
  // box down to fit everything. This removes the huge empty space below the
  // fermenters that used to result from over-generous min-height heuristics.
  return'<div data-action="openShelfDetailModal" data-args=\''+JSON.stringify([s.id])+'\' '
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
      html+='<div data-action="openShelfAssignmentModal" data-args=\''+JSON.stringify([b.id])+'\' style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
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
      html+='<div data-action="openFermenterShelfAssignmentModal" data-args=\''+JSON.stringify([f.id])+'\' style="background:var(--bg);border-left:3px solid '+(f.color||'var(--gold)')+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
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
      html+='<span data-action="showView" data-args=\''+JSON.stringify(['batch',b.id])+'\' style="display:inline-block;background:var(--bg2);border-radius:4px;padding:3px 8px;margin:2px 4px 2px 0;font-size:11px;cursor:pointer;color:var(--text2)">'+escHtml(b.name)+'</span>';
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
  var b=getBatch(batchId);
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
    return'<div data-action="_selectShelfPick" data-args=\''+JSON.stringify([s.id])+'\' class="shelf-pick '+sel+'" style="background:'+bg+';border:1px solid '+borderColor+';border-radius:6px;padding:9px 12px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s">'
      +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+escHtml(s.label)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">'+(s.type==='open'?'OPEN':(s.type==='fermenter_slot'?'FERMENTER':'RACK'))+(s.capacity?' · '+bottles+'/'+s.capacity:'')+'</div></div>'
      +(on.length?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+on.length+' batch'+(on.length===1?'':'es')+'</div>':'<div style="font-size:11px;color:var(--text3);font-style:italic">empty</div>')
      +'</div>';
    }).join('');
  }).join('');
  var html='<div class="modal-overlay"><div class="modal" style="max-width:520px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📍 ASSIGN TO SHELF</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick a shelf for <strong style="color:var(--gold2)">'+escHtml(b.name)+'</strong>'+(b.serial?' (#'+escHtml(b.serial)+')':'')+'.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'+shelfOptions+'</div>'
    +'<input type="hidden" id="shelf-pick-id" value="'+escHtml(current)+'">'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +(current?'<button class="btn btn-danger" style="margin-right:auto" data-action="_removeBatchFromShelfAndClose" data-args=\''+JSON.stringify([batchId])+'\'>Remove assignment</button>':'')
      +'<button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
      +'<button class="btn btn-primary" data-action="saveShelfAssignment" data-args=\''+JSON.stringify([batchId])+'\'>Save</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveShelfAssignment(batchId){
  var shelfId=document.getElementById('shelf-pick-id').value;
  if(!shelfId){toast('⚠ Pick a shelf');return;}
  var b=getBatch(batchId);
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
  var b=getBatch(batchId);
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
  var html='<div class="modal-overlay"><div class="modal" style="max-width:560px;max-height:90vh;display:flex;flex-direction:column">'
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
        +'<div data-action="_removeFermenterFromShelfCloseRender" data-args=\''+JSON.stringify([f.id])+'\' style="color:var(--red2);font-size:14px;padding:4px 8px;cursor:pointer" title="Remove fermenter from shelf">✕</div>'
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
      html+='<div data-action="_closeAndOpenBatch" data-args=\''+JSON.stringify([b.id])+'\' style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(b.serial?'#'+escHtml(b.serial)+' · ':'')+onHand+' bottle'+(onHand===1?'':'s')+'</div></div>'
        +'<div data-action="_removeBatchFromShelfCloseRender" data-args=\''+JSON.stringify([b.id])+'\' style="color:var(--red2);font-size:14px;padding:4px 8px;cursor:pointer" title="Remove from shelf">✕</div>'
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
      html+='<div data-action="quickPlaceFermenterOnShelf" data-args=\''+JSON.stringify([f.id,shelfId])+'\' style="background:var(--bg);border-left:3px solid '+(f.color||'var(--gold)')+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
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
      html+='<div data-action="quickPlaceOnShelf" data-args=\''+JSON.stringify([b.id,shelfId])+'\' style="background:var(--bg);border-left:3px solid '+color+';border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(b.serial?'#'+escHtml(b.serial)+' · ':'')+onHand+' bottle'+(onHand===1?'':'s')+'</div></div>'
        +'<div style="color:var(--gold2);font-size:12px">+</div>'
      +'</div>';
    });
  }

  html+='</div><div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" data-action="closeModal">Close</button><button class="btn btn-secondary" data-action="_closeAndEditCabinet" data-args=\''+JSON.stringify([hit.cabinet.id])+'\'>Edit shelves</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function quickPlaceOnShelf(batchId,shelfId){
  var b=getBatch(batchId);
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
    return'<div data-action="_selectFermShelfPick" data-args=\''+JSON.stringify([s.id])+'\' class="ferm-shelf-pick '+sel+'" style="background:'+bg+';border:1px solid '+borderColor+';border-radius:6px;padding:9px 12px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s">'
      +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+escHtml(s.label)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">'+(s.type==='open'?'OPEN':(s.type==='fermenter_slot'?'FERMENTER':'RACK'))+'</div></div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+subtitle.join(' · ')+'</div>'
      +'</div>';
    }).join('');
  }).join('');
  var html='<div class="modal-overlay"><div class="modal" style="max-width:520px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">⚗ PLACE FERMENTER</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick a shelf for <strong style="color:var(--gold2)">'+escHtml(f.name)+'</strong>'+(f.capacity?' ('+f.capacity+'L)':'')+'. Multiple fermenters can share a wide shelf.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'+shelfOptions+'</div>'
    +'<input type="hidden" id="ferm-shelf-pick-id" value="'+escHtml(current)+'">'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +(current?'<button class="btn btn-danger" style="margin-right:auto" data-action="_removeFermenterFromShelfAndClose" data-args=\''+JSON.stringify([fermenterId])+'\'>Remove from shelf</button>':'')
      +'<button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
      +'<button class="btn btn-primary" data-action="saveFermenterShelfAssignment" data-args=\''+JSON.stringify([fermenterId])+'\'>Save</button>'
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
      +'<button class="btn btn-danger btn-sm" data-action="removeShelfFromConfig" data-args=\''+JSON.stringify([s.id])+'\' title="Delete shelf">✕</button>'
    +'</div>';
  }).join('');
  var html='<div class="modal-overlay"><div class="modal" style="max-width:680px;max-height:90vh;display:flex;flex-direction:column">'
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
      +'<div style="border-top:1px solid var(--border);margin:14px 0 10px;padding-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">Shelves ('+(c.shelves||[]).length+')</div><div><button class="btn btn-secondary btn-sm" data-action="addShelfToConfig">+ Add shelf</button> <button class="btn btn-secondary btn-sm" data-action="resetShelvesToDefault" title="Replace all shelves with a numbered default set">↻ Reset shelves…</button></div></div>'
        +'<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Reorder by editing the labels (e.g. \'01 Top\', \'02 Upper\'). Set type to \'Open\' for shelves you removed to fit fermenters.</div>'
        +'<div id="cellar-shelves-list">'+shelfRows+'</div>'
      +'</div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
      +'<button class="btn btn-primary" data-action="saveCellarConfig">Save</button>'
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
    var recipe=getRecipe(b.recipeId);
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
  var b=getBatch(batchId);
  if(!b)return;
  if(!confirm('Remove "'+b.name+'" from cellar?\n\nThe bottling record will be cleared and this batch will return to active status. Gravity logs and tasting notes are preserved.'))return;
  delete APP.bottling[batchId];
  scheduleSave();
  toast('Removed from cellar');
  renderMain();
}

function openCellarEditModal(batchId){
  var b=getBatch(batchId);
  if(!b)return;
  var bot=APP.bottling[batchId]||{};
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  closeModal();
  var sweetOpts=sweetnessOptionLabels(b.beverageType)
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
  var html='<div class="modal-overlay"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">EDIT BOTTLING · '+escHtml(b.name)+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Bottle Date</label><input class="form-input" type="date" id="ce-date" value="'+(bot.date||today())+'"></div>'
    +'<div class="form-group"><label class="form-label">Final ABV %</label><input class="form-input" type="number" step="0.1" id="ce-abv" value="'+(bot.abv||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" type="number" step="0.001" id="ce-fg" value="'+(bot.fg||'')+'" oninput="updateCellarSweetHint(\''+b.id+'\')"></div>'
    +'<div class="form-group"><label class="form-label">Sweetness</label><select class="form-select" id="ce-sweet">'+sweetOpts+'</select><div id="ce-sweet-hint" style="font-size:11px;color:var(--text3);margin-top:4px">'+_bottlingSweetHintHtml(bot.fg,b.beverageType)+'</div></div></div>'
    +'<div style="margin:10px 0 4px;font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">INVENTORY · CURRENT</div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px">'+invHeader+invRows+'</div>'
    +'<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12px;color:var(--text3);padding:4px 0">Advanced: Edit originally-bottled counts</summary>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin:6px 0">These are immutable normally — edit only to correct historical data. Drives per-bottle cost math.</div>'
    +'<div class="form-row">'+origCountsHTML+'</div>'
    +'</details>'
    +'<div class="form-group" style="margin-top:14px"><label class="form-label">Notes</label><textarea class="form-textarea" id="ce-notes" placeholder="Bottle type, cap/cork, storage location…">'+escHtml(bot.notes||'')+'</textarea></div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-danger" style="margin-right:auto" data-action="_closeAndRemoveFromCellar" data-args=\''+JSON.stringify([batchId])+'\'>Remove from Cellar</button>'
    +'<button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
    +'<button class="btn btn-primary" data-action="saveCellarEdit" data-args=\''+JSON.stringify([batchId])+'\'>Save</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function updateCellarSweetHint(batchId){
  var el=document.getElementById('ce-sweet-hint');
  if(!el)return;
  var b=getBatch(batchId);
  var fg=(document.getElementById('ce-fg')||{}).value;
  el.innerHTML=_bottlingSweetHintHtml(fg,b&&b.beverageType);
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
  window._cellarLimit=48;  // back to page one when the order changes
  renderMain();
}
function showMoreCellar(){window._cellarLimit=(window._cellarLimit||48)+48;renderMain();}

