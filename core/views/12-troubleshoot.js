// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// troubleshooting, insights, off-flavor wizard, blending, achievements, bottling workflow
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== TROUBLESHOOTING ====================
var TROUBLESHOOT_TOPICS=[
  // ============ FERMENTATION ISSUES ============
  {
    id:'stuck-fermentation',
    title:'Stuck or stalled fermentation — gravity won\'t drop',
    icon:'⏸',
    category:'Fermentation',
    steps:[
      '<strong>Confirm it\'s really stuck.</strong> Take two gravity readings 48-72 hours apart at the same temperature. If they\'re within 0.001, fermentation is stalled (not just slow).',
      '<strong>Check the temperature.</strong> M05 needs 13-28°C, optimal 18-22°C. Below 15°C the yeast goes dormant; above 26°C it stresses and may stop producing.',
      '<strong>Rule out nutrient deficiency.</strong> Mead is nitrogen-poor — without staggered nutrient additions (SNA), yeast starves around 1/3 sugar break. Add 3g Fermaid-O or DAP per 5L gently stirred in.',
      '<strong>Rouse the yeast.</strong> Gently swirl the fermenter to re-suspend settled yeast. Don\'t splash (introduces oxygen). If using a carboy, rock it side-to-side.',
      '<strong>Check the gravity ceiling.</strong> M05 tolerates 18% ABV. If your OG was 1.150+, you may have hit the ceiling — residual sweetness is expected.',
      '<strong>Rescue pitch.</strong> If truly stuck below target: make a starter with 50g sugar + 200ml warm water + nutrient + fresh M05 yeast. When actively fermenting (2-6h), add to your batch.',
      '<strong>Last resort: high-alcohol yeast.</strong> EC-1118 or K1V-1116 will restart fermentation up to 18-20%. Acclimate it the same way (starter first).'
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
      '<strong>Check temperature.</strong> Too cold (&lt;15°C) → yeast stays dormant. Too hot (&gt;30°C) → may have killed the yeast. Aim for 18-22°C.',
      '<strong>Check airlock water level.</strong> Bubbles travel up through the water. Dry airlock = no visible activity. Refill to the line.',
      '<strong>Confirm yeast was rehydrated correctly.</strong> Sprinkled on warm (not hot) must surface, ideally water 30-35°C. Boiling water kills yeast cells.',
      '<strong>Pitch fresh yeast.</strong> If gravity hasn\'t moved after 5 days, repitch. Make a starter as above.',
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
    ]
  },
  {
    id:'too-dry',
    title:'Final mead is too dry / harsh',
    icon:'🏜',
    category:'Result',
    steps:[
      '<strong>Stabilize first.</strong> Add potassium sorbate (0.5g/L) + potassium metabisulfite (0.15g/L) to prevent renewed fermentation. Wait 24-48 hours.',
      '<strong>Backsweeten.</strong> Add honey dissolved in a little warm mead (1:1) back into the batch, 50-100g/L to start. Taste, adjust. Use the Additions tab on the batch to log it.',
      '<strong>Alternative sweeteners.</strong> Erythritol or stevia for a calorie-conscious sweetness without renewed fermentation risk. Lactose (non-fermentable). Or unfermented juice concentrate.',
      '<strong>Soften the harshness.</strong> Age it. Most "dry and harsh" meads mellow significantly after 6-12 months. Time is the cheapest fix.',
      '<strong>Add body.</strong> A teaspoon of glycerin per litre adds mouthfeel without sweetness. Some brewers use unfermented honey or oak chips to round out a thin profile.'
    ]
  },
  {
    id:'off-flavors',
    title:'Mead has off-flavors (sour, sulfur, solvent, vinegar, harsh alcohol)',
    icon:'🤢',
    category:'Off-Flavors',
    steps:[
      '<strong>🥚 Sulfur (rotten eggs):</strong> Yeast stress from nitrogen deficiency. Add nutrients during fermentation. Often clears on its own with time and racking. Aging 3-6 months helps.',
      '<strong>🧪 Solvent / nail-polish (fusel alcohols):</strong> Fermented too hot. Won\'t go away but mellows over 6-12 months. Lesson: keep next batch at 18-22°C max.',
      '<strong>🍷 Sour / vinegar:</strong> Acetic acid bacteria contamination. If mild, blend with a sweeter batch. If strong, it\'s ruined — turn it into mead vinegar (acetobacter does the rest) for cooking.',
      '<strong>🧈 Buttery / popcorn (diacetyl):</strong> Rare in mead, more common in beer. Often clears with extended aging on yeast (3-6 months).',
      '<strong>🌫 Wet cardboard / sherry-like:</strong> Oxidation. Caused by splashing during racking, headspace too large, or aging too long with too much air. Drink soon, don\'t age further.',
      '<strong>🦠 Band-Aid / medicinal (phenolic):</strong> Wild yeast contamination. Affected mead is usually a write-off; sanitize EVERYTHING aggressively for next batch.',
      '<strong>🌶 Hot alcohol burn:</strong> Too high ABV for the style, or under-aged. Most strong meads need 1-2 years to round out. Patience.'
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
      '<strong>Sack / High-ABV (14%+):</strong> 12-24 months minimum. The harsh alcohol burn takes years to round out.',
      '<strong>Bochet (caramelized honey):</strong> 6-12 months. Toffee/caramel character develops with aging.',
      '<strong>Test before declaring ready:</strong> Pull one bottle at the minimum-ready date. If it\'s good, drink it. If harsh, give the rest more time. Track tasting wheel evolution over the aging period.'
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
      '<strong>Add honey, not table sugar.</strong> Honey adds flavor depth; sugar just adds sweetness. Dissolve in a little warm mead first (1:1), then mix into the batch.',
      '<strong>Start small.</strong> 30-50g/L of honey is light backsweetening. 80-120g/L is medium. 150g+ is dessert-level. Taste after each addition before adding more.',
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
      '<strong>Don\'t over-rack.</strong> Each racking introduces some oxygen. Three rackings is plenty; six is too many.'
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
      '<strong>Why the difference:</strong> CO₂ off-gassing during primary scrubs aromatics. Adding cinnamon to primary loses 80% of its character — you\'d need 5× the amount.',
      '<strong>Typical durations in secondary:</strong> Cinnamon stick 1-3 days, oak chips 1-2 weeks, oak cubes 3-6 weeks, vanilla bean 1-4 weeks, hop pellets 3-7 days.',
      '<strong>Taste daily.</strong> Over-extraction is hard to reverse. Pull a small sample every day during secondary additions and stop when you like it.',
      '<strong>Use the Additions tab.</strong> Log what you added, when, and when it\'s due for removal. MeadOS will warn you if it\'s overdue.'
    ]
  }
];

// Separate section for app/technical issues (kept small at bottom)
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
