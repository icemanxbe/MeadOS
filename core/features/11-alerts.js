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

// Detect a stuck fermentation. Defers the actual "is it stalled" call to
// projectFermentation() — the SAME yeast-attenuation-aware, plateau-shape-aware
// signal the Advisor uses — instead of re-deriving it from a flat recipe.fgTarget
// comparison. That naive version used to flag healthy finished meads as "stuck"
// whenever honey/fruit non-fermentables left the true FG above the recipe's
// designed target (a real false-positive, not a hypothetical). The 5+ day
// lookback here is now only for the human-readable "dropped only X in Y days"
// wording, not for the stall determination itself.
function detectStuckFermentations(){
  var stuck=[];
  var now=Date.now();
  (typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).forEach(function(b){
    var status=getBatchStatus(b);
    if(status==='bottled'||status==='complete'||status==='failed')return;
    var logs=(getBatchLogs(b.id)).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
    if(logs.length<2)return; // can't detect a stall with one reading
    var proj=(typeof projectFermentation==='function')?projectFermentation(b):null;
    if(!proj||!proj.stalled)return;
    var lastLog=logs[logs.length-1];
    var lastDate=new Date(lastLog.date);
    if(isNaN(lastDate.getTime()))return;
    var daysSinceLastLog=Math.floor((now-lastDate.getTime())/86400000);
    // Past 14 days we can no longer be sure it's STILL stalled (vs quietly
    // finished, or the brewer already dealt with it and forgot to log) — but
    // dropping the alert entirely is exactly the wrong failure mode for a
    // batch nobody's checked in weeks. Keep it, tagged `stale`, so the wording
    // downgrades from "this is stuck" to "this was stuck, unconfirmed since"
    // instead of the alert silently vanishing the longer it's neglected.
    var stale=daysSinceLastLog>14;
    var ageOfBatch=Math.floor((now-new Date(b.startDate).getTime())/86400000);
    if(ageOfBatch<3)return; // don't flag the lag phase
    // Find the log that's 5+ days before the last log, purely for the message.
    var stallCandidates=logs.filter(function(l){
      var t=new Date(l.date).getTime();
      return!isNaN(t)&&((lastDate.getTime()-t)/86400000)>=5;
    });
    var stallStart=stallCandidates.length?stallCandidates[stallCandidates.length-1]:logs[0];
    var stallDays=Math.floor((lastDate.getTime()-new Date(stallStart.date).getTime())/86400000);
    var drop=(stallStart.gravity||0)-(lastLog.gravity||0);
    stuck.push({
      batch:b,
      currentGravity:lastLog.gravity,
      targetFG:proj.estFG,
      stallDays:stallDays,
      dropOverStall:Math.round(drop*1000)/1000,
      daysSinceLastLog:daysSinceLastLog,
      stale:stale
    });
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
  (typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).forEach(function(b){
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
  (typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).forEach(function(b){
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

  // Stuck fermentations — red, urgent. Once daysSinceLastLog is past the
  // window we can confirm a live stall in, downgrade the wording — we only
  // know it WAS stalled as of the last reading, not that it still is now.
  stuck.forEach(function(s){
    var msg=s.stale
      ?'<strong>Gone quiet:</strong> '+escHtml(s.batch.name)+' looked stalled at its last reading, '+s.daysSinceLastLog+' days ago (SG '+(s.currentGravity||'?')+', target ≈'+s.targetFG+') — no reading since to confirm either way. '
        +'<span style="text-decoration:underline">Log a fresh reading →</span>'
      :'<strong>Possible stuck ferment:</strong> '+escHtml(s.batch.name)
        +' has dropped only '+s.dropOverStall+' SG in '+s.stallDays+' days '
        +'(at '+(s.currentGravity||'?')+', target ≈'+s.targetFG+'). '
        +'<span style="text-decoration:underline">Check temperature, add nutrient, or repitch →</span>';
    items.push(
      '<div class="stock-alert" style="cursor:pointer;border-left-color:var(--red);background:rgba(200,48,32,0.10)" onclick="showView(\'batch\',\''+s.batch.id+'\');setTimeout(function(){setBatchTab(\''+s.batch.id+'\',\'log\')},10)">'
        +'<span class="icon">🛑</span>'
        +'<span>'+msg+'</span>'
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

// ==================== GOING AWAY CHECK ====================
// Answers one question — "what needs handling before I leave for N days?" —
// by reusing existing per-batch task data, addition removal dates, and supply
// alerts with a forward-looking window, rather than a parallel planning engine.
function openGoingAwayCheck(){
  var raw=prompt('Going away for how many days?','7');
  if(raw==null)return;
  var days=parseInt(raw);
  if(!days||days<=0)return;
  var now=Date.now();
  var horizon=now+days*86400000;

  var taskItems=[];
  (typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).forEach(function(b){
    var s=getBatchStatus(b);
    if(s==='bottled'||s==='complete'||s==='failed')return;
    (typeof getTasksForBatch==='function'?getTasksForBatch(b):[]).forEach(function(t){
      if(t.done||t.daysFromDue<-days)return; // done, or further out than the trip
      taskItems.push({batch:b,task:t});
    });
  });
  taskItems.sort(function(a,b){return a.task.day-b.task.day;});

  // Same removeBy field getOverdueAdditions() uses, just widened to the trip
  // horizon instead of "already passed" — deliberately not touching that
  // function so its own tested overdue-only behavior stays untouched.
  var additionItems=[];
  if(APP.additions){
    Object.keys(APP.additions).forEach(function(bid){
      var b=getBatch(bid);
      if(!b||(typeof inActiveMode==='function'&&!inActiveMode(b)))return;
      (APP.additions[bid]||[]).forEach(function(a){
        if(a.removedDate||!a.removeBy)return;
        var info=(typeof ADDITION_TYPES!=='undefined')?ADDITION_TYPES.find(function(x){return x.key===a.type;}):null;
        if(info&&info.permanent)return;
        var t=new Date(a.removeBy).getTime();
        if(!isNaN(t)&&t<=horizon)additionItems.push({batch:b,addition:a,overdue:t<now});
      });
    });
  }

  var lowSupplies=(typeof getLowSupplies==='function')?getLowSupplies():[];
  var expSupplies=(typeof getExpiringSupplies==='function')?getExpiringSupplies(days):[];

  var body;
  if(!taskItems.length&&!additionItems.length&&!lowSupplies.length&&!expSupplies.length){
    body='<div class="info-box green"><div style="font-size:13px;color:var(--green2)">✓ Nothing needs attention in the next '+days+' days — safe to leave your batches resting.</div></div>';
  }else{
    body='';
    if(taskItems.length){
      body+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin:14px 0 6px">⚗ BREWING STEPS</div>'
        +taskItems.map(function(x){
          var t=x.task;
          var tag=t.isOverdue?' <span style="color:var(--red2)">(overdue)</span>':(t.isDue?' <span style="color:var(--gold2)">(today)</span>':' <span style="color:var(--text3)">(in '+(-t.daysFromDue)+'d)</span>');
          return'<div class="stock-alert" style="cursor:pointer" onclick="closeModal();showView(\'batch\',\''+x.batch.id+'\')"><span class="icon">⚗</span><span>'+escHtml(x.batch.name)+' — <strong>'+escHtml(t.title)+'</strong>'+tag+'</span></div>';
        }).join('');
    }
    if(additionItems.length){
      body+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin:14px 0 6px">🍒 ADDITIONS TO REMOVE</div>'
        +additionItems.map(function(x){
          var tag=x.overdue?' <span style="color:var(--red2)">(overdue)</span>':' <span style="color:var(--text3)">(by '+fmtDate(x.addition.removeBy)+')</span>';
          return'<div class="stock-alert" style="cursor:pointer" onclick="closeModal();showView(\'batch\',\''+x.batch.id+'\')"><span class="icon">🍒</span><span>'+escHtml(x.addition.item)+' in '+escHtml(x.batch.name)+tag+'</span></div>';
        }).join('');
    }
    if(lowSupplies.length||expSupplies.length){
      body+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin:14px 0 6px">📦 SUPPLIES</div>';
      if(lowSupplies.length)body+='<div class="stock-alert" style="cursor:pointer" onclick="closeModal();showView(\'supplies\')"><span class="icon">⚠</span><span><strong>Already low:</strong> '+lowSupplies.map(function(s){return escHtml(s.name);}).join(', ')+'</span></div>';
      if(expSupplies.length)body+='<div class="stock-alert warn" style="cursor:pointer" onclick="closeModal();showView(\'supplies\')"><span class="icon">⏳</span><span><strong>Expiring within '+days+'d:</strong> '+expSupplies.map(function(s){return escHtml(s.name)+' ('+fmtDate(s.expiryDate)+')';}).join(', ')+'</span></div>';
    }
  }
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px">'
    +'<div class="modal-title">🧳 Going away for '+days+' day'+(days===1?'':'s')+'?</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px">Everything with a due date inside your trip window, across all active batches.</div>'
    +body
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
