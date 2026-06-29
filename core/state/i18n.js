// ==========================================================================
// App-shell localisation. The UI chrome (sidebar nav, topbar, primary buttons,
// sync badge) follows the chosen language, which is the SAME setting that drives
// the label + share-page i18n (APP.settings.labelLocale) — so one switch changes
// everything. Deep per-view body text is still English; new strings opt in via
// _UI(en, nl). Switch language in Settings → Language · Taal.
// ==========================================================================
function appLang(){return (APP.settings&&APP.settings.labelLocale)||'en';}
function _UI(en,nl){return appLang()==='nl'?nl:en;}
// Translate a raw recipe-step description to NL (used by sites that render the
// desc without going through annotateNutrientDesc). Pass-through when not NL.
function stepDescL(d){return (appLang()==='nl'&&typeof STEP_DESC_NL!=='undefined'&&STEP_DESC_NL[d])?STEP_DESC_NL[d]:d;}

// Sidebar nav id → [English, Nederlands]
var UI_NAV={
  'nav-dashboard':['Dashboard','Dashboard'],
  'nav-batches':['My Batches','Mijn brouwsels'],
  'nav-cellar':['The Cellar','De kelder'],
  'nav-timeline':['Aging Timeline','Rijpingstijdlijn'],
  'nav-ferm-timeline':['Fermenter Schedule','Vatplanning'],
  'nav-compare':['Compare','Vergelijken'],
  'nav-insights':['Insights','Inzichten'],
  'nav-suppliers':['Suppliers','Leveranciers'],
  'nav-coach':['Daily Coach','Dagelijkse coach'],
  'nav-recipes':['Recipes','Recepten'],
  'nav-honey':['Honey Library','Honingbibliotheek'],
  'nav-yeast-library':['Yeast Library','Gistbibliotheek'],
  'nav-nutrient-library':['Nutrient & Protocols','Voeding & protocollen'],
  'nav-calendar':['Calendar','Kalender'],
  'nav-tools':['Brewing Tools','Brouwgereedschap'],
  'nav-supplies':['Supplies','Voorraad'],
  'nav-guide':['Mead Guide','Medegids'],
  'nav-troubleshoot':['Troubleshoot','Probleemoplossing']
};
// Topbar icon-button id → [English, Nederlands] tooltip/aria-label
var UI_TT={
  'scan-btn':['Scan a bottle/storage label QR code','Scan een fles-/opslaglabel-QR-code'],
  'search-btn':['Search everything (Ctrl/Cmd-K)','Doorzoek alles (Ctrl/Cmd-K)'],
  'sync-btn':['Sync to server','Synchroniseer met server'],
  'settings-btn':['Settings','Instellingen']
};

// Re-label the static app shell for the current language. Cheap, idempotent —
// called on boot and whenever the language changes.
function applyUiLanguage(){
  var i=appLang()==='nl'?1:0;
  Object.keys(UI_NAV).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var s=el.querySelector('span:last-child')||el;s.textContent=UI_NAV[id][i];
  });
  function setText(id,en,nl){var el=document.getElementById(id);if(el)el.textContent=(i?nl:en);}
  setText('side-sec-nav','Navigation','Navigatie');
  setText('side-sec-active','Active Batches','Actieve brouwsels');
  setText('btn-new-batch','＋ New Batch','＋ Nieuw brouwsel');
  Object.keys(UI_TT).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.title=UI_TT[id][i];el.setAttribute('aria-label',UI_TT[id][i]);
  });
  try{document.documentElement.setAttribute('lang',i?'nl':'en');}catch(e){}
}

function setAppLang(lang){
  if(!APP.settings)APP.settings={};
  APP.settings.labelLocale=(lang==='nl')?'nl':'en';
  applyUiLanguage();
  if(typeof setSyncStatus==='function'&&typeof syncStatus!=='undefined')setSyncStatus(syncStatus); // re-label badge
  if(typeof scheduleSave==='function')scheduleSave();
  if(typeof renderMain==='function')renderMain();
}

// ===== Body translation layer =====================================================
// Retrofitting i18n onto ~30 view modules by wrapping every string would be a
// thousand edits. Instead, a curated EN→NL dictionary is applied to the rendered
// DOM after each render (NL only): exact-match on trimmed text nodes, a few
// regex patterns for interpolated strings, plus title/placeholder attributes.
// Built up wave by wave — findUntranslated() (below) lists what still needs adding.
var UI_PHRASES={
  // ---- audit pass: batch detail / cellar / timeline / tools / coach chrome ----
  '🔁 Rack to Vessel':'🔁 Hevel naar vat','⚰ Mark as Failed':'⚰ Markeer als mislukt',
  'Overview':'Overzicht','Gravity Log':'Dichtheidslogboek','BATCH DETAILS':'PARTIJDETAILS','Recipe':'Recept',
  'Bottled date · oldest first':'Botteldatum · oudste eerst','Bottled date · newest first':'Botteldatum · nieuwste eerst',
  'Name A→Z':'Naam A→Z','Bottles on hand · most first':'Flessen op voorraad · meeste eerst','ABV · highest first':'Alcohol · hoogste eerst',
  'Current Vessel':'Huidig vat','Honey Used':'Gebruikte honing','Bottle Date':'Botteldatum',
  '✓ NEAR FINAL GRAVITY':'✓ BIJNA EINDDICHTHEID','EST. DONE':'GESCH. KLAAR',
  '✓ Near final gravity':'✓ Bijna einddichtheid',
  "Close to the projected final gravity. Take two stable readings a few days apart to confirm it's done, then rack/bottle.":'Dicht bij de verwachte einddichtheid. Neem twee stabiele metingen een paar dagen uit elkaar om te bevestigen dat het klaar is, en hevel/bottel dan.',
  'Label not yet configured for this recipe.':'Label nog niet geconfigureerd voor dit recept.',
  '📜 Complete Record':'📜 Volledig dossier','💾 Save Template':'💾 Sjabloon opslaan',
  'Complete':'Voltooid',
  'Rack to Secondary':'Hevel naar secundair','→ Final Gravity':'→ Einddichtheid','→ Bottle':'→ Bottelen',
  'Aging status (default)':'Rijpingsstatus (standaard)','Bottled Batches':'Gebottelde partijen',
  'At Peak':'Op hoogtepunt','Ready to Drink':'Klaar om te drinken','📦 OTHER':'📦 OVERIG',
  'AGING PROGRESS':'RIJPINGSVOORTGANG','✏ Edit':'✏ Bewerken','↗ Open Batch':'↗ Partij openen',
  '🧪 YEAST PERFORMANCE · LONGITUDINAL':'🧪 GISTPRESTATIE · LONGITUDINAAL',
  'Ready':'Klaar','Peak':'Hoogtepunt',
  'Log Reading':'Meting loggen','Mark as done':'Markeer als gedaan',
  'Done today — uncheck if not':'Vandaag gedaan — vink uit indien niet',
  '✓ No action today. Verify airlock water and temperature.':'✓ Geen actie vandaag. Controleer waterslot en temperatuur.',
  'Fermentation mostly complete. Mead is conditioning and clearing. Confirm gravity stability before racking.':'Gisting grotendeels voltooid. De mede conditioneert en klaart. Bevestig dichtheidsstabiliteit vóór het overhevelen.',
  'manage supplies':'voorraad beheren','🍷 DRINKING WINDOW':'🍷 DRINKVENSTER',
  'unassigned vessel':'niet-toegewezen vat','🍯 HONEY USAGE FORECAST':'🍯 HONINGVERBRUIK-PROGNOSE',
  'Strongest Batch':'Sterkste partij','Avg Brew → Bottle':'Gem. brouw → bottel',
  'Cross-checked against your planned batches — a ⚠ badge means brewing it now would leave too little for a scheduled batch.':'Gecontroleerd tegen je geplande partijen — een ⚠-badge betekent dat het nu brouwen te weinig zou overlaten voor een geplande partij.',
  '⬆ Sync Now':'⬆ Nu synchroniseren','Verify Storage':'Opslag verifiëren',
  '＋ Add Supplier':'＋ Leverancier toevoegen',
  'No suppliers yet. Add your trusted beekeepers and brewing-supply shops to keep track of where to source each honey type.':'Nog geen leveranciers. Voeg je vertrouwde imkers en brouwwinkels toe om bij te houden waar je elke honingsoort haalt.',
  'READY → PEAK':'KLAAR → HOOGTEPUNT','Ready → Peak':'Klaar → Hoogtepunt',
  'Past peak':'Voorbij hoogtepunt','🏆 NEXT TO PEAK':'🏆 VOLGENDE OP HOOGTEPUNT',
  'Apply TOSNA plan to this batch':'TOSNA-plan toepassen op deze partij','Open batch →':'Partij openen →',
  'K-META TO ADD':'K-META TOE TE VOEGEN','TARTARIC ACID TO ADD':'WIJNSTEENZUUR TOE TE VOEGEN',
  'Batch A':'Partij A','Batch B':'Partij B','Plain water · 0% ABV (dilution)':'Puur water · 0% alcohol (verdunning)',
  'Total blend volume (L) — for the litre breakdown':'Totaal mengvolume (L) — voor de literuitsplitsing',
  "Applying will switch this batch's nutrient from":'Toepassen wijzigt de voeding van deze partij van',
  'and write the 4 doses above into the additions log.':'en schrijft de 4 doses hierboven in het toevoegingenlogboek.',
  '🗓 Plan a Batch':'🗓 Plan een partij','📊 YOUR HISTORY WITH THIS RECIPE':'📊 JOUW GESCHIEDENIS MET DIT RECEPT',
  'AVG DAYS TO BOTTLE':'GEM. DAGEN TOT BOTTELEN','Settings → Costs & Supplies':'Instellingen → Kosten & Voorraad',
  'Fermaid-O, then backsweeten':'Fermaid-O, dan terugzoeten',
  'STRAIN':'STAM','FORMAT':'FORMAAT','liquid pouch':'vloeibare zak','ABV TOLERANCE':'ALCOHOLTOLERANTIE',
  'OPTIMAL TEMP':'OPTIMALE TEMP','SPEED':'SNELHEID',
  // ---- recipe-detail "Traditional choices" chrome ----
  '🧫 RECOMMENDED YEAST':'🧫 AANBEVOLEN GIST','all strains →':'alle stammen →',
  '⚗ NUTRIENT STRATEGY':'⚗ VOEDINGSSTRATEGIE','all nutrients →':'alle voedingen →',
  '⚗ DIAL IN YOUR OUTCOME':'⚗ STEL JE RESULTAAT AF','HONEY × YEAST × NUTRIENT':'HONING × GIST × VOEDING',
  '🍓 FRUIT & SPICE ADDITIONS':'🍓 FRUIT- & SPECERIJTOEVOEGINGEN','Watch out:':'Let op:',
  'BEST FIT':'BESTE MATCH','ALSO WORKS':'WERKT OOK','AVOID':'VERMIJD',
  'FRUIT':'VRUCHT','SPICE':'SPECERIJ','FLORAL':'BLOEM','WOOD':'HOUT','TANNIN':'TANNINE','OTHER':'OVERIG',
  'honey':'honing','yeast':'gist','nutrient':'voeding',
  'RELATED VERSION':'GERELATEERDE VERSIE','RELATED VERSIONS':'GERELATEERDE VERSIES',
  'Blend two bottled meads in any ratio to predict the resulting ABV, sweetness, and per-litre cost. Useful for dialing in a balanced finish before committing.':'Meng twee gebottelde meden in elke verhouding om het resulterende alcoholpercentage, de zoetheid en de kosten per liter te voorspellen. Handig om een gebalanceerde afdronk in te stellen vóór je je vastlegt.',
  'Approximate values. Sweetness blends linearly on a 6-point scale; real blending may shift slightly with carbonation, oxidation, or rest time. Bench-trial a small measured blend before committing the whole batch.':'Benaderende waarden. Zoetheid mengt lineair op een 6-puntsschaal; echt mengen kan licht verschuiven met koolzuur, oxidatie of rusttijd. Doe eerst een kleine gemeten proefmenging vóór je de hele partij vastlegt.',
  'Approximate values. Sweetness blends linearly on a 6-point scale; real blending may shift slightly with carbonation, oxidation, or rest time. Diluting with water also thins body and aroma — taste as you go.':'Benaderende waarden. Zoetheid mengt lineair op een 6-puntsschaal; echt mengen kan licht verschuiven met koolzuur, oxidatie of rusttijd. Verdunnen met water maakt body en aroma ook dunner — proef terwijl je gaat.',
  // ---- dashboard ----
  'Active Batches':'Actieve brouwsels','Bottles On Hand':'Flessen in voorraad',
  'Batches Brewed':'Gebrouwen','Bottled (lifetime)':'Gebotteld (totaal)',
  'Gifted Away':'Weggegeven','Enjoyed':'Genoten','Ferment Temp':'Gisttemp',
  'fermenting now':'nu aan het gisten',
  '◈ ACTIVE BATCHES':'◈ ACTIEVE BROUWSELS',"✦ TODAY'S TASKS":'✦ TAKEN VAN VANDAAG',
  '⚗ FERMENTER STATUS':'⚗ VATSTATUS','GRAVITY TREND':'DICHTHEIDSVERLOOP',
  'OG':'OG','CURRENT':'HUIDIG','EST ABV':'GESCH. ALC',
  'fermenting':'in gisting','conditioning':'op smaak komen','aging':'rijpen',
  'bottled':'gebotteld','planning':'gepland','complete':'voltooid','failed':'mislukt','stalled':'gevalt stil',
  'FREE':'VRIJ','See full briefing →':'Volledige briefing →',
  'The family meadwright tradition begins here.':'De familietraditie van de medemaker begint hier.',
  '＋ Start First Batch':'＋ Start eerste brouwsel',
  'No tasks today — your batches rest peacefully.':'Geen taken vandaag — je brouwsels rusten vredig.',
  // default fermenter names
  'Primary 1':'Primair 1','Primary 2':'Primair 2','Secondary 1':'Secundair 1',
  'Secondary 2':'Secundair 2','Bulk Aging 1':'Bulkrijping 1','Bulk Aging 2':'Bulkrijping 2',
  // common brew-step titles
  'Brew Day':'Brouwdag','First Nutrient (SNA 1/2)':'Eerste voeding (SNA 1/2)',
  'Second Nutrient (SNA 2/2)':'Tweede voeding (SNA 2/2)','First Nutrient + Punch Down':'Eerste voeding + aandrukken',
  // ---- batches / cellar ----
  'My Batches':'Mijn brouwsels','＋ New Batch':'＋ Nieuw brouwsel','The Cellar':'De kelder',
  'Your cellar awaits its first creation.':'Je kelder wacht op zijn eerste creatie.',
  '＋ Begin First Batch':'＋ Begin eerste brouwsel',
  'Bottle Aging Tracker':'Flesrijping-tracker','No bottled batches yet.':'Nog geen gebottelde brouwsels.',
  'Bottles you record will appear here with aging progress against optimal drinking windows.':'Geregistreerde flessen verschijnen hier met rijpingsvoortgang t.o.v. het optimale drinkvenster.',
  '🏠 My Cellar →':'🏠 Mijn kelder →',
  // ---- calendar ----
  'Calendar':'Kalender','📅 Export to Calendar (.ics)':'📅 Exporteer naar agenda (.ics)',
  'Brewing Schedule & Upcoming Steps':'Brouwschema & komende stappen',
  'Mon':'ma','Tue':'di','Wed':'wo','Thu':'do','Fri':'vr','Sat':'za','Sun':'zo',
  'Tap a day to see its full schedule.':'Tik op een dag voor het volledige schema.',
  'UPCOMING EVENTS':'KOMENDE GEBEURTENISSEN','No upcoming events.':'Geen komende gebeurtenissen.',
  // ---- daily coach ----
  'Daily Coach':'Dagelijkse coach','No active batches to coach.':'Geen actieve brouwsels om te coachen.',
  '＋ Start Brewing':'＋ Begin met brouwen','DAILY REMINDERS':'DAGELIJKSE HERINNERINGEN',
  '🌡 Temperature':'🌡 Temperatuur','👁 Airlock':'👁 Waterslot','📊 Gravity':'📊 Dichtheid','🧼 Sanitation':'🧼 Hygiëne',
  'Fermentation space at each yeast’s optimal range? Even brief swings stress yeast.':'Gistruimte op het optimale bereik van elke gist? Zelfs korte schommelingen stressen de gist.',
  'Water to the fill line? A dry airlock invites contamination.':'Water tot de vullijn? Een droog waterslot nodigt besmetting uit.',
  'Active batches: reading every 3-4 days reveals patterns.':'Actieve brouwsels: elke 3-4 dagen meten onthult patronen.',
  'Clean first (e.g. Chemipro OXI), then a no-rinse sanitizer (Chemipro SAN or Star San). On everything, every time.':'Eerst reinigen (bv. Chemipro OXI), dan een spoelvrij ontsmettingsmiddel (Chemipro SAN of Star San). Op alles, elke keer.',
  // ---- compare ----
  'Compare':'Vergelijken','No batches to compare yet.':'Nog geen brouwsels om te vergelijken.',
  'Side-by-side analysis · select 2-4 batches to overlay gravity curves and stats':'Analyse naast elkaar · selecteer 2-4 brouwsels om dichtheidscurves en cijfers te overlappen',
  // ---- fermenter schedule ----
  'Fermenter Schedule':'Vatplanning',
  'When each vessel is busy · click a bar to open the batch':'Wanneer elk vat bezet is · klik een balk om het brouwsel te openen',
  '◀ −1mo':'◀ −1mnd','⌂ Today':'⌂ Vandaag','+1mo ▶':'+1mnd ▶','Today':'Vandaag','Free':'Vrij',
  'Bottled (actual)':'Gebotteld (werkelijk)','Projected (active batch)':'Verwacht (actief brouwsel)','Planned (queued)':'Gepland (in wachtrij)',
  '📅 NEXT TO FREE UP':'📅 EERSTVOLGEND VRIJ','◷ BREW PLAN':'◷ BROUWPLAN','＋ Plan a Batch':'＋ Plan een brouwsel',
  'No batches queued. Plan your next brews to see them on the schedule above and roll up everything you need to buy.':'Geen brouwsels in wachtrij. Plan je volgende brouwsels om ze hierboven in het schema te zien en alles wat je moet kopen te verzamelen.',
  // ---- recipes ----
  'Recipes':'Recepten','⬇ Import BeerXML':'⬇ BeerXML importeren','✦ Designer':'✦ Ontwerper','＋ Create Recipe':'＋ Recept maken',
  '🍯 BREW WITH WHAT YOU HAVE':'🍯 BROUW MET WAT JE HEBT','BATCH SIZE':'LOTGROOTTE',
  'Recipes you can start now from your supplies — honey, yeast, nutrient and the chemicals each recipe calls for (pectic enzyme, metabisulfite, sorbate).':'Recepten die je nu kunt starten uit je voorraad — honing, gist, voeding en de chemicaliën die elk recept vraagt (pectine-enzym, metabisulfiet, sorbaat).',
  'PIN:':'PIN:','★ Favorites':'★ Favorieten','STYLE:':'STIJL:','All Styles':'Alle stijlen',
  'DIFFICULTY:':'MOEILIJKHEID:','All':'Alle','Beginner':'Beginner','Intermediate':'Gevorderd','Advanced':'Geavanceerd','Expert':'Expert',
  'TIME TO READY:':'TIJD TOT KLAAR:','Any time':'Elke tijd','Quick (< 3mo)':'Snel (< 3mnd)','Medium (3-12mo)':'Gemiddeld (3-12mnd)','Long (1yr+)':'Lang (1jr+)',
  'ADDITIONS:':'TOEVOEGINGEN:','All stages':'Alle fasen','Primary additions':'Primaire toevoegingen','Secondary additions':'Secundaire toevoegingen','Both':'Beide','No additions':'Geen toevoegingen',
  'GENERIC LABEL':'GENERIEK ETIKET','PRIMARY ADD':'PRIMAIRE TOEV.','SECONDARY ADD':'SECUNDAIRE TOEV.',
  '9 L primary':'9 L primair','7.6 L or 5 L secondary':'7,6 L of 5 L secundair','5 L bulk aging':'5 L bulkrijping',
  '(vigorous fermentation, good headspace) →':'(krachtige gisting, goede kopruimte) →',
  '(settling, clarification) →':'(bezinken, klaring) →',
  'before bottling (minimal headspace, oxidation-protected).':'vóór het bottelen (minimale kopruimte, beschermd tegen oxidatie).',
  '(fruit, ginger, etc.) survive CO₂ scrubbing;':'(fruit, gember, enz.) overleven het CO₂-uitspoelen;',
  'secondary additions':'secundaire toevoegingen',
  '(delicate spices, vanilla, hops) preserve aromatics.':'(delicate kruiden, vanille, hop) behouden aromatiek.',
  // ---- brewing tools ----
  'Brewing Tools':'Brouwgereedschap','Calculators & Utilities':'Calculators & hulpmiddelen',
  '🍶 ABV CALCULATOR':'🍶 ALCOHOL-CALCULATOR','Original Gravity':'Begindichtheid','Final Gravity':'Einddichtheid','ESTIMATED ABV':'GESCHAT ALCOHOL',
  '🍯 HONEY CALCULATOR':'🍯 HONINGCALCULATOR','Target Volume (L)':'Doelvolume (L)','Target OG':'Doel-OG','HONEY NEEDED':'HONING NODIG',
  'Calculate honey needed for target gravity. Based on standard yield (~35 PPG). Reference: 5L at OG 1.098 ≈ 1.7 kg honey.':'Bereken de honing nodig voor de doeldichtheid. Op basis van standaardopbrengst (~35 PPG). Referentie: 5 L bij OG 1.098 ≈ 1,7 kg honing.',
  '🧪 SANITIZER MIX':'🧪 ONTSMETTINGSMENGSEL','Product':'Product','Water Volume (L)':'Watervolume (L)',
  '🧼 CLEANER MIX (CHEMIPRO OXI)':'🧼 REINIGERMENGSEL (CHEMIPRO OXI)','clean first':'eerst reinigen',
  // ---- brewing tools: content prose ----
  'Chemipro SAN: 2 ml per 1L water (= 20 ml per 10L). 1 min surface contact (or 15-min soak). Acid-anionic, no-rinse when drained. Foam is harmless. Not for aluminum. Never mix with chlorine cleaners. Always':'Chemipro SAN: 2 ml per 1 L water (= 20 ml per 10 L). 1 min contacttijd (of 15 min weken). Zuur-anionisch, spoelvrij na uitlekken. Schuim is onschadelijk. Niet voor aluminium. Nooit mengen met chloorreinigers. Altijd',
  'with an oxygen-based cleaner like Chemipro OXI (see card below).':'met een zuurstofreiniger zoals Chemipro OXI (zie kaart hieronder).',
  '— strips residue before sanitizing. 4 g per 1 L warm water, 2-5 min contact, drain well.':'— verwijdert resten vóór het ontsmetten. 4 g per 1 L warm water, 2-5 min contact, goed laten uitlekken.',
  'Hydrometers are calibrated at one temperature (usually 20°C). At other temperatures, density changes — your reading needs correcting. The polynomial formula handles 0-40°C accurately.':'Hydrometers zijn geijkt op één temperatuur (meestal 20°C). Bij andere temperaturen verandert de dichtheid — je meting moet gecorrigeerd worden. De polynoomformule verwerkt 0-40°C nauwkeurig.',
  'Warm sample — true SG is higher than the raw reading (+0.0004).':'Warm monster — de werkelijke SG is hoger dan de ruwe meting (+0,0004).',
  'Hydrometer reads SG, refractometer reads Brix. Fill either side and the other converts in real time. The "OG (for mid-ferment correction)" field handles the alcohol-skew problem when reading a refractometer during fermentation.':'Hydrometer leest SG, refractometer leest Brix. Vul één kant in en de andere rekent direct om. Het veld "OG (voor correctie tijdens gisting)" lost de alcoholafwijking op bij het aflezen van een refractometer tijdens de gisting.',
  'FROM SG':'VANUIT SG','FROM BRIX':'VANUIT BRIX',
  '+ Mid-fermentation refractometer correction':'+ Refractometercorrectie tijdens gisting',
  "optional — only needed if you're mid-ferment":'optioneel — alleen nodig tijdens de gisting',
  'Mead Yeast Nutrient (SNA). Standard mead needs ~2.4 g/L total, heavy/high-gravity ~4.8 g/L. Split across 2 doses (Day 1 + Day 3).':'Mede-gistvoeding (SNA). Standaardmede heeft ~2,4 g/L totaal nodig, zwaar/hoge dichtheid ~4,8 g/L. Verdeeld over 2 doses (Dag 1 + Dag 3).',
  'TOTAL':'TOTAAL','SNA · 2 doses':'SNA · 2 doses',
  '🧫 YEAST REHYDRATION TIMER':'🧫 GISTREHYDRATIE-TIMER',
  "For yeasts that require rehydration (most champagne strains, EC-1118, K1V-1116, D47, etc.). M05 sprinkles directly — skip this for M05. Go-Ferm Sterol Flash protocol improves viability dramatically.":'Voor gisten die rehydratie vereisen (de meeste champagnestammen, EC-1118, K1V-1116, D47, enz.). M05 strooi je direct — sla dit over voor M05. Het Go-Ferm Sterol Flash-protocol verbetert de vitaliteit aanzienlijk.',
  'Start Rehydration Workflow':'Start rehydratie-workflow',
  "Generate a 4-dose Fermaid-O TOSNA schedule for an active batch — then apply it. Applying switches the batch's nutrient to Fermaid-O and writes the 4 doses into the additions log so they show up in the coach and calendar.":'Genereer een TOSNA-schema met 4 Fermaid-O-doses voor een actief brouwsel — en pas het toe. Toepassen zet de voeding van het brouwsel om naar Fermaid-O en schrijft de 4 doses in het toevoeglogboek zodat ze in de coach en kalender verschijnen.',
  'No active batches to plan for. Start a batch first, then come back.':'Geen actieve brouwsels om voor te plannen. Start eerst een brouwsel en kom dan terug.',
  'How much yeast for your batch. Higher OG = more stress = more yeast. Output also includes rehydration water amount.':'Hoeveel gist voor je brouwsel. Hogere OG = meer stress = meer gist. De uitvoer bevat ook de hoeveelheid rehydratiewater.',
  'Yeast':'Gist','DRY YEAST':'DROGE GIST','MODERATE STRESS':'MATIGE STRESS',
  'in 100ml warm water (35-40°C) for 15-20 min before pitching. Stir gently — no shocking.':'in 100 ml warm water (35-40°C) gedurende 15-20 min vóór het enten. Roer zacht — geen schok.',
  'Clean, floral, neutral. Highlights honey character.':'Schoon, bloemig, neutraal. Benadrukt het honingkarakter.',
  'Organic, staggered nutrient scheduling. The YAN target starts from the base (gravity points × 9, Moutela) and is scaled by your':'Organische, gespreide voedingsplanning. Het YAN-doel start vanuit de basis (dichtheidspunten × 9, Moutela) en wordt geschaald op je',
  "yeast's nitrogen demand":'stikstofbehoefte van de gist','and the':'en de',"honey's darkness":'donkerte van de honing',
  '— the two factors that change how much nitrogen the must actually needs. GoFerm rehydration plus staggered Fermaid-O doses through the 1/3 sugar break.':'— de twee factoren die bepalen hoeveel stikstof de most echt nodig heeft. GoFerm-rehydratie plus gespreide Fermaid-O-doses tot aan de 1/3-suikerbreuk.',
  'Protocol':'Protocol',
  'TOSCA 2.0 is a refinement of TOSNA: same staggered-organic idea, but the YAN target is scaled by yeast demand × honey colour and the last dose lands on the 1/3 sugar break.':'TOSCA 2.0 is een verfijning van TOSNA: hetzelfde gespreid-organische idee, maar het YAN-doel wordt geschaald op gistbehoefte × honingkleur en de laatste dose valt op de 1/3-suikerbreuk.',
  'Yeast nitrogen demand':'Stikstofbehoefte van de gist',
  'High (Wyeast 4184 Sweet, hungry strains)':'Hoog (Wyeast 4184 Sweet, hongerige stammen)',
  'Extra-high (high-gravity sack / step-feed)':'Extra hoog (hoge dichtheid sack / stapsgewijs voeden)',
  'Honey darkness':'Donkerte van de honing','YAN TARGET (ppm)':'YAN-DOEL (ppm)','TOTAL NUTRIENT':'TOTALE VOEDING',
  "What's the 1/3 sugar break?":'Wat is de 1/3-suikerbreuk?',
  '(100 gravity points → stop adding nitrogen once ~33 points are gone). Yeast take up nitrogen during their early growth phase, so all nutrients go in before this point; dosing later — especially DAP — feeds fusels instead of cells. Degas gently before each addition (nutrients + CO₂ can foam over).':'(100 dichtheidspunten → stop met stikstof toevoegen zodra ~33 punten weg zijn). Gist neemt stikstof op tijdens de vroege groeifase, dus alle voeding gaat vóór dit punt erin; later doseren — vooral DAP — voedt fusels in plaats van cellen. Ontgas zacht vóór elke toevoeging (voeding + CO₂ kan overschuimen).',
  'Compute honey/sugar to raise FG to a target sweetness, plus stabilization doses. Always stabilize BEFORE backsweetening: sorbate + K-meta together prevent renewed fermentation.':'Bereken honing/suiker om de FG naar een doelzoetheid te tillen, plus stabilisatiedoses. Stabiliseer altijd VÓÓR het terugzoeten: sorbaat + K-meta samen voorkomen hernieuwde gisting.',
  'Target FG':'Doel-FG','Honey (≈1.42 SG, ~80% sugar)':'Honing (≈1,42 SG, ~80% suiker)',
  'Table Sugar (sucrose)':'Tafelsuiker (sucrose)','DME (Dry Malt Extract)':'DME (droog moutextract)',
  'PROTOCOL · STABILIZE BEFORE SWEETENING':'PROTOCOL · STABILISEER VÓÓR HET ZOETEN',
  '1. Rack off any sediment into a clean vessel.':'1. Hevel eventueel bezinksel over naar een schoon vat.',
  'in a little mead, stir into batch.':'in wat mede, roer door het brouwsel.',
  '. Yeast activity must be fully stopped.':'. De gistactiviteit moet volledig gestopt zijn.',
  '4. Warm':'4. Verwarm',
  "gently (don't exceed 50°C) and stir in until fully dissolved.":'zacht (niet boven 50°C) en roer tot volledig opgelost.',
  '5. Taste before bottling — adjust if too dry/sweet.':'5. Proef vóór het bottelen — bijstellen indien te droog/zoet.',
  "Sorbate alone doesn't kill yeast — it blocks reproduction. Must be combined with K-meta (free SO₂) or refrigeration. Wait 48h after stabilizing before adding sweetener.":'Sorbaat alleen doodt geen gist — het blokkeert de voortplanting. Moet gecombineerd worden met K-meta (vrij SO₂) of koeling. Wacht 48 u na het stabiliseren voordat je zoetstof toevoegt.',
  '🍾 CARBONATION / PRIMING SUGAR':'🍾 KOOLZUUR / PRIMINGSUIKER',
  'Priming sugar to bottle-condition a sparkling mead. The mead must be':'Primingsuiker om een mousserende mede op fles te rijpen. De mede moet',
  'fully fermented':'volledig vergist','and':'en',
  '— sorbate/sulfite stop the refermentation that makes the bubbles. Enter the highest temperature the mead has reached since fermentation; that sets how much CO₂ is already dissolved.':'— sorbaat/sulfiet stoppen de hergisting die de bubbels maakt. Vul de hoogste temperatuur in die de mede sinds de gisting bereikte; dat bepaalt hoeveel CO₂ er al opgelost is.',
  'Mead temp (°C)':'Medetemp (°C)','Priming sugar':'Primingsuiker','Corn sugar (dextrose)':'Maïssuiker (dextrose)',
  'Table sugar (sucrose)':'Tafelsuiker (sucrose)','Honey':'Honing','Style / target carbonation':'Stijl / doelkoolzuur',
  'Custom target CO₂ (volumes)':'Aangepast doel-CO₂ (volumes)','PRIMING SUGAR':'PRIMINGSUIKER',
  'Bottle-condition only a fully-fermented, un-stabilized mead in pressure-rated bottles (champagne/Belgian + crown caps or wired corks). Keep one PET tester bottle to feel the pressure. Condition 2–3 weeks at 18–22°C, then chill. See Mead Guide → Sparkling & Carbonated Mead.':'Rijp op fles alleen een volledig vergiste, niet-gestabiliseerde mede in drukbestendige flessen (champagne/Belgisch + kroonkurken of beugelkurken). Houd één PET-testfles om de druk te voelen. Rijp 2–3 weken bij 18–22°C, daarna koelen. Zie Medegids → Mousserende & koolzuurhoudende mede.',
  'Only the':'Alleen de',
  'fraction of free SO₂ is antimicrobial, and that fraction collapses as pH rises. Enter your pH to see the free SO₂ you must hold to reach the protective molecular target, and the K-meta dose to get there.':'fractie vrij SO₂ is antimicrobieel, en die fractie stort in naarmate de pH stijgt. Vul je pH in om het vrije SO₂ te zien dat je moet aanhouden voor het beschermende moleculaire doel, en de K-meta-dose om daar te komen.',
  'Confirm with a free-SO₂ measurement':'Bevestig met een vrij-SO₂-meting',
  "— this estimates, it doesn't replace titration.":'— dit schat, het vervangt geen titratie.',
  'Target molecular SO₂ (ppm)':'Doel moleculair SO₂ (ppm)',
  '0.5 — light reds / sweet, minimal':'0,5 — lichte rode / zoet, minimaal',
  '0.8 — standard protective (most mead)':'0,8 — standaard beschermend (meeste mede)',
  '1.5 — sweet, sorbate-free, max stability':'1,5 — zoet, sorbaatvrij, max stabiliteit',
  'FREE SO₂ NEEDED':'VRIJ SO₂ NODIG',
  'Mead often finishes flabby (low acid). Enter current and target titratable acidity (TA, g/L as tartaric) to size an acid addition — or a deacidification if you over-shot.':'Mede eindigt vaak slap (weinig zuur). Vul de huidige en doel-titreerbare zuurgraad in (TA, g/L als wijnsteenzuur) om een zuurtoevoeging te bepalen — of een ontzuring als je te ver ging.',
  'Target TA (g/L)':'Doel-TA (g/L)','Acid (for additions)':'Zuur (voor toevoegingen)',
  'Dissolve, add ~⅔, re-measure/taste, then titrate the rest. Cold-stabilise after tartaric additions.':'Oplossen, ~⅔ toevoegen, opnieuw meten/proeven, dan de rest titreren. Koud stabiliseren na wijnsteenzuur-toevoegingen.',
  'You need at least 1 bottled batch with bottles on-hand to blend (with another batch, or with water to lower strength). Currently you have 0.':'Je hebt minstens 1 gebotteld brouwsel met flessen in voorraad nodig om te blenden (met een ander brouwsel, of met water om de sterkte te verlagen). Momenteel heb je er 0.',
  '2. Dissolve':'2. Los op','3. Wait':'3. Wacht','24-48 hours':'24-48 uur','Always':'Altijd',
  "on a measured sample before dosing the batch; taste, don't just chase a number.":'op een gemeten monster vóór je het brouwsel doseert; proef, jaag niet zomaar een getal na.',
  // tools: <option> labels (selects use value attrs, so display text is safe)
  'TOSCA 2.0 — GoFerm + 24h / 48h / 72h / 1-3 break':'TOSCA 2.0 — GoFerm + 24u / 48u / 72u / 1-3-breuk',
  'TOSNA (classic Moutela) — GoFerm + 24h / 48h / 72h / 96h':'TOSNA (klassiek Moutela) — GoFerm + 24u / 48u / 72u / 96u',
  'TiOSNA — GoFerm + at-pitch / 24h / 48h / 1-3 break':'TiOSNA — GoFerm + bij enten / 24u / 48u / 1-3-breuk',
  'M05 / MJ Mead sachet (SNA blend)':'M05 / MJ Mede-sachet (SNA-mengsel)',
  'Low (71B, EC-1118, K1V, QA23, D47…)':'Laag (71B, EC-1118, K1V, QA23, D47…)',
  'Medium (M05, DV10, Wyeast 4632)':'Gemiddeld (M05, DV10, Wyeast 4632)',
  'Standard (~12% ABV)':'Standaard (~12% ABV)','Strong (~14% ABV)':'Sterk (~14% ABV)','Heavy / Sack (~18% ABV)':'Zwaar / Sack (~18% ABV)',
  'Measured SG':'Gemeten SG','Original Brix (pre-ferment)':'Oorspronkelijke Brix (vóór gisting)',
  'Raise TA by':'Verhoog TA met','Lower TA by':'Verlaag TA met',
  // honey-darkness <option> labels (TOSNA)
  'Light / blossom (acacia, clover…)':'Licht / bloesem (acacia, klaver…)','Amber / wildflower':'Amber / wildebloemen',
  'Dark (buckwheat, chestnut)':'Donker (boekweit, kastanje)','Bochet / caramelised':'Bochet / gekarameliseerd',
  // yeast strain descriptors (brand codes kept; "Mead/Dry/Sweet" suffixes localised)
  "Mangrove Jack's M05 — Mead":"Mangrove Jack's M05 — Mede",'WLP720 / White Labs Sweet Mead':'WLP720 / White Labs Zoete Mede',
  'Safale US-05 (ale yeast)':'Safale US-05 (alegist)','Fermentis BC-S103 — Mead':'Fermentis BC-S103 — Mede',
  'Wyeast 4184 — Sweet Mead':'Wyeast 4184 — Zoete Mede','Wyeast 4632 — Dry Mead':'Wyeast 4632 — Droge Mede',
  'White Labs WLP720 — Sweet Mead/Wine':'White Labs WLP720 — Zoete Mede/Wijn','White Labs WLP099 — Super High Gravity':'White Labs WLP099 — Zeer Hoge Dichtheid',
  'Must / wine pH':'Most / wijn-pH',
  // acid-type <option> labels
  'Tartaric (crisp, wine-like, most stable)':'Wijnsteenzuur (fris, wijnachtig, stabielst)','Malic (green-apple tartness)':'Appelzuur (groene-appelzuur)',
  'Citric (fresh/zesty — can be metabolised)':'Citroenzuur (fris/pittig — kan gemetaboliseerd worden)','Acid blend (balanced)':'Zuurmengsel (gebalanceerd)',
  // nutrient-type <option> labels
  'Fermaid-O (organic — TOSNA 2.0)':'Fermaid-O (organisch — TOSNA 2.0)','Fermaid-K (DAP blend — SNA)':'Fermaid-K (DAP-mengsel — SNA)','DAP (inorganic — SNA)':'DAP (anorganisch — SNA)',
  // ---- honey library ----
  '🍯 YOUR HONEY LIBRARY':'🍯 JOUW HONINGBIBLIOTHEEK','Pairs with:':'Combineert met:',
  'Not used in built-in recipes':'Niet gebruikt in ingebouwde recepten','PEAK':'PIEK','🌸 IN SEASON':'🌸 IN SEIZOEN',
  'Each honey gives mead a distinct character — color, aroma, body, finish. Match the honey to the style: light honeys (acacia, rapeseed) for delicate spice and floral additions; dark honeys (buckwheat, chestnut) for bold bochets and ports. Tap a honey card for detailed brewing notes, food pairings, and recipe links.':'Elke honing geeft de mede een eigen karakter — kleur, aroma, body, afdronk. Stem de honing af op de stijl: lichte honingsoorten (acacia, koolzaad) voor delicate specerij- en bloementoevoegingen; donkere honingsoorten (boekweit, kastanje) voor krachtige bochets en ports. Tik op een honingkaart voor uitgebreide brouwnotities, gerechtcombinaties en receptlinks.',
  'Honeys at their freshness peak this month. Peak-of-season is the best time to source — local apiaries have just harvested, Mediterranean imports are most recent.':'Honingsoorten op hun versheidspiek deze maand. Op het hoogtepunt van het seizoen koop je het best in — lokale bijenstallen hebben net geoogst, mediterrane import is het recentst.',
  // region labels + hints (in-season card)
  'LOCAL APIARY':'LOKALE BIJENSTAL','MEDITERRANEAN IMPORT':'MEDITERRANE IMPORT','SOUTHERN HEMISPHERE':'ZUIDELIJK HALFROND','YEAR-ROUND':'HET HELE JAAR','TROPICAL':'TROPISCH',
  'Bee plants flowering near you this month — freshest if you can buy direct from a beekeeper or local market.':'Drachtplanten die deze maand bij jou in de buurt bloeien — het verst als je rechtstreeks bij een imker of lokale markt koopt.',
  'Fresh import wave from Spain / Italy / Greece arriving in shops this month.':'Verse importgolf uit Spanje / Italië / Griekenland die deze maand in de winkels arriveert.',
  'Recent Southern Hemisphere harvest arriving in specialty shops.':'Recente oogst van het zuidelijk halfrond die in speciaalzaken arriveert.',
  'Beekeepers harvest these year-round.':'Imkers oogsten deze het hele jaar door.',
  'Multiple flowerings per year — freshness less predictable.':'Meerdere bloeiperiodes per jaar — versheid minder voorspelbaar.',
  // honey intensity words (card badge)
  'light':'licht','medium':'gemiddeld','bold':'krachtig','very bold':'zeer krachtig','very light':'zeer licht','varies':'wisselend',
  'Honey Library':'Honingbibliotheek',
  // ---- in-body page titles (sidebar nav is set separately by id) ----
  'Yeast Library':'Gistbibliotheek','Nutrient & Protocols':'Voeding & protocollen','Aging Timeline':'Rijpingstijdlijn',
  'Insights':'Inzichten','Suppliers':'Leveranciers','Supplies':'Voorraad','Mead Guide':'Medegids',
  'Troubleshoot':'Probleemoplossing','Troubleshooting':'Probleemoplossing',
  // ---- mead guide chrome ----
  "The Beginner Meadwright's Compendium":'Het compendium voor de beginnende medemaker',
  'TOPICS · tap to read':'ONDERWERPEN · tik om te lezen','READ →':'LEZEN →',
  "HOW TO MAKE MEAD — A BEGINNER'S FIRST BATCH":'MEDE MAKEN — EEN EERSTE BROUWSEL VOOR BEGINNERS',
  'A complete walkthrough, from empty fermenter to first tasting':'Een volledige doorloop, van leeg vat tot eerste proeverij',
  // common modal/dialog buttons
  'Close':'Sluiten','Cancel':'Annuleren','Save':'Opslaan','Delete':'Verwijderen','Open from pasted URL':'Open vanaf geplakte URL',
  // ---- aging timeline ----
  'Bottle Aging Forecast':'Flesrijping-prognose',
  "No bottled batches yet. Once you bottle, this view will plot each batch's ready → peak → past-peak windows on a timeline so you can plan ahead.":'Nog geen gebottelde brouwsels. Zodra je bottelt, plot deze weergave voor elk brouwsel de vensters klaar → piek → over-piek op een tijdlijn zodat je vooruit kunt plannen.',
  // ---- supplies ----
  '＋ Add':'＋ Toevoegen','None tracked':'Niets bijgehouden',
  // ---- insights ----
  'Patterns in your brewing':'Patronen in je brouwsels','Bottles Bottled':'Gebottelde flessen','Go-To Yeast':'Vaste gist',
  '📊 Deeper pattern-mining (what your best batches share, trends over time) unlocks at':'📊 Diepere patroonanalyse (wat je beste brouwsels delen, trends over tijd) ontgrendelt bij',
  // ---- settings ----
  'Settings':'Instellingen','Click':'Klik',
  '. Every browser that opens this page reads and writes the same data — nothing to configure per device.':'. Elke browser die deze pagina opent leest en schrijft dezelfde gegevens — niets per apparaat in te stellen.',
  'Brewer Name (optional)':'Brouwersnaam (optioneel)',
  'Interface chrome, bottle labels and the public share page.':'De interface, flessenetiketten en de openbare deelpagina.',
  'optional — for reverse proxies':'optioneel — voor reverse proxies',
  'Share links and QR codes are built from this address instead of the URL you happen to be browsing on. Set it when the server sits behind a reverse proxy or is reachable under several hostnames. Leave blank to use the current address. Applies to all devices.':'Deellinks en QR-codes worden uit dit adres opgebouwd in plaats van de URL waarop je toevallig surft. Stel het in wanneer de server achter een reverse proxy zit of onder meerdere hostnamen bereikbaar is. Laat leeg om het huidige adres te gebruiken. Geldt voor alle apparaten.',
  '⬇ Reload from Server':'⬇ Herladen van server','✓ loaded from server (SQLite)':'✓ geladen van server (SQLite)',
  'Core data (batches, logs, supplies, etc.)':'Kerngegevens (brouwsels, logs, voorraad, enz.)',
  '🕘 Restore from snapshot…':'🕘 Herstellen vanaf momentopname…',
  "talks to Home Assistant on your behalf, so there's no browser CORS setup and no mixed-content issue — just make sure the MeadOS server can reach the HA URL below.":'praat namens jou met Home Assistant, dus geen CORS-instellingen in de browser en geen mixed-content-probleem — zorg er alleen voor dat de MeadOS-server de HA-URL hieronder kan bereiken.',
  'The MeadOS server tries the internal URL first, then the external one. Either field may be left blank.':'De MeadOS-server probeert eerst de interne URL, dan de externe. Beide velden mogen leeg blijven.',
  'Stored on the MeadOS server only and used via a server-side proxy — it is never sent to other devices or saved in the synced data.':'Wordt alleen op de MeadOS-server bewaard en gebruikt via een server-side proxy — het wordt nooit naar andere apparaten gestuurd of in de gesynchroniseerde gegevens opgeslagen.',
  'on every save':'bij elke opslag','Save & Test':'Opslaan & testen','🌡 TEMPERATURE SENSORS':'🌡 TEMPERATUURSENSOREN',
  'Bind Home Assistant sensor entities so live temperatures show up across the app. Requires the optional Home Assistant connection above. All fields are optional — leave any blank to hide the corresponding display.':'Koppel Home Assistant-sensorentiteiten zodat live temperaturen overal in de app verschijnen. Vereist de optionele Home Assistant-verbinding hierboven. Alle velden zijn optioneel — laat er een leeg om de bijbehorende weergave te verbergen.',
  'used when a fermenter has no specific binding':'gebruikt wanneer een vat geen specifieke binding heeft',
  'Drives the top-bar temp pill and the gravity-log auto-populate when a fermenter has no specific sensor configured. Optimal for M05: 18-22°C.':'Voedt de temperatuurpil in de bovenbalk en het automatisch invullen van het dichtheidslog wanneer een vat geen specifieke sensor heeft. Optimaal voor M05: 18-22°C.',
  'Cellar / aging-room sensor':'Kelder- / rijpingsruimtesensor','storage temperature for bottled mead':'opslagtemperatuur voor gebottelde mede',
  'Legacy fallback, used only when no cabinet in My Cellar has its own sensor. Prefer binding sensors per cabinet (My Cellar → Configure). Ideal cellar: 10-14°C, stable.':'Verouderde terugval, alleen gebruikt wanneer geen kast in Mijn kelder een eigen sensor heeft. Koppel bij voorkeur sensoren per kast (Mijn kelder → Configureren). Ideale kelder: 10-14°C, stabiel.',
  'Per-fermenter bindings:':'Bindingen per vat:',
  'Each fermenter can have its own sensor — edit a fermenter (in the FERMENTERS card below) to set its':'Elk vat kan zijn eigen sensor hebben — bewerk een vat (in de kaart VATEN hieronder) om zijn',
  '. Per-fermenter bindings take priority over the fallback above.':'. Bindingen per vat hebben voorrang op de terugval hierboven.',
  'Optional. Get phone notifications when brewing steps are due, via the HA Companion App. Requires the Home Assistant connection above.':'Optioneel. Ontvang telefoonmeldingen wanneer brouwstappen aan de beurt zijn, via de HA Companion-app. Vereist de Home Assistant-verbinding hierboven.',
  'HA service name (without':'HA-servicenaam (zonder',
  'prefix). Find in HA → Developer Tools → Services → Search for':'voorvoegsel). Te vinden in HA → Ontwikkelaarstools → Services → Zoek naar',
  "Subscribe your phone or desktop calendar to your brewing schedule — nutrient doses, racking, bottling and ready/peak dates show up as all-day reminders. No Home Assistant needed. The link is private (an unguessable token); anyone with it can read your schedule, so don't post it publicly.":'Abonneer je telefoon- of desktopagenda op je brouwschema — voedingsdoses, overhevelen, bottelen en klaar/piek-data verschijnen als hele-dag-herinneringen. Geen Home Assistant nodig. De link is privé (een onraadbaar token); iedereen die hem heeft kan je schema lezen, dus plaats hem niet openbaar.',
  '💰 COSTS & SUPPLIES':'💰 KOSTEN & VOORRAAD',
  'Optional defaults for cost tracking and sachet-based ingredient hints. Changes save automatically.':'Optionele standaardwaarden voor kostenregistratie en sachet-gebaseerde ingrediënthints. Wijzigingen worden automatisch opgeslagen.',
  'Default Honey Price (per kg)':'Standaard honingprijs (per kg)','Nutrient Sachet Size (g)':'Voedingssachet-grootte (g)',
  'Used by the Brewing Tools calculator, brew-day checklists, and the bottling workflow.':'Gebruikt door de Brouwgereedschap-calculator, brouwdag-checklists en de bottel-workflow.',
  'M.J. Mead Yeast Nutrient sachets vary by SKU — current default 12g. The app shows nutrient amounts as both grams and sachet count throughout.':'M.J. Mede-gistvoeding-sachets verschillen per SKU — huidige standaard 12 g. De app toont voedingshoeveelheden overal als grammen én sachetaantal.',
  'Auto-deduct supplies when starting a batch':'Voorraad automatisch aftrekken bij start van een brouwsel',
  'When you create a new batch, MeadOS will automatically subtract the honey (matched by variety), 1 yeast packet, and the nutrient amount from your tracked supplies. Skipped silently if no matching supply exists.':'Wanneer je een nieuw brouwsel aanmaakt, trekt MeadOS automatisch de honing (op variëteit afgestemd), 1 gistpakje en de voedingshoeveelheid van je bijgehouden voorraad af. Wordt stil overgeslagen als er geen passende voorraad bestaat.',
  '＋ Add Fermenter':'＋ Vat toevoegen',
  'Track each vessel separately. Batches reference a fermenter, and the dashboard surfaces which are free vs occupied. Edit a fermenter to bind it to a Home Assistant temperature sensor — bound fermenters auto-fill the temp field on gravity logs and show a live pill above.':'Houd elk vat apart bij. Brouwsels verwijzen naar een vat, en het dashboard toont welke vrij of bezet zijn. Bewerk een vat om het aan een Home Assistant-temperatuursensor te koppelen — gekoppelde vaten vullen het temperatuurveld op dichtheidslogs automatisch in en tonen een live pil bovenaan.',
  '9 L wide-mouth · primary fermentation':'9 L wijdmonds · primaire gisting',
  '7.6 L wide-mouth · secondary / assist':'7,6 L wijdmonds · secundair / hulp',
  '5 L wide-mouth · secondary + bulk aging before bottling':'5 L wijdmonds · secundair + bulkrijping vóór het bottelen',
  '1. Click':'1. Klik','2. In HA, open your dashboard →':'2. Open in HA je dashboard →','Edit Dashboard':'Dashboard bewerken',
  '+ Add Card':'+ Kaart toevoegen','3. Paste, save. Done.':'3. Plakken, opslaan. Klaar.',
  'Export all data as JSON for backup, or as CSV for spreadsheet analysis.':'Exporteer alle gegevens als JSON voor back-up, of als CSV voor spreadsheetanalyse.',
  'Export Backup':'Back-up exporteren','Import Backup':'Back-up importeren','⬇ Batches CSV':'⬇ Brouwsels CSV','⬇ Gravity logs CSV':'⬇ Dichtheidslogs CSV',
  'Uploaded label, brand, and photo images are stored as files on the server (under':'Geüploade etiket-, merk- en fotoafbeeldingen worden als bestanden op de server bewaard (onder',
  '). Over time some stop being referenced by any batch or recipe. Scan to find those orphans and free the space — version history is checked too, so nothing a restorable snapshot still needs is removed.':'). Na verloop van tijd worden sommige door geen enkel brouwsel of recept meer gebruikt. Scan om die wezen te vinden en de ruimte vrij te maken — ook de versiegeschiedenis wordt gecontroleerd, zodat niets wordt verwijderd wat een herstelbare momentopname nog nodig heeft.',
  'to check for unused images.':'om te controleren op ongebruikte afbeeldingen.','VERSION HISTORY':'VERSIEGESCHIEDENIS',
  "The server keeps your recent saved snapshots. Restore one if something got messed up — restoring first saves the current state, so it's reversible.":'De server bewaart je recente opgeslagen momentopnamen. Herstel er een als er iets misging — herstellen slaat eerst de huidige staat op, dus het is omkeerbaar.',
  'Run the server:':'Start de server:','— serves this app and stores all data in':'— bedient deze app en slaat alle gegevens op in',
  'Share with others:':'Deel met anderen:','anyone who can reach the machine opens':'iedereen die de machine kan bereiken opent','and sees the same shared data.':'en ziet dezelfde gedeelde gegevens.',
  ', or use Export Backup on the left. The server also keeps the last 50 saves in a history table.':', of gebruik Back-up exporteren links. De server bewaart ook de laatste 50 opslagacties in een geschiedenistabel.',
  "add a Webpage/iframe card pointing at this app's URL.":'voeg een Webpagina/iframe-kaart toe die naar de URL van deze app wijst.',
  'Permanently delete all batches, logs, and settings. Cannot be undone.':'Verwijder alle brouwsels, logs en instellingen permanent. Kan niet ongedaan gemaakt worden.',
  'DATA BACKUP':'GEGEVENS BACK-UP','Backup:':'Back-up:','Backup':'Back-up',
  'Configuration & Data Management':'Configuratie & gegevensbeheer','optional':'optioneel',
  '🏠 HOME ASSISTANT · OPTIONAL':'🏠 HOME ASSISTANT · OPTIONEEL',
  'Completely optional — MeadOS runs fully standalone. Connect a Home Assistant instance to read live temperature & hydrometer sensors, send push notifications via the companion app, browse HA media for label images, and publish a status summary for the dashboard card below.':'Volledig optioneel — MeadOS werkt geheel zelfstandig. Verbind een Home Assistant-instantie om live temperatuur- & hydrometersensoren te lezen, push-meldingen te sturen via de companion-app, HA-media te doorzoeken voor etiketafbeeldingen, en een statusoverzicht te publiceren voor de dashboardkaart hieronder.',
  '🔔 PUSH NOTIFICATIONS':'🔔 PUSH-MELDINGEN','Enable daily brewing notifications':'Dagelijkse brouwmeldingen inschakelen',
  '📅 CALENDAR FEED':'📅 AGENDA-FEED','Enable calendar feed':'Agenda-feed inschakelen',
  'A rich Lovelace card you can paste into any HA dashboard. Shows your active batches, fermenter status, drinking-window alerts, next milestone, and a button to open MeadOS — all reading from':'Een rijke Lovelace-kaart die je in elk HA-dashboard kunt plakken. Toont je actieve brouwsels, vatstatus, drinkvensterwaarschuwingen, volgende mijlpaal, en een knop om MeadOS te openen — allemaal uit',
  'attributes that MeadOS publishes on every save — requires the Home Assistant connection above with “Publish status summary” enabled.':'attributen die MeadOS bij elke opslag publiceert — vereist de Home Assistant-verbinding hierboven met “Statusoverzicht publiceren” ingeschakeld.',
  'Publish status summary':'Statusoverzicht publiceren',
  '🧹 UNUSED IMAGES':'🧹 ONGEBRUIKTE AFBEELDINGEN','Scan':'Scannen',
  'Embed in Home Assistant (optional):':'Insluiten in Home Assistant (optioneel):','Reset All Data':'Alle gegevens wissen',
  'Enable Home Assistant integration':'Home Assistant-integratie inschakelen','Publish status summary to':'Statusoverzicht publiceren naar',
  // ---- recipe detail ----
  '📋 Brew Session Planner':'📋 Brouwsessie-planner','SCALE':'SCHAAL','INGREDIENTS':'INGREDIËNTEN',
  '🛒 SOURCE YOUR HONEY':'🛒 KOOP JE HONING','EVERY HONEY · HOW EACH ONE FITS':'ELKE HONING · HOE ELK PAST',
  'works with a shift,':'werkt met een verschuiving,','THE RECIPE’S HONEY':'DE HONING VAN HET RECEPT','FIGHTS THE STYLE':'BOTST MET DE STIJL',
  'RECOMMENDED SWAPS':'AANBEVOLEN WISSELS','GOOD FITS':'GOEDE MATCHES','WORKABLE — EXPECT A SHIFT':'~ WERKBAAR — VERWACHT EEN VERSCHUIVING','VARIES BY SOURCE':'WISSELT PER BRON',
  'Honey still in the wax comb the bees built. Judge by taste.':'Honing nog in de wasraat die de bijen bouwden. Beoordeel op smaak.',
  '🧫 RECOMMENDED YEAST':'🧫 AANBEVOLEN GIST','ALSO ACCEPTABLE':'OOK AANVAARDBAAR','ALSO WORKS':'WERKT OOK',
  '⚗ NUTRIENT STRATEGY':'⚗ VOEDINGSSTRATEGIE','N DEMAND · STANDARD NEED':'N-BEHOEFTE · STANDAARDBEHOEFTE',
  "Mangrove Jack's Mead Yeast Nutrient":"Mangrove Jack's Mede-gistvoeding",
  'stir the dry yeast into warm water with':'roer de droge gist in warm water met',
  '⚗ DIAL IN YOUR OUTCOME':'⚗ STEM JE RESULTAAT AF','HONEY × YEAST × NUTRIENT':'HONING × GIST × VOEDING',
  'honey':'honing','yeast':'gist','nutrient':'voeding',
  'Fermaid-O (standard)':'Fermaid-O (standaard)','Buckwheat or other dark honey':'Boekweit of andere donkere honing',
  'with any fruit prevents permanent haze.':'bij elk fruit voorkomt blijvende sluier.',
  '💡 Set your honey price per kg in':'💡 Stel je honingprijs per kg in bij',
  'to see brew-cost estimates for this recipe. Add per-unit prices to':'om brouwkostschattingen voor dit recept te zien. Voeg prijzen per eenheid toe bij',
  'for a more precise estimate.':'voor een nauwkeurigere schatting.',
  'STEP BY STEP':'STAP VOOR STAP','EU SNA fallback for the nitrogen demand.':'EU-SNA-terugval voor de stikstofbehoefte.',
  'Honey backsweeten':'Honing terugzoeten',
  // ---- troubleshooting ----
  'Brewing problems and process guidance':'Brouwproblemen en procesbegeleiding',
  '🧭 Off-flavor diagnostic wizard':'🧭 Bijsmaak-diagnosewizard',
  'Pick a category, then tap a topic for step-by-step guidance — or use the diagnostic wizard above to work backward from observed flavors.':'Kies een categorie, tik dan op een onderwerp voor stapsgewijze begeleiding — of gebruik de diagnosewizard hierboven om terug te werken vanaf waargenomen smaken.',
  // category display labels (grouping stays keyed on English)
  'FERMENTATION':'GISTING','TEMPERATURE':'TEMPERATUUR','OFF-FLAVORS':'BIJSMAKEN','CLARITY':'HELDERHEID',
  'PROCESS':'PROCES','BOTTLING':'BOTTELEN','AGING':'RIJPING','SANITATION':'HYGIËNE','RESULT':'RESULTAAT','APP & SYNC ISSUES':'APP- & SYNC-PROBLEMEN',
  // off-flavor wizard chrome
  '🧭 OFF-FLAVOR DIAGNOSTIC WIZARD':'🧭 BIJSMAAK-DIAGNOSEWIZARD',
  "Pick the flavors and aromas you're detecting in your batch. Multiple selections combine — common causes float to the top.":'Kies de smaken en aroma\'s die je in je brouwsel waarneemt. Meerdere selecties combineren — veelvoorkomende oorzaken komen bovendrijven.',
  'Select one or more off-flavors above to get likely causes and remediation steps.':'Selecteer hierboven een of meer bijsmaken voor waarschijnlijke oorzaken en herstelstappen.',
  'LIKELY':'WAARSCHIJNLIJK','POSSIBLE':'MOGELIJK','SECONDARY':'SECUNDAIR',
  // ---- yeast library ----
  'DRY YEASTS':'DROGE GISTEN','LIQUID YEASTS':'VLOEIBARE GISTEN',
  'FLAVOR PROFILE':'SMAAKPROFIEL','QUICK FACTS':'SNELLE FEITEN','🔍 QUICK FACTS':'🔍 SNELLE FEITEN',
  '⚠ COMMON MISTAKES':'⚠ VEELGEMAAKTE FOUTEN','✦ BEST IN THESE STYLES':'✦ HET BEST IN DEZE STIJLEN','📜 HISTORY & CONTEXT':'📜 GESCHIEDENIS & CONTEXT',
  'CHOOSING THE RIGHT STRAIN':'DE JUISTE STAM KIEZEN','WHY YEAST NUTRIENT MATTERS':'WAAROM GISTVOEDING ERTOE DOET',
  'AROMA EXPECTATIONS':'AROMA-VERWACHTINGEN','FLAVOR EXPECTATIONS':'SMAAK-VERWACHTINGEN','WHY CHOOSE':'WAAROM KIEZEN','WHY AVOID':'WAAROM VERMIJDEN',
  'BEST FOR':'HET BEST VOOR','NOT RECOMMENDED FOR':'NIET AANBEVOLEN VOOR','BEST PRACTICES':'BESTE PRAKTIJKEN','COMMON MISTAKES':'VEELGEMAAKTE FOUTEN','BACKGROUND':'ACHTERGROND','USED IN RECIPES':'GEBRUIKT IN RECEPTEN',
  // quick-facts row labels
  'MANUFACTURER':'FABRIKANT','STRAIN':'STAM','FORMAT':'FORMAAT','ABV TOLERANCE':'ALCOHOLTOLERANTIE','ATTENUATION':'VERGISTINGSGRAAD',
  'OPTIMAL TEMP':'OPTIMALE TEMP','SPEED':'SNELHEID','FLOCCULATION':'FLOCCULATIE','NITROGEN NEED':'STIKSTOFBEHOEFTE','FRUCTOPHILIC':'FRUCTOFIEL',
  'FLAVOR IMPACT':'SMAAKIMPACT','COVERAGE':'DEKKING','AVAILABILITY':'BESCHIKBAARHEID','FRUCTOPHILIC YEAST':'FRUCTOFIELE GIST',
  // fructophilic cell values
  'REQUIRED':'VEREIST','Not required':'Niet vereist','Yes':'Ja','No':'Nee',
  'Fructophilic yeast required':'Fructofiele gist vereist','High fructose — watch the 1/3 break':'Hoge fructose — let op de 1/3-breuk',
  '— finishes high-fructose honey (acacia, tupelo, lavender)':'— gist fructoserijke honing af (acacia, tupelo, lavendel)',
  '— may stall on fructose-dominant honey':'— kan stilvallen op fructose-dominante honing',
  // quick-facts enum values
  'medium-fast':'gemiddeld-snel','very-fast':'zeer snel','fast':'snel','slow':'traag',
  'subtle':'subtiel','moderate':'matig','expressive':'expressief','neutral':'neutraal','liquid':'vloeibaar',
  'high':'hoog','low':'laag','dry':'droog',
  // yeast grid intro / legend / sachet math
  'Homebrew-shop staple':'Vaste waarde in de thuisbrouwwinkel','EU-available':'In de EU verkrijgbaar','Import only':'Alleen import',
  'Yeast choice shapes flavor more than any other variable in mead-making. Three questions to ask:':'Gistkeuze bepaalt de smaak meer dan elke andere variabele bij het maken van mede. Drie vragen om te stellen:',
  '1. What ABV?':'1. Welk alcohol?','2. What flavors should dominate?':'2. Welke smaken moeten domineren?','3. What can you control?':'3. Wat kun je controleren?',
  'Anything above 14% rules out D47 and 71B (they stall). Above 16% essentially mandates EC-1118 or K1V.':'Alles boven 14% sluit D47 en 71B uit (ze vallen stil). Boven 16% is EC-1118 of K1V vrijwel verplicht.',
  'Honey-forward → M05. Fruit → 71B. Floral/honey amp → K1V. Wine-like body → D47. Neutral → EC-1118.':'Honinggedreven → M05. Fruit → 71B. Bloemig/honingversterking → K1V. Wijnachtige body → D47. Neutraal → EC-1118.',
  'Strict 18°C ferment temp → D47 rewards you. Variable basement temps → K1V is forgiving (10-35°C).':'Strikte gisttemperatuur van 18°C → D47 beloont je. Wisselende keldertemperaturen → K1V is vergevingsgezind (10-35°C).',
  'SACHET MATH:':'SACHET-REKENWERK:','One sachet covers up to':'Eén sachet dekt tot',
  'liters at standard OG (≤1.090). High-OG batches (sack mead, OG 1.130+) reduce effective coverage — MeadOS computes this automatically in recipe scaling.':'liter bij standaard-OG (≤1.090). Hoge-OG-brouwsels (sack-mede, OG 1.130+) verminderen de effectieve dekking — MeadOS berekent dit automatisch bij het schalen van recepten.',
  // ---- nutrient library ----
  'Nutrient & Protocol Guide':'Voedings- & protocolgids',
  '📖 Nutrient Protocols — Full Guide (SNA · TOSNA · TOSCA · TiOSNA)':'📖 Voedingsprotocollen — volledige gids (SNA · TOSNA · TOSCA · TiOSNA)',
  'COMPOSITION':'SAMENSTELLING','STAGGERED NUTRIENT ADDITIONS':'GESPREIDE VOEDINGSTOEVOEGINGEN','WHEN TO ADD':'WANNEER TOE TE VOEGEN',
  'THE 1/3 SUGAR BREAK — WHY IT MATTERS':'DE 1/3-SUIKERBREUK — WAAROM HET ERTOE DOET','💡 TIPS & TRICKS':'💡 TIPS & TRUCS',
  'Honey is naturally':'Honing is van nature','nitrogen-deficient':'stikstofarm',
  "— typically <30 mg/L YAN (Yeast Assimilable Nitrogen) compared to grape must at 150-300 mg/L. Without supplemental nitrogen, yeast stresses, produces hydrogen sulfide (rotten egg smell), fusel alcohols (harsh solvent notes), and may stall before reaching target ABV. Yeast nutrient supplies what honey doesn't.":'— doorgaans <30 mg/L YAN (voor gist opneembare stikstof) tegenover druivenmost op 150-300 mg/L. Zonder aanvullende stikstof raakt de gist gestrest, produceert waterstofsulfide (rotte-eierengeur), fuselalcoholen (scherpe oplosmiddeltonen), en kan stilvallen voordat het doel-alcohol bereikt is. Gistvoeding levert wat honing niet heeft.',
  'TOSNA (organic-only)':'TOSNA (alleen organisch)','SNA (with DAP)':'SNA (met DAP)',
  'TYPICAL DOSE':'TYPISCHE DOSIS','REHYDRATION':'REHYDRATIE',
  'Generic DAP (Diammonium Phosphate)':'Generieke DAP (diammoniumfosfaat)','Other / generic nutrient':'Overig / generieke voeding',
  // honey-fit badges + legend words + ideal labels
  'PRIMARY':'PRIMAIR','✓ GREAT FIT':'✓ GEWELDIGE MATCH','✓ GOOD FIT':'✓ GOEDE MATCH','~ WORKABLE':'~ WERKBAAR','✗ NOT IDEAL':'✗ NIET IDEAAL','✗ CLASH':'✗ BOTST','✓ RECOMMENDED':'✓ AANBEVOLEN','~ varies':'~ wisselend',
  'green':'groen','amber':'amber','red':'rood','fits,':'past,',
  'a bold, robust honey':'een krachtige, robuuste honing','a light, delicate honey':'een lichte, delicate honing',
  'a light honey that lets the fruit lead':'een lichte honing die het fruit laat leiden','a medium honey (bold honeys also work)':'een medium honing (krachtige honingsoorten werken ook)','a medium-bodied honey':'een medium-body honing',
  "Go-Ferm is a":'Go-Ferm is een','rehydration primer used in every recipe':'rehydratie-primer die in elk recept wordt gebruikt',
  ", not a staggered feed — stir it into the warm rehydration water before pitching, then follow each recipe's own nutrient schedule.":', geen gespreide voeding — roer het in het warme rehydratiewater vóór het enten, volg dan het eigen voedingsschema van elk recept.',
  // ---- batches view: status chips + small labels ----
  'All':'Alle','Active':'Actief','Bottled':'Gebotteld','Complete':'Voltooid','Failed':'Mislukt',
  'AGE':'LEEFTIJD','BOTTLED':'GEBOTTELD','Custom':'Eigen',
  'Bottled (lifetime)':'Gebotteld (totaal)','No batches match the filters.':'Geen partijen voldoen aan de filters.',
  // ---- cellar buttons ----
  '⭐ Tasting':'⭐ Proeverij','★ Year in Review':'★ Jaaroverzicht',
  '📑 Print Label Sheet':'📑 Etikettenvel afdrukken','📦 Print Storage Labels':'📦 Opslagetiketten afdrukken',
  'AVG FERMENT':'GEM. GISTING',
  // ---- tools ----
  '⚡ NUTRIENT CALCULATOR':'⚡ VOEDINGSCALCULATOR',
  // ---- shopping list / supplies ----
  'Also gather (recipe-specific)':'Ook verzamelen (receptspecifiek)',
  'Running low / out of stock':'Bijna op / niet op voorraad','out of stock':'niet op voorraad',
  'Low stock:':'Lage voorraad:','✓ have enough':'✓ genoeg in voorraad',
  'Est. cost to buy the shortfall':'Geschatte kost om het tekort te kopen',
  'Bottles · 750 ml':'Flessen · 750 ml','Bottles · 500 ml':'Flessen · 500 ml',
  'No suppliers yet. Add your trusted beekeepers and brewing-supply shops to keep track of where to source each honey type and ingredient.':'Nog geen leveranciers. Voeg je vertrouwde imkers en brouwwinkels toe om bij te houden waar je elke honingsoort en elk ingrediënt haalt.',
  // ---- insights ----
  '🌟 BEST-TASTING INSIGHTS':'🌟 INZICHTEN BESTE SMAAK','📈 YEAR-OVER-YEAR TRENDS':'📈 TRENDS JAAR-OP-JAAR',
  '⏸ STUCK FERMENT BEYOND RESCUE':'⏸ GISTING VASTGELOPEN — NIET MEER TE REDDEN',
  'Mead Brewed (lifetime)':'Mede gebrouwen (totaal)','Bottles Bottled':'Flessen gebotteld',
  'Favourite Honey':'Favoriete honing','Go-To Yeast':'Vaste gist','Styles Explored':'Stijlen verkend',
  'Success Rate':'Slagingspercentage','flawless so far':'tot nu toe vlekkeloos','keep exploring':'blijf verkennen',
  'a true polymath!':'een echte alleskunner!',
  'Lessons preserved. The postmortems your past-self wrote so future-you doesn\'t repeat the same mistake. Failure rate stays low when you actually learn from these.':'Lessen bewaard. De postmortems die je vroegere zelf schreef zodat je toekomstige zelf niet dezelfde fout herhaalt. Het mislukkingspercentage blijft laag als je hier echt van leert.',
  // ---- batch detail chrome ----
  'Brand Label':'Merketiket','BRAND LABEL':'MERKETIKET','🔗 Share Link':'🔗 Deellink',
  'Tasting Notes':'Proefnotities','tap to start a batch':'tik om een partij te starten',
  'What went wrong':'Wat ging er mis','What to try next time':'Wat volgende keer te proberen',
  // ---- bottle tab ----
  'BOTTLE COUNTS BY SIZE':'FLESAANTALLEN PER MAAT','BOTTLE LABEL':'FLESETIKET',
  '📦 STORAGE BOX LABEL':'📦 OPSLAGDOOS-ETIKET','🖨 Print':'🖨 Afdrukken','⬇ Save':'⬇ Opslaan',
  '🍶 500 ml bottles':'🍶 500 ml flessen','🍷 750 ml bottles':'🍷 750 ml flessen',
  '+ Custom bottle size':'+ Aangepaste flesmaat','Custom size (ml)':'Aangepaste maat (ml)','Quantity':'Aantal',
  'Bottles to reserve':'Flessen te reserveren',
  '🕰 TIME CAPSULE RESERVATIONS':'🕰 TIJDCAPSULE-RESERVERINGEN','Open date (optional)':'Openingsdatum (optioneel)',
  'Reason / occasion':'Reden / gelegenheid','＋ Add reservation':'＋ Reservering toevoegen',
  '📍 CELLAR SUB-LOCATION':'📍 KELDER-SUBLOCATIE','🏠 Configure cellar':'🏠 Kelder instellen',
  // ---- tasting tab + BJCP scoresheet ----
  'NEW TASTING NOTE':'NIEUWE PROEFNOTITIE','Tasting Wheel':'Proefwiel',
  '· tap dots to rate each axis 1-5':'· tik op de stippen om elke as 1-5 te beoordelen',
  'Additional Notes':'Aanvullende notities','Add Tasting':'Proeverij toevoegen',
  'TASTING JOURNAL':'PROEFDAGBOEK','No tasting notes yet':'Nog geen proefnotities',
  'Appearance':'Uiterlijk','Flavor':'Smaak','Mouthfeel':'Mondgevoel','Overall Impression':'Algemene indruk',
  'Honey character, fermentation, hops/special ingredients, faults':'Honingkarakter, gisting, hop/speciale ingrediënten, gebreken',
  'Color, clarity, head/carbonation where appropriate':'Kleur, helderheid, schuim/koolzuur waar van toepassing',
  'Honey, balance, sweetness/dryness, special ingredients, finish':'Honing, balans, zoetheid/droogte, speciale ingrediënten, afdronk',
  'Body, carbonation, warmth, astringency, creaminess':'Body, koolzuur, warmte, samentrekkendheid, romigheid',
  'Overall drinking pleasure, intangibles':'Algeheel drinkplezier, ongrijpbare kwaliteiten',
  'Date':'Datum','Rating':'Beoordeling','Color & Appearance':'Kleur & Uiterlijk','Aroma / Nose':'Aroma / Geur',
  'Flavor / Palate':'Smaak / Gehemelte','Finish':'Afdronk','Sweetness':'Zoetheid','Acidity':'Zuurgraad',
  '📋 BJCP SCORESHEET':'📋 BJCP-SCORESHEET','· optional formal scoring (50 pts)':'· optionele formele scoring (50 ptn)','BJCP SCORE':'BJCP-SCORE',
  '← Cellar':'← Kelder','← Back to Cellar':'← Terug naar Kelder','Batch not found.':'Partij niet gevonden.',
  '✏ Edit Postmortem':'✏ Postmortem bewerken','⚰ Mark as Failed':'⚰ Markeren als mislukt',
  // ---- tools: nutrient calculator ----
  'Nutrient':'Voeding','Pitch rate:':'Entdosering:',
  // ---- yeast library (colon variant) ----
  'BEST FOR:':'HET BEST VOOR:',
  // ---- modals / forms (audit pass) ----
  'Actually Removed On':'Werkelijk verwijderd op','Add':'Toevoegen','Amount':'Hoeveelheid','Apply':'Toepassen',
  'Auto — match the nutrient':'Auto — afstemmen op de voeding','Batch Name':'Partijnaam','Batch Volume (L)':'Partijvolume (L)',
  'Bottle Type':'Flestype','Brand (optional)':'Merk (optioneel)','Brand Color':'Merkkleur','Capacity':'Capaciteit',
  'Caption (optional)':'Onderschrift (optioneel)','Choose Recipe':'Kies recept','Color':'Kleur',
  'Contact (phone/email)':'Contact (telefoon/e-mail)','Copy URL':'URL kopiëren','Create Batch':'Partij aanmaken',
  'Currency':'Valuta','Date Added':'Datum toegevoegd','Date of failure':'Datum van mislukken','Description':'Beschrijving',
  'Difficulty':'Moeilijkheid','Disable':'Uitschakelen','EDIT BATCH':'PARTIJ BEWERKEN','EDIT FERMENTER':'VAT BEWERKEN',
  'Expiry Date':'Vervaldatum','Failure category':'Mislukkingscategorie','Fallback fermentation sensor':'Terugval-gistingssensor',
  'Ferment Days':'Gistingsdagen','Fermenter':'Gistingsvat','HA Temperature Sensor':'HA-temperatuursensor',
  'HA URL — external':'HA-URL — extern','HA URL — internal / LAN':'HA-URL — intern / LAN','Honey (kg)':'Honing (kg)',
  'Honey Type':'Honingsoort','Honey varieties':'Honingvariëteiten','Hours / Availability':'Uren / beschikbaarheid',
  'Item':'Artikel','Location':'Locatie','Low-Stock Threshold (optional)':'Drempel lage voorraad (optioneel)',
  'Name':'Naam','Next →':'Volgende →','Notes':'Notities','Notes (optional)':'Notities (optioneel)',
  'Notification Service':'Notificatiedienst','Nutrient Product':'Voedingsproduct','Nutrient Protocol':'Voedingsprotocol',
  'Nutrient schedule':'Voedingsschema','Open in Editor →':'Openen in editor →','Opened Date':'Openingsdatum',
  'Original Volume (L)':'Oorspronkelijk volume (L)','Other products (not stocked)':'Andere producten (niet op voorraad)',
  'Other strains (not stocked)':'Andere stammen (niet op voorraad)','Other varieties (not stocked)':'Andere variëteiten (niet op voorraad)',
  'Packet size (g)':'Pakjesgrootte (g)','Peak (days)':'Hoogtepunt (dagen)','Planned Brew Date':'Geplande brouwdatum',
  'Planned Removal Date':'Geplande verwijderdatum','Preferred Sanitizer':'Voorkeursontsmettingsmiddel','Public URL':'Publieke URL',
  'Rack Batch':'Partij overhevelen','Rack To':'Overhevelen naar','Racking Date':'Overhevelingsdatum','Ready (days)':'Klaar (dagen)',
  'Recipe Name':'Receptnaam','Restore':'Herstellen','Restore default':'Standaard herstellen',
  'SNA — high-gravity (3 doses)':'SNA — hoge dichtheid (3 doses)','SNA — high-gravity (3 doses, days 1/3/7)':'SNA — hoge dichtheid (3 doses, dag 1/3/7)',
  'SNA — standard (2 doses)':'SNA — standaard (2 doses)','SNA — standard (2 doses, days 1 & 3)':'SNA — standaard (2 doses, dag 1 & 3)',
  'Save Photo':'Foto opslaan','Save Recipe':'Recept opslaan','Send Test Notification':'Testnotificatie verzenden','Stage':'Fase',
  'Start Batch with This Scaling':'Partij starten met deze schaling','Start Date':'Startdatum','Style':'Stijl','Subscribe URL':'Abonneer-URL',
  'TOSCA 2.0 — organic, GoFerm + 24/48/72h + 1/3 break':'TOSCA 2.0 — organisch, GoFerm + 24/48/72u + 1/3-breuk',
  'TOSCA 2.0 — organic, recommended':'TOSCA 2.0 — organisch, aanbevolen','TOSNA (classic) — organic':'TOSNA (klassiek) — organisch',
  'TOSNA (classic) — organic, GoFerm + 24/48/72/96h':'TOSNA (klassiek) — organisch, GoFerm + 24/48/72/96u',
  'Tags (comma-separated)':'Tags (komma-gescheiden)','Target ABV %':'Doel-alcohol %','Target ABV (%)':'Doel-alcohol (%)',
  'Target Fermenter':'Doelvat','Target must temp (°C)':'Doel-mosttemperatuur (°C)','Test Connection':'Verbinding testen',
  'TiOSNA — organic, GoFerm + pitch/24/48h + 1/3 break':'TiOSNA — organisch, GoFerm + enten/24/48u + 1/3-breuk',
  'TiOSNA — organic, front-loaded':'TiOSNA — organisch, vroeg-belast','Unit':'Eenheid','Units':'Eenheden',
  'What they supply':'Wat ze leveren','What went wrong?':'Wat ging er mis?','What would you do differently next time?':'Wat zou je volgende keer anders doen?',
  'Yeast (grams)':'Gist (gram)','Yeast Strain':'Giststam','— Unassigned (decide later) —':'— Niet toegewezen (later beslissen) —',
  '← All Honeys':'← Alle honingsoorten','← All Nutrients':'← Alle voedingen','← All Yeasts':'← Alle gisten','← Back':'← Terug',
  '← Nutrients':'← Voedingen','← Prev':'← Vorige','▸ Deploy':'▸ Inzetten','⚗ ADD FERMENTER':'⚗ VAT TOEVOEGEN',
  '⚗ NEW BATCH':'⚗ NIEUWE PARTIJ','✦ RECIPE DESIGNER':'✦ RECEPTONTWERPER','⧉ Copy':'⧉ Kopiëren','⬇ Download YAML':'⬇ YAML downloaden',
  '＋ Add Row':'＋ Rij toevoegen','＋ Add Step':'＋ Stap toevoegen','＋ Log Addition':'＋ Toevoeging loggen',
  '📐 SCALE RECIPE':'📐 RECEPT SCHALEN','📐 Scale to Volume':'📐 Schalen naar volume','📡 Gravity sensor entity':'📡 Dichtheidssensor-entiteit',
  '📷 ADD PHOTO':'📷 FOTO TOEVOEGEN','📷 Add Photo':'📷 Foto toevoegen','🔍 SEARCH EVERYTHING':'🔍 ALLES DOORZOEKEN',
  '🔬 FERMENTATION DIAGNOSIS':'🔬 GISTINGSDIAGNOSE','🕘 Restore from snapshot':'🕘 Herstellen vanaf momentopname','🟢 In your supplies':'🟢 In je voorraad',
  // ---- modal helper sentences + remaining chrome ----
  'TIMER ELAPSED — PROCEED':'TIMER VERSTREKEN — GA VERDER','TIMER RUNNING':'TIMER LOOPT','Finish':'Voltooien',
  'Close':'Sluiten','Loading…':'Laden…','to open the top result.':'om het bovenste resultaat te openen.','Press':'Druk op',
  'Live readings appear on the fermenter card and auto-fill the gravity-log temp field. Optional.':'Live-metingen verschijnen op de vatkaart en vullen automatisch het temperatuurveld van het dichtheidslog. Optioneel.',
  'When set, a 📡 button appears on the gravity-log form to pull the current sensor reading with one tap. You still confirm and save each reading manually — automated logging would create noisy data, so this is just a convenience shortcut. Compatible with iSpindel, Tilt Hydrometer, RAPT Pill, or any HA sensor reporting SG (e.g. 1.045).':'Indien ingesteld verschijnt er een 📡-knop op het dichtheidslog-formulier om de huidige sensormeting met één tik op te halen. Je bevestigt en bewaart elke meting nog steeds handmatig — automatisch loggen zou rommelige data opleveren, dus dit is enkel een handige snelkoppeling. Compatibel met iSpindel, Tilt Hydrometer, RAPT Pill, of elke HA-sensor die SG rapporteert (bv. 1.045).',
  'Occupied fermenters can still be selected (e.g., if you bottle and re-pitch the same day).':'Bezette vaten kunnen nog steeds geselecteerd worden (bv. als je dezelfde dag bottelt en opnieuw ent).',
  'Queue a future brew with everything this recipe needs. It appears on the schedule and rolls into your shopping list — no supplies are deducted until you deploy it.':'Zet een toekomstig brouwsel in de wachtrij met alles wat dit recept nodig heeft. Het verschijnt op het schema en rolt in je boodschappenlijst — er wordt niets van je voorraad afgetrokken tot je het inzet.',
  'Start typing to search across your whole journal.':'Begin te typen om je hele dagboek te doorzoeken.',
  'iSpindel / Tilt / RAPT / generic HA sensor':'iSpindel / Tilt / RAPT / generieke HA-sensor',
  'Grams per packet/sachet. Recipes show grams + computed packet count using this. Defaults to 10g (yeast) or 12g (nutrient) if left blank.':'Gram per pakje/sachet. Recepten tonen gram + berekend pakjesaantal hiermee. Standaard 10 g (gist) of 12 g (voeding) indien leeg gelaten.',
  '· leave empty for permanent additions':'· laat leeg voor permanente toevoegingen',
  'The mead was salvaged (bottled as cooking mead, vinegar, etc.) rather than dumped':'De mede werd gered (gebotteld als kookmede, azijn, enz.) in plaats van weggegooid',
  // ---- remaining modal titles/buttons/options ----
  'LOG ADDITION':'TOEVOEGING LOGGEN','NEW CUSTOM RECIPE':'NIEUW EIGEN RECEPT','＋ ADD SUPPLIER':'＋ LEVERANCIER TOEVOEGEN',
  'Bottles':'Flessen','Add Supplier':'Leverancier toevoegen','⚰ MARK BATCH AS FAILED':'⚰ PARTIJ ALS MISLUKT MARKEREN',
  'Mark Failed & Save':'Markeren als mislukt & opslaan','Cost Tracking (optional)':'Kostenregistratie (optioneel)',
  '◷ PLAN A BATCH':'◷ PLAN EEN PARTIJ','Add to Plan':'Aan plan toevoegen','Yeast:':'Gist:','Target OG:':'Doel-OG:',
  'ADD SUPPLY':'VOORRAAD TOEVOEGEN','✦ Yeast Packets':'✦ Gistpakjes','⚡ Yeast Nutrient':'⚡ Gistvoeding',
  '🍷 Bottles · 750 ml':'🍷 Flessen · 750 ml','🍶 Bottles · 500 ml':'🍶 Flessen · 500 ml',
  'Brew Day':'Brouwdag','Fermentation':'Gisting','Racking':'Overhevelen','Bottling':'Bottelen','Tasting':'Proeverij','Other':'Overig',
  // ---- settings view ----
  '🔒 EXTERNAL ACCESS PASSWORD':'🔒 WACHTWOORD EXTERNE TOEGANG','📊 STORAGE BUDGET':'📊 OPSLAGBUDGET',
  'Custom brand logo · shown in the topbar and dashboard.':'Eigen merklogo · getoond in de bovenbalk en het dashboard.',
  'Default heraldic crest. Upload a custom image to replace it everywhere.':'Standaard heraldisch wapen. Upload een eigen afbeelding om het overal te vervangen.',
  // ---- cellar config / shelf modals ----
  '⚙ CABINET CONFIGURATION':'⚙ KASTCONFIGURATIE','Cabinet name':'Kastnaam','+ Add shelf':'+ Plank toevoegen','↻ Reset shelves…':'↻ Planken resetten…',
  'Advanced: Edit originally-bottled counts':'Geavanceerd: oorspronkelijk gebottelde aantallen bewerken',
  'These are immutable normally — edit only to correct historical data. Drives per-bottle cost math.':'Deze zijn normaal onveranderlijk — bewerk alleen om historische data te corrigeren. Bepaalt de kosten-per-fles-berekening.',
  'Remove from Cellar':'Verwijderen uit kelder',
  // ---- edit fermenter helper ----
  'Bind this fermenter to a Home Assistant sensor entity (Zigbee2MQTT thermo, Aqara, Bluetooth ranges, etc). When set, the live reading auto-fills the temperature field every time you log gravity, and a small temperature pill shows on the fermenter card. Leave blank to disable.':'Koppel dit gistingsvat aan een Home Assistant-sensorentiteit (Zigbee2MQTT-thermo, Aqara, Bluetooth-ranges, enz.). Indien ingesteld vult de live-meting telkens automatisch het temperatuurveld in wanneer je dichtheid logt, en verschijnt er een kleine temperatuurpil op de vatkaart. Laat leeg om uit te schakelen.',
  // ---- gift recipient ----
  'Recipient':'Ontvanger','Occasion (optional)':'Gelegenheid (optioneel)','Save Gift':'Cadeau opslaan','Skip — Just Count':'Overslaan — alleen tellen',
  // ---- label sheet ----
  'PRINT LABEL SHEET':'ETIKETTENVEL AFDRUKKEN','SELECT BATCHES':'PARTIJEN SELECTEREN','Copies of each batch':'Kopieën van elke partij',
  'Layout per A4 page':'Indeling per A4-pagina','Sides':'Zijden','Front only':'Alleen voorkant','Front + back':'Voorkant + achterkant',
  'Match bottle counts (per size)':'Flesaantallen volgen (per maat)','Every size × copies':'Elke maat × kopieën','Default design × copies':'Standaardontwerp × kopieën',
  'Generate & Print':'Genereren & afdrukken',
  // ---- storage label picker ----
  '📦 PRINT STORAGE LABELS':'📦 OPSLAGETIKETTEN AFDRUKKEN','Select all':'Alles selecteren','Clear':'Wissen',
  'Select which batches to print labels for. Sorted newest-bottled first so a recent batch is at the top. Each selection prints a 15×10 cm label, stacked one per page on A4.':'Selecteer voor welke partijen je etiketten wilt afdrukken. Gesorteerd op recentst gebotteld eerst, zodat een recente partij bovenaan staat. Elke selectie drukt een etiket van 15×10 cm, één per pagina op A4.',
  // ---- tasting compare ----
  'Pick 2-3 tastings to view side by side. The radar overlay below combines tasting-wheel scores for batches that have them.':'Kies 2-3 proeverijen om naast elkaar te bekijken. De radar-overlay hieronder combineert proefwiel-scores voor partijen die ze hebben.',
  'Pick 2-3 tastings of the same batch and see them rendered next to each other':'Kies 2-3 proeverijen van dezelfde partij en zie ze naast elkaar weergegeven',
  // ---- cellar edit (bottling) modal ----
  'CELLAR':'KELDER','FRIDGE':'KOELKAST','GIFTED':'GESCHONKEN','OTHER':'OVERIG',
  'Cellar':'Kelder','Fridge':'Koelkast','Gifted':'Geschonken',
  'Bottle Date':'Flesdatum','Final ABV %':'Eind-alcohol %','Final Gravity':'Einddichtheid','INVENTORY · CURRENT':'INVENTARIS · HUIDIG',
  'Version':'Versie','Match Bottle Counts':'Flesaantallen volgen','🖨 Print …':'🖨 Afdrukken …',
  // ---- year in review ----
  'Year in Review':'Jaaroverzicht','Batches Started':'Gestarte partijen','Batches Bottled':'Gebottelde partijen',
  'Bottles Produced':'Geproduceerde flessen','Recipes Tried':'Geprobeerde recepten','Avg ABV':'Gem. alcohol',
  'Strongest':'Sterkste','Avg Attenuation':'Gem. vergistingsgraad','Total Invested':'Totaal geïnvesteerd',
  'Total Spent':'Totaal uitgegeven','Per Bottle':'Per fles','Per Batch':'Per partij','View Batch →':'Partij bekijken →',
  '📅 BOTTLES PRODUCED · BY MONTH':'📅 GEPRODUCEERDE FLESSEN · PER MAAND','⭐ HIGHEST-RATED TASTING':'⭐ HOOGST BEOORDEELDE PROEVERIJ',
  '💰 ECONOMICS':'💰 ECONOMIE','🖨 Print Year in Review':'🖨 Jaaroverzicht afdrukken',
  '"Just getting started — the meadwright\'s journey begins."':'"Net begonnen — de reis van de meadmaker start."',
  // ---- personal records (all-time) ----
  '🏆 MEADWRIGHT RECORDS · ALL-TIME':'🏆 MEADMAKER-RECORDS · ALLER TIJDEN','Highest ABV':'Hoogste alcohol',
  'Best Attenuation':'Beste vergistingsgraad','Longest Aged':'Langst gerijpt','Biggest Year':'Grootste jaar',
  'Largest Batch':'Grootste partij','Top-Rated':'Best beoordeeld','Bottles Gifted':'Flessen weggegeven',
  'distinct recipes':'verschillende recepten','shared with others':'gedeeld met anderen',
  // ---- bottle-label download (front/back/both) ----
  '⬇ Front':'⬇ Voorkant','⬇ Back':'⬇ Achterkant','⬇ Both':'⬇ Beide','⬇ Save':'⬇ Opslaan',
  '✦ Label saved':'✦ Etiket opgeslagen','✦ Back label saved':'✦ Achteretiket opgeslagen',
  '✦ Front + back saved':'✦ Voor- + achterkant opgeslagen','⚠ No back label on this design':'⚠ Geen achteretiket op dit ontwerp'
};
// Map of words used inside "Needs ..." / "Missing ..." supply badges.
var SUPPLY_TERMS_NL={'honey':'honing','yeast':'gist','nutrient':'voeding','pectic enzyme':'pectine-enzym','metabisulfite':'metabisulfiet','sorbate':'sorbaat','water':'water'};
function _supplyList(s){return s.split(',').map(function(x){var k=x.trim().toLowerCase();return SUPPLY_TERMS_NL[k]||x.trim();}).join(', ');}
// Failure-category labels (postmortems). Rendered combined with an icon/prefix,
// so translated at render sites via proseL (merged into the data prose map).
var FAILCAT_NL={
  'Contamination (bacteria / wild yeast)':'Besmetting (bacteriën / wilde gist)',
  'Stuck ferment beyond rescue':'Gisting vastgelopen — niet meer te redden',
  'Off-flavors / autolysis':'Bijsmaken / autolyse',
  'Oxidation / acetification':'Oxidatie / azijnvorming',
  'Accident (spill, breakage, mishap)':'Ongeluk (gemorst, gebroken, misser)',
  'Process error (wrong yeast, miscalc, etc.)':'Procesfout (verkeerde gist, misrekening, enz.)',
  "Planned experiment that didn't work":'Gepland experiment dat niet werkte',
  'Other':'Overig','Unknown':'Onbekend'
};
var UI_PATTERNS=[
  // ---- audit pass: value-bearing chrome ----
  [/^The Meadwright's Cellar · (\d+) (?:batch|batches)( · \d+ shown)?$/, function(m,n,shown){return "De kelder van de meadmaker · "+n+" partij"+(n==='1'?'':'en')+(shown?shown.replace(/ · (\d+) shown/,' · $1 getoond'):'');}],
  [/^Bottle Aging Tracker · (\d+) (?:batch|batches) resting · tap a header to expand$/, function(m,n){return "Flesrijping-tracker · "+n+" partij"+(n==='1'?'':'en')+" rust · tik op een kop om uit te klappen";}],
  [/^Bottle Aging Forecast · (\d+) (?:batch|batches) aging over (\d+) months$/, function(m,n,mo){return "Flesrijping-prognose · "+n+" partij"+(n==='1'?'':'en')+" rijpen over "+mo+" maanden";}],
  [/^· day (\d+)$/, '· dag $1'],
  [/^DAY (\d+) ⏪$/, 'DAG $1 ⏪'],
  [/^(\d+) (?:batch|batches)$/, function(m,n){return n+(n==='1'?' partij':' partijen');}],
  [/^(\d+)mo$/, '$1mnd'],
  [/^(.+) aging$/, '$1 rijping'],
  [/^BOTTLE INVENTORY · (.+) on-hand$/, 'FLESVOORRAAD · $1 op voorraad'],
  [/^⏳ Ready in (\d+) days?$/, function(m,n){return '⏳ Klaar over '+n+(n==='1'?' dag':' dagen');}],
  [/^Enters drinking window in (\d+) days? · (\d+) on hand$/, function(m,n,k){return 'Komt over '+n+(n==='1'?' dag':' dagen')+' in het drinkvenster · '+k+' in voorraad';}],
  [/^Across (\d+) planned (?:batch|batches), net of what's in your supplies\.( You're fully stocked — nothing to buy\. 🎉)?$/, function(m,n,full){return 'Voor '+n+' geplande partij'+(n==='1'?'':'en')+', na aftrek van wat in je voorraad zit.'+(full?" Je bent volledig bevoorraad — niets te kopen. 🎉":'');}],
  [/^(\d+) PLANNED BATCH(?:ES)?$/, function(m,n){return n+(n==='1'?' GEPLANDE PARTIJ':' GEPLANDE PARTIJEN');}],
  [/^([\d.]+ \S+) needed across (\d+) planned (?:batch|batches) · ([\d.]+ \S+) on hand$/, function(m,need,n,hand){return need+' nodig voor '+n+' geplande partij'+(n==='1'?'':'en')+' · '+hand+' op voorraad';}],
  [/^(\d+) aging in cellar$/, '$1 rijpen in kelder'],
  [/^(\d+) cellar · (\d+) fridge$/, '$1 kelder · $2 koelkast'],
  [/^(\d+) finished · (\d+) active$/, '$1 afgewerkt · $2 actief'],
  [/^(\d+) days?$/, function(m,n){return n+(n==='1'?' dag':' dagen');}],
  [/^(\d+)D OVERDUE$/, '$1D TE LAAT'],
  [/^PROGRESS · (\d+)%$/, 'VOORTGANG · $1%'],
  [/^The Meadwright's Overview · (\d+) (?:batch|batches) under your care(?: · (.+))?$/, function(m,n,foot){
    var base='Het overzicht van de meadmaker · '+n+' brouwsel'+(n==='1'?'':'s')+' onder jouw hoede';
    if(foot){var f=foot.replace(/(\d+) finished/g,'$1 afgewerkt').replace(/(\d+) failed/g,'$1 mislukt');base+=' · '+f;}
    return base;
  }],
  [/^([\d.]+) L · tap to start a batch$/, '$1 L · tik om te starten'],
  [/^⚗ DAILY BREW LOG · (.+)$/, '⚗ DAGELIJKS BROUWLOG · $1'],
  // recipes
  [/^The Mead Compendium · (\d+) recipes$/, 'Het Mede-compendium · $1 recepten'],
  [/^(\d+) ready · ([\d.]+) kg honey$/, '$1 klaar · $2 kg honing'],
  [/^Nothing fully makeable at ([\d.]+) L — these are the closest; the badge shows what's missing\.$/, 'Niets volledig maakbaar bij $1 L — dit zijn de dichtstbijzijnde; de badge toont wat ontbreekt.'],
  [/^Needs (.+)$/, function(m,list){return 'Mist '+_supplyList(list);}],
  [/^Missing (.+)$/, function(m,list){return 'Mist '+_supplyList(list);}],
  [/^~([\d.]+)% ABV$/, '~$1% alc.'],
  [/^(\d+)-day fermentation$/, '$1-daagse gisting'],
  // fermenter schedule vessel summaries
  [/^([\d.]+) L · (\d+) batches?$/, function(m,v,n){return v+' L · '+n+' brouwsel'+(n==='1'?'':'s');}],
  // recipes "💡 ... target 5 L final volume ..." intro
  [/^💡 Recipes target ([\d.]+) L final volume — sized for the staged vessel setup:$/, '💡 Recepten mikken op $1 L eindvolume — afgestemd op de gefaseerde vatopstelling:'],
  // "primary additions" lead-in fragment
  [/^primary additions$/, 'primaire toevoegingen'],
  // ---- brewing tools: value-bearing fragments ----
  [/^~([\d.]+)% before hitting (\d+)% tolerance$/, '~$1% vóór de tolerantiegrens van $2%'],
  [/^Day (\d+): ([\d.,]+) g$/, 'Dag $1: $2 g'],
  [/^([\d.,]+) g honey$/, '$1 g honing'],
  [/^→ ([\d.,]+) g Fermaid-O — the final dose$/, '→ $1 g Fermaid-O — de laatste dose'],
  [/^1\/3 BREAK \(SG ([\d.,]+)\)$/, '1/3-BREUK (SG $1)'],
  [/^free SO₂ for ([\d.,]+) ppm molecular\.$/, 'vrij SO₂ voor $1 ppm moleculair.'],
  [/^It's the moment about one-third of the sugar has fermented — at OG ([\d.,]+) that's roughly$/, "Het moment waarop ongeveer een derde van de suiker vergist is — bij OG $1 is dat ongeveer"],
  [/^Target ([\d.,]+) vol − ~([\d.,]+) vol already dissolved at (\d+)°C = \+([\d.,]+) vol to add\.$/, 'Doel $1 vol − ~$2 vol al opgelost bij $3°C = +$4 vol toe te voegen.'],
  [/^REHYDRATION → GoFerm Protect ≈ ([\d.,]+) g in ~([\d.,]+) ml of 43°C water before pitch \(primes sterols; not part of the YAN total\)$/, 'REHYDRATIE → GoFerm Protect ≈ $1 g in ~$2 ml water van 43°C vóór het enten (primet sterolen; geen deel van het YAN-totaal)'],
  [/^corn sugar \(dextrose\) total — dissolve in a little warm water and gently mix into the batch at bottling\. Per 750 ml bottle: ~([\d.,]+) g\.$/, 'maïssuiker (dextrose) totaal — los op in wat warm water en meng zacht door het brouwsel bij het bottelen. Per fles van 750 ml: ~$1 g.'],
  [/^Final ABV unchanged · estimated final sweetness ≈ (.+)$/, function(m,sw){var S={'Bone Dry':'Kurkdroog','Dry':'Droog','Off-Dry':'Halfdroog','Semi-Sweet':'Halfzoet','Sweet':'Zoet','Dessert':'Dessert'};return 'Alcohol ongewijzigd · geschatte eindzoetheid ≈ '+(S[sw.trim()]||sw);}],
  // ---- honey library ----
  [/^🌸 IN SEASON — (.+)$/, '🌸 IN SEIZOEN — $1'],
  [/^(\d+) VARIET(?:Y|IES)$/, function(m,n){return n+(n==='1'?' VARIËTEIT':' VARIËTEITEN');}],
  [/^USED IN (\d+) RECIPES?$/, function(m,n){return 'GEBRUIKT IN '+n+(n==='1'?' RECEPT':' RECEPTEN');}],
  [/^\+(\d+) more$/, '+$1 meer'],
  [/^Choose the honey, shape the mead · (\d+) varieties$/, 'Kies de honing, vorm de mede · $1 variëteiten'],
  // ---- supplies ----
  [/^Inventory of yeast, chemicals, and consumables · (\d+) tracked · stored in the shared server database$/, 'Inventaris van gist, chemicaliën en verbruiksartikelen · $1 bijgehouden · opgeslagen in de gedeelde serverdatabase'],
  [/^✦ YEAST PACKETS · (\d+)$/, '✦ GISTPAKJES · $1'],
  [/^⚡ YEAST NUTRIENT · (\d+)$/, '⚡ GISTVOEDING · $1'],
  [/^🍷 BOTTLES · 750 ML · (\d+)$/, '🍷 FLESSEN · 750 ML · $1'],
  [/^🍶 BOTTLES · 500 ML · (\d+)$/, '🍶 FLESSEN · 500 ML · $1'],
  [/^🍯 HONEY · (.+)$/, '🍯 HONING · $1'],
  // ---- insights ----
  [/^(\d+) bottled batches$/, '$1 gebottelde brouwsels'],
  [/^— you're at (\d+)\. Keep brewing!$/, "— je staat op $1. Blijf brouwen!"],
  // ---- settings ----
  [/^\+ (\d+) Label Studio images \(\/assets\) — references only, no storage cost$/, '+ $1 Label Studio-afbeeldingen (/assets) — alleen verwijzingen, geen opslagkost'],
  [/^→ (.+) \(day (\d+)\)$/, '→ $1 (dag $2)'],
  // ---- recipe detail ----
  [/^Day (\d+)$/, 'Dag $1'],
  [/^Brew This Recipe \(([\d.]+) L\) →$/, 'Brouw dit recept ($1 L) →'],
  [/^top up to the ([\d.]+) L mark$/, 'aanvullen tot de $1 L-markering'],
  [/^(.+?) · (Beginner|Intermediate|Advanced|Expert) · ~([\d.]+)% ABV · (\d+)-day fermentation$/, function(m,style,diff,abv,days){
    var D={Beginner:'Beginner',Intermediate:'Gevorderd',Advanced:'Geavanceerd',Expert:'Expert'};
    var st=(typeof RECIPE_STYLE_NL!=='undefined'&&RECIPE_STYLE_NL[style])||style;
    return st+' · '+(D[diff]||diff)+' · ~'+abv+'% ABV · '+days+'-daagse gisting';
  }],
  [/^Original: ([\d.]+) L\. Drag to scale ingredients proportionally — recommended max ~([\d.]+) L for safe primary headspace in your largest vessel \((.+?), ([\d.]+) L\)\.$/, 'Origineel: $1 L. Sleep om de ingrediënten proportioneel te schalen — aanbevolen max ~$2 L voor veilige primaire kopruimte in je grootste vat ($3, $4 L).'],
  [/^Original: ([\d.]+) L\. Drag to scale ingredients proportionally\. Configure a fermenter in Settings to get vessel-specific headspace guidance\.$/, 'Origineel: $1 L. Sleep om de ingrediënten proportioneel te schalen. Stel een gistingsvat in bij Instellingen voor vat-specifieke kopruimte-richtlijnen.'],
  [/^This recipe wants (.+)\. Each honey in the library is rated for it —$/, function(m,label){
    var L={'a bold, robust honey':'een krachtige, robuuste honing','a light, delicate honey':'een lichte, delicate honing','a light honey that lets the fruit lead':'een lichte honing die het fruit laat leiden','a medium honey (bold honeys also work)':'een medium honing (krachtige honingsoorten werken ook)','a medium-bodied honey':'een medium-body honing'};
    return 'Dit recept wil '+(L[label]||label)+'. Elke honing in de bibliotheek is ervoor beoordeeld —';
  }],
  // ---- troubleshooting ----
  [/^· (\d+) topics?$/, function(m,n){return '· '+n+' onderwerp'+(n==='1'?'':'en');}],
  [/^(\d+) STEPS? →$/, function(m,n){return n+' STAP'+(n==='1'?'':'PEN')+' →';}],
  [/^(\d+) flavor matches$/, '$1 smaakovereenkomsten'],
  // ---- yeast library ----
  [/^Strain reference · (\d+) yeasts · click any card for the deep-dive$/, 'Stamreferentie · $1 gisten · klik een kaart voor de verdieping'],
  // ---- nutrient library ----
  [/^(\d+) products · what each does, when to use it$/, '$1 producten · wat elk doet, wanneer te gebruiken'],
  // ---- batches view: group headers + failed chip count ----
  [/^(All|Active|Bottled|Complete|Failed|Failed \(postmortem\)) · (\d+)$/, function(m,k,n){
    var K={'All':'Alle','Active':'Actief','Bottled':'Gebotteld','Complete':'Voltooid','Failed':'Mislukt','Failed (postmortem)':'Mislukt (postmortem)'};
    return (K[k]||k)+' · '+n;
  }],
  // ---- shopping list (schedule + supplies) ----
  [/^need (.+) · have (.+)$/, 'nodig $1 · heb $2'],
  [/^buy (.+)$/, 'koop $1'],
  [/^([\d.,]+ .+?) left( · ⚠ ≤.+)?$/, '$1 over$2'],
  [/^out of stock( · ⚠ ≤.+)?$/, 'niet op voorraad$1'],
  [/^Nutrient · ~(\d+) g$/, 'Voeding · ~$1 g'],
  // ---- insights ----
  [/^Patterns in your brewing journey · (\d+) bottled · (\d+) failed$/, 'Patronen in jouw brouwreis · $1 gebotteld · $2 mislukt'],
  [/^(\d+) lost to learn from$/, '$1 verloren om van te leren'],
  [/^used in (\d+) batch(?:es)?$/, function(m,n){return 'gebruikt in '+n+' partij'+(n==='1'?'':'en');}],
  [/^pitched (\d+)×$/, 'geënt $1×'],
  [/^≈ (\d+) glasses poured$/, '≈ $1 glazen geschonken'],
  [/^≈ (\d+) × 750 ml made$/, '≈ $1 × 750 ml gemaakt'],
  [/^Need at least 2 batches with a 4-star or higher tasting to find patterns\. You have (\d+)\.$/, 'Minstens 2 partijen met een proeverij van 4 sterren of hoger nodig om patronen te vinden. Je hebt er $1.'],
  [/^Need at least 2 brewing years to compute trends\. You're in year (\d+)\.$/, "Minstens 2 brouwjaren nodig om trends te berekenen. Je zit in jaar $1."],
  [/^(\d+) FAILED · (\d+)% OF (\d+)$/, '$1 MISLUKT · $2% VAN $3'],
  [/^Showing 5 most recent · (\d+) more in batch list$/, 'Toont 5 meest recente · $1 meer in partijlijst'],
  // ---- time capsule reservations ----
  [/^(\d+) OF (\d+) RESERVED · (\d+) FREE$/, '$1 VAN $2 GERESERVEERD · $3 VRIJ'],
  [/^(\d+) until (.+)$/, '$1 tot $2'],
  // ---- yeast rehydration wizard ----
  [/^🧫 YEAST REHYDRATION · STEP (\d+) OF (\d+)$/, '🧫 GISTREHYDRATIE · STAP $1 VAN $2'],
  [/^▶ Start (\d+)-minute timer$/, '▶ Start timer van $1 minuten'],
  // ---- supply edit: "Price per <unit> (<cur>, optional)" ----
  [/^Price per\s*(.*?)\s*\((.+), optional\)$/, function(m,u,c){return 'Prijs per '+(u?u+' ':'')+'('+c+', optioneel)';}],
  [/^No matches for "(.+)"\.$/, 'Geen resultaten voor "$1".'],
  [/^📊 LAST SYNC · (.+)$/, '📊 LAATSTE SYNC · $1'],
  // ---- cellar / label-sheet / storage-picker / gift / compare value-bearing ----
  [/^Shelves \((\d+)\)$/, 'Planken ($1)'],
  [/^(\d+) ml only × copies$/, '$1 ml alleen × kopieën'],
  [/^(\d+) \/ (\d+) selected$/, '$1 / $2 geselecteerd'],
  [/^🖨 Print (\d+) labels?$/, function(m,n){return '🖨 '+n+' etiket'+(n==='1'?'':'ten')+' afdrukken';}],
  [/^EDIT BOTTLING · (.+)$/, 'BOTTELING BEWERKEN · $1'],
  [/^📊 COMPARE TASTINGS · (.+)$/, '📊 PROEVERIJEN VERGELIJKEN · $1'],
  [/^🎁 RECORD GIFT \((\d+) × (\d+)ml\)$/, '🎁 CADEAU REGISTREREN ($1 × $2ml)'],
  [/^🎁 RECORD GIFT \((\d+)ml\)$/, '🎁 CADEAU REGISTREREN ($1ml)'],
  [/^Originally bottled \((\d+)ml\)$/, 'Oorspronkelijk gebotteld ($1ml)'],
  // ---- year in review + personal records ----
  [/^Your meadwright's record for (\d+)( · historical view)?$/, function(m,y,h){return 'Het verslag van de meadmaker voor '+y+(h?' · historisch overzicht':'');}],
  [/^"A year of (\d+) bottles, (\d+) batches, and patience rewarded\."$/, '"Een jaar van $1 flessen, $2 partijen, en geduld beloond."'],
  [/^(.+) · still resting$/, '$1 · rust nog'],
  [/^(\d+) btl$/, '$1 fl'],
  [/^LIFETIME · (\d+) batches · (\d+) bottles produced · (\d+) consumed$/, 'TOTAAL · $1 partijen · $2 flessen geproduceerd · $3 gedronken']
];
// ---- Data translation: recipe/honey content that already has NL data
// (names, styles, tags, honey types, descriptions) reverse-mapped so it
// translates in every view, not just on labels/share. Built lazily from
// APP.recipes + the existing NL tables; cached until the recipe count changes.
var TAG_NL={
  'Acerglyn':'Acerglyn','Aged':'Gerijpt','Antioxidant':'Antioxidant','Apple':'Appel','Aromatic':'Aromatisch','Autumn':'Herfst',
  'Beer-hybrid':'Bier-hybride','Berries':'Bessen','Berry':'Bes','Bochet':'Bochet','Bold':'Krachtig','Caramel':'Karamel',
  'Caramelized':'Gekarameliseerd','Carbonated':'Koolzuurhoudend','Cassis':'Cassis','Celebration':'Feest','Cellar':'Kelder','Chai':'Chai',
  'Champagne-style':'Champagnestijl','Cider':'Cider','Citrus':'Citrus','Classic':'Klassiek','Coffee':'Koffie','Complex':'Complex','Cyser':'Cyser',
  'Dark Berries':'Donkere bessen','Deep':'Diep','Deep purple':'Diep paars','Delicate':'Delicaat','Dessert':'Dessert','Dry':'Droog',
  'Earthy':'Aards','Easy':'Makkelijk','Floral':'Bloemig','Forest':'Bos','Forest Fruits':'Bosvruchten','Fresh aroma':'Fris aroma',
  'Fruit':'Fruit','Fruity':'Fruitig','Ginger':'Gember','Grape':'Druif','High ABV':'Hoog alcohol','Honey-forward':'Honinggedreven',
  'Hopped':'Gehopt','Hops':'Hop','Hydromel':'Hydromel','Indigo':'Indigo','Lavender':'Lavendel','Long Aging':'Lange rijping',
  'Long aging':'Lange rijping','Long-Aging':'Lange rijping','Low-ABV':'Laag alcohol','Malty':'Moutig','Maple':'Ahorn','Marshmallow':'Marshmallow',
  'Melomel':'Melomel','Metheglin':'Metheglin','Modern':'Modern','Nutty':'Nootachtig','Patience':'Geduld','Pink':'Roze',
  'Port-Style':'Portstijl','Primary':'Primair','Provence':'Provence','Quick':'Snel','Refreshing':'Verfrissend','Restraint':'Terughoudendheid',
  'Risky':'Gewaagd','Roasted':'Geroosterd','Romantic':'Romantisch','Ruby red':'Robijnrood','Sack':'Sack','Secondary':'Secundair',
  'Session':'Sessie','Single fruit':'Eén fruit','Smooth':'Zacht','Sparkling':'Mousserend','Special occasion':'Speciale gelegenheid',
  'Spiced':'Gekruid','Spices':'Specerijen','Spicy':'Pittig','Stone fruit':'Steenfruit','Summer':'Zomer','Sweet':'Zoet',
  'Tannic':'Tannisch','Tart':'Zurig','Tawny-Port-Style':'Tawny-portstijl','Toffee':'Toffee','Vanilla':'Vanille','Vibrant':'Levendig',
  'Warming':'Warmend','Wine-like':'Wijnachtig','Winter':'Winter'
};
var _dataMaps=null,_dataMapsKey='';
function _buildDataMaps(){
  var key=(typeof APP!=='undefined'&&APP.recipes?APP.recipes.length:0)+'';
  if(_dataMaps&&_dataMapsKey===key)return _dataMaps;
  var name={},style={},desc={},honey={};
  (typeof APP!=='undefined'&&APP.recipes?APP.recipes:[]).forEach(function(r){
    if(typeof RECIPE_NAME_NL!=='undefined'&&RECIPE_NAME_NL[r.id]&&r.name)name[r.name]=RECIPE_NAME_NL[r.id];
    if(typeof RECIPE_DESC_NL!=='undefined'&&RECIPE_DESC_NL[r.id]&&r.description)desc[r.description]=RECIPE_DESC_NL[r.id];
  });
  if(typeof RECIPE_STYLE_NL!=='undefined')Object.keys(RECIPE_STYLE_NL).forEach(function(k){style[k]=RECIPE_STYLE_NL[k];});
  // composite "Sparkling · X" styles seen on cards
  style['Sparkling · Cyser']='Mousserend · Cyser';style['Sparkling · Hydromel']='Mousserend · Hydromel';
  style['Sparkling · Melomel']='Mousserend · Melomel';style['Sparkling · Metheglin']='Mousserend · Metheglin';
  try{var ht=LABEL_I18N.nl.honeyType||{};Object.keys(ht).forEach(function(k){honey[k]=ht[k];});}catch(e){}
  // honey library prose: English profile/pairing/notes → NL (from HONEY_PROFILES_NL)
  var prose={};
  if(typeof HONEY_PROFILES!=='undefined'&&typeof HONEY_PROFILES_NL!=='undefined'){
    Object.keys(HONEY_PROFILES_NL).forEach(function(nm){
      var en=HONEY_PROFILES[nm],nl=HONEY_PROFILES_NL[nm];if(!en||!nl)return;
      ['profile','pairing','notes'].forEach(function(f){if(en[f]&&nl[f])prose[en[f]]=nl[f];});
    });
  }
  // mead guide: title (card + icon-prefixed modal), full content (modal) and the
  // whitespace-collapsed 104-char teaser (card) all reverse-mapped to NL.
  function teaser(t){return String(t||'').replace(/\s+/g,' ').trim().slice(0,104)+'…';}
  if(typeof GUIDE_SECTIONS==='function'&&typeof GUIDE_SECTIONS_NL!=='undefined'){
    GUIDE_SECTIONS().forEach(function(s){
      var nl=GUIDE_SECTIONS_NL[s.title];if(!nl)return;
      var eu=String(s.title).toUpperCase(),nu=String(nl.title).toUpperCase();
      prose[eu]=nu; prose[s.icon+' '+eu]=s.icon+' '+nu;
      if(s.content&&nl.content){prose[s.content]=nl.content;prose[teaser(s.content)]=teaser(nl.content);}
    });
  }
  if(typeof BEGINNER_HOWTO!=='undefined'&&typeof BEGINNER_HOWTO_NL!=='undefined'){
    BEGINNER_HOWTO.forEach(function(s){var nl=BEGINNER_HOWTO_NL[s.t];if(!nl)return;if(s.t&&nl.t)prose[s.t]=nl.t;if(s.d&&nl.d)prose[s.d]=nl.d;});
  }
  // off-flavor wizard display strings (chip names, causes, fixes)
  if(typeof OFF_FLAVOR_NL!=='undefined')Object.keys(OFF_FLAVOR_NL).forEach(function(k){prose[k]=OFF_FLAVOR_NL[k];});
  // yeast library: profiles, descriptions, why/history/practices/mistakes, array terms
  if(typeof YEAST_NL!=='undefined')Object.keys(YEAST_NL).forEach(function(k){prose[k]=YEAST_NL[k];});
  // nutrient library: compositions, descriptions, why/when, best-for/tips.
  // The library card shows the first sentence of the description, so add a
  // first-sentence variant too ("...".split('.')[0] + '.').
  if(typeof NUTRIENT_NL!=='undefined')Object.keys(NUTRIENT_NL).forEach(function(k){
    prose[k]=NUTRIENT_NL[k];
    if(k.indexOf('.')>=0){var ek=k.split('.')[0]+'.',ev=NUTRIENT_NL[k].split('.')[0]+'.';if(ek!==k)prose[ek]=ev;}
  });
  // per-recipe nutrient effect notes (RECIPE_NUTRIENT_PAIRINGS effects)
  if(typeof NUTRIENT_EFFECTS_NL!=='undefined')Object.keys(NUTRIENT_EFFECTS_NL).forEach(function(k){prose[k]=NUTRIENT_EFFECTS_NL[k];});
  // recipe-detail "every honey · how each one fits" recommendation prose
  if(typeof SHIFT_NL!=='undefined')Object.keys(SHIFT_NL).forEach(function(k){prose[k]=SHIFT_NL[k];});
  // recipe-detail "Traditional choices" advisory prose (yeast/adjunct/combo)
  if(typeof RECIPE_GUIDE_NL!=='undefined')Object.keys(RECIPE_GUIDE_NL).forEach(function(k){prose[k]=RECIPE_GUIDE_NL[k];});
  // failure-category labels (postmortems) render combined with icon/prefix → proseL them
  Object.keys(FAILCAT_NL).forEach(function(k){prose[k]=FAILCAT_NL[k];});
  // recipe step titles render raw → reverse-map them (descs go through annotateNutrientDesc)
  if(typeof STEP_TITLE_NL!=='undefined')Object.keys(STEP_TITLE_NL).forEach(function(k){prose[k]=STEP_TITLE_NL[k];});
  // recipe ingredient item names + per-ingredient notes render raw → reverse-map
  if(typeof ING_ITEM_NL!=='undefined')Object.keys(ING_ITEM_NL).forEach(function(k){prose[k]=ING_ITEM_NL[k];});
  if(typeof ING_NOTES_NL!=='undefined')Object.keys(ING_NOTES_NL).forEach(function(k){prose[k]=ING_NOTES_NL[k];});
  _dataMaps={name:name,style:style,desc:desc,honey:honey,prose:prose};_dataMapsKey=key;
  return _dataMaps;
}
function _dataTr(s){
  var k=s.trim();if(!k)return null;
  var m=_buildDataMaps();
  if(m.name[k])return s.replace(k,m.name[k]);
  if(TAG_NL[k])return s.replace(k,TAG_NL[k]);
  if(m.style[k])return s.replace(k,m.style[k]);
  if(m.honey[k])return s.replace(k,m.honey[k]);
  if(m.desc[k])return s.replace(k,m.desc[k]);
  if(m.prose[k])return s.replace(k,m.prose[k]);
  // truncated text: "<prefix>…" — recipe-card descriptions (100) or honey recipe
  // pills (recipe names, 18). Match by prefix against the desc/name maps.
  if(/…$/.test(k)){
    var pre=k.slice(0,-1),en;
    if(k.length>40){for(en in m.desc){if(en.indexOf(pre)===0)return s.replace(k,m.desc[en].substring(0,100)+'…');}}
    for(en in m.name){if(en.indexOf(pre)===0)return s.replace(k,m.name[en].substring(0,18)+'…');}
  }
  return null;
}
// Public: translate a data-prose string to NL when in Dutch, else return as-is.
// For render sites where the string is prefixed (🎯/⏱) and so won't be caught by
// translateChrome's whole-node matching.
function proseL(s){
  if(appLang()!=='nl'||s==null)return s;
  var r=_dataTr(s); return r!=null?r:s;
}
// Public: translate a UI-chrome phrase to NL when in Dutch, for render sites that
// build attribute text (e.g. <optgroup label>) which translateChrome can't reach.
function uiL(s){
  if(appLang()!=='nl'||s==null)return s;
  var r=_tr(s); return r!=null?r:s;
}
function _tr(s){
  var k=s.trim(); if(!k)return null;
  if(Object.prototype.hasOwnProperty.call(UI_PHRASES,k))return s.replace(k,UI_PHRASES[k]);
  for(var i=0;i<UI_PATTERNS.length;i++){
    var p=UI_PATTERNS[i];
    if(p[0].test(k))return s.replace(k, k.replace(p[0],p[1]));
  }
  var d=_dataTr(s); if(d!=null)return d;
  // " · "-joined lists (e.g. a yeast's recommendedFor pills) — translate each part
  if(k.indexOf(' · ')>=0){
    var parts=k.split(' · '),any=false;
    var out=parts.map(function(t){
      if(Object.prototype.hasOwnProperty.call(UI_PHRASES,t)){any=true;return UI_PHRASES[t];}
      for(var j=0;j<UI_PATTERNS.length;j++){if(UI_PATTERNS[j][0].test(t)){any=true;return t.replace(UI_PATTERNS[j][0],UI_PATTERNS[j][1]);}}
      var dd=_dataTr(t);if(dd!=null){any=true;return dd;}
      return t;
    });
    if(any)return s.replace(k,out.join(' · '));
  }
  return null;
}
// Translate the visible chrome inside `root` (call after each render, NL only).
function translateChrome(root){
  if(appLang()!=='nl'||!root||typeof document==='undefined')return;
  try{
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentNode;if(!p)return NodeFilter.FILTER_REJECT;
      var t=p.nodeName;
      if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA')return NodeFilter.FILTER_REJECT;
      // <option> display text is safe to translate only when the option has an
      // explicit value attribute (so select.value stays the value, not the text).
      if(t==='OPTION'&&!p.hasAttribute('value'))return NodeFilter.FILTER_REJECT;
      if(p.closest&&p.closest('svg'))return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    var nodes=[],n;while(n=w.nextNode())nodes.push(n);
    nodes.forEach(function(t){var r=_tr(t.nodeValue);if(r!=null)t.nodeValue=r;});
    root.querySelectorAll('[title]').forEach(function(el){var r=_tr(el.getAttribute('title'));if(r!=null)el.setAttribute('title',r);});
    root.querySelectorAll('[placeholder]').forEach(function(el){var r=_tr(el.getAttribute('placeholder'));if(r!=null)el.setAttribute('placeholder',r);});
  }catch(e){}
}
// Debug aid (console): list English-ish text nodes in `root` not yet covered.
function findUntranslated(root){
  root=root||document.getElementById('main');var seen={},out=[];
  if(!root)return out;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);var n;
  while(n=w.nextNode()){
    var p=n.parentNode,t=p&&p.nodeName;
    if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA'||(p&&p.closest&&p.closest('svg')))continue;
    var s=n.nodeValue.trim();
    if(s.length>1&&/[A-Za-z]{2,}/.test(s)&&_tr(n.nodeValue)==null&&!seen[s]){seen[s]=1;out.push(s);}
  }
  return out;
}
