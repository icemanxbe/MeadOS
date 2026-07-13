// MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
// PolyForm Noncommercial License 1.0.0 — see LICENSE.
// Cider mode built-in recipes — one per BJCP 2025 style category (see CIDER_STYLES
// in data-cider.js), matching the depth/format of BUILTIN_RECIPES() in
// data-recipes.js. Loaded BEFORE app.js.

function BUILTIN_CIDER_RECIPES(){var _r=[
{
id:'c1',name:'Common Cider',brandName:'Common Cider',style:'Common Cider',styleId:'common-cider',difficulty:'Beginner',brandColor:'#8ab030',
volume:5.0,ogTarget:1.055,fgTarget:1.005,abvTarget:6.5,fermentDays:21,ageDays:30,
minAgeDays:14,peakAgeDays:60,maxAgeDays:270,
tags:['Beginner-friendly','Refreshing','Culinary apples'],
description:'The honest, everyday cider — made from culinary (table) apples rather than heritage bittersweets. Lower tannin, brighter acid, refreshing and easy to drink young. Most of the world\'s cider is actually made this way.',
ingredients:[
{item:'Golden Delicious Apple Juice',amount:'4.0 L',notes:'Fresh-pressed or 100% juice, no preservatives/sorbate'},
{item:'Baldwin Apple Juice',amount:'1.0 L',notes:'Adds the acid backbone Golden Delicious lacks alone'},
{item:'Lallemand Nottingham Yeast',amount:'11 g (1 packet)',notes:'Neutral — lets the apple lead'},
{item:'Pectic Enzyme',amount:'2 g',notes:'Prevents a lasting pectin haze'},
{item:'Fermaid-O',amount:'2 g',notes:'Staggered addition — juice YAN varies by source, safer to assume it needs help'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening; skip if leaving dry'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite, never alone'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean with an oxygen-based cleaner (Chemipro OXI 4g/L warm water, 5 min), then sanitize (Chemipro SAN 2ml/L or Star San 1.5ml/L, 1-2 min contact). Combine both juices in the fermenter. Stir in the pectic enzyme. Take an OG reading. Sprinkle Nottingham on the surface. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Check for airlock activity. Add 1 g Fermaid-O. Stir gently to mix without losing CO2.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Take a gravity reading. Once you\'re at or past the 1/3 sugar break, add the remaining 1 g Fermaid-O — this is the last nutrient addition; after this point nutrients feed spoilage organisms instead of the yeast.'},
{day:14,title:'Rack & Check',desc:'Rack off the initial sediment to a clean vessel. Take a gravity reading — should be dropping steadily toward target.'},
{day:21,title:'Final Gravity',desc:'Two readings 2 days apart near target FG confirm fermentation is done. To leave dry, proceed to bottling. To back-sweeten, stabilise FIRST with both metabisulfite AND sorbate together, wait 24-48h, then sweeten to taste.'},
{day:30,title:'Bottle',desc:'Clean and sanitize bottles. Siphon in, leaving minimal headspace. Cap and label with batch name, date, and OG/FG.'},
{day:44,title:'First Tasting',desc:'Common Cider drinks well young — this style doesn\'t need long aging. Serve chilled.'}
],
notes:'The classic beginner cider. If you only have one juice on hand, a 100% culinary-apple juice works fine alone — the Baldwin addition is there specifically to add acid brightness a single mild apple lacks.'
},
{
id:'c2',name:'Heirloom Cider',brandName:'Heirloom',style:'Heirloom Cider',styleId:'heirloom-cider',difficulty:'Intermediate',brandColor:'#6a4020',
volume:5.0,ogTarget:1.065,fgTarget:1.008,abvTarget:7.5,fermentDays:28,ageDays:90,
minAgeDays:45,peakAgeDays:180,maxAgeDays:540,
tags:['Structured','Heritage apples','Real tannin'],
description:'Built from real cider-apple character rather than culinary fruit — Dabinett\'s dependable bittersweet backbone brightened with Golden Russet\'s unusual sugar-and-acid combination. Clean fermentation, no malolactic character, genuine structure.',
ingredients:[
{item:'Dabinett Apple Juice',amount:'3.5 L',notes:'The reliable bittersweet backbone'},
{item:'Golden Russet Apple Juice',amount:'1.5 L',notes:'High natural sugar AND acid — "the champagne of old-time cider apples"'},
{item:'Lallemand 71B Yeast',amount:'5 g (1 packet)',notes:'Softens malic acid, boosts fruity esters'},
{item:'Pectic Enzyme',amount:'2 g',notes:''},
{item:'Fermaid-O',amount:'2.5 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize equipment. Blend both juices in the fermenter. Stir in pectic enzyme. Take OG reading. Rehydrate 71B per packet instructions, pitch. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.25 g Fermaid-O once fermentation is visibly active.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Check gravity against the 1/3 break; add the remaining 1.25 g Fermaid-O at or before it.'},
{day:21,title:'Rack to Secondary',desc:'Rack off the lees to a clean vessel for a longer, quieter conditioning period — this style rewards the extra time.'},
{day:28,title:'Final Gravity',desc:'Confirm with two stable readings. Stabilise before back-sweetening if desired (metabisulfite + sorbate together).'},
{day:60,title:'Extended Conditioning',desc:'Let the tannin structure round out — Golden Russet\'s acid and Dabinett\'s tannin need real time together to integrate.'},
{day:90,title:'Bottle',desc:'Bottle once clear and settled.'},
{day:180,title:'First Tasting',desc:'This style is built for patience — the structure keeps developing well past the first few months.'}
],
notes:'If you can source true English cider apples locally, this is the recipe to showcase them. The blend ratio is a starting point — real cidermaking is about tasting your specific juice and adjusting toward balance.'
},
{
id:'c3',name:'English Cider',brandName:'English Cider',style:'English Cider',styleId:'english-cider',difficulty:'Intermediate',brandColor:'#754020',
volume:5.0,ogTarget:1.062,fgTarget:1.005,abvTarget:7.5,fermentDays:35,ageDays:120,
minAgeDays:60,peakAgeDays:240,maxAgeDays:730,
tags:['Full-bodied','Tannic','Traditional English'],
description:'Full-bodied and dry with a long tannic finish — built around Kingston Black, the one apple widely agreed to be "the perfect cider apple" for its rare balance of high tannin AND high acid in one fruit. Optionally allowed to undergo malolactic fermentation for the classic phenolic, buttery English character.',
ingredients:[
{item:'Kingston Black Apple Juice',amount:'3.5 L',notes:'The "king of cider apples" — genuinely capable of standing alone'},
{item:'Yarlington Mill Apple Juice',amount:'1.5 L',notes:'A blending bittersweet that rounds out the structure'},
{item:'Lallemand EC-1118 Yeast',amount:'5 g (1 packet)',notes:'Or Nottingham for a softer, less aggressive ferment'},
{item:'Pectic Enzyme',amount:'2 g',notes:''},
{item:'Fermaid-O',amount:'2.5 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Hold off if attempting malolactic fermentation — sulfite suppresses the bacteria that do it'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite when you do stabilise'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Blend juices, stir in pectic enzyme, take OG reading. Pitch yeast. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.25 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add the remaining 1.25 g Fermaid-O at or before the 1/3 sugar break.'},
{day:21,title:'Rack — Decide on MLF',desc:'Rack to secondary. Decide here: for the classic English phenolic/buttery character, do NOT add sulfite yet and let native or inoculated malolactic bacteria work over the following weeks. For a cleaner, brighter result, stabilise now instead and skip malolactic fermentation entirely.'},
{day:60,title:'Check Progress',desc:'If pursuing malolactic fermentation, taste for the characteristic softened acidity and buttery/spicy notes. Once satisfied (or after ~4-8 weeks), stabilise with metabisulfite and sorbate together to lock in the result.'},
{day:90,title:'Final Gravity & Clarity',desc:'Confirm gravity is stable. Cold-crash or allow more time to clear if needed.'},
{day:120,title:'Bottle',desc:'Bottle once clear. This style ages exceptionally well — don\'t rush it.'},
{day:240,title:'First Tasting',desc:'Full-bodied, dry, long tannic finish. Continues improving for a year or more.'}
],
notes:'Malolactic fermentation is optional and genuinely changes the character — try a small side batch with it and one without to learn your own preference before committing a full batch either way.'
},
{
id:'c4',name:'French Cider',brandName:'French Cider',style:'French Cider',styleId:'french-cider',difficulty:'Advanced',brandColor:'#a87838',
volume:5.0,ogTarget:1.055,fgTarget:1.012,abvTarget:4.5,fermentDays:60,ageDays:60,
minAgeDays:30,peakAgeDays:120,maxAgeDays:365,
tags:['Sweet','Low-ABV','Slow ferment'],
description:'Medium-to-sweet, full-bodied and rich, with a background phenolic or farmyard character — the traditional low-alcohol style built around a naturally slow, cool fermentation rather than back-sweetening a fully dry cider.',
ingredients:[
{item:'Dabinett or Michelin Apple Juice',amount:'4.0 L',notes:'A bittersweet base carries this style'},
{item:'Sweet Coppin Apple Juice',amount:'1.0 L',notes:'Rounds and softens'},
{item:'Pectin Methylesterase (PME) / Keeving Enzyme',amount:'per product instructions',notes:'NOT the same as regular pectic enzyme — regular pectic enzyme actively breaks down the pectin a keeve needs and will prevent it from forming'},
{item:'Calcium Chloride',amount:'per product instructions',notes:'Reacts with the de-esterified pectin to form the floating gel cap ("chapeau brun") — dose alongside your PME product\'s own guidance; apple mineral content varies too much for one fixed number to be honest'},
{item:'Wild/Native Yeast',amount:'—',notes:'Traditional approach: no yeast added, relying on the juice\'s own wild population — or pitch a light dose for a more reliable result (see notes)'},
{item:'Potassium Metabisulfite',amount:'0.3 g',notes:'A light initial dose (lower than usual) to select against the worst wild organisms while leaving fermentation-capable yeast'}
],
steps:[
{day:0,title:'Press, Keeve, Don\'t Pitch Yet',desc:'Combine the juice. Add a light initial sulfite dose, then the calcium chloride and PME/keeving enzyme per the product\'s own instructions — NOT regular pectic enzyme, which actively works against the keeve forming. Take an OG reading. Do not pitch yeast yet.'},
{day:1,title:'Cold Settle — Watch for the Cap',desc:'Keep it cold (ideally 4-10°C) and completely undisturbed for 24-72+ hours. A gelatinous brown layer (the "chapeau brun") should rise and separate the clear juice below it from the sediment at the very bottom. This is the genuinely fussy part of keeving — apple blend, temperature and timing all affect whether it forms cleanly.'},
{day:3,title:'Rack the Keeve (or Don\'t — Both Are Fine)',desc:'If a cap formed: rack ONLY the clear middle layer into the fermenter, leaving the cap and bottom sediment behind — that middle layer is now nutrient-depleted, which is the whole mechanism. If no clean cap formed (common, especially on a first attempt): nothing is ruined, just rack normally and proceed as a standard low-nutrient cider from here — see notes.'},
{day:4,title:'Pitch & Ferment Cool',desc:'Pitch the wild population (or a light measured dose if you want more reliability). Do NOT add nutrient — nutrient scarcity is what arrests fermentation naturally at a sweet-to-medium point instead of running to dry.'},
{day:30,title:'Progress Check',desc:'Take a gravity reading. This ferments very slowly and may take months — a real keeve gradually loses steam as nutrients run out rather than stopping abruptly.'},
{day:60,title:'Bottle While Still Gently Active',desc:'Once gravity is creeping down slowly (not fully flat) at a sweet-to-medium level you like, bottle now, while that trace activity is still present — that\'s what builds natural light carbonation. Don\'t stabilise, and don\'t use the Carbonation Calculator here: there\'s no separate measured priming dose in this method, you\'re relying on the keeve\'s own dying-down fermentation. Keep a clear PET tester bottle and check it every few days; if pressure builds past a gentle pétillance, refrigerate promptly to slow things down. For precise, predictable control instead, stop at any point: stabilise normally (sorbate + metabisulfite) and bottle still, or ferment fully out and prime a separate measured dose with the Carbonation Calculator.'}
],
notes:'This is the most traditional and least controllable style here. A real keeve traps nitrogen in a floating pectin-calcium gel (the "chapeau brun"), starving the racked juice of nutrients so fermentation runs out of steam naturally at a sweet-to-medium gravity instead of finishing dry — and bottling while that trace fermentation is still gently active is what carbonates it lightly, on its own, with no priming sugar needed. It\'s genuinely fussy: the cap often fails to form cleanly, especially on a first attempt, with the wrong apple blend, or if it\'s too warm during the settling stage. None of that ruins the batch — it just becomes a normal cider from that point, which you can ferment out, stabilise, and bottle still (or backsweeten and prime separately) instead. If reliability matters more than authenticity, skip the keeving steps entirely: pitch a light dose of wine yeast, ferment it fully out, then stop and stabilise like Method 1 in the Sparkling & Carbonated Cider guide.'
},
{
id:'c5',name:'Spanish Cider (Sidra)',brandName:'Sidra',style:'Spanish Cider',styleId:'spanish-cider',difficulty:'Advanced',brandColor:'#c8a850',
volume:5.0,ogTarget:1.048,fgTarget:1.000,abvTarget:5.5,fermentDays:45,ageDays:30,
minAgeDays:14,peakAgeDays:60,maxAgeDays:270,
tags:['Rustic','Dry','Wild character'],
description:'Dry, fresh, and rustic with bright acidity and light-to-moderate wild/acetic notes — an earthy, farmhouse impression traditionally achieved by open, uncontrolled fermentation in large vessels.',
ingredients:[
{item:'Mixed Culinary Apple Juice',amount:'5.0 L',notes:'A blend of whatever sharp/tart apples are available — Sidra prizes variety over precision'},
{item:'Wild/Native Yeast or Lallemand 71B',amount:'5 g',notes:'For a more reliable result, pitch a light dose of 71B instead of relying entirely on wild yeast'},
{item:'Potassium Metabisulfite',amount:'0.2 g',notes:'A very light dose, or none at all, to preserve the traditional wild character'}
],
steps:[
{day:0,title:'Brew Day',desc:'Minimal sanitation, in keeping with the rustic tradition — though basic cleanliness still matters. Take an OG reading. Pitch lightly or leave to wild fermentation. Cover loosely rather than a tight airlock seal, matching the traditional open-vessel approach.'},
{day:14,title:'Check Progress',desc:'Fermentation should be visibly active. A degree of surface film or light funk is traditional and expected, not a fault.'},
{day:30,title:'Rack',desc:'Rack off sediment. Gravity should be near or at 1.000 — this style ferments fully dry.'},
{day:45,title:'Bottle',desc:'Bottle once stable and reasonably clear — Sidra is traditionally served with a degree of natural haze, so don\'t over-clarify. Bottle it still: real Asturian sidra natural has essentially no dissolved carbonation, unlike French Cider\'s keeved style.'}
],
notes:'This is the most rustic style in the set. If you want reliability over authenticity, treat it like a Common Cider instead — a light 71B pitch and a normal airlock will still get you something recognisably in the style, just cleaner than tradition dictates. Real sidra natural is served via "escanciado" — poured from a bottle held high overhead into a wide glass held low, which briefly aerates and awakens the aroma of what is otherwise a genuinely still cider. Don\'t mistake the flatness for something gone wrong; it\'s the point.'
},
{
id:'c6',name:'New England Cider',brandName:'New England',style:'New England Cider',styleId:'new-england-cider',difficulty:'Intermediate',brandColor:'#7a4818',
volume:5.0,ogTarget:1.080,fgTarget:1.005,abvTarget:10,fermentDays:35,ageDays:90,
minAgeDays:45,peakAgeDays:150,maxAgeDays:540,
tags:['Strong','Adjuncts','Historic American'],
description:'A substantial, historic American style built up with adjuncts — raisins are traditional — sometimes barrel-aged. Higher alcohol and real body distinguish it from a standard cider.',
ingredients:[
{item:'Baldwin Apple Juice',amount:'4.5 L',notes:'The classic New England cider apple'},
{item:'Raisins',amount:'250 g',notes:'Chopped or whole — the traditional adjunct, adds body and a raisin-y depth'},
{item:'Brown Sugar',amount:'200 g',notes:'Boosts OG to the strong-cider range'},
{item:'Lallemand EC-1118 Yeast',amount:'5 g (1 packet)',notes:'Needed for the higher ABV target'},
{item:'Fermaid-O',amount:'3 g',notes:'Staggered addition — higher OG needs more nutrient support'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Combine apple juice, chopped raisins, and dissolved brown sugar in the fermenter. Take OG reading. Rehydrate and pitch EC-1118. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.5 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add the remaining 1.5 g Fermaid-O at or before the break.'},
{day:21,title:'Rack Off Raisins',desc:'Rack to a clean vessel, leaving the spent raisins and lees behind.'},
{day:35,title:'Final Gravity',desc:'Confirm with two stable readings. Stabilise before back-sweetening if desired.'},
{day:60,title:'Optional: Oak/Barrel Character',desc:'For the traditional barrel-aged version, add oak cubes (medium toast, ~15-20g) in secondary for 2-6 weeks, tasting weekly.'},
{day:90,title:'Bottle',desc:'Bottle once clear and stable.'},
{day:150,title:'First Tasting',desc:'Substantial and warming — pairs well with the same season it\'s named for.'}
],
notes:'The raisins are doing double duty — fermentable sugar and a distinct flavor layer. Golden raisins give a lighter result; dark raisins push it toward a more sherry-like character.'
},
{
id:'c7',name:'Applewine',brandName:'Applewine',style:'Applewine',styleId:'applewine',difficulty:'Intermediate',brandColor:'#c8c060',
volume:5.0,ogTarget:1.085,fgTarget:1.005,abvTarget:10.5,fermentDays:35,ageDays:120,
minAgeDays:60,peakAgeDays:270,maxAgeDays:730,
tags:['Wine-like','Dry','High-ABV'],
description:'Presents like a dry white wine rather than a cider — fruity and floral, balanced, with low astringency and bitterness. A higher-gravity, wine-yeast-driven style that rewards real cellar time.',
ingredients:[
{item:'Golden Russet Apple Juice',amount:'4.0 L',notes:'Unusually high natural sugar carries the gravity without added sugar'},
{item:"Ashmead's Kernel Apple Juice",amount:'1.0 L',notes:'Adds citrus-forward complexity'},
{item:'Lallemand EC-1118 Yeast',amount:'5 g (1 packet)',notes:''},
{item:'Fermaid-O',amount:'3 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'At racking and before bottling'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Only needed if back-sweetening'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Blend juices, take OG reading, pitch EC-1118. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.5 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add remaining 1.5 g Fermaid-O.'},
{day:21,title:'Rack to Secondary',desc:'Rack off the lees. Add 0.25 g metabisulfite to guard against oxidation during the long conditioning ahead.'},
{day:35,title:'Final Gravity',desc:'Confirm with two stable readings.'},
{day:90,title:'Extended Conditioning',desc:'Like a real dry white wine, this style benefits from months of quiet aging to round out.'},
{day:120,title:'Bottle',desc:'Bottle once clear and settled.'},
{day:270,title:'First Tasting',desc:'Treat it like a wine — serve chilled, in a wine glass.'}
],
notes:'The name is literal — this is meant to taste like a wine made from apples, not a cider. A neutral, high-attenuating wine yeast and real aging time are what get you there.'
},
{
id:'c8',name:'Ice Cider',brandName:'Ice Cider',style:'Ice Cider',styleId:'ice-cider',difficulty:'Advanced',brandColor:'#d8b878',
volume:3.0,ogTarget:1.150,fgTarget:1.060,abvTarget:10,fermentDays:60,ageDays:180,
minAgeDays:90,peakAgeDays:365,maxAgeDays:1095,
tags:['Dessert-style','Concentrated','Sweet'],
description:'A dessert-style cider from concentrated juice — smooth, rich and sweet like a dessert wine, with balancing acidity. Traditionally made by freeze-concentrating juice (cryo-concentration) rather than boiling it down, preserving fresh apple aromatics.',
ingredients:[
{item:'Freeze-Concentrated Apple Juice',amount:'3.0 L',notes:'Freeze a larger volume of juice, then decant/press off the concentrated unfrozen portion — water freezes first, leaving sugar and flavor behind'},
{item:'Golden Russet Apple Juice (unconcentrated)',amount:'0.5 L',notes:'Adds acid brightness to balance the concentrate\'s sweetness'},
{item:'Lallemand EC-1118 Yeast',amount:'5 g (1 packet)',notes:'Needed to handle both the high gravity and the eventual high alcohol tolerance required'},
{item:'Fermaid-O',amount:'3 g',notes:'Staggered addition — very high OG needs real nutrient support'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'To stop fermentation at the target residual sweetness'}
],
steps:[
{day:0,title:'Concentrate the Juice',desc:'Freeze several times the target volume of fresh juice solid. Thaw partially and collect the first, most concentrated liquid that runs off — this is your ice cider must. Discard the icy, dilute remainder (or use it for a Common Cider).'},
{day:1,title:'Brew Day',desc:'Clean and sanitize. Take an OG reading on the concentrated must — expect it to be very high. Rehydrate and pitch EC-1118. Seal with airlock.'},
{day:2,title:'First Nutrient',desc:'Add 1.5 g Fermaid-O.'},
{day:10,title:'1/3 Sugar Break Nutrient',desc:'This high-gravity ferment takes longer to reach the break than a normal-strength cider — check gravity regularly and add the remaining 1.5 g Fermaid-O at or before it.'},
{day:60,title:'Monitor Toward Target FG',desc:'This style is meant to STOP well short of fully dry, with real residual sugar. Taste and check gravity regularly as it approaches the target FG.'},
{day:60,title:'Stop Fermentation',desc:'Once at the target sweetness, stabilise promptly with metabisulfite to halt further fermentation and lock in the residual sugar.'},
{day:180,title:'Bottle',desc:'Bottle in smaller dessert-wine-style bottles — this is a sipping cider, not a session one.'},
{day:365,title:'First Tasting',desc:'Serve chilled in small pours, like an ice wine.'}
],
notes:'Volume is deliberately smaller here (3 L) since freeze-concentration reduces a much larger starting volume of juice down. A domestic freezer is genuinely capable of this — no special equipment required, just patience.'
},
{
id:'c9',name:'Fire Cider',brandName:'Fire Cider',style:'Fire Cider',styleId:'fire-cider',difficulty:'Advanced',brandColor:'#8a4818',
volume:5.0,ogTarget:1.150,fgTarget:1.050,abvTarget:12,fermentDays:45,ageDays:180,
minAgeDays:90,peakAgeDays:365,maxAgeDays:1095,
tags:['Sweet','Caramelized','Dark'],
description:'A dark gold to brown cider with a very sweet, caramelized, maple-sugar-like impression — cider\'s answer to a bochet, built around a real caramelization step rather than plain concentrated juice.',
ingredients:[
{item:'Golden Delicious or Mixed Apple Juice',amount:'4.0 L',notes:'A neutral base lets the caramelization lead'},
{item:'Maple Syrup (dark/grade B)',amount:'1.0 kg',notes:'Caramelized character and real fermentable sugar — the heart of this style'},
{item:'Lallemand EC-1118 Yeast',amount:'5 g (1 packet)',notes:''},
{item:'Fermaid-O',amount:'3 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'To stop fermentation at the target residual sweetness'}
],
steps:[
{day:0,title:'Caramelize & Brew Day',desc:'Gently simmer the maple syrup in a heavy pot until it darkens further and takes on a deeper caramel aroma — watch closely, it burns fast once it starts. Cool, then combine with the apple juice in the fermenter. Clean and sanitize equipment. Take an OG reading — expect it very high. Pitch EC-1118. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.5 g Fermaid-O.'},
{day:10,title:'1/3 Sugar Break Nutrient',desc:'This high-gravity must ferments slowly — check gravity regularly and add the remaining 1.5 g Fermaid-O at or before the break.'},
{day:45,title:'Monitor Toward Target FG',desc:'Like Ice Cider, this style stops well short of dry. Taste and check gravity as it approaches target.'},
{day:45,title:'Stop Fermentation',desc:'Stabilise with metabisulfite once at the target sweetness.'},
{day:180,title:'Bottle',desc:'Bottle once clear.'},
{day:365,title:'First Tasting',desc:'Rich, sweet, caramel-forward — a sipping cider for cold weather.'}
],
notes:'Watch the caramelization step closely — maple syrup goes from perfectly caramelized to burnt in the space of a minute. Pull it the moment it smells deeply toasted rather than sharp.'
},
{
id:'c10',name:'Fruit Cider — Raspberry',brandName:'Raspberry Cider',style:'Fruit Cider',styleId:'fruit-cider',difficulty:'Beginner',brandColor:'#b83858',
volume:5.0,ogTarget:1.055,fgTarget:1.006,abvTarget:6.5,fermentDays:28,ageDays:45,
minAgeDays:21,peakAgeDays:90,maxAgeDays:300,
tags:['Fruity','Pink','Summer'],
description:'Apple juice and raspberries in real balance — both the apple character and the added fruit stay noticeable, complementary, and neither buries the other.',
ingredients:[
{item:'Golden Delicious or Mixed Apple Juice',amount:'4.5 L',notes:''},
{item:'Raspberries (frozen)',amount:'750 g',notes:'Added in secondary for the freshest fruit aroma — frozen breaks cell walls for better extraction'},
{item:'Lallemand 71B Yeast',amount:'5 g (1 packet)',notes:'Boosts fruity esters, softens acid — an excellent match for berry additions'},
{item:'Pectic Enzyme',amount:'2 g',notes:''},
{item:'Fermaid-O',amount:'2 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Combine apple juice and pectic enzyme in the fermenter. Take OG reading. Pitch 71B. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add remaining 1 g Fermaid-O at or before the break.'},
{day:14,title:'Rack onto Raspberries',desc:'Rack the cider onto the frozen (thawed) raspberries in a sanitized secondary vessel — this preserves fresh, "just-picked" fruit aroma better than fermenting the fruit in primary.'},
{day:21,title:'Check Fruit Character',desc:'Taste. Once the raspberry character is present but still balanced with the apple, rack off the fruit.'},
{day:28,title:'Final Gravity',desc:'Confirm gravity is stable. Stabilise before back-sweetening if desired.'},
{day:45,title:'Bottle',desc:'Bottle once clear.'},
{day:75,title:'First Tasting',desc:'Bright, fruity, refreshing — serve well chilled.'}
],
notes:'Swap raspberries for any berry or stone fruit at the same weight — the technique (secondary fruit addition, rack off once balanced) applies broadly across Fruit Cider variations.'
},
{
id:'c11',name:'Spiced Cider — Cinnamon & Clove',brandName:'Spiced Cider',style:'Spiced Cider',styleId:'spiced-cider',difficulty:'Beginner',brandColor:'#a86828',
volume:5.0,ogTarget:1.055,fgTarget:1.006,abvTarget:6.5,fermentDays:28,ageDays:45,
minAgeDays:21,peakAgeDays:90,maxAgeDays:300,
tags:['Warming','Autumn','Spiced'],
description:'Cinnamon and clove integrated with the cider rather than dominating it — a warm, autumnal glass. Do not attempt malolactic fermentation with this style; its spicy/buttery character would clash rather than complement.',
ingredients:[
{item:'Mixed Apple Juice',amount:'5.0 L',notes:''},
{item:'Lallemand Nottingham Yeast',amount:'11 g (1 packet)',notes:'Neutral base lets the spice lead'},
{item:'Cinnamon Sticks',amount:'2 sticks',notes:'Added at secondary'},
{item:'Whole Cloves',amount:'4-5 cloves',notes:'Potent — start low, taste often'},
{item:'Fermaid-O',amount:'2 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Take OG reading on the juice. Pitch Nottingham. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add remaining 1 g Fermaid-O.'},
{day:14,title:'Rack with Spices',desc:'Rack to secondary. Add cinnamon sticks and cloves in a sanitized muslin bag for easy removal.'},
{day:21,title:'Taste Test',desc:'Pull a small sample daily from here. Clove intensifies fast — remove the spice bag the moment it tastes right, even if earlier than planned.'},
{day:28,title:'Final Gravity',desc:'Confirm gravity is stable and all spice has been removed. Stabilise before back-sweetening if desired.'},
{day:45,title:'Bottle',desc:'Bottle once clear.'},
{day:75,title:'First Tasting',desc:'Serve warm or chilled — this style works well mulled too.'}
],
notes:'Clove is the one spice in most homebrewers\' racks that\'s genuinely easy to overdo — start with fewer than you think you need, since the flavor keeps extracting even after you\'d normally expect it to level off.'
},
{
id:'c12',name:'Experimental Cider — Dry-Hopped',brandName:'Hopped Cider',style:'Experimental Cider',styleId:'experimental-cider',difficulty:'Intermediate',brandColor:'#90a838',
volume:5.0,ogTarget:1.055,fgTarget:1.004,abvTarget:6.8,fermentDays:28,ageDays:30,
minAgeDays:14,peakAgeDays:60,maxAgeDays:180,
tags:['Modern','Hoppy','Experimental'],
description:'A modern crossover style: dry-hopping a clean cider with fruity, citrusy hops (rather than dank/resinous ones) for aroma without adding bitterness. The cider character must stay present — this isn\'t a beer with apple juice in it.',
ingredients:[
{item:'Mixed Apple Juice',amount:'5.0 L',notes:'A clean, moderate-acid juice lets the hop aroma show clearly'},
{item:'Lallemand Nottingham Yeast',amount:'11 g (1 packet)',notes:''},
{item:'Citra or Cascade Hop Pellets',amount:'15 g',notes:'Fruity/citrusy varieties — avoid dank or resinous hops, which clash with apple'},
{item:'Fermaid-O',amount:'2 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'Stabilise before back-sweetening'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Take OG reading. Pitch Nottingham. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add remaining 1 g Fermaid-O.'},
{day:14,title:'Rack & Dry-Hop',desc:'Rack to secondary. Add hop pellets in a sanitized hop bag or loose. Hop aroma fades over time, so keep contact to 3-5 days.'},
{day:19,title:'Remove Hops',desc:'Strain or rack off the hops — extended contact past this point risks grassy, vegetal off-flavors rather than more aroma.'},
{day:28,title:'Final Gravity',desc:'Confirm gravity is stable. Stabilise before back-sweetening if desired.'},
{day:30,title:'Bottle',desc:'Bottle promptly — hop aroma fades with time even in the bottle, so this style is best enjoyed young.'},
{day:44,title:'First Tasting',desc:'Bright citrus/tropical hop aroma over a clean apple base. Drink young for the freshest hop character.'}
],
notes:'This is the one style here built to be finished and enjoyed quickly — unlike most ciders, dry-hop aroma actively degrades with age, so don\'t cellar this one.'
},
{
id:'c13',name:'Traditional Perry',brandName:'Perry',style:'Perry',styleId:'perry',difficulty:'Intermediate',brandColor:'#a86840',
volume:5.0,ogTarget:1.055,fgTarget:1.005,abvTarget:6.5,fermentDays:35,ageDays:90,
minAgeDays:45,peakAgeDays:150,maxAgeDays:450,
tags:['Pear','Traditional','Delicate'],
description:'Fermented pear juice — its own distinct thing, not just "cider made with pears." Perry pears carry their own tannin/acid classification and their own hazards: unlike apple cider, malolactic fermentation must be AVOIDED here, since pear\'s citric acid converts to acetic acid (vinegar) rather than cider\'s buttery lactic-acid result.',
ingredients:[
{item:'Barland Perry Pear Juice',amount:'3.5 L',notes:'A classic bittersharp perry pear'},
{item:'Blakeney Red Perry Pear Juice',amount:'1.5 L',notes:'Gentler, more approachable — softens Barland\'s intensity'},
{item:'Lallemand 71B or EC-1118 Yeast',amount:'5 g (1 packet)',notes:'71B for a softer, fruitier result; EC-1118 for a cleaner, more neutral one'},
{item:'Pectic Enzyme',amount:'2 g',notes:'Pear pectin haze is notoriously stubborn — don\'t skip this'},
{item:'Fermaid-O',amount:'2.5 g',notes:'Staggered addition'},
{item:'Potassium Metabisulfite',amount:'0.5 g',notes:'IMPORTANT: add promptly after fermentation to suppress malolactic bacteria — do not let this style sit unsulfited the way an English Cider might'},
{item:'Potassium Sorbate',amount:'2 g',notes:'Use WITH metabisulfite'}
],
steps:[
{day:0,title:'Brew Day',desc:'Clean and sanitize. Blend pear juices, stir in pectic enzyme, take OG reading. Pitch yeast. Seal with airlock.'},
{day:1,title:'First Nutrient',desc:'Add 1.25 g Fermaid-O.'},
{day:7,title:'1/3 Sugar Break Nutrient',desc:'Add remaining 1.25 g Fermaid-O at or before the break.'},
{day:21,title:'Rack & Stabilise Promptly',desc:'Rack off the lees. Unlike English Cider, add metabisulfite here promptly rather than waiting — perry left unsulfited risks unwanted malolactic activity converting its citric acid to vinegar-like acetic acid instead of the buttery result apple cider gets.'},
{day:35,title:'Final Gravity',desc:'Confirm gravity is stable.'},
{day:60,title:'Extended Conditioning',desc:'Perry pear haze is genuinely stubborn — allow extra time to clear, beyond what a typical cider needs.'},
{day:90,title:'Bottle',desc:'Bottle once clear.'},
{day:150,title:'First Tasting',desc:'Delicate, pear-forward, distinct from cider despite the similar process.'}
],
notes:'The single most important thing to know about perry: it is NOT "apple cider technique with pears swapped in." The MLF risk is real and specific to perry\'s citric acid — sulfite promptly, don\'t leave it as an open question the way you might with an English-style apple cider.'
}
];
_r.forEach(function(r){r.beverageType='cider';});
return _r;}
