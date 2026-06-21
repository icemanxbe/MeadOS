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

// ==================== INSIGHTS VIEW ====================
// Combines best-tasting batch insights (what your highest-rated batches share)
// with a personal-trend dashboard (year-over-year attenuation, ratings, cost,
// time-to-bottle). Both require enough data to be meaningful — show helpful
// empty-states when there aren't enough batches yet.

function renderInsightsView(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  var failed=APP.batches.filter(function(b){return b.failed;});
  if(bottled.length<3&&!failed.length){
    // Pattern-mining needs more data, but the fun lifetime stats are worth
    // showing from batch one.
    return'<div class="page-title">Insights</div><div class="page-subtitle">Patterns in your brewing</div>'
      +renderFunInsights()
      +'<div class="info-box" style="margin-top:8px"><div style="font-size:13px;color:var(--text2)">📊 Deeper pattern-mining (what your best batches share, trends over time) unlocks at <strong>3 bottled batches</strong> — you\'re at '+bottled.length+'. Keep brewing!</div></div>';
  }
  return'<div class="page-title">Insights</div><div class="page-subtitle">Patterns in your brewing journey · '+bottled.length+' bottled · '+failed.length+' failed</div>'
    +renderFunInsights()
    +renderBestTastingInsights()
    +renderFailedBatchInsights()
    +renderPersonalTrends();
}

// Fun + meaningful lifetime insights mined from the whole brewing history.
function renderFunInsights(){
  var batches=APP.batches||[];
  if(!batches.length)return'';
  var L=(typeof lifetimeStats==='function')?lifetimeStats():null;
  function mode(arr){var c={},best=null,bn=0;arr.forEach(function(v){if(!v)return;c[v]=(c[v]||0)+1;if(c[v]>bn){bn=c[v];best=v;}});return best?{val:best,n:bn}:null;}
  // ---- aggregates ----
  var totalVolume=batches.reduce(function(s,b){return s+(parseFloat(b.volume)||0);},0);
  var totalHoney=batches.reduce(function(s,b){return s+(parseFloat(b.honey)||0);},0);
  var favHoney=mode(batches.map(function(b){return b.honeyType;}));
  var favYeast=mode(batches.map(function(b){var y=getYeastById(b.yeast);return y?y.name.split('—')[0].trim():b.yeast;}));
  var styles={};batches.forEach(function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});var c=(r&&(r.category||r.style))||b.style;if(c)styles[c]=1;});
  var distinctStyles=Object.keys(styles).length;
  // ABV extremes + days-to-bottle from bottled batches
  var abvs=[],ttb=[];
  batches.forEach(function(b){
    var bot=APP.bottling[b.id];if(!bot)return;
    var abv=parseFloat(bot.abv)||(b.og&&bot.fg?parseFloat(calcABV(b.og,bot.fg)):0);
    if(abv>0)abvs.push({abv:abv,name:b.name});
    if(bot.date&&b.startDate){var d=Math.round((new Date(bot.date)-new Date(b.startDate))/86400000);if(d>0&&d<2000)ttb.push(d);}
  });
  abvs.sort(function(a,b){return b.abv-a.abv;});
  var avgTTB=ttb.length?Math.round(ttb.reduce(function(s,x){return s+x;},0)/ttb.length):null;
  // bottles ever + "glasses" (≈5 per 750, ≈3.3 per 500)
  var bottledEver=L?L.bottledEver:0;
  var glasses=Math.round(bottledEver*4.5);
  // bee fun fact: ~1 kg honey ≈ 195,000 km of bee flight; Earth ≈ 40,075 km
  var beeKm=Math.round(totalHoney*195000);
  var earths=totalHoney?(beeKm/40075):0;
  // success rate
  var failedN=batches.filter(function(b){return b.failed;}).length;
  var finishedOrBottled=batches.filter(function(b){return APP.bottling[b.id];}).length;
  var successRate=(finishedOrBottled+failedN)?Math.round(finishedOrBottled/(finishedOrBottled+failedN)*100):null;
  var ccy=APP.settings.currency||'€';
  var totalCost=batches.reduce(function(s,b){return s+((b.cost&&(b.cost.honey||0)+(b.cost.extras||0))||0);},0);

  function tile(icon,val,label,sub){
    return'<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">'
      +'<div style="font-size:20px;line-height:1;margin-bottom:6px">'+icon+'</div>'
      +'<div style="font-family:var(--font-display);font-size:21px;color:var(--gold2);line-height:1.1">'+val+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.2px;margin-top:5px;text-transform:uppercase">'+label+'</div>'
      +(sub?'<div style="font-size:10.5px;color:var(--text3);margin-top:4px;line-height:1.4">'+sub+'</div>':'')
      +'</div>';
  }
  var tiles=[
    tile('🍯',totalVolume.toFixed(0)+' L','Mead Brewed (lifetime)','≈ '+Math.round(totalVolume/0.75)+' × 750 ml made'),
    tile('🍷',bottledEver,'Bottles Bottled','≈ '+glasses+' glasses poured'),
    favHoney?tile('🌼',escHtml(favHoney.val),'Favourite Honey','used in '+favHoney.n+' batch'+(favHoney.n!==1?'es':'')):'',
    favYeast?tile('🧫',escHtml(favYeast.val),'Go-To Yeast','pitched '+favYeast.n+'×'):'',
    abvs.length?tile('🔥',abvs[0].abv.toFixed(1)+'%','Strongest Batch',escHtml(abvs[0].name)):'',
    avgTTB?tile('⏱',avgTTB+' days','Avg Brew → Bottle',null):'',
    tile('🎨',distinctStyles,'Styles Explored',distinctStyles>=6?'a true polymath!':'keep exploring'),
    successRate!=null?tile('🎯',successRate+'%','Success Rate',failedN?failedN+' lost to learn from':'flawless so far'):'',
    totalCost>0?tile('💰',ccy+totalCost.toFixed(0),'Invested in the Craft',bottledEver?'≈ '+ccy+(totalCost/bottledEver).toFixed(2)+'/bottle':null):''
  ].filter(Boolean).join('');

  var beeFact=totalHoney>0
    ? '<div style="margin-top:14px;padding:12px 14px;background:linear-gradient(135deg,rgba(201,168,76,0.10),rgba(201,168,76,0.02));border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text2);line-height:1.6">'
      +'🐝 <strong style="color:var(--gold2)">Bee math:</strong> your '+totalHoney.toFixed(1)+' kg of honey represents roughly <strong>'+beeKm.toLocaleString()+' km</strong> of bee flight — that\'s about <strong>'+earths.toFixed(1)+'×</strong> around the Earth, or '+(earths/9.6).toFixed(1)+'× the distance to the Moon. Tip your hat to the bees.</div>'
    : '';

  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">✨ FUN FACTS &amp; MILESTONES</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+tiles+'</div>'
    +beeFact
    +'</div>';
}

// Failed batch insights: postmortems list + pattern-mining counterpart to
// "what your best batches share". When you have failures, learning from them
// systematically is more valuable than reviewing them ad-hoc.
function renderFailedBatchInsights(){
  var failed=(APP.batches||[]).filter(function(b){return b.failed;});
  if(!failed.length)return''; // no failures = no card. Keeps the view cleaner.
  // Sort newest-first
  failed.sort(function(a,b){return(b.failed.date||'').localeCompare(a.failed.date||'');});
  // Tally categories
  var byCategory={};
  failed.forEach(function(b){
    var c=b.failed.category||'other';
    if(!byCategory[c])byCategory[c]={count:0,batches:[]};
    byCategory[c].count++;
    byCategory[c].batches.push(b);
  });
  var topCategory=Object.keys(byCategory).sort(function(a,b){return byCategory[b].count-byCategory[a].count;})[0];
  // Pattern-match: what common attributes show up across failures
  function tallyMode(arr,getter){
    var counts={};
    arr.forEach(function(x){var v=getter(x);if(v==null||v==='')return;counts[v]=(counts[v]||0)+1;});
    var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
    return entries.length?entries[0]:null;
  }
  var commonHoney=tallyMode(failed,function(b){return b.honeyType;});
  var commonYeast=tallyMode(failed,function(b){return b.yeast;});
  var commonStyle=tallyMode(failed,function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return r&&r.style;});

  // Postmortem cards — most recent 5, newer cards higher
  var postmortems=failed.slice(0,5).map(function(b){
    var f=b.failed;
    var cat=FAILURE_CATEGORIES.find(function(c){return c.id===f.category;})||{label:f.category,icon:'⚰'};
    var color=getBatchColor(b);
    return'<div onclick="showView(\'batch\',\''+b.id+'\')" style="cursor:pointer;background:var(--bg);border-left:3px solid var(--red2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px">'
        +'<div style="display:flex;align-items:baseline;gap:8px"><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(b.name)+'</div>'+(b.serial?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">#'+escHtml(b.serial)+'</div>':'')+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--red2);letter-spacing:1.5px">'+cat.icon+' '+escHtml(cat.label.toUpperCase())+'</div>'
      +'</div>'
      +(f.whatWentWrong?'<div style="font-size:11.5px;color:var(--text2);line-height:1.5;font-style:italic">'+escHtml(f.whatWentWrong.length>180?f.whatWentWrong.slice(0,180)+'…':f.whatWentWrong)+'</div>':'')
      +(f.whatToTryNext?'<div style="font-size:11px;color:var(--gold2);line-height:1.5;margin-top:6px;border-top:1px dotted var(--border);padding-top:5px"><strong style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;text-transform:uppercase">→</strong> '+escHtml(f.whatToTryNext.length>140?f.whatToTryNext.slice(0,140)+'…':f.whatToTryNext)+'</div>':'')
      +'</div>';
  }).join('');

  var patternRows=[];
  if(failed.length>=2){
    if(commonHoney&&commonHoney[1]>=2)patternRows.push({k:'Most common honey',v:commonHoney[0],detail:'in '+commonHoney[1]+' of '+failed.length+' failures'});
    if(commonYeast&&commonYeast[1]>=2)patternRows.push({k:'Most common yeast',v:commonYeast[0],detail:'in '+commonYeast[1]+' of '+failed.length+' failures'});
    if(commonStyle&&commonStyle[1]>=2)patternRows.push({k:'Most common style',v:commonStyle[0],detail:'in '+commonStyle[1]+' of '+failed.length+' failures'});
    if(topCategory&&byCategory[topCategory].count>=2){
      var topCatLabel=(FAILURE_CATEGORIES.find(function(c){return c.id===topCategory;})||{label:topCategory}).label;
      patternRows.push({k:'Most common failure',v:topCatLabel,detail:byCategory[topCategory].count+' of '+failed.length+' failures'});
    }
  }
  var patternBlock=patternRows.length?'<div style="background:var(--bg);border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;border-left:3px solid var(--gold)">'
    +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--gold);letter-spacing:1.5px;margin-bottom:6px">⚠ PATTERNS WORTH NOTING</div>'
    +patternRows.map(function(r){return'<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><div style="color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1px">'+escHtml(r.k.toUpperCase())+'</div><div style="text-align:right"><span style="color:var(--gold2);font-family:var(--font-display);font-size:13px">'+escHtml(r.v)+'</span> <span style="color:var(--text3);font-size:10.5px;font-style:italic">'+escHtml(r.detail)+'</span></div></div>';}).join('')
    +'</div>':'';

  var totalBatches=(APP.batches||[]).length;
  var failureRate=totalBatches?(failed.length/totalBatches*100).toFixed(0):0;

  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--red2)"><div class="card-header"><div class="card-title">⚰ POSTMORTEMS</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+failed.length+' FAILED · '+failureRate+'% OF '+totalBatches+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Lessons preserved. The postmortems your past-self wrote so future-you doesn\'t repeat the same mistake. Failure rate stays low when you actually learn from these.</div>'
    +patternBlock
    +postmortems
    +(failed.length>5?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;text-align:center;margin-top:8px">Showing 5 most recent · '+(failed.length-5)+' more in batch list</div>':'')
    +'</div>';
}

// Best-tasting insights: find the common threads across your highest-rated
// batches. Pulls all batches with at least one 4-5 star tasting, then
// computes mode/median for each interesting attribute.
function renderBestTastingInsights(){
  // Build per-batch summary including best tasting rating
  var batchSummaries=APP.batches.filter(function(b){return APP.bottling[b.id];}).map(function(b){
    var tastings=(APP.tastings[b.id]||[]).filter(function(t){return t.rating;});
    var bestRating=tastings.length?Math.max.apply(null,tastings.map(function(t){return t.rating;})):0;
    var bot=APP.bottling[b.id];
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    return{
      batch:b,
      rating:bestRating,
      honeyType:b.honeyType,
      yeast:b.yeast,
      og:b.og,
      style:(recipe&&recipe.style)||b.style,
      abv:bot.abv,
      daysToBottle:b.startDate&&bot.date?Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000):null
    };
  });
  var topRated=batchSummaries.filter(function(s){return s.rating>=4;});
  if(topRated.length<2){
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🌟 BEST-TASTING INSIGHTS</div></div>'
      +'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:14px 0">Need at least 2 batches with a 4-star or higher tasting to find patterns. You have '+topRated.length+'.</div>'
      +'</div>';
  }
  // Tally common attributes
  function tallyMode(arr,getter){
    var counts={};
    arr.forEach(function(x){
      var v=getter(x);
      if(v==null||v==='')return;
      counts[v]=(counts[v]||0)+1;
    });
    var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
    return entries.length?entries[0]:null;
  }
  function median(arr,getter){
    var vals=arr.map(getter).filter(function(v){return v!=null&&!isNaN(v);}).sort(function(a,b){return a-b;});
    if(!vals.length)return null;
    var mid=Math.floor(vals.length/2);
    return vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
  }
  var commonHoney=tallyMode(topRated,function(s){return s.honeyType;});
  var commonStyle=tallyMode(topRated,function(s){return s.style;});
  var commonYeast=tallyMode(topRated,function(s){return s.yeast;});
  var medianABV=median(topRated,function(s){return parseFloat(s.abv);});
  var medianDays=median(topRated,function(s){return s.daysToBottle;});
  var medianOG=median(topRated,function(s){return parseFloat(s.og);});

  function row(label,value,detail){
    if(!value)return'';
    return'<div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1px">'+escHtml(label.toUpperCase())+'</div><div style="text-align:right"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(String(value))+'</div>'+(detail?'<div style="font-size:10.5px;color:var(--text3);font-style:italic;margin-top:2px">'+escHtml(detail)+'</div>':'')+'</div></div>';
  }
  var rows=[
    commonHoney?row('Most common honey',commonHoney[0],'in '+commonHoney[1]+' of '+topRated.length+' top-rated batches'):'',
    commonStyle?row('Most common style',commonStyle[0],'in '+commonStyle[1]+' of '+topRated.length+' top-rated batches'):'',
    commonYeast?row('Most common yeast',commonYeast[0],'in '+commonYeast[1]+' of '+topRated.length+' top-rated batches'):'',
    medianABV!=null?row('Median ABV',medianABV.toFixed(1)+'%',null):'',
    medianOG!=null?row('Median OG',medianOG.toFixed(3),null):'',
    medianDays!=null?row('Median days to bottle',Math.round(medianDays)+' days',null):''
  ].filter(Boolean).join('');
  // List the actual batches
  topRated.sort(function(a,b){return b.rating-a.rating;});
  var batchList=topRated.slice(0,5).map(function(s){
    var stars='★'.repeat(s.rating)+'<span style="color:var(--bg4)">'+'★'.repeat(5-s.rating)+'</span>';
    return'<div onclick="showView(\'batch\',\''+s.batch.id+'\')" style="cursor:pointer;padding:8px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(s.batch)+';border-radius:var(--radius);margin-bottom:4px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(s.batch)+'">'+escHtml(s.batch.name)+'</div><div>'+stars+'</div></div></div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold2)"><div class="card-header"><div class="card-title">🌟 WHAT YOUR BEST BATCHES SHARE</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+topRated.length+' BATCHES · 4★ AND ABOVE</div></div>'
    +rows
    +(batchList?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold);letter-spacing:1.5px;margin:14px 0 6px">— TOP RATED —</div>'+batchList:'')
    +'</div>';
}

// Personal trend dashboard — year-over-year stats. Useful starting at year 2.
function renderPersonalTrends(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  // Group by start-year
  var byYear={};
  bottled.forEach(function(b){
    var year=new Date(b.startDate).getFullYear();
    if(isNaN(year))return;
    if(!byYear[year])byYear[year]={year:year,batches:[]};
    byYear[year].batches.push(b);
  });
  var years=Object.keys(byYear).map(Number).sort();
  if(years.length<2){
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📈 YEAR-OVER-YEAR TRENDS</div></div>'
      +'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:14px 0">Need at least 2 brewing years to compute trends. You\'re in year '+years.length+'.</div>'
      +'</div>';
  }
  // Per-year aggregates
  years.forEach(function(y){
    var data=byYear[y];
    var ratings=[],attenuations=[],times=[],costPerBottle=[];
    data.batches.forEach(function(b){
      var bot=APP.bottling[b.id];
      var ts=(APP.tastings[b.id]||[]).filter(function(t){return t.rating;});
      if(ts.length){
        ratings.push(ts.reduce(function(s,t){return s+t.rating;},0)/ts.length);
      }
      if(b.og&&bot.fg){
        attenuations.push((b.og-bot.fg)/(b.og-1)*100);
      }
      if(b.startDate&&bot.date){
        times.push(Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000));
      }
      if(b.cost){
        var total=(b.cost.honey||0)+(b.cost.extras||0);
        var bottles=bottlesOriginal(bot);
        if(total>0&&bottles>0)costPerBottle.push(total/bottles);
      }
    });
    function avg(arr){return arr.length?arr.reduce(function(s,v){return s+v;},0)/arr.length:null;}
    data.batchCount=data.batches.length;
    data.avgRating=avg(ratings);
    data.avgAttenuation=avg(attenuations);
    data.avgDaysToBottle=avg(times);
    data.avgCostPerBottle=avg(costPerBottle);
  });
  var ccy=APP.settings.currency||'€';

  function renderYearColumn(y,prevY){
    var d=byYear[y];
    var prev=prevY?byYear[prevY]:null;
    function deltaPill(curr,prev,fmt,higherIsBetter){
      if(curr==null||prev==null)return'';
      var diff=curr-prev;
      if(Math.abs(diff)<0.001)return'';
      var isGood=higherIsBetter?(diff>0):(diff<0);
      var color=isGood?'var(--green2)':'var(--red2)';
      return'<span style="font-family:var(--font-mono);font-size:9.5px;color:'+color+';margin-left:6px;letter-spacing:0.5px">'+(diff>=0?'▲':'▼')+' '+fmt(Math.abs(diff))+'</span>';
    }
    return'<div style="background:var(--bg);border-radius:var(--radius);padding:14px;flex:1;min-width:0">'
      +'<div style="font-family:var(--font-display);font-size:24px;color:var(--gold2);margin-bottom:14px">'+y+'</div>'
      +'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">BATCHES BREWED</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.batchCount+(prev?deltaPill(d.batchCount,prev.batchCount,function(v){return Math.round(v);},true):'')+'</div></div>'
      +(d.avgRating!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG TASTING RATING</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.avgRating.toFixed(2)+'★'+(prev&&prev.avgRating!=null?deltaPill(d.avgRating,prev.avgRating,function(v){return v.toFixed(2);},true):'')+'</div></div>':'')
      +(d.avgAttenuation!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG ATTENUATION</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+d.avgAttenuation.toFixed(0)+'%'+(prev&&prev.avgAttenuation!=null?deltaPill(d.avgAttenuation,prev.avgAttenuation,function(v){return v.toFixed(0)+'%';},true):'')+'</div></div>':'')
      +(d.avgDaysToBottle!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG DAYS TO BOTTLE</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+Math.round(d.avgDaysToBottle)+'d'+(prev&&prev.avgDaysToBottle!=null?deltaPill(d.avgDaysToBottle,prev.avgDaysToBottle,function(v){return Math.round(v)+'d';},false):'')+'</div></div>':'')
      +(d.avgCostPerBottle!=null?'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">AVG COST / BOTTLE</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+ccy+d.avgCostPerBottle.toFixed(2)+(prev&&prev.avgCostPerBottle!=null?deltaPill(d.avgCostPerBottle,prev.avgCostPerBottle,function(v){return ccy+v.toFixed(2);},false):'')+'</div></div>':'')
      +'</div>';
  }
  // Show last 4 years
  var displayYears=years.slice(-4);
  var cols=displayYears.map(function(y,idx){
    var prev=idx>0?displayYears[idx-1]:null;
    return renderYearColumn(y,prev);
  }).join('');
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📈 YEAR-OVER-YEAR TRENDS</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Arrows show change from the previous year. Green = improving (higher ratings, faster attenuation, lower cost), red = regressing.</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap">'+cols+'</div>'
    +'</div>';
}

// ==================== OFF-FLAVOR DIAGNOSTIC WIZARD ====================
// Interactive backwards-from-symptom troubleshooter. Pick the flavors you
// taste, get the likely causes ranked by overlap, with concrete fix steps.
// Data shape: each off-flavor maps to one or more causes, and each cause
// has steps to remediate or prevent. The UI tallies cause-matches across
// selected flavors and surfaces the top hits.

var OFF_FLAVOR_DB={
  'Rotten egg / sulphur':{
    icon:'🥚',
    causes:[{
      cause:'Stressed yeast / nitrogen deficiency',
      severity:'high',
      fix:['Stir vigorously to degas the H₂S','Add a half-dose of nutrient immediately','Warm to 22-24°C if currently cool','Time often heals — most sulphur dissipates by bottling']
    }]
  },
  'Band-aid / medicinal':{
    icon:'🩹',
    causes:[{
      cause:'Wild yeast or bacterial contamination (4-VG / phenolic)',
      severity:'high',
      fix:['Likely Brettanomyces or wild bacteria','Cannot be removed — accept or discard','Re-evaluate sanitation: sanitizer contact time and coverage','Replace porous gear (siphon tubing, plastic wand) — biofilm sticks']
    }]
  },
  'Vinegar / sharp acidic':{
    icon:'🍶',
    causes:[{
      cause:'Acetobacter contamination (oxygen exposure)',
      severity:'high',
      fix:['Limit oxygen contact: top up vessel, use airlock','Discard if strongly acetic — unrecoverable','Sanitize all vessels and gear with your no-rinse sanitizer','For prevention: fill bulk-aging vessels to >95%']
    }]
  },
  'Cardboard / wet paper / sherry':{
    icon:'📦',
    causes:[{
      cause:'Oxidation',
      severity:'medium',
      fix:['Add 0.5g/L potassium metabisulfite to bind oxygen','Rack with minimal splashing under the surface','For aging: keep headspace <3% in bulk vessels','Some "sherry" notes are stylistic in sack meads — context matters']
    }]
  },
  'Hot / solvent / nail polish':{
    icon:'🔥',
    causes:[{
      cause:'Fusel alcohols from high-temp fermentation',
      severity:'medium',
      fix:['Age 3-6 more months — fusels mellow significantly with time','Future batches: ferment 16-22°C, never above 26°C','Pitch enough yeast and stagger nutrients to reduce stress']
    }]
  },
  'Soapy / floral perfumed':{
    icon:'🧼',
    causes:[{
      cause:'Yeast autolysis (dead yeast cells released oils)',
      severity:'medium',
      fix:['Rack off the lees promptly after primary','Don\'t leave on gross lees longer than 3-4 weeks at warm temps','Future: cold-crash before racking to firm up sediment']
    },{
      cause:'Lavender or floral additions over-extracted',
      severity:'low',
      fix:['Reduce lavender to ≤8g per 5L next time, or use shorter contact time','Soap quality fades with 6-12 months of aging','Some character is style-appropriate for floral meads']
    }]
  },
  'Buttery / butterscotch':{
    icon:'🧈',
    causes:[{
      cause:'Diacetyl from incomplete fermentation',
      severity:'medium',
      fix:['Warm to 22-24°C and hold 7-14 days — yeast will reabsorb diacetyl','Don\'t rush bottling — let yeast clean up','Future: ensure adequate yeast pitch and nutrient']
    }]
  },
  'Yeasty / bready':{
    icon:'🍞',
    causes:[{
      cause:'Suspended yeast in young mead',
      severity:'low',
      fix:['Age longer — usually clears with 2-3 more months','Cold-crash 2 weeks at 2-4°C drops most yeast','Bentonite or gelatin fining for stubborn cases']
    }]
  },
  'Sourness / acetone':{
    icon:'🌬',
    causes:[{
      cause:'Lactobacillus or wild bacterial fermentation',
      severity:'high',
      fix:['Some sourness is style-appropriate (e.g. Pyment)','True acetone smell = unrecoverable, discard','Improve sanitation for future batches','Check tap water quality / source — chloramine inhibits but doesn\'t kill all bacteria']
    }]
  },
  'Astringent / mouth-drying':{
    icon:'🌿',
    causes:[{
      cause:'Over-extraction of tannins from fruit, herbs, or oak',
      severity:'low',
      fix:['Age 6+ months — astringency mellows','Future: shorter contact times, gentler fruit handling (no pulverizing)','For oak: reduce cube/chip contact by half']
    }]
  },
  'Sweet / cloying when expected dry':{
    icon:'🍯',
    causes:[{
      cause:'Stuck fermentation',
      severity:'medium',
      fix:['Check current SG against target','Add fresh nutrient and warm to 22-24°C','If still stuck, repitch with EC-1118 (alcohol-tolerant rescue strain)','Sometimes residual sweetness is fine — taste before "fixing"']
    }]
  },
  'Cooked / caramelized when not intended':{
    icon:'🍮',
    causes:[{
      cause:'Honey overheated during preparation',
      severity:'low',
      fix:['Future: never heat honey above 40°C','Maillard browning can be desirable in bochets — undesirable otherwise','Age to integrate flavor; some character will remain']
    }]
  }
};

function openOffFlavorWizard(){
  window._offFlavorSelections={};
  renderOffFlavorWizard();
}

function toggleOffFlavorSelection(flavor){
  if(!window._offFlavorSelections)window._offFlavorSelections={};
  if(window._offFlavorSelections[flavor])delete window._offFlavorSelections[flavor];
  else window._offFlavorSelections[flavor]=true;
  renderOffFlavorWizard();
}

function renderOffFlavorWizard(){
  closeModal();
  var sel=window._offFlavorSelections||{};
  var selectedFlavors=Object.keys(sel);
  // Build chips
  var chips=Object.keys(OFF_FLAVOR_DB).map(function(name){
    var isSel=!!sel[name];
    var entry=OFF_FLAVOR_DB[name];
    return'<span class="filter-chip '+(isSel?'active':'')+'" onclick="toggleOffFlavorSelection(\''+name.replace(/'/g,"\\'")+'\')" style="cursor:pointer;'+(isSel?'background:rgba(232,196,106,0.2);border-color:var(--gold);color:var(--gold2)':'')+'">'+entry.icon+' '+escHtml(name)+'</span>';
  }).join('');

  // Tally causes across selected flavors
  var causeMap={};
  selectedFlavors.forEach(function(f){
    var entry=OFF_FLAVOR_DB[f];
    if(!entry)return;
    entry.causes.forEach(function(c){
      if(!causeMap[c.cause])causeMap[c.cause]={cause:c.cause,severity:c.severity,fix:c.fix,flavors:[],hits:0};
      causeMap[c.cause].flavors.push(f);
      causeMap[c.cause].hits++;
    });
  });
  var causes=Object.values(causeMap).sort(function(a,b){return b.hits-a.hits;});
  var diagnosis;
  if(!selectedFlavors.length){
    diagnosis='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Select one or more off-flavors above to get likely causes and remediation steps.</div>';
  }else{
    diagnosis=causes.map(function(c){
      var sevColor=c.severity==='high'?'var(--red)':c.severity==='medium'?'var(--gold)':'var(--text3)';
      var sevLabel=c.severity==='high'?'LIKELY':c.severity==='medium'?'POSSIBLE':'SECONDARY';
      var multiHit=c.hits>1?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);margin-left:8px">'+c.hits+' flavor matches</span>':'';
      return'<div style="background:var(--bg);border-left:3px solid '+sevColor+';border-radius:var(--radius);padding:14px;margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><div style="font-family:var(--font-display);font-size:14px;color:var(--text)">'+escHtml(c.cause)+multiHit+'</div><div style="font-family:var(--font-mono);font-size:10px;color:'+sevColor+';letter-spacing:1.5px">'+sevLabel+'</div></div>'
        +'<ol style="padding-left:22px;margin:0;font-size:12.5px;color:var(--text2);line-height:1.6">'
        +c.fix.map(function(s){return'<li>'+escHtml(s)+'</li>';}).join('')
        +'</ol>'
        +'</div>';
    }).join('');
  }

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:780px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🧭 OFF-FLAVOR DIAGNOSTIC WIZARD</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick the flavors and aromas you\'re detecting in your batch. Multiple selections combine — common causes float to the top.</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">'+chips+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+diagnosis+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// Open a troubleshooting topic's step-by-step guidance in a detail modal.
// Topics live across two arrays (brewing + app/sync); search both by id.
function openTroubleshootTopic(id){
  var all=((typeof TROUBLESHOOT_TOPICS!=='undefined'&&TROUBLESHOOT_TOPICS)||[])
    .concat((typeof APP_TROUBLESHOOT_TOPICS!=='undefined'&&APP_TROUBLESHOOT_TOPICS)||[]);
  var t=all.find(function(x){return x.id===id;});
  if(!t)return;
  closeModal();
  var stepsHtml=t.steps.map(function(s){return'<li style="margin-bottom:10px;line-height:1.55">'+s+'</li>';}).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:600px">'
    +'<div class="modal-title">'+t.icon+' '+escHtml(t.title)+'</div>'
    +(t.category?'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin:-12px 0 14px">'+escHtml(t.category)+'</div>':'')
    +'<ol style="padding-left:22px;margin:0;font-size:13.5px;color:var(--text2)">'+stepsHtml+'</ol>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function renderTroubleshoot(){
  // Group by category — each category becomes a large card, with its topics as
  // button-cards inside that open the step-by-step detail modal.
  var categories={};
  TROUBLESHOOT_TOPICS.forEach(function(t){
    var cat=t.category||'Other';
    if(!categories[cat])categories[cat]=[];
    categories[cat].push(t);
  });
  var CAT_ICONS={Fermentation:'🫧',Temperature:'🌡',"Off-Flavors":'👃',Clarity:'💧',Process:'🔧',Bottling:'🍾',Aging:'⏳',Sanitation:'🧼',Result:'🏁',Other:'🔧'};
  // Teaser from the first step, HTML stripped — mirrors the Mead Guide cards.
  function tsTeaser(t){
    var first=String((t.steps&&t.steps[0])||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    return first.slice(0,104);
  }
  // Same tile as the Mead Guide topic cards (icon + title + teaser + footer link).
  function topicCard(t){
    return'<div class="card" style="cursor:pointer;margin:0" onclick="openTroubleshootTopic(\''+t.id+'\')">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:20px">'+t.icon+'</span><div class="card-title" style="font-size:12.5px">'+escHtml(t.title.toUpperCase())+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);line-height:1.5">'+escHtml(tsTeaser(t))+'…</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1px;margin-top:10px">'+t.steps.length+' STEP'+(t.steps.length===1?'':'S')+' →</div>'
    +'</div>';
  }
  function catSection(cat,items,icon){
    return'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:22px 0 12px">'+(icon||CAT_ICONS[cat]||'🔧')+' '+escHtml(cat.toUpperCase())+' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">· '+items.length+' topic'+(items.length===1?'':'s')+'</span></div>'
      +'<div class="grid-3">'+items.map(topicCard).join('')+'</div>';
  }
  var categoryOrder=['Fermentation','Temperature','Off-Flavors','Clarity','Process','Bottling','Aging','Sanitation','Result'];
  var seen={};
  var brewingHtml=categoryOrder.map(function(cat){if(!categories[cat])return'';seen[cat]=1;return catSection(cat,categories[cat]);}).join('');
  // any categories not in the explicit order land at the end
  brewingHtml+=Object.keys(categories).filter(function(c){return!seen[c];}).map(function(c){return catSection(c,categories[c]);}).join('');
  var appCard=catSection('App & Sync Issues',APP_TROUBLESHOOT_TOPICS,'🖥');
  return'<div class="page-title">Troubleshooting</div><div class="page-subtitle">Brewing problems and process guidance</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn btn-primary" onclick="openOffFlavorWizard()">🧭 Off-flavor diagnostic wizard</button></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:16px;font-style:italic">Pick a category, then tap a topic for step-by-step guidance — or use the diagnostic wizard above to work backward from observed flavors.</div>'
    +brewingHtml
    +appCard;
}

// ==================== TASTING EVOLUTION CHART ====================
// Overlays multiple tasting wheels for the same batch on a single radar,
// color-coded by date so you can see how the flavor profile evolved.
function renderTastingEvolution(tastings){
  if(!tastings||tastings.length<2)return'';
  var withWheels=tastings.filter(function(t){
    return t.wheel&&Object.values(t.wheel).some(function(v){return v>0;});
  });
  if(withWheels.length<2)return'';
  // Sort oldest → newest
  withWheels.sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  // Color palette — gray (oldest) → gold (newest)
  function colorFor(idx,total){
    var t=total===1?0:idx/(total-1);
    // gray rgb(120,120,120) → gold rgb(232,196,106)
    var r=Math.round(120+(232-120)*t);
    var g=Math.round(120+(196-120)*t);
    var b=Math.round(120+(106-120)*t);
    return'rgb('+r+','+g+','+b+')';
  }
  var size=320,cx=size/2,cy=size/2,r=size/2-40,n=TASTING_AXES.length;
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var d=r*(level/5);
      return(cx+Math.cos(angle)*d)+','+(cy+Math.sin(angle)*d);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="none" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Axis lines
  var axes=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var ex=cx+Math.cos(angle)*r;
    var ey=cy+Math.sin(angle)*r;
    return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex+'" y2="'+ey+'" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Axis labels
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+22);
    var ly=cy+Math.sin(angle)*(r+22)+4;
    return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="text-transform:uppercase;letter-spacing:1px">'+ax.label+'</text>';
  }).join('');
  // One polygon per tasting
  var polygons=withWheels.map(function(t,idx){
    var color=colorFor(idx,withWheels.length);
    var pts=TASTING_AXES.map(function(ax,i){
      var v=(t.wheel&&t.wheel[ax.key])||0;
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var d=r*(v/5);
      return(cx+Math.cos(angle)*d)+','+(cy+Math.sin(angle)*d);
    }).join(' ');
    var isLatest=idx===withWheels.length-1;
    return'<polygon points="'+pts+'" fill="'+color+(isLatest?'40':'15')+'" stroke="'+color+'" stroke-width="'+(isLatest?2:1)+'" stroke-dasharray="'+(isLatest?'':'3,2')+'"/>';
  }).join('');
  // Legend
  var legend=withWheels.map(function(t,idx){
    var color=colorFor(idx,withWheels.length);
    var isLatest=idx===withWheels.length-1;
    return'<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;color:'+(isLatest?'var(--gold2)':'var(--text3)')+';font-family:var(--font-mono)">'
      +'<span style="display:inline-block;width:18px;height:3px;background:'+color+';border-radius:2px"></span>'
      +'<span>'+fmtDate(t.date)+(isLatest?' · LATEST':'')+'</span>'
      +'<span style="margin-left:auto;color:var(--text3)">'+'★'.repeat(t.rating||0)+'</span>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🌀 TASTING EVOLUTION · '+withWheels.length+' notes</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center;flex-wrap:wrap">'
    +'<div><svg viewBox="-40 -10 400 340" overflow="visible" style="width:100%;display:block;overflow:visible" preserveAspectRatio="xMidYMid meet">'+rings+axes+polygons+labels+'</svg></div>'
    +'<div>'+legend+'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">Faded outlines = earlier tastings. The solid gold polygon is the most recent. Notice which axes grew (more developed) and which mellowed (less pronounced) — that\'s your aging signature.</div></div>'
    +'</div></div>';
}

// ==================== TASTING SIDE-BY-SIDE COMPARISON ====================
// Pick 2-3 tastings of the same batch and see them rendered next to each other
// with all fields visible at once (rating, color, aroma, flavor, finish,
// wheel deltas, notes). Useful for tracking how a batch evolves with age.
//
// State lives on window._tastingCompare = { batchId, selectedIds: [] }.

function openTastingCompareModal(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var tastings=APP.tastings[batchId]||[];
  if(tastings.length<2){toast('⚠ Need at least 2 tastings to compare');return;}
  // Default selection: most recent + oldest (good starter comparison).
  var sorted=tastings.slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  window._tastingCompare={
    batchId:batchId,
    selectedIds:[sorted[0].id,sorted[sorted.length-1].id]
  };
  renderTastingCompareModal();
}

function renderTastingCompareModal(){
  closeModal();
  var s=window._tastingCompare;
  if(!s)return;
  var b=APP.batches.find(function(x){return x.id===s.batchId;});
  if(!b)return;
  var tastings=(APP.tastings[s.batchId]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});

  // Selector row — chip per tasting. Selected ones highlighted.
  var maxSelect=3;
  var chips=tastings.map(function(t){
    var sel=s.selectedIds.indexOf(t.id)!==-1;
    var label=fmtDate(t.date)+(t.rating?' · '+'★'.repeat(t.rating):'');
    return'<span class="filter-chip '+(sel?'active':'')+'" style="cursor:pointer;'+(sel?'background:rgba(232,196,106,0.2);border-color:var(--gold);color:var(--gold2)':'')+'" onclick="toggleTastingCompare(\''+t.id+'\')">'+escHtml(label)+'</span>';
  }).join('');

  var selected=tastings.filter(function(t){return s.selectedIds.indexOf(t.id)!==-1;});
  var body='';
  if(selected.length<2){
    body='<div style="padding:24px;text-align:center;color:var(--text3);font-style:italic">Pick at least 2 tastings above to compare them side by side. You can compare up to '+maxSelect+'.</div>';
  }else{
    // Column-per-tasting layout. Wheels overlaid in a combined radar.
    var cols=selected.map(function(t,idx){
      var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
      var fields=[
        ['Rating',t.rating?'★'.repeat(t.rating)+'☆'.repeat(5-t.rating):'—'],
        ['Color',t.color||'—'],
        ['Aroma',t.aroma||'—'],
        ['Flavor',t.flavor||'—'],
        ['Finish',t.finish||'—'],
        ['Notes',t.note||t.notes||'—']
      ];
      return'<div style="background:var(--bg);border-radius:var(--radius);border-top:3px solid '+color+';padding:14px;flex:1;min-width:0">'
        +'<div style="font-family:var(--font-display);font-size:13px;color:'+color+';margin-bottom:4px">'+fmtDate(t.date)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:14px">DAY '+(typeof bottleDaysAged==='function'?(daysSince(t.date)+' since '+fmtDate(b.startDate)):'')+'</div>'
        +fields.map(function(f){
          return'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">'+f[0].toUpperCase()+'</div><div style="font-size:13px;color:var(--text);line-height:1.5">'+escHtml(f[1])+'</div></div>';
        }).join('')
        +'</div>';
    }).join('');

    // Overlaid radar across the selected tastings — reuses TASTING_AXES.
    var wheelOverlay='';
    if(typeof TASTING_AXES!=='undefined'){
      var withWheels=selected.filter(function(t){return t.wheel&&Object.values(t.wheel).some(function(v){return v>0;});});
      if(withWheels.length>=2){
        var size=320,cx=size/2,cy=size/2,r=size/2-40,n=TASTING_AXES.length;
        var rings=[1,2,3,4,5].map(function(level){
          var pts=TASTING_AXES.map(function(ax,i){
            var ang=(Math.PI*2*i/n)-Math.PI/2;
            var d=r*(level/5);
            return(cx+Math.cos(ang)*d)+','+(cy+Math.sin(ang)*d);
          }).join(' ');
          return'<polygon points="'+pts+'" fill="none" stroke="#2a2a35" stroke-width="0.5"/>';
        }).join('');
        var axes=TASTING_AXES.map(function(ax,i){
          var ang=(Math.PI*2*i/n)-Math.PI/2;
          var ex=cx+Math.cos(ang)*r;
          var ey=cy+Math.sin(ang)*r;
          return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex+'" y2="'+ey+'" stroke="#2a2a35" stroke-width="0.5"/>';
        }).join('');
        var labels=TASTING_AXES.map(function(ax,i){
          var ang=(Math.PI*2*i/n)-Math.PI/2;
          var lx=cx+Math.cos(ang)*(r+22);
          var ly=cy+Math.sin(ang)*(r+22)+4;
          return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="letter-spacing:1px">'+ax.label+'</text>';
        }).join('');
        var polys=withWheels.map(function(t,idx){
          var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
          var pts=TASTING_AXES.map(function(ax,i){
            var v=(t.wheel&&t.wheel[ax.key])||0;
            var ang=(Math.PI*2*i/n)-Math.PI/2;
            var d=r*(v/5);
            return(cx+Math.cos(ang)*d)+','+(cy+Math.sin(ang)*d);
          }).join(' ');
          return'<polygon points="'+pts+'" fill="'+color+'30" stroke="'+color+'" stroke-width="1.5"/>';
        }).join('');
        var legend=withWheels.map(function(t,idx){
          var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
          return'<div style="display:flex;align-items:center;gap:8px;font-size:11px;font-family:var(--font-mono);color:var(--text2)"><span style="display:inline-block;width:16px;height:3px;background:'+color+';border-radius:2px"></span>'+fmtDate(t.date)+'</div>';
        }).join('');
        wheelOverlay='<div style="margin-top:20px;padding:14px;background:var(--bg);border-radius:var(--radius)">'
          +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:12px">TASTING WHEEL OVERLAY</div>'
          +'<div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center">'
          +'<svg viewBox="-40 -10 400 340" style="width:100%;display:block;overflow:visible">'+rings+axes+polys+labels+'</svg>'
          +'<div style="display:flex;flex-direction:column;gap:8px">'+legend+'</div>'
          +'</div></div>';
      }
    }

    body='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">'+cols+'</div>'+wheelOverlay;
  }

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:980px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📊 COMPARE TASTINGS · '+escHtml(b.name)+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px;line-height:1.55">Pick 2-3 tastings to view side by side. The radar overlay below combines tasting-wheel scores for batches that have them.</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">'+chips+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+body+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function toggleTastingCompare(tastingId){
  var s=window._tastingCompare;
  if(!s)return;
  var idx=s.selectedIds.indexOf(tastingId);
  if(idx>=0){
    s.selectedIds.splice(idx,1);
  }else{
    if(s.selectedIds.length>=3){
      // Cycle: drop the oldest to make room for the new one.
      s.selectedIds.shift();
    }
    s.selectedIds.push(tastingId);
  }
  renderTastingCompareModal();
}

// ==================== PERSONAL RECORDS / MEADWRIGHT ACHIEVEMENTS ====================
function computePersonalRecords(){
  var records={
    highestABV:null,
    strongestAttenuation:null,
    longestAged:null,
    biggestYear:null,
    mostBottlesInBatch:null,
    totalBatchesLifetime:APP.batches.length,
    totalBottlesLifetime:0,
    bottlesDrunkLifetime:0,
    bottlesGiftedLifetime:0,
    oldestActiveBatch:null,
    distinctRecipes:0,
    highestRatedBatch:null
  };
  var recipesSeen={};
  // Track year batch counts
  var byYear={};
  APP.batches.forEach(function(b){
    recipesSeen[b.recipeId]=true;
    var y=new Date(b.startDate).getFullYear();
    byYear[y]=(byYear[y]||0)+1;
    var bot=APP.bottling[b.id];
    if(bot){
      var orig=bottlesOriginal(bot);
      records.totalBottlesLifetime+=orig;
      records.bottlesGiftedLifetime+=bottlesInLocation(bot,'gifted');
      records.bottlesDrunkLifetime+=orig-totalBottles(bot);
      // Highest ABV
      if(bot.abv&&(!records.highestABV||bot.abv>records.highestABV.value)){
        records.highestABV={value:bot.abv,batch:b};
      }
      // Strongest attenuation
      if(b.og&&bot.fg){
        var att=((b.og-bot.fg)/(b.og-1))*100;
        if(!records.strongestAttenuation||att>records.strongestAttenuation.value){
          records.strongestAttenuation={value:att,batch:b};
        }
      }
      // Most bottles in a batch
      if(!records.mostBottlesInBatch||orig>records.mostBottlesInBatch.value){
        records.mostBottlesInBatch={value:orig,batch:b};
      }
      // Longest aged — bottling date vs today (and still has bottles on-hand, i.e., aging)
      if(bottlesOnHand(bot)>0){
        var aged=Math.floor((Date.now()-new Date(bot.date).getTime())/86400000);
        if(!records.longestAged||aged>records.longestAged.value){
          records.longestAged={value:aged,batch:b};
        }
      }
    }else{
      // Oldest active batch (started but not bottled)
      var ageDays=daysSince(b.startDate);
      if(!records.oldestActiveBatch||ageDays>records.oldestActiveBatch.value){
        records.oldestActiveBatch={value:ageDays,batch:b};
      }
    }
    // Highest-rated tasting on this batch
    var tastings=APP.tastings[b.id]||[];
    tastings.forEach(function(t){
      if(t.rating&&(!records.highestRatedBatch||t.rating>records.highestRatedBatch.value||(t.rating===records.highestRatedBatch.value&&new Date(t.date)>new Date(records.highestRatedBatch.tasting.date)))){
        records.highestRatedBatch={value:t.rating,batch:b,tasting:t};
      }
    });
  });
  // Biggest year
  var maxY=0,maxYr=null;
  Object.keys(byYear).forEach(function(y){
    if(byYear[y]>maxY){maxY=byYear[y];maxYr=y;}
  });
  if(maxYr)records.biggestYear={value:maxY,year:maxYr};
  records.distinctRecipes=Object.keys(recipesSeen).length;
  return records;
}

function renderPersonalRecords(){
  var r=computePersonalRecords();
  function tile(icon,label,value,detail){
    return'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center">'
      +'<div style="font-size:24px;line-height:1">'+icon+'</div>'
      +'<div style="font-family:var(--font-display);font-size:24px;color:var(--gold2);margin:4px 0">'+(value||'—')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">'+label+'</div>'
      +(detail?'<div style="font-size:11px;color:var(--text2);margin-top:4px;font-style:italic;line-height:1.3">'+detail+'</div>':'')
      +'</div>';
  }
  return'<div class="card" style="margin-top:16px;border-color:var(--gold)"><div class="card-header"><div class="card-title">🏆 MEADWRIGHT RECORDS · ALL-TIME</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">'
    +tile('🔥','Highest ABV',r.highestABV?r.highestABV.value.toFixed(1)+'%':'—',r.highestABV?escHtml(r.highestABV.batch.name):'')
    +tile('💪','Best Attenuation',r.strongestAttenuation?r.strongestAttenuation.value.toFixed(1)+'%':'—',r.strongestAttenuation?escHtml(r.strongestAttenuation.batch.name):'')
    +tile('⌛','Longest Aged',r.longestAged?fmtDaysShort(r.longestAged.value):'—',r.longestAged?escHtml(r.longestAged.batch.name)+' · still resting':'')
    +tile('📅','Biggest Year',r.biggestYear?r.biggestYear.value+' batches':'—',r.biggestYear?r.biggestYear.year:'')
    +tile('🍾','Largest Batch',r.mostBottlesInBatch?r.mostBottlesInBatch.value+' btl':'—',r.mostBottlesInBatch?escHtml(r.mostBottlesInBatch.batch.name):'')
    +tile('⭐','Top-Rated',r.highestRatedBatch?'★'.repeat(r.highestRatedBatch.value):'—',r.highestRatedBatch?escHtml(r.highestRatedBatch.batch.name):'')
    +tile('🧪','Recipes Tried',r.distinctRecipes,'distinct recipes')
    +tile('🎁','Bottles Gifted',r.bottlesGiftedLifetime,'shared with others')
    +'</div>'
    +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:11px;color:var(--text3);text-align:center">LIFETIME · '+r.totalBatchesLifetime+' batches · '+r.totalBottlesLifetime+' bottles produced · '+r.bottlesDrunkLifetime+' consumed</div>'
    +'</div>';
}

// ==================== BLENDING CALCULATOR ====================
function renderBlendingTool(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&bottlesOnHand(APP.bottling[b.id])>0;});
  if(bottled.length<1){
    return'<div class="card"><div class="card-header"><div class="card-title">🥂 BLENDING CALCULATOR</div></div>'
      +'<div style="color:var(--text3);font-style:italic;padding:10px 0;font-size:13px">You need at least 1 bottled batch with bottles on-hand to blend (with another batch, or with water to lower strength). Currently you have '+bottled.length+'.</div></div>';
  }
  var opts=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    return'<option value="'+b.id+'">'+escHtml(b.name)+' · '+(bot.abv||'?')+'% ABV · '+(bot.sweetness||'—')+' · '+bottlesOnHand(bot)+' avail</option>';
  }).join('');
  // Water as a B-side option — classic dilution of an over-strong mead.
  var optsB=opts+'<option value="__water">Plain water · 0% ABV (dilution)</option>';
  var idA=window._blendA||bottled[0].id;
  var idB=window._blendB||(bottled[1]?bottled[1].id:'__water');
  var ratioA=window._blendRatio||50;
  // Pre-compute the initial output HTML inline. Previously this used a trailing
  // <script>updateBlendOutput()<\/script> tag, but main.innerHTML=... refuses to
  // execute inline <script> nodes — so the output stayed blank until the user
  // first interacted with a control. By computing the markup here we render
  // useful output on first paint.
  var initialOutput=computeBlendOutputHTML(idA,idB,ratioA);
  return'<div class="card"><div class="card-header"><div class="card-title">🥂 BLENDING CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Blend two bottled meads in any ratio to predict the resulting ABV, sweetness, and per-litre cost. Useful for dialing in a balanced finish before committing.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Batch A</label><select class="form-select" id="blend-a" onchange="window._blendA=this.value;renderMain()">'+opts.replace('value="'+idA+'"','value="'+idA+'" selected')+'</select></div>'
    +'<div class="form-group"><label class="form-label">Batch B</label><select class="form-select" id="blend-b" onchange="window._blendB=this.value;renderMain()">'+optsB.replace('value="'+idB+'"','value="'+idB+'" selected')+'</select></div></div>'
    +'<div class="form-group"><label class="form-label">Total blend volume (L) — for the litre breakdown</label><input class="form-input" id="blend-vol" type="number" min="0.1" step="0.1" value="'+(window._blendVol||5)+'" oninput="window._blendVol=parseFloat(this.value)||5;updateBlendOutput()"></div>'
    +'<div class="form-group"><label class="form-label">Blend Ratio · A : B = <span id="blend-ratio-display">'+ratioA+' : '+(100-ratioA)+'</span></label>'
    +'<input type="range" min="10" max="90" step="5" value="'+ratioA+'" id="blend-ratio" oninput="window._blendRatio=parseInt(this.value);document.getElementById(\'blend-ratio-display\').textContent=this.value+\' : \'+(100-this.value);updateBlendOutput()" style="width:100%;cursor:pointer"></div>'
    +'<div id="blend-output" style="margin-top:14px">'+initialOutput+'</div>'
    +'</div>';
}

// Pure-data version of the blend rendering. Returns HTML string for the
// blend-output container based on the two selected batch IDs and ratio.
// Shared between initial render (renderBlendingTool) and live update
// (updateBlendOutput).
function computeBlendOutputHTML(idA,idB,ratioA){
  if(!idA||!idB)return'';
  var bA=APP.batches.find(function(x){return x.id===idA;});
  if(!bA)return'';
  var botA=APP.bottling[bA.id];
  if(!botA)return'';
  // Batch B may be the synthetic "water" entry — a 0% ABV, FG 1.000, no-cost,
  // no-flavour diluent. This is the classic fix for an over-strong or
  // over-sweet mead. Treat it as a pseudo-batch so the rest of the math is
  // identical.
  var isWater=(idB==='__water');
  var bB=isWater?null:APP.batches.find(function(x){return x.id===idB;});
  var botB=isWater?null:(bB&&APP.bottling[bB.id]);
  if(!isWater&&(!bB||!botB))return'';
  var fa=ratioA/100,fb=1-fa;
  var abvA=botA.abv||(bA.og&&botA.fg?parseFloat(calcABV(bA.og,botA.fg)):null);
  var abvB=isWater?0:(botB.abv||(bB.og&&botB.fg?parseFloat(calcABV(bB.og,botB.fg)):null));
  var blendedABV=(abvA!=null&&abvB!=null)?(abvA*fa+abvB*fb):null;
  var fgA=botA.fg||1.010;
  var fgB=isWater?1.000:(botB.fg||1.010);
  var blendedFG=fgA*fa+fgB*fb;
  var sweetIdx={'Bone Dry':0,'Dry':1,'Off-Dry':2,'Semi-Sweet':3,'Sweet':4,'Dessert':5,'':2};
  // Water has no sugar — pull sweetness DOWN toward bone-dry, scaled by how
  // much water is in the blend, rather than parking it at the neutral midpoint.
  var sA=(sweetIdx[botA.sweetness||'']!=null?sweetIdx[botA.sweetness||'']:2);
  var sB=isWater?0:(sweetIdx[botB.sweetness||'']!=null?sweetIdx[botB.sweetness||'']:2);
  var sIdx=sA*fa+sB*fb;
  var sLabels=['Bone Dry','Dry','Off-Dry','Semi-Sweet','Sweet','Dessert'];
  var blendedSweet=sLabels[Math.round(Math.max(0,Math.min(5,sIdx)))];
  var ccy=APP.settings.currency||'€';
  var costA=(bA.cost&&bottlesOriginal(botA)>0)?((bA.cost.honey||0)+(bA.cost.extras||0))/bottlesOriginal(botA):0;
  var costB=isWater?0:((bB.cost&&bottlesOriginal(botB)>0)?((bB.cost.honey||0)+(bB.cost.extras||0))/bottlesOriginal(botB):0);
  var blendedCost=costA*fa+costB*fb;
  var colorA=getBatchColor(bA),colorB=isWater?'#5a7a8a':getBatchColor(bB);
  var nameB=isWater?'Water':bB.name;
  // Litre breakdown for the chosen total volume — what you actually pour.
  var totVol=window._blendVol||5;
  var litA=totVol*fa, litB=totVol*fb;
  var unit=(typeof currentUnitSystem==='function'&&currentUnitSystem()!=='metric');
  function volStr(L){
    if(!unit)return L.toFixed(2)+' L';
    var q=L*1.05669; return L.toFixed(2)+' L ('+q.toFixed(2)+' qt)';
  }
  return'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px">'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)">'+(blendedABV!=null?blendedABV.toFixed(1)+'%':'—')+'</div><div class="micro-label">BLENDED ABV</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--blue2)">'+blendedFG.toFixed(3)+'</div><div class="micro-label">BLENDED FG</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:16px;color:var(--text2);font-style:italic">'+blendedSweet+'</div><div class="micro-label">PROFILE</div></div>'
    +(blendedCost>0?'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center"><div style="font-family:var(--font-display);font-size:24px;color:var(--green2)">'+ccy+blendedCost.toFixed(2)+'</div><div class="micro-label">PER-BOTTLE COST</div></div>':'')
    +'</div>'
    +'<div style="display:flex;gap:0;height:40px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);margin-bottom:8px">'
    +'<div style="width:'+ratioA+'%;background:'+colorA+';display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-display);font-size:12px;letter-spacing:1px">'+escHtml(bA.name.slice(0,18))+(bA.name.length>18?'…':'')+' · '+ratioA+'%</div>'
    +'<div style="width:'+(100-ratioA)+'%;background:'+colorB+';display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-display);font-size:12px;letter-spacing:1px">'+escHtml(nameB.slice(0,18))+(nameB.length>18?'…':'')+' · '+(100-ratioA)+'%</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:8px;font-family:var(--font-mono);font-size:11.5px;color:var(--text2)">'
    +'<div style="flex:1;text-align:center;padding:7px;background:var(--bg4);border-radius:var(--radius)"><span style="color:'+colorA+'">●</span> '+escHtml(bA.name.slice(0,16))+': <strong>'+volStr(litA)+'</strong></div>'
    +'<div style="flex:1;text-align:center;padding:7px;background:var(--bg4);border-radius:var(--radius)"><span style="color:'+colorB+'">●</span> '+escHtml(nameB.slice(0,16))+': <strong>'+volStr(litB)+'</strong></div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;text-align:center">Approximate values. Sweetness blends linearly on a 6-point scale; real blending may shift slightly with carbonation, oxidation, or rest time. '+(isWater?'Diluting with water also thins body and aroma — taste as you go.':'Bench-trial a small measured blend before committing the whole batch.')+'</div>';
}

function updateBlendOutput(){
  var idA=window._blendA||(document.getElementById('blend-a')&&document.getElementById('blend-a').value);
  var idB=window._blendB||(document.getElementById('blend-b')&&document.getElementById('blend-b').value);
  var ratioA=window._blendRatio||50;
  var out=document.getElementById('blend-output');
  if(!out)return;
  out.innerHTML=computeBlendOutputHTML(idA,idB,ratioA);
}

// ==================== CROSS-BATCH YEAST ANALYTICS ====================
function renderYeastAnalytics(){
  // Group bottled batches by yeast (or 'M05' default if not set)
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length)return'';
  var byYeast={};
  bottled.forEach(function(b){
    var yeast=b.yeast||'M05';
    if(!byYeast[yeast])byYeast[yeast]={batches:[],attenuations:[],abvs:[],ferments:[],ogToFG:[]};
    byYeast[yeast].batches.push(b);
    var bot=APP.bottling[b.id];
    if(b.og&&bot.fg){
      byYeast[yeast].attenuations.push(((b.og-bot.fg)/(b.og-1))*100);
      byYeast[yeast].ogToFG.push({og:b.og,fg:bot.fg});
    }
    if(bot.abv)byYeast[yeast].abvs.push(bot.abv);
    if(bot.date){
      var ferment=Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000);
      if(ferment>0&&ferment<400)byYeast[yeast].ferments.push(ferment);
    }
  });
  function stats(arr){
    if(!arr.length)return null;
    var sum=arr.reduce(function(a,v){return a+v;},0);
    return{avg:sum/arr.length,min:Math.min.apply(null,arr),max:Math.max.apply(null,arr),n:arr.length};
  }
  var cards=Object.keys(byYeast).map(function(yeast){
    var d=byYeast[yeast];
    var attS=stats(d.attenuations);
    var abvS=stats(d.abvs);
    var fermS=stats(d.ferments);
    // Color for yeast
    var c=yeast==='M05'?'#c9a84c':yeast==='K1V-1116'?'#8a3838':yeast==='71B'?'#5a8db8':yeast==='EC-1118'?'#6a8a4a':'#a0a0a0';
    return'<div style="background:var(--bg3);border:1px solid var(--border);border-left:3px solid '+c+';border-radius:var(--radius);padding:14px;margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><div style="font-family:var(--font-display);font-size:15px;color:'+c+';letter-spacing:1.5px">'+escHtml(yeast)+'</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">'+d.batches.length+' batch'+(d.batches.length!==1?'es':'')+'</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px">'
      +(attS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+attS.avg.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG ATTEN.</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+attS.min.toFixed(0)+'–'+attS.max.toFixed(0)+'%</div></div>':'')
      +(abvS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+abvS.avg.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG ABV</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+abvS.min.toFixed(1)+'–'+abvS.max.toFixed(1)+'%</div></div>':'')
      +(fermS?'<div style="text-align:center;padding:8px 4px;background:var(--bg4);border-radius:6px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+fmtDurationCompact(Math.round(fermS.avg))+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">AVG FERMENT</div><div style="font-size:10px;color:var(--text3);margin-top:2px">'+fmtDurationCompact(fermS.min)+'–'+fmtDurationCompact(fermS.max)+'</div></div>':'')
      +'</div>'
      +(yeast==='M05'&&attS?'<div style="font-size:11px;color:var(--text3);margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-style:italic">Mangrove Jack spec: 95-100% attenuation, up to 18% ABV tolerance. Your '+attS.avg.toFixed(1)+'% '+(attS.avg<90?'is below spec — check temp/nutrients':attS.avg>95?'matches the published profile':'is close to spec')+'.</div>':'')
      +'</div>';
  }).join('');
  return'<div><div class="card-header" style="margin-bottom:10px"><div class="card-title">🧪 YEAST PERFORMANCE · LONGITUDINAL</div></div>'+cards+'</div>';
}

// ==================== GIFT RECIPIENT LOG ====================
// When the gifted location count is increased, prompt for who received the bottles.
// Stored per-bottling as bot.gifts = [{id, date, recipient, count, occasion, notes}].

function openGiftRecipientModal(batchId,deltaCount,size){
  closeModal();
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  size=size||DEFAULT_BOTTLE_SIZE;
  // Suggest recipient names from prior gifts
  var priorRecipients={};
  Object.keys(APP.bottling).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(bot.gifts)bot.gifts.forEach(function(g){priorRecipients[g.recipient]=true;});
  });
  var dataListOpts=Object.keys(priorRecipients).map(function(n){return'<option value="'+escHtml(n)+'">';}).join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:460px">'
    +'<div class="modal-title">🎁 RECORD GIFT'+(deltaCount>1?' ('+deltaCount+' × '+size+'ml)':' ('+size+'ml)')+'</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Recording '+deltaCount+' × '+size+'ml gift'+(deltaCount!==1?'s':'')+' of <strong style="color:var(--gold2)">'+escHtml(b.name)+'</strong>. Track who got the bottle'+(deltaCount!==1?'s':'')+' so you can follow up later.</div>'
    +'<input type="hidden" id="gift-size" value="'+size+'">'
    +'<div class="form-group"><label class="form-label">Recipient</label><input class="form-input" id="gift-recipient" placeholder="Mom / Sarah / Jan & Marie" list="gift-recipients-list" autofocus>'
    +'<datalist id="gift-recipients-list">'+dataListOpts+'</datalist></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="gift-date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label">Bottles</label><input class="form-input" type="number" id="gift-count" min="1" value="'+deltaCount+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Occasion (optional)</label><input class="form-input" id="gift-occasion" placeholder="Birthday / Christmas / Just because"></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="gift-notes" placeholder="They loved the cherry one last time, prefer drier…"></textarea></div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-secondary" onclick="skipGiftRecording(\''+batchId+'\','+deltaCount+','+size+')">Skip — Just Count</button>'
    +'<button class="btn btn-primary" onclick="saveGiftRecord(\''+batchId+'\','+deltaCount+','+size+')">Save Gift</button>'
    +'</div></div></div>');
  setTimeout(function(){var r=document.getElementById('gift-recipient');if(r)r.focus();},50);
}

function saveGiftRecord(batchId,deltaCount,size){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  size=parseInt(size)||DEFAULT_BOTTLE_SIZE;
  var recipient=document.getElementById('gift-recipient').value.trim();
  if(!recipient){toast('⚠ Enter a recipient or click Skip');return;}
  var count=parseInt(document.getElementById('gift-count').value)||deltaCount;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if((bot.locations.cellar[size]||0)<count){
    toast('⚠ Only '+(bot.locations.cellar[size]||0)+' × '+size+'ml in cellar — cannot gift '+count);
    return;
  }
  if(!bot.gifts)bot.gifts=[];
  bot.gifts.push({
    id:genId(),
    date:document.getElementById('gift-date').value||today(),
    recipient:recipient,
    count:count,
    size:size,
    occasion:document.getElementById('gift-occasion').value.trim(),
    notes:document.getElementById('gift-notes').value.trim()
  });
  // Transfer: cellar[size] -> gifted[size]
  bot.locations.cellar[size]=(bot.locations.cellar[size]||0)-count;
  bot.locations.gifted[size]=(bot.locations.gifted[size]||0)+count;
  if(bot.locations.cellar[size]<=0)delete bot.locations.cellar[size];
  closeModal();
  scheduleSave();
  toast('🎁 '+count+' × '+size+'ml bottle'+(count!==1?'s':'')+' gifted to '+recipient);
  renderMain();
}

function skipGiftRecording(batchId,deltaCount,size){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  size=parseInt(size)||DEFAULT_BOTTLE_SIZE;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if((bot.locations.cellar[size]||0)<deltaCount){
    toast('⚠ Not enough in cellar');
    closeModal();
    renderMain();
    return;
  }
  bot.locations.cellar[size]=(bot.locations.cellar[size]||0)-deltaCount;
  bot.locations.gifted[size]=(bot.locations.gifted[size]||0)+deltaCount;
  if(bot.locations.cellar[size]<=0)delete bot.locations.cellar[size];
  closeModal();
  scheduleSave();
  toast('🎁 '+deltaCount+' × '+size+'ml bottle'+(deltaCount!==1?'s':'')+' marked as gifted (no recipient recorded)');
  renderMain();
}

function deleteGiftRecord(batchId,giftId){
  if(!confirm('Delete this gift record? Bottles will return to the cellar count.'))return;
  var bot=APP.bottling[batchId];
  if(!bot||!bot.gifts)return;
  var gift=bot.gifts.find(function(g){return g.id===giftId;});
  if(!gift)return;
  bot.gifts=bot.gifts.filter(function(g){return g.id!==giftId;});
  var size=gift.size||DEFAULT_BOTTLE_SIZE;
  if(bot.locations){
    if(!bot.locations.gifted)bot.locations.gifted={};
    if(!bot.locations.cellar)bot.locations.cellar={};
    bot.locations.gifted[size]=Math.max(0,(bot.locations.gifted[size]||0)-gift.count);
    bot.locations.cellar[size]=(bot.locations.cellar[size]||0)+gift.count;
    if(bot.locations.gifted[size]<=0)delete bot.locations.gifted[size];
  }
  scheduleSave();toast('Gift record deleted, '+gift.count+' × '+size+'ml returned to cellar');renderMain();
}

function renderGiftHistory(bot,batchId){
  if(!bot.gifts||!bot.gifts.length)return'';
  // Aggregate by recipient
  var byRecipient={};
  bot.gifts.forEach(function(g){
    if(!byRecipient[g.recipient])byRecipient[g.recipient]={count:0,gifts:[]};
    byRecipient[g.recipient].count+=g.count;
    byRecipient[g.recipient].gifts.push(g);
  });
  var summary=Object.keys(byRecipient).map(function(name){
    var d=byRecipient[name];
    return escHtml(name)+(d.count>1?' ('+d.count+')':'');
  }).join(', ');
  return'<div style="margin-top:8px;font-size:11px;color:var(--text3);padding:6px 8px;background:var(--bg4);border-radius:6px;border-left:2px solid var(--gold)">'
    +'<span style="font-family:var(--font-mono);letter-spacing:1px;color:var(--gold2)">🎁 GIVEN TO:</span> '+summary
    +' <button class="btn btn-secondary btn-sm" style="margin-left:6px;padding:2px 8px;font-size:10px" onclick="showGiftDetails(\''+batchId+'\')">Details</button>'
    +'</div>';
}

function showGiftDetails(batchId){
  closeModal();
  var bot=APP.bottling[batchId];
  if(!bot||!bot.gifts||!bot.gifts.length)return;
  var b=APP.batches.find(function(x){return x.id===batchId;});
  var rows=bot.gifts.slice().sort(function(a,c){return(c.date||'').localeCompare(a.date||'');}).map(function(g){
    return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:flex-start">'
      +'<div style="flex:1"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(g.recipient)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+fmtDate(g.date)+(g.occasion?' · '+escHtml(g.occasion):'')+'</div>'
      +(g.notes?'<div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">'+escHtml(g.notes)+'</div>':'')+'</div>'
      +'<div style="text-align:right"><div style="font-family:var(--font-display);font-size:16px;color:var(--gold2)">'+g.count+'</div><div style="font-size:9px;color:var(--text3);font-family:var(--font-mono)">BOTTLE'+(g.count!==1?'S':'')+'</div></div>'
      +'<button class="btn-icon" onclick="deleteGiftRecord(\''+batchId+'\',\''+g.id+'\')" title="Delete record">×</button>'
      +'</div>';
  }).join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px">'
    +'<div class="modal-title">🎁 GIFTS · '+escHtml(b?b.name:'')+'</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-family:var(--font-mono);letter-spacing:1px">'+bot.gifts.length+' gift'+(bot.gifts.length!==1?'s':'')+' · '+bot.gifts.reduce(function(s,g){return s+g.count;},0)+' bottles total</div>'
    +rows
    +'<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>'
    +'</div></div>');
}

// ==================== BOTTLING DAY GUIDED WORKFLOW ====================
// Multi-step modal walking the user through bottling: pre-flight → final gravity →
// sanitize timer → fill → label preview → save. Replaces the "form in a vacuum"
// experience with a checklist-driven flow.

var BOTTLING_STEPS=[
  {id:'preflight',title:'Pre-Flight',icon:'✓'},
  {id:'fg',title:'Final Gravity',icon:'⚗'},
  {id:'sanitize',title:'Sanitize',icon:'🧴'},
  {id:'fill',title:'Fill Bottles',icon:'🍾'},
  {id:'label',title:'Labels',icon:'🏷'},
  {id:'finish',title:'Save',icon:'✦'}
];

var bottlingWorkflowState={
  batchId:null,
  stepIdx:0,
  preflight:{},
  fg:null,
  abv:null,
  sanitizerStartedAt:null,
  sanitizerCompleted:false,
  counts:{500:0,750:0},  // per-size bottle counts
  closure:'crown',       // 'crown' | 'cork' — drives deduction + cost
  customSize:0,
  customQty:0,
  sweetness:'',
  notes:'',
  date:''
};

function startBottlingWorkflow(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var existing=APP.bottling[batchId]||{};
  // Previously this used `APP.logs[batchId][batchId.length-1]` — indexing by
  // the batch *ID's* string length, which silently returned undefined for
  // anything other than ~24-element log arrays. Fix: index by the log array's
  // own length minus one.
  var batchLogs=APP.logs[batchId]||[];
  var lastLog=batchLogs.length?batchLogs[batchLogs.length-1]:null;
  // Try to read existing per-size counts
  var existingCounts=existing.countsAtBottling?_coerceLocations(existing.countsAtBottling):{};
  var c500=existingCounts[500]||0;
  var c750=existingCounts[750]||(!existing.countsAtBottling&&existing.bottleCount?existing.bottleCount:0);
  var customSize=0,customQty=0;
  Object.keys(existingCounts).forEach(function(s){if(s!=='500'&&s!=='750'){customSize=parseInt(s);customQty=existingCounts[s];}});
  // ABV gap fix: if there's no existing.fg yet but we DO have a recent log, use
  // that log's gravity for the initial ABV estimate. Previously the workflow
  // started with abv=null on first-time bottling even though we had a valid
  // gravity reading to work from.
  var initialFg=existing.fg||(lastLog?lastLog.gravity:null);
  var initialClosure=existing.closure||'crown';
  // Restore any in-flight sanitize timer for this batch from localStorage —
  // survives page reloads / accidental modal closes so the user doesn't lose
  // the countdown mid-soak.
  var savedTimer=null;
  try{
    var raw=localStorage.getItem('meadows_sanitizeTimer');
    if(raw){
      var parsed=JSON.parse(raw);
      // Only restore if it belongs to THIS batch AND hasn't fully elapsed >5min ago
      // (anything older than 5min past the 2min duration is stale).
      if(parsed&&parsed.batchId===batchId&&parsed.startedAt){
        var ageSec=(Date.now()-parsed.startedAt)/1000;
        if(ageSec<420){savedTimer=parsed;}else{localStorage.removeItem('meadows_sanitizeTimer');}
      }
    }
  }catch(e){}
  bottlingWorkflowState={
    batchId:batchId,
    stepIdx:0,
    preflight:{bottles:false,caps:false,sanitizer:false,siphon:false,wand:false,hydrometer:false},
    fg:initialFg,
    closure:initialClosure,
    abv:existing.abv||(b.og&&initialFg?parseFloat(calcABV(b.og,initialFg)):null),
    sanitizerStartedAt:savedTimer?savedTimer.startedAt:null,
    sanitizerCompleted:savedTimer?!!savedTimer.completed:false,
    counts:{500:c500,750:c750||6},  // default 6×750ml if fresh
    customSize:customSize,
    customQty:customQty,
    sweetness:existing.sweetness||'',
    notes:existing.notes||'',
    date:existing.date||today()
  };
  renderBottlingWorkflow();
}

// Helpers for the bottling sanitize timer's localStorage persistence. Public
// so the click-handler inline can call them.
function startSanitizeTimer(){
  var s=bottlingWorkflowState;
  s.sanitizerStartedAt=Date.now();
  s.sanitizerCompleted=false;
  try{localStorage.setItem('meadows_sanitizeTimer',JSON.stringify({batchId:s.batchId,startedAt:s.sanitizerStartedAt,completed:false}));}catch(e){}
  renderBottlingWorkflow();
}
function completeSanitizeTimer(){
  bottlingWorkflowState.sanitizerCompleted=true;
  try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
  renderBottlingWorkflow();
}
function resetSanitizeTimer(){
  bottlingWorkflowState.sanitizerStartedAt=null;
  bottlingWorkflowState.sanitizerCompleted=false;
  try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
  renderBottlingWorkflow();
}

function renderBottlingWorkflow(){
  closeModal();
  var s=bottlingWorkflowState;
  var b=APP.batches.find(function(x){return x.id===s.batchId;});
  if(!b)return;
  var step=BOTTLING_STEPS[s.stepIdx];
  // Stepper header
  var stepper=BOTTLING_STEPS.map(function(st,i){
    var done=i<s.stepIdx,active=i===s.stepIdx;
    return'<div style="display:flex;align-items:center;gap:6px;flex:1;opacity:'+(active?1:done?0.7:0.4)+'"><div style="width:24px;height:24px;border-radius:12px;background:'+(done?'var(--green2)':active?'var(--gold)':'var(--bg4)')+';color:'+(done||active?'#0a0a0b':'var(--text3)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">'+(done?'✓':st.icon)+'</div><div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:'+(active?'var(--gold2)':'var(--text3)')+'">'+st.title.toUpperCase()+'</div>'+(i<BOTTLING_STEPS.length-1?'<div style="flex:1;height:1px;background:var(--border)"></div>':'')+'</div>';
  }).join('');
  var content=renderBottlingStepContent(step.id,s,b);
  var canPrev=s.stepIdx>0;
  var canNext=canAdvanceBottlingStep(step.id,s);
  var isLast=s.stepIdx===BOTTLING_STEPS.length-1;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay modal-static" onclick="if(event.target===this&&confirm(\'Cancel bottling workflow? Progress will be lost.\'))closeModal()"><div class="modal" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🍾 GUIDED BOTTLING · '+escHtml(b.name)+'</div>'
    +'<div style="display:flex;gap:0;align-items:center;margin-bottom:18px">'+stepper+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+content+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px">'
    +(canPrev?'<button class="btn btn-secondary" onclick="bottlingPrevStep()">← Back</button>':'<span></span>')
    +'<button class="btn btn-secondary" onclick="if(confirm(\'Cancel bottling workflow?\'))closeModal()">Cancel</button>'
    +(isLast?'<button class="btn btn-primary" onclick="finishBottlingWorkflow()">✦ Complete Bottling</button>':'<button class="btn btn-primary" id="bw-next-btn" onclick="bottlingNextStep()" '+(canNext?'':'disabled style="opacity:0.4;cursor:not-allowed"')+'>Next →</button>')
    +'</div></div></div>');
}

function renderBottlingStepContent(stepId,s,b){
  if(stepId==='preflight'){
    var items=[
      {key:'bottles',label:'Bottles cleaned and dry',hint:'Match the count to ' +s.bottleCount+' or more'},
      {key:'caps',label:'Caps / corks ready',hint:'Crown caps, corks, or swing-tops — your choice'},
      {key:'sanitizer',label:'Sanitizer mixed ('+getSanitizer().name+')',hint:'~'+getSanitizer().mlPerL+' ml per litre water'},
      {key:'siphon',label:'Auto-siphon / racking cane',hint:'Clean and ready to deploy'},
      {key:'wand',label:'Bottling wand or filler',hint:'For controlled bottle filling'},
      {key:'hydrometer',label:'Hydrometer (for final gravity)',hint:'Take a final reading before bottling'}
    ];
    var rows=items.map(function(it){
      return'<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer;border-bottom:1px solid var(--border)">'
        +'<input type="checkbox" '+(s.preflight[it.key]?'checked':'')+' onchange="bottlingWorkflowState.preflight[\''+it.key+'\']=this.checked;renderBottlingWorkflow()" style="margin-top:3px;cursor:pointer;width:18px;height:18px">'
        +'<div><div style="font-size:14px;color:var(--text)">'+escHtml(it.label)+'</div><div style="font-size:11px;color:var(--text3);font-style:italic">'+escHtml(it.hint)+'</div></div>'
        +'</label>';
    }).join('');
    var allChecked=items.every(function(it){return s.preflight[it.key];});
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Confirm everything is ready before you start. Bottling day rewards preparation — once the siphon is running, you don\'t want to be hunting for sanitizer.</div>'+rows
      +'<div style="margin-top:14px;padding:10px;background:'+(allChecked?'#0d1f12':'var(--bg4)')+';border-left:3px solid '+(allChecked?'var(--green)':'var(--gold)')+';border-radius:var(--radius);font-size:12px;color:'+(allChecked?'var(--green2)':'var(--text2)')+'">'
      +(allChecked?'✓ All ready. Click Next to continue.':'Complete the checklist to proceed.')
      +'</div>';
  }
  if(stepId==='fg'){
    var ogText=b.og?b.og.toFixed(3):'—';
    var lastLog=(APP.logs[b.id]&&APP.logs[b.id].length)?APP.logs[b.id][APP.logs[b.id].length-1]:null;
    var calcedAbv=(b.og&&s.fg)?calcABV(b.og,s.fg):'—';
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Take your final hydrometer reading. The batch should be at terminal gravity — no drop in 48-72 hours.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px">'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center">'
      +'<div><div style="font-family:var(--font-display);font-size:20px;color:var(--blue2)">'+ogText+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ORIGINAL</div></div>'
      +'<div><div id="bw-fg-val" style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+(s.fg?s.fg.toFixed(3):'—')+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">FINAL</div></div>'
      +'<div><div id="bw-abv-val" style="font-family:var(--font-display);font-size:20px;color:var(--green2)">'+calcedAbv+'%</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ABV</div></div>'
      +'</div></div>'
      +(lastLog?'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-style:italic">Last logged gravity: '+lastLog.gravity+' on '+fmtDate(lastLog.date)+(daysSince(lastLog.date)<3?' — fresh, good to use':' — consider taking a new reading')+'</div>':'')
      +'<div class="form-row"><div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" type="number" step="0.001" id="bw-fg-input" value="'+(s.fg||'')+'" oninput="updateBwFG(this.value)"></div>'
      +'<div class="form-group"><label class="form-label">Manual ABV Override (optional)</label><input class="form-input" type="number" step="0.1" id="bw-abv-input" value="'+(s.abv||'')+'" oninput="updateBwAbvOverride(this.value)"></div></div>';
  }
  if(stepId==='sanitize'){
    var elapsed=s.sanitizerStartedAt?Math.floor((Date.now()-s.sanitizerStartedAt)/1000):0;
    var duration=120; // 2 minutes
    var remaining=Math.max(0,duration-elapsed);
    var mm=Math.floor(remaining/60),ss=remaining%60;
    var progress=Math.min(100,(elapsed/duration)*100);
    var running=s.sanitizerStartedAt&&!s.sanitizerCompleted&&remaining>0;
    if(running){
      // Schedule a re-render
      setTimeout(function(){if(bottlingWorkflowState.sanitizerStartedAt===s.sanitizerStartedAt&&!bottlingWorkflowState.sanitizerCompleted)renderBottlingWorkflow();},1000);
    }
    if(remaining===0&&s.sanitizerStartedAt&&!s.sanitizerCompleted){
      bottlingWorkflowState.sanitizerCompleted=true;
      try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
    }
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Sanitize all bottles, caps, siphon, and wand. StarSan needs ~30 seconds of contact time, but 2 minutes covers all surfaces with margin.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:24px;text-align:center;margin-bottom:14px">'
      +'<div style="font-family:var(--font-display);font-size:56px;color:'+(s.sanitizerCompleted?'var(--green2)':running?'var(--gold2)':'var(--text3)')+';line-height:1">'+(s.sanitizerCompleted?'DONE':((mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss))+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:2px;margin-top:8px">'+(s.sanitizerCompleted?'✓ SANITIZATION COMPLETE':running?'SANITIZING — KEEP IN CONTACT':'2-MINUTE TIMER')+'</div>'
      +(running||s.sanitizerCompleted?'<div style="margin-top:14px;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--gold),var(--green2));transition:width 1s linear"></div></div>':'')
      +'</div>'
      +(!s.sanitizerStartedAt?'<button class="btn btn-primary" style="width:100%" onclick="startSanitizeTimer()">▶ Start 2-Minute Timer</button>':'')
      +(running?'<button class="btn btn-secondary" style="width:100%" onclick="completeSanitizeTimer()">Skip — Already Done</button>':'')
      +(s.sanitizerCompleted?'<div style="padding:10px;background:#0d1f12;border-left:3px solid var(--green);border-radius:var(--radius);font-size:12px;color:var(--green2);margin-bottom:8px">✓ Sanitization complete. Drain bottles and proceed to filling.</div><button class="btn btn-secondary btn-sm" onclick="resetSanitizeTimer()">↻ Reset Timer</button>':'');
  }
  if(stepId==='fill'){
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Siphon into your sanitized bottles. Fill to the bottom of the bottle neck (~25mm headspace). Cap or cork immediately. Wipe drips before they become sticky regrets.</div>'
      +'<div class="form-group"><label class="form-label">Bottling Date</label><input class="form-input" type="date" id="bw-date" value="'+s.date+'" onchange="bottlingWorkflowState.date=this.value"></div>'
      +'<div style="margin:8px 0 4px;font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">BOTTLE COUNTS BY SIZE</div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">🍶 500 ml bottles</label><input class="form-input" type="number" min="0" id="bw-count-500" value="'+(s.counts[500]||'')+'" oninput="updateBwFillCount()"></div>'
      +'<div class="form-group"><label class="form-label">🍷 750 ml bottles</label><input class="form-input" type="number" min="0" id="bw-count-750" value="'+(s.counts[750]||'')+'" oninput="updateBwFillCount()"></div></div>'
      +'<details style="margin-bottom:10px"'+(s.customSize>0||s.customQty>0?' open':'')+'><summary style="cursor:pointer;font-size:12px;color:var(--text3);padding:4px 0">+ Custom bottle size</summary>'
      +'<div class="form-row" style="margin-top:6px"><div class="form-group"><label class="form-label">Custom size (ml)</label><input class="form-input" type="number" min="100" id="bw-custom-size" value="'+(s.customSize||'')+'" oninput="updateBwFillCount()"></div>'
      +'<div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" min="0" id="bw-custom-qty" value="'+(s.customQty||'')+'" oninput="updateBwFillCount()"></div></div>'
      +'</details>'
      +'<div id="bw-total-info" style="padding:10px 12px;background:var(--bg4);border-left:3px solid var(--gold);border-radius:var(--radius);margin-bottom:10px;font-family:var(--font-mono);font-size:13px;color:var(--gold2);'+(totalBot>0?'':'display:none')+'">TOTAL: '+totalBot+' bottle'+(totalBot!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L</div>'
      +'<div class="form-group"><label class="form-label">Final Sweetness Profile</label><select class="form-select" id="bw-sweetness" onchange="bottlingWorkflowState.sweetness=this.value">'
      +['','Bone Dry','Dry','Off-Dry','Semi-Sweet','Sweet','Dessert'].map(function(o){return'<option value="'+o+'"'+(s.sweetness===o?' selected':'')+'>'+(o||'(set after tasting)')+'</option>';}).join('')
      +'</select></div>'
      +'<div class="form-group"><label class="form-label">Closure</label><select class="form-select" id="bw-closure" onchange="bottlingWorkflowState.closure=this.value">'
      +'<option value="crown"'+((s.closure||'crown')!=='cork'?' selected':'')+'>⭕ Crown caps</option>'
      +'<option value="cork"'+(s.closure==='cork'?' selected':'')+'>🪵 Corks</option>'
      +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px">Bottles and closures are deducted from Supplies (when tracked) and priced into the batch cost breakdown.</div></div>'
      +'<div class="form-group"><label class="form-label">Bottling Notes (optional)</label><textarea class="form-textarea" id="bw-notes" oninput="bottlingWorkflowState.notes=this.value" placeholder="Bottle type used, cap/cork, anything unusual…">'+escHtml(s.notes)+'</textarea></div>'
      +'<div id="bw-cellar-info" style="padding:10px;background:var(--bg4);border-left:3px solid var(--gold);border-radius:var(--radius);font-size:12px;color:var(--text2);margin-top:8px;'+(totalBot>0?'':'display:none')+'">All '+totalBot+' bottle'+(totalBot!==1?'s':'')+' will land in the cellar by default. You can split into fridge/gifted/other from the Cellar view later.</div>';
  }
  if(stepId==='label'){
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var abvForLabel=s.abv||(b.og&&s.fg?parseFloat(calcABV(b.og,s.fg)):null);
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Your label is ready. Save as PNG, print directly, or skip if you\'ll label later. The ABV is baked into the hexagon — no separate sticker needed.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:14px;margin-bottom:14px;text-align:center">'
      +renderBatchLabel(recipe?recipe.id:'r1',abvForLabel||0,{batch:b})
      +'</div>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
      +'<button class="btn btn-secondary" onclick="(function(){var tempBot={abv:'+(abvForLabel||0)+'};APP.bottling[\''+b.id+'\']=Object.assign({},APP.bottling[\''+b.id+'\']||{},tempBot);downloadLabel(\''+b.id+'\');}())">⬇ Save PNG</button>'
      +'<button class="btn btn-secondary" onclick="(function(){var tempBot={abv:'+(abvForLabel||0)+'};APP.bottling[\''+b.id+'\']=Object.assign({},APP.bottling[\''+b.id+'\']||{},tempBot);printLabel(\''+b.id+'\');}())">🖨 Print</button>'
      +'<button class="btn btn-secondary" onclick="bottlingNextStep()">Skip for Now</button>'
      +'</div>';
  }
  if(stepId==='finish'){
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
    var sizeParts=[];
    if(s.counts[500]>0)sizeParts.push(s.counts[500]+' × 500ml');
    if(s.counts[750]>0)sizeParts.push(s.counts[750]+' × 750ml');
    if(s.customSize>0&&s.customQty>0)sizeParts.push(s.customQty+' × '+s.customSize+'ml');
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Review your bottling record. Clicking <strong>Complete Bottling</strong> saves everything, puts all '+totalBot+' bottle'+(totalBot!==1?'s':'')+' in the cellar, and marks the batch as bottled.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:18px">'
      +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);margin-bottom:10px;letter-spacing:2px">'+escHtml(b.name)+'</div>'
      +'<table style="width:100%;font-size:13px">'
      +'<tr><td style="color:var(--text3);padding:4px 0">Style</td><td style="color:var(--text2)">'+escHtml(recipe?recipe.style:'Custom')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Bottling Date</td><td style="color:var(--text2)">'+fmtDate(s.date)+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Original Gravity</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(b.og||'—')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Final Gravity</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(s.fg||'—')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">ABV</td><td style="color:var(--green2);font-family:var(--font-mono)">'+(s.abv||(b.og&&s.fg?calcABV(b.og,s.fg):'—'))+'%</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Bottles Filled</td><td style="color:var(--gold2);font-family:var(--font-display);font-size:16px">'+totalBot+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Sizes</td><td style="color:var(--text2);font-size:12px">'+sizeParts.join(' + ')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Closure</td><td style="color:var(--text2)">'+((s.closure||'crown')==='cork'?'🪵 Corks':'⭕ Crown caps')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Total Volume</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(totalMl/1000).toFixed(2)+' L</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Sweetness</td><td style="color:var(--text2)">'+(s.sweetness||'(unset)')+'</td></tr>'
      +'</table>'
      +(s.notes?'<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text2);font-style:italic">'+escHtml(s.notes)+'</div>':'')
      +'</div>';
  }
  return'';
}

function canAdvanceBottlingStep(stepId,s){
  if(stepId==='preflight')return Object.keys(s.preflight).every(function(k){return s.preflight[k];});
  if(stepId==='fg')return s.fg!=null&&s.fg>=0.98&&s.fg<=1.2;
  if(stepId==='sanitize')return s.sanitizerCompleted;
  if(stepId==='fill'){
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    return totalBot>0;
  }
  if(stepId==='label')return true;
  return true;
}

// Targeted UI updates that DON'T re-render the modal (preserves input focus while typing).
function updateBwNextButton(){
  var btn=document.getElementById('bw-next-btn');
  if(!btn)return;
  var step=BOTTLING_STEPS[bottlingWorkflowState.stepIdx];
  var ok=canAdvanceBottlingStep(step.id,bottlingWorkflowState);
  if(ok){btn.removeAttribute('disabled');btn.style.opacity='1';btn.style.cursor='pointer';}
  else{btn.setAttribute('disabled','disabled');btn.style.opacity='0.4';btn.style.cursor='not-allowed';}
}

function updateBwFG(val){
  var s=bottlingWorkflowState;
  var b=APP.batches.find(function(x){return x.id===s.batchId;});
  s.fg=parseFloat(val);if(isNaN(s.fg))s.fg=null;
  s.abv=(b&&b.og&&s.fg)?parseFloat(calcABV(b.og,s.fg)):null;
  var fgEl=document.getElementById('bw-fg-val');
  var abvEl=document.getElementById('bw-abv-val');
  if(fgEl)fgEl.textContent=s.fg?s.fg.toFixed(3):'—';
  if(abvEl)abvEl.textContent=(s.abv!=null?s.abv.toFixed(1):'—')+'%';
  updateBwNextButton();
}

function updateBwAbvOverride(val){
  var s=bottlingWorkflowState;
  var v=parseFloat(val);
  if(!isNaN(v))s.abv=v;
  else{
    var b=APP.batches.find(function(x){return x.id===s.batchId;});
    s.abv=(b&&b.og&&s.fg)?parseFloat(calcABV(b.og,s.fg)):null;
  }
  var abvEl=document.getElementById('bw-abv-val');
  if(abvEl)abvEl.textContent=(s.abv!=null?s.abv.toFixed(1):'—')+'%';
}

function updateBwFillCount(){
  var s=bottlingWorkflowState;
  var i500=document.getElementById('bw-count-500');
  var i750=document.getElementById('bw-count-750');
  var ics=document.getElementById('bw-custom-size');
  var icq=document.getElementById('bw-custom-qty');
  s.counts[500]=i500?(parseInt(i500.value)||0):0;
  s.counts[750]=i750?(parseInt(i750.value)||0):0;
  s.customSize=ics?(parseInt(ics.value)||0):0;
  s.customQty=icq?(parseInt(icq.value)||0):0;
  var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
  var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
  var totalEl=document.getElementById('bw-total-info');
  var cellarEl=document.getElementById('bw-cellar-info');
  if(totalEl){
    if(totalBot>0){totalEl.style.display='';totalEl.textContent='TOTAL: '+totalBot+' bottle'+(totalBot!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L';}
    else{totalEl.style.display='none';}
  }
  if(cellarEl){
    if(totalBot>0){cellarEl.style.display='';cellarEl.textContent='All '+totalBot+' bottle'+(totalBot!==1?'s':'')+' will land in the cellar by default. You can split into fridge/gifted/other from the Cellar view later.';}
    else{cellarEl.style.display='none';}
  }
  updateBwNextButton();
}

function bottlingNextStep(){
  if(bottlingWorkflowState.stepIdx<BOTTLING_STEPS.length-1){
    bottlingWorkflowState.stepIdx++;
    renderBottlingWorkflow();
  }
}

function bottlingPrevStep(){
  if(bottlingWorkflowState.stepIdx>0){
    bottlingWorkflowState.stepIdx--;
    renderBottlingWorkflow();
  }
}

// Deduct bottles (per size) and closures from tracked supplies, returning a
// cost breakdown for the batch economics card. Untracked items are listed
// with zero cost — packaging stock-keeping is optional.
function consumePackagingSupplies(countsBySize,totalBottles,closure){
  // Mirror batch-start behaviour: only actually deduct stock when the
  // "auto-deduct supplies" setting is on. Packaging cost is still computed for
  // the bottling record either way.
  var autoDeduct=!(APP.settings&&APP.settings.autoDeductSupplies===false);
  var items=[];var cost=0;
  function take(typeKey,qty,label){
    if(qty<=0)return;
    var sup=(APP.supplies||[]).find(function(x){return x.type===typeKey;});
    var price=sup?(parseFloat(sup.pricePerUnit)||0):0;
    if(sup&&autoDeduct){
      var have=parseFloat(sup.qty)||0;
      sup.qty=Math.max(0,have-qty);
      if(have<qty)toast('⚠ Supplies: only '+have+' '+label+' tracked — stock set to 0');
    }
    items.push({label:label,qty:qty,cost:Math.round(price*qty*100)/100,tracked:!!sup&&autoDeduct});
    cost+=price*qty;
  }
  Object.keys(countsBySize||{}).forEach(function(size){
    var n=parseInt(countsBySize[size])||0;
    var sz=parseInt(size);
    if(sz===750)take('bottle750',n,'750 ml bottles');
    else if(sz===500)take('bottle500',n,'500 ml bottles');
    else if(n>0)items.push({label:sz+' ml bottles',qty:n,cost:0,tracked:false});
  });
  take(closure==='cork'?'cork':'crowncap',totalBottles,closure==='cork'?'corks':'crown caps');
  return{items:items,cost:Math.round(cost*100)/100};
}

function finishBottlingWorkflow(){
  var s=bottlingWorkflowState;
  var b=APP.batches.find(function(x){return x.id===s.batchId;});
  // Build size counts map
  var countsAtBottling={};
  if(s.counts[500]>0)countsAtBottling[500]=s.counts[500];
  if(s.counts[750]>0)countsAtBottling[750]=s.counts[750];
  if(s.customSize>0&&s.customQty>0)countsAtBottling[s.customSize]=s.customQty;
  var total=Object.keys(countsAtBottling).reduce(function(s2,k){return s2+countsAtBottling[k];},0);
  // Packaging: deduct bottles + closures from supplies and price them.
  var packaging=consumePackagingSupplies(countsAtBottling,total,s.closure||'crown');
  // Locations: everything in cellar at first
  var locations={cellar:{},fridge:{},gifted:{},other:{}};
  Object.keys(countsAtBottling).forEach(function(size){
    locations.cellar[parseInt(size)]=countsAtBottling[size];
  });
  // Commit
  var existing=APP.bottling[s.batchId]||{};
  APP.bottling[s.batchId]={
    date:s.date||today(),
    bottleCount:total,
    bottlesAtBottling:total,
    countsAtBottling:countsAtBottling,
    bottleSizes:Object.keys(countsAtBottling).map(function(k){return parseInt(k);}).sort(function(a,c){return a-c;}),
    locations:locations,
    fg:s.fg,
    abv:s.abv||(b&&b.og&&s.fg?parseFloat(calcABV(b.og,s.fg)):null),
    sweetness:s.sweetness,
    notes:s.notes,
    closure:s.closure||'crown',
    packaging:packaging,
    gifts:existing.gifts||[]
  };
  closeModal();
  scheduleSave();
  toast('✦ Bottling complete · '+total+' bottle'+(total!==1?'s':'')+' in the cellar'+(packaging.cost>0?' · '+(APP.settings.currency||'€')+packaging.cost.toFixed(2)+' packaging':''));
  showView('cellar');
}
