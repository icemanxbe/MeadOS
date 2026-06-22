// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// alerts, aging timeline, fermenter calendar, brew planner, recipe designer, certificates, additions
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== QUICK GRAVITY LOG FAB ====================
// The quick-gravity FAB and its modal were removed per user request — log
// readings from a batch's own gravity-log screen instead.

// ==================== LOW-STOCK SUPPLY ALERT ====================
function getLowSupplies(){
  return(APP.supplies||[]).filter(function(s){
    var q=parseFloat(s.qty)||0;
    var threshold=parseFloat(s.threshold)||0;
    if(threshold>0&&q<=threshold)return true;
    // Default: alert when q is 0 even without threshold
    if(threshold===0&&q===0)return true;
    return false;
  });
}

function getExpiringSupplies(daysAhead){
  daysAhead=daysAhead||30;
  var now=Date.now();
  var horizon=now+daysAhead*86400000;
  return(APP.supplies||[]).filter(function(s){
    if(!s.expiryDate)return false;
    var e=new Date(s.expiryDate).getTime();
    return e<=horizon&&e>=now;
  });
}

function renderStockAlerts(){
  var low=getLowSupplies();
  var exp=getExpiringSupplies(30);
  var overdueAdds=(typeof getOverdueAdditions==='function')?getOverdueAdditions():[];
  if(!low.length&&!exp.length&&!overdueAdds.length)return'';
  var items=[];
  if(overdueAdds.length){
    items.push('<div class="stock-alert" style="cursor:pointer" onclick="showView(\'batch\',\''+overdueAdds[0].batch.id+'\');setTimeout(function(){setBatchTab(\''+overdueAdds[0].batch.id+'\',\'additions\')},10)"><span class="icon">⚠</span><span><strong>Overdue removal:</strong> '+overdueAdds.map(function(o){return escHtml(o.addition.item)+' in '+escHtml(o.batch.name);}).join(', ')+' — <span style="text-decoration:underline">remove now</span></span></div>');
  }
  if(low.length){
    items.push('<div class="stock-alert" onclick="showView(\'supplies\')" style="cursor:pointer"><span class="icon">⚠</span><span><strong>Low stock:</strong> '+low.map(function(s){return escHtml(s.name)+' ('+s.qty+(s.unit?' '+s.unit:'')+')';}).join(', ')+' — <span style="text-decoration:underline">manage supplies</span></span></div>');
  }
  if(exp.length){
    items.push('<div class="stock-alert warn" onclick="showView(\'supplies\')" style="cursor:pointer"><span class="icon">⏳</span><span><strong>Expiring soon:</strong> '+exp.map(function(s){return escHtml(s.name)+' ('+fmtDate(s.expiryDate)+')';}).join(', ')+' — <span style="text-decoration:underline">check supplies</span></span></div>');
  }
  return items.join('');
}

// ==================== PROACTIVE ALERTS ====================
// Higher-signal coach alerts that watch the journal data and surface things
// the user might miss otherwise: stuck fermentations, drinking-window last
// calls, and anniversary tasting prompts. Designed to be unobtrusive — only
// renders when there's actually something to flag.

// Detect a stuck fermentation: an active (pre-bottled) batch where the most
// recent N gravity logs show <0.003 SG drop over 5+ days, AND the gravity is
// still >0.005 above the recipe's expected FG. False-positive prone if the
// user simply hasn't been logging, so we require at least 2 logs in the
// stall window — no logs at all just means "log more often."
function detectStuckFermentations(){
  var stuck=[];
  var now=Date.now();
  (APP.batches||[]).forEach(function(b){
    var status=getBatchStatus(b);
    if(status==='bottled'||status==='complete'||status==='failed')return;
    var logs=(APP.logs[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
    if(logs.length<2)return; // can't detect a stall with one reading
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var targetFG=(recipe&&recipe.fgTarget)||1.000;
    // Take the last 5+ days of logs and check if they've barely budged
    var lastLog=logs[logs.length-1];
    var lastDate=new Date(lastLog.date);
    if(isNaN(lastDate.getTime()))return;
    var daysSinceLastLog=Math.floor((now-lastDate.getTime())/86400000);
    // Find the log that's 5+ days before the last log
    var stallCandidates=logs.filter(function(l){
      var t=new Date(l.date).getTime();
      return!isNaN(t)&&((lastDate.getTime()-t)/86400000)>=5;
    });
    if(!stallCandidates.length)return;
    var stallStart=stallCandidates[stallCandidates.length-1];
    var stallDays=Math.floor((lastDate.getTime()-new Date(stallStart.date).getTime())/86400000);
    var drop=(stallStart.gravity||0)-(lastLog.gravity||0);
    // Stall conditions:
    //   - gravity dropped <0.003 over 5+ days
    //   - current gravity still meaningfully above target FG
    //   - last log isn't ancient (stale data, not a stall)
    if(drop<0.003&&(lastLog.gravity||0)>(targetFG+0.005)&&daysSinceLastLog<=14){
      var ageOfBatch=Math.floor((now-new Date(b.startDate).getTime())/86400000);
      // Don't flag the lag phase (first 48h is often no-activity-yet)
      if(ageOfBatch<3)return;
      stuck.push({
        batch:b,
        currentGravity:lastLog.gravity,
        targetFG:targetFG,
        stallDays:stallDays,
        dropOverStall:Math.round(drop*1000)/1000,
        daysSinceLastLog:daysSinceLastLog
      });
    }
  });
  return stuck;
}

// Find batches approaching the end of their drinking window. Reports anything
// with bottles still on hand that's within the last 25% of its drink-by
// window OR already past peak with bottles remaining. Drives the "last call"
// dashboard alert so you don't lose batches to oxidation.
function detectDrinkingWindowAlerts(){
  var alerts=[];
  var now=Date.now();
  (APP.batches||[]).forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var onHand=(typeof bottlesOnHand==='function')?bottlesOnHand(bot):(bot.bottleCount||0);
    if(!onHand)return; // already gone, no alert
    var profile=(typeof getAgingProfile==='function')?getAgingProfile(b):null;
    if(!profile||!profile.maxDays)return;
    var bottleDate=new Date(bot.date);
    if(isNaN(bottleDate.getTime()))return;
    var ageDays=Math.floor((now-bottleDate.getTime())/86400000);
    var daysUntilMax=profile.maxDays-ageDays;
    var daysUntilPeak=profile.peakDays-ageDays;
    // Categorize: 'past-max' (urgent), 'closing' (last 25% of window), 'past-peak' (worth knowing)
    if(daysUntilMax<=0){
      alerts.push({batch:b,bot:bot,onHand:onHand,kind:'past-max',ageDays:ageDays,daysUntilMax:daysUntilMax});
    }else if(daysUntilMax<=profile.maxDays*0.25){
      alerts.push({batch:b,bot:bot,onHand:onHand,kind:'closing',ageDays:ageDays,daysUntilMax:daysUntilMax});
    }
  });
  // Most urgent first
  alerts.sort(function(a,b){return a.daysUntilMax-b.daysUntilMax;});
  return alerts;
}

// Find batches whose last tasting was a long time ago — the "you should
// check on this aging batch" prompt. Triggers when:
//   - Batch is bottled with bottles on hand
//   - Either never tasted OR last tasted >= 90 days ago
//   - Hits a "round milestone" (every 90 days of bottle age) for prompting
function detectAnniversaryTastingPrompts(){
  var prompts=[];
  var now=Date.now();
  (APP.batches||[]).forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var onHand=(typeof bottlesOnHand==='function')?bottlesOnHand(bot):(bot.bottleCount||0);
    if(!onHand)return;
    var bottleDate=new Date(bot.date);
    if(isNaN(bottleDate.getTime()))return;
    var ageDays=Math.floor((now-bottleDate.getTime())/86400000);
    if(ageDays<60)return; // too young for a follow-up tasting
    var tastings=(APP.tastings[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
    var lastTasting=tastings.length?tastings[tastings.length-1]:null;
    var daysSinceLastTasting=lastTasting?Math.floor((now-new Date(lastTasting.date).getTime())/86400000):Infinity;
    // Quiet down: only prompt every 90+ days since last tasting
    if(daysSinceLastTasting<90)return;
    var milestoneLabel;
    if(ageDays>=730)milestoneLabel='2+ years';
    else if(ageDays>=365)milestoneLabel='1 year+';
    else if(ageDays>=180)milestoneLabel='6 months';
    else if(ageDays>=90)milestoneLabel='3 months';
    else milestoneLabel=Math.floor(ageDays/30)+' months';
    prompts.push({
      batch:b,
      ageDays:ageDays,
      milestoneLabel:milestoneLabel,
      lastTastingDate:lastTasting?lastTasting.date:null,
      daysSinceLastTasting:lastTasting?daysSinceLastTasting:null,
      onHand:onHand
    });
  });
  // Oldest-since-last-tasting first
  prompts.sort(function(a,b){return(b.daysSinceLastTasting||9999)-(a.daysSinceLastTasting||9999);});
  return prompts;
}

function renderProactiveAlerts(){
  var stuck=detectStuckFermentations();
  var windowAlerts=detectDrinkingWindowAlerts();
  var tastingPrompts=detectAnniversaryTastingPrompts();
  if(!stuck.length&&!windowAlerts.length&&!tastingPrompts.length)return'';

  var items=[];

  // Stuck fermentations — red, urgent
  stuck.forEach(function(s){
    items.push(
      '<div class="stock-alert" style="cursor:pointer;border-left-color:var(--red);background:rgba(200,48,32,0.10)" onclick="showView(\'batch\',\''+s.batch.id+'\');setTimeout(function(){setBatchTab(\''+s.batch.id+'\',\'log\')},10)">'
        +'<span class="icon">🛑</span>'
        +'<span><strong>Possible stuck ferment:</strong> '+escHtml(s.batch.name)
        +' has dropped only '+s.dropOverStall+' SG in '+s.stallDays+' days '
        +'(at '+(s.currentGravity||'?')+', target ≈'+s.targetFG+'). '
        +'<span style="text-decoration:underline">Check temperature, add nutrient, or repitch →</span></span>'
      +'</div>'
    );
  });

  // Drinking-window — amber for closing, red for past-max
  windowAlerts.forEach(function(a){
    var isPastMax=a.kind==='past-max';
    var bg=isPastMax?'rgba(200,48,32,0.10)':'rgba(200,160,64,0.10)';
    var border=isPastMax?'var(--red)':'var(--gold)';
    var icon=isPastMax?'⏰':'🍷';
    var msg=isPastMax
      ?'<strong>Past peak window:</strong> '+escHtml(a.batch.name)+' ('+a.onHand+' bottle'+(a.onHand===1?'':'s')+' on hand) is now '+Math.abs(a.daysUntilMax)+' day'+(Math.abs(a.daysUntilMax)===1?'':'s')+' past its drink-by guidance. Open soon to catch it at its best.'
      :'<strong>Drinking window closing:</strong> '+escHtml(a.batch.name)+' ('+a.onHand+' bottle'+(a.onHand===1?'':'s')+' on hand) reaches max age in '+a.daysUntilMax+' day'+(a.daysUntilMax===1?'':'s')+'. Plan to drink, gift, or save.';
    items.push(
      '<div class="stock-alert" style="cursor:pointer;border-left-color:'+border+';background:'+bg+'" onclick="showView(\'batch\',\''+a.batch.id+'\')">'
        +'<span class="icon">'+icon+'</span>'
        +'<span>'+msg+' <span style="text-decoration:underline">Open batch →</span></span>'
      +'</div>'
    );
  });

  // Anniversary tasting prompts — gentle informational tone
  if(tastingPrompts.length){
    // Cap to 3 — beyond that gets noisy
    tastingPrompts.slice(0,3).forEach(function(p){
      var lastNote=p.daysSinceLastTasting==null
        ?'never tasted'
        :'last tasted '+p.daysSinceLastTasting+' days ago';
      items.push(
        '<div class="stock-alert warn" style="cursor:pointer" onclick="showView(\'batch\',\''+p.batch.id+'\');setTimeout(function(){setBatchTab(\''+p.batch.id+'\',\'tasting\')},10)">'
          +'<span class="icon">🍷</span>'
          +'<span><strong>Time for a tasting?</strong> '+escHtml(p.batch.name)+' is '+p.milestoneLabel+' aged · '+lastNote+'. <span style="text-decoration:underline">Log a fresh tasting →</span></span>'
        +'</div>'
      );
    });
  }

  return items.join('');
}
