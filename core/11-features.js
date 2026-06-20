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

// ==================== AGING TIMELINE (Gantt) ====================
function renderTimeline(){
  var allBottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&!b.failed;});
  // Finished batches (drunk/gifted to zero) have nothing left to age — hide
  // them by default so the forecast stays focused, with a toggle to show.
  function isFinished(b){var bo=APP.bottling[b.id];return bo&&bottlesOnHand(bo)===0&&bottlesOriginal(bo)>0&&(bo.cellarFilled||(bo.gifts&&bo.gifts.length)||(APP.tastings[b.id]||[]).length);}
  var finishedCount=allBottled.filter(isFinished).length;
  var showFinished=!!window._agingShowFinished;
  var bottled=showFinished?allBottled:allBottled.filter(function(b){return!isFinished(b);});
  bottled.sort(function(a,b){return (APP.bottling[a.id].date||'').localeCompare(APP.bottling[b.id].date||'');});
  var finishedToggle=finishedCount?'<button class="btn btn-secondary btn-sm" onclick="window._agingShowFinished='+(showFinished?'false':'true')+';renderMain()">'+(showFinished?'🙈 Hide '+finishedCount+' finished':'👁 Show '+finishedCount+' finished')+'</button>':'';
  if(!bottled.length){
    return'<div class="page-title">Aging Timeline</div><div class="page-subtitle">Bottle Aging Forecast</div>'
      +'<div class="empty-state"><div class="es-icon">⌛</div><p>'+(finishedCount?'All bottled batches are finished. '+finishedToggle:'No bottled batches yet. Once you bottle, this view will plot each batch\'s ready → peak → past-peak windows on a timeline so you can plan ahead.')+'</p></div>';
  }
  // Determine time range: earliest bottling date → max(latest expiry, today + 12mo)
  var now=new Date();
  var earliestMs=Infinity,latestMs=-Infinity;
  var rows=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    var startDate=new Date(bot.date);
    var profile=getAgingProfile(b);
    var minDate=new Date(startDate.getTime()+profile.minDays*86400000);
    var peakDate=new Date(startDate.getTime()+profile.peakDays*86400000);
    var maxDate=new Date(startDate.getTime()+profile.maxDays*86400000);
    earliestMs=Math.min(earliestMs,startDate.getTime());
    latestMs=Math.max(latestMs,maxDate.getTime());
    var status=getAgingStatus(bottleDaysAged(b),profile);
    return{batch:b,bot:bot,profile:profile,startDate:startDate,minDate:minDate,peakDate:peakDate,maxDate:maxDate,color:getBatchColor(b),status:status};
  });
  // Pad start to ~30 days before earliest, end to at least 6 months after today
  var pad=30*86400000;
  earliestMs-=pad;
  latestMs=Math.max(latestMs+pad,now.getTime()+6*30*86400000);
  var spanMs=latestMs-earliestMs;
  function pct(ms){return((ms-earliestMs)/spanMs)*100;}
  // Month markers
  var markers=[];
  var d=new Date(earliestMs);
  d.setDate(1);d.setHours(0,0,0,0);
  while(d.getTime()<latestMs){
    markers.push({ms:d.getTime(),label:d.toLocaleString('en-GB',{month:'short',year:'2-digit'})});
    d.setMonth(d.getMonth()+1);
  }
  var markerHtml=markers.map(function(m){
    return'<div class="gantt-month-marker" style="left:'+pct(m.ms)+'%"></div>';
  }).join('');
  // margin-left matches the 140px row-label column so labels line up with the
  // bars/markers in the track, not the full card width.
  var lblStep=window.innerWidth<600?3:(markers.length>14?2:1);
  var monthLabels='<div class="gantt-monthlabels" style="position:relative;height:14px;margin-bottom:4px">'
    +markers.map(function(m,i){
      if(i%lblStep!==0)return''; // thin labels so they don't overlap (more aggressively on mobile)
      return'<span class="gantt-month-label" style="position:absolute;left:'+pct(m.ms)+'%;transform:translateX(2px)">'+m.label+'</span>';
    }).join('')
    +'</div>';
  function rowTrack(r){
    var color=r.color;
    var startPct=pct(r.startDate.getTime());
    var minPct=pct(r.minDate.getTime());
    var peakPct=pct(r.peakDate.getTime());
    var maxPct=pct(r.maxDate.getTime());
    var maturingW=minPct-startPct;
    var peakW=peakPct-minPct;
    var pastW=maxPct-peakPct;
    return'<div class="gantt-lane">'
      +'<div class="gantt-row-label" style="color:'+color+'">'+escHtml(r.batch.name)+'</div>'
      +'<div class="gantt-track" onclick="showView(\'batch\',\''+r.batch.id+'\')">'
      +markerHtml
      +'<div class="gantt-bar maturing" style="left:'+startPct+'%;width:'+maturingW+'%;background:'+color+'" title="Maturing · '+fmtDate(r.startDate.toISOString().slice(0,10))+' → '+fmtDate(r.minDate.toISOString().slice(0,10))+' ('+r.profile.minDays+' days)"></div>'
      +'<div class="gantt-bar peak" style="left:'+minPct+'%;width:'+peakW+'%;background:linear-gradient(90deg,'+color+',var(--gold2))" title="Ready → Peak window · '+fmtDate(r.minDate.toISOString().slice(0,10))+' → '+fmtDate(r.peakDate.toISOString().slice(0,10))+'">'+(peakW>5?'READY → PEAK':'')+'</div>'
      +'<div class="gantt-bar" style="left:'+peakPct+'%;width:'+pastW+'%;background:linear-gradient(90deg,var(--honey),var(--red2));opacity:.5" title="Past peak · '+fmtDate(r.peakDate.toISOString().slice(0,10))+' → '+fmtDate(r.maxDate.toISOString().slice(0,10))+'"></div>'
      +'<div class="gantt-today" style="left:'+pct(now.getTime())+'%"></div>'
      +'</div></div>';
  }
  // Group rows into actionable buckets so a big cellar stays scannable:
  // drink-now first, then still-maturing, then past-peak.
  var buckets=[
    {key:'now',title:'🍷 Drink now — ready or at peak',keys:{ready:1,peak:1},rows:[]},
    {key:'maturing',title:'⏳ Still maturing',keys:{'not-ready':1,maturing:1,unknown:1},rows:[]},
    {key:'past',title:'⚠ Past peak — drink soon',keys:{'past-peak':1,declining:1},rows:[]}
  ];
  rows.forEach(function(r){
    var k=r.status&&r.status.key;
    var b=buckets.find(function(bk){return bk.keys[k];})||buckets[1];
    b.rows.push(r);
  });
  var trackHtml=buckets.filter(function(b){return b.rows.length;}).map(function(b){
    return'<div style="margin:14px 0 4px;font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">'+b.title+' · '+b.rows.length+'</div>'
      +b.rows.map(rowTrack).join('');
  }).join('');
  // Legend
  var legend='<div style="display:flex;gap:18px;margin-top:14px;font-family:var(--font-mono);font-size:11px;color:var(--text3);flex-wrap:wrap">'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:var(--gold2);vertical-align:middle;opacity:.5;border-radius:2px"></span> Maturing</span>'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:linear-gradient(90deg,var(--gold),var(--gold2));vertical-align:middle;border-radius:2px"></span> Ready → Peak</span>'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:linear-gradient(90deg,var(--honey),var(--red2));opacity:.5;vertical-align:middle;border-radius:2px"></span> Past peak</span>'
    +'<span><span style="display:inline-block;width:1px;height:10px;background:var(--gold);box-shadow:0 0 4px var(--gold);vertical-align:middle"></span> Today</span>'
    +'</div>';
  // Upcoming highlights — which batches peak next
  var upcoming=rows.filter(function(r){return r.peakDate>now;}).sort(function(a,b){return a.peakDate-b.peakDate;}).slice(0,3);
  var upcomingHtml=upcoming.length?'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🏆 NEXT TO PEAK</div></div>'
    +upcoming.map(function(r){
      var days=Math.ceil((r.peakDate-now)/86400000);
      return'<div style="display:flex;align-items:center;gap:14px;padding:8px 4px;border-bottom:1px solid var(--border);cursor:pointer" onclick="showView(\'batch\',\''+r.batch.id+'\')">'
        +'<div style="width:8px;height:8px;border-radius:4px;background:'+r.color+';box-shadow:0 0 6px '+r.color+'"></div>'
        +'<div style="flex:1"><div style="font-family:var(--font-display);font-size:14px;color:'+r.color+'">'+escHtml(r.batch.name)+'</div><div style="font-size:12px;color:var(--text3)">Peaks on '+fmtDate(r.peakDate.toISOString().slice(0,10))+'</div></div>'
        +'<div style="font-family:var(--font-mono);font-size:12px;color:var(--gold2)">'+fmtDurationCompact(days)+'</div>'
        +'</div>';
    }).join('')
    +'</div>':'';
  return'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap"><div><div class="page-title">Aging Timeline</div><div class="page-subtitle" style="margin-bottom:0">Bottle Aging Forecast · '+rows.length+' batch'+(rows.length!==1?'es':'')+' aging over '+Math.round(spanMs/86400000/30)+' months</div></div>'+(finishedToggle?'<div style="margin-bottom:6px">'+finishedToggle+'</div>':'')+'</div>'
    +'<div style="height:14px"></div>'
    +'<div class="gantt">'
    +monthLabels
    +trackHtml
    +legend
    +'</div>'
    +upcomingHtml;
}

// ==================== FERMENTER SWIM-LANE CALENDAR ====================
// Gantt-style timeline organized by fermenter (one horizontal lane per
// vessel). Each batch is a bar from its start date to either:
//   - its actual bottling date (solid bar — historical/completed batch), or
//   - start + recipe.fermentDays (translucent/dashed — projected occupancy)
// The view scrolls horizontally over ~18 months (6mo back, 12mo forward by
// default). window._ftOffset (months) shifts the visible window. Today is
// marked with a vertical line; clicking a bar opens the batch.
function renderFermenterTimeline(){
  if(!APP.fermenters||!APP.fermenters.length){
    return'<div class="page-title">Fermenter Schedule</div>'
      +'<div class="page-subtitle">When each vessel is busy</div>'
      +'<div class="empty-state"><div class="es-icon">⚗</div><p>No fermenters configured yet. Add one in <a href="#" onclick="showView(\'settings\');return false;" style="color:var(--gold2)">Settings → Fermenters</a> to start tracking vessel occupancy.</p></div>';
  }
  if(window._ftOffset==null)window._ftOffset=0;
  // Window: desktop shows a 6-back / 12-forward overview; mobile zooms to a
  // single month so the bars stay readable (paged with ±1mo buttons).
  var ftMobile=window.innerWidth<=768;
  var backM=ftMobile?0:6, fwdM=ftMobile?1:12;
  var now=new Date();
  var anchor=new Date(now.getFullYear(),now.getMonth()+window._ftOffset,1);
  var startMs=new Date(anchor.getFullYear(),anchor.getMonth()-backM,1).getTime();
  var endMs=new Date(anchor.getFullYear(),anchor.getMonth()+fwdM,1).getTime();
  var spanMs=endMs-startMs;
  function pct(ms){return((Math.max(startMs,Math.min(endMs,ms))-startMs)/spanMs)*100;}
  function clamp(ms){return Math.max(startMs,Math.min(endMs,ms));}

  // Build month markers
  var markers=[];
  var d=new Date(startMs);
  d.setDate(1);d.setHours(0,0,0,0);
  while(d.getTime()<endMs){
    markers.push({ms:d.getTime(),label:d.toLocaleString('en-GB',{month:'short',year:'2-digit'})});
    d.setMonth(d.getMonth()+1);
  }
  var markerHtml=markers.map(function(m){
    return'<div class="gantt-month-marker" style="left:'+pct(m.ms)+'%"></div>';
  }).join('');
  var lblStep=window.innerWidth<600?3:(markers.length>14?2:1);
  var monthLabels='<div class="gantt-monthlabels" style="position:relative;height:14px;margin-bottom:4px">'
    +markers.map(function(m,i){
      if(i%lblStep!==0)return''; // thin labels so they don't overlap (more aggressively on mobile)
      return'<span class="gantt-month-label" style="position:absolute;left:'+pct(m.ms)+'%;transform:translateX(2px)">'+m.label+'</span>';
    }).join('')
    +'</div>';

  // For each fermenter, compute its occupancy bars. A batch may have been
  // racked across multiple vessels — render one bar per vessel-segment in the
  // matching fermenter's lane.
  var lanes=APP.fermenters.map(function(f){
    var bars=[];
    APP.batches.forEach(function(b){
      var history=getBatchVesselHistory(b);
      history.forEach(function(seg,segIdx){
        if(seg.fermenterId!==f.id)return;
        var bStartMs=new Date(seg.startDate).getTime();
        if(isNaN(bStartMs))return;
        var bot=APP.bottling[b.id];
        var bEndMs,projected=false;
        if(seg.endDate){
          // Segment closed by a later racking OR by bottling
          bEndMs=new Date(seg.endDate).getTime();
        }else{
          // This is the current open segment of an active batch. Project the
          // bar to end at whichever is LATEST: brew-start + recipe fermDays,
          // or today + 21 days (so a long-aging batch in secondary still has
          // a visible bar extending into the near future).
          var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
          var fermDays=(recipe&&recipe.fermentDays)||42;
          var projectedFromBrew=new Date(b.startDate).getTime()+fermDays*86400000;
          var projectedFromToday=now.getTime()+21*86400000;
          bEndMs=Math.max(projectedFromBrew,projectedFromToday);
          projected=true;
        }
        if(bEndMs<startMs||bStartMs>endMs)return; // outside visible window
        var leftPct=pct(bStartMs);
        var widthPct=Math.max(0.5,pct(bEndMs)-leftPct);
        var color=getBatchColor(b);
        // Tag segments after a racking with an arrow icon for clarity
        var rackedIn=segIdx>0;
        var labelText=(rackedIn?'↳ ':'')+b.name;
        var statusLabel=projected?'projected':(seg.endDate&&bot&&bot.date===seg.endDate?'bottled':'racked');
        var tooltip=escHtml(b.name)+' · '+statusLabel+' segment in '+escHtml(f.name)+' · '+fmtDate(seg.startDate)+' → '+(seg.endDate?fmtDate(seg.endDate):'now');
        bars.push('<div class="gantt-bar" style="left:'+leftPct+'%;width:'+widthPct+'%;background:'+color+';'+(projected?'opacity:0.65;border:1px dashed rgba(255,255,255,0.4);':'')+'" onclick="event.stopPropagation();showView(\'batch\',\''+b.id+'\')" title="'+tooltip+'">'+(widthPct>4?escHtml(labelText.length>22?labelText.slice(0,20)+'…':labelText):'')+'</div>');
      });
    });
    // Planned (not-yet-brewed) batches assigned to this vessel render as ghost
    // bars — outlined, low-opacity, clearly distinct from real/projected bars.
    // They span plannedStart → plannedStart + recipe ferment days so you can
    // eyeball whether a plan collides with a vessel that's still occupied.
    (APP.plannedBatches||[]).forEach(function(pb){
      if(pb.fermenterId!==f.id)return;
      var pStartMs=new Date(pb.plannedStart).getTime();
      if(isNaN(pStartMs))return;
      var prec=APP.recipes.find(function(r){return r.id===pb.recipeId;});
      var pFermDays=(prec&&prec.fermentDays)||42;
      var pEndMs=pStartMs+pFermDays*86400000;
      if(pEndMs<startMs||pStartMs>endMs)return;
      var pLeft=pct(pStartMs);
      var pWidth=Math.max(0.5,pct(pEndMs)-pLeft);
      var pColor=(prec&&prec.brandColor)||'#8a8a8a';
      var pName=(prec?prec.name:'Planned batch');
      var pTip='◷ PLANNED · '+escHtml(pName)+' in '+escHtml(f.name)+' · brew '+fmtDate(pb.plannedStart);
      bars.push('<div class="gantt-bar gantt-bar-planned" style="left:'+pLeft+'%;width:'+pWidth+'%;background:repeating-linear-gradient(135deg,'+pColor+'33,'+pColor+'33 6px,'+pColor+'1a 6px,'+pColor+'1a 12px);border:1px dotted '+pColor+';color:'+pColor+'" onclick="event.stopPropagation();openPlanBatchModal(\''+pb.id+'\')" title="'+pTip+'">'+(pWidth>4?'◷ '+escHtml(pName.length>18?pName.slice(0,16)+'…':pName):'')+'</div>');
    });
    var batchCount=APP.batches.filter(function(b){
      return getBatchVesselHistory(b).some(function(s){return s.fermenterId===f.id;});
    }).length;
    return'<div class="gantt-lane">'
      +'<div style="display:flex;align-items:center;gap:8px;padding-right:12px">'
      +'<div style="width:5px;height:32px;border-radius:2px;background:'+(f.color||'#c9a84c')+';flex-shrink:0"></div>'
      +'<div style="min-width:0"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(f.name)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3)">'+(f.capacity?fmtVol(f.capacity)+' · ':'')+batchCount+' batch'+(batchCount===1?'':'es')+'</div>'
      +'</div></div>'
      +'<div class="gantt-track" style="height:40px">'
      +markerHtml
      +bars.join('')
      +(now.getTime()>=startMs&&now.getTime()<=endMs?'<div class="gantt-today" style="left:'+pct(now.getTime())+'%"></div>':'')
      +'</div></div>';
  }).join('');

  // Navigation
  var ftStep=ftMobile?1:3;  // page month-by-month on mobile's zoomed-in view
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">'
    +'<div style="display:flex;gap:6px">'
    +'<button class="btn btn-secondary btn-sm" onclick="navFermTimeline(-'+ftStep+')" title="Shift '+ftStep+' month'+(ftStep===1?'':'s')+' back">◀ −'+ftStep+'mo</button>'
    +'<button class="btn btn-secondary btn-sm" onclick="navFermTimeline(0)" title="Reset to today">⌂ Today</button>'
    +'<button class="btn btn-secondary btn-sm" onclick="navFermTimeline('+ftStep+')" title="Shift '+ftStep+' month'+(ftStep===1?'':'s')+' forward">+'+ftStep+'mo ▶</button>'
    +'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1px">'
    +new Date(startMs).toLocaleString('en-GB',{month:'short',year:'numeric'})
    +' → '
    +new Date(endMs).toLocaleString('en-GB',{month:'short',year:'numeric'})
    +(window._ftOffset?' · shifted '+(window._ftOffset>0?'+':'')+window._ftOffset+'mo':'')
    +'</div></div>';

  var legend='<div style="display:flex;gap:18px;margin-top:14px;font-family:var(--font-mono);font-size:11px;color:var(--text3);flex-wrap:wrap">'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:var(--gold2);vertical-align:middle;border-radius:2px"></span> Bottled (actual)</span>'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:var(--gold2);opacity:0.65;border:1px dashed rgba(255,255,255,0.4);vertical-align:middle;border-radius:2px"></span> Projected (active batch)</span>'
    +'<span><span style="display:inline-block;width:14px;height:10px;background:repeating-linear-gradient(135deg,#8a8a8a55,#8a8a8a55 4px,#8a8a8a22 4px,#8a8a8a22 8px);border:1px dotted #8a8a8a;vertical-align:middle;border-radius:2px"></span> Planned (queued)</span>'
    +'<span><span style="display:inline-block;width:1px;height:10px;background:var(--gold);box-shadow:0 0 4px var(--gold);vertical-align:middle"></span> Today</span>'
    +'</div>';

  // Summary: when does each fermenter next become free?
  var summaryRows=APP.fermenters.map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    if(!occ)return'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="color:'+(f.color||'#c9a84c')+'">'+escHtml(f.name)+'</span><span style="color:var(--green2)">Free</span></div>';
    var freeWhenMs=null;
    var bot=APP.bottling[occ.id];
    if(bot&&bot.date){
      freeWhenMs=new Date(bot.date).getTime();
    }else{
      var recipe=APP.recipes.find(function(r){return r.id===occ.recipeId;});
      if(recipe)freeWhenMs=new Date(occ.startDate).getTime()+(recipe.fermentDays||42)*86400000;
    }
    var daysUntil=freeWhenMs?Math.ceil((freeWhenMs-now.getTime())/86400000):null;
    return'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="color:'+(f.color||'#c9a84c')+'">'+escHtml(f.name)+'</span><span style="color:var(--text2)">'+escHtml(occ.name)+(daysUntil!=null?(daysUntil>0?' · free in ~'+daysUntil+'d':' · ready to bottle'):'')+'</span></div>';
  }).join('');

  return'<div class="page-title">Fermenter Schedule</div>'
    +'<div class="page-subtitle">When each vessel is busy · click a bar to open the batch</div>'
    +nav
    +'<div class="gantt" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">'
    +monthLabels
    +lanes
    +legend
    +'</div>'
    +'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📅 NEXT TO FREE UP</div></div>'
    +summaryRows
    +'</div>'
    +renderBrewPlanCard()
    +renderShoppingListCard();
}

// ==================== BREW PLANNER ====================
// The brew-plan queue: a list of planned batches you intend to brew. Each
// surfaces as a ghost bar on the Gantt above, feeds the aggregated shopping
// list below, and "deploys" into a real batch on brew day.
function renderBrewPlanCard(){
  var plans=(APP.plannedBatches||[]).slice().sort(function(a,b){
    return new Date(a.plannedStart||0)-new Date(b.plannedStart||0);
  });
  var addBtn='<button class="btn btn-primary btn-sm" onclick="openPlanBatchModal()">＋ Plan a Batch</button>';
  var head='<div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><div class="card-title">◷ BREW PLAN</div>'+addBtn+'</div>';
  if(!plans.length){
    return'<div class="card" style="margin-top:16px">'+head
      +'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:4px 0">No batches queued. Plan your next brews to see them on the schedule above and roll up everything you need to buy.</div></div>';
  }
  var now=new Date();
  var rows=plans.map(function(pb){
    var r=APP.recipes.find(function(x){return x.id===pb.recipeId;});
    var f=getFermenter(pb.fermenterId);
    var startMs=new Date(pb.plannedStart).getTime();
    var daysOut=isNaN(startMs)?null:Math.round((startMs-now.getTime())/86400000);
    var whenTxt=daysOut==null?'no date':(daysOut===0?'today':(daysOut>0?'in '+fmtDuration(daysOut):Math.abs(daysOut)+'d ago'));
    // Conflict check: is the target vessel still busy at planned brew time?
    var conflict='';
    if(f){
      var occ=fermenterOccupiedBy(f.id);
      if(occ){
        var freeMs=null;var bot=APP.bottling[occ.id];
        if(bot&&bot.date)freeMs=new Date(bot.date).getTime();
        else{var orec=APP.recipes.find(function(x){return x.id===occ.recipeId;});if(orec)freeMs=new Date(occ.startDate).getTime()+(orec.fermentDays||42)*86400000;}
        if(freeMs&&!isNaN(startMs)&&freeMs>startMs){
          conflict='<span style="font-family:var(--font-mono);font-size:10px;color:var(--red2);letter-spacing:0.5px"> · ⚠ '+escHtml(f.name)+' busy until ~'+fmtDate(new Date(freeMs).toISOString())+'</span>';
        }
      }
    }
    var color=(r&&r.brandColor)||'#c9a84c';
    return'<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:5px;height:40px;border-radius:2px;background:'+color+';flex-shrink:0"></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13.5px;color:var(--text);font-weight:500">'+escHtml(r?r.name:'(recipe removed)')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:0.5px;margin-top:2px">'
      +(f?escHtml(f.name):'<span style="color:var(--text3)">unassigned vessel</span>')+' · '+fmtVol(pb.volume||(r?r.volume:4.5))+' · brew '+(isNaN(startMs)?'—':fmtDate(pb.plannedStart))+' ('+whenTxt+')'+conflict
      +'</div>'
      +(function(){
        var y=getYeastById(pb.yeast),bits=[];
        if(y)bits.push(y.name.split('—')[0].trim());
        if(pb.honeyType)bits.push(pb.honeyType+' honey');
        if(pb.bottleSize)bits.push(pb.bottleSize==='mixed'?'mixed bottles':pb.bottleSize+' ml bottles');
        return bits.length?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-top:2px;opacity:0.85">'+escHtml(bits.join(' · '))+'</div>':'';
      }())
      +(pb.notes?'<div style="font-size:11.5px;color:var(--text3);font-style:italic;margin-top:2px">'+escHtml(pb.notes)+'</div>':'')+'</div>'
      +'<div style="display:flex;gap:5px;flex-shrink:0">'
      +'<button class="btn btn-primary btn-sm" onclick="deployPlannedBatch(\''+pb.id+'\')" title="Start this batch now">▸ Deploy</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="openPlanBatchModal(\''+pb.id+'\')" title="Edit plan">✎</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="removePlannedBatch(\''+pb.id+'\')" title="Remove from plan">✕</button>'
      +'</div></div>';
  }).join('');
  return'<div class="card" style="margin-top:16px">'+head+rows+'</div>';
}

// Aggregate everything the queued batches will consume, net of what's already
// in your supplies, into a single shopping list. Core consumables (honey,
// yeast, nutrient, bottles) are inventory-matched; recipe-specific extras
// (fruit, spices, adjuncts) are listed to gather but not stock-matched.
// Total grams of nutrient a recipe calls for at a given volume — summed from its
// own ingredient lines (scaled), so the shopping list matches what the recipe
// actually needs instead of a flat 12 g/5 L guess (which over-counts the light
// sparkling/session meads and under-counts the high-gravity sacks).
function recipeNutrientGrams(r,vol){
  if(!r)return 0;
  var f=vol/(r.volume||5),total=0;
  (r.ingredients||[]).forEach(function(ing){
    if(!/nutrient/i.test(ing.item||''))return;
    var m=String(ing.amount||'').match(/([0-9]+(?:\.[0-9]+)?)\s*g\b/i);
    if(m)total+=parseFloat(m[1])*f;
  });
  return total;
}
function computeShoppingNeeds(){
  var plans=APP.plannedBatches||[];
  var ccy=(APP.settings&&APP.settings.currency)||'€';
  var sachetSz=parseFloat(APP.settings&&APP.settings.sachetSize)||12;
  var need={honeyKg:0,yeastPackets:0,nutrientGrams:0,nutrientSachets:0,bottles750:0,bottles500:0,caps:0};
  var honeyTypes={},yeastNames={};
  var extras={}; // key -> {item, amounts, batches}
  plans.forEach(function(pb){
    var r=APP.recipes.find(function(x){return x.id===pb.recipeId;});
    if(!r)return;
    var vol=parseFloat(pb.volume)||r.volume||4.5;
    var og=r.ogTarget||1.095;
    need.honeyKg+=(og-1)*1000*vol/292;
    if(pb.honeyType)honeyTypes[pb.honeyType]=(honeyTypes[pb.honeyType]||0)+1;
    // Yeast packets scale with the CHOSEN strain's coverage (sachet covers L)
    var strain=getYeastById(pb.yeast)||{sachetCoversL:17};
    need.yeastPackets+=Math.max(1,Math.ceil(vol/(strain.sachetCoversL||17)));
    if(strain.name)yeastNames[strain.name]=(yeastNames[strain.name]||0)+1;
    need.nutrientGrams+=recipeNutrientGrams(r,vol);  // from the recipe, not a flat guess
    // Bottles per the chosen bottle type
    var litersAfterLoss=vol*0.9;
    var size=pb.bottleSize||'mixed';
    if(size==='750'){need.bottles750+=Math.floor(litersAfterLoss/0.75);}
    else if(size==='500'){need.bottles500+=Math.floor(litersAfterLoss/0.5);}
    else{ // mixed: fill 750s, drop a leftover ≥0.4L into a 500
      var n750=Math.floor(litersAfterLoss/0.75);
      var leftover=litersAfterLoss-n750*0.75;
      need.bottles750+=n750;
      if(leftover>=0.4)need.bottles500+=1;
    }
    // Recipe-specific extras: ingredient lines that aren't the staples
    (r.ingredients||[]).forEach(function(ing){
      var nm=String(ing.item||'').trim();
      if(!nm)return;
      if(/honey|water|yeast|nutrient/i.test(nm))return; // staples handled above
      if(/metabisulfite|sorbate|sulfite|campden/i.test(nm))return; // stabilizers — assumed on hand
      var key=nm.toLowerCase();
      if(!extras[key])extras[key]={item:nm,amounts:[],batches:0};
      extras[key].amounts.push(ing.amount||'');
      extras[key].batches++;
    });
  });
  need.caps=need.bottles750+need.bottles500; // one closure per bottle
  // Whole sachets to buy for the summed gram requirement (rounded up once across
  // all plans, not per-batch, so it doesn't over-count).
  need.nutrientSachets=need.nutrientGrams>0?Math.ceil(need.nutrientGrams/sachetSz):0;
  // Cross-reference inventory by supply type
  function haveQty(type){return (APP.supplies||[]).filter(function(s){return s.type===type;}).reduce(function(sum,s){return sum+(parseFloat(s.qty)||0);},0);}
  function priceOf(type){var s=(APP.supplies||[]).find(function(x){return x.type===type&&parseFloat(x.pricePerUnit)>0;});return s?parseFloat(s.pricePerUnit):0;}
  var honeyPrice=parseFloat(APP.settings&&APP.settings.honeyPricePerKg)||priceOf('honey')||0;
  var lines=[];
  function pushLine(label,unit,needQty,haveType,price){
    if(needQty<=0)return;
    var haveQ=haveQty(haveType);
    var buy=Math.max(0,needQty-haveQ);
    lines.push({label:label,unit:unit,need:needQty,have:haveQ,buy:buy,cost:(price||priceOf(haveType))?buy*(price||priceOf(haveType)):0});
  }
  // Honey label notes which type(s) the plans call for
  var honeyTypeList=Object.keys(honeyTypes);
  var honeyLabel='Honey'+(honeyTypeList.length?' · '+honeyTypeList.join(', '):'');
  lines.push((function(){var n=Math.round(need.honeyKg*100)/100,h=Math.round(haveQty('honey')*100)/100,buy=Math.max(0,n-h);return{label:honeyLabel,unit:'kg',need:n,have:h,buy:buy,cost:honeyPrice?buy*honeyPrice:0};})());
  var yeastNameList=Object.keys(yeastNames);
  pushLine('Yeast'+(yeastNameList.length?' · '+yeastNameList.join(', '):''),'packets',need.yeastPackets,'yeast');
  pushLine('Nutrient · ~'+Math.round(need.nutrientGrams)+' g','sachets',need.nutrientSachets,'nutrient');
  pushLine('Bottles · 750 ml','pcs',need.bottles750,'bottle750');
  pushLine('Bottles · 500 ml','pcs',need.bottles500,'bottle500');
  pushLine('Crown caps','pcs',need.caps,'crowncap');
  var extrasList=Object.keys(extras).map(function(k){return extras[k];});
  return{lines:lines,extras:extrasList,currency:ccy,planCount:plans.length};
}

// What chemical/adjunct supplies does a recipe call for? Scanned from its
// ingredient list so brewability covers more than honey + yeast.
function detectRecipeSupplyNeeds(r){
  var hay=((r.ingredients||[]).map(function(i){return i.item||'';}).join(' ')).toLowerCase();
  return {
    pectic:/pectic|pectin/.test(hay),
    sulfite:/metabisul|campden|sulfite|sulphite|k-?meta/.test(hay),
    sorbate:/sorbate/.test(hay)
  };
}

// Which recipes can you actually start from what's in supplies — checking honey,
// yeast, nutrient AND the recipe-specific chemicals (pectic enzyme, metabisulfite,
// sorbate). `scaleVol` is the batch size to evaluate (the block's scale slider).
// Also cross-references planned batches: flags recipes whose ingredients are
// already reserved for a scheduled batch (so you don't accidentally starve it).
function computeBrewableRecipes(scaleVol){
  var supplies=APP.supplies||[];
  function haveType(t){return supplies.filter(function(s){return s.type===t;}).reduce(function(a,s){return a+(parseFloat(s.qty)||0);},0);}
  var have={honey:haveType('honey'),yeast:haveType('yeast'),nutrient:haveType('nutrient'),pectic:haveType('pectic'),sulfite:haveType('sulfite'),sorbate:haveType('sorbate')};
  // Supplies already committed to planned/scheduled batches.
  var sachetSz=parseFloat(APP.settings&&APP.settings.sachetSize)||12;
  var planned={honey:0,yeast:0,nutrient:0};
  (APP.plannedBatches||[]).forEach(function(pb){
    var r=(APP.recipes||[]).find(function(x){return x.id===pb.recipeId;});
    if(!r)return;
    var v=parseFloat(pb.volume)||r.volume||5,og=r.ogTarget||1.095;
    if(og>1)planned.honey+=(og-1)*1000*v/292;
    planned.yeast+=1;
    planned.nutrient+=Math.max(1,Math.ceil(recipeNutrientGrams(r,v)/sachetSz));
  });
  var vol=parseFloat(scaleVol)||5;
  var list=(APP.recipes||[]).map(function(r){
    var og=r.ogTarget||1.095;
    if(og<=1)return null;
    var honeyPerL=(og-1)*1000/292;
    if(honeyPerL<=0)return null;
    var honeyNeed=honeyPerL*vol;
    var nutrientNeed=Math.max(1,Math.ceil(recipeNutrientGrams(r,vol)/sachetSz));
    var chem=detectRecipeSupplyNeeds(r);
    var missing=[];
    if(have.honey<honeyNeed-0.001)missing.push('honey');
    if(have.yeast<1)missing.push('yeast');
    if(have.nutrient<nutrientNeed)missing.push('nutrient');
    if(chem.pectic&&have.pectic<=0)missing.push('pectic enzyme');
    if(chem.sulfite&&have.sulfite<=0)missing.push('metabisulfite');
    if(chem.sorbate&&have.sorbate<=0)missing.push('sorbate');
    // Would brewing this now leave too little for the scheduled batches?
    var starves=[];
    if(planned.honey>0&&have.honey-honeyNeed<planned.honey-0.001)starves.push('honey');
    if(planned.yeast>0&&have.yeast-1<planned.yeast)starves.push('yeast');
    if(planned.nutrient>0&&have.nutrient-nutrientNeed<planned.nutrient)starves.push('nutrient');
    var abv=r.abvTarget||Math.round((og-(r.fgTarget||1.010))*131.25*10)/10;
    return{recipe:r,og:og,abv:abv,honeyNeed:honeyNeed,maxVol:have.honey/honeyPerL,missing:missing,starves:starves,makeable:missing.length===0};
  }).filter(Boolean);
  list.sort(function(a,b){if(a.makeable!==b.makeable)return a.makeable?-1:1;return b.maxVol-a.maxVol;});
  return{have:have,planned:planned,hasPlanned:(APP.plannedBatches||[]).length>0,vol:vol,list:list};
}

function toggleBrewWhatYouHave(){
  window._bwyhOpen=!window._bwyhOpen;
  var card=document.getElementById('bwyh-card');
  if(card)card.outerHTML=renderBrewWhatYouHaveCard();
}
function setBrewWhatYouHaveVol(v){
  window._bwyhVol=parseFloat(v)||5;
  var lbl=document.getElementById('bwyh-vol-label');
  if(lbl)lbl.textContent=fmtVol(window._bwyhVol);
  var list=document.getElementById('bwyh-list');
  if(list)list.innerHTML=renderBwyhList();
}
function renderBwyhList(){
  var r=computeBrewableRecipes(window._bwyhVol);
  if(!r.list.length)return'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:6px 0">No recipes to evaluate yet.</div>';
  var makeable=r.list.filter(function(x){return x.makeable;});
  var shown=(makeable.length?makeable:r.list).slice(0,12);
  // Styled exactly like the Recipes page cards: colored top bar, name in the
  // recipe's brand colour, mono stats line, and a tag-style brewability badge.
  var cards=shown.map(function(x){
    var rec=x.recipe,ok=x.makeable,color=rec.brandColor||'#c9a84c';
    var badge;
    if(ok&&x.starves.length)badge='<span class="recipe-tag" style="color:var(--gold2);border-color:var(--gold2)">⚠ '+escHtml(x.starves.join('/'))+' reserved</span>';
    else if(ok)badge='<span class="recipe-tag" style="color:#a8d27a;border-color:rgba(122,160,64,0.5)">✓ Ready to brew</span>';
    else badge='<span class="recipe-tag" style="color:var(--red2);border-color:var(--red2)">Needs '+escHtml(x.missing.join(', '))+'</span>';
    return'<div class="recipe-card" style="cursor:pointer" onclick="openPlanBatchModal(null,\''+rec.id+'\','+window._bwyhVol+')" title="Plan a '+escHtml(fmtVol(window._bwyhVol))+' batch of '+escHtml(rec.name)+'">'
      +'<div class="recipe-card-bar" style="background:'+color+'"></div>'
      +'<div class="recipe-card-body" style="padding:13px 14px">'
      +'<div class="recipe-name" style="color:'+color+'">'+escHtml(rec.name)+'</div>'
      +'<div class="recipe-style">'+escHtml(rec.style||'')+(rec.category&&rec.category!==rec.style?' · '+escHtml(rec.category):'')+'</div>'
      +'<div style="display:flex;gap:12px;font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:9px"><span>OG '+x.og.toFixed(3)+'</span><span>~'+x.abv+'% ABV</span></div>'
      +'<div>'+badge+'</div>'
      +'</div></div>';
  }).join('');
  var note=makeable.length?'':'<div style="font-size:12px;color:var(--text3);font-style:italic;margin-bottom:8px">Nothing fully makeable at '+escHtml(fmtVol(window._bwyhVol))+' — these are the closest; the badge shows what\'s missing.</div>';
  return note+'<div class="bwyh-grid">'+cards+'</div>';
}

function renderBrewWhatYouHaveCard(){
  if(window._bwyhVol==null)window._bwyhVol=5;
  if(window._bwyhOpen==null)window._bwyhOpen=false;
  var r=computeBrewableRecipes(window._bwyhVol);
  var makeableCount=r.list.filter(function(x){return x.makeable;}).length;
  var header='<div class="card" id="bwyh-card" style="margin-bottom:16px">'
    +'<div onclick="toggleBrewWhatYouHave()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none">'
    +'<div class="card-title">🍯 BREW WITH WHAT YOU HAVE</div>'
    +'<div style="display:flex;align-items:center;gap:10px"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:0.5px">'+makeableCount+' ready · '+fmtWt(r.have.honey)+' honey</span><span style="color:var(--gold2);font-size:13px">'+(window._bwyhOpen?'▾':'▸')+'</span></div>'
    +'</div>';
  if(!window._bwyhOpen)return header+'</div>';
  var plannedNote=r.hasPlanned?'<div style="font-size:11.5px;color:var(--text3);margin-top:10px;font-style:italic">Cross-checked against your planned batches — a ⚠ badge means brewing it now would leave too little for a scheduled batch.</div>':'';
  var body='<div style="font-size:12px;color:var(--text3);margin:10px 0 4px">Recipes you can start now from your supplies — honey, yeast, nutrient and the chemicals each recipe calls for (pectic enzyme, metabisulfite, sorbate).</div>'
    +'<div style="display:flex;align-items:center;gap:12px;margin:8px 0 12px">'
    +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;white-space:nowrap">BATCH SIZE</span>'
    +'<input type="range" min="1" max="12" step="0.5" value="'+window._bwyhVol+'" oninput="setBrewWhatYouHaveVol(this.value)" style="flex:1">'
    +'<span id="bwyh-vol-label" style="font-family:var(--font-display);font-size:16px;color:var(--gold2);min-width:70px;text-align:right">'+fmtVol(window._bwyhVol)+'</span>'
    +'</div>'
    +'<div id="bwyh-list">'+renderBwyhList()+'</div>'
    +plannedNote;
  return header+body+'</div>';
}

function renderShoppingListCard(){
  var s=computeShoppingNeeds();
  var fmtN=function(n){return (Math.abs(n-Math.round(n))<0.005)?String(Math.round(n)):n.toFixed(2);};
  // Supplies worth restocking — same rule as the dashboard alert: below a set
  // threshold, OR out of stock entirely (qty 0) even without a threshold.
  var low=getLowSupplies();
  if(!s.planCount&&!low.length)return'';
  var ccy=s.currency;
  var planHtml='';
  if(s.planCount){
    var anyToBuy=s.lines.some(function(l){return l.buy>0;});
    var totalCost=s.lines.reduce(function(sum,l){return sum+(l.cost||0);},0);
    var rows=s.lines.map(function(l){
      var buyBadge=l.buy>0
        ?'<span style="font-family:var(--font-mono);font-size:12px;color:var(--gold);font-weight:600">buy '+fmtN(l.buy)+' '+l.unit+'</span>'+(l.cost?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-left:6px">'+ccy+l.cost.toFixed(2)+'</span>':'')
        :'<span style="font-family:var(--font-mono);font-size:11px;color:var(--green2)">✓ have enough</span>';
      return'<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:13px;color:var(--text)">'+escHtml(l.label)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">need '+fmtN(l.need)+' '+l.unit+' · have '+fmtN(l.have)+'</div></div>'
        +'<div style="text-align:right">'+buyBadge+'</div></div>';
    }).join('');
    var extrasHtml='';
    if(s.extras.length){
      extrasHtml='<div style="margin-top:12px"><div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Also gather (recipe-specific)</div>'
        +s.extras.map(function(e){
          return'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px"><span style="color:var(--text2)">'+escHtml(e.item)+'</span><span style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">'+escHtml(e.amounts.filter(Boolean).join(' + ')||(e.batches+'×'))+'</span></div>';
        }).join('')+'</div>';
    }
    var footer=totalCost>0?'<div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:10px;margin-top:4px;border-top:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Est. cost to buy the shortfall</span><span style="font-family:var(--font-mono);font-size:15px;color:var(--gold);font-weight:600">'+ccy+totalCost.toFixed(2)+'</span></div>':'';
    planHtml='<div style="font-size:12px;color:var(--text3);margin-bottom:8px">Across '+s.planCount+' planned batch'+(s.planCount===1?'':'es')+', net of what\'s in your supplies.'+(anyToBuy?'':' You\'re fully stocked — nothing to buy. 🎉')+'</div>'+rows+extrasHtml+footer;
  }
  var lowHtml='';
  if(low.length){
    lowHtml='<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin:'+(s.planCount?'14px':'0')+' 0 6px">Running low / out of stock</div>'
      +low.map(function(x){
        var q=parseFloat(x.qty)||0,th=parseFloat(x.threshold)||0;
        var badge=q<=0?'out of stock'+(th>0?' · ⚠ ≤'+fmtN(th)+' '+escHtml(x.unit||''):''):(fmtN(q)+' '+escHtml(x.unit||'')+' left'+(th>0?' · ⚠ ≤'+fmtN(th):''));
        return'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)"><div><span style="font-size:13px;color:var(--text)">'+escHtml(x.name)+'</span>'+(x.brand?'<span style="color:var(--text3);font-size:11px;font-style:italic"> · '+escHtml(x.brand)+'</span>':'')+'</div><span style="font-family:var(--font-mono);font-size:11px;color:var(--red2)">'+badge+'</span></div>';
      }).join('');
  }
  return'<div class="card" style="margin-top:16px"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><div class="card-title">🛒 SHOPPING LIST</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="copyShoppingList()" title="Copy as text">⧉ Copy</button></div>'
    +planHtml+lowHtml+'</div>';
}

function copyShoppingList(){
  var s=computeShoppingNeeds();
  var fmtN=function(n){return (Math.abs(n-Math.round(n))<0.005)?String(Math.round(n)):n.toFixed(2);};
  var lines=['MeadOS shopping list'];
  if(s.planCount){
    lines.push('— '+s.planCount+' planned batch'+(s.planCount===1?'':'es')+' —');
    s.lines.forEach(function(l){if(l.buy>0)lines.push('• '+l.label+': buy '+fmtN(l.buy)+' '+l.unit);});
    if(s.extras.length){lines.push('Also gather:');s.extras.forEach(function(e){lines.push('• '+e.item+(e.amounts.filter(Boolean).length?' ('+e.amounts.filter(Boolean).join(' + ')+')':''));});}
  }
  var low=getLowSupplies();
  if(low.length){
    lines.push('— Running low / out of stock —');
    low.forEach(function(x){var q=parseFloat(x.qty)||0,th=parseFloat(x.threshold)||0;lines.push('• '+x.name+(x.brand?' ('+x.brand+')':'')+': '+(q<=0?'out of stock':fmtN(q)+' '+(x.unit||'')+' left')+(th>0?', restock at '+fmtN(th):''));});
  }
  var txt=lines.join('\n');
  // ponytail: execCommand is deprecated but it's the only copy path on plain-http
  // LAN URLs (the common MeadOS setup), where navigator.clipboard is undefined.
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){toast('✦ Shopping list copied');},fallback);
  }else fallback();
  function fallback(){
    try{
      var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      var ok=document.execCommand('copy');document.body.removeChild(ta);
      toast(ok?'✦ Shopping list copied':'⚠ Copy failed');
    }catch(e){toast('⚠ Copy failed');}
  }
}

// Sensible default yeast/nutrient/honey for a recipe. Recipes don't carry a
// yeast id directly, so we sniff their ingredient lines for a known strain /
// honey before falling back to the house defaults.
function planDefaultsForRecipe(r){
  var d={yeast:'m05',nutrient:'mj-mead',honeyType:'Wildflower'};
  if(!r)return d;
  var ings=(r.ingredients||[]).map(function(i){return String(i.item||'');}).join(' | ').toLowerCase();
  var strain=YEAST_STRAINS.find(function(y){
    return ings.indexOf(y.id.toLowerCase())!==-1||ings.indexOf(y.name.split('—')[0].trim().toLowerCase())!==-1;
  });
  if(strain)d.yeast=strain.id;
  var honey=HONEY_TYPES.find(function(t){return ings.indexOf(t.toLowerCase())!==-1;});
  if(honey)d.honeyType=honey;
  if(/fermaid-?o/i.test(ings))d.nutrient='fermaid-o';
  else if(/fermaid-?k/i.test(ings))d.nutrient='fermaid-k';
  return d;
}

function openPlanBatchModal(planId,presetRecipeId,presetVolSI){
  closeModal();
  var editing=planId?(APP.plannedBatches||[]).find(function(p){return p.id===planId;}):null;
  if(!APP.recipes||!APP.recipes.length){toast('⚠ No recipes available');return;}
  var preRecipe=editing?editing.recipeId:(presetRecipeId||(APP.recipes[0]&&APP.recipes[0].id));
  var recipeOpts=APP.recipes.map(function(r){return'<option value="'+r.id+'"'+(r.id===preRecipe?' selected':'')+'>'+escHtml(r.name)+' ('+r.style+')</option>';}).join('');
  var initial=APP.recipes.find(function(r){return r.id===preRecipe;})||APP.recipes[0];
  var defs=planDefaultsForRecipe(initial);
  var fermOpts='<option value="">— Unassigned (decide later) —</option>'+(APP.fermenters||[]).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var label=f.name+(f.capacity?' ('+fmtVol(f.capacity)+')':'')+(occ?' — occupied':' — free');
    return'<option value="'+f.id+'"'+(editing&&editing.fermenterId===f.id?' selected':'')+'>'+escHtml(label)+'</option>';
  }).join('');
  var us=currentUnitSystem();
  var volSI=editing?editing.volume:(presetVolSI||(initial?initial.volume:4.5));
  var volDisp=(volSI/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  var defDate=editing?editing.plannedStart:(function(){var d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10);}());
  var curYeast=editing&&editing.yeast||defs.yeast;
  var curNutrient=editing&&editing.nutrient||defs.nutrient;
  var curHoney=editing&&editing.honeyType||defs.honeyType;
  var curBottle=editing&&editing.bottleSize||'mixed';
  var unitBtns=['metric','us','imperial'].map(function(s){
    var lbl={metric:'Metric · L',us:'US · gal',imperial:'Imp · gal'}[s];var on=(s===us);
    return'<button type="button" id="pb-unit-'+s+'" onclick="onPlanUnitChange(\''+s+'\')" style="flex:1;padding:6px 4px;border-radius:var(--radius);cursor:pointer;font-family:var(--font-mono);font-size:10px;letter-spacing:0.3px;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+';color:'+(on?'var(--gold2)':'var(--text3)')+'">'+lbl+'</button>';
  }).join('');
  var yeastOpts=YEAST_STRAINS.map(function(y){return'<option value="'+y.id+'"'+(y.id===curYeast?' selected':'')+'>'+escHtml(y.name)+' · '+(y.abvMax||'?')+'% max</option>';}).join('');
  var nutrientOpts=NUTRIENT_PRODUCTS.map(function(p){return'<option value="'+p.id+'"'+(p.id===curNutrient?' selected':'')+'>'+escHtml(p.name)+'</option>';}).join('');
  var honeyOpts=HONEY_TYPES.map(function(t){return'<option value="'+escHtml(t)+'"'+(t===curHoney?' selected':'')+'>'+escHtml(t)+'</option>';}).join('');
  var bottleOpts=[['mixed','Mixed (750 ml + a 500 ml remainder)'],['750','750 ml only'],['500','500 ml only']]
    .map(function(b){return'<option value="'+b[0]+'"'+(b[0]===curBottle?' selected':'')+'>'+b[1]+'</option>';}).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:620px">'
    +'<div class="modal-title">◷ '+(editing?'EDIT PLANNED BATCH':'PLAN A BATCH')+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px">Queue a future brew with everything this recipe needs. It appears on the schedule and rolls into your shopping list — no supplies are deducted until you deploy it.</div>'
    +'<div class="form-group"><label class="form-label">Recipe</label><select class="form-select" id="pb-recipe" onchange="onPlanRecipeChange()">'+recipeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Units</label><div style="display:flex;gap:6px">'+unitBtns+'</div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Target Fermenter</label><select class="form-select" id="pb-fermenter">'+fermOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label" id="pb-vol-label">Volume ('+UNIT_VOL[us].label+')</label><input class="form-input" id="pb-vol" type="number" step="0.1" value="'+volDisp+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Yeast Strain</label><select class="form-select" id="pb-yeast">'+yeastOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Nutrient</label><select class="form-select" id="pb-nutrient">'+nutrientOpts+'</select></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Honey Type</label><select class="form-select" id="pb-honey">'+honeyOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Bottle Type</label><select class="form-select" id="pb-bottle">'+bottleOpts+'</select></div></div>'
    +'<div class="form-group"><label class="form-label">Planned Brew Date</label><input class="form-input" id="pb-date" type="date" value="'+defDate+'"></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="pb-notes" placeholder="e.g. gift batch for the holidays, try the new orange-blossom honey">'+escHtml(editing&&editing.notes||'')+'</textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePlannedBatch('+(editing?'\''+editing.id+'\'':'null')+')">'+(editing?'Save':'Add to Plan')+'</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// Units toggle inside the plan modal — converts the volume field and updates
// the (global) unit preference, mirroring the New Batch modal.
function onPlanUnitChange(sys){
  if(sys!=='metric'&&sys!=='us'&&sys!=='imperial')return;
  var old=currentUnitSystem();
  var volEl=document.getElementById('pb-vol');
  if(volEl&&volEl.value!==''){var si=parseFloat(volEl.value)*UNIT_VOL[old].toSI;volEl.value=(si/UNIT_VOL[sys].toSI).toFixed(sys==='metric'?2:3);}
  APP.settings.unitSystem=sys;
  if(typeof saveSettings==='function')saveSettings();
  var vl=document.getElementById('pb-vol-label');if(vl)vl.textContent='Volume ('+UNIT_VOL[sys].label+')';
  ['metric','us','imperial'].forEach(function(s){
    var b=document.getElementById('pb-unit-'+s);if(!b)return;var on=(s===sys);
    b.style.border='1px solid '+(on?'var(--gold)':'var(--border)');
    b.style.background=on?'rgba(201,168,76,0.14)':'var(--bg3)';
    b.style.color=on?'var(--gold2)':'var(--text3)';
  });
}

// When the recipe changes, refresh the derived defaults (volume, yeast,
// nutrient, honey) so the plan reflects the new recipe.
function onPlanRecipeChange(){
  var r=APP.recipes.find(function(x){return x.id===document.getElementById('pb-recipe').value;});
  if(!r)return;
  var us=currentUnitSystem();
  var volEl=document.getElementById('pb-vol');if(volEl)volEl.value=(r.volume/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  var defs=planDefaultsForRecipe(r);
  var ye=document.getElementById('pb-yeast');if(ye)ye.value=defs.yeast;
  var ne=document.getElementById('pb-nutrient');if(ne)ne.value=defs.nutrient;
  var he=document.getElementById('pb-honey');if(he)he.value=defs.honeyType;
}

function savePlannedBatch(planId){
  var volIn=parseFloat(document.getElementById('pb-vol').value);
  var volSI=!isNaN(volIn)?Math.round(volIn*UNIT_VOL[currentUnitSystem()].toSI*1000)/1000:4.5;
  var data={
    recipeId:document.getElementById('pb-recipe').value,
    fermenterId:document.getElementById('pb-fermenter').value||'',
    volume:volSI,
    yeast:(document.getElementById('pb-yeast')||{}).value||'m05',
    nutrient:(document.getElementById('pb-nutrient')||{}).value||'mj-mead',
    honeyType:(document.getElementById('pb-honey')||{}).value||'Wildflower',
    bottleSize:(document.getElementById('pb-bottle')||{}).value||'mixed',
    plannedStart:document.getElementById('pb-date').value||'',
    notes:document.getElementById('pb-notes').value.trim()
  };
  if(!APP.plannedBatches)APP.plannedBatches=[];
  if(planId){
    var idx=APP.plannedBatches.findIndex(function(p){return p.id===planId;});
    if(idx>=0)APP.plannedBatches[idx]=Object.assign({},APP.plannedBatches[idx],data);
  }else{
    data.id=genId();data.createdAt=new Date().toISOString();
    APP.plannedBatches.push(data);
  }
  closeModal();scheduleSave();toast('✦ Plan saved');renderMain();
}

function removePlannedBatch(planId){
  var pb=(APP.plannedBatches||[]).find(function(p){return p.id===planId;});
  if(!pb)return;
  var r=APP.recipes.find(function(x){return x.id===pb.recipeId;});
  if(!confirm('Remove '+(r?r.name:'this batch')+' from your brew plan?'))return;
  APP.plannedBatches=APP.plannedBatches.filter(function(p){return p.id!==planId;});
  scheduleSave();toast('Removed from plan');renderMain();
}

// Deploy turns a plan into a real batch: opens the New Batch modal pre-filled
// from the plan. On successful creation the plan entry is cleared (createBatch
// reads window._deployingPlanId).
function deployPlannedBatch(planId){
  var pb=(APP.plannedBatches||[]).find(function(p){return p.id===planId;});
  if(!pb)return;
  openNewBatchModal(pb.recipeId,pb.volume,{fermenterId:pb.fermenterId,startDate:pb.plannedStart,notes:pb.notes,plannedId:planId,yeast:pb.yeast,nutrient:pb.nutrient,honeyType:pb.honeyType});
}

function navFermTimeline(deltaMonths){
  if(deltaMonths===0)window._ftOffset=0;
  else window._ftOffset=(window._ftOffset||0)+deltaMonths;
  renderMain();
}

// ==================== YEAR IN REVIEW ====================
function renderYearReview(){
  // Allow viewing previous years' reviews. State lives on window._yrYear (in-memory)
  // so leaving and coming back resets to the current year.
  var currentYear=new Date().getFullYear();
  var year=window._yrYear||currentYear;
  // Find the earliest year that has any batch activity so we know the lower bound
  var minYear=currentYear;
  APP.batches.forEach(function(b){
    if(b.startDate){var y=new Date(b.startDate).getFullYear();if(y<minYear)minYear=y;}
  });
  Object.keys(APP.bottling||{}).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(bot&&bot.date){var y=new Date(bot.date).getFullYear();if(y<minYear)minYear=y;}
  });
  var yearStart=new Date(year,0,1).getTime();
  var yearEnd=new Date(year+1,0,1).getTime();
  // Filter batches started in this year
  var thisYearBatches=APP.batches.filter(function(b){
    var t=new Date(b.startDate).getTime();
    return t>=yearStart&&t<yearEnd;
  });
  // Filter bottled-this-year
  var bottledThisYear=APP.batches.filter(function(b){
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
        var b=APP.batches.find(function(x){return x.id===bid;});
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
    +'<button class="btn btn-secondary btn-sm" '+(canPrev?'onclick="navYearReview(-1)"':'disabled style="opacity:0.3;cursor:not-allowed"')+' title="Previous year">← '+(year-1)+'</button>'
    +(year!==currentYear?'<button class="btn btn-secondary btn-sm" onclick="navYearReviewToCurrent()" title="Jump to current year">↺ '+currentYear+'</button>':'')
    +'<button class="btn btn-secondary btn-sm" '+(canNext?'onclick="navYearReview(1)"':'disabled style="opacity:0.3;cursor:not-allowed"')+' title="Next year">'+(year+1)+' →</button>'
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
      +'<button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="showView(\'batch\',\''+bestTasting.batch.id+'\')">View Batch →</button>'
      +'</div></div>':'')
    +(perBottleAvg!=='—'?'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 ECONOMICS</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+ccy+totalCost.toFixed(0)+'</div><div class="yr-stat-lbl">Total Spent</div></div>'
      +'<div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+ccy+perBottleAvg+'</div><div class="yr-stat-lbl">Per Bottle</div></div>'
      +'<div style="text-align:center"><div class="yr-stat-val" style="font-size:24px">'+(thisYearBatches.length>0?ccy+(totalCost/thisYearBatches.length).toFixed(0):'—')+'</div><div class="yr-stat-lbl">Per Batch</div></div></div>'
      +'</div>':'')
    +renderPersonalRecords()
    +'<div style="text-align:center;margin-top:24px"><button class="btn btn-secondary" onclick="printYearReview('+year+')">🖨 Print Year in Review</button></div>';
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
  var thisYearBatches=APP.batches.filter(function(b){var t=new Date(b.startDate).getTime();return t>=yearStart&&t<yearEnd;});
  var bottledThisYear=APP.batches.filter(function(b){var bot=APP.bottling[b.id];if(!bot)return false;var t=new Date(bot.date).getTime();return t>=yearStart&&t<yearEnd;});
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
        var b=APP.batches.find(function(x){return x.id===bid;});
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
    +'<div class="footer">Crafted with patience · MeadOS · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'</div></body></html>');
  w.document.close();
}

// ==================== CUSTOM RECIPES ====================
var DEFAULT_RECIPE_TEMPLATE={
  name:'',style:'Traditional Mead',difficulty:'Intermediate',
  description:'',brandColor:'#c9a84c',
  volume:5,ogTarget:1.095,fgTarget:1.010,abvTarget:11.5,fermentDays:42,
  minDays:60,peakDays:180,maxDays:730,
  tags:['custom'],
  ingredients:[{item:'Honey',amount:'1.7 kg',notes:'Wildflower or local'},
               {item:'Spring water',amount:'4.5 L',notes:'Top up to 5L total'},
               {item:'Mangrove Jack\'s M05 yeast',amount:'10 g (1 packet)',notes:'Sprinkle dry'},
               {item:'Mead Yeast Nutrient',amount:'12 g',notes:'SNA across 2 doses'}],
  steps:[{day:0,title:'Brew Day',desc:'Sanitize. Mix honey with warm water until dissolved. Top up to 5L. Pitch yeast. Seal with airlock.'},
         {day:1,title:'First Nutrient',desc:'Add 6g nutrient. Stir gently.'},
         {day:3,title:'Second Nutrient',desc:'Add remaining 6g nutrient. Log gravity.'},
         {day:14,title:'Mid-Fermentation Reading',desc:'Take gravity reading. Should be around 1.020.'},
         {day:42,title:'Bottling Day',desc:'Final gravity should be stable. Rack, optionally stabilize, bottle.'}]
};

// ==================== RECIPE DESIGNER WIZARD ====================
// A guided alternative to the manual recipe editor: pick a style + targets and
// the wizard back-solves the honey/OG/FG math, recommends a yeast that can
// finish the ABV, suggests a nutrient protocol, and assembles ingredients +
// a step schedule. On finish it seeds window._editingRecipe and hands off to
// the existing renderRecipeEditor() so save/validation reuse one path.
var WIZ_STYLES=[
  {key:'Traditional Mead',label:'Traditional',color:'#c9a84c',adjunct:null,desc:'Honey, water, yeast — nothing to hide behind.'},
  {key:'Melomel',label:'Melomel (fruit)',color:'#c04858',adjunct:'fruit',desc:'Mead fermented with fruit.'},
  {key:'Cyser',label:'Cyser (apple)',color:'#8a3838',adjunct:'juice',desc:'Mead made with apple juice in place of some water.'},
  {key:'Metheglin',label:'Metheglin (spiced)',color:'#7a5230',adjunct:'spice',desc:'Mead with herbs/spices.'},
  {key:'Bochet',label:'Bochet (caramelised)',color:'#5a3a20',adjunct:null,desc:'Honey caramelised before fermenting — toffee, marshmallow.'},
  {key:'Pyment',label:'Pyment (grape)',color:'#6a2a4a',adjunct:'juice',desc:'Mead with grape juice/wine must.'},
  {key:'Braggot',label:'Braggot (malt)',color:'#9a6a2a',adjunct:null,desc:'Mead/beer hybrid with malt.'}
];
var WIZ_SWEETNESS=[
  {key:'dry',label:'Dry',fg:1.000,desc:'Crisp, no residual sweetness'},
  {key:'offdry',label:'Off-dry',fg:1.006,desc:'A hint of honey on the finish'},
  {key:'semi',label:'Semi-sweet',fg:1.014,desc:'Balanced, rounded'},
  {key:'sweet',label:'Sweet',fg:1.022,desc:'Honey-forward, dessert-leaning'},
  {key:'dessert',label:'Dessert',fg:1.030,desc:'Rich, syrupy — sack mead'}
];
function wizComputeMath(w){
  var sw=WIZ_SWEETNESS.find(function(s){return s.key===w.sweetness;})||WIZ_SWEETNESS[2];
  var fg=sw.fg;
  var abv=parseFloat(w.abv)||12;
  var vol=parseFloat(w.volume)||5;
  var og=fg+abv/131.25;
  var honeyKg=(og-1)*1000*vol/292;
  return{fg:fg,og:Math.round(og*1000)/1000,abv:abv,vol:vol,honeyKg:Math.round(honeyKg*100)/100};
}
function wizRecommendYeasts(targetAbv){
  // Strains that can comfortably finish the target, sorted by headroom then
  // by how clean/honey-friendly they are (M05 first among equals).
  var ok=YEAST_STRAINS.filter(function(y){return (y.abvMax||14)>=targetAbv+0.5;});
  ok.sort(function(a,b){
    if(a.id==='m05')return-1;if(b.id==='m05')return 1;
    return(a.abvMax||14)-(b.abvMax||14);
  });
  return ok.length?ok:YEAST_STRAINS.slice();
}
function openRecipeWizard(){
  closeModal();
  window._wiz={step:0,name:'',style:'Traditional Mead',volume:5,abv:12,sweetness:'semi',
    yeast:'m05',nutrient:'tosca2',adjunctName:'',adjunctAmount:''};
  renderRecipeWizard();
}
function wizSet(field,val){
  if(!window._wiz)return;
  window._wiz[field]=val;
  // Picking a style preselects a sensible adjunct placeholder
  if(field==='style'){
    var st=WIZ_STYLES.find(function(s){return s.key===val;});
    if(st&&st.adjunct&&!window._wiz.adjunctName){
      window._wiz.adjunctName=st.adjunct==='fruit'?'Fruit (e.g. raspberries)':st.adjunct==='juice'?(val==='Cyser'?'Fresh apple juice':'Grape juice'):'Spices';
    }
  }
  renderRecipeWizard();
}
function wizNav(delta){
  if(!window._wiz)return;
  // Read free-text/numeric inputs that aren't button-driven before navigating
  var nameEl=document.getElementById('wiz-name');if(nameEl)window._wiz.name=nameEl.value;
  var volEl=document.getElementById('wiz-vol');if(volEl)window._wiz.volume=parseFloat(volEl.value)||5;
  var abvEl=document.getElementById('wiz-abv');if(abvEl)window._wiz.abv=parseFloat(abvEl.value)||12;
  var yEl=document.getElementById('wiz-yeast');if(yEl)window._wiz.yeast=yEl.value;
  var nEl=document.getElementById('wiz-nutrient');if(nEl)window._wiz.nutrient=nEl.value;
  var anEl=document.getElementById('wiz-adj-name');if(anEl)window._wiz.adjunctName=anEl.value;
  var aaEl=document.getElementById('wiz-adj-amt');if(aaEl)window._wiz.adjunctAmount=aaEl.value;
  window._wiz.step=Math.max(0,Math.min(3,window._wiz.step+delta));
  renderRecipeWizard();
}
function wizBuildRecipe(){
  var w=window._wiz,m=wizComputeMath(w);
  var st=WIZ_STYLES.find(function(s){return s.key===w.style;})||WIZ_STYLES[0];
  var yeast=getYeastById(w.yeast)||YEAST_STRAINS[0];
  var fermDays=m.abv>=15?56:42;
  var ingredients=[
    {item:'Honey',amount:m.honeyKg+' kg',notes:st.key==='Bochet'?'Caramelise before fermenting':'Best quality you can source'}
  ];
  if(st.adjunct==='juice'){
    ingredients.push({item:w.adjunctName||'Juice',amount:(w.adjunctAmount||Math.round(m.vol*0.5*10)/10+' L'),notes:'Replaces part of the water'});
    ingredients.push({item:'Spring water',amount:'to '+m.vol+' L total',notes:'Top up after honey + juice'});
  }else{
    ingredients.push({item:'Spring water',amount:'to '+m.vol+' L total',notes:'Chlorine-free; top up to volume'});
  }
  ingredients.push({item:yeast.name,amount:(yeast.sachetSize||10)+' '+(yeast.unit||'g')+' (1 packet)',notes:yeast.format==='dry'&&yeast.id!=='m05'?'Rehydrate with GoFerm':'Sprinkle on must'});
  var nutLabel=(w.nutrient==='sna'||w.nutrient==='sna-high')?'Mead Yeast Nutrient':'Fermaid-O';
  ingredients.push({item:nutLabel,amount:Math.round(m.vol*2.5)+' g total',notes:(w.nutrient==='tosca2'?'TOSCA 2.0':w.nutrient==='tosna2'?'TOSNA':w.nutrient==='tiosna'?'TiOSNA':w.nutrient==='sna-high'?'SNA, 3 doses':'SNA, 2 doses')+' schedule'});
  if(st.adjunct==='fruit'||st.adjunct==='spice'){
    ingredients.push({item:w.adjunctName||(st.adjunct==='fruit'?'Fruit':'Spices'),amount:w.adjunctAmount||(st.adjunct==='fruit'?Math.round(m.vol*0.3*10)/10+' kg':'to taste'),notes:'Add in secondary'});
  }
  var organic=(w.nutrient!=='sna'&&w.nutrient!=='sna-high');
  var steps=[
    {day:0,title:'Brew Day',desc:'Clean & sanitize. '+(st.key==='Bochet'?'Caramelise the honey to your target colour, cool, then ':'')+'dissolve honey in '+(st.adjunct==='juice'?'juice + water':'water')+', top up to '+m.vol+' L. Take OG (target '+m.og+'). '+(yeast.id==='m05'?'Sprinkle yeast on the surface.':'Rehydrate yeast (GoFerm) and pitch.')+' Seal with airlock.'},
    {day:1,title:organic?'GoFerm / Dose 1':'First Nutrient',desc:'Add the first nutrient dose. Confirm airlock activity within 24h.'},
    {day:3,title:'Nutrient Dose 2',desc:'Add the next dose. Gentle degas. Log gravity.'},
    {day:7,title:'Sugar-break check',desc:'Around the 1/3 sugar break — add the final dose if your protocol schedules one. Log gravity.'}
  ];
  if(st.adjunct==='fruit'||st.adjunct==='spice'||st.adjunct==='juice'&&st.key==='Pyment'){
    steps.push({day:14,title:'Rack onto '+(st.adjunct==='spice'?'spices':'fruit'),desc:'Rack to secondary'+(st.adjunct!=='spice'?' onto '+(w.adjunctName||'fruit'):'')+'. Taste periodically and pull when balanced.'});
  }else{
    steps.push({day:14,title:'Rack to secondary',desc:'If gravity is stable, rack off the lees. Optionally add K-meta.'});
  }
  steps.push({day:fermDays,title:'Final gravity & bottle',desc:'Two stable readings near '+m.fg+' confirm completion. Stabilise if backsweetening, then bottle.'});
  var minDays=m.abv>=15?120:75;
  return{
    name:w.name||((WIZ_STYLES.find(function(s){return s.key===w.style;})||{}).label||'Mead')+' (Designed)',
    style:w.style,difficulty:m.abv>=15?'Advanced':'Intermediate',
    description:'Designed for '+m.abv+'% ABV, '+(WIZ_SWEETNESS.find(function(s){return s.key===w.sweetness;})||{}).label.toLowerCase()+'. '+st.desc,
    brandColor:st.color,
    volume:m.vol,ogTarget:m.og,fgTarget:m.fg,abvTarget:m.abv,fermentDays:fermDays,
    minDays:minDays,peakDays:minDays+120,maxDays:minDays+700,
    tags:['custom','designed',st.label.split(' ')[0].toLowerCase()],
    ingredients:ingredients,steps:steps
  };
}
function wizFinish(){
  wizNav(0); // flush any open inputs into state
  var recipe=wizBuildRecipe();
  recipe.id=null;
  window._editingRecipe=recipe;
  window._wiz=null;
  renderRecipeEditor(); // hand off to the existing editor for fine-tune + save
}
function renderRecipeWizard(){
  var w=window._wiz;if(!w)return;
  var existing=document.querySelector('.modal-overlay');if(existing)existing.remove();
  var m=wizComputeMath(w);
  var steps=['Style & Targets','Yeast','Adjuncts & Nutrient','Review'];
  var dots=steps.map(function(s,i){
    return'<div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;'+(i===w.step?'background:var(--gold);color:#1a1a0f':i<w.step?'background:var(--green2);color:#0f0f0a':'background:var(--bg3);color:var(--text3)')+'">'+(i<w.step?'✓':(i+1))+'</div><span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.5px;color:'+(i===w.step?'var(--gold2)':'var(--text3)')+'">'+s+'</span></div>';
  }).join('<div style="flex:1;height:1px;background:var(--border);min-width:8px"></div>');
  var body='';
  if(w.step===0){
    var styleBtns=WIZ_STYLES.map(function(s){
      var on=w.style===s.key;
      return'<button type="button" onclick="wizSet(\'style\',\''+s.key+'\')" style="text-align:left;padding:10px 12px;border-radius:var(--radius);cursor:pointer;border:1px solid '+(on?s.color:'var(--border)')+';background:'+(on?s.color+'22':'var(--bg3)')+'"><div style="font-size:13px;color:'+(on?s.color:'var(--text)')+';font-weight:500">'+s.label+'</div><div style="font-size:11px;color:var(--text3);line-height:1.3;margin-top:2px">'+s.desc+'</div></button>';
    }).join('');
    var sweetBtns=WIZ_SWEETNESS.map(function(s){
      var on=w.sweetness===s.key;
      return'<button type="button" onclick="wizSet(\'sweetness\',\''+s.key+'\')" style="flex:1;min-width:84px;padding:8px 6px;border-radius:var(--radius);cursor:pointer;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+'"><div style="font-size:12px;color:'+(on?'var(--gold2)':'var(--text)')+'">'+s.label+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);margin-top:2px">FG '+s.fg.toFixed(3)+'</div></button>';
    }).join('');
    body='<div class="form-group"><label class="form-label">Recipe Name</label><input class="form-input" id="wiz-name" value="'+escHtml(w.name)+'" placeholder="My Designer Mead"></div>'
      +'<div class="form-group"><label class="form-label">Style</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+styleBtns+'</div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Batch Volume (L)</label><input class="form-input" id="wiz-vol" type="number" step="0.5" value="'+w.volume+'" oninput="window._wiz.volume=parseFloat(this.value)||5;wizUpdateMath()"></div>'
      +'<div class="form-group"><label class="form-label">Target ABV (%)</label><input class="form-input" id="wiz-abv" type="number" step="0.5" value="'+w.abv+'" oninput="window._wiz.abv=parseFloat(this.value)||12;wizUpdateMath()"></div></div>'
      +'<div class="form-group"><label class="form-label">Sweetness</label><div style="display:flex;gap:6px;flex-wrap:wrap">'+sweetBtns+'</div></div>'
      +wizMathBox(m);
  }else if(w.step===1){
    var recs=wizRecommendYeasts(m.abv);
    var recIds={};recs.slice(0,3).forEach(function(y){recIds[y.id]=true;});
    var opts=YEAST_STRAINS.map(function(y){
      var fits=(y.abvMax||14)>=m.abv+0.5;
      return'<option value="'+y.id+'"'+(w.yeast===y.id?' selected':'')+'>'+escHtml(y.name)+' · '+(y.abvMax||'?')+'% max'+(fits?'':' ⚠ below target')+(recIds[y.id]?' ★':'')+'</option>';
    }).join('');
    var chosen=getYeastById(w.yeast)||YEAST_STRAINS[0];
    var fitsTarget=(chosen.abvMax||14)>=m.abv+0.5;
    body='<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">For <strong>'+m.abv+'% ABV</strong> you need a yeast that tolerates at least that. ★ marks strains recommended for this target (honey-friendly, enough headroom).</div>'
      +'<div class="form-group"><label class="form-label">Yeast Strain</label><select class="form-select" id="wiz-yeast" onchange="window._wiz.yeast=this.value;renderRecipeWizard()">'+opts+'</select></div>'
      +'<div style="padding:12px;background:var(--bg3);border-radius:var(--radius);border-left:3px solid '+(fitsTarget?'var(--green2)':'var(--red2)')+'">'
      +'<div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(chosen.name)+'</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.5">'+escHtml(chosen.profile||'')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);margin-top:6px">ABV max '+(chosen.abvMax||'?')+'% · temp '+(chosen.optimalTempLow||'?')+'–'+(chosen.optimalTempHigh||'?')+'°C · N demand '+(chosen.nitrogenNeed||'?')+'</div>'
      +(fitsTarget?'':'<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ This strain may not reach '+m.abv+'% — it could stall sweet. Pick one with higher tolerance or lower your target.</div>')
      +'</div>'+wizMathBox(m);
  }else if(w.step===2){
    var st=WIZ_STYLES.find(function(s){return s.key===w.style;})||WIZ_STYLES[0];
    var adjBlock='';
    if(st.adjunct){
      adjBlock='<div class="form-row"><div class="form-group"><label class="form-label">'+(st.adjunct==='fruit'?'Fruit':st.adjunct==='spice'?'Spice / herb':'Juice')+'</label><input class="form-input" id="wiz-adj-name" value="'+escHtml(w.adjunctName)+'" placeholder="'+(st.adjunct==='fruit'?'Raspberries, frozen':st.adjunct==='spice'?'Cinnamon, vanilla…':'Apple juice')+'"></div>'
        +'<div class="form-group"><label class="form-label">Amount</label><input class="form-input" id="wiz-adj-amt" value="'+escHtml(w.adjunctAmount)+'" placeholder="'+(st.adjunct==='fruit'?(Math.round(m.vol*0.3*10)/10+' kg'):st.adjunct==='spice'?'2 sticks':(Math.round(m.vol*0.5*10)/10+' L'))+'"></div></div>';
    }else{
      adjBlock='<div style="font-size:13px;color:var(--text3);font-style:italic;margin-bottom:12px">'+escHtml(st.label)+' is a base-style mead — no fruit/spice adjuncts. You can still add some in the editor afterwards.</div>';
    }
    body=adjBlock
      +'<div class="form-group"><label class="form-label">Nutrient Protocol</label><select class="form-select" id="wiz-nutrient" onchange="window._wiz.nutrient=this.value">'
      +'<option value="tosca2"'+(w.nutrient==='tosca2'?' selected':'')+'>TOSCA 2.0 — organic, recommended</option>'
      +'<option value="tosna2"'+(w.nutrient==='tosna2'?' selected':'')+'>TOSNA (classic) — organic</option>'
      +'<option value="tiosna"'+(w.nutrient==='tiosna'?' selected':'')+'>TiOSNA — organic, front-loaded</option>'
      +'<option value="sna"'+(w.nutrient==='sna'?' selected':'')+'>SNA — standard (2 doses)</option>'
      +'<option value="sna-high"'+(w.nutrient==='sna-high'?' selected':'')+'>SNA — high-gravity (3 doses)</option>'
      +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Organic (Fermaid-O) protocols give the cleanest honey character. High-gravity (≥15%) batches benefit from the extra dose.</div></div>'
      +wizMathBox(m);
  }else{
    var built=wizBuildRecipe();
    body='<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Here\'s your designed recipe. Open it in the editor to tweak ingredient amounts, steps, and aging windows before saving.</div>'
      +'<div style="padding:14px;background:var(--bg3);border-radius:var(--radius)">'
      +'<div style="font-family:var(--font-display);font-size:18px;color:'+built.brandColor+'">'+escHtml(built.name)+'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-bottom:8px">'+escHtml(built.style)+' · '+built.difficulty+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0">'
      +['OG '+built.ogTarget,'FG '+built.fgTarget,built.abvTarget+'% ABV',built.volume+' L'].map(function(x){return'<div style="text-align:center;padding:8px 4px;background:var(--bg);border-radius:6px;font-family:var(--font-mono);font-size:12px;color:var(--gold2)">'+x+'</div>';}).join('')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--text3);margin:8px 0 4px">INGREDIENTS</div>'
      +built.ingredients.map(function(i){return'<div style="font-size:12.5px;color:var(--text2);padding:2px 0">• '+escHtml(i.item)+' — <span style="color:var(--text3)">'+escHtml(i.amount)+'</span></div>';}).join('')
      +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--text3);margin:10px 0 4px">SCHEDULE · '+built.steps.length+' STEPS over '+built.fermentDays+' days</div>'
      +built.steps.map(function(s){return'<div style="font-size:12px;color:var(--text2);padding:2px 0">Day '+s.day+' — '+escHtml(s.title)+'</div>';}).join('')
      +'</div>';
  }
  var backBtn=w.step>0?'<button class="btn btn-secondary" onclick="wizNav(-1)">← Back</button>':'<button class="btn btn-secondary" onclick="closeModal();window._wiz=null">Cancel</button>';
  var nextBtn=w.step<3?'<button class="btn btn-primary" onclick="wizNav(1)">Next →</button>':'<button class="btn btn-primary" onclick="wizFinish()">Open in Editor →</button>';
  var html='<div class="modal-overlay" onclick="if(event.target===this){closeModal();window._wiz=null;}"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">✦ RECIPE DESIGNER</div>'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap">'+dots+'</div>'
    +body
    +'<div class="modal-actions">'+backBtn+nextBtn+'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function wizMathBox(m){
  return'<div style="margin-top:14px;padding:12px;background:var(--bg4);border-radius:var(--radius);border:1px solid var(--border)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);margin-bottom:8px">⚗ THE MATH (auto)</div>'
    +'<div id="wiz-math-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+wizMathCells(m)+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:8px;line-height:1.4">'+wizMathNote(m)+'</div></div>';
}
function wizMathCells(m){
  return[['OG',m.og],['FG',m.fg.toFixed(3)],['ABV',m.abv+'%'],['Honey',m.honeyKg+' kg']].map(function(x){
    return'<div style="text-align:center"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+x[1]+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">'+x[0]+'</div></div>';
  }).join('');
}
function wizMathNote(m){
  return'Need <strong>~'+m.honeyKg+' kg honey</strong> in '+m.vol+' L to hit OG '+m.og+', finishing near FG '+m.fg.toFixed(3)+' for ~'+m.abv+'% ABV.';
}
// Live-update only the math box without re-rendering the whole modal (keeps
// focus in the number inputs on step 0).
function wizUpdateMath(){
  var grid=document.getElementById('wiz-math-grid');if(!grid||!window._wiz)return;
  var m=wizComputeMath(window._wiz);
  grid.innerHTML=wizMathCells(m);
}

function openCustomRecipeModal(seedId){
  closeModal();
  var seed=seedId?APP.recipes.find(function(r){return r.id===seedId;}):null;
  var r=seed?JSON.parse(JSON.stringify(seed)):JSON.parse(JSON.stringify(DEFAULT_RECIPE_TEMPLATE));
  if(seed){r.name=seed.name+' (My Version)';r.id=null;}
  window._editingRecipe=r;
  renderRecipeEditor();
}

function renderRecipeEditor(){
  var r=window._editingRecipe;
  if(!r)return;
  var existing=document.querySelector('.modal-overlay');
  if(existing)existing.remove();
  var isEdit=r.id&&APP.customRecipes.some(function(x){return x.id===r.id;});
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:700px">'
    +'<div class="modal-title">'+(isEdit?'EDIT':'NEW')+' CUSTOM RECIPE</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Name</label><input class="form-input" id="cr-name" value="'+escHtml(r.name)+'" placeholder="My Cherry-Vanilla Melomel"></div>'
    +'<div class="form-group"><label class="form-label">Style</label><input class="form-input" id="cr-style" value="'+escHtml(r.style)+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="cr-diff">'+['Beginner','Intermediate','Advanced','Expert'].map(function(d){return'<option'+(r.difficulty===d?' selected':'')+'>'+d+'</option>';}).join('')+'</select></div>'
    +'<div class="form-group"><label class="form-label">Brand Color</label><input class="form-input" type="color" id="cr-color" value="'+r.brandColor+'" style="height:38px;padding:2px;cursor:pointer"></div>'
    +'<div class="form-group"><label class="form-label">Ferment Days</label><input class="form-input" id="cr-ferment" type="number" value="'+r.fermentDays+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="cr-vol" type="number" step="0.1" value="'+r.volume+'"></div>'
    +'<div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="cr-og" type="number" step="0.001" value="'+r.ogTarget+'"></div>'
    +'<div class="form-group"><label class="form-label">Target FG</label><input class="form-input" id="cr-fg" type="number" step="0.001" value="'+r.fgTarget+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Target ABV %</label><input class="form-input" id="cr-abv" type="number" step="0.1" value="'+r.abvTarget+'"></div>'
    +'<div class="form-group"><label class="form-label">Ready (days)</label><input class="form-input" id="cr-min" type="number" value="'+r.minDays+'"></div>'
    +'<div class="form-group"><label class="form-label">Peak (days)</label><input class="form-input" id="cr-peak" type="number" value="'+r.peakDays+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cr-desc" rows="2">'+escHtml(r.description)+'</textarea></div>'
    +'<div class="form-group"><label class="form-label">Tags (comma-separated)</label><input class="form-input" id="cr-tags" value="'+escHtml((r.tags||[]).join(', '))+'" placeholder="cherry, autumn, sweet"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">Ingredients</div><button class="btn btn-secondary btn-sm" onclick="addRecipeIngredient()">＋ Add Row</button></div>'
    +'<div id="cr-ingredients">'+r.ingredients.map(function(ing,i){return ingredientRowHtml(ing,i);}).join('')+'</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">Steps</div><button class="btn btn-secondary btn-sm" onclick="addRecipeStep()">＋ Add Step</button></div>'
    +'<div id="cr-steps">'+r.steps.map(function(s,i){return stepRowHtml(s,i);}).join('')+'</div>'
    +'<div class="modal-actions">'
    +(isEdit?'<button class="btn btn-danger" style="margin-right:auto" onclick="deleteCustomRecipe(\''+r.id+'\')">Delete</button>':'')
    +'<button class="btn btn-secondary" onclick="closeModal();window._editingRecipe=null">Cancel</button>'
    +'<button class="btn btn-primary" onclick="saveCustomRecipe()">Save Recipe</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function ingredientRowHtml(ing,i){
  return'<div class="form-row-3" style="margin-bottom:6px" data-ing-row="'+i+'"><input class="form-input cr-ing-item" placeholder="Item" value="'+escHtml(ing.item||'')+'"><input class="form-input cr-ing-amount" placeholder="Amount" value="'+escHtml(ing.amount||'')+'"><div style="display:flex;gap:4px"><input class="form-input cr-ing-notes" placeholder="Notes" value="'+escHtml(ing.notes||'')+'" style="flex:1"><button class="btn-icon" onclick="this.closest(\'[data-ing-row]\').remove()" title="Remove">×</button></div></div>';
}
function stepRowHtml(s,i){
  return'<div style="display:grid;grid-template-columns:60px 1fr;gap:6px;margin-bottom:6px" data-step-row="'+i+'"><input class="form-input cr-step-day" type="number" placeholder="Day" value="'+(s.day||0)+'"><div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;gap:4px"><input class="form-input cr-step-title" placeholder="Title" value="'+escHtml(s.title||'')+'" style="flex:1"><button class="btn-icon" onclick="this.closest(\'[data-step-row]\').remove()" title="Remove">×</button></div><textarea class="form-textarea cr-step-desc" placeholder="Description" rows="2">'+escHtml(s.desc||'')+'</textarea></div></div>';
}
function addRecipeIngredient(){
  document.getElementById('cr-ingredients').insertAdjacentHTML('beforeend',ingredientRowHtml({item:'',amount:'',notes:''},Date.now()));
}
function addRecipeStep(){
  document.getElementById('cr-steps').insertAdjacentHTML('beforeend',stepRowHtml({day:0,title:'',desc:''},Date.now()));
}

function saveCustomRecipe(){
  var name=document.getElementById('cr-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  var r=window._editingRecipe||{};
  r.name=name;
  r.style=document.getElementById('cr-style').value.trim()||'Custom';
  r.difficulty=document.getElementById('cr-diff').value;
  r.brandColor=document.getElementById('cr-color').value;
  r.fermentDays=parseInt(document.getElementById('cr-ferment').value)||42;
  r.volume=parseFloat(document.getElementById('cr-vol').value)||5;
  r.ogTarget=parseFloat(document.getElementById('cr-og').value)||1.095;
  r.fgTarget=parseFloat(document.getElementById('cr-fg').value)||1.010;
  r.abvTarget=parseFloat(document.getElementById('cr-abv').value)||11;
  r.minDays=parseInt(document.getElementById('cr-min').value)||60;
  r.peakDays=parseInt(document.getElementById('cr-peak').value)||180;
  r.maxDays=Math.max(r.peakDays+90,parseInt(r.maxDays)||730);
  r.description=document.getElementById('cr-desc').value.trim();
  r.tags=document.getElementById('cr-tags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  r.ingredients=Array.from(document.querySelectorAll('#cr-ingredients [data-ing-row]')).map(function(row){
    return{
      item:row.querySelector('.cr-ing-item').value.trim(),
      amount:row.querySelector('.cr-ing-amount').value.trim(),
      notes:row.querySelector('.cr-ing-notes').value.trim()
    };
  }).filter(function(x){return x.item;});
  r.steps=Array.from(document.querySelectorAll('#cr-steps [data-step-row]')).map(function(row){
    return{
      day:parseInt(row.querySelector('.cr-step-day').value)||0,
      title:row.querySelector('.cr-step-title').value.trim(),
      desc:row.querySelector('.cr-step-desc').value.trim()
    };
  }).filter(function(x){return x.title;}).sort(function(a,b){return a.day-b.day;});
  // Assign ID if new
  if(!r.id){r.id='custom_'+genId();}
  r.isCustom=true;
  // Upsert into APP.customRecipes
  var idx=APP.customRecipes.findIndex(function(x){return x.id===r.id;});
  if(idx>=0)APP.customRecipes[idx]=r;
  else APP.customRecipes.push(r);
  rebuildRecipes();
  closeModal();
  scheduleSave();
  window._editingRecipe=null;
  toast('✦ Recipe saved');
  currentRecipeId=r.id;
  showView('recipe-detail');
}

function deleteCustomRecipe(id){
  if(!confirm('Delete this custom recipe? Existing batches using it will keep their data.'))return;
  APP.customRecipes=APP.customRecipes.filter(function(r){return r.id!==id;});
  rebuildRecipes();
  closeModal();
  scheduleSave();
  toast('Recipe deleted');
  window._editingRecipe=null;
  showView('recipes');
}

// ==================== TASTING WHEEL ====================
var TASTING_AXES=[
  {key:'sweetness',label:'Sweetness',hint:'Dry → Sweet'},
  {key:'body',label:'Body',hint:'Light → Full'},
  {key:'acidity',label:'Acidity',hint:'Soft → Sharp'},
  {key:'honey',label:'Honey',hint:'Faint → Forward'},
  {key:'fruit',label:'Fruit',hint:'Absent → Bold'},
  {key:'spice',label:'Spice',hint:'None → Pronounced'},
  {key:'finish',label:'Finish',hint:'Short → Long'},
  {key:'warmth',label:'Warmth',hint:'Cool → Hot (alcohol heat)'}
];

// ---- BJCP scoresheet --------------------------------------------------------
// The five weighted categories of a standard BJCP mead scoresheet (max 50).
// Stored on a tasting as t.bjcp = {aroma,appearance,flavor,mouthfeel,overall,
// total,descriptor}. Optional — a tasting can have free-text notes, a 1-5
// wheel, a star rating, a formal scoresheet, or any mix.
var BJCP_CATEGORIES=[
  {key:'aroma',label:'Aroma',max:12,hint:'Honey character, fermentation, hops/special ingredients, faults'},
  {key:'appearance',label:'Appearance',max:3,hint:'Color, clarity, head/carbonation where appropriate'},
  {key:'flavor',label:'Flavor',max:20,hint:'Honey, balance, sweetness/dryness, special ingredients, finish'},
  {key:'mouthfeel',label:'Mouthfeel',max:5,hint:'Body, carbonation, warmth, astringency, creaminess'},
  {key:'overall',label:'Overall Impression',max:10,hint:'Overall drinking pleasure, intangibles'}
];
var BJCP_MAX=BJCP_CATEGORIES.reduce(function(s,c){return s+c.max;},0); // 50
// Official BJCP descriptor bands (scaled here to the 50-point sheet).
function bjcpDescriptor(total){
  if(total>=45)return{label:'Outstanding',color:'#c9a84c',note:'World-class example of style'};
  if(total>=38)return{label:'Excellent',color:'#7aa850',note:'Exemplifies style well, requires minor fine-tuning'};
  if(total>=30)return{label:'Very Good',color:'#7aa8c0',note:'Generally within style parameters, some minor flaws'};
  if(total>=21)return{label:'Good',color:'#a8a050',note:'Misses the mark on style and/or minor flaws'};
  if(total>=14)return{label:'Fair',color:'#c87850',note:'Off flavors/aromas or major style deficiencies'};
  return{label:'Problematic',color:'#a05050',note:'Major off flavors and aromas dominate'};
}
// Build the collapsible scoresheet inputs for the New Tasting form.
function renderBJCPScoresheet(){
  var rows=BJCP_CATEGORIES.map(function(c){
    return'<div style="display:flex;align-items:center;gap:10px;padding:5px 0">'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--text2)">'+c.label+'</div>'
      +'<div style="font-size:10.5px;color:var(--text3);line-height:1.3">'+c.hint+'</div></div>'
      +'<input class="form-input" id="bjcp-'+c.key+'" type="number" min="0" max="'+c.max+'" step="0.5" oninput="updateBJCPTotal()" style="width:64px;text-align:center;flex-shrink:0">'
      +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);width:30px;flex-shrink:0">/ '+c.max+'</div></div>';
  }).join('');
  return'<details style="margin-top:4px;border:1px solid var(--border);border-radius:var(--radius);padding:0 12px"><summary style="cursor:pointer;padding:10px 0;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--text2)">📋 BJCP SCORESHEET <span style="color:var(--text3)">· optional formal scoring (50 pts)</span></summary>'
    +'<div style="padding-bottom:10px">'+rows
    +'<div id="bjcp-total-line" style="display:flex;justify-content:space-between;align-items:baseline;padding-top:8px;margin-top:6px;border-top:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Total</span><span style="font-family:var(--font-mono);font-size:13px;color:var(--text3)">— / '+BJCP_MAX+'</span></div>'
    +'</div></details>';
}
function readBJCPScore(){
  var score={},any=false,total=0;
  BJCP_CATEGORIES.forEach(function(c){
    var el=document.getElementById('bjcp-'+c.key);
    var v=el?parseFloat(el.value):NaN;
    if(!isNaN(v)){v=Math.max(0,Math.min(c.max,v));score[c.key]=v;total+=v;any=true;}
  });
  if(!any)return null;
  score.total=Math.round(total*2)/2;
  var d=bjcpDescriptor(score.total);
  score.descriptor=d.label;
  return score;
}
function updateBJCPTotal(){
  var line=document.getElementById('bjcp-total-line');
  if(!line)return;
  var s=readBJCPScore();
  if(!s){line.children[1].textContent='— / '+BJCP_MAX;line.children[1].style.color='var(--text3)';return;}
  var d=bjcpDescriptor(s.total);
  line.children[1].innerHTML=s.total+' / '+BJCP_MAX+' · <span style="color:'+d.color+'">'+d.label+'</span>';
  line.children[1].style.color='var(--text)';
}
// Compact read-only render of a saved scoresheet for the tasting journal.
function renderBJCPBadge(bjcp){
  if(!bjcp||bjcp.total==null)return'';
  var d=bjcpDescriptor(bjcp.total);
  var bars=BJCP_CATEGORIES.map(function(c){
    var v=bjcp[c.key]||0,pct=Math.round(v/c.max*100);
    return'<div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--text3);font-family:var(--font-mono)"><span style="width:78px;flex-shrink:0">'+c.label+'</span>'
      +'<span style="flex:1;height:5px;background:var(--bg);border-radius:3px;overflow:hidden;display:inline-block"><span style="display:block;width:'+pct+'%;height:100%;background:'+d.color+'"></span></span>'
      +'<span style="width:40px;text-align:right">'+v+'/'+c.max+'</span></div>';
  }).join('');
  return'<div style="margin:8px 0;padding:8px 10px;background:var(--bg);border-radius:6px;border-left:3px solid '+d.color+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3)">BJCP SCORE</span>'
    +'<span style="font-family:var(--font-display);font-size:16px;color:'+d.color+'">'+bjcp.total+'<span style="font-size:11px;color:var(--text3)">/'+BJCP_MAX+'</span> · '+d.label+'</span></div>'
    +'<div style="display:flex;flex-direction:column;gap:3px">'+bars+'</div></div>';
}

function renderTastingWheel(currentValues,onChange){
  return'<div class="tw-grid">'
    +TASTING_AXES.map(function(ax){
      var val=(currentValues&&currentValues[ax.key])||0;
      var dots=[1,2,3,4,5].map(function(n){
        return'<div class="tw-dot '+(n<=val?'active':'')+'" onclick="setTastingAxis(\''+ax.key+'\','+n+')" title="'+ax.hint+'">'+n+'</div>';
      }).join('');
      return'<div class="tw-axis"><div class="tw-axis-label" title="'+ax.hint+'">'+ax.label+'</div><div class="tw-axis-dots">'+dots+'</div></div>';
    }).join('')
    +'</div>';
}

function setTastingAxis(key,n){
  if(!window._tastingWheel)window._tastingWheel={};
  // Toggle off if clicking same value
  if(window._tastingWheel[key]===n)window._tastingWheel[key]=0;
  else window._tastingWheel[key]=n;
  // Re-render just the wheel section
  var container=document.getElementById('tasting-wheel-container');
  if(container)container.innerHTML=renderTastingWheel(window._tastingWheel);
}

function getTastingWheelRadarHTML(values){
  // Render a small SVG radar chart from values {sweetness:3, body:4, ...}
  var size=240;
  var cx=size/2,cy=size/2;
  var r=size/2-30;
  var n=TASTING_AXES.length;
  var points=TASTING_AXES.map(function(ax,i){
    var v=(values&&values[ax.key])||0;
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var dist=r*(v/5);
    return{x:cx+Math.cos(angle)*dist,y:cy+Math.sin(angle)*dist,axis:ax,angle:angle};
  });
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+18);
    var ly=cy+Math.sin(angle)*(r+18)+4;
    return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="text-transform:uppercase;letter-spacing:1px">'+ax.label+'</text>';
  }).join('');
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(level/5);
      return(cx+Math.cos(angle)*dist)+','+(cy+Math.sin(angle)*dist);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="none" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Axis lines
  var axes=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var ex=cx+Math.cos(angle)*r;
    var ey=cy+Math.sin(angle)*r;
    return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex+'" y2="'+ey+'" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Data polygon
  var dataPolyPts=points.map(function(p){return p.x+','+p.y;}).join(' ');
  // viewBox expanded by ~36 on left/right and ~8 top/bottom so the side labels
  // (FINISH on left at x≈12, ACIDITY on right at x≈228, both with text-anchor
  // middle) aren't clipped when the SVG has an explicit width. overflow:visible
  // is a belt-and-braces safety net for embedders that constrain the SVG box.
  return'<svg viewBox="-36 -8 312 256" overflow="visible" style="display:block;margin:0 auto;overflow:visible" width="100%" preserveAspectRatio="xMidYMid meet">'
    +rings+axes
    +'<polygon points="'+dataPolyPts+'" fill="rgba(201,168,76,0.25)" stroke="#c9a84c" stroke-width="1.5"/>'
    +points.map(function(p){return'<circle cx="'+p.x+'" cy="'+p.y+'" r="2.5" fill="#e8c46a"/>';}).join('')
    +labels
    +'</svg>';
}

// ==================== CALENDAR EXPORT (.ics) ====================
function exportCalendarICS(){
  var active=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  if(!active.length){toast('⚠ No active batches with steps to export');return;}
  var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MeadOS//MeadOS//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:MeadOS Brewing Schedule','X-WR-TIMEZONE:Europe/Brussels'];
  function pad(n){return String(n).padStart(2,'0');}
  function fmtICSDate(d){return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());}
  function fmtICSDT(d){return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z';}
  function escICS(s){return(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');}
  var now=new Date();
  var dtstamp=fmtICSDT(now);
  active.forEach(function(b){
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    if(!recipe)return;
    var startDate=new Date(b.startDate);
    var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):recipe.steps;
    steps.forEach(function(s){
      if(s.day<0)return;
      var taskDate=new Date(startDate.getTime()+s.day*86400000);
      if(taskDate<now&&Math.abs(taskDate-now)>2*86400000)return; // skip past tasks >2 days old
      var uid='meados-'+b.id+'-step-'+s.day+'@meados';
      ics.push('BEGIN:VEVENT');
      ics.push('UID:'+uid);
      ics.push('DTSTAMP:'+dtstamp);
      ics.push('DTSTART;VALUE=DATE:'+fmtICSDate(taskDate));
      var endDate=new Date(taskDate.getTime()+86400000);
      ics.push('DTEND;VALUE=DATE:'+fmtICSDate(endDate));
      ics.push('SUMMARY:'+escICS('⚗ '+b.name+' — '+s.title));
      ics.push('DESCRIPTION:'+escICS(annotateNutrientDesc(s.desc)+'\n\nBatch: '+b.name+' (Day '+s.day+' of '+recipe.fermentDays+')'));
      ics.push('CATEGORIES:Mead Brewing,MeadOS');
      ics.push('END:VEVENT');
    });
  });
  ics.push('END:VCALENDAR');
  var blob=new Blob([ics.join('\r\n')],{type:'text/calendar'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='meados-schedule-'+today()+'.ics';a.click();
  URL.revokeObjectURL(url);
  toast('📅 Calendar exported — open in your calendar app');
}

// ==================== BATCH CERTIFICATE (printable) ====================
function printBatchCertificate(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var bot=APP.bottling[b.id]||{};
  var logs=APP.logs[b.id]||[];
  var tastings=APP.tastings[b.id]||[];
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var abv=bot.abv||(b.og&&bot.fg?calcABV(b.og,bot.fg):(b.og&&lastG?calcABV(b.og,lastG):null));
  var labelImg=getLabelImage(b.recipeId);
  var color=getBatchColor(b);
  var ccy=APP.settings.currency||'€';
  var totalCost=b.cost?((b.cost.honey||0)+(b.cost.extras||0)):0;
  var perBottle=totalCost&&totalBottles(bot)>0?totalCost/totalBottles(bot):0;
  
  var logsTable=logs.map(function(l){
    return'<tr><td>'+fmtDate(l.date)+'</td><td>'+l.gravity+'</td><td>'+(l.temp!=null?l.temp+'°C':'—')+'</td><td>'+(b.og?calcABV(b.og,l.gravity)+'%':'—')+'</td></tr>';
  }).join('');
  
  var tastingsHtml=tastings.map(function(t){
    return'<div style="border-left:3px solid '+color+';padding:8px 14px;margin:8px 0;background:#fafaf6">'
      +'<div style="display:flex;justify-content:space-between"><strong>'+fmtDate(t.date)+'</strong><span>'+'★'.repeat(t.rating||0)+'☆'.repeat(5-(t.rating||0))+'</span></div>'
      +(t.color?'<div><em>Color:</em> '+escHtml(t.color)+'</div>':'')
      +(t.aroma?'<div><em>Aroma:</em> '+escHtml(t.aroma)+'</div>':'')
      +(t.flavor?'<div><em>Flavor:</em> '+escHtml(t.flavor)+'</div>':'')
      +(t.finish?'<div><em>Finish:</em> '+escHtml(t.finish)+'</div>':'')
      +(t.note?'<div style="margin-top:4px;font-style:italic">'+escHtml(t.note)+'</div>':'')
      +'</div>';
  }).join('');
  
  var w=window.open('','_blank','width=900,height=1200');
  if(!w){toast('⚠ Pop-up blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(b.name)+' — Certificate</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:A4;margin:5mm}'
    +'*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}'
    +'html,body{margin:0;padding:0;font-family:"EB Garamond",Georgia,serif;color:#1a1a1f;background:#fff;line-height:1.5;width:100%;overflow-x:hidden}'
    +'.cert{width:100%;padding:14mm 12mm 12mm;margin:0}'
    +'.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid '+color+';padding-bottom:14px;margin-bottom:18px}'
    +'.label-img{width:35%;max-width:80mm;flex-shrink:0;position:relative}'
    +'.label-img svg{width:100%;height:auto;display:block}'
    +'.title-block{flex:1;min-width:0;overflow:hidden}'
    +'.title-block h1{font-family:Cinzel,Georgia,serif;font-size:22px;color:'+color+';margin:0 0 4px;letter-spacing:1.5px;word-break:break-word;line-height:1.15}'
    +'.title-block .style{font-style:italic;color:#666;font-size:13px}'
    +'.title-block .meta{margin-top:10px;font-size:11px;color:#444;line-height:1.7}'
    +'.section{margin:14px 0}'
    +'.section h2{font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:2.5px;color:'+color+';border-bottom:1px solid #ddd;padding-bottom:4px;margin:0 0 10px}'
    +'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
    +'th{text-align:left;background:#f5f3ee;padding:5px 8px;font-family:Cinzel,serif;letter-spacing:1px;font-size:10px;color:#666}'
    +'td{padding:4px 8px;border-bottom:1px solid #eee;word-wrap:break-word}'
    +'.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
    +'.stat{text-align:center;padding:10px 6px;background:#faf8f3;border:1px solid #eaddd0;border-radius:4px}'
    +'.stat-val{font-family:Cinzel,serif;font-size:18px;color:'+color+'}'
    +'.stat-lbl{font-size:9px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-top:2px}'
    +'.footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#888;text-align:center;font-style:italic}'
    +'.toolbar{padding:14px;background:#222;color:#fff;text-align:center;position:sticky;top:0;z-index:10}'
    +'.toolbar button{padding:10px 20px;font-size:14px;cursor:pointer;border:0;border-radius:4px;background:'+color+';color:#fff;font-weight:600;margin:0 4px}'
    +'@media print{.toolbar{display:none!important}body{background:#fff}.cert{padding:0}}'
    +'</style></head><body>'
    +'<div class="toolbar"><button onclick="window.print()">🖨 Print Certificate</button><button onclick="window.close()" style="background:#666">Close</button></div>'
    +'<div class="cert">'
    +'<div class="header">'
    +(labelImg?'<div class="label-img"><svg viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
      +'<image href="'+labelImg+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'
      +((typeof renderOverlayLayer==='function')?renderOverlayLayer(recipe,b,abv||'',{qr:false,bestDrink:false}):'')
      +'</svg></div>':'')
    +'<div class="title-block">'
    +'<h1>'+escHtml(b.name)+'</h1>'
    +'<div class="style">'+escHtml(recipe?recipe.style:(b.style||'Custom Mead'))+'</div>'
    +'<div class="meta">'
    +'Brewed by <strong>'+escHtml(APP.settings.brewerName||'MeadOS')+'</strong><br>'
    +'Started: '+fmtDate(b.startDate)+'<br>'
    +(bot.date?'Bottled: '+fmtDate(bot.date)+'<br>':'')
    +'Volume: '+(b.volume||'?')+' L'
    +(b.honey?' &nbsp;·&nbsp; '+b.honey+' kg honey':'')
    +'</div></div></div>'
    +'<div class="section"><h2>VITAL STATISTICS</h2>'
    +'<div class="grid-3">'
    +'<div class="stat"><div class="stat-val">'+(b.og||'—')+'</div><div class="stat-lbl">Original Gravity</div></div>'
    +'<div class="stat"><div class="stat-val">'+(bot.fg||lastG||'—')+'</div><div class="stat-lbl">Final Gravity</div></div>'
    +'<div class="stat"><div class="stat-val">'+(abv?abv+'%':'—')+'</div><div class="stat-lbl">ABV</div></div>'
    +'</div></div>'
    +(logs.length?'<div class="section"><h2>FERMENTATION LOG</h2>'
      +'<table><thead><tr><th>Date</th><th>SG</th><th>Temp</th><th>Est. ABV</th></tr></thead><tbody>'+logsTable+'</tbody></table>'
      +'</div>':'')
    +(tastings.length?'<div class="section"><h2>TASTING NOTES</h2>'+tastingsHtml+'</div>':'')
    +(b.cost&&totalCost?'<div class="section"><h2>ECONOMICS</h2>'
      +'<div class="grid-3">'
      +'<div class="stat"><div class="stat-val">'+ccy+totalCost.toFixed(2)+'</div><div class="stat-lbl">Total Cost</div></div>'
      +(perBottle>0?'<div class="stat"><div class="stat-val">'+ccy+perBottle.toFixed(2)+'</div><div class="stat-lbl">Per Bottle</div></div>':'')
      +'<div class="stat"><div class="stat-val">'+totalBottles(bot)+'</div><div class="stat-lbl">Bottles</div></div>'
      +'</div></div>':'')
    +(b.notes||bot.notes?'<div class="section"><h2>NOTES</h2><div style="font-style:italic;color:#555">'+escHtml(b.notes||bot.notes||'')+'</div></div>':'')
    +'<div class="footer">Crafted with patience · MeadOS · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'</div></body></html>');
  w.document.close();
}

// ==================== HA COMPANION LOVELACE CARD ====================
// Builds the Lovelace YAML used by all three actions: download, copy, preview.
function buildLovelaceYAML(){
  var brewer=APP.settings.brewerName||'MeadOS';
  var tempEntity=APP.settings.tempSensorEntity||'';
  var appUrl=appBaseUrl();
  var tempBlock=tempEntity?[
    '      - type: entity',
    '        entity: '+tempEntity,
    '        name: Fermentation Temp',
    '        icon: mdi:thermometer'
  ]:[];
  return[
    '# MeadOS Companion Lovelace Card',
    '# Paste this into your HA dashboard via Edit → Add Card → Manual',
    '# Reads from sensor.meadows_data attributes. In MeadOS, configure the optional',
    '# Home Assistant connection and enable "Publish status summary" so these',
    '# attributes update on every save.',
    '# Uses only built-in HA cards — no HACS dependencies required.',
    '',
    'type: vertical-stack',
    'title: ⚗ MeadOS · '+brewer,
    'cards:',
    '',
    '  # ---- HEADER: sync status + fermentation temp ----',
    '  - type: horizontal-stack',
    '    cards:',
    '      - type: entity',
    '        entity: sensor.meadows_data',
    '        name: Last Sync',
    '        icon: mdi:database-sync',
    '        attribute: updated'
  ].concat(tempBlock).concat([
    '',
    '  # ---- STAT GRID ----',
    '  - type: glance',
    '    show_state: true',
    '    columns: 4',
    '    entities:',
    '      - entity: sensor.meadows_data',
    '        name: Active',
    '        icon: mdi:flask',
    '        attribute: active_batches',
    '      - entity: sensor.meadows_data',
    '        name: Bottles',
    '        icon: mdi:bottle-wine',
    '        attribute: bottles_on_hand',
    '      - entity: sensor.meadows_data',
    '        name: Fermenters Free',
    '        icon: mdi:beaker-outline',
    '        attribute: fermenters_free',
    '      - entity: sensor.meadows_data',
    '        name: Ready / Peak',
    '        icon: mdi:glass-wine',
    '        attribute: drinking_window_count',
    '',
    '  # ---- NEXT MILESTONE banner ----',
    '  - type: markdown',
    '    content: |',
    '      ### ⏭ Next up',
    '      {{ state_attr("sensor.meadows_data", "next_milestone") or "_No upcoming milestones._" }}',
    '',
    '  # ---- ACTIVE BATCHES ----',
    '  - type: markdown',
    '    content: |',
    '      ### ⚗ Active Batches',
    '      {{ state_attr("sensor.meadows_data", "active_batch_lines") or "_No active batches._" }}',
    '',
    '  # ---- FERMENTER STATUS ----',
    '  - type: markdown',
    '    content: |',
    '      ### 🛢 Fermenters · {{ state_attr("sensor.meadows_data","fermenters_free") }}/{{ state_attr("sensor.meadows_data","fermenters_total") }} free',
    '      {{ state_attr("sensor.meadows_data", "fermenter_lines") or "_No fermenters configured._" }}',
    '',
    '  # ---- DRINKING WINDOW ALERTS (only shows if there are any) ----',
    '  - type: conditional',
    '    conditions:',
    '      - condition: numeric_state',
    '        entity: sensor.meadows_data',
    '        attribute: drinking_window_count',
    '        above: 0',
    '    card:',
    '      type: markdown',
    '      content: |',
    '        ### 🍷 Drinking Window',
    '        {{ state_attr("sensor.meadows_data", "drinking_lines") }}',
    '',
    '  # ---- OPEN MEADOS BUTTON ----',
    '  - type: button',
    '    name: Open MeadOS',
    '    icon: mdi:glass-mug-variant',
    '    tap_action:',
    '      action: url',
    '      url_path: '+appUrl,
    '',
    '# ===== NOTES =====',
    '# 1. If you have a temperature sensor for your fermentation space, set it',
    '#    in Settings → Temperature Sensor and re-export this YAML; the temp',
    '#    will appear in the header row.',
    '# 2. To put MeadOS itself in an HA sidebar, add as a panel-iframe:',
    '#    in configuration.yaml:',
    '#      panel_iframe:',
    '#        meados:',
    '#          title: "MeadOS"',
    '#          icon: mdi:glass-mug-variant',
    '#          url: "'+appUrl+'"',
    '# 3. The attributes used here are recomputed on every save. If you do not',
    '#    see new values, force a sync via the ⟳ button in MeadOS.'
  ]).join('\n');
}

function downloadLovelaceCard(){
  var yaml=buildLovelaceYAML();
  var blob=new Blob([yaml],{type:'text/yaml'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='meados-lovelace-card.yaml';a.click();
  URL.revokeObjectURL(url);
  toast('📋 Lovelace card YAML downloaded');
}

function copyLovelaceCard(){
  var yaml=buildLovelaceYAML();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(yaml).then(function(){
      toast('✓ YAML copied to clipboard — paste into HA Manual card');
    },function(){
      // Fallback for browsers/contexts where clipboard API is unavailable
      fallbackCopyText(yaml);
    });
  }else{
    fallbackCopyText(yaml);
  }
}

function fallbackCopyText(text){
  var ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('✓ YAML copied to clipboard');}
  catch(e){toast('⚠ Copy failed — use Preview to copy manually');}
  document.body.removeChild(ta);
}

function previewLovelaceCard(){
  closeModal();
  var yaml=buildLovelaceYAML();
  // Show a side-by-side: rendered preview (as much as we can in pure HTML)
  // plus the raw YAML. The preview uses the same summary fields the real
  // card would, so the user sees their actual current state.
  var s=computeHASummary();
  var preview='<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px;max-height:50vh;overflow-y:auto">'
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold);margin-bottom:10px;letter-spacing:1.5px">⚗ MEADOS · '+escHtml(APP.settings.brewerName||'MeadOS')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">'
    +['Active|'+APP.batches.filter(function(b){var st=getBatchStatus(b);return st!=='bottled'&&st!=='complete';}).length,
      'Bottles|'+s.bottlesOnHand,
      'Free|'+s.fermentersFree,
      'Ready|'+s.drinkingWindowCount].map(function(p){var x=p.split('|');return'<div style="text-align:center;padding:8px;background:var(--bg2);border-radius:4px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+x[1]+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px">'+x[0].toUpperCase()+'</div></div>';}).join('')
    +'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">⏭ Next up</div>'
    +'<div style="font-size:12px;color:var(--text2);margin-bottom:12px">'+escHtml(s.nextMilestone)+'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">⚗ Active Batches</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-bottom:12px;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.activeBatchLines)+'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">🛢 Fermenters · '+s.fermentersFree+'/'+s.fermentersTotal+' free</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-bottom:12px;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.fermenterLines)+'</div>'
    +(s.drinkingWindowCount?'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">🍷 Drinking Window</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.drinkingLines)+'</div>':'')
    +'</div>';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:760px">'
    +'<div class="modal-title">👁 LOVELACE CARD PREVIEW</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">A mock-up of how this card will look in your HA dashboard, using your actual current data:</div>'
    +preview
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin:14px 0 4px">YAML SOURCE ('+yaml.length+' bytes)</div>'
    +'<textarea readonly style="width:100%;height:140px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text2);padding:8px;font-family:var(--font-mono);font-size:10px;line-height:1.4">'+escHtml(yaml)+'</textarea>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="copyLovelaceCard()">📋 Copy YAML</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// ==================== BATCH ADDITIONS TRACKER ====================
// Tracks anything you add to a batch after brew day: backsweetening, fruit, spices,
// oak, vanilla, cinnamon sticks, etc. Records type (permanent vs temporary), removal
// dates, and warns when temporary additions are overdue for removal.
//
// Storage: APP.additions[batchId] = [{id, date, item, amount, type, removeBy, removedDate, notes}]

var ADDITION_TYPES=[
  {key:'backsweeten',label:'Backsweetening',icon:'🍯',permanent:true,examples:'honey, sugar syrup, glycerin'},
  {key:'fruit',label:'Fruit',icon:'🍒',permanent:false,examples:'cherries, berries, peach — typically 3-7 days'},
  {key:'spice',label:'Spice',icon:'🌶',permanent:false,examples:'cinnamon stick, cloves, star anise — typically 1-3 days'},
  {key:'oak',label:'Oak / Wood',icon:'🪵',permanent:false,examples:'oak chips, cubes, staves — typically 1-4 weeks'},
  {key:'herb',label:'Herb / Botanical',icon:'🌿',permanent:false,examples:'lavender, hibiscus, rose petals — typically 1-7 days'},
  {key:'acid',label:'Acid adjustment',icon:'🧪',permanent:true,examples:'malic, citric, tartaric acid'},
  {key:'tannin',label:'Tannin',icon:'🍇',permanent:true,examples:'powdered tannin, grape skins'},
  {key:'stabilizer',label:'Stabilizer',icon:'🛡',permanent:true,examples:'potassium sorbate + metabisulfite'},
  {key:'fining',label:'Fining agent',icon:'💧',permanent:false,examples:'bentonite, sparkolloid — typically 1-2 weeks then rack'},
  {key:'flavor',label:'Flavor extract',icon:'🧴',permanent:true,examples:'vanilla extract, almond extract'},
  {key:'other',label:'Other',icon:'➕',permanent:false,examples:''}
];

function getAdditions(batchId){
  return(APP.additions&&APP.additions[batchId])||[];
}

function renderAdditionsTab(batch){
  var batchId=batch.id;
  var adds=getAdditions(batchId);
  // Sort: pending (in batch) first, then by date desc
  adds=adds.slice().sort(function(a,b){
    var aPending=!a.removedDate&&!ADDITION_TYPES.find(function(t){return t.key===a.type;})?.permanent;
    var bPending=!b.removedDate&&!ADDITION_TYPES.find(function(t){return t.key===b.type;})?.permanent;
    if(aPending!==bPending)return aPending?-1:1;
    return(b.date||'').localeCompare(a.date||'');
  });
  var now=new Date();
  var rows=adds.length?adds.map(function(a){
    var typeInfo=ADDITION_TYPES.find(function(t){return t.key===a.type;})||{label:'Other',icon:'➕',permanent:false};
    var isPermanent=typeInfo.permanent;
    var inBatch=!a.removedDate&&!isPermanent;
    var overdue=inBatch&&a.removeBy&&new Date(a.removeBy)<now;
    var daysLeft=inBatch&&a.removeBy?Math.ceil((new Date(a.removeBy)-now)/86400000):null;
    var statusBadge='';
    if(isPermanent)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg4);padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--border)">PERMANENT</span>';
    else if(a.removedDate)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--green2);background:#0d1f12;padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--green)">REMOVED '+fmtDate(a.removedDate)+'</span>';
    else if(overdue)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--red2);background:#1a0808;padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--red);animation:pulse-warn 2s infinite">⚠ OVERDUE — REMOVE NOW</span>';
    else if(daysLeft!=null)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:'+(daysLeft<=1?'var(--honey)':'var(--blue2)')+';background:'+(daysLeft<=1?'#1a1205':'#0d1525')+';padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid '+(daysLeft<=1?'var(--amber)':'var(--blue)')+'">REMOVE IN '+fmtDurationCompact(daysLeft).toUpperCase()+'</span>';
    else statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);background:var(--bg4);padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--border)">IN BATCH</span>';
    return'<div style="background:var(--bg3);border:1px solid '+(overdue?'var(--red)':'var(--border)')+';border-radius:var(--radius);padding:14px;margin-bottom:8px">'
      +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="font-size:20px">'+typeInfo.icon+'</div>'
      +'<div style="flex:1;min-width:160px"><div style="font-family:var(--font-display);font-size:14px;color:var(--text);letter-spacing:1px">'+escHtml(a.item)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">'+typeInfo.label+' · added '+fmtDate(a.date)+(a.amount?' · '+escHtml(a.amount):'')+'</div></div>'
      +statusBadge
      +'<div style="display:flex;gap:4px">'
      +(inBatch?'<button class="btn btn-secondary btn-sm" onclick="markAdditionRemoved(\''+batchId+'\',\''+a.id+'\')" title="Mark as removed today">✓ Remove</button>':'')
      +'<button class="btn btn-secondary btn-sm" onclick="openAdditionModal(\''+batchId+'\',\''+a.id+'\')">✏</button>'
      +'<button class="btn btn-danger btn-sm" onclick="deleteAddition(\''+batchId+'\',\''+a.id+'\')">✕</button>'
      +'</div></div>'
      +(a.notes?'<div style="font-size:12px;color:var(--text3);font-style:italic;margin-top:4px;padding-left:30px">'+escHtml(a.notes)+'</div>':'')
      +'</div>';
  }).join(''):'<div style="text-align:center;color:var(--text3);font-style:italic;padding:30px">No additions logged yet. Use this tab when you backsweeten, add fruit/spice/oak, or stabilize.</div>';
  return'<div class="grid-2">'
    +'<div><div class="card"><div class="card-header"><div class="card-title">ADDITIONS &amp; INFUSIONS</div><button class="btn btn-primary btn-sm" onclick="openAdditionModal(\''+batchId+'\')">＋ Log Addition</button></div>'
    +rows
    +'</div></div>'
    +'<div><div class="card"><div class="card-header"><div class="card-title">REFERENCE · TYPICAL TIMINGS</div></div>'
    +'<div style="font-size:12px;color:var(--text3);line-height:1.8">'
    +ADDITION_TYPES.filter(function(t){return!t.permanent&&t.examples;}).map(function(t){return'<div style="margin-bottom:6px"><span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+t.icon+' '+t.label.toUpperCase()+'</span><br><span style="color:var(--text3);padding-left:24px">'+escHtml(t.examples)+'</span></div>';}).join('')
    +'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">Times vary by recipe and taste. Sample frequently — over-extraction with oak or spice is hard to reverse. Permanent additions (sweetening, acid, tannin) stay forever.</div>'
    +'</div></div></div>';
}

function openAdditionModal(batchId,additionId){
  closeModal();
  var existing=additionId?(getAdditions(batchId).find(function(a){return a.id===additionId;})):null;
  var typeOpts=ADDITION_TYPES.map(function(t){return'<option value="'+t.key+'"'+(existing&&existing.type===t.key?' selected':'')+'>'+t.icon+' '+t.label+'</option>';}).join('');
  var isEdit=!!existing;
  var defaultRemoveBy='';
  if(!isEdit){
    // Suggest a default "remove by" 3 days out for temporary additions
    var d=new Date();d.setDate(d.getDate()+3);
    defaultRemoveBy=d.toISOString().split('T')[0];
  }
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px">'
    +'<div class="modal-title">'+(isEdit?'EDIT':'LOG')+' ADDITION</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="ad-type" onchange="updateAdditionTypeHint()">'+typeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Date Added</label><input class="form-input" type="date" id="ad-date" value="'+(existing?existing.date:today())+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Item</label><input class="form-input" id="ad-item" placeholder="Cinnamon stick / Tart cherries / Honey…" value="'+escHtml(existing?existing.item:'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Amount</label><input class="form-input" id="ad-amount" placeholder="500g / 2 sticks / 200ml" value="'+escHtml(existing?existing.amount:'')+'"></div></div>'
    +'<div id="ad-removal-section">'
    +'<div class="form-group"><label class="form-label">Planned Removal Date <span style="font-weight:400;color:var(--text3);font-size:11px">· leave empty for permanent additions</span></label><input class="form-input" type="date" id="ad-removeby" value="'+(existing&&existing.removeBy?existing.removeBy:defaultRemoveBy)+'"></div>'
    +(isEdit&&existing.removedDate?'<div class="form-group"><label class="form-label">Actually Removed On</label><input class="form-input" type="date" id="ad-removed" value="'+existing.removedDate+'"></div>':'')
    +'</div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="ad-notes" placeholder="Why added, expected effect, tasting impressions…">'+escHtml(existing?existing.notes:'')+'</textarea></div>'
    +'<div id="ad-hint" style="font-size:12px;color:var(--text3);font-style:italic;margin-top:6px;padding:8px;background:var(--bg4);border-radius:var(--radius)"></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAddition(\''+batchId+'\','+(existing?'\''+additionId+'\'':'null')+')">Save</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateAdditionTypeHint();
}

function updateAdditionTypeHint(){
  var sel=document.getElementById('ad-type');
  if(!sel)return;
  var info=ADDITION_TYPES.find(function(t){return t.key===sel.value;});
  var hint=document.getElementById('ad-hint');
  var removal=document.getElementById('ad-removal-section');
  if(hint&&info){
    hint.innerHTML=info.examples?'<strong>'+info.label+':</strong> '+escHtml(info.examples):info.label+(info.permanent?' is a permanent addition — no removal needed.':' is typically removed after a few days/weeks.');
  }
  // For permanent additions, hide the removal date field
  if(removal&&info){
    removal.style.opacity=info.permanent?'0.4':'1';
    var rmInput=document.getElementById('ad-removeby');
    if(rmInput&&info.permanent)rmInput.value='';
  }
}

function saveAddition(batchId,additionId){
  var type=document.getElementById('ad-type').value;
  var info=ADDITION_TYPES.find(function(t){return t.key===type;});
  var entry={
    id:additionId||genId(),
    type:type,
    date:document.getElementById('ad-date').value||today(),
    item:document.getElementById('ad-item').value.trim(),
    amount:document.getElementById('ad-amount').value.trim(),
    removeBy:info&&info.permanent?'':(document.getElementById('ad-removeby').value||''),
    removedDate:(document.getElementById('ad-removed')&&document.getElementById('ad-removed').value)||(additionId?(getAdditions(batchId).find(function(a){return a.id===additionId;})||{}).removedDate||'':''),
    notes:document.getElementById('ad-notes').value.trim()
  };
  if(!entry.item){toast('⚠ Item is required');return;}
  if(!APP.additions)APP.additions={};
  if(!APP.additions[batchId])APP.additions[batchId]=[];
  var idx=APP.additions[batchId].findIndex(function(a){return a.id===entry.id;});
  if(idx>=0)APP.additions[batchId][idx]=entry;
  else APP.additions[batchId].push(entry);
  closeModal();scheduleSave();toast('✦ Addition logged');renderMain();
}

function markAdditionRemoved(batchId,additionId){
  var add=getAdditions(batchId).find(function(a){return a.id===additionId;});
  if(!add)return;
  add.removedDate=today();
  scheduleSave();toast('✓ Marked as removed');renderMain();
}

function deleteAddition(batchId,additionId){
  if(!confirm('Delete this addition entry?'))return;
  if(APP.additions&&APP.additions[batchId]){
    APP.additions[batchId]=APP.additions[batchId].filter(function(a){return a.id!==additionId;});
  }
  scheduleSave();toast('Deleted');renderMain();
}

// Overdue additions across all batches → for dashboard alerts
function getOverdueAdditions(){
  if(!APP.additions)return[];
  var now=Date.now();
  var out=[];
  Object.keys(APP.additions).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.additions[bid]||[]).forEach(function(a){
      if(a.removedDate)return;
      var info=ADDITION_TYPES.find(function(t){return t.key===a.type;});
      if(info&&info.permanent)return;
      if(a.removeBy&&new Date(a.removeBy).getTime()<now){
        out.push({batch:b,addition:a});
      }
    });
  });
  return out;
}

// ==================== FERMENTATION TEMPERATURE HISTORY ====================
// Fetches temperature history from HA's /api/history endpoint for the configured sensor,
// over the lifetime of the batch (or last 14 days, whichever is shorter — HA recorder default).

async function fetchTempHistory(batchId,hoursBack){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return null;
  var st=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  var bottled=(st==='bottled'||st==='complete');
  var ent,floorMs;
  if(bottled){
    // Bottled batches aren't in a fermenter anymore — graph the STORAGE
    // environment instead: the cabinet the batch rests in (via its shelf),
    // falling back to the legacy settings-level cellar sensor.
    var bot=APP.bottling[b.id]||{};
    var hit=(bot.cellarShelfId&&typeof findShelfById==='function')?findShelfById(bot.cellarShelfId):null;
    ent=(hit&&hit.cabinet&&hit.cabinet.tempSensorEntity)||(APP.settings&&APP.settings.cellarTempSensorEntity);
    floorMs=bot.date?new Date(bot.date).getTime():new Date(b.startDate).getTime();
  }else{
    // Prefer the batch's bound fermenter sensor over the global fallback —
    // this is what makes per-fermenter bindings actually useful for diagnostics.
    var ferm=b.fermenterId?getFermenter(b.fermenterId):null;
    ent=(ferm&&ferm.tempSensorEntity)||APP.settings.tempSensorEntity;
    floorMs=new Date(b.startDate).getTime();
  }
  if(!ent||!haConfigured())return null;
  var now=Date.now();
  var rangeMs=hoursBack?hoursBack*3600000:(now-floorMs);
  var start=new Date(Math.max(now-rangeMs,floorMs)).toISOString();
  var path='/api/history/period/'+encodeURIComponent(start)+'?filter_entity_id='+encodeURIComponent(ent)+'&minimal_response&significant_changes_only';
  var res=await haFetch(path);
  if(!res||!res.ok)return null;
  try{
    var data=await res.json();
    if(!data||!data.length||!data[0])return[];
    return data[0].map(function(s){
      var v=parseFloat(s.state);
      if(isNaN(v))return null;
      return{ts:new Date(s.last_changed||s.last_updated),value:v};
    }).filter(Boolean);
  }catch(e){return null;}
}

function setBatchTempRange(batchId,hours){
  window._batchTempRange=hours;
  // Move the active highlight (the range buttons aren't re-rendered on click).
  var btns=document.querySelectorAll('.temp-range-btn');
  for(var i=0;i<btns.length;i++){
    var on=parseInt(btns[i].getAttribute('data-trange'),10)===hours;
    btns[i].style.background=on?'rgba(232,196,106,0.18)':'';
    btns[i].style.color=on?'var(--gold2)':'';
    btns[i].style.borderColor=on?'var(--gold)':'';
  }
  // Redraw the chart in place
  renderTempHistoryChart('batch-temp-history-chart',batchId);
}

async function renderTempHistoryChart(canvasId,batchId){
  var canvas=document.getElementById(canvasId);
  if(!canvas)return;
  var loading=document.getElementById('batch-temp-loading');
  var summary=document.getElementById('batch-temp-summary');
  var hours=window._batchTempRange||168; // default 7 days
  // Show the loading overlay while fetching; keep the canvas in the DOM (just
  // hidden) so switching ranges always works — replacing the wrap's innerHTML
  // would delete the canvas and silently kill every later button press.
  if(loading){loading.textContent='Loading history…';loading.style.display='flex';}
  canvas.style.display='none';
  var history=await fetchTempHistory(batchId,hours);
  if(!history||history.length<2){
    if(window._batchTempChart){try{window._batchTempChart.destroy();}catch(e){}window._batchTempChart=null;}
    if(summary)summary.innerHTML='';
    if(loading){loading.textContent='No temperature history for this range — try a longer one, or HA recorder may still be collecting samples.';loading.style.display='flex';}
    return;
  }
  if(loading)loading.style.display='none';
  canvas.style.display='';
  // Stats for summary line
  var values=history.map(function(p){return p.value;});
  var minV=Math.min.apply(null,values),maxV=Math.max.apply(null,values);
  var avgV=values.reduce(function(s,v){return s+v;},0)/values.length;
  // Strain-specific bands — pull this batch's actual yeast ranges.
  var chartBatch=APP.batches.find(function(x){return x.id===batchId;});
  var chartStatus=(chartBatch&&typeof getBatchStatus==='function')?getBatchStatus(chartBatch):'';
  var storageChart=(chartStatus==='bottled'||chartStatus==='complete');
  var oL,oH,sL,sH,yName;
  if(storageChart){
    // Bottled = aging in storage: judge against the cellar band, not the
    // yeast's fermentation range (the yeast is dormant).
    oL=10;oH=14;sL=8;sH=18;yName='aging';
  }else{
    var chartYeast=getYeastById((chartBatch&&chartBatch.yeast)||'m05');
    oL=chartYeast.optimalTempLow;oH=chartYeast.optimalTempHigh;
    sL=(chartYeast.tempToleranceLow!=null?chartYeast.tempToleranceLow:oL-3);
    sH=(chartYeast.tempToleranceHigh!=null?chartYeast.tempToleranceHigh:oH+6);
    yName=yeastShortName(chartYeast);
  }
  var outOfOpt=values.filter(function(v){return v<oL||v>oH;}).length;
  var outOfSafe=values.filter(function(v){return v<sL||v>sH;}).length;
  var inOptPct=Math.round((1-outOfOpt/values.length)*100);
  var inSafePct=Math.round((1-outOfSafe/values.length)*100);
  if(summary){
    summary.innerHTML='AVG '+avgV.toFixed(1)+'°C · MIN '+minV.toFixed(1)+'°C · MAX '+maxV.toFixed(1)+'°C · '
      +'<span style="color:'+(inSafePct>=99?'var(--green2)':inSafePct>=90?'var(--gold2)':'var(--red2)')+'">'+inSafePct+'% IN SAFE RANGE</span> · '
      +'<span style="color:'+(inOptPct>=80?'var(--green2)':inOptPct>=50?'var(--gold2)':'var(--text3)')+'">'+inOptPct+'% IN '+escHtml(yName.toUpperCase())+' OPTIMUM</span>';
  }
  // Downsample if huge
  var maxPoints=300;
  if(history.length>maxPoints){
    var step=Math.ceil(history.length/maxPoints);
    history=history.filter(function(_,i){return i%step===0;});
  }
  // Destroy any prior chart on this canvas
  if(window._batchTempChart){try{window._batchTempChart.destroy();}catch(e){}}
  var t0=history[0].ts.getTime();
  var t1=history[history.length-1].ts.getTime();
  var yMin=Math.floor(Math.min(minV,sL-1)*2)/2-1;
  var yMax=Math.ceil(Math.max(maxV,sH+1)*2)/2+1;
  window._batchTempChart=new Chart(canvas,{
    type:'line',
    data:{
      datasets:[
        // Optimum band (strain's optimal range) — filled green
        {label:'_opt_low',data:[{x:t0,y:oL},{x:t1,y:oL}],borderColor:'transparent',pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        {label:'_opt_high',data:[{x:t0,y:oH},{x:t1,y:oH}],borderColor:'transparent',backgroundColor:'rgba(122,160,64,0.10)',pointRadius:0,fill:'-1',tension:0},
        // Safe range (strain's tolerance) — dashed boundary lines
        {label:'_safe_low',data:[{x:t0,y:sL},{x:t1,y:sL}],borderColor:'rgba(200,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        {label:'_safe_high',data:[{x:t0,y:sH},{x:t1,y:sH}],borderColor:'rgba(200,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        // Actual trace
        {label:'Temperature',
          data:history.map(function(p){return{x:p.ts.getTime(),y:p.value};}),
          borderColor:'#e8a020',backgroundColor:'rgba(232,160,32,0.05)',
          tension:0.25,pointRadius:0,borderWidth:2,fill:false}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:function(item){return!String(item.dataset.label||'').startsWith('_');},
          callbacks:{
            label:function(item){return item.parsed.y.toFixed(1)+'°C ('+fermentTempEval(item.parsed.y,chartYeast).zone+')';},
            title:function(items){if(!items.length)return'';return new Date(items[0].parsed.x).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
          }
        }
      },
      scales:{
        x:{type:'linear',min:t0,max:t1,
          ticks:{color:'#6a5f50',font:{size:10},maxTicksLimit:7,callback:function(v){
            var d=new Date(v);
            return hours<=24
              ?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              :d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
          }},
          grid:{color:'#2a2a35'}
        },
        y:{min:yMin,max:yMax,
          ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v+'°C';}},
          grid:{color:'#2a2a35'}
        }
      },
      interaction:{mode:'nearest',axis:'x',intersect:false}
    }
  });
}
