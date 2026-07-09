// MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
// PolyForm Noncommercial License 1.0.0 — see LICENSE.
// Reference library data (honey, yeast, nutrients) — split out of app.js for easier editing. Loaded as a plain script
// BEFORE app.js (shared global scope), so app.js sees these as globals.

var HONEY_TYPES=[
  'Wildflower','Orange Blossom','Buckwheat','Heather','Forest','Acacia',
  'Linden','Clover','Manuka','Chestnut','Lavender','Eucalyptus',
  'Tupelo','Sage','Sidr',
  'Sunflower','Rapeseed','Thyme',
  'Coriander','Lemon Blossom','Rosemary','Coffee Blossom',
  'Himalayan Balsam','Mountain','Pine Honeydew','Comb',
  'Mixed','Other'
];

var HONEY_SEASONS={
  'Wildflower':     {months:[5,6,7,8,9],region:'local'},
  'Orange Blossom': {months:[2,3,4],region:'mediterranean'},
  'Buckwheat':      {months:[7,8,9],region:'local'},
  'Heather':        {months:[8,9],region:'local'},
  'Forest':         {months:[7,8],region:'local'},
  'Acacia':         {months:[5,6],region:'local'},
  'Linden':         {months:[6,7],region:'local'},
  'Clover':         {months:[6,7,8],region:'local'},
  'Manuka':         {months:[10,11,12],region:'southern'},
  'Chestnut':       {months:[6,7],region:'local'},
  'Lavender':       {months:[7,8],region:'mediterranean'},
  'Eucalyptus':     {months:[5,6,7,8],region:'mediterranean'},
  'Sunflower':      {months:[7,8],region:'local'},
  'Rapeseed':       {months:[4,5],region:'local'},
  'Thyme':          {months:[5,6],region:'mediterranean'},
  'Coriander':      {months:[6,7,8],region:'local'},
  'Lemon Blossom':  {months:[3,4,5],region:'mediterranean'},
  'Rosemary':       {months:[2,3,4],region:'mediterranean'},
  'Coffee Blossom': {months:[4,5,6],region:'tropical'},
  'Himalayan Balsam':{months:[8,9],region:'local'},
  'Mountain':       {months:[6,7,8,9],region:'local'},
  'Pine Honeydew':  {months:[8,9,10],region:'mediterranean'},
  'Comb':           {months:[8,9,10],region:'global'},
  'Mixed':          {months:[],region:null},
  'Other':          {months:[],region:null}
};

var HONEY_PROFILES={
  'Tupelo':{color:'#e0c060',intensity:'light',avail:['us'],substituteEU:'Acacia — similarly delicate, floral and very slow to crystallize; the honey most mead-makers reach for when real Tupelo isn\'t available.',tech:{fgRatio:1.54,fructoseRisk:'critical',fructophilic:true,crystallises:'very_slow',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Premium Southern-US varietal. Buttery and complex with jasmine and cinnamon notes, very sweet on the tongue. Pale gold-green.',pairing:'Small-batch traditionals where the honey is the star; superb as a backsweetener.',notes:'CRITICAL fructose risk (F:G ~1.54) — fructophilic yeast (K1-V1116, BC-S103, UVAFERM 43) is mandatory or it stalls at the 1/3 break. Rare, seasonal, expensive.',
    details:{
      origin:'Ogeechee Tupelo (Nyssa ogeche) along the river swamps of the Florida Panhandle and southern Georgia. Harvested in a narrow window each spring.',
      season:'Brief spring bloom (April-May) only',
      crystallization:'Almost never — its very high fructose keeps it liquid indefinitely, like acacia.',
      composition:'F:G ratio ~1.54 — second only to acacia among common varieties. The dominant fructose is exactly why standard strains stall.',
      agingPotential:'Good — the buttery, floral complexity holds and rounds with time.',
      bestStyles:['Showcase traditional mead','Backsweetening a drier mead','Delicate session meads'],
      pricePoint:'Premium — one of the most expensive honeys; counterfeits and blends are common, so buy single-origin.',
      tips:[
        {title:'Fructophilic yeast is not optional',body:'K1-V1116, Fermentis BC-S103, or UVAFERM 43. A normal glucose-first strain (D47, US-05) will eat the glucose, hit the fructose-heavy remainder, and stall around the 1/3 sugar break.'},
        {title:'Consider holding some back to backsweeten',body:'It is so sweet and aromatic on the tongue that reserving a portion to add after stabilising lets the tupelo character shine without paying to ferment all of it away.'}
      ],
      pairings:[
        {category:'Cheese',items:'Triple-cream brie, mascarpone'},
        {category:'Dessert',items:'Vanilla custard, pound cake, fresh peaches'}
      ],
      history:'A cult honey of the American South, romanticised in film and song. Genuine single-origin tupelo is geographically tiny in supply, which is why imitation is rife.',
      similarTo:['Acacia','Orange Blossom'],
      commonMistakes:[
        'Using a non-fructophilic yeast — the #1 cause of a stuck tupelo must',
        'Fermenting every gram of it dry — you lose the trait you paid a premium for',
        'Buying cheap "tupelo" — almost always blended or counterfeit'
      ]
    }
  },
  'Sage':{color:'#d8c070',intensity:'light',tech:{fgRatio:1.40,fructoseRisk:'high',fructophilic:false,crystallises:'very_slow',yanOffset:0,phAdjust:0,sugarPotential:41},profile:'Light, mild, delicately sweet. Water-white to pale gold. One of the slowest honeys to granulate.',pairing:'Semi-sweet traditionals and light melomels where you want a clean, gentle base.',notes:'High fructose (F:G ~1.40) — monitor gravity at the 1/3 break. Unlike acacia it can finish with a robust non-fructophilic strain such as EC-1118, but watch for stalling.',
    details:{
      origin:'Various Salvia species — Black Sage (S. mellifera) and White Sage (S. apiana) in coastal California and the Sierra Nevada, Purple Sage across Texas and the Southwest.',
      season:'Spring to early summer',
      crystallization:'Very slow — after acacia and tupelo, one of the slowest to set.',
      composition:'F:G ~1.40 — high-fructose zone, so a careful nutrient/temperature regime around the 1/3 break pays off.',
      agingPotential:'Good — its mildness suits patient, clean ageing.',
      bestStyles:['Semi-sweet traditional','Light floral melomel','Session mead'],
      pricePoint:'Mid-to-premium · mostly a US domestic specialty',
      tips:[
        {title:'A forgiving high-fructose honey',body:'It sits in the high-risk band but, unlike acacia, robust strains like EC-1118 will usually finish it — just keep nutrients well-timed and don\'t let the temperature swing.'},
        {title:'Let it lead',body:'Its character is gentle; heavy fruit or spice will bury it. Best as a near-traditional or a whisper-light melomel.'}
      ],
      pairings:[
        {category:'Cheese',items:'Fresh ricotta, young chèvre'},
        {category:'Fruit',items:'Apricot, white peach, melon'}
      ],
      history:'A classic California honey prized by American beekeepers for its pale colour and shelf-stable, slow-crystallising nature.',
      similarTo:['Acacia','Clover'],
      commonMistakes:[
        'Overwhelming it with adjuncts — its subtlety is the point',
        'Ignoring the high F:G — it can still stall if nutrients/temperature are sloppy'
      ]
    }
  },
  'Sidr':{color:'#9a5a28',intensity:'bold',tech:{fgRatio:1.25,fructoseRisk:'medium',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:41},profile:'One of the world\'s most prized honeys. Rich caramel and butterscotch up front, then wood, warm spice and dried fruit with a tangy, slightly astringent finish.',pairing:'Small-batch showcase traditionals — its complexity stands alone; fruit or spice would bury it.',notes:'Moderate F:G (~1.25) — no special fermentation concerns. The natural astringency softens with conditioning; give it longer than lighter honeys. Counterfeits are rampant — source single-origin.',
    details:{
      origin:'Wild Sidr / jujube tree (Ziziphus spina-christi). The benchmark comes from the remote valleys of Wadi Do\'an in Yemen\'s Hadhramout; also Saudi Arabia, Pakistan, India and Greece.',
      season:'Once a year, during the brief winter flowering',
      crystallization:'Moderate, often slow — depends on origin',
      composition:'F:G ~1.25 — balanced enough for any strain.',
      agingPotential:'Excellent — the astringency and complexity integrate beautifully over a year or more.',
      bestStyles:['Showcase traditional mead','Backsweetening a complex blend','Curiosity / special-occasion batch'],
      pricePoint:'Among the most expensive honeys in the world; verified provenance is essential',
      tips:[
        {title:'Let the honey be the whole show',body:'Sidr is too complex and costly to pair with loud adjuncts. A clean traditional, lightly nutrient-managed, with a neutral-to-characterful strain (EC-1118, D47) is the way.'},
        {title:'Plan for patience',body:'The tangy, astringent finish reads grippy when young and rounds into mouthfeel with months of conditioning. Don\'t judge it early.'},
        {title:'Blend it to stretch it',body:'A proven trick: use Sidr as a backsweetener or as part of a blend with a milder base honey so a small, costly amount carries a whole batch.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged Gouda, Manchego'},
        {category:'Dessert',items:'Date pudding, dried figs, baklava'}
      ],
      history:'Held in extraordinary cultural regard across the Arabian Peninsula — in the Gulf, prize racing camels are fed Sidr honey alongside dates. Its price and prestige make it the most counterfeited honey on the market.',
      similarTo:['Buckwheat','Chestnut'],
      commonMistakes:[
        'Buying unverified "Sidr" — most cheap product is blended or fake',
        'Drowning it in fruit/spice — you paid for the honey, taste the honey',
        'Drinking it too young before the astringency has rounded out'
      ]
    }
  },
  'Wildflower':{color:'#c9a350',intensity:'medium',tech:{fgRatio:1.2,fructoseRisk:'medium',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'The default mixed-floral honey. Mild, balanced, slightly fruity. Whatever bees foraged on near the apiary.',pairing:'Universal — works for every style. Default for traditionals.',notes:'Use this when the recipe says "honey" without specifying. Affordable, available, and forgiving.',
    details:{
      origin:'Mixed nectar from whichever wildflowers were blooming near the hive. Composition varies by apiary location and season.',
      season:'Late spring through summer (May-September)',
      crystallization:'Variable — usually 3-6 months. Often partially crystallized when bought.',
      composition:'Roughly 38-42% fructose, 30-34% glucose. Typical pH 3.5-4.5.',
      agingPotential:'Good — 1-3 years. The honey character mellows but does not transform dramatically.',
      bestStyles:['Traditional show mead','Light melomels','Cyser','First-time brews'],
      pricePoint:'€8-14/kg · local wildflower is usually the most affordable honey around',
      tips:[
        {title:'Source matters more than the label says',body:'"Wildflower" from a northern apiary in May tastes nothing like wildflower from a southern one in August. Try local first — supports beekeepers, freshest product, traceable.'},
        {title:'It is fine to mix wildflower across vintages',body:'You will get a more consistent flavor over multiple batches by blending several jars together before pitching.'},
        {title:'Watch for crystallization in cooler months',body:'Warm the jar in 35-40°C water bath for 20-30 min to liquefy — do not microwave (destroys aromatics).'}
      ],
      pairings:[
        {category:'Cheese',items:'Brie, fresh chèvre, young Gouda, Comté'},
        {category:'Charcuterie',items:'Saucisson, prosciutto, pâté de campagne'},
        {category:'Fruit',items:'Pears, figs, apples, stone fruit'},
        {category:'Dessert',items:'Honey cake, baklava, ricotta-honey toast'}
      ],
      history:'The original mead honey. Before modern monofloral honeys, every mead was wildflower-based — bees just foraged where they could. Most homebrewing recipes still assume wildflower as the default.',
      similarTo:['Mixed','Clover'],
      commonMistakes:[
        'Buying supermarket "honey" labeled wildflower — often imported, blended, ultrafiltered, low character',
        'Expecting consistent flavor between brands or batches — wildflower IS variable',
        'Pairing with delicate adjuncts (rose, elderflower) — the floral character of wildflower can clash'
      ]
    }
  },
  'Orange Blossom':{color:'#d4a040',intensity:'light',tech:{fgRatio:1.2,fructoseRisk:'medium',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:41},profile:'Citrusy, floral, distinct orange-zest aroma. Light amber.',pairing:'Excellent in lighter meads — traditionals, cyser, melomel with citrus/stone fruit.',notes:'Pairs beautifully with peach (r15) or as a substitute base in cyser (r10). Lighter character than wildflower.',
    details:{
      origin:'Apis mellifera foraging in citrus orchards — typically orange (Citrus sinensis), sometimes lemon or grapefruit groves. Major producers: Spain, Italy, Florida, Morocco, Greece.',
      season:'Late winter to early spring (Feb-April), when citrus trees bloom',
      crystallization:'Slow — stays liquid 8-12 months. High fructose content.',
      composition:'~40% fructose, ~30% glucose. Light amber color, distinctly aromatic.',
      agingPotential:'Moderate — 1-2 years. The orange-blossom aroma fades over time, so drink younger than wildflower.',
      bestStyles:['Light traditionals','Citrus/stone-fruit melomels','Cyser','Floral metheglins'],
      pricePoint:'€14-22/kg · imported, premium tier',
      tips:[
        {title:'The aroma is volatile — protect it',body:'Do not heat above 35°C during the must prep. The orange-blossom esters evaporate easily; gentle dissolution preserves them.'},
        {title:'Use in lower OG batches',body:'At OG 1.090+, the honey character gets buried by alcohol. This honey shines at OG 1.075-1.090.'},
        {title:'Pair with citrus zest',body:'A few strips of fresh orange or grapefruit zest in secondary (no pith — bitter) amplifies the character beautifully.'}
      ],
      pairings:[
        {category:'Cheese',items:'Manchego, young Pecorino, fresh ricotta with honey'},
        {category:'Seafood',items:'Grilled scallops, lobster, seared tuna'},
        {category:'Fruit',items:'Stone fruit (peach, apricot), tropical fruit, candied citrus'},
        {category:'Dessert',items:'Lemon tart, citrus sorbet, almond biscotti'}
      ],
      history:'Orange-blossom honey was prized in Andalusia and Sicily for centuries — the Moors traded it across the Mediterranean. Modern Florida production began in the 1880s and remains a hallmark American honey.',
      similarTo:['Acacia','Lavender'],
      commonMistakes:[
        'Confusing it with "orange honey" — that means honey ADDED to oranges, not from orange trees',
        'Overheating during must prep — destroys the signature aroma',
        'Using in heavy bochets or smoked styles — the delicacy is wasted'
      ]
    }
  },
  'Buckwheat':{color:'#5a2f1a',intensity:'very bold',tech:{fgRatio:1.1,fructoseRisk:'low',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:43},profile:'Almost molasses-dark. Earthy, mineral, malt-like, slightly cocoa. Very assertive.',pairing:'Bochet (r9), dark melomels (blackcurrant r14), porto-style sack (r25). High-alcohol, dark-fruit meads.',notes:'Use sparingly — overwhelms delicate flavors. The dark color carries into the mead.',
    details:{
      origin:'Buckwheat (Fagopyrum esculentum) — technically a pseudocereal, not a true grain. Grown in Eastern Europe, Russia, Poland, Northern France, the US Midwest, and parts of Western Europe.',
      season:'Late summer (July-September), when buckwheat fields bloom',
      crystallization:'Moderate — 4-8 months. Often sold partially crystallized.',
      composition:'~36% fructose, ~30% glucose. Notably high in antioxidants and minerals (iron, manganese).',
      agingPotential:'Excellent — improves significantly with 1-3 years. The mineral notes integrate, the earthiness deepens.',
      bestStyles:['Bochet (caramelized)','Sack/Port-style','Dark fruit melomels (blackcurrant, plum)','Braggot','Wild ale collaborations'],
      pricePoint:'€10-16/kg · widely available from European producers',
      tips:[
        {title:'Caramelize it for bochet',body:'Buckwheat is the gold standard for bochet — its already-dark color and toasty notes transform spectacularly when heated. Stop heating at "mahogany" stage (40-60 min) for the deepest flavor without burning.'},
        {title:'Reduce honey ratio',body:'Standard recipes assume wildflower-strength character. With buckwheat, drop the kg/L by 10-15% — the character is intense enough that less is more.'},
        {title:'Long secondary, please',body:'Buckwheat in primary tastes mineral and harsh. Six months minimum in secondary; 12+ months bottled is where it transforms.'}
      ],
      pairings:[
        {category:'Cheese',items:'Roquefort, Stilton, aged Gruyère, smoked Gouda'},
        {category:'Meat',items:'Game (venison, wild boar, hare), bone-in roasted lamb, oxtail stew'},
        {category:'Dessert',items:'Dark chocolate, fig tart, gingerbread, treacle pudding'},
        {category:'Cigars',items:'Maduro wrappers, Cuban Romeo y Julieta'}
      ],
      history:'Buckwheat honey was the dominant honey in pre-modern Northern Europe — buckwheat was a staple crop before potatoes. Russian, Polish, and Eastern European mead traditions are built around it. Small regional buckwheat-honey traditions survive across Western Europe too.',
      similarTo:['Chestnut','Heather','Forest'],
      commonMistakes:[
        'Using as a default honey — it overwhelms delicate recipes',
        'Bottling too early — the harshness needs time to integrate',
        'Heating without watching — buckwheat scorches faster than lighter honeys due to its higher mineral content'
      ]
    }
  },
  'Heather':{color:'#8a4030',intensity:'bold',tech:{fgRatio:1.0,fructoseRisk:'low',fructophilic:false,crystallises:'fast',yanOffset:0,phAdjust:0.1,sugarPotential:40},profile:'Smoky, slightly bitter, tannic. Famous for being thixotropic (jelly-like). Distinctive heathland character.',pairing:'Traditional bold-flavor meads, smoked meals, gamey foods.',notes:'Hard to find but worth seeking out — sold as "Bruyère" honey in francophone heath regions.',
    details:{
      origin:'Calluna vulgaris (true heather, ling) — heathlands of Scotland, Northern England, Belgium, the Netherlands, and Northern Germany.',
      season:'Late August to mid-September — the heather blooming window is just a few weeks',
      crystallization:'Unusual — thixotropic (gel-like). Does not crystallize like normal honey; behaves like a jelly that liquefies when stirred.',
      composition:'High in protein (3% vs 0.3% typical), giving it the gel structure. Color ranges from dark amber to reddish-brown.',
      agingPotential:'Very good — 2-4 years. The smoky character deepens, the tannins soften.',
      bestStyles:['Traditional bold mead','Smoked-honey experiments','Braggot with peated malt','Highland-themed batches'],
      pricePoint:'€20-40/kg · very scarce, often direct from heathland beekeepers',
      tips:[
        {title:'Stir before measuring',body:'The thixotropic nature means jars look solid until you stir — then they liquefy. Measure by weight, not volume.'},
        {title:'It will not pour through a fine strainer',body:'Has tiny embedded pollen and wax particles that are character, not contamination. Just dump it in.'},
        {title:'Pair with peat',body:'Heather honey + lightly smoked malt in a braggot creates an almost-Islay-whisky character. Use sparingly — both flavors are intense.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged cheddar, Bleu d\'Auvergne, smoked Scamorza'},
        {category:'Meat',items:'Smoked salmon, venison, game birds, haggis'},
        {category:'Whisky',items:'Pairs spectacularly with peated Islay malts — Lagavulin, Laphroaig'},
        {category:'Dessert',items:'Drambuie cake, dark fruitcake'}
      ],
      history:'Heather honey is the legendary honey of Celtic and Pictish meads. The Scottish "heather ale" tradition (Fraoch) sometimes incorporates it. Heathland heather honey is a regional specialty most people never encounter.',
      similarTo:['Buckwheat','Forest'],
      commonMistakes:[
        'Expecting it to pour smoothly — thixotropic honey resists liquid-honey handling techniques',
        'Buying "heather-flavored" blended honey — only true Calluna monofloral counts',
        'Pairing with subtle adjuncts (vanilla, rose) — the smoky tannic character will dominate'
      ]
    }
  },
  'Forest':{color:'#7a4020',intensity:'bold',tech:{fgRatio:1.35,fructoseRisk:'medium',fructophilic:false,crystallises:'slow',yanOffset:15,phAdjust:-0.1,sugarPotential:38},profile:'Honeydew rather than nectar — collected from tree sap/aphids. Dark, malty, less sweet, mineral. Northern European specialty.',pairing:'Braggot (r12), bochet, anything earthy/savory.',notes:'Lower fructose than nectar honeys → ferments slightly differently. Worth experimenting.',
    details:{
      origin:'NOT nectar — collected from tree sap, secreted by aphids ("honeydew"). Trees: spruce, fir, pine, oak. Northern and Central Europe, especially Vosges, Black Forest, Carpathians.',
      season:'Mid-summer (July-August), depending on aphid activity',
      crystallization:'Slow — 6-12 months. Often stays liquid much longer than nectar honeys.',
      composition:'Lower fructose (~28%), higher complex sugars (melezitose, raffinose). Higher mineral content. Lower sweetness perception than nectar honey.',
      agingPotential:'Excellent — 2-5 years. Develops port-like characteristics.',
      bestStyles:['Braggot','Bochet','Aged dark meads','Sack/Port-style','Smoked mead experiments'],
      pricePoint:'€16-28/kg · typically from Germany, Austria, or Eastern Europe',
      tips:[
        {title:'Yeast may struggle with the complex sugars',body:'Melezitose is hard for many yeasts. Use a vigorous strain (D47, 71B, or M05) and don\'t expect 100% attenuation.'},
        {title:'Less sweet than expected',body:'Even at standard OG, the finished mead tastes drier because of the sugar composition. Compensate with backsweetening if you want sweetness.'},
        {title:'Excellent for staggered nutrients',body:'The mineral richness of forest honey already provides some yeast nutrition — you can use slightly less Fermaid-O than with nectar honeys.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged Gouda, Comté, smoked Cheddar, Bleu de Gex'},
        {category:'Meat',items:'Wild boar, smoked sausages, duck, game terrine'},
        {category:'Bread',items:'Dark rye, pumpernickel, sourdough with seeds'},
        {category:'Coffee',items:'Espresso, particularly with smoked or robusta notes'}
      ],
      history:'"Tannenhonig" (fir honeydew) and "Waldhonig" (forest honey) are revered in Germanic and Slavic mead traditions. The forest honey from the Black Forest is protected by geographic indication. Less common in Mediterranean mead traditions.',
      similarTo:['Buckwheat','Chestnut','Heather'],
      commonMistakes:[
        'Treating it as standard honey — the fermentation behavior differs significantly',
        'Pitching expecting standard FG — forest honey ferments to higher FG than equivalent OG nectar honey',
        'Pairing with delicate florals — the savory mineral character overwhelms them'
      ]
    }
  },
  'Acacia':{color:'#e8d480',intensity:'very light',tech:{fgRatio:1.6,fructoseRisk:'critical',fructophilic:true,crystallises:'very_slow',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Pale, almost clear. Very mild, vanilla-floral, subtle. Slow to crystallize.',pairing:'Lavender (r23), rose (r19), delicate metheglins. Anything where you want the addition to dominate.',notes:'The "neutral canvas" honey. Best when the spice/fruit IS the star. Lighter than wildflower.',
    details:{
      origin:'Robinia pseudoacacia (black locust) — Hungary, Romania, Italy, France, China. NOT actually acacia (the African tree); a misnomer that stuck.',
      season:'Late spring (May-June), brief blooming window',
      crystallization:'Very slow — stays liquid 18-24 months. Highest fructose-to-glucose ratio of common honeys.',
      composition:'~44% fructose, ~24% glucose. Almost colorless when fresh; pH ~3.7.',
      agingPotential:'Limited — 1-2 years. The delicate aroma fades; not a honey to age long.',
      bestStyles:['Metheglins where the spice should dominate','Light traditionals','Rose/lavender/elderflower meads','Wedding/celebration meads'],
      pricePoint:'€18-28/kg · Hungarian acacia is the benchmark, often DOP-protected',
      tips:[
        {title:'Use for show meads when the adjunct IS the star',body:'If you want vanilla mead to actually taste of vanilla (not honey + vanilla), acacia is the only choice. Same for rose, lavender, elderflower.'},
        {title:'Lower OG works fine',body:'Because the character is so neutral, you can run OG 1.075-1.085 and let the adjunct dominate without feeling thin.'},
        {title:'Watch for adulteration',body:'Acacia\'s premium price makes it the most-adulterated honey worldwide. Buy from named producers, not generic supermarket "acacia".'}
      ],
      pairings:[
        {category:'Cheese',items:'Fresh chèvre, mozzarella di bufala, burrata'},
        {category:'Fruit',items:'White peach, lychee, melon, apricot'},
        {category:'Dessert',items:'Panna cotta, vanilla custard, light sponge cake'},
        {category:'Tea',items:'White tea, jasmine, Darjeeling first flush'}
      ],
      history:'Hungarian acacia has been prized since the 1700s — Hungary remains the world\'s biggest producer. The Apicius cookbook of ancient Rome describes mead recipes likely using locust-tree honey, the Roman ancestor.',
      similarTo:['Orange Blossom','Clover','Lavender'],
      commonMistakes:[
        'Buying cheap "acacia" — almost certainly adulterated or rapeseed-based',
        'Using in bochets — the delicate character is lost on caramelization',
        'Aging longer than 2 years bottled — the aroma fades'
      ]
    }
  },
  'Linden':{color:'#cfa860',intensity:'medium',tech:{fgRatio:1.18,fructoseRisk:'low',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:41},profile:'Light green-gold. Minty, fresh, slightly herbal. Cooling finish.',pairing:'Hopped mead (r20), mint/herb metheglins, citrus melomels.',notes:'Underrated. The herbal character bridges nicely with spice additions.',
    details:{
      origin:'Tilia cordata or T. platyphyllos — basswood/lime/linden trees across Central and Northern Europe',
      season:'Late June to early July',
      crystallization:'Moderate — 4-8 months. Often retains a fine-grained structure rather than coarse crystals.',
      composition:'~38% fructose, ~32% glucose. Naturally slightly minty due to the volatile terpene farnesol.',
      agingPotential:'Good — 1-3 years. The herbal note softens; the body fills out.',
      bestStyles:['Hopped meads','Mint/lemon balm metheglins','Citrus melomels','Herbal blends'],
      pricePoint:'€12-18/kg · widely available, mostly from German or Polish producers',
      tips:[
        {title:'Underrated for hopped meads',body:'The mint character bridges between honey and hops more elegantly than wildflower. Try as the base for a session-strength hopped mead at OG 1.060.'},
        {title:'Brilliant with lemon balm or mint',body:'A small handful of fresh lemon balm in secondary doubles down on the natural minty character — magical.'},
        {title:'Use whole, do not warm',body:'The cooling/minty notes are volatile. Stir into room-temp water gently; do not heat above 35°C.'}
      ],
      pairings:[
        {category:'Cheese',items:'Goat cheese, fresh mozzarella, herbed feta'},
        {category:'Fish',items:'Grilled trout, smoked mackerel, ceviche'},
        {category:'Salad',items:'Strawberry-basil, watermelon-feta, herbed quinoa'},
        {category:'Dessert',items:'Mint chocolate, lemon sorbet, honey-mint shortbread'}
      ],
      history:'Linden honey is the prize honey of Slavic mead traditions — Polish "Lipiec" mead is named after the linden tree (Lipa in Polish). Lipiec is also the Polish word for July, the linden bloom month.',
      similarTo:['Wildflower','Acacia'],
      commonMistakes:[
        'Heating it — the cool/minty volatile terpenes evaporate easily',
        'Buying "linden flower honey" (which is herbal-tea infused) instead of true Tilia honey',
        'Pairing with intense spice — overpowers the delicate herbal character'
      ]
    }
  },
  'Clover':{color:'#d8b860',intensity:'light',tech:{fgRatio:1.1,fructoseRisk:'low',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Mild, sweet, vanilla-floral. The "classic" American honey flavor.',pairing:'Traditional show meads, vanilla mead (r16), light cysers.',notes:'Less common in Europe than wildflower; in the US it dominates.'},
  'Manuka':{color:'#9a6a30',intensity:'bold',tech:{fgRatio:1.2,fructoseRisk:'medium',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:38},profile:'New Zealand specialty. Medicinal, herbal, slightly bitter. High MGO.',pairing:'Standalone show mead — let the honey speak. Pricy; reserve for special batches.',notes:'Expensive. Look for "MGO 100+" or "UMF 5+" minimum if you want the character.',
    details:{
      origin:'Leptospermum scoparium (mānuka tree) — New Zealand only (with some Australian production from related tea trees).',
      season:'Late spring to early summer in New Zealand (October-December, Southern Hemisphere)',
      crystallization:'Forms a thixotropic gel — similar to heather. Does not crystallize conventionally.',
      composition:'High in methylglyoxal (MGO) and dihydroxyacetone (DHA). The MGO rating (e.g. MGO 100+, 250+, 500+) indicates concentration.',
      agingPotential:'Moderate — 1-2 years. The herbal/medicinal notes integrate but do not dramatically improve.',
      bestStyles:['Standalone show mead at OG 1.090+','Special-occasion sack meads','Honey-forward batches where you want the honey to dominate'],
      pricePoint:'€40-120/kg depending on MGO rating · the most expensive common honey',
      tips:[
        {title:'Save it for show meads',body:'At €60+/kg, this is not a daily-driver honey. Use it for one premium batch a year where the honey IS the experience. Single-honey traditional, no adjuncts.'},
        {title:'MGO 100+ is the minimum for character',body:'Anything below MGO 100 ("monofloral mānuka" only) has the floral character but not the medicinal intensity. MGO 250+ is where the experience really begins.'},
        {title:'Drink at higher temperature',body:'Unlike most meads, mānuka shows best slightly warmer than fridge temp — 14-16°C lets the herbal/medicinal complexity open up.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged Manchego, Camembert, washed-rind cheeses'},
        {category:'Meat',items:'Lamb roast with rosemary, smoked duck breast'},
        {category:'Dessert',items:'Anzac biscuits (NZ tradition), pavlova, sticky-toffee pudding'},
        {category:'Tea/coffee',items:'Pairs uniquely well with green tea and herbal tisanes'}
      ],
      history:'Mānuka honey was used medicinally by Māori for centuries. Modern scientific interest exploded in the 1980s with the discovery of its non-peroxide antibacterial properties. Now one of New Zealand\'s most valuable exports.',
      similarTo:['Heather','Buckwheat (less malty, more medicinal)'],
      commonMistakes:[
        'Buying "mānuka" without MGO or UMF rating — almost certainly mostly other honey',
        'Diluting in big batches with cheaper honey — defeats the purpose',
        'Pairing with strong adjuncts — overrides what you paid for'
      ]
    }
  },
  'Chestnut':{color:'#6a3a1a',intensity:'very bold',tech:{fgRatio:1.05,fructoseRisk:'low',fructophilic:false,crystallises:'fast',yanOffset:0,phAdjust:0,sugarPotential:41},profile:'Dark amber to mahogany. Tannic, slightly bitter, leather, nutty. Distinctively woody.',pairing:'Bochet, dark melomels, port-style aged sack (r25, r26), figs.',notes:'Strong personality — divides drinkers. Pairs spectacularly with dried fruit and oak.',
    details:{
      origin:'Sweet chestnut (Castanea sativa) — Italian Alps, Corsica, French Cévennes, parts of Greece and Spain',
      season:'Mid-summer (July), brief blooming window',
      crystallization:'Slow — stays liquid 12+ months. High fructose, low glucose ratio.',
      composition:'~38% fructose, ~26% glucose, exceptionally high in minerals (especially potassium). Naturally slightly bitter from the floral terpenes.',
      agingPotential:'Excellent — meads develop port-like notes after 1-2 years. One of the great aging honeys.',
      bestStyles:['Sack/Port-style aged mead','Bochet','Aged dark melomels (fig, plum, raisin)','Braggot with dark malts','Oak-aged experiments'],
      pricePoint:'€18-30/kg · specialty stores or direct from Italian/French producers',
      tips:[
        {title:'Use sparingly until you know it',body:'1.2-1.5 kg/5L is plenty — the tannic edge can take over. Start lower than you would with wildflower.'},
        {title:'Pair with oak',body:'Wood notes complement the natural tannins; light oak (1-2g/5L for 6 weeks in secondary) is transformative.'},
        {title:'Long aging required',body:'Young chestnut mead can taste harsh and bitter. Give it 8-12 months minimum, ideally 18+. The transformation is dramatic.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged Comté, vieux Chimay, manchego viejo, Brebis basque'},
        {category:'Meat',items:'Wild boar, venison, duck confit, foie gras'},
        {category:'Dessert',items:'Fig tart, dark chocolate, candied chestnut, marrons glacés'},
        {category:'Cigars',items:'Madurō wrappers, full-bodied Nicaraguans'}
      ],
      history:'Chestnut honey has been prized in Mediterranean Europe since Roman times. Italian and Corsican chestnut honeys are protected DOP. Outside southern Europe it is scarce — usually imported from France or Italy.',
      similarTo:['Buckwheat','Heather','Forest'],
      commonMistakes:[
        'Using too much — overwhelms delicate spice/fruit additions',
        'Bottling too early — the bitter edge needs aging to integrate',
        'Pairing with subtle adjuncts like vanilla or rose — wasted'
      ]
    }
  },
  'Lavender':{color:'#d0b070',intensity:'medium',tech:{fgRatio:1.38,fructoseRisk:'high',fructophilic:false,crystallises:'slow',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Floral, perfumed, Provençal. The bees gather from lavender fields.',pairing:'Lavender metheglin (r23 — meta), peach (r15), rose (r19), summer fruits.',notes:'Subtle floral note in the base — doubles down on the lavender character of r23.',
    details:{
      origin:'Lavandula angustifolia (true lavender) or L. × intermedia (lavandin) — Provence (France), Croatia, Bulgaria, parts of Spain',
      season:'Mid-summer (July-August)',
      crystallization:'Moderate — 3-6 months',
      composition:'~40% fructose, ~30% glucose. Pale amber, distinctly aromatic.',
      agingPotential:'Moderate — 1-2 years. The floral notes fade with extended aging.',
      bestStyles:['Lavender metheglin','Stone-fruit melomels (peach, apricot)','Floral show meads','Honey-forward traditionals'],
      pricePoint:'€18-28/kg · Provençal lavender honey is the benchmark',
      tips:[
        {title:'Doubles down on lavender adjunct',body:'If you are making a lavender metheglin, using lavender honey amplifies the floral character. Use 0.5g dried lavender buds per 5L in secondary, not more.'},
        {title:'Beware of "lavandin"',body:'Lavandin is a hybrid; its honey is more camphoraceous and less subtle than true lavender. Look for "Lavandula angustifolia" on the label for the classic profile.'},
        {title:'Pair with peach in secondary',body:'A bag of frozen white peaches in secondary on lavender-honey traditional creates a remarkable summer mead.'}
      ],
      pairings:[
        {category:'Cheese',items:'Fresh chèvre, brie, blue cheese with lavender'},
        {category:'Fruit',items:'Peach, apricot, fig, blackberry'},
        {category:'Dessert',items:'Lavender shortbread, honey madeleines, crème brûlée'},
        {category:'Aperitif',items:'Drizzled over fresh ricotta as a starter'}
      ],
      history:'Provençal lavender honey is one of the most romantic honeys — associated with summer Provence, Marseille soap, and traditional French bonbons. Production is small-scale and seasonal.',
      similarTo:['Acacia','Orange Blossom'],
      commonMistakes:[
        'Confusing with "lavender-infused honey" (post-process flavoring) instead of true monofloral',
        'Heating during must prep — destroys the floral esters',
        'Pairing with strong spices (chai, capsicum) — wasted'
      ]
    }
  },
  'Eucalyptus':{color:'#a87a30',intensity:'medium',tech:{fgRatio:1.18,fructoseRisk:'low',fructophilic:false,crystallises:'moderate',yanOffset:10,phAdjust:-0.1,sugarPotential:41},profile:'Menthol, slightly medicinal, herbaceous. Australian specialty.',pairing:'Hop-forward meads (r20), thyme/savory metheglins, smoked foods.',notes:'Distinctive — not for traditionalists. Pairs with bittering hops surprisingly well.'},
  'Sunflower':{color:'#e8b840',intensity:'medium',tech:{fgRatio:0.95,fructoseRisk:'low',fructophilic:false,crystallises:'very_fast',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Yellow-gold. Buttery, slightly grassy, mild. Crystallizes very fast.',pairing:'Cyser (r10), peach (r15), light fruit melomels.',notes:'Crystallization makes liquid measurement annoying. Warm gently to liquefy.'},
  'Rapeseed':{color:'#f0d870',intensity:'light',tech:{fgRatio:0.93,fructoseRisk:'low',fructophilic:false,crystallises:'very_fast',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'Almost white. Very mild, slightly cabbage-y when warm. Quick to crystallize.',pairing:'Light traditionals, cyser, anything where you don\'t want honey to dominate.',notes:'Cheap and abundant wherever rapeseed is farmed. Don\'t heat above 35°C — ammonia-y notes develop.',
    details:{
      origin:'Brassica napus (rapeseed/canola) — a massive crop across northern Europe',
      season:'Late spring (April-May) — bright yellow rape fields are unmistakable',
      crystallization:'VERY fast — usually crystallized within weeks of extraction. Often sold creamed/crystallized.',
      composition:'High glucose (~38%), lower fructose (~34%). This high-glucose ratio is why it crystallizes so fast.',
      agingPotential:'Limited — 1 year. Not a honey for long-aging.',
      bestStyles:['Daily-driver traditionals','Cyser','Light fruit melomels','First-batch experiments'],
      pricePoint:'€6-10/kg · usually the most affordable honey on the shelf',
      tips:[
        {title:'NEVER heat above 35°C',body:'Rapeseed honey develops a distinct cabbage/ammonia note when overheated. Use lukewarm water for must prep, period.'},
        {title:'Cream it first if crystallized',body:'Solid rapeseed honey is impossible to scoop neatly. Warm the jar in 35°C water for 30 min to soften (NOT melt) — gives a creamy spread.'},
        {title:'Use as a budget brewing honey',body:'For experimental batches or first attempts, rapeseed at €8/kg is unbeatable value. Save your wildflower for batches you actually care about.'}
      ],
      pairings:[
        {category:'Cheese',items:'Young Gouda, fresh mozzarella, simple cream cheese'},
        {category:'Bread',items:'Simple white bread, brioche, croissants'},
        {category:'Fruit',items:'Apples, pears (light fruits)'},
        {category:'Tea',items:'Light black tea, herbal infusions'}
      ],
      history:'Rapeseed cultivation exploded in Northern Europe in the 20th century — first for industrial oil, later for cooking. Beekeepers initially considered rapeseed nectar a problem (too rapidly crystallized) but adapted; it now feeds millions of European hives.',
      similarTo:['Clover','Acacia (in profile, though much faster crystallization)'],
      commonMistakes:[
        'Heating it for must prep — irreversible off-flavors',
        'Trying to age long — flavor fades within a year',
        'Pairing with strong adjuncts — the delicate character is buried'
      ]
    }
  },
  'Thyme':{color:'#b88a40',intensity:'bold',profile:'Mediterranean herb honey. Aromatic, slightly resinous, almost savory.',pairing:'Chai mead (r24), capsicumel (r21), savory metheglins.',notes:'Greek thyme honey is the benchmark. Pairs astonishingly well with spice additions.',
    details:{
      origin:'Thymus capitatus or T. vulgaris — Greece (Crete, Kythira), Sicily, Sardinia, southern Spain',
      season:'Late spring to early summer (May-June)',
      crystallization:'Slow — 8-12 months. High fructose content.',
      composition:'~42% fructose, ~30% glucose. Naturally herbaceous due to thyme essential oil traces.',
      agingPotential:'Good — 1-3 years. The resinous character integrates and softens.',
      bestStyles:['Chai meads','Capsicumel (chili)','Savory/herbal metheglins','Tomato-based experiments','Mediterranean-themed batches'],
      pricePoint:'€20-35/kg · Greek "thymarisio" is the gold standard, often direct-import',
      tips:[
        {title:'Greek thyme is the benchmark',body:'Cretan and Cycladic thyme honeys are the most intense — pure thyme monofloral. Sicilian and Sardinian thyme honey is more mixed but still excellent.'},
        {title:'Brilliant with chili capsicumel',body:'The savory/resinous character bridges between honey-sweet and chili-heat better than any other honey. Try 1.5kg thyme honey + 2-3 chiles in a 5L capsicumel.'},
        {title:'Pair with herbs in secondary',body:'A small handful of fresh oregano or sage in secondary doubles the Mediterranean character. Use sparingly — herbs go bitter fast.'}
      ],
      pairings:[
        {category:'Cheese',items:'Feta, halloumi, aged manchego, Roquefort'},
        {category:'Meat',items:'Lamb (especially Greek-style), grilled chicken, lamb kofta'},
        {category:'Bread',items:'Olive bread, focaccia, pita with za\'atar'},
        {category:'Dessert',items:'Baklava, halva, yogurt with honey and walnuts'}
      ],
      history:'Thyme honey is the legendary honey of ancient Greece — references in Hippocrates, Aristotle, Roman cookbooks. The "thyme of Hymettus" (near Athens) was the most-prized honey of the Mediterranean world.',
      similarTo:['Eucalyptus','Heather'],
      commonMistakes:[
        'Buying "thyme-infused honey" (post-process) instead of true monofloral',
        'Using in delicate floral meads — wasted',
        'Heating during must prep — destroys the volatile thyme oils'
      ]
    }
  },
  'Coriander':{color:'#dba846',intensity:'medium',profile:'Distinctive warm-spice aroma — coriander seed, faintly citrus. Light to medium amber, crystallizes fast into a fine creamy texture.',pairing:'Excellent in metheglins (r4, r7), citrus melomels, and Belgian-style braggots. A natural partner for spiced styles.',notes:'A north-west-European specialty — bees forage on cultivated coriander fields. The spice character is baked in, you barely need to add coriander seed to a metheglin.',
    details:{
      origin:'Apis mellifera foraging on coriander (Coriandrum sativum) — a crop cultivated across north-western Europe for seed production. The honey takes on the plant\'s warm, citrusy-spicy character.',
      season:'Mid summer (June-August), when coriander fields bloom',
      crystallization:'Fast — 2-4 weeks. Often sold pre-crystallized as a creamy spread.',
      composition:'~38% fructose, ~35% glucose (the high glucose drives the fast crystallization). Light amber.',
      agingPotential:'Moderate — 1-2 years. The coriander aroma fades; drink within the first year for peak character.',
      bestStyles:['Metheglins with spice','Citrus melomels','Belgian-style braggots','Bochets (mild caramelization)'],
      pricePoint:'€12-18/kg · often sold as a specialty creamed honey',
      tips:[
        {title:'Pairs naturally with citrus zest',body:'The honey already carries citrus notes — a few strips of orange or grapefruit zest in secondary amplify rather than clash.'},
        {title:'Skip or halve coriander seed in metheglins',body:'When you\'re using this honey in r4 or r7, cut the coriander-seed addition in half. The honey already brings most of the character.'},
        {title:'Warm gently to liquefy for must',body:'Because it crystallizes fast, the jar will often be solid. 35-40°C water bath for 30 min — never microwave.'}
      ],
      pairings:[
        {category:'Cheese',items:'Young Gouda, Edam, Comté, fresh mozzarella'},
        {category:'Meat',items:'Pork loin, cured ham, lamb merguez'},
        {category:'Bread',items:'Speculoos, Dutch ontbijtkoek, rye crispbread'},
        {category:'Dessert',items:'Spiced cookies, citrus tart, baked apple'}
      ],
      history:'Coriander honey has been a north-west-European regional specialty since coriander cultivation expanded in the 17th century — beekeepers placed hives near the seed fields. It\'s rarely seen outside the growing regions.',
      similarTo:['Wildflower','Linden'],
      commonMistakes:[
        'Treating it as a "plain" honey — the coriander note is real, will affect your mead',
        'Adding the full spec of coriander seed in metheglins on top of this honey',
        'Buying it crystallized then over-heating to re-liquefy (destroys the volatile spice notes)'
      ]
    }
  },
  'Lemon Blossom':{color:'#e8c860',intensity:'light',profile:'Fresh, fragrant, distinctly lemon-zest and white-flower notes. Pale gold. Sharper and more aromatic than orange blossom.',pairing:'Pure traditionals where citrus is wanted, lemon-and-herb metheglins, summer melomels with peach or apricot.',notes:'Similar character to orange blossom but more zesty. The Spanish Valencia region is the main source.',
    details:{
      origin:'Bees foraging in lemon-tree groves — primarily citrus regions of Spain (Valencia, Murcia), Sicily, and parts of Greece. The lemon-blossom esters carry through to the honey.',
      season:'Spring (March-May), during lemon-tree flowering',
      crystallization:'Slow — stays liquid 9-14 months. High fructose content.',
      composition:'~41% fructose, ~28% glucose. Light gold to pale amber.',
      agingPotential:'Low to moderate — 1-2 years. The citrus aroma is the whole point and it fades within 18 months. Drink young.',
      bestStyles:['Light citrus traditionals','Lemon-herb metheglins','Stone-fruit melomels','Summer/festival meads'],
      pricePoint:'€16-24/kg · typically imported from the Valencia region of Spain',
      tips:[
        {title:'Treat the aroma as fragile',body:'Never heat above 35°C in must prep. The lemon-blossom esters are even more volatile than orange — gentle dissolution is essential.'},
        {title:'Pair with lemon thyme',body:'A small bundle of fresh lemon thyme (3-5 sprigs) in secondary for 5 days amplifies the character without clashing.'},
        {title:'Bottle quickly and drink within a year',body:'Unlike sack-style meads, this honey rewards speed. A 6-month-old lemon-blossom traditional outshines a 2-year-old one.'},
        {title:'Excellent for sparkling meads',body:'The bright character holds up to carbonation better than darker honeys. Consider a champagne yeast and bottle-conditioning.'}
      ],
      pairings:[
        {category:'Cheese',items:'Fresh ricotta, burrata, young manchego, fresh mozzarella'},
        {category:'Seafood',items:'Grilled prawns, scallops, ceviche, citrus-cured salmon'},
        {category:'Fruit',items:'Berries, peach, apricot, candied lemon peel'},
        {category:'Dessert',items:'Lemon tart, panna cotta, almond cake, sorbet'}
      ],
      history:'Citrus-honey production followed the spread of Arab citrus orchards through Spain and Sicily starting in the 10th century. Lemon-blossom honey was traditionally considered medicinal in Andalusia — particularly for coughs and sore throats.',
      similarTo:['Orange Blossom','Acacia'],
      commonMistakes:[
        'Storing in warm conditions — accelerates aroma loss',
        'Using in bochets or smoked styles where the citrus is wasted',
        'Confusing it with "lemon-infused honey" (lemon zest added post-harvest)'
      ]
    }
  },
  'Rosemary':{color:'#d6b658',intensity:'medium',profile:'Pale amber, faintly herbaceous, light pine-needle and resin notes. More delicate than thyme — herbal without being savory.',pairing:'Mediterranean metheglins, lamb-pairing batches, herbal sack meads. Excellent for a "garrigue" themed mead.',notes:'Stays liquid a long time — high fructose. Spain (Andalucía) is the main source.',
    details:{
      origin:'Bees foraging on wild and cultivated rosemary (Salvia rosmarinus, formerly Rosmarinus officinalis) — primarily Spain (Andalucía, Murcia, Valencia), with smaller production in Provence and Sardinia.',
      season:'Late winter to early spring (Feb-April) — rosemary is one of the first bee plants of the year',
      crystallization:'Very slow — stays liquid 12-18 months. Among the slowest-crystallizing varietal honeys.',
      composition:'~42% fructose, ~26% glucose. Pale amber, often almost colorless.',
      agingPotential:'Moderate to good — 1-3 years. The herbaceous character softens but persists.',
      bestStyles:['Mediterranean herbal metheglins','Light traditionals','Lamb-pairing sacks','Garrigue-themed (rosemary + lavender + thyme honeys blended)'],
      pricePoint:'€16-26/kg · typically a Spanish import (Valencia region)',
      tips:[
        {title:'It is much subtler than thyme honey',body:'Where thyme honey shouts, rosemary whispers. Use it where you want a hint of herb without dominance.'},
        {title:'Blend with lavender for "Provence" character',body:'A 70/30 blend of rosemary and lavender honey makes a remarkable summer traditional — the most evocative honey blend in mead-making.'},
        {title:'Skip rosemary herb additions',body:'If you\'re using this honey, adding fresh rosemary in secondary is almost always too much. The honey carries the note.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged manchego, idiazábal, mature pecorino, goat cheese'},
        {category:'Meat',items:'Roast lamb, herb-crusted pork, grilled chicken, charcuterie'},
        {category:'Bread',items:'Pan rústico, focaccia with herbs, sourdough'},
        {category:'Dessert',items:'Olive oil cake, citrus and almond tart, baked figs'}
      ],
      history:'Rosemary honey is the first honey of the Mediterranean year — rosemary blooms when little else does, so the bees produce a pure monofloral. Andalusian beekeepers have prized it for centuries; it carries a Protected Designation of Origin (PDO) for "Miel de la Alcarria" in Spain.',
      similarTo:['Lavender','Acacia','Thyme'],
      commonMistakes:[
        'Expecting it to taste strongly of rosemary — it is delicate',
        'Heavy spice additions that overwhelm the honey',
        'Using it in dark/bochet meads where the pale herbal character is lost'
      ]
    }
  },
  'Coffee Blossom':{color:'#a5713a',intensity:'medium',profile:'Surprisingly NOT coffee-flavored — instead jasmine-floral, lightly nutty, with a faint caramel finish. Medium amber.',pairing:'Coffee-themed bochets (the irony is delicious), nutty melomels, sack meads where you want unusual character.',notes:'A rarity in Europe — only specialty importers stock it. Imported from coffee-growing regions.',
    details:{
      origin:'Bees foraging on Coffea arabica or Coffea robusta blossoms — primarily Ethiopia, Guatemala, Colombia, Mexico. Coffee plants flower briefly (3-5 days per cycle) so monofloral coffee honey is genuinely rare.',
      season:'Tropical — multiple flowerings per year. European stock typically arrives in late spring.',
      crystallization:'Slow to moderate — 4-8 months. Often sold liquid.',
      composition:'~39% fructose, ~31% glucose. Medium amber with slight caramel undertone.',
      agingPotential:'Good — 1-3 years. The floral notes mellow into nutty/caramel character.',
      bestStyles:['Bochets with coffee additions (intentional irony)','Nutty melomels (hazelnut, almond)','Curiosity sack meads','Show meads where you want talking-point character'],
      pricePoint:'€22-35/kg · specialty import, limited availability',
      tips:[
        {title:'Despite the name, it is NOT a coffee flavor',body:'First-time tasters expect coffee bitterness and are surprised by jasmine and caramel. Make sure your tasting party knows.'},
        {title:'Pair with actual coffee in bochet',body:'Caramelize the honey to bochet level, ferment, then cold-extract coffee beans in secondary. The contrast between the honey\'s jasmine and the coffee\'s bitterness is exceptional.'},
        {title:'Limited shelf life from import to bottle',body:'Coffee blossom honey is rarely fresh — by the time it reaches Europe it may be 6-12 months old. Use it sooner rather than later in projects.'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged gouda, manchego with caramel notes, blue cheeses'},
        {category:'Dessert',items:'Tiramisu, espresso panna cotta, hazelnut cake, dark chocolate truffle'},
        {category:'Nuts',items:'Hazelnut, almond, pecan — natural pairing with the nutty profile'},
        {category:'Coffee',items:'Drizzled into espresso, on ricotta with coffee crumb'}
      ],
      history:'Coffee blossom honey only became commercially significant in the 1990s as specialty coffee farms began renting beekeeping operations during flowering. It remains expensive and rare in Europe.',
      similarTo:['Orange Blossom','Wildflower'],
      commonMistakes:[
        'Expecting coffee flavor and being disappointed',
        'Storing in warmth — destroys the delicate jasmine notes',
        'Using it as a default — too expensive and characterful for everyday mead'
      ]
    }
  },
  'Himalayan Balsam':{color:'#b88040',intensity:'medium',profile:'Distinctively floral, faintly perfumed, slightly grassy. Reminds many tasters of unripe pear or honeysuckle. Light amber.',pairing:'Pure traditionals showcasing the unusual aroma, light melomels, regional/seasonal batches celebrating an invasive species put to use.',notes:'Made from an invasive plant (Impatiens glandulifera) along European waterways — buying this honey supports environmental control efforts.',
    details:{
      origin:'Apis mellifera foraging on Himalayan balsam (Impatiens glandulifera), an invasive species introduced from the Himalayas in the 19th century. Now widespread along European waterways and disturbed land. Beekeepers welcome it as a late-season nectar source while ecologists fight to remove it.',
      season:'Late summer to early autumn (August-September) — one of the last major bee plants of the year',
      crystallization:'Slow — 6-9 months. The structure of the nectar produces a creamy, fine-grain crystallization.',
      composition:'~40% fructose, ~30% glucose. Light to medium amber with a slight pinkish tinge when fresh.',
      agingPotential:'Moderate — 1-2 years. The floral character is the highlight; drink younger rather than older.',
      bestStyles:['Light traditionals','Pear or apple melomels','Late-season "harvest" sacks','Regional/conservation-themed batches'],
      pricePoint:'€14-22/kg · a regional specialty with limited harvest',
      tips:[
        {title:'Story-worthy honey for gifted bottles',body:'The invasive-plant origin is a great conversation starter — pair the bottle with a label or card explaining the connection.'},
        {title:'Treat it as a substitute for orange blossom',body:'Similar weight and floral character but a different aroma profile. Recipes calling for orange blossom often work just as well with balsam honey, with a more "Northern European" twist.'},
        {title:'Buy fresh — late-summer harvest',body:'September-October is when fresh balsam honey hits beekeeper shops. The aroma is most vivid in the first 6 months.'}
      ],
      pairings:[
        {category:'Cheese',items:'Young Gouda, Edam, mild brie, fresh chèvre'},
        {category:'Fruit',items:'Pear (especially Conference), apple, late-summer plums'},
        {category:'Bread',items:'Spelt bread, walnut bread, raisin loaf'},
        {category:'Dessert',items:'Pear tart, apple crumble, vanilla ice cream'}
      ],
      history:'Himalayan balsam was introduced to European gardens as an ornamental plant in 1839. It escaped cultivation and now dominates many European riverbanks. Beekeepers consider it a gift — a late-season nectar flow that fattens hives for winter. Ecologists are less enthusiastic.',
      similarTo:['Orange Blossom','Wildflower','Linden'],
      commonMistakes:[
        'Confusing it with "balm honey" (lemon balm) — completely different',
        'Storing too long — the unique floral note is the value, and it fades',
        'Pairing with assertive spices that overwhelm the delicate floral character'
      ]
    }
  },
  'Mountain':{color:'#b27838',intensity:'medium',tech:{fgRatio:1.25,fructoseRisk:'medium',fructophilic:false,crystallises:'moderate',yanOffset:0,phAdjust:0,sugarPotential:42},profile:'A blend of high-altitude wildflowers — alpine meadow flora. Robust, complex, faintly resinous, with hints of clover and herb. Medium to dark amber.',pairing:'Robust traditionals, alpine-themed batches, herbal metheglins, partner for assertive melomels.',notes:'Multifloral honey from elevations above 800m — usually Alps, Pyrenees, Carpathians. Each season tastes different depending on which flowers dominated.',
    details:{
      origin:'Bees foraging at altitude on a mix of alpine wildflowers — typically thyme, clover, dandelion, rhododendron, mountain herbs. Main sources: Austrian Alps, French Pyrenees, Romanian Carpathians, Italian Dolomites.',
      season:'Late spring to early autumn at altitude (June-September)',
      crystallization:'Variable — usually 4-8 months. Often sold partially crystallized.',
      composition:'~38% fructose, ~33% glucose. Medium amber, naturally darker than lowland wildflower.',
      agingPotential:'Excellent — 2-4 years. The herbaceous mountain character integrates beautifully with time.',
      bestStyles:['Robust traditionals','Alpine/herbal metheglins','Partner for forest meads','Sack meads needing complexity'],
      pricePoint:'€14-22/kg · typically imported Austrian/Italian mountain honey',
      tips:[
        {title:'Vintage matters more than usual',body:'Mountain honey is a snapshot of one summer\'s alpine flora. Try to get the harvest year on the jar and treat each year as different.'},
        {title:'Excellent base for "complex" sacks',body:'When you want an OG 1.130+ sack mead with character to spare, mountain honey gives more depth than wildflower without the assertiveness of buckwheat.'},
        {title:'Pair with mountain herbs in secondary',body:'Edelweiss tincture, mountain pine, or just chamomile flowers all work — the honey already has the right backdrop.'}
      ],
      pairings:[
        {category:'Cheese',items:'Gruyère, Comté, Beaufort, mountain pecorino, alpine raclette'},
        {category:'Meat',items:'Game (venison, wild boar), aged hams, alpine sausage'},
        {category:'Bread',items:'Whole-grain rye, walnut bread, alpine sourdough'},
        {category:'Dessert',items:'Honey cake, walnut tart, chestnut purée desserts'}
      ],
      history:'Alpine honey has been a regional specialty since transhumance beekeeping began in the Middle Ages — beekeepers would move hives uphill as the season progressed, following the flowering. Modern "mountain honey" labels typically guarantee minimum altitude (often 800m or 1000m).',
      similarTo:['Wildflower','Forest','Heather'],
      commonMistakes:[
        'Treating it as interchangeable with wildflower — it is meaningfully different (more complex, darker)',
        'Not asking the origin region — Austrian, Pyrenean and Carpathian mountain honeys taste quite different',
        'Buying "mountain blend" supermarket products that are mostly lowland honey with a marketing name'
      ]
    }
  },
  'Pine Honeydew':{color:'#7a4a26',intensity:'bold',tech:{fgRatio:1.3,fructoseRisk:'medium',fructophilic:false,crystallises:'slow',yanOffset:15,phAdjust:-0.1,sugarPotential:38},profile:'Dark amber to almost black, malty, faintly resinous, with caramel and woodsmoke notes. Not from nectar — from aphid honeydew on pine needles.',pairing:'Bochets (where its existing caramel notes shine — r9), dark sacks, smoke-pairing batches, Christmas/winter meads.',notes:'Greek and Turkish pine honey are legendary. Lower glucose means it almost never crystallizes. Sometimes called "fir honey" or "forest honey" — but Pine specifically.',
    details:{
      origin:'Bees collecting honeydew secretions left by scale insects (Marchalina hellenica) on Pinus brutia and Pinus halepensis. Main producers: Greece, Turkey, parts of Spain and Italy.',
      season:'Late summer to autumn (August-October) — the secretion peak',
      crystallization:'Extremely slow — often stays liquid 3+ years. Very low glucose content.',
      composition:'~28% fructose, ~26% glucose, ~28% melezitose & other oligosaccharides. Dark amber to mahogany. High mineral content — among the most antioxidant-rich honeys.',
      agingPotential:'Excellent — 3-5 years. The resinous character softens into woodsmoke and caramel.',
      bestStyles:['Bochets (resin + caramel from caramelization)','Dark sacks','Christmas/winter spiced meads','Coffee/chocolate-pairing meads','Smoke-pairing batches'],
      pricePoint:'€14-22/kg · typically imported from Greece or Turkey',
      tips:[
        {title:'Caramelize lightly, not deeply',body:'In bochets, pine honey already has caramel notes — caramelizing too far stacks them and turns muddy. Aim for amber bochet, not deep mahogany.'},
        {title:'Excellent for very high gravity',body:'The complex sugars resist fermentation, giving you a built-in sweet finish even with aggressive yeasts. Sack ABV with less stuck-fermentation risk.'},
        {title:'Stretches further than nectar honey',body:'The bold flavor means you can use 10-15% less honey by weight and still get character. Useful for cost-conscious batches.'},
        {title:'Never confuse with "pine-flavored honey"',body:'Some products add pine essential oil to regular honey. Real pine honey says "Pine Honeydew" or "Forest/Fir Honey from Pinus brutia."'}
      ],
      pairings:[
        {category:'Cheese',items:'Aged pecorino, kefalotyri, mature parmigiano, mountain gruyère'},
        {category:'Meat',items:'Smoked sausage, game terrines, lamb with pine-nut crust'},
        {category:'Bread',items:'Pumpernickel, dark rye, walnut and fig bread'},
        {category:'Dessert',items:'Dark chocolate, fig and walnut cake, halva, baklava'}
      ],
      history:'Pine honey has been the dominant honey of Greece and Turkey for two millennia. Approximately 65% of Greek honey production is pine honeydew. The relationship between bees, pine trees, and the specific scale insect is an ecological triangle now considered fragile due to climate stress.',
      similarTo:['Forest','Buckwheat','Heather'],
      commonMistakes:[
        'Confusing it with regular pine-scented or pine-infused honey',
        'Expecting it to crystallize like nectar honey — it usually never will',
        'Using it as a base for delicate floral mead — it overwhelms everything'
      ]
    }
  },
  'Comb':{color:'#caa248',intensity:'varies',profile:'Honey still in the wax comb the bees built. The most unprocessed honey possible — flavor depends entirely on what nectar source filled it.',pairing:'Not for mead-making directly (wax and structure complicate fermentation). Buy for the cheese board, the gift table, or to render your own pure wax for label seals.',notes:'Mead-relevant only as a bonus product. Cut a chunk into a finished bottle as a presentation feature — adds visual drama and a hint of fresh-comb aroma.',
    details:{
      origin:'Sections of honeycomb cut directly from the frame. The honey inside has never been extracted, filtered, or warmed. Pollen and tiny wax flecks are present.',
      season:'Available year-round from beekeepers; freshest in late summer/autumn after harvest',
      crystallization:'Inside the comb cells, follows whatever the source nectar would do — but contained by wax it stays presentable longer.',
      composition:'Honey + beeswax cell structure. Honey is whatever nectar source filled it (usually wildflower or single-source like clover/heather).',
      agingPotential:'Indefinite as a comb section — the wax preserves the honey. But the appeal is freshness.',
      bestStyles:['Garnish for finished mead bottles','Cheese plate accompaniment','Gift-pack inclusion','Wax for label sealing (render the comb)'],
      pricePoint:'€18-30/kg comb (priced higher than equivalent extracted honey)',
      tips:[
        {title:'Drop a small chunk into a gift bottle',body:'A 2x2cm comb piece inside a finished bottle of traditional mead is dramatic visually and releases a tiny bit of fresh-comb aroma. Drink with the comb still in or strain it out.'},
        {title:'Render the wax for premium label seals',body:'Old comb that you wouldn\'t eat still rends into clean beeswax. Heat in a double-boiler, strain through cheesecloth — perfect for wax-sealed label stamps on your bottles.'},
        {title:'Do NOT use as primary honey for fermentation',body:'The wax binds yeast, creates filtering nightmares, and complicates gravity readings. If you must, melt the comb in warm water and strain out the wax first — but it\'s not worth it vs buying liquid honey.'}
      ],
      pairings:[
        {category:'Cheese',items:'Any cheese plate — the visual showmanship is the point. Blue cheeses are the classic pair.'},
        {category:'Bread',items:'Fresh sourdough with butter, sopping up the honey from the comb'},
        {category:'Spirits',items:'Whisky tastings — chunk of comb between sips is a striking pairing'},
        {category:'Coffee',items:'Drop on a hot espresso — wax melts, honey integrates'}
      ],
      history:'Comb honey is the oldest form of honey — there was no other form until extractors were invented in the 1860s. The Slovenian beekeeper Anton Janša pioneered modern movable frames in the 18th century but extraction came a century later.',
      similarTo:['Wildflower'],
      commonMistakes:[
        'Trying to ferment with the wax intact — wax binds yeast and ruins gravity readings',
        'Buying very old comb expecting fresh-comb aroma — it fades within months',
        'Storing in the fridge — humidity makes the comb soggy. Cool, dry pantry is correct.'
      ]
    }
  },
  
  'Other':{color:'#a08060',intensity:'varies',profile:'Custom or rare honey not in this list.',pairing:'Depends on the source.',notes:'Add tasting notes in your batch journal — build your own reference over time.'}
};

// Regional sourcing note for a honey type named in recipe/ingredient text —
// same currentUnitSystem()-based mechanism as ciderVarietyAvailNote (see
// data-cider.js) and liquidYeastNote (07-views-recipe.js), reusing the app's
// existing unit-system setting as the region signal instead of a separate
// preference. Deliberately conservative: only Tupelo gets an `avail` tag here.
// Most other honey types in this library are either genuinely global
// (Wildflower, Clover, Linden) or equally exotic to every region alike
// (Manuka/NZ, Sidr/Yemen, Coffee Blossom — a US, UK or EU brewer all need a
// specialty importer for those, so the toggle doesn't differentiate anything
// real for them) — tagging those would just be noise, not a genuine regional
// gap the way a Southern-US-only honey or an American heirloom apple is.
function honeyAvailNote(itemText){
  if(!itemText||typeof HONEY_PROFILES==='undefined'||typeof currentUnitSystem!=='function')return null;
  var text=itemText.toLowerCase();
  var names=Object.keys(HONEY_PROFILES).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<names.length;i++){
    var name=names[i];
    if(text.indexOf(name.toLowerCase())===-1)continue;
    var h=HONEY_PROFILES[name];
    if(!h.avail||h.avail.indexOf(currentUnitSystem())!==-1)return null;
    if(h.substituteEU&&currentUnitSystem()==='metric'){
      return name+' honey is a regional specialty (hard to source in mainland Europe) — try '+h.substituteEU;
    }
    return name+' honey is a regional specialty, less common outside '+h.avail.join('/').toUpperCase()+' — check specialty honey importers or substitute a similar local honey.';
  }
  return null;
}

var YEAST_STRAINS=[
  {
    id:'m05',name:'Mangrove Jack\'s M05 — Mead',
    manufacturer:'Mangrove Jack\'s',strain:'Saccharomyces cerevisiae',
    sachetSize:10,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:18,attenuation:97,
    optimalTempLow:16,optimalTempHigh:22,
    tempToleranceLow:15,tempToleranceHigh:30,
    speed:'medium-fast',flocculation:'high',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'subtle',
    profile:'Clean, floral, neutral. Highlights honey character.',
    expectedAromas:['Floral','Honey-forward','Subtle pear/apple esters'],
    expectedFlavors:['Clean','Honey-prominent','Dry to off-dry'],
    recommendedFor:['Traditional Mead','Show Mead','Light Melomel','Spiced Mead','Cyser','Bochet','Metheglin','Bochet'],
    notRecommendedFor:['Braggot (use US-05 for malt character)','Hopped Mead (US-05 works better with hops)'],
    description:'One of the few dry yeasts specifically marketed for honey fermentation. M05 produces fresh, floral esters that complement honey character rather than masking it. The high alcohol tolerance and wide temperature range make it forgiving for beginners — likely the most popular dry mead yeast in Europe and a staple of mead starter kits.',
    whyChoose:'When the honey is the star and you want minimal yeast character. Excellent first-time mead yeast.',
    whyAvoid:'If you want bold yeast esters (try 71B), if your target ABV is over 16% (use EC-1118 as backup), or if your recipe is malt-based (US-05).',
    bestPractices:[
      'Ferment at 18-20°C for the cleanest character — going warm produces fusel alcohols',
      'Pair with a full SNA nutrient schedule — M05 is hungry',
      'Rehydrate with Go-Ferm Protect for high-OG batches (≥1.110) to prevent stuck ferments'
    ],
    commonMistakes:[
      'Underfeeding nutrients (expect H2S/sulfur off-aromas if starved)',
      'Fermenting at room temp in summer — fusels develop above 25°C',
      'Pitching into very high OG (>1.130) without yeast energizer'
    ],
    historicalNotes:'Part of MJ\'s Craft Series, released to fill a gap of dedicated dry mead yeasts (homebrewers previously adapted wine yeasts).',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'ec1118',name:'Lalvin EC-1118 — Champagne',beverageTypes:['mead','cider'],
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae var. bayanus',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:18,attenuation:95,
    optimalTempLow:10,optimalTempHigh:30,
    tempToleranceLow:10,tempToleranceHigh:30,
    speed:'very-fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:false,flavorImpact:'neutral',
    profile:'Aggressive, dry, neutral. The workhorse of stuck-ferment restarts.',
    expectedAromas:['Neutral','Very low ester'],
    expectedFlavors:['Bone-dry','Clean','Crisp','No yeast character'],
    recommendedFor:['Sack Mead','Hydromel','Sparkling Mead','Stuck Ferment Restart','High-OG Traditional'],
    recommendedForCider:['New England Cider','Ice Cider','High-OG cider (10%+)','Stuck Ferment Restart'],
    notRecommendedFor:['Light Melomel (strips delicate fruit aromatics)','Subtle Spiced Mead (too aggressive)','Sweet Mead (will ferment dry no matter what)'],
    description:'Selected from Champagne fermentations. EC-1118 is the most popular wine yeast worldwide — extremely vigorous, very high alcohol tolerance, low nutrient needs, and a "killer factor" that lets it outcompete wild yeasts. The default choice when you want clean dry results and don\'t need delicate flavors.',
    whyChoose:'When you need to push past 16% ABV, restart a stuck batch, or guarantee dry results. Also excellent base for sparkling meads.',
    whyAvoid:'Anything where delicate fruit, floral, or spice character matters — EC-1118 strips them out. The aggressive fermentation also produces more CO2 than gentler yeasts, blowing aromatics out the airlock.',
    bestPractices:[
      'Pitch into well-aerated must — it\'s vigorous enough to handle it',
      'Watch for foam-over in the first 48h, especially above 20°C',
      'Excellent for stuck ferments: rehydrate with Go-Ferm, add to a small starter, then add the stuck must in stages'
    ],
    commonMistakes:[
      'Using it for delicate melomels and being disappointed at the lack of fruit flavor',
      'Over-pitching: it ferments fast enough that one sachet is always plenty up to 23L',
      'Expecting residual sweetness — it will ferment everything fermentable'
    ],
    historicalNotes:'Selected by Lallemand from a famous Champagne region. The go-to yeast for "I want this finished and dry, fast" in both wine and homebrew worlds.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'d47',name:'Lalvin D47 — Côtes du Rhône',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:15,attenuation:90,
    optimalTempLow:15,optimalTempHigh:20,
    tempToleranceLow:15,tempToleranceHigh:30,
    speed:'medium',flocculation:'high',nitrogenNeed:'low',fructophilic:false,flavorImpact:'expressive',
    profile:'Mouthfeel-enhancing, rich, fruity. Tropical undertones.',
    expectedAromas:['Tropical fruit','Stone fruit','Subtle spice'],
    expectedFlavors:['Full-bodied','Round mouthfeel','Fruity','Slightly sweet finish'],
    recommendedFor:['Traditional','Melomel','Pyment','Berry Melomels','Cyser'],
    notRecommendedFor:['Sack Mead (only 14% ABV tolerance)','Anything fermented warm (>20°C produces fusel alcohols)','Hopped Mead'],
    description:'D47 is a French wine yeast originally for white Rhône wines. In mead, it builds genuine body and mouthfeel — meads made with D47 feel more like wine and less like watery alcohol. Famous among mead-makers for its rich, full character.',
    whyChoose:'When you want body and complexity, not just alcohol. Excellent for traditional meads where you want the mead to feel substantial.',
    whyAvoid:'Anywhere temperature control is unreliable — D47 above 20°C produces noticeable fusel alcohols that take months to age out. Also avoid for high-ABV targets — it caps around 14%.',
    bestPractices:[
      'Strict temp control: 17-20°C max during primary. Cool basement or temp-controlled fermenter required',
      'Don\'t leave on the lees too long (max 4 weeks in primary) — D47 lees can impart bitterness',
      'Particularly good for richer honeys (buckwheat, chestnut, heather) that need body to match'
    ],
    commonMistakes:[
      'Fermenting above 22°C → fusel alcohols (smells like solvent / nail polish), takes 6+ months to age out',
      'Leaving on heavy lees for months → off-flavors',
      'Pushing for high ABV — D47 will stall around 14% and leave residual sugar'
    ],
    historicalNotes:'Selected for white Rhône varietals (Viognier, Marsanne). The discovery that it works beautifully on honey was made by the mead-making community.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'71b',name:'Lalvin 71B — Narbonne',beverageTypes:['mead','cider'],
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:14,attenuation:88,
    optimalTempLow:15,optimalTempHigh:30,
    tempToleranceLow:15,tempToleranceHigh:32,
    speed:'medium',flocculation:'high',nitrogenNeed:'low',fructophilic:false,flavorImpact:'expressive',
    profile:'Reduces malic acid, smooth fruity esters. Drinkable young.',
    expectedAromas:['Berry','Tropical fruit','Floral','Pear/apple esters'],
    expectedFlavors:['Smooth','Fruity','Drink-young friendly','Less acidic'],
    recommendedFor:['Fruit Melomels (berry, stone fruit)','Cyser','Traditional','Drink-Young Styles'],
    recommendedForCider:['Fruit Cider','High-tannin heritage apples (softens the malic bite)','Drink-Young Styles'],
    notRecommendedFor:['Sack Mead (low ABV tolerance)','Long-aging styles','Hopped Mead'],
    description:'71B is unique among wine yeasts: it metabolizes up to 40% of the malic acid in the must, smoothing harsh acidity and producing a softer, rounder mead. Combined with strong fruity ester production, it\'s the #1 choice for fruit-forward melomels meant to drink young (3-6 months).',
    whyChoose:'For melomels with tart fruit (raspberry, cherry, blackcurrant, sour fruits). The malic acid reduction smooths the sharpness while preserving fruit character.',
    whyAvoid:'Anywhere you WANT acid bite (e.g. some traditional styles). Also avoid for long aging — 71B fades faster than D47.',
    bestPractices:[
      'Best between 18-24°C — produces the fullest ester profile',
      'Pair with backsweetened fruit additions in secondary for maximum impact',
      'Drink within 6-12 months of bottling — peak character fades after that'
    ],
    commonMistakes:[
      'Aging on lees for long periods → off-flavors (don\'t leave more than 3-4 weeks in primary)',
      'Pushing for high ABV — same limit as D47 (~14%)',
      'Using for high-acid grapes/fruit and then adding acid blend (overkill — let 71B do its work)'
    ],
    historicalNotes:'Selected by INRA Narbonne in southern France for fruit wines from challenging high-acid grapes. Mead-makers adopted it for tart melomels.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'k1v',name:'Lalvin K1-V1116 — Montpellier',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:18,attenuation:95,
    optimalTempLow:10,optimalTempHigh:35,
    tempToleranceLow:10,tempToleranceHigh:35,
    speed:'fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:true,flavorImpact:'expressive',
    profile:'Floral, killer factor, dominant. Highly competitive against wild yeast.',
    expectedAromas:['Floral','Citrus','Honey-amplifying','Subtle ester'],
    expectedFlavors:['Clean','Bright','Floral','Honey-prominent'],
    recommendedFor:['Floral Meads','Hibiscus','Rhodomel','Spiced Mead','Cyser','Restart Stuck Ferments','High-OG'],
    notRecommendedFor:['Hopped Mead','Braggot'],
    description:'K1V-1116 is widely considered the best all-rounder for mead. Floral ester production amplifies honey character, the famous "killer factor" outcompetes wild yeasts and contamination, and the temperature tolerance (10-35°C!) makes it incredibly forgiving. Many experienced mead-makers have switched from EC-1118 to K1V as their default yeast.',
    whyChoose:'When you want vigor + character. K1V combines EC-1118\'s reliability with floral ester production. Excellent for floral honeys (acacia, orange blossom) and when sanitation is risky.',
    whyAvoid:'When you want a completely neutral profile (use EC-1118). For very tart fruit melomels, 71B does better acid reduction.',
    bestPractices:[
      'Forgiving with temperature — runs cleanly anywhere from cellar cold (12°C) up to summer warmth (28°C)',
      'Excellent first pitch when restarting a stuck batch from another yeast',
      'Pair with acacia, orange blossom, or other floral honeys to compound the aromatic effect'
    ],
    commonMistakes:[
      'Using when you wanted a completely neutral fermentation — K1V has subtle ester character that some prefer to avoid',
      'Over-pitching: like EC-1118, one sachet always covers 23L'
    ],
    historicalNotes:'Isolated by Pierre Barré at INRA Montpellier in 1972. Originally for white wines, became the mead-maker\'s favorite for floral styles.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'red-pc',name:'Red Star Premier Cuvée',
    manufacturer:'Red Star (Fermentis/Lesaffre)',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:19,unit:'g',format:'dry',
    abvMax:18,attenuation:95,
    optimalTempLow:7,optimalTempHigh:35,
    tempToleranceLow:7,tempToleranceHigh:35,
    speed:'very-fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:false,flavorImpact:'neutral',
    profile:'Vigorous, dry, neutral. The Red Star cousin of EC-1118.',
    expectedAromas:['Very low ester','Clean'],
    expectedFlavors:['Bone-dry','Crisp','Neutral'],
    recommendedFor:['Sparkling Mead Base','Stuck Ferment Restart','Dry High-ABV Styles','Sack Mead'],
    notRecommendedFor:['Fruit Melomels','Delicate Floral Meads','Sweet Mead'],
    description:'Red Star\'s answer to EC-1118 — same fermentation profile, slightly different lineage. Widely available in North America, less so in Europe where Lalvin EC-1118 dominates. Functionally interchangeable for most homebrewers.',
    whyChoose:'If you can\'t source EC-1118 — they\'re effectively the same yeast for practical purposes.',
    whyAvoid:'Same situations as EC-1118: delicate fruit, subtle floral, anywhere you want yeast character.',
    bestPractices:['Identical to EC-1118 protocols'],
    commonMistakes:['Treating it as different from EC-1118 — they perform virtually identically'],
    historicalNotes:'Red Star is Fermentis/Lesaffre\'s consumer-facing wine yeast brand, dominant in North America.',
    euAvailable:false,widelyAvailable:false,priceCategory:'standard'
  },
  {
    id:'red-bl',name:'Red Star Premier Blanc (Pasteur Champagne)',
    manufacturer:'Red Star (Fermentis/Lesaffre)',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:19,unit:'g',format:'dry',
    abvMax:18,attenuation:93,
    optimalTempLow:10,optimalTempHigh:30,
    tempToleranceLow:10,tempToleranceHigh:30,
    speed:'medium',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'neutral',
    profile:'Crisp, clean, slow but steady. Formerly known as Champagne yeast.',
    expectedAromas:['Crisp','Clean','Low ester'],
    expectedFlavors:['Dry','Clean','Crisp finish'],
    recommendedFor:['Traditional','Pyment','White Wine-Style Meads'],
    notRecommendedFor:['Fast turnaround','Stuck ferment restart (Premier Cuvée better)','Hopped Mead'],
    description:'Slower, more methodical than Premier Cuvée. Best for traditional and pyment styles where you want a clean, crisp profile but don\'t need EC-1118\'s aggression. Less common in Europe.',
    whyChoose:'Crisp dry traditional meads when you want clean fermentation without aggressive speed.',
    whyAvoid:'Restarting stuck batches (use EC-1118 or Premier Cuvée). Time-sensitive batches.',
    bestPractices:['Best in temperature-controlled environments, 15-22°C'],
    commonMistakes:['Confusing with Premier Cuvée — Premier Blanc is slower and slightly more nutrient-needy'],
    historicalNotes:'Long sold simply as "Champagne yeast" before the Premier Blanc branding.',
    euAvailable:false,widelyAvailable:false,priceCategory:'standard'
  },
  {
    id:'qa23',name:'Lalvin QA23',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:16,attenuation:90,
    optimalTempLow:10,optimalTempHigh:30,
    tempToleranceLow:10,tempToleranceHigh:30,
    speed:'medium',flocculation:'medium',nitrogenNeed:'low',fructophilic:false,flavorImpact:'expressive',
    profile:'Sauvignon-blanc esters, thiols, tropical fruit.',
    expectedAromas:['Citrus','Passionfruit','Grapefruit','Tropical fruit'],
    expectedFlavors:['Bright','Crisp','Aromatic','Wine-like'],
    recommendedFor:['Pyment','Light Melomel (citrus, passion fruit)','White Wine-Style Meads'],
    notRecommendedFor:['Heavy meads','Braggot','Hopped Mead'],
    description:'Lalvin\'s thiol-releasing yeast — it converts precursors in the must into tropical fruit thiols (the compounds that give Sauvignon Blanc its passion-fruit/grapefruit aroma). In pyments and citrus melomels, this can produce dramatic aromatic results.',
    whyChoose:'For pyments and any mead where you want bright tropical fruit character.',
    whyAvoid:'Heavy traditional meads (try D47), high-ABV (only 16% tolerance).',
    bestPractices:[
      'Pair with high-acid fruits or grapes — the thiol expression is most dramatic with low-pH must',
      'Cool fermentation (15-18°C) preserves more thiol character'
    ],
    commonMistakes:['Using on neutral fruit and expecting Sauvignon Blanc magic — the precursors need to be in the must'],
    historicalNotes:'Selected by UTAD (University of Trás-os-Montes) in Portugal in cooperation with Vinhos Verdes region.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'w15',name:'WLP720 / White Labs Sweet Mead',drySubstitute:'Lallemand 71B or K1-V1116 — both dry, both leave similar residual sweetness/softness',
    manufacturer:'White Labs',strain:'Saccharomyces cerevisiae',
    sachetSize:null,sachetCoversL:20,unit:'pouch',format:'liquid',
    abvMax:15,attenuation:78,
    optimalTempLow:15,optimalTempHigh:24,
    tempToleranceLow:15,tempToleranceHigh:26,
    speed:'slow',flocculation:'low',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'subtle',
    profile:'Leaves residual sweetness. Slightly fruity. Lower attenuation by design.',
    expectedAromas:['Slightly fruity','Subtle floral'],
    expectedFlavors:['Naturally sweet finish','Lower ABV','Full mouthfeel'],
    recommendedFor:['Naturally Sweet Mead (no backsweetening)','Dessert Mead','Sweet Cider'],
    notRecommendedFor:['Dry mead','High-ABV','Stuck ferment recovery'],
    description:'A liquid yeast specifically selected for incomplete attenuation. Where every other yeast fights to ferment dry, WLP720 happily stops with 1-3% residual sugar, giving you naturally sweet mead without needing to stabilize and backsweeten. Liquid format (not a dry sachet) — 150 billion cells per PurePitch pouch.',
    whyChoose:'When you want truly sweet mead without the complications of stabilizing (sorbate + sulfite + backsweetening).',
    whyAvoid:'Any time you need dry results or high ABV. WLP720 is slow, expensive, and requires refrigeration.',
    bestPractices:[
      'Refrigerate the pouch until ready to pitch',
      'No starter needed for batches up to ~20L with the PurePitch format',
      'Doesn\'t need stabilization — the yeast simply stops attenuating'
    ],
    commonMistakes:[
      'Trying to make dry mead with WLP720 (use M05 or EC-1118 instead)',
      'Letting the pouch warm up before pitching — drops cell count fast',
      'Pushing OG above 1.110 — WLP720 will stall before reaching the target'
    ],
    historicalNotes:'White Labs developed this strain specifically for the mead/cider market gap (sweet finish without stabilization).',
    euAvailable:false,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'us05',name:'Safale US-05 (ale yeast)',
    manufacturer:'Fermentis/Lesaffre',strain:'Saccharomyces cerevisiae (ale)',
    sachetSize:11.5,sachetCoversL:20,unit:'g',format:'dry',
    abvMax:11,attenuation:81,
    optimalTempLow:15,optimalTempHigh:22,
    tempToleranceLow:12,tempToleranceHigh:25,
    speed:'medium',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'subtle',
    profile:'Clean, low ester ale yeast. Limited ABV ceiling.',
    expectedAromas:['Clean','Very low ester','Slight bread-like'],
    expectedFlavors:['Crisp','Clean','Beer-friendly'],
    recommendedFor:['Braggot','Hopped Mead','Low-ABV Session Meads (5-8%)'],
    notRecommendedFor:['Traditional Mead','Sack Mead','Anything above 11% ABV','Fruit Melomels'],
    description:'US-05 is THE American ale yeast — neutral, clean, designed for IPAs and pale ales. In mead-making, it\'s only the right choice for braggots (mead-beer hybrids) and hopped meads where you want beer-yeast character. Don\'t use it for traditional mead.',
    whyChoose:'Specifically for braggots and hopped meads where ale yeast character is desired. Pairs perfectly with hops.',
    whyAvoid:'Traditional mead, sack mead, any high-ABV target. US-05 will give up around 11% and leave residual sugar in stuck fermentation.',
    bestPractices:[
      'Keep below 22°C — above that produces unwanted esters',
      'Pitch a full 11.5g sachet for batches above 15L',
      'Pair with malt or hop additions for braggots'
    ],
    commonMistakes:[
      'Using for traditional mead (will stall, will lack character)',
      'Pushing past 11% — will not reach 14%+ targets',
      'Fermenting cold (<15°C) → stalls'
    ],
    historicalNotes:'Industry-standard American ale yeast since the 1990s craft beer boom. Equivalent to Wyeast 1056, White Labs WLP001.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'bcs103',name:'Fermentis BC-S103 — Mead',
    manufacturer:'Fermentis',strain:'Saccharomyces cerevisiae',
    sachetSize:11,sachetCoversL:30,unit:'g',format:'dry',
    abvMax:18,attenuation:95,
    optimalTempLow:15,optimalTempHigh:24,
    tempToleranceLow:14,tempToleranceHigh:30,
    speed:'medium-fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:true,flavorImpact:'subtle',
    profile:'Clean, fruity, aromatic — Fermentis\'s dedicated mead strain. The most accessible DRY fructophilic yeast.',
    expectedAromas:['Clean','Fruity','Light floral'],
    expectedFlavors:['Clean','Fruit-forward','Finishes dry'],
    recommendedFor:['Traditional Mead','High-fructose honey (Acacia, Tupelo)','Show Mead','Light Melomel'],
    notRecommendedFor:['Braggot (use an ale strain)','Cases where you want a neutral, character-free finish (EC-1118)'],
    description:'BC-S103 is Fermentis\'s mead-focused dry yeast and the easiest fructophilic strain to source, store, and pitch — no liquid handling. The mead community treats it as a K1-V1116 equivalent for acacia and tupelo batches: it carries an 18% ABV tolerance and low nitrogen demand (operationally similar to EC-1118) while adding a genuine fructose-fermentation advantage that stops high-F:G musts stalling at the 1/3 break.',
    whyChoose:'When you want a fructophilic strain in convenient dry format — the go-to for high-fructose honey (acacia, tupelo, lavender, sage) without resorting to a liquid yeast.',
    whyAvoid:'If you want a completely neutral profile (EC-1118) or bold ester character (K1-V1116). Slightly less widely stocked than Lalvin strains in some regions.',
    bestPractices:[
      'Reach for this whenever the honey is fructose-dominant (F:G above ~1.35) and you prefer a dry yeast',
      'Rehydrate with Go-Ferm; follow a standard staggered or TOSNA schedule',
      'Low nitrogen demand — don\'t overfeed late DAP'
    ],
    commonMistakes:[
      'Treating it as neutral — it adds a light fruity character (a plus in most meads)',
      'Assuming dry yeast can\'t be fructophilic — this one is'
    ],
    historicalNotes:'A mead-specific release that filled the gap for a DRY fructophilic strain; widely discussed in the r/mead community as the accessible alternative to liquid fructophilic options.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'uvaferm43',name:'Lallemand UVAFERM 43',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae var. bayanus',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:16,attenuation:96,
    optimalTempLow:15,optimalTempHigh:30,
    tempToleranceLow:15,tempToleranceHigh:30,
    speed:'fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:true,flavorImpact:'neutral',
    profile:'Clean, neutral, robust — a fructophilic EC-1118 alternative engineered for high-fructose musts.',
    expectedAromas:['Neutral','Clean'],
    expectedFlavors:['Clean','Crisp','Finishes dry'],
    recommendedFor:['High-fructose honey (Acacia, Tupelo)','Stuck-ferment restarts','Traditional Mead','High-gravity batches'],
    notRecommendedFor:['Recipes wanting yeast-derived fruitiness (71B, K1-V1116)','Braggot'],
    description:'Selected by Scott Labs for the HXT3 gene that drives fructophilic character, UVAFERM 43 was chosen for very ripe grapes where fructose exceeds glucose — exactly the challenge acacia and tupelo honeys pose. Standard strains eat glucose first then slow on the fructose-heavy remainder; UVAFERM 43 powers through. A dedicated RESTART variant is pre-acclimatised for rescuing stuck high-fructose, high-alcohol musts.',
    whyChoose:'A clean, neutral fructophilic workhorse — think "EC-1118 that can also finish a fructose-dominant honey". Strong for stuck-ferment restarts.',
    whyAvoid:'When you want ester/character contribution (it is deliberately neutral). Less common in homebrew retail than Lalvin — look to winemaking suppliers.',
    bestPractices:[
      'Use for acacia/tupelo when you want a neutral finish rather than K1-V1116\'s esters',
      'For restarts, use the UVAFERM 43 RESTART variant pitched per Lallemand\'s rehydration protocol',
      'Low nitrogen demand; standard staggered/TOSNA scheduling'
    ],
    commonMistakes:[
      'Expecting flavour contribution — it is intentionally neutral',
      'Sourcing frustration — check winemaking (not just homebrew) suppliers'
    ],
    historicalNotes:'A Scott Labs / Lallemand wine strain repurposed for high-fructose fermentations; its fructophilic trait comes from selective breeding for the HXT3 fructose transporter.',
    euAvailable:true,widelyAvailable:false,priceCategory:'standard'
  },
  {
    id:'dv10',name:'Lalvin DV10',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae var. bayanus',
    sachetSize:5,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:18,attenuation:96,
    optimalTempLow:10,optimalTempHigh:30,
    tempToleranceLow:10,tempToleranceHigh:35,
    speed:'fast',flocculation:'medium',nitrogenNeed:'low',fructophilic:false,flavorImpact:'neutral',
    profile:'Clean, crisp, very low H2S and volatile acidity — a slightly more aromatic EC-1118.',
    expectedAromas:['Clean','Very low sulfur'],
    expectedFlavors:['Crisp','Dry','Honey character preserved'],
    recommendedFor:['Traditional Mead','Long/cool fermentations','Difficult conditions','Sparkling mead base'],
    notRecommendedFor:['Recipes wanting strong yeast esters (71B/K1-V1116)','Braggot'],
    description:'A French bayanus sparkling-wine strain selected for exceptionally low hydrogen sulphide and volatile acidity — the two most common mead off-flavour risks. It shares EC-1118\'s high ABV tolerance and wide temperature range but is a touch less neutral, preserving more honey character. An excellent EC-1118 alternative when you want reliability and clean results without total flavour neutrality.',
    whyChoose:'When you want EC-1118 robustness but with lower sulfur risk and a little more honey character retained — great for long, cool, or stressed ferments.',
    whyAvoid:'If you specifically want yeast-derived fruitiness (71B), or a fructophilic strain for high-fructose honey (BC-S103/UVAFERM 43/K1-V1116).',
    bestPractices:[
      'A strong default for clean traditionals where H2S has bitten you before',
      'Low flocculation-to-medium; fine for sparkling/bottle-conditioned styles',
      'Standard staggered/TOSNA nutrient scheduling'
    ],
    commonMistakes:[
      'Assuming it\'s identical to EC-1118 — it\'s cleaner on sulfur and slightly more characterful',
      'Using it on a high-fructose honey expecting a fructophilic finish (it isn\'t one)'
    ],
    historicalNotes:'Bred from the Prise de Mousse (EC-1118) lineage and selected for low off-flavour production; a favourite for difficult or extended fermentations.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  // ---- Additional commercial strains (mead/wine/cider/kveik) ----
  {
    id:'wyeast4184',name:'Wyeast 4184 — Sweet Mead',drySubstitute:'Lallemand 71B or K1-V1116 for a similarly soft, sweet-leaning result',
    manufacturer:'Wyeast',strain:'Saccharomyces cerevisiae (blend)',
    sachetSize:1,sachetCoversL:19,unit:'pack',format:'liquid',
    abvMax:11,attenuation:70,
    optimalTempLow:18,optimalTempHigh:24,
    tempToleranceLow:15,tempToleranceHigh:27,
    speed:'medium',flocculation:'high',nitrogenNeed:'high',fructophilic:false,flavorImpact:'moderate',
    profile:'Stops around 11% ABV leaving natural residual sweetness — semi-sweet mead without stabilising.',
    expectedAromas:['Fruity','Full','Honey-forward'],
    expectedFlavors:['Residual sweetness','Full body','Fruity'],
    recommendedFor:['Sweet Traditional','Dessert Mead','Semi-sweet Melomel'],
    notRecommendedFor:['Dry mead (it won\'t finish dry)','High-ABV sack (caps ~11%)'],
    description:'A liquid blend designed to produce naturally sweet mead by stalling around 11% ABV, leaving fermentable sugar behind without sulfite/sorbate stabilisation or cold-crashing. High nitrogen demand — follow a careful staggered/TOSCA schedule or it can stick early and harshly.',
    whyChoose:'When you want a semi-sweet to sweet mead the natural way, without backsweetening or stabilising.',
    whyAvoid:'If you need a dry finish or an ABV above ~11%.',
    bestPractices:['Feed it well — high nitrogen demand, follow the full nutrient schedule','Use fresh and make a starter; liquid viability drops with age'],
    commonMistakes:['Expecting a dry finish','Under-pitching an old smack-pack'],
    historicalNotes:'A long-standing Wyeast mead strain; one half of their classic Sweet/Dry mead pair.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wyeast4632',name:'Wyeast 4632 — Dry Mead',drySubstitute:'Lallemand EC-1118 — same clean, fully-dry, high-attenuating profile',
    manufacturer:'Wyeast',strain:'Saccharomyces cerevisiae',
    sachetSize:1,sachetCoversL:19,unit:'pack',format:'liquid',
    abvMax:18,attenuation:95,
    optimalTempLow:18,optimalTempHigh:24,
    tempToleranceLow:15,tempToleranceHigh:27,
    speed:'medium-fast',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'subtle',
    profile:'Purpose-built dry mead strain — clean fermentation to 18% ABV. A solid all-rounder.',
    expectedAromas:['Clean','Slight fruit'],
    expectedFlavors:['Dry','Clean','Light fruit'],
    recommendedFor:['Traditional Dry Mead','Show Mead','Session Mead'],
    notRecommendedFor:['Naturally sweet mead (use 4184)'],
    description:'A purpose-built liquid mead strain and a dependable all-rounder; "Dry" refers to its high ~18% ABV tolerance. Clean, honey-forward fermentations. Like most liquid yeast it benefits from a starter and fresh stock.',
    whyChoose:'A clean, high-tolerance dry mead workhorse when you want a liquid strain.',
    whyAvoid:'If you want residual sweetness without backsweetening, or prefer the convenience of dry yeast.',
    bestPractices:['Make a starter for high-OG musts','Standard staggered/TOSNA nutrient schedule'],
    commonMistakes:['Pitching an old pack into a big must without a starter'],
    historicalNotes:'A long-standing purpose-built mead strain and the dry counterpart to Wyeast 4184.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wlp715',name:'White Labs WLP715 — Champagne',drySubstitute:'Lallemand EC-1118 — the dry champagne-yeast equivalent, same clean/neutral high-attenuating role',
    manufacturer:'White Labs',strain:'Saccharomyces cerevisiae (bayanus type)',
    sachetSize:1,sachetCoversL:19,unit:'vial',format:'liquid',
    abvMax:17,attenuation:90,
    optimalTempLow:21,optimalTempHigh:24,
    tempToleranceLow:18,tempToleranceHigh:27,
    speed:'fast',flocculation:'low',nitrogenNeed:'low',fructophilic:false,flavorImpact:'neutral',
    profile:'Classic neutral Champagne strain — ferments dry and lets the honey lead. Good for sparkling meads.',
    expectedAromas:['Neutral','Clean','Crisp'],
    expectedFlavors:['Dry','Crisp','Honey-forward'],
    recommendedFor:['Sparkling Mead','Dry Traditional','Show Mead'],
    notRecommendedFor:['Sweet mead (ferments too dry)'],
    description:'White Labs\' classic Champagne strain: neutral, fermenting to a very dry finish (70–90% attenuation), tolerant to ~17% ABV, with minimal esters of its own so honey character dominates. Low flocculation means it can need fining or a cold crash to clear.',
    whyChoose:'Neutral, dry, reliable — ideal for sparkling and showcasing the honey.',
    whyAvoid:'If you want residual sweetness or any yeast-driven character.',
    bestPractices:['Cold crash or fine — low flocculation leaves haze','Great base for bottle-conditioned sparkling meads'],
    commonMistakes:['Expecting it to leave sweetness'],
    historicalNotes:'A staple wine/mead Champagne strain; the liquid analogue to EC-1118.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wlp720',name:'White Labs WLP720 — Sweet Mead/Wine',drySubstitute:'Lallemand 71B or K1-V1116 for a similarly soft, sweet-leaning result',
    manufacturer:'White Labs',strain:'Saccharomyces cerevisiae',
    sachetSize:1,sachetCoversL:19,unit:'vial',format:'liquid',
    abvMax:15,attenuation:73,
    optimalTempLow:21,optimalTempHigh:24,
    tempToleranceLow:18,tempToleranceHigh:27,
    speed:'medium',flocculation:'low',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'moderate',
    profile:'Leaves more residual sweetness than WLP715 — built for semi-sweet and sweet traditionals.',
    expectedAromas:['Slightly fruity','Soft'],
    expectedFlavors:['Residual sweetness','Soft','Fruity'],
    recommendedFor:['Semi-sweet Traditional','Sweet Mead','Dessert Melomel'],
    notRecommendedFor:['Bone-dry mead'],
    description:'White Labs\' dedicated sweet mead/wine strain. Unlike WLP715 it\'s selected to leave more residual sweetness at a ~15% ABV ceiling, making it apt for semi-sweet and sweet styles. Low flocculation — plan to fine or cold crash.',
    whyChoose:'A natural route to semi-sweet/sweet mead without stabilising and backsweetening.',
    whyAvoid:'If you want a dry finish or a higher ABV.',
    bestPractices:['Fine or cold crash for clarity','Pair with a moderate nutrient schedule'],
    commonMistakes:['Expecting a dry, high-ABV result'],
    historicalNotes:'The sweet counterpart to WLP715 in White Labs\' mead range.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wlp099',name:'White Labs WLP099 — Super High Gravity',drySubstitute:'Lallemand EC-1118 — the closest dry high-tolerance strain, though its ceiling is somewhat lower',
    manufacturer:'White Labs',strain:'Saccharomyces cerevisiae',
    sachetSize:1,sachetCoversL:19,unit:'vial',format:'liquid',
    abvMax:22,attenuation:85,
    optimalTempLow:18,optimalTempHigh:20,
    tempToleranceLow:16,tempToleranceHigh:24,
    speed:'medium',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'moderate',
    profile:'For extreme high-gravity sacks and bochets — rated to ~25% ABV (≈22% practical without step-feeding).',
    expectedAromas:['Ester-forward at high gravity','Malty at low gravity'],
    expectedFlavors:['Warming','Big body','Ester-forward'],
    recommendedFor:['High-gravity Sack Mead','Bochet','Barleywine-strength braggot'],
    notRecommendedFor:['Light/session meads (overkill)','Delicate traditionals'],
    description:'The strain for extreme meads: high-gravity sacks (OG 1.150+), caramelised bochets, or any batch pushed well beyond the ~18% ceiling of most strains. Manufacturer-rated to 25% ABV; ~22% is the practical home ceiling without step-feeding. Demands staged nutrient additions and patience.',
    whyChoose:'When you genuinely need 18%+ ABV and a strain that won\'t quit.',
    whyAvoid:'For any normal-strength mead — it\'s specialist gear.',
    bestPractices:['Step-feed honey and stagger nutrients for the highest ABVs','Keep temperature steady at 18–20°C to limit fusels'],
    commonMistakes:['Using it for ordinary meads','Front-loading all the sugar instead of step-feeding'],
    historicalNotes:'White Labs\' specialist strain bred for barleywines and extreme-gravity fermentations.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wyeast1388',name:'Wyeast 1388 — Belgian Strong Ale',drySubstitute:'no close dry equivalent in this library — ask your local shop for a dry Belgian-style ale yeast, or fall back to 71B for a cleaner (non-Belgian) result',
    manufacturer:'Wyeast',strain:'Saccharomyces cerevisiae (POF+)',
    sachetSize:1,sachetCoversL:19,unit:'pack',format:'liquid',
    abvMax:12,attenuation:75,
    optimalTempLow:18,optimalTempHigh:25,
    tempToleranceLow:16,tempToleranceHigh:28,
    speed:'medium-fast',flocculation:'low',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'bold',
    profile:'Classic braggot strain — spicy, fruity, phenolic Belgian character alongside malt and honey.',
    expectedAromas:['Fruity','Spicy','Phenolic (clove/pepper)'],
    expectedFlavors:['Belgian character','Spicy','Fruity'],
    recommendedFor:['Braggot','Hopped Mead','Spiced strong mead'],
    notRecommendedFor:['Show Mead (its phenolics bury delicate honey)','Light traditionals'],
    description:'A POF+ Belgian ale strain that adds spicy, fruity, phenolic complexity — a natural choice for braggots (mead brewed with malt and/or hops) where you want layered character without it dominating. Caps around 12% ABV.',
    whyChoose:'For braggots and hopped/spiced meads that want Belgian esters and phenols.',
    whyAvoid:'If you want the honey to speak cleanly — it won\'t stay quiet.',
    bestPractices:['Ferment warmer (20–24°C) to develop the Belgian esters','Best when malt or hop fermentables are present'],
    commonMistakes:['Using it on a delicate traditional','Fermenting too cold and getting a muted profile'],
    historicalNotes:'A popular Belgian strong-ale strain widely adopted by braggot makers.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'wlp775',name:'White Labs WLP775 — English Cider',drySubstitute:'Lallemand Nottingham for a similarly English-ale-derived character, or EC-1118 for a cleaner, drier result',beverageTypes:['mead','cider'],
    manufacturer:'White Labs',strain:'Saccharomyces cerevisiae',
    sachetSize:1,sachetCoversL:19,unit:'vial',format:'liquid',
    abvMax:15,attenuation:90,
    optimalTempLow:20,optimalTempHigh:24,
    tempToleranceLow:18,tempToleranceHigh:27,
    speed:'medium',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'moderate',
    profile:'Cider strain that ferments dry while retaining apple character — excellent for cysers.',
    expectedAromas:['Apple','Crisp','Fresh fruit'],
    expectedFlavors:['Dry','Crisp','Retained apple character'],
    recommendedFor:['Cyser','Apple Melomel','Dry fruit mead'],
    recommendedForCider:['English Cider','Common Cider','French Cider (natural MLF character)'],
    notRecommendedFor:['Sweet traditionals (ferments dry)'],
    description:'White Labs\' English cider strain — a natural choice for cysers (apple-and-honey meads). Selected to ferment apple sugars dry (80–100% attenuation) while keeping the apple fruit character, a balance harder to get from a neutral wine yeast.',
    whyChoose:'For cysers where you want a dry finish but the apple to survive.',
    whyAvoid:'If you want residual sweetness or a non-apple style.',
    bestPractices:['Plan for a dry finish — backsweeten if you want it off-dry','Use fresh cloudy juice for the most apple character'],
    commonMistakes:['Expecting residual sweetness'],
    historicalNotes:'A cider yeast adopted by mead makers specifically for cysers.',
    euAvailable:true,widelyAvailable:false,priceCategory:'premium'
  },
  {
    id:'voss-kveik',name:'Lallemand Voss Kveik',
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae (kveik)',
    sachetSize:11,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:16,attenuation:80,
    optimalTempLow:25,optimalTempHigh:40,
    tempToleranceLow:20,tempToleranceHigh:42,
    speed:'very-fast',flocculation:'medium',nitrogenNeed:'medium',fructophilic:false,flavorImpact:'moderate',
    profile:'Norwegian farmhouse strain — ferments extremely fast at 35–40°C with bright orange/citrus esters.',
    expectedAromas:['Orange','Citrus','Clean at high temp'],
    expectedFlavors:['Citrus','Clean','Bright'],
    recommendedFor:['Fast-turnaround Mead','Bochet','Braggot','Summer session mead'],
    notRecommendedFor:['Cool-fermented delicate traditionals (it wants heat)'],
    description:'A traditional Norwegian farmhouse (kveik) yeast and a growing talking point in meadmaking: it ferments fast at temperatures that would stress or kill other strains (up to ~40°C), staying clean while throwing orange and citrus esters. Ideal when you want speed and a flavour twist for bochets or braggots.',
    whyChoose:'When you want a fast ferment in a warm room and a bright citrus character.',
    whyAvoid:'If you\'re fermenting cool or want a perfectly neutral profile.',
    bestPractices:['Pitch warm (30–35°C) — it loves heat and stalls if too cold','Excellent for quick bochet/braggot turnarounds'],
    commonMistakes:['Fermenting it cold like a wine yeast','Assuming high temp means fusels — kveik stays clean hot'],
    historicalNotes:'Voss is one of the best-known kveik landraces, isolated and commercialised by Lallemand from Norwegian farmhouse cultures.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'nottingham',name:'Lallemand Nottingham — English Ale',beverageTypes:['cider'],
    manufacturer:'Lallemand',strain:'Saccharomyces cerevisiae',
    sachetSize:11,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:14,attenuation:82,
    optimalTempLow:14,optimalTempHigh:20,
    tempToleranceLow:10,tempToleranceHigh:22,
    speed:'medium-fast',flocculation:'high',nitrogenNeed:'low',fructophilic:false,flavorImpact:'subtle',
    profile:'Neutral English ale yeast — lets apple character lead, cold-tolerant, clean and smooth finish.',
    expectedAromas:['Neutral','Faint fruity undertone'],
    expectedFlavors:['Clean','Smooth','Apple-forward (gets out of the way)'],
    recommendedFor:['Common Cider','English Cider','Any style where apple character should lead'],
    notRecommendedFor:['Styles wanting strong yeast-driven esters (use 71B instead)'],
    description:'One of the most widely used cider yeasts precisely because it\'s neutral — it ferments cleanly and gets out of the way, letting the apple (or apple blend) speak for itself. Genuinely cold-tolerant down to about 10°C, which suits unheated cellar/garage fermentation through a cool autumn.',
    whyChoose:'Your default cider yeast when you want the fruit, not the yeast, to define the result.',
    whyAvoid:'If you specifically want pronounced fruity esters — 71B or a wine yeast will give you more character.',
    bestPractices:['Ferment on the cooler end of its range (14-18°C) for the cleanest result','High flocculation means it drops bright with time — patience over fining'],
    commonMistakes:['Pitching warm and expecting the same clean profile — heat brings out more of its (usually hidden) yeast character'],
    historicalNotes:'Originally an English brewer\'s ale strain; adopted widely by cidermakers for the same reason brewers like it — reliable, clean, flocculent.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  },
  {
    id:'wyeast4766',name:'Wyeast 4766 — Cider',drySubstitute:'Lallemand Nottingham or Mangrove Jack\'s M02 — both dry, both purpose-suited to cider',beverageTypes:['cider'],
    manufacturer:'Wyeast',strain:'Saccharomyces cerevisiae',
    sachetSize:1,sachetCoversL:19,unit:'vial',format:'liquid',
    abvMax:12,attenuation:85,
    optimalTempLow:16,optimalTempHigh:24,
    tempToleranceLow:16,tempToleranceHigh:24,
    speed:'medium',flocculation:'medium',nitrogenNeed:'low',fructophilic:false,flavorImpact:'subtle',
    profile:'Purpose-built liquid cider strain — balanced, moderate attenuation, keeps some roundness rather than bone-dry.',
    expectedAromas:['Apple-forward','Mild fruity esters'],
    expectedFlavors:['Balanced','Not aggressively dry','Retains some body'],
    recommendedFor:['Common Cider','French Cider (rounder, less bone-dry finish)'],
    notRecommendedFor:['High-gravity styles above ~12% ABV (use EC-1118 instead)'],
    description:'A liquid strain marketed specifically for cider, with a narrower, more moderate temperature range than the wine yeasts also used for cider. Its moderate (not maximal) attenuation leaves a little more roundness/body than EC-1118 or Nottingham, suiting rounder, less austere styles.',
    whyChoose:'When you want a purpose-built cider strain rather than repurposing a wine or ale yeast, and don\'t need very high ABV.',
    whyAvoid:'High-gravity ice cider or New England-style — its 12% tolerance is a real ceiling.',
    bestPractices:['Keep within its 16-24°C range — it wasn\'t bred for temperature extremes like kveik or EC-1118\'s wide tolerance'],
    commonMistakes:['Pitching into a very high-OG must expecting it to power through — check the ABV ceiling first'],
    historicalNotes:'One of the earliest yeasts marketed specifically "for cider" rather than adapted from wine or ale use.',
    euAvailable:false,widelyAvailable:true,priceCategory:'premium'
  },
  {
    id:'mangrovejacks-m02',name:'Mangrove Jack\'s M02 — Cider',beverageTypes:['cider'],
    manufacturer:'Mangrove Jack\'s',strain:'Saccharomyces cerevisiae',
    sachetSize:9,sachetCoversL:23,unit:'g',format:'dry',
    abvMax:12,attenuation:88,
    optimalTempLow:18,optimalTempHigh:24,
    tempToleranceLow:16,tempToleranceHigh:28,
    speed:'medium',flocculation:'very-high',nitrogenNeed:'low',fructophilic:false,flavorImpact:'subtle',
    profile:'Craft Series dry cider yeast, ships with nutrient already blended in — highly flocculant, drops bright on its own.',
    expectedAromas:['Clean apple','Minimal yeast character'],
    expectedFlavors:['Clean','Crisp','Clears naturally'],
    recommendedFor:['Common Cider','Beginner-friendly ciders (built-in nutrient reduces one variable)'],
    notRecommendedFor:['High-gravity styles above ~12% ABV'],
    description:'A dry cider yeast sold with its nutrient requirement already blended into the sachet — a genuinely beginner-friendly option since it removes one of the decisions (how much nutrient, when) that trips up first-time cidermakers. Its very high flocculation means it drops out on its own once fermentation finishes, often clearing without any fining.',
    whyChoose:'First cider batch, or any time you want one less thing to plan — nutrient is already handled.',
    whyAvoid:'If you\'re dosing nutrient precisely yourself (TOSNA-style staggered additions) — the built-in nutrient makes a separate schedule redundant.',
    bestPractices:['No separate nutrient addition needed — that\'s the point of this product','Rack promptly once clear; very high flocculation means it compacts hard on the bottom'],
    commonMistakes:['Adding a full separate nutrient schedule on top of the built-in dose — risks over-nutrification'],
    historicalNotes:'Part of Mangrove Jack\'s Craft Series, mirroring their M05 mead yeast\'s "batteries included" approach to nutrient.',
    euAvailable:true,widelyAvailable:true,priceCategory:'standard'
  }
];

var NUTRIENT_PRODUCTS=[
  {
    id:'mj-mead',name:"Mangrove Jack's Mead Yeast Nutrient",
    protocol:'sna',unit:'g',sachetSize:12,sachetCoversL:9,dosagePerL:1.5,
    composition:'100% yeast autolysate (organic nitrogen). Minimum 4% YAN.',
    description:'Mangrove Jack\'s dedicated mead nutrient — pure organic nitrogen from yeast autolysate. Designed for batch sizes 3-9L per sachet. Pairs natively with M05 but works with any wine/mead yeast. Widely available from homebrew shops.',
    whyChoose:'Mead-specific formulation, pre-portioned for typical batch sizes, no measuring required.',
    whyAvoid:'Bulk users who run multiple batches — buy Fermaid-O in bulk instead (cheaper per gram).',
    bestFor:['Beginner-friendly SNA','Single-batch use','When MJ M05 is the yeast'],
    notRecommendedFor:['Bulk fermentation','TOSNA protocol (no DAP but slightly different timing)'],
    whenToAdd:'Stagger across 2-3 doses, all before 1/3 sugar break (when gravity has dropped ~33% of the way from OG to expected FG).',
    tips:[
      '12g per ~9L batch covers a standard moderate-OG mead (1.080-1.110)',
      'Mix into a small amount of must to dissolve before adding (powder clumps on the surface)',
      'Pair with Go-Ferm Protect in rehydration for optimal yeast health from day zero'
    ],
    euAvailable:true,widelyAvailable:true
  },
  {
    id:'fermaid-o',name:'Fermaid-O',
    protocol:'tosna',unit:'g',sachetSize:null,dosagePerL:0.5,
    composition:'100% organic nitrogen from inactivated yeast. NO DAP.',
    description:'The gold standard for clean mead-making. Fermaid-O contains only organic nitrogen (from inactivated yeast hulls) — no DAP, no inorganic phosphates. The TOSNA protocol uses it across 4 staggered doses to produce the cleanest possible fermentation with minimal fusel alcohol production. Hard to source in EU; check Baldinger.biz (Switzerland) or browin.pl.',
    whyChoose:'When you want the cleanest possible fermentation, especially for showcase honeys. The slow, organic-only feed produces less heat, fewer fusels, and a more elegant final mead.',
    whyAvoid:'Difficult to source in Europe. Slower fermentation than SNA — adds days to the timeline. Slightly more complex to dose.',
    bestFor:['Cleanest possible fermentation','High-end traditional meads','Showcase honey varietals','Long-aging styles'],
    notRecommendedFor:['Quick session meads','Beginners (TOSNA protocol is more involved)'],
    whenToAdd:'4 doses total: day 0 rehydration (Go-Ferm), then day 1, day 3, and day 6-7 (or 1/3 sugar break).',
    tips:[
      'Use the TOSNA calculator at meadmaderight.com for precise per-batch dosing',
      'Pair with Go-Ferm Protect for rehydration nitrogen',
      'Total dose ~2.5g per liter at typical OG (1.090-1.110)'
    ],
    euAvailable:false,widelyAvailable:false
  },
  {
    id:'fermaid-k',name:'Fermaid-K',
    protocol:'sna',unit:'g',sachetSize:null,dosagePerL:0.6,
    composition:'DAP + organic nitrogen + magnesium + thiamine. Industry SNA staple.',
    description:'A complete SNA nutrient — combines diammonium phosphate (DAP, fast-acting inorganic nitrogen) with organic nitrogen and micronutrients. Used in commercial winemaking for decades. Slightly riskier than Fermaid-O because DAP added late in fermentation can produce fusel alcohols, but properly timed it\'s very effective.',
    whyChoose:'When you need stronger nitrogen than pure-organic Fermaid-O can deliver — high-OG batches (>1.110), N-deficient honeys, or when you need fermentation to finish faster.',
    whyAvoid:'Late-fermentation additions of DAP can cause fusels. Strict timing required: all doses must be IN before the 1/3 sugar break.',
    bestFor:['High-OG batches (sack mead)','When fermentation needs vigor','Industrial-scale brewing'],
    notRecommendedFor:['Slow elegant ferments (Fermaid-O is better)','Late-stage additions (risk of fusels)'],
    whenToAdd:'2-3 doses across the first 3-5 days, ALL completed before 1/3 sugar break.',
    tips:[
      'Total dose ~3g per liter at typical OG',
      'Pair with Go-Ferm for rehydration',
      'Stop dosing once gravity has dropped 33% — late DAP = fusel risk'
    ],
    euAvailable:false,widelyAvailable:false
  },
  {
    id:'vinoferm-nutrivit',name:'Vinoferm Nutrivit',
    protocol:'sna',unit:'g',sachetSize:null,dosagePerL:0.2,
    composition:'DAP + amino acid mix + vitamins (B1).',
    description:'A typical homebrew-shop house nutrient for wine/mead/beer. Bulk powder, dosed by g/L. Strong nitrogen content — at maximum dose of 3g/10L it delivers ~42mg/L of absorbable nitrogen, which is plenty for most mead recipes. A common European alternative when Fermaid is unobtainable.',
    whyChoose:'Cheap, widely available in Europe, effective. A solid option when Fermaid isn\'t imported.',
    whyAvoid:'Like Fermaid-K, contains DAP — strict timing required to avoid fusels.',
    bestFor:['EU brewers','Standard SNA protocol','Cost-conscious bulk brewing'],
    notRecommendedFor:['TOSNA protocol (contains DAP)','Late-fermentation additions'],
    whenToAdd:'Starting fermentation: 1-3 g per 10L. During fermentation: 1-2 g per 10L. All before 1/3 sugar break. Max legal: 3 g per 10L.',
    tips:[
      'Sold by homebrew shops in 50g, 100g, 500g, 1kg packs',
      'Sourced direct from homebrew suppliers (better price than retail)',
      '1g per 10L = +14 mg/L absorbable nitrogen'
    ],
    euAvailable:true,widelyAvailable:true
  },
  {
    id:'vinoferm-nutrisal',name:'Vinoferm Nutrisal (DAP)',
    protocol:'sna',unit:'g',sachetSize:null,dosagePerL:0.45,
    composition:'100% Diammonium Phosphate. Pure inorganic nitrogen.',
    description:'Pure DAP from any homebrew supplier. Cheap, effective, fast-acting. Strictly for early fermentation only — DAP added late produces fusel alcohols. Often paired with an organic source (e.g. Nutrivit) for a balanced amino acid + DAP profile.',
    whyChoose:'Cheap bulk nitrogen for high-OG batches. Excellent in combination with Nutrivit for balanced nutrient blend.',
    whyAvoid:'Pure DAP alone is harsh — fermentation produces more heat and stress. Better as part of a blend.',
    bestFor:['High-OG starts','Restarting stuck ferments','Combined with amino-rich nutrient'],
    notRecommendedFor:['Solo use as sole nutrient','Late-stage additions','Cleanest possible ferments (use Fermaid-O)'],
    whenToAdd:'Day 0 and day 1 only. Must be before 1/3 sugar break.',
    tips:[
      'Typical dosage: 3-6 g per 10L (=0.3-0.6 g/L)',
      'Combine with Nutrivit at half-dose each for balanced nitrogen + amino acids',
      'NEVER add after 1/3 sugar break — late DAP = nail-polish fusels'
    ],
    euAvailable:true,widelyAvailable:true
  },
  {
    id:'goferm',name:'Go-Ferm Protect',
    protocol:'goferm',unit:'g',sachetSize:null,dosagePerL:null,
    composition:'Inactivated yeast hulls with sterols, fatty acids, micronutrients.',
    description:'Go-Ferm is NOT added to the must. It\'s sprinkled into the yeast rehydration water to give the dry yeast a healthy start. The sterols and unsaturated fatty acids it provides are needed for yeast cell membrane integrity during the lag phase — properly rehydrated yeast has 2-4× the viability and far fewer stuck fermentations.',
    whyChoose:'Almost always. The cost is trivial (~€10/100g, enough for 20+ batches) and the insurance against stuck ferments is enormous.',
    whyAvoid:'A genuine, ongoing debate, not just laziness: some experienced brewers direct-pitch dry yeast straight into the must and get good results, citing the extra handling step (and the infection risk that comes with it) as not worth it. Most current mead-specific guidance still recommends rehydrating for the viability boost, so that stays the default here — but direct-pitching is a real, defensible choice, not a shortcut only for low-stakes batches.',
    bestFor:['Every batch above OG 1.090','Stuck ferment restarts','High-stress fermentations'],
    notRecommendedFor:['As a must-stage nutrient (this is rehydration ONLY)'],
    whenToAdd:'Day 0 only. Dissolve in 43°C water at 1.25× the dry yeast weight. Cool to ~35°C, add yeast, wait 15 min, gradually temper to must temperature.',
    tips:[
      'For 10g M05: dissolve 12.5g Go-Ferm in 200ml warm (43°C) water',
      'NEVER add directly to must — it doesn\'t do anything there',
      'Sold in 100g bags via Lallemand distributors and homebrew shops'
    ],
    euAvailable:true,widelyAvailable:true
  },
  {
    id:'tronozymol',name:'Tronozymol',
    protocol:'sna',unit:'g',sachetSize:null,dosagePerL:0.4,
    composition:'DAP + B-vitamins + amino acids + magnesium.',
    description:'UK-popular general-purpose nutrient. Similar profile to Vinoferm Nutrivit but with different ratios. Available via UK suppliers if Vinoferm runs short.',
    whyChoose:'UK-based brewers, or as a backup when Nutrivit is out of stock.',
    whyAvoid:'Generally less available in continental EU. Nutrivit is the equivalent product locally.',
    bestFor:['UK SNA protocol','Backup nutrient'],
    notRecommendedFor:['TOSNA (contains DAP)','Late additions'],
    whenToAdd:'2 doses across early fermentation, before 1/3 sugar break.',
    tips:['Functionally interchangeable with Vinoferm Nutrivit for most purposes'],
    euAvailable:true,widelyAvailable:false
  },
  {
    id:'generic-dap',name:'Generic DAP (Diammonium Phosphate)',
    protocol:'sna',unit:'g',sachetSize:null,dosagePerL:0.5,
    composition:'100% (NH₄)₂HPO₄. Inorganic nitrogen + phosphorus.',
    description:'Pure DAP, often sold under generic or food-grade labels. Cheapest possible nitrogen source. Functionally identical to Vinoferm Nutrisal. Use only early in fermentation — late DAP is the textbook cause of fusel alcohols (the harsh "nail polish remover" off-flavor that takes 6+ months to age out).',
    whyChoose:'When budget matters and you can pair it with an organic source. Cheap fertilizer-grade DAP works fine if food-safe.',
    whyAvoid:'Solo use as your only nutrient — needs amino acid pairing for balanced fermentation.',
    bestFor:['Budget brewing','Combined with organic nutrient','Stuck ferment recovery'],
    notRecommendedFor:['Solo nutrient','Late-fermentation additions'],
    whenToAdd:'Day 0 and day 1-2. Must be done before 1/3 sugar break — late DAP = fusels.',
    tips:[
      'Make sure you\'re buying food-grade or wine-grade, not fertilizer-grade with impurities',
      'Pair with a yeast-derived nutrient (Fermaid-O, Nutrivit) for balanced nitrogen + amino acids'
    ],
    euAvailable:true,widelyAvailable:true
  },
  {
    id:'other',name:'Other / generic nutrient',
    protocol:'sna',unit:'g',sachetSize:12,sachetCoversL:9,dosagePerL:1.5,
    composition:'Generic — assumed SNA-compatible.',
    description:'Catch-all for nutrients not in the library. Defaults to MJ Mead Nutrient-style assumptions (12g sachet per ~9L batch, SNA protocol).',
    whyChoose:'Only for unknown products',
    whyAvoid:'Categorize properly when possible',
    bestFor:[],notRecommendedFor:[],whenToAdd:'Follow product instructions',
    tips:[],euAvailable:true,widelyAvailable:true
  }
];
