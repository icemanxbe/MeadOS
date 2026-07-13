// ==================== ADVISOR RULES: PACKAGING & AGING ====================
// Rules for the decisions made once fermentation is winding down or done —
// stabilising, carbonating, racking, bottling, aging. Split out of
// 03e-advisor.js's _advRules() alongside 03f-advisor-rules-fermentation.js;
// see that file's header comment for why. Pure relocation, no behaviour
// change — 03e-advisor.js's _advRules() concatenates both into the same
// flat array every caller already expects.
function _advRulesPackaging(){
  return [
    function stabiliseFirst(s){
      // Near the end on a still mead that backsweetens: stabilise (sorbate+meta) first.
      if(!s.active||!s.nearFG||!s.recipeBacksweetens)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      return {id:'stabilise-first',severity:'recommended',category:'stabilisation',
        data:{},reasons:['backsweeten-recipe']};
    },
    function carbonation(s){
      // Sparkling/bottle-conditioned: finish dry, do NOT stabilise, prime at bottling.
      // 'recommended' (not 'info') to match its mutually-exclusive sibling
      // stabilise-first above — this is the same pre-bottling decision point,
      // just the opposite instruction, and getting either one wrong is a real
      // bottle-bomb / carbonation-failure risk, not just a passive FYI.
      if(!s.sparkling||!s.nearFG)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      return {id:'carbonation',severity:'recommended',category:'stabilisation',
        data:{confirmed:!!s.gravityConfirmedStable},reasons:['sparkling-recipe']};
    },
    function mlfAdvisory(s){
      // Cider-only. MLF (malic→lactic acid conversion) has no mead equivalent.
      // Fires once around the racking/stabilise decision point — the same
      // moment the 'stabilise-first'/'cold-crash' rules key off (nearFG, not
      // yet bottled) — since that's when the brewer chooses whether to hold
      // off sulfite (to allow MLF) or sulfite promptly (to block it).
      // Perry is a special, higher-severity case: its citric acid converts to
      // acetic acid (vinegar) under MLF rather than cider's buttery result,
      // so an 'avoid' stance on perry specifically is 'critical', not just
      // 'recommended' — the mistake is more costly there than on an applewine.
      if(s.beverageType!=='cider'||!s.mlfStance||s.mlfStance==='neutral')return null;
      if(!s.active||!s.nearFG||s.bottled)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      var isPerry=s.styleId==='perry';
      return {id:'mlf-advisory',
        severity:s.mlfStance==='avoid'?(isPerry?'critical':'recommended'):'info',
        category:'stabilisation',
        data:{stance:s.mlfStance,styleId:s.styleId,isPerry:isPerry},
        reasons:[s.mlfStance==='avoid'?'mlf-avoid':'mlf-encouraged']};
    },
    function agingWindow(s){
      // Drinkability milestones for bottled/aging batches (not while still working).
      if(s.fermenting||s.status==='fermenting'||s.status==='conditioning')return null;
      if(!s.bottled||s.agedDays==null||s.agePhase==null||s.agePhase==='aging')return null;
      var approaching=(s.agePhase==='ready'&&s.peakDays&&s.agedDays>=s.peakDays-Math.max(14,Math.round(s.peakDays*0.12)));
      return {id:'aging-window',severity:'info',category:'aging',
        data:{phase:s.agePhase,aged:s.agedDays,ready:s.readyDays,peak:s.peakDays,max:s.maxAgeDays,approaching:approaching,beverageType:s.beverageType},
        reasons:[s.agePhase==='declining'?'past-max':s.agePhase==='peak'?'past-peak':approaching?'approaching-peak':'in-window']};
    },
    function headspace(s){
      // Secondary / bulk conditioning: keep headspace minimal to limit oxidation.
      if(s.status!=='conditioning')return null;
      return {id:'headspace',severity:'info',category:'oxygen',
        data:{},reasons:['secondary-headspace']};
    },
    function coldCrash(s){
      // Finished & still: clear it (cold-crash or time) before bottling.
      if(!s.active||!s.nearFG||s.sparkling)return null;
      if(s.status==='bottled'||s.status==='complete')return null;
      return {id:'cold-crash',severity:'info',category:'clarity',
        data:{beverageType:s.beverageType},reasons:['clear-before-bottling']};
    },
    function carbonationDeveloping(s){
      // Sparkling + freshly bottled: bottle-conditioning is still building — a
      // reminder to store upright and warm, distinct from the pre-bottling
      // 'carbonation' rule (which only fires before bottling).
      if(!s.sparkling||!s.bottled||s.agedDays==null||s.agedDays>21)return null;
      return {id:'carbonation-developing',severity:'info',category:'stabilisation',
        data:{aged:s.agedDays},reasons:['bottle-conditioning']};
    },
    function extendedBulkAging(s){
      // A batch held in 'conditioning'/'aging' a long time WITHOUT ever being
      // bottled means repeated headspace/oxygen exposure the whole time — bottling
      // (even if still young) removes that risk. Uses the corrected s.bottled
      // signal so this can't confuse itself with genuine post-bottling aging.
      // Threshold follows the recipe's OWN bulk-aging target (1.5x it) when
      // set — a bochet meant to sit for a year shouldn't be flagged at the
      // same 270-day mark as a quick traditional — falling back to the old
      // flat 270 days for recipes that don't have one set.
      if(s.bottled||(s.status!=='conditioning'&&s.status!=='aging'))return null;
      var threshold=s.recipeBulkAgeDays?Math.round(s.recipeBulkAgeDays*1.5):270;
      if(s.daysSinceStart==null||s.daysSinceStart<threshold)return null;
      return {id:'extended-bulk-aging',severity:'info',category:'oxygen',
        data:{days:s.daysSinceStart,target:s.recipeBulkAgeDays,beverageType:s.beverageType},reasons:['long-unbottled']};
    },
    function overRacked(s){
      // Real, already-logged data (b.rackings, via rackBatch()) — every
      // racking introduces some oxygen, so a batch racked many times over
      // its life carries real cumulative oxidation risk even if each
      // individual racking was done carefully. Once bottled the count is
      // frozen history, not an ongoing risk, so this only applies pre-bottling.
      if(s.bottled||!s.active||s.rackingCount==null)return null;
      if(s.rackingCount<4)return null;
      return {id:'over-racked',severity:s.rackingCount>=6?'recommended':'info',category:'oxygen',
        data:{count:s.rackingCount,beverageType:s.beverageType},reasons:['racking-count']};
    }
  ];
}
