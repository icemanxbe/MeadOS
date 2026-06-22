// ==========================================================================
// Personal records / Meadwright achievements.
// Split out of the former 12-features2.js. Globals, no behaviour change.
// ==========================================================================

// ==================== PERSONAL RECORDS / MEADWRIGHT ACHIEVEMENTS ====================
function computePersonalRecords(){
  var records={
    highestABV:null,
    strongestAttenuation:null,
    longestAged:null,
    biggestYear:null,
    mostBottlesInBatch:null,
    totalBatchesLifetime:APP.batches.length,
    totalBottlesLifetime:0,
    bottlesDrunkLifetime:0,
    bottlesGiftedLifetime:0,
    oldestActiveBatch:null,
    distinctRecipes:0,
    highestRatedBatch:null
  };
  var recipesSeen={};
  // Track year batch counts
  var byYear={};
  APP.batches.forEach(function(b){
    recipesSeen[b.recipeId]=true;
    var y=new Date(b.startDate).getFullYear();
    byYear[y]=(byYear[y]||0)+1;
    var bot=APP.bottling[b.id];
    if(bot){
      var orig=bottlesOriginal(bot);
      records.totalBottlesLifetime+=orig;
      records.bottlesGiftedLifetime+=bottlesInLocation(bot,'gifted');
      records.bottlesDrunkLifetime+=orig-totalBottles(bot);
      // Highest ABV
      if(bot.abv&&(!records.highestABV||bot.abv>records.highestABV.value)){
        records.highestABV={value:bot.abv,batch:b};
      }
      // Strongest attenuation
      if(b.og&&bot.fg){
        var att=((b.og-bot.fg)/(b.og-1))*100;
        if(!records.strongestAttenuation||att>records.strongestAttenuation.value){
          records.strongestAttenuation={value:att,batch:b};
        }
      }
      // Most bottles in a batch
      if(!records.mostBottlesInBatch||orig>records.mostBottlesInBatch.value){
        records.mostBottlesInBatch={value:orig,batch:b};
      }
      // Longest aged — bottling date vs today (and still has bottles on-hand, i.e., aging)
      if(bottlesOnHand(bot)>0){
        var aged=Math.floor((Date.now()-new Date(bot.date).getTime())/86400000);
        if(!records.longestAged||aged>records.longestAged.value){
          records.longestAged={value:aged,batch:b};
        }
      }
    }else{
      // Oldest active batch (started but not bottled)
      var ageDays=daysSince(b.startDate);
      if(!records.oldestActiveBatch||ageDays>records.oldestActiveBatch.value){
        records.oldestActiveBatch={value:ageDays,batch:b};
      }
    }
    // Highest-rated tasting on this batch
    var tastings=APP.tastings[b.id]||[];
    tastings.forEach(function(t){
      if(t.rating&&(!records.highestRatedBatch||t.rating>records.highestRatedBatch.value||(t.rating===records.highestRatedBatch.value&&new Date(t.date)>new Date(records.highestRatedBatch.tasting.date)))){
        records.highestRatedBatch={value:t.rating,batch:b,tasting:t};
      }
    });
  });
  // Biggest year
  var maxY=0,maxYr=null;
  Object.keys(byYear).forEach(function(y){
    if(byYear[y]>maxY){maxY=byYear[y];maxYr=y;}
  });
  if(maxYr)records.biggestYear={value:maxY,year:maxYr};
  records.distinctRecipes=Object.keys(recipesSeen).length;
  return records;
}

function renderPersonalRecords(){
  var r=computePersonalRecords();
  function tile(icon,label,value,detail){
    return'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">'
      +'<div style="font-size:24px;line-height:1">'+icon+'</div>'
      +'<div style="font-family:var(--font-display);font-size:24px;color:var(--gold2);margin:4px 0">'+(value||'—')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">'+label+'</div>'
      +(detail?'<div style="font-size:11px;color:var(--text2);margin-top:4px;font-style:italic;line-height:1.3">'+detail+'</div>':'')
      +'</div>';
  }
  return'<div class="card" style="margin-top:16px;border-color:var(--gold)"><div class="card-header"><div class="card-title">🏆 MEADWRIGHT RECORDS · ALL-TIME</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">'
    +tile('🔥','Highest ABV',r.highestABV?r.highestABV.value.toFixed(1)+'%':'—',r.highestABV?escHtml(r.highestABV.batch.name):'')
    +tile('💪','Best Attenuation',r.strongestAttenuation?r.strongestAttenuation.value.toFixed(1)+'%':'—',r.strongestAttenuation?escHtml(r.strongestAttenuation.batch.name):'')
    +tile('⌛','Longest Aged',r.longestAged?fmtDaysShort(r.longestAged.value):'—',r.longestAged?escHtml(r.longestAged.batch.name)+' · still resting':'')
    +tile('📅','Biggest Year',r.biggestYear?r.biggestYear.value+' batches':'—',r.biggestYear?r.biggestYear.year:'')
    +tile('🍾','Largest Batch',r.mostBottlesInBatch?r.mostBottlesInBatch.value+' btl':'—',r.mostBottlesInBatch?escHtml(r.mostBottlesInBatch.batch.name):'')
    +tile('⭐','Top-Rated',r.highestRatedBatch?'★'.repeat(r.highestRatedBatch.value):'—',r.highestRatedBatch?escHtml(r.highestRatedBatch.batch.name):'')
    +tile('🧪','Recipes Tried',r.distinctRecipes,'distinct recipes')
    +tile('🎁','Bottles Gifted',r.bottlesGiftedLifetime,'shared with others')
    +'</div>'
    +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:11px;color:var(--text3);text-align:center">LIFETIME · '+r.totalBatchesLifetime+' batches · '+r.totalBottlesLifetime+' bottles produced · '+r.bottlesDrunkLifetime+' consumed</div>'
    +'</div>';
}
