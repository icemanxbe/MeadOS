// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// troubleshooting, insights, off-flavor wizard, blending, achievements, bottling workflow
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== TROUBLESHOOTING ====================
// Each topic carries mead content (title/steps) plus an optional cider
// variant (ciderTitle/ciderSteps) — tsLocalizeTopic() in 12-tasting-analysis.js
// picks whichever matches activeBevMode(), then layers NL translation on top.
// Written as genuinely distinct cider guidance (real cider yeasts/tolerances/
// techniques), not a word-swap of "mead" → "cider".
var TROUBLESHOOT_TOPICS=[
  // ============ FERMENTATION ISSUES ============
  {
    id:'stuck-fermentation',
    title:'Stuck or stalled fermentation — gravity won\'t drop',
    icon:'⏸',
    category:'Fermentation',
    steps:[
      '<strong>Confirm it\'s really stuck.</strong> Take two gravity readings 48-72 hours apart at the same temperature. If they\'re within 0.001, fermentation is stalled (not just slow).',
      '<strong>Check the temperature.</strong> M05 needs 13-28°C, optimal 18-22°C. Below 15°C fermentation often turns sluggish enough to look stalled; above 26°C it stresses and may stop producing.',
      '<strong>Rule out nutrient deficiency.</strong> Mead is nitrogen-poor — without staggered nutrient additions (SNA), yeast starves around 1/3 sugar break. Add 3g Fermaid-O or DAP per 5L gently stirred in.',
      '<strong>Rouse the yeast.</strong> Gently swirl the fermenter to re-suspend settled yeast. Don\'t splash (introduces oxygen). If using a carboy, rock it side-to-side.',
      '<strong>Check the gravity ceiling.</strong> M05 tolerates 18% ABV. If your OG was 1.150+, you may have hit the ceiling — residual sweetness is expected.',
      '<strong>Rescue pitch.</strong> If truly stuck below target: make a starter with 50g sugar + 200ml warm water + nutrient + fresh M05, and let it get actively fermenting (2-6h). Then acclimate it to your batch before combining — stir in a splash of the stuck must, wait 15-30 min, repeat with a couple of larger splashes, then add the whole starter. Dumping fresh yeast straight into an already-alcoholic must can shock and kill it before it does anything.',
      '<strong>Last resort: high-alcohol yeast.</strong> EC-1118 or K1V-1116 gives you the best shot at restarting up to 18-20% — not a guarantee, since pH, residual nutrients and inhibitory compounds from the stalled batch matter too. Acclimate it the same way (starter first, then step it up with splashes of the stuck must).'
    ],
    ciderTitle:'Stuck or stalled fermentation — gravity won\'t drop',
    ciderSteps:[
      '<strong>Confirm it\'s really stuck.</strong> Take two gravity readings 48-72 hours apart at the same temperature. If they\'re within 0.001, fermentation is stalled (not just slow).',
      '<strong>Check the temperature.</strong> Nottingham and Mangrove Jack\'s M02 ferment happily 12-22°C, optimal 18-20°C; EC-1118 tolerates 10-35°C. Below 10°C most cider yeasts turn sluggish enough to look stalled; above 28°C they stress.',
      '<strong>Rule out nutrient deficiency.</strong> Apple juice varies a lot — some dessert-apple juice is nitrogen-poor like honey must, but bittersweets, fresh-pressed and orchard blends often carry real YAN of their own. If in doubt, assume it needs help: without staggered Fermaid-O, yeast starves around the 1/3 sugar break. Add 1-1.5g Fermaid-O per 5L gently stirred in.',
      '<strong>Rouse the yeast.</strong> Gently swirl the fermenter to re-suspend settled yeast. Don\'t splash (introduces oxygen). If using a carboy, rock it side-to-side.',
      '<strong>Check the gravity ceiling.</strong> Nottingham and 71B tolerate ~14%, Mangrove Jack\'s M02 only ~12%, EC-1118 up to 18%. If your OG was 1.080+ (New England, Applewine) or 1.150+ (Ice/Fire Cider), you may have hit your yeast\'s ceiling.',
      '<strong>Rescue pitch.</strong> If truly stuck below target: make a starter with 50g sugar + 200ml warm apple juice + nutrient + fresh EC-1118, and let it get actively fermenting (2-6h). Then acclimate it to your batch before combining — stir in a splash of the stuck cider, wait 15-30 min, repeat with a couple of larger splashes, then add the whole starter. Dumping fresh yeast straight into an already-alcoholic must can shock and kill it before it does anything.',
      '<strong>Last resort: high-alcohol yeast.</strong> EC-1118 has far more headroom than Nottingham/M02/71B and gives you the best shot at restarting up to 18% — not a guarantee, since pH, residual nutrients and inhibitory compounds from the stalled batch matter too. Acclimate it the same way (starter first, then step it up with splashes of the stuck cider).'
    ]
  },
  {
    id:'slow-start',
    title:'Fermentation isn\'t starting / no airlock activity after 48h',
    icon:'🐌',
    category:'Fermentation',
    steps:[
      '<strong>Wait. Seriously.</strong> M05 can take 24-72 hours to show airlock activity. Inside the must, fermentation has likely begun even if you don\'t see bubbles.',
      '<strong>Take a gravity reading.</strong> If gravity has dropped from your OG, fermentation IS happening — the airlock just isn\'t bubbling because CO₂ is escaping elsewhere (loose grommet, lid, or dissolving into solution).',
      '<strong>Check temperature.</strong> Too cold (&lt;15°C) → fermentation stalls out or crawls. Too hot (&gt;30°C) → may have killed the yeast. Aim for 18-22°C.',
      '<strong>Check airlock water level.</strong> Bubbles travel up through the water. Dry airlock = no visible activity. Refill to the line.',
      '<strong>Confirm yeast was rehydrated correctly.</strong> Sprinkled on warm (not hot) must surface, ideally water 30-35°C. Boiling water kills yeast cells.',
      '<strong>Old packet? Test it before assuming it\'s dead.</strong> Well-stored dry yeast routinely stays viable years past its date — proof a pinch in warm sugar water (should foam within 20-30 min) before throwing it out and buying more.',
      '<strong>Pitch fresh yeast.</strong> If gravity hasn\'t moved after 5 days, repitch. Make a starter as above.',
      '<strong>Sanitize next time.</strong> A common cause: sanitizer residue killed the yeast. Always rinse food-safe sanitizers thoroughly after contact.'
    ],
    ciderTitle:'Fermentation isn\'t starting / no airlock activity after 48h',
    ciderSteps:[
      '<strong>Wait. Seriously.</strong> Nottingham and M02 can take 24-72 hours to show airlock activity. Inside the juice, fermentation has likely begun even if you don\'t see bubbles. Wild-fermented styles (French Cider, Sidra) can take several days longer.',
      '<strong>Take a gravity reading.</strong> If gravity has dropped from your OG, fermentation IS happening — the airlock just isn\'t bubbling because CO₂ is escaping elsewhere (loose grommet, lid, or dissolving into solution).',
      '<strong>Check temperature.</strong> Too cold (&lt;10°C) → fermentation stalls out or crawls. Too hot (&gt;32°C) → may have killed the yeast. Aim for 18-20°C for a normal pitch.',
      '<strong>Check airlock water level.</strong> Bubbles travel up through the water. Dry airlock = no visible activity. Refill to the line.',
      '<strong>Confirm yeast was rehydrated correctly.</strong> Sprinkled on warm (not hot) juice surface, ideally water 30-35°C. Boiling water kills yeast cells.',
      '<strong>Old packet? Test it before assuming it\'s dead.</strong> Well-stored dry yeast routinely stays viable years past its date — proof a pinch in warm sugar water (should foam within 20-30 min) before throwing it out and buying more.',
      '<strong>Pitch fresh yeast.</strong> If gravity hasn\'t moved after 5-7 days and you weren\'t relying on wild yeast, repitch. Make a starter as above.',
      '<strong>Sanitize next time.</strong> A common cause: sanitizer residue killed the yeast. Always rinse food-safe sanitizers thoroughly after contact.'
    ]
  },
  {
    id:'too-sweet',
    title:'Final mead is too sweet (sweetness not what I wanted)',
    icon:'🍯',
    category:'Result',
    steps:[
      '<strong>Verify it\'s really stopped fermenting.</strong> Two stable readings 3+ days apart. If still dropping, just wait — it will get drier.',
      '<strong>Identify the cause.</strong> Either (a) fermentation stalled before terminal gravity, or (b) yeast hit ABV tolerance with sugar remaining. Calculate: ABV ≈ (OG-FG) × 131. If you\'re near M05\'s 18% ceiling, it\'s (b).',
      '<strong>If stalled below ceiling:</strong> Restart fermentation — add nutrients, warm up, rouse, or rescue-pitch fresh yeast. See "Stuck fermentation" topic.',
      '<strong>If at ceiling and you wanted drier:</strong> Use a higher-tolerance yeast next batch (EC-1118 at 18%+, K1V-1116 at 18%) and pitch enough.',
      '<strong>Blending solution.</strong> Use the Blending Calculator (Tools tab) — blend a sweet batch with a dry one to land in the middle.',
      '<strong>Embrace it.</strong> A sweet mead is a feature not a bug. Pair with strong cheese, spicy food, or dessert. Sweet meads age gracefully for years.'
    ],
    ciderTitle:'Final cider is too sweet (sweetness not what I wanted)',
    ciderSteps:[
      '<strong>Verify it\'s really stopped fermenting.</strong> Two stable readings 3+ days apart. If still dropping, just wait — it will get drier.',
      '<strong>Identify the cause.</strong> Either (a) fermentation stalled before terminal gravity, or (b) yeast hit ABV tolerance with sugar remaining. Calculate: ABV ≈ (OG-FG) × 131. If you\'re near Nottingham/71B\'s ~14% ceiling or M02\'s ~12%, it\'s (b).',
      '<strong>If stalled below ceiling:</strong> Restart fermentation — add nutrients, warm up, rouse, or rescue-pitch fresh EC-1118. See "Stuck fermentation" topic.',
      '<strong>If at ceiling and you wanted drier:</strong> Use EC-1118 next batch (18% headroom) and pitch enough.',
      '<strong>Blending solution.</strong> Use the Blending Calculator (Tools tab) — blend a sweet batch with a dry one to land in the middle.',
      '<strong>Embrace it, if it fits the style.</strong> French Cider and Ice/Fire Cider are DELIBERATELY left sweet by design — check whether this is actually a flaw or just the style working as intended before "fixing" it.'
    ]
  },
  {
    id:'too-dry',
    title:'Final mead is too dry / harsh',
    icon:'🏜',
    category:'Result',
    steps:[
      '<strong>Stabilize first.</strong> Add potassium sorbate (0.5g/L) + potassium metabisulfite (0.15g/L) to prevent renewed fermentation. Wait 24-48 hours.',
      '<strong>Backsweeten.</strong> Add honey dissolved in a little warm mead (1:1) back into the batch — start with 30-50g/L and taste before adding more. Use the Additions tab on the batch to log it.',
      '<strong>Alternative sweeteners.</strong> Erythritol or stevia for a calorie-conscious sweetness without renewed fermentation risk. Lactose (non-fermentable). Or unfermented juice concentrate.',
      '<strong>Soften the harshness.</strong> Age it. Most "dry and harsh" meads mellow significantly after 6-12 months. Time is the cheapest fix.',
      '<strong>Add body.</strong> A teaspoon of glycerin per litre adds mouthfeel without sweetness. Some brewers use unfermented honey or oak chips to round out a thin profile.'
    ],
    ciderTitle:'Final cider is too dry / harsh',
    ciderSteps:[
      '<strong>Stabilize first.</strong> Add potassium sorbate (0.5g/L) + potassium metabisulfite (0.15g/L) to prevent renewed fermentation. Wait 24-48 hours.',
      '<strong>Backsweeten with juice, not honey.</strong> Fresh or frozen-concentrate apple juice, starting around 10-20g/L of actual sugar — cider reads "sweet" at a noticeably lower residual sugar than mead does, so it takes less than you\'d expect. Taste, adjust. Use the Additions tab on the batch to log it.',
      '<strong>Alternative sweeteners.</strong> Erythritol or stevia for a calorie-conscious sweetness without renewed fermentation risk. Lactose (non-fermentable) also works if you want body without cider-flavor dilution.',
      '<strong>Soften the harshness.</strong> Age it. Most "dry and harsh" ciders mellow significantly after 6-12 months — English Cider and Applewine especially reward patience.',
      '<strong>Add body.</strong> A teaspoon of glycerin per litre adds mouthfeel without sweetness. Some brewers add a splash of unfermented apple juice at bottling to round out a thin profile.'
    ]
  },
  {
    id:'off-flavors',
    title:'Mead has off-flavors (sour, sulfur, solvent, vinegar, harsh alcohol)',
    icon:'🤢',
    category:'Off-Flavors',
    steps:[
      '<strong>🥚 Sulfur (rotten eggs):</strong> Yeast stress from nitrogen deficiency. Add nutrients during fermentation. Often clears on its own with time and racking. Aging 3-6 months helps. For a smell that won\'t clear, some experienced brewers use brief contact with clean copper (tubing or mesh) to convert it — but copper is toxic in excess, so get nutrients and aging right first rather than reaching for this.',
      '<strong>🧪 Solvent / nail-polish (fusel alcohols):</strong> Fermented too hot. Won\'t go away but mellows over 6-12 months. Lesson: keep next batch at 18-22°C max.',
      '<strong>🍷 Sour / vinegar:</strong> Acetic acid bacteria contamination. If mild, blend with a sweeter batch. If strong, it\'s ruined — turn it into mead vinegar (acetobacter does the rest) for cooking.',
      '<strong>🧈 Buttery / popcorn (diacetyl):</strong> Rare in mead, more common in beer. Often clears with extended aging on yeast (3-6 months).',
      '<strong>🌫 Wet cardboard / sherry-like:</strong> Oxidation. Caused by splashing during racking, headspace too large, or aging too long with too much air. Drink soon, don\'t age further.',
      '<strong>🦠 Band-Aid / medicinal (phenolic):</strong> Wild yeast contamination. Affected mead is usually a write-off; sanitize EVERYTHING aggressively for next batch.',
      '<strong>🌶 Hot alcohol burn:</strong> Too high ABV for the style, or under-aged. Most strong meads need 1-2 years to round out. Patience.'
    ],
    ciderTitle:'Cider has off-flavors (sour, mousy, solvent, vinegar, harsh alcohol)',
    ciderSteps:[
      '<strong>🥚 Sulfur (rotten eggs):</strong> Yeast stress from nitrogen deficiency. Add Fermaid-O during fermentation. Often clears on its own with time and racking. Aging 3-6 months helps. For a smell that won\'t clear, some experienced brewers use brief contact with clean copper (tubing or mesh) to convert it — but copper is toxic in excess, so get nutrients and aging right first rather than reaching for this.',
      '<strong>🧪 Solvent / nail-polish (fusel alcohols):</strong> Fermented too hot. Won\'t go away but mellows over 6-12 months. Lesson: keep next batch at 18-20°C max.',
      '<strong>🍷 Sour / vinegar (volatile acidity):</strong> Acetobacter contamination — a genuinely bigger real-world risk in cider than mead, especially for wild-fermented, low-sulfite styles like Sidra and French Cider. If mild, blend with a sweeter batch. If strong, it\'s ruined — turn it into cider vinegar (acetobacter does the rest) for cooking.',
      '<strong>🐭 Mousy (only noticeable after swallowing, not on the nose):</strong> Certain lactic acid bacteria producing pyridines, usually in low-sulfite, higher-pH ciders. Add metabisulfite promptly to suppress further bacterial activity — it won\'t remove the taint already present, but stops it from worsening.',
      '<strong>🧈 Buttery / popcorn (diacetyl):</strong> In an English Cider pursuing malolactic fermentation, this is often the DESIRED phenolic/buttery character, not a flaw — taste before "fixing" it. In every other style it\'s unwanted; extended aging on the yeast (3-6 months) usually clears it.',
      '<strong>🌫 Wet cardboard / sherry-like:</strong> Oxidation. Caused by splashing during racking, headspace too large, or aging too long with too much air. Drink soon, don\'t age further.',
      '<strong>🌶 Hot alcohol burn:</strong> Too high ABV for the style, or under-aged. Ice Cider and Fire Cider especially need a full year to round out. Patience.'
    ]
  },
  {
    id:'cloudy',
    title:'Mead won\'t clear / stays cloudy',
    icon:'🌫',
    category:'Clarity',
    steps:[
      '<strong>Be patient.</strong> Mead can take 2-6 months to clear by gravity alone. Don\'t panic before month 3.',
      '<strong>Cold-crash.</strong> Put fermenter at 1-5°C for 7-14 days. Yeast and proteins drop out.',
      '<strong>Rack off the lees.</strong> Move clear mead off the sediment into a clean vessel. Repeat in 4-6 weeks if needed.',
      '<strong>Use fining agents.</strong> Bentonite (4g/L) for protein haze, added in suspension during/before primary. Sparkolloid for stubborn haze post-fermentation. Pectic enzyme if you used fruit (helps break down pectin haze).',
      '<strong>Filter (last resort).</strong> A coarse filter (5µm) followed by a fine (1µm). Removes some character but produces brilliant clarity.',
      '<strong>Some haze is normal.</strong> Particularly with high-fruit melomels — pectin haze can be permanent. Add pectic enzyme during primary to prevent it next time.'
    ],
    ciderTitle:'Cider won\'t clear / stays cloudy',
    ciderSteps:[
      '<strong>Pectic enzyme is the first fix, not the last.</strong> Unlike mead, apple and pear juice are naturally loaded with pectin — most cider haze is pectin haze. If you skipped pectic enzyme, add it now (2g/5L) rather than waiting.',
      '<strong>Be patient.</strong> Cider can take 2-6 months to clear by gravity alone. Perry is notoriously slower than apple cider — allow real extra time before assuming something\'s wrong.',
      '<strong>Cold-crash.</strong> Put fermenter at 1-5°C for 7-14 days. Yeast and proteins drop out.',
      '<strong>Rack off the lees.</strong> Move clear cider off the sediment into a clean vessel. Repeat in 4-6 weeks if needed.',
      '<strong>Use fining agents for the rest.</strong> Bentonite (4g/L) for protein haze. Sparkolloid for stubborn haze post-fermentation, once pectic enzyme has already been given time to work.',
      '<strong>Filter (last resort).</strong> A coarse filter (5µm) followed by a fine (1µm). Removes some character but produces brilliant clarity.',
      '<strong>A little haze is traditional.</strong> Sidra especially is meant to be served with a natural haze — don\'t over-clarify a style that\'s supposed to look rustic.'
    ]
  },
  {
    id:'foam-overflow',
    title:'Vigorous fermentation overflowing the airlock / making a mess',
    icon:'🌋',
    category:'Fermentation',
    steps:[
      '<strong>Install a blow-off tube.</strong> Replace the airlock with a 1-1.5cm-diameter hose into a jar of sanitizer. The wider opening handles foam without clogging.',
      '<strong>Lower the temperature.</strong> Hot fermentation = aggressive. Bring it down to 18-20°C.',
      '<strong>More headspace.</strong> Aim for 20-25% headspace in your fermenter during primary. If you\'re too full, transfer some out into a sanitized container.',
      '<strong>Clean up promptly.</strong> Sticky mead foam is murder to scrape off later. Wipe with warm water and dish soap.',
      '<strong>It\'s a good sign.</strong> Aggressive fermentation = healthy yeast, plenty of nutrients. The mess is just yeast doing its job enthusiastically.'
    ],
    ciderTitle:'Vigorous fermentation overflowing the airlock / making a mess',
    ciderSteps:[
      '<strong>Install a blow-off tube.</strong> Replace the airlock with a 1-1.5cm-diameter hose into a jar of sanitizer. The wider opening handles foam without clogging.',
      '<strong>Lower the temperature.</strong> Hot fermentation = aggressive. Bring it down to 18-20°C.',
      '<strong>More headspace.</strong> Aim for 20-25% headspace during primary — high-sugar musts (New England Cider, Ice Cider, Fire Cider) foam harder than a standard-strength cider. If you\'re too full, transfer some out into a sanitized container.',
      '<strong>Clean up promptly.</strong> Sticky cider foam is murder to scrape off later. Wipe with warm water and dish soap.',
      '<strong>It\'s a good sign.</strong> Aggressive fermentation = healthy yeast, plenty of nutrients. The mess is just yeast doing its job enthusiastically.'
    ]
  },
  {
    id:'temp-too-high',
    title:'Fermentation temperature too high (>24°C)',
    icon:'🔥',
    category:'Temperature',
    steps:[
      '<strong>Move it.</strong> Basement, cool closet, or partially-shaded north-facing room. Even 2-3°C can make a difference.',
      '<strong>Water bath.</strong> Place fermenter in a large container with cool water. Add ice packs rotated 2-3 times a day.',
      '<strong>Wet T-shirt.</strong> Drape a wet towel over the fermenter — evaporative cooling drops temp 2-4°C.',
      '<strong>Swamp cooler.</strong> Fermenter in a tub of water with a fan blowing on the wet towel covering it. Drops temp ~5°C reliably.',
      '<strong>Damage control.</strong> If you\'ve already fermented hot, the mead may have fusel alcohols. Long aging (6-12 months) will mellow them — don\'t panic and dump.',
      '<strong>Next time:</strong> Plan brew dates for cooler months, or invest in a fermentation chamber / mini fridge with Inkbird controller.'
    ],
    ciderTitle:'Fermentation temperature too high (>22°C)',
    ciderSteps:[
      '<strong>Move it.</strong> Basement, cool closet, or partially-shaded north-facing room. Nottingham and M02 especially reward staying cool — even 2-3°C can make a difference.',
      '<strong>Water bath.</strong> Place fermenter in a large container with cool water. Add ice packs rotated 2-3 times a day.',
      '<strong>Wet T-shirt.</strong> Drape a wet towel over the fermenter — evaporative cooling drops temp 2-4°C.',
      '<strong>Swamp cooler.</strong> Fermenter in a tub of water with a fan blowing on the wet towel covering it. Drops temp ~5°C reliably.',
      '<strong>Damage control.</strong> If you\'ve already fermented hot, the cider may have fusel alcohols. Long aging (6-12 months) will mellow them — don\'t panic and dump.',
      '<strong>Next time:</strong> Plan brew dates for cooler months, or invest in a fermentation chamber / mini fridge with Inkbird controller.'
    ]
  },
  {
    id:'temp-too-low',
    title:'Fermentation temperature too low (<16°C)',
    icon:'❄',
    category:'Temperature',
    steps:[
      '<strong>Warm the room.</strong> Move to a heated room — 18-22°C ambient is plenty for M05.',
      '<strong>Brewing belt.</strong> Wrap a 25-50W heat belt around the fermenter, controlled by a thermostat (Inkbird/STC-1000) set to 19°C.',
      '<strong>Hot water bottle / heating pad.</strong> Wrap fermenter loosely with a heating pad set to "low". Check temperature with a digital thermometer — don\'t exceed 24°C.',
      '<strong>Place near (but not on) a heat source.</strong> A few feet from a radiator. Never directly on top — uneven heating stresses yeast.',
      '<strong>Insulate.</strong> Wrap fermenter in a blanket or sleeping bag. Helps stabilize temperature even without active heating.',
      '<strong>Patience.</strong> Cold fermentation is slower but produces cleaner flavors. If you\'re not in a rush, just give it more time at 16-17°C.'
    ],
    ciderTitle:'Fermentation temperature too low (<10°C)',
    ciderSteps:[
      '<strong>Check whether it\'s actually a problem first.</strong> Nottingham and M02 are English ale-derived strains bred to work well cool — many cidermakers deliberately ferment at 12-16°C for a cleaner result. Don\'t "fix" what isn\'t broken.',
      '<strong>If genuinely too cold (below ~10°C) and stalled:</strong> Move to a heated room — 16-20°C ambient is plenty.',
      '<strong>Brewing belt.</strong> Wrap a 25-50W heat belt around the fermenter, controlled by a thermostat (Inkbird/STC-1000) set to 17°C.',
      '<strong>Place near (but not on) a heat source.</strong> A few feet from a radiator. Never directly on top — uneven heating stresses yeast.',
      '<strong>Insulate.</strong> Wrap fermenter in a blanket or sleeping bag. Helps stabilize temperature even without active heating.',
      '<strong>Patience.</strong> Cool fermentation is slower but produces a cleaner, more apple-forward result. If you\'re not in a rush, just give it more time.'
    ]
  },
  {
    id:'aging-window',
    title:'When is my mead actually ready to drink?',
    icon:'⌛',
    category:'Aging',
    steps:[
      '<strong>Traditional / Show Mead:</strong> Drinkable at 6 months, hits peak around 12-18 months, holds for years.',
      '<strong>Melomel (fruit mead):</strong> 4-8 weeks for fresh-fruit character (cherry, strawberry, berry). Heavier fruits (forest fruit, blueberry) peak at 6-12 months.',
      '<strong>Metheglin (spiced mead):</strong> Spice fades over time. Drinkable at 3-6 months, peaks at 6-12 months. Don\'t age too long or spice disappears.',
      '<strong>Cyser / Pyment (apple / grape):</strong> 6-12 months for noble fruit character. Light cysers can be drinkable at 2-3 months.',
      '<strong>Sack / High-ABV (14%+):</strong> 12-24 months minimum, and starting gravity matters as much as ABV — a delicate traditional at 15% often drinks well inside a year, while a heavily-oaked or bochet sack mead at the same strength may still be integrating past two.',
      '<strong>Bochet (caramelized honey):</strong> 6-12 months. Toffee/caramel character develops with aging.',
      '<strong>Test before declaring ready:</strong> Pull one bottle at the minimum-ready date. If it\'s good, drink it. If harsh, give the rest more time. Track tasting wheel evolution over the aging period.'
    ],
    ciderTitle:'When is my cider actually ready to drink?',
    ciderSteps:[
      '<strong>Common Cider / Fruit Cider / Spiced Cider:</strong> These are built to drink young — 30-90 days total, peaking around 60-90 days. Don\'t hold them expecting them to improve; they don\'t need it.',
      '<strong>Experimental / Dry-Hopped Cider:</strong> The opposite of most cider advice — drink it as soon as it\'s bottled. Hop aroma fades with time, even in the bottle.',
      '<strong>Heirloom Cider:</strong> 45 days minimum, peaks around 6 months, holds well over a year.',
      '<strong>English Cider / Perry:</strong> These reward real patience — English Cider peaks around 8 months and keeps improving for a year or more; Perry peaks around 5 months but its notoriously stubborn haze may still be settling.',
      '<strong>New England Cider:</strong> 45 days minimum, peaks around 5 months — the raisins and higher ABV need real time to integrate.',
      '<strong>Applewine:</strong> Treat it like an actual wine — 2 months minimum, peaks around 9 months, holds for years.',
      '<strong>Ice Cider / Fire Cider:</strong> 3 months minimum, peaks around a year. These are dessert-strength ciders; they need the longest of anything in this list.',
      '<strong>Test before declaring ready:</strong> Pull one bottle at the minimum-ready date. If it\'s good, drink it. If harsh, give the rest more time.'
    ]
  },
  {
    id:'sanitation',
    title:'How clean is "clean enough"?',
    icon:'🧼',
    category:'Sanitation',
    steps:[
      '<strong>Wash first, sanitize second.</strong> Sanitizer only works on already-clean surfaces. Hot water + PBW or Chemipro OXI removes residue and biofilm.',
      '<strong>Sanitizer of choice:</strong> StarSan (no-rinse, 1.5ml/L, 30s contact time) is the gold standard. Chemipro SAN (European equivalent) works identically.',
      '<strong>Don\'t fear foam.</strong> StarSan foam IS the sanitizer — let it sit on surfaces, drain, don\'t rinse. "Don\'t fear the foam" is the brewer\'s mantra.',
      '<strong>Bleach is OK in a pinch.</strong> 1tbsp/gallon, contact 10 minutes, RINSE THOROUGHLY. Residual chlorine causes off-flavors (chlorophenols).',
      '<strong>What to sanitize:</strong> Everything that touches mead after the boil/heat step. Hydrometer, racking cane, siphon, bottles, caps, even your hands.',
      '<strong>Boiling water:</strong> 5 minutes at full boil sanitizes anything heat-safe. Best for hydrometers and siphons.',
      '<strong>Bacterial vs wild yeast contamination.</strong> Sour = bacteria. Funky / Band-Aid = wild yeast (Brett/Pedio/Lacto). Hot-side contamination is rare; cold-side after pitch is the usual culprit.'
    ],
    ciderTitle:'How clean is "clean enough"?',
    ciderSteps:[
      '<strong>Wash first, sanitize second.</strong> Sanitizer only works on already-clean surfaces. Hot water + PBW or Chemipro OXI removes residue and biofilm.',
      '<strong>Sanitizer of choice:</strong> StarSan (no-rinse, 1.5ml/L, 30s contact time) is the gold standard. Chemipro SAN (European equivalent) works identically.',
      '<strong>Don\'t fear foam.</strong> StarSan foam IS the sanitizer — let it sit on surfaces, drain, don\'t rinse.',
      '<strong>Take it seriously even for "rustic" styles.</strong> Sidra and French Cider deliberately use minimal sanitation as part of tradition, but "minimal" isn\'t "none" — basic cleanliness still matters, or you risk vinegar (VA) instead of the intended rustic character.',
      '<strong>What to sanitize:</strong> Everything that touches juice after pressing. Hydrometer, racking cane, siphon, bottles, caps, even your hands.',
      '<strong>Boiling water:</strong> 5 minutes at full boil sanitizes anything heat-safe. Best for hydrometers and siphons.',
      '<strong>Bacterial vs wild yeast contamination.</strong> Sour/vinegar = acetic bacteria — cider\'s biggest real risk. Mousy taint = a different bacterial group entirely. Funky/farmhouse = wild yeast (Brett), which is sometimes desirable in French-style cider and unwanted everywhere else.'
    ]
  },
  {
    id:'surface-film',
    title:'Something\'s growing on top — is it mold?',
    icon:'🫧',
    category:'Sanitation',
    steps:[
      '<strong>Look closely before panicking.</strong> A thin, flat, white or cream-colored film that sits ON the surface (not fuzzy, not raised, doesn\'t grow down into the liquid) is almost always kahm yeast — a harmless wild surface yeast, not mold. It smells mild — yeasty, bready, sometimes faintly solventy — not musty or earthy.',
      '<strong>True mold looks different.</strong> Fuzzy texture, raised bumps or patches, and usually some color beyond plain white — green, black, orange, pink. It often smells musty or sharply off. This is a real contamination signal, not a cosmetic issue.',
      '<strong>Kahm yeast: skim it and move on.</strong> It won\'t make you sick and won\'t ruin the batch, though left alone it can add a mild off-flavor over time. Gently skim it off the surface, then smell and taste a small bit of what\'s underneath — if that\'s clean, you\'re fine to continue as normal.',
      '<strong>Mold: don\'t just skim and hope.</strong> Remove it carefully without disturbing it into the liquid, then check what\'s underneath the same way. If the rest smells and tastes clean, it may be salvageable — watch it closely over the following days. If the must smells off throughout, or the growth had clearly spread below the surface, it\'s not worth the risk — document it as a loss and start the next batch with tighter sanitation.',
      '<strong>Why it happens.</strong> Both kahm yeast and mold need oxygen and an exposed surface — a loose-fitting lid, too much headspace, or infrequent airlock checks all make it easier for something to take hold on top.',
      '<strong>Prevent it next time.</strong> Keep the airlock properly filled and sealed, minimize headspace once vigorous primary fermentation has settled down, and don\'t leave a vessel open longer than it needs to be during racking or additions.'
    ],
    ciderTitle:'Something\'s growing on top — is it mold?',
    ciderSteps:[
      '<strong>Look closely before panicking.</strong> A thin, flat, white or cream-colored film that sits ON the surface (not fuzzy, not raised, doesn\'t grow down into the liquid) is almost always kahm yeast — a harmless wild surface yeast, not mold. It smells mild — yeasty, bready, sometimes faintly solventy — not musty or earthy.',
      '<strong>True mold looks different.</strong> Fuzzy texture, raised bumps or patches, and usually some color beyond plain white — green, black, orange, pink. It often smells musty or sharply off. This is a real contamination signal, not a cosmetic issue.',
      '<strong>Kahm yeast: skim it and move on.</strong> It won\'t make you sick and won\'t ruin the batch, though left alone it can add a mild off-flavor over time. Gently skim it off the surface, then smell and taste a small bit of what\'s underneath — if that\'s clean, you\'re fine to continue as normal.',
      '<strong>Mold: don\'t just skim and hope.</strong> Remove it carefully without disturbing it into the liquid, then check what\'s underneath the same way. If the rest smells and tastes clean, it may be salvageable — watch it closely over the following days. If the juice smells off throughout, or the growth had clearly spread below the surface, it\'s not worth the risk — document it as a loss and start the next batch with tighter sanitation.',
      '<strong>Why it happens.</strong> Both kahm yeast and mold need oxygen and an exposed surface — open-vessel wild fermentation (Sidra, French Cider) is naturally more exposed to this than a sealed airlock setup, which is part of the real trade-off of that traditional approach.',
      '<strong>Prevent it next time.</strong> Keep the airlock properly filled and sealed, minimize headspace once vigorous primary fermentation has settled down, and don\'t leave a vessel open longer than it needs to be during racking or additions.'
    ]
  },
  {
    id:'must-overflow',
    title:'My must overflowed / I lost mead during brewing',
    icon:'💧',
    category:'Process',
    steps:[
      '<strong>Use a 20-25% headspace rule.</strong> A 5L batch needs at least a 6L fermenter. Fermentation expansion is real.',
      '<strong>Account for honey volume.</strong> 1.5kg honey displaces ~1L. If your recipe says "5L mead", you need to mix honey + 4L water, not 5L water.',
      '<strong>Top up after primary slows.</strong> If you lost too much volume during vigorous foaming, top up with sanitized water after day 7-14 to reduce headspace and protect from oxidation.',
      '<strong>Sanitize the area.</strong> Any spilled mead on the outside of the fermenter is a contamination risk. Wipe down with sanitizer.',
      '<strong>Don\'t scoop it back in.</strong> Anything that touched the floor, lid edge, or table is contaminated.'
    ],
    ciderTitle:'My juice overflowed / I lost cider during brewing',
    ciderSteps:[
      '<strong>Use a 20-25% headspace rule.</strong> A 5L batch needs at least a 6L fermenter. Fermentation expansion is real.',
      '<strong>Account for adjunct volume.</strong> Raisins (New England Cider) and maple syrup (Fire Cider) both add real volume once dissolved/hydrated — don\'t fill to exactly 5L of juice and then add adjuncts on top.',
      '<strong>Top up after primary slows.</strong> If you lost too much volume during vigorous foaming, top up with sanitized water after day 7-14 to reduce headspace and protect from oxidation.',
      '<strong>Sanitize the area.</strong> Any spilled cider on the outside of the fermenter is a contamination risk. Wipe down with sanitizer.',
      '<strong>Don\'t scoop it back in.</strong> Anything that touched the floor, lid edge, or table is contaminated.'
    ]
  },
  {
    id:'backsweetening',
    title:'How do I backsweeten safely?',
    icon:'🍯',
    category:'Process',
    steps:[
      '<strong>Confirm fermentation is COMPLETE.</strong> Two stable gravity readings 5+ days apart. Adding sugar to active yeast = renewed fermentation = bottle bombs.',
      '<strong>Stabilize first.</strong> Potassium sorbate (0.5g/L) + potassium metabisulfite (0.15g/L). Wait 24-48 hours before adding sugar.',
      '<strong>Honey is the traditional choice.</strong> It adds aroma as well as sweetness — table sugar sweetens with less flavor impact, which some brewers prefer when they don\'t want to shift the balance. Dissolve in a little warm mead first (1:1), then mix into the batch.',
      '<strong>Start small.</strong> As a rough guide: 30-50g/L lands around Off-Dry/Semi-Sweet, 80-120g/L around Sweet, 150g+ into Dessert territory. Acid and honey type both shift this — a tart, high-acid mead (cyser, pyment with citrus) reads less sweet at the same dose, and a high-fructose honey like acacia or tupelo reads sweeter than a glucose-forward one like most wildflower/clover. Taste after each addition before adding more.',
      '<strong>Wait, then taste.</strong> Sweetness perception changes after 1-2 weeks. A batch that tastes "perfect" today may taste cloying in a month, or vice versa.',
      '<strong>Bottle promptly after backsweetening.</strong> Don\'t leave a stabilized + sweetened batch sitting for months — risk of sorbate failure and bottle bombs.',
      '<strong>Log it.</strong> Use the Additions tab on the batch to record what you added, when, and how much.'
    ],
    ciderTitle:'How do I backsweeten cider safely?',
    ciderSteps:[
      '<strong>Confirm fermentation is COMPLETE.</strong> Two stable gravity readings 5+ days apart. Adding sugar to active yeast = renewed fermentation = bottle bombs.',
      '<strong>Stabilize first.</strong> Potassium sorbate (0.5g/L) + potassium metabisulfite (0.15g/L). Wait 24-48 hours before adding juice or sugar.',
      '<strong>Add juice, not honey.</strong> Fresh or frozen-concentrate apple juice is the standard cider approach — it adds sweetness without a foreign flavor. Dissolve concentrate in a little of the cider first if using it, then mix into the batch.',
      '<strong>Start small.</strong> Cider\'s own sweetness scale sits well below mead\'s: roughly under 9g/L residual sugar reads Dry, 9-40g/L is Medium, and past 40g/L is Sweet. A tannic, high-acid blend (bittersharp or sharp apples) reads less sweet at the same dose than a soft, low-acid one — taste after each addition before adding more.',
      '<strong>Wait, then taste.</strong> Sweetness perception changes after 1-2 weeks. A batch that tastes "perfect" today may taste cloying in a month, or vice versa.',
      '<strong>Bottle promptly after backsweetening.</strong> Don\'t leave a stabilized + sweetened batch sitting for months — risk of sorbate failure and bottle bombs.',
      '<strong>Log it.</strong> Use the Additions tab on the batch to record what you added, when, and how much.'
    ]
  },
  {
    id:'bottle-bombs',
    title:'Bottle bombs / pressure building in bottles',
    icon:'💣',
    category:'Bottling',
    steps:[
      '<strong>STOP. Put bottles in a cooler / pot / bucket with a lid, in a corner outside.</strong> Don\'t leave them in your house. Glass shrapnel is dangerous.',
      '<strong>Cool them down.</strong> Move bottles to a fridge or cold cellar (1-5°C). Cold slows or stops residual fermentation.',
      '<strong>Diagnose the cause.</strong> Either (a) you bottled before fermentation finished, or (b) backsweetened without stabilizing first. Either way: yeast + sugar + sealed bottle = pressure.',
      '<strong>Vent each bottle.</strong> Wearing safety glasses, slowly crack each cap or cork outside, over a sink. Let the pressure release. Re-seal if you intend to drink soon.',
      '<strong>Salvage option:</strong> Pour all back into a fermenter, stabilize properly, wait 48h, rebottle. Or just accept it as sparkling mead if you don\'t mind.',
      '<strong>Lesson:</strong> Always confirm fermentation is complete before bottling (2 stable readings, 5+ days apart) AND stabilize before backsweetening.'
    ],
    ciderTitle:'Bottle bombs / pressure building in bottles',
    ciderSteps:[
      '<strong>STOP. Put bottles in a cooler / pot / bucket with a lid, in a corner outside.</strong> Don\'t leave them in your house. Glass shrapnel is dangerous.',
      '<strong>Cool them down.</strong> Move bottles to a fridge or cold cellar (1-5°C). Cold slows or stops residual fermentation.',
      '<strong>Diagnose the cause.</strong> Either (a) you bottled before fermentation finished, or (b) backsweetened with juice or sugar without stabilizing first. Either way: yeast + fermentable sugar + sealed bottle = pressure.',
      '<strong>Vent each bottle.</strong> Wearing safety glasses, slowly crack each cap or cork outside, over a sink. Let the pressure release. Re-seal if you intend to drink soon.',
      '<strong>Salvage option:</strong> Pour all back into a fermenter, stabilize properly, wait 48h, rebottle. Or just accept it as sparkling cider if you don\'t mind — this is roughly how commercial sparkling ciders are made on purpose.',
      '<strong>Lesson:</strong> Always confirm fermentation is complete before bottling (2 stable readings, 5+ days apart) AND stabilize before backsweetening.'
    ]
  },
  {
    id:'racking',
    title:'When and how to rack (transfer)',
    icon:'🔄',
    category:'Process',
    steps:[
      '<strong>First racking:</strong> When primary fermentation slows significantly (1-2 weeks after vigorous activity stops). Transfers off the heaviest yeast cake.',
      '<strong>Second racking:</strong> 4-6 weeks later, off the secondary lees. Helps clarity and removes any off-flavor compounds.',
      '<strong>Third racking (optional):</strong> Before bottling, for crystal clarity. Some prefer to use fining agents instead.',
      '<strong>Minimize oxygen.</strong> Use an auto-siphon, place output below liquid level in destination vessel to avoid splashing. Oxygen during racking = oxidation later.',
      '<strong>Sanitize everything that touches the mead.</strong> Siphon, hose, destination vessel. Re-pollution at this stage ruins months of work.',
      '<strong>Top up if needed.</strong> Headspace &lt; 5% is ideal in the new vessel. If you racked off too much, top up with sanitized water or a similar mead.',
      '<strong>Don\'t over-rack.</strong> Every racking risks oxygen pickup — minimize transfers rather than aiming for a specific count. Two or three is typical; more should have a reason, not just be routine.'
    ],
    ciderTitle:'When and how to rack (transfer)',
    ciderSteps:[
      '<strong>First racking:</strong> When primary fermentation slows significantly (1-2 weeks after vigorous activity stops). Transfers off the heaviest lees.',
      '<strong>Second racking:</strong> 4-6 weeks later, off the secondary lees. This is also the decision point for English Cider\'s malolactic-or-stabilise choice.',
      '<strong>Third racking (optional):</strong> Before bottling, for crystal clarity. Perry especially benefits from an extra racking given how stubborn its haze is.',
      '<strong>Minimize oxygen.</strong> Use an auto-siphon, place output below liquid level in destination vessel to avoid splashing. Oxygen during racking = oxidation later.',
      '<strong>Sanitize everything that touches the cider.</strong> Siphon, hose, destination vessel. Re-pollution at this stage ruins months of work.',
      '<strong>Top up if needed.</strong> Headspace &lt; 5% is ideal in the new vessel. If you racked off too much, top up with sanitized water or a similar cider.',
      '<strong>Don\'t over-rack.</strong> Every racking risks oxygen pickup — minimize transfers rather than aiming for a specific count. Two or three is typical; more should have a reason, not just be routine.'
    ]
  },
  {
    id:'oak-fruit-timing',
    title:'When to add fruit, oak, spices? Primary or secondary?',
    icon:'🍒',
    category:'Process',
    steps:[
      '<strong>Primary (during active fermentation):</strong> Robust fruit and big-character additions. The yeast consumes some sugar, character is integrated into the alcohol matrix. Best for: berries, cherries, stone fruit, vanilla.',
      '<strong>Secondary (after fermentation finishes):</strong> Delicate additions where you want to preserve raw character. Best for: spices (cinnamon, clove), oak chips/cubes, hop additions, fresh herbs, citrus peel.',
      '<strong>Why the difference:</strong> CO₂ off-gassing during primary scrubs aromatics aggressively. Adding cinnamon to primary loses most of its character — you\'d need considerably more of it to compensate.',
      '<strong>Typical durations in secondary:</strong> Cinnamon stick 1-3 days, oak chips 1-2 weeks, oak cubes 3-6 weeks, vanilla bean 1-4 weeks, hop pellets 3-7 days.',
      '<strong>Taste daily.</strong> Over-extraction is hard to reverse. Pull a small sample every day during secondary additions and stop when you like it.',
      '<strong>Use the Additions tab.</strong> Log what you added, when, and when it\'s due for removal. MeadOS will warn you if it\'s overdue.'
    ],
    ciderTitle:'When to add fruit, oak, spices, hops? Primary or secondary?',
    ciderSteps:[
      '<strong>Secondary is the default for cider.</strong> Unlike a lot of mead adjuncts, most cider additions (berries, spices, oak, hops) go in secondary specifically to preserve fresh aroma — CO₂ off-gassing during primary scrubs it out. Raspberries frozen then thawed and racked onto in secondary is the standard approach.',
      '<strong>Primary (during active fermentation):</strong> Reserved for adjuncts that ARE meant to ferment out — raisins (New England Cider) and caramelized maple syrup (Fire Cider) both go in at the start since their sugar is meant to become alcohol, not just flavor.',
      '<strong>Typical durations in secondary:</strong> Cinnamon stick 1-3 days, cloves even less (they climb fast — taste daily), oak cubes 2-6 weeks, fruit until balanced (taste test, not a fixed day), hop pellets 3-5 days maximum.',
      '<strong>Don\'t over-extend hop contact.</strong> Past 5 days, hop character turns grassy and vegetal rather than more aromatic — pull them promptly, unlike oak or fruit where "a bit longer" is usually forgiving.',
      '<strong>Taste daily.</strong> Over-extraction is hard to reverse, especially with clove. Pull a small sample every day during secondary additions and stop when you like it.',
      '<strong>Use the Additions tab.</strong> Log what you added, when, and when it\'s due for removal. MeadOS will warn you if it\'s overdue.'
    ]
  }
];

// Separate section for app/technical issues (kept small at bottom, beverage-neutral)
var APP_TROUBLESHOOT_TOPICS=[
  {
    id:'app-no-data',
    title:'My data isn\'t showing on a new browser/device',
    icon:'🌐',
    steps:[
      'MeadOS stores all data server-side in SQLite — any browser that opens the same server URL sees the same data automatically.',
      'Make sure you opened the app through the server (http://your-host:8080), not as a local file.',
      'Open Settings → Server Data and click <strong>⬇ Reload from Server</strong>.',
      'Use <strong>Verify Storage</strong> to confirm the server database has data.'
    ]
  },
  {
    id:'app-temp-no-show',
    title:'Live temperature pill isn\'t showing',
    icon:'🌡',
    steps:[
      'Configure the optional Home Assistant connection in Settings (URL + long-lived token).',
      'Settings → Temperature Sensors. Enter the full entity ID e.g. <code>sensor.fermentation_temperature</code>.',
      'In HA: Developer Tools → States. Search your sensor. Make sure it reports a numeric value.',
      'Save. The pill appears within 60 seconds.'
    ]
  },
  {
    id:'app-notifications',
    title:'Push notifications aren\'t arriving',
    icon:'🔔',
    steps:[
      'In HA: Developer Tools → Services → find <code>notify.mobile_app_...</code>.',
      'Settings → Push Notifications: enter just the part after <code>notify.</code>',
      'Click Test. Should arrive within seconds.'
    ]
  },
  {
    id:'app-cellar-zero',
    title:'Cellar shows 0 bottles after I bottled',
    icon:'🍾',
    steps:[
      'The Cellar card shows a red "⚠ NEEDS FILL" banner with a <strong>Fill Cellar (N)</strong> button when locations are empty but you bottled N bottles. Click it.',
      'Or open the Bottling tab on the batch and click <strong>Update Bottling</strong> — it will redistribute the count to the cellar.'
    ]
  }
];
