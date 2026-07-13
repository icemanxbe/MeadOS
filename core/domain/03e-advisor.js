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

// Resolves which honey a batch is actually using: the batch's own explicit
// field, else its recipe's first honey. Shared by mwBatchSignals() (for the
// CURRENT batch, recipe already resolved there) and mwHistoricalComparison()
// (for every candidate batch it scans, recipe not pre-resolved — pass none
// and it looks it up via getRecipe). Previously duplicated inline in both
// places; extracted so there's one definition of "which honey", not two that
// could drift apart.
function mwResolveHoney(b,recipe){
  if(!b)return null;
  if(b.honeyType)return b.honeyType;
  var r=recipe||((typeof getRecipe==='function')?getRecipe(b.recipeId):null);
  return (r&&typeof honeyTypesInRecipe==='function')?((honeyTypesInRecipe(r)||[])[0]||null):null;
}

// Whether a recipe is a sparkling/bottle-conditioned style — finished dry and
// primed at bottling rather than stabilised, which means it typically gets
// bottled sooner (no stabilise-and-clear wait) than a still mead on the same
// yeast+honey. Shared for the same reason as mwResolveHoney above: used by
// mwBatchSignals() for the current batch AND mwHistoricalComparison() for
// every candidate it scans, one definition instead of two that could drift.
function mwIsSparkling(recipe){
  if(!recipe)return false;
  if(recipe.category==='Sparkling'||recipe.style==='Sparkling')return true;
  if(recipe.tags&&(recipe.tags.indexOf('Sparkling')>=0||recipe.tags.indexOf('Carbonated')>=0))return true;
  // Broader net for custom/renamed recipes, same regex as the printed label's
  // own sparkling/still detection (labelStudioCarbonation) — a recipe that
  // reads "sparkling" on its label should also get the safety-relevant
  // bottle-bomb/priming rules below, not just the cosmetic label word.
  var hay=((recipe.style||'')+' '+(recipe.name||'')+' '+((recipe.tags||[]).join(' '))).toLowerCase();
  return /sparkling|p[ée]tillant|carbonat|bottle-condition/.test(hay);
}

// Whether a fruit addition's item text describes a JUICE/concentrate form
// rather than whole/frozen/puree fruit. Real, researched mechanism (not
// invented): juice's sugar is already dissolved and available, so it lands
// FULLY in the very next gravity reading with no real extraction lag —
// unlike whole/frozen fruit, where cell walls take days to break down and
// release sugar (frozen actually breaks down faster than fresh, since
// freezing ruptures the cell walls itself, but still over days, not
// instantly). recentFruitAddition below uses this to size its "how long
// might this skew the trend" window differently per form.
//
// The additions data model (ADDITION_TYPES, 11-ha-additions-temp.js) has no
// structured fruit-form field, only the brewer's own free-text `item`
// description — this matches a small, unambiguous word list against text
// the brewer wrote themselves about their OWN ingredient, which is a
// meaningfully safer signal than pattern-matching arbitrary external text:
// a miss just keeps the existing flat window (the safe prior default,
// nothing regresses), and a brewer who added juice overwhelmingly describes
// it with a word like "juice" — that's the common case, not an edge case
// being guessed at. Checked English AND Dutch since the app is bilingual
// throughout — Dutch "sap" (juice) needs its own pattern since Dutch
// compounds it onto the fruit name with no space (appelsap, kersensap,
// druivensap), so a boundary BEFORE "sap" would never match; matching a
// boundary AFTER it instead ("…sap" at the end of a word) still correctly
// excludes an unrelated word that merely CONTAINS "sap" mid-word (e.g. the
// fruit "sapote", where "sap" isn't followed by a boundary at all).
function mwIsJuiceForm(item){
  var s=item||'';
  return /\b(juice|concentr|nectar)/i.test(s)||/sap\b/i.test(s);
}

// ---- Signals: derived facts about a batch ---------------------------------
function mwBatchSignals(b){
  if(!b)return null;
  var recipe=(typeof APP!=='undefined'&&APP.recipes)?getRecipe(b.recipeId):null;
  var status=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  var logs=((typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[]).filter(function(l){return l.gravity;})
    .slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  // Fruit sugar landing mid-ferment shows up as a gravity RISE (or a slower-
  // than-real drop) that has nothing to do with yeast activity — neither the
  // attenuation math nor projectFermentation's slope can tell the difference.
  // Flagged only when a logged fruit addition is BOTH inside the same
  // lookback window projectFermentation uses for its trend (its own last-
  // up-to-4-readings slice) AND genuinely recent — checked against TODAY,
  // not the last logged reading. Those are different clocks: the window
  // check answers "is this addition inside the data feeding the CURRENT
  // trend calc", but the 10-day ceiling answers "has enough real time
  // passed that the fruit's influence is likely gone" — a batch that gets
  // a reading 4 days after the addition and then goes quiet for 6 weeks has
  // genuinely dormant fruit by the time anyone opens it again, even though
  // the last reading itself was well inside the ceiling. 10 days is a
  // deliberately simple, deterministic ceiling (not a per-fruit-type decay
  // curve the app has no real data to back) — a bit past the app's own
  // "fruit typically sits 3-7 days" addition guidance (ADDITION_TYPES),
  // giving a small buffer for the tail of activity after the solids come
  // out but dissolved sugar is still working through.
  //
  // Juice/concentrate is the one real exception this app DOES have data to
  // back (see mwIsJuiceForm): its sugar is already dissolved, so it lands in
  // the very next reading with no multi-day extraction tail — a 10-day
  // ceiling would keep flagging the trend as fruit-skewed long after the
  // one-time step change already happened and was absorbed. Short ceiling
  // covers just "the very next reading might be a jump", not a lingering
  // trend distortion.
  var recentFruitAddition=null;
  if(logs.length){
    var _fruitWinStart=logs[Math.max(0,logs.length-4)].date;
    var _fruitAdds=((typeof APP!=='undefined'&&APP.additions&&APP.additions[b.id])||[])
      .filter(function(a){
        if(a.type!=='fruit'||!a.date||a.date<_fruitWinStart)return false;
        var ageDays=(typeof daysSince==='function')?daysSince(a.date):0;
        var ceiling=mwIsJuiceForm(a.item)?2:10;
        return ageDays>=0&&ageDays<=ceiling;
      })
      .sort(function(x,y){return(y.date||'').localeCompare(x.date||'');});
    if(_fruitAdds.length)recentFruitAddition={date:_fruitAdds[0].date,item:_fruitAdds[0].item||null,juiceForm:mwIsJuiceForm(_fruitAdds[0].item)};
  }
  var og=parseFloat(b.og)||(recipe&&recipe.ogTarget)||null;
  var lastG=logs.length?parseFloat(logs[logs.length-1].gravity):null;
  // "Confirmed stable" is the literal check this app's own guide text has
  // always promised before bottling ("two stable readings 5+ days apart")
  // — a real logged pair at least 5 days apart landing within 0.002 SG of
  // each other. Deliberately distinct from nearFG below (a projection/
  // attenuation ESTIMATE) — an estimate that "looks" done is not the same
  // as two actual measurements agreeing days apart, and that distinction
  // is exactly what matters before priming a sparkling batch: bottling on
  // an estimate that's wrong is the single most common real cause of
  // bottle bombs (leftover fermentable sugar + priming sugar + sealed
  // bottle = uncontrolled pressure).
  var gravityConfirmedStable=false;
  if(logs.length>=2){
    var _lastReading=logs[logs.length-1];
    for(var _gsi=logs.length-2;_gsi>=0;_gsi--){
      var _gapDays=Math.floor((new Date(_lastReading.date)-new Date(logs[_gsi].date))/86400000);
      if(_gapDays<5)continue;
      if(Math.abs(parseFloat(logs[_gsi].gravity)-parseFloat(_lastReading.gravity))<=0.002){gravityConfirmedStable=true;break;}
    }
  }
  var readings=logs.length;
  var daysSinceStart=(typeof daysSince==='function'&&b.startDate)?daysSince(b.startDate):null;
  // Needed early: temperature resolution below depends on knowing WHERE the
  // batch physically is right now (its fermenter, or its bottled cellar shelf).
  var bottling=(typeof APP!=='undefined'&&APP.bottling)?APP.bottling[b.id]:null;
  var bottled=!!bottling;
  var fermenter=(b.fermenterId&&typeof getFermenter==='function')?getFermenter(b.fermenterId):null;
  // Explicit brewer flag (see toggleBulkAging): "I've moved this somewhere
  // deliberately colder than active fermentation." Independent of the
  // auto-derived status, which is calendar/step-based and can still read
  // 'conditioning' for a batch that's already racked to bulk age.
  var bulkAging=!!b.bulkAging;

  // Targets: prefer the batch's actual yeast, fall back to recipe targets.
  // b.yeast is a single field with no history — an explicit decision, not an
  // oversight: it means "best-known yeast to reason about this batch with
  // GOING FORWARD", not a historical record of what fermented which part of
  // it. Editing it after a real mid-ferment repitch (e.g. the stuck-
  // fermentation rescue this app's own troubleshooting guide recommends)
  // retroactively applies the new strain's temperature range/attenuation/
  // tolerance/historical-matching to the WHOLE batch, including the days
  // the original strain was actually the one working. That's a real, known
  // simplification — modeling a true split (which strain did how much of
  // the fermentation) would need data this app has no way to capture, and
  // guessing at it would be exactly the fake precision this project
  // consistently avoids elsewhere. See the Edit Batch modal's yeast field
  // for the brewer-facing side of this same note.
  var yt=(og&&b.yeast&&typeof mwYeastTargets==='function')?mwYeastTargets(og,b.yeast):null;
  var targetFG=(yt&&yt.fg)||(recipe&&recipe.fgTarget)||1.000;
  var targetABV=(yt&&yt.abv)||(recipe&&recipe.abvTarget)||(og?parseFloat(calcABV(og,targetFG)):null);

  // Historical learning (E3): the brewer's OWN past batches, not generic lore.
  // Computed once here (not inside projectFermentation too) and threaded
  // through — mwHistoricalComparison scans+processes every other batch, so
  // calling it twice per signals pass was pure waste.
  var historical=(typeof mwHistoricalComparison==='function')?mwHistoricalComparison(b):null;
  var proj=(typeof projectFermentation==='function')?projectFermentation(b,historical):null;
  var attenuation=(og&&lastG!=null)?mwAttenuation(og,lastG):0;
  var expectedAttenuation=(og)?mwAttenuation(og,targetFG):0;
  var sugarBreak=(og)?mwSugarBreak(og,targetFG):null;
  var passedSugarBreak=(sugarBreak!=null&&lastG!=null)?(lastG<=sugarBreak):false;
  // Timeline: the SHAPE of the reading history (plateau, early-vs-recent pace),
  // not just the latest value — see mwFermentTimeline's own comment.
  var timeline=(typeof mwFermentTimeline==='function')?mwFermentTimeline(logs,sugarBreak):null;
  // Milestone ETA: predict WHEN (days out) the batch will likely cross the
  // sugar break, from the same recent rate the projection already computes —
  // proactive ("day 3") beats reactive ("hasn't crossed it yet").
  var daysToSugarBreak=(!passedSugarBreak&&sugarBreak!=null&&lastG!=null&&proj&&proj.ratePerDay>0)
    ?Math.ceil((lastG-sugarBreak)/proj.ratePerDay):null;

  // Nutrients
  var nut=(recipe&&typeof getNutrientStatus==='function')?getNutrientStatus(b,recipe):{done:0,expected:0};
  var nutrientsComplete=nut.expected>0?(nut.done>=nut.expected):(nut.total>0);

  // Temperature: prefer a LIVE sensor bound to where the batch physically is
  // right now — the assigned fermenter while active, the cellar cabinet it's
  // shelved in once bottled — over a hand-logged gravity-reading temp, which
  // goes stale the moment the batch moves on (and stops being taken at all
  // once bottled). Falls back to the last logged temp when no live sensor is
  // bound/available — Home Assistant is optional throughout this app.
  var liveTempReading=null, liveTempEntity=null;
  if(bottled){
    var shelfHit=(bottling&&bottling.cellarShelfId&&typeof findShelfById==='function')?findShelfById(bottling.cellarShelfId):null;
    var shelfCab=shelfHit&&shelfHit.cabinet;
    // Same entity resolution getCellarLiveTemp uses internally (cabinet's own
    // sensor, else the legacy single cellar sensor) — captured here too since
    // tempStable below needs the entity ID, not just the cached value.
    liveTempEntity=(shelfCab&&shelfCab.tempSensorEntity)||(typeof APP!=='undefined'&&APP.settings&&APP.settings.cellarTempSensorEntity)||null;
    liveTempReading=(typeof getCellarLiveTemp==='function')?getCellarLiveTemp(shelfCab):null;
  }else{
    liveTempEntity=(fermenter&&fermenter.tempSensorEntity)||null;
    liveTempReading=(fermenter&&typeof getFermenterLiveTemp==='function')?getFermenterLiveTemp(fermenter):null;
  }
  // A sensor can keep reporting its last-known value indefinitely without HA
  // ever marking it 'unavailable' (dead battery, disconnected probe, network
  // drop) — trusting it forever would silently prefer a stale number over a
  // fresher hand-logged one. lastChanged is HA's own "when did this reading
  // actually change" timestamp, not ours, so it's the real freshness signal.
  // 12h is generous relative to how often these sensors normally report
  // (minutes, not hours) while still catching a genuinely dead one — missing
  // lastChanged entirely (older cached data, or a source that doesn't supply
  // it) trusts the reading rather than guessing it's stale.
  var STALE_SENSOR_HOURS=12;
  var _sensorAgeHrs=liveTempReading&&liveTempReading.lastChanged!=null
    ?(Date.now()-new Date(liveTempReading.lastChanged).getTime())/3600000:null;
  // Guard against clock skew: if HA's clock (or the browser's) runs ahead,
  // lastChanged can land in the future, making the age negative — which
  // would otherwise satisfy "<=12h" as the freshest possible reading. A
  // negative age is nonsense, not evidence of freshness, so it's treated
  // the same as "too old" rather than "trust it more than anything else."
  var liveIsFresh=!!(liveTempReading&&liveTempReading.value!=null&&(
    _sensorAgeHrs==null||(_sensorAgeHrs>=0&&_sensorAgeHrs<=STALE_SENSOR_HOURS)
  ));
  var latestTemp=null, tempSource=null;
  if(liveIsFresh){
    latestTemp=parseFloat(liveTempReading.value);
    tempSource='live';
  }else{
    for(var i=logs.length-1;i>=0;i--){if(logs[i].temp!=null&&logs[i].temp!==''){latestTemp=parseFloat(logs[i].temp);tempSource='logged';break;}}
  }
  // pH: latest logged reading. Healthy mead ferment pH is ~3.0–3.4 (the app's own
  // logging help text); below 2.9 signals yeast stress, above 3.5 a contamination
  // risk. Optional — most brewers never log it, so this stays null until they do.
  var latestPH=null;for(var ip=logs.length-1;ip>=0;ip--){if(logs[ip].ph!=null&&logs[ip].ph!==''){latestPH=parseFloat(logs[ip].ph);break;}}
  var y=(typeof YEAST_STRAINS!=='undefined'&&b.yeast)?YEAST_STRAINS.filter(function(x){return x.id===b.yeast;})[0]:null;
  var tLow=(y&&y.optimalTempLow!=null)?y.optimalTempLow:16, tHigh=(y&&y.optimalTempHigh!=null)?y.optimalTempHigh:24;
  var tempInRange=(latestTemp!=null)?(latestTemp>=tLow-0.5&&latestTemp<=tHigh+0.5):null;
  // Stability: prefer the LIVE sensor's own recent history — a real continuous
  // record, not just whatever happened to be hand-logged at gravity-check
  // time — when the current reading is actually coming from a fresh live
  // sensor (tempSource==='live'). refreshAllSensorHistories() (04-server-ha.js)
  // polls HA's history endpoint on its own slower interval and caches it
  // exactly like window._liveSensorTemps does for the latest value, so this
  // stays a synchronous read here — mwBatchSignals() doesn't do I/O itself.
  // Falls back to the spread of the last 3 hand-logged temps when there's no
  // live history cached yet (HA not configured, or the history poll hasn't
  // run since load) — same threshold either way, not a different calibration.
  var liveHistory=(tempSource==='live'&&liveTempEntity&&typeof window!=='undefined')?(window._liveSensorHistory||{})[liveTempEntity]:null;
  var tempStable;
  if(liveHistory&&liveHistory.length>=2){
    var hVals=liveHistory.map(function(p){return p.value;});
    tempStable=(Math.max.apply(null,hVals)-Math.min.apply(null,hVals))<=2.0;
  }else{
    var recentT=logs.filter(function(l){return l.temp!=null&&l.temp!=='';}).slice(-3).map(function(l){return parseFloat(l.temp);});
    tempStable=recentT.length>=2?((Math.max.apply(null,recentT)-Math.min.apply(null,recentT))<=2.0):null;
  }

  // ABV headroom vs the strain's tolerance
  var currentABV=(og&&lastG!=null)?parseFloat(calcABV(og,lastG)):null;
  var abvMax=(y&&y.abvMax)||null;
  var nearTolerance=(currentABV!=null&&abvMax)?(currentABV>=abvMax-1.0):false;

  // Honey/yeast interaction: high-fructose honey (acacia, tupelo…) with a
  // non-fructophilic yeast is the classic late-stall risk. Facts only.
  var honeyName=mwResolveHoney(b,recipe);
  var honeyProf=(honeyName&&typeof HONEY_PROFILES!=='undefined')?HONEY_PROFILES[honeyName]:null;
  var honeyFructoseRisk=(honeyProf&&honeyProf.tech)?honeyProf.tech.fructoseRisk:null;   // 'critical'|'high'|'medium'|'low'
  var yeastFructophilic=!!(y&&y.fructophilic);
  var fructoseStallRisk=(!yeastFructophilic&&(honeyFructoseRisk==='high'||honeyFructoseRisk==='critical'));

  var active=(status==='fermenting'||status==='conditioning'||status==='aging');
  var fermenting=(status==='fermenting');

  // Reading recency — drives the data-quality nudges.
  var lastLogDate=logs.length?logs[logs.length-1].date:null;
  var daysSinceLastReading=(lastLogDate&&typeof daysSince==='function')?daysSince(lastLogDate):null;
  // Recipe character: sparkling (deliberately NOT stabilised) vs a still mead that
  // backsweetens (detected from a sorbate/stabilise step in the recipe).
  var sparkling=mwIsSparkling(recipe);
  var recipeBacksweetens=!sparkling&&!!(recipe&&recipe.steps&&recipe.steps.some(function(st){return /back-?sweeten|sorbate|stabili/i.test((st.title||'')+' '+(st.desc||''));}));
  // Aging model (shared with readiness): days since bottling vs ready→peak.
  // (bottling/bottled were resolved earlier — needed there for temperature source.)
  var ageAnchor=(bottling&&bottling.date)||b.startDate;
  var agedDays=(typeof daysSince==='function'&&ageAnchor)?daysSince(ageAnchor):null;
  // Custom/wizard-built recipes historically saved minDays/peakDays/maxDays
  // (no "Age") while built-in recipes use minAgeDays/peakAgeDays/maxAgeDays —
  // fall back to the older name so a custom recipe's own values are used
  // instead of silently defaulting for every non-built-in recipe.
  var readyDays=(recipe&&(recipe.minAgeDays||recipe.minDays))||60, peakDays=(recipe&&(recipe.peakAgeDays||recipe.peakDays))||240;
  // E6: the recipe's own maxAgeDays (real data, not invented) adds a fourth
  // phase — 'declining' — that mwReadiness() previously had no way to reach
  // (it capped at 'peak' forever). Worded honestly elsewhere as "typically",
  // not false-precise per-batch chemistry.
  var maxAgeDays=(recipe&&(recipe.maxAgeDays||recipe.maxDays))||null;
  var agePhase=(bottled&&agedDays!=null)?
    (maxAgeDays&&agedDays>=maxAgeDays?'declining':agedDays>=peakDays?'peak':(agedDays>=readyDays?'ready':'aging')):null;

  // Equipment: the fermenter actually assigned to this batch, if any — enables
  // a headspace / blow-off-risk check during vigorous primary fermentation.
  // (fermenter itself was resolved earlier — needed there for temperature source.)
  var volume=parseFloat(b.volume)||null;
  var fermenterCapacity=(fermenter&&parseFloat(fermenter.capacity))||null;
  // Racking history: real, already-logged (rackBatch()) — every racking
  // introduces some oxygen, and the app's own troubleshooting guide already
  // says "three is plenty, six is too many", but nothing applied that to a
  // specific batch's actual count until now.
  var rackingCount=(b.rackings||[]).length;
  var headspaceFrac=(fermenterCapacity&&volume)?((fermenterCapacity-volume)/fermenterCapacity):null;
  var recipeFermentDays=(recipe&&recipe.fermentDays)||null;
  // Recipe's own target for bulk/secondary aging BEFORE bottling — distinct
  // from minAgeDays/peakAgeDays/maxAgeDays, which are POST-bottling. Used by
  // extendedBulkAging below instead of a flat one-size-fits-all day count.
  var recipeBulkAgeDays=(recipe&&recipe.bulkAgeDays)||null;
  // Expectations Engine (v1, fermentation duration): a real yeast-speed-aware
  // range instead of a single flat day count — "18-30 days" beats a lone "24".
  var yeastSpeed=(y&&y.speed)||null;
  var expectedFermentRange=(recipeFermentDays&&typeof mwExpectedFermentDuration==='function')?mwExpectedFermentDuration(recipeFermentDays,yeastSpeed):null;
  // Progress band: where THIS batch's elapsed days sit relative to the
  // expected range, as a banded status rather than a modeled curve — a
  // fermentation doesn't follow one "correct" line, so this only ever claims
  // a position (ahead/on-track/watch/behind), never a precise expected value.
  // 'watch' is a 15%-over-range pre-warning zone, ahead of the 'fermenting-long'
  // rule's harder threshold at expectedFermentRange.high.
  var fermentProgress=(fermenting&&expectedFermentRange&&daysSinceStart!=null)?(function(){
    var lo=expectedFermentRange.low,hi=expectedFermentRange.high,exp=expectedFermentRange.expected;
    var watchEdge=Math.round(hi*1.15);
    var phase=daysSinceStart<lo?'ahead':daysSinceStart<=hi?'on-track':daysSinceStart<=watchEdge?'watch':'behind';
    return {phase:phase,pct:exp>0?Math.round(daysSinceStart/exp*100):null,days:daysSinceStart,low:lo,high:hi,expected:exp};
  })():null;

  // Cider mode: beverageType branches a handful of rules/text below (pH
  // targets, MLF, wording) that otherwise assume mead. styleId + mlfStance
  // ('encouraged'|'neutral'|'avoid') come straight from the recipe's own
  // CIDER_STYLES/CIDER_MLF_BY_STYLE data — never guessed for an unknown style.
  var beverageType=b.beverageType||(recipe&&recipe.beverageType)||'mead';
  var styleId=(recipe&&recipe.styleId)||null;
  var mlfStance=(beverageType==='cider'&&styleId&&typeof CIDER_MLF_BY_STYLE!=='undefined')?(CIDER_MLF_BY_STYLE[styleId]||null):null;

  return {
    recipeId:b.recipeId, status:status, active:active, fermenting:fermenting,
    og:og, lastG:lastG, gravityConfirmedStable:gravityConfirmedStable, readings:readings, daysSinceStart:daysSinceStart, recentFruitAddition:recentFruitAddition,
    targetFG:targetFG, targetABV:targetABV, currentABV:currentABV,
    attenuation:attenuation, expectedAttenuation:expectedAttenuation,
    ratePerDay:proj?proj.ratePerDay:null, daysToFG:proj?proj.daysToFG:null,
    doneMs:proj?proj.doneMs:null, estFG:proj?proj.estFG:null,
    stalled:proj?proj.stalled:false, nearFG:proj?proj.nearFG:false, nearFGReason:proj?proj.nearFGReason:null,
    sugarBreak:sugarBreak, passedSugarBreak:passedSugarBreak, daysToSugarBreak:daysToSugarBreak,
    timeline:timeline,
    nutrientsDone:nut.done, nutrientsExpected:nut.expected, nutrientsComplete:nutrientsComplete,
    latestTemp:latestTemp, tempSource:tempSource, tempLow:tLow, tempHigh:tHigh, tempInRange:tempInRange, tempStable:tempStable, latestPH:latestPH, bulkAging:bulkAging,
    abvMax:abvMax, nearTolerance:nearTolerance, yeastId:b.yeast||null,
    daysSinceLastReading:daysSinceLastReading,
    honeyName:honeyName, honeyFructoseRisk:honeyFructoseRisk, yeastFructophilic:yeastFructophilic, fructoseStallRisk:fructoseStallRisk,
    sparkling:sparkling, recipeBacksweetens:recipeBacksweetens,
    bottled:bottled, agedDays:agedDays, readyDays:readyDays, peakDays:peakDays, maxAgeDays:maxAgeDays, agePhase:agePhase,
    volume:volume, fermenterCapacity:fermenterCapacity, headspaceFrac:headspaceFrac, rackingCount:rackingCount, recipeFermentDays:recipeFermentDays, recipeBulkAgeDays:recipeBulkAgeDays,
    yeastSpeed:yeastSpeed, expectedFermentRange:expectedFermentRange, fermentProgress:fermentProgress,
    historical:historical,
    beverageType:beverageType, styleId:styleId, mlfStance:mlfStance
  };
}

// ---- Batch narrative (E5): a chronological story built ONLY from real
// logged events — start, sugar-break crossing, actual logged additions, a
// real plateau (reusing the same timeline analyzer the signals pipeline
// uses), a real bottling record. Never invented beats. Each item is
// {type,date,data} — the view (12-advisor.js) is the only place a type
// becomes a sentence, same contract as the rules above.
function mwBatchNarrative(b){
  if(!b)return [];
  var beats=[];
  if(b.startDate)beats.push({type:'started',date:b.startDate,data:{og:parseFloat(b.og)||null,yeast:b.yeast||null}});

  var logs=((typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[]).filter(function(l){return l.gravity!=null&&l.gravity!=='';})
    .slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});

  var og=parseFloat(b.og)||null;
  var recipe=(typeof APP!=='undefined'&&APP.recipes)?getRecipe(b.recipeId):null;
  var yt=(og&&b.yeast&&typeof mwYeastTargets==='function')?mwYeastTargets(og,b.yeast):null;
  var targetFG=(yt&&yt.fg)||(recipe&&recipe.fgTarget)||1.000;
  var sugarBreak=(og&&typeof mwSugarBreak==='function')?mwSugarBreak(og,targetFG):null;
  if(sugarBreak!=null){
    var crossed=logs.filter(function(l){return parseFloat(l.gravity)<=sugarBreak;})[0];
    if(crossed)beats.push({type:'sugar-break',date:crossed.date,data:{gravity:parseFloat(crossed.gravity),sugarBreak:sugarBreak}});
  }

  ((typeof APP!=='undefined'&&APP.additions&&APP.additions[b.id])||[]).slice()
    .sort(function(a,c){return(a.date||'').localeCompare(c.date||'');})
    .forEach(function(a){beats.push({type:'addition',date:a.date,data:{item:a.item,amount:a.amount}});});

  // Rackings: real, already-logged vessel moves (rackBatch()) — raw fermenter
  // ids only, same "facts here, sentence in the view" contract as every
  // other beat; the view resolves names via getFermenter().
  (b.rackings||[]).forEach(function(r){
    if(r.date)beats.push({type:'racked',date:r.date,data:{from:r.fromFermenterId||null,to:r.toFermenterId||null,notes:r.notes||null}});
  });

  var timeline=(typeof mwFermentTimeline==='function')?mwFermentTimeline(logs,sugarBreak):null;
  if(timeline&&timeline.plateaued)beats.push({type:'plateau',date:timeline.plateauSince,data:{days:timeline.plateauDays,beforeBreak:timeline.stalledBeforeBreak}});

  // Tastings: real, dated checkpoints the brewer chose to log — can happen
  // mid-aging, not just after bottling, so they're a genuine part of the
  // story rather than a separate, disconnected tab.
  ((typeof APP!=='undefined'&&APP.tastings&&APP.tastings[b.id])||[]).forEach(function(t){
    if(t.date)beats.push({type:'tasted',date:t.date,data:{rating:t.rating||null,note:t.note||null}});
  });

  // Competition entries: a real, dated highlight (or just an entry) — often
  // the single most memorable thing that happened to a batch.
  ((typeof APP!=='undefined'&&APP.competitions&&APP.competitions[b.id])||[]).forEach(function(c){
    if(c.date)beats.push({type:'competition',date:c.date,data:{competition:c.competition||null,category:c.category||null,award:c.award||null,score:c.score||null,maxScore:c.maxScore||null}});
  });

  var bottling=(typeof APP!=='undefined'&&APP.bottling)?APP.bottling[b.id]:null;
  if(bottling&&bottling.date)beats.push({type:'bottled',date:bottling.date,data:{fg:bottling.fg,abv:bottling.abv}});

  // Failed: a real terminal event — without it, a failed batch's story just
  // stops with no explanation, which reads as a gap rather than an ending.
  if(b.failed&&b.failed.date)beats.push({type:'failed',date:b.failed.date,data:{category:b.failed.category||null,whatWentWrong:b.failed.whatWentWrong||null}});

  beats.sort(function(x,y){return(x.date||'').localeCompare(y.date||'');});
  return beats;
}

// ---- Confidence: honest, derived from how much signal we actually have, and
// it reports the REASONS behind the number (the view localizes the codes). -----
function mwConfidence(s){
  if(!s)return {value:0.3,reasons:['readings-one']};
  var c=0.45,reasons=[];
  if(s.readings>=2)c+=0.15;
  if(s.readings>=4)c+=0.15;
  if(s.readings>=8)c+=0.1;
  reasons.push(s.readings>=8?'readings-many':s.readings>=4?'readings-several':s.readings>=2?'readings-few':'readings-one');
  if(s.ratePerDay!=null&&s.ratePerDay>0){c+=0.1;reasons.push('rate-steady');}
  if(s.tempStable===true){c+=0.05;reasons.push('temp-stable');}
  if(s.yeastId)reasons.push('known-yeast');
  return {value:Math.min(0.99,Math.round(c*100)/100),reasons:reasons};
}

// ---- Weighted multi-cause diagnosis (stalled fermentation) ----------------
// A real stall is often more than one thing at once (under-nutrition AND a
// touch cold) — a ranked list of {cause,weight,evidence} beats a single
// first-match guess. Base weights follow the troubleshooting-guide priority
// order (under-nutrition is the most common culprit); the timeline signal
// (mwFermentTimeline) then nudges every candidate: a plateau that started
// BEFORE the sugar break is more clearly a real problem, one that started
// at/after the break reads more like a normal end-of-ferment tail-off.
function mwStalledCauses(s){
  var causes=[];
  if(!s.nutrientsComplete)causes.push({cause:'nutrition',weight:0.75,evidence:['nutrients-incomplete']});
  // Honey has very little pH buffering capacity — a must can swing from
  // ~4.3 to ~3.1 over the course of fermentation, a far bigger drop than
  // beer or wine ever see (which have much more buffering). A pH below the
  // same 2.9 threshold the ph-low rule already uses is a well-documented,
  // mead-specific cause of a real stall on its own — not a secondary note.
  if(s.latestPH!=null){
    var isCiderPH=s.beverageType==='cider';
    var phStallLo=isCiderPH?(typeof CIDER_PH_TARGET_LOW!=='undefined'?CIDER_PH_TARGET_LOW:3.3):2.9;
    if(s.latestPH<phStallLo)causes.push({cause:'ph',weight:0.65,evidence:['low-ph']});
  }
  if(s.fructoseStallRisk)causes.push({cause:'fructose',weight:0.55,evidence:['high-fructose-honey','non-fructophilic-yeast']});
  if(s.nearTolerance)causes.push({cause:'tolerance',weight:0.7,evidence:['near-abv-tolerance']});
  if(s.tempInRange===false&&!s.bulkAging)causes.push({cause:'temperature',weight:0.5,evidence:['temp-out-of-range']});
  var t=s.timeline;
  if(t&&t.stalledBeforeBreak){
    causes.forEach(function(c){c.weight=Math.min(0.95,mwRound(c.weight+0.1,2));c.evidence.push('stalled-before-break');});
  }else if(t&&t.slowedNearFinish){
    causes.forEach(function(c){c.weight=Math.max(0.15,mwRound(c.weight-0.15,2));c.evidence.push('slowed-near-finish');});
  }
  if(!causes.length)causes.push({cause:'unknown',weight:0.3,evidence:['no-specific-cause-matched']});
  causes.sort(function(a,b){return b.weight-a.weight;});
  return causes;
}

// ---- Rules: each reads signals, returns a recommendation or null ----------
// Every recommendation carries a `category` (fermentation · nutrition · oxygen ·
// temperature · stabilisation · aging · data) so the view can group them.
// The rules themselves live in two sibling files, split by lifecycle phase —
// 03f-advisor-rules-fermentation.js (active fermentation + data-quality) and
// 03g-advisor-rules-packaging.js (stabilise/carbonate/rack/bottle/age) — this
// is just the concatenator every caller (mwBatchAdvice, mwWhatIf, test.html's
// ruleByName) already expects a single flat array from. Guarded with
// typeof-checks purely for load-order robustness, same convention used
// throughout this codebase for cross-file calls.
function _advRules(){
  return [].concat(
    (typeof _advRulesFermentation==='function')?_advRulesFermentation():[],
    (typeof _advRulesPackaging==='function')?_advRulesPackaging():[]
  );
}

// ---- Health score: weighted 0..100 with a breakdown -----------------------
function mwBatchHealth(s){
  if(!s)return null;
  function comp(known,val,code,data){return {known:known,val:known?Math.max(0,Math.min(100,Math.round(val))):null,code:code,data:data||{}};}

  // Temperature: known once a temp's been logged; otherwise the axis is
  // excluded rather than guessed at. Also excluded (not penalised) once the
  // brewer flags the batch as deliberately cold for bulk aging — the yeast's
  // fermentation range isn't the right yardstick there (see toggleBulkAging).
  var temp;
  if(s.bulkAging)temp=comp(false,null,'no-data');
  else if(s.tempInRange==null)temp=comp(false,null,'no-data');
  else if(!s.tempInRange)temp=comp(true,55,'out-of-range',{temp:s.latestTemp,low:s.tempLow,high:s.tempHigh,cold:s.latestTemp<s.tempLow});
  else if(s.tempStable===false)temp=comp(true,85,'in-range-unstable',{low:s.tempLow,high:s.tempHigh});
  else temp=comp(true,100,'in-range-stable',{low:s.tempLow,high:s.tempHigh});

  // Nutrition: doses actually added vs the schedule's expected count.
  var nutr;
  if(s.nutrientsExpected>0)nutr=comp(true,(s.nutrientsDone/s.nutrientsExpected*100),
    s.nutrientsDone>=s.nutrientsExpected?'doses-complete':'doses-partial',{done:s.nutrientsDone,expected:s.nutrientsExpected});
  else if(s.nutrientsDone>0)nutr=comp(true,100,'doses-logged',{done:s.nutrientsDone});
  else nutr=comp(false,null,'no-data');

  // Gravity progress: on track vs expected attenuation (only meaningful while active).
  var grav;
  if(s.active&&s.og){
    if(s.stalled)grav=comp(true,40,'stalled',{atten:Math.round(s.attenuation*100)});
    else if(s.nearFG)grav=comp(true,100,'near-target',{});
    else{var ratio=s.expectedAttenuation>0?(s.attenuation/s.expectedAttenuation):1;
      grav=comp(true,60+Math.min(40,ratio*40),'on-track',{pct:Math.round(Math.min(1,ratio)*100)});}
  }else grav=comp(false,null,'no-data');

  // Oxygen management: penalised only if past the break and still actively
  // fermenting (the window where aeration actively risks oxidation).
  var oxy;
  if(s.sugarBreak==null)oxy=comp(false,null,'no-data');
  else if(s.passedSugarBreak&&s.fermenting)oxy=comp(true,90,'past-break-fermenting',{});
  else oxy=comp(true,100,'ok',{});

  // Yeast health: stall / tolerance pressure.
  var yeast;
  if(s.og==null)yeast=comp(false,null,'no-data');
  else if(s.stalled)yeast=comp(true,45,'stress-stalled',{});
  else if(s.nearTolerance&&!s.nearFG)yeast=comp(true,75,'near-tolerance',{max:s.abvMax});
  else yeast=comp(true,100,'ok',{});

  var parts=[{k:'temperature',w:0.25,c:temp},{k:'nutrition',w:0.2,c:nutr},{k:'gravity',w:0.3,c:grav},{k:'oxygen',w:0.12,c:oxy},{k:'yeast',w:0.13,c:yeast}];
  var sw=0,acc=0,breakdown={},axisReasons={};
  parts.forEach(function(p){
    breakdown[p.k]=p.c.val;
    axisReasons[p.k]={code:p.c.code,data:p.c.data,weight:p.w,known:p.c.known};
    if(p.c.known){sw+=p.w;acc+=p.w*p.c.val;}
  });
  var score=sw>0?Math.round(acc/sw):null;
  var band=score==null?'unknown':(score>=90?'excellent':score>=75?'good':score>=55?'fair':'attention');
  return {score:score,band:band,breakdown:breakdown,axisReasons:axisReasons};
}

// ---- Readiness: "can I drink it yet?" 0..100, tied to the aging model ------
function mwReadiness(b){
  if(!b)return null;
  var s=mwBatchSignals(b);
  if(!s)return null;
  if(s.status==='failed')return {pct:0,phase:'failed'};
  // Pre-bottling: readiness tracks fermentation progress, capped low (not drinkable
  // yet). Gate on s.bottled (an actual bottling record), not the status string —
  // getBatchStatus()'s calendar fallback can label a neglected, never-bottled batch
  // 'aging', which must NOT fall through to the post-bottling drink-window math below.
  if(!s.bottled){
    return {pct:Math.round(Math.min(0.30,(s.attenuation||0)*0.30)*100),phase:'fermenting'};
  }
  // Bottled / aging: drive off elapsed aging vs the recipe's ready→peak window
  // (the same agedDays / readyDays / peakDays the aging-window rule uses).
  var aged=s.agedDays!=null?s.agedDays:0, ready=s.readyDays, peak=s.peakDays;
  var pct;
  if(aged>=peak)pct=100;
  else if(aged>=ready)pct=70+Math.round((aged-ready)/Math.max(1,(peak-ready))*30);  // 70→100 across ready→peak
  else pct=30+Math.round(aged/Math.max(1,ready)*40);                                 // 30→70 across 0→ready
  // Phase comes straight from the signal (s.agePhase) rather than being
  // re-derived here — one source of truth, and it's the only place that
  // knows about the 'declining' (past maxAgeDays) stage.
  return {pct:Math.max(0,Math.min(100,pct)),phase:s.agePhase||(aged>=peak?'peak':(aged>=ready?'ready':'aging')),readyDays:ready,peakDays:peak,agedDays:aged};
}

// ---- Ephemeral memo: version the INPUTS, memoise the OUTPUT, never persist --
// The advice is a pure function of the batch's data, so we cache one snapshot per
// batch keyed by a cheap signature of every input that can change it (logs, OG,
// yeast, ticked steps, bottling, additions). When any input changes the signature
// changes and we recompute — so it can never go stale, and repeated reads in one
// render (dashboard row + overview + advisor tab) cost nothing. Not serialised.
var _mwAdviceMemo={};
function _mwAdviceSig(b){
  var logs=(typeof getBatchLogs==='function')?getBatchLogs(b.id):((typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[]);
  var last=logs.length?logs[logs.length-1]:{};
  // Content, not just count — un-marking one step and marking a different one
  // in the same edit would leave a plain count unchanged, and getNutrientStatus
  // reads WHICH steps are done, not how many.
  var doneKeys=[],td=(typeof APP!=='undefined'&&APP.tasksDone)||{},pre=b.id+'-step-';
  for(var k in td){if(td.hasOwnProperty(k)&&k.indexOf(pre)===0)doneKeys.push(k);}
  doneKeys.sort();
  var bot=(typeof getBottleInfo==='function')?getBottleInfo(b.id):((typeof APP!=='undefined'&&APP.bottling&&APP.bottling[b.id])||null);
  var recipe=(typeof getRecipe==='function')?getRecipe(b.recipeId):null;
  // Domain-aligned time: key off the actual age integers the output depends on
  // (fermentation age + days bottled), not wall-clock — invalidates as the batch
  // ages, with no midnight-boundary artifact.
  var ageF=(typeof daysSince==='function'&&b.startDate)?daysSince(b.startDate):0;
  var ageB=(typeof daysSince==='function'&&bot&&bot.date)?daysSince(bot.date):0;
  // Everything below closes real invalidation gaps found in review: each is a
  // real input to mwBatchSignals() that could change WITHOUT touching any of
  // the fields above, silently leaving stale (and now frozen, so unfixable by
  // accidental mutation) advice cached.
  //  - b.fermenterId: reassigning the batch to a different fermenter changes
  //    both its live-temp sensor binding and its headspace/capacity.
  //  - bot (whole record, not just .date): a bottled batch's cellarShelfId
  //    picks which cabinet's live sensor applies; stringifying the whole
  //    record is simpler and safer than hand-picking fields that could drift
  //    out of sync with whatever mwBatchSignals ends up reading from it.
  //  - recipe (whole object): editing an in-use recipe's targets/steps/aging
  //    windows previously didn't invalidate any batch already using it.
  //  - additions (whole array, not just .length): editing an existing
  //    addition's date/type/item — e.g. correcting it to type:'fruit' — kept
  //    the same length and silently never invalidated the fruit-addition
  //    signal that depends on exactly that content.
  //  - b.customSteps: a per-batch step override changes nutrient-schedule
  //    math without touching any recipe or logged field.
  //  - live sensor cache: an HA sensor updating is the single most frequent
  //    real-world change of all, and previously invalidated NOTHING on its
  //    own — advice could go stale on temperature specifically until some
  //    unrelated field happened to change too. Hashing the whole cache
  //    over-invalidates slightly (an unrelated sensor updating also
  //    invalidates batches that don't care) but that's cheap insurance, not
  //    a real cost — recompute is pure and inexpensive next to getting this
  //    wrong.
  //  - b.bulkAging: a direct input to the temperature rule/health axis (see
  //    toggleBulkAging) — without it, flipping the toggle wouldn't invalidate
  //    the memo and stale advice would linger until something else changed.
  //  - live sensor HISTORY cache: the same real gap as liveTemps below, now
  //    that tempStable can read window._liveSensorHistory too (see the live-
  //    history branch in mwBatchSignals). A compact fingerprint (entity +
  //    point count + last value), not the full point arrays — a 72h history
  //    per sensor can be hundreds of points, too heavy to stringify whole on
  //    every signature computation for no extra invalidation accuracy.
  //  - sibling-batch fingerprint: mwHistoricalComparison() reads EVERY OTHER
  //    batch's yeast/honey/recipe/bottling/tastings, not just b's own fields
  //    hashed above — editing or deleting a DIFFERENT batch changes what
  //    "your own average" means for THIS one (previously a documented,
  //    accepted gap — see mwHistoricalComparison's own comment). A per-
  //    mutation-site version counter would need a bump at every batch
  //    create/edit/delete/bottle/tasting call site — the same piecemeal
  //    approach that produced several of the gaps above when done for a
  //    single batch's own fields. Hashing a cheap summary of the whole pool
  //    here instead can't miss a site, and at this app's real scale (a few
  //    dozen batches, ever) an O(n) pass per signature is free. Includes each
  //    sibling's own RECIPE object (whole, not cherry-picked fields — same
  //    "stringify the whole record" reasoning as `recipe` below): a sibling
  //    with no explicit og/honeyType falls back to ITS recipe's
  //    ogTarget/honey list inside mwHistoricalComparison's statsFor(), and
  //    the fallback-tier matching also depends on mwIsSparkling(that
  //    recipe) — hashing only o.recipeId (an id that doesn't change when
  //    the recipe IT POINTS TO is edited) missed exactly that case.
  var liveTemps=(typeof window!=='undefined'&&window._liveSensorTemps)||{};
  var liveHistoryCache=(typeof window!=='undefined'&&window._liveSensorHistory)||{};
  var liveHistorySig=Object.keys(liveHistoryCache).sort().map(function(k){
    var pts=liveHistoryCache[k]||[];
    var lastPt=pts.length?pts[pts.length-1]:null;
    return k+':'+pts.length+':'+(lastPt?lastPt.value:'');
  }).join(',');
  var siblingFingerprint=((typeof APP!=='undefined'&&APP.batches)||[]).map(function(o){
    if(o.id===b.id)return '';
    var obot=(typeof APP!=='undefined'&&APP.bottling&&APP.bottling[o.id])||null;
    var ologs=(typeof APP!=='undefined'&&APP.logs&&APP.logs[o.id])||[];
    var olast=ologs.length?ologs[ologs.length-1]:null;
    var ots=(typeof APP!=='undefined'&&APP.tastings&&APP.tastings[o.id])||[];
    var orecipe=(typeof getRecipe==='function')?getRecipe(o.recipeId):null;
    return [o.id,o.recipeId,o.yeast,o.og,mwResolveHoney(o,orecipe),o.failed?1:0,
      JSON.stringify(orecipe||{}),
      obot?obot.date+','+obot.fg:'',olast?olast.date:'',
      ots.map(function(t){return t.rating;}).join(',')].join(':');
  }).join('|');
  // ChatGPT round 9: this signature is effectively the Advisor's dependency
  // manifest now, not just a cache key — naming each fragment (rather than
  // building the final array with JSON.stringify(...) calls inline) is what
  // makes "what does mwBatchSignals() actually depend on" reviewable at a
  // glance, and gives whoever adds the NEXT dependency an obvious pattern to
  // follow (one named local, added to the array below) instead of having to
  // parse a wall of inline expressions to see where theirs should go.
  var botSig=bot?JSON.stringify(bot):0;
  var recipeSig=JSON.stringify(recipe||{});
  var additionsSig=JSON.stringify(((typeof APP!=='undefined'&&APP.additions&&APP.additions[b.id])||[]));
  var customStepsSig=JSON.stringify(b.customSteps||[]);
  var liveTempsSig=JSON.stringify(liveTemps);
  return [b.id,b.recipeId,b.og,b.yeast,b.startDate,b.failed?1:0,b.fermenterId||0,
    logs.length,last.date,last.gravity,last.temp,last.ph,doneKeys.join(','),
    botSig,ageF,ageB,b.bulkAging?1:0,
    recipeSig,additionsSig,customStepsSig,liveTempsSig,
    liveHistorySig,siblingFingerprint
  ].join('|');
}

// ---- The single snapshot every view consumes ------------------------------
// Recursively freezes an object/array tree. The advice snapshot below is
// handed by REFERENCE to every consumer that reads it in the same render
// pass (dashboard row + overview strip + advisor tab, per mwBatchAdvice's
// own memoization comment) — a stray `item.data.x=y` in any one of them
// would silently corrupt what every other consumer sees, for as long as the
// memo stays valid. Freezing turns that into an immediate thrown error
// (files load with 'use strict') instead of a quiet, hard-to-trace bug.
function _mwDeepFreeze(o){
  if(o===null||typeof o!=='object'||Object.isFrozen(o))return o;
  Object.getOwnPropertyNames(o).forEach(function(k){_mwDeepFreeze(o[k]);});
  return Object.freeze(o);
}
function mwBatchAdvice(b){
  if(!b)return null;
  var sig=_mwAdviceSig(b), cached=_mwAdviceMemo[b.id];
  if(cached&&cached.sig===sig)return cached.val;
  var s=mwBatchSignals(b);
  if(!s)return null;
  var cf=mwConfidence(s), conf=cf.value;
  var items=_advRules().map(function(rule){var v=rule(s);if(!v)return null;if(v.confidence==null)v.confidence=conf;return v;}).filter(Boolean);
  // Order: critical → recommended → info
  var rank={critical:0,recommended:1,info:2};
  items.sort(function(a,c){return rank[a.severity]-rank[c.severity];});
  var health=mwBatchHealth(s);
  // Trend: compare to the score from the previous recompute (different signature =
  // an input changed, e.g. a new reading). Pure, no persistence; resets per session.
  if(health&&cached&&cached.val&&cached.val.health&&cached.val.health.score!=null&&health.score!=null){
    health.trend=health.score-cached.val.health.score;
  }
  var val={signals:s, items:items, health:health, readiness:mwReadiness(b), confidence:conf, confidenceReasons:cf.reasons};
  _mwDeepFreeze(val);
  _mwAdviceMemo[b.id]={sig:sig,val:val};
  return val;
}

// ---- What-if simulator (E7): re-run the EXISTING signals→rules pipeline
// with one signal hypothetically overridden — "if X were already true, what
// would the advisor say?" No invented physics, no new numeric precision:
// the exact same pure rule functions run against a real signal object with
// one or more fields swapped, same as they run against the real one.
function mwWhatIf(b,overrides){
  var s=mwBatchSignals(b);
  if(!s)return null;
  var s2=Object.assign({},s,overrides||{});
  var rules=_advRules();
  function run(sig){return rules.map(function(rule){return rule(sig);}).filter(Boolean);}
  var before=run(s), after=run(s2);
  var beforeById={};before.forEach(function(i){beforeById[i.id]=i;});
  var afterById={};after.forEach(function(i){afterById[i.id]=i;});
  return {
    before:before, after:after,
    resolved:before.filter(function(i){return !afterById[i.id];}).map(function(i){return i.id;}),
    newlyAppeared:after.filter(function(i){return !beforeById[i.id];}).map(function(i){return i.id;}),
    changed:after.filter(function(i){return beforeById[i.id]&&beforeById[i.id].severity!==i.severity;})
      .map(function(i){return {id:i.id,from:beforeById[i.id].severity,to:i.severity};})
  };
}

// ---- Cross-batch ingredient performance (power-user analytics) -------------
// Aggregates outcomes per yeast and per honey across ALL batches: count, avg
// best-tasting rating, avg final ABV, avg attenuation, and failure rate. Pure
// read over APP; one pass. Consumed by the Insights view.
function mwIngredientStats(){
  var rmap={};((typeof APP!=='undefined'&&APP.recipes)||[]).forEach(function(r){rmap[r.id]=r;});
  var byY={}, byH={};
  function bucket(map,key){if(key==null||key==='')return null;if(!map[key])map[key]={key:key,n:0,rsum:0,rn:0,abvsum:0,abvn:0,attsum:0,attn:0,fail:0};return map[key];}
  // View filter (cider mode): a yeast like EC-1118 is used by both mead and
  // cider recipes — without this, "ingredient performance" would silently
  // average a cider batch's numbers into a mead yeast's stats and vice versa.
  (typeof visibleBatches==='function'?visibleBatches():((typeof APP!=='undefined'&&APP.batches)||[])).forEach(function(b){
    var recipe=rmap[b.recipeId];
    var bot=(typeof APP!=='undefined'&&APP.bottling&&APP.bottling[b.id])||null;
    var og=parseFloat(b.og)||(recipe&&recipe.ogTarget)||null;
    var logs=(typeof APP!=='undefined'&&APP.logs&&APP.logs[b.id])||[];
    var lastG=null;for(var i=logs.length-1;i>=0;i--){if(logs[i].gravity){lastG=parseFloat(logs[i].gravity);break;}}
    var finalG=(bot&&parseFloat(bot.fg))||lastG||null;
    var atten=(og&&og>1&&finalG)?((og-finalG)/(og-1)*100):null;
    var ts=(typeof APP!=='undefined'&&APP.tastings&&APP.tastings[b.id])||[];
    var rated=ts.filter(function(t){return t.rating;});
    var rating=rated.length?Math.max.apply(null,rated.map(function(t){return t.rating;})):null;
    var abv=bot?parseFloat(bot.abv):null;
    var failed=b.failed?1:0;
    [bucket(byY,b.yeast),bucket(byH,b.honeyType)].forEach(function(m){
      if(!m)return;
      m.n++;
      if(rating!=null){m.rsum+=rating;m.rn++;}
      if(abv!=null&&!isNaN(abv)){m.abvsum+=abv;m.abvn++;}
      if(atten!=null&&!isNaN(atten)){m.attsum+=atten;m.attn++;}
      m.fail+=failed;
    });
  });
  function fin(map){return Object.keys(map).map(function(k){var m=map[k];return {
    key:k,n:m.n,rated:m.rn,
    avgRating:m.rn?m.rsum/m.rn:null,
    avgABV:m.abvn?m.abvsum/m.abvn:null,
    avgAtten:m.attn?m.attsum/m.attn:null,
    failRate:m.n?m.fail/m.n:0
  };}).sort(function(a,b){return (b.avgRating||0)-(a.avgRating||0)||b.n-a.n;});}
  return {byYeast:fin(byY),byHoney:fin(byH)};
}

// ---- Historical learning (E3): compare THIS batch to the brewer's OWN past
// batches — not generic brewing lore. Prefers other batches of the same
// recipe; falls back to same yeast if there aren't at least 2 of those.
// Honest about needing real history: null (not a guess) with fewer than 2
// comparable past batches.
//
// Cache invalidation: _mwAdviceSig(b) hashes a fingerprint of every OTHER
// batch's yeast/honey/recipe/bottling/tastings too (not just b's own fields),
// specifically because this function reads all of that. Editing or deleting
// a SIBLING batch changes what "your own average" means for THIS one, so it
// has to invalidate THIS one's cached advice even though none of b's own
// fields moved. Previously an accepted, documented gap (a real per-mutation-
// site version counter felt like too big an addition for how narrow the
// failure mode was); fixed by fingerprinting the whole pool instead, which
// needed no new counter and can't miss a mutation site.
//
// Separate, deliberate semantic decision (not a bug, and not the same as the
// caching gap above — this would be equally true with PERFECT invalidation):
// this function always reads APP.batches as it stands TODAY, not a frozen
// snapshot of "who had finished, and with what numbers, at the moment THIS
// batch first got compared." If you go back and correct a typo'd OG on an
// old batch, every future comparison against it uses the corrected number —
// including for a batch that was already advised using the old, wrong one.
// "Your own past batches" means CURRENT best-known truth about them, same
// philosophy as the yeast-edit decision above mwBatchSignals — not an
// immutable historical record. The alternative (snapshotting each past
// batch's stats at comparison time) would need real persisted state for a
// property nobody's asked for; this app doesn't persist advisor state
// anywhere else either (see mwBatchAdvice's own comment).
//
// A sharper version of the same consequence (ChatGPT round 9): this applies
// to RECIPES too, and a recipe edit can be more than a data correction — if
// you substantially revise a recipe's schedule or targets, every past batch
// that used it is still pooled as "your history with this recipe," even
// though the batches that actually fermented may have followed a
// meaningfully different process than the recipe now describes. Still the
// same intentional model (current best-known truth, not a frozen record),
// not a bug — just worth naming explicitly here rather than leaving it as
// an inference from the OG-typo example above, since a recipe rewrite
// changes what "the same recipe" even means in a way a single-field
// correction doesn't.
function mwHistoricalComparison(b){
  if(!b)return null;
  // Scoped to b's OWN beverage type (not the ambient active-mode toggle) —
  // this reasons about a specific batch, so it must stay correct regardless
  // of whatever mode the header happens to be showing. Otherwise a mead
  // batch on EC-1118 could get pooled with a cider batch on EC-1118. Also
  // excludes failed batches — a contaminated/dumped batch never reached a
  // normal attenuation or finish time, so it says nothing about "how long
  // does MY process normally take" and would only skew the average toward
  // an outcome nobody's actually aiming to repeat.
  var bBev=b.beverageType||'mead';
  var all=((typeof APP!=='undefined'&&APP.batches)||[]).filter(function(o){return(o.beverageType||'mead')===bBev&&!o.failed;});
  // Honey resolves the same way mwBatchSignals() does: explicit batch field,
  // else the recipe's first honey — so batches sharing a recipe still match.
  var bHoney=mwResolveHoney(b);
  // Sparkling recipes finish dry and get primed at bottling — no stabilise-
  // and-clear wait — so they typically get bottled sooner than a still mead
  // on the same yeast+honey. That's a real, mechanistic difference in "days
  // to finish", not a hypothetical one, so the looser fallback tiers (which
  // pool across DIFFERENT recipes) shouldn't mix the two. The exact-recipe
  // tier doesn't need this check — a single recipe can't be both.
  var bSparkling=mwIsSparkling((typeof getRecipe==='function')?getRecipe(b.recipeId):null);
  var pool=all.filter(function(o){return o.id!==b.id&&o.recipeId===b.recipeId;});
  var matchedOn='recipe';
  if(pool.length<2){
    // Same yeast+honey combo (e.g. every EC-1118 orange-blossom batch you've
    // made, regardless of recipe tweaks) is a closer match than yeast alone.
    var byYeastHoney=(b.yeast&&bHoney)?all.filter(function(o){return o.id!==b.id&&o.yeast===b.yeast&&mwResolveHoney(o)===bHoney
      &&mwIsSparkling((typeof getRecipe==='function')?getRecipe(o.recipeId):null)===bSparkling;}):[];
    if(byYeastHoney.length>=2){pool=byYeastHoney;matchedOn='yeast-honey';}
    else{
      var byYeast=b.yeast?all.filter(function(o){return o.id!==b.id&&o.yeast===b.yeast
        &&mwIsSparkling((typeof getRecipe==='function')?getRecipe(o.recipeId):null)===bSparkling;}):[];
      if(byYeast.length>=2){pool=byYeast;matchedOn='yeast';}
    }
  }
  if(pool.length<2)return null;

  function statsFor(o){
    var recipe=(typeof APP!=='undefined'&&APP.recipes)?getRecipe(o.recipeId):null;
    var og=parseFloat(o.og)||(recipe&&recipe.ogTarget)||null;
    var logs=((typeof APP!=='undefined'&&APP.logs&&APP.logs[o.id])||[]).filter(function(l){return l.gravity;})
      .slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
    var bot=(typeof APP!=='undefined'&&APP.bottling&&APP.bottling[o.id])||null;
    var lastG=logs.length?parseFloat(logs[logs.length-1].gravity):null;
    var finalG=(bot&&parseFloat(bot.fg))||lastG||null;
    var atten=(og&&finalG!=null)?mwAttenuation(og,finalG)*100:null;
    // Only bottled batches give a fair "days to finish" — an in-progress one
    // hasn't finished yet, so counting it would bias the average short. But
    // the DURATION itself prefers the last logged gravity reading over the
    // bottling date: this gets compared against a currently-fermenting
    // batch's elapsed days (pure fermentation time) in historical-pace's
    // text, and bottling can happen months after fermentation actually
    // finished (bulk aging) — using the bottling date would silently fold
    // aging time into what's supposed to be a fermentation-pace comparison,
    // getting worse the longer this brewer's past batches happened to bulk
    // age. Falls back to the bottling date only if there's no gravity log
    // to anchor to at all.
    var lastReadingDate=logs.length?logs[logs.length-1].date:null;
    var daysToFinish=(o.startDate&&bot&&bot.date)
      ?Math.round((new Date(lastReadingDate||bot.date)-new Date(o.startDate))/86400000):null;
    var ts=(typeof APP!=='undefined'&&APP.tastings&&APP.tastings[o.id])||[];
    var rated=ts.filter(function(t){return t.rating;});
    var rating=rated.length?Math.max.apply(null,rated.map(function(t){return t.rating;})):null;
    return {daysToFinish:daysToFinish,atten:atten,rating:rating};
  }
  var stats=pool.map(statsFor);
  // sampleSize is the whole comparable POOL, but each metric only draws from
  // whichever of those batches actually has that fact — daysToFinish needs a
  // real bottling record, rating needs a logged tasting, neither is
  // guaranteed just because a batch matched on recipe/yeast. Returning the
  // count that actually FED each average (not just the pool size) lets the
  // view say "averaging ~24 days (2 of 8)" instead of implying all 8
  // contributed when most were silently filtered out as null.
  function avg(arr){
    var v=arr.filter(function(x){return x!=null;});
    return {value:v.length?mwRound(v.reduce(function(s,x){return s+x;},0)/v.length,1):null, n:v.length};
  }
  var daysStat=avg(stats.map(function(s){return s.daysToFinish;}));
  var attenStat=avg(stats.map(function(s){return s.atten;}));
  var ratingStat=avg(stats.map(function(s){return s.rating;}));
  return {
    matchedOn:matchedOn, sampleSize:pool.length, yeast:b.yeast||null, honey:bHoney,
    avgDaysToFinish:daysStat.value, avgDaysToFinishN:daysStat.n,
    avgAttenuation:attenStat.value, avgAttenuationN:attenStat.n,
    avgRating:ratingStat.value, avgRatingN:ratingStat.n
  };
}

// ---- Ingredient relationship notes (E9): pragmatic, non-abstract facts for
// a honey+yeast PAIR — reuses existing, already-authored data fields
// (HONEY_PROFILES.tech, YEAST_STRAINS) rather than a generic graph/new
// numbers. Deliberately does NOT repeat the fructose-risk interaction —
// that already has its own dedicated signal/rule (fructoseStallRisk).
// Returns [] when there's nothing notable — this isn't meant to praise
// every combination, only flag real interactions worth knowing about.
function mwIngredientRelationship(honeyName,yeastId){
  var h=(typeof HONEY_PROFILES!=='undefined')?HONEY_PROFILES[honeyName]:null;
  var y=(typeof YEAST_STRAINS!=='undefined'&&yeastId)?YEAST_STRAINS.filter(function(x){return x.id===yeastId;})[0]:null;
  if(!h||!y)return [];
  var notes=[];
  var ht=h.tech||{};
  // Flavor balance: an expressive yeast can mask a delicate honey's own
  // character; the reverse (neutral yeast, bold honey) is fine either way
  // so it isn't flagged — only the mismatch is worth naming.
  if(y.flavorImpact==='expressive'&&h.intensity==='light'){
    notes.push({type:'flavor-mismatch',data:{honey:honeyName,yeastImpact:y.flavorImpact,honeyIntensity:h.intensity}});
  }
  // Nitrogen contribution: some honeys carry meaningfully more of their own
  // available nitrogen than others (yanOffset, ppm) — worth naming once it's
  // large enough to matter, not for every honey with a nonzero value.
  if(ht.yanOffset>=10){
    notes.push({type:'nitrogen-contribution',data:{honey:honeyName,yanOffset:ht.yanOffset}});
  }
  return notes;
}
