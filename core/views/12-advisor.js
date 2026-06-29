// ==================== BATCH ADVISOR — VIEW ====================
// Renders the mwBatchAdvice() snapshot. The domain layer (03e-advisor.js) returns
// structured, language-neutral data (ids + data + severity + confidence); this
// file is the ONLY place advisor strings live, so everything is localized here.
// Folds in the former "Brew Coach" tasks + wisdom so nothing was lost in the merge.

function _advNL(){return typeof appLang==='function'&&appLang()==='nl';}

// Per-recommendation localized text. Returns {icon,title,reason}.
function _advItemText(it){
  var nl=_advNL(), d=it.data||{};
  var M={
    'stalled':{icon:'🧊',
      title:nl?'Gisting lijkt stil te vallen':'Fermentation appears stalled',
      reason:nl?('De dichtheid is nauwelijks bewogen en zit nog op ~'+d.atten+'% vergisting, ver van het doel. Controleer temperatuur en voeding; overweeg een herstart-gist (zie Problemen oplossen).')
              :('Gravity has barely moved and is still ~'+d.atten+'% attenuated, well short of target. Check temperature and nutrients; consider a restart yeast (see Troubleshoot).')},
    'nutrient-final':{icon:'⚗',
      title:nl?'Laatste voedingsgift is nodig':'Final nutrient addition due',
      reason:nl?('Je hebt '+d.done+' van '+d.expected+' voedingsgiften gedaan. '+(d.past?'Je bent voorbij de 1/3-suikerbreuk — voeg de laatste dosis nu toe; daarna helpt voeding niet meer en kan ze bederf voeden.':'Je nadert de 1/3-suikerbreuk ('+ (d.sugarBreak||'?') +') — voeg de laatste dosis vóór de breuk toe.'))
              :('You\'ve added '+d.done+' of '+d.expected+' nutrient doses. '+(d.past?'You\'re past the 1/3 sugar break — add the final dose now; after this, nutrients won\'t help and can feed spoilage.':'You\'re approaching the 1/3 sugar break ('+(d.sugarBreak||'?')+') — add the final dose before it.'))},
    'oxygen-stop':{icon:'🚫',
      title:nl?'Stop met beluchten':'Stop aerating',
      reason:nl?('De dichtheid ('+(d.sg!=null?d.sg.toFixed(3):'?')+') is voorbij de 1/3-suikerbreuk ('+(d.sugarBreak||'?')+'). De gist verlaat haar groeifase; zuurstof vanaf nu verhoogt vooral het oxidatierisico in plaats van te helpen.')
              :('Gravity ('+(d.sg!=null?d.sg.toFixed(3):'?')+') is past the 1/3 sugar break ('+(d.sugarBreak||'?')+'). Yeast are leaving their growth phase; oxygen from here mostly raises oxidation risk rather than helping.')},
    'ferment-complete':{icon:'✓',
      title:nl?'Gisting lijkt voltooid':'Fermentation looks complete',
      reason:nl?('De dichtheid ('+(d.sg!=null?d.sg.toFixed(3):'?')+') zit op of nabij het doel ('+(d.targetFG!=null?d.targetFG.toFixed(3):'?')+') bij ~'+d.atten+'% vergisting. Bevestig met twee stabiele metingen een paar dagen uit elkaar, hevel dan over / bottel.')
              :('Gravity ('+(d.sg!=null?d.sg.toFixed(3):'?')+') is at or near target ('+(d.targetFG!=null?d.targetFG.toFixed(3):'?')+') at ~'+d.atten+'% attenuation. Confirm with two stable readings a few days apart, then rack / bottle.')},
    'temperature':{icon:'🌡',
      title:nl?(d.cold?'Temperatuur te laag':'Temperatuur te hoog'):(d.cold?'Temperature too low':'Temperature too high'),
      reason:nl?('Laatste meting '+(d.temp!=null?d.temp+'°C':'?')+' ligt buiten het ideale bereik voor deze gist ('+d.low+'–'+d.high+'°C). '+(d.cold?'Te koud vertraagt of stalt de gisting.':'Te warm geeft fusels en scherpe smaken.'))
              :('Last reading '+(d.temp!=null?d.temp+'°C':'?')+' is outside this yeast\'s ideal range ('+d.low+'–'+d.high+'°C). '+(d.cold?'Too cold slows or stalls fermentation.':'Too warm drives fusels and harsh flavours.'))},
    'abv-ceiling':{icon:'⚠',
      title:nl?'Nadert alcoholtolerantie':'Approaching alcohol tolerance',
      reason:nl?('Het huidige alcohol (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) nadert de tolerantie van de gist ('+d.max+'%). De gisting kan boven het doel stoppen — plan eventueel een hogertolerante gist of stapvoeding.')
              :('Current ABV (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) is nearing the yeast\'s tolerance ('+d.max+'%). Fermentation may stop above target — consider a higher-tolerance yeast or step feeding.')},
    'on-track':{icon:'✓',
      title:nl?'Gisting verloopt op schema':'Fermentation is on track',
      reason:nl?('~'+d.atten+'% vergist (verwacht eind ~'+d.expected+'%), dichtheid daalt gestaag. Geen actie nodig.')
              :('~'+d.atten+'% attenuated (target ~'+d.expected+'%), gravity dropping steadily. No action needed.')}
  };
  return M[it.id]||{icon:'•',title:it.id,reason:''};
}

function _advSeverityMeta(sev){
  var nl=_advNL();
  if(sev==='critical')return {color:'var(--red2)',bg:'rgba(176,58,46,0.10)',label:nl?'KRITIEK':'CRITICAL'};
  if(sev==='recommended')return {color:'var(--gold2)',bg:'rgba(232,196,106,0.10)',label:nl?'AANBEVOLEN':'RECOMMENDED'};
  return {color:'var(--blue2)',bg:'rgba(90,140,200,0.10)',label:nl?'INFO':'INFO'};
}

function _advHealthMeta(band){
  var nl=_advNL();
  var M={excellent:{c:'var(--green2)',l:nl?'Uitstekend':'Excellent'},good:{c:'var(--green2)',l:nl?'Goed':'Good'},
    fair:{c:'var(--gold2)',l:nl?'Redelijk':'Fair'},attention:{c:'var(--red2)',l:nl?'Aandacht nodig':'Needs attention'},
    unknown:{c:'var(--text3)',l:nl?'Onbekend':'Unknown'}};
  return M[band]||M.unknown;
}

function renderBatchAdvisor(b){
  var nl=_advNL();
  var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
  if(!adv)return '<div class="info-box"><div style="font-size:13px;color:var(--text3)">'+(nl?'Nog niet genoeg gegevens voor advies — log een paar dichtheidsmetingen.':'Not enough data for advice yet — log a few gravity readings.')+'</div></div>';
  var s=adv.signals, h=adv.health, r=adv.readiness;

  // ---- Health hero ----
  var hm=_advHealthMeta(h&&h.band);
  var bars='';
  if(h){
    var axes=[['temperature',nl?'Temperatuur':'Temperature'],['nutrition',nl?'Voeding':'Nutrition'],['gravity',nl?'Dichtheid':'Gravity'],['oxygen',nl?'Zuurstof':'Oxygen'],['yeast',nl?'Gist':'Yeast']];
    bars=axes.map(function(a){
      var v=h.breakdown[a[0]];
      var txt=(v==null)?(nl?'—':'—'):v;
      var col=(v==null)?'var(--bg4)':(v>=90?'var(--green2)':v>=70?'var(--gold2)':'var(--red2)');
      return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);width:90px">'+a[1]+'</div>'
        +'<div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+(v==null?0:v)+'%;background:'+col+'"></div></div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);width:30px;text-align:right">'+txt+'</div></div>';
    }).join('');
  }
  var healthCard='<div class="card" style="margin-bottom:16px;border-left:3px solid '+hm.c+'">'
    +'<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
    +'<div style="text-align:center;min-width:96px"><div style="font-family:var(--font-display);font-size:42px;line-height:1;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+'</div>'
    +'<div class="micro-label" style="margin-top:4px">'+(nl?'GEZONDHEID':'HEALTH')+'</div>'
    +'<div style="font-family:var(--font-display);font-size:14px;color:'+hm.c+';margin-top:2px">'+hm.l+'</div></div>'
    +'<div style="flex:1;min-width:220px">'+bars+'</div>'
    +'</div></div>';

  // ---- Readiness ("can I drink it yet?") ----
  var readyCard='';
  if(r){
    var phaseL={fermenting:nl?'Gistend':'Fermenting',aging:nl?'Rijpend':'Aging',ready:nl?'Klaar om te drinken':'Ready to drink',peak:nl?'Op hoogtepunt':'At peak',failed:nl?'Mislukt':'Failed'}[r.phase]||r.phase;
    var rc=r.pct>=100?'var(--green2)':r.pct>=70?'var(--gold2)':'var(--text3)';
    var sub=(r.phase==='aging'&&r.readyDays!=null)?(nl?('Drinkvenster begint rond dag '+r.readyDays+' · hoogtepunt ~dag '+r.peakDays):('Drink window opens ~day '+r.readyDays+' · peak ~day '+r.peakDays))
      :(r.phase==='fermenting'?(nl?'Nog aan het gisten — nog niet drinkbaar.':'Still fermenting — not drinkable yet.'):'');
    readyCard='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🍷 DRINKBAARHEID':'🍷 READINESS')+'</div>'
      +'<div style="font-family:var(--font-display);font-size:16px;color:'+rc+'">'+r.pct+'%</div></div>'
      +'<div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden;margin:4px 0 6px"><div style="height:100%;width:'+r.pct+'%;background:'+rc+'"></div></div>'
      +'<div style="font-size:12px;color:var(--text3)"><strong style="color:'+rc+'">'+phaseL+'</strong>'+(sub?' · '+sub:'')+'</div></div>';
  }

  // ---- Predicted finish ----
  var finishCard='';
  if(s&&s.doneMs&&s.status==='fermenting'){
    var dstr=fmtDate(new Date(s.doneMs).toISOString().slice(0,10));
    finishCard='<div class="info-box" style="margin-bottom:16px;border-left-color:var(--gold2)"><div style="font-size:13px;color:var(--text2)">'
      +(nl?('📅 Verwacht klaar rond <strong>'+dstr+'</strong> (~'+s.daysToFG+' dagen), op basis van de huidige daalsnelheid.')
          :('📅 Expected to finish around <strong>'+dstr+'</strong> (~'+s.daysToFG+' days), based on the current drop rate.'))
      +'</div></div>';
  }

  // ---- Recommendations ----
  var recHtml='';
  if(adv.items.length){
    recHtml=adv.items.map(function(it){
      var t=_advItemText(it), sm=_advSeverityMeta(it.severity);
      var conf=Math.round((it.confidence||0)*100);
      return '<div style="background:'+sm.bg+';border-left:3px solid '+sm.color+';border-radius:var(--radius);padding:11px 13px;margin-bottom:8px">'
        +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:3px">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:'+sm.color+'">'+t.icon+' '+escHtml(t.title)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:0.5px">'+sm.label+' · '+(nl?'vertrouwen':'confidence')+' '+conf+'%</div></div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(t.reason)+'</div></div>';
    }).join('');
  }else{
    recHtml='<div class="info-box green"><div style="font-size:13px;color:var(--green2)">'+(nl?'✓ Geen actie nodig — alles ziet er goed uit.':'✓ No action needed — everything looks good.')+'</div></div>';
  }
  var recCard='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🧭 ADVIES':'🧭 RECOMMENDATIONS')+'</div></div>'+recHtml+'</div>';

  // ---- Folded-in Brew Coach: today's actions + upcoming + wisdom ----
  var d=(typeof daysSince==='function')?daysSince(b.startDate):0;
  var tasks=(typeof getTasksForBatch==='function')?getTasksForBatch(b):[];
  var todayTasks=tasks.filter(function(t){return t.isDue||t.isOverdue||t.doneToday;});
  var upcoming=tasks.filter(function(t){return t.isFuture;}).slice(0,5);
  var actionsHtml=todayTasks.length?todayTasks.map(function(td){
    var overdue=td.isOverdue;
    var dayLabel=td.isDue?(nl?' (VANDAAG)':' (TODAY)'):(overdue?(nl?' ('+fmtDuration(td.daysFromDue)+' te laat — NU DOEN)':' ('+fmtDuration(td.daysFromDue)+' overdue — DO NOW)'):td.done?(nl?' (gedaan)':' (done)'):(nl?' (over '+fmtDuration(-td.daysFromDue)+')':' (in '+fmtDuration(-td.daysFromDue)+')'));
    return '<div class="coach-box" style="margin-bottom:12px'+(overdue?';border-color:var(--red);border-left:4px solid var(--red2)':'')+'"><div class="coach-title"'+(overdue?' style="color:var(--red2)"':'')+'>'+(overdue?'⚠':'⚗')+' '+(nl?'ACTIE VEREIST — DAG ':'ACTION DUE — DAY ')+td.day+dayLabel+'</div>'
      +'<div style="font-family:var(--font-display);font-size:15px;color:'+(overdue?'var(--red2)':'var(--gold2)')+';margin-bottom:8px">'+escHtml(typeof stepTitleL==='function'?stepTitleL(td.title):td.title)+'</div>'
      +'<div class="coach-text">'+escHtml(typeof stepDescL==='function'?stepDescL(td.desc):td.desc)+'</div>'
      +'<div class="coach-tasks" style="margin-top:12px"><div class="coach-task"><div class="task-cb '+(td.done?'checked':'')+'" onclick="toggleTask(\''+td.id+'\',this)">'+(td.done?'✓':'')+'</div><span style="font-size:13px">'+(td.done?(nl?'Vandaag gedaan — vink uit indien niet':'Done today — uncheck if not'):(nl?'Markeer als gedaan':'Mark as completed'))+'</span></div></div></div>';
  }).join(''):'<div class="info-box green" style="margin-bottom:12px"><div style="font-size:13px;color:var(--green2)">'+(nl?'✓ Geen stap-actie vandaag. Controleer waterslot en temperatuur.':'✓ No step due today. Check airlock water and temperature.')+'</div></div>';
  var upcomingHtml='<div class="card"><div class="card-header"><div class="card-title">'+(nl?'KOMENDE STAPPEN':'UPCOMING STEPS')+'</div></div>'
    +(upcoming.length?upcoming.map(function(t){return '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);white-space:nowrap;padding-top:2px">'+(nl?'Dag ':'Day ')+t.day+'</div><div><div style="font-size:14px;color:var(--text)">'+escHtml(typeof stepTitleL==='function'?stepTitleL(t.title):t.title)+'</div><div style="font-size:12px;color:var(--text3);margin-top:2px">'+escHtml((typeof stepDescL==='function'?stepDescL(t.desc):t.desc).substring(0,110))+'…</div></div></div>';}).join(''):'<p style="color:var(--text3);font-style:italic;font-size:13px">'+(nl?'Geen stappen meer in het recept.':'No more steps in recipe.')+'</p>')
    +'</div>';
  var wisdom=(typeof getMeadWisdom==='function')?getMeadWisdom(b,d):[];
  var wisdomHtml=wisdom.length?'<div class="card"><div class="card-header"><div class="card-title">'+(nl?'WIJSHEID VAN DE MEADMAKER':'MEADWRIGHT\'S WISDOM')+'</div></div><div class="ornament">— ⬡ —</div>'
    +wisdom.map(function(tip){return '<div class="info-box" style="margin-bottom:8px"><div style="font-size:13px;color:var(--text2)">'+tip+'</div></div>';}).join('')+'</div>':'';

  return healthCard+readyCard+finishCard+recCard
    +'<div class="grid-2"><div>'+actionsHtml+upcomingHtml+'</div><div>'+wisdomHtml+'</div></div>';
}
