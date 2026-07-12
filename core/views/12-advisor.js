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
        ph:nl?('De pH ('+(d.ph!=null?d.ph.toFixed(2):'?')+') ligt laag. Honing buffert nauwelijks — de pH kan tijdens de gisting ver dalen, en een lage pH stresst/stalt de gist op zichzelf. Buffer omhoog met kaliumcarbonaat.')
             :('pH ('+(d.ph!=null?d.ph.toFixed(2):'?')+') is low. Honey barely buffers at all — pH can swing a long way over the course of fermentation, and low pH alone stresses/stalls yeast. Buffer it back up with potassium carbonate.'),
        unknown:''
      }[d.cause]||'';
      // Weighted multi-cause (E2): mention a second contributing cause when it's
      // carrying real weight, not just any candidate that happened to match.
      var causeLabel={nutrition:nl?'te weinig voeding':'insufficient nutrients',fructose:nl?'fructoserijke honing':'high-fructose honey',
        tolerance:nl?'alcoholtolerantie':'alcohol tolerance',temperature:nl?'temperatuur':'temperature',ph:nl?'lage pH':'low pH'};
      var second=(d.causes&&d.causes.length>1&&d.causes[1].weight>=0.35)?d.causes[1]:null;
      var secondTxt=second?(nl?(' Ook mogelijk een rol: '+(causeLabel[second.cause]||second.cause)+'.'):(' Also possibly contributing: '+(causeLabel[second.cause]||second.cause)+'.')):'';
      // Timeline fact (E10): how long it's actually been flat, not just "stalled".
      var plateauTxt=(d.plateauDays!=null)?(nl?(' De dichtheid staat al '+d.plateauDays+' dagen vrijwel stil.'):(' Gravity has been essentially flat for '+d.plateauDays+' days.')):'';
      // nutrientsComplete===true means nutrition wasn't even considered as a
      // candidate cause (see the rule) — worth saying plainly, since "all
      // doses logged" can otherwise read as "nutrition's been ruled out"
      // when it really only means the planned events were recorded, not
      // that the right product/amount/timing reached the must.
      var nutrCaveat=d.nutrientsComplete===true?(nl
        ?' (Alle geplande voedingsgiften zijn gelogd, dus voeding is hier niet als oorzaak meegenomen — een verkeerd product, te weinig, of verkeerd getimed zou dat niet laten zien.)'
        :' (All planned nutrient doses are logged, so nutrition wasn\'t considered a likely cause here — a wrong product, under-dose, or bad timing wouldn\'t show up in that alone.)'):'';
      return {icon:'🧊',
        title:nl?'Gisting lijkt stil te vallen':'Fermentation appears stalled',
        reason:nl?('De dichtheid is nauwelijks bewogen en zit nog op ~'+d.atten+'% vergisting, ver van het doel.'+plateauTxt+' '+(causeTxt||'Controleer temperatuur en voeding.')+secondTxt+nutrCaveat+' Overweeg anders een herstart-gist (zie Problemen oplossen).')
                :('Gravity has barely moved and is still ~'+d.atten+'% attenuated, well short of target.'+plateauTxt+' '+(causeTxt||'Check temperature and nutrients.')+secondTxt+nutrCaveat+' Otherwise consider a restart yeast (see Troubleshoot).')};
    })(),
    'nutrient-final':{icon:'⚗',
      title:nl?'Laatste voedingsgift is nodig':'Final nutrient addition due',
      reason:nl?('Je hebt '+d.done+' van '+d.expected+' voedingsgiften gedaan. '+(d.past?'Je bent voorbij de 1/3-suikerbreuk — voeg de laatste dosis nu toe; daarna helpt voeding niet meer en kan ze bederf voeden.':'Je nadert de 1/3-suikerbreuk ('+ (d.sugarBreak||'?') +') — voeg de laatste dosis vóór de breuk toe.'))
              :('You\'ve added '+d.done+' of '+d.expected+' nutrient doses. '+(d.past?'You\'re past the 1/3 sugar break — add the final dose now; after this, nutrients won\'t help and can feed spoilage.':'You\'re approaching the 1/3 sugar break ('+(d.sugarBreak||'?')+') — add the final dose before it.'))},
    'oxygen-stop':{icon:'🚫',
      title:nl?'Stop met beluchten':'Stop aerating',
      reason:nl?('De dichtheid ('+(d.sg!=null?d.sg.toFixed(3):'?')+') is voorbij de 1/3-suikerbreuk ('+(d.sugarBreak||'?')+'). De gist verlaat haar groeifase; zuurstof vanaf nu verhoogt vooral het oxidatierisico in plaats van te helpen.')
              :('Gravity ('+(d.sg!=null?d.sg.toFixed(3):'?')+') is past the 1/3 sugar break ('+(d.sugarBreak||'?')+'). Yeast are leaving their growth phase; oxygen from here mostly raises oxidation risk rather than helping.')},
    'ferment-complete':(function(){
      // Three real paths land here (projectFermentation's nearFGReason) — each
      // gets its own honest sentence instead of one vague "gravity stable":
      // 'numeric' = genuinely at the calculated target; 'historical' = matches
      // YOUR own past batches on this yeast (the strongest, most concrete
      // evidence, so it's named specifically); 'attenuation' = rated-vs-real
      // gap + honey's poor pH buffering (the well-documented dominant real
      // causes) with non-fermentable sugar content as a smaller contributor —
      // NOT the other way around, which overstated the sugar angle. Real day
      // count when the plateau detector has one, instead of "several days".
      var sgTxt=d.sg!=null?d.sg.toFixed(3):'?', targetTxt=d.targetFG!=null?d.targetFG.toFixed(3):'?';
      var daysTxt=nl?(d.plateauDays!=null?(d.plateauDays+' dagen'):'enkele dagen'):(d.plateauDays!=null?(d.plateauDays+' days'):'several days');
      // History is corroborating evidence, not proof — a plateau that matches
      // your own past batches is meaningful UNLESS this batch's own nutrient
      // schedule was also skipped, in which case a repeatable process gap is
      // at least as likely an explanation as a real yeast ceiling. Only the
      // historical path leans on past batches at all, so this caveat is
      // scoped to it alone.
      var histCaveat=d.nutrientsComplete===false?(nl
        ?' Let op: de voedingsgiften voor dit brouwsel zijn niet allemaal toegevoegd — als dat vaker gebeurt, kan dat verklaren waarom je batches steeds rond hetzelfde punt uitkomen, niet per se de echte grens van deze gist.'
        :' Worth noting: this batch\'s nutrient schedule wasn\'t fully completed either — if that\'s a recurring pattern, it may explain why your batches keep landing around the same point, rather than that being this yeast\'s real ceiling.'):'';
      // histAttenN is usually equal to histSampleSize (attenuation only needs
      // ONE gravity reading, which nearly every past batch has) but isn't
      // guaranteed — say so on the rare occasion it's actually smaller.
      var histAttenDenomTxt=(d.histAttenN!=null&&d.histSampleSize!=null&&d.histAttenN<d.histSampleSize)
        ?(nl?(' ('+d.histAttenN+' daarvan met een bruikbare meting)'):(' ('+d.histAttenN+' of those with a usable reading)')):'';
      var reason=nl?({
        historical:'De dichtheid ('+sgTxt+') is al '+daysTxt+' stabiel bij ~'+d.atten+'% vergisting — dat komt overeen met je eigen vorige '+(d.histSampleSize||'')+' brouwsel(s) op deze gist (gemiddeld ~'+d.histAtten+'% vergisting'+histAttenDenomTxt+'), niet alleen een algemene honingverklaring.'+histCaveat+' Bevestig met twee stabiele metingen een paar dagen uit elkaar, hevel dan over / bottel.',
        attenuation:'De dichtheid ('+sgTxt+') is al '+daysTxt+' stabiel bij ~'+d.atten+'% vergisting, ook al ligt ze boven het berekende doel ('+targetTxt+'). Dat is normaal — vergistingspercentages op het pakje zijn gemeten onder ideale labomstandigheden, en een honingmost daalt vaak wat verder in pH dan bier of wijn (honing buffert nauwelijks), wat gist vroeger kan afremmen. Honing/fruit\'s kleine aandeel niet-vergistbare suikers speelt ook een (kleinere) rol. Bevestig met twee stabiele metingen een paar dagen uit elkaar, hevel dan over / bottel.',
        numeric:'De dichtheid ('+sgTxt+') zit op of nabij het doel ('+targetTxt+') bij ~'+d.atten+'% vergisting. Bevestig met twee stabiele metingen een paar dagen uit elkaar, hevel dan over / bottel.'
      }[d.reason]||('De dichtheid ('+sgTxt+') zit op of nabij het doel ('+targetTxt+') bij ~'+d.atten+'% vergisting.'))
        :({
        historical:'Gravity ('+sgTxt+') has held stable for '+daysTxt+' at ~'+d.atten+'% attenuation — that matches your own past '+(d.histSampleSize||'')+' batch(es) on this yeast (averaging ~'+d.histAtten+'% attenuation'+histAttenDenomTxt+'), not just a general honey explanation.'+histCaveat+' Confirm with two stable readings a few days apart, then rack / bottle.',
        attenuation:'Gravity ('+sgTxt+') has held stable for '+daysTxt+' at ~'+d.atten+'% attenuation, even though it sits above the calculated target ('+targetTxt+'). That\'s normal — attenuation ratings are measured under ideal lab conditions, and a honey must typically drops further in pH than beer or wine ever does (honey barely buffers), which can slow yeast down for good before every last bit of sugar is gone. Honey/fruit\'s own small share of non-fermentable sugars plays a part too, just usually a smaller one. Confirm with two stable readings a few days apart, then rack / bottle.',
        numeric:'Gravity ('+sgTxt+') is at or near target ('+targetTxt+') at ~'+d.atten+'% attenuation. Confirm with two stable readings a few days apart, then rack / bottle.'
      }[d.reason]||('Gravity ('+sgTxt+') is at or near target ('+targetTxt+') at ~'+d.atten+'% attenuation.'));
      return {icon:'✓',title:nl?'Gisting lijkt voltooid':'Fermentation looks complete',reason:reason};
    })(),
    'temperature':(function(){
      // Hedge the "too cold" case specifically, and only for a live sensor:
      // a fermenter/room probe isn't necessarily immersed in the must, and
      // active fermentation is exothermic — the must commonly runs a couple
      // degrees above its surroundings. That gap can turn a genuinely in-range
      // must into a false "too cold" reading. It can't produce a false "too
      // warm" the same way (the must is at least as warm as its surroundings,
      // likely more), and a hand-logged temp is normally taken IN the must
      // itself at gravity-check time — so neither of those needs the hedge.
      var coldHedge=(d.cold&&d.fermenting&&d.source==='live');
      // Published strain ranges are the manufacturer's typical window, not a
      // hard pass/fail line — deliberately fermenting outside it (cooler for
      // cleaner esters, warmer for a faster finish) is a real, sometimes-
      // successful technique, not just a beginner mistake. Say so without
      // softening the underlying mechanism (still genuinely true either way).
      var deliberateHedge=nl
        ?' Gepubliceerde bereiken zijn typisch, geen harde grens — sommige brouwers gisten bewust erbuiten (kouder voor zuiverdere esters, warmer voor een snellere afronding) met goed resultaat. Was dit bewust? Dan is dit vooral een controle, geen gegarandeerd probleem.'
        :' Published ranges are typical, not absolute — some brewers deliberately ferment outside them (cooler for cleaner esters, warmer for a faster finish) with good results. If this was on purpose, treat this as a check-in, not a guaranteed problem.';
      return {icon:'🌡',
      title:nl?(d.cold?'Temperatuur te laag':'Temperatuur te hoog'):(d.cold?'Temperature too low':'Temperature too high'),
      reason:nl?('Laatste meting '+(d.temp!=null?d.temp+'°C':'?')+' ligt buiten het ideale bereik voor '+(_advYeastName(d.yeast)||'deze gist')+' ('+d.low+'–'+d.high+'°C). '+(d.cold?('Te koud vertraagt of stalt de gisting.'+(coldHedge?' Komt deze meting van een vat-/omgevingssensor en niet van een sonde in de most zelf? Actieve gisting loopt vaak een paar graden warmer dan de omgeving — bevestig indien mogelijk met een thermometer in de vloeistof.':'')):'Te warm geeft fusels en scherpe smaken.')+deliberateHedge)
              :('Last reading '+(d.temp!=null?d.temp+'°C':'?')+' is outside '+(_advYeastName(d.yeast)||'this yeast')+'\'s ideal range ('+d.low+'–'+d.high+'°C). '+(d.cold?('Too cold slows or stalls fermentation.'+(coldHedge?' If this reading is from a fermenter/room sensor rather than a probe in the must itself, note that active fermentation commonly runs a couple degrees warmer than its surroundings — worth confirming with a thermometer in the liquid.':'')):'Too warm drives fusels and harsh flavours.')+deliberateHedge)};
    })(),
    'abv-ceiling':{icon:'⚠',
      title:nl?'Nadert alcoholtolerantie':'Approaching alcohol tolerance',
      reason:nl?('Het huidige alcohol (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) nadert de tolerantie van '+(_advYeastName(d.yeast)||'de gist')+' ('+d.max+'%). Dat opgegeven percentage is een gemiddelde, geen harde grens — sommige gisten stoppen wat eerder, andere gaan er met een gezonde, goed gevoede populatie voorbij. Verwacht dat de gisting hier begint te vertragen; plan eventueel een hogertolerante gist of stapvoeding voor een volgende keer.')
              :('Current ABV (~'+(d.abv!=null?d.abv.toFixed(1):'?')+'%) is nearing the tolerance of '+(_advYeastName(d.yeast)||'the yeast')+' ('+d.max+'%). That rating is an average, not a hard wall — some yeast quit a bit earlier, others push past it with a healthy, well-fed population. Expect it to start slowing here; consider a higher-tolerance yeast or step feeding for next time.')},
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
    'log-reading-missing':{icon:'📊',
      title:nl?'Log je eerste meting':'Log your first reading',
      reason:nl?('De partij gist al '+d.days+' dagen zonder dichtheidsmeting. Log er een (en de OG) zodat de adviseur voortgang, prognose en gezondheid kan berekenen.')
              :('This batch has been fermenting '+d.days+' days with no gravity reading. Log one (and the OG) so the advisor can track progress, projection and health.')},
    'log-reading-overdue':{icon:'📊',
      title:nl?'Tijd voor een nieuwe meting':'Time for a fresh reading',
      reason:nl?('Laatste meting was '+d.days+' dagen geleden. Een verse dichtheidsmeting houdt de prognose en stalldetectie scherp.')
              :('Last reading was '+d.days+' days ago. A fresh gravity reading keeps the projection and stall detection accurate.')},
    'fruit-addition-note':(function(){
      // Juice/concentrate's sugar is already dissolved — it lands fully in
      // the very next reading (a one-time step, like backsweetening) rather
      // than trickling in over several readings the way whole/frozen fruit's
      // cell-wall breakdown does. Different mechanism, different guidance —
      // not just a shorter version of the same sentence.
      if(d.juiceForm)return {icon:'🍒',
        title:nl?'Recente sap-/concentraattoevoeging kan de eerstvolgende meting vertekenen':'Recent juice/concentrate addition may skew the next reading',
        reason:nl?('Je logde '+(d.item?escHtml(d.item)+' ':'')+'op '+fmtDate(d.date)+' — sap/concentraat brengt al opgeloste suiker mee, dus die suiker zit meteen in de eerstvolgende meting (net als terugzoeten), niet uitgesmeerd over meerdere metingen zoals bij heel fruit. Eén meting extra is genoeg om de trend weer te vertrouwen.')
                :('You logged '+(d.item?escHtml(d.item)+' ':'')+'on '+fmtDate(d.date)+' — juice/concentrate brings already-dissolved sugar, so it lands fully in the very next reading (like backsweetening) rather than trickling in over several readings the way whole fruit does. One more reading is enough to trust the trend again.')};
      return {icon:'🍒',
      title:nl?'Recente fruittoevoeging kan metingen vertekenen':'Recent fruit addition may skew readings',
      reason:nl?('Je logde '+(d.item?escHtml(d.item)+' ':'')+'op '+fmtDate(d.date)+' — fruit brengt eigen suiker mee, dus dichtheidsmetingen van de komende paar controles zeggen evenveel over dat fruit als over de gisting zelf. Geef het nog 2-3 metingen voor je de trend vertrouwt.')
              :('You logged '+(d.item?escHtml(d.item)+' ':'')+'on '+fmtDate(d.date)+' — fruit carries its own sugar, so gravity readings for the next couple of checks reflect the fruit as much as fermentation progress. Give it 2-3 more readings before trusting the trend.')};
    })(),
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
      reason:nl?('De gisting is bijna klaar. Zet de '+bev+' koud (net boven vriespunt, dop losjes erop) — reken op 2-4 dagen voor de gist en fijne deeltjes goed bezinken; hevel daarna van de droesem. Nog niet helder genoeg? Hevel over en zet nog eens 3-4 dagen koud.')
              :('Fermentation is nearly done. Put the '+bev+' somewhere cold (just above freezing, lid on loosely) — 2-4 days is typical for yeast and fine particles to drop out; rack off the sediment after that. Not clear enough yet? Rack again and give it another 3-4 days cold.')};
    })(),
    'ph-low':(function(){
      var isCider=d.beverageType==='cider';
      var band=(d.low!=null&&d.high!=null)?(d.low.toFixed(1)+'–'+d.high.toFixed(1)):(isCider?'3.3–3.8':'3.0–3.4');
      var bandNl=band.replace(/\./g,',');
      return {icon:'🧪',
      title:nl?'pH is laag'+(isCider?'':' — gist onder stress'):('pH is low'+(isCider?'':' — yeast under stress')),
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt onder de bandbreedte voor '+(isCider?'cider':'mede')+' ('+bandNl+'). '+(isCider?'Dit is vooral scherper van smaak, geen directe giststress.':'Onder 2,9 raakt de gist gestrest, wat tot een trage of vastgelopen gisting kan leiden. Bevestig met een tweede meting of een gekalibreerde meter voor je bijstuurt — goedkope pH-strips zitten al snel 0,3-0,5 naast de werkelijke waarde. Klopt de meting? Overweeg de pH te verhogen met kaliumcarbonaat.'))
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is below the target band for '+(isCider?'cider':'mead')+' ('+band+'). '+(isCider?'This mostly just reads sharper/tarter — not the yeast-stress signal it would be in mead.':'Below 2.9, yeast becomes stressed, which can slow or stall fermentation. Confirm with a second reading or a calibrated meter before adjusting — cheap pH strips can be off by 0.3-0.5, easily enough to flag a perfectly healthy must. Reading holds up? Consider raising pH with potassium carbonate.'))};
    })(),
    'ph-high':(function(){
      var isCider=d.beverageType==='cider';
      var band=(d.low!=null&&d.high!=null)?(d.low.toFixed(1)+'–'+d.high.toFixed(1)):(isCider?'3.3–3.8':'3.0–3.4');
      var bandNl=band.replace(/\./g,',');
      var bev=isCider?'cider':'mede';
      return {icon:'🧪',
      title:nl?'pH is hoog — besmettingsrisico':'pH is high — contamination risk',
      reason:nl?('Laatste pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' ligt boven de bandbreedte voor '+bev+' ('+bandNl+'). Hierboven wordt de '+bev+' kwetsbaarder voor ongewenste micro-organismen.'+(isCider?' Zorg dat je bij het rekken op tijd metabisulfiet toevoegt — zeker bij perry, waar een te hoge pH ook het risico op ongewenste malolactische omzetting (naar azijnzuur) vergroot.':' Bevestig met een tweede meting of een gekalibreerde meter voor je bijstuurt — goedkope pH-strips zitten al snel 0,3-0,5 naast de werkelijke waarde. Overweeg bij te sturen met wijnzuur.'))
              :('Last pH '+(d.ph!=null?d.ph.toFixed(2):'?')+' is above the target band for '+(isCider?'cider':'mead')+' ('+band+'). Above this, the '+bev+' becomes more vulnerable to unwanted microorganisms.'+(isCider?' Make sure to sulfite promptly at racking — especially for perry, where a high pH also raises the risk of unwanted malolactic conversion (to acetic acid).':' Confirm with a second reading or a calibrated meter before adjusting — cheap pH strips can be off by 0.3-0.5. Consider adjusting with tartaric or citric acid.'))};
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
    'blowoff-headspace-critical':{icon:'🪣',
      title:nl?'Zeer weinig ruimte boven de must — blow-off-risico':'Very little headspace above the must — blow-off risk',
      reason:nl?('Deze partij ('+(d.volume||'?')+' L) laat maar ~'+d.headspacePct+'% lucht over in het vat ('+(d.capacity||'?')+' L). Tijdens de krachtigste fase van de gisting kan schuim/krausen het waterslot verstoppen en druk opbouwen. De standaardoplossing: vervang het waterslot tijdelijk door een blow-off-buis (een slang van de vatopening naar een pot ontsmettingsmiddel) — dat laat schuim vrij ontsnappen zonder verstopping/drukopbouw. Een schaal onder het waterslot vangt alleen de rommel op áchteraf, dat voorkomt de drukopbouw niet.')
              :('This batch ('+(d.volume||'?')+' L) leaves only ~'+d.headspacePct+'% air space in the vessel ('+(d.capacity||'?')+' L). During the most vigorous phase of fermentation, foam/krausen can clog the airlock and build up pressure. The standard fix: swap the airlock for a blow-off tube (a hose running from the vessel opening into a jar of sanitizer) — it lets foam escape freely without clogging or building pressure. A tray under the airlock only catches the mess after the fact, it doesn\'t prevent the pressure buildup.')},
    'blowoff-headspace-tight':{icon:'🪣',
      title:nl?'Weinig ruimte boven de must — blow-off-risico':'Little headspace above the must — blow-off risk',
      reason:nl?('Deze partij ('+(d.volume||'?')+' L) laat maar ~'+d.headspacePct+'% lucht over in het vat ('+(d.capacity||'?')+' L). Tijdens de krachtigste fase van de gisting kan schuim/krausen het waterslot verstoppen en druk opbouwen. De standaardoplossing: vervang het waterslot tijdelijk door een blow-off-buis (een slang van de vatopening naar een pot ontsmettingsmiddel) — dat laat schuim vrij ontsnappen zonder verstopping/drukopbouw. Een schaal onder het waterslot vangt alleen de rommel op áchteraf, dat voorkomt de drukopbouw niet.')
              :('This batch ('+(d.volume||'?')+' L) leaves only ~'+d.headspacePct+'% air space in the vessel ('+(d.capacity||'?')+' L). During the most vigorous phase of fermentation, foam/krausen can clog the airlock and build up pressure. The standard fix: swap the airlock for a blow-off tube (a hose running from the vessel opening into a jar of sanitizer) — it lets foam escape freely without clogging or building pressure. A tray under the airlock only catches the mess after the fact, it doesn\'t prevent the pressure buildup.')},
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
      // sampleSize is the whole comparable pool, but the days-average only
      // draws from whichever of those were actually bottled (a still-active
      // one has no finish date yet) — say so when the two diverge, so "your
      // last 8 batches averaged 24 days" doesn't imply all 8 finished when
      // maybe only 2 had.
      var daysDenomTxt=(d.avgDaysN!=null&&d.avgDaysN<d.sampleSize)
        ?(nl?(' (op basis van de '+d.avgDaysN+' die al gebotteld zijn)'):(' (based on the '+d.avgDaysN+' that were bottled)')):'';
      var ratingDenomTxt=(d.avgRatingN!=null&&d.avgRatingN<d.sampleSize)
        ?(nl?(', '+d.avgRatingN+' beoordeeld'):(', '+d.avgRatingN+' rated')):'';
      var ratingTxt=(d.avgRating!=null)?(nl?(' en gemiddeld beoordeeld met '+d.avgRating+'/5'+ratingDenomTxt):(' and rated ~'+d.avgRating+'/5 on average'+ratingDenomTxt)):'';
      var pctTxt=(d.avgDays>0)?(nl?(' ('+Math.round((d.daysSoFar/d.avgDays-1)*100)+'% t.o.v. gemiddeld)'):(' ('+Math.round((d.daysSoFar/d.avgDays-1)*100)+'% vs. average)')):'';
      return {icon:'📊',
        title:nl?'Vergeleken met je eigen partijen':'Compared to your own batches',
        reason:nl?('Je vorige '+d.sampleSize+' partijen met '+matchTxt+' deden er gemiddeld ~'+d.avgDays+' dagen over'+daysDenomTxt+ratingTxt+'. Deze partij zit nu op dag '+d.daysSoFar+pctTxt+'.')
                  :('Your last '+d.sampleSize+' batches with '+matchTxt+' took ~'+d.avgDays+' days on average'+daysDenomTxt+ratingTxt+'. This batch is currently at day '+d.daysSoFar+pctTxt+'.')};
    })(),
    'extended-bulk-aging':(function(){
      var bev=_advBevWord(d,nl);
      return {icon:'🛢',
      title:nl?'Al lang niet gebotteld':'Sitting unbottled a long time',
      reason:nl?('Deze partij zit al ~'+d.days+' dagen in bulkrijping zonder gebotteld te zijn'+(d.target?(' — dit recept mikt doorgaans op ~'+d.target+' dagen bulkrijping'):'')+'. Elke keer dat het vat geopend of verplaatst wordt, is er kans op zuurstofcontact — bottelen (ook al is de '+bev+' nog jong) sluit dat risico af. Overweeg binnenkort te bottelen.')
              :('This batch has been sitting in bulk aging for ~'+d.days+' days without being bottled'+(d.target?(' — this recipe typically targets ~'+d.target+' days of bulk aging'):'')+'. Every time the vessel is opened or moved there\'s a chance of oxygen exposure — bottling (even if the '+bev+' is still young) closes off that risk. Consider bottling soon.')};
    })(),
    'over-racked':(function(){
      var bev=_advBevWord(d,nl);
      return {icon:'🔄',
      title:nl?'Al vaak overgeheveld':'Racked quite a few times',
      reason:nl?('Deze partij is al '+d.count+'× overgeheveld. Elke keer komt er wat zuurstof bij — meestal is drie overhevelingen genoeg, zes wordt te veel. Overweeg fijningsmiddelen (bentoniet/sparkolloid) of gewoon tijd in plaats van nog een keer over te hevelen, tenzij er een concrete reden is.')
              :('This '+bev+' has been racked '+d.count+' times already. Each racking adds a little oxygen — three rackings is usually plenty, six is too many. Consider fining agents (bentonite/sparkolloid) or just time instead of racking again, unless there\'s a concrete reason to.')};
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

// Transient (non-persistent) acknowledgment when an action resolves an
// advisor recommendation — e.g. logging a reading clears 'stalled', racking
// clears a blowoff-headspace warning, bottling clears the whole packaging-
// phase cluster. No new state: call _advSnapshotItems(b) BEFORE the
// mutating action, then _advResolvedSuffix(b, that snapshot) AFTER — the
// memo has already recomputed by then since the action just changed real
// data. toast() has a single slot (a second call replaces the first, it
// doesn't stack), so this returns a suffix to APPEND onto the action's own
// toast message rather than firing a separate one.
function _advSnapshotItems(b){
  var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
  return adv?adv.items:[];
}
function _advResolvedSuffix(b,beforeItems){
  if(!beforeItems||!beforeItems.length)return '';
  var adv=(typeof mwBatchAdvice==='function')?mwBatchAdvice(b):null;
  if(!adv)return '';
  var afterIds={};adv.items.forEach(function(i){afterIds[i.id]=true;});
  var resolved=beforeItems.filter(function(i){return !afterIds[i.id];});
  if(!resolved.length)return '';
  var nl=_advNL();
  var titles=resolved.map(function(i){return _advItemText(i).title;});
  return (nl?' — ✓ opgelost: ':' — ✓ resolved: ')+titles.join(', ');
}

// Short, imperative next-step for a recommendation — kept separate from
// _advItemText's `reason` (the explanation) so a card can show "what
// happened and why" and "what to do" as two visually distinct lines instead
// of one paragraph blending both. Same shape/precedent as _advWhyMatters:
// a plain id lookup, populated only for ids where the reason text doesn't
// already end in an obvious, separate action — most 'info' notes (on-track,
// temp-swing, ingredient-notes…) don't get one because there genuinely
// isn't a separate next step beyond "keep doing what you're doing" or "just
// FYI". Deliberately NOT a full rewrite of every reason string into
// Observed/Why/Next-step paragraphs — that's real content work across ~27
// bilingual entries with no correctness issue behind it, high regression
// risk for a readability-only change; this gets most of the scannability
// benefit at a fraction of the risk.
//
// Takes the full item (not just the id) for the one entry that genuinely
// needs its data — fruit-addition-note's juiceForm changes how many more
// readings are actually needed (see _advItemText's own juiceForm branch).
function _advNextStep(it){
  var id=it.id, d=it.data||{};
  var nl=_advNL();
  if(id==='fruit-addition-note'){
    if(d.juiceForm)return nl?'Nog één meting is genoeg om de trend weer te vertrouwen.':'One more reading is enough to trust the trend again.';
    return nl?'Geef het nog 2-3 metingen voor je de trend vertrouwt.':'Give it 2-3 more readings before trusting the trend.';
  }
  var M=nl?{
    stalled:'Controleer temperatuur en voedingsschema; overweeg een herstart-gist als dat niet helpt.',
    'nutrient-final':'Voeg de laatste voedingsgift toe en vink de stap af.',
    'oxygen-stop':'Stop met beluchten/roeren vanaf nu.',
    'aerate-now':'Beluchten/roeren blijven doen tot de suikerbreuk.',
    'ferment-complete':'Bevestig met twee stabiele metingen een paar dagen uit elkaar, hevel dan over of bottel.',
    temperature:'Stel de omgevingstemperatuur bij richting het opgegeven bereik.',
    'temp-swing':'Zoek een stabielere plek of houd de omgeving constanter.',
    'abv-ceiling':'Geen actie vereist — verwacht een tragere afronding vanaf hier.',
    'stabilise-first':'Voeg kaliumsorbaat én metabisulfiet samen toe vóór het terugzoeten.',
    'ph-low':'Bevestig de meting; overweeg kaliumcarbonaat als ze standhoudt.',
    'ph-high':'Sulfiteer op tijd bij het rekken.',
    'blowoff-headspace-critical':'Vervang het waterslot tijdelijk door een blow-off-buis.',
    'blowoff-headspace-tight':'Vervang het waterslot tijdelijk door een blow-off-buis.',
    'record-og':'Vul de OG in bij je volgende meting.',
    'log-reading-missing':'Log een dichtheidsmeting.',
    'log-reading-overdue':'Log een verse dichtheidsmeting.',
    'headspace':'Hevel over op een vol vat of top bij.',
    'cold-crash':'Zet koud (net boven vriespunt) en reken op 2-4 dagen.',
    'extended-bulk-aging':'Overweeg binnenkort te bottelen.',
    'over-racked':'Laat met rust of gebruik fijningsmiddelen in plaats van nog een keer over te hevelen.',
    'mlf-advisory':'Beslis nu over wel/niet sulfiteren zodat het resultaat niet aan het toeval overgelaten wordt.'
  }:{
    stalled:'Check temperature and nutrient schedule; consider a restart yeast if that doesn\'t help.',
    'nutrient-final':'Add the final nutrient dose and tick off the step.',
    'oxygen-stop':'Stop aerating/stirring from here.',
    'aerate-now':'Keep aerating/stirring until the sugar break.',
    'ferment-complete':'Confirm with two stable readings a few days apart, then rack or bottle.',
    temperature:'Adjust the ambient temperature toward the target range.',
    'temp-swing':'Find a steadier spot or keep the environment more constant.',
    'abv-ceiling':'No action required — expect a slower finish from here.',
    'stabilise-first':'Add potassium sorbate AND metabisulfite together before backsweetening.',
    'ph-low':'Confirm the reading; consider potassium carbonate if it holds up.',
    'ph-high':'Sulfite promptly at racking.',
    'blowoff-headspace-critical':'Swap the airlock for a blow-off tube.',
    'blowoff-headspace-tight':'Swap the airlock for a blow-off tube.',
    'record-og':'Add the OG with your next reading.',
    'log-reading-missing':'Log a gravity reading.',
    'log-reading-overdue':'Log a fresh gravity reading.',
    'headspace':'Rack into a full vessel, or top up.',
    'cold-crash':'Chill it (just above freezing) and allow 2-4 days.',
    'extended-bulk-aging':'Consider bottling soon.',
    'over-racked':'Leave it be, or use fining agents instead of racking again.',
    'mlf-advisory':'Decide on sulfite timing now so the outcome isn\'t left to chance.'
  };
  return M[id]||null;
}

// Short, factual "what does the data actually show" line — completes the
// Observed/Why/Next-step structure without hand-rewriting the 27 existing
// bilingual `reason` paragraphs (real content work with no correctness
// issue behind it, real risk to hard-won wording — see _advNextStep's own
// comment for the same reasoning). Instead: a terse, purely numeric/factual
// summary pulled directly from the item's OWN data fields, nothing
// interpreted or explained (that's still `reason`'s job). Only populated
// where a clean, real fact exists in the data — an id with nothing crisp to
// summarize (mlf-advisory, ingredient-notes, on-track's own single
// reassuring line) correctly gets nothing here rather than a forced,
// low-value restatement of the title.
//
// GUARDRAIL for future entries (ChatGPT round 9 — worth stating explicitly,
// since this is the kind of line that drifts quietly as more rules get
// added): every entry here must be something directly measurable from the
// signal layer, never a conclusion the RULE drew from it.
//   good: "~89% attenuated, flat for 6d"        (raw numbers, no verdict)
//   bad:  "Fermentation has stalled"             (that's the rule's OWN
//                                                  conclusion — it belongs
//                                                  in the title/reason, not
//                                                  here, or Observed stops
//                                                  meaning "observed")
// A quick test: if the line could only be true because a RULE fired, it's
// not observation — the title already says the rule's name/conclusion, so
// there's no need for a second copy of it disguised as a "fact".
function _advObserved(it){
  var id=it.id, d=it.data||{}, nl=_advNL();
  function pct(x){return x==null?'?':(Math.round(x*10)/10)+'%';}
  function sg(x){return x==null?'?':x.toFixed(3);}
  function days(n){return nl?(n+'d'):(n+'d');}
  var M={
    stalled:(d.atten!=null)?(nl?('~'+d.atten+'% vergist'+(d.plateauDays!=null?(', '+days(d.plateauDays)+' vlak'):'')):('~'+d.atten+'% attenuated'+(d.plateauDays!=null?(', flat '+days(d.plateauDays)):''))):null,
    'nutrient-final':(d.done!=null&&d.expected!=null)?(nl?(d.done+' van '+d.expected+' giften'):(d.done+' of '+d.expected+' doses')):null,
    'oxygen-stop':(d.sg!=null)?(nl?('SG '+sg(d.sg)+' — voorbij de suikerbreuk'):('SG '+sg(d.sg)+' — past the sugar break')):null,
    'ferment-complete':(d.sg!=null)?(nl?('SG '+sg(d.sg)+(d.plateauDays!=null?(', stabiel sinds '+days(d.plateauDays)):'')):('SG '+sg(d.sg)+(d.plateauDays!=null?(', stable for '+days(d.plateauDays)):''))):null,
    temperature:(d.temp!=null&&d.low!=null&&d.high!=null)?(d.temp+'°C ('+d.low+'–'+d.high+'°C)'):null,
    'temp-swing':(d.low!=null&&d.high!=null)?(nl?('bereik '+d.low+'–'+d.high+'°C, wisselend'):('range '+d.low+'–'+d.high+'°C, swinging')):null,
    'abv-ceiling':(d.abv!=null&&d.max!=null)?('~'+d.abv.toFixed(1)+'% ABV ('+d.max+'% '+(nl?'tolerantie':'tolerance')+')'):null,
    'ph-low':(d.ph!=null)?('pH '+d.ph.toFixed(2)+(d.low!=null&&d.high!=null?(' ('+(nl?'doel':'target')+' '+d.low.toFixed(1)+'–'+d.high.toFixed(1)+')'):'')):null,
    'ph-high':(d.ph!=null)?('pH '+d.ph.toFixed(2)+(d.low!=null&&d.high!=null?(' ('+(nl?'doel':'target')+' '+d.low.toFixed(1)+'–'+d.high.toFixed(1)+')'):'')):null,
    'blowoff-headspace-critical':(d.headspacePct!=null)?(nl?('~'+d.headspacePct+'% kopruimte'):('~'+d.headspacePct+'% headspace')):null,
    'blowoff-headspace-tight':(d.headspacePct!=null)?(nl?('~'+d.headspacePct+'% kopruimte'):('~'+d.headspacePct+'% headspace')):null,
    'record-og':null,
    'log-reading-missing':(d.days!=null)?(nl?(days(d.days)+', nog geen meting'):(days(d.days)+', no reading yet')):null,
    'log-reading-overdue':(d.days!=null)?(nl?('laatste meting '+days(d.days)+' geleden'):('last reading '+days(d.days)+' ago')):null,
    'fruit-addition-note':(d.date)?(nl?((d.item?d.item+' — ':'')+'gelogd op '+fmtDate(d.date)):((d.item?d.item+' — ':'')+'logged '+fmtDate(d.date))):null,
    headspace:null,
    'cold-crash':null,
    'extended-bulk-aging':(d.days!=null)?(nl?(days(d.days)+' onbebotteld'):(days(d.days)+' unbottled')):null,
    'over-racked':(d.count!=null)?(nl?(d.count+'× overgeheveld'):(d.count+'× racked')):null,
    'historical-pace':(d.daysSoFar!=null&&d.avgDays!=null)?(nl?('dag '+d.daysSoFar+' vs. gem. '+d.avgDays+'d'):('day '+d.daysSoFar+' vs. avg '+d.avgDays+'d')):null,
    'fructose-stall-risk':(d.honey)?(nl?(d.honey+' — fructoserijk'):(d.honey+' — high-fructose')):null,
    'aging-window':(d.aged!=null)?(nl?('~'+d.aged+'d oud'):('~'+d.aged+'d old')):null,
    'carbonation-developing':(d.aged!=null)?(nl?('gebotteld ~'+d.aged+'d geleden'):('bottled ~'+d.aged+'d ago')):null,
    'mlf-advisory':null,
    'stabilise-first':null,
    'aerate-now':(d.sugarBreak!=null)?(nl?('vóór de suikerbreuk ('+sg(d.sugarBreak)+')'):('before the sugar break ('+sg(d.sugarBreak)+')')):null,
    'ingredient-notes':null,
    'on-track':null
  };
  return M[id]||null;
}

// Beginner-persona jargon glossary — scoped version of "3-tier language
// register": rewriting the 27 existing reason strings into 3 separate
// vocabulary levels each would be ~80 more hand-authored bilingual strings
// with real regression risk to the two tiers that already work. Instead:
// a term a beginner is genuinely likely not to know yet, defined once,
// surfaced only for the ids that actually use it — reusing the exact same
// id-keyed lookup shape as _advWhyMatters/_advNextStep/_advObserved.
var ADV_GLOSSARY_TERMS={
  'sugar-break':{en:{term:'sugar break',def:'The point roughly 1/3 of the way through fermentation where the yeast\'s explosive growth phase ends — several timing decisions (when to stop aerating, when nutrients stop helping) hinge on it.'},
    nl:{term:'suikerbreuk',def:'Het punt ongeveer 1/3 in de gisting waar de explosieve groeifase van de gist eindigt — meerdere timingbeslissingen (wanneer stoppen met beluchten, wanneer voeding niet meer helpt) hangen hiervan af.'}},
  attenuation:{en:{term:'attenuation',def:'How much of the sugar the yeast actually converted to alcohol, as a percentage — 100% would be bone dry. Every yeast strain has its own typical ceiling.'},
    nl:{term:'vergisting',def:'Hoeveel van de suiker de gist daadwerkelijk in alcohol omzette, als percentage — 100% zou kurkdroog zijn. Elke giststam heeft zijn eigen typische plafond.'}},
  tolerance:{en:{term:'alcohol tolerance',def:'The ABV a yeast strain typically stops working at — a rated average, not a hard wall some batches finish a bit under or push a bit past.'},
    nl:{term:'alcoholtolerantie',def:'Het alcoholpercentage waarbij een giststam doorgaans stopt met werken — een gemiddelde, geen harde grens; sommige brouwsels eindigen er iets onder, andere gaan er iets overheen.'}},
  'ph-meaning':{en:{term:'pH',def:'A measure of acidity. Honey barely resists a pH swing on its own, so a mead\'s pH can drop much further over fermentation than beer or wine ever does — low pH stresses yeast, high pH invites unwanted microbes.'},
    nl:{term:'pH',def:'Een maat voor zuurgraad. Honing biedt zelf nauwelijks weerstand tegen een pH-daling, dus de pH van een mede kan tijdens de gisting veel verder zakken dan bij bier of wijn — een lage pH stresst de gist, een hoge pH nodigt ongewenste micro-organismen uit.'}},
  mlf:{en:{term:'MLF (malolactic fermentation)',def:'A secondary bacterial fermentation that softens sharp acid into a rounder, sometimes buttery character — wanted for some styles, not others.'},
    nl:{term:'MLF (malolactische gisting)',def:'Een secundaire, bacteriële gisting die scherp zuur omzet in een ronder, soms boterachtig karakter — gewenst bij sommige stijlen, niet bij andere.'}},
  racking:{en:{term:'racking',def:'Siphoning the liquid off the sediment into a clean vessel, leaving the dead yeast and debris (the "lees") behind.'},
    nl:{term:'overhevelen',def:'De vloeistof van het bezinksel afhevelen naar een schoon vat, waarbij de dode gist en het bezinksel (de "droesem") achterblijven.'}},
  krausen:{en:{term:'krausen',def:'The thick foam that forms on top during vigorous fermentation — normal, but it can clog an airlock if there isn\'t enough headspace above it.'},
    nl:{term:'krausen',def:'Het dikke schuim dat zich tijdens krachtige gisting bovenop vormt — normaal, maar het kan een waterslot verstoppen als er te weinig ruimte boven zit.'}},
  headspace:{en:{term:'headspace',def:'The empty air space left between the liquid surface and the top of the vessel.'},
    nl:{term:'kopruimte',def:'De lege luchtruimte tussen het vloeistofoppervlak en de bovenkant van het vat.'}},
  stabilise:{en:{term:'stabilising',def:'Adding potassium sorbate AND metabisulfite together before backsweetening, so the yeast can\'t restart fermenting the extra sugar in the bottle.'},
    nl:{term:'stabiliseren',def:'Kaliumsorbaat ÉN metabisulfiet samen toevoegen vóór het terugzoeten, zodat de gist de extra suiker niet opnieuw in de fles kan vergisten.'}}
};
// Maps a recommendation id to the glossary term keys it actually uses —
// only ids where the reason text leans on real jargon get an entry.
var ADV_GLOSSARY_BY_ID={
  stalled:['sugar-break','attenuation'],'nutrient-final':['sugar-break'],'oxygen-stop':['sugar-break'],
  'aerate-now':['sugar-break'],'ferment-complete':['attenuation'],'abv-ceiling':['tolerance','attenuation'],
  'stabilise-first':['stabilise'],'mlf-advisory':['mlf'],'over-racked':['racking'],
  'blowoff-headspace-critical':['krausen','headspace'],'blowoff-headspace-tight':['krausen','headspace'],
  headspace:['headspace'],'ph-low':['ph-meaning'],'ph-high':['ph-meaning'],'fructose-stall-risk':['attenuation']
};
// Collects the unique glossary entries relevant to whichever items are
// CURRENTLY firing — not a static full glossary dump, just the terms this
// batch's own advice actually uses right now.
function _advRelevantGlossary(items){
  var nl=_advNL(), seen={}, out=[];
  (items||[]).forEach(function(it){
    (ADV_GLOSSARY_BY_ID[it.id]||[]).forEach(function(key){
      if(seen[key])return;seen[key]=true;
      var entry=ADV_GLOSSARY_TERMS[key];
      if(entry)out.push(nl?entry.nl:entry.en);
    });
  });
  return out;
}

// Contextual guide link — scoped version of "dynamic contextual FAQ": reuses
// this app's EXISTING, already-thorough Troubleshoot content (openTroubleshootTopic,
// core/views/12-troubleshoot.js) instead of inventing a new FAQ database that
// would need its own content authored from scratch. Only mapped where a
// specific troubleshoot topic is a genuinely close match for the
// recommendation — not every id gets one; a weak/approximate match would be
// worse than no link at all.
function _advGuideLink(it){
  var d=it.data||{};
  var M={
    stalled:'stuck-fermentation','fructose-stall-risk':'stuck-fermentation',
    temperature:d.cold?'temp-too-low':'temp-too-high',
    'blowoff-headspace-critical':'foam-overflow','blowoff-headspace-tight':'foam-overflow',
    'cold-crash':'cloudy','stabilise-first':'backsweetening','over-racked':'racking',
    'aging-window':'aging-window'
  };
  var topicId=M[it.id];
  if(!topicId)return null;
  var all=((typeof TROUBLESHOOT_TOPICS!=='undefined'&&TROUBLESHOOT_TOPICS)||[])
    .concat((typeof APP_TROUBLESHOOT_TOPICS!=='undefined'&&APP_TROUBLESHOOT_TOPICS)||[]);
  var t=all.filter(function(x){return x.id===topicId;})[0];
  return t?{topicId:topicId,icon:t.icon,title:t.title}:null;
}

function _advHealthMeta(band){
  var nl=_advNL();
  var M={excellent:{c:'var(--green2)',l:nl?'Uitstekend':'Excellent'},good:{c:'var(--green2)',l:nl?'Goed':'Good'},
    fair:{c:'var(--gold2)',l:nl?'Redelijk':'Fair'},attention:{c:'var(--red2)',l:nl?'Aandacht nodig':'Needs attention'},
    unknown:{c:'var(--text3)',l:nl?'Onbekend':'Unknown'}};
  return M[band]||M.unknown;
}

// "Known unknowns": which key inputs this batch is missing right now — surfaced
// specifically where the advisor would otherwise say "everything looks good" /
// "nothing needs attention", so silence caused by missing data doesn't get
// mistaken for a genuine all-clear (a brewer reading "✓ looks good" has no way
// to tell that apart from "nothing has been logged yet" otherwise). Only the
// two gaps with no dedicated recommendation of their own: a batch with no OG
// or no gravity readings already gets a prominent record-og / log-reading-
// missing card, so repeating that here would just be the same gap said twice.
//
// Can this ever duplicate what a fired rule already says? Audited: the two
// call sites (renderBatchAdvisorStrip / renderBatchAdvisor's summaryLine)
// only reach for this in the branch where adv.items is COMPLETELY empty —
// i.e. every single rule stayed silent. That's a structural guarantee, not
// just "the current rules happen not to overlap": even 'stalled', whose
// cause list CAN legitimately include 'nutrition' while nutrientsExpected
// is 0 (the same condition this function flags), never actually renders
// alongside this text, because 'stalled' firing at all means adv.items is
// non-empty and this function's caller never gets invoked for that batch.
// If a future rule is ever added that's allowed to fire ON an unknown
// temperature/nutrition signal specifically (none currently are — every
// existing rule that reads tempInRange/nutrientsComplete requires the
// underlying value to be KNOWN first), re-check this guarantee.
// Which real, already-computed fact (if any) makes THIS batch's "all quiet"
// state worth naming specifically, instead of the same generic sentence
// every batch gets. Doesn't add volume — still exactly one line either way
// (E8's "don't surface more when nothing's wrong" principle stays intact),
// just backed by whichever fact is most informative when one applies.
// Priority: a real historical comparison (the strongest, most concrete
// evidence this app has) beats a progress-band position, which beats an
// aging-window note — falls through to null (the plain generic line) when
// none apply, e.g. a brand-new batch with no history and mid-range pace.
function _advQuietFact(s){
  if(!s)return null;
  var nl=_advNL();
  if(s.historical&&s.historical.matchedOn&&s.historical.sampleSize>=2){
    var yn=_advYeastName(s.historical.yeast);
    var matchTxt=s.historical.matchedOn==='recipe'?(nl?'dit recept':'this recipe')
      :s.historical.matchedOn==='yeast-honey'?((yn||(nl?'deze gist':'this yeast'))+' + '+(s.historical.honey||(nl?'deze honing':'this honey')))
      :(nl?'deze gist':'this yeast');
    return nl?('komt overeen met je eigen '+s.historical.sampleSize+' vorige partij(en) met '+matchTxt)
             :('matching your own '+s.historical.sampleSize+' past batch(es) with '+matchTxt);
  }
  if(s.fermenting&&s.fermentProgress&&s.fermentProgress.phase==='ahead'){
    return nl?'loopt zelfs voor op je gebruikelijke tempo':'actually running ahead of your usual pace';
  }
  if(s.bottled&&s.agePhase==='peak'){
    return nl?'zit nu in het piekvenster — een mooi moment om ervan te genieten':'sitting in its peak window right now — a great time to enjoy it';
  }
  return null;
}

// Causal cross-reference: 'stalled' already computes a weighted, ranked list
// of WHICH other signals it thinks are responsible (mwStalledCauses, E2) —
// reused here instead of inventing a separate relationship map. Returns the
// ids of OTHER items in this same render that correspond to one of stalled's
// named causes AND are actually present — used to add a small cross-
// reference line on both cards so the brewer reads them as one underlying
// issue, not unrelated things. Deliberately NOT a nested primary/supporting
// restructure of the Actions/Watch/Insights layout (a stalled cause can land
// in any of the three severity buckets) — callers add a text annotation,
// both cards keep their normal severity-bucket position, a much smaller,
// lower-risk change for the same "these are connected" benefit. Returns []
// when there's no 'stalled' item, or it has no matching co-occurring items.
var ADV_CAUSE_TO_ITEM_ID={nutrition:'nutrient-final',ph:'ph-low',fructose:'fructose-stall-risk',tolerance:'abv-ceiling',temperature:'temperature'};
function _advStalledCauseItemIds(items){
  items=items||[];
  var stalledItem=items.filter(function(i){return i.id==='stalled';})[0];
  if(!stalledItem||!stalledItem.data||!stalledItem.data.causes)return [];
  var presentIds={};items.forEach(function(i){presentIds[i.id]=true;});
  return (stalledItem.data.causes||[]).map(function(c){return ADV_CAUSE_TO_ITEM_ID[c.cause];}).filter(function(rid){return rid&&presentIds[rid];});
}

function _advMissingInputs(s){
  if(!s||!s.active)return [];
  var nl=_advNL();
  var missing=[];
  if(!s.bulkAging&&s.latestTemp==null)missing.push(nl?'temperatuur':'temperature');
  if(s.nutrientsExpected===0&&s.nutrientsDone===0)missing.push(nl?'voedingsdosering':'nutrient dosing');
  return missing;
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
  // "Everything looks good" only fires when there's NOTHING to say at all —
  // which sparse/early data produces just as easily as a genuinely healthy
  // batch. Name what's actually missing right under it so silence doesn't
  // read as confirmation.
  var missingTxt='';
  if(!top){
    var missing=_advMissingInputs(adv.signals);
    if(missing.length)missingTxt='<div style="font-size:11px;color:var(--text3);margin-top:2px">'+(nl?'Kan nog niet alles beoordelen — geen '+missing.join(', ')+' gelogd.':'Can\'t fully evaluate yet — no '+missing.join(', ')+' logged.')+'</div>';
  }
  var quietFact=top?null:_advQuietFact(adv.signals);
  var quietTxt=nl?('✓ Alles ziet er goed uit'+(quietFact?' — '+quietFact:'')):('✓ Everything looks good'+(quietFact?' — '+quietFact:''));
  return '<div class="card" style="margin-bottom:16px;border-left:3px solid '+hm.c+'">'
    +'<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
    +'<div style="text-align:center;min-width:62px"><div style="font-family:var(--font-display);font-size:30px;line-height:1;color:'+hm.c+'">'+(h&&h.score!=null?h.score:'—')+_advTrendChip(h&&h.trend)+'</div><div class="micro-label">'+(nl?'GEZONDHEID':'HEALTH')+'</div></div>'
    +'<div style="flex:1;min-width:180px">'
    +(top?'<div style="font-size:13px;color:'+topMeta.color+';font-family:var(--font-display)">'+topTxt.icon+' '+escHtml(topTxt.title)+'</div><div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(topTxt.reason.length>120?topTxt.reason.slice(0,118)+'…':topTxt.reason)+'</div>'
        :'<div style="font-size:13px;color:var(--green2)">'+escHtml(quietTxt)+'</div>'+missingTxt)
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
  function fermenterName(id){
    var f=(typeof getFermenter==='function')?getFermenter(id):null;
    return f?f.name:(nl?'onbekend vat':'unknown vessel');
  }
  function line(beat){
    var d=beat.data||{};
    var text={
      started:nl?('Gestart'+(d.og?(' op OG '+d.og.toFixed(3)):'')+(d.yeast?(' met '+(_advYeastName(d.yeast)||d.yeast)):''))
                :('Started'+(d.og?(' at OG '+d.og.toFixed(3)):'')+(d.yeast?(' with '+(_advYeastName(d.yeast)||d.yeast)):'')),
      'sugar-break':nl?('1/3-suikerbreuk bereikt (dichtheid '+(d.gravity!=null?d.gravity.toFixed(3):'?')+')'):('Crossed the 1/3 sugar break (gravity '+(d.gravity!=null?d.gravity.toFixed(3):'?')+')'),
      addition:nl?('Toegevoegd: '+(d.item||'?')+(d.amount?(' ('+d.amount+')'):'')):('Added: '+(d.item||'?')+(d.amount?(' ('+d.amount+')'):'')),
      racked:nl?('Overgeheveld van '+fermenterName(d.from)+' naar '+fermenterName(d.to)+(d.notes?(' — '+d.notes):''))
                :('Racked from '+fermenterName(d.from)+' to '+fermenterName(d.to)+(d.notes?(' — '+d.notes):'')),
      plateau:nl?('Dichtheid vlak sinds hier — '+d.days+' dagen '+(d.beforeBreak?'vóór de suikerbreuk (ongebruikelijk)':'rond/na de suikerbreuk (normaal)'))
                :('Gravity flat from here — '+d.days+' days '+(d.beforeBreak?'before the sugar break (unusual)':'around/after the sugar break (normal)')),
      tasted:nl?('Geproefd'+(d.rating?(' — '+'★'.repeat(d.rating)+'☆'.repeat(5-d.rating)):'')+(d.note?(': '+d.note):''))
                :('Tasted'+(d.rating?(' — '+'★'.repeat(d.rating)+'☆'.repeat(5-d.rating)):'')+(d.note?(': '+d.note):'')),
      competition:(function(){
        var won=d.award&&d.award!=='entered';
        var scoreTxt=d.score?(' ('+d.score+(d.maxScore?('/'+d.maxScore):'')+')'):'';
        var catTxt=d.category?(' — '+d.category):'';
        return nl?(won?(d.award+' bij '+(d.competition||'?')+catTxt+scoreTxt):('Ingezonden voor '+(d.competition||'?')+catTxt+scoreTxt))
                 :(won?(d.award+' at '+(d.competition||'?')+catTxt+scoreTxt):('Entered '+(d.competition||'?')+catTxt+scoreTxt));
      })(),
      bottled:nl?('Gebotteld'+(d.fg!=null?(' op FG '+d.fg.toFixed(3)):'')+(d.abv!=null?(' · '+d.abv+'% ABV'):''))
                :('Bottled'+(d.fg!=null?(' at FG '+d.fg.toFixed(3)):'')+(d.abv!=null?(' · '+d.abv+'% ABV'):'')),
      failed:(function(){
        var cat=(typeof FAILURE_CATEGORIES!=='undefined')?FAILURE_CATEGORIES.filter(function(c){return c.id===d.category;})[0]:null;
        var catLabel=cat?(typeof proseL==='function'?proseL(cat.label):cat.label):(d.category||(nl?'onbekende reden':'unknown reason'));
        return nl?('Batch gefaald — '+catLabel+(d.whatWentWrong?(': '+d.whatWentWrong):''))
                  :('Batch failed — '+catLabel+(d.whatWentWrong?(': '+d.whatWentWrong):''));
      })()
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
    'log-reading-missing':{benefit:'Een eerste meting geeft de adviseur iets om op te rekenen.',downside:'Zonder metingen blijft de adviseur blind voor voortgang, prognose en gezondheid.'},
    'log-reading-overdue':{benefit:'Een nieuwe meting houdt het advies scherp.',downside:'Te lang niet meten laat problemen ongemerkt doorlopen.'},
    'blowoff-headspace-critical':{benefit:'Nu voorzorg nemen voorkomt een rommelige overloop.',downside:'Negeren kan schuim/most naar buiten drukken en een besmettingsrisico geven.'},
    'blowoff-headspace-tight':{benefit:'Nu voorzorg nemen voorkomt een rommelige overloop.',downside:'Negeren kan schuim/most naar buiten drukken en een besmettingsrisico geven.'},
    'ferment-complete':{benefit:'Op tijd rackken/bottelen beperkt verdere zuurstofblootstelling.',downside:'Te lang wachten verlengt onnodig luchtcontact in het vat.',
      considerWaitingIf:'je hem bewust nog even op de gistdroesem laat liggen voor extra body of mondgevoel.'},
    'extended-bulk-aging':{benefit:'Binnenkort bottelen sluit verder zuurstofcontact bij het openen/verplaatsen van het vat af.',downside:'Langer wachten herhaalt dat oxidatierisico elke keer dat het vat verstoord wordt.',
      considerWaitingIf:'je bewust een langere bulk- of vatrijping aanhoudt die bij deze stijl hoort.'},
    'over-racked':{benefit:'Nu stoppen met overhevelen beperkt verdere cumulatieve zuurstofblootstelling.',downside:'Nog een overheveling erbij herhaalt dat kleine beetje zuurstof — het stapelt op.',
      considerWaitingIf:'er een concrete reden is (bv. echt nog troebel, of bewust van fruit/kruiden af).'},
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
    'log-reading-missing':{benefit:'A first reading gives the advisor something to work with.',downside:'Without any readings, the advisor stays blind to progress, projection and health.'},
    'log-reading-overdue':{benefit:'A fresh reading keeps the advice sharp.',downside:'Going too long without one lets problems go unnoticed.'},
    'blowoff-headspace-critical':{benefit:'Taking precaution now avoids a messy blow-off.',downside:'Ignoring it can push foam/must out and risk contamination.'},
    'blowoff-headspace-tight':{benefit:'Taking precaution now avoids a messy blow-off.',downside:'Ignoring it can push foam/must out and risk contamination.'},
    'ferment-complete':{benefit:'Racking/bottling promptly limits further oxygen exposure.',downside:'Waiting too long extends unnecessary air contact in the vessel.',
      considerWaitingIf:'you\'re intentionally leaving it on the yeast lees a while longer for extra body or mouthfeel.'},
    'extended-bulk-aging':{benefit:'Bottling soon closes off further oxygen exposure from opening or moving the vessel.',downside:'Waiting longer repeats that oxidation risk every time the vessel is disturbed.',
      considerWaitingIf:'you\'re deliberately doing an extended bulk- or barrel-aging style that calls for more time before bottling.'},
    'over-racked':{benefit:'Stopping here limits further cumulative oxygen exposure.',downside:'One more racking repeats that small dose of oxygen — it adds up.',
      considerWaitingIf:'there\'s a concrete reason (genuinely still cloudy, or deliberately racking off fruit/spices).'},
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
  // reads calmer than a bare "✓ Everything looks good". But sparse/early
  // data produces this exact same silence just as easily as a genuinely
  // healthy batch does — name what's actually missing right underneath it
  // so the calm reading doesn't double as a false all-clear.
  // Backed by a real, already-computed fact (own-history match, ahead-of-
  // pace, peak window) when one applies, instead of the same sentence every
  // time — still exactly one line, not additional volume (see _advQuietFact).
  var quietFact=sumParts.length?null:_advQuietFact(s);
  var summaryLine=sumParts.length
    ?('<div style="font-size:13.5px;color:var(--text2);margin-top:10px">'+sumParts.join(' · ')+'</div>')
    :('<div style="font-size:13.5px;color:var(--green2);margin-top:10px">✓ '+(nl?('Verloopt normaal'+(quietFact?(' — '+quietFact+'.'):(' — niets vraagt vandaag je aandacht.')))
                                                                                :('Progressing normally'+(quietFact?(' — '+quietFact+'.'):(' — nothing needs your attention today.'))))+'</div>'
      +(function(){var missing=_advMissingInputs(s);return missing.length?('<div style="font-size:11.5px;color:var(--text3);margin-top:4px">'+(nl?'Kan nog niet alles beoordelen — geen '+missing.join(', ')+' gelogd.':'Can\'t fully evaluate yet — no '+missing.join(', ')+' logged.')+'</div>'):'';})());
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
    // Evidence-first ordering (pro persona only): the other two personas want
    // rule-definition order (which reads as "most urgent within severity"
    // already, via the rules' own authoring order); an experienced brewer
    // reading title-only cards wants the strongest-evidence item leading
    // instead, since there's no prose left to signal which one to trust
    // most. Stable sort — items with equal confidence keep their original
    // relative order rather than shuffling for no reason.
    if(verbosity==='pro'){
      var byEvidence=function(a,c){return (c.confidence||0)-(a.confidence||0);};
      actionItems=actionItems.slice().sort(byEvidence);
      watchItems=watchItems.slice().sort(byEvidence);
      insightItems=insightItems.slice().sort(byEvidence);
    }
    // Causal grouping (nested): 'stalled' already computes a weighted,
    // ranked cause list (mwStalledCauses, E2) — _advStalledCauseItemIds
    // reuses it to find which OTHER currently-firing items correspond to
    // one of those named causes. Those items are pulled OUT of their own
    // normal severity bucket (a cause can originally be critical,
    // recommended, or info — nutrient-final vs ph-low vs fructose-stall-
    // risk) and rendered as indented sub-cards directly under 'stalled'
    // instead — a real primary/supporting structure, not just a text
    // cross-reference, so the grouping is visible regardless of which
    // buckets the pieces would otherwise have landed in.
    var stalledCauseItemIds=_advStalledCauseItemIds(adv.items);
    function excludeNested(items){return items.filter(function(i){return stalledCauseItemIds.indexOf(i.id)<0;});}
    actionItems=excludeNested(actionItems);
    watchItems=excludeNested(watchItems);
    insightItems=excludeNested(insightItems);
    var nestedCauseItems=stalledCauseItemIds.map(function(rid){return adv.items.filter(function(x){return x.id===rid;})[0];}).filter(Boolean);
    function itemCard(it,nested){
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
      // A short imperative line, visually separate from the explanation above
      // it — "what happened and why" vs "what to do", instead of one blended
      // paragraph. Only rendered with the full prose (pro persona already
      // hides reason/why the same way; a next-step with no explanation above
      // it would be a floating instruction with no context).
      var next=showProse?_advNextStep(it):null;
      var nextHtml=next?('<div style="font-size:11.5px;color:var(--text);margin-top:5px">'
        +'<span style="color:'+sm.color+'">→ '+(nl?'Volgende stap':'Next')+':</span> '+escHtml(next)+'</div>'):'';
      // Observed/Why/Next-step: a short, purely factual data line ahead of
      // the existing explanation — see _advObserved's own comment for why
      // this reuses raw data fields instead of rewriting the 27 existing
      // reason paragraphs.
      var observed=showProse?_advObserved(it):null;
      var observedHtml=observed?('<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-bottom:4px">'
        +(nl?'WAARGENOMEN':'OBSERVED')+': '+escHtml(observed)+'</div>'):'';
      // Contextual guide link (see _advGuideLink) — only for the ids with a
      // genuinely close troubleshoot-topic match, opens the app's existing
      // detail modal directly by id.
      // ChatGPT round 9: a distinctly-colored clickable link can pull the
      // eye out of proportion to its actual importance regardless of DOM
      // position (this already rendered LAST in the card, after the
      // explanation — but a bright link color competes with the
      // recommendation itself for attention). Muted to read as optional
      // supporting material — same tone as the "↳ related" label — not a
      // second call-to-action next to the real one.
      var guide=showProse?_advGuideLink(it):null;
      var guideHtml=guide?('<div style="margin-top:6px;font-family:var(--font-mono);font-size:10.5px;color:var(--text3)">'
        +'<a href="#" onclick="event.preventDefault();openTroubleshootTopic(\''+guide.topicId+'\')" style="color:inherit;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.25)">'
        +'📖 '+(nl?'Meer lezen':'Read more')+': '+guide.icon+' '+escHtml(guide.title)+'</a></div>'):'';
      // Beginner persona, critical severity: scoped version of "color-
      // intensity changes" — a first-time brewer most needs to not miss
      // something that actually needs action right now, so critical items
      // get a visually heavier treatment (thicker border, stronger tint)
      // specifically in this persona. Recommended/info items are untouched
      // — the goal is making the one urgent thing stand out more, not
      // raising intensity everywhere (which would just be louder, not
      // clearer). Nested sub-cards never get this — they're already
      // de-emphasized by design (supporting evidence, not the headline).
      var beginnerCritical=(verbosity==='beginner'&&it.severity==='critical'&&!nested);
      // ChatGPT round 9: a nested cause item isn't always PURE supporting
      // evidence — some (nutrient-final, ph-low…) carry their own distinct
      // "→ Next" action, not just context for the primary card above. The
      // uniform dim/shrink treatment risked that action reading as merely
      // supporting detail and getting skipped. A nested item WITH its own
      // next-step keeps full opacity (still smaller/indented — still
      // visually grouped under the primary — but not faded), and the
      // "related" label says so explicitly; one with no next-step (genuinely
      // just evidence) keeps the fully quiet treatment.
      var nestedHasAction=nested&&!!next;
      var nestedLabel=nested?(nl
        ?(nestedHasAction?'↳ GERELATEERD — VEREIST OOK ACTIE':'↳ GERELATEERD AAN GISTING HIERBOVEN')
        :(nestedHasAction?'↳ RELATED — ALSO NEEDS ACTION':'↳ RELATED TO THE STALL ABOVE')):'';
      // Nested sub-cards get a smaller/indented treatment + a "↳ related"
      // label — kept visible even for 'pro' (structural grouping, not prose).
      var wrapStyle=nested
        ?'background:'+sm.bg+';border-left:3px solid '+sm.color+';border-radius:var(--radius);padding:8px 11px;margin:6px 0 0 22px'+(nestedHasAction?'':';opacity:0.92')
        :beginnerCritical
        ?'background:rgba(176,58,46,0.20);border-left:5px solid '+sm.color+';border-radius:var(--radius);padding:12px 14px;margin-bottom:8px'
        :'background:'+sm.bg+';border-left:3px solid '+sm.color+';border-radius:var(--radius);padding:11px 13px;margin-bottom:8px';
      return '<div style="'+wrapStyle+'">'
        +(nested?'<div style="font-family:var(--font-mono);font-size:9px;color:'+(nestedHasAction?sm.color:'var(--text3)')+';margin-bottom:2px">'+escHtml(nestedLabel)+'</div>':'')
        +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:3px">'
        +'<div style="font-family:var(--font-display);font-size:'+(nested?'13px':'14px')+';color:'+sm.color+'">'+t.icon+' '+escHtml(t.title)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:0.5px">'+cm.icon+' '+escHtml(cm.label)+' · '+sm.label+' · '+(nl?'bewijs':'evidence')+' '+evidence+'</div></div>'
        +(showProse?observedHtml+'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(t.reason)+'</div>'+nextHtml+whyHtml+guideHtml:'')+'</div>';
    }
    // 'stalled' is always severity 'critical' (always in actionItems when it
    // fires), so its nested cause cards always render inside the Actions
    // section regardless of which bucket each cause item came from.
    function cardWithNested(it){
      return itemCard(it)+(it.id==='stalled'?nestedCauseItems.map(function(ci){return itemCard(ci,true);}).join(''):'');
    }
    // itemCard takes (it, nested) — passing it straight to .map() would leak
    // map's own index argument into `nested` (index 1+ is truthy), the exact
    // ['1','2','3'].map(parseInt) gotcha. Every .map() call below wraps it in
    // a single-arg lambda so `nested` only ever gets what cardWithNested (or
    // nothing) explicitly passes.
    var actionsSection=actionItems.length?('<div class="micro-label" style="color:var(--red2);margin-bottom:6px">'+(nl?'ACTIES':'ACTIONS')+'</div>'+actionItems.map(cardWithNested).join('')):'';
    var watchSection=watchItems.length?('<div class="micro-label" style="color:var(--gold2);margin:'+(actionItems.length?'14px':'0')+' 0 6px">'+(nl?'OM TE VOLGEN':'WATCH')+'</div>'+watchItems.map(function(it){return itemCard(it);}).join('')):'';
    // Persona hierarchy: a beginner benefits from more visible context by
    // default (the "why is this here at all" reassurance an experienced
    // brewer already has from repetition) — insights start expanded for
    // 'beginner' instead of collapsed. 'experienced'/'pro' keep the
    // collapsed default (pro especially wants minimal surface).
    var insightsSection=insightItems.length?('<details'+(verbosity==='beginner'?' open':'')+' style="margin-top:'+(actionItems.length||watchItems.length?'14px':'0')+'"><summary style="cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:4px 0;user-select:none">'
      +'💡 '+insightItems.length+' '+(nl?(insightItems.length>1?'inzichten':'inzicht'):(insightItems.length>1?'insights':'insight'))+'</summary>'+insightItems.map(function(it){return itemCard(it);}).join('')+'</details>'):'';
    // Beginner jargon glossary (see _advRelevantGlossary) — only the terms
    // this batch's own currently-firing advice actually uses, not a static
    // dump. Own collapsed section rather than inline tooltips (no framework
    // in this codebase for hover/click popovers on arbitrary inline text).
    var glossaryHtml='';
    if(verbosity==='beginner'){
      var glossaryTerms=_advRelevantGlossary(adv.items);
      if(glossaryTerms.length){
        glossaryHtml='<details style="margin-top:14px"><summary style="cursor:pointer;font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:4px 0;user-select:none">'
          +'📖 '+(nl?'Termen hierboven uitgelegd':'Terms used above, explained')+'</summary>'
          +glossaryTerms.map(function(g){return '<div style="margin:6px 0;padding-left:2px"><strong style="color:var(--gold2);font-size:12.5px">'+escHtml(g.term)+'</strong><div style="font-size:12px;color:var(--text3);line-height:1.5;margin-top:1px">'+escHtml(g.def)+'</div></div>';}).join('')
          +'</details>';
      }
    }
    recHtml=catStrip+actionsSection+watchSection+insightsSection+glossaryHtml;
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
