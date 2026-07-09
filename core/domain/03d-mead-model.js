// ==================== MEAD MODEL ====================
// Pure, deterministic brewing math shared by the recipe configurator (PR1) and
// the batch Advisor / intelligence layer (PR2). No DOM, no state mutation — every
// function takes plain values so it can be unit-tested in test.html.
//
// Conventions: gravities are SG (e.g. 1.098). ABV uses the app's calcABV
// (=(og-fg)*131.25). Honey↔OG uses the app-wide ~292 SG-points-per-kg model.

function mwRound(n,dp){var f=Math.pow(10,dp||0);return Math.round(n*f)/f;}

// Honey (kg) needed to hit a target OG at a given volume, uniform-honey model.
function mwHoneyKg(og,volL){
  if(!(og>1)||!(volL>0))return 0;
  return mwRound((og-1)*1000*volL/292,2);
}

// Target FG + ABV for an OG given a yeast strain. Fermentation stops at whichever
// limit comes first: the strain's attenuation, or its ABV tolerance.
function mwYeastTargets(og,yeastId){
  if(!(og>1))return null;
  var y=(typeof YEAST_STRAINS!=='undefined')&&YEAST_STRAINS.filter(function(x){return x.id===yeastId;})[0];
  var att=(y&&y.attenuation?y.attenuation:88)/100;        // fraction of sugar consumed
  var abvMax=(y&&y.abvMax)?y.abvMax:15;                   // alcohol tolerance ceiling
  var fgAtt=og-att*(og-1);                                // attenuation-limited FG
  var fgTol=og-(abvMax/131.25);                           // tolerance-limited FG (ABV cap)
  var fg=Math.max(fgAtt,fgTol,0.996);                     // whichever stops higher (+ floor)
  var abv=(og-fg)*131.25;
  return {fg:mwRound(fg,3),abv:mwRound(abv,1),limitedBy:(fgTol>fgAtt?'tolerance':'attenuation')};
}

// The 1/3 sugar break — the gravity at which one third of the available sugar is
// gone. The hinge point for final nutrients and for stopping aeration.
function mwSugarBreak(og,fg){
  if(!(og>1))return null;
  var f=(fg!=null&&fg<og)?fg:1.000;
  return mwRound(og-(og-f)/3,3);
}

// Total + per-dose nutrient grams for a volume/OG under a protocol family.
// Organic (TOSNA/TOSCA/TiOSNA) = 4 doses; SNA = 2-3 doses. Mirrors getEffectiveSteps.
// Also scales by the yeast's own nitrogen demand (YEAST_STRAINS.nitrogenNeed) —
// a low-N strain genuinely needs less than a high-N one at the same OG/volume.
// Tier ratios borrow the relative spread from MeadTools' target-YAN multipliers
// (their Low/Medium/High are 0.75/0.90/1.25 — same ~1:1.7 low-to-high spread),
// rebased around this app's existing flat total as the "medium" baseline since
// MeadOS doses in grams-of-product, not ppm-of-YAN. yeastId is optional —
// omitting it (or an unknown id) keeps the old medium-only behaviour.
var MW_NUTRIENT_YEAST_MULT={low:0.8,medium:1.0,high:1.4};
function mwNutrientGrams(volL,og,protocol,yeastId){
  if(!(volL>0)||!(og>1))return {total:0,perDose:0,doses:0};
  var organic=/tosna|tosca|tiosna|auto/i.test(protocol||'auto');
  var y=(typeof YEAST_STRAINS!=='undefined'&&yeastId)?YEAST_STRAINS.filter(function(x){return x.id===yeastId;})[0]:null;
  var nNeed=(y&&y.nitrogenNeed)||'medium';
  var total=Math.max(2,volL*(og-1)*10*(MW_NUTRIENT_YEAST_MULT[nNeed]||1.0));
  var doses=organic?4:(/high/i.test(protocol||'')?3:2);
  return {total:mwRound(total,1),perDose:mwRound(total/doses,1),doses:doses,yeastNitrogenNeed:y?nNeed:null};
}

// Attenuation reached so far (0..1) from OG → current gravity.
function mwAttenuation(og,sg){
  if(!(og>1)||sg==null)return 0;
  var a=(og-sg)/(og-1);
  return a<0?0:(a>1?1:a);
}

// Expected final attenuation fraction for the recipe/yeast target FG.
function mwExpectedAttenuation(og,fg){
  if(!(og>1)||fg==null)return 0;
  return mwAttenuation(og,fg);
}

// Volume-weighted blend of N parts. Each part: {og,fg,abv,vol}. Returns
// {og,fg,abv,vol} — used by the blend-into-a-batch action and solera top-ups.
// A field is null in the result only if no part supplied it.
function mwBlend(parts){
  parts=(parts||[]).filter(function(p){return p&&(p.vol||0)>0;});
  var tot=parts.reduce(function(s,p){return s+(p.vol||0);},0);
  if(tot<=0)return {og:null,fg:null,abv:null,vol:0};
  function w(key){
    if(!parts.some(function(p){return p[key]!=null;}))return null;
    return parts.reduce(function(s,p){return s+((p[key]!=null?p[key]:0)*(p.vol||0));},0)/tot;
  }
  return {og:w('og'),fg:w('fg'),abv:w('abv'),vol:tot};
}

// Expected fermentation-duration RANGE for this recipe+yeast, not just a flat
// number. recipe.fermentDays is the app's baseline estimate (assumes a
// middling-pace yeast); a yeast's own `speed` rating (very-fast..slow, a real
// field on YEAST_STRAINS) shifts and widens that estimate — a fast strain
// finishes sooner with less spread, a slow one takes longer and varies more.
// Honest about being a heuristic: always returns a band, never a false-precise
// single day.
var MW_SPEED_CENTER={'very-fast':0.75,'fast':0.85,'medium-fast':0.95,'medium':1.0,'slow':1.3};
var MW_SPEED_BAND={'very-fast':0.30,'fast':0.32,'medium-fast':0.34,'medium':0.35,'slow':0.40};
function mwExpectedFermentDuration(fermentDays,yeastSpeed){
  if(!(fermentDays>0))return null;
  var centerMult=MW_SPEED_CENTER[yeastSpeed]||MW_SPEED_CENTER.medium;
  var band=MW_SPEED_BAND[yeastSpeed]||MW_SPEED_BAND.medium;
  var expected=fermentDays*centerMult;
  var low=Math.max(3,Math.round(expected*(1-band)));
  var high=Math.round(expected*(1+band));
  return {low:low,expected:Math.round(expected),high:high};
}

// Fruit/juice sugar counts toward OG too — a melomel/cyser calculated as if
// honey supplied 100% of the gravity always overshoots on honey. Typical
// °Brix (~% sugar by weight) for adjuncts commonly used in mead, most-specific
// keyword first so e.g. "pineapple" doesn't fall through to "apple". Honey
// itself runs ~79.6 °Bx (the reference value home-mead calculators use).
var MW_HONEY_BRIX=79.6;
var MW_ADJUNCT_BRIX=[
  ['pineapple',13],['blueberr',9.4],['raspberr',8.5],['strawberr',7.5],['blackberr',8.5],
  ['cherr',15],['peach',11],['plum',12],['grape must',18],['grape juice',16],['grape',16],
  ['apple',11.5],['pear',12],['mango',14]
];
var MW_ADJUNCT_BRIX_DEFAULT=9; // unrecognised fruit — conservative berry-level estimate

// How much honey (kg) you could remove and still hit the same OG, given `kg`
// of a named fruit/juice already in the must (juice ≈ 1 kg per L — close
// enough for this estimate). `fallbackBrix` lets a caller that already knows
// "this is definitely a fruit/juice adjunct" (the recipe wizard) apply a
// conservative default for an unrecognised name; omit it for a caller that's
// pattern-matching arbitrary ingredient text (the cost estimator), so an
// unrelated ingredient (spice, oak, tannin) correctly contributes nothing.
function mwAdjunctHoneyEquivalentKg(name,kg,fallbackBrix){
  if(!(kg>0))return 0;
  var key=(name||'').toLowerCase();
  var brix=null;
  for(var i=0;i<MW_ADJUNCT_BRIX.length;i++){if(key.indexOf(MW_ADJUNCT_BRIX[i][0])>=0){brix=MW_ADJUNCT_BRIX[i][1];break;}}
  if(brix==null)brix=fallbackBrix||0;
  if(!brix)return 0;
  return mwRound(kg*(brix/MW_HONEY_BRIX),2);
}

// Reads the SHAPE of the gravity-reading history, not just the latest value
// or a short recent slope — "plateaued 6 days ago, after crossing the sugar
// break" is a richer, narratable fact than a flat "hasn't moved recently".
// Facts only, no advice/text — same contract as mwBatchSignals. Needs at
// least 3 readings to say anything about a shape rather than a single point.
function mwFermentTimeline(logs,sugarBreak){
  var pts=(logs||[]).filter(function(l){return l.gravity!=null&&l.gravity!=='';}).slice()
    .sort(function(a,c){return(a.date||'').localeCompare(c.date||'');})
    .map(function(l){return{date:l.date,g:parseFloat(l.gravity)};});
  if(pts.length<3)return null;

  function slope(win){
    if(!win||win.length<2)return null;
    var n=win.length,sx=0,sy=0,sxy=0,sxx=0,t0=new Date(win[0].date).getTime();
    win.forEach(function(p){var d=(new Date(p.date).getTime()-t0)/86400000;sx+=d;sy+=p.g;sxy+=d*p.g;sxx+=d*d;});
    var denom=n*sxx-sx*sx;
    var rate=denom!==0?-((n*sxy-sx*sy)/denom):0;
    return mwRound(rate<0?0:rate,5);
  }

  // Plateau: walk backward from the latest reading while each step's drop
  // stays under a "basically flat" threshold. plateauSince is the reading
  // where the flat stretch began.
  //
  // Needs only 2 flat-relative-to-each-other readings, not 3 — real brewers
  // commonly log just OG, a check near the presumed end, and one
  // confirmation reading a few days later (2-3 readings total for the whole
  // batch, not a dense log). Requiring 3 CONSECUTIVE flat readings needs 4+
  // total readings to ever fire, which never happens for that realistic
  // cadence — this used to mean the plateau/"looks complete" reasoning
  // silently never activated for the most common real logging pattern.
  var FLAT=0.001;
  var i=pts.length-1,flatStart=i;
  while(i>0&&(pts[i-1].g-pts[i].g)<FLAT){flatStart=i-1;i--;}
  var plateauReadings=pts.length-flatStart;
  var plateauDays=plateauReadings>=2?Math.round((new Date(pts[pts.length-1].date)-new Date(pts[flatStart].date))/86400000):null;
  var plateaued=plateauDays!=null&&plateauDays>=3;

  // Early pace vs recent pace — "always this slow" reads differently than
  // "was moving fine, then slowed down".
  var earlyRate=slope(pts.slice(0,Math.max(2,Math.ceil(pts.length/2))));
  var recentRate=slope(pts.slice(-Math.min(4,pts.length)));
  var slowedDown=(earlyRate!=null&&recentRate!=null&&earlyRate>0)?((earlyRate-recentRate)/earlyRate>0.5):null;

  // Where the plateau sits relative to the sugar break distinguishes a normal
  // end-of-ferment deceleration from an abnormally early stall.
  var plateauG=plateaued?pts[flatStart].g:null;
  var stalledBeforeBreak=!!(plateaued&&sugarBreak!=null&&plateauG>sugarBreak);
  var slowedNearFinish=!!(plateaued&&sugarBreak!=null&&plateauG<=sugarBreak);

  return {
    plateaued:plateaued, plateauDays:plateauDays, plateauSince:plateaued?pts[flatStart].date:null,
    earlyRatePerDay:earlyRate, recentRatePerDay:recentRate, slowedDown:slowedDown,
    stalledBeforeBreak:stalledBeforeBreak, slowedNearFinish:slowedNearFinish
  };
}
