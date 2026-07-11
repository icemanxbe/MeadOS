// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// honey/yeast/nutrient domain, fit ratings, pairings, compat
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== HONEY TYPES ====================

// ── HONEY_TYPES moved to data-libraries.js ──

// Structured month-range data for each honey, derived from the free-text
// `season` strings on HONEY_PROFILES below. Months are 1-indexed (1=Jan).
// region tags:
//   'local'         — Northern hemisphere temperate (NW/Central Europe)
//   'mediterranean' — Spain/Italy/Greece — a fresh import
//                     window exists when the harvest reaches shops
//   'southern'      — Southern hemisphere (Manuka). Inverted seasons. Listed
//                     by *northern-hemisphere availability* — typically a delayed
//                     import window arriving in northern spring/early summer.
//   'tropical'      — Coffee blossom, etc. Multiple bloomings; freshness
//                     unpredictable. No reliable monthly signal.
//   'global'        — Available year-round from beekeepers (e.g. comb honey
//                     stays sealed in wax, sold whenever bees produced it).
//   null            — No seasonal info / fallback (Mixed, Other).

// ── HONEY_SEASONS moved to data-libraries.js ──

// Returns honeys whose freshness window includes the given month (1-12).
// Falls back to current month if not specified. Each result carries the
// region tag and a `proximity` score that ranks "peak of season" higher
// than "edge of season" so the UI can highlight what's most freshly available.
function honeysInSeason(monthIdx){
  var m=monthIdx||(new Date().getMonth()+1);
  var hits=[];
  Object.keys(HONEY_SEASONS).forEach(function(name){
    var s=HONEY_SEASONS[name];
    if(!s||!s.months||!s.months.length)return;
    if(s.months.indexOf(m)<0)return;
    // proximity: how close to the middle of the season window we are.
    // Edge months get 0.5, middle gets 1.0. Single-month windows = 1.0.
    var i=s.months.indexOf(m);
    var proximity=s.months.length===1?1.0
      :(i===0||i===s.months.length-1?0.65:1.0);
    hits.push({name:name,region:s.region,months:s.months,proximity:proximity});
  });
  // Local first, then mediterranean, then everything else. Within region,
  // peak-of-season before edge-of-season, then alphabetical for stability.
  var regionOrder={local:0,mediterranean:1,southern:2,global:3,tropical:4};
  hits.sort(function(a,b){
    var ra=regionOrder[a.region]==null?5:regionOrder[a.region];
    var rb=regionOrder[b.region]==null?5:regionOrder[b.region];
    if(ra!==rb)return ra-rb;
    if(b.proximity!==a.proximity)return b.proximity-a.proximity;
    return a.name.localeCompare(b.name);
  });
  return hits;
}

// Rich profile data, used by the Honey Library guide section. Each entry has
// a color (for visual cards), flavor profile, intensity level, best-use notes,
// and the recipe IDs that explicitly use this honey type.
// Color values approximate the typical jar color of each honey variety.

// ── HONEY_PROFILES moved to data-libraries.js ──

// Return the recipe IDs that use a given honey type (by literal match in
// ingredients[].item or notes). Best-effort heuristic.
function recipesUsingHoney(honeyName){
  if(!APP.recipes||!honeyName)return[];
  var needle=honeyName.toLowerCase();
  return APP.recipes.filter(function(r){
    if(!r.ingredients)return false;
    return r.ingredients.some(function(i){
      var h=((i.item||'')+' '+(i.notes||'')).toLowerCase();
      return h.indexOf(needle)!==-1&&h.indexOf('honey')!==-1;
    });
  }).map(function(r){return{id:r.id,name:r.name,color:r.brandColor};});
}

// ==================== HONEY SUPPLIERS ====================
// Sourcing hints are driven entirely by the user's own supplier rolodex
// (Suppliers view). Each supplier can be tagged with the honey types they
// stock; the Honey Library detail page and recipe sourcing cards pick those
// up automatically. Nothing is hardcoded.
function suppliersForHoney(honeyName){
  if(!honeyName)return[];
  return(APP.suppliers||[]).filter(function(s){
    return Array.isArray(s.honeys)&&s.honeys.indexOf(honeyName)>=0;
  });
}

// Inspect a recipe's ingredients[] and figure out which HONEY_TYPES are
// referenced — used by the recipe detail page to surface supplier links
// (so Kim knows where to source the honey before committing to a batch).
// Returns an array of honey-type name strings, ordered by appearance.
// Matches longest names first so "Orange Blossom" wins over "Orange".
function honeyTypesInRecipe(r){
  if(!r||!r.ingredients)return[];
  var found=[];
  // Sort HONEY_TYPES by length descending so "Orange Blossom" / "Coffee Blossom"
  // / "Lemon Blossom" / "Pine Honeydew" / "Himalayan Balsam" win over shorter
  // substring matches (e.g. plain "Orange" or "Lemon" if those ever existed).
  var sortedTypes=HONEY_TYPES.slice().sort(function(a,b){return b.length-a.length;});
  r.ingredients.forEach(function(ing){
    var itemAndNotes=((ing.item||'')+' '+(ing.notes||'')).toLowerCase();
    // Only consider this ingredient if it actually mentions honey.
    if(itemAndNotes.indexOf('honey')===-1)return;
    sortedTypes.forEach(function(t){
      // Skip the catch-alls — they aren't useful as supplier hints.
      if(t==='Mixed'||t==='Other')return;
      if(itemAndNotes.indexOf(t.toLowerCase())!==-1){
        if(found.indexOf(t)===-1)found.push(t);
      }
    });
  });
  return found;
}

// ==================== HONEY ALTERNATIVES ====================
// Cross-reference data: for each built-in recipe, list honey types that work
// as alternative bases — including a "shift" note describing how that swap
// changes the character of the final mead. This surfaces:
//   - on the recipe detail page (under "Source your honey") as substitution
//     suggestions next to the primary honey
//   - on each honey's library detail page as "this honey also works in:"
//     so under-used varieties (Heather, Pine Honeydew, Coffee Blossom, etc.)
//     find their way into your brewing plans
// Each entry: {honey: <Type>, shift: <how the recipe transforms>}.

// ── RECIPE_HONEY_ALTERNATIVES moved to data-recipes.js ──
// Returns alternatives for a recipe id (may be empty array).
function alternativesForRecipe(recipeId){
  if(!recipeId)return[];
  return RECIPE_HONEY_ALTERNATIVES[recipeId]||[];
}

// Reverse lookup: which recipes does THIS honey work as an alternative in?
// Returns [{recipeId, recipeName, shift}, ...] — used by the honey detail page
// to surface "this honey also works in these recipes" for under-used varieties.
function recipesAlternativeForHoney(honeyName){
  if(!honeyName)return[];
  var matches=[];
  Object.keys(RECIPE_HONEY_ALTERNATIVES).forEach(function(rid){
    var alts=RECIPE_HONEY_ALTERNATIVES[rid];
    alts.forEach(function(a){
      // Match exact name; also handle the "Acerglyn — maple-forward (recipe
      // default)" placeholder marker by skipping it. Only surface GOOD pairings
      // here ("also works in") — skip curated entries flagged workable/poor/clash.
      var fitOk=!a.fit||a.fit==='great'||a.fit==='good'||a.fit==='recommended';
      if(a.honey===honeyName&&a.shift&&fitOk){
        var r=APP.recipes&&getRecipe(rid);
        if(r){matches.push({recipeId:rid,recipeName:r.name,recipeStyle:r.style,recipeColor:r.brandColor,shift:a.shift});}
      }
    });
  });
  return matches;
}


// ==================== HONEY ↔ RECIPE FIT ====================
// Every honey in the library, rated for how well it suits a given recipe, so a
// brewer can tell at a glance whether the jar on their shelf is a great fit, a
// workable swap, or a clash — and what it would do to the result. Intensity is
// the main lever: a delicate recipe wants a light honey, a sack/bochet wants a
// bold one. Curated character notes (RECIPE_HONEY_ALTERNATIVES) override the
// derived note where they exist.
var HONEY_INTENSITY_RANK={'very light':0,'light':1,'medium':2,'bold':3,'very bold':4};

// The ideal honey weight (intensity rank 0–4) for a recipe, from its style/strength.
function recipeHoneyIdeal(r){
  var hay=((r.style||'')+' '+(r.category||'')+' '+((r.tags||[]).join(' '))+' '+(r.name||'')).toLowerCase();
  var og=parseFloat(r.ogTarget)||1.09;
  if(/sack|bochet|port|braggot/.test(hay)||og>=1.115)return{center:3,label:'a bold, robust honey'};
  if(/sparkling|hydromel|session|show mead/.test(hay)||/vanilla/.test(hay))return{center:1,label:'a light, delicate honey'};
  if(/strawberr|raspberr|peach|blueberr/.test(hay))return{center:1,label:'a light honey that lets the fruit lead'};
  if(/blackcurrant|cassis|forest|cherry/.test(hay))return{center:2,label:'a medium honey (bold honeys also work)'};
  return{center:2,label:'a medium-bodied honey'};
}

// Is this honey variety on the shelf? Honey-type supplies with stock left,
// matched substring either way ("Wildflower" ⊂ "Wildflower Honey").
function honeyVarietyInStock(honeyName){
  if(!honeyName||!APP.supplies)return false;
  var needle=String(honeyName).toLowerCase();
  return APP.supplies.some(function(s){
    if(s.type!=='honey'||(parseFloat(s.qty)||0)<=0)return false;
    var name=String(s.name||'').toLowerCase();
    return name.indexOf(needle)!==-1||needle.indexOf(name)!==-1;
  });
}

// First sentence of a honey's profile blurb — the "what it brings" gist.
function honeyGist(honeyName){
  var p=HONEY_PROFILES[honeyName];
  if(!p||!p.profile)return'';
  var prof=String(p.profile);
  if(typeof appLang==='function'&&appLang()==='nl'&&typeof HONEY_PROFILES_NL!=='undefined'&&HONEY_PROFILES_NL[honeyName]&&HONEY_PROFILES_NL[honeyName].profile)prof=String(HONEY_PROFILES_NL[honeyName].profile);
  var first=prof.split('. ')[0].trim();
  return first?(/[.!?]$/.test(first)?first:first+'.'):'';
}

// Rate one honey for one recipe. Returns {tier, order, badge, color, note, inStock}.
function honeyFitForRecipe(r,honeyName,ctx){
  ctx=ctx||{};
  var primarySet=ctx.primarySet||{}, curated=ctx.curated||{}, ideal=ctx.ideal||recipeHoneyIdeal(r);
  var p=HONEY_PROFILES[honeyName];
  var rank=p?HONEY_INTENSITY_RANK[p.intensity]:null;
  var gist=honeyGist(honeyName), inStock=honeyVarietyInStock(honeyName);
  if(primarySet[honeyName])
    return{tier:'primary',order:0,badge:'PRIMARY',color:'var(--gold2)',inStock:inStock,
      note:(gist?gist+' — ':'')+((typeof appLang==='function'&&appLang()==='nl')?'de honing waar dit recept omheen is gebouwd.':'the honey this recipe is built around.')};
  if(curated[honeyName]){
    // A hand-curated entry. {honey, shift} alone → "recommended". With an explicit
    // {fit} the curator's verdict drives the tier (overriding the intensity guess).
    var cu=curated[honeyName];
    var FT={great:{tier:'great',order:2,badge:'✓ GREAT FIT',color:'var(--green2)'},
            good:{tier:'good',order:3,badge:'✓ GOOD FIT',color:'var(--green2)'},
            workable:{tier:'workable',order:4,badge:'~ WORKABLE',color:'var(--gold)'},
            // #d66b6b, not var(--red2): the standard red measures ~4.3:1 on this
            // card's near-black row background, just under WCAG AA's 4.5:1 for
            // small badge text — this brighter tint clears it (~5.9:1).
            poor:{tier:'poor',order:5,badge:'✗ NOT IDEAL',color:'#d66b6b'},
            clash:{tier:'poor',order:5,badge:'✗ CLASH',color:'#d66b6b'}};
    var t=FT[cu.fit]||{tier:'recommended',order:1,badge:'✓ RECOMMENDED',color:'var(--green2)'};
    return{tier:t.tier,order:t.order,badge:t.badge,color:t.color,inStock:inStock,note:cu.shift||cu.note||''};
  }
  if(rank==null)
    return{tier:'varies',order:6,badge:'~ varies',color:'var(--text3)',inStock:inStock,
      note:(gist||'Character varies by source.')+' Judge by taste.'};
  var d=Math.abs(rank-ideal.center), heavier=rank>ideal.center, tier,order,badge,color,fit;
  if(d===0){tier='great';order=2;badge='✓ GREAT FIT';color='var(--green2)';fit='an ideal weight for this recipe.';}
  else if(d===1){tier='good';order=3;badge='✓ GOOD FIT';color='var(--green2)';fit=heavier?'a touch bolder than ideal, but it sits well here.':'a touch lighter than ideal, but clean and pleasant here.';}
  else if(d===2){tier='workable';order=4;badge='~ WORKABLE';color='var(--gold)';fit=heavier?'bolder than this recipe wants — it leads more than intended, so use a lighter hand.':'lighter than ideal — clean, but its own character can get lost.';}
  else{tier='poor';order=5;badge='✗ NOT IDEAL';color='#d66b6b';fit=heavier?'too dominant — it would bury this recipe.':'too delicate to stand up in this recipe.';}
  return{tier:tier,order:order,badge:badge,color:color,inStock:inStock,note:(gist?gist+' — ':'')+fit};
}

// The whole library rated for a recipe, best-fit first; in-stock honeys float to
// the top of their tier so a brewer spots what they already own.
function honeyFitListForRecipe(r){
  if(!r)return[];
  var types=(typeof honeyTypesInRecipe==='function')?honeyTypesInRecipe(r):[];
  var primarySet={};types.forEach(function(t){primarySet[t]=true;});
  var curated={};
  (alternativesForRecipe(r.id)||[]).forEach(function(a){if(a.shift)curated[a.honey]=a;});
  var ctx={primarySet:primarySet,curated:curated,ideal:recipeHoneyIdeal(r)};
  // Always include the recipe's own primary honeys even if some lack a profile.
  var names=HONEY_TYPES.filter(function(h){return h!=='Mixed'&&h!=='Other'&&HONEY_PROFILES[h];});
  types.forEach(function(t){if(names.indexOf(t)===-1)names.push(t);});
  var list=names.map(function(h){
    var fit=honeyFitForRecipe(r,h,ctx);
    fit.honey=h;
    fit.color2=(HONEY_PROFILES[h]&&HONEY_PROFILES[h].color)||'var(--text2)';
    return fit;
  });
  list.sort(function(a,b){
    if(a.order!==b.order)return a.order-b.order;
    if(a.inStock!==b.inStock)return a.inStock?-1:1;
    return a.honey.localeCompare(b.honey);
  });
  return list;
}


// ==================== YEAST STRAINS ====================
// Comprehensive strain library. Each entry contains:
//   Physical: sachetSize (g), sachetCoversL, unit, manufacturer
//   Fermentation: abvMax, attenuation, optimalTempLow/High, tempToleranceLow/High,
//                 speed, flocculation, nitrogenNeed, flavorImpact
//   Sensory: profile, expectedAromas, expectedFlavors
//   Usage: recommendedFor[], notRecommendedFor[], bestPractices[], commonMistakes[]
//   Background: description, whyChoose, whyAvoid, historicalNotes
//   Availability: euAvailable, widelyAvailable (commonly stocked by homebrew shops)
//
// Scaling: sachets = ceil(volume × stressMult / sachetCoversL), min 1.
// Verified against current (2024-2026) manufacturer pages and Lallemand technical sheets.

// ── YEAST_STRAINS moved to data-libraries.js ──

function getYeastById(id){return YEAST_STRAINS.find(function(y){return y.id===id;})||YEAST_STRAINS[0];}

// ==================== RECIPE → YEAST PAIRINGS ====================
// Maps each built-in recipe ID to recommended/acceptable/discouraged yeast
// strain IDs and a short explanation. Used by:
//   - The recipe detail page to suggest the right yeast
//   - evaluateYeastForRecipe() to warn when the user is about to ruin a batch
//
// Recommendations were compiled from consensus on gotmead.com, homebrewtalk
// forums, the GotMead newee's guide, and the JAOM tradition. Where conflicting
// opinions exist, the safe / forgiving choice is listed first.

// ── RECIPE_YEAST_PAIRINGS moved to data-recipes.js ──

// ==================== RECIPE -> NUTRIENT PAIRINGS ====================
// Honey is severely nitrogen-deficient, so almost every mead needs supplemental
// YAN (yeast-available nitrogen), staggered in across the first third of the
// ferment (all doses IN before the 1/3 sugar break to avoid late-DAP fusels).
// This maps each built-in recipe to a nutrient STRATEGY: which products fit,
// how the protocol choice changes the result, and where the recipe's own
// ingredients (fruit, malt, juice) already supply some nitrogen so you dose
// less. Protocol legend: 'tosna' = organic-only staggered (Fermaid-O, cleanest);
// 'sna' = staggered, may include DAP (faster/stronger, slight fusel risk).
// `load` describes nitrogen demand: 'reduced' | 'standard' | 'high'.

// ── RECIPE_NUTRIENT_PAIRINGS moved to data-recipes.js ──

function getRecipeNutrientPairings(recipeId){return RECIPE_NUTRIENT_PAIRINGS[recipeId]||null;}

// Look up the pairings for a recipe. Returns null if no built-in mapping exists
// (custom user recipes won't have one — those fall through to a generic check).
// Look up the pairings for a recipe. Returns null if no built-in mapping exists
// (custom user recipes won't have one — those fall through to a generic check).
function getRecipeYeastPairings(recipeId){return RECIPE_YEAST_PAIRINGS[recipeId]||null;}

// ==================== FRUIT / SPICE (ADJUNCT) CROSS-REFERENCE ====================
// Per-recipe fruit, spice, wood, floral and tannin additions that benefit the
// recipe, with dose, timing (primary vs secondary) and how each changes the result.

// ── RECIPE_ADJUNCT_PAIRINGS moved to data-recipes.js ──
var RECIPE_ADJUNCT_FOOTER="<strong style=\"color:var(--gold2)\">Primary vs secondary:</strong> fruit in the primary ferments out — more alcohol, but the aroma and colour fade. Fruit in the secondary keeps a fresh, vivid character but will re-ferment unless you <strong>stabilize first</strong> (potassium sorbate + metabisulfite). &nbsp;<strong style=\"color:var(--gold2)\">Spices, wood &amp; florals:</strong> always add in a mesh bag, start at half the dose you think, taste every few days and pull when it's right — you can add more but never remove. &nbsp;<strong style=\"color:var(--gold2)\">Pectic enzyme</strong> with any fruit prevents permanent haze. &nbsp;<strong style=\"color:var(--gold2)\">Balance:</strong> tannin (oak/tea/grape) adds grip and acid (citrus/acid blend) adds brightness — both make a sweet mead taste less cloying.";
function getRecipeAdjunctPairings(recipeId){return RECIPE_ADJUNCT_PAIRINGS[recipeId]||null;}

// ============ THREE-WAY COMBO NOTES (honey x yeast x nutrient = outcome) ============
// Target-oriented combinations for the recipes worth dialing in precisely.

// ── RECIPE_COMBO_NOTES moved to data-recipes.js ──
function getRecipeComboNotes(recipeId){return RECIPE_COMBO_NOTES[recipeId]||null;}


// ==================== YEAST/RECIPE COMPATIBILITY CHECK ====================
// Returns a structured assessment for showing the user "is this yeast right
// for this recipe / batch?" Combines built-in recipe pairings with derived
// rules (ABV headroom, temperature, attenuation profile vs recipe goals).
//
// Severity ladder (worst→best):
//   'danger'      — yeast cannot reach the recipe's targets, will fail
//   'warning'     — works only with intervention, likely off-flavors
//   'caveat'      — works but with character shifts the user should know about
//   'good'        — solid alternate choice
//   'recommended' — top match for this recipe
//
// `messages` is an array of {tone, text} for stacking concerns. `severity` is
// the worst level across all messages.
function evaluateYeastForRecipe(yeastId,recipe,opts){
  opts=opts||{};
  var y=getYeastById(yeastId);
  if(!y)return{severity:'caveat',messages:[{tone:'caveat',text:'Unknown yeast strain.'}],yeast:null};
  var msgs=[];
  var ranks={danger:5,warning:4,caveat:3,good:2,recommended:1};
  var worst='good';
  function add(tone,text){msgs.push({tone:tone,text:text});if(ranks[tone]>ranks[worst])worst=tone;}

  // 1. Built-in recipe pairings (highest authority)
  var pairings=recipe&&recipe.id?getRecipeYeastPairings(recipe.id):null;
  if(pairings){
    if(pairings.recommended.indexOf(yeastId)>=0){
      worst='recommended';
      add('recommended','Excellent match for '+(recipe.style||recipe.name)+'. '+pairings.notes);
    }else if(pairings.acceptable.indexOf(yeastId)>=0){
      add('good','Acceptable choice. Not the first pick but works. '+pairings.notes);
    }else if(pairings.discouraged.indexOf(yeastId)>=0){
      add('warning','Not recommended for this recipe. '+pairings.notes);
    }
  }

  // 2. ABV headroom check — yeast tolerance vs recipe target
  var target=recipe&&(recipe.abvTarget||recipe.ogTarget);
  if(recipe&&recipe.abvTarget){
    var headroom=y.abvMax-recipe.abvTarget;
    if(headroom<0){
      add('danger',y.name.split('—')[0].trim()+' tops out around '+y.abvMax+'% ABV but this recipe targets '+recipe.abvTarget+'% — the batch will stall sweet and never finish.');
    }else if(headroom<1.5){
      add('warning','Cutting it close on ABV: yeast tolerance '+y.abvMax+'% vs recipe target '+recipe.abvTarget+'%. Risk of stall.');
    }
  }
  if(recipe&&recipe.ogTarget){
    var ogPts=(recipe.ogTarget-1)*1000;
    if(ogPts>110&&y.abvMax<16){
      add('warning','High starting gravity (OG '+recipe.ogTarget.toFixed(3)+') may exceed this yeast\'s comfort zone. Consider EC-1118 or K1V for sack-mead OGs.');
    }
  }

  // 3. Temperature compatibility — if recipe mentions a ferment temp
  if(opts.fermentTemp){
    var T=parseFloat(opts.fermentTemp);
    if(!isNaN(T)){
      if(T>y.tempToleranceHigh){
        add('danger','Recipe ferment temp '+T+'°C exceeds yeast max '+y.tempToleranceHigh+'°C — stuck or off-flavors.');
      }else if(T<y.tempToleranceLow){
        add('danger','Recipe ferment temp '+T+'°C below yeast min '+y.tempToleranceLow+'°C — yeast won\'t start.');
      }else if(T>y.optimalTempHigh){
        add('caveat','Recipe temp '+T+'°C above '+y.name.split('—')[0].trim()+'\'s optimal range ('+y.optimalTempLow+'-'+y.optimalTempHigh+'°C) — expect more fusel alcohols. D47 especially is sensitive here.');
      }else if(T<y.optimalTempLow){
        add('caveat','Recipe temp '+T+'°C below '+y.name.split('—')[0].trim()+'\'s optimal — fermentation will be slow.');
      }
    }
  }

  // 4. Attenuation vs recipe sweetness goal
  if(recipe&&recipe.fgTarget&&recipe.ogTarget){
    var expectedAttenuation=((recipe.ogTarget-recipe.fgTarget)/(recipe.ogTarget-1))*100;
    if(expectedAttenuation>90&&y.attenuation<85){
      add('warning','Recipe expects '+expectedAttenuation.toFixed(0)+'% attenuation (dry finish) but '+y.name.split('—')[0].trim()+' typically gives '+y.attenuation+'% — final gravity will be higher than recipe target.');
    }
    if(expectedAttenuation<80&&y.attenuation>92){
      add('caveat','Recipe targets a sweet finish but '+y.name.split('—')[0].trim()+' attenuates to '+y.attenuation+'% — you\'ll need to stabilize + backsweeten, or use WLP720.');
    }
  }

  // If we have no message at all (no pairings + no warnings), give a neutral pass
  if(!msgs.length){
    add('good','No specific concerns. '+y.name.split('—')[0].trim()+' should work for this recipe.');
  }
  return{severity:worst,messages:msgs,yeast:y};
}

// ==================== NUTRIENT PRODUCTS ====================
// Comprehensive nutrient library. Each entry contains:
//   Physical: sachetSize, sachetCoversL (where applicable), unit, dosagePerL
//   Protocol: 'sna' (DAP-containing, 2-3 doses before 1/3 sugar break)
//             'tosna' (organic-only, 4 doses through 1/3 break)
//             'goferm' (rehydration ONLY — added to yeast water, not must)
//   Composition: what's in it
//   Usage: bestFor, notRecommendedFor, whenToAdd
//   Background: description, whyChoose, whyAvoid
//
// Bulk products (Fermaid-O/K, Vinoferm Nutrisal, DAP, Tronozymol) dose by g/L —
// no sachet count shown. MJ Mead Nutrient is the only sachet-counted product.

// ── NUTRIENT_PRODUCTS moved to data-libraries.js ──

function getNutrientById(id){return NUTRIENT_PRODUCTS.find(function(n){return n.id===id;})||NUTRIENT_PRODUCTS[0];}

// Resolve the protocol from a batch's nutrient selection. Defaults to 'sna'
// for any unknown product so behavior is conservative.
function getBatchProtocol(batch){
  if(!batch||!batch.nutrient)return'sna';
  var product=getNutrientById(batch.nutrient);
  return product&&product.protocol||'sna';
}

// Given the batch and its recipe, produce the effective step schedule. For
// SNA batches this is just `recipe.steps`. For TOSNA batches, the recipe's
// nutrient steps (matched by title containing "nutrient" or "SNA", day <=7)
// are removed and replaced with 4 organic-nitrogen doses on the canonical
// TOSNA schedule (day 1, 2, 3, and 7-or-1/3-break).
function getEffectiveSteps(batch,recipe){
  // A per-batch custom schedule (set in the step editor) takes precedence over
  // the recipe + protocol logic — the brewer has taken manual control.
  if(batch&&Array.isArray(batch.customSteps)&&batch.customSteps.length){
    return batch.customSteps.slice().sort(function(a,b){return(a.day||0)-(b.day||0);});
  }
  if(!recipe||!recipe.steps)return[];
  var protocol=getBatchProtocol(batch);
  if(protocol!=='tosna')return recipe.steps;
  // Compute total Fermaid-O dose from batch volume and OG
  // Rough rule: ~1g per L at OG 1.100, scaled linearly.
  var volume=parseFloat(batch&&batch.volume)||recipe.volume||5;
  var og=parseFloat(batch&&batch.og)||recipe.ogTarget||1.095;
  var totalGrams=Math.max(2,volume*(og-1)*10); // ~3-5g for OG 1.090-1.110 at 5L
  var perDose=Math.round((totalGrams/4)*10)/10;
  // Remove SNA-style nutrient steps (day <= 7, title matches nutrient/SNA)
  var snaPattern=/nutrient|SNA/i;
  var keptSteps=recipe.steps.filter(function(s){
    if(s.day>7)return true; // late steps untouched
    if(!snaPattern.test(s.title||''))return true;
    return false;
  });
  // Inject TOSNA doses on days 1, 2, 3 (and replace one near-day-7 step)
  var tosnaSteps=[
    {day:1,title:'TOSNA Dose 1/4 (Fermaid-O)',desc:'Hydrate '+perDose+'g Fermaid-O in a splash of room-temp must, stir gently into the fermenter. The first three doses are spaced daily — organic nitrogen is absorbed slowly, so spreading the dosing avoids overwhelming the yeast.'},
    {day:2,title:'TOSNA Dose 2/4 (Fermaid-O)',desc:'Hydrate '+perDose+'g Fermaid-O and stir in gently. Vigorous fermentation should be visible now. Continue degassing each day.'},
    {day:3,title:'TOSNA Dose 3/4 (Fermaid-O)',desc:'Hydrate '+perDose+'g Fermaid-O and stir in gently. Take a gravity reading and log it — you\'re looking for the 1/3 sugar break for the final dose.'},
    {day:7,title:'TOSNA Dose 4/4 (Fermaid-O) — at 1/3 sugar break',desc:'Final dose: hydrate '+perDose+'g Fermaid-O and add. Time this to the 1/3 sugar break (when gravity has dropped to ~OG - (OG-FG)/3) OR day 7, whichever comes first. The late organic-nitrogen dose sustains the yeast through the alcohol-stress phase — the hallmark of TOSNA.'}
  ];
  // Merge and sort by day
  return keptSteps.concat(tosnaSteps).sort(function(a,b){return a.day-b.day;});
}
