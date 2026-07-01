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
function mwNutrientGrams(volL,og,protocol){
  if(!(volL>0)||!(og>1))return {total:0,perDose:0,doses:0};
  var organic=/tosna|tosca|tiosna|auto/i.test(protocol||'auto');
  var total=Math.max(2,volL*(og-1)*10);
  var doses=organic?4:(/high/i.test(protocol||'')?3:2);
  return {total:mwRound(total,1),perDose:mwRound(total/doses,1),doses:doses};
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
