// ==================== BATCH ADVISOR — VIEW ====================
// Renders the mwBatchAdvice() snapshot. The domain layer (03e-advisor.js) returns
// structured, language-neutral data (ids + data + severity + confidence); this
// file is the ONLY place advisor strings live, so everything is localized here.
// Folds in the former "Brew Coach" tasks + wisdom so nothing was lost in the merge.

function _advNL(){return typeof appLang==='function'&&appLang()==='nl';}

// Resolve a yeast id to its display name (e.g. 'ec1118' → 'EC-1118') for
// ingredient-aware recommendation text. Falls back to the raw id if unknown —
// never silently substitutes a different strain.
function _advYeastName(id){
  if(!id)return null;
  var y=(typeof YEAST_STRAINS!=='undefined'?YEAST_STRAINS:[]).filter(function(x){return x.id===id;})[0];
  return y?y.name:id;
}

// Per-recommendation localized text. Returns {icon,title,reason}.
function _advItemText(it){
  var nl=_advNL(), d=it.data||{};
  var M={
    'stalled':(function(){
      var yn=_advYeastName(d.yeast);
      var causeTxt={
        nutrition:nl?'Er ontbreken nog voedingsgiften — de meest voorkomende oorzaak van een stall.':'Nutrient doses are still missing — the most common cause of a stall.',
        fructose:nl?('De honing ('+(d.honey||'?')+') is fructoserijk en '+(yn||'deze gist')+' is niet fructofiel — een klassieke late stall. Herstart met een fructofiele gist (bv. K1-V1116).')
                   :('The honey ('+(d.honey||'?')+') is high in fructose and '+(yn||'this yeast')+' isn\'t fructophilic — a classic late stall. Restart with a fructophilic yeast (e.g. K1-V1116).'),
        tolerance:nl?((yn||'De gist')+' nadert mogelijk haar alcoholtolerantie — de gisting kan hier gewoon stoppen in plaats van vastzitten.')
                    :((yn||'The yeast')+' may be nearing its alcohol tolerance — fermentation may simply be finished rather than stuck.'),
        temperature:nl?'De laatste temperatuur ligt buiten het ideale bereik — te koud vertraagt of stalt de gisting.':'The last temperature reading is outside the ideal range — too cold slows or stalls fermentation.',
        unknown:''
      }[d.cause]||'';
      return {icon:'🧊',
        title:nl?'Gisting lijkt stil te vallen':'Fermentation appears stalled',
        reason:nl?('De dichtheid is nauwelijks bewogen en zit nog op ~'+d.atten+'% vergisting, ver van het doel. '+(causeTxt||'Controleer temperatuur en voeding.')+' Overweeg anders een herstart-gist (zie Problemen oplossen).')
                :('Gravity has barely moved and is still ~'+d.atten+'% attenuated, well short of target. '+(causeTxt||'Check temperature and nutrients.')+' Otherwise consider a restart yeast (see Troubleshoot).')};
    })(),
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
      reason:nl?('Laatste meting '+(d.temp!=null?d.temp+'°C':'?')+' ligt buiten het ideale bereik voor '+(_advYeastName(d.yeast)||'deze gist')+' ('+d.low+'–'+d.high+'°C). '+(d.cold?'Te koud vertraagt of stalt de gisting.':'Te warm geeft fusels en scherpe smaken.'))
              :('Last reading '+(d.temp!=null?d.temp+'°C':'?')+' is outside '+(_advYeastName(d.yeast)||'this yeast')+'\'s ideal range ('+d.low+'–'+d.high+'°C). '+(d.cold?'Too cold slows or stalls fermentation.':'Too warm drives fusels and harsh flavours.'))},
    'abv-ceiling':{icon:'⚠',
      title:nl?'Nadert alcoholtolerantie':'Approaching alcohol tolerance',
      reason:nl?('Het huidige alcohol (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) nadert de tolerantie van '+(_advYeastName(d.yeast)||'de gist')+' ('+d.max+'%). Verwacht dat de gisting hier vanzelf vertraagt — plan eventueel een hogertolerante gist of stapvoeding.')
              :('Current ABV (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) is nearing the tolerance of '+(_advYeastName(d.yeast)||'the yeast')+' ('+d.max+'%). Expect fermentation to slow naturally here — consider a higher-tolerance yeast or step feeding for next time.')},
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
              :('Fermentation is nearly done. Let the mead clear — a cold-crash (or simply time) drops yeast and fine particles to the bottom for a bright, cleaner mead. Then rack off the sediment.')},
    'ph-low':{icon:'🧪',
      title:nl?'pH is laag — gist onder stress':'pH is low — yeast under stress',
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt onder de gezonde bandbreedte (3,0–3,4). Onder 2,9 raakt de gist gestrest, wat tot een trage of vastgelopen gisting kan leiden. Overweeg de pH te verhogen met kaliumcarbonaat.')
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is below the healthy band (3.0–3.4). Below 2.9, yeast becomes stressed, which can slow or stall fermentation. Consider raising pH with potassium carbonate.')},
    'ph-high':{icon:'🧪',
      title:nl?'pH is hoog — besmettingsrisico':'pH is high — contamination risk',
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt boven de gezonde bandbreedte (3,0–3,4). Boven 3,5 wordt de mede kwetsbaarder voor ongewenste micro-organismen. Overweeg bij te sturen met wijnzuur.')
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is above the healthy band (3.0–3.4). Above 3.5, the mead becomes more vulnerable to unwanted microorganisms. Consider adjusting with tartaric or citric acid.')},
    'carbonation-developing':{icon:'🫧',
      title:nl?'Carbonatie bouwt zich op':'Carbonation is developing',
      reason:nl?('Gebotteld ~'+d.aged+' dagen geleden. Bottelrijping duurt doorgaans 2–3 weken — bewaar de flessen rechtop op kamertemperatuur zodat de gist de priming-suiker kan vergisten. Koel pas vlak voor het proeven.')
              :('Bottled ~'+d.aged+' days ago. Bottle-conditioning typically takes 2–3 weeks — store the bottles upright at room temperature so the yeast can ferment the priming sugar. Chill only just before tasting.')},
    'blowoff-risk':{icon:'🪣',
      title:nl?'Weinig ruimte boven de must — blow-off-risico':'Little headspace above the must — blow-off risk',
      reason:nl?('Deze partij ('+(d.volume||'?')+' L) laat maar ~'+d.headspacePct+'% lucht over in het vat ('+(d.capacity||'?')+' L). Tijdens de krachtigste fase van de gisting kan schuim/krausen via het waterslot naar buiten geduwd worden. Overweeg een groter vat, of leg een schaal onder het waterslot.')
              :('This batch ('+(d.volume||'?')+' L) leaves only ~'+d.headspacePct+'% air space in the vessel ('+(d.capacity||'?')+' L). During the most vigorous phase of fermentation, foam/krausen can push out through the airlock. Consider a larger vessel, or set a tray underneath to catch any blow-off.')},
    'fermenting-long':{icon:'⏳',
      title:nl?'Duurt langer dan verwacht':'Taking longer than expected',
      reason:nl?((_advYeastName(d.yeast)||'Deze gist')+' gist doorgaans in '+d.low+'–'+d.high+' dagen voor dit recept; deze partij zit al op dag '+d.days+'. Dat is niet per se een probleem — sommige mede rijpt gewoon trager — maar het is de moeite waard om temperatuur en voeding nog eens te checken als dit je verrast.')
              :((_advYeastName(d.yeast)||'This yeast')+' typically finishes in '+d.low+'–'+d.high+' days for this recipe; this batch is at day '+d.days+'. That\'s not necessarily a problem — some meads simply run slower — but worth double-checking temperature and nutrients if this surprises you.')},
    'extended-bulk-aging':{icon:'🛢',
      title:nl?'Al lang niet gebotteld':'Sitting unbottled a long time',
      reason:nl?('Deze partij zit al ~'+d.days+' dagen in bulkrijping zonder gebotteld te zijn. Elke keer dat het vat geopend of verplaatst wordt, is er kans op zuurstofcontact — bottelen (ook al is de mede nog jong) sluit dat risico af. Overweeg binnenkort te bottelen.')
              :('This batch has been sitting in bulk aging for ~'+d.days+' days without being bottled. Every time the vessel is opened or moved there\'s a chance of oxygen exposure — bottling (even if the mead is still young) closes off that risk. Consider bottling soon.')}
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
  var M=nl?{fermentation:{icon:'🫧',label:'Gisting'},nutrition:{icon:'⚗',label:'Voeding'},oxygen:{icon:'🌀',label:'Zuurstof'},temperature:{icon:'🌡',label:'Temperatuur'},stabilisation:{icon:'🧪',label:'Stabilisatie'},clarity:{icon:'🔍',label:'Helderheid'},aging:{icon:'⌛',label:'Rijping'},data:{icon:'📊',label:'Gegevens'},equipment:{icon:'🪣',label:'Uitrusting'}}
            :{fermentation:{icon:'🫧',label:'Fermentation'},nutrition:{icon:'⚗',label:'Nutrition'},oxygen:{icon:'🌀',label:'Oxygen'},temperature:{icon:'🌡',label:'Temperature'},stabilisation:{icon:'🧪',label:'Stabilisation'},clarity:{icon:'🔍',label:'Clarity'},aging:{icon:'⌛',label:'Aging'},data:{icon:'📊',label:'Data'},equipment:{icon:'🪣',label:'Equipment'}};
  return M[cat]||{icon:'•',label:cat||''};
}

function _advHealthMeta(band){
  var nl=_advNL();
  var M={excellent:{c:'var(--green2)',l:nl?'Uitstekend':'Excellent'},good:{c:'var(--green2)',l:nl?'Goed':'Good'},
    fair:{c:'var(--gold2)',l:nl?'Redelijk':'Fair'},attention:{c:'var(--red2)',l:nl?'Aandacht nodig':'Needs attention'},
    unknown:{c:'var(--text3)',l:nl?'Onbekend':'Unknown'}};
  return M[band]||M.unknown;
}

// Plain-language explanation for one health axis: why it scored what it did.
// `ar` is {code,data,weight,known} from mwBatchHealth()'s axisReasons. Every
// numeric field is guarded — this map is evaluated for every axis regardless
// of which code actually applies (same eager-object-literal gotcha as the
// recommendation text map), so an unguarded d.field.method() here would crash
// the whole card the moment any OTHER axis hits this branch.
function _advAxisReasonText(axisKey,ar){
  var nl=_advNL(), d=(ar&&ar.data)||{};
  if(!ar||!ar.known)return nl?'Nog geen gegevens om dit te beoordelen.':'No data yet to judge this.';
  var M={
    temperature:{
      'in-range-stable':nl?('Blijft stabiel binnen '+d.low+'–'+d.high+'°C.'):('Staying steady within '+d.low+'–'+d.high+'°C.'),
      'in-range-unstable':nl?('Binnen '+d.low+'–'+d.high+'°C, maar wisselt tussen metingen.'):('Within '+d.low+'–'+d.high+'°C, but swinging between readings.'),
      'out-of-range':nl?('Laatste meting '+(d.temp!=null?d.temp+'°C':'?')+' ligt buiten '+d.low+'–'+d.high+'°C ('+(d.cold?'te koud':'te warm')+').'):('Last reading '+(d.temp!=null?d.temp+'°C':'?')+' is outside '+d.low+'–'+d.high+'°C (too '+(d.cold?'cold':'warm')+').')
    },
    nutrition:{
      'doses-complete':nl?('Alle '+d.expected+' voedingsgiften zijn toegevoegd.'):('All '+d.expected+' nutrient doses have been added.'),
      'doses-partial':nl?(d.done+' van '+d.expected+' voedingsgiften tot nu toe.'):(d.done+' of '+d.expected+' nutrient doses so far.'),
      'doses-logged':nl?(d.done+' voedingsgift(en) gelogd (geen vast schema voor dit recept).'):(d.done+' nutrient dose(s) logged (no fixed schedule for this recipe).')
    },
    gravity:{
      'stalled':nl?('Vergisting hangt vast op ~'+d.atten+'%, ver onder verwachting.'):('Fermentation is stuck at ~'+d.atten+'%, well below expected.'),
      'near-target':nl?'Dichtheid is op of nabij het doel.':'Gravity is at or near target.',
      'on-track':nl?('Daalt gestaag — op ~'+d.pct+'% van het verwachte tempo.'):('Dropping steadily — at ~'+d.pct+'% of the expected pace.')
    },
    oxygen:{
      'past-break-fermenting':nl?'Voorbij de 1/3-suikerbreuk terwijl nog actief gist — beperk beluchten.':'Past the 1/3 sugar break while still actively fermenting — minimise aeration.',
      'ok':nl?'Geen verhoogd oxidatierisico op dit moment.':'No elevated oxidation risk right now.'
    },
    yeast:{
      'stress-stalled':nl?'Toont stress door een vastgelopen gisting.':'Showing stress from a stalled fermentation.',
      'near-tolerance':nl?('Nadert de alcoholtolerantie ('+(d.max!=null?d.max+'%':'?')+') — kan hier vanzelf vertragen.'):('Nearing its alcohol tolerance ('+(d.max!=null?d.max+'%':'?')+') — may naturally slow here.'),
      'ok':nl?'Geen tekenen van stress of tolerantiedruk.':'No signs of stress or tolerance pressure.'
    }
  };
  var group=M[axisKey]||{};
  return group[ar.code]||(nl?'Geen bijzonderheden.':'Nothing notable.');
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
  function row(label,actual,target,state,fmt){
    return '<tr><td style="color:var(--text3)">'+label+'</td>'
      +'<td style="font-family:var(--font-mono)">'+(actual!=null?fmt(actual):'—')+'</td>'
      +'<td style="font-family:var(--font-mono);color:var(--text3)">'+(target!=null?fmt(target):'—')+' '+ind(state)+'</td></tr>';
  }
  var g=function(x){return (+x).toFixed(3);}, p1=function(x){return (+x).toFixed(1)+'%';}, dd=function(x){return '~'+Math.round(x)+(nl?'d':'d');};
  // Predicted finish day vs the expected RANGE (Expectations Engine) — falls
  // back to a flat ±5-day tolerance around recipe.fermentDays if the range
  // isn't available (e.g. no yeast selected yet). A range target can't reuse
  // the single-value row() helper, so it gets its own markup.
  var predDay=(s.daysSinceStart!=null&&s.daysToFG!=null)?(s.daysSinceStart+s.daysToFG):null;
  var fr=s.expectedFermentRange;
  var fermRow='';
  if(s.status==='fermenting'){
    if(fr){
      var fermState=predDay==null?null:(predDay<fr.low?'under':(predDay>fr.high?'over':'on'));
      fermRow='<tr><td style="color:var(--text3)">'+(nl?'Klaar (dag)':'Finish (day)')+'</td>'
        +'<td style="font-family:var(--font-mono)">'+(predDay!=null?dd(predDay):'—')+'</td>'
        +'<td style="font-family:var(--font-mono);color:var(--text3)">'+fr.low+'–'+fr.high+(nl?'d':'d')+' '+ind(fermState)+'</td></tr>';
    }else{
      fermRow=row(nl?'Klaar (dag)':'Finish (day)',predDay,recipe&&recipe.fermentDays,cmp(predDay,recipe&&recipe.fermentDays,5),dd);
    }
  }
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🎯 DOEL vs ACTUEEL':'🎯 TARGET vs ACTUAL')+'</div></div>'
    +'<table class="data-table"><tr><td></td><td style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+(nl?'ACTUEEL':'ACTUAL')+'</td><td style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+(nl?'DOEL':'TARGET')+'</td></tr>'
    +row('OG',ogA,ogT,cmp(ogA,ogT,0.003),g)
    +row(nl?'FG (prognose)':'FG (proj.)',fgA,fgT,cmp(fgA,fgT,0.004),g)
    +row(nl?'Alcohol':'ABV',abvA,abvT,cmp(abvA,abvT,0.6),p1)
    +fermRow
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
      var ar=h.axisReasons&&h.axisReasons[a[0]];
      var txt=(v==null)?'—':v;
      var col=(v==null)?'var(--bg4)':(v>=90?'var(--green2)':v>=70?'var(--gold2)':'var(--red2)');
      var pctOfScore=ar?Math.round(ar.weight*100):null;
      return '<div style="margin:7px 0">'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);width:90px">'+a[1]+(pctOfScore!=null?' <span style="opacity:.6">· '+pctOfScore+'%</span>':'')+'</div>'
        +'<div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+(v==null?0:v)+'%;background:'+col+'"></div></div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);width:30px;text-align:right">'+txt+'</div></div>'
        +'<div style="font-size:11px;color:var(--text3);margin:2px 0 0 98px;line-height:1.4">'+escHtml(_advAxisReasonText(a[0],ar))+'</div>'
        +'</div>';
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
