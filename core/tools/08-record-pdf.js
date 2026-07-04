// ==========================================================================
// Permanent record (batch journal PDF).
// Split out of the former 08-tools.js. Globals, no behaviour change.
// ==========================================================================

// ==================== PERMANENT RECORD (Batch Journal PDF) ====================
// Comprehensive end-of-batch journal: every gravity log, every addition, every
// tasting, full cost breakdown, label preview, signed by brewer name. Print-
// ready single document — the brewing equivalent of a chain-of-custody form
// or a winemaker's logbook page. Archive-quality output.
function openPermanentRecord(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id]||{};
  var logs=(APP.logs[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var additions=(APP.additions[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var tastings=(APP.tastings[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var isCider=(b.beverageType||'mead')==='cider';
  var brandName=APP.settings.brewerName||'MeadOS';
  var ccy=APP.settings.currency||'€';
  var fg=bot.fg||(logs.length?logs[logs.length-1].gravity:null);
  var abv=bot.abv||(b.og&&fg?calcABV(b.og,fg):null);
  var daysToBottle=b.startDate&&bot.date?Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000):null;
  var costH=(b.cost&&b.cost.honey)||0;
  var costE=(b.cost&&b.cost.extras)||0;
  var totalCost=costH+costE;
  var totalBottles=typeof bottlesOriginal==='function'?bottlesOriginal(bot):(bot.bottleCount||0);
  var costPerBottle=totalCost>0&&totalBottles>0?(totalCost/totalBottles):0;

  function row(label,value){
    return'<tr><td style="padding:6px 12px 6px 0;font-family:Inter,sans-serif;font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;width:140px;vertical-align:top">'+xmlEscape(label)+'</td><td style="padding:6px 12px;font-family:Cinzel,serif;font-size:13px;color:#1a0f08">'+(value||'—')+'</td></tr>';
  }

  // Profile (drinking window) for sign-off section
  var profile=typeof getAgingProfile==='function'?getAgingProfile(b):null;
  function fmtShort(d){if(!d)return'—';return d.toLocaleDateString(_dloc(),{day:'2-digit',month:'short',year:'numeric'});}
  var readyDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.minDays*86400000):null;
  var peakDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.peakDays*86400000):null;
  var drinkByDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.maxDays*86400000):null;

  // Bottle breakdown
  var counts=bot.countsAtBottling||(bot.locations?bot.locations.cellar:{});
  var contentsParts=[];
  if(counts&&typeof counts==='object'){
    Object.keys(counts).map(Number).sort(function(a,b){return b-a;}).forEach(function(sz){
      if(counts[sz]>0)contentsParts.push(counts[sz]+'×'+sz+'ml');
    });
  }
  var contentsStr=contentsParts.join(' + ')||'—';

  // Logs table
  var logRows=logs.length?logs.map(function(l){
    var abvAtLog=l.gravity&&b.og?calcABV(b.og,l.gravity):'';
    return'<tr><td style="padding:5px 10px 5px 0;font-family:monospace;font-size:11px;color:#666">'+fmtDate(l.date)+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:12px;color:#1a0f08">'+(l.gravity||'—')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+(abvAtLog?abvAtLog+'%':'—')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+(l.temp!=null?l.temp+'°C':'—')+'</td>'
      +(l.ph!=null?'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+l.ph.toFixed(2)+'</td>':'<td></td>')
      +'<td style="padding:5px 10px;font-style:italic;font-size:11px;color:#666;max-width:280px">'+xmlEscape(l.note||'')+'</td></tr>';
  }).join(''):'<tr><td colspan="6" style="padding:14px;text-align:center;font-style:italic;color:#999">No gravity readings logged</td></tr>';

  // Additions table
  var addRows=additions.length?additions.map(function(a){
    return'<tr><td style="padding:5px 10px 5px 0;font-family:monospace;font-size:11px;color:#666">'+fmtDate(a.date)+'</td>'
      +'<td style="padding:5px 10px;font-family:Cinzel,serif;font-size:12px;color:#1a0f08">'+xmlEscape(a.item||'')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#1a0f08">'+xmlEscape(a.amount||'')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:10px;color:#666;text-transform:uppercase">'+xmlEscape(a.type||'')+'</td>'
      +'<td style="padding:5px 10px;font-style:italic;font-size:11px;color:#666;max-width:280px">'+xmlEscape(a.notes||'')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" style="padding:14px;text-align:center;font-style:italic;color:#999">No additions recorded</td></tr>';

  // Tastings — one paragraph per tasting
  var tastingBlocks=tastings.length?tastings.map(function(t){
    var stars=t.rating?'★'.repeat(t.rating)+'☆'.repeat(5-t.rating):'';
    var fields=[];
    if(t.color)fields.push({k:'Color',v:t.color});
    if(t.aroma)fields.push({k:'Aroma',v:t.aroma});
    if(t.flavor)fields.push({k:'Flavor',v:t.flavor});
    if(t.finish)fields.push({k:'Finish',v:t.finish});
    if(t.note||t.notes)fields.push({k:'Notes',v:t.note||t.notes});
    return'<div style="margin-bottom:14px;padding:10px 14px;border-left:3px solid var(--gold);background:#faf3e0">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
        +'<div style="font-family:Cinzel,serif;font-size:13px;font-weight:600;color:#1a0f08">'+fmtDate(t.date)+'</div>'
        +'<div style="color:var(--gold);font-size:14px">'+stars+'</div>'
      +'</div>'
      +fields.map(function(f){return'<div style="font-size:11.5px;line-height:1.6;color:#1a0f08;margin-bottom:2px"><strong style="color:#5a3a20;font-family:Inter,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase">'+f.k+'</strong> '+xmlEscape(f.v)+'</div>';}).join('')
      +'</div>';
  }).join(''):'<div style="padding:14px;text-align:center;font-style:italic;color:#999">No tastings recorded yet</div>';

  // Label preview for the record (small, decorative)
  var labelMini='';
  try{
    if(recipe&&typeof renderLabelWithABV==='function'){
      labelMini=renderBatchLabel(recipe.id,abv||'',{batch:b,maxWidth:'180px'});
    }
  }catch(e){}

  var w=window.open('','_blank','width=900,height=900');
  if(!w){toast('⚠ Popup blocked — allow popups to print');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Complete Record · '+xmlEscape(b.name)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:24px;font-family:Inter,sans-serif;background:#faf3e0;color:#1a0f08;max-width:820px;margin:0 auto;line-height:1.55}'
    +'h1{font-family:Cinzel,serif;font-size:30px;margin:0 0 4px;color:'+((recipe&&recipe.brandColor)||'#c9a84c')+'}'
    +'h2{font-family:Cinzel,serif;font-size:14px;margin:24px 0 10px;color:#5a3a20;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--gold);padding-bottom:4px}'
    +'.brand{font-family:Cinzel,serif;font-size:12px;color:#8a6a30;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px}'
    +'.serial{display:inline-block;font-family:monospace;font-size:11px;color:#666;background:#f3e8c5;padding:2px 8px;border-radius:4px;margin-left:10px;vertical-align:middle}'
    +'.meta{font-size:13px;color:#666;margin-bottom:18px;font-style:italic}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:14px}'
    +'.kv-table tr td{border:none}'
    +'.data-table tr{border-bottom:1px solid #e8d8a8}'
    +'.data-table th{text-align:left;padding:6px 10px 6px 0;font-family:Inter,sans-serif;font-size:10px;letter-spacing:1.5px;color:#5a3a20;text-transform:uppercase;border-bottom:2px solid var(--gold)}'
    +'.flex-row{display:flex;gap:24px;align-items:flex-start}'
    +'.flex-row > div{flex:1}'
    +'.signoff{margin-top:36px;padding-top:18px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;align-items:flex-end;font-size:12px}'
    +'.signoff-line{border-bottom:1px solid #1a0f08;width:240px;margin-bottom:4px;height:30px}'
    +'.btns{margin-bottom:14px}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'@page{size:A4 portrait;margin:14mm}'
    +'@media print{.no-print{display:none}body{background:#fff;padding:0}h2{page-break-after:avoid}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +'<div class="brand">'+xmlEscape(brandName)+'</div>'
    +'<h1>'+xmlEscape(b.name)+(b.serial?'<span class="serial">#'+xmlEscape(b.serial)+'</span>':'')+'</h1>'
    +'<div class="meta">Complete brewing record · Started '+fmtShort(new Date(b.startDate))+(bot.date?' · Bottled '+fmtShort(new Date(bot.date)):'')+(daysToBottle?' ('+daysToBottle+' days)':'')+'</div>'

    +'<h2>Summary</h2>'
    +'<div class="flex-row">'
      +'<div><table class="kv-table">'
        +row('Recipe',recipe?recipe.name:'Custom')
        +row('Style',(recipe&&recipe.style)||b.style||'—')
        +row(isCider?'Juice':'Honey',(b.honeyType||'—')+(b.honey?' · '+b.honey+(isCider?' L':' kg'):''))
        +row('Yeast',(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS[b.yeast]&&YEAST_STRAINS[b.yeast].name)||b.yeast||'—')
        +row('Volume',(b.volume||'—')+' L')
        +row('OG',b.og||'—')
        +row('FG',fg||'—')
        +row('ABV',abv?abv+'%':'—')
        +row('Days to bottle',daysToBottle?daysToBottle+' days':'—')
      +'</table></div>'
      +(labelMini?'<div style="flex:0 0 200px">'+labelMini+'</div>':'')
    +'</div>'

    +(totalCost>0?'<h2>Cost</h2>'
      +'<table class="kv-table">'
        +(costH?row(isCider?'Juice':'Honey',ccy+costH.toFixed(2)+(b.honey?' ('+ccy+(costH/b.honey).toFixed(2)+(isCider?'/L)':'/kg)'):'')):'')
        +(costE?row('Extras',ccy+costE.toFixed(2)):'')
        +row('Total',ccy+totalCost.toFixed(2))
        +(costPerBottle?row('Per bottle',ccy+costPerBottle.toFixed(2)+' (of '+totalBottles+')'):'')
      +'</table>':'')

    +'<h2>Gravity log · '+logs.length+' reading'+(logs.length===1?'':'s')+'</h2>'
    +'<table class="data-table"><thead><tr><th style="width:90px">Date</th><th style="width:60px">SG</th><th style="width:50px">ABV</th><th style="width:50px">Temp</th>'+(logs.some(function(l){return l.ph!=null;})?'<th style="width:40px">pH</th>':'<th></th>')+'<th>Notes</th></tr></thead><tbody>'+logRows+'</tbody></table>'

    +'<h2>Additions · '+additions.length+' record'+(additions.length===1?'':'s')+'</h2>'
    +'<table class="data-table"><thead><tr><th style="width:90px">Date</th><th>Item</th><th style="width:80px">Amount</th><th style="width:80px">Type</th><th>Notes</th></tr></thead><tbody>'+addRows+'</tbody></table>'

    +'<h2>Tasting journal · '+tastings.length+' tasting'+(tastings.length===1?'':'s')+'</h2>'
    +tastingBlocks

    +(bot.date?'<h2>Bottling</h2>'
      +'<table class="kv-table">'
        +row('Bottled',fmtShort(new Date(bot.date)))
        +row('Contents',contentsStr)
        // Forward-looking drinking-window estimates are intentionally omitted
        // from the permanent record — it's a factual historical document.
        +(bot.cellarSublocation?row('Stored at',bot.cellarSublocation):'')
        +(bot.sweetness?row('Sweetness',bot.sweetness):'')
        +(bot.notes?row('Notes',bot.notes):'')
      +'</table>':'')

    +'<div class="signoff">'
      +'<div><div class="signoff-line"></div><div style="color:#5a3a20;text-transform:uppercase;letter-spacing:1.5px;font-size:10px">Brewer · '+xmlEscape(brandName)+'</div></div>'
      +'<div style="text-align:right"><div class="signoff-line"></div><div style="color:#5a3a20;text-transform:uppercase;letter-spacing:1.5px;font-size:10px">Date</div></div>'
    +'</div>'

    +'<div style="margin-top:32px;font-size:9.5px;color:#999;text-align:center;font-style:italic;letter-spacing:1px">Generated by '+((b.beverageType||'mead')==='cider'?'CiderOS':'MeadOS')+' · '+fmtShort(new Date())+' · Batch '+(b.serial||b.id.slice(-8))+'</div>'
    +'</body></html>');
  w.document.close();
}

// ==================== PRODUCTION & COST REPORT (whole operation) ============
// A print-ready portfolio report across ALL batches: lifetime totals, year-by-
// year production, cost & yield, the best-performing yeast/honey, and a full
// per-batch ledger. The companion to the per-batch permanent record — what a
// serious or semi-commercial maker hands to themselves at year end.
function openProductionReport(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var brandName=APP.settings.brewerName||'MeadOS';
  var ccy=APP.settings.currency||'€';
  var batches=(typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).slice().sort(function(a,b){return(b.startDate||'').localeCompare(a.startDate||'');});
  if(!batches.length){toast(nl?'⚠ Nog geen partijen':'⚠ No batches yet');return;}
  function rmap(){var m={};(APP.recipes||[]).forEach(function(r){m[r.id]=r;});return m;}
  var R=rmap();
  function batchCost(b){return((b.cost&&b.cost.honey)||0)+((b.cost&&b.cost.extras)||0);}
  function batchFG(b){var bot=APP.bottling[b.id]||{};if(bot.fg)return bot.fg;var lg=(APP.logs[b.id]||[]);return lg.length?lg[lg.length-1].gravity:null;}
  function batchABV(b){var bot=APP.bottling[b.id]||{};if(bot.abv)return parseFloat(bot.abv);var fg=batchFG(b);return(b.og&&fg)?parseFloat(calcABV(b.og,fg)):null;}
  function bestRating(b){var t=(APP.tastings[b.id]||[]).filter(function(x){return x.rating;});return t.length?Math.max.apply(null,t.map(function(x){return x.rating;})):null;}
  function bottlesOf(b){var bot=APP.bottling[b.id];return bot?(typeof bottlesOriginal==='function'?bottlesOriginal(bot):(bot.bottleCount||0)):0;}

  // Lifetime totals
  var volumeBrewed=batches.reduce(function(s,b){return s+(parseFloat(b.volume)||0);},0);
  var bottledBatches=batches.filter(function(b){return APP.bottling[b.id]&&APP.bottling[b.id].date;});
  var bottlesProduced=bottledBatches.reduce(function(s,b){return s+bottlesOf(b);},0);
  var failedN=batches.filter(function(b){return b.failed;}).length;
  var totalSpend=batches.reduce(function(s,b){return s+batchCost(b);},0);
  var ratedAll=batches.map(bestRating).filter(function(r){return r!=null;});
  var avgRatingAll=ratedAll.length?(ratedAll.reduce(function(s,r){return s+r;},0)/ratedAll.length):null;
  var costPerBottle=bottlesProduced>0?totalSpend/bottlesProduced:0;

  // By year (grouped on start date)
  var years={};
  batches.forEach(function(b){
    var y=(b.startDate||'').slice(0,4)||'—';
    var yr=years[y]||(years[y]={year:y,n:0,vol:0,bottles:0,spend:0,rsum:0,rn:0});
    yr.n++;yr.vol+=parseFloat(b.volume)||0;yr.bottles+=bottlesOf(b);yr.spend+=batchCost(b);
    var r=bestRating(b);if(r!=null){yr.rsum+=r;yr.rn++;}
  });
  var yearRows=Object.keys(years).sort().reverse().map(function(y){
    var d=years[y];
    return'<tr><td style="font-family:monospace">'+xmlEscape(y)+'</td>'
      +'<td style="text-align:center;font-family:monospace">'+d.n+'</td>'
      +'<td style="text-align:center;font-family:monospace">'+d.vol.toFixed(0)+' L</td>'
      +'<td style="text-align:center;font-family:monospace">'+d.bottles+'</td>'
      +'<td style="text-align:center;font-family:monospace">'+(d.rn?(d.rsum/d.rn).toFixed(1)+'★':'—')+'</td>'
      +'<td style="text-align:right;font-family:monospace">'+ccy+d.spend.toFixed(0)+'</td></tr>';
  }).join('');

  // Best performers (reuse the analytics aggregator)
  var perfHtml='';
  if(typeof mwIngredientStats==='function'){
    var st=mwIngredientStats();
    var yn={};((typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS)||[]).forEach(function(y){yn[y.id]=y.name;});
    var topY=st.byYeast.filter(function(x){return x.avgRating!=null;})[0];
    var topH=st.byHoney.filter(function(x){return x.avgRating!=null;})[0];
    if(topY||topH){
      perfHtml='<h2>'+(nl?'Beste presteerders':'Best performers')+'</h2><table class="kv-table">'
        +(topY?row(nl?'Beste gist':'Best yeast',(yn[topY.key]||topY.key)+' · '+topY.avgRating.toFixed(1)+'★ ('+topY.n+')'):'')
        +(topH?row(isCider?(nl?'Beste appel/sap':'Best juice blend'):(nl?'Beste honing':'Best honey'),topH.key+' · '+topH.avgRating.toFixed(1)+'★ ('+topH.n+')'):'')
        +'</table>';
    }
  }
  // local row() (the permanent-record one is scoped to that function)
  function row(label,value){return'<tr><td style="padding:6px 12px 6px 0;font-family:Inter,sans-serif;font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;width:160px">'+xmlEscape(label)+'</td><td style="padding:6px 12px;font-family:Cinzel,serif;font-size:13px;color:#1a0f08">'+(value||'—')+'</td></tr>';}

  // Per-batch ledger
  var ledger=batches.map(function(b){
    var st=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
    var abv=batchABV(b),r=bestRating(b),c=batchCost(b);
    return'<tr><td style="font-family:Cinzel,serif;font-size:11.5px">'+xmlEscape(b.name)+(b.serial?' <span style="color:#999;font-family:monospace;font-size:9px">#'+xmlEscape(b.serial)+'</span>':'')+'</td>'
      +'<td style="font-family:monospace;font-size:10px;color:#666">'+(b.startDate?fmtDate(b.startDate):'—')+'</td>'
      +'<td style="font-size:10.5px;color:#666">'+xmlEscape((R[b.recipeId]&&R[b.recipeId].style)||b.style||'—')+'</td>'
      +'<td style="text-align:center;font-family:monospace;font-size:10.5px">'+(b.og||'—')+'</td>'
      +'<td style="text-align:center;font-family:monospace;font-size:10.5px">'+(abv!=null?abv.toFixed(1)+'%':'—')+'</td>'
      +'<td style="text-align:center;font-family:monospace;font-size:10.5px">'+(b.volume||'—')+'L</td>'
      +'<td style="text-align:center;font-family:monospace;font-size:10.5px">'+(bottlesOf(b)||'—')+'</td>'
      +'<td style="text-align:right;font-family:monospace;font-size:10.5px">'+(c?ccy+c.toFixed(0):'—')+'</td>'
      +'<td style="text-align:center;font-family:monospace;font-size:10.5px">'+(r!=null?r+'★':'—')+'</td>'
      +'<td style="font-size:9.5px;color:#666;text-transform:uppercase;letter-spacing:0.5px">'+xmlEscape(b.failed?'failed':st)+'</td></tr>';
  }).join('');

  function statCard(val,label){return'<div style="flex:1;min-width:120px;border:1px solid #e8d8a8;border-radius:6px;padding:12px 14px;background:#fff"><div style="font-family:Cinzel,serif;font-size:22px;color:#5a3a20">'+val+'</div><div style="font-family:Inter,sans-serif;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-top:3px">'+label+'</div></div>';}
  var span=batches.length?(fmtDate(batches[batches.length-1].startDate)+' – '+fmtDate(batches[0].startDate)):'';

  var w=window.open('','_blank','width=960,height=900');
  if(!w){toast(nl?'⚠ Pop-up geblokkeerd':'⚠ Popup blocked — allow popups to print');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+(nl?'Productierapport':'Production Report')+' · '+xmlEscape(brandName)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0 auto;padding:24px;font-family:Inter,sans-serif;background:#faf3e0;color:#1a0f08;max-width:880px;line-height:1.5}'
    +'h1{font-family:Cinzel,serif;font-size:28px;margin:0 0 4px;color:#c9a84c}'
    +'h2{font-family:Cinzel,serif;font-size:13px;margin:22px 0 10px;color:#5a3a20;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #c9a84c;padding-bottom:4px}'
    +'.brand{font-family:Cinzel,serif;font-size:12px;color:#8a6a30;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px}'
    +'.meta{font-size:12px;color:#666;margin-bottom:18px;font-style:italic}'
    +'.cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:10px}'
    +'.kv-table tr td{border:none}'
    +'.data-table tr{border-bottom:1px solid #e8d8a8}'
    +'.data-table th{text-align:left;padding:6px 8px 6px 0;font-family:Inter,sans-serif;font-size:9.5px;letter-spacing:1px;color:#5a3a20;text-transform:uppercase;border-bottom:2px solid #c9a84c}'
    +'.data-table td{padding:5px 8px 5px 0}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px 14px 0;border-radius:4px;border:1px solid #999;background:#fff}'
    +'@page{size:A4 portrait;margin:12mm}@media print{.no-print{display:none}body{background:#fff;padding:0}h2{page-break-after:avoid}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 '+(nl?'Afdrukken':'Print')+'</button><button onclick="window.close()">'+(nl?'Sluiten':'Close')+'</button></div>'
    +'<div class="brand">'+xmlEscape(brandName)+'</div>'
    +'<h1>'+(nl?'Productie- &amp; kostenrapport':'Production &amp; Cost Report')+'</h1>'
    +'<div class="meta">'+(nl?'Hele werking':'Whole operation')+(span?' · '+span:'')+'</div>'
    +'<div class="cards">'
      +statCard(batches.length,nl?'Partijen':'Batches')
      +statCard(volumeBrewed.toFixed(0)+' L',nl?'Gebrouwen':'Brewed')
      +statCard(bottlesProduced,nl?'Flessen':'Bottles')
      +statCard(bottledBatches.length,nl?'Gebotteld':'Bottled')
      +statCard(failedN,nl?'Mislukt':'Failed')
      +(avgRatingAll!=null?statCard(avgRatingAll.toFixed(1)+'★',nl?'Gem. score':'Avg rating'):'')
    +'</div>'
    +'<h2>'+(nl?'Kosten &amp; opbrengst':'Cost &amp; yield')+'</h2><table class="kv-table">'
      +row(nl?'Totale uitgaven':'Total spend',ccy+totalSpend.toFixed(2))
      +row(nl?'Gem. kost per partij':'Avg cost / batch',ccy+(batches.length?(totalSpend/batches.length):0).toFixed(2))
      +(costPerBottle?row(nl?'Kost per fles':'Cost / bottle',ccy+costPerBottle.toFixed(2)):'')
    +'</table>'
    +perfHtml
    +'<h2>'+(nl?'Productie per jaar':'Production by year')+'</h2>'
    +'<table class="data-table"><thead><tr><th>'+(nl?'Jaar':'Year')+'</th><th style="text-align:center">'+(nl?'Partijen':'Batches')+'</th><th style="text-align:center">'+(nl?'Volume':'Volume')+'</th><th style="text-align:center">'+(nl?'Flessen':'Bottles')+'</th><th style="text-align:center">'+(nl?'Gem.★':'Avg★')+'</th><th style="text-align:right">'+(nl?'Uitgaven':'Spend')+'</th></tr></thead><tbody>'+yearRows+'</tbody></table>'
    +'<h2>'+(nl?'Partijregister':'Batch ledger')+' · '+batches.length+'</h2>'
    +'<table class="data-table"><thead><tr><th>'+(nl?'Partij':'Batch')+'</th><th>'+(nl?'Gestart':'Started')+'</th><th>'+(nl?'Stijl':'Style')+'</th><th style="text-align:center">OG</th><th style="text-align:center">ABV</th><th style="text-align:center">'+(nl?'Vol':'Vol')+'</th><th style="text-align:center">'+(nl?'Flessen':'Btls')+'</th><th style="text-align:right">'+(nl?'Kost':'Cost')+'</th><th style="text-align:center">★</th><th>'+(nl?'Status':'Status')+'</th></tr></thead><tbody>'+ledger+'</tbody></table>'
    +'<div style="margin-top:28px;font-size:9.5px;color:#999;text-align:center;font-style:italic;letter-spacing:1px">'+(nl?'Gegenereerd door':'Generated by')+' '+((typeof activeBevMode==='function'&&activeBevMode()==='cider')?'CiderOS':'MeadOS')+' · '+fmtDate(today())+'</div>'
    +'</body></html>');
  w.document.close();
}
// BeerXML 1.0 is the cross-app standard for recipe interchange. Supported by
// BeerSmith, Brewfather, Grainfather, etc. We map the meadows recipe model
// to BeerXML's RECIPE element, focusing on the parts that survive translation:
// name, style, target OG/FG, ingredients (with honey treated as fermentable),
// yeast strain, fermentation/aging steps as notes.

function xmlEscape(s){
  if(s==null)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
