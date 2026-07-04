// MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
// PolyForm Noncommercial License 1.0.0 — see LICENSE.
// Cider reference library data (apple/pear varieties, cider-specific yeast, nutrient
// constants) — the cider-mode counterpart to data-libraries.js's honey/yeast tables.
// Loaded as a plain script BEFORE app.js (shared global scope).
//
// Classification follows the Long Ashton Research Station (LARS) system — the
// real industry-standard framework, also adopted by the BJCP cider judge program:
//   sweet        < 0.45% acid, < 0.2% tannin  — mild, low-structure base fruit
//   bittersweet  < 0.45% acid, > 0.2% tannin  — the backbone of English cider: body/tannin, low acid
//   sharp        > 0.45% acid, < 0.2% tannin  — brightness/acidity, low structure
//   bittersharp  > 0.45% acid, > 0.2% tannin  — the rare "does it all alone" apples
// Most real ciders blend across categories; a few legendary varieties (Kingston
// Black, Dabinett) are prized specifically because they don't need to.

var CIDER_FRUIT_TYPES=[
  'Dabinett','Yarlington Mill','Michelin','Chisel Jersey',
  'Kingston Black','Foxwhelp',
  'Golden Russet','Newtown Pippin',"Ashmead's Kernel",'Baldwin',
  'Golden Delicious','Sweet Coppin',
  'Wickson Crab',
  'Barland','Blakeney Red',
  "Belle de Boskoop",'Elstar','Jonagold',"Reinette Grise du Canada","Cox's Orange Pippin","Bramley's Seedling",
  'Gala','Granny Smith','Braeburn','Pink Lady','Fuji','Jazz',
  'Red Delicious','Honeycrisp','McIntosh','Gravenstein',
  'Egremont Russet','Discovery','Worcester Pearmain','Spartan',
  'Kanzi','Junami','James Grieve','Santana',
  'Conference','Bartlett / Williams',
  'Mixed / Orchard Blend','Other'
];

var CIDER_VARIETIES={
  'Kingston Black':{fruit:'apple',color:'#3a2a20',avail:['uk','metric'],tech:{category:'bittersharp',tanninPct:0.22,acidPct:0.55,brixTypical:13.0,phTypical:3.5,yanOffset:0,biennial:true},profile:'The one apple most cidermakers agree earns the title "the perfect cider apple" — full tannin AND full acid in real balance, capable of standing entirely alone as a single-varietal.',pairing:'Showcase single-varietal traditional cider; the benchmark other bittersharps get measured against.',notes:'Genuinely difficult to grow — a shy, strongly biennial cropper prone to canker and scab, which is exactly why it stayed rare even as Dabinett took over commercial orchards. If you can get the fruit, it rewards you disproportionately.',
    details:{
      origin:'Somerset, England — parish of Kingston St Mary, near Taunton. No authentic record of its origin survives; first documented in the 19th century.',
      history:'By 1950 the Long Ashton Research Station called it "more widely grown than any other cider apple" in the West of England, despite — or because of — how temperamental it is. Cidermaker Matilda Temperley\'s line captures why it\'s legendary: "one of the very few cider apples that can make a single variety without the need to use other apples... to balance the taste."',
      character:'High tannin AND high acid in the same fruit is rare; most bittersharps lean one way. Kingston Black\'s juice is widely regarded as one of the best-flavoured of any cider apple.',
      growingNote:'Poor, strongly biennial cropper, susceptible to canker and apple scab — this is exactly why commercial orchards moved to more reliable bittersweets like Dabinett even though Kingston Black\'s juice quality is rated higher.',
      bestStyles:['Single-varietal traditional/English cider','Showcase bittersharp blends'],
      tips:[
        {title:"Don't feel you need to blend it",body:'Unlike almost every other cider apple, Kingston Black is genuinely capable of a balanced result fermented alone — that\'s the whole reason for its reputation.'},
        {title:'Expect scarcity',body:'Its poor, biennial cropping means the fruit itself is often the limiting factor, not the recipe.'}
      ],
      commonMistakes:['Assuming any "bittersharp" apple performs like Kingston Black — the balance is unusually good specifically in this variety','Over-blending it away when a single-varietal batch would show it off better']
    }
  },
  'Dabinett':{fruit:'apple',color:'#4a2818',avail:['uk','metric'],tech:{category:'bittersweet',tanninPct:0.28,acidPct:0.20,brixTypical:12.5,phTypical:3.7,yanOffset:0,biennial:false},profile:'The most widely planted cider apple in England — reliable, high-tannin, low-acid, and structured enough to stand alone as a medium-dry single-varietal.',pairing:'The reliable bittersweet backbone for an English-style cider, or a fruity, well-balanced single-varietal on its own.',notes:'Unlike most classic English cider apples, Dabinett crops annually rather than biennially — a big part of why it displaced older varieties commercially without sacrificing much quality.',
    details:{
      origin:'Found as a wilding (a natural hedge seedling) around 1900 by William Dabinett at Middle Lambrook, South Petherton, Somerset. Likely parented by the similar bittersweet Chisel Jersey, though its exact genetics are unconfirmed.',
      history:'Became the most ubiquitously planted cider apple in England, propelled in part by Bulmers planting it extensively across Herefordshire.',
      character:'Bittersweet — more tannin than acid — producing a fruity, well-balanced, medium-dry cider with real body even fermented as a single variety, which is unusual for a bittersweet.',
      growingNote:'Crops annually and reliably, unlike most British cider apples which are strongly biennial — much easier to plan a consistent brewing schedule around.',
      bestStyles:['English cider (bittersweet backbone)','Medium-dry single-varietal'],
      tips:[{title:'A dependable base',body:'If you only grow or buy one bittersweet, Dabinett\'s combination of quality and reliable annual cropping is why it became the commercial default.'}],
      commonMistakes:['Expecting high acid — it\'s a low-acid apple by design; blend with a sharp variety if you want brightness']
    }
  },
  'Yarlington Mill':{fruit:'apple',color:'#5a2818',avail:['uk','metric'],tech:{category:'bittersweet',tanninPct:0.24,acidPct:0.22,brixTypical:12.0,phTypical:3.7,yanOffset:0,biennial:true},profile:'A classic Somerset "Jersey"-type bittersweet — good quality, but researchers noted it\'s "not brisk enough for use alone" and shines specifically as a blending component.',pairing:'A first-rate blending bittersweet — pair with a sharp or bittersharp apple for real balance.',notes:'A true wilding success story: found growing out of a wall by a mill-race in 1898 and propagated from there.',
    details:{
      origin:'Discovered in 1898 as a wilding growing out of a wall by the mill-race at Yarlington, North Cadbury, Somerset — found by a Mr. Bartlett and popularised by grower Harry Masters.',
      history:'First widely planted in Somerset, then Devon and the rest of the West Country cider region.',
      character:'A mild bittersweet under the LARS classification — good quality on its own, but Long Ashton\'s own researchers rated it as "of first-rate quality for blending" rather than a stand-alone star.',
      growingNote:'High-yielding but strongly biennial.',
      bestStyles:['English cider blends — pair with sharp/bittersharp for structure'],
      tips:[{title:'Blend, don\'t solo',body:'This is the textbook case for why blending exists: good bittersweet character that genuinely needs a sharper partner to come alive.'}]
    }
  },
  'Foxwhelp':{fruit:'apple',color:'#6a1810',avail:['uk','metric'],tech:{category:'bittersharp',tanninPct:0.24,acidPct:0.65,brixTypical:13.5,phTypical:3.3,yanOffset:0,biennial:false},profile:'A powerfully tannic, high-acid bittersharp with a centuries-old reputation for making ciders that age for decades. Historically fetched London wine prices.',pairing:'Vintage-style, long-aging single-varietal or bittersharp-forward blends meant to be cellared, not drunk young.',notes:'One of the oldest named English cider apples — documented by name as far back as 1664. Its high acidity is exactly what lets the resulting cider age so well.',
    details:{
      origin:'West Midlands of England, most likely the Forest of Dean, Gloucestershire, cultivated since the 17th century (particularly in Herefordshire).',
      history:'First mentioned by name in John Evelyn\'s 1664 "Pomona," which noted cider from it "comes not to be drunk until two or three years old." By the early 18th century it was among the most prized cider cultivars, with a single-strength Foxwhelp cider once fetching the same market price in London as imported French wine.',
      character:'Bittersharp — high tannin AND high malic acid — producing a powerful, tannic cider. The acidity is specifically what lets it "retain its full flavor for twenty or thirty years," per historical accounts.',
      growingNote:'Prone to producing "sports" (branch mutations), which has muddied true "Old Foxwhelp" identification over the centuries — by the 1960s Long Ashton could only locate a handful of confirmed old trees.',
      bestStyles:['Long-aged vintage-style cider','Structured bittersharp blends'],
      tips:[{title:'Patience is the point',body:'This apple\'s whole historical reputation is built on ciders that improve for years, not weeks — don\'t judge it young.'}],
      commonMistakes:['Drinking it too young and missing the reason it\'s famous']
    }
  },
  'Golden Russet':{fruit:'apple',color:'#c89840',avail:['us'],substituteEU:'a high-sugar, high-acid alternative like Reinette Grise du Canada or Boskoop, or blend a Cox\'s Orange Pippin with a splash of tart crab apple for the missing acid.',tech:{category:'sharp',tanninPct:0.05,acidPct:0.50,brixTypical:16.0,phTypical:3.6,yanOffset:0,biennial:false},profile:'Called the "champagne of old-time cider apples" — unusually high in BOTH sugar and acid for a sharp, giving real complexity and a naturally higher-ABV cider without added sugar.',pairing:'High-gravity single-varietal or sharp backbone for a blend that needs real fermentable sugar, not just acid.',notes:'A genuine outlier: most sharps are just acidic. Golden Russet brings unusually high natural Brix along with it, tasting nutty and honeyed rather than merely tart.',
    details:{
      origin:'Western New York state, mid-19th century (possibly earlier); likely derived from an English russet variety, though exact origins are unclear.',
      history:'Reached peak popularity across the 18th-19th century Eastern US as a triple-purpose fresh-eating, cooking, and cider apple, and has seen a real modern cidermaking resurgence.',
      character:'Unusually high sugar for a sharp apple — nutty, intensely flavoured, with striking acidity and diverse aromatics reminiscent of Ashmead\'s Kernel but brighter.',
      bestStyles:['Higher-ABV single-varietal without chaptalizing','Sharp component in complex blends'],
      tips:[{title:'It does double duty',body:'Most sharp apples give you acid and little else — Golden Russet gives you acid AND real sugar, so it can carry more of a recipe\'s gravity by itself.'}]
    }
  },
  'Newtown Pippin':{fruit:'apple',color:'#a0b850',avail:['us'],substituteEU:'Cox\'s Orange Pippin for a similarly complex, moderate-acid sharp, or Elstar for an easier-to-source everyday alternative.',tech:{category:'sharp',tanninPct:0.04,acidPct:0.48,brixTypical:12.5,phTypical:3.6,yanOffset:0,biennial:false},profile:'A storied American heirloom — moderate acid, a savory/herbal quality, and tropical-fruit notes in warmer-climate fruit. One of the best-keeping apples, improving in storage.',pairing:'Single-varietal American-style cider, or a savory/herbal sharp note in a blend.',notes:'Also called Albemarle Pippin. Its flavor genuinely develops in storage rather than fading — press it after it\'s had time to mellow, not straight off the tree.',
    details:{
      origin:'Found as a seedling in the late 17th/early 18th century on the Gershom Moore estate in Newtown (now Elmhurst), Queens, New York.',
      history:'Grown by both George Washington and Thomas Jefferson in Virginia (where it picked up the alternate name Albemarle Pippin). In 1838 a gift basket presented to Queen Victoria was celebrated enough that the British Parliament lifted import duties on the variety.',
      character:'Complex, somewhat tart, with a noted piney aroma; ciders from it tend toward moderate acid with savory-herbal and tropical-fruit notes, more pronounced from warmer-climate fruit.',
      growingNote:'An exceptional keeper — stores for months at room temperature while its best flavor keeps developing, unusual among apples.',
      bestStyles:['American heirloom single-varietal','Sharp component with a savory/herbal edge'],
      tips:[{title:'Let it rest before pressing',body:'Storage is when this apple\'s flavor actually finishes developing — pressing it too fresh sells it short.'}]
    }
  },
  "Ashmead's Kernel":{fruit:'apple',color:'#8a7838',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.06,acidPct:0.55,brixTypical:13.0,phTypical:3.5,yanOffset:0,biennial:false},profile:'A plain-looking, heavily russeted English heirloom hiding one of the most complex flavors of any dessert apple — intensely sweet-tart with pear, citrus and honey notes.',pairing:'Complex sharp component or a characterful single-varietal for drinkers who want citrus-forward brightness.',notes:'Small and unassuming to look at, which makes the flavor complexity a genuine surprise — don\'t judge this one by appearance.',
    details:{
      origin:"Grown from a seed planted around 1720 by William Ashmead in Gloucester, England.",
      history:'Widely planted in private English orchards through the 18th-19th centuries and has remained a favorite heirloom ever since.',
      character:'Intensely sweet-tart with notes of pear, citrus and honey, developing even more depth after a short spell in storage. High sugar content alongside its acid makes it particularly valued for cider, contributing lime-like tartness and real depth.',
      bestStyles:['Citrus-forward sharp single-varietal or blend component'],
      tips:[{title:'Give it a little storage time',body:'Like several of the best heirloom cider apples, a short rest after picking rounds out the flavor rather than dulling it.'}]
    }
  },
  'Baldwin':{fruit:'apple',color:'#901818',avail:['us'],substituteEU:'Bramley\'s Seedling, Belle de Boskoop, or an under-ripe Elstar/Jonagold for the same bright, firm acid backbone.',tech:{category:'sharp',tanninPct:0.04,acidPct:0.55,brixTypical:12.0,phTypical:3.6,yanOffset:0,biennial:true},profile:'A once-dominant New England dessert and cider apple: firm, crisp, bright acid, historically one of the most widely grown apples in the northeastern US before a killer frost in 1934.',pairing:'Classic New England-style cider — sharp backbone for a blend, or a straightforward single-varietal.',notes:'A workhorse historically, not a rarity — reliable acid and easy to source relative to the heritage English bittersweets/bittersharps.'
  },
  'Golden Delicious':{fruit:'apple',color:'#d8c860',avail:['us','uk','metric'],tech:{category:'sweet',tanninPct:0.02,acidPct:0.30,brixTypical:12.0,phTypical:3.8,yanOffset:0,biennial:false},profile:'A mild, low-tannin, low-acid culinary apple — the honest base of most "juice from the supermarket" ciders. Needs blending or acid/tannin addition for real structure.',pairing:'The bulk fermentable base for a Common/culinary-style cider — almost always benefits from blending with a sharp or bittersweet apple, or a tannin/acid addition.',notes:'Nothing wrong with starting here — most of the world\'s cider is made from culinary apples like this, not heritage bittersweets. Just don\'t expect complexity without help.'
  },
  'Sweet Coppin':{fruit:'apple',color:'#c8a850',avail:['uk','metric'],tech:{category:'sweet',tanninPct:0.10,acidPct:0.15,brixTypical:12.5,phTypical:3.8,yanOffset:0,biennial:true},profile:'A traditional English sweet cider apple — mild acid, gentle tannin, used historically to soften and round out sharper blends.',pairing:'Softening/rounding component in a bittersharp-heavy blend.'
  },
  'Michelin':{fruit:'apple',color:'#5a3020',avail:['uk','metric'],tech:{category:'bittersweet',tanninPct:0.26,acidPct:0.18,brixTypical:12.0,phTypical:3.7,yanOffset:0,biennial:false},profile:'A reliable French-origin bittersweet, similar in role to Dabinett — good tannin, low acid, a dependable blending or single-varietal cropper.',pairing:'English/French-style bittersweet backbone.'
  },
  'Chisel Jersey':{fruit:'apple',color:'#4a2818',avail:['uk','metric'],tech:{category:'bittersweet',tanninPct:0.27,acidPct:0.19,brixTypical:12.5,phTypical:3.7,yanOffset:0,biennial:true},profile:'A high-quality Somerset bittersweet, likely a parent of Dabinett — similar structured, tannic character.',pairing:'English-style bittersweet backbone; blends well with sharps for balance.'
  },
  'Wickson Crab':{fruit:'apple',color:'#b81828',avail:['us'],substituteEU:'any local crab apple in the same small proportion, or — if none is available — a splash of extra malic/citric acid plus a little sugar to cover the gravity/acid boost it would have added.',tech:{category:'bittersharp',tanninPct:0.10,acidPct:0.90,brixTypical:20.0,phTypical:3.3,yanOffset:0,biennial:false},profile:'A tiny, intensely flavored crabapple with exceptionally high sugar AND acid — used as a "booster" fruit to raise both brightness and fermentable sugar in a blend, not fermented alone.',pairing:'A small-percentage addition to boost gravity and acidity in an otherwise mild blend.',notes:'Up to ~25% sugar by some measures — remarkable for any apple, let alone a crab. A little goes a long way; this is a blending accent, not a base fruit.',
    details:{
      origin:'Bred by Albert Etter in Humboldt County, California, introduced around 1944 and named for horticulturist E.J. Wickson. Its long-assumed Newtown Pippin × Esopus Spitzenburg parentage has been called into question by modern DNA analysis, which found no close relationship to either.',
      character:'Small, dense, yellow-red fruit with exceptionally high Brix and acid for its size — too intense for most people to eat out of hand, but prized in cider precisely for that intensity.',
      bestStyles:['Blending accent — a small percentage lifts gravity and brightness across a whole batch'],
      tips:[{title:'Use sparingly',body:'This is a high-leverage ingredient — a little Wickson goes much further than its small size suggests. Treat it like a spice, not a base fruit.'}]
    }
  },
  'Barland':{fruit:'pear',color:'#7a6030',avail:['uk','metric'],tech:{category:'bittersharp',tanninPct:0.20,acidPct:0.30,brixTypical:14.0,phTypical:3.7,yanOffset:0,biennial:false},profile:'A classic English perry pear — bittersharp, considered one of the finest for traditional perry.',pairing:'Traditional single-varietal or blended perry.',notes:'Perry pear acid/tannin percentages sit on a different scale than cider apples — don\'t compare the numbers directly across fruit types.'
  },
  'Blakeney Red':{fruit:'pear',color:'#a83828',avail:['uk','metric'],tech:{category:'medium-sharp',tanninPct:0.10,acidPct:0.35,brixTypical:13.0,phTypical:3.7,yanOffset:0,biennial:false},profile:'A widely-grown dual-purpose (culinary and perry) pear — moderate acid, lighter tannin than the true bittersharps.',pairing:'A gentler, more approachable perry base.'
  },
  // Mainland-European varieties — added so a metric-region brewer has real,
  // fully-detailed entries to reach for instead of only ever seeing them as a
  // substitute footnote on an English/American variety's card.
  "Belle de Boskoop":{fruit:'apple',color:'#7a3020',avail:['metric'],tech:{category:'sharp',tanninPct:0.06,acidPct:0.75,brixTypical:11.5,phTypical:3.4,yanOffset:0,biennial:false},profile:'A firm, strongly tart heirloom that actually originated in Boskoop, Netherlands (1856) — high acid, aromatic, and one of the best-keeping culinary apples in Northern Europe.',pairing:'The go-to sharp backbone for a Dutch/Belgian/German-sourced cider — pairs well with a mild sweet apple like Elstar or Jonagold to round out the acid.',notes:'Still widely grown and easy to find fresh across the Netherlands, Belgium and Germany — a genuinely local alternative to English/American sharps for a metric-region brewer.',
    details:{
      origin:'Discovered around 1856 as a chance seedling by nurseryman Klaas Ottolander in Boskoop, South Holland — still the center of Dutch tree nurseries today.',
      history:'Became one of the most widely grown apples across the Netherlands, Belgium and Germany, prized as a cooking/keeping apple long before cidermaking with it became a deliberate pursuit outside England.',
      character:'Firm, coarse-textured flesh with pronounced acidity and a wine-like aromatic quality — closer to a true cider "sharp" than most modern supermarket apples.',
      growingNote:'A reliable, vigorous grower and excellent keeper — stores for months in a cool cellar without much quality loss.',
      bestStyles:['Common Cider sharp component','Any blend needing real, local acid backbone'],
      tips:[{title:'Use it like an English sharp',body:'Treat Boskoop the way an English recipe treats a sharp apple (e.g. in place of Golden Russet or Ashmead\'s Kernel) — it fills the same acid-backbone role and is far easier to source in mainland Europe.'}],
      commonMistakes:['Assuming it\'s a sweet eating apple because it\'s common in shops — it\'s a cooking/cider-sharp apple, genuinely tart eaten fresh']
    }
  },
  'Elstar':{fruit:'apple',color:'#b83828',avail:['metric'],tech:{category:'sharp',tanninPct:0.03,acidPct:0.42,brixTypical:12.5,phTypical:3.6,yanOffset:0,biennial:false},profile:'A Dutch-bred (Wageningen, 1955) sweet-tart apple — one of the most commonly grown eating apples in the Netherlands and Belgium, with just enough acid to give a cider some brightness.',pairing:'A mild, easy-to-source sharp-leaning component — softer than Boskoop, good for rounding a blend rather than driving it.',notes:'Bred from Golden Delicious × Ingrid Marie — inherits some of Golden Delicious\'s mildness but with real acid Golden Delicious lacks.'
  },
  'Jonagold':{fruit:'apple',color:'#c83828',avail:['us','metric'],tech:{category:'sweet',tanninPct:0.02,acidPct:0.32,brixTypical:13.0,phTypical:3.7,yanOffset:0,biennial:true},profile:'Bred in New York (Golden Delicious × Jonathan) but became one of Belgium\'s single most-grown commercial apples — sweet, mildly tart, higher natural sugar than most culinary apples.',pairing:'A higher-sugar bulk base for a Common-style cider — needs a sharp or bittersweet partner for real structure, same role as Golden Delicious.',notes:'A good example of a variety that\'s technically American-bred but is now more readily available fresh in Belgium/Netherlands than in most of the US.'
  },
  "Reinette Grise du Canada":{fruit:'apple',color:'#8a7040',avail:['metric'],tech:{category:'sharp',tanninPct:0.08,acidPct:0.60,brixTypical:13.0,phTypical:3.5,yanOffset:0,biennial:true},profile:'A classic French heirloom (known in Dutch as Goudreinette) despite the name having nothing to do with Canada — heavily russeted, nutty, high-acid, a genuine complexity match for Ashmead\'s Kernel or Golden Russet.',pairing:'A complex sharp single-varietal component or blend addition wherever an English/American russet-type sharp would be called for.',notes:'One of the oldest named French dessert/cider apples, still grown across France, Belgium and the Netherlands — the direct regional answer to the American russet varieties this app\'s recipes otherwise lean on.'
  },
  "Cox's Orange Pippin":{fruit:'apple',color:'#a84828',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.05,acidPct:0.50,brixTypical:12.5,phTypical:3.5,yanOffset:0,biennial:true},profile:'An aromatic English dessert apple grown across the Netherlands, Belgium, Germany and France as well as the UK — complex, honeyed, and tart enough to carry real cider structure.',pairing:'Complex sharp component, similar role to Ashmead\'s Kernel or Newtown Pippin — a good substitute wherever those American/heirloom sharps aren\'t available.',notes:'Genuinely pan-European despite the English name — one of the more reliably available "specialty" apples at mainland European greengrocers, not just supermarkets.'
  },
  "Bramley's Seedling":{fruit:'apple',color:'#7a9040',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.03,acidPct:1.00,brixTypical:10.5,phTypical:3.3,yanOffset:0,biennial:true},profile:'England\'s classic cooking apple — ferociously acidic, low sugar, low tannin. One of the single most acidic common apples available, and hugely grown across the Netherlands, Belgium and Germany for cooking.',pairing:'A powerful acid-only addition — use sparingly (even 10-20% of the blend) to brighten a flat, low-acid juice; too much and the batch turns sharp/thin.',notes:'Sold everywhere as a cooking apple, rarely thought of as a cider apple, but its acid alone (with almost no tannin or sugar) makes it a precise tool for correcting a bland Golden Delicious-style base.'
  },
  // Common supermarket/orchard apples — the ones most people actually have
  // access to, as opposed to the heritage cider-apple varieties above. None
  // of these are true "cider apples" (no tannin worth mentioning), but
  // they're what most home cidermakers actually start from, and mixing 2-3
  // of them (a sweet one + a tart one) gets a genuinely decent result.
  'Gala':{fruit:'apple',color:'#c04838',avail:['us','uk','metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.25,brixTypical:13.5,phTypical:3.8,yanOffset:0,biennial:false},profile:'Globally ubiquitous mild, sweet supermarket apple. Low acid, no tannin, pleasant but simple.',pairing:'A sweet bulk base — always blend with something tarter (Granny Smith, Bramley, Boskoop) or the result is flat and cloying.'
  },
  'Granny Smith':{fruit:'apple',color:'#8ab850',avail:['us','uk','metric'],tech:{category:'sharp',tanninPct:0.01,acidPct:0.65,brixTypical:11.0,phTypical:3.4,yanOffset:0,biennial:false},profile:'The everyday tart green apple, sold everywhere year-round. Bright, clean acid with essentially no tannin or complexity.',pairing:'A reliable, always-in-stock acid backbone for a Common Cider — a simple two-apple Gala/Granny Smith blend is a genuinely solid beginner starting point.'
  },
  'Braeburn':{fruit:'apple',color:'#a03828',avail:['us','uk','metric'],tech:{category:'sharp',tanninPct:0.01,acidPct:0.45,brixTypical:13.0,phTypical:3.6,yanOffset:0,biennial:false},profile:'A well-balanced sweet-tart supermarket apple with real depth for a mass-market variety — sits right at the sweet/sharp boundary.',pairing:'Works reasonably well on its own without a blending partner, unlike most purely sweet supermarket apples.'
  },
  'Pink Lady':{fruit:'apple',color:'#d85868',avail:['us','uk','metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.40,brixTypical:14.0,phTypical:3.7,yanOffset:0,biennial:false},profile:'Also sold as Cripps Pink — crisp, sweet-tart, higher natural sugar than most supermarket apples.',pairing:'A higher-gravity sweet base — good where you want more natural ABV without added sugar; still benefits from a tart partner.',notes:'"Pink Lady" is a trademarked brand name for fruit meeting a quality standard; the variety itself is Cripps Pink.'
  },
  'Fuji':{fruit:'apple',color:'#c85040',avail:['us','uk','metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.20,brixTypical:15.0,phTypical:3.9,yanOffset:0,biennial:false},profile:'One of the sweetest common supermarket apples — very high sugar, very low acid, honey-like flavor.',pairing:'Highest-gravity sweet base of the common apples, but genuinely needs a sharp partner (Granny Smith, Bramley) — alone it makes a flat, cloying juice.'
  },
  'Jazz':{fruit:'apple',color:'#902030',avail:['us','uk','metric'],tech:{category:'sharp',tanninPct:0.01,acidPct:0.45,brixTypical:13.5,phTypical:3.6,yanOffset:0,biennial:false},profile:'A Gala × Braeburn cross (bred in New Zealand, now grown globally) — crisp, dense, sweet-tart.',pairing:'Similar role to Braeburn — balanced enough to carry a chunk of the blend on its own.'
  },
  'Red Delicious':{fruit:'apple',color:'#901820',avail:['us'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.18,brixTypical:12.0,phTypical:3.9,yanOffset:0,biennial:false},profile:'The classic American supermarket apple — very mild, very low acid, thick skin. Historically the most-planted US apple, though quality varies widely by grower.',pairing:'Weak on its own for cider — bland even by sweet-apple standards. Blend generously with a real sharp (Granny Smith, McIntosh) to get any structure at all.',notes:'Widely considered one of the poorer cider apples among common US varieties — its whole selling point (mild, pretty, shippable) works against cider character.'
  },
  'Honeycrisp':{fruit:'apple',color:'#c04848',avail:['us'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.35,brixTypical:13.0,phTypical:3.7,yanOffset:0,biennial:true},profile:'A US-bred (University of Minnesota, 1991) modern favorite — exceptionally crisp texture, balanced sweet-tart.',pairing:'A premium sweet-leaning base; genuinely pleasant on its own for a mild cider, though pricier than most options here.',notes:'Increasingly grown in parts of Europe and Canada too, but still overwhelmingly identified with — and most available in — the US market.'
  },
  'McIntosh':{fruit:'apple',color:'#a02838',avail:['us'],tech:{category:'sharp',tanninPct:0.02,acidPct:0.50,brixTypical:12.0,phTypical:3.5,yanOffset:0,biennial:false},profile:'A US/Canadian classic — tart-sweet, aromatic, soft flesh that breaks down easily when pressed. Historically a real New England cider-blend component, not just an eating apple.',pairing:'A genuine sharp contributor with more character than most modern supermarket apples — a good historical partner for Baldwin in a New England-style blend.'
  },
  'Gravenstein':{fruit:'apple',color:'#b86838',avail:['us','metric'],tech:{category:'sharp',tanninPct:0.02,acidPct:0.50,brixTypical:12.5,phTypical:3.5,yanOffset:0,biennial:true},profile:'German-origin (as "Gravensteiner", still grown in Germany/Denmark) but strongly California-associated in the US — aromatic, juicy, genuinely good cider character for a dual-purpose apple.',pairing:'One of the better common apples for cider specifically — real aromatics and acid, historically used for exactly this on the US West Coast.'
  },
  'Egremont Russet':{fruit:'apple',color:'#8a7040',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.03,acidPct:0.40,brixTypical:13.0,phTypical:3.6,yanOffset:0,biennial:false},profile:'A classic English russet — nutty, dry-textured, moderate acid. The everyday, easy-to-find cousin of Golden Russet/Ashmead\'s Kernel.',pairing:'A gentler, more available substitute wherever a recipe calls for a russet-type sharp and the rarer heirlooms aren\'t available.'
  },
  'Discovery':{fruit:'apple',color:'#b83040',avail:['uk'],tech:{category:'sharp',tanninPct:0.01,acidPct:0.45,brixTypical:12.0,phTypical:3.5,yanOffset:0,biennial:false},profile:'An early-season English apple (ready from August) — crisp, tart-sweet, sometimes with a faint strawberry note.',pairing:'A good early-harvest sharp component if pressing your own fruit on a UK garden-apple schedule.'
  },
  'Worcester Pearmain':{fruit:'apple',color:'#a82030',avail:['uk'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.30,brixTypical:12.5,phTypical:3.7,yanOffset:0,biennial:false},profile:'An English garden classic with a distinctive strawberry-like aroma — mild acid, easy-drinking.',pairing:'A characterful sweet component — the aroma carries through into the cider more than most mild apples.'
  },
  'Spartan':{fruit:'apple',color:'#801828',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.01,acidPct:0.40,brixTypical:13.0,phTypical:3.6,yanOffset:0,biennial:false},profile:'A Canadian-bred (McIntosh descendant) apple common in UK shops — sweet-tart, aromatic, purple-red skin.',pairing:'A reasonably balanced component, similar role to Braeburn.'
  },
  'Kanzi':{fruit:'apple',color:'#b83040',avail:['metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.40,brixTypical:13.5,phTypical:3.7,yanOffset:0,biennial:false},profile:'A Belgian-bred (2004, Gala × Braeburn) apple that became one of Benelux\'s biggest commercial varieties — crisp, sweet-tart.',pairing:'A modern, easy-to-find Benelux alternative to Braeburn/Jazz — similar balanced role.'
  },
  'Junami':{fruit:'apple',color:'#a83838',avail:['metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.38,brixTypical:13.5,phTypical:3.7,yanOffset:0,biennial:false},profile:'A Swiss-bred apple common across Benelux, Germany and Switzerland — sweet-tart, aromatic, firm.',pairing:'Another easy-to-source balanced component for a mainland-European blend.'
  },
  'James Grieve':{fruit:'apple',color:'#a8a040',avail:['uk','metric'],tech:{category:'sharp',tanninPct:0.02,acidPct:0.55,brixTypical:12.0,phTypical:3.5,yanOffset:0,biennial:false},profile:'A Scottish-bred apple grown extensively across the Netherlands, Belgium and Germany as a culinary/juice apple — good real acid, juicy.',pairing:'A genuinely useful sharp component with more character than most modern eating apples — historically used for juicing specifically.'
  },
  'Santana':{fruit:'apple',color:'#901830',avail:['metric'],tech:{category:'sweet',tanninPct:0.01,acidPct:0.38,brixTypical:12.5,phTypical:3.7,yanOffset:0,biennial:false},profile:'A Dutch-bred (Wageningen) apple developed to be low-allergen, now a normal supermarket variety in the Netherlands — mild sweet-tart.',pairing:'A locally-bred Dutch alternative to Elstar/Jonagold in the same easy-blending role.'
  },
  'Conference':{fruit:'pear',color:'#8a7838',avail:['uk','metric'],tech:{category:'sweet',tanninPct:0.02,acidPct:0.20,brixTypical:13.0,phTypical:3.8,yanOffset:0,biennial:false},profile:'The everyday dessert pear of the Netherlands, Belgium, France and UK — mild, sweet, low acid and essentially no tannin.',pairing:'A perfectly reasonable base for a mild, easy-drinking perry — just don\'t expect the structure a true perry pear (Barland, Blakeney Red) gives.',notes:'NOT a traditional perry pear — dessert pears like this make a softer, simpler perry. Genuinely fine to use; just a different, milder result than the English perry-pear tradition.'
  },
  'Bartlett / Williams':{fruit:'pear',color:'#9a8840',avail:['us','uk','metric'],tech:{category:'sweet',tanninPct:0.02,acidPct:0.22,brixTypical:13.5,phTypical:3.8,yanOffset:0,biennial:false},profile:'The most widely grown dessert pear in the US (as Bartlett) and Europe (as Williams) — the same variety under two names. Sweet, aromatic, mild acid.',pairing:'The default, easiest-to-find pear for a mild perry almost anywhere — same caveat as Conference: a softer result than true perry pears give.'
  }
};

// Regional sourcing note for a variety named in recipe/ingredient text. Reuses
// the app's existing unit-system setting (metric/us/imperial) as the region
// signal instead of adding a separate "where are you" preference — metric
// covers mainland Europe (this app's primary audience) and the rest of the
// world, imperial means UK, us means United States. Returns null when the
// variety is available where the user already is (or isn't a tracked
// variety at all) — this is meant to be occasional, not shown on everything.
function ciderVarietyAvailNote(itemText){
  if(!itemText||typeof CIDER_VARIETIES==='undefined')return null;
  var text=itemText.toLowerCase();
  var names=Object.keys(CIDER_VARIETIES).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<names.length;i++){
    var name=names[i];
    if(text.indexOf(name.toLowerCase())===-1)continue;
    var v=CIDER_VARIETIES[name];
    if(!v.avail||v.avail.indexOf(currentUnitSystem())!==-1)return null;
    if(v.substituteEU&&currentUnitSystem()==='metric'){
      return name+' is a regional heirloom (hard to source in mainland Europe) — try '+v.substituteEU;
    }
    return name+' is a regional heirloom, less common outside '+v.avail.join('/').toUpperCase()+' — check specialty cider-apple suppliers or substitute a similar local variety.';
  }
  return null;
}

// Perry (fermented pear juice) uses its OWN classification scale, distinct from
// apple LARS thresholds even though the four-way naming looks similar — do not
// compare acid/tannin percentages directly across fruit:'apple' vs fruit:'pear'.
// bittersharp >0.45% acid & >0.2% tannin · bittersweet <0.45% acid & >0.2% tannin
// medium-sharp 0.2-0.6% acid & <0.2% tannin · sweet <=0.2% acid & <0.2% tannin

// ==================== NUTRIENT MODEL ====================
// Apple must is nitrogen-poor much like honey must, but the real numbers differ
// enough from mead's TOSNA model to need their own constants rather than reusing
// mead's gravity-points-based estimate (source: Wyeast Labs "Managing Low
// Nitrogen Fermentations"). Same staged-addition SHAPE as TOSNA — rehydration
// nutrient, then at inoculation if deficient, then at ~1/3 sugar depletion —
// just different baseline/target numbers, and no honey-darkness-equivalent
// factor (apples don't have a documented per-variety nitrogen-contribution axis
// the way honey darkness does).
var CIDER_YAN_BASELINE_MGL=56;        // mg N/L naturally present in typical apple must
var CIDER_YAN_TARGET_MGL=140;         // mg N/L minimum to avoid stuck fermentation / H2S
var CIDER_YAN_TARGET_HIGHGRAVITY_MGL=180; // mg N/L for high-OG styles (New England, Ice Cider) — more yeast stress needs more support
// Same nutrient products as mead (Fermaid-O/K, DAP, Go-Ferm) work for cider —
// reuses TOSNA2_YAN_PCT's per-product YAN-equivalent strengths, no new product data needed.

// ==================== MUST CHEMISTRY TARGETS ====================
// Real, cider-specific — different from mead's healthy pH band (3.0-3.4) and
// its tartaric-acid-basis TA tool. Source: BJCP Cider Judge Program process guide.
var CIDER_PH_TARGET_LOW=3.3;
var CIDER_PH_TARGET_HIGH=3.8;
var CIDER_ACID_TARGET_LOW_GL=5;   // g/L as malic acid (cider's native acid — NOT tartaric, unlike mead's convention)
var CIDER_ACID_TARGET_HIGH_GL=7;  // g/L as malic acid
var CIDER_MIN_OG=1.045;           // BJCP guidance: below this, contamination risk rises

// ==================== MALOLACTIC FERMENTATION (MLF) ====================
// A real secondary-fermentation concept with no mead equivalent: lactic acid
// bacteria convert malic acid to lactic acid, softening acidity and adding
// buttery/smoky/spicy notes. Desirable in some English ciders, must be AVOIDED
// in perry — pear's citric acid converts to acetic acid (vinegar) under MLF
// instead of the buttery lactic-acid result apple cider gets, an easy mistake
// with no mead analogue to warn a brewer via prior habit.
var CIDER_MLF_BY_STYLE={
  'english-cider':'encouraged','heirloom-cider':'encouraged','french-cider':'encouraged',
  'common-cider':'neutral','spanish-cider':'neutral','applewine':'avoid',
  'new-england-cider':'neutral','fruit-cider':'avoid','spiced-cider':'avoid',
  'ice-cider':'avoid','fire-cider':'avoid','experimental-cider':'neutral',
  'perry':'avoid' // critical: MLF turns perry's citric acid to acetic acid (vinegar), not the buttery result cider gets
};

// ==================== STYLES ====================
// BJCP 2025 Cider Judge Program categories — the real competition-standard
// style set, giving cider the same numerically-grounded recipe foundation
// mead gets from its 38 built-in recipes.
var CIDER_STYLES={
  'common-cider':{name:'Common Cider',category:'Traditional',ogLow:1.045,ogHigh:1.065,fgLow:0.995,fgHigh:1.020,abvLow:4.5,abvHigh:8,
    description:'Made primarily from culinary (table) apples. Lower tannin, higher acidity than most other styles — refreshing, fruity, floral, brightly juicy.'},
  'heirloom-cider':{name:'Heirloom Cider',category:'Traditional',ogLow:1.050,ogHigh:1.080,fgLow:0.995,fgHigh:1.020,abvLow:6,abvHigh:9,
    description:'Apple character plus real tannin from true cider apple varieties. Clean fermentation, no MLF character.'},
  'english-cider':{name:'English Cider',category:'Traditional',ogLow:1.050,ogHigh:1.075,fgLow:0.995,fgHigh:1.015,abvLow:6,abvHigh:9,
    description:'Full-bodied, often dry with a long tannic finish. May carry optional phenolic MLF notes.'},
  'french-cider':{name:'French Cider',category:'Traditional',ogLow:1.045,ogHigh:1.065,fgLow:1.005,fgHigh:1.020,abvLow:3,abvHigh:6,
    description:'Medium-to-sweet, full-bodied, rich, somewhat fruity — may show background phenolic, smoky or farmyard character.'},
  'spanish-cider':{name:'Spanish Cider',category:'Traditional',ogLow:1.040,ogHigh:1.055,fgLow:0.995,fgHigh:1.010,abvLow:5,abvHigh:6.5,
    description:'Dry and fresh with bright acidity, light-to-moderate acetic/wild notes — a rustic, earthy impression.'},
  'new-england-cider':{name:'New England Cider',category:'Strong',ogLow:1.060,ogHigh:1.100,fgLow:0.995,fgHigh:1.020,abvLow:7,abvHigh:13,
    description:'Substantial, often built with adjuncts — raisins are traditional — sometimes barrel-aged.'},
  'applewine':{name:'Applewine',category:'Strong',ogLow:1.070,ogHigh:1.100,fgLow:0.995,fgHigh:1.020,abvLow:9,abvHigh:12,
    description:'Presents like a dry white wine — fruity, floral, balanced, low astringency and bitterness.'},
  'ice-cider':{name:'Ice Cider',category:'Strong',ogLow:1.130,ogHigh:1.180,fgLow:1.050,fgHigh:1.085,abvLow:7,abvHigh:13,
    description:'Dessert-style from concentrated juice — smooth, rich, sweet, dessert-wine-like with balancing acidity.'},
  'fire-cider':{name:'Fire Cider',category:'Strong',ogLow:1.130,ogHigh:1.180,fgLow:1.040,fgHigh:1.072,abvLow:9,abvHigh:16,
    description:'Dark gold to brown, very sweet, caramelized, maple-sugar-like impression.'},
  'fruit-cider':{name:'Fruit Cider',category:'Specialty',ogLow:1.045,ogHigh:1.070,fgLow:0.995,fgHigh:1.010,abvLow:5,abvHigh:9,
    description:'Apple juice plus additional fruit — both the apple and the added fruit must stay noticeable and balanced.'},
  'spiced-cider':{name:'Spiced Cider',category:'Specialty',ogLow:1.045,ogHigh:1.070,fgLow:0.995,fgHigh:1.010,abvLow:5,abvHigh:9,
    description:'Botanicals, herbs, spices or hops integrated with the cider character, never masking it.'},
  'experimental-cider':{name:'Experimental Cider',category:'Specialty',ogLow:1.045,ogHigh:1.100,fgLow:0.995,fgHigh:1.020,abvLow:5,abvHigh:12,
    description:'Open-ended — unconventional ingredients or processes are fair game as long as cider character stays present.'},
  'perry':{name:'Perry',category:'Perry',ogLow:1.045,ogHigh:1.070,fgLow:0.995,fgHigh:1.015,abvLow:4,abvHigh:8,
    description:'Fermented pear juice, the majority component. Never MLF this one — pear\'s citric acid turns to acetic acid (vinegar) instead of cider\'s buttery lactic result.'}
};
