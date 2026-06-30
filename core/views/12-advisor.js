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
              :('~'+d.atten+'% attenuated (target ~'+d.expected+'%), gravity dropping steadily. No action needed.')},
    'aerate-now':{icon:'🌀',
      title:nl?'Beluchten / ontgassen':'Aerate / degas now',
      reason:nl?('Je zit nog vóór de 1/3-suikerbreuk ('+(d.sugarBreak||'?')+'). Roer dagelijks om CO₂ te verdrijven en zuurstof in te brengen — precies wanneer de gist het nodig heeft. Stop zodra je de breuk passeert.')
              :('You\'re still before the 1/3 sugar break ('+(d.sugarBreak||'?')+'). Stir daily to drive off CO₂ and introduce oxygen — exactly when the yeast need it. Stop once you pass the break.')},
    'stabilise-first':{icon:'🧪',
      title:nl?'Stabiliseren vóór terugzoeten':'Stabilise before backsweetening',
      reason:nl?('De gisting is bijna klaar. Wil je terugzoeten, stabiliseer dan eerst met kaliumsorbaat én metabisulfiet samen — sorbaat of metabisulfiet alléén stopt een herstart niet betrouwbaar.')
              :('Fermentation is nearly done. If you plan to backsweeten, stabilise first with potassium sorbate AND metabisulfite together — either one alone won\'t reliably stop a restart.')},
    'carbonation':{icon:'🍾',
      title:nl?'Bubbels: bottelrijping':'Sparkling: bottle-condition',
      reason:nl?('Dit is een mousserend recept — láát het droog uitgisten en stabiliseer NIET. Voeg bij het bottelen priming-suiker toe in drukbestendige flessen; bereken de dosis met de carbonatietool en let op de flesdruk.')
              :('This is a sparkling recipe — let it finish dry and do NOT stabilise. Add priming sugar at bottling in pressure-rated bottles; size the dose with the carbonation tool and mind bottle pressure.')},
    'temp-swing':{icon:'🌡',
      title:nl?'Temperatuur schommelt':'Temperature is swinging',
      reason:nl?('De temperatuur ligt in het ideale bereik ('+d.low+'–'+d.high+'°C) maar wisselt sterk tussen metingen. Grote schommelingen stressen de gist en geven bijsmaken — houd hem zo stabiel mogelijk.')
              :('Temperature is within the ideal range ('+d.low+'–'+d.high+'°C) but swinging between readings. Big swings stress the yeast and add off-flavours — keep it as steady as you can.')},
    'log-reading':{icon:'📊',
      title:nl?(d.first?'Log je eerste meting':'Tijd voor een nieuwe meting'):(d.first?'Log your first reading':'Time for a fresh reading'),
      reason:nl?(d.first?('De partij gist al '+d.days+' dagen zonder dichtheidsmeting. Log er een (en de OG) zodat de adviseur voortgang, prognose en gezondheid kan berekenen.')
                        :('Laatste meting was '+d.days+' dagen geleden. Een verse dichtheidsmeting houdt de prognose en stalldetectie scherp.'))
              :(d.first?('This batch has been fermenting '+d.days+' days with no gravity reading. Log one (and the OG) so the advisor can track progress, projection and health.')
                        :('Last reading was '+d.days+' days ago. A fresh gravity reading keeps the projection and stall detection accurate.'))},
    'aging-window':{icon:'⌛',
      title:nl?(d.phase==='peak'?'Voorbij het hoogtepunt':(d.approaching?'Nadert het hoogtepunt':'In het drinkvenster')):(d.phase==='peak'?'Past its peak':(d.approaching?'Approaching peak':'In the drinking window')),
      reason:nl?(d.phase==='peak'?('Deze mede is ~'+d.aged+' dagen oud, voorbij het geschatte hoogtepunt (~dag '+d.peak+'). Nog prima te drinken, maar wacht niet te lang meer.')
                        :(d.approaching?('~'+d.aged+' dagen oud — nadert het hoogtepunt rond dag '+d.peak+'. Een mooi moment om te proeven.')
                                       :('~'+d.aged+' dagen oud — voorbij het drinkpunt vanaf dag '+d.ready+'. Klaar om van te genieten; blijft verbeteren tot ~dag '+d.peak+'.')))
              :(d.phase==='peak'?('This mead is ~'+d.aged+' days old, past its estimated peak (~day '+d.peak+'). Still fine to drink, but don\'t hold it too much longer.')
                        :(d.approaching?('~'+d.aged+' days old — approaching peak around day '+d.peak+'. A great time to taste.')
                                       :('~'+d.aged+' days old — past the drink-from point at day '+d.ready+'. Ready to enjoy; keeps improving toward ~day '+d.peak+'.')))},
    'fructose-stall-risk':{icon:'🍯',
      title:nl?'Risico op fructose-stall':'Fructose-stall risk',
      reason:nl?('Deze honing ('+(d.honey||'?')+') is fructoserijk en je gist is niet fructofiel — de klassieke oorzaak van een late stall vlak vóór het einde. Houd voeding en temperatuur op orde; bij een stall herstart je met een fructofiele gist (bv. K1-V1116).')
              :('This honey ('+(d.honey||'?')+') is high in fructose and your yeast isn\'t fructophilic — the classic cause of a late stall near the very end. Keep nutrients and temperature on point; if it stalls, restart with a fructophilic yeast (e.g. K1-V1116).')},
    'record-og':{icon:'📋',
      title:nl?'Leg de begin-SG (OG) vast':'Record the starting gravity (OG)',
      reason:nl?('Er is geen OG vastgelegd voor deze partij. Zonder OG kan de adviseur geen vergisting, alcohol of prognose berekenen — vul de OG in bij je eerste meting.')
              :('No OG is recorded for this batch. Without it the advisor can\'t compute attenuation, ABV or the projection — add the OG with your first reading.')},
    'headspace':{icon:'🛢',
      title:nl?'Beperk de kopruimte':'Minimise headspace',
      reason:nl?('De hoofdgisting is voorbij en de partij rijpt nu rustig. Hevel over op een vat dat tot net onder de stop gevuld is, of top bij — zo beperk je zuurstofcontact en oxidatie tijdens het rijpen.')
              :('Primary is over and the batch is conditioning quietly. Rack into a vessel filled to just below the bung, or top up — this limits oxygen contact and oxidation during aging.')},
    'cold-crash':{icon:'🔍',
      title:nl?'Koud klaren vóór bottelen':'Cold-crash to clear',
      reason:nl?('De gisting is bijna klaar. Laat de mede klaren — koud wegzetten (cold-crash) of simpelweg tijd trekt gist en fijne deeltjes naar de bodem voor een heldere, schonere mede. Hevel daarna van de droesem.')
              :('Fermentation is nearly done. Let the mead clear — a cold-crash (or simply time) drops yeast and fine particles to the bottom for a bright, cleaner mead. Then rack off the sediment.')}
  };
  return M[it.id]||{icon:'•',title:it.id,reason:''};
}

function _advSeverityMeta(sev){
  var nl=_advNL();
  if(sev==='critical')return {color:'var(--red2)',bg:'rgba(176,58,46,0.10)',label:nl?'KRITIEK':'CRITICAL'};
  if(sev==='recommended')return {color:'var(--gold2)',bg:'rgba(232,196,106,0.10)',label:nl?'AANBEVOLEN':'RECOMMENDED'};
  return {color:'var(--blue2)',bg:'rgba(90,140,200,0.10)',label:nl?'INFO':'INFO'};
}

// Category metadata for grouping recommendations (icon + localized label).
function _advCategoryMeta(cat){
  var nl=_advNL();
  var M=nl?{fermentation:{icon:'🫧',label:'Gisting'},nutrition:{icon:'⚗',label:'Voeding'},oxygen:{icon:'🌀',label:'Zuurstof'},temperature:{icon:'🌡',label:'Temperatuur'},stabilisation:{icon:'🧪',label:'Stabilisatie'},clarity:{icon:'🔍',label:'Helderheid'},aging:{icon:'⌛',label:'Rijping'},data:{icon:'📊',label:'Gegevens'}}
            :{fermentation:{icon:'🫧',label:'Fermentation'},nutrition:{icon:'⚗',label:'Nutrition'},oxygen:{icon:'🌀',label:'Oxygen'},temperature:{icon:'🌡',label:'Temperature'},stabilisation:{icon:'🧪',label:'Stabilisation'},clarity:{icon:'🔍',label:'Clarity'},aging:{icon:'⌛',label:'Aging'},data:{icon:'📊',label:'Data'}};
  return M[cat]||{icon:'•',label:cat||''};
}

function _advHealthMeta(band){
  var nl=_advNL();
  var M={excellent:{c:'var(--green2)',l:nl?'Uitstekend':'Excellent'},good:{c:'var(--green2)',l:nl?'Goed':'Good'},
    fair:{c:'var(--gold2)',l:nl?'Redelijk':'Fair'},attention:{c:'var(--red2)',l:nl?'Aandacht nodig':'Needs attention'},
    unknown:{c:'var(--text3)',l:nl?'Onbekend':'Unknown'}};
  return M[band]||M.unknown;
}

// Compact health + top-recommendation strip for the batch Overview tab. Links
// through to the full Advisor tab. Returns '' when there's nothing useful to say.
function renderBatchAdvisorStrip(b){
  var nl=_advNL();
  var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
  if(!adv||!adv.signals||(adv.signals.status==='complete'))return '';
  var h=adv.health, r=adv.readiness, hm=_advHealthMeta(h&&h.band);
  var top=adv.items.filter(function(i){return i.severity!=='info';})[0]||adv.items[0];
  var topTxt=top?_advItemText(top):null, topMeta=top?_advSeverityMeta(top.severity):null;
  return '<div class="card" style="margin-bottom:16px;border-left:3px solid '+hm.c+'">'
    +'<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
    +'<div style="text-align:center;min-width:62px"><div style="font-family:var(--font-display);font-size:30px;line-height:1;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+_advTrendChip(h&&h.trend)+'</div><div class="micro-label">'+(nl?'GEZONDHEID':'HEALTH')+'</div></div>'
    +'<div style="flex:1;min-width:180px">'
    +(top?'<div style="font-size:13px;color:'+topMeta.color+';font-family:var(--font-display)">'+topTxt.icon+' '+escHtml(topTxt.title)+'</div><div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(topTxt.reason.length>120?topTxt.reason.slice(0,118)+'…':topTxt.reason)+'</div>'
        :'<div style="font-size:13px;color:var(--green2)">'+(nl?'✓ Alles ziet er goed uit':'✓ Everything looks good')+'</div>')
    +(r?'<div style="font-size:11px;color:var(--text3);margin-top:5px;font-family:var(--font-mono)">'+(nl?'DRINKBAARHEID':'READINESS')+' '+r.pct+'%</div>':'')
    +'</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="setBatchTab(\''+b.id+'\',\'coach\')">'+(nl?'Adviseur →':'Advisor →')+'</button>'
    +'</div></div>';
}

// Targets vs actual: at a glance, are we on track / over / under recipe spec?
function renderBatchTargets(b){
  var nl=_advNL();
  var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
  if(!adv||!adv.signals||!adv.signals.og)return '';
  var s=adv.signals, recipe=(APP.recipes||[]).filter(function(r){return r.id===b.recipeId;})[0];
  function cmp(actual,target,tol){if(actual==null||target==null)return null;var d=actual-target;if(Math.abs(d)<=tol)return 'on';return d>0?'over':'under';}
  function ind(state){if(state==null)return '';if(state==='on')return '<span style="color:var(--green2)">✓</span>';if(state==='over')return '<span style="color:var(--gold2)">↑</span>';return '<span style="color:var(--blue2)">↓</span>';}
  var ogA=s.og, ogT=recipe&&recipe.ogTarget;
  var fgT=s.targetFG, fgA=(s.status==='fermenting')?(s.estFG!=null?s.estFG:s.lastG):s.lastG;
  var abvT=s.targetABV, abvA=s.currentABV;
  // predicted finish day vs recipe ferment days
  var predDay=(s.daysSinceStart!=null&&s.daysToFG!=null)?(s.daysSinceStart+s.daysToFG):null;
  var fermT=recipe&&recipe.fermentDays;
  function row(label,actual,target,state,fmt){
    return '<tr><td style="color:var(--text3)">'+label+'</td>'
      +'<td style="font-family:var(--font-mono)">'+(actual!=null?fmt(actual):'—')+'</td>'
      +'<td style="font-family:var(--font-mono);color:var(--text3)">'+(target!=null?fmt(target):'—')+' '+ind(state)+'</td></tr>';
  }
  var g=function(x){return (+x).toFixed(3);}, p1=function(x){return (+x).toFixed(1)+'%';}, dd=function(x){return '~'+Math.round(x)+(nl?'d':'d');};
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🎯 DOEL vs ACTUEEL':'🎯 TARGET vs ACTUAL')+'</div></div>'
    +'<table class="data-table"><tr><td></td><td style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+(nl?'ACTUEEL':'ACTUAL')+'</td><td style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+(nl?'DOEL':'TARGET')+'</td></tr>'
    +row('OG',ogA,ogT,cmp(ogA,ogT,0.003),g)
    +row(nl?'FG (prognose)':'FG (proj.)',fgA,fgT,cmp(fgA,fgT,0.004),g)
    +row(nl?'Alcohol':'ABV',abvA,abvT,cmp(abvA,abvT,0.6),p1)
    +(s.status==='fermenting'?row(nl?'Klaar (dag)':'Finish (day)',predDay,fermT,cmp(predDay,fermT,5),dd):'')
    +'</table></div>';
}

// Localize the confidence reason codes into a "because: …" phrase.
function _advConfidenceText(reasons){
  var nl=_advNL();
  var M=nl?{'readings-many':'veel metingen','readings-several':'meerdere metingen','readings-few':'enkele metingen','readings-one':'slechts één meting','rate-steady':'gestage daalsnelheid','temp-stable':'stabiele temperatuur','known-yeast':'bekende gistvergisting'}
            :{'readings-many':'many readings','readings-several':'several readings','readings-few':'a few readings','readings-one':'only one reading','rate-steady':'steady drop rate','temp-stable':'stable temperature','known-yeast':'known yeast attenuation'};
  return (reasons||[]).map(function(c){return M[c]||c;}).join(' · ');
}
// Small ↑/↓ trend chip for the health score (vs the previous reading).
function _advTrendChip(trend){
  if(trend==null||trend===0)return '';
  var up=trend>0;
  return '<span style="font-size:12px;color:'+(up?'var(--green2)':'var(--red2)')+';margin-left:4px">'+(up?'▲':'▼')+Math.abs(trend)+'</span>';
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
  var confTxt=_advConfidenceText(adv.confidenceReasons);
  var healthCard='<div class="card" style="margin-bottom:16px;border-left:3px solid '+hm.c+'">'
    +'<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
    +'<div style="text-align:center;min-width:96px"><div style="font-family:var(--font-display);font-size:42px;line-height:1;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+_advTrendChip(h&&h.trend)+'</div>'
    +'<div class="micro-label" style="margin-top:4px">'+(nl?'GEZONDHEID':'HEALTH')+'</div>'
    +'<div style="font-family:var(--font-display);font-size:14px;color:'+hm.c+';margin-top:2px">'+hm.l+'</div></div>'
    +'<div style="flex:1;min-width:220px">'+bars+'</div>'
    +'</div>'
    +(confTxt?'<div style="font-size:11px;color:var(--text3);margin-top:10px;font-style:italic">'+(nl?'Vertrouwen ':'Confidence ')+Math.round((adv.confidence||0)*100)+'% — '+(nl?'op basis van':'based on')+' '+escHtml(confTxt)+'</div>':'')
    +'</div>';

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
    // Category summary — a grouped overview without burying critical items, which
    // stay sorted by severity below. Each card also carries its own category chip.
    var catCounts={},catOrder=[];
    adv.items.forEach(function(it){var c=it.category||'data';if(catCounts[c]==null){catCounts[c]=0;catOrder.push(c);}catCounts[c]++;});
    var catStrip=catOrder.length>1?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:11px">'+catOrder.map(function(c){var cm=_advCategoryMeta(c);return '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:2px 9px">'+cm.icon+' '+escHtml(cm.label)+' '+catCounts[c]+'</span>';}).join('')+'</div>':'';
    recHtml=catStrip+adv.items.map(function(it){
      var t=_advItemText(it), sm=_advSeverityMeta(it.severity), cm=_advCategoryMeta(it.category);
      var conf=Math.round((it.confidence||0)*100);
      return '<div style="background:'+sm.bg+';border-left:3px solid '+sm.color+';border-radius:var(--radius);padding:11px 13px;margin-bottom:8px">'
        +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:3px">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:'+sm.color+'">'+t.icon+' '+escHtml(t.title)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:0.5px">'+cm.icon+' '+escHtml(cm.label)+' · '+sm.label+' · '+(nl?'vertrouwen':'confidence')+' '+conf+'%</div></div>'
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
