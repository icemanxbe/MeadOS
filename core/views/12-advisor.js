// ==================== BATCH ADVISOR — VIEW ====================
// Renders the mwBatchAdvice() snapshot. The domain layer (03e-advisor.js) returns
// structured, language-neutral data (ids + data + severity + confidence); this
// file is the ONLY place advisor strings live, so everything is localized here.
// Folds in the former "Brew Coach" tasks + wisdom so nothing was lost in the merge.

function _advNL(){return typeof appLang==='function'&&appLang()==='nl';}

// A handful of recommendation strings name the beverage directly ("let the
// mead clear"); this resolves the right noun from the item's own data so
// the same rule/text reads correctly for a cider batch instead of always
// saying "mead". "Cider" is a loanword in Dutch too, so no separate NL
// word is needed there — only the mead noun changes by language.
function _advBevWord(d,nl){
  var isCider=(d&&d.beverageType)==='cider';
  if(nl)return isCider?'cider':'mede';
  return isCider?'cider':'mead';
}

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
      // Weighted multi-cause (E2): mention a second contributing cause when it's
      // carrying real weight, not just any candidate that happened to match.
      var causeLabel={nutrition:nl?'te weinig voeding':'insufficient nutrients',fructose:nl?'fructoserijke honing':'high-fructose honey',
        tolerance:nl?'alcoholtolerantie':'alcohol tolerance',temperature:nl?'temperatuur':'temperature'};
      var second=(d.causes&&d.causes.length>1&&d.causes[1].weight>=0.35)?d.causes[1]:null;
      var secondTxt=second?(nl?(' Ook mogelijk een rol: '+(causeLabel[second.cause]||second.cause)+'.'):(' Also possibly contributing: '+(causeLabel[second.cause]||second.cause)+'.')):'';
      // Timeline fact (E10): how long it's actually been flat, not just "stalled".
      var plateauTxt=(d.plateauDays!=null)?(nl?(' De dichtheid staat al '+d.plateauDays+' dagen vrijwel stil.'):(' Gravity has been essentially flat for '+d.plateauDays+' days.')):'';
      return {icon:'🧊',
        title:nl?'Gisting lijkt stil te vallen':'Fermentation appears stalled',
        reason:nl?('De dichtheid is nauwelijks bewogen en zit nog op ~'+d.atten+'% vergisting, ver van het doel.'+plateauTxt+' '+(causeTxt||'Controleer temperatuur en voeding.')+secondTxt+' Overweeg anders een herstart-gist (zie Problemen oplossen).')
                :('Gravity has barely moved and is still ~'+d.atten+'% attenuated, well short of target.'+plateauTxt+' '+(causeTxt||'Check temperature and nutrients.')+secondTxt+' Otherwise consider a restart yeast (see Troubleshoot).')};
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
    'aging-window':(function(){
      var bev=_advBevWord(d,nl);
      return {icon:'⌛',
      title:nl?(d.phase==='declining'?'Voorbij de piek':d.phase==='peak'?'In het piekvenster':(d.approaching?'Nadert het piekvenster':'Klaar om te drinken'))
             :(d.phase==='declining'?'Past peak':d.phase==='peak'?'In its peak window':(d.approaching?'Approaching peak window':'Drink now')),
      reason:nl?(d.phase==='declining'?('~'+d.aged+' dagen oud — dit type '+bev+' is typisch op zijn best vóór ~dag '+d.max+'. Geen garantie dat de kwaliteit terugloopt, maar dit is een goed moment om te proeven en niet veel langer te wachten.')
                        :d.phase==='peak'?('Deze '+bev+' is ~'+d.aged+' dagen oud — dit is naar verwachting het piekvenster (~dag '+d.peak+' tot '+d.max+'). Dit is het beste moment om ervan te genieten.')
                        :(d.approaching?('~'+d.aged+' dagen oud — nadert het piekvenster rond dag '+d.peak+'. Een mooi moment om te proeven.')
                                       :('~'+d.aged+' dagen oud — voorbij het drinkpunt vanaf dag '+d.ready+'. Klaar om van te genieten; blijft verbeteren tot ~dag '+d.peak+'.')))
              :(d.phase==='declining'?('~'+d.aged+' days old — this style is typically best before ~day '+d.max+'. No guarantee quality is dropping, but it\'s a good time to taste and not wait much longer.')
                        :d.phase==='peak'?('This '+bev+' is ~'+d.aged+' days old — this is its expected peak window (~day '+d.peak+' to '+d.max+'). This is the best time to enjoy it.')
                        :(d.approaching?('~'+d.aged+' days old — approaching its peak window around day '+d.peak+'. A great time to taste.')
                                       :('~'+d.aged+' days old — past the drink-from point at day '+d.ready+'. Ready to enjoy; keeps improving toward ~day '+d.peak+'.')))};
    })(),
    'fructose-stall-risk':{icon:'🍯',
      title:nl?'Risico op fructose-stall':'Fructose-stall risk',
      reason:nl?('Deze honing ('+(d.honey||'?')+') is fructoserijk en je gist is niet fructofiel — de klassieke oorzaak van een late stall vlak vóór het einde. Houd voeding en temperatuur op orde; bij een stall herstart je met een fructofiele gist (bv. K1-V1116).')
              :('This honey ('+(d.honey||'?')+') is high in fructose and your yeast isn\'t fructophilic — the classic cause of a late stall near the very end. Keep nutrients and temperature on point; if it stalls, restart with a fructophilic yeast (e.g. K1-V1116).')},
    'ingredient-notes':(function(){
      var yn=_advYeastName(d.yeast);
      var lines=(d.notes||[]).map(function(n){
        if(n.type==='flavor-mismatch')return nl?((yn||'Deze gist')+' gist expressief — dat kan de subtiele smaak van '+(d.honey||'deze honing')+' overstemmen.')
                                                :((yn||'This yeast')+' ferments expressively — it can overpower '+(d.honey||'this honey')+'\'s more delicate character.');
        if(n.type==='nitrogen-contribution')return nl?((d.honey||'Deze honing')+' draagt van nature wat meer eigen stikstof bij — je voedingsschema kan daardoor iets lichter uitvallen dan gemiddeld.')
                                                      :((d.honey||'This honey')+' naturally carries a bit more of its own nitrogen — your nutrient schedule may run slightly lighter than average as a result.');
        return '';
      }).filter(Boolean);
      return {icon:'🔗',
        title:nl?'Honing × gist notitie':'Honey × yeast note',
        reason:lines.join(' ')};
    })(),
    'record-og':{icon:'📋',
      title:nl?'Leg de begin-SG (OG) vast':'Record the starting gravity (OG)',
      reason:nl?('Er is geen OG vastgelegd voor deze partij. Zonder OG kan de adviseur geen vergisting, alcohol of prognose berekenen — vul de OG in bij je eerste meting.')
              :('No OG is recorded for this batch. Without it the advisor can\'t compute attenuation, ABV or the projection — add the OG with your first reading.')},
    'headspace':{icon:'🛢',
      title:nl?'Beperk de kopruimte':'Minimise headspace',
      reason:nl?('De hoofdgisting is voorbij en de partij rijpt nu rustig. Hevel over op een vat dat tot net onder de stop gevuld is, of top bij — zo beperk je zuurstofcontact en oxidatie tijdens het rijpen.')
              :('Primary is over and the batch is conditioning quietly. Rack into a vessel filled to just below the bung, or top up — this limits oxygen contact and oxidation during aging.')},
    'cold-crash':(function(){
      var bev=_advBevWord(d,nl);
      return {icon:'🔍',
      title:nl?'Koud klaren vóór bottelen':'Cold-crash to clear',
      reason:nl?('De gisting is bijna klaar. Laat de '+bev+' klaren — koud wegzetten (cold-crash) of simpelweg tijd trekt gist en fijne deeltjes naar de bodem voor een heldere, schonere '+bev+'. Hevel daarna van de droesem.')
              :('Fermentation is nearly done. Let the '+bev+' clear — a cold-crash (or simply time) drops yeast and fine particles to the bottom for a bright, cleaner '+bev+'. Then rack off the sediment.')};
    })(),
    'ph-low':(function(){
      var isCider=d.beverageType==='cider';
      var band=(d.low!=null&&d.high!=null)?(d.low.toFixed(1)+'–'+d.high.toFixed(1)):(isCider?'3.3–3.8':'3.0–3.4');
      var bandNl=band.replace(/\./g,',');
      return {icon:'🧪',
      title:nl?'pH is laag'+(isCider?'':' — gist onder stress'):('pH is low'+(isCider?'':' — yeast under stress')),
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt onder de bandbreedte voor '+(isCider?'cider':'mede')+' ('+bandNl+'). '+(isCider?'Dit is vooral scherper van smaak, geen directe giststress.':'Onder 2,9 raakt de gist gestrest, wat tot een trage of vastgelopen gisting kan leiden. Overweeg de pH te verhogen met kaliumcarbonaat.'))
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is below the target band for '+(isCider?'cider':'mead')+' ('+band+'). '+(isCider?'This mostly just reads sharper/tarter — not the yeast-stress signal it would be in mead.':'Below 2.9, yeast becomes stressed, which can slow or stall fermentation. Consider raising pH with potassium carbonate.'))};
    })(),
    'ph-high':(function(){
      var isCider=d.beverageType==='cider';
      var band=(d.low!=null&&d.high!=null)?(d.low.toFixed(1)+'–'+d.high.toFixed(1)):(isCider?'3.3–3.8':'3.0–3.4');
      var bandNl=band.replace(/\./g,',');
      var bev=isCider?'cider':'mede';
      return {icon:'🧪',
      title:nl?'pH is hoog — besmettingsrisico':'pH is high — contamination risk',
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt boven de bandbreedte voor '+bev+' ('+bandNl+'). Hierboven wordt de '+bev+' kwetsbaarder voor ongewenste micro-organismen.'+(isCider?' Zorg dat je bij het rekken op tijd metabisulfiet toevoegt — zeker bij perry, waar een te hoge pH ook het risico op ongewenste malolactische omzetting (naar azijnzuur) vergroot.':' Overweeg bij te sturen met wijnzuur.'))
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is above the target band for '+(isCider?'cider':'mead')+' ('+band+'). Above this, the '+bev+' becomes more vulnerable to unwanted microorganisms.'+(isCider?' Make sure to sulfite promptly at racking — especially for perry, where a high pH also raises the risk of unwanted malolactic conversion (to acetic acid).':' Consider adjusting with tartaric or citric acid.'))};
    })(),
    'mlf-advisory':(function(){
      var avoid=d.stance==='avoid', perry=!!d.isPerry;
      return {icon:perry?'⚠':'🧪',
      title:nl?(avoid?(perry?'MLF vermijden — azijnzuurrisico':'MLF vermijden voor deze stijl'):'MLF is traditioneel voor deze stijl')
             :(avoid?(perry?'Avoid MLF — vinegar risk':'Avoid MLF for this style'):'MLF is traditional for this style'),
      reason:nl?(perry?'Perry is een bijzonder geval: het citroenzuur van peren zet onder malolactische gisting (MLF) om in azijnzuur (azijnsmaak) in plaats van het boterachtige resultaat dat cider van appels krijgt. Voeg metabisulfiet toe zodra de hoofdgisting klaar is — wacht hier niet mee zoals je bij een Engelse cider misschien zou doen.'
                  :avoid?'Voor deze stijl is MLF ongewenst — het kan botergeur/-smaak geven die niet bij het profiel past. Stabiliseer met metabisulfiet zodra de gisting klaar is om malolactische bacteriën te onderdrukken.'
                  :'Deze stijl staat traditioneel malolactische gisting (MLF) toe voor een zachtere zuurgraad en een boterachtig/kruidig karakter. Wacht met sulfiet toevoegen als je dit wilt proberen, of stabiliseer meteen voor een schoner, helderder resultaat.')
              :(perry?'Perry is a special case: pear\'s citric acid converts to acetic acid (vinegar character) under malolactic fermentation (MLF), rather than the buttery result apple cider gets. Add metabisulfite promptly once primary fermentation finishes — don\'t hold off the way you might with an English cider.'
                  :avoid?'MLF isn\'t wanted for this style — it can add a buttery character that clashes with the intended profile. Stabilise with metabisulfite once fermentation finishes to suppress malolactic bacteria.'
                  :'This style traditionally allows malolactic fermentation (MLF) for softer acidity and a buttery/spicy character. Hold off on sulfite if you want to try it, or stabilise right away for a cleaner, brighter result instead.')};
    })(),
    'carbonation-developing':{icon:'🫧',
      title:nl?'Carbonatie bouwt zich op':'Carbonation is developing',
      reason:nl?('Gebotteld ~'+d.aged+' dagen geleden. Bottelrijping duurt doorgaans 2–3 weken — bewaar de flessen rechtop op kamertemperatuur zodat de gist de priming-suiker kan vergisten. Koel pas vlak voor het proeven.')
              :('Bottled ~'+d.aged+' days ago. Bottle-conditioning typically takes 2–3 weeks — store the bottles upright at room temperature so the yeast can ferment the priming sugar. Chill only just before tasting.')},
    'blowoff-risk':{icon:'🪣',
      title:nl?'Weinig ruimte boven de must — blow-off-risico':'Little headspace above the must — blow-off risk',
      reason:nl?('Deze partij ('+(d.volume||'?')+' L) laat maar ~'+d.headspacePct+'% lucht over in het vat ('+(d.capacity||'?')+' L). Tijdens de krachtigste fase van de gisting kan schuim/krausen via het waterslot naar buiten geduwd worden. Overweeg een groter vat, of leg een schaal onder het waterslot.')
              :('This batch ('+(d.volume||'?')+' L) leaves only ~'+d.headspacePct+'% air space in the vessel ('+(d.capacity||'?')+' L). During the most vigorous phase of fermentation, foam/krausen can push out through the airlock. Consider a larger vessel, or set a tray underneath to catch any blow-off.')},
    'fermenting-long':(function(){
      var bevPl=d.beverageType==='cider'?(nl?'ciders':'ciders'):(nl?'mede':'meads');
      return {icon:'⏳',
      title:nl?'Duurt langer dan verwacht':'Taking longer than expected',
      reason:nl?((_advYeastName(d.yeast)||'Deze gist')+' gist doorgaans in '+d.low+'–'+d.high+' dagen voor dit recept; deze partij zit al op dag '+d.days+'. Dat is niet per se een probleem — sommige '+bevPl+' rijpen gewoon trager — maar het is de moeite waard om temperatuur en voeding nog eens te checken als dit je verrast.')
              :((_advYeastName(d.yeast)||'This yeast')+' typically finishes in '+d.low+'–'+d.high+' days for this recipe; this batch is at day '+d.days+'. That\'s not necessarily a problem — some '+bevPl+' simply run slower — but worth double-checking temperature and nutrients if this surprises you.')};
    })(),
    'historical-pace':(function(){
      var yn=_advYeastName(d.yeast);
      var matchTxt=d.matchedOn==='recipe'?(nl?'dit recept':'this recipe')
        :d.matchedOn==='yeast-honey'?((yn||(nl?'deze gist':'this yeast'))+' + '+(d.honey||(nl?'deze honing':'this honey')))
        :(nl?'deze gist':'this yeast');
      var ratingTxt=(d.avgRating!=null)?(nl?(' en gemiddeld beoordeeld met '+d.avgRating+'/5'):(' and rated ~'+d.avgRating+'/5 on average')):'';
      var pctTxt=(d.avgDays>0)?(nl?(' ('+Math.round((d.daysSoFar/d.avgDays-1)*100)+'% t.o.v. gemiddeld)'):(' ('+Math.round((d.daysSoFar/d.avgDays-1)*100)+'% vs. average)')):'';
      return {icon:'📊',
        title:nl?'Vergeleken met je eigen partijen':'Compared to your own batches',
        reason:nl?('Je vorige '+d.sampleSize+' partijen met '+matchTxt+' deden er gemiddeld ~'+d.avgDays+' dagen over'+ratingTxt+'. Deze partij zit nu op dag '+d.daysSoFar+pctTxt+'.')
                  :('Your last '+d.sampleSize+' batches with '+matchTxt+' took ~'+d.avgDays+' days on average'+ratingTxt+'. This batch is currently at day '+d.daysSoFar+pctTxt+'.')};
    })(),
    'extended-bulk-aging':(function(){
      var bev=_advBevWord(d,nl);
      return {icon:'🛢',
      title:nl?'Al lang niet gebotteld':'Sitting unbottled a long time',
      reason:nl?('Deze partij zit al ~'+d.days+' dagen in bulkrijping zonder gebotteld te zijn'+(d.target?(' — dit recept mikt doorgaans op ~'+d.target+' dagen bulkrijping'):'')+'. Elke keer dat het vat geopend of verplaatst wordt, is er kans op zuurstofcontact — bottelen (ook al is de '+bev+' nog jong) sluit dat risico af. Overweeg binnenkort te bottelen.')
              :('This batch has been sitting in bulk aging for ~'+d.days+' days without being bottled'+(d.target?(' — this recipe typically targets ~'+d.target+' days of bulk aging'):'')+'. Every time the vessel is opened or moved there\'s a chance of oxygen exposure — bottling (even if the '+bev+' is still young) closes off that risk. Consider bottling soon.')};
    })()
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

// "Evidence", not "confidence" — a rule-based advisor isn't estimating a
// probability, it's reporting how much signal backs a conclusion. A numeric
// percentage ("83%") implies precision this system doesn't have; a band
// backed by the actual reasons (_advConfidenceText) is the honest version.
function _advEvidenceBand(value){
  var nl=_advNL();
  var v=value||0;
  if(v>=0.75)return nl?'Sterk':'Strong';
  if(v>=0.55)return nl?'Redelijk':'Moderate';
  return nl?'Beperkt':'Limited';
}
// Small ↑/↓ trend chip for the health score (vs the previous reading).
function _advTrendChip(trend){
  if(trend==null||trend===0)return '';
  var up=trend>0;
  return '<span style="font-size:12px;color:'+(up?'var(--green2)':'var(--red2)')+';margin-left:4px">'+(up?'▲':'▼')+Math.abs(trend)+'</span>';
}

// Renders mwBatchNarrative()'s beats as a compact timeline — the ONLY place
// a beat type becomes a sentence (localized here, like every other advisor
// string). Empty beats list (e.g. no logs yet) renders nothing.
function renderBatchNarrative(b){
  var nl=_advNL();
  var beats=(typeof mwBatchNarrative==='function')?mwBatchNarrative(b):[];
  if(!beats.length)return '';
  function line(beat){
    var d=beat.data||{};
    var text={
      started:nl?('Gestart'+(d.og?(' op OG '+d.og.toFixed(3)):'')+(d.yeast?(' met '+(_advYeastName(d.yeast)||d.yeast)):''))
                :('Started'+(d.og?(' at OG '+d.og.toFixed(3)):'')+(d.yeast?(' with '+(_advYeastName(d.yeast)||d.yeast)):'')),
      'sugar-break':nl?('1/3-suikerbreuk bereikt (dichtheid '+(d.gravity!=null?d.gravity.toFixed(3):'?')+')'):('Crossed the 1/3 sugar break (gravity '+(d.gravity!=null?d.gravity.toFixed(3):'?')+')'),
      addition:nl?('Toegevoegd: '+(d.item||'?')+(d.amount?(' ('+d.amount+')'):'')):('Added: '+(d.item||'?')+(d.amount?(' ('+d.amount+')'):'')),
      plateau:nl?('Dichtheid vlak sinds hier — '+d.days+' dagen '+(d.beforeBreak?'vóór de suikerbreuk (ongebruikelijk)':'rond/na de suikerbreuk (normaal)'))
                :('Gravity flat from here — '+d.days+' days '+(d.beforeBreak?'before the sugar break (unusual)':'around/after the sugar break (normal)')),
      bottled:nl?('Gebotteld'+(d.fg!=null?(' op FG '+d.fg.toFixed(3)):'')+(d.abv!=null?(' · '+d.abv+'% ABV'):''))
                :('Bottled'+(d.fg!=null?(' at FG '+d.fg.toFixed(3)):'')+(d.abv!=null?(' · '+d.abv+'% ABV'):''))
    }[beat.type]||'';
    if(!text)return '';
    return '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);white-space:nowrap;padding-top:1px">'+escHtml(fmtDate(beat.date))+'</div>'
      +'<div style="font-size:12.5px;color:var(--text2)">'+escHtml(text)+'</div></div>';
  }
  var rows=beats.map(line).join('');
  if(!rows)return '';
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'📜 VERHAAL VAN DEZE BATCH':'📜 BATCH STORY')+'</div></div>'+rows+'</div>';
}

// "Why this matters" (E12): a short benefit/downside line for a recommendation
// id. Deliberately covers only the ACTIONABLE ids (rendered at the call site
// only when the item's current severity is critical/recommended) — adding
// this to every info/reassurance note as well would make every observation
// feel equally urgent, the exact "too helpful" trap flagged in the review
// that prompted E8's triage. Pure lookup, no domain change.
function _advWhyMatters(id){
  var nl=_advNL();
  var M=nl?{
    stalled:{benefit:'Op tijd ingrijpen kan de gisting redden.',downside:'Wachten kan leiden tot een blijvend vastgelopen gisting of bederf.'},
    'nutrient-final':{benefit:'Op tijd voeden houdt de gistpopulatie gezond.',downside:'Te laat voeden geeft giststress (fuselalcoholen); vóedén ná de suikerbreuk voedt juist bederforganismen in plaats van de gist.'},
    'aerate-now':{benefit:'Zuurstof nu ondersteunt een gezonde groeifase van de gist.',downside:'Wachten beperkt de gistgroei en kan de gisting verzwakken.'},
    'oxygen-stop':{benefit:'Nu stoppen met beluchten voorkomt oxidatie.',downside:'Doorgaan met beluchten verhoogt het risico op oxidatie en muffe smaken.'},
    'stabilise-first':{benefit:'Stabiliseren vóór het bottelen voorkomt een herstart in de fles.',downside:'Overslaan kan leiden tot koolzuuropbouw en zelfs exploderende flessen.'},
    temperature:{benefit:'Temperatuur bijstellen houdt de gist in zijn beste bereik.',downside:'Buiten bereik blijven kan de gisting vertragen of ongewenste smaken geven.'},
    'ph-low':{benefit:'Nu weten waar je pH staat helpt je beslissen of bijsturen nodig is.',downside:'Genegeerd kan een lage pH bij mede tot giststress en een vastgelopen gisting leiden.'},
    'record-og':{benefit:'Met een OG kan de adviseur al het overige doorrekenen.',downside:'Zonder OG blijft de adviseur blind voor vergisting, alcohol en prognose.'},
    'log-reading':{benefit:'Een nieuwe meting houdt het advies scherp.',downside:'Te lang niet meten laat problemen ongemerkt doorlopen.'},
    'blowoff-risk':{benefit:'Nu voorzorg nemen voorkomt een rommelige overloop.',downside:'Negeren kan schuim/most naar buiten drukken en een besmettingsrisico geven.'},
    'ferment-complete':{benefit:'Op tijd rackken/bottelen beperkt verdere zuurstofblootstelling.',downside:'Te lang wachten verlengt onnodig luchtcontact in het vat.',
      considerWaitingIf:'je hem bewust nog even op de gistdroesem laat liggen voor extra body of mondgevoel.'},
    'extended-bulk-aging':{benefit:'Binnenkort bottelen sluit verder zuurstofcontact bij het openen/verplaatsen van het vat af.',downside:'Langer wachten herhaalt dat oxidatierisico elke keer dat het vat verstoord wordt.',
      considerWaitingIf:'je bewust een langere bulk- of vatrijping aanhoudt die bij deze stijl hoort.'},
    'mlf-advisory':{benefit:'Nu beslissen over sulfiteren voorkomt een onbedoeld resultaat.',downside:'Niets doen laat de malolactische uitkomst aan het toeval over — bij perry riskeert dat een azijnachtige cider.'}
  }:{
    stalled:{benefit:'Acting now can rescue the fermentation.',downside:'Waiting risks a permanently stuck fermentation or spoilage.'},
    'nutrient-final':{benefit:'Feeding on time keeps the yeast population healthy.',downside:'Feeding too late causes yeast stress (fusel alcohols); feeding after the sugar break instead feeds spoilage organisms rather than the yeast.'},
    'aerate-now':{benefit:'Oxygen now supports a healthy yeast growth phase.',downside:'Waiting limits yeast growth and can weaken the fermentation.'},
    'oxygen-stop':{benefit:'Stopping aeration now avoids oxidation.',downside:'Continuing to aerate raises the risk of oxidation and stale flavors.'},
    'stabilise-first':{benefit:'Stabilising before bottling prevents a restart in the bottle.',downside:'Skipping it risks carbonation buildup and even bottle bombs.'},
    temperature:{benefit:'Adjusting temperature keeps the yeast in its best range.',downside:'Staying out of range can slow fermentation or produce off-flavors.'},
    'ph-low':{benefit:'Knowing where your pH stands now helps you decide whether adjusting is worth it.',downside:'Ignored, a low pH in mead can cause yeast stress and a stalled fermentation.'},
    'record-og':{benefit:'With an OG, the advisor can compute everything else.',downside:'Without it, the advisor stays blind to attenuation, ABV and the projection.'},
    'log-reading':{benefit:'A fresh reading keeps the advice sharp.',downside:'Going too long without one lets problems go unnoticed.'},
    'blowoff-risk':{benefit:'Taking precaution now avoids a messy blow-off.',downside:'Ignoring it can push foam/must out and risk contamination.'},
    'ferment-complete':{benefit:'Racking/bottling promptly limits further oxygen exposure.',downside:'Waiting too long extends unnecessary air contact in the vessel.',
      considerWaitingIf:'you\'re intentionally leaving it on the yeast lees a while longer for extra body or mouthfeel.'},
    'extended-bulk-aging':{benefit:'Bottling soon closes off further oxygen exposure from opening or moving the vessel.',downside:'Waiting longer repeats that oxidation risk every time the vessel is disturbed.',
      considerWaitingIf:'you\'re deliberately doing an extended bulk- or barrel-aging style that calls for more time before bottling.'},
    'mlf-advisory':{benefit:'Deciding on sulfite timing now avoids an unintended result later.',downside:'Leaving it to chance lets the malolactic outcome go unmanaged — for perry that risks a vinegary cider.'}
  };
  return M[id]||null;
}

// What-if simulator (E7): a small, curated set of scenarios rather than a
// raw signal editor — each maps a plain-language question to the exact
// override mwWhatIf() needs. Kept in the view layer since picking WHICH
// scenarios are worth asking is a UI/UX call, not a domain fact.
function _advWhatIfScenarios(s){
  var nl=_advNL();
  var out=[];
  if(!s.nutrientsComplete)out.push({key:'nutrients',label:nl?'Als de voeding compleet was?':'What if nutrients were complete?',override:{nutrientsComplete:true}});
  if(s.tempInRange===false)out.push({key:'temp',label:nl?'Als de temperatuur in bereik was?':'What if temperature were in range?',override:{tempInRange:true,latestTemp:mwRound(((s.tempLow||16)+(s.tempHigh||24))/2,1)}});
  return out;
}
function renderWhatIfCard(b){
  var nl=_advNL();
  var s=(typeof mwBatchSignals==='function')?mwBatchSignals(b):null;
  if(!s||!s.active)return '';
  var scenarios=_advWhatIfScenarios(s);
  if(!scenarios.length)return '';
  var btns=scenarios.map(function(sc){return '<button class="btn btn-secondary btn-sm" onclick="advisorRunWhatIf(\''+b.id+'\',\''+sc.key+'\')" style="margin:3px 6px 3px 0">'+escHtml(sc.label)+'</button>';}).join('');
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🔮 WAT ALS...':'🔮 WHAT IF...')+'</div></div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:8px">'+(nl?'Simuleert alleen — verandert niets aan je partij.':'Simulates only — changes nothing about your batch.')+'</div>'
    +btns+'<div id="whatif-result-'+b.id+'" style="margin-top:8px"></div></div>';
}
// Re-runs the scenario and writes the diff straight into the result div —
// same plain-onclick + direct-DOM-write pattern used elsewhere in the app
// (e.g. wizUpdateMath()), no framework needed for this small a UI.
function advisorRunWhatIf(batchId,key){
  var b=((typeof APP!=='undefined'&&APP.batches)||[]).find(function(x){return x.id===batchId;});
  var el=document.getElementById('whatif-result-'+batchId);
  if(!b||!el)return;
  var s=mwBatchSignals(b);
  var sc=_advWhatIfScenarios(s).filter(function(x){return x.key===key;})[0];
  if(!sc)return;
  var nl=_advNL();
  var diff=mwWhatIf(b,sc.override);
  var lines=[];
  if(diff.resolved.length)lines.push((nl?'✓ Zou oplossen: ':'✓ Would resolve: ')+diff.resolved.join(', '));
  if(diff.newlyAppeared.length)lines.push((nl?'⚠ Zou nieuw verschijnen: ':'⚠ Would newly appear: ')+diff.newlyAppeared.join(', '));
  if(diff.changed.length)lines.push((nl?'↕ Zou wijzigen: ':'↕ Would change: ')+diff.changed.map(function(c){return c.id+' ('+c.from+'→'+c.to+')';}).join(', '));
  if(!lines.length)lines.push(nl?'Geen verschil in het advies.':'No difference in the advice.');
  el.innerHTML='<div style="font-size:12.5px;color:var(--text2);line-height:1.6;padding:8px 10px;background:var(--bg3);border-radius:var(--radius)">'+lines.map(escHtml).join('<br>')+'</div>';
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
  // ---- Overall summary: the "at a glance" line every other section elaborates
  // on. Counts by severity, not raw item text — this is the one line meant to
  // answer "what should I do next?" in a few seconds.
  var sevCounts={critical:0,recommended:0,info:0};
  adv.items.forEach(function(it){sevCounts[it.severity]=(sevCounts[it.severity]||0)+1;});
  var sumParts=[];
  if(sevCounts.critical)sumParts.push(sevCounts.critical+' '+(nl?(sevCounts.critical>1?'acties':'actie'):(sevCounts.critical>1?'actions':'action')));
  if(sevCounts.recommended)sumParts.push(sevCounts.recommended+' '+(nl?'om te volgen':'to watch'));
  if(sevCounts.info)sumParts.push(sevCounts.info+' '+(nl?(sevCounts.info>1?'inzichten':'inzicht'):(sevCounts.info>1?'insights':'insight')));
  // The reassuring case gets a warmer sentence, not just a label — brewing
  // carries enough anxiety on its own; "nothing needs your attention today"
  // reads calmer than a bare "✓ Everything looks good".
  var summaryLine=sumParts.length
    ?('<div style="font-size:13.5px;color:var(--text2);margin-top:10px">'+sumParts.join(' · ')+'</div>')
    :('<div style="font-size:13.5px;color:var(--green2);margin-top:10px">✓ '+(nl?'Verloopt normaal — niets vraagt vandaag je aandacht.':'Progressing normally — nothing needs your attention today.')+'</div>');
  var healthCard='<div class="card" style="margin-bottom:16px;border-left:3px solid '+hm.c+'">'
    +'<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
    +'<div style="text-align:center;min-width:96px"><div style="font-family:var(--font-display);font-size:42px;line-height:1;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+_advTrendChip(h&&h.trend)+'</div>'
    +'<div class="micro-label" style="margin-top:4px">'+(nl?'GEZONDHEID':'HEALTH')+'</div>'
    +'<div style="font-family:var(--font-display);font-size:14px;color:'+hm.c+';margin-top:2px">'+hm.l+'</div></div>'
    +'<div style="flex:1;min-width:220px">'+bars+'</div>'
    +'</div>'
    +summaryLine
    +(confTxt?'<div style="font-size:11px;color:var(--text3);margin-top:6px;font-style:italic">'+(nl?'Bewijs: ':'Evidence: ')+_advEvidenceBand(adv.confidence)+' — '+(nl?'op basis van':'based on')+' '+escHtml(confTxt)+'</div>':'')
    +'</div>';

  // ---- Readiness ("can I drink it yet?") ----
  var readyCard='';
  if(r){
    var phaseL={fermenting:nl?'Gistend':'Fermenting',aging:nl?'Verbetert nog':'Improving',ready:nl?'Klaar om te drinken':'Drink now',peak:nl?'Piekvenster':'Peak window',declining:nl?'Voorbij de piek':'Past peak',failed:nl?'Mislukt':'Failed'}[r.phase]||r.phase;
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

  // ---- Progress band: where THIS batch's elapsed days sit vs. the expected
  // range — a position, not a modeled curve. Deliberately never claims a
  // single "correct" day (brewing varies too much for that); it only ever
  // reports ahead/on-track/watch/behind against a real low-high range.
  var progressCard='';
  if(s&&s.fermentProgress){
    var fp=s.fermentProgress;
    var bandMeta={
      ahead:{c:'var(--green2)',l:nl?'Vroeg — nog niets om je zorgen over te maken':'Early — nothing to flag yet'},
      'on-track':{c:'var(--green2)',l:nl?'Binnen het verwachte bereik':'Within the expected range'},
      watch:{c:'var(--gold2)',l:nl?'Iets trager dan verwacht — het in de gaten houden waard':'A bit slower than expected — worth watching'},
      behind:{c:'var(--red2)',l:nl?'Buiten het verwachte bereik — check temperatuur en voeding':'Outside the expected range — check temperature and nutrients'}
    }[fp.phase];
    var scale=Math.max(fp.high*1.15,fp.days)*1.1||1;
    var lowPct=Math.min(100,fp.low/scale*100), highPct=Math.min(100,fp.high/scale*100), markerPct=Math.min(100,fp.days/scale*100);
    progressCard='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'📈 VOORTGANG':'📈 PROGRESS')+'</div>'
      +'<div style="font-family:var(--font-display);font-size:14px;color:'+bandMeta.c+'">'+(nl?'Dag ':'Day ')+fp.days+'</div></div>'
      +'<div style="position:relative;height:10px;background:var(--bg4);border-radius:5px;margin:8px 0 8px">'
      +'<div style="position:absolute;left:'+lowPct+'%;width:'+(highPct-lowPct)+'%;height:100%;background:rgba(122,184,130,0.35);border-radius:5px" title="'+(nl?'Verwacht bereik':'Expected range')+'"></div>'
      +'<div style="position:absolute;left:calc('+markerPct+'% - 4px);top:-3px;width:8px;height:16px;background:'+bandMeta.c+';border-radius:3px" title="'+(nl?'Nu':'Now')+'"></div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--text3)">'+(nl?'Verwacht ':'Expected ')+fp.low+'–'+fp.high+(nl?' dagen (typisch ~':' days (typical ~')+fp.expected+(nl?')':')')+'</div>'
      +'<div style="font-size:12px;margin-top:4px"><strong style="color:'+bandMeta.c+'">'+bandMeta.l+'</strong></div>'
      +'</div>';
  }

  // ---- Recommendations: Actions / Watch / Insights (E13 information
  // hierarchy) — grouped by severity instead of a flat list + arbitrary cap.
  // Actions and Watch stay fully visible (that's what the summary line above
  // just counted); Insights collapses by default since it's reassurance/
  // context, not something waiting on the brewer.
  var recHtml='';
  if(adv.items.length){
    var catCounts={},catOrder=[];
    adv.items.forEach(function(it){var c=it.category||'data';if(catCounts[c]==null){catCounts[c]=0;catOrder.push(c);}catCounts[c]++;});
    var catStrip=catOrder.length>1?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:11px">'+catOrder.map(function(c){var cm=_advCategoryMeta(c);return '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:2px 9px">'+cm.icon+' '+escHtml(cm.label)+' '+catCounts[c]+'</span>';}).join('')+'</div>':'';
    var actionItems=adv.items.filter(function(i){return i.severity==='critical';});
    var watchItems=adv.items.filter(function(i){return i.severity==='recommended';});
    var insightItems=adv.items.filter(function(i){return i.severity==='info';});
    // E8: verbosity persona controls density — 'pro' drops the prose (title +
    // chips only), 'beginner' always gets the why-it-matters line (not just
    // for critical/recommended), 'experienced' (default) is today's behaviour.
    var verbosity=(APP.settings&&APP.settings.advisorVerbosity)||'experienced';
    function itemCard(it){
      var t=_advItemText(it), sm=_advSeverityMeta(it.severity), cm=_advCategoryMeta(it.category);
      var evidence=_advEvidenceBand(it.confidence);
      var showProse=verbosity!=='pro';
      // E12: only actionable severities get a "why it matters" line by default
      // — an info note doesn't need one — except the 'beginner' persona, which
      // always wants the extra context.
      var wantsWhy=verbosity==='beginner'||it.severity==='critical'||it.severity==='recommended';
      var why=(showProse&&wantsWhy)?_advWhyMatters(it.id):null;
      // E13: "consider waiting if" is optional by design — only ids with a
      // genuine legitimate opposite case carry it (see _advWhyMatters). Most
      // actionable items correctly render nothing here.
      var waitHtml=(why&&why.considerWaitingIf)?('<div style="font-size:11.5px;color:var(--text3);margin-top:4px">'
        +'<span style="color:var(--gold2)">'+(nl?'Overweeg te wachten als':'Consider waiting if')+':</span> '+escHtml(why.considerWaitingIf)+'</div>'):'';
      var whyHtml=why?('<div style="font-size:11.5px;color:var(--text3);margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)">'
        +'<span style="color:var(--green2)">✓ '+(nl?'Waarom het uitmaakt':'Why it matters')+':</span> '+escHtml(why.benefit)+' '
        +'<span style="color:var(--red2)">'+(nl?'Bij negeren':'If ignored')+':</span> '+escHtml(why.downside)+'</div>'+waitHtml):'';
      return '<div style="background:'+sm.bg+';border-left:3px solid '+sm.color+';border-radius:var(--radius);padding:11px 13px;margin-bottom:8px">'
        +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:3px">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:'+sm.color+'">'+t.icon+' '+escHtml(t.title)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:0.5px">'+cm.icon+' '+escHtml(cm.label)+' · '+sm.label+' · '+(nl?'bewijs':'evidence')+' '+evidence+'</div></div>'
        +(showProse?'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(t.reason)+'</div>'+whyHtml:'')+'</div>';
    }
    var actionsSection=actionItems.length?('<div class="micro-label" style="color:var(--red2);margin-bottom:6px">'+(nl?'ACTIES':'ACTIONS')+'</div>'+actionItems.map(itemCard).join('')):'';
    var watchSection=watchItems.length?('<div class="micro-label" style="color:var(--gold2);margin:'+(actionItems.length?'14px':'0')+' 0 6px">'+(nl?'OM TE VOLGEN':'WATCH')+'</div>'+watchItems.map(itemCard).join('')):'';
    var insightsSection=insightItems.length?('<details style="margin-top:'+(actionItems.length||watchItems.length?'14px':'0')+'"><summary style="cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:4px 0;user-select:none">'
      +'💡 '+insightItems.length+' '+(nl?(insightItems.length>1?'inzichten':'inzicht'):(insightItems.length>1?'insights':'insight'))+'</summary>'+insightItems.map(itemCard).join('')+'</details>'):'';
    recHtml=catStrip+actionsSection+watchSection+insightsSection;
  }
  // No separate "everything looks good" box — the health hero's summary line
  // already said that. Repeating it one card down is the exact "same thing
  // twice" redundancy the E13 wording pass was meant to catch.
  var recCard=adv.items.length?('<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'🧭 ADVIES':'🧭 RECOMMENDATIONS')+'</div></div>'+recHtml+'</div>'):'';

  // ---- Folded-in Brew Coach: today's actions + upcoming ----
  var d=(typeof daysSince==='function')?daysSince(b.startDate):0;
  var tasks=(typeof getTasksForBatch==='function')?getTasksForBatch(b):[];
  var todayTasks=tasks.filter(function(t){return t.isDue||t.isOverdue||t.doneToday;});
  var upcoming=tasks.filter(function(t){return t.isFuture;}).slice(0,5);
  function _coachDayLabel(td){
    return td.isDue?(nl?' (VANDAAG)':' (TODAY)'):(td.isOverdue?(nl?' ('+fmtDuration(td.daysFromDue)+' te laat — NU DOEN)':' ('+fmtDuration(td.daysFromDue)+' overdue — DO NOW)'):td.done?(nl?' (gedaan)':' (done)'):(nl?' (over '+fmtDuration(-td.daysFromDue)+')':' (in '+fmtDuration(-td.daysFromDue)+')'));
  }
  function _coachFullBox(td){
    var overdue=td.isOverdue;
    return '<div class="coach-box" style="margin-bottom:12px'+(overdue?';border-color:var(--red);border-left:4px solid var(--red2)':'')+'"><div class="coach-title"'+(overdue?' style="color:var(--red2)"':'')+'>'+(overdue?'⚠':'⚗')+' '+(nl?'ACTIE VEREIST — DAG ':'ACTION DUE — DAY ')+td.day+_coachDayLabel(td)+'</div>'
      +'<div style="font-family:var(--font-display);font-size:15px;color:'+(overdue?'var(--red2)':'var(--gold2)')+';margin-bottom:8px">'+escHtml(typeof stepTitleL==='function'?stepTitleL(td.title):td.title)+'</div>'
      +'<div class="coach-text">'+escHtml(typeof stepDescL==='function'?stepDescL(td.desc):td.desc)+'</div>'
      +'<div class="coach-tasks" style="margin-top:12px"><div class="coach-task"><div class="task-cb '+(td.done?'checked':'')+'" onclick="toggleTask(\''+td.id+'\',this)">'+(td.done?'✓':'')+'</div><span style="font-size:13px">'+(td.done?(nl?'Vandaag gedaan — vink uit indien niet':'Done today — uncheck if not'):(nl?'Markeer als gedaan':'Mark as completed'))+'</span></div></div></div>';
  }
  // A brewer who's fallen behind on several steps needs a checklist to catch
  // up, not N identical full-height red boxes stacked down the page — only
  // the single most-due step gets the full instructional card; the rest
  // collapse into compact rows (mirrors the Insights <details> treatment above).
  function _coachRow(td){
    var overdue=td.isOverdue;
    return '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">'
      +'<div class="task-cb '+(td.done?'checked':'')+'" onclick="toggleTask(\''+td.id+'\',this)" style="margin-top:2px;flex-shrink:0">'+(td.done?'✓':'')+'</div>'
      +'<div style="flex:1;font-size:13px;color:'+(overdue?'var(--red2)':'var(--text)')+'">'+(nl?'Dag ':'Day ')+td.day+' · '+escHtml(typeof stepTitleL==='function'?stepTitleL(td.title):td.title)+_coachDayLabel(td)+'</div></div>';
  }
  var sortedToday=todayTasks.slice().sort(function(a,b){return a.day-b.day;});
  var primaryTask=sortedToday[0], restTasks=sortedToday.slice(1);
  var actionsHtml=primaryTask?_coachFullBox(primaryTask):'<div class="info-box green" style="margin-bottom:12px"><div style="font-size:13px;color:var(--green2)">'+(nl?'✓ Geen stap-actie vandaag. Controleer waterslot en temperatuur.':'✓ No step due today. Check airlock water and temperature.')+'</div></div>';
  if(restTasks.length){
    actionsHtml+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:4px 0;user-select:none">'
      +'⏳ '+restTasks.length+' '+(nl?(restTasks.length>1?'andere openstaande stappen':'andere openstaande stap'):(restTasks.length>1?'other steps waiting':'other step waiting'))+'</summary>'
      +restTasks.map(_coachRow).join('')+'</details>';
  }
  var upcomingHtml='<div class="card"><div class="card-header"><div class="card-title">'+(nl?'KOMENDE STAPPEN':'UPCOMING STEPS')+'</div></div>'
    +(upcoming.length?upcoming.map(function(t){return '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);white-space:nowrap;padding-top:2px">'+(nl?'Dag ':'Day ')+t.day+'</div><div><div style="font-size:14px;color:var(--text)">'+escHtml(typeof stepTitleL==='function'?stepTitleL(t.title):t.title)+'</div><div style="font-size:12px;color:var(--text3);margin-top:2px">'+escHtml((typeof stepDescL==='function'?stepDescL(t.desc):t.desc).substring(0,110))+'…</div></div></div>';}).join(''):'<p style="color:var(--text3);font-style:italic;font-size:13px">'+(nl?'Geen stappen meer in het recept.':'No more steps in recipe.')+'</p>')
    +'</div>';
  var isCiderBatch=s&&s.beverageType==='cider';
  var wisdomFn=(isCiderBatch&&typeof getCiderWisdom==='function')?getCiderWisdom:getMeadWisdom;
  var wisdom=(typeof wisdomFn==='function')?wisdomFn(b,d):[];
  var wisdomHtml=wisdom.length?'<div class="card"><div class="card-header"><div class="card-title">'+(isCiderBatch?(nl?'WIJSHEID VAN DE CIDERMAKER':'CIDERMAKER\'S WISDOM'):(nl?'WIJSHEID VAN DE MEADMAKER':'MEADWRIGHT\'S WISDOM'))+'</div></div><div class="ornament">— ⬡ —</div>'
    +wisdom.map(function(tip){return '<div class="info-box" style="margin-bottom:8px"><div style="font-size:13px;color:var(--text2)">'+tip+'</div></div>';}).join('')+'</div>':'';

  // ---- Deep diagnostics (E13): the what-if simulator and general brewing
  // wisdom are exploratory/reference material, not something the brewer needs
  // to see on every visit — collapsed behind one expander rather than two
  // more always-open cards.
  var deepDiagBody=renderWhatIfCard(b)+wisdomHtml;
  var deepDiagHtml=deepDiagBody?('<details style="margin-bottom:16px"><summary style="cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:6px 0;user-select:none">'
    +(nl?'🔬 DIEPGAANDE DIAGNOSTIEK':'🔬 DEEP DIAGNOSTICS')+'</summary>'+deepDiagBody+'</details>'):'';

  return healthCard+readyCard+progressCard+finishCard+recCard+renderBatchNarrative(b)
    +actionsHtml+upcomingHtml+deepDiagHtml;
}
