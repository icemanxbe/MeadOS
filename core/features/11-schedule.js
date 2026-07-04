// ==========================================================================
// Aging timeline (Gantt), fermenter swim-lane calendar, brew planner.
// Split out of the former 11-features.js. Globals, no behaviour change.
// ==========================================================================

// ==================== AGING TIMELINE (Gantt) ====================
function renderTimeline(){
  var allBottled=visibleBatches().filter(function(b){return APP.bottling[b.id]&&!b.failed;});
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
    markers.push({ms:d.getTime(),label:d.toLocaleString(_dloc(),{month:'short',year:'2-digit'})});
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
    markers.push({ms:d.getTime(),label:d.toLocaleString(_dloc(),{month:'short',year:'2-digit'})});
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
    +new Date(startMs).toLocaleString(_dloc(),{month:'short',year:'numeric'})
    +' → '
    +new Date(endMs).toLocaleString(_dloc(),{month:'short',year:'numeric'})
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
  var plans=(APP.plannedBatches||[]).filter(function(p){return typeof inActiveMode!=='function'||inActiveMode(p);}).slice().sort(function(a,b){
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
  var need={honeyKg:0,juiceL:0,yeastPackets:0,nutrientGrams:0,nutrientSachets:0,bottles750:0,bottles500:0,caps:0};
  var honeyTypes={},juiceTypes={},yeastNames={};
  var extras={}; // key -> {item, amounts, batches}
  plans.forEach(function(pb){
    var r=APP.recipes.find(function(x){return x.id===pb.recipeId;});
    if(!r)return;
    var vol=parseFloat(pb.volume)||r.volume||4.5;
    var og=r.ogTarget||1.095;
    // Cider's OG comes from apple juice, not honey — the (OG-1)*1000/292
    // formula is honey-specific (292 SG-points/kg is honey's own density
    // constant) and would produce a bogus honey-shopping number for a
    // cider plan. Cider plans instead need juice ≈ the batch volume itself
    // (no separate "addition" the way honey is added to water).
    var isMeadPlan=(r.beverageType||'mead')==='mead';
    if(isMeadPlan){
      need.honeyKg+=(og-1)*1000*vol/292;
      if(pb.honeyType)honeyTypes[pb.honeyType]=(honeyTypes[pb.honeyType]||0)+1;
    }else{
      need.juiceL+=vol;
      if(pb.honeyType)juiceTypes[pb.honeyType]=(juiceTypes[pb.honeyType]||0)+1;
    }
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
      if(/honey|juice|water|yeast|nutrient/i.test(nm))return; // staples handled above
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
  if(need.honeyKg>0){
    var n=Math.round(need.honeyKg*100)/100,h=Math.round(haveQty('honey')*100)/100,buy=Math.max(0,n-h);
    lines.push({label:honeyLabel,unit:'kg',need:n,have:h,buy:buy,cost:honeyPrice?buy*honeyPrice:0});
  }
  // Juice label notes which apple/juice blend(s) the cider plans call for
  var juiceTypeList=Object.keys(juiceTypes);
  var juiceLabel='Juice'+(juiceTypeList.length?' · '+juiceTypeList.join(', '):'');
  pushLine(juiceLabel,'L',Math.round(need.juiceL*100)/100,'juice');
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
  var have={honey:haveType('honey'),juice:haveType('juice'),yeast:haveType('yeast'),nutrient:haveType('nutrient'),pectic:haveType('pectic'),sulfite:haveType('sulfite'),sorbate:haveType('sorbate')};
  // Card shows whichever beverage is active — mead's honey math and cider's
  // juice math are different enough (honeyPerL from OG vs juice ≈ volume)
  // that they're evaluated as separate branches rather than one formula.
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  // Supplies already committed to planned/scheduled batches.
  var sachetSz=parseFloat(APP.settings&&APP.settings.sachetSize)||12;
  var planned={honey:0,juice:0,yeast:0,nutrient:0};
  (APP.plannedBatches||[]).forEach(function(pb){
    var r=(APP.recipes||[]).find(function(x){return x.id===pb.recipeId;});
    if(!r||((r.beverageType||'mead')==='cider')!==isCider)return;
    var v=parseFloat(pb.volume)||r.volume||5,og=r.ogTarget||1.095;
    if(isCider)planned.juice+=v;
    else if(og>1)planned.honey+=(og-1)*1000*v/292;
    planned.yeast+=1;
    planned.nutrient+=Math.max(1,Math.ceil(recipeNutrientGrams(r,v)/sachetSz));
  });
  var vol=parseFloat(scaleVol)||5;
  var list=(APP.recipes||[]).filter(function(r){return(r.beverageType||'mead')===(isCider?'cider':'mead');}).map(function(r){
    var og=r.ogTarget||1.095;
    var primaryNeed,primaryHave,maxVol;
    if(isCider){
      // Cider's fermentable IS the juice — no separate "addition" the way
      // honey is added to water, so need ≈ the target batch volume.
      primaryNeed=vol;
      primaryHave=have.juice;
      maxVol=have.juice;
    }else{
      if(og<=1)return null;
      var honeyPerL=(og-1)*1000/292;
      if(honeyPerL<=0)return null;
      primaryNeed=honeyPerL*vol;
      primaryHave=have.honey;
      maxVol=have.honey/honeyPerL;
    }
    var nutrientNeed=Math.max(1,Math.ceil(recipeNutrientGrams(r,vol)/sachetSz));
    var chem=detectRecipeSupplyNeeds(r);
    var missing=[];
    if(primaryHave<primaryNeed-0.001)missing.push(isCider?'juice':'honey');
    if(have.yeast<1)missing.push('yeast');
    if(have.nutrient<nutrientNeed)missing.push('nutrient');
    if(chem.pectic&&have.pectic<=0)missing.push('pectic enzyme');
    if(chem.sulfite&&have.sulfite<=0)missing.push('metabisulfite');
    if(chem.sorbate&&have.sorbate<=0)missing.push('sorbate');
    // Would brewing this now leave too little for the scheduled batches?
    var starves=[];
    var plannedPrimary=isCider?planned.juice:planned.honey;
    if(plannedPrimary>0&&primaryHave-primaryNeed<plannedPrimary-0.001)starves.push(isCider?'juice':'honey');
    if(planned.yeast>0&&have.yeast-1<planned.yeast)starves.push('yeast');
    if(planned.nutrient>0&&have.nutrient-nutrientNeed<planned.nutrient)starves.push('nutrient');
    var abv=r.abvTarget||Math.round((og-(r.fgTarget||1.010))*131.25*10)/10;
    return{recipe:r,og:og,abv:abv,honeyNeed:primaryNeed,maxVol:maxVol,missing:missing,starves:starves,makeable:missing.length===0};
  }).filter(Boolean);
  list.sort(function(a,b){if(a.makeable!==b.makeable)return a.makeable?-1:1;return b.maxVol-a.maxVol;});
  var hasPlanned=(APP.plannedBatches||[]).some(function(pb){
    var r=(APP.recipes||[]).find(function(x){return x.id===pb.recipeId;});
    return r&&((r.beverageType||'mead')==='cider')===isCider;
  });
  return{have:have,planned:planned,hasPlanned:hasPlanned,vol:vol,list:list,isCider:isCider};
}

function toggleBrewWhatYouHave(){
  window._bwyhOpen=!window._bwyhOpen;
  var card=document.getElementById('bwyh-card');
  if(!card)return;
  var wrap=card.querySelector('.collapse-y');
  if(wrap)wrap.classList.toggle('open',window._bwyhOpen);
  var chev=card.querySelector('.bwyh-chev');
  if(chev)chev.textContent=window._bwyhOpen?'▾':'▸';
}
function setBrewWhatYouHaveVol(v){
  window._bwyhVol=parseFloat(v)||5;
  var lbl=document.getElementById('bwyh-vol-label');
  if(lbl)lbl.textContent=fmtVol(window._bwyhVol);
  var list=document.getElementById('bwyh-list');
  if(list){list.innerHTML=renderBwyhList();
    // The slider swaps innerHTML imperatively, so the post-render i18n pass never
    // runs on it — re-translate this subtree when in Dutch.
    if(typeof appLang==='function'&&appLang()==='nl'&&typeof translateChrome==='function')translateChrome(list);
  }
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
    +'<div class="card-title">'+(r.isCider?'🍎':'🍯')+' BREW WITH WHAT YOU HAVE</div>'
    +'<div style="display:flex;align-items:center;gap:10px"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:0.5px">'+(r.isCider?makeableCount+' ready · '+fmtVol(r.have.juice)+' juice':makeableCount+' ready · '+fmtWt(r.have.honey)+' honey')+'</span><span class="bwyh-chev" style="color:var(--gold2);font-size:13px">'+(window._bwyhOpen?'▾':'▸')+'</span></div>'
    +'</div>';
  var plannedNote=r.hasPlanned?'<div style="font-size:11.5px;color:var(--text3);margin-top:10px;font-style:italic">Cross-checked against your planned batches — a ⚠ badge means brewing it now would leave too little for a scheduled batch.</div>':'';
  var body='<div style="font-size:12px;color:var(--text3);margin:10px 0 4px">'+(r.isCider?'Recipes you can start now from your supplies — juice, yeast, nutrient and the chemicals each recipe calls for (pectic enzyme, metabisulfite, sorbate).':'Recipes you can start now from your supplies — honey, yeast, nutrient and the chemicals each recipe calls for (pectic enzyme, metabisulfite, sorbate).')+'</div>'
    +'<div style="display:flex;align-items:center;gap:12px;margin:8px 0 12px">'
    +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;white-space:nowrap">BATCH SIZE</span>'
    +'<input type="range" min="1" max="12" step="0.5" value="'+window._bwyhVol+'" oninput="setBrewWhatYouHaveVol(this.value)" style="flex:1">'
    +'<span id="bwyh-vol-label" style="font-family:var(--font-display);font-size:16px;color:var(--gold2);min-width:70px;text-align:right">'+fmtVol(window._bwyhVol)+'</span>'
    +'</div>'
    +'<div id="bwyh-list">'+renderBwyhList()+'</div>'
    +plannedNote;
  return header+'<div class="collapse-y'+(window._bwyhOpen?' open':'')+'"><div>'+body+'</div></div>'+'</div>';
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
  var isCider=r?((r.beverageType||'mead')==='cider'):((typeof activeBevMode==='function')&&activeBevMode()==='cider');
  var d={yeast:isCider?'nottingham':'m05',nutrient:'mj-mead',honeyType:isCider?'Mixed / Orchard Blend':'Wildflower'};
  if(!r)return d;
  var ings=(r.ingredients||[]).map(function(i){return String(i.item||'');}).join(' | ').toLowerCase();
  var strain=YEAST_STRAINS.filter(function(y){return(y.beverageTypes||['mead']).indexOf(isCider?'cider':'mead')>=0;}).find(function(y){
    return ings.indexOf(y.id.toLowerCase())!==-1||ings.indexOf(y.name.split('—')[0].trim().toLowerCase())!==-1;
  });
  if(strain)d.yeast=strain.id;
  var varietyList=isCider?CIDER_FRUIT_TYPES:HONEY_TYPES;
  var honey=varietyList.find(function(t){return ings.indexOf(t.toLowerCase())!==-1;});
  if(honey)d.honeyType=honey;
  if(/fermaid-?o/i.test(ings))d.nutrient='fermaid-o';
  else if(/fermaid-?k/i.test(ings))d.nutrient='fermaid-k';
  return d;
}

function openPlanBatchModal(planId,presetRecipeId,presetVolSI){
  closeModal();
  var editing=planId?(APP.plannedBatches||[]).find(function(p){return p.id===planId;}):null;
  // View filter (cider mode): only offer recipes matching the active mode —
  // same reasoning as openNewBatchModal's recipe picker.
  var modeRecipes=visibleRecipes();
  if(!modeRecipes.length){toast('⚠ No recipes available');return;}
  var preRecipe=editing?editing.recipeId:(presetRecipeId||(modeRecipes[0]&&modeRecipes[0].id));
  var recipeOpts=modeRecipes.map(function(r){return'<option value="'+r.id+'"'+(r.id===preRecipe?' selected':'')+'>'+escHtml(r.name)+' ('+r.style+')</option>';}).join('');
  var initial=modeRecipes.find(function(r){return r.id===preRecipe;})||modeRecipes[0];
  var isCider=(initial&&(initial.beverageType||'mead')==='cider')||(!initial&&(typeof activeBevMode==='function')&&activeBevMode()==='cider');
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
  // Filtered to this plan's own beverage — see openNewBatchModal for the same treatment.
  var yeastOpts=YEAST_STRAINS.filter(function(y){return y.id===curYeast||(y.beverageTypes||['mead']).indexOf(isCider?'cider':'mead')>=0;})
    .map(function(y){return'<option value="'+y.id+'"'+(y.id===curYeast?' selected':'')+'>'+escHtml(y.name)+' · '+(y.abvMax||'?')+'% max</option>';}).join('');
  var nutrientOpts=NUTRIENT_PRODUCTS.map(function(p){return'<option value="'+p.id+'"'+(p.id===curNutrient?' selected':'')+'>'+escHtml(p.name)+'</option>';}).join('');
  var honeyOpts=(isCider?CIDER_FRUIT_TYPES:HONEY_TYPES).map(function(t){return'<option value="'+escHtml(t)+'"'+(t===curHoney?' selected':'')+'>'+escHtml(t)+'</option>';}).join('');
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
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(isCider?'Apple / Juice Blend':'Honey Type')+'</label><select class="form-select" id="pb-honey">'+honeyOpts+'</select></div>'
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
  // Tag with beverageType so visibleBatches()-style filtering (and the
  // schema migration's own default-fill for pre-existing plans) has
  // something real to match on — inherit from the chosen recipe, falling
  // back to whichever mode was active when the plan was created.
  var planRecipe=APP.recipes.find(function(x){return x.id===data.recipeId;});
  data.beverageType=(planRecipe&&planRecipe.beverageType)||activeBevMode();
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
