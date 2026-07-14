// ==========================================================================
// Year-in-review view.
// Split out of the former 11-features.js. Globals, no behaviour change.
// ==========================================================================

// ==================== YEAR IN REVIEW ====================
function renderYearReview(){
  // Allow viewing previous years' reviews. State lives on window._yrYear (in-memory)
  // so leaving and coming back resets to the current year.
  var currentYear=new Date().getFullYear();
  var year=window._yrYear||currentYear;
  // Find the earliest year that has any batch activity so we know the lower bound
  var minYear=currentYear;
  var yrBatches=typeof visibleBatches==='function'?visibleBatches():APP.batches;
  yrBatches.forEach(function(b){
    if(b.startDate){var y=new Date(b.startDate).getFullYear();if(y<minYear)minYear=y;}
  });
  Object.keys(APP.bottling||{}).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(bot&&bot.date){var y=new Date(bot.date).getFullYear();if(y<minYear)minYear=y;}
  });
  var yearStart=new Date(year,0,1).getTime();
  var yearEnd=new Date(year+1,0,1).getTime();
  // Filter batches started in this year
  var thisYearBatches=yrBatches.filter(function(b){
    var t=new Date(b.startDate).getTime();
    return t>=yearStart&&t<yearEnd;
  });
  // Filter bottled-this-year
  var bottledThisYear=yrBatches.filter(function(b){
    var bot=APP.bottling[b.id];
    if(!bot)return false;
    var t=new Date(bot.date).getTime();
    return t>=yearStart&&t<yearEnd;
  });
  var bottlesProduced=bottledThisYear.reduce(function(s,b){return s+totalBottles(APP.bottling[b.id]);},0);
  // ABV stats
  var abvs=bottledThisYear.map(function(b){return APP.bottling[b.id].abv;}).filter(function(x){return x;});
  var avgAbv=abvs.length?(abvs.reduce(function(s,v){return s+v;},0)/abvs.length).toFixed(1):'—';
  var maxAbv=abvs.length?Math.max.apply(null,abvs).toFixed(1):'—';
  // Cost stats
  var totalCost=thisYearBatches.reduce(function(s,b){return s+(b.cost?(b.cost.honey||0)+(b.cost.extras||0):0);},0);
  var perBottleAvg=bottlesProduced>0?(totalCost/bottlesProduced).toFixed(2):'—';
  // Attenuation
  var attBatches=bottledThisYear.filter(function(b){
    var bot=APP.bottling[b.id];var fg=bot.fg||(APP.logs[b.id]&&APP.logs[b.id].length?APP.logs[b.id][APP.logs[b.id].length-1].gravity:null);
    return b.og&&fg&&b.og>fg;
  });
  var attValues=attBatches.map(function(b){var bot=APP.bottling[b.id];var fg=bot.fg||APP.logs[b.id][APP.logs[b.id].length-1].gravity;return ((b.og-fg)/(b.og-1))*100;});
  var avgAtt=attValues.length?(attValues.reduce(function(s,v){return s+v;},0)/attValues.length).toFixed(1):'—';
  // Recipes attempted (distinct)
  var distinctRecipes=Array.from(new Set(thisYearBatches.map(function(b){return b.recipeId;})));
  // Top-rated tasting note
  var allTastings=[];
  Object.keys(APP.tastings||{}).forEach(function(bid){
    (APP.tastings[bid]||[]).forEach(function(t){
      if(t.date&&new Date(t.date).getTime()>=yearStart&&new Date(t.date).getTime()<yearEnd&&t.rating>0){
        var b=yrBatches.find(function(x){return x.id===bid;});
        if(b)allTastings.push({batch:b,tasting:t});
      }
    });
  });
  allTastings.sort(function(a,b){return b.tasting.rating-a.tasting.rating;});
  var bestTasting=allTastings[0];
  var ccy=APP.settings.currency||'€';
  var months=new Array(12).fill(0);
  bottledThisYear.forEach(function(b){
    var m=new Date(APP.bottling[b.id].date).getMonth();
    months[m]+=totalBottles(APP.bottling[b.id]);
  });
  var maxMonth=Math.max(1,Math.max.apply(null,months));
  // Build month sparkline
  var monthBars=months.map(function(c,i){
    var h=Math.max(2,(c/maxMonth)*60);
    var label=['J','F','M','A','M','J','J','A','S','O','N','D'][i];
    return'<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px"><div style="width:100%;height:'+h+'px;background:linear-gradient(0deg,var(--gold),var(--gold2));border-radius:2px 2px 0 0;min-height:2px" title="'+c+' bottles"></div><div style="font-family:var(--font-mono);font-size:9px;color:'+(c>0?'var(--text2)':'var(--text3)')+'">'+label+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);height:10px">'+(c||'')+'</div></div>';
  }).join('');

  var canPrev=year>minYear;
  var canNext=year<currentYear;
  var yearNav='<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" '+(canPrev?'data-action="navYearReview" data-args=\'[-1]\'':'disabled style="opacity:0.3;cursor:not-allowed"')+' title="Previous year">← '+(year-1)+'</button>'
    +(year!==currentYear?'<button class="btn btn-secondary btn-sm" data-action="navYearReviewToCurrent" title="Jump to current year">↺ '+currentYear+'</button>':'')
    +'<button class="btn btn-secondary btn-sm" '+(canNext?'data-action="navYearReview" data-args=\'[1]\'':'disabled style="opacity:0.3;cursor:not-allowed"')+' title="Next year">'+(year+1)+' →</button>'
    +'</div>';
  return'<div class="page-title">Year in Review</div><div class="page-subtitle">Your meadwright\'s record for '+year+(year===currentYear?'':' · historical view')+'</div>'
    +yearNav
    +'<div class="yr-hero">'
    +'<h2>'+year+'</h2>'
    +'<div class="subtitle">"'+(bottlesProduced>0?'A year of '+bottlesProduced+' bottles, '+thisYearBatches.length+' batches, and patience rewarded.':'Just getting started — the meadwright\'s journey begins.')+'"</div>'
    +'</div>'
    +(thisYearBatches.length||bottledThisYear.length?'<div class="grid-4" style="margin-bottom:20px">'
      +'<div class="yr-stat"><div class="yr-stat-val">'+thisYearBatches.length+'</div><div class="yr-stat-lbl">Batches Started</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+bottledThisYear.length+'</div><div class="yr-stat-lbl">Batches Bottled</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+bottlesProduced+'</div><div class="yr-stat-lbl">Bottles Produced</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+distinctRecipes.length+'</div><div class="yr-stat-lbl">Recipes Tried</div></div>'
      +'</div>':'')
    +(abvs.length?'<div class="grid-4" style="margin-bottom:20px">'
      +'<div class="yr-stat"><div class="yr-stat-val">'+avgAbv+'%</div><div class="yr-stat-lbl">Avg ABV</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+maxAbv+'%</div><div class="yr-stat-lbl">Strongest</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+avgAtt+'%</div><div class="yr-stat-lbl">Avg Attenuation</div></div>'
      +'<div class="yr-stat"><div class="yr-stat-val">'+(totalCost>0?ccy+totalCost.toFixed(0):'—')+'</div><div class="yr-stat-lbl">Total Invested</div></div>'
      +'</div>':'')
    +(bottlesProduced>0?'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📅 BOTTLES PRODUCED · BY MONTH</div></div>'
      +'<div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:8px 0">'+monthBars+'</div>'
      +'</div>':'')
    +(bestTasting?'<div class="card" style="margin-bottom:16px;border-color:var(--gold)"><div class="card-header"><div class="card-title">⭐ HIGHEST-RATED TASTING</div></div>'
      +'<div style="padding:8px 0"><div style="font-family:var(--font-display);font-size:18px;color:'+getBatchColor(bestTasting.batch)+'">'+escHtml(bestTasting.batch.name)+'</div>'
      +'<div style="font-size:13px;color:var(--text3);margin:4px 0">'+fmtDate(bestTasting.tasting.date)+' · '+'★'.repeat(bestTasting.tasting.rating)+'☆'.repeat(5-bestTasting.tasting.rating)+'</div>'
      +(bestTasting.tasting.flavor?'<div style="font-style:italic;color:var(--text2);margin-top:8px">"'+escHtml(bestTasting.tasting.flavor)+'"</div>':'')
      +'<button class="btn btn-secondary btn-sm" style="margin-top:10px" data-action="showView" data-args=\''+JSON.stringify(['batch',bestTasting.batch.id])+'\'>View Batch →</button>'
      +'</div></div>':'')
    +(perBottleAvg!=='—'?'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 ECONOMICS</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+ccy+totalCost.toFixed(0)+'</div><div class="yr-stat-lbl">Total Spent</div></div>'
      +'<div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+ccy+perBottleAvg+'</div><div class="yr-stat-lbl">Per Bottle</div></div>'
      +'<div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+(thisYearBatches.length>0?ccy+(totalCost/thisYearBatches.length).toFixed(0):'—')+'</div><div class="yr-stat-lbl">Per Batch</div></div></div>'
      +'</div>':'')
    +renderPersonalRecords()
    +'<div style="text-align:center;margin-top:24px"><button class="btn btn-secondary" data-action="printYearReview" data-args=\''+JSON.stringify([year])+'\'>🖨 Print Year in Review</button></div>';
}

function navYearReview(delta){
  window._yrYear=(window._yrYear||new Date().getFullYear())+delta;
  renderMain();
}
function navYearReviewToCurrent(){
  window._yrYear=new Date().getFullYear();
  renderMain();
}

function printYearReview(year){
  year=year||new Date().getFullYear();
  var yearStart=new Date(year,0,1).getTime();
  var yearEnd=new Date(year+1,0,1).getTime();
  var pyBatches=typeof visibleBatches==='function'?visibleBatches():APP.batches;
  var thisYearBatches=pyBatches.filter(function(b){var t=new Date(b.startDate).getTime();return t>=yearStart&&t<yearEnd;});
  var bottledThisYear=pyBatches.filter(function(b){var bot=APP.bottling[b.id];if(!bot)return false;var t=new Date(bot.date).getTime();return t>=yearStart&&t<yearEnd;});
  var bottlesProduced=bottledThisYear.reduce(function(s,b){return s+bottlesOriginal(APP.bottling[b.id]);},0);
  var volProduced=bottledThisYear.reduce(function(s,b){return s+totalVolumeMLOriginal(APP.bottling[b.id]);},0)/1000;
  var abvs=bottledThisYear.map(function(b){return APP.bottling[b.id].abv;}).filter(function(x){return x;});
  var avgAbv=abvs.length?(abvs.reduce(function(s,v){return s+v;},0)/abvs.length).toFixed(1):'—';
  var maxAbv=abvs.length?Math.max.apply(null,abvs).toFixed(1):'—';
  var totalCost=thisYearBatches.reduce(function(s,b){return s+(b.cost?(b.cost.honey||0)+(b.cost.extras||0):0);},0);
  var perLitreAvg=volProduced>0?(totalCost/volProduced).toFixed(2):'—';
  var ccy=APP.settings.currency||'€';
  var allTastings=[];
  Object.keys(APP.tastings||{}).forEach(function(bid){
    (APP.tastings[bid]||[]).forEach(function(t){
      if(t.date&&new Date(t.date).getTime()>=yearStart&&new Date(t.date).getTime()<yearEnd&&t.rating>0){
        var b=pyBatches.find(function(x){return x.id===bid;});
        if(b)allTastings.push({batch:b,tasting:t});
      }
    });
  });
  allTastings.sort(function(a,b){return b.tasting.rating-a.tasting.rating;});
  var bestTasting=allTastings[0];
  var months=new Array(12).fill(0);
  bottledThisYear.forEach(function(b){var m=new Date(APP.bottling[b.id].date).getMonth();months[m]+=bottlesOriginal(APP.bottling[b.id]);});
  var maxMonth=Math.max(1,Math.max.apply(null,months));
  var monthBars=months.map(function(c,i){
    var h=Math.max(2,(c/maxMonth)*60);
    var label=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
    return'<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:3px"><div style="width:80%;height:'+h+'px;background:linear-gradient(0deg,var(--gold),#e8c46a);border-radius:2px 2px 0 0;min-height:2px"></div><div style="font-size:9px;color:#555">'+label+'</div><div style="font-size:10px;color:#888">'+(c||'')+'</div></div>';
  }).join('');
  var distinctRecipes=Array.from(new Set(thisYearBatches.map(function(b){return b.recipeId;})));
  var w=window.open('','_blank','width=900,height=1200');
  if(!w){toast('⚠ Pop-up blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+year+' Year in Review · MeadOS</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:A4;margin:5mm}'
    +'*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}'
    +'html,body{margin:0;padding:0;font-family:"EB Garamond",Georgia,serif;color:#1a1a1f;background:#fff;line-height:1.4;width:100%;overflow-x:hidden}'
    +'.page{width:100%;margin:0;padding:14mm 12mm 12mm}'
    +'.toolbar{padding:14px;background:#222;color:#fff;text-align:center;display:flex;gap:10px;justify-content:center;position:sticky;top:0;z-index:10}'
    +'.toolbar button{padding:10px 20px;font-size:14px;cursor:pointer;border:0;border-radius:4px;background:var(--gold);color:#0a0a0b;font-weight:600}'
    +'.hero{background:linear-gradient(135deg,#faf6ea,#f0e8d0);border:2px solid var(--gold);border-radius:8px;padding:20px;text-align:center;margin-bottom:14px}'
    +'.hero h1{font-family:Cinzel,Georgia,serif;font-size:30px;color:#7a5818;margin:0 0 6px;letter-spacing:5px}'
    +'.hero .subtitle{font-style:italic;color:#666;font-size:12px}'
    +'.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}'
    +'.stat{background:#faf8f3;border:1px solid #eaddd0;border-radius:4px;padding:10px 4px;text-align:center;min-width:0}'
    +'.stat-val{font-family:Cinzel,Georgia,serif;font-size:18px;color:#7a5818;line-height:1;overflow-wrap:break-word}'
    +'.stat-lbl{font-size:8px;letter-spacing:1.2px;color:#888;margin-top:4px;text-transform:uppercase}'
    +'.section{margin:12px 0;padding:12px;background:#faf8f3;border:1px solid #eaddd0;border-radius:4px}'
    +'.section h2{font-family:Cinzel,serif;font-size:12px;letter-spacing:2.5px;color:#7a5818;margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid #ddd}'
    +'.footer{margin-top:14px;padding-top:8px;border-top:1px solid #ddd;font-size:10px;color:#888;text-align:center;font-style:italic}'
    +'@media print{.toolbar{display:none!important}body{background:#fff}}'
    +'</style></head><body>'
    +'<div class="toolbar"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()" style="background:#666">Close</button></div>'
    +'<div class="page">'
    +'<div class="hero"><h1>'+year+'</h1><div class="subtitle">"'+escHtml(APP.settings.brewerName||'MeadOS')+' · '+(bottlesProduced>0?bottlesProduced+' bottles produced this year':'The Meadwright\'s Journey')+'"</div></div>'
    +'<div class="grid"><div class="stat"><div class="stat-val">'+thisYearBatches.length+'</div><div class="stat-lbl">Batches Started</div></div>'
    +'<div class="stat"><div class="stat-val">'+bottledThisYear.length+'</div><div class="stat-lbl">Batches Bottled</div></div>'
    +'<div class="stat"><div class="stat-val">'+bottlesProduced+'</div><div class="stat-lbl">Bottles Produced</div></div>'
    +'<div class="stat"><div class="stat-val">'+distinctRecipes.length+'</div><div class="stat-lbl">Recipes Tried</div></div></div>'
    +(abvs.length?'<div class="grid"><div class="stat"><div class="stat-val">'+avgAbv+'%</div><div class="stat-lbl">Avg ABV</div></div>'
      +'<div class="stat"><div class="stat-val">'+maxAbv+'%</div><div class="stat-lbl">Strongest</div></div>'
      +'<div class="stat"><div class="stat-val">'+volProduced.toFixed(1)+'L</div><div class="stat-lbl">Total Volume</div></div>'
      +'<div class="stat"><div class="stat-val">'+(totalCost>0?ccy+totalCost.toFixed(0):'—')+'</div><div class="stat-lbl">Invested</div></div></div>':'')
    +(bottlesProduced>0?'<div class="section"><h2>BOTTLES PRODUCED · MONTHLY</h2><div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:8px 0">'+monthBars+'</div></div>':'')
    +(bestTasting?'<div class="section" style="border-color:var(--gold)"><h2>⭐ HIGHEST-RATED TASTING</h2>'
      +'<div style="font-family:Cinzel,serif;font-size:18px;color:#7a5818">'+escHtml(bestTasting.batch.name)+'</div>'
      +'<div style="font-size:11px;color:#888;margin:4px 0">'+fmtDate(bestTasting.tasting.date)+' · '+'★'.repeat(bestTasting.tasting.rating)+'☆'.repeat(5-bestTasting.tasting.rating)+'</div>'
      +(bestTasting.tasting.flavor?'<div style="font-style:italic;color:#555;margin-top:6px">"'+escHtml(bestTasting.tasting.flavor)+'"</div>':'')
      +'</div>':'')
    +(totalCost>0?'<div class="section"><h2>💰 ECONOMICS</h2><div class="grid"><div class="stat"><div class="stat-val">'+ccy+totalCost.toFixed(0)+'</div><div class="stat-lbl">Total Spent</div></div>'
      +'<div class="stat"><div class="stat-val">'+(volProduced>0?ccy+perLitreAvg:'—')+'</div><div class="stat-lbl">Per Litre Avg</div></div>'
      +'<div class="stat"><div class="stat-val">'+(thisYearBatches.length>0?ccy+(totalCost/thisYearBatches.length).toFixed(0):'—')+'</div><div class="stat-lbl">Per Batch Avg</div></div></div></div>':'')
    +'<div class="footer">Crafted with patience · MeadOS · '+new Date().toLocaleDateString(_dloc(),{day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'</div></body></html>');
  w.document.close();
}
