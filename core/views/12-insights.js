// ==========================================================================
// Insights view.
// Split out of the former 12-features2.js. Globals, no behaviour change.
// ==========================================================================

// ==================== INSIGHTS VIEW ====================
// Combines best-tasting batch insights (what your highest-rated batches share)
// with a personal-trend dashboard (year-over-year attenuation, ratings, cost,
// time-to-bottle). Both require enough data to be meaningful — show helpful
// empty-states when there aren't enough batches yet.

function _insightsTitleBar(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
    +'<div class="page-title" style="margin-bottom:0">Insights</div>'
    +((APP.batches||[]).length?'<button class="btn btn-secondary btn-sm" onclick="openProductionReport()" title="Print a production &amp; cost report across all batches">'+(nl?'📊 Productierapport':'📊 Production Report')+'</button>':'')
    +'</div>';
}
function renderInsightsView(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  var failed=APP.batches.filter(function(b){return b.failed;});
  if(bottled.length<3&&!failed.length){
    // Pattern-mining needs more data, but the fun lifetime stats are worth
    // showing from batch one.
    return _insightsTitleBar()+'<div class="page-subtitle">Patterns in your brewing</div>'
      +renderFunInsights()
      +'<div class="info-box" style="margin-top:8px"><div style="font-size:13px;color:var(--text2)">📊 Deeper pattern-mining (what your best batches share, trends over time) unlocks at <strong>3 bottled batches</strong> — you\'re at '+bottled.length+'. Keep brewing!</div></div>';
  }
  return _insightsTitleBar()+'<div class="page-subtitle">Patterns in your brewing journey · '+bottled.length+' bottled · '+failed.length+' failed</div>'
    +renderFunInsights()
    +renderBestTastingInsights()
    +renderIngredientPerformance()
    +renderFailedBatchInsights()
    +renderPersonalTrends();
}

// Cross-batch ingredient performance: how each yeast / honey does on average
// across all your batches (count, avg tasting rating, avg ABV, avg attenuation,
// failure rate), sorted best-rating-first. Answers "what works best for me".
function renderIngredientPerformance(){
  if(typeof mwIngredientStats!=='function')return '';
  if((APP.batches||[]).length<2)return '';
  var st=mwIngredientStats();
  if(!st.byYeast.length&&!st.byHoney.length)return '';
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var ynames={};((typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS)||[]).forEach(function(y){ynames[y.id]=y.name;});
  var H={col:'',batches:nl?'Partijen':'Batches',rating:nl?'Gem. ★':'Avg ★',abv:nl?'Gem. ABV':'Avg ABV',atten:nl?'Gem. vergisting':'Avg atten.',fail:nl?'Mislukt':'Fail',top:nl?'TOP':'TOP'};
  function tbl(rows,colLabel,labelFn){
    if(!rows.length)return '';
    var body=rows.map(function(r,i){
      var best=(i===0&&r.avgRating!=null&&rows.length>1);
      return '<tr'+(best?' style="background:rgba(122,160,64,0.08)"':'')+'>'
        +'<td style="color:var(--text)'+(best?';font-weight:600':'')+'">'+escHtml(labelFn(r.key))+(best?' <span style="font-family:var(--font-mono);font-size:9px;color:var(--green2);letter-spacing:1px">★ '+H.top+'</span>':'')+'</td>'
        +'<td style="font-family:var(--font-mono);text-align:center">'+r.n+'</td>'
        +'<td style="font-family:var(--font-mono);text-align:center">'+(r.avgRating!=null?r.avgRating.toFixed(1)+'★':'—')+'</td>'
        +'<td style="font-family:var(--font-mono);text-align:center">'+(r.avgABV!=null?r.avgABV.toFixed(1)+'%':'—')+'</td>'
        +'<td style="font-family:var(--font-mono);text-align:center">'+(r.avgAtten!=null?Math.round(r.avgAtten)+'%':'—')+'</td>'
        +'<td style="font-family:var(--font-mono);text-align:center;color:'+(r.failRate>0?'var(--red2)':'var(--text3)')+'">'+(r.failRate>0?Math.round(r.failRate*100)+'%':'—')+'</td>'
        +'</tr>';
    }).join('');
    return '<table class="data-table" style="font-size:12.5px;margin-bottom:8px"><thead><tr>'
      +'<th style="text-align:left">'+colLabel+'</th><th style="text-align:center">'+H.batches+'</th><th style="text-align:center">'+H.rating+'</th><th style="text-align:center">'+H.abv+'</th><th style="text-align:center">'+H.atten+'</th><th style="text-align:center">'+H.fail+'</th>'
      +'</tr></thead><tbody>'+body+'</tbody></table>';
  }
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🧪 PRESTATIE PER INGREDIËNT':'🧪 INGREDIENT PERFORMANCE')+'</div></div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:12px;font-style:italic">'+(nl?'Hoe je gisten en honingen het gemiddeld doen over al je partijen — gesorteerd op gemiddelde proefscore.':'How your yeasts and honeys perform on average across all your batches — sorted by average tasting score.')+'</div>'
    +(st.byYeast.length?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:6px">'+(nl?'PER GIST':'BY YEAST')+'</div>'+tbl(st.byYeast,nl?'Gist':'Yeast',function(k){return ynames[k]||k;}):'')
    +(st.byHoney.length?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:10px 0 6px">'+(nl?'PER HONING':'BY HONEY')+'</div>'+tbl(st.byHoney,nl?'Honing':'Honey',function(k){return k;}):'')
    +'</div>';
}

// Fun + meaningful lifetime insights mined from the whole brewing history.
function renderFunInsights(){
  var batches=APP.batches||[];
  if(!batches.length)return'';
  var L=(typeof lifetimeStats==='function')?lifetimeStats():null;
  function mode(arr){var c={},best=null,bn=0;arr.forEach(function(v){if(!v)return;c[v]=(c[v]||0)+1;if(c[v]>bn){bn=c[v];best=v;}});return best?{val:best,n:bn}:null;}
  // ---- aggregates ----
  var totalVolume=batches.reduce(function(s,b){return s+(parseFloat(b.volume)||0);},0);
  var totalHoney=batches.reduce(function(s,b){return s+(parseFloat(b.honey)||0);},0);
  var favHoney=mode(batches.map(function(b){return b.honeyType;}));
  var favYeast=mode(batches.map(function(b){var y=getYeastById(b.yeast);return y?y.name.split('—')[0].trim():b.yeast;}));
  var styles={};batches.forEach(function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});var c=(r&&(r.category||r.style))||b.style;if(c)styles[c]=1;});
  var distinctStyles=Object.keys(styles).length;
  // ABV extremes + days-to-bottle from bottled batches
  var abvs=[],ttb=[];
  batches.forEach(function(b){
    var bot=APP.bottling[b.id];if(!bot)return;
    var abv=parseFloat(bot.abv)||(b.og&&bot.fg?parseFloat(calcABV(b.og,bot.fg)):0);
    if(abv>0)abvs.push({abv:abv,name:b.name});
    if(bot.date&&b.startDate){var d=Math.round((new Date(bot.date)-new Date(b.startDate))/86400000);if(d>0&&d<2000)ttb.push(d);}
  });
  abvs.sort(function(a,b){return b.abv-a.abv;});
  var avgTTB=ttb.length?Math.round(ttb.reduce(function(s,x){return s+x;},0)/ttb.length):null;
  // bottles ever + "glasses" (≈5 per 750, ≈3.3 per 500)
  var bottledEver=L?L.bottledEver:0;
  var glasses=Math.round(bottledEver*4.5);
  // bee fun fact: ~1 kg honey ≈ 195,000 km of bee flight; Earth ≈ 40,075 km
  var beeKm=Math.round(totalHoney*195000);
  var earths=totalHoney?(beeKm/40075):0;
  // success rate
  var failedN=batches.filter(function(b){return b.failed;}).length;
  var finishedOrBottled=batches.filter(function(b){return APP.bottling[b.id];}).length;
  var successRate=(finishedOrBottled+failedN)?Math.round(finishedOrBottled/(finishedOrBottled+failedN)*100):null;
  var ccy=APP.settings.currency||'€';
  var totalCost=batches.reduce(function(s,b){return s+((b.cost&&(b.cost.honey||0)+(b.cost.extras||0))||0);},0);

  function tile(icon,val,label,sub){
    return'<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">'
      +'<div style="font-size:20px;line-height:1;margin-bottom:6px">'+icon+'</div>'
      +'<div style="font-family:var(--font-display);font-size:21px;color:var(--gold2);line-height:1.1">'+val+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.2px;margin-top:5px;text-transform:uppercase">'+label+'</div>'
      +(sub?'<div style="font-size:10.5px;color:var(--text3);margin-top:4px;line-height:1.4">'+sub+'</div>':'')
      +'</div>';
  }
  var tiles=[
    tile('🍯',totalVolume.toFixed(0)+' L','Mead Brewed (lifetime)','≈ '+Math.round(totalVolume/0.75)+' × 750 ml made'),
    tile('🍷',bottledEver,'Bottles Bottled','≈ '+glasses+' glasses poured'),
    favHoney?tile('🌼',escHtml(favHoney.val),'Favourite Honey','used in '+favHoney.n+' batch'+(favHoney.n!==1?'es':'')):'',
    favYeast?tile('🧫',escHtml(favYeast.val),'Go-To Yeast','pitched '+favYeast.n+'×'):'',
    abvs.length?tile('🔥',abvs[0].abv.toFixed(1)+'%','Strongest Batch',escHtml(abvs[0].name)):'',
    avgTTB?tile('⏱',avgTTB+' days','Avg Brew → Bottle',null):'',
    tile('🎨',distinctStyles,'Styles Explored',distinctStyles>=6?'a true polymath!':'keep exploring'),
    successRate!=null?tile('🎯',successRate+'%','Success Rate',failedN?failedN+' lost to learn from':'flawless so far'):'',
    totalCost>0?tile('💰',ccy+totalCost.toFixed(0),'Invested in the Craft',bottledEver?'≈ '+ccy+(totalCost/bottledEver).toFixed(2)+'/bottle':null):''
  ].filter(Boolean).join('');

  var beeFact=totalHoney>0
    ? '<div style="margin-top:14px;padding:12px 14px;background:linear-gradient(135deg,rgba(201,168,76,0.10),rgba(201,168,76,0.02));border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text2);line-height:1.6">'
      +'🐝 <strong style="color:var(--gold2)">Bee math:</strong> your '+totalHoney.toFixed(1)+' kg of honey represents roughly <strong>'+beeKm.toLocaleString()+' km</strong> of bee flight — that\'s about <strong>'+earths.toFixed(1)+'×</strong> around the Earth, or '+(earths/9.6).toFixed(1)+'× the distance to the Moon. Tip your hat to the bees.</div>'
    : '';

  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">✨ FUN FACTS &amp; MILESTONES</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+tiles+'</div>'
    +beeFact
    +'</div>';
}

// Failed batch insights: postmortems list + pattern-mining counterpart to
// "what your best batches share". When you have failures, learning from them
// systematically is more valuable than reviewing them ad-hoc.
function renderFailedBatchInsights(){
  var failed=(APP.batches||[]).filter(function(b){return b.failed;});
  if(!failed.length)return''; // no failures = no card. Keeps the view cleaner.
  // Sort newest-first
  failed.sort(function(a,b){return(b.failed.date||'').localeCompare(a.failed.date||'');});
  // Tally categories
  var byCategory={};
  failed.forEach(function(b){
    var c=b.failed.category||'other';
    if(!byCategory[c])byCategory[c]={count:0,batches:[]};
    byCategory[c].count++;
    byCategory[c].batches.push(b);
  });
  var topCategory=Object.keys(byCategory).sort(function(a,b){return byCategory[b].count-byCategory[a].count;})[0];
  // Pattern-match: what common attributes show up across failures
  function tallyMode(arr,getter){
    var counts={};
    arr.forEach(function(x){var v=getter(x);if(v==null||v==='')return;counts[v]=(counts[v]||0)+1;});
    var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
    return entries.length?entries[0]:null;
  }
  var commonHoney=tallyMode(failed,function(b){return b.honeyType;});
  var commonYeast=tallyMode(failed,function(b){return b.yeast;});
  var commonStyle=tallyMode(failed,function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return r&&r.style;});

  // Postmortem cards — most recent 5, newer cards higher
  var postmortems=failed.slice(0,5).map(function(b){
    var f=b.failed;
    var cat=FAILURE_CATEGORIES.find(function(c){return c.id===f.category;})||{label:f.category,icon:'⚰'};
    var color=getBatchColor(b);
    return'<div onclick="showView(\'batch\',\''+b.id+'\')" style="cursor:pointer;background:var(--bg);border-left:3px solid var(--red2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px">'
        +'<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div>'+(b.serial?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">#'+escHtml(b.serial)+'</div>':'')+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--red2);letter-spacing:1.5px">'+cat.icon+' '+escHtml(proseL(cat.label).toUpperCase())+'</div>'
      +'</div>'
      +(f.whatWentWrong?'<div style="font-size:11.5px;color:var(--text2);line-height:1.5;font-style:italic">'+escHtml(f.whatWentWrong.length>180?f.whatWentWrong.slice(0,180)+'…':f.whatWentWrong)+'</div>':'')
      +(f.whatToTryNext?'<div style="font-size:11px;color:var(--gold2);line-height:1.5;margin-top:6px;border-top:1px dotted var(--border);padding-top:5px"><strong style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;text-transform:uppercase">→</strong> '+escHtml(f.whatToTryNext.length>140?f.whatToTryNext.slice(0,140)+'…':f.whatToTryNext)+'</div>':'')
      +'</div>';
  }).join('');

  var patternRows=[];
  if(failed.length>=2){
    if(commonHoney&&commonHoney[1]>=2)patternRows.push({k:'Most common honey',v:commonHoney[0],detail:'in '+commonHoney[1]+' of '+failed.length+' failures'});
    if(commonYeast&&commonYeast[1]>=2)patternRows.push({k:'Most common yeast',v:commonYeast[0],detail:'in '+commonYeast[1]+' of '+failed.length+' failures'});
    if(commonStyle&&commonStyle[1]>=2)patternRows.push({k:'Most common style',v:commonStyle[0],detail:'in '+commonStyle[1]+' of '+failed.length+' failures'});
    if(topCategory&&byCategory[topCategory].count>=2){
      var topCatLabel=proseL((FAILURE_CATEGORIES.find(function(c){return c.id===topCategory;})||{label:topCategory}).label);
      patternRows.push({k:'Most common failure',v:topCatLabel,detail:byCategory[topCategory].count+' of '+failed.length+' failures'});
    }
  }
  var patternBlock=patternRows.length?'<div style="background:var(--bg);border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;border-left:3px solid var(--gold)">'
    +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--gold);letter-spacing:1.5px;margin-bottom:6px">⚠ PATTERNS WORTH NOTING</div>'
    +patternRows.map(function(r){return'<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><div style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+escHtml(r.k.toUpperCase())+'</div><div style="text-align:right"><span style="color:var(--gold2);font-family:var(--font-display);font-size:13px">'+escHtml(r.v)+'</span> <span style="color:var(--text3);font-size:10.5px;font-style:italic">'+escHtml(r.detail)+'</span></div></div>';}).join('')
    +'</div>':'';

  var totalBatches=(APP.batches||[]).length;
  var failureRate=totalBatches?(failed.length/totalBatches*100).toFixed(0):0;

  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--red2)"><div class="card-header"><div class="card-title">⚰ POSTMORTEMS</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+failed.length+' FAILED · '+failureRate+'% OF '+totalBatches+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Lessons preserved. The postmortems your past-self wrote so future-you doesn\'t repeat the same mistake. Failure rate stays low when you actually learn from these.</div>'
    +patternBlock
    +postmortems
    +(failed.length>5?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;text-align:center;margin-top:8px">Showing 5 most recent · '+(failed.length-5)+' more in batch list</div>':'')
    +'</div>';
}

// Best-tasting insights: find the common threads across your highest-rated
// batches. Pulls all batches with at least one 4-5 star tasting, then
// computes mode/median for each interesting attribute.
function renderBestTastingInsights(){
  // Build per-batch summary including best tasting rating
  var batchSummaries=APP.batches.filter(function(b){return APP.bottling[b.id];}).map(function(b){
    var tastings=(APP.tastings[b.id]||[]).filter(function(t){return t.rating;});
    var bestRating=tastings.length?Math.max.apply(null,tastings.map(function(t){return t.rating;})):0;
    var bot=APP.bottling[b.id];
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    return{
      batch:b,
      rating:bestRating,
      honeyType:b.honeyType,
      yeast:b.yeast,
      og:b.og,
      style:(recipe&&recipe.style)||b.style,
      abv:bot.abv,
      daysToBottle:b.startDate&&bot.date?Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000):null
    };
  });
  var topRated=batchSummaries.filter(function(s){return s.rating>=4;});
  if(topRated.length<2){
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🌟 BEST-TASTING INSIGHTS</div></div>'
      +'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:14px 0">Need at least 2 batches with a 4-star or higher tasting to find patterns. You have '+topRated.length+'.</div>'
      +'</div>';
  }
  // Tally common attributes
  function tallyMode(arr,getter){
    var counts={};
    arr.forEach(function(x){
      var v=getter(x);
      if(v==null||v==='')return;
      counts[v]=(counts[v]||0)+1;
    });
    var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
    return entries.length?entries[0]:null;
  }
  function median(arr,getter){
    var vals=arr.map(getter).filter(function(v){return v!=null&&!isNaN(v);}).sort(function(a,b){return a-b;});
    if(!vals.length)return null;
    var mid=Math.floor(vals.length/2);
    return vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
  }
  var commonHoney=tallyMode(topRated,function(s){return s.honeyType;});
  var commonStyle=tallyMode(topRated,function(s){return s.style;});
  var commonYeast=tallyMode(topRated,function(s){return s.yeast;});
  var medianABV=median(topRated,function(s){return parseFloat(s.abv);});
  var medianDays=median(topRated,function(s){return s.daysToBottle;});
  var medianOG=median(topRated,function(s){return parseFloat(s.og);});

  function row(label,value,detail){
    if(!value)return'';
    return'<div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1px">'+escHtml(label.toUpperCase())+'</div><div style="text-align:right"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(String(value))+'</div>'+(detail?'<div style="font-size:10.5px;color:var(--text3);font-style:italic;margin-top:2px">'+escHtml(detail)+'</div>':'')+'</div></div>';
  }
  var rows=[
    commonHoney?row('Most common honey',commonHoney[0],'in '+commonHoney[1]+' of '+topRated.length+' top-rated batches'):'',
    commonStyle?row('Most common style',commonStyle[0],'in '+commonStyle[1]+' of '+topRated.length+' top-rated batches'):'',
    commonYeast?row('Most common yeast',commonYeast[0],'in '+commonYeast[1]+' of '+topRated.length+' top-rated batches'):'',
    medianABV!=null?row('Median ABV',medianABV.toFixed(1)+'%',null):'',
    medianOG!=null?row('Median OG',medianOG.toFixed(3),null):'',
    medianDays!=null?row('Median days to bottle',Math.round(medianDays)+' days',null):''
  ].filter(Boolean).join('');
  // List the actual batches
  topRated.sort(function(a,b){return b.rating-a.rating;});
  var batchList=topRated.slice(0,5).map(function(s){
    var stars='★'.repeat(s.rating)+'<span style="color:var(--bg4)">'+'★'.repeat(5-s.rating)+'</span>';
    return'<div onclick="showView(\'batch\',\''+s.batch.id+'\')" style="cursor:pointer;padding:8px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(s.batch)+';border-radius:var(--radius);margin-bottom:4px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(s.batch)+'">'+escHtml(s.batch.name)+'</div><div>'+stars+'</div></div></div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold2)"><div class="card-header"><div class="card-title">🌟 WHAT YOUR BEST BATCHES SHARE</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+topRated.length+' BATCHES · 4★ AND ABOVE</div></div>'
    +rows
    +(batchList?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold);letter-spacing:1.5px;margin:14px 0 6px">— TOP RATED —</div>'+batchList:'')
    +'</div>';
}

// Personal trend dashboard — year-over-year stats. Useful starting at year 2.
function renderPersonalTrends(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  // Group by start-year
  var byYear={};
  bottled.forEach(function(b){
    var year=new Date(b.startDate).getFullYear();
    if(isNaN(year))return;
    if(!byYear[year])byYear[year]={year:year,batches:[]};
    byYear[year].batches.push(b);
  });
  var years=Object.keys(byYear).map(Number).sort();
  if(years.length<2){
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📈 YEAR-OVER-YEAR TRENDS</div></div>'
      +'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:14px 0">Need at least 2 brewing years to compute trends. You\'re in year '+years.length+'.</div>'
      +'</div>';
  }
  // Per-year aggregates
  years.forEach(function(y){
    var data=byYear[y];
    var ratings=[],attenuations=[],times=[],costPerBottle=[];
    data.batches.forEach(function(b){
      var bot=APP.bottling[b.id];
      var ts=(APP.tastings[b.id]||[]).filter(function(t){return t.rating;});
      if(ts.length){
        ratings.push(ts.reduce(function(s,t){return s+t.rating;},0)/ts.length);
      }
      if(b.og&&bot.fg){
        attenuations.push((b.og-bot.fg)/(b.og-1)*100);
      }
      if(b.startDate&&bot.date){
        times.push(Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000));
      }
      if(b.cost){
        var total=(b.cost.honey||0)+(b.cost.extras||0);
        var bottles=bottlesOriginal(bot);
        if(total>0&&bottles>0)costPerBottle.push(total/bottles);
      }
    });
    function avg(arr){return arr.length?arr.reduce(function(s,v){return s+v;},0)/arr.length:null;}
    data.batchCount=data.batches.length;
    data.avgRating=avg(ratings);
    data.avgAttenuation=avg(attenuations);
    data.avgDaysToBottle=avg(times);
    data.avgCostPerBottle=avg(costPerBottle);
  });
  var ccy=APP.settings.currency||'€';

  function renderYearColumn(y,prevY){
    var d=byYear[y];
    var prev=prevY?byYear[prevY]:null;
    function deltaPill(curr,prev,fmt,higherIsBetter){
      if(curr==null||prev==null)return'';
      var diff=curr-prev;
      if(Math.abs(diff)<0.001)return'';
      var isGood=higherIsBetter?(diff>0):(diff<0);
      var color=isGood?'var(--green2)':'var(--red2)';
      return'<span style="font-family:var(--font-mono);font-size:9.5px;color:'+color+';margin-left:6px;letter-spacing:0.5px">'+(diff>=0?'▲':'▼')+' '+fmt(Math.abs(diff))+'</span>';
    }
    return'<div style="background:var(--bg);border-radius:var(--radius);padding:14px;flex:1;min-width:0">'
      +'<div style="font-family:var(--font-display);font-size:24px;color:var(--gold2);margin-bottom:14px">'+y+'</div>'
      +'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">BATCHES BREWED</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.batchCount+(prev?deltaPill(d.batchCount,prev.batchCount,function(v){return Math.round(v);},true):'')+'</div></div>'
      +(d.avgRating!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG TASTING RATING</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.avgRating.toFixed(2)+'★'+(prev&&prev.avgRating!=null?deltaPill(d.avgRating,prev.avgRating,function(v){return v.toFixed(2);},true):'')+'</div></div>':'')
      +(d.avgAttenuation!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG ATTENUATION</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.avgAttenuation.toFixed(0)+'%'+(prev&&prev.avgAttenuation!=null?deltaPill(d.avgAttenuation,prev.avgAttenuation,function(v){return v.toFixed(0)+'%';},true):'')+'</div></div>':'')
      +(d.avgDaysToBottle!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG DAYS TO BOTTLE</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+Math.round(d.avgDaysToBottle)+'d'+(prev&&prev.avgDaysToBottle!=null?deltaPill(d.avgDaysToBottle,prev.avgDaysToBottle,function(v){return Math.round(v)+'d';},false):'')+'</div></div>':'')
      +(d.avgCostPerBottle!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG COST / BOTTLE</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+ccy+d.avgCostPerBottle.toFixed(2)+(prev&&prev.avgCostPerBottle!=null?deltaPill(d.avgCostPerBottle,prev.avgCostPerBottle,function(v){return ccy+v.toFixed(2);},false):'')+'</div></div>':'')
      +'</div>';
  }
  // Show last 4 years
  var displayYears=years.slice(-4);
  var cols=displayYears.map(function(y,idx){
    var prev=idx>0?displayYears[idx-1]:null;
    return renderYearColumn(y,prev);
  }).join('');
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📈 YEAR-OVER-YEAR TRENDS</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Arrows show change from the previous year. Green = improving (higher ratings, faster attenuation, lower cost), red = regressing.</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap">'+cols+'</div>'
    +'</div>';
}
