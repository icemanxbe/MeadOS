// ==================== ADVISOR RULES: FERMENTATION ====================
// Rules for the active-fermentation phase — the largest cluster by far,
// since that's genuinely where most of the advisor's decision surface
// lives (temperature, nutrition, oxygen, gravity progress, data quality).
// Split out of 03e-advisor.js's _advRules() purely for navigability as the
// rule count grew past ~25 — pure relocation, no behaviour change. See
// 03g-advisor-rules-packaging.js for the post-fermentation/packaging/aging
// half; 03e-advisor.js's _advRules() concatenates both into the same flat
// array every caller already expects.
function _advRulesFermentation(){
  return [
    function stalled(s){
      if(!s.active||!s.stalled)return null;
      var causes=(typeof mwStalledCauses==='function')?mwStalledCauses(s):[{cause:'unknown',weight:0.3,evidence:[]}];
      return {id:'stalled',severity:'critical',category:'fermentation',
        data:{atten:Math.round(s.attenuation*100),days:s.daysSinceStart,temp:s.latestTemp,
          cause:causes[0].cause,causes:causes,honey:s.honeyName,yeast:s.yeastId,ph:s.latestPH,
          plateauDays:(s.timeline&&s.timeline.plateauDays)||null,
          // nutrientsComplete only means the PLANNED doses were logged as
          // added — not that the right product/amount actually reached the
          // must. It's true exactly when mwStalledCauses() didn't consider
          // nutrition a candidate cause at all, which is the one moment the
          // view needs to say that plainly instead of letting the absence
          // read as "nutrition's been ruled out."
          nutrientsComplete:s.nutrientsComplete},
        reasons:['rate-flat','below-target']};
    },
    function finalNutrient(s){
      if(s.nutrientsComplete||s.nutrientsExpected===0)return null;
      if(!s.fermenting)return null;
      // Once fermentation itself reads as complete, the dosing window is
      // unambiguously closed — a dose here can't reach yeast still growing
      // (there isn't any) and only risks feeding spoilage organisms instead
      // (the same reasoning this rule's own text gives for "past the break").
      // Without this it fires 'critical: dose now' in the same breath as
      // 'ferment-complete: go rack/bottle' — a real contradiction, not just
      // an unlikely edge case (any healthy fast ferment that finishes before
      // every scheduled dose lands here).
      if(s.nearFG)return null;
      // Due as we approach the 1/3 break; urgent once past it (window closing).
      var near=s.sugarBreak!=null&&s.lastG!=null&&s.lastG<=(s.sugarBreak+0.006);
      if(!near&&!s.passedSugarBreak)return null;
      return {id:'nutrient-final',severity:s.passedSugarBreak?'critical':'recommended',category:'nutrition',
        data:{done:s.nutrientsDone,expected:s.nutrientsExpected,sugarBreak:s.sugarBreak,past:s.passedSugarBreak},
        reasons:['near-break']};
    },
    function aerate(s){
      // The positive counterpart to oxygen-stop: aerate/degas during the first third.
      if(!s.fermenting||s.sugarBreak==null||s.passedSugarBreak||s.stalled||s.nearFG)return null;
      return {id:'aerate-now',severity:'recommended',category:'oxygen',
        data:{sugarBreak:s.sugarBreak,sg:s.lastG},
        reasons:['before-break']};
    },
    function oxygen(s){
      if(!s.passedSugarBreak)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      return {id:'oxygen-stop',severity:'recommended',category:'oxygen',
        data:{sugarBreak:s.sugarBreak,sg:s.lastG,vigorous:s.fermenting&&!s.nearFG},
        reasons:['past-break']};
    },
    function complete(s){
      if(!s.active||!s.nearFG)return null;
      return {id:'ferment-complete',severity:'recommended',category:'fermentation',
        data:{sg:s.lastG,targetFG:s.targetFG,atten:Math.round(s.attenuation*100),
          reason:s.nearFGReason,plateauDays:(s.timeline&&s.timeline.plateauDays)||null,
          histSampleSize:(s.nearFGReason==='historical'&&s.historical)?s.historical.sampleSize:null,
          histAtten:(s.nearFGReason==='historical'&&s.historical)?Math.round(s.historical.avgAttenuation):null,
          // How many of histSampleSize actually had a computable attenuation
          // (needs at least one real gravity reading) — usually equal to
          // histSampleSize, but not guaranteed for a batch with no logs yet.
          histAttenN:(s.nearFGReason==='historical'&&s.historical)?s.historical.avgAttenuationN:null,
          // A plateau that matches your OWN history is good evidence — unless
          // this batch's own nutrient schedule was also skipped, in which case
          // a repeatable process gap (not the yeast's real ceiling) is at
          // least as plausible an explanation. Only relevant on the historical
          // path — the numeric/attenuation paths don't lean on past batches at
          // all, so there's nothing for a chronic mistake to reinforce there.
          nutrientsComplete:s.nutrientsComplete},
        reasons:['near-fg']};
    },
    function temperature(s){
      // Brewer has flagged this batch as deliberately held cold for bulk
      // aging/conditioning — checking it against the yeast's FERMENTATION
      // range would be a false positive (see toggleBulkAging).
      if(s.bulkAging)return null;
      if(s.tempInRange!==false)return null;
      var cold=s.latestTemp<s.tempLow;
      // source rides along so the view can hedge the "too cold" case: a
      // sensor reading (fermenter/cellar probe) isn't necessarily immersed in
      // the must itself, and active fermentation is exothermic — the must
      // commonly runs a couple degrees above whatever it's sitting in. That
      // gap can turn a real in-range must into a false "too cold" from an
      // ambient-ish reading. It can't produce a false "too warm" the same
      // way (the must would be at least as warm as the sensor, likely more),
      // so only the cold branch needs the hedge.
      return {id:'temperature',severity:s.fermenting?'recommended':'info',category:'temperature',
        data:{temp:s.latestTemp,low:s.tempLow,high:s.tempHigh,cold:cold,yeast:s.yeastId,source:s.tempSource,fermenting:s.fermenting},
        reasons:['out-of-range']};
    },
    function tempSwing(s){
      // In range but swinging — distinct from out-of-range; only while fermenting.
      if(!s.fermenting||s.tempInRange!==true||s.tempStable!==false)return null;
      return {id:'temp-swing',severity:'info',category:'temperature',
        data:{temp:s.latestTemp,low:s.tempLow,high:s.tempHigh},
        reasons:['temp-unstable']};
    },
    function tolerance(s){
      if(!s.fermenting||!s.nearTolerance||s.nearFG)return null;
      return {id:'abv-ceiling',severity:'info',category:'fermentation',
        data:{abv:s.currentABV,max:s.abvMax,yeast:s.yeastId},
        reasons:['near-tolerance']};
    },
    function phRange(s){
      // Optional signal — most brewers never log pH. Relevant throughout active
      // life, not just fermentation (a spoilage-risk pH doesn't fix itself).
      // Mead's healthy band (~3.0-3.4) and cider's (~3.3-3.8, malic-acid basis)
      // don't overlap — using mead's numbers on a cider batch would flag a
      // perfectly normal cider pH as a false risk, so the bounds branch on
      // beverageType. low/high ride along in `data` so the view text always
      // matches the actual bounds that fired, for either beverage.
      if(!s.active||s.latestPH==null)return null;
      var isCider=s.beverageType==='cider';
      var lo=isCider?(typeof CIDER_PH_TARGET_LOW!=='undefined'?CIDER_PH_TARGET_LOW:3.3):2.9;
      var hi=isCider?(typeof CIDER_PH_TARGET_HIGH!=='undefined'?CIDER_PH_TARGET_HIGH:3.8):3.5;
      if(s.latestPH<lo)return {id:'ph-low',severity:s.fermenting?'recommended':'info',category:'fermentation',
        data:{ph:s.latestPH,low:lo,high:hi,beverageType:s.beverageType},reasons:['ph-low']};
      if(s.latestPH>hi)return {id:'ph-high',severity:'info',category:'fermentation',
        data:{ph:s.latestPH,low:lo,high:hi,beverageType:s.beverageType},reasons:['ph-high']};
      return null;
    },
    function logReading(s){
      // Two genuinely different situations — no first reading ever vs. a
      // later reading gone stale — get distinct ids, not a shared
      // 'log-reading' id disambiguated only by a data.first flag. IDs are
      // meant to be stable enough to eventually dismiss/track individually;
      // sharing one id across unrelated triggers would make that impossible.
      if(!s.fermenting)return null;
      if(s.readings===0){
        if(s.daysSinceStart==null||s.daysSinceStart<2)return null;
        return {id:'log-reading-missing',severity:'recommended',category:'data',
          data:{days:s.daysSinceStart},reasons:['no-readings']};
      }
      if(s.daysSinceLastReading!=null&&s.daysSinceLastReading>=6&&!s.stalled){
        return {id:'log-reading-overdue',severity:s.daysSinceLastReading>=12?'recommended':'info',category:'data',
          data:{days:s.daysSinceLastReading},reasons:['stale-reading']};
      }
      return null;
    },
    function fruitAdditionNote(s){
      // Purely a data-trust caveat — doesn't change any other rule's verdict,
      // just names a real reason the CURRENT trend/projection might be off
      // for a few more readings yet.
      if(!s.fermenting||!s.recentFruitAddition)return null;
      return {id:'fruit-addition-note',severity:'info',category:'data',
        data:{date:s.recentFruitAddition.date,item:s.recentFruitAddition.item},
        reasons:['recent-fruit-addition']};
    },
    function onSchedule(s){
      // Reassuring "all good" note once past the break (before it, aerate-now leads).
      if(!s.fermenting||s.stalled||s.nearFG||!s.passedSugarBreak)return null;
      if(s.ratePerDay==null||s.ratePerDay<=0)return null;
      return {id:'on-track',severity:'info',category:'fermentation',
        data:{atten:Math.round(s.attenuation*100),expected:Math.round(s.expectedAttenuation*100),daysToFG:s.daysToFG,doneMs:s.doneMs},
        reasons:['rate-ok']};
    },
    function fructoseStall(s){
      // Pre-emptive: high-fructose honey + non-fructophilic yeast → late-stall risk.
      if(!s.fermenting||!s.fructoseStallRisk||s.nearFG)return null;
      return {id:'fructose-stall-risk',severity:'info',category:'fermentation',
        data:{honey:s.honeyName,risk:s.honeyFructoseRisk,yeast:s.yeastId},
        reasons:['high-fructose-honey']};
    },
    function ingredientNotes(s){
      // E9: pragmatic honey×yeast relationship facts beyond the fructose case
      // above (which already has its own dedicated rule). Silent when there's
      // nothing notable — not meant to praise every combination.
      if(!s.active||!s.honeyName||!s.yeastId)return null;
      var notes=(typeof mwIngredientRelationship==='function')?mwIngredientRelationship(s.honeyName,s.yeastId):[];
      // Nitrogen-contribution notes are only actionable while nutrient-dosing
      // decisions are still being made — stale once fermentation itself is
      // done, even though the batch is still 'active' (conditioning/bulk
      // aging pre-bottling). Flavor-mismatch is a standing characteristic of
      // the pairing, so it stays relevant for the batch's whole active life.
      if(!s.fermenting)notes=notes.filter(function(n){return n.type!=='nitrogen-contribution';});
      if(!notes.length)return null;
      return {id:'ingredient-notes',severity:'info',category:'fermentation',
        data:{notes:notes,honey:s.honeyName,yeast:s.yeastId},
        reasons:['honey-yeast-pairing']};
    },
    function recordOg(s){
      // Can't project anything without a starting gravity.
      if(!s.active||s.og!=null)return null;
      return {id:'record-og',severity:'recommended',category:'data',
        data:{},reasons:['no-og']};
    },
    function blowoffRisk(s){
      // Equipment knowledge: too little headspace in a vigorous primary risks a
      // blow-off (krausen/foam pushed out the airlock). Only while genuinely
      // vigorous — before the sugar break, not yet stalled or near done.
      // Distinct ids per severity tier (not one 'blowoff-risk' id for both):
      // a future dismiss/track feature shouldn't have to guess whether a
      // dismissed 'tight' warning should suppress a later, worse 'critical'
      // one just because they shared an id.
      if(!s.fermenting||s.passedSugarBreak||s.stalled||s.nearFG)return null;
      if(s.headspaceFrac==null)return null;
      if(s.headspaceFrac<0.08)return {id:'blowoff-headspace-critical',severity:'critical',category:'equipment',
        data:{headspacePct:Math.round(s.headspaceFrac*100),capacity:s.fermenterCapacity,volume:s.volume},reasons:['headspace-critical']};
      if(s.headspaceFrac<0.15)return {id:'blowoff-headspace-tight',severity:'recommended',category:'equipment',
        data:{headspacePct:Math.round(s.headspaceFrac*100),capacity:s.fermenterCapacity,volume:s.volume},reasons:['headspace-tight']};
      return null;
    },
    function fermentingLong(s){
      // Reassuring/informational: running past the expected range isn't
      // necessarily wrong (many meads legitimately take longer), but it's
      // worth naming so the brewer isn't left guessing. Yields to 'stalled' —
      // that's the actionable version of "taking too long". Uses the yeast-
      // speed-aware expected range (Expectations Engine) rather than a flat
      // recipe-day multiplier, so a slow strain isn't flagged prematurely and
      // a fast one isn't given too much slack.
      if(!s.fermenting||s.stalled||s.nearFG)return null;
      if(!s.expectedFermentRange||s.daysSinceStart==null)return null;
      if(s.daysSinceStart<=s.expectedFermentRange.high)return null;
      return {id:'fermenting-long',severity:'info',category:'fermentation',
        data:{days:s.daysSinceStart,low:s.expectedFermentRange.low,high:s.expectedFermentRange.high,expected:s.expectedFermentRange.expected,yeast:s.yeastId,beverageType:s.beverageType},
        reasons:['past-expected-range']};
    },
    function historicalPace(s){
      // Compares THIS batch to the brewer's OWN past batches (E3) — not
      // generic brewing lore. Needs at least 2 real comparable past batches;
      // mwHistoricalComparison() returns null rather than guess otherwise.
      if(!s.fermenting||!s.historical||s.historical.avgDaysToFinish==null||s.daysSinceStart==null)return null;
      return {id:'historical-pace',severity:'info',category:'fermentation',
        data:{daysSoFar:s.daysSinceStart,avgDays:s.historical.avgDaysToFinish,avgRating:s.historical.avgRating,
          sampleSize:s.historical.sampleSize,matchedOn:s.historical.matchedOn,yeast:s.historical.yeast,honey:s.historical.honey,
          // How many of sampleSize actually fed avgDays/avgRating — not every
          // comparable batch is bottled or rated, so this can be smaller.
          avgDaysN:s.historical.avgDaysToFinishN,avgRatingN:s.historical.avgRatingN},
        reasons:['own-history']};
    }
  ];
}
