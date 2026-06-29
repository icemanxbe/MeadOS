// ==================== BATCH ADVISOR ====================
// The intelligence layer. Three clean stages, all PURE (no DOM, no persistence):
//
//   mwBatchSignals(b)  → FACTS ONLY (gravity, attenuation, temp, sugar-break…).
//                        Never contains advice.
//   rules (internal)   → read signals, emit RECOMMENDATIONS {id,severity,…}.
//   mwBatchAdvice(b)   → {signals, items[], health, readiness} — the single
//                        snapshot every view consumes (computed on read, not
//                        stored, so it can never go stale or bloat sync state).
//
// Severity: 'critical' (fix now) · 'recommended' (do soon) · 'info' (FYI).
// Recommendations carry a stable id (so they can be dismissed/tracked later),
// a confidence 0..1 with the reasons behind it, and structured data the view
// formats + localizes. Strings live in the view layer (12-advisor.js), not here.

// ---- Signals: derived facts about a batch ---------------------------------
function mwBatchSignals(b){
  if(!b)return null;
  var recipe=(typeof APP!=='undefined'&&APP.recipes)?APP.recipes.find(function(r){return r.id===b.recipeId;}):null;
  var status=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  var logs=((typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[]).filter(function(l){return l.gravity;})
    .slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  var og=parseFloat(b.og)||(recipe&&recipe.ogTarget)||null;
  var lastG=logs.length?parseFloat(logs[logs.length-1].gravity):null;
  var readings=logs.length;
  var daysSinceStart=(typeof daysSince==='function'&&b.startDate)?daysSince(b.startDate):null;

  // Targets: prefer the batch's actual yeast, fall back to recipe targets.
  var yt=(og&&b.yeast&&typeof mwYeastTargets==='function')?mwYeastTargets(og,b.yeast):null;
  var targetFG=(yt&&yt.fg)||(recipe&&recipe.fgTarget)||1.000;
  var targetABV=(yt&&yt.abv)||(recipe&&recipe.abvTarget)||(og?parseFloat(calcABV(og,targetFG)):null);

  var proj=(typeof projectFermentation==='function')?projectFermentation(b):null;
  var attenuation=(og&&lastG!=null)?mwAttenuation(og,lastG):0;
  var expectedAttenuation=(og)?mwAttenuation(og,targetFG):0;
  var sugarBreak=(og)?mwSugarBreak(og,targetFG):null;
  var passedSugarBreak=(sugarBreak!=null&&lastG!=null)?(lastG<=sugarBreak):false;

  // Nutrients
  var nut=(recipe&&typeof getNutrientStatus==='function')?getNutrientStatus(b,recipe):{done:0,expected:0};
  var nutrientsComplete=nut.expected>0?(nut.done>=nut.expected):(nut.total>0);

  // Temperature: latest logged temp + the active yeast's optimal range.
  var latestTemp=null;for(var i=logs.length-1;i>=0;i--){if(logs[i].temp!=null&&logs[i].temp!==''){latestTemp=parseFloat(logs[i].temp);break;}}
  var y=(typeof YEAST_STRAINS!=='undefined'&&b.yeast)?YEAST_STRAINS.filter(function(x){return x.id===b.yeast;})[0]:null;
  var tLow=(y&&y.optimalTempLow!=null)?y.optimalTempLow:16, tHigh=(y&&y.optimalTempHigh!=null)?y.optimalTempHigh:24;
  var tempInRange=(latestTemp!=null)?(latestTemp>=tLow-0.5&&latestTemp<=tHigh+0.5):null;
  // stability: spread of the last 3 temps
  var recentT=logs.filter(function(l){return l.temp!=null&&l.temp!=='';}).slice(-3).map(function(l){return parseFloat(l.temp);});
  var tempStable=recentT.length>=2?((Math.max.apply(null,recentT)-Math.min.apply(null,recentT))<=2.0):null;

  // ABV headroom vs the strain's tolerance
  var currentABV=(og&&lastG!=null)?parseFloat(calcABV(og,lastG)):null;
  var abvMax=(y&&y.abvMax)||null;
  var nearTolerance=(currentABV!=null&&abvMax)?(currentABV>=abvMax-1.0):false;

  var active=(status==='fermenting'||status==='conditioning'||status==='aging');
  var fermenting=(status==='fermenting');

  return {
    recipeId:b.recipeId, status:status, active:active, fermenting:fermenting,
    og:og, lastG:lastG, readings:readings, daysSinceStart:daysSinceStart,
    targetFG:targetFG, targetABV:targetABV, currentABV:currentABV,
    attenuation:attenuation, expectedAttenuation:expectedAttenuation,
    ratePerDay:proj?proj.ratePerDay:null, daysToFG:proj?proj.daysToFG:null,
    doneMs:proj?proj.doneMs:null, estFG:proj?proj.estFG:null,
    stalled:proj?proj.stalled:false, nearFG:proj?proj.nearFG:false,
    sugarBreak:sugarBreak, passedSugarBreak:passedSugarBreak,
    nutrientsDone:nut.done, nutrientsExpected:nut.expected, nutrientsComplete:nutrientsComplete,
    latestTemp:latestTemp, tempLow:tLow, tempHigh:tHigh, tempInRange:tempInRange, tempStable:tempStable,
    abvMax:abvMax, nearTolerance:nearTolerance, yeastId:b.yeast||null
  };
}

// ---- Confidence: honest, derived from how much signal we actually have -----
function mwConfidence(s){
  if(!s)return 0.3;
  var c=0.45;
  if(s.readings>=2)c+=0.15;
  if(s.readings>=4)c+=0.15;
  if(s.readings>=8)c+=0.1;
  if(s.tempStable===true)c+=0.05;
  if(s.ratePerDay!=null&&s.ratePerDay>0)c+=0.1;
  return Math.min(0.99,Math.round(c*100)/100);
}

// ---- Rules: each reads signals, returns a recommendation or null ----------
function _advRules(){
  return [
    function stalled(s){
      if(!s.active||!s.stalled)return null;
      return {id:'stalled',severity:'critical',
        data:{atten:Math.round(s.attenuation*100),days:s.daysSinceStart,temp:s.latestTemp},
        reasons:['rate-flat','below-target']};
    },
    function finalNutrient(s){
      if(s.nutrientsComplete||s.nutrientsExpected===0)return null;
      if(!s.fermenting)return null;
      // Due as we approach the 1/3 break; urgent once past it (window closing).
      var near=s.sugarBreak!=null&&s.lastG!=null&&s.lastG<=(s.sugarBreak+0.006);
      if(!near&&!s.passedSugarBreak)return null;
      return {id:'nutrient-final',severity:s.passedSugarBreak?'critical':'recommended',
        data:{done:s.nutrientsDone,expected:s.nutrientsExpected,sugarBreak:s.sugarBreak,past:s.passedSugarBreak},
        reasons:['near-break']};
    },
    function oxygen(s){
      if(!s.passedSugarBreak)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      return {id:'oxygen-stop',severity:'recommended',
        data:{sugarBreak:s.sugarBreak,sg:s.lastG,vigorous:s.fermenting&&!s.nearFG},
        reasons:['past-break']};
    },
    function complete(s){
      if(!s.active||!s.nearFG)return null;
      return {id:'ferment-complete',severity:'recommended',
        data:{sg:s.lastG,targetFG:s.targetFG,atten:Math.round(s.attenuation*100)},
        reasons:['near-fg']};
    },
    function temperature(s){
      if(s.tempInRange!==false)return null;
      var cold=s.latestTemp<s.tempLow;
      return {id:'temperature',severity:s.fermenting?'recommended':'info',
        data:{temp:s.latestTemp,low:s.tempLow,high:s.tempHigh,cold:cold},
        reasons:['out-of-range']};
    },
    function tolerance(s){
      if(!s.fermenting||!s.nearTolerance||s.nearFG)return null;
      return {id:'abv-ceiling',severity:'info',
        data:{abv:s.currentABV,max:s.abvMax},
        reasons:['near-tolerance']};
    },
    function onSchedule(s){
      // Reassuring "all good" note while fermenting healthily.
      if(!s.fermenting||s.stalled||s.nearFG)return null;
      if(s.ratePerDay==null||s.ratePerDay<=0)return null;
      return {id:'on-track',severity:'info',
        data:{atten:Math.round(s.attenuation*100),expected:Math.round(s.expectedAttenuation*100),daysToFG:s.daysToFG,doneMs:s.doneMs},
        reasons:['rate-ok']};
    }
  ];
}

// ---- Health score: weighted 0..100 with a breakdown -----------------------
function mwBatchHealth(s){
  if(!s)return null;
  function comp(known,val){return {known:known,val:known?Math.max(0,Math.min(100,Math.round(val))):null};}
  // Temperature
  var temp=comp(s.tempInRange!=null, s.tempInRange? (s.tempStable===false?85:100) : 55);
  // Nutrition
  var nutr=comp(s.nutrientsExpected>0||s.nutrientsDone>0, s.nutrientsExpected>0?(s.nutrientsDone/s.nutrientsExpected*100):100);
  // Gravity progress: on track vs expected attenuation (only meaningful while active)
  var grav;
  if(s.active&&s.og){
    if(s.stalled)grav=comp(true,40);
    else if(s.nearFG)grav=comp(true,100);
    else{var ratio=s.expectedAttenuation>0?(s.attenuation/s.expectedAttenuation):1;grav=comp(true,60+Math.min(40,ratio*40));}
  }else grav=comp(false,null);
  // Oxygen management: penalised only if past break and still actively fermenting (aeration risk window)
  var oxy=comp(s.sugarBreak!=null, s.passedSugarBreak&&s.fermenting?90:100);
  // Yeast health: stall / tolerance pressure
  var yeast=comp(s.og!=null, s.stalled?45:(s.nearTolerance&&!s.nearFG?75:100));

  var parts=[{k:'temperature',w:0.25,c:temp},{k:'nutrition',w:0.2,c:nutr},{k:'gravity',w:0.3,c:grav},{k:'oxygen',w:0.12,c:oxy},{k:'yeast',w:0.13,c:yeast}];
  var sw=0,acc=0,breakdown={};
  parts.forEach(function(p){breakdown[p.k]=p.c.val;if(p.c.known){sw+=p.w;acc+=p.w*p.c.val;}});
  var score=sw>0?Math.round(acc/sw):null;
  var band=score==null?'unknown':(score>=90?'excellent':score>=75?'good':score>=55?'fair':'attention');
  return {score:score,band:band,breakdown:breakdown};
}

// ---- Readiness: "can I drink it yet?" 0..100, tied to the aging model ------
function mwReadiness(b){
  if(!b)return null;
  var recipe=(typeof APP!=='undefined'&&APP.recipes)?APP.recipes.find(function(r){return r.id===b.recipeId;}):null;
  var status=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  if(status==='failed')return {pct:0,phase:'failed'};
  var s=mwBatchSignals(b);
  // Pre-bottling: readiness tracks fermentation progress, capped low (it's not drinkable yet).
  if(status==='fermenting'||status==='conditioning'){
    var att=s?s.attenuation:0;
    return {pct:Math.round(Math.min(0.30,att*0.30)*100),phase:'fermenting'};
  }
  // Bottled / aging: drive off elapsed aging vs the recipe's ready→peak window.
  var bottling=(typeof APP!=='undefined'&&APP.bottling)?APP.bottling[b.id]:null;
  var anchor=(bottling&&bottling.date)||b.startDate;
  var aged=(typeof daysSince==='function')?daysSince(anchor):0;
  var ready=(recipe&&recipe.minAgeDays)||60;
  var peak=(recipe&&recipe.peakAgeDays)||240;
  var pct;
  if(aged>=peak)pct=100;
  else if(aged>=ready)pct=70+Math.round((aged-ready)/(peak-ready)*30);   // 70→100 across ready→peak
  else pct=30+Math.round(aged/Math.max(1,ready)*40);                      // 30→70 across 0→ready
  return {pct:Math.max(0,Math.min(100,pct)),phase:aged>=peak?'peak':(aged>=ready?'ready':'aging'),readyDays:ready,peakDays:peak,agedDays:aged};
}

// ---- Ephemeral memo: version the INPUTS, memoise the OUTPUT, never persist --
// The advice is a pure function of the batch's data, so we cache one snapshot per
// batch keyed by a cheap signature of every input that can change it (logs, OG,
// yeast, ticked steps, bottling, additions). When any input changes the signature
// changes and we recompute — so it can never go stale, and repeated reads in one
// render (dashboard row + overview + advisor tab) cost nothing. Not serialised.
var _mwAdviceMemo={};
function _mwAdviceSig(b){
  var logs=(typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[];
  var last=logs.length?logs[logs.length-1]:{};
  var doneN=0,td=(typeof APP!=='undefined'&&APP.tasksDone)||{},pre=b.id+'-step-';
  for(var k in td){if(td.hasOwnProperty(k)&&k.indexOf(pre)===0)doneN++;}
  var bot=(typeof APP!=='undefined'&&APP.bottling&&APP.bottling[b.id])||null;
  var adds=((typeof APP!=='undefined'&&APP.additions&&APP.additions[b.id])||[]).length;
  // Domain-aligned time: key off the actual age integers the output depends on
  // (fermentation age + days bottled), not wall-clock — invalidates as the batch
  // ages, with no midnight-boundary artifact.
  var ageF=(typeof daysSince==='function'&&b.startDate)?daysSince(b.startDate):0;
  var ageB=(typeof daysSince==='function'&&bot&&bot.date)?daysSince(bot.date):0;
  return [b.id,b.recipeId,b.og,b.yeast,b.startDate,b.failed?1:0,logs.length,last.date,last.gravity,last.temp,doneN,bot?bot.date:0,adds,ageF,ageB].join('|');
}

// ---- The single snapshot every view consumes ------------------------------
function mwBatchAdvice(b){
  if(!b)return null;
  var sig=_mwAdviceSig(b), cached=_mwAdviceMemo[b.id];
  if(cached&&cached.sig===sig)return cached.val;
  var s=mwBatchSignals(b);
  if(!s)return null;
  var conf=mwConfidence(s);
  var items=_advRules().map(function(rule){var v=rule(s);if(!v)return null;if(v.confidence==null)v.confidence=conf;return v;}).filter(Boolean);
  // Order: critical → recommended → info
  var rank={critical:0,recommended:1,info:2};
  items.sort(function(a,c){return rank[a.severity]-rank[c.severity];});
  var val={signals:s, items:items, health:mwBatchHealth(s), readiness:mwReadiness(b)};
  _mwAdviceMemo[b.id]={sig:sig,val:val};
  return val;
}
