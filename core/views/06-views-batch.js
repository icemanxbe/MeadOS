// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// dashboard, batch list & detail, task/coach, ICS feed
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== DASHBOARD ====================
function renderDashboard(){
  // View filter (cider mode): only batches matching the active beverage mode
  // are shown here — APP.batches itself always keeps every batch of every
  // beverage type, see activeBevMode()'s own comment.
  var modeBatches=visibleBatches();
  // Active = not bottled, not completed, AND not failed. Failed batches stay
  // in the database (postmortems matter) but they shouldn't pollute the active-
  // batch widgets — they're not consuming a fermenter, not generating tasks,
  // not on a fermentation curve.
  var active=modeBatches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  var bottled=modeBatches.filter(function(b){return getBatchStatus(b)==='bottled';});
  var failed=modeBatches.filter(function(b){return b.failed;});
  var totalBottlesCount=modeBatches.reduce(function(s,b){return s+(APP.bottling[b.id]?totalBottles(APP.bottling[b.id]):0);},0);
  var avgABV='—';
  // Average ABV across non-failed batches only — a failed-and-dumped batch's
  // gravity at time-of-dump shouldn't drag your cellar's average down.
  var nonFailed=modeBatches.filter(function(b){return!b.failed;});
  if(nonFailed.length){
    var sum=nonFailed.reduce(function(s,b){
      var lg=(getBatchLogs(b.id));
      var g=lg.length?lg[lg.length-1].gravity:(b.fg||1.012);
      return s+parseFloat(calcABV(b.og||1.095,g));
    },0);
    avgABV=(sum/nonFailed.length).toFixed(1)+'%';
  }
  var todayTasks=getTodayTasks().filter(function(t){var tb=getBatch(t.batchId);return!tb||inActiveMode(tb);});
  var batchCards='';
  if(!modeBatches.length){
    batchCards='<div style="text-align:center;margin-bottom:16px">'+brandCrestSVG(280)+'<div style="margin-top:16px;font-size:14px;color:var(--text2);font-style:italic">'+((typeof activeBevMode==='function'&&activeBevMode()==='cider')?'The orchard tradition begins here.':'The family meadwright tradition begins here.')+'</div></div>'
      +'<div class="empty-state" style="padding:20px"><button class="btn btn-primary" onclick="openNewBatchModal()">＋ Start First Batch</button></div>';
  }else{
    batchCards=active.slice(0,4).map(function(b){
      var d=daysSince(b.startDate),status=getBatchStatus(b);
      var recipe=getRecipe(b.recipeId);
      var totalDays=recipe?(recipe.fermentDays+recipe.ageDays):150;
      var pct=Math.min(100,Math.round((d/totalDays)*100));
      var logs=getBatchLogs(b.id);
      var lastG=logs.length?logs[logs.length-1].gravity:b.og;
      var abv=b.og&&lastG?calcABV(b.og,lastG)+'%':'—'; // active-only list: never bottled, no fg fallback needed
      var color=getBatchColor(b);
      return'<div class="card" style="cursor:pointer;margin-bottom:12px;padding:0;overflow:hidden" onclick="showView(\'batch\',\''+b.id+'\')">'
        +'<div style="height:3px;background:'+color+'"></div>'
        +'<div style="padding:18px">'
        +'<div class="card-header" style="margin-bottom:12px">'
        +'<div><div class="card-title" style="color:'+color+'">'+escHtml(b.name)+'</div>'
        +'<div class="card-subtitle">'+fmtDuration(d)+' · '+fmtDate(b.startDate)+'</div></div>'
        +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">'+statusBadge(status)+fermentationBadge(b)+'</div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
        +'<div style="text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+(b.og||'—')+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">OG</div></div>'
        +'<div style="text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--green2)">'+(lastG||'—')+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">CURRENT</div></div>'
        +'<div style="text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--blue2)">'+abv+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-top:2px">EST ABV</div></div>'
        +'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:4px">PROGRESS · '+pct+'%</div>'
        +'<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'
        +'</div></div>';
    }).join('');
  }
  var taskHtml=todayTasks.length?todayTasks.slice(0,5).map(function(t){
    // Build a small day tag — overdue items get a red pill so it's obvious at
    // a glance that they're not actually for today. Today's tasks render plain.
    var dayTag='';
    if(t.isOverdue){
      dayTag=' <span style="display:inline-block;padding:1px 7px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:1px;background:rgba(199,80,80,0.18);color:var(--red2);border-radius:8px;vertical-align:middle">'+fmtDurationCompact(t.daysFromDue).toUpperCase()+' OVERDUE</span>';
    }
    return'<div class="coach-task">'
      +'<div class="task-cb '+(isTaskDone(t.id)?'checked':'')+'" onclick="toggleTask(\''+t.id+'\',this)">'+(isTaskDone(t.id)?'✓':'')+'</div>'
      +'<div><div style="font-size:13px;color:var(--text)">'+escHtml(t.batch)+' — <strong>'+escHtml(t.title)+'</strong>'+dayTag+'</div>'
      +'<div style="font-size:12px;color:var(--text3)">'+escHtml(annotateNutrientDesc(t.desc).substring(0,90))+(t.desc.length>90?'…':'')+'</div></div></div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3);font-style:italic">No tasks today — your batches rest peacefully.</div>';
  // ============ FERMENTER STATUS WIDGET ============
  // Compact list — scales gracefully from 1 to many fermenters
  var fermenterCards='';
  if(APP.fermenters&&APP.fermenters.length){
    var fermRows=APP.fermenters.map(function(f){
      var occ=fermenterOccupiedBy(f.id);
      if(occ){
        var recipe=getRecipe(occ.recipeId);
        var day=daysSince(occ.startDate);
        var fermDays=recipe?(recipe.fermentDays||42):42;
        var daysLeft=Math.max(0,fermDays-day);
        var pct=Math.min(100,Math.round((day/fermDays)*100));
        return'<div onclick="showView(\'batch\',\''+occ.id+'\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer">'
          +'<div style="width:8px;height:38px;border-radius:2px;background:'+(f.color||'#c9a84c')+';flex-shrink:0"></div>'
          +'<div style="flex:1;min-width:0">'
          +'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
          +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(f.name)+'</div>'
          +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);white-space:nowrap">'+(daysLeft>0?'~'+daysLeft+'d':'ready')+'</div>'
          +'</div>'
          +'<div style="font-size:12.5px;color:'+getBatchColor(occ)+';margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(occ.name)+' · '+fmtDuration(day)+'</div>'
          +'<div style="height:3px;background:var(--bg);border-radius:2px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+getBatchColor(occ)+';transition:width .5s"></div></div>'
          +'</div></div>';
      }else{
        return'<div onclick="openNewBatchModal()" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;opacity:0.72">'
          +'<div style="width:8px;height:38px;border-radius:2px;background:rgba(122,168,80,0.5);flex-shrink:0"></div>'
          +'<div style="flex:1;min-width:0">'
          +'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
          +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);letter-spacing:1px;text-transform:uppercase">'+escHtml(f.name)+'</div>'
          +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);white-space:nowrap">FREE</div>'
          +'</div>'
          +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;margin-top:2px">'+(f.capacity?fmtVol(f.capacity)+' · ':'')+'tap to start a batch</div>'
          +'</div></div>';
      }
    }).join('');
    fermenterCards='<div class="card" style="margin-top:16px;padding:0;overflow:hidden">'
      +'<div class="card-header" style="padding:14px 14px 8px"><div class="card-title">⚗ FERMENTER STATUS</div></div>'
      +'<div>'+fermRows+'</div>'
      +'</div>';
  }

  // ============ DRINKING WINDOW WIDGET ============
  // Surfaces bottled batches entering window, in peak, or aging past peak
  var windowItems=[];
  bottled.forEach(function(b){
    var s=getDrinkingWindowStatus(b);
    if(!s||!s.onHand)return; // skip empty cellar entries
    windowItems.push({batch:b,status:s});
  });
  // Sort: entering (urgent) → peak → in-window → past-max → pre-window
  var statusOrder={'entering':0,'peak':1,'in-window-rising':2,'in-window-falling':3,'past-max':4,'pre-window':5};
  windowItems.sort(function(a,b){return(statusOrder[a.status.status]||9)-(statusOrder[b.status.status]||9);});
  // Filter: keep entering (<30d), peak, in-window, past-max — drop pre-window (too early to surface)
  windowItems=windowItems.filter(function(it){return it.status.status!=='pre-window';});
  var windowCards='';
  if(windowItems.length){
    var windowRows=windowItems.slice(0,5).map(function(it){
      var b=it.batch,s=it.status,color=getBatchColor(b);
      var labelTxt,labelColor,subText;
      if(s.status==='entering'){labelTxt='⏳ '+s.daysUntilReady+'D';labelColor='#a8a050';subText='Enters drinking window in '+s.daysUntilReady+' day'+(s.daysUntilReady===1?'':'s');}
      else if(s.status==='peak'){labelTxt='✦ PEAK';labelColor='#7aa850';subText='In peak window — drink now for best character';}
      else if(s.status==='in-window-rising'){labelTxt='○ '+s.daysUntilPeak+'D TO PEAK';labelColor='#7aa850';subText='Drinkable now; peaks in '+s.daysUntilPeak+' day'+(s.daysUntilPeak===1?'':'s');}
      else if(s.status==='in-window-falling'){labelTxt='○ POST-PEAK';labelColor='#a08050';subText='Past peak but still in window — '+s.daysUntilMax+' days left';}
      else if(s.status==='past-max'){labelTxt='⚠ PAST WINDOW';labelColor='#a05050';subText='Aged beyond max window — drink soon';}
      return'<div onclick="showView(\'batch\',\''+b.id+'\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer">'
        +'<div style="width:8px;height:38px;border-radius:2px;background:'+color+';flex-shrink:0"></div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
        +'<div style="font-size:13px;color:'+color+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(b.name)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:'+labelColor+';letter-spacing:1.5px;white-space:nowrap">'+labelTxt+'</div>'
        +'</div>'
        +'<div style="font-size:11.5px;color:var(--text3);margin-top:3px">'+escHtml(subText)+' · '+s.onHand+' on hand</div>'
        +'</div></div>';
    }).join('');
    windowCards='<div class="card" style="margin-top:16px;padding:0;overflow:hidden">'
      +'<div class="card-header" style="padding:14px 14px 8px"><div class="card-title">🍷 DRINKING WINDOW</div></div>'
      +'<div>'+windowRows+'</div>'
      +(windowItems.length>5?'<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border)"><button class="btn btn-secondary btn-sm" onclick="showView(\'cellar\')">See all '+windowItems.length+' in cellar →</button></div>':'')
      +'</div>';
  }

  // ============ BATCH HEALTH OVERVIEW ============
  // Same mwBatchHealth() score that powers the batch Overview tab's health
  // hero (see renderBatchAdvisorStrip in 12-advisor.js), shown across every
  // active batch at a glance instead of drilling into one at a time.
  var healthCards='';
  if(active.length){
    var healthRows=active.slice(0,6).map(function(b){
      var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
      var h=adv&&adv.health,hm=_advHealthMeta(h&&h.band);
      return'<div onclick="showView(\'batch\',\''+b.id+'\')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer">'
        +'<div style="text-align:center;min-width:36px"><div style="font-family:var(--font-display);font-size:20px;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+'</div></div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:12.5px;color:'+getBatchColor(b)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(b.name)+'</div>'
        +'<div style="font-size:11px;color:'+hm.c+'">'+hm.l+_advTrendChip(h&&h.trend)+'</div>'
        +'</div></div>';
    }).join('');
    healthCards='<div class="card" style="margin-top:16px;padding:0;overflow:hidden">'
      +'<div class="card-header" style="padding:14px 14px 8px"><div class="card-title">✦ BATCH HEALTH</div></div>'
      +'<div>'+healthRows+'</div>'
      +(active.length>6?'<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border)"><button class="btn btn-secondary btn-sm" onclick="showView(\'batches\')">See all '+active.length+' active →</button></div>':'')
      +'</div>';
  }

  // "Under your care" = still fermenting or sitting in your cellar. Completed
  // (drunk/gifted away) and failed batches are gone — their stats live on for
  // reference/rebrewing but they aren't in your care anymore.
  var L=lifetimeStats();
  var careFootnotes=[];
  if(L.complete)careFootnotes.push(L.complete+' finished');
  if(L.failed)careFootnotes.push(L.failed+' failed');
  // Helper for a stat card with an optional smaller sub-line of richer data.
  function statCard(val,label,sub,opts){
    opts=opts||{};
    return'<div class="stat-card"'+(opts.border?' style="border-color:'+opts.border+'"':'')+'>'
      +'<div class="stat-val"'+(opts.color?' style="color:'+opts.color+'"':'')+'>'+val+'</div>'
      +'<div class="stat-label">'+label+'</div>'
      +(sub?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;margin-top:5px;line-height:1.4">'+sub+'</div>':'')
      +'</div>';
  }
  var sizes=fmtBottleSizes(L.bySize);
  var tempCard=currentTemp
    ? statCard(currentTemp.value.toFixed(1)+'°','Ferment Temp',null,{border:'var(--'+(tempZone(currentTemp.value)==='optimal'?'green':tempZone(currentTemp.value)==='warm'?'amber':tempZone(currentTemp.value)==='cold'?'blue':'red')+')',color:'var(--'+(tempZone(currentTemp.value)==='optimal'?'green2':tempZone(currentTemp.value)==='warm'?'honey':tempZone(currentTemp.value)==='cold'?'blue2':'red2')+')'})
    : '';
  return'<div class="dashboard-hero">'
    +'<div class="dashboard-hero-logo">'+brandCrestSVG(140)+'</div>'
    +'<div class="dashboard-hero-text"><div class="page-title" style="margin-bottom:6px">Dashboard</div><div class="page-subtitle" style="margin-bottom:0">'+(typeof activeBevMode==='function'&&activeBevMode()==='cider'?'The Cidermaker\'s Overview':'The Meadwright\'s Overview')+' · '+L.inCare+' batch'+(L.inCare!==1?'es':'')+' under your care'+(careFootnotes.length?' · '+careFootnotes.join(' · '):'')+'</div></div>'
    +'</div>'
    +renderStockAlerts()
    +renderProactiveAlerts()
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">'
    +statCard(L.active,'Active Batches',L.bottledBatches?'+ '+L.bottledBatches+' aging in cellar':'fermenting now')
    +statCard(L.onHand,'Bottles On Hand',(L.cellar||L.fridge)?L.cellar+' cellar · '+L.fridge+' fridge':null)
    +statCard(L.total,'Batches Brewed',L.complete+' finished · '+L.bottledBatches+' bottled · '+L.active+' active')
    +statCard(L.bottledEver,'Bottled (lifetime)',sizes||null)
    +statCard(L.gifted,'Gifted Away',L.gifted?'shared with others':null,{color:L.gifted?'var(--purple2)':null})
    +statCard(L.drunk,'Enjoyed',L.drunk?'bottles drunk':null,{color:L.drunk?'var(--gold2)':null})
    +tempCard
    +'</div>'
    +'<div class="grid-2">'
    +'<div><div style="font-family:var(--font-display);font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:12px">◈ ACTIVE BATCHES</div>'+batchCards
    +fermenterCards
    +windowCards
    +'</div>'
    +'<div>'
    +'<div style="font-family:var(--font-display);font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:12px">✦ TODAY\'S TASKS</div>'
    +'<div class="coach-box"><div class="coach-title">⚗ DAILY BREW LOG · '+new Date().toLocaleDateString(_dloc(),{weekday:'long',day:'numeric',month:'long'})+'</div>'
    +'<div class="coach-tasks">'+taskHtml+'</div>'
    +(todayTasks.length?'<div style="margin-top:12px"><button class="btn btn-secondary btn-sm" onclick="showView(\'coach\')">See full briefing →</button></div>':'')
    +'</div>'
    +(modeBatches.length?'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">GRAVITY TREND</div></div><div style="position:relative;height:180px"><canvas id="dash-chart"></canvas></div></div>':'')
    +healthCards
    +renderOnThisDayCard()
    +'</div></div>';
}

// Returns an "On this day" card surfacing past-year(s) events on the same
// calendar date — batches started, batches bottled, tastings recorded. Useful
// once the journal has 1-2+ years of data; renders nothing on a clean install.
function renderOnThisDayCard(){
  var today=new Date();
  var todayMonth=today.getMonth();
  var todayDay=today.getDate();
  var thisYear=today.getFullYear();

  function isSameMonthDay(dateStr){
    if(!dateStr)return false;
    var d=new Date(dateStr);
    if(isNaN(d.getTime()))return false;
    return d.getMonth()===todayMonth&&d.getDate()===todayDay&&d.getFullYear()<thisYear;
  }

  var events=[];
  // Batches started on this calendar day in a previous year
  visibleBatches().forEach(function(b){
    if(isSameMonthDay(b.startDate)){
      var d=new Date(b.startDate);
      var yearsAgo=thisYear-d.getFullYear();
      events.push({
        date:b.startDate,
        yearsAgo:yearsAgo,
        type:'started',
        icon:'⚗',
        title:'Started '+b.name,
        sub:(getRecipe(b.recipeId)||{}).style||b.style||'',
        color:getBatchColor(b),
        action:function(){return'showView(\'batch\',\''+b.id+'\')';}
      });
    }
  });
  // Batches bottled on this calendar day in a previous year
  Object.keys(APP.bottling||{}).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(!bot||!isSameMonthDay(bot.date))return;
    var b=getBatch(bid);
    if(!b||!inActiveMode(b))return;
    var d=new Date(bot.date);
    var yearsAgo=thisYear-d.getFullYear();
    events.push({
      date:bot.date,
      yearsAgo:yearsAgo,
      type:'bottled',
      icon:'🍾',
      title:'Bottled '+b.name,
      sub:(bot.abv?bot.abv+'% ABV · ':'')+totalBottles(bot)+' bottle'+(totalBottles(bot)!==1?'s':''),
      color:getBatchColor(b),
      action:function(){return'showView(\'batch\',\''+b.id+'\')';}
    });
  });
  // Tastings logged on this calendar day in a previous year
  Object.keys(APP.tastings||{}).forEach(function(bid){
    var arr=APP.tastings[bid]||[];
    var b=getBatch(bid);
    if(!b||!inActiveMode(b))return;
    arr.forEach(function(t){
      if(!isSameMonthDay(t.date))return;
      var d=new Date(t.date);
      var yearsAgo=thisYear-d.getFullYear();
      events.push({
        date:t.date,
        yearsAgo:yearsAgo,
        type:'tasting',
        icon:'🍷',
        title:'Tasted '+b.name,
        sub:(t.rating?('★'.repeat(t.rating)+'☆'.repeat(5-t.rating)):'')+(t.note?' · '+t.note.slice(0,60)+(t.note.length>60?'…':''):''),
        color:getBatchColor(b),
        action:function(){return'showView(\'batch\',\''+b.id+'\')';}
      });
    });
  });

  if(!events.length)return'';

  // Sort: most recent year first (1 year ago, then 2, ...)
  events.sort(function(a,b){
    if(a.yearsAgo!==b.yearsAgo)return a.yearsAgo-b.yearsAgo;
    return(a.date||'').localeCompare(b.date||'');
  });

  var yearGroups={};
  events.forEach(function(e){
    if(!yearGroups[e.yearsAgo])yearGroups[e.yearsAgo]=[];
    yearGroups[e.yearsAgo].push(e);
  });
  var groupOrder=Object.keys(yearGroups).map(Number).sort(function(a,b){return a-b;});

  var html='<div class="card" style="margin-top:16px;border-left:3px solid var(--gold2)"><div class="card-header"><div class="card-title">📅 ON THIS DAY · '+today.toLocaleDateString(_dloc(),{day:'numeric',month:'long'})+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;font-style:italic;line-height:1.55">What you were brewing on this calendar day in previous years.</div>'
    +groupOrder.map(function(y){
      var label=y===1?'1 year ago':y+' years ago';
      return'<div style="margin-bottom:14px"><div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:2px;margin-bottom:6px">'+label.toUpperCase()+' · '+(thisYear-y)+'</div>'
        +yearGroups[y].map(function(e){
          return'<div onclick="'+e.action()+'" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border-radius:var(--radius);border-left:3px solid '+e.color+';cursor:pointer;margin-bottom:4px;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
            +'<div style="font-size:18px">'+e.icon+'</div>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-family:var(--font-display);font-size:13.5px;color:'+e.color+'">'+escHtml(e.title)+'</div>'
            +(e.sub?'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(e.sub)+'</div>':'')
            +'</div></div>';
        }).join('')
        +'</div>';
    }).join('')
    +'</div>';
  return html;
}

function initDashCharts(){
  var modeBatches=visibleBatches();
  if(!modeBatches.length)return;
  setTimeout(function(){
    var ctx=document.getElementById('dash-chart');
    if(!ctx)return;
    var active=modeBatches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';}).slice(0,4);
    var datasets=active.map(function(b){
      var logs=getBatchLogs(b.id);
      var data=[{x:0,y:b.og||1.095}].concat(logs.map(function(l,j){return{x:j+1,y:l.gravity};}));
      return{label:b.name,data:data,borderColor:getBatchColor(b),backgroundColor:'transparent',tension:0.4,pointRadius:3,borderWidth:2};
    });
    makeChart(ctx,{
      type:'line',data:{datasets:datasets},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{type:'linear',ticks:{color:'#6a5f50',font:{size:10}},grid:{color:'#2a2a35'}},
          y:{ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(3);}},grid:{color:'#2a2a35'}}}}
    });
  },100);
}

// ==================== BATCH LIST ====================
// Helper used by both initial render and the live-search update path. Kept at
// top level (not nested inside renderBatchList) so updateBatchSearchResults
// can call it from outside the closure — under strict mode, nested function
// declarations don't leak to the enclosing scope.
// Compact pill mirroring the dashboard/detail fermentation projection, so the
// "possibly stalled" / "near final gravity" state is visible in the overview too.
function batchListPill(b){
  var status=getBatchStatus(b);
  if(status==='bottled'||status==='complete'||status==='failed')return'';
  var p=(typeof projectFermentation==='function')?projectFermentation(b):null;
  if(!p)return'';
  var c,txt;
  if(p.stalled){c='var(--red2)';txt='⚠ Possibly stalled';}
  else if(p.nearFG){c='var(--green2)';txt='✓ Near final gravity';}
  else return'';
  return'<span style="font-family:var(--font-mono);font-size:9px;background:'+c+'22;color:'+c+';border:1px solid '+c+'55;padding:2px 8px;border-radius:8px;letter-spacing:0.5px;white-space:nowrap">'+txt+'</span>';
}
function _renderBatchGroup(title,arr){
  if(!arr.length)return'';
  return'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:2px;text-transform:uppercase;margin:24px 0 10px">'+title+' · '+arr.length+'</div>'
    +arr.map(function(b){
      var d=daysSince(b.startDate),status=getBatchStatus(b);
      var recipe=getRecipe(b.recipeId);
      var color=getBatchColor(b);
      var logs=getBatchLogs(b.id);
      // Prefer the last logged reading; a bottled batch with no gravity logs
      // (common — plenty of brewers only record the number at bottling time)
      // falls back to the bottling record's own FG, not silently back to OG,
      // which used to read as "1.098 → 1.098" — implying nothing fermented.
      var bottlingRec=APP.bottling[b.id];
      var lastG=logs.length?logs[logs.length-1].gravity:((bottlingRec&&bottlingRec.fg!=null)?bottlingRec.fg:b.og);
      return'<div class="card" style="margin-bottom:8px;cursor:pointer;padding:0;overflow:hidden" onclick="showView(\'batch\',\''+b.id+'\')">'
        +'<div style="display:flex;align-items:stretch">'
        +'<div style="width:4px;background:'+color+'"></div>'
        +'<div style="display:flex;align-items:center;gap:16px;padding:14px 18px;flex:1;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:200px"><div style="font-family:var(--font-display);font-size:15px;color:'+color+';letter-spacing:1px">'+escHtml(b.name)+(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:2px 7px;border-radius:8px;letter-spacing:0.5px;margin-left:8px;vertical-align:middle">#'+escHtml(b.serial)+'</span>':'')+'</div>'
        +'<div style="font-size:13px;color:var(--text3);margin-top:2px">'+(recipe?recipe.style:(b.style||'Custom'))+' · '+fmtDate(b.startDate)+'</div></div>'
        +'<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">'
        +'<div style="text-align:center"><div style="font-family:var(--font-mono);font-size:13px;color:var(--text)">'+(status==='bottled'?'∞':fmtDurationCompact(d))+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3)">'+(status==='bottled'?'BOTTLED':'AGE')+'</div></div>'
        +'<div style="text-align:center"><div style="font-family:var(--font-mono);font-size:13px;color:var(--text)">'+(b.og||'?')+' → '+(lastG||'?')+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3)">OG→SG</div></div>'
        +'<div style="text-align:center"><div style="font-family:var(--font-mono);font-size:13px;color:var(--text)">'+(b.volume||'?')+'L</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3)">VOL</div></div>'
        +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">'+statusBadge(status)+batchListPill(b)+'</div>'
        +'</div></div></div></div>';
    }).join('');
}

var BATCH_PAGE=60;

// Shared filter + sort over all batches. Builds a recipe lookup once so search
// stays O(batches), not O(batches×recipes), at scale.
function _batchFilterSort(){
  var q=(APP.filters.batchSearch||'').toLowerCase().trim();
  var statusFilter=APP.filters.batchStatus||'all';
  var sort=APP.filters.batchSort||'newest';
  var rmap={};(APP.recipes||[]).forEach(function(r){rmap[r.id]=r;});
  var arr=visibleBatches().filter(function(b){
    if(statusFilter!=='all'){
      var st=getBatchStatus(b);
      if(statusFilter==='active'){if(st==='bottled'||st==='complete'||st==='failed')return false;}
      else if(st!==statusFilter)return false;
    }
    if(!q)return true;
    var r=rmap[b.recipeId];
    var hay=((b.name||'')+' '+(b.serial||'')+' '+(r?r.name:'')+' '+(r?r.category:'')+' '+(r?r.style:'')+' '+(b.notes||'')).toLowerCase();
    return hay.indexOf(q)>=0;
  });
  arr.sort(function(a,b){
    if(sort==='name')return (a.name||'').localeCompare(b.name||'');
    if(sort==='oldest')return (a.startDate||'').localeCompare(b.startDate||'');
    if(sort==='volume')return (parseFloat(b.volume)||0)-(parseFloat(a.volume)||0);
    return (b.startDate||'').localeCompare(a.startDate||''); // newest
  });
  return arr;
}

// Window the sorted results (only the first batchLimit cards are built) + group
// the page + a "show more" footer — so hundreds of batches stay cheap to render.
function _batchListResultsHtml(){
  var arr=_batchFilterSort(), total=arr.length;
  if(total===0)return '<div class="empty-state"><p>No batches match the filters.</p></div>';
  var limit=APP.filters.batchLimit||BATCH_PAGE;
  var shown=arr.slice(0,limit);
  var groups={active:[],bottled:[],complete:[],failed:[]};
  shown.forEach(function(b){var s=getBatchStatus(b);if(s==='failed')groups.failed.push(b);else if(s==='bottled')groups.bottled.push(b);else if(s==='complete')groups.complete.push(b);else groups.active.push(b);});
  var html=_renderBatchGroup('Active',groups.active)+_renderBatchGroup('Bottled',groups.bottled)+_renderBatchGroup('Complete',groups.complete)+(groups.failed.length?_renderBatchGroup('Failed (postmortem)',groups.failed):'');
  if(total>limit)html+='<div style="text-align:center;margin:16px 0"><button class="btn btn-secondary btn-sm" onclick="showMoreBatches()">Show more · '+(total-limit)+' more</button></div>';
  return html;
}

function _batchListSubtitle(total){
  var q=APP.filters.batchSearch,sf=APP.filters.batchStatus;
  var n=visibleBatches().length;
  var heading=(typeof activeBevMode==='function'&&activeBevMode()==='cider')?'The Cidermaker\'s Cellar':'The Meadwright\'s Cellar';
  return heading+' · '+n+' batch'+(n!==1?'es':'')+((q||sf!=='all')?(' · '+total+' shown'):'');
}

function renderBatchList(){
  if(!visibleBatches().length){
    return'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><div class="page-title">My Batches</div><button class="btn btn-primary" onclick="openNewBatchModal()">＋ New Batch</button></div>'
      +'<div class="page-subtitle">The Cellar</div>'
      +'<div class="empty-state"><div class="es-icon">🍯</div><p>Your cellar awaits its first creation.</p><br><button class="btn btn-primary" onclick="openNewBatchModal()">＋ Begin First Batch</button></div>';
  }
  var q=(APP.filters.batchSearch||'');
  var statusFilter=APP.filters.batchStatus||'all';
  var sort=APP.filters.batchSort||'newest';
  var failedCount=visibleBatches().filter(function(b){return getBatchStatus(b)==='failed';}).length;
  var statusChips=[['all','All'],['active','Active'],['bottled','Bottled'],['complete','Complete'],['failed','Failed']]
    .map(function(x){return'<span class="filter-chip '+(statusFilter===x[0]?'active':'')+'" onclick="setBatchFilter(\''+x[0]+'\')">'+x[1]+(x[0]==='failed'&&failedCount?' · '+failedCount:'')+'</span>';}).join('');
  var sortSel='<select class="search-input" style="max-width:180px;flex:0 0 auto" onchange="setBatchSort(this.value)" title="Sort batches">'
    +[['newest','Newest first'],['oldest','Oldest first'],['name','Name A–Z'],['volume','Volume (high→low)']].map(function(o){return'<option value="'+o[0]+'"'+(sort===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')
    +'</select>';
  return'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><div class="page-title">My Batches</div><button class="btn btn-primary" onclick="openNewBatchModal()">＋ New Batch</button></div>'
    +'<div class="page-subtitle" id="batch-list-subtitle">'+_batchListSubtitle(_batchFilterSort().length)+'</div>'
    +'<div class="search-bar"><input type="text" class="search-input" id="batch-search" placeholder="🔍 Search batches by name, recipe, or notes…" value="'+escHtml(q)+'" oninput="updateBatchSearchResults(this.value)">'
    +sortSel
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+statusChips+'</div></div>'
    +'<div id="batch-list-results">'+_batchListResultsHtml()+'</div>';
}

// Re-render only the results container (keeps the search input focused across
// keystrokes) and re-translate it when the UI is in Dutch.
function refreshBatchList(){
  var c=document.getElementById('batch-list-results');
  if(!c){renderMain();return;}
  c.innerHTML=_batchListResultsHtml();
  var sub=document.getElementById('batch-list-subtitle');
  if(sub)sub.textContent=_batchListSubtitle(_batchFilterSort().length);
  if(typeof translateChrome==='function'&&typeof appLang==='function'&&appLang()==='nl'){try{translateChrome(c);}catch(e){}}
}

function updateBatchSearchResults(q){APP.filters.batchSearch=q;APP.filters.batchLimit=BATCH_PAGE;refreshBatchList();}
function setBatchFilter(s){APP.filters.batchStatus=s;APP.filters.batchLimit=BATCH_PAGE;renderMain();}
function setBatchSort(s){APP.filters.batchSort=s;APP.filters.batchLimit=BATCH_PAGE;renderMain();}
function showMoreBatches(){APP.filters.batchLimit=(APP.filters.batchLimit||BATCH_PAGE)+BATCH_PAGE;refreshBatchList();}

// ==================== BATCH DETAIL ====================
// Project where fermentation is heading from the logged gravity readings:
// recent drop rate (regression over the last few points), projected FG, and a
// rough completion estimate. Linear extrapolation under-counts the tail (a real
// ferment slows), so the UI labels it as approximate.
function projectFermentation(b,histArg){
  if(!b)return null;
  var st=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  if(st==='bottled'||st==='complete'||st==='failed')return null;
  var logs=(getBatchLogs(b.id)).filter(function(l){return l.gravity;}).slice()
    .sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  if(logs.length<2)return null;
  var t0=new Date(b.startDate).getTime();
  var pts=logs.map(function(l){return {d:(new Date(l.date).getTime()-t0)/86400000,g:l.gravity};})
    .filter(function(p){return!isNaN(p.d)&&p.d>=0;});
  if(pts.length<2)return null;
  var last=pts[pts.length-1];
  // Least-squares slope over the last up-to-4 readings (gravity per day).
  var win=pts.slice(-4),n=win.length,sx=0,sy=0,sxy=0,sxx=0;
  win.forEach(function(p){sx+=p.d;sy+=p.g;sxy+=p.d*p.g;sxx+=p.d*p.d;});
  var denom=n*sxx-sx*sx;
  var ratePerDay=denom!==0?-((n*sxy-sx*sy)/denom):0; // positive = dropping
  if(ratePerDay<0)ratePerDay=0;
  var recipe=getRecipe(b.recipeId);
  var og=parseFloat(b.og)||null;
  // Prefer the yeast's own attenuation/tolerance ceiling (mwYeastTargets) over
  // the recipe's flat design target — a recipe aimed dry can sit well below
  // what THIS yeast, or honey's non-fermentable content, will actually reach.
  var yt=(og&&b.yeast&&typeof mwYeastTargets==='function')?mwYeastTargets(og,b.yeast):null;
  var estFG=Math.min((yt&&yt.fg)||(recipe&&recipe.fgTarget)||1.000,last.g);
  var remaining=last.g-estFG;
  var atten=og&&og>1?Math.round((og-last.g)/(og-1)*100):null;
  var STALL=0.0008; // pts/day; below this it's basically not moving
  // A genuine plateau (mwFermentTimeline) whose REACHED attenuation is already
  // close to what this yeast is rated for reads as finished, even sitting
  // above the numeric target — honey/fruit both carry non-fermentable sugars,
  // so real mead commonly finishes a few points higher than calculated.
  // "Past the 1/3 sugar break" alone isn't enough (a stall stopped shortly
  // after the break would wrongly pass) — attenuation-reached-vs-expected is
  // the real signal, reusing the same ratio mwBatchSignals already computes.
  var timeline=(typeof mwFermentTimeline==='function')?mwFermentTimeline(logs):null;
  var attenReached=(og&&typeof mwAttenuation==='function')?mwAttenuation(og,last.g):null;
  var attenExpected=(og&&typeof mwAttenuation==='function')?mwAttenuation(og,estFG):null;
  var attenNearTarget=(attenReached!=null&&attenExpected!=null)&&(attenReached>=attenExpected-0.10);
  // Personal history (mwHistoricalComparison — needs 2+ of the brewer's OWN
  // past batches on this yeast, honey-matched first) is a tighter, more
  // grounded reference than the manufacturer's rating once it exists: it's
  // YOUR honey/process/yeast combo actually finishing, not a lab best-case.
  // Silent (null) until there's enough real data — same "incubating" gate E3
  // already uses elsewhere, not a new concept. Callers that already computed
  // it (mwBatchSignals) pass it in via histArg so it isn't scanned twice.
  var hist=(typeof histArg!=='undefined')?histArg:((typeof mwHistoricalComparison==='function')?mwHistoricalComparison(b):null);
  var attenNearHistorical=!!(hist&&hist.avgAttenuation!=null&&attenReached!=null&&(attenReached>=hist.avgAttenuation/100-0.05));
  var plateaued=!!(timeline&&timeline.plateaued);
  var nearFG=remaining<=0.003||((attenNearTarget||attenNearHistorical)&&plateaued);
  // Which signal actually earned "done", most-specific/grounded first — the
  // view uses this to say something honest and concrete instead of a vague
  // "gravity stable" (e.g. naming your OWN past batches on this yeast, not
  // just "honey does this sometimes").
  var nearFGReason=!nearFG?null:(remaining<=0.003?'numeric':(attenNearHistorical?'historical':'attenuation'));
  var stalled=ratePerDay<STALL&&!nearFG;
  var daysToFG=(ratePerDay>=STALL&&remaining>0)?Math.ceil(remaining/ratePerDay):null;
  var doneMs=daysToFG!=null?(new Date(logs[logs.length-1].date).getTime()+daysToFG*86400000):null;
  return {ratePerDay:ratePerDay,estFG:estFG,atten:atten,remaining:remaining,daysToFG:daysToFG,doneMs:doneMs,stalled:stalled,nearFG:nearFG,nearFGReason:nearFGReason,lastG:last.g};
}
function renderFermentationProjection(b){
  var p=projectFermentation(b);
  if(!p)return'';
  var accent=p.stalled?'var(--red2)':(p.nearFG?'var(--green2)':'var(--gold2)');
  var title=p.nearFG?'✓ NEAR FINAL GRAVITY':(p.stalled?'⚠ POSSIBLY STALLED':'⏳ FERMENTATION PROJECTION');
  function cell(label,val,c){return'<div style="text-align:center;padding:10px 6px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:18px;color:'+(c||'var(--gold2)')+'">'+val+'</div><div class="micro-label">'+label+'</div></div>';}
  var cells=cell('ATTENUATION',p.atten!=null?p.atten+'%':'—')
    +cell('DROP RATE',p.ratePerDay>0.0001?(p.ratePerDay*1000).toFixed(1)+'<span style="font-size:10px;color:var(--text3)"> pt/d</span>':'~0')
    +cell('PROJ. FG',p.estFG.toFixed(3))
    +cell('EST. DONE',p.daysToFG!=null?'~'+p.daysToFG+'d':(p.nearFG?'≈ now':'—'),p.nearFG?'var(--green2)':'var(--gold2)');
  var note=p.stalled
    ?'Gravity has barely moved recently but isn\'t near target — check temperature, add nutrient, or consider a re-pitch (see Troubleshooting).'
    :(p.nearFG?'Close to the projected final gravity. Take two stable readings a few days apart to confirm it\'s done, then rack/bottle.'
    :'Estimated from your recent readings\' drop rate. Fermentation slows as it finishes, so the real completion is usually a little later.');
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid '+accent+'"><div class="card-header"><div class="card-title" style="color:'+accent+'">'+title+'</div></div>'
    +'<div class="grid-4" style="margin-bottom:10px">'+cells+'</div>'
    +'<div style="font-size:11.5px;color:var(--text3);font-style:italic;line-height:1.5">'+note+'</div></div>';
}
function renderBatchDetail(){
  var b=getBatch(currentBatchId);
  if(!b)return'<div class="empty-state"><p>Batch not found.</p><br><button class="btn btn-secondary" onclick="showView(\'batches\')">← Back to Cellar</button></div>';
  var isCider=(b.beverageType||'mead')==='cider';
  var recipe=getRecipe(b.recipeId);
  var logs=getBatchLogs(b.id);
  var d=daysSince(b.startDate);
  var status=getBatchStatus(b);
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  // For label rendering and bottled-state displays, prefer the final ABV stored
  // at bottling time over a stale gravity-derived estimate (often missing).
  var bottlingForABV=APP.bottling[b.id];
  var currentABV=(bottlingForABV&&bottlingForABV.abv)
    ?bottlingForABV.abv
    :(b.og&&lastG?calcABV(b.og,lastG):'—');
  // Tab state lives in a session-only map keyed by batch ID so it doesn't get
  // serialized into HA sync (previously stored on b._tab, which caused tabs to
  // teleport between devices). Falls back to legacy b._tab for one render so
  // existing in-memory state from before the upgrade still works.
  if(!window._batchTabs)window._batchTabs={};
  var activeTab=window._batchTabs[b.id]||b._tab||'overview';
  // One-time migration: if a tab name lingers on the batch object, copy it
  // over and strip it so it never reaches packageState.
  if(b._tab){window._batchTabs[b.id]=b._tab;delete b._tab;}
  var color=getBatchColor(b);
  var tabContent='';

  if(activeTab==='overview'){
    var steps=recipe?injectCareSteps(typeof getEffectiveSteps==='function'?getEffectiveSteps(b,recipe):recipe.steps):[];
    var timelineHtml=steps.map(function(s){
      var done=d>s.day+1,curr=!done&&d>=s.day-1&&d<=s.day+2;
      return'<div class="tl-item"><div class="tl-dot '+(done?'done':curr?'active':'future')+'"></div>'
        +'<div class="tl-day">Day '+s.day+'</div><div class="tl-title">'+escHtml(s.title)+'</div><div class="tl-desc">'+escHtml(annotateNutrientDesc(s.desc))+'</div></div>';
    }).join('')+sugarBreakNote(steps);
    var bottling=APP.bottling[b.id];
    tabContent=(typeof renderBatchAdvisorStrip==='function'?renderBatchAdvisorStrip(b):'')
      +_blendLineageHtml(b)
      +(typeof renderBatchTargets==='function'?renderBatchTargets(b):'')
      +'<div class="grid-2">'
      +'<div><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">BATCH DETAILS</div><button class="btn btn-secondary btn-sm" onclick="openEditBatchModal(\''+b.id+'\')">Edit</button></div>'
      +'<table class="data-table">'
      +'<tr><td style="color:var(--text3)">Status</td><td>'+statusBadge(status)+'</td></tr>'
      +'<tr><td style="color:var(--text3)">Recipe</td><td>'+escHtml(recipe?recipe.name:(b.style||'Custom'))+'</td></tr>'
      +(recipe?'<tr><td style="color:var(--text3)">Brand Label</td><td style="font-family:var(--font-display);color:'+color+'">'+escHtml(recipe.brandName||recipe.name)+'</td></tr>':'')
      +'<tr><td style="color:var(--text3)">Volume</td><td>'+(b.volume||'?')+' L</td></tr>'
      +'<tr><td style="color:var(--text3)">Started</td><td>'+fmtDate(b.startDate)+'</td></tr>'
      +'<tr><td style="color:var(--text3)">Age</td><td>'+fmtDuration(d)+' <span style="color:var(--text3);font-size:11px;font-family:var(--font-mono)">· day '+d+'</span></td></tr>'
      +'<tr><td style="color:var(--text3)">OG</td><td>'+(b.og||'not recorded')+'</td></tr>'
      +'<tr><td style="color:var(--text3)">Latest SG</td><td>'+(lastG||'—')+'</td></tr>'
      +'<tr><td style="color:var(--text3)">Est. ABV</td><td>'+currentABV+(currentABV!=='—'?'%':'')+'</td></tr>'
      +(b.fermenterId?(function(){
        var ferm=getFermenter(b.fermenterId);
        if(!ferm)return'';
        var rackingCount=(b.rackings||[]).length;
        var label=ferm.name+(ferm.capacity?' ('+fmtVol(ferm.capacity)+')':'')+(rackingCount?' &nbsp;<span style="font-size:10px;font-family:var(--font-mono);color:var(--text3);letter-spacing:1px">· '+rackingCount+'× RACKED</span>':'');
        return'<tr><td style="color:var(--text3)">Current Vessel</td><td><span style="color:'+(ferm.color||'var(--gold2)')+'">'+escHtml(ferm.name.length>30?ferm.name.slice(0,28)+'…':ferm.name)+'</span>'+(ferm.capacity?' <span style="color:var(--text3);font-size:11px">('+fmtVol(ferm.capacity)+')</span>':'')+(rackingCount?' <span style="font-size:10px;font-family:var(--font-mono);color:var(--text3);letter-spacing:1px;margin-left:6px">· '+rackingCount+'× RACKED</span>':'')+'</td></tr>';
      }()):'')
      +(!APP.bottling[b.id]?'<tr><td style="color:var(--text3)">Bulk Aging</td><td><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:normal"><input type="checkbox" '+(b.bulkAging?'checked':'')+' onchange="toggleBulkAging(\''+b.id+'\',this.checked);renderMain()" style="cursor:pointer"> Held colder than fermentation on purpose (skips the Advisor\'s fermentation-temperature check)</label></td></tr>':'')
      +(b.honey?'<tr><td style="color:var(--text3)">'+(isCider?'Juice Used':'Honey Used')+'</td><td>'+b.honey+(isCider?' L':' kg')+(b.honeyType?' · '+escHtml(b.honeyType):'')+'</td></tr>':'')
      +(b.yeast?'<tr><td style="color:var(--text3)">Yeast</td><td>'+escHtml((getYeastById(b.yeast)||{}).name||b.yeast)+'</td></tr>':'')
      +(b.nutrient?(function(){
        var p=typeof getNutrientById==='function'?getNutrientById(b.nutrient):null;
        if(!p)return'';
        var protocolName=p.protocol==='tosna'?'TOSNA':(p.protocol==='goferm'?'Rehyd. only':'SNA');
        var protocolColor=p.protocol==='tosna'?'var(--green2)':(p.protocol==='goferm'?'var(--blue2)':'var(--gold2)');
        return'<tr><td style="color:var(--text3)">Nutrient</td><td>'+escHtml(p.name)+' <span style="font-family:var(--font-mono);font-size:10px;color:'+protocolColor+';letter-spacing:1px;background:rgba(0,0,0,0.18);padding:1px 6px;border-radius:8px;margin-left:6px">'+protocolName+'</span></td></tr>';
      }()):'')
      +(b.cost&&(b.cost.honey||b.cost.extras)?(function(){
        var ccy=APP.settings.currency||'€';
        var bot=APP.bottling[b.id];
        var totalCost=(b.cost.honey||0)+(b.cost.extras||0);
        if(!bot)return'<tr><td style="color:var(--text3)">Cost</td><td>'+ccy+totalCost.toFixed(2)+'</td></tr>';
        var perL=costPerLitre(b,bot);
        var sizes=activeBottleSizes(bot);
        var perBottleParts=sizes.map(function(sz){return ccy+costForBottle(b,bot,sz).toFixed(2)+'/'+sz+'ml';}).join(' · ');
        return'<tr><td style="color:var(--text3)">Cost</td><td>'+ccy+totalCost.toFixed(2)+(perL>0?' &nbsp;·&nbsp; '+ccy+perL.toFixed(2)+'/L'+(perBottleParts?' &nbsp;('+perBottleParts+')':''):'')+'</td></tr>';
      }()):'')
      +(b.notes?'<tr><td style="color:var(--text3)">Notes</td><td style="font-style:italic">'+escHtml(b.notes)+'</td></tr>':'')
      +'</table></div>'
      +renderFermentationProjection(b)
      +(b.rackings&&b.rackings.length?(function(){
        var rows=b.rackings.slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');}).map(function(r,i){
          var fromF=getFermenter(r.fromFermenterId),toF=getFermenter(r.toFermenterId);
          var fromName=fromF?fromF.name:'(removed)',toName=toF?toF.name:'(removed)';
          var fromColor=fromF&&fromF.color||'var(--text3)',toColor=toF&&toF.color||'var(--gold2)';
          return'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">'
            +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);min-width:80px">'+fmtDate(r.date)+'</div>'
            +'<div style="flex:1"><span style="color:'+fromColor+'">'+escHtml(fromName)+'</span> <span style="color:var(--text3)">→</span> <span style="color:'+toColor+'">'+escHtml(toName)+'</span>'
            +(r.notes?'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:2px">'+escHtml(r.notes)+'</div>':'')
            +'</div></div>';
        }).join('');
        return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🔁 VESSEL HISTORY · '+b.rackings.length+' RACKING'+(b.rackings.length===1?'':'S')+'</div></div>'
          +rows
          +'</div>';
      }()):'')
      +(b.cost&&(b.cost.honey||b.cost.extras)?(function(){
        var ccy=APP.settings.currency||'€';
        var honey=b.cost.honey||0;
        var extras=b.cost.extras||0;
        var total=honey+extras;
        var bot=APP.bottling[b.id];
        var perL=bot?costPerLitre(b,bot):0;
        var perLPerVolume=(b.volume||1)>0?total/(b.volume||1):0;
        var sizes=bot?activeBottleSizes(bot):[];
        var sizeBreakdown=sizes.length&&bot?sizes.map(function(sz){
          var sizeOrig=bottlesOriginalBySize(bot,sz);
          var sizeOnHand=bottlesInLocationBySize(bot,'cellar',sz)+bottlesInLocationBySize(bot,'fridge',sz)+bottlesInLocationBySize(bot,'other',sz);
          return'<tr><td style="color:var(--text3);padding-left:12px">↳ '+sz+'ml bottle</td><td>'+ccy+costForBottle(b,bot,sz).toFixed(2)+' <span style="color:var(--text3);font-size:11px">('+sizeOrig+' filled · '+sizeOnHand+' on-hand)</span></td></tr>';
        }).join(''):'';
        return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 COST &amp; ECONOMICS</div></div>'
          +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">'
          +'<div class="stat-card" style="padding:12px"><div class="stat-val" style="font-size:22px;color:var(--gold2)">'+ccy+total.toFixed(2)+'</div><div class="stat-label">Total Spent</div></div>'
          +(perL>0?'<div class="stat-card" style="padding:12px"><div class="stat-val" style="font-size:22px;color:var(--green2)">'+ccy+perL.toFixed(2)+'</div><div class="stat-label">Per Litre</div></div>':'<div class="stat-card" style="padding:12px"><div class="stat-val" style="font-size:22px;color:var(--text2)">'+ccy+perLPerVolume.toFixed(2)+'</div><div class="stat-label">Per Litre (Recipe)</div></div>')
          +'</div>'
          +'<table class="data-table" style="font-size:13px"><tr><td style="color:var(--text3)">'+(isCider?'Juice':'Honey')+'</td><td>'+ccy+honey.toFixed(2)+(b.honey?' <span style="color:var(--text3);font-size:11px">('+ccy+(honey/b.honey).toFixed(2)+(isCider?'/L)':'/kg)')+'</span>':'')+'</td></tr>'
          +(extras?'<tr><td style="color:var(--text3)">Fruit, spices, extras</td><td>'+ccy+extras.toFixed(2)+'</td></tr>':'')
          +sizeBreakdown
          +'</table>'
          +((bottling&&bottling.packaging&&bottling.packaging.items&&bottling.packaging.items.length)?(function(){
            var p=bottling.packaging;
            return'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:12px 0 4px">PACKAGING · '+(bottling.closure==='cork'?'CORKS':bottling.closure==='swing-top'?'SWING-TOP':'CROWN CAPS')+'</div>'
              +'<table class="data-table" style="font-size:12.5px">'
              +p.items.map(function(it){return'<tr><td style="color:var(--text3)">'+escHtml(it.label)+' × '+it.qty+(it.tracked?'':' <span style="font-size:10px;font-style:italic">(untracked)</span>')+'</td><td style="font-family:var(--font-mono)">'+(it.cost>0?ccy+it.cost.toFixed(2):'—')+'</td></tr>';}).join('')
              +(p.cost>0?'<tr style="border-top:1px solid var(--border)"><td style="font-weight:600;color:var(--text)">Packaging total</td><td style="font-family:var(--font-mono);font-weight:600;color:var(--gold2)">'+ccy+p.cost.toFixed(2)+'</td></tr>':'')
              +'</table>';
          }()):'')
          +'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic">'
          +(perL>0?'A 750ml bottle costs you '+ccy+(perL*0.75).toFixed(2)+', a 500ml bottle costs '+ccy+(perL*0.5).toFixed(2)+'. '+(perL<5?'Great value':perL<10?'Reasonable':'Premium')+' for homemade mead.':'Bottle the batch to see per-bottle cost.')
          +'</div></div>';
      }()):'')
      +(bottling?(function(){
        // Compute aging info for the row + a small progress hint
        var agingDays=(typeof bottleDaysAged==='function')?bottleDaysAged(b):null;
        var profile=(typeof getAgingProfile==='function')?getAgingProfile(b):null;
        var agingCell='—';
        if(agingDays!=null&&profile){
          var statusInfo=(typeof getAgingStatus==='function')?getAgingStatus(agingDays,profile):null;
          var statusLabel=statusInfo?statusInfo.label:'';
          // Inline progress hint based on the milestone the batch is closest to
          var hint='';
          if(agingDays<profile.minDays){hint=' · '+fmtDuration(profile.minDays-agingDays)+' to drinkable';}
          else if(agingDays<profile.peakDays){hint=' · '+fmtDuration(profile.peakDays-agingDays)+' to peak';}
          else if(agingDays<profile.maxDays){hint=' · '+fmtDuration(profile.maxDays-agingDays)+' to max';}
          else{hint=' · past max ('+fmtDuration(agingDays-profile.maxDays)+' over)';}
          agingCell=fmtDuration(agingDays)+' <span style="color:var(--text3);font-size:11px;font-family:var(--font-mono);letter-spacing:0.5px">'+(statusLabel?'· '+statusLabel.toLowerCase():'')+hint+'</span>';
        }
        return'<div class="card" style="margin-bottom:16px;border-color:'+color+'"><div class="card-header"><div class="card-title">BOTTLED</div></div>'
          +'<table class="data-table">'
          +'<tr><td style="color:var(--text3)">Bottle Date</td><td>'+fmtDate(bottling.date)+'</td></tr>'
          +'<tr><td style="color:var(--text3)">Aging</td><td>'+agingCell+'</td></tr>'
          +'<tr><td style="color:var(--text3)">Bottles</td><td>'+(bottling.bottleCount||'—')+'</td></tr>'
          +'<tr><td style="color:var(--text3)">Final ABV</td><td>'+(bottling.abv||currentABV)+'%</td></tr>'
          +(bottling.notes?'<tr><td style="color:var(--text3)">Notes</td><td style="font-style:italic">'+escHtml(bottling.notes)+'</td></tr>':'')
          +'</table></div>';
      }()):'')
      +(recipe?'<div class="card"><div class="card-header"><div class="card-title">INGREDIENTS</div></div><table class="data-table">'
        +recipe.ingredients.map(function(ing){return'<tr><td style="color:var(--text);width:38%">'+escHtml(ing.item)+'</td><td style="font-family:var(--font-mono);font-size:12px;color:'+color+'">'+escHtml(ing.amount)+'</td><td style="color:var(--text3);font-style:italic;font-size:12px">'+escHtml(ing.notes)+'</td></tr>';}).join('')
        +'</table></div>':'')
      +'</div><div>'
      +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">BRAND LABEL</div></div>'
      +'<div style="max-width:760px;margin:0 auto">'+renderBatchLabel(recipe?recipe.id:'r1',currentABV,{batch:b,maxWidth:'420px'})+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:10px;text-align:center;font-family:var(--font-mono);letter-spacing:1px">'+escHtml(b.name).toUpperCase()+' · '+fmtDate(b.startDate)+(currentABV!=='—'?' · '+currentABV+'% ABV':'')+'</div>'
      +'</div>'
      +'<div class="card"><div class="card-header"><div class="card-title">JOURNEY'+(b.customSteps&&b.customSteps.length?' <span style="font-family:var(--font-mono);font-size:9px;color:var(--gold2);letter-spacing:1px">· CUSTOM</span>':'')+'</div><button class="btn btn-secondary btn-sm" onclick="openStepEditor(\''+b.id+'\')">'+(appLang()==='nl'?'✎ Schema':'✎ Edit schedule')+'</button></div>'
      +'<div class="timeline">'+(timelineHtml||'<p style="color:var(--text3);font-style:italic">No recipe steps available.</p>')+'</div></div>'
      +'</div></div>';
  }

  if(activeTab==='log'){
    // Show pH column only when at least one log has a value — keeps the table
    // clean for users who never log pH while still surfacing it naturally for
    // those who do.
    var anyPH=logs.some(function(l){return l.ph!=null;});
    var LOG_CAP=100;
    var revLogs=[].concat(logs).reverse();
    var logCapped=(!window._batchLogShowAll&&revLogs.length>LOG_CAP)?revLogs.slice(0,LOG_CAP):revLogs;
    var logRows=revLogs.length?logCapped.map(function(l){
      var gravCell=l.gravity!=null?'<span style="font-family:var(--font-mono)">'+l.gravity+'</span>'+(l.tempCorrected&&l.gravityRaw?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-left:6px" title="Raw reading at sample temp">('+l.gravityRaw+' raw)</span>':''):'—';
      var phCell=anyPH?'<td>'+(l.ph!=null?'<span style="font-family:var(--font-mono);color:'+(l.ph<2.9?'var(--red2)':l.ph>3.5?'var(--gold2)':'var(--green2)')+'">'+l.ph.toFixed(2)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>':'';
      return'<tr><td>'+fmtDate(l.date)+'</td>'
        +'<td>'+gravCell+'</td>'
        +'<td>'+(l.gravity&&b.og?calcABV(b.og,l.gravity)+'%':'—')+'</td>'
        +'<td>'+(l.temp?l.temp+'°C':'—')+'</td>'
        +phCell
        +'<td style="font-size:12px;color:var(--text3)">'+escHtml(l.airlock||'—')+'</td>'
        +'<td style="font-style:italic;color:var(--text3);max-width:180px;overflow:hidden;text-overflow:ellipsis">'+escHtml(l.note||'')+'</td>'
        +'<td><button class="btn btn-danger btn-sm" onclick="deleteLog(\''+b.id+'\',\''+l.id+'\')">✕</button></td></tr>';
    }).join(''):'<tr><td colspan="'+(anyPH?8:7)+'" style="text-align:center;color:var(--text3);font-style:italic;padding:20px">No readings yet</td></tr>';
    // Prefer the batch's bound fermenter's live temp; fall back to global
    // currentTemp. This is what makes per-fermenter bindings actually useful
    // for multi-vessel brewers — you don't end up logging Fermenter 2's temp
    // because it happens to be the only globally-bound sensor.
    var fermForBatch=b.fermenterId?getFermenter(b.fermenterId):null;
    var liveT=(fermForBatch&&typeof getFermenterLiveTemp==='function')?getFermenterLiveTemp(fermForBatch):null;
    var prefilledT=liveT?liveT.value:(currentTemp?currentTemp.value:null);
    var tempSrcHint=liveT
      ?'<span style="color:var(--gold2);font-weight:400;font-size:10px;margin-left:6px;font-family:var(--font-mono)">· live from '+escHtml(fermForBatch.tempSensorEntity)+'</span>'
      :(currentTemp?'<span style="color:var(--text3);font-weight:400;font-size:10px;margin-left:6px;font-family:var(--font-mono)">· live (fallback sensor)</span>':'');
    tabContent='<div class="grid-2">'
      +'<div><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">ADD READING</div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="log-date" value="'+today()+'"></div>'
      +'<div class="form-group"><label class="form-label">Gravity (SG)'+(b.gravitySensorEntity?' <span style="font-weight:400;color:var(--gold2);font-size:10px;margin-left:6px;font-family:var(--font-mono)">📡 sensor bound</span>':'')+'</label><div style="display:flex;gap:6px"><input class="form-input" type="number" id="log-gravity" placeholder="1.045" step="0.001" min="0.990" max="1.200" style="flex:1">'+(b.gravitySensorEntity?'<button class="btn btn-secondary btn-sm" onclick="pullGravityFromSensor(\''+b.id+'\')" title="Pull latest reading from '+escHtml(b.gravitySensorEntity)+'" style="padding:0 10px">📡</button>':'')+'</div></div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Temperature (°C)'+tempSrcHint+'</label><input class="form-input" type="number" id="log-temp" placeholder="'+(prefilledT!=null?prefilledT.toFixed(1):'20')+'" step="0.5" value="'+(prefilledT!=null?prefilledT.toFixed(1):'')+'"><div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.5;font-style:italic">Active fermentation runs ~3-6°C warmer than the room around it (yeast activity generates real heat). If this is a room/ambient reading rather than a probe on the vessel, the must itself is likely running hotter than this number.</div></div>'
      +'<div class="form-group"><label class="form-label">Airlock Activity</label><select class="form-select" id="log-airlock"><option value="">—</option><option>Very active (&lt;30s)</option><option>Active (30-60s)</option><option>Slow (1-3 min)</option><option>Very slow (3+ min)</option><option>None</option></select></div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">pH <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional · only logged if you enter a value</span></label><input class="form-input" type="number" id="log-ph" placeholder="3.2 — typical healthy range 3.0–3.4" step="0.01" min="2.5" max="4.5"><div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.5;font-style:italic">Healthy mead pH during ferment: 3.0–3.4. Below 2.9 means yeast stress (raise pH with potassium carbonate). Above 3.5 risks contamination. Leave blank if you don\'t measure — pH never appears in charts or summaries until you log at least one value.<br><br>Test strips are only a rough ballpark (±0.3-0.5) — fine for a quick check, but a cheap digital meter reads to ~0.1 and is worth it if you\'re making a decision (like buffering) off the number. A meter drifts between uses though — recalibrate with fresh buffer solution before each session, not just once when it\'s new.</div></div>'
      +'<div class="form-group"></div></div>'
      +'<div class="form-group"><label class="form-label">Notes & Observations</label><textarea class="form-textarea" id="log-note" placeholder="Color, aroma, taste, clarity…"></textarea></div>'
      +'<button class="btn btn-primary" onclick="addLog(\''+b.id+'\')">Log Reading</button></div></div>'
      +'<div><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">FERMENTATION CHARTS</div></div>'
      +'<div class="chart-card"><div class="chart-card-title">📉 Gravity &amp; ABV  ·  <span style="color:var(--text3)">SG falls (left), ABV rises (right) · solid = readings, dashed = projection</span></div><div class="chart-wrap" style="height:240px"><canvas id="batch-gravity-chart"></canvas></div></div>'
      +(logs.filter(function(l){return l.gravity!=null;}).length>1?'<div class="chart-card" style="margin-top:12px"><div class="chart-card-title">📊 '+(appLang()==='nl'?'Gistingsanalyse':'Fermentation Analysis')+'  ·  <span style="color:var(--text3);font-size:11px">'+(appLang()==='nl'?'SG · temperatuur · daalsnelheid op één tijdas — zie hoe temperatuur de gisting stuurt':'SG · temperature · drop-rate on one timeline — see how temperature drives fermentation')+'</span></div><div class="chart-wrap" style="height:240px"><canvas id="batch-analysis-chart"></canvas></div></div>':'')
      +(function(){
        // Resolve which sensor to graph: prefer the batch's fermenter binding,
        // fall back to the global fermentation sensor, then to nothing (only
        // logged temps).
        var tStatus=getBatchStatus(b);
        var tBottled=(tStatus==='bottled'||tStatus==='complete');
        var sensorEntity,sensorLabel;
        if(tBottled){
          var tBot=APP.bottling[b.id]||{};
          var tHit=(tBot.cellarShelfId&&typeof findShelfById==='function')?findShelfById(tBot.cellarShelfId):null;
          sensorEntity=(tHit&&tHit.cabinet&&tHit.cabinet.tempSensorEntity)||APP.settings.cellarTempSensorEntity;
          sensorLabel=tHit&&tHit.cabinet&&tHit.cabinet.tempSensorEntity
            ?'storage · '+escHtml(tHit.cabinet.name||tHit.cabinet.model||'cabinet')
            :sensorEntity?'storage · from '+escHtml(sensorEntity):'';
        }else{
          var ferm=b.fermenterId?getFermenter(b.fermenterId):null;
          sensorEntity=(ferm&&ferm.tempSensorEntity)||APP.settings.tempSensorEntity;
          sensorLabel=ferm&&ferm.tempSensorEntity
            ?'from '+escHtml(ferm.tempSensorEntity)+' (bound to '+escHtml(ferm.name)+')'
            :sensorEntity?'from '+escHtml(sensorEntity)+' (global fallback)':'';
        }
        if(sensorEntity){
          return'<div class="chart-card" style="margin-top:12px"><div class="chart-card-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            +'<span>'+(tBottled?'🌡 Storage Temperature':'🌡 Temperature History')+'  ·  <span style="color:var(--text3);font-size:11px">'+sensorLabel+'</span></span>'
            +'<div style="display:inline-flex;gap:6px;margin-left:auto">'
            +(function(){var tr=window._batchTempRange||168;return[[24,'24h'],[168,'7d'],[720,'30d']].map(function(o){var a=o[0]===tr;return'<button class="btn btn-secondary btn-sm temp-range-btn" data-trange="'+o[0]+'" onclick="setBatchTempRange(\''+b.id+'\','+o[0]+')" style="padding:6px 12px;font-size:12px;min-width:48px'+(a?';background:rgba(232,196,106,0.18);color:var(--gold2);border-color:var(--gold)':'')+'">'+o[1]+'</button>';}).join('');}())
            +'</div></div>'
            +'<div class="chart-wrap" style="height:220px;position:relative"><canvas id="batch-temp-history-chart"></canvas>'
            +'<div id="batch-temp-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px;font-style:italic">Loading history…</div>'
            +'</div>'
            +'<div id="batch-temp-summary" style="font-size:11px;color:var(--text3);margin-top:6px;font-family:var(--font-mono);letter-spacing:1px;text-align:center"></div>'
            +'</div>';
        }
        // Per-log temperature is now folded into the unified Fermentation Analysis
        // overlay above (SG · temp · rate), so no separate temp-from-logs chart.
        return'';
      }())
      +'</div>'
      +'<div class="card"><div class="card-header"><div class="card-title">READING LOG</div></div>'
      +'<table class="data-table"><thead><tr><th>Date</th><th>SG</th><th>ABV</th><th>Temp</th>'+(anyPH?'<th>pH</th>':'')+'<th>Airlock</th><th>Notes</th><th></th></tr></thead><tbody>'+logRows+'</tbody></table>'
      +(revLogs.length>LOG_CAP?'<div style="text-align:center;margin-top:10px"><button class="btn btn-secondary btn-sm" onclick="toggleBatchLogAll()">'+(window._batchLogShowAll?'Show recent only':('Show all '+revLogs.length+' readings'))+'</button><div style="font-size:11px;color:var(--text3);margin-top:4px">'+(window._batchLogShowAll?('Showing all '+revLogs.length+' readings'):('Showing the latest '+LOG_CAP+' of '+revLogs.length))+'</div></div>':'')
      +'</div>'
      +'</div></div>';
  }

  if(activeTab==='additions'){
    tabContent=renderAdditionsTab(b);
  }

  if(activeTab==='coach'){
    // Brew Coach merged into the Advisor — one source of truth. The advisor view
    // folds in today's actions, upcoming steps and the meadwright's wisdom.
    tabContent=(typeof renderBatchAdvisor==='function')?renderBatchAdvisor(b):'';
  }

  if(activeTab==='tasting'){
    var tastings=APP.tastings[b.id]||[];
    var tastingRows=tastings.length?tastings.slice().reverse().map(function(t){
      var stars='';
      for(var i=1;i<=5;i++)stars+='<span style="color:'+(i<=t.rating?'var(--gold2)':'var(--border2)')+'">★</span>';
      return'<div class="tasting-card">'
        +'<div class="tasting-card-header"><div style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">'+fmtDate(t.date)+'</div>'
        +'<div>'+stars+' <button class="btn btn-danger btn-sm" style="margin-left:8px" onclick="deleteTasting(\''+b.id+'\',\''+t.id+'\')">✕</button></div></div>'
        +(t.wheel&&Object.values(t.wheel).some(function(v){return v>0;})?'<div style="display:flex;gap:14px;align-items:center;margin:8px 0;flex-wrap:wrap"><div style="width:160px;flex-shrink:0">'+getTastingWheelRadarHTML(t.wheel)+'</div><div style="flex:1;min-width:120px;font-size:11px;color:var(--text3);font-family:var(--font-mono);line-height:1.8">'+TASTING_AXES.filter(function(ax){return t.wheel[ax.key]>0;}).map(function(ax){return ax.label+': '+'●'.repeat(t.wheel[ax.key])+'<span style="color:var(--bg4)">'+'●'.repeat(5-t.wheel[ax.key])+'</span>';}).join('<br>')+'</div></div>':'')
        +(t.bjcp?renderBJCPBadge(t.bjcp):'')
        +(t.color?'<div style="font-size:13px;color:var(--text2);margin-bottom:4px"><strong style="color:var(--text3)">Color:</strong> '+escHtml(t.color)+'</div>':'')
        +(t.aroma?'<div style="font-size:13px;color:var(--text2);margin-bottom:4px"><strong style="color:var(--text3)">Aroma:</strong> '+escHtml(t.aroma)+'</div>':'')
        +(t.flavor?'<div style="font-size:13px;color:var(--text2);margin-bottom:4px"><strong style="color:var(--text3)">Flavor:</strong> '+escHtml(t.flavor)+'</div>':'')
        +(t.finish?'<div style="font-size:13px;color:var(--text2);margin-bottom:4px"><strong style="color:var(--text3)">Finish:</strong> '+escHtml(t.finish)+'</div>':'')
        +(t.note?'<div style="font-size:13px;color:var(--text2);margin-top:6px;font-style:italic">'+escHtml(t.note)+'</div>':'')
        +'</div>';
    }).join(''):'<div style="color:var(--text3);font-style:italic;font-size:13px;padding:20px 0;text-align:center">No tasting notes yet</div>';
    tabContent='<div class="grid-2">'
      +'<div><div class="card"><div class="card-header"><div class="card-title">NEW TASTING NOTE</div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="t-date" value="'+today()+'"></div>'
      +'<div class="form-group"><label class="form-label">Rating</label><div class="star-rating" id="t-stars">'
      +[1,2,3,4,5].map(function(i){return'<span class="star" onclick="setTastingStars('+i+')" id="t-star-'+i+'">★</span>';}).join('')
      +'</div><input type="hidden" id="t-rating" value="0"></div></div>'
      +'<div class="form-group"><label class="form-label">Color & Appearance</label><input class="form-input" id="t-color" placeholder="Deep ruby, crystal clear…"></div>'
      +'<div class="form-group"><label class="form-label">Aroma / Nose</label><input class="form-input" id="t-aroma" placeholder="Honey, floral, fruit notes…"></div>'
      +'<div class="form-group"><label class="form-label">Flavor / Palate</label><input class="form-input" id="t-flavor" placeholder="Sweetness, acidity, complexity…"></div>'
      +'<div class="form-group"><label class="form-label">Finish</label><input class="form-input" id="t-finish" placeholder="Long, dry, warming…"></div>'
      +'<div class="form-group"><label class="form-label">Tasting Wheel <span style="color:var(--text3);font-weight:400;font-size:12px">· tap dots to rate each axis 1-5</span></label><div id="tasting-wheel-container">'+renderTastingWheel(window._tastingWheel||{})+'</div></div>'
      +'<div class="form-group">'+renderBJCPScoresheet()+'</div>'
      +'<div class="form-group"><label class="form-label">Additional Notes</label><textarea class="form-textarea" id="t-note" placeholder="Pairing ideas, comparisons, thoughts…"></textarea></div>'
      +'<button class="btn btn-primary" onclick="addTasting(\''+b.id+'\')">Add Tasting</button></div></div>'
      +'<div><div class="card"><div class="card-header"><div class="card-title">TASTING JOURNAL</div>'+(tastings.length>=2?'<button class="btn btn-secondary btn-sm" onclick="openTastingCompareModal(\''+b.id+'\')">📊 Compare</button>':'')+'</div>'+tastingRows+'</div>'
      +renderTastingEvolution(tastings)
      +'</div>'
      +'</div>'
      +renderCompetitions(b);
  }

  if(activeTab==='photos'){
    tabContent=renderBatchPhotos(b);
  }

  if(activeTab==='bottle'){
    var bottling=APP.bottling[b.id]||{};
    var existCounts=bottling.countsAtBottling?_coerceLocations(bottling.countsAtBottling):{};
    var c500=existCounts[500]||0;
    var c750=existCounts[750]||(!bottling.countsAtBottling&&bottling.bottleCount?bottling.bottleCount:0); // legacy fallback
    // Detect custom size (anything beyond 500/750)
    var customSize=0,customQty=0;
    Object.keys(existCounts).forEach(function(s){if(s!=='500'&&s!=='750'){customSize=parseInt(s);customQty=existCounts[s];}});
    var btSig=(typeof mwBatchSignals==='function')?mwBatchSignals(b):null;
    var btStableWarning='';
    if(btSig&&!btSig.gravityConfirmedStable){
      btStableWarning=btSig.sparkling
        ?'<div style="margin-bottom:12px;padding:10px 12px;border-radius:var(--radius);border-left:3px solid var(--red2);background:rgba(176,58,46,0.1);font-size:12.5px;color:var(--text2);line-height:1.55"><strong style="color:var(--red2)">⚠ Not confirmed stable yet.</strong> No two logged readings 5+ days apart agree — this is a sparkling recipe, and priming on top of leftover fermentable sugar is the most common real cause of bottle bombs. Log one more reading a few days out before bottling if you can.</div>'
        :'<div style="margin-bottom:12px;padding:10px 12px;border-radius:var(--radius);border-left:3px solid #e0843c;background:rgba(224,132,60,0.08);font-size:12.5px;color:var(--text2);line-height:1.55"><strong style="color:#e0843c">⚠ Not confirmed stable yet.</strong> No two logged readings 5+ days apart agree yet. Bottling before fermentation genuinely finishes is the #1 real cause of bottle bombs, especially if you plan to backsweeten. Consider logging one more reading first.</div>';
    }
    tabContent='<div class="grid-2"><div><div class="card"><div class="card-header"><div class="card-title">BOTTLING RECORD</div><button class="btn btn-primary btn-sm" onclick="startBottlingWorkflow(\''+b.id+'\')" title="Guided step-by-step bottling">🍾 Guided Workflow</button></div>'
      +btStableWarning
      +'<div class="form-row"><div class="form-group"><label class="form-label">Bottle Date</label><input class="form-input" type="date" id="bt-date" value="'+(bottling.date||today())+'"></div>'
      +'<div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" type="number" id="bt-fg" step="0.001" placeholder="1.010" value="'+(bottling.fg||lastG||'')+'" oninput="updateBottlingSweetHint(\''+b.id+'\')"></div></div>'
      +'<div style="margin:6px 0 4px;font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">BOTTLE COUNTS BY SIZE</div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">🍶 500 ml bottles</label><input class="form-input" type="number" id="bt-count-500" min="0" placeholder="0" value="'+(c500||'')+'" oninput="updateBottlingTotalDisplay()"></div>'
      +'<div class="form-group"><label class="form-label">🍷 750 ml bottles</label><input class="form-input" type="number" id="bt-count-750" min="0" placeholder="0" value="'+(c750||'')+'" oninput="updateBottlingTotalDisplay()"></div></div>'
      +'<details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:12px;color:var(--text3);padding:4px 0">+ Custom bottle size</summary>'
      +'<div class="form-row" style="margin-top:6px"><div class="form-group"><label class="form-label">Custom size (ml)</label><input class="form-input" type="number" id="bt-count-custom-size" min="100" placeholder="e.g. 330, 1000" value="'+(customSize||'')+'" oninput="updateBottlingTotalDisplay()"></div>'
      +'<div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" id="bt-count-custom-qty" min="0" placeholder="0" value="'+(customQty||'')+'" oninput="updateBottlingTotalDisplay()"></div></div>'
      +'</details>'
      +'<div id="bt-total-display" style="padding:8px 12px;background:var(--bg4);border-left:3px solid var(--gold);border-radius:var(--radius);margin-bottom:14px;font-size:13px;color:var(--text2);font-family:var(--font-mono)"></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Final ABV</label><input class="form-input" type="number" id="bt-abv" step="0.1" placeholder="11.5" value="'+(bottling.abv||currentABV)+'"></div>'
      +'<div class="form-group"><label class="form-label">Sweetness</label><select class="form-select" id="bt-sweet">'
      +sweetnessOptionLabels(b.beverageType).map(function(o){return'<option'+(bottling.sweetness===o?' selected':'')+'>'+o+'</option>';}).join('')
      +'</select><div id="bt-sweet-hint" style="font-size:11px;color:var(--text3);margin-top:4px">'+_bottlingSweetHintHtml(bottling.fg||lastG,b.beverageType)+'</div>'
      +(btSig&&btSig.sparkling?'<button type="button" class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="openCarbonationCalcForBatch(\''+b.id+'\')">🍾 Priming Calculator</button>':'')
      +'</div>'
      +'<div class="form-group"><label class="form-label">Closure</label><select class="form-select" id="bt-closure">'
      +'<option value="crown"'+((bottling.closure||'crown')==='crown'?' selected':'')+'>⭕ Crown caps</option>'
      +'<option value="cork"'+(bottling.closure==='cork'?' selected':'')+'>🪵 Corks</option>'
      +'<option value="swing-top"'+(bottling.closure==='swing-top'?' selected':'')+'>🔒 Swing-top</option>'
      +'</select></div></div>'
      +(!bottling.date?'<div style="font-size:11.5px;color:var(--text3);font-style:italic;margin:-4px 0 12px">'+(appLang()==='nl'?'Flessen en '+(bottling.closure==='cork'?'kurken':bottling.closure==='swing-top'?'beugeldoppen':'doppen')+' worden afgetrokken van je bijgehouden voorraad.':'Bottles and '+(bottling.closure==='cork'?'corks':bottling.closure==='swing-top'?'swing-top seals':'caps')+' will be deducted from your tracked supplies.')+'</div>':'')
      +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="bt-notes" placeholder="Bottle type, cap/cork, storage location…">'+escHtml(bottling.notes||'')+'</textarea></div>'
      +'<button class="btn btn-primary" onclick="saveBottling(\''+b.id+'\')">'+(bottling.date?'Update':'Record')+' Bottling</button>'
      +(bottling.date?' <button class="btn btn-danger" onclick="clearBottling(\''+b.id+'\')">Clear</button>':'')
      +'<script>setTimeout(updateBottlingTotalDisplay,10);<\/script>'
      +'</div></div>'
      +'<div><div class="card"><div class="card-header"><div class="card-title">BOTTLE LABEL</div><div style="display:flex;gap:6px;flex-wrap:wrap">'
      +((recipe&&typeof studioHasBack==='function'&&studioHasBack(recipe.id))
        ?'<button class="btn btn-secondary btn-sm" onclick="downloadLabel(\''+b.id+'\',\'front\')" title="Save the front label as PNG">⬇ Front</button>'
          +'<button class="btn btn-secondary btn-sm" onclick="downloadLabel(\''+b.id+'\',\'back\')" title="Save the back label as PNG">⬇ Back</button>'
          +'<button class="btn btn-secondary btn-sm" onclick="downloadLabel(\''+b.id+'\',\'both\')" title="Save front and back as two separate PNG files">⬇ Both</button>'
        :'<button class="btn btn-secondary btn-sm" onclick="downloadLabel(\''+b.id+'\')" title="Save as PNG">⬇ Save</button>')
      +'<button class="btn btn-secondary btn-sm" onclick="printLabel(\''+b.id+'\')" title="Print">🖨 Print</button></div></div>'
      // Cap the preview at 420px so wide screens don\'t blow up the 900×900
      // square label image into a half-meter horse mosaic. Centered with margin
      // auto. The PNG/print outputs are unaffected — they render at full res.
      +'<div style="max-width:760px;margin:0 auto">'+renderBatchLabel(recipe?recipe.id:'r1',bottling.abv||currentABV,{batch:b,maxWidth:'420px'})+'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:12px;font-style:italic;text-align:center">'+(appLang()==='nl'?'Het alcoholpercentage zit verwerkt in de zeshoek. <strong>Opslaan</strong> downloadt een PNG; <strong>Afdrukken</strong> opent een printdialoog op flesetiket-formaat.':'ABV is baked into the hexagon. <strong>Save</strong> downloads a PNG; <strong>Print</strong> opens a print dialog sized for bottle labels.')+'</div>'
      +'</div>'
      +(bottling.date
        ?'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📦 STORAGE BOX LABEL</div><div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" onclick="downloadStorageLabel(\''+b.id+'\')" title="Save as high-res PNG">⬇ Save</button><button class="btn btn-secondary btn-sm" onclick="printStorageLabel(\''+b.id+'\')" title="Print at 15cm × 10cm">🖨 Print</button></div></div>'
        // Storage label is 3:2 landscape — let it fill the card up to 560px wide
        // and scale the embedded SVG to fit. Without this the inline SVG renders
        // at its intrinsic viewBox dimensions (1500×1000) which overflows on
        // wide screens.
        +'<div style="max-width:560px;margin:0 auto;background:#faf3e0;padding:8px;border-radius:var(--radius);overflow:hidden"><div style="width:100%;line-height:0">'+renderStorageLabelSVG(b).replace('<svg ','<svg style="width:100%;height:auto;display:block" ')+'</div></div>'
        +'<div style="font-size:12px;color:var(--text3);margin-top:12px;font-style:italic;line-height:1.55">'+(appLang()==='nl'?'Plak dit op de zijkant van je rijpings-opslagdoos voor snelle herkenning in de kelder. Bevat partijnaam, stijl, alcoholpercentage, drinkvenster (klaar / hoogtepunt / drink-voor), flesinhoud, en een QR-code die terugverwijst naar deze partij. Print op 15×10 cm.':'Stick this on the side of your aging-storage box for quick identification across the cellar. Includes batch name, style, ABV, drinking window (ready / peak / drink-by), bottle contents, and a QR code linking back to this batch. Prints at 15×10 cm.')+'</div>'
        +'</div>'
        +renderTimeCapsulesCard(b)
        +renderCellarSublocationCard(b)
        :'')
      +'</div></div>';
  }

  return'<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" onclick="showView(\'batches\')">← Cellar</button>'
    +'<div class="page-title" style="margin-bottom:0;color:'+color+'">'+escHtml(b.name)+'</div>'
    +(b.serial?'<span title="Batch serial — unique per year. Stable from creation; safe to reference on labels and storage boxes." style="font-family:var(--font-mono);font-size:11px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:3px 9px;border-radius:10px;letter-spacing:0.5px">#'+escHtml(b.serial)+'</span>':'')
    +statusBadge(status)
    +fermentationBadge(b)
    +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="printBatchCertificate(\''+b.id+'\')" title="Print a one-page certificate for this batch">📜 Certificate</button>':'')
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="openPermanentRecord(\''+b.id+'\')" title="Print or save the complete batch journal — every log, addition, tasting, cost, signed off with brewer name">📜 Complete Record</button>':'')
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="openGiftCardModal(\''+b.id+'\')" title="Print a small gift card to accompany a gifted bottle">🎁 Gift Card</button>':'')
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="copyShareLink(\''+b.id+'\')" title="Copy a public share link (unguessable token, resolves live data — nothing is embedded in the URL)">🔗 Share Link</button>':'')
    +((status==='bottled'||status==='complete')&&typeof hasShareToken==='function'&&hasShareToken(b.id)?'<button class="btn btn-secondary btn-sm" onclick="revokeShareLink(\''+b.id+'\')" title="Revoke the share link — the existing URL stops working immediately">🔗✕ Revoke Link</button>':'')
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="saveAsTemplate(\''+b.id+'\')" title="Save this batch\'s config as a reusable template">💾 Save Template</button>':'')
    +(status!=='bottled'&&status!=='complete'?'<button class="btn btn-secondary btn-sm" onclick="openRackModal(\''+b.id+'\')" title="Rack this batch to a different vessel">🔁 Rack to Vessel</button>':'')
    +(status!=='bottled'&&status!=='complete'?'<button class="btn btn-secondary btn-sm" onclick="showStuckFermDiagnosis(\''+b.id+'\')" title="Diagnose stalled fermentation">🔬 Diagnose</button>':'')
    +(status!=='bottled'&&status!=='complete'?'<button class="btn btn-secondary btn-sm" onclick="printFermenterCard(\''+b.id+'\')" title="Print a card to label/stick on the fermenter">🏷 Fermenter Card</button>':'')
    +((status==='bottled'||status==='complete')?'<button class="btn btn-secondary btn-sm" onclick="brewAgain(\''+b.id+'\')" title="Create a new batch from this recipe">🔄 Brew Again</button>':'')
    +(b.failed
      ?'<button class="btn btn-secondary btn-sm" onclick="openFailureModal(\''+b.id+'\')" title="Edit the failure postmortem notes">✏ Edit Postmortem</button>'
        +'<button class="btn btn-secondary btn-sm" onclick="unmarkBatchFailed(\''+b.id+'\')" title="Restore this batch to its previous active state">↺ Unfail</button>'
      :'<button class="btn btn-secondary btn-sm" onclick="openFailureModal(\''+b.id+'\')" title="Record a postmortem for a dumped or failed batch — preserves the lesson without losing the data" style="color:var(--gold2);border-color:var(--gold)">⚰ Mark as Failed</button>')
    +'<button class="btn btn-danger btn-sm" onclick="deleteBatch(\''+b.id+'\')">Delete</button></div></div>'
    +(b.failed?renderFailureBanner(b):'')
    +'<div class="brand-bar" style="background:'+color+'"></div>'
    +'<div class="page-subtitle">'+fmtDuration(d)+' · '+(recipe?recipe.style:(b.style||'Custom'))+' · '+(currentABV!=='—'?'Est. '+currentABV+'% ABV':'OG '+(b.og||'?'))+'</div>'
    +'<div class="tabs">'
    +'<div class="tab '+(activeTab==='overview'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'overview\')">Overview</div>'
    +'<div class="tab '+(activeTab==='log'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'log\')">Gravity Log</div>'
    +'<div class="tab '+(activeTab==='additions'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'additions\')">Additions'+(getOverdueAdditions().filter(function(x){return x.batch.id===b.id;}).length?' <span style="background:var(--red);color:#fff;font-size:9px;padding:1px 5px;border-radius:6px;margin-left:4px">!</span>':'')+'</div>'
    +'<div class="tab '+(activeTab==='coach'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'coach\')">'+(appLang()==='nl'?'⭐ Adviseur':'⭐ Advisor')+'</div>'
    +'<div class="tab '+(activeTab==='tasting'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'tasting\')">Tasting Notes</div>'
    +'<div class="tab '+(activeTab==='photos'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'photos\')">Photos'+((APP.photos[b.id]||[]).length?' <span style="background:var(--bg4);color:var(--text3);font-size:9px;padding:1px 5px;border-radius:6px;margin-left:2px">'+(APP.photos[b.id]||[]).length+'</span>':'')+'</div>'
    +'<div class="tab '+(activeTab==='bottle'?'active':'')+'" onclick="setBatchTab(\''+b.id+'\',\'bottle\')">Bottling</div>'
    +'</div>'+tabContent;
}

// Blend lineage badge for the batch Overview (shown when batch.blendOf is set).
function _blendLineageHtml(b){
  if(!b||!Array.isArray(b.blendOf)||!b.blendOf.length)return '';
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var parts=b.blendOf.map(function(c){
    var pct=Math.round((c.fraction||0)*100)+'%';
    if(c.batchId==='__water')return 'water '+pct;
    var src=getBatch(c.batchId);
    var nm=src?src.name:(nl?'onbekend':'unknown');
    return '<span style="cursor:pointer;color:var(--gold2)" onclick="showView(\'batch\',\''+c.batchId+'\')">'+escHtml(nm)+'</span> '+pct;
  }).join(' + ');
  return '<div class="info-box" style="margin-bottom:16px;border-left-color:var(--gold2)"><div style="font-size:13px;color:var(--text2)">🥂 '+(nl?'Blend van':'Blend of')+': '+parts+'</div></div>';
}

// ==================== STEP SCHEDULE EDITOR ====================
// Per-batch custom step schedule (batch.customSteps), edited in a modal and
// reusable as named templates (APP.stepTemplates). getEffectiveSteps honors
// batch.customSteps when present. Reorder = sort by day on save (no drag-drop).
// ponytail: native prompt() for the template name; no custom name dialog.
function _stepEditorRow(s){
  s=s||{day:0,title:'',desc:''};
  return '<div data-step-row style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;padding:8px;background:var(--bg3);border-radius:var(--radius)">'
    +'<input class="form-input" data-step-day type="number" value="'+(s.day!=null?s.day:0)+'" style="width:60px;flex:0 0 auto" title="Day">'
    +'<div style="flex:1;min-width:0"><input class="form-input" data-step-title value="'+escHtml(s.title||'')+'" placeholder="Title" style="margin-bottom:6px">'
    +'<textarea class="form-textarea" data-step-desc placeholder="Description" style="min-height:46px">'+escHtml(s.desc||'')+'</textarea></div>'
    +'<button class="btn btn-danger btn-sm" onclick="this.closest(\'[data-step-row]\').remove()" style="flex:0 0 auto">✕</button>'
    +'</div>';
}
function _readStepEditorRows(){
  return Array.prototype.map.call(document.querySelectorAll('#step-editor-rows [data-step-row]'),function(row){
    return {day:parseInt(row.querySelector('[data-step-day]').value,10)||0,
      title:row.querySelector('[data-step-title]').value.trim(),
      desc:row.querySelector('[data-step-desc]').value.trim()};
  }).filter(function(s){return s.title||s.desc;}).sort(function(a,b){return a.day-b.day;});
}
function openStepEditor(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var recipe=getRecipe(b.recipeId);
  var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):((recipe&&recipe.steps)||[]);
  var custom=Array.isArray(b.customSteps)&&b.customSteps.length;
  var tpls=APP.stepTemplates||[];
  var tplPicker=tpls.length?'<div style="margin-bottom:10px"><select class="form-select" onchange="applyStepTemplate(\''+b.id+'\',this.value)"><option value="">'+(nl?'Sjabloon laden…':'Load template…')+'</option>'+tpls.map(function(t){return '<option value="'+t.id+'">'+escHtml(t.name)+' ('+((t.steps||[]).length)+')</option>';}).join('')+'</select></div>':'';
  closeModal();
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:700px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">✎ '+(nl?'Stappenschema bewerken':'Edit step schedule')+'</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">'+(nl?'Pas dagen, titels en omschrijvingen aan. Een opgeslagen schema overschrijft het recept voor déze partij.':'Adjust days, titles and descriptions. A saved schedule overrides the recipe for this batch only.')+(custom?'':' '+(nl?'(Begint vanaf het recept.)':'(Starting from the recipe.)'))+'</div>'
    +tplPicker
    +'<div id="step-editor-rows" style="flex:1;overflow-y:auto;min-height:120px">'+steps.map(_stepEditorRow).join('')+'</div>'
    +'<button class="btn btn-secondary btn-sm" style="margin-top:8px;align-self:flex-start" onclick="stepEditorAddRow()">＋ '+(nl?'Stap toevoegen':'Add step')+'</button>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between">'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +(custom?'<button class="btn btn-secondary btn-sm" onclick="resetBatchSteps(\''+b.id+'\')">↺ '+(nl?'Terug naar recept':'Reset to recipe')+'</button>':'')
        +'<button class="btn btn-secondary btn-sm" onclick="saveStepTemplate(\''+b.id+'\')">💾 '+(nl?'Als sjabloon':'Save as template')+'</button>'
      +'</div>'
      +'<div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="closeModal()">'+(nl?'Annuleren':'Cancel')+'</button><button class="btn btn-primary" onclick="saveStepEditor(\''+b.id+'\')">'+(nl?'Opslaan':'Save')+'</button></div>'
    +'</div></div></div>');
}
function stepEditorAddRow(){
  var c=document.getElementById('step-editor-rows');
  if(c)c.insertAdjacentHTML('beforeend',_stepEditorRow({day:0,title:'',desc:''}));
}
function saveStepEditor(batchId){
  var b=getBatch(batchId);if(!b)return;
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var steps=_readStepEditorRows();
  if(!steps.length){toast(nl?'⚠ Geen stappen om op te slaan':'⚠ No steps to save');return;}
  b.customSteps=steps;
  if(typeof saveData==='function')saveData();
  closeModal();renderMain();
  toast(nl?'✦ Schema opgeslagen':'✦ Schedule saved');
}
function resetBatchSteps(batchId){
  var b=getBatch(batchId);if(!b)return;
  delete b.customSteps;
  if(typeof saveData==='function')saveData();
  closeModal();renderMain();
  toast((typeof appLang==='function'&&appLang()==='nl')?'↺ Terug naar recept':'↺ Reset to recipe schedule');
}
function saveStepTemplate(batchId){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var steps=_readStepEditorRows();
  if(!steps.length){toast(nl?'⚠ Geen stappen':'⚠ No steps');return;}
  var name=prompt(nl?'Naam voor dit sjabloon:':'Name for this step template:');
  if(!name||!name.trim())return;
  if(!APP.stepTemplates)APP.stepTemplates=[];
  APP.stepTemplates.push({id:genId(),name:name.trim(),steps:steps});
  if(typeof saveData==='function')saveData();
  toast('💾 '+(nl?'Sjabloon opgeslagen':'Template saved'));
}
function applyStepTemplate(batchId,tplId){
  if(!tplId)return;
  var t=(APP.stepTemplates||[]).find(function(x){return x.id===tplId;});if(!t)return;
  var c=document.getElementById('step-editor-rows');
  if(c)c.innerHTML=(t.steps||[]).map(_stepEditorRow).join('');  // load for review; Save commits it
}

// ==================== COMPETITIONS / AWARDS ====================
// Per-batch show entries: competition, category, score, and award. Stored in
// APP.competitions[batchId][]. Surfaced on the Tasting tab + the Insights
// trophy shelf.
function _compAwards(){return [
  {k:'bos',l:'Best of Show',icon:'🏆',c:'#e8c46a',rank:0},
  {k:'gold',l:'Gold',icon:'🥇',c:'#d4af37',rank:1},
  {k:'silver',l:'Silver',icon:'🥈',c:'#c0c4c9',rank:2},
  {k:'bronze',l:'Bronze',icon:'🥉',c:'#cd7f32',rank:3},
  {k:'hm',l:'Honorable Mention',icon:'🎗',c:'var(--gold2)',rank:4},
  {k:'placement',l:'Placement',icon:'🎯',c:'var(--text2)',rank:5},
  {k:'entered',l:'Entered',icon:'•',c:'var(--text3)',rank:6}
];}
function _compAwardMeta(k){var a=_compAwards();for(var i=0;i<a.length;i++)if(a[i].k===k)return a[i];return {k:k,l:k||'Entered',icon:'•',c:'var(--text3)',rank:9};}
function renderCompetitions(b){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var isCider=(b.beverageType||'mead')==='cider';
  var list=((APP.competitions&&APP.competitions[b.id])||[]).slice().sort(function(a,c){return(c.date||'').localeCompare(a.date||'');});
  var awardOpts=_compAwards().map(function(a){return '<option value="'+a.k+'">'+a.icon+' '+a.l+'</option>';}).join('');
  var rows=list.length?list.map(function(c){
    var am=_compAwardMeta(c.award);
    var score=(c.score!==''&&c.score!=null)?(c.score+(c.maxScore?'/'+c.maxScore:'')):'';
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-left:3px solid '+am.c+';background:var(--bg3);border-radius:var(--radius);margin-bottom:8px">'
      +'<div style="font-size:20px;line-height:1;flex-shrink:0">'+am.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:var(--text)">'+escHtml(c.competition||'')+(c.category?' <span style="font-size:11px;color:var(--text3)">· '+escHtml(c.category)+'</span>':'')+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10.5px;color:'+am.c+';letter-spacing:0.5px;margin-top:2px">'+am.l.toUpperCase()+(score?' · '+escHtml(score):'')+(c.date?' · '+fmtDate(c.date):'')+'</div>'
        +(c.notes?'<div style="font-size:12px;color:var(--text2);font-style:italic;margin-top:4px">'+escHtml(c.notes)+'</div>':'')
      +'</div>'
      +'<button class="btn btn-danger btn-sm" onclick="deleteCompetition(\''+b.id+'\',\''+c.id+'\')">✕</button>'
    +'</div>';
  }).join(''):'<div style="color:var(--text3);font-style:italic;font-size:13px;padding:12px 0">'+(nl?'Nog geen wedstrijdinzendingen.':'No competition entries yet.')+'</div>';
  return '<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">'+(nl?'🏆 WEDSTRIJDEN &amp; PRIJZEN':'🏆 COMPETITIONS &amp; AWARDS')+'</div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(nl?'Wedstrijd':'Competition')+'</label><input class="form-input" id="comp-name" placeholder="'+(nl?'bv. NHC, lokale show':'e.g. NHC, local show')+'"></div>'
    +'<div class="form-group"><label class="form-label">'+(nl?'Categorie':'Category')+'</label><input class="form-input" id="comp-cat" placeholder="'+(isCider?(nl?'bv. C1A Gewone cider':'e.g. C1A Common Cider'):(nl?'bv. M1A Droge mede':'e.g. M1A Dry Mead'))+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(nl?'Datum':'Date')+'</label><input class="form-input" type="date" id="comp-date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label">'+(nl?'Resultaat':'Award')+'</label><select class="form-select" id="comp-award">'+awardOpts+'</select></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">'+(nl?'Score':'Score')+'</label><input class="form-input" type="number" id="comp-score" step="0.5" placeholder="38"></div>'
    +'<div class="form-group"><label class="form-label">'+(nl?'Max score':'Max score')+'</label><input class="form-input" type="number" id="comp-max" placeholder="50"></div></div>'
    +'<div class="form-group"><label class="form-label">'+(nl?'Notities van de jury':'Judge notes')+'</label><textarea class="form-textarea" id="comp-notes" placeholder="'+(nl?'Feedback, opmerkingen…':'Feedback, remarks…')+'"></textarea></div>'
    +'<button class="btn btn-primary" onclick="addCompetition(\''+b.id+'\')">'+(nl?'Inzending toevoegen':'Add Entry')+'</button>'
    +'<div style="margin-top:14px">'+rows+'</div>'
    +'</div>';
}
function addCompetition(bid){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  function v(id){var e=document.getElementById(id);return e?String(e.value).trim():'';}
  var comp=v('comp-name');
  if(!comp){toast(nl?'⚠ Vul een wedstrijdnaam in':'⚠ Enter a competition name');return;}
  if(!APP.competitions)APP.competitions={};
  if(!APP.competitions[bid])APP.competitions[bid]=[];
  APP.competitions[bid].push({id:genId(),date:v('comp-date')||today(),competition:comp,category:v('comp-cat'),
    score:v('comp-score'),maxScore:v('comp-max'),award:v('comp-award')||'entered',notes:v('comp-notes')});
  if(typeof saveData==='function')saveData();
  renderMain();
  toast(nl?'🏆 Inzending toegevoegd':'🏆 Entry added');
}
function deleteCompetition(bid,id){
  if(APP.competitions&&APP.competitions[bid])APP.competitions[bid]=APP.competitions[bid].filter(function(c){return c.id!==id;});
  if(typeof saveData==='function')saveData();
  renderMain();
}
function setBatchTab(id,tab){
  if(!window._batchTabs)window._batchTabs={};
  window._batchTabs[id]=tab;
  window._batchLogShowAll=false;  // reading log starts capped each time you enter the tab
  renderMain();
}
function toggleBatchLogAll(){window._batchLogShowAll=!window._batchLogShowAll;renderMain();}

// Evenly thin a long reading series to ~max points (keeping the first and last)
// so a batch with thousands of readings still charts fast and legibly.
function _downsampleLogs(arr,max){
  max=max||200;
  if(!arr||arr.length<=max)return arr||[];
  var n=arr.length,step=(n-1)/(max-1),out=[];
  for(var i=0;i<max;i++)out.push(arr[Math.round(i*step)]);
  out[out.length-1]=arr[n-1];
  return out;
}

function initBatchCharts(){
  setTimeout(function(){
    var b=getBatch(currentBatchId);
    if(!b)return;
    var logs=_downsampleLogs(getBatchLogs(b.id),200);
    var color=getBatchColor(b);
    var og=b.og||1.095;
    var recipe=getRecipe(b.recipeId);
    // Yeast-aware target (same source as the Advisor) — a flat recipe.fgTarget
    // can sit well below what this yeast/honey will actually reach, which used
    // to draw a dashed "further decline expected" line past a batch that had
    // already genuinely finished.
    var yt=(og&&b.yeast&&typeof mwYeastTargets==='function')?mwYeastTargets(og,b.yeast):null;
    var fgTarget=(yt&&yt.fg)||(recipe&&recipe.fgTarget)||1.010;
    var fermentDays=(recipe&&recipe.fermentDays)||42;
    // Build aligned data series including OG starting point
    var labels=['Day 0'].concat(logs.map(function(l){return'D'+daysSince(b.startDate)-daysSince(b.startDate)+' · '+fmtDateShort(l.date);}));
    // Simpler labels
    labels=['Start'].concat(logs.map(function(l){return fmtDateShort(l.date);}));
    var gravityData=[og].concat(logs.map(function(l){return l.gravity;}));
    var abvData=[0].concat(logs.map(function(l){return l.gravity?parseFloat(calcABV(og,l.gravity)):null;}));
    // ===== Trajectory projection =====
    // Exponential decay model: SG(t) = FG + (OG-FG) * exp(-k*t)
    // Calibrate k from existing readings if possible, else default to fermentDays-based
    var projLabels=[],projGrav=[],projAbv=[];
    var startDate=new Date(b.startDate);
    // Only project while there's still sugar to ferment. Once the last reading
    // is at/below the target FG the exponential model can't be calibrated from
    // it (and would draw a bogus dashed spike), so we just show the readings.
    if(logs.length>=1&&(logs[logs.length-1].gravity-fgTarget)>0.003){
      var lastG=logs[logs.length-1].gravity;
      var lastDay=Math.max(1,daysSince(logs[logs.length-1].date)+daysSince(b.startDate)-daysSince(logs[logs.length-1].date));
      // Estimate k from last reading: if (lastG - fgTarget) > 0 then k = ln((og-fg)/(lastG-fg))/day
      var dayOfLast=Math.max(1,(new Date(logs[logs.length-1].date)-startDate)/86400000);
      var ratio=(og-fgTarget)>0&&(lastG-fgTarget)>0?(og-fgTarget)/(lastG-fgTarget):1.5;
      var k=Math.log(Math.max(1.01,ratio))/dayOfLast;
      if(!isFinite(k)||k<=0)k=Math.log(20)/fermentDays; // default
      // Project from last reading forward to fermentDays
      var lastDayInt=Math.ceil(dayOfLast);
      for(var d=lastDayInt+1;d<=Math.max(fermentDays,lastDayInt+14);d+=Math.max(2,Math.floor((Math.max(fermentDays,lastDayInt+14)-lastDayInt)/8))){
        var projDate=new Date(startDate.getTime()+d*86400000);
        var sg=fgTarget+(og-fgTarget)*Math.exp(-k*d);
        projLabels.push(fmtDateShort(projDate));
        projGrav.push(parseFloat(sg.toFixed(4)));
        projAbv.push(parseFloat(calcABV(og,sg)));
      }
    }
    // Stitch labels for projection: append after the existing labels
    var allLabels=labels.concat(projLabels);
    var gravProjFull=Array(labels.length).fill(null);
    if(projGrav.length){gravProjFull[labels.length-1]=gravityData[gravityData.length-1];gravProjFull=gravProjFull.concat(projGrav);}
    var abvProjFull=Array(labels.length).fill(null);
    if(projAbv.length){abvProjFull[labels.length-1]=abvData[abvData.length-1];abvProjFull=abvProjFull.concat(projAbv);}
    // Pad readings arrays to match
    var gravFull=gravityData.concat(Array(projGrav.length).fill(null));
    var abvFull=abvData.concat(Array(projAbv.length).fill(null));

    var gctx=document.getElementById('batch-gravity-chart');
    if(gctx){
      // Gravity (left axis) and estimated ABV (right axis) on one chart, so the
      // ABV rise as gravity falls is visible at a glance. Both carry the dashed
      // projection forward to expected finish.
      makeChart(gctx,{
        type:'line',
        data:{labels:allLabels,datasets:[
          {label:'Gravity',data:gravFull,borderColor:color,backgroundColor:color+'22',tension:0.35,fill:true,pointRadius:4,pointBackgroundColor:color,pointBorderColor:'#fff',pointBorderWidth:1.5,spanGaps:false,yAxisID:'y'},
          {label:'Gravity (proj.)',data:gravProjFull,borderColor:color+'88',borderDash:[5,4],tension:0.2,fill:false,pointRadius:0,spanGaps:true,borderWidth:1.5,yAxisID:'y'},
          {label:'ABV %',data:abvFull,borderColor:'#6ab87a',backgroundColor:'transparent',tension:0.35,fill:false,pointRadius:4,pointBackgroundColor:'#6ab87a',pointBorderColor:'#fff',pointBorderWidth:1.5,spanGaps:false,yAxisID:'y1'},
          {label:'ABV % (proj.)',data:abvProjFull,borderColor:'#6ab87a88',borderDash:[5,4],tension:0.2,fill:false,pointRadius:0,spanGaps:true,borderWidth:1.5,yAxisID:'y1'}
        ]},
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
          plugins:{legend:{display:true,labels:{color:'#8a7d66',font:{size:10},boxWidth:14,filter:function(it){return!/proj/.test(it.text);}}},
            tooltip:{callbacks:{label:function(c){if(c.parsed.y==null)return null;return(c.dataset.label||'')+': '+(c.dataset.yAxisID==='y1'?c.parsed.y.toFixed(2)+'%':c.parsed.y.toFixed(3));}}}},
          scales:{x:{ticks:{color:'#6a5f50',font:{size:10},maxRotation:30,autoSkip:true},grid:{color:'#2a2a35'}},
            y:{position:'left',title:{display:true,text:'Gravity (SG)',color:'#6a5f50',font:{size:9}},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(3);}},grid:{color:'#2a2a35'}},
            y1:{position:'right',beginAtZero:true,title:{display:true,text:'ABV %',color:'#6a9f70',font:{size:9}},ticks:{color:'#6a9f70',font:{size:10},callback:function(v){return v.toFixed(0)+'%';}},grid:{drawOnChartArea:false}}}}
      });
    }
    // ===== Fermentation Analysis overlay: SG · temperature · drop-rate =====
    // One timeline so correlations are visible (e.g. "temp rose 0.8°C →
    // fermentation accelerated"). Rate = SG points dropped per day between
    // consecutive readings, drawn as faint bars on a hidden axis.
    var actx=document.getElementById('batch-analysis-chart');
    if(actx){
      var nlA=(typeof appLang==='function'&&appLang()==='nl');
      var aRead=(getBatchLogs(b.id)).filter(function(l){return l.gravity!=null;}).slice()
        .sort(function(x,y){return(x.date||'').localeCompare(y.date||'');});
      aRead=_downsampleLogs(aRead,200);
      if(aRead.length>1){
        var aLabels=aRead.map(function(l){return fmtDateShort(l.date);});
        var aSG=aRead.map(function(l){return l.gravity;});
        var aTemp=aRead.map(function(l){return l.temp!=null&&l.temp!==''?parseFloat(l.temp):null;});
        var aRate=aRead.map(function(l,i){if(i===0)return null;var dt=(new Date(l.date).getTime()-new Date(aRead[i-1].date).getTime())/86400000;if(dt<=0)return null;return parseFloat((((aRead[i-1].gravity-l.gravity)/dt)*1000).toFixed(1));});
        var hasTemp=aTemp.some(function(v){return v!=null;});
        var ds=[
          {label:'SG',data:aSG,borderColor:color,backgroundColor:'transparent',tension:0.35,fill:false,pointRadius:3,pointBackgroundColor:color,yAxisID:'y',order:1},
          {label:nlA?'Daalsnelheid (pt/d)':'Drop rate (pt/d)',type:'bar',data:aRate,backgroundColor:'#6ab87a55',borderColor:'#6ab87a',borderWidth:1,yAxisID:'y2',order:3}
        ];
        if(hasTemp)ds.splice(1,0,{label:nlA?'Temperatuur (°C)':'Temperature (°C)',data:aTemp,borderColor:'#e8a020',backgroundColor:'transparent',tension:0.35,fill:false,pointRadius:3,pointBackgroundColor:'#e8a020',spanGaps:true,yAxisID:'y1',order:2});
        makeChart(actx,{
          type:'line',
          data:{labels:aLabels,datasets:ds},
          options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
            plugins:{legend:{display:true,labels:{color:'#8a7d66',font:{size:10},boxWidth:14}},
              tooltip:{callbacks:{label:function(c){if(c.parsed.y==null)return null;var id=c.dataset.yAxisID;if(id==='y')return 'SG: '+c.parsed.y.toFixed(3);if(id==='y1')return (nlA?'Temp: ':'Temp: ')+c.parsed.y.toFixed(1)+'°C';return (nlA?'Snelheid: ':'Rate: ')+c.parsed.y.toFixed(1)+' pt/d';}}}},
            scales:{x:{ticks:{color:'#6a5f50',font:{size:10},maxRotation:30,autoSkip:true},grid:{color:'#2a2a35'}},
              y:{position:'left',title:{display:true,text:'SG',color:'#6a5f50',font:{size:9}},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(3);}},grid:{color:'#2a2a35'}},
              y1:{position:'right',title:{display:true,text:'°C',color:'#c98a2c',font:{size:9}},ticks:{color:'#c98a2c',font:{size:10}},grid:{drawOnChartArea:false}},
              y2:{position:'right',display:false,beginAtZero:true,grid:{drawOnChartArea:false}}}}
        });
      }
    }
    // ===== HA Temperature history (from sensor) =====
    if(document.getElementById('batch-temp-history-chart')){
      var bForTemp=getBatch(currentBatchId);
      var sForTemp=bForTemp?getBatchStatus(bForTemp):'';
      var hasSensor;
      if(sForTemp==='bottled'||sForTemp==='complete'){
        var botFT=APP.bottling[currentBatchId]||{};
        var hitFT=(botFT.cellarShelfId&&typeof findShelfById==='function')?findShelfById(botFT.cellarShelfId):null;
        hasSensor=(hitFT&&hitFT.cabinet&&hitFT.cabinet.tempSensorEntity)||APP.settings.cellarTempSensorEntity;
      }else{
        var fermForTemp=bForTemp&&bForTemp.fermenterId?getFermenter(bForTemp.fermenterId):null;
        hasSensor=(fermForTemp&&fermForTemp.tempSensorEntity)||APP.settings.tempSensorEntity;
      }
      if(hasSensor)renderTempHistoryChart('batch-temp-history-chart',currentBatchId);
    }
  },100);
}

// ==================== TASK / COACH HELPERS ====================
function getTodayTasks(){
  var tasks=[];
  // Brewing tasks: surface only steps that are due TODAY or OVERDUE
  // (incomplete steps from earlier days). Future steps belong on the Calendar
  // and the Coach view — never on the dashboard, which is for actionable
  // items right now.
  APP.batches.forEach(function(b){
    var s=getBatchStatus(b);
    // Skip bottled, complete, and failed — failed batches have no remaining
    // brew-day steps to do (the mead is gone, the lesson is learned).
    if(s==='bottled'||s==='complete'||s==='failed')return;
    var recipe=getRecipe(b.recipeId);
    if(!recipe)return;
    var d=daysSince(b.startDate);
    var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):recipe.steps;
    steps.forEach(function(s){
      var daysFromDue=d-s.day; // 0 = today, >0 = overdue, <0 = future
      if(daysFromDue<0)return; // skip future tasks entirely
      var id=b.id+'-step-'+s.day;
      var done=(typeof isTaskDone==='function')?isTaskDone(id):false;
      // Today's tasks always show; overdue tasks only show if not done yet.
      // Once you check yesterday's overdue task off, it disappears from the
      // dashboard rather than lingering forever.
      if(daysFromDue>0&&done)return;
      tasks.push({
        id:id,batch:b.name,title:s.title,desc:s.desc,day:s.day,batchId:b.id,
        daysFromDue:daysFromDue,
        isDue:daysFromDue===0,
        isOverdue:daysFromDue>0
      });
    });
  });
  // Drinking-window tasks: these target a specific milestone day but have a
  // built-in lookahead window (e.g. "around peak" = peak±7d). All of them are
  // effectively "today" from a UX perspective so they get isDue=true.
  getDrinkingTasks().forEach(function(t){
    t.isDue=true;
    t.isOverdue=false;
    t.daysFromDue=0;
    tasks.push(t);
  });
  return tasks;
}

// Returns active "drink this" tasks for bottled batches. Surfaces three
// kinds of milestones, with a small lookahead window so a task appears for
// a few days around the actual milestone:
//   - 'enters drinking window'  — today is between (minAge-2) and (minAge+5)
//   - 'reaches peak window'     — today is between (peak-7) and (peak+7)
//   - 'approaching max age'     — today is between (max-30) and (max-15)
// Tasks suppress themselves when there are 0 bottles left on hand.
function getDrinkingTasks(){
  var tasks=[];
  if(!APP.batches||!APP.bottling)return tasks;
  APP.batches.forEach(function(b){
    if(b.failed)return; // dumped batches have no drinking-window milestones
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var recipe=getRecipe(b.recipeId);
    if(!recipe)return;
    if(typeof bottlesOnHand==='function'&&bottlesOnHand(bot)<=0)return;
    var aged=daysSince(bot.date);
    var minD=recipe.minAgeDays||recipe.minDays||30;
    var peakD=recipe.peakAgeDays||recipe.peakDays||(minD*3);
    var maxD=recipe.maxAgeDays||recipe.maxDays||(peakD*2);
    var color=getBatchColor(b);
    // Entering window (one-time near minAge)
    if(aged>=minD-2&&aged<=minD+5){
      tasks.push({
        id:b.id+'-drink-ready-'+minD,batch:b.name,title:'Ready to drink — first window',
        desc:'After '+minD+' days of aging, this batch is now in its drinkable window. Pull one bottle and log a tasting to track how it\'s developed.',
        day:minD,batchId:b.id,kind:'drinking',color:color
      });
    }
    // Hits peak (around peakAge)
    if(aged>=peakD-7&&aged<=peakD+7){
      tasks.push({
        id:b.id+'-drink-peak-'+peakD,batch:b.name,title:'Peak drinking window',
        desc:'This batch is at its predicted peak right now ('+peakD+' days from bottling). The flavor profile should be at its most integrated. Drink and enjoy.',
        day:peakD,batchId:b.id,kind:'drinking',color:color
      });
    }
    // Approaching max (15-30 days before maxAge)
    if(aged>=maxD-30&&aged<=maxD-15){
      tasks.push({
        id:b.id+'-drink-max-'+maxD,batch:b.name,title:'Approaching max age — drink soon',
        desc:'Past peak; the flavor will start mellowing further or oxidizing within '+(maxD-aged)+' days. Time to clear the remaining bottles.',
        day:maxD,batchId:b.id,kind:'drinking',color:color
      });
    }
  });
  return tasks;
}

function getTasksForBatch(b){
  var recipe=getRecipe(b.recipeId);
  if(!recipe)return[];
  var d=daysSince(b.startDate);
  var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):recipe.steps;
  return steps.map(function(s){
    var id=b.id+'-step-'+s.day;
    var daysFromDue=d-s.day;
    return{
      id:id,
      title:s.title,
      desc:s.desc,
      day:s.day,
      daysFromDue:daysFromDue,
      isDue:daysFromDue===0,
      isOverdue:daysFromDue>0&&!isTaskDone(id),
      isFuture:daysFromDue<0,
      done:isTaskDone(id),
      doneToday:isTaskCompletedToday(id),
      isPast:s.day<d-2
    };
  });
}

// tasksDone is { taskId: 'YYYY-MM-DD' } — flat map keyed by task id, value
// is the completion date. A completed task is hidden from the coach on the
// day AFTER completion. Done-today tasks remain visible (so the user can
// uncheck if they marked too eagerly).
function isTaskDone(id){
  var v=APP.tasksDone&&APP.tasksDone[id];
  if(!v)return false;
  // Legacy: old format stored boolean true under "<date>-<id>" keys.
  // The new format stores the completion date string under just "<id>".
  // We coerce truthy → done; date-string truthy → done.
  return !!v;
}
function isTaskCompletedToday(id){
  return APP.tasksDone&&APP.tasksDone[id]===today();
}
function toggleTask(id,el){
  if(!APP.tasksDone)APP.tasksDone={};
  if(APP.tasksDone[id]){
    delete APP.tasksDone[id];
    if(el){el.classList.remove('checked');el.innerHTML='';}
  }else{
    APP.tasksDone[id]=today();
    if(el){el.classList.add('checked');el.innerHTML='✓';}
  }
  scheduleSave();
}

function getMeadWisdom(b,day){
  var tips=[];
  var recipe=getRecipe(b.recipeId);
  var yeast=(typeof getYeastById==='function')?(getYeastById(b.yeast||(recipe&&recipe.yeast)||'m05')||{}):{};
  var tRange=(yeast.optimalTempLow!=null&&yeast.optimalTempHigh!=null)?yeast.optimalTempLow+'-'+yeast.optimalTempHigh+'°C':'its optimal range';
  if(day<3)tips.push('🌡 Keep fermentation temperature stable at '+tRange+(yeast.name?' for '+yeast.name.split('—')[0].trim():'')+'. Swings stress yeast.');
  if(day<7)tips.push('💨 Gently swirl your fermenter once or twice daily to degas CO₂ and distribute nutrients.');
  if(day>=3&&day<14)tips.push('👁 Cloudiness is normal — suspended yeast at work. Clarity comes with time.');
  if(day>=7&&day<21)tips.push('📊 Log gravity every 3-4 days. Fermentation is complete when gravity is stable across two readings.');
  if(day>=14)tips.push('🍯 When racking, work gently and slowly. Minimize oxygen contact to preserve aromatics.');
  if(day>=30&&recipe&&recipe.style==='Sack Mead')tips.push('⏳ This is a sack mead — patience is the most important ingredient. Don\'t even think about bottling yet.');
  if(day>=30&&recipe&&recipe.style!=='Sack Mead')tips.push('⏳ Patience is the meadwright\'s greatest tool. Rushing mead is the most common beginner mistake.');
  if(day>=60)tips.push('🌿 Consider adding oak cubes or a vanilla bean for complexity during final aging.');
  tips.push('🧼 Clean (e.g. Chemipro OXI), then sanitize (Chemipro SAN or Star San) EVERYTHING that touches your mead. One contamination ruins months of work.');
  return tips.slice(0,3);
}

// Cider-side counterpart to getMeadWisdom — same day-staged tip structure,
// cider-specific content (pectin haze, MLF timing, apple-appropriate advice)
// instead of honey/mead framing.
function getCiderWisdom(b,day){
  var tips=[];
  var recipe=getRecipe(b.recipeId);
  var yeast=(typeof getYeastById==='function')?(getYeastById(b.yeast||(recipe&&recipe.yeast)||'nottingham')||{}):{};
  var tRange=(yeast.optimalTempLow!=null&&yeast.optimalTempHigh!=null)?yeast.optimalTempLow+'-'+yeast.optimalTempHigh+'°C':'its optimal range';
  if(day<3)tips.push('🌡 Keep fermentation temperature stable at '+tRange+(yeast.name?' for '+yeast.name.split('—')[0].trim():'')+'. Swings stress yeast.');
  if(day<7)tips.push('🍏 Cloudiness early on is normal — apple pectin plus active yeast. Pectic enzyme (if used) needs time to work.');
  if(day>=3&&day<14)tips.push('📊 Log gravity every 3-4 days. Fermentation is complete when gravity is stable across two readings.');
  if(day>=14&&recipe&&typeof CIDER_MLF_BY_STYLE!=='undefined'&&recipe.styleId&&CIDER_MLF_BY_STYLE[recipe.styleId]!=='neutral'){
    tips.push(CIDER_MLF_BY_STYLE[recipe.styleId]==='avoid'
      ?'🧪 This style is best kept free of malolactic fermentation — sulfite promptly once primary finishes, don\'t leave it sitting unsulfited.'
      :'🧪 This style traditionally allows malolactic fermentation for a softer, buttery character — hold off on sulfite if you want to try it.');
  }
  if(day>=14&&(!recipe||!recipe.styleId||CIDER_MLF_BY_STYLE[recipe.styleId]==='neutral'))tips.push('🍎 When racking, work gently and slowly. Minimize oxygen contact to preserve fresh apple aromatics.');
  if(day>=60)tips.push('🌿 Consider oak cubes for a heirloom/English-style cider, or extra bulk-aging time to round out tannin.');
  tips.push('🧼 Clean (e.g. Chemipro OXI), then sanitize (Chemipro SAN or Star San) EVERYTHING that touches your cider. One contamination ruins months of work.');
  return tips.slice(0,3);
}

// ==================== ICS CALENDAR FEED ====================
// Build a flat list of upcoming brewing events for the calendar feed. The
// client owns all the scheduling logic (recipe steps, TOSNA injection, aging
// profiles), so it computes the events and stores them in the state blob;
// the server just formats whatever's there as an .ics. Events refresh on every
// save, which is plenty fresh for a polled calendar subscription.
// Deliberately NOT filtered by activeBevMode()/visibleBatches(): this feeds a
// single persistent external subscription URL (webcal://.../calendar/<token>.ics)
// that a calendar app polls independently of the browser's UI. Its content
// silently changing based on whichever mead/cider toggle happened to be active
// in someone's browser at last-save-time would be confusing, so it always
// includes every batch; per-event icon/wording is beverage-aware instead.
function buildCalendarEvents(){
  var events=[];
  var nowMs=Date.now();
  var pastWindow=nowMs-21*86400000;       // keep the last ~3 weeks visible
  var futureWindow=nowMs+760*86400000;    // ~2 years ahead
  function iso(d){return d.toISOString().slice(0,10);}
  (APP.batches||[]).forEach(function(b){
    if(!b.startDate)return;
    var start=new Date(b.startDate);
    if(isNaN(start.getTime()))return;
    var recipe=(APP.recipes||[]).find(function(r){return r.id===b.recipeId;});
    var status=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
    var active=(status!=='bottled'&&status!=='complete'&&status!=='failed');
    var isCider=(b.beverageType||'mead')==='cider';
    var icon=isCider?'🍎':'🍯';
    var kindName=isCider?'Cider':'Mead';
    // Process-step events for active batches (nutrient doses, racking, etc.)
    if(active&&recipe){
      var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):(recipe.steps||[]);
      if(typeof injectCareSteps==='function')steps=injectCareSteps(steps);
      steps.forEach(function(s){
        var dt=new Date(start.getTime()+s.day*86400000);
        if(dt.getTime()<pastWindow||dt.getTime()>futureWindow)return;
        var taskId=b.id+'-step-'+s.day;
        // Skip steps the user already ticked off (care steps aren't tickable).
        if(!s._care&&typeof isTaskDone==='function'&&isTaskDone(taskId))return;
        events.push({uid:'step-'+b.id+'-'+s.day+'@meados',date:iso(dt),
          summary:icon+' '+(b.name||'Batch')+' · '+s.title,
          description:String(s.desc||'').replace(/\s+/g,' ')});
      });
    }
    // Aging milestones for any batch with a recipe (ready / peak windows).
    if(recipe){
      [['minAgeDays','✅ Ready to drink',' should be ready to start drinking.'],
       ['peakAgeDays','⭐ Peak window',' is at its estimated peak — best drinking from here.']].forEach(function(p){
        var days=recipe[p[0]];if(!days)return;
        var dt=new Date(start.getTime()+days*86400000);
        if(dt.getTime()<pastWindow||dt.getTime()>futureWindow)return;
        events.push({uid:p[0]+'-'+b.id+'@meados',date:iso(dt),
          summary:p[1]+' · '+(b.name||'Batch'),
          description:(recipe.name||kindName)+p[2]});
      });
    }
  });
  return events;
}

// Unguessable token for the private calendar-feed URL. Minted on demand (when
// the user enables the feed in Settings); clearing it disables the feed.
function getCalendarToken(){return (APP.settings&&APP.settings.calendarToken)||'';}
function enableCalendarFeed(){
  if(!APP.settings)APP.settings={};
  if(!APP.settings.calendarToken){
    var tok='';
    try{var a=new Uint8Array(16);(window.crypto||window.msCrypto).getRandomValues(a);
      tok=Array.prototype.map.call(a,function(x){return('0'+x.toString(16)).slice(-2);}).join('');}
    catch(e){tok=(Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,32);}
    APP.settings.calendarToken=tok;
  }
  scheduleSave();renderMain();
}
function disableCalendarFeed(){
  if(APP.settings)APP.settings.calendarToken='';
  scheduleSave();renderMain();
}
function calendarFeedUrl(scheme){
  var tok=getCalendarToken();if(!tok)return'';
  var base=(typeof appBaseUrl==='function')?appBaseUrl():(location.origin+'/');
  var url=base+'calendar/'+tok+'.ics';
  if(scheme==='webcal')return url.replace(/^https?:\/\//,'webcal://');
  return url;
}

// ==================== DAILY COACH ====================
function renderCoach(){
  var d=new Date();
  var briefs='';
  var activeBatches=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  if(!activeBatches.length){
    briefs='<div class="empty-state"><div class="es-icon">🍯</div><p>No active batches to coach.</p><br><button class="btn btn-primary" onclick="openNewBatchModal()">＋ Start Brewing</button></div>';
  }else{
    briefs=activeBatches.map(function(b){
      var day=daysSince(b.startDate),status=getBatchStatus(b);
      var tasks=getTasksForBatch(b);
      // Show: due today + overdue uncompleted + done-today (so user can untick)
      // Hide: future tasks, and tasks completed on previous days.
      var visibleTasks=tasks.filter(function(t){
        if(t.isDue)return true;
        if(t.isOverdue)return true;
        if(t.doneToday)return true;
        return false;
      });
      var nextTask=tasks.find(function(t){return t.isFuture;});
      var color=getBatchColor(b);
      var _nl=(typeof appLang==='function'&&appLang()==='nl');
      var statusMsg='';
      if(status==='fermenting')statusMsg=_nl?('Actieve gisting aan de gang. Dag '+day+' — dichtheid daalt, CO₂ wordt geproduceerd. Houd de temperatuur stabiel; weersta de drang het vat te openen.'):('Active fermentation underway. Day '+day+' — gravity dropping, CO₂ being produced. Keep temperature stable; resist opening the vessel.');
      else if(status==='conditioning')statusMsg=_nl?'Gisting grotendeels voltooid. De mede conditioneert en klaart. Bevestig dichtheidsstabiliteit vóór het overhevelen.':'Fermentation mostly complete. Mead is conditioning and clearing. Confirm gravity stability before racking.';
      else if(status==='aging')statusMsg=_nl?(b.name+' rijpt gracieus. Hoe moeilijker het wachten, hoe lonender het resultaat.'):(b.name+' is aging gracefully. The harder it is to wait, the more rewarding the result.');
      return'<div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">'
        +'<div style="height:3px;background:'+color+'"></div>'
        +'<div style="padding:18px">'
        +'<div class="card-header"><div><div class="card-title" style="color:'+color+'">'+escHtml(b.name)+'</div><div class="card-subtitle" style="display:flex;align-items:center;gap:8px;margin-top:4px">'+fmtDuration(day)+' '+statusBadge(status)+'</div></div>'
        +'<button class="btn btn-secondary btn-sm" onclick="showView(\'batch\',\''+b.id+'\');setBatchTab(\''+b.id+'\',\'log\')">Log Reading</button></div>'
        +'<div class="info-box" style="margin:0 0 12px;border-left-color:'+color+'"><div style="font-size:13px;color:var(--text2)">'+statusMsg+'</div></div>'
        +(visibleTasks.length?visibleTasks.map(function(td){
          var overdueClass=td.isOverdue?' overdue':'';
          var dayLabel=_nl?(td.isDue?' (VANDAAG)':(td.isOverdue?' ('+fmtDuration(td.daysFromDue)+' te laat — NU DOEN)':td.done?' (gedaan)':' (over '+fmtDuration(-td.daysFromDue)+')')):(td.isDue?' (TODAY)':(td.isOverdue?' ('+fmtDuration(td.daysFromDue)+' overdue — DO NOW)':td.done?' (done)':' (in '+fmtDuration(-td.daysFromDue)+')'));
          return'<div class="coach-box'+overdueClass+'" style="margin-bottom:12px'+(td.isOverdue?';border-color:var(--red);border-left:4px solid var(--red2);background:linear-gradient(135deg,#251012,#180b0b)':'')+'"><div class="coach-title"'+(td.isOverdue?' style="color:var(--red2)"':'')+'>'+(td.isOverdue?'⚠':'⚗')+(_nl?' ACTIE VEREIST — DAG ':' ACTION DUE — DAY ')+td.day+dayLabel+'</div>'
            +'<div style="font-family:var(--font-display);font-size:14px;color:'+(td.isOverdue?'var(--red2)':'var(--gold2)')+';margin-bottom:6px">'+escHtml(td.title)+'</div>'
            +'<div class="coach-text">'+escHtml(annotateNutrientDesc(td.desc))+'</div>'
            +'<div class="coach-tasks" style="margin-top:12px"><div class="coach-task"><div class="task-cb '+(td.done?'checked':'')+'" onclick="toggleTask(\''+td.id+'\',this)">'+(td.done?'✓':'')+'</div><span style="font-size:13px">'+(td.done?'Done today — uncheck if not':'Mark as done')+'</span></div></div></div>';
        }).join('')
          :'<div class="info-box green" style="margin-bottom:12px"><div style="font-size:13px;color:var(--green2)">✓ No action today. Verify airlock water and temperature.</div></div>')
        +(nextTask?'<div style="font-size:13px;color:var(--text3)">'+(_nl?'Volgende: ':'Next: ')+'<span style="color:var(--text2)">'+(_nl?'Dag ':'Day ')+nextTask.day+' — '+escHtml((_nl&&typeof STEP_TITLE_NL!=='undefined'&&STEP_TITLE_NL[nextTask.title])||nextTask.title)+'</span> ('+(_nl?'over ':'in ')+fmtDuration(-nextTask.daysFromDue)+')</div>':'')
        +'</div></div>';
    }).join('');
  }
  // Temperature reminder follows the active batches' actual yeast strains,
  // not a hard-coded M05 range.
  var rLo=null,rHi=null,rNames={};
  activeBatches.forEach(function(b){
    var y=(typeof getYeastById==='function')?getYeastById(b.yeast||'m05'):null;
    if(!y)return;
    if(y.optimalTempLow!=null&&(rLo==null||y.optimalTempLow<rLo))rLo=y.optimalTempLow;
    if(y.optimalTempHigh!=null&&(rHi==null||y.optimalTempHigh>rHi))rHi=y.optimalTempHigh;
    if(y.name)rNames[y.name.split('—')[0].trim()]=1;
  });
  var rStrains=Object.keys(rNames);
  var rRange=(rLo!=null&&rHi!=null)?rLo+'-'+rHi+'°C':'each yeast’s optimal range';
  var tempReminder='Fermentation space at '+rRange+'? '+(rStrains.length===1?'Even brief swings stress '+rStrains[0]+'.':(rStrains.length>1?'Even brief swings stress yeast — your batches use '+rStrains.join(', ')+'.':'Even brief swings stress yeast.'));
  return'<div class="page-title">Daily Coach</div>'
    +'<div class="page-subtitle">'+d.toLocaleDateString(_dloc(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+_UI('Morning Briefing','Ochtendbriefing')+'</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +'<div style="margin:16px 0">'+briefs+'</div>'
    +renderCoachDrinkingSection()
    +'<div class="card"><div class="card-header"><div class="card-title">DAILY REMINDERS</div></div>'
    +'<div class="grid-2" style="gap:12px">'
    +[['🌡 Temperature',tempReminder],
      ['👁 Airlock','Water to the fill line? A dry airlock invites contamination.'],
      ['📊 Gravity','Active batches: reading every 3-4 days reveals patterns.'],
      ['🧼 Sanitation','Clean first (e.g. Chemipro OXI), then a no-rinse sanitizer (Chemipro SAN or Star San). On everything, every time.']]
      .map(function(x){return'<div class="info-box"><div style="font-size:13px;color:var(--gold2);margin-bottom:4px">'+x[0]+'</div><div style="font-size:13px;color:var(--text2)">'+x[1]+'</div></div>';}).join('')
    +'</div></div>';
}

// Drinking-window section: surfaces bottled batches that have hit a tasting
// milestone today. Card per task, grouped by batch. The user can tick the
// task as done (means "I drank one / acknowledged this milestone").
function renderCoachDrinkingSection(){
  var drinkingTasks=typeof getDrinkingTasks==='function'?getDrinkingTasks():[];
  if(!drinkingTasks.length)return'';
  // Group by batch
  var byBatch={};
  drinkingTasks.forEach(function(t){
    if(!byBatch[t.batchId])byBatch[t.batchId]={batch:getBatch(t.batchId),tasks:[]};
    byBatch[t.batchId].tasks.push(t);
  });
  var cards=Object.keys(byBatch).map(function(bid){
    var entry=byBatch[bid];
    var b=entry.batch;
    if(!b)return'';
    var color=getBatchColor(b);
    var bot=APP.bottling[b.id];
    var onHand=typeof bottlesOnHand==='function'&&bot?bottlesOnHand(bot):0;
    var taskHtml=entry.tasks.map(function(td){
      var done=isTaskDone(td.id);
      var icon=/peak/i.test(td.title)?'✦':(/max|approaching/i.test(td.title)?'⚠':'🍷');
      var titleColor=/peak/i.test(td.title)?'var(--green2)':(/max|approaching/i.test(td.title)?'var(--red2)':'var(--gold2)');
      return'<div style="background:rgba(0,0,0,0.18);border-radius:var(--radius);padding:12px;margin-bottom:8px;border-left:3px solid '+titleColor+'">'
        +'<div style="font-family:var(--font-display);font-size:13px;color:'+titleColor+';margin-bottom:4px;letter-spacing:1px">'+icon+' '+escHtml(td.title)+'</div>'
        +'<div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:10px">'+escHtml(stepDescL(td.desc))+'</div>'
        +'<div class="coach-task" style="margin-top:4px"><div class="task-cb '+(done?'checked':'')+'" onclick="toggleTask(\''+td.id+'\',this)">'+(done?'✓':'')+'</div><span style="font-size:12.5px">'+(done?'Acknowledged today':'Mark acknowledged')+'</span></div>'
        +'</div>';
    }).join('');
    return'<div class="card" style="margin-bottom:12px;padding:0;overflow:hidden">'
      +'<div style="height:3px;background:'+color+'"></div>'
      +'<div style="padding:14px">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:10px">'
      +'<div style="font-family:var(--font-display);font-size:15px;color:'+color+'">'+escHtml(b.name)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+onHand+' BOTTLE'+(onHand===1?'':'S')+' ON HAND</div>'
      +'</div>'
      +taskHtml
      +'<button class="btn btn-secondary btn-sm" onclick="showView(\'batch\',\''+b.id+'\')" style="margin-top:4px">Open '+escHtml(b.name)+' →</button>'
      +'</div></div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">'
    +'<div style="padding:18px 18px 6px"><div class="card-title">🍷 DRINKING WINDOW</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-top:4px">Batches hitting a milestone today. Take notes while you taste — the journal becomes your reference.</div>'
    +'</div>'
    +'<div style="padding:0 18px 18px">'+cards+'</div>'
    +'</div>';
}
