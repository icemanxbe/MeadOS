// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// recipes, analytics, cost estimator, calendar
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== RECIPES ====================
function isFavoriteRecipe(rid){
  return APP.settings&&Array.isArray(APP.settings.favoriteRecipes)&&APP.settings.favoriteRecipes.indexOf(rid)!==-1;
}
function toggleFavoriteRecipe(rid,ev){
  if(ev){ev.stopPropagation();ev.preventDefault();}
  if(!APP.settings.favoriteRecipes)APP.settings.favoriteRecipes=[];
  var idx=APP.settings.favoriteRecipes.indexOf(rid);
  if(idx===-1){APP.settings.favoriteRecipes.push(rid);toast('★ Favorited');}
  else{APP.settings.favoriteRecipes.splice(idx,1);toast('☆ Unfavorited');}
  saveSettings&&saveSettings();
  scheduleSave&&scheduleSave();
  // Update only the star + ensure list re-sorts if currently visible
  if(currentView==='recipes')updateRecipeSearchResults(APP.filters.recipeSearch||'');
}

// Classify a recipe by total time from brew day to ready-to-drink window
// (fermentDays + minAgeDays). Buckets: quick (<90d), medium (90-365), long (>365)
function recipeAgeCategory(r){
  var totalToReady=(r.fermentDays||42)+(r.minAgeDays||60);
  if(totalToReady<90)return'quick';
  if(totalToReady<365)return'medium';
  return'long';
}

function recipeCardHtml(r){
  var dc={Beginner:'var(--green2)',Intermediate:'var(--honey)',Advanced:'var(--red2)',Expert:'#a060c8'};
  var stageColors={primary:'#7aa040',secondary:'#a85aa0',both:'#c9a84c',none:'#666'};
  var stageLabels={primary:'PRIMARY ADD',secondary:'SECONDARY ADD',both:'BOTH STAGES',none:''};
  var stage=r.additionStage||'none';
  var stageBadge=stageLabels[stage]?'<span style="font-family:var(--font-mono);font-size:9px;color:'+stageColors[stage]+';padding:2px 7px;border-radius:8px;letter-spacing:1.2px;border:1px solid '+stageColors[stage]+';background:rgba(0,0,0,0.2)">'+stageLabels[stage]+'</span>':'';
  var fav=isFavoriteRecipe(r.id);
  var starBtn='<button class="btn-icon" onclick="toggleFavoriteRecipe(\''+r.id+'\',event)" title="'+(fav?'Unfavorite':'Favorite — pin to top')+'" style="position:absolute;top:8px;right:8px;z-index:2;background:rgba(0,0,0,0.35);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:'+(fav?'#e8c46a':'rgba(255,255,255,0.4)')+';border:1px solid '+(fav?'rgba(232,196,106,0.5)':'rgba(255,255,255,0.15)')+'">'+(fav?'★':'☆')+'</button>';
  return'<div class="recipe-card" style="position:relative'+(fav?';box-shadow:0 0 0 1px rgba(232,196,106,0.4)':'')+'" onclick="currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\')">'
    +starBtn
    +(r.isCustom?'<button onclick="event.stopPropagation();deleteCustomRecipe(\''+r.id+'\')" title="Delete this recipe" style="position:absolute;bottom:8px;right:8px;z-index:2;background:var(--bg3);border:1px solid var(--border);color:var(--red2);width:26px;height:26px;border-radius:var(--radius);cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center">🗑</button>':'')
    +'<div class="recipe-card-bar" style="background:'+r.brandColor+'"></div>'
    +'<div class="recipe-card-body">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;padding-right:36px">'
    +'<div style="min-width:0;flex:1"><div class="recipe-name" style="color:'+r.brandColor+'">'+escHtml(r.name)+(r.isCustom?' <span style="font-family:var(--font-mono);font-size:9px;color:var(--gold2);background:var(--bg4);padding:2px 6px;border-radius:8px;letter-spacing:1.5px;border:1px solid var(--border);vertical-align:middle;margin-left:6px">MINE</span>':'')+(r.useGenericLabel?' <span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);background:var(--bg4);padding:2px 6px;border-radius:8px;letter-spacing:1.5px;border:1px dashed var(--border);vertical-align:middle;margin-left:4px" title="Uses generic generated label">GENERIC LABEL</span>':'')+'</div><div class="recipe-style">'+escHtml(r.style)+(r.category&&r.category!==r.style?' · '+escHtml(r.category):'')+'</div></div>'
    +'<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">'
    +'<span style="font-family:var(--font-mono);font-size:10px;color:'+(dc[r.difficulty]||'var(--text2)')+';padding:3px 8px;border-radius:10px;border:1px solid '+(dc[r.difficulty]||'var(--border)')+'">'+r.difficulty+'</span>'
    +stageBadge
    +'</div>'
    +'</div>'
    +'<div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:10px">'+escHtml(r.description.substring(0,100))+'…</div>'
    +'<div style="display:flex;gap:12px;font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:8px">'
    +'<span>OG '+r.ogTarget+'</span><span>~'+r.abvTarget+'% ABV</span><span>'+r.volume+'L</span></div>'
    +'<div>'+(r.tags||[]).map(function(t){return'<span class="recipe-tag">'+escHtml(t)+'</span>';}).join('')+'</div>'
    +'</div></div>';
}

// Shared filter+sort for recipe list — used by both initial render and the
// live-update path so they stay in sync.
function applyRecipeFilters(){
  var q=(APP.filters.recipeSearch||'').toLowerCase().trim();
  var diffFilter=APP.filters.recipeDifficulty||'all';
  var catFilter=APP.filters.recipeCategory||'all';
  var stageFilter=APP.filters.recipeStage||'all';
  var ageFilter=APP.filters.recipeAge||'all';
  var favOnly=!!APP.filters.recipeFavoritesOnly;
  var filtered=APP.recipes.filter(function(r){
    if(favOnly&&!isFavoriteRecipe(r.id))return false;
    if(diffFilter!=='all'&&r.difficulty!==diffFilter)return false;
    if(catFilter!=='all'&&(r.category||r.style||'Traditional')!==catFilter)return false;
    if(stageFilter!=='all'&&(r.additionStage||'none')!==stageFilter)return false;
    if(ageFilter!=='all'&&recipeAgeCategory(r)!==ageFilter)return false;
    if(q){
      // Ingredient search: include item names + notes, on top of name/style/etc.
      var ingredientText=(r.ingredients||[]).map(function(i){return(i.item||'')+' '+(i.notes||'');}).join(' ');
      var hay=(r.name+' '+r.style+' '+(r.description||'')+' '+(r.tags||[]).join(' ')+' '+(r.category||'')+' '+ingredientText).toLowerCase();
      if(hay.indexOf(q)===-1)return false;
    }
    return true;
  });
  // Favorites sort to top (preserves original order within each group)
  filtered.sort(function(a,b){
    var fa=isFavoriteRecipe(a.id)?0:1;
    var fb=isFavoriteRecipe(b.id)?0:1;
    return fa-fb;
  });
  return filtered;
}

function renderRecipes(){
  var filtered=applyRecipeFilters();
  var q=APP.filters.recipeSearch||'';
  var diffFilter=APP.filters.recipeDifficulty||'all';
  var catFilter=APP.filters.recipeCategory||'all';
  var stageFilter=APP.filters.recipeStage||'all';
  var ageFilter=APP.filters.recipeAge||'all';
  var favOnly=!!APP.filters.recipeFavoritesOnly;
  var favCount=(APP.settings.favoriteRecipes||[]).length;
  var diffChips=[['all','All'],['Beginner','Beginner'],['Intermediate','Intermediate'],['Advanced','Advanced'],['Expert','Expert']]
    .map(function(x){return'<span class="filter-chip '+(diffFilter===x[0]?'active':'')+'" onclick="setRecipeFilter(\''+x[0]+'\')">'+x[1]+'</span>';}).join('');
  var allCats={};
  APP.recipes.forEach(function(r){var c=r.category||r.style||'Traditional';allCats[c]=(allCats[c]||0)+1;});
  var catList=[['all','All Styles']].concat(Object.keys(allCats).sort().map(function(c){return[c,c+' ('+allCats[c]+')'];}));
  var catChips=catList.map(function(x){return'<span class="filter-chip '+(catFilter===x[0]?'active':'')+'" onclick="setRecipeCategoryFilter(\''+x[0]+'\')">'+x[1]+'</span>';}).join('');
  var stageChips=[['all','All stages'],['primary','Primary additions'],['secondary','Secondary additions'],['both','Both'],['none','No additions']]
    .map(function(x){return'<span class="filter-chip '+(stageFilter===x[0]?'active':'')+'" onclick="setRecipeStageFilter(\''+x[0]+'\')">'+x[1]+'</span>';}).join('');
  var ageChips=[['all','Any time'],['quick','Quick (< 3mo)'],['medium','Medium (3-12mo)'],['long','Long (1yr+)']]
    .map(function(x){return'<span class="filter-chip '+(ageFilter===x[0]?'active':'')+'" onclick="setRecipeAgeFilter(\''+x[0]+'\')">'+x[1]+'</span>';}).join('');
  var favToggle='<span class="filter-chip '+(favOnly?'active':'')+'" onclick="toggleFavOnly()" style="'+(favOnly?'background:rgba(232,196,106,0.2);border-color:#e8c46a;color:#e8c46a':'')+'">★ Favorites'+(favCount?' ('+favCount+')':'')+'</span>';
  var anyFilterActive=q||diffFilter!=='all'||catFilter!=='all'||stageFilter!=='all'||ageFilter!=='all'||favOnly;
  var cards=filtered.map(function(r){return recipeCardHtml(r);}).join('');
  return'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px"><div class="page-title" style="margin-bottom:0">Recipes</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" onclick="importBeerXMLClick()" title="Import a BeerXML recipe file (.xml) from another brewing app">⬇ Import BeerXML</button>'
    +(APP.customRecipes.length?'<button class="btn btn-secondary btn-sm" onclick="exportAllCustomRecipesBeerXML()" title="Export all custom recipes as BeerXML">⬆ Export Custom</button>':'')
    +'<button class="btn btn-secondary btn-sm" onclick="openRecipeWizard()" title="Guided designer: pick targets, it does the honey/OG math and picks a yeast">✦ Designer</button>'
    +'<button class="btn btn-primary btn-sm" onclick="openCustomRecipeModal()">＋ Create Recipe</button>'
    +'</div></div>'
    +'<div class="page-subtitle">The Mead Compendium · '+APP.recipes.length+' recipe'+(APP.recipes.length!==1?'s':'')+(APP.customRecipes.length?' ('+APP.customRecipes.length+' yours)':'')+(anyFilterActive?' · '+filtered.length+' shown':'')+'</div>'
    +(typeof renderBrewWhatYouHaveCard==='function'?renderBrewWhatYouHaveCard():'')
    +'<div class="search-bar"><input type="text" class="search-input" id="recipe-search" placeholder="🔍 Search name, style, tag, or ingredient (e.g. &quot;chestnut&quot;, &quot;blackcurrant&quot;)…" value="'+escHtml(q)+'" oninput="updateRecipeSearchResults(this.value)">'
    +'<div style="display:flex;flex-direction:column;gap:6px">'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-right:4px">PIN:</span>'+favToggle+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-right:4px">STYLE:</span>'+catChips+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-right:4px">DIFFICULTY:</span>'+diffChips+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-right:4px">TIME TO READY:</span>'+ageChips+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-right:4px">ADDITIONS:</span>'+stageChips+'</div>'
    +'</div></div>'
    +'<div id="recipe-list-results">'+(filtered.length?'<div class="grid-2">'+cards+'</div>':'<div class="empty-state"><p>No recipes match the filters.</p></div>')+'</div>'
    +'<div class="info-box blue" style="margin-top:16px"><div style="font-size:13px;color:var(--blue2)">💡 Recipes target 5 L final volume — sized for the staged vessel setup: <strong>9 L primary</strong> (vigorous fermentation, good headspace) → <strong>7.6 L or 5 L secondary</strong> (settling, clarification) → <strong>5 L bulk aging</strong> before bottling (minimal headspace, oxidation-protected). <strong>Primary additions</strong> (fruit, ginger, etc.) survive CO₂ scrubbing; <strong>secondary additions</strong> (delicate spices, vanilla, hops) preserve aromatics.</div></div>';
}

// Update only the recipe results so the search input doesn't lose focus
function updateRecipeSearchResults(q){
  APP.filters.recipeSearch=q;
  var container=document.getElementById('recipe-list-results');
  if(!container)return;
  var filtered=applyRecipeFilters();
  var cards=filtered.map(function(r){return recipeCardHtml(r);}).join('');
  container.innerHTML=filtered.length?'<div class="grid-2">'+cards+'</div>':'<div class="empty-state"><p>No recipes match the filters.</p></div>';
}

function setRecipeFilter(d){APP.filters.recipeDifficulty=d;renderMain();}
function setRecipeCategoryFilter(c){APP.filters.recipeCategory=c;renderMain();}
function setRecipeStageFilter(s){APP.filters.recipeStage=s;renderMain();}
function setRecipeAgeFilter(a){APP.filters.recipeAge=a;renderMain();}
function toggleFavOnly(){APP.filters.recipeFavoritesOnly=!APP.filters.recipeFavoritesOnly;renderMain();}

// ==================== RECIPE ANALYTICS ====================
function computeRecipeAnalytics(){
  // Aggregate batch data per recipe
  var statsByRecipe={};
  APP.batches.forEach(function(b){
    if(!b.recipeId)return;
    if(!statsByRecipe[b.recipeId]){
      statsByRecipe[b.recipeId]={recipeId:b.recipeId,batchCount:0,bottledCount:0,abvs:[],daysToBottling:[],ratings:[],ogDeviations:[]};
    }
    var s=statsByRecipe[b.recipeId];
    s.batchCount++;
    var bot=APP.bottling[b.id];
    if(bot){
      s.bottledCount++;
      if(bot.abv)s.abvs.push(bot.abv);
      if(bot.date&&b.startDate){
        var days=Math.round((new Date(bot.date)-new Date(b.startDate))/86400000);
        if(days>0&&days<365)s.daysToBottling.push(days);
      }
    }
    // OG deviation from recipe target
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    if(recipe&&recipe.ogTarget&&b.og){
      s.ogDeviations.push(b.og-recipe.ogTarget);
    }
    // Average tasting rating
    var tastings=APP.tastings[b.id]||[];
    tastings.forEach(function(t){
      if(t.rating&&t.rating>0)s.ratings.push(t.rating);
    });
  });
  // Compute averages
  var results=Object.values(statsByRecipe).map(function(s){
    function avg(arr){return arr.length?arr.reduce(function(a,b){return a+b;},0)/arr.length:null;}
    var recipe=APP.recipes.find(function(r){return r.id===s.recipeId;});
    return{
      recipe:recipe,
      batchCount:s.batchCount,
      bottledCount:s.bottledCount,
      completionRate:s.batchCount?s.bottledCount/s.batchCount:0,
      avgAbv:avg(s.abvs),
      avgDaysToBottling:avg(s.daysToBottling),
      avgRating:avg(s.ratings),
      avgOgDeviation:avg(s.ogDeviations),
      ratingCount:s.ratings.length
    };
  }).filter(function(r){return r.recipe;});
  return results;
}

function renderRecipeAnalytics(){
  var stats=computeRecipeAnalytics();
  if(!stats.length)return'';
  // Sort by batch count desc, then rating desc
  stats.sort(function(a,b){
    if(b.batchCount!==a.batchCount)return b.batchCount-a.batchCount;
    return(b.avgRating||0)-(a.avgRating||0);
  });
  var collapsed=APP.filters.analyticsCollapsed!==false;  // default collapsed
  var rows=stats.slice(0,10).map(function(s){
    var r=s.recipe;
    var ratingDisplay=s.avgRating?s.avgRating.toFixed(1)+'★':'<span style="color:var(--text3)">—</span>';
    var abvDisplay=s.avgAbv?s.avgAbv.toFixed(1)+'%':'<span style="color:var(--text3)">—</span>';
    var daysDisplay=s.avgDaysToBottling?Math.round(s.avgDaysToBottling)+'d':'<span style="color:var(--text3)">—</span>';
    var ogDevText='';
    if(s.avgOgDeviation!=null){
      var dev=s.avgOgDeviation;
      var sign=dev>=0?'+':'';
      var color=Math.abs(dev)<0.005?'var(--green2)':Math.abs(dev)<0.015?'var(--honey)':'var(--red2)';
      ogDevText='<span style="color:'+color+'" title="Average OG difference from recipe target">'+sign+(dev*1000).toFixed(0)+' pts</span>';
    }else{
      ogDevText='<span style="color:var(--text3)">—</span>';
    }
    var compRate=Math.round(s.completionRate*100);
    var compColor=compRate>=80?'var(--green2)':compRate>=50?'var(--honey)':'var(--red2)';
    return'<tr style="cursor:pointer" onclick="currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\')">'
      +'<td style="color:'+r.brandColor+';font-family:var(--font-display);padding:8px 10px">'+escHtml(r.name)+'</td>'
      +'<td style="text-align:center;font-family:var(--font-mono)">'+s.batchCount+'</td>'
      +'<td style="text-align:center;font-family:var(--font-mono);color:'+compColor+'">'+compRate+'%</td>'
      +'<td style="text-align:center;font-family:var(--font-mono)">'+abvDisplay+'</td>'
      +'<td style="text-align:center;font-family:var(--font-mono)">'+daysDisplay+'</td>'
      +'<td style="text-align:center;font-family:var(--font-mono)">'+ratingDisplay+(s.ratingCount?' <span style="color:var(--text3);font-size:10px">('+s.ratingCount+')</span>':'')+'</td>'
      +'<td style="text-align:center;font-family:var(--font-mono);font-size:11px">'+ogDevText+'</td>'
      +'</tr>';
  }).join('');
  return'<div class="card" style="margin-bottom:14px">'
    +'<div class="card-header" style="cursor:pointer" onclick="toggleAnalytics()"><div class="card-title">📊 RECIPE PERFORMANCE</div>'
    +'<div style="margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--text3)">'+(collapsed?'▸ show':'▾ hide')+' · '+stats.length+' brewed</div></div>'
    +(collapsed?'':'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-style:italic">Aggregated metrics across all your batches. Click any row to open the recipe.</div>'
      +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
      +'<thead><tr style="border-bottom:1px solid var(--border);color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px">'
      +'<th style="text-align:left;padding:8px 10px">RECIPE</th>'
      +'<th style="text-align:center" title="Number of batches you\'ve brewed">BREWS</th>'
      +'<th style="text-align:center" title="Percentage that made it to bottling">SUCCESS</th>'
      +'<th style="text-align:center">AVG ABV</th>'
      +'<th style="text-align:center" title="Average days from start to bottling">DAYS</th>'
      +'<th style="text-align:center" title="Average tasting rating (count in parens)">RATING</th>'
      +'<th style="text-align:center" title="Average OG deviation from recipe target — closer to 0 is better">OG ACC.</th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table></div>')
    +'</div>';
}

function toggleAnalytics(){
  // Default state is "collapsed" → undefined/anything-but-false reads as true.
  // We need to flip the *current* read, not the raw stored value, so the flag
  // bounces between true and false on each click.
  var currentlyCollapsed=APP.filters.analyticsCollapsed!==false;
  APP.filters.analyticsCollapsed=!currentlyCollapsed;
  renderMain();
}

// ==================== END RECIPE ANALYTICS ====================

function annotateNutrientDesc(desc){
  if(!desc)return desc;
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var sachet=APP.settings.sachetSize||12;
  // Reminder triggers are computed from the ENGLISH source (reliable keyword
  // match) BEFORE translating, so they still fire on the Dutch body.
  var enLow=String(desc).toLowerCase();
  var needSorbate=/(metabisulf|metabisulph|campden|k-?meta|sodium\s+metabisul)/i.test(desc)&&!/sorbate/i.test(desc)&&/(stabili|back-?sweet|sweeten|restart|prevent)/i.test(enLow);
  var needRack=/\brack/i.test(desc)&&!/(stable|finished|fermentation is done|two readings|done fermenting)/i.test(enLow);
  var needBottle=/\bbottl(e|es|ed|ing)\b/i.test(desc)&&!/earliest/i.test(enLow)&&!/priming|carbonat|sparkling/i.test(enLow);
  // Translate the body to Dutch (no-op in English).
  if(nl&&typeof STEP_DESC_NL!=='undefined'&&STEP_DESC_NL[desc])desc=STEP_DESC_NL[desc];
  // Sachet hint: "6g nutrient" (EN) / "6 g voeding" (NL) → "(~0.5 sachets)".
  desc=desc.replace(nl?/(\d+(?:[.,]\d+)?)\s*g\s+(?:gist)?voeding/gi:/(\d+(?:\.\d+)?)\s*g\s+(?:of\s+)?(?:yeast\s+)?nutrient/gi,function(m,g){
    var grams=parseFloat(String(g).replace(',','.'));
    var n=Math.round(grams/sachet*10)/10;
    var nDisplay=Math.abs(n-Math.round(n))<0.05?Math.round(n):n;
    var lab=nl?'sachets':(parseFloat(nDisplay)===1?'sachet':'sachets');
    return m+' (~'+String(nDisplay).replace('.',nl?',':'.')+' '+lab+')';
  });
  // ---- Universal brewing-convention reminders (right language per trigger).
  if(needSorbate)desc+=nl?' ⚠ Om echt te stabiliseren (bv. vóór terugzoeten), voeg kaliumsorbaat (~1 g/4,5 L) TOE NAAST het metabisulfiet — metabisulfiet alleen belet de gist niet te herstarten.':' ⚠ To truly stabilise (e.g. before back-sweetening), add potassium sorbate (~1 g/4.5 L) ALONGSIDE the metabisulfite — metabisulfite alone will not stop the yeast restarting.';
  if(needRack)desc+=nl?' (Hevel pas over zodra de gisting klaar is — een stabiele dichtheid over twee metingen — niet op een vaste dag.)':' (Rack only once fermentation is finished — a stable gravity across two readings — not on a fixed day.)';
  if(needBottle)desc+=nl?' (Dit is het vroegst zinvolle bottelmoment, geen deadline — langere bulkrijping is doorgaans veiliger en beter.)':' (This is the earliest sensible bottling point, not a deadline — longer bulk aging is generally safer and better.)';
  return desc;
}

// Display-only: most recipe step lists describe brew-day "stir to aerate" but
// omit the ongoing aeration/degassing that every primary mead ferment needs.
// Inject a single care step into the *visual* timeline (never into the task
// system — that keys tasks by day and would collide with a day-1 nutrient
// step, and never into recipe.steps — the array is shared). Returns a
// shallow-cloned, re-sorted array.
function injectCareSteps(steps){
  if(!Array.isArray(steps))return steps||[];
  // Idempotent — never inject twice. Otherwise always add the care step: no
  // recipe explains the aeration principle (oxygenate early, then STOP after
  // the 1/3 break), which is the most commonly missed mead technique.
  if(steps.some(function(s){return s._care;}))return steps;
  var _nl=(typeof appLang==='function'&&appLang()==='nl');
  var care={day:1,_care:true,title:_nl?'Beluchten & ontgassen · dagelijks tot de 1/3-breuk':'Aerate & Degas · daily through the 1/3 break',
    desc:_nl?'Roer tijdens het eerste derde van de gisting de most één of twee keer per dag krachtig. Dit drijft opgelost CO₂ uit (ontgassen) en geeft de vermenigvuldigende gist de zuurstof die ze nodig heeft om gezonde celwanden te bouwen — het belangrijkste wat je kunt doen voor een schone gisting die niet stilvalt. Ontgas altijd VÓÓR een voedingstoevoeging zodat het niet overschuimt. Stop daarna met beluchten na de 1/3-suikerbreuk: zodra de gist overschakelt op anaerobe alcoholproductie, oxideert toegevoegde zuurstof de mede in plaats van te helpen.':'During the first third of fermentation, stir the must vigorously once or twice a day. This drives off dissolved CO₂ (degassing) and gives the multiplying yeast the oxygen they need to build healthy cell walls — the single biggest thing you can do for a clean, stall-free ferment. Always degas BEFORE a nutrient addition so it doesn\'t foam over. Then STOP aerating after the 1/3 sugar break: once the yeast switch to anaerobic alcohol production, adding oxygen oxidises the mead instead of helping it.'};
  return steps.concat([care]).sort(function(a,b){return a.day-b.day;});
}

// One-time footnote explaining the 1/3 sugar break, shown beneath any timeline
// whose steps reference it (TOSNA dose 4, sack-mead nutrient timing, etc.).
function sugarBreakNote(steps){
  var refs=(steps||[]).some(function(s){return /sugar break|1\/3 break|⅓\s*break/i.test((s.title||'')+' '+(s.desc||''));});
  if(!refs)return'';
  if(typeof appLang==='function'&&appLang()==='nl')return '<div style="margin-top:12px;padding:11px 13px;border-radius:var(--radius);background:var(--bg3);border-left:3px solid var(--gold);font-size:12px;color:var(--text2);line-height:1.6">'
    +'<strong style="color:var(--gold2)">ℹ Wat is de “1/3-suikerbreuk”?</strong> Het is het punt waarop de gisting ongeveer een derde van de suiker heeft opgegeten — d.w.z. de dichtheid is een derde gezakt van je OG richting de verwachte einddichtheid (≈ OG − (OG − FG) ÷ 3). Voor een most van 1.100 die rond 1.000 eindigt is dat ongeveer <strong>SG 1.067</strong>, doorgaans bereikt rond dag 3–7. Het telt omdat gist vroeg voeding opneemt: alle stikstof — vooral DAP — moet <em>vóór</em> dit punt worden toegevoegd, en het is ook wanneer je stopt met beluchten.</div>';
  return '<div style="margin-top:12px;padding:11px 13px;border-radius:var(--radius);background:var(--bg3);border-left:3px solid var(--gold);font-size:12px;color:var(--text2);line-height:1.6">'
    +'<strong style="color:var(--gold2)">ℹ What\'s the “1/3 sugar break”?</strong> It\'s the point where fermentation has eaten about one-third of the sugar — i.e. the gravity has dropped one-third of the way from your OG down toward its expected final gravity (≈ OG − (OG − FG) ÷ 3). For a 1.100 must finishing near 1.000 that\'s about <strong>SG 1.067</strong>, usually reached around days 3–7. It matters because yeast absorb nutrients early: all nitrogen — especially DAP — should be added <em>before</em> this point, and it\'s also when you stop aerating.</div>';
}

// Returns the configured packet size in grams for the given supply type.
// Prefers a per-supply packetSize, falls back to the global setting
// (sachetSize for nutrient), then a hard default. Used by recipe scaling
// to keep the "X packets" count in sync as the batch scales up/down.
function getPacketSize(supplyType){
  var supply=(APP.supplies||[]).find(function(s){
    return s.type===supplyType&&parseFloat(s.packetSize)>0;
  });
  if(supply)return parseFloat(supply.packetSize);
  if(supplyType==='nutrient')return parseFloat(APP.settings&&APP.settings.sachetSize)||12;
  if(supplyType==='yeast')return 10;
  return 10;
}

// Identify which YEAST_STRAINS entry an ingredient line refers to by
// matching keywords in the item text against strain name patterns. Returns
// the strain object or null if no confident match. Used by scaling so we
// can apply strain-specific coverage rules instead of linear gram math.
function identifyYeastFromText(itemText){
  if(!itemText)return null;
  var lower=String(itemText).toLowerCase();
  // Substring patterns per strain, ordered most-specific-first
  var patterns=[
    [/wlp.?720|sweet mead yeast/,'w15'],
    [/us.?05|safale/,'us05'],
    [/ec.?1118|champagne yeast/,'ec1118'],
    [/d.?47|cotes du rhone|côtes du rhône/,'d47'],
    [/71.?b|narbonne/,'71b'],
    [/k1.?v|k1v.?1116|montpellier/,'k1v'],
    [/qa.?23/,'qa23'],
    [/red.?star.*cuv|premier.*cuv/,'red-pc'],
    [/red.?star.*blanc|premier.*blanc|pasteur champagne/,'red-bl'],
    // M05 last because "mead yeast" is generic and would match other entries
    [/m05|mangrove jack.*mead|mead yeast/,'m05']
  ];
  for(var i=0;i<patterns.length;i++){
    if(patterns[i][0].test(lower)){
      var found=YEAST_STRAINS.find(function(y){return y.id===patterns[i][1];});
      if(found)return found;
    }
  }
  return null;
}

// Identify which NUTRIENT_PRODUCTS entry an ingredient line refers to.
// Returns the product or null. Only matters for sachet-counted products
// like MJ Mead Nutrient — bulk powders scale by grams regardless.
function identifyNutrientFromText(itemText){
  if(!itemText)return null;
  var lower=String(itemText).toLowerCase();
  var patterns=[
    [/mangrove jack.*nutrient|mead yeast nutrient|mj.?mead/,'mj-mead'],
    [/fermaid.?o\b/,'fermaid-o'],
    [/fermaid.?k\b/,'fermaid-k'],
    [/nutrivit/,'vinoferm-nutrivit'],
    [/nutrisal/,'vinoferm-nutrisal'],
    [/go.?ferm|goferm/,'goferm'],
    [/tronozymol/,'tronozymol'],
    [/\bdap\b|diammonium phosphate/,'generic-dap']
  ];
  for(var i=0;i<patterns.length;i++){
    if(patterns[i][0].test(lower)){
      var found=NUTRIENT_PRODUCTS.find(function(n){return n.id===patterns[i][1];});
      if(found)return found;
    }
  }
  return null;
}

// Scale recipe ingredients to the target volume.
//
// Yeast and sachet-based nutrients DON'T scale linearly in grams — they
// scale in WHOLE SACHETS, because that's how the product is sold. A 5g
// Lalvin sachet covers up to 23L; you don't crack open half a foil pouch
// for a 7L batch. Coverage-based ceiling: sachets = ceil(volume / coverageL),
// minimum 1, and totalGrams is whatever the sachet count gives you.
//
// Bulk-pack nutrients (Fermaid-O/K, DAP, Nutrivit, etc.) DO scale linearly
// in grams because you measure them out from a tub — they show grams only,
// no fictional sachet count.
//
// Everything else (honey, water, fruit, spice, sulfite, sorbate, pectic)
// scales linearly as before.
function scaleRecipeIngredients(r,scaleVol,config){
  config=config||{};   // {honey,yeast,nutrient} overrides from the recipe configurator
  var linearFactor=scaleVol/(r.volume||5);
  // "to the N mark" follows the chosen recipe-scale unit (L / US gal / UK gal).
  var mark=(typeof fmtRecipeScale==='function')?fmtRecipeScale(scaleVol):(scaleVol+' L');
  return r.ingredients.map(function(ing){
    var amt=ing.amount;
    var note=ing.notes;
    var item=ing.item||'';
    // WATER: never a fixed volume to pour — you top up to the batch mark after
    // the honey/fruit/etc. are in (they add their own volume). Show that instead.
    if(/^spring water$/i.test(item.trim())||/^water$/i.test(item.trim())){
      var _nlw=(typeof appLang==='function'&&appLang()==='nl');
      return Object.assign({},ing,{amount:_nlw?('bijvullen tot '+mark):('top up to the '+mark+' mark'),
        notes:note||(_nlw?('Voeg eerst de honing en andere ingrediënten toe, vul dan bij met water tot '+mark+' — giet NIET zoveel water erbovenop, dat zou het volume overschrijden'):('Add the honey and other ingredients first, then top up with water to the '+mark+' mark — do NOT pour this much water on top, it would overshoot the volume'))});
    }
    var m=amt.match(/^~?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|g|L|ml)\b/i);
    if(!m)return Object.assign({},ing,{amount:amt,notes:note});
    var baseValue=parseFloat(m[1]);
    var unitLower=m[2].toLowerCase();
    var isYeast=/yeast/i.test(item)&&!/nutrient/i.test(item);
    var isNutrient=/nutrient/i.test(item);
    var isHoney=/honey/i.test(item)&&!isYeast&&!isNutrient;
    var outItem=item;   // may be relabelled below when the configurator overrides a choice
    if(isYeast&&unitLower==='g'){
      // YEAST: coverage-based ceiling. Configurator override wins over text match.
      var strain=(config.yeast&&typeof getYeastById==='function'&&getYeastById(config.yeast))||identifyYeastFromText(item);
      if(config.yeast&&strain&&strain.name)outItem=strain.name;
      var coverage=(strain&&strain.sachetCoversL)||23;
      var sachetG=(strain&&strain.sachetSize)||10;
      // Apply OG stress if the recipe declares ogTarget — high-OG batches
      // effectively shrink per-sachet coverage by the stress factor.
      var ogPts=r.ogTarget?(r.ogTarget-1)*1000:80;
      var stressMult=1+Math.max(0,(ogPts-80))/50;
      var effectiveL=scaleVol*stressMult;
      var sachets=Math.max(1,Math.ceil(effectiveL/coverage));
      var totalG=sachets*sachetG;
      // Strip any prior "(N packet/sachet)" annotation, then rewrite grams + count
      amt=amt.replace(m[0],totalG+' g');
      amt=amt.replace(/\s*\([^)]*(?:packet|sachet)[^)]*\)/i,'');
      amt=amt.replace(/\s*·\s*[0-9.]+\s+(?:packet|sachet)s?/gi,'');
      if(typeof appLang==='function'&&appLang()==='nl')amt=amt.replace('(a part-pack covers 5 L — reseal & fridge the rest)','(een deel-pakje dekt 5 L — hersluit & koel de rest)').replace('(part-pack; reseal the rest)','(deel-pakje; hersluit de rest)');
      amt+='  ·  '+sachets+' '+((typeof appLang==='function'&&appLang()==='nl')?(sachets===1?'pakje':'pakjes'):(sachets===1?'packet':'packets'));
    }else if(isNutrient&&unitLower==='g'){
      // NUTRIENT: scale grams linearly (that's correct — YAN demand is per L).
      // Sachet count uses ceiling math only for products SOLD in single-batch
      // sachets (MJ Mead). Bulk powders just show grams, no sachet count.
      var grams=baseValue*linearFactor;
      var formattedG=Math.round(grams)+' g';
      amt=amt.replace(m[0],formattedG);
      amt=amt.replace(/\s*\([^)]*(?:packet|sachet)[^)]*\)/i,'');
      amt=amt.replace(/\s*·\s*[0-9.]+\s+(?:packet|sachet)s?/gi,'');
      var product=(config.nutrient&&typeof getNutrientById==='function'&&getNutrientById(config.nutrient))||identifyNutrientFromText(item);
      if(config.nutrient&&product&&product.name)outItem=product.name;
      if(product&&product.sachetCoversL&&product.sachetSize){
        // Sachet-based — show ceiling count, e.g. "18g · 2 sachets" for 12L batch
        var nSachets=Math.max(1,Math.ceil(scaleVol/product.sachetCoversL));
        amt+='  ·  '+nSachets+' '+(nSachets===1?'sachet':'sachets');
      }
      // Bulk powders: no sachet annotation — user measures from a tub.
      // Flag when you won't use a whole sachet so the rest can be saved.
      var sachetSz=parseFloat(APP.settings&&APP.settings.sachetSize)||12;
      if(grams>0&&grams<sachetSz-0.5){
        note=(note?note+' · ':'')+((typeof appLang==='function'&&appLang()==='nl')?('slechts ~'+Math.round(grams)+' g — minder dan een vol sachet, bewaar de rest voor een andere partij'):('only ~'+Math.round(grams)+' g — under a full sachet, so save the rest for another batch'));
      }
    }else{
      // Everything else (honey, water, fruit, sulfite, sorbate, pectic):
      // straightforward linear scaling
      var v=baseValue*linearFactor;
      // Whole grams read cleanest at scale, but sub-gram additions (pectic
      // enzyme, metabisulfite, sorbate) would round to "0 g" — keep up to 2
      // decimals under 10 g so a 0.3 g or 0.4 g dose still shows.
      var formatted;
      if(unitLower==='g'){
        formatted=v>=10?v.toFixed(0):String(Math.round(v*100)/100);
      }else{
        formatted=v.toFixed(2).replace(/\.?0+$/,'');
      }
      amt=amt.replace(m[0],formatted+' '+m[2]);
    }
    if(isHoney&&config.honey){outItem=/honey/i.test(config.honey)?config.honey:(config.honey+' Honey');}
    return Object.assign({},ing,{item:outItem,amount:amt,notes:note});
  });
}

// ==================== RECIPE CONFIGURATOR ====================
// Lets the user pick honey / yeast / nutrient / schedule on the recipe page. The
// scale slider and these dropdowns share one live-update path (updateRecipeScale),
// and the chosen config flows straight into "Brew This Recipe".
function recipeConfigDefaults(r){
  var honeyTypes=(typeof honeyTypesInRecipe==='function')?honeyTypesInRecipe(r):[];
  var honey=honeyTypes[0]||'Wildflower';
  var yeast=null,nutrient=null;
  (r.ingredients||[]).forEach(function(ing){
    var it=ing.item||'';
    if(/yeast/i.test(it)&&!/nutrient/i.test(it)&&!yeast){var s=(typeof identifyYeastFromText==='function')?identifyYeastFromText(it):null;if(s)yeast=s.id;}
    if(/nutrient/i.test(it)&&!nutrient){var p=(typeof identifyNutrientFromText==='function')?identifyNutrientFromText(it):null;if(p)nutrient=p.id;}
  });
  return {honey:honey,yeast:yeast||'m05',nutrient:nutrient||'mj-mead',schedule:'auto'};
}
function ensureRecipeConfig(r){
  if(!window.recipeConfig||window.recipeConfig._rid!==r.id){window.recipeConfig=recipeConfigDefaults(r);window.recipeConfig._rid=r.id;}
  return window.recipeConfig;
}
// Live targets readout — OG fixed by recipe; FG/ABV follow the chosen yeast;
// nutrient total follows volume + schedule. Replaced in place on any change.
function recipeConfigTargetsHtml(r,vol,cfg){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var og=r.ogTarget||1.095;
  var yt=(typeof mwYeastTargets==='function')?mwYeastTargets(og,cfg.yeast):null;
  var fg=yt?yt.fg:(r.fgTarget||1.000);
  var abv=yt?yt.abv:(r.abvTarget||parseFloat(calcABV(og,fg)));
  var nut=(typeof mwNutrientGrams==='function')?mwNutrientGrams(vol,og,cfg.schedule):null;
  // Inner stat-cards only (no wrapper) so it can fill the existing TARGETS card
  // (#recipe-targets-live) live. OG is the recipe's spec; FG/ABV follow the yeast;
  // nutrient follows volume + schedule.
  function sc(v,l){return '<div class="stat-card"><div class="stat-val" style="font-size:18px">'+v+'</div><div class="stat-label">'+l+'</div></div>';}
  return sc(og.toFixed(3),'OG')
    +sc(fg.toFixed(3),nl?'FG (verw.)':'FG (est.)')
    +sc('~'+abv.toFixed(1)+'%','ABV')
    +(nut?sc(nut.total+' g',nl?'VOEDING':'NUTRIENT'):'');
}
// Pre-brew sanity check: will the chosen yeast actually reach the recipe's target
// finish? If it's tolerance- or attenuation-limited well short of fgTarget, warn
// (it'll stall sweeter than intended) and suggest a fix. Deterministic.
function recipeConfigWarning(r,cfg){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var og=r.ogTarget; if(!og||!cfg||!cfg.yeast||typeof mwYeastTargets!=='function')return '';
  var yt=mwYeastTargets(og,cfg.yeast); if(!yt)return '';
  var recipeFG=r.fgTarget;
  if(recipeFG==null||yt.fg<=recipeFG+0.006)return '';
  var y=(typeof getYeastById==='function')?getYeastById(cfg.yeast):null;
  var name=(y&&y.name)||cfg.yeast;
  var why=yt.limitedBy==='tolerance'
    ?(nl?('bereikt zijn alcoholtolerantie ('+((y&&y.abvMax)||'?')+'%) voordat de most droog is'):('reaches its alcohol tolerance ('+((y&&y.abvMax)||'?')+'%) before the must finishes dry'))
    :(nl?'heeft een lagere vergistingsgraad':'has lower attenuation');
  return '<div style="margin-top:10px;padding:9px 11px;border-radius:var(--radius);background:rgba(224,132,60,0.10);border-left:3px solid #e0843c;font-size:12px;color:var(--text2);line-height:1.5">⚠ <strong style="color:#e0843c">'+escHtml(name)+'</strong> '+why+' — '
    +(nl?('verwacht eindigt het rond FG '+yt.fg.toFixed(3)+' (~'+yt.abv.toFixed(1)+'% alcohol), zoeter dan het recept mikt ('+recipeFG.toFixed(3)+'). Kies een gist met hogere tolerantie of verlaag de OG.')
        :('it will likely finish around FG '+yt.fg.toFixed(3)+' (~'+yt.abv.toFixed(1)+'% ABV), sweeter than the recipe target ('+recipeFG.toFixed(3)+'). Pick a higher-tolerance yeast or lower the OG.'))
    +'</div>';
}
function renderRecipeConfigurator(r){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var cfg=ensureRecipeConfig(r);
  var vol=window.recipeScaleVol||r.volume||5;
  function sel(id,field,opts){return '<select class="form-select" id="'+id+'" onchange="setRecipeConfig(\''+r.id+'\',\''+field+'\',this.value)">'+opts+'</select>';}
  var honeyOpts=(typeof HONEY_TYPES!=='undefined'?HONEY_TYPES:[]).map(function(h){return '<option value="'+escHtml(h)+'"'+(h===cfg.honey?' selected':'')+'>'+escHtml(proseL(h))+'</option>';}).join('');
  var yeastOpts=(typeof YEAST_STRAINS!=='undefined'?YEAST_STRAINS:[]).map(function(y){return '<option value="'+y.id+'"'+(y.id===cfg.yeast?' selected':'')+'>'+escHtml(y.name)+'</option>';}).join('');
  var nutOpts=(typeof NUTRIENT_PRODUCTS!=='undefined'?NUTRIENT_PRODUCTS:[]).map(function(p){return '<option value="'+p.id+'"'+(p.id===cfg.nutrient?' selected':'')+'>'+escHtml(p.name)+'</option>';}).join('');
  var schedOpts=[['auto',nl?'Auto — afstemmen op de voeding':'Auto — match the nutrient'],['tosna2',nl?'TOSNA — organisch (4 doses)':'TOSNA — organic (4 doses)'],['sna',nl?'SNA — standaard (2 doses)':'SNA — standard (2 doses)'],['sna-high',nl?'SNA — hoge dichtheid (3 doses)':'SNA — high-gravity (3 doses)']].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===cfg.schedule?' selected':'')+'>'+escHtml(o[1])+'</option>';}).join('');
  function row(label,ctl){return '<div class="form-group" style="margin-bottom:8px"><label class="form-label">'+label+'</label>'+ctl+'</div>';}
  return '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+(nl?'⚙ CONFIGUREER':'⚙ CONFIGURE')+'</div></div>'
    +'<div style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.5">'+(nl?'Kies honing, gist, voeding en schema — ingrediënten en doelen passen zich live aan, en “Brouw dit recept” neemt je keuzes over.':'Pick honey, yeast, nutrient and schedule — ingredients and targets update live, and "Brew This Recipe" carries your choices.')+'</div>'
    +row(nl?'Honingsoort':'Honey',sel('cfg-honey','honey',honeyOpts))
    +row(nl?'Giststam':'Yeast',sel('cfg-yeast','yeast',yeastOpts))
    +row(nl?'Voeding':'Nutrient',sel('cfg-nutrient','nutrient',nutOpts))
    +row(nl?'Voedingsschema':'Nutrient schedule',sel('cfg-schedule','schedule',schedOpts))
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:2px">'+(nl?'↑ De TARGETS-kaart werkt live mee.':'↑ The TARGETS card updates live.')+'</div>'
    +'<div id="recipe-config-warn">'+recipeConfigWarning(r,cfg)+'</div>'
    +'</div>';
}
function setRecipeConfig(recipeId,field,value){
  var r=APP.recipes.find(function(x){return x.id===recipeId;});if(!r)return;
  ensureRecipeConfig(r)[field]=value;
  var sl=document.getElementById('scale-slider');
  updateRecipeScale(recipeId,sl?sl.value:(window.recipeScaleVol||r.volume||5));
}

// Live slider — replaces ingredient table + readout without destroying the
// slider element. Fixes "slider gets stuck" bug from re-rendering during drag.
// Returns headspace guidance based on the user's largest fermenter. Industry
// rule of thumb: primary fermentation needs ~25-30% headspace for foam/krausen,
// so safe max ≈ 75% of vessel capacity. Returns {capacity, safeMax, vesselName}
// or null if no fermenters are configured (slider then uses generic max).
function getLargestFermenterInfo(){
  if(!APP.fermenters||!APP.fermenters.length)return null;
  var sorted=APP.fermenters.slice().sort(function(a,b){return(parseFloat(b.capacity)||0)-(parseFloat(a.capacity)||0);});
  var biggest=sorted[0];
  var cap=parseFloat(biggest.capacity)||0;
  if(cap<=0)return null;
  return{
    capacity:cap,
    safeMax:Math.round(cap*0.75*2)/2, // round to nearest 0.5L
    vesselName:biggest.name
  };
}

// Recipe scale display unit (slider stays in litres; only the readout converts).
function fmtRecipeScale(litres){
  var u=window.recipeScaleUnit||currentUnitSystem();
  return (u==='metric'?String(litres):(litres/UNIT_VOL[u].toSI).toFixed(2))+' '+UNIT_VOL[u].label;
}
// Slider min/max/step expressed in the chosen unit, so the increments land on
// round numbers (1/0.5 L, or 0.25 gal) instead of awkward fractional conversions.
function recipeSliderConfig(unit){
  if(unit==='us')return{min:0.25,max:5.5,step:0.25};       // ≈ 1–20.8 L
  if(unit==='imperial')return{min:0.25,max:4.5,step:0.25}; // ≈ 1–20.5 L
  return{min:1,max:20,step:0.5};                            // litres
}
function setRecipeScaleUnit(sys){
  if(sys!=='metric'&&sys!=='us'&&sys!=='imperial')return;
  var litres=parseFloat(window.recipeScaleVol)||5;   // canonical volume stays in litres
  window.recipeScaleUnit=sys;
  var slider=document.getElementById('scale-slider');
  if(slider){
    var sc=recipeSliderConfig(sys);
    slider.min=sc.min;slider.max=sc.max;slider.step=sc.step;
    slider.value=(sys==='metric'?litres:(litres/UNIT_VOL[sys].toSI));
  }
  ['metric','us','imperial'].forEach(function(s){
    var b=document.getElementById('rsu-'+s);if(!b)return;var on=(s===sys);
    b.style.border='1px solid '+(on?'var(--gold)':'var(--border)');
    b.style.background=on?'rgba(201,168,76,0.14)':'var(--bg3)';
    b.style.color=on?'var(--gold2)':'var(--text3)';
  });
  // Refresh readout, the ingredient "top up to the … mark", cost and brew button
  // in the new unit (round-trips through the canonical litres).
  if(slider)updateRecipeScale(window.currentRecipeId,slider.value);
  else{var v=document.getElementById('scale-slider-val');if(v)v.textContent=fmtRecipeScale(litres);}
}
function updateRecipeScale(recipeId,val){
  var u=window.recipeScaleUnit||currentUnitSystem();
  var disp=parseFloat(val);
  if(isNaN(disp))return;
  var vol=(u==='metric')?disp:disp*UNIT_VOL[u].toSI;   // convert slider value → litres (canonical)
  window.recipeScaleVol=vol;
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
  if(!r)return;
  var valEl=document.getElementById('scale-slider-val');
  if(valEl)valEl.textContent=fmtRecipeScale(vol);
  var warnEl=document.getElementById('scale-warning');
  if(warnEl){
    var info=getLargestFermenterInfo();
    if(info&&vol>info.capacity){
      warnEl.innerHTML='<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ '+fmtRecipeScale(vol)+' exceeds your largest vessel capacity ('+escHtml(info.vesselName)+', '+fmtRecipeScale(info.capacity)+')</div>';
    }else if(info&&vol>info.safeMax){
      warnEl.innerHTML='<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ Above '+fmtRecipeScale(info.safeMax)+' risks blow-off in your largest vessel ('+escHtml(info.vesselName)+', '+fmtRecipeScale(info.capacity)+')</div>';
    }else{
      warnEl.innerHTML='';
    }
  }
  var cfg=(typeof ensureRecipeConfig==='function')?ensureRecipeConfig(r):null;
  var tbl=document.getElementById('scale-ingredients-table');
  if(tbl){
    var scaled=scaleRecipeIngredients(r,vol,cfg||{});
    tbl.innerHTML=scaled.map(function(ing){return'<tr><td style="color:var(--text)">'+escHtml(ing.item)+'</td><td style="font-family:var(--font-mono);font-size:12px;color:'+r.brandColor+'">'+escHtml(ing.amount)+'</td><td style="color:var(--text3);font-style:italic;font-size:12px">'+escHtml(ing.notes)+'</td></tr>';}).join('');
  }
  // Live configured targets (FG/ABV by yeast, nutrient by schedule) fill the
  // existing TARGETS card in place.
  var tgtEl=document.getElementById('recipe-targets-live');
  if(tgtEl&&cfg&&typeof recipeConfigTargetsHtml==='function')tgtEl.innerHTML=recipeConfigTargetsHtml(r,vol,cfg);
  var warnEl2=document.getElementById('recipe-config-warn');
  if(warnEl2&&cfg&&typeof recipeConfigWarning==='function')warnEl2.innerHTML=recipeConfigWarning(r,cfg);
  var costEl=document.getElementById('scale-cost-estimate');
  if(costEl&&typeof renderRecipeCostEstimate==='function'){
    costEl.outerHTML=renderRecipeCostEstimate(r,vol);
  }
  var brewBtn=document.getElementById('scale-brew-btn');
  if(brewBtn){
    brewBtn.textContent='Brew This Recipe ('+fmtRecipeScale(vol)+') →';
    brewBtn.setAttribute('onclick','openNewBatchModal(\''+recipeId+'\','+vol+')');
  }
}

// ==================== RECIPE COST ESTIMATOR ====================
// Heuristic batch-cost preview shown on the recipe detail page. Pulls the
// configured honey price + extras price (if entered), estimates how much
// honey is needed from OG and volume (~292 SG points per kg of honey), and
// shows total batch + per-bottle costs. Helpful for triage when picking
// which recipe to brew next given fermenter availability.
//
// When the user has entered prices for individual supplies (yeast, nutrient,
// etc.) in the Supplies page, those override the heuristic flat-rate defaults
// for a more accurate estimate.
// Renders a "Recommended Yeast" card for a built-in recipe. Shows top picks
// (green), acceptable alternates (gold), and discouraged options (red) with
// click-through to the full yeast-detail page. Returns '' for custom recipes
// (no pairings exist for those) so the card is skipped cleanly.
function renderRecipeYeastBlock(r){
  if(typeof getRecipeYeastPairings!=='function')return'';
  var pairings=getRecipeYeastPairings(r.id);
  if(!pairings)return'';

  function yeastChip(yeastId,tier){
    var y=getYeastById(yeastId);
    if(!y)return'';
    var tierConfig={
      recommended:{color:'var(--green2)',icon:'★',label:'TOP PICK'},
      acceptable:{color:'var(--gold2)',icon:'✓',label:'ALSO WORKS'},
      discouraged:{color:'var(--red2)',icon:'✗',label:'AVOID'}
    };
    var t=tierConfig[tier];
    // ABV mismatch flag — surface if this yeast can't reach the recipe's ABV target
    var abvFlag='';
    if(r.abvTarget&&y.abvMax<r.abvTarget){
      abvFlag='<span style="display:inline-block;margin-left:6px;font-family:var(--font-mono);font-size:9px;color:var(--red2);background:rgba(200,60,60,0.15);padding:1px 5px;border-radius:6px;letter-spacing:1px">⛔ '+y.abvMax+'% MAX</span>';
    }
    return'<div onclick="currentYeastId=\''+y.id+'\';showView(\'yeast-detail\')" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-left:3px solid '+t.color+';border-radius:var(--radius);padding:9px 12px;transition:all 0.15s" onmouseover="this.style.background=\'var(--bg3)\';this.style.transform=\'translateX(2px)\'" onmouseout="this.style.background=\'var(--bg2)\';this.style.transform=\'\'">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
        +'<span style="color:'+t.color+';font-size:13px;font-family:var(--font-mono);min-width:14px">'+t.icon+'</span>'
        +'<div style="font-family:var(--font-display);font-size:13px;color:var(--text);flex:1;letter-spacing:0.5px">'+escHtml(y.name.split('—')[0].trim())+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:'+t.color+';letter-spacing:1.5px;font-weight:bold">'+t.label+'</div>'
      +'</div>'
      +'<div style="font-style:italic;color:var(--text3);font-size:11.5px;line-height:1.5;padding-left:22px">'+escHtml((pairings.effects&&pairings.effects[yeastId])||y.profile)+abvFlag+'</div>'
    +'</div>';
  }

  var recommendedRows=pairings.recommended.map(function(id){return yeastChip(id,'recommended');}).join('');
  var acceptableRows=pairings.acceptable.length?pairings.acceptable.map(function(id){return yeastChip(id,'acceptable');}).join(''):'';
  var discouragedRows=pairings.discouraged.length?pairings.discouraged.map(function(id){return yeastChip(id,'discouraged');}).join(''):'';

  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold)">'
    +'<div class="card-header"><div class="card-title">🧫 RECOMMENDED YEAST</div><a onclick="showView(\'yeast-library\')" style="cursor:pointer;font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">all strains →</a></div>'
    +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;line-height:1.55;margin-bottom:12px">'+escHtml(pairings.notes)+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px">'+recommendedRows+'</div>'
    +(acceptableRows?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--gold2);letter-spacing:1.5px;margin:14px 0 6px">ALSO ACCEPTABLE</div><div style="display:flex;flex-direction:column;gap:6px">'+acceptableRows+'</div>':'')
    +(discouragedRows?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--red2);letter-spacing:1.5px;margin:14px 0 6px">DO NOT USE</div><div style="display:flex;flex-direction:column;gap:6px">'+discouragedRows+'</div>':'')
  +'</div>';
}

// Renders a "Nutrient Strategy" card for a built-in recipe: the protocol, the
// recommended nutrient products with recipe-specific effects, and how the
// recipe's own ingredients shift the nitrogen demand. Returns '' for custom
// recipes (no mapping) so the card is skipped cleanly.
function renderRecipeNutrientBlock(r){
  if(typeof getRecipeNutrientPairings!=='function')return'';
  var p=getRecipeNutrientPairings(r.id);
  if(!p)return'';
  var loadCfg={reduced:{c:'var(--blue2)',t:'LOWER NEED'},standard:{c:'var(--gold2)',t:'STANDARD NEED'},high:{c:'var(--red2)',t:'HIGH NEED'}}[p.load]||{c:'var(--gold2)',t:''};
  var protoLabel=p.protocol==='tosna'?'TOSNA · organic-only, staggered':'SNA · staggered (may include DAP)';
  function nutChip(nid,tier){
    var n=(typeof NUTRIENT_PRODUCTS!=='undefined')?NUTRIENT_PRODUCTS.find(function(x){return x.id===nid;}):null;
    if(!n)return'';
    var tc=tier==='recommended'?{color:'var(--green2)',icon:'★',label:'BEST FIT'}:{color:'var(--gold2)',icon:'✓',label:'ALSO WORKS'};
    var eff=(p.effects&&p.effects[nid])||n.description||'';
    return'<div onclick="currentNutrientId=\''+n.id+'\';showView(\'nutrient-detail\')" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-left:3px solid '+tc.color+';border-radius:var(--radius);padding:9px 12px;transition:all 0.15s" onmouseover="this.style.background=\'var(--bg3)\';this.style.transform=\'translateX(2px)\'" onmouseout="this.style.background=\'var(--bg2)\';this.style.transform=\'\'">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
        +'<span style="color:'+tc.color+';font-size:13px;font-family:var(--font-mono);min-width:14px">'+tc.icon+'</span>'
        +'<div style="font-family:var(--font-display);font-size:13px;color:var(--text);flex:1;letter-spacing:0.5px">'+escHtml(n.name)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:'+tc.color+';letter-spacing:1.5px;font-weight:bold">'+tc.label+'</div>'
      +'</div>'
      +'<div style="font-style:italic;color:var(--text3);font-size:11.5px;line-height:1.5;padding-left:22px">'+escHtml(eff)+'</div>'
    +'</div>';
  }
  var recRows=(p.recommended||[]).map(function(id){return nutChip(id,'recommended');}).join('');
  var accRows=(p.acceptable||[]).map(function(id){return nutChip(id,'acceptable');}).join('');
  // Go-Ferm rehydration note — always relevant
  var goferm=(typeof NUTRIENT_PRODUCTS!=='undefined')&&NUTRIENT_PRODUCTS.find(function(x){return x.id==='goferm';});
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold)">'
    +'<div class="card-header"><div class="card-title">⚗ NUTRIENT STRATEGY</div><a onclick="showView(\'nutrient-library\')" style="cursor:pointer;font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">all nutrients →</a></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
      +'<span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:1px;color:var(--text2);background:var(--bg3);border:1px solid var(--border);padding:3px 9px;border-radius:10px">'+protoLabel+'</span>'
      +(loadCfg.t?'<span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:1px;color:'+loadCfg.c+';background:'+loadCfg.c+'22;border:1px solid '+loadCfg.c+'66;padding:3px 9px;border-radius:10px">N DEMAND · '+loadCfg.t+'</span>':'')
    +'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;line-height:1.55;margin-bottom:12px">'+escHtml(p.notes)+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px">'+recRows+'</div>'
    +(accRows?'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--gold2);letter-spacing:1.5px;margin:14px 0 6px">ALSO WORKS</div><div style="display:flex;flex-direction:column;gap:6px">'+accRows+'</div>':'')
    +(goferm?((typeof appLang==='function'&&appLang()==='nl')
      ?'<div style="margin-top:12px;padding:9px 12px;background:rgba(122,160,64,0.08);border-left:3px solid var(--green);border-radius:var(--radius);font-size:11.5px;color:var(--text2);line-height:1.5"><strong style="color:var(--green2)">Rehydratie:</strong> roer de droge gist in warm water met <span style="cursor:pointer;color:var(--gold2)" onclick="currentNutrientId=\'goferm\';showView(\'nutrient-detail\')">Go-Ferm Protect</span> vóór het enten — dit primt sterolen en micronutriënten voor een schone start, welk schema je ook kiest. Voeg ALLE voedingsdoses toe vóór de 1/3-suikerbreuk om late-DAP-fuselalcoholen te vermijden.</div>'
      :'<div style="margin-top:12px;padding:9px 12px;background:rgba(122,160,64,0.08);border-left:3px solid var(--green);border-radius:var(--radius);font-size:11.5px;color:var(--text2);line-height:1.5"><strong style="color:var(--green2)">Rehydration:</strong> stir the dry yeast into warm water with <span style="cursor:pointer;color:var(--gold2)" onclick="currentNutrientId=\'goferm\';showView(\'nutrient-detail\')">Go-Ferm Protect</span> before pitching — primes sterols and micronutrients for a clean start, whatever schedule you choose. Add ALL nutrient doses before the 1/3 sugar break to avoid late-DAP fusels.</div>'):'')
  +'</div>';
}

function renderRecipeAdjunctBlock(r){
  if(typeof getRecipeAdjunctPairings!=='function')return'';
  var p=getRecipeAdjunctPairings(r.id);
  if(!p||!p.items||!p.items.length)return'';
  var catCfg={
    fruit:{icon:'🍓',color:'var(--red2)',label:'FRUIT'},
    spice:{icon:'🌰',color:'var(--gold2)',label:'SPICE'},
    floral:{icon:'🌸',color:'var(--purple2)',label:'FLORAL'},
    wood:{icon:'🪵',color:'#b07a40',label:'WOOD'},
    tannin:{icon:'🍵',color:'var(--blue2)',label:'TANNIN'},
    other:{icon:'✦',color:'var(--text2)',label:'OTHER'}
  };
  var rows=p.items.map(function(a){
    var c=catCfg[a.cat]||catCfg.other;
    return'<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid '+c.color+';border-radius:var(--radius);padding:9px 12px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">'
        +'<span style="font-size:13px;min-width:16px">'+c.icon+'</span>'
        +'<div style="font-family:var(--font-display);font-size:13px;color:var(--text);flex:1;letter-spacing:0.4px;min-width:120px">'+escHtml(proseL(a.name))+'</div>'
        +'<span style="font-family:var(--font-mono);font-size:9px;color:'+c.color+';letter-spacing:1.2px;background:'+c.color+'1e;border:1px solid '+c.color+'55;padding:1px 6px;border-radius:8px">'+c.label+'</span>'
      +'</div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap;padding-left:24px;margin-bottom:4px">'
        +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text2);background:var(--bg3);padding:1px 7px;border-radius:7px">'+escHtml(proseL(a.dose))+'</span>'
        +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:0.5px">⏱ '+escHtml(proseL(a.timing))+'</span>'
      +'</div>'
      +'<div style="font-style:italic;color:var(--text3);font-size:11.5px;line-height:1.55;padding-left:24px">'+escHtml(a.effect)+'</div>'
    +'</div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--purple)">'
    +'<div class="card-header"><div class="card-title">🍓 FRUIT &amp; SPICE ADDITIONS</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;line-height:1.6;margin-bottom:12px">'+escHtml(p.intro)+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:7px">'+rows+'</div>'
    +(p.caution?'<div style="margin-top:12px;padding:9px 12px;background:rgba(196,90,90,0.09);border-left:3px solid var(--red2);border-radius:var(--radius);font-size:11.5px;color:var(--text2);line-height:1.55"><strong style="color:var(--red2)">Watch out:</strong> '+escHtml(p.caution)+'</div>':'')
    +(typeof RECIPE_ADJUNCT_FOOTER!=='undefined'?'<div style="margin-top:12px;padding:10px 12px;background:rgba(0,0,0,0.16);border-radius:var(--radius);font-size:11.5px;color:var(--text2);line-height:1.7">'+((typeof appLang==='function'&&appLang()==='nl'&&typeof RECIPE_ADJUNCT_FOOTER_NL!=='undefined')?RECIPE_ADJUNCT_FOOTER_NL:RECIPE_ADJUNCT_FOOTER)+'</div>':'')
  +'</div>';
}

function renderRecipeComboBlock(r){
  if(typeof getRecipeComboNotes!=='function')return'';
  var c=getRecipeComboNotes(r.id);
  if(!c||!c.combos||!c.combos.length)return'';
  var rows=c.combos.map(function(x){
    return'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:11px 13px;margin-bottom:8px">'
      +'<div style="font-family:var(--font-display);font-size:13.5px;color:var(--gold2);letter-spacing:0.4px;margin-bottom:8px">🎯 '+escHtml(proseL(x.target))+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
        +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text);background:var(--bg3);border:1px solid var(--border);padding:2px 8px;border-radius:8px"><span style="color:var(--text3)">honey</span> '+escHtml(proseL(x.honey))+'</span>'
        +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text);background:var(--bg3);border:1px solid var(--border);padding:2px 8px;border-radius:8px"><span style="color:var(--text3)">yeast</span> '+escHtml(proseL(x.yeast))+'</span>'
        +'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text);background:var(--bg3);border:1px solid var(--border);padding:2px 8px;border-radius:8px"><span style="color:var(--text3)">nutrient</span> '+escHtml(proseL(x.nutrient))+'</span>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--text2);line-height:1.6">'+escHtml(x.outcome)+'</div>'
    +'</div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold);background:linear-gradient(180deg,rgba(201,168,76,0.05),transparent)">'
    +'<div class="card-header"><div class="card-title">⚗ DIAL IN YOUR OUTCOME</div><span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px">HONEY × YEAST × NUTRIENT</span></div>'
    +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;line-height:1.6;margin-bottom:12px">'+escHtml(c.intro)+'</div>'
    +rows
  +'</div>';
}

function renderRecipeCostEstimate(r,scaleVol){
  var honeyPrice=parseFloat(APP.settings.honeyPricePerKg)||0;
  var currency=APP.settings.currency||'€';
  // Honey kg from OG (rough rule: 292 SG points per kg of honey diluted in 1L)
  var sgPoints=(r.ogTarget-1)*1000;
  var honeyKg=sgPoints*scaleVol/292;
  // Look up per-supply prices. We use the first priced supply of each type.
  function firstPricedSupplyByType(type){
    if(!APP.supplies)return null;
    return APP.supplies.find(function(s){return s.type===type&&parseFloat(s.pricePerUnit)>0;});
  }
  // Yeast: typically 1 packet per batch (M05 10g packet covers up to 17L)
  var yeastSupply=firstPricedSupplyByType('yeast');
  var yeastCost=yeastSupply?parseFloat(yeastSupply.pricePerUnit):3.5;
  var yeastSourceLabel=yeastSupply?'from supplies':'estimated';
  // Nutrient: standard SNA dose is ~12g for a 5L batch. Supplies are
  // typically priced in packets (12g each) so we count "1 packet".
  var nutrientSupply=firstPricedSupplyByType('nutrient');
  var nutrientCost=nutrientSupply?parseFloat(nutrientSupply.pricePerUnit):2;
  var nutrientSourceLabel=nutrientSupply?'from supplies':'estimated';
  // Extras cost — rough estimate based on additionStage and recipe category
  var extrasCost=0;
  var extrasNote='';
  if(r.additionStage==='primary'||r.additionStage==='secondary'||r.additionStage==='both'){
    if(/fruit|melomel|berr|cherr|peach|apple|black|raspb|straw|blue/i.test(r.style+' '+(r.tags||[]).join(' ')))extrasCost=8;
    else if(/spice|metheglin|chai|lavender|ginger|chili|capsicum/i.test(r.style+' '+(r.tags||[]).join(' ')))extrasCost=4;
    else if(/cyser|pyment|braggot/i.test(r.style))extrasCost=6;
    else if(/sack|port/i.test(r.style))extrasCost=12;
    else extrasCost=3;
    extrasNote='estimated (fruit, spices, etc.)';
  }
  var honeyCost=honeyKg*honeyPrice;
  var totalCost=honeyCost+yeastCost+nutrientCost+extrasCost;
  // Bottle yield — assume average 750ml after racking losses (~10% of volume)
  var litersAfterLoss=scaleVol*0.9;
  var bottles750=Math.floor(litersAfterLoss/0.75);
  var bottles500=Math.floor(litersAfterLoss/0.5);
  var perBottle=bottles750?(totalCost/bottles750):0;
  var perBottle500=bottles500?(totalCost/bottles500):0;
  // Optional packaging add-on per bottle (bottle + cheapest tracked closure)
  var p750s=firstPricedSupplyByType('bottle750'),p500s=firstPricedSupplyByType('bottle500');
  var corkS=firstPricedSupplyByType('cork'),capS=firstPricedSupplyByType('crowncap');
  var closureP=Math.min(corkS?parseFloat(corkS.pricePerUnit):Infinity,capS?parseFloat(capS.pricePerUnit):Infinity);
  if(!isFinite(closureP))closureP=0;
  var pack750=(p750s?parseFloat(p750s.pricePerUnit):0)+closureP;
  var pack500=(p500s?parseFloat(p500s.pricePerUnit):0)+closureP;
  if(!honeyPrice){
    return'<div class="info-box" id="scale-cost-estimate" style="border-left-color:var(--text3);margin-bottom:16px"><div style="font-size:13px;color:var(--text3);font-style:italic">💡 Set your honey price per kg in <a href="#view=settings" onclick="event.preventDefault();showView(\'settings\')" style="color:var(--gold2)">Settings → Costs &amp; Supplies</a> to see brew-cost estimates for this recipe. Add per-unit prices to <a href="#view=supplies" onclick="event.preventDefault();showView(\'supplies\')" style="color:var(--gold2)">Supplies</a> for a more precise estimate.</div></div>';
  }
  return'<div class="card" id="scale-cost-estimate" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 BREW COST ESTIMATE</div></div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:10px">For '+scaleVol+'L at OG '+r.ogTarget+'. Adjust the SCALE slider above to recalculate.</div>'
    +'<table style="width:100%;font-size:12.5px;border-collapse:collapse">'
    +'<tr><td style="color:var(--text2);padding:4px 0">Honey · '+honeyKg.toFixed(2)+' kg @ '+currency+honeyPrice.toFixed(2)+'/kg</td><td style="text-align:right;font-family:var(--font-mono);color:var(--gold2)">'+currency+honeyCost.toFixed(2)+'</td></tr>'
    +'<tr><td style="color:var(--text2);padding:4px 0">Yeast · 1 packet <span style="color:var(--text3);font-size:10px;font-style:italic">('+yeastSourceLabel+')</span></td><td style="text-align:right;font-family:var(--font-mono);color:var(--gold2)">'+currency+yeastCost.toFixed(2)+'</td></tr>'
    +'<tr><td style="color:var(--text2);padding:4px 0">Nutrient · 1 sachet <span style="color:var(--text3);font-size:10px;font-style:italic">('+nutrientSourceLabel+')</span></td><td style="text-align:right;font-family:var(--font-mono);color:var(--gold2)">'+currency+nutrientCost.toFixed(2)+'</td></tr>'
    +(extrasCost?'<tr><td style="color:var(--text2);padding:4px 0">Extras · '+extrasNote+'</td><td style="text-align:right;font-family:var(--font-mono);color:var(--gold2)">'+currency+extrasCost.toFixed(2)+'</td></tr>':'')
    +'<tr style="border-top:1px solid var(--border)"><td style="padding:8px 0 4px;font-weight:600;color:var(--text)">Total batch cost</td><td style="text-align:right;font-family:var(--font-mono);font-size:14px;font-weight:600;color:var(--gold)">'+currency+totalCost.toFixed(2)+'</td></tr>'
    +'<tr><td style="padding:0 0 4px;color:var(--text3);font-size:11px">'+bottles750+' × 750ml after racking</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text)">'+currency+perBottle.toFixed(2)+'/bottle'+(pack750>0?' <span style="color:var(--text3);font-size:10px">+'+currency+pack750.toFixed(2)+' pkg</span>':'')+'</td></tr>'
    +'<tr><td style="padding:0 0 4px;color:var(--text3);font-size:11px">'+bottles500+' × 500ml after racking</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text)">'+currency+perBottle500.toFixed(2)+'/bottle'+(pack500>0?' <span style="color:var(--text3);font-size:10px">+'+currency+pack500.toFixed(2)+' pkg</span>':'')+'</td></tr>'
    +'</table>'
    +(!yeastSupply||!nutrientSupply?'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic">💡 Add per-unit prices to <a href="#view=supplies" onclick="event.preventDefault();showView(\'supplies\')" style="color:var(--gold2)">your supplies</a> to replace estimates with actual costs.</div>':'')
    +(extrasCost?'<div style="margin-top:4px;font-size:11px;color:var(--text3);font-style:italic">Extras are heuristic estimates — your actual cost depends on fruit/spice sourcing.</div>':'')
    +'</div>';
}

function renderRecipeDetail(){
  var r=APP.recipes.find(function(x){return x.id===currentRecipeId;});
  if(!r)return renderRecipes();
  // Clamp to the new wider scale range (1-20L). If the stored scale is way
  // outside this window (e.g., schema migration leftover), reset to base.
  if(window.recipeScaleVol==null||window.recipeScaleVol<1||window.recipeScaleVol>20)window.recipeScaleVol=r.volume;
  var scaleVol=window.recipeScaleVol;
  if(window.recipeScaleUnit==null)window.recipeScaleUnit=currentUnitSystem();
  var ru=window.recipeScaleUnit;
  var sCfg=recipeSliderConfig(ru);
  var sVal=(ru==='metric'?scaleVol:(scaleVol/UNIT_VOL[ru].toSI));   // slider value in display unit
  var scaleUnitBtns=['metric','us','imperial'].map(function(s){
    var lbl={metric:'Metric · L',us:'US · gal',imperial:'Imp · gal'}[s],on=(s===window.recipeScaleUnit);
    return'<button type="button" id="rsu-'+s+'" onclick="setRecipeScaleUnit(\''+s+'\')" style="flex:1;padding:6px 4px;border-radius:var(--radius);cursor:pointer;font-family:var(--font-mono);font-size:10px;letter-spacing:0.3px;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+';color:'+(on?'var(--gold2)':'var(--text3)')+'">'+lbl+'</button>';
  }).join('');
  var scaledIngredients=scaleRecipeIngredients(r,scaleVol);
  // Build helper text that names the user's largest vessel + safe max, so the
  // guidance is correct whether they have 5L demijohns or 15L primaries.
  var fermInfo=getLargestFermenterInfo();
  var scaleHelp;
  if(fermInfo){
    scaleHelp='Original: '+fmtRecipeScale(r.volume)+'. Drag to scale ingredients proportionally — recommended max ~'+fmtRecipeScale(fermInfo.safeMax)+' for safe primary headspace in your largest vessel ('+escHtml(fermInfo.vesselName)+', '+fmtRecipeScale(fermInfo.capacity)+').';
  }else{
    scaleHelp='Original: '+fmtRecipeScale(r.volume)+'. Drag to scale ingredients proportionally. Configure a fermenter in Settings to get vessel-specific headspace guidance.';
  }
  // Initial warning state matches the live updateRecipeScale logic
  var initialWarning='';
  if(fermInfo&&scaleVol>fermInfo.capacity){
    initialWarning='<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ '+fmtRecipeScale(scaleVol)+' exceeds your largest vessel capacity ('+escHtml(fermInfo.vesselName)+', '+fmtRecipeScale(fermInfo.capacity)+')</div>';
  }else if(fermInfo&&scaleVol>fermInfo.safeMax){
    initialWarning='<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ Above '+fmtRecipeScale(fermInfo.safeMax)+' risks blow-off in your largest vessel ('+escHtml(fermInfo.vesselName)+', '+fmtRecipeScale(fermInfo.capacity)+')</div>';
  }
  return'<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" onclick="showView(\'recipes\')">← Recipes</button>'
    +'<div class="page-title" style="margin-bottom:0;color:'+r.brandColor+'">'+escHtml(r.name)+'</div>'
    +'<div style="margin-left:auto;display:flex;gap:6px">'
    +'<button class="btn btn-secondary btn-sm" onclick="openLabelStudio(\''+r.id+'\')" title="Design a custom front &amp; back bottle label">🎨 Label Studio</button>'
    +(r.isCustom?'<button class="btn btn-secondary btn-sm" onclick="openCustomRecipeModal(\''+r.id+'\')">✏ Edit</button>':'<button class="btn btn-secondary btn-sm" onclick="openCustomRecipeModal(\''+r.id+'\')" title="Save a copy as your own custom recipe">⑂ Fork</button>')
    +(r.isCustom?'<button class="btn btn-danger btn-sm" onclick="deleteCustomRecipe(\''+r.id+'\')" title="Delete this recipe permanently">🗑 Delete</button>':'')
    +'</div></div>'
    +'<div class="brand-bar" style="background:'+r.brandColor+'"></div>'
    +'<div class="page-subtitle">'+r.style+' · '+r.difficulty+' · ~'+r.abvTarget+'% ABV · '+r.fermentDays+'-day fermentation</div>'
    +'<div class="info-box" style="border-left-color:'+r.brandColor+';margin-bottom:16px"><div style="font-size:14px;color:var(--text2);font-style:italic;line-height:1.6">'+escHtml(r.description)+'</div></div>'
    +(function(){
      // Cross-links between tied recipes (e.g. fruit-in-primary vs fruit-in-secondary).
      if(!Array.isArray(r.linked)||!r.linked.length)return'';
      var chips=r.linked.map(function(lk){
        var lr=APP.recipes.find(function(x){return x.id===lk.id;});
        if(!lr)return'';
        return'<span onclick="currentRecipeId=\''+lr.id+'\';showView(\'recipe-detail\')" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;background:var(--bg3);border:1px solid '+lr.brandColor+'99;color:var(--text);padding:5px 11px;border-radius:14px">↔ '+escHtml(proseL(lr.name))+(lk.label?' · <span style="color:var(--text3)">'+escHtml(proseL(lk.label))+'</span>':'')+'</span>';
      }).join('');
      if(!chips)return'';
      return'<div class="info-box" style="border-left-color:var(--gold);margin-bottom:16px">'
        +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);margin-bottom:7px">RELATED VERSION'+(r.linked.length>1?'S':'')+'</div>'
        +(r.linkedNote?'<div style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:10px">'+escHtml(r.linkedNote)+'</div>':'')
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'+chips+'</div></div>';
    }())
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px"><button class="btn btn-primary" id="scale-brew-btn" onclick="openNewBatchModal(\''+r.id+'\','+scaleVol+')">Brew This Recipe ('+fmtRecipeScale(scaleVol)+') →</button>'
    +'<button class="btn btn-secondary" onclick="openPlanBatchModal(null,\''+r.id+'\',window.recipeScaleVol||'+scaleVol+')" title="Queue this recipe into the Brew Plan and shopping list at the current scale">🗓 Plan a Batch</button>'
    +'<button class="btn btn-secondary" onclick="openBrewSessionPlanner(\''+r.id+'\','+scaleVol+')" title="Print a pre-brew checklist for this recipe">📋 Brew Session Planner</button>'
    +'<button class="btn btn-secondary" onclick="exportRecipeBeerXML(\''+r.id+'\')" title="Export as BeerXML">⬆ BeerXML</button>'
    +'<button class="btn btn-secondary" onclick="exportRecipePDF(\''+r.id+'\')" title="Export this recipe as a print-ready PDF">📄 Export PDF</button>'
    +'</div>'
    +'<div class="recipe-layout">'
    +'<div class="ra-scale"><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">SCALE</div></div>'
    +'<div style="font-size:13px;color:var(--text3);margin-bottom:10px">'+scaleHelp+'</div>'
    +'<div class="scale-slider"><input type="range" id="scale-slider" min="'+sCfg.min+'" max="'+sCfg.max+'" step="'+sCfg.step+'" value="'+sVal+'" oninput="updateRecipeScale(\''+r.id+'\',this.value)"><span class="scale-val" id="scale-slider-val">'+fmtRecipeScale(scaleVol)+'</span></div>'
    +'<div style="display:flex;gap:6px;margin-top:8px">'+scaleUnitBtns+'</div>'
    +'<div id="scale-warning">'+initialWarning+'</div>'
    +'</div>'
    +(typeof renderRecipeConfigurator==='function'?renderRecipeConfigurator(r):'')
    +'</div>'
    +'<div class="ra-ingredients"><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">INGREDIENTS</div></div><table class="data-table" id="scale-ingredients-table">'
    +scaledIngredients.map(function(ing){return'<tr><td style="color:var(--text)">'+escHtml(ing.item)+'</td><td style="font-family:var(--font-mono);font-size:12px;color:'+r.brandColor+'">'+escHtml(ing.amount)+'</td><td style="color:var(--text3);font-style:italic;font-size:12px">'+escHtml(ing.notes)+'</td></tr>';}).join('')
    +'</table></div></div>'
    +'<div class="ra-honey">'+(function(){
      // Auto-detect honey types in this recipe and surface suppliers from
      // the user's own rolodex (Suppliers view) tagged with those types.
      if(typeof honeyTypesInRecipe!=='function'||typeof suppliersForHoney!=='function')return'';
      var types=honeyTypesInRecipe(r);
      // Build a compact list of (honeyType → suppliers) blocks. Skip types
      // the user has no tagged supplier for, so the card stays focused.
      var blocks=types.map(function(t){
        var sup=suppliersForHoney(t);
        if(!sup||!sup.length)return null;
        var prof=HONEY_PROFILES[t];
        var color=prof?prof.color:r.brandColor;
        return'<div style="padding:10px 12px;background:var(--bg);border-radius:var(--radius);border-left:3px solid '+color+'">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;flex-wrap:wrap">'
            +'<div style="font-family:var(--font-display);font-size:13px;color:'+color+';cursor:pointer" onclick="currentHoneyName=\''+t+'\';showView(\'honey-detail\')">'+escHtml(t)+' Honey · open library →</div>'
          +'</div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
          +sup.map(function(s){
            var inner='<span style="color:var(--gold2);font-family:var(--font-mono);font-size:9px;letter-spacing:0.5px">'+escHtml((s.type||'shop').toUpperCase())+'</span>'
              +'<span style="color:var(--text2)">'+escHtml(s.name)+'</span>'
              +'<span style="color:'+color+'">→</span>';
            return s.url
              ?'<a href="'+escHtml(s.url)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:12px;font-size:11px;text-decoration:none">'+inner+'</a>'
              :'<span onclick="showView(\'suppliers\')" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:12px;font-size:11px;cursor:pointer">'+inner+'</span>';
          }).join('')
          +'</div></div>';
      }).filter(function(x){return x;});

      // Honey-fit guide — EVERY library honey rated for this recipe, so the
      // brewer can tell at a glance whether the jar they own is a great fit, a
      // workable swap, or a clash, and what it would do to the result.
      var ideal=recipeHoneyIdeal(r);
      var fitList=honeyFitListForRecipe(r);
      // Render nothing only if there's truly nothing to show.
      if(!blocks.length&&!fitList.length)return'';
      var supplierSection=blocks.length
        ?'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px;font-family:var(--font-mono);letter-spacing:1px">PRIMARY HONEYS · WHERE TO SOURCE</div>'
          +'<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+blocks.join('')+'</div>'
        :'';
      var bucketLabels={primary:'THE RECIPE’S HONEY',recommended:'RECOMMENDED SWAPS',great:'GOOD FITS',good:'GOOD FITS',workable:'WORKABLE — EXPECT A SHIFT',poor:'FIGHTS THE STYLE',varies:'VARIES BY SOURCE'};
      var lastBucket='';
      var fitRows=fitList.map(function(f){
        var bl=bucketLabels[f.tier]||'';
        var header='';
        if(bl!==lastBucket){lastBucket=bl;
          header='<div class="hf-head" style="font-size:10px;color:var(--text3);letter-spacing:1.5px;font-family:var(--font-mono);margin:12px 0 6px">'+bl+'</div>';
        }
        var stock=f.inStock
          ?'<span style="font-family:var(--font-mono);font-size:9px;color:var(--bg);background:var(--green2);letter-spacing:0.5px;padding:2px 7px;border-radius:8px;font-weight:600">IN STOCK</span>':'';
        var rowBg=f.inStock?'rgba(122,160,64,0.10)':'rgba(0,0,0,0.18)';
        var rowBorder=f.inStock?'var(--green2)':f.color2;
        return header
          +'<div style="padding:9px 11px;background:'+rowBg+';border-radius:var(--radius);border-left:3px solid '+rowBorder+';margin-bottom:7px">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;flex-wrap:wrap">'
          +'<div style="font-family:var(--font-display);font-size:13px;color:'+f.color2+';cursor:pointer" onclick="currentHoneyName=\''+f.honey+'\';showView(\'honey-detail\')">'+escHtml(proseL(f.honey))+' →</div>'
          +'<div style="display:flex;align-items:center;gap:6px">'+stock
          +'<span style="font-family:var(--font-mono);font-size:9px;color:'+f.color+';letter-spacing:0.5px">'+escHtml(f.badge)+'</span></div>'
          +'</div>'
          +'<div style="font-size:12px;color:var(--text2);line-height:1.5;font-style:italic">'+escHtml(f.note)+'</div>'
          +'</div>';
      }).join('');
      var fitSection=fitList.length
        ?'<div style="font-size:12.5px;color:var(--text3);margin-bottom:6px;font-family:var(--font-mono);letter-spacing:1px">EVERY HONEY · HOW EACH ONE FITS</div>'
          +(function(){var _nl=(typeof appLang==='function'&&appLang()==='nl');var IL={'a bold, robust honey':'een krachtige, robuuste honing','a light, delicate honey':'een lichte, delicate honing','a light honey that lets the fruit lead':'een lichte honing die het fruit laat leiden','a medium honey (bold honeys also work)':'een medium honing (krachtige honingen werken ook)','a medium-bodied honey':'een honing met medium body'};var lbl=escHtml(_nl?(IL[ideal.label]||ideal.label):ideal.label);
            return _nl
            ?'<div style="font-size:11.5px;color:var(--text3);font-style:italic;margin-bottom:4px;line-height:1.5">Dit recept wil '+lbl+'. Elke honing in de bibliotheek is ervoor beoordeeld — <span style="color:var(--green2)">groen</span> past, <span style="color:var(--gold)">amber</span> werkt met een verschuiving, <span style="color:var(--red2)">rood</span> botst met de stijl. Honingen die je op voorraad hebt, zijn gemarkeerd en bovenaan hun categorie vastgezet.</div>'
            :'<div style="font-size:11.5px;color:var(--text3);font-style:italic;margin-bottom:4px;line-height:1.5">This recipe wants '+lbl+'. Each honey in the library is rated for it — <span style="color:var(--green2)">green</span> fits, <span style="color:var(--gold)">amber</span> works with a shift, <span style="color:var(--red2)">red</span> fights the style. Honeys you have in stock are highlighted and pinned to the top of their tier.</div>';})()
          +'<div class="honey-fit-grid">'+fitRows+'</div>'
        :'';
      return'<div class="card" style="margin-bottom:16px;border-left:3px solid var(--gold)"><div class="card-header"><div class="card-title">🛒 SOURCE YOUR HONEY</div></div>'
        +supplierSection
        +fitSection
        +'</div>';
    }())+'</div>'
    +'<div class="ra-yeast">'+renderRecipeYeastBlock(r)+'</div>'
    +'<div class="ra-nutrient">'+renderRecipeNutrientBlock(r)+'</div>'
    +'<div class="ra-dial">'+renderRecipeComboBlock(r)+'</div>'
    +'<div class="ra-fruit">'+renderRecipeAdjunctBlock(r)+'</div>'
    +'<div class="ra-extra">'+renderRecipeSuccessTracker(r)
    +(r.notes?'<div class="info-box" style="border-left-color:'+r.brandColor+'"><div style="font-size:13px;color:var(--text2);font-style:italic">'+escHtml(r.notes)+'</div></div>':'')
    +'</div>'
    +'<div class="ra-targets"><div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">TARGETS</div></div>'
    +'<div class="grid-3" id="recipe-targets-live">'+((typeof recipeConfigTargetsHtml==='function')?recipeConfigTargetsHtml(r,scaleVol,ensureRecipeConfig(r)):'')+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
    +r.tags.map(function(t){return'<span class="recipe-tag">'+escHtml(t)+'</span>';}).join('')
    +'</div></div></div>'
    +'<div class="ra-cost">'+renderRecipeCostEstimate(r,scaleVol)+'</div>'
    +'<div class="ra-steps"><div class="card"><div class="card-header"><div class="card-title">STEP BY STEP</div></div>'
    +'<div class="timeline">'
    +(function(){
      var dsteps=injectCareSteps(r.steps);
      return dsteps.map(function(s){return'<div class="tl-item"><div class="tl-dot future"></div><div class="tl-day">Day '+s.day+'</div><div class="tl-title">'+escHtml(s.title)+'</div><div class="tl-desc">'+escHtml(annotateNutrientDesc(s.desc))+'</div></div>';}).join('')
        +sugarBreakNote(dsteps);
    }())
    +'</div></div></div></div>';
}

// Brew-session planner — opens a print-ready pre-brew checklist for a recipe
// at a given volume. Pulls ingredient quantities (scaled), expected equipment,
// estimated active time, and pre-flight sanitation steps onto one page so you
// can print it and have everything beside the brewing surface.
function openBrewSessionPlanner(recipeId,volume){
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
  if(!r){toast('⚠ Recipe not found');return;}
  var vol=parseFloat(volume)||r.volume||5;
  var scaleFactor=vol/(r.volume||5);
  var brandName=APP.settings.brewerName||'MeadOS';

  // Scale ingredient amounts. The amounts in r.ingredients are free-text strings
  // ("1.5 kg", "5 L water", "10g M05") so we use a regex to find leading numbers
  // and scale them. Anything we can't parse gets left as-is with a hint.
  function scaleAmount(amountStr){
    if(!amountStr)return amountStr;
    var m=/^(\d+(?:\.\d+)?)\s*(.*)$/.exec(amountStr);
    if(!m)return amountStr;
    var num=parseFloat(m[1]);
    var unit=m[2];
    var scaled=(num*scaleFactor).toFixed(num<10?2:1).replace(/\.?0+$/,'');
    return scaled+(unit?' '+unit:'');
  }

  var ingRows=(r.ingredients||[]).map(function(ing){
    var scaledAmt=scaleAmount(ing.amount);
    var origNote=scaledAmt!==ing.amount?'<span style="color:#999;font-size:10px;margin-left:6px">(orig: '+escHtml(ing.amount)+')</span>':'';
    return'<tr><td style="padding:8px 12px 8px 0"><input type="checkbox" style="width:16px;height:16px"></td>'
      +'<td style="padding:8px 12px;font-family:Cinzel,serif;font-size:13px;font-weight:600">'+escHtml(ing.item)+'</td>'
      +'<td style="padding:8px 12px;font-family:monospace;font-size:13px;color:#5a3a20">'+escHtml(scaledAmt)+origNote+'</td>'
      +'<td style="padding:8px 12px;font-style:italic;color:#666;font-size:11px">'+escHtml(ing.notes||'')+'</td></tr>';
  }).join('');

  var preflightItems=[
    {label:'9 L primary fermenter — sanitized',detail:'Chemipro OXI clean → rinse → '+getSanitizer().name+' (no-rinse, '+getSanitizer().mlPerL+' ml/L)'},
    {label:'Airlock + grommet — sanitized + airlock filled',detail:'Water or vodka to the line'},
    {label:'Long stirring spoon (60 cm stainless) — sanitized',detail:'For aeration + nutrient stirring'},
    {label:'Hydrometer + trial jar — sanitized',detail:'Take OG before pitching'},
    {label:'Thermometer ready',detail:'Cool must to ≤30°C before pitching'},
    {label:'Yeast (M05 by default) — out of fridge to warm',detail:'Pull 30 min before pitch, sprinkle on must surface'},
    {label:'Mead Yeast Nutrient / Fermaid measured',detail:'Day 1 dose ready in a small sanitized cup'},
    {label:'Honey weighed and at room temp',detail:'Cold honey dissolves slowly'},
    {label:'Water filtered / dechlorinated',detail:'Tap water needs Campden 12+h or filtering'},
    {label:'Workspace cleared and wiped down',detail:'Spills are mead\'s natural habitat — minimize them'}
  ];

  var prefRows=preflightItems.map(function(it){
    return'<tr><td style="padding:8px 12px 8px 0;vertical-align:top"><input type="checkbox" style="width:16px;height:16px"></td>'
      +'<td style="padding:8px 12px;font-family:Cinzel,serif;font-size:12.5px;font-weight:600">'+escHtml(it.label)+'</td>'
      +'<td style="padding:8px 12px;font-style:italic;color:#666;font-size:11px;line-height:1.5">'+escHtml(it.detail)+'</td></tr>';
  }).join('');

  var w=window.open('','_blank','width=900,height=900');
  if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Brew Session — '+escHtml(r.name)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:24px;font-family:Inter,sans-serif;background:#faf3e0;color:#1a0f08;max-width:820px;margin:0 auto}'
    +'h1{font-family:Cinzel,serif;font-size:28px;margin:0 0 4px;color:'+(r.brandColor||'#c9a84c')+'}'
    +'h2{font-family:Cinzel,serif;font-size:16px;margin:24px 0 8px;color:#5a3a20;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--gold);padding-bottom:4px}'
    +'.meta{font-size:13px;color:#666;margin-bottom:18px}'
    +'.brand{font-family:Cinzel,serif;font-size:12px;color:#8a6a30;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:14px}'
    +'tr{border-bottom:1px solid #e8d8a8}'
    +'.notes-box{border:1px solid var(--gold);padding:14px;margin-top:24px;min-height:80px;font-size:12px;color:#888;border-radius:4px}'
    +'.btns{margin-bottom:14px}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'@page{size:A4 portrait;margin:14mm}'
    +'@media print{.no-print{display:none}body{background:#fff;padding:0}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +'<div class="brand">'+escHtml(brandName)+'</div>'
    +'<h1>'+escHtml(r.name)+'</h1>'
    +'<div class="meta">Brew session planner · Target batch: '+vol+' L · Style: '+escHtml(r.style||'')+' · Difficulty: '+escHtml(r.difficulty||'')+' · Target OG: '+(r.ogTarget||'?')+' · Est. ABV: '+(((r.ogTarget||1.095)-(r.fgTarget||1.000))*131.25).toFixed(1)+'%</div>'
    +'<h2>Pre-flight</h2>'
    +'<table>'+prefRows+'</table>'
    +'<h2>Ingredients (scaled to '+vol+' L)</h2>'
    +'<table>'+ingRows+'</table>'
    +'<h2>Brew-day procedure</h2>'
    +'<table>'+(r.steps||[]).filter(function(s){return s.day===0;}).map(function(s){
      return'<tr><td style="padding:8px 12px 8px 0;vertical-align:top"><input type="checkbox" style="width:16px;height:16px"></td>'
        +'<td style="padding:8px 12px;font-size:12.5px;line-height:1.6">'+escHtml(stepDescL(s.desc))+'</td></tr>';
    }).join('')+'</table>'
    +'<h2>Session notes</h2>'
    +'<div class="notes-box">Actual OG, time started, anything unusual…</div>'
    +'</body></html>');
  w.document.close();
}

// Recipe Success Tracker — once you've brewed a recipe 2+ times, surfaces
// your personal track record with it: avg ABV achieved vs target, avg days
// to bottle, avg tasting rating, avg cost per bottle. Empty for recipes you
// haven't brewed yet (or only brewed once).
function renderRecipeSuccessTracker(recipe){
  if(!recipe||!APP.batches)return'';
  var brewed=APP.batches.filter(function(b){return b.recipeId===recipe.id;});
  if(brewed.length<2)return''; // single brew is just one data point; wait for a track record

  var bottledRuns=brewed.filter(function(b){return APP.bottling[b.id];});
  var abvSum=0,abvCount=0;
  var daysToBottleSum=0,daysToBottleCount=0;
  var ratingSum=0,ratingCount=0;
  var costPerBottleSum=0,costPerBottleCount=0;

  bottledRuns.forEach(function(b){
    var bot=APP.bottling[b.id];
    if(bot.abv){abvSum+=parseFloat(bot.abv);abvCount++;}
    if(b.startDate&&bot.date){
      var d=Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000);
      if(d>0){daysToBottleSum+=d;daysToBottleCount++;}
    }
    var tastings=APP.tastings[b.id]||[];
    var rated=tastings.filter(function(t){return t.rating;});
    if(rated.length){
      var avg=rated.reduce(function(s,t){return s+t.rating;},0)/rated.length;
      ratingSum+=avg;ratingCount++;
    }
    if(b.cost){
      var totalCost=(b.cost.honey||0)+(b.cost.extras||0);
      var bottleCount=(typeof bottlesOriginal==='function')?bottlesOriginal(bot):(bot.bottleCount||0);
      if(totalCost>0&&bottleCount>0){
        costPerBottleSum+=totalCost/bottleCount;
        costPerBottleCount++;
      }
    }
  });

  var avgABV=abvCount?(abvSum/abvCount):null;
  var avgDays=daysToBottleCount?Math.round(daysToBottleSum/daysToBottleCount):null;
  var avgRating=ratingCount?(ratingSum/ratingCount):null;
  var avgCostPerBottle=costPerBottleCount?(costPerBottleSum/costPerBottleCount):null;
  var ccy=APP.settings.currency||'€';
  var targetABV=recipe.ogTarget?((recipe.ogTarget-(recipe.fgTarget||1.000))*131.25):null;

  var stats=[];
  if(avgABV!=null){
    var delta=targetABV!=null?(avgABV-targetABV):null;
    var deltaLabel=delta!=null?(' <span style="color:'+(Math.abs(delta)<0.5?'var(--green2)':delta>0?'var(--gold2)':'var(--red2)')+';font-size:10px">'+(delta>=0?'+':'')+delta.toFixed(1)+' vs target</span>'):'';
    stats.push({label:'Avg ABV achieved',value:avgABV.toFixed(1)+'%'+deltaLabel});
  }
  if(avgDays!=null)stats.push({label:'Avg days to bottle',value:avgDays+' days'});
  if(avgRating!=null){
    var stars='★'.repeat(Math.round(avgRating))+'<span style="color:var(--bg4)">'+'★'.repeat(5-Math.round(avgRating))+'</span>';
    stats.push({label:'Avg tasting rating',value:stars+' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+avgRating.toFixed(1)+'</span>'});
  }
  if(avgCostPerBottle!=null)stats.push({label:'Avg cost per bottle',value:ccy+avgCostPerBottle.toFixed(2)});

  if(!stats.length){
    // Brewed multiple times but no completion data yet (all still active)
    return'<div class="info-box" style="margin-top:12px;border-left-color:var(--text3)"><div style="font-size:12.5px;color:var(--text3);font-style:italic">📊 You\'ve brewed this recipe '+brewed.length+' times — no bottling/tasting data yet to summarize.</div></div>';
  }

  var rows=stats.map(function(s){
    return'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1px">'+s.label.toUpperCase()+'</div><div style="font-size:14px;color:var(--text);font-family:var(--font-display)">'+s.value+'</div></div>';
  }).join('');

  return'<div class="card" style="margin-top:16px;border-left:3px solid '+recipe.brandColor+'"><div class="card-header"><div class="card-title">📊 YOUR HISTORY WITH THIS RECIPE</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+brewed.length+' BREWS · '+bottledRuns.length+' BOTTLED</div></div>'
    +rows
    +'</div>';
}

// ==================== CALENDAR ====================
function renderCalendar(){
  // Persist viewed month across re-renders. window._calOffset is months from current.
  if(window._calOffset==null)window._calOffset=0;
  var now=new Date();
  var year=now.getFullYear(),month=now.getMonth()+window._calOffset;
  // JS Date handles negative/>11 months
  var viewDate=new Date(year,month,1);
  year=viewDate.getFullYear();
  month=viewDate.getMonth();
  var firstDay=new Date(year,month,1).getDay(),daysInMonth=new Date(year,month+1,0).getDate();
  var monthName=viewDate.toLocaleDateString(_dloc(),{month:'long',year:'numeric'});
  var events={};
  APP.batches.forEach(function(b){
    if(getBatchStatus(b)==='complete'||getBatchStatus(b)==='bottled'||getBatchStatus(b)==='failed')return;
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    if(!recipe)return;
    var color=getBatchColor(b);
    (typeof getEffectiveSteps==='function'?getEffectiveSteps(b,recipe):recipe.steps).forEach(function(s){
      var d=addDays(b.startDate,s.day);
      if(!events[d])events[d]=[];
      events[d].push({name:b.name,title:s.title,desc:s.desc,color:color,batchId:b.id,day:s.day});
    });
  });
  // Also include bottling-window markers from bottled batches' aging schedules? Skip — too many.
  var cells=[],startPad=(firstDay+6)%7;
  for(var i=0;i<startPad;i++)cells.push({day:null});
  for(var dd=1;dd<=daysInMonth;dd++){
    var ds=year+'-'+String(month+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
    cells.push({day:dd,dateStr:ds,events:events[ds]||[],isToday:ds===today()});
  }
  var calCells=cells.map(function(c){
    if(!c.day)return'<div class="cal-day other-month"></div>';
    var evHtml=(c.events||[]).slice(0,2).map(function(e){return'<div class="cal-event" style="background:'+e.color+'22;color:'+e.color+';border:1px solid '+e.color+'44" title="'+escHtml(e.name)+': '+escHtml(e.title)+'">'+escHtml(e.title.substring(0,12))+'</div>';}).join('');
    var clickHandler=c.events&&c.events.length?'onclick="showCalDayModal(\''+c.dateStr+'\')"':'';
    return'<div class="cal-day '+(c.isToday?'today':'')+' '+(c.events&&c.events.length?'has-event':'')+'" '+clickHandler+' style="'+(c.events&&c.events.length?'cursor:pointer':'')+'">'
      +'<div>'+c.day+'</div>'+evHtml
      +(c.events&&c.events.length>2?'<div style="font-size:9px;color:var(--text3)">+'+(c.events.length-2)+' more</div>':'')+'</div>';
  }).join('');
  // Upcoming: from today forward — independent of the viewed month
  var upcoming=Object.entries(events).filter(function(x){return x[0]>=today();}).sort(function(a,b){return a[0].localeCompare(b[0]);}).slice(0,8);
  var navHeader='<div class="card-header" style="display:flex;align-items:center;justify-content:space-between"><button class="btn btn-secondary btn-sm" onclick="navCalMonth(-1)" title="Previous month">←</button>'
    +'<div class="card-title" style="text-align:center;flex:1">'+monthName.toUpperCase()+(window._calOffset!==0?' <button class="btn-icon" onclick="navCalToToday()" title="Jump to current month" style="font-size:11px;color:var(--text3);margin-left:6px;padding:0 6px">↺ today</button>':'')+'</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="navCalMonth(1)" title="Next month">→</button></div>';
  return'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px"><div class="page-title" style="margin-bottom:0">Calendar</div><button class="btn btn-secondary btn-sm" onclick="exportCalendarICS()" title="Download .ics file to subscribe in Google/Apple Calendar">📅 Export to Calendar (.ics)</button></div><div class="page-subtitle">Brewing Schedule &amp; Upcoming Steps</div>'
    +'<div class="grid-2">'
    +'<div class="card">'+navHeader
    +'<div class="cal-header">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d){return'<div class="cal-dh">'+d+'</div>';}).join('')+'</div>'
    +'<div class="cal-grid">'+calCells+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:8px;font-style:italic">Tap a day to see its full schedule.</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">UPCOMING EVENTS</div></div>'
    +(upcoming.length?upcoming.map(function(x){
      return'<div style="padding:10px 0;border-bottom:1px solid var(--border)">'
        +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:6px">'+fmtDate(x[0])+(x[0]===today()?' · <span style="color:var(--gold)">TODAY</span>':'')+'</div>'
        +x[1].map(function(e){return'<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><div style="width:6px;height:6px;border-radius:50%;background:'+e.color+';flex-shrink:0"></div><span style="font-size:13px;color:var(--text2)">'+escHtml(e.name)+'</span><span style="font-size:12px;color:var(--text3)">→ '+escHtml(e.title)+'</span></div>';}).join('')
        +'</div>';
    }).join(''):'<p style="color:var(--text3);font-style:italic;font-size:13px;padding:16px 0">No upcoming events.</p>')
    +'</div></div>';
}

// Month navigation — preserve current view by just re-rendering the calendar route
function navCalMonth(delta){
  if(window._calOffset==null)window._calOffset=0;
  window._calOffset+=delta;
  renderMain();
}
function navCalToToday(){
  window._calOffset=0;
  renderMain();
}

// Day-detail modal — show every step scheduled for a date with full descriptions
function showCalDayModal(dateStr){
  var items=[];
  APP.batches.forEach(function(b){
    if(getBatchStatus(b)==='complete'||getBatchStatus(b)==='bottled'||getBatchStatus(b)==='failed')return;
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    if(!recipe)return;
    var color=getBatchColor(b);
    (typeof getEffectiveSteps==='function'?getEffectiveSteps(b,recipe):recipe.steps).forEach(function(s){
      var d=addDays(b.startDate,s.day);
      if(d===dateStr)items.push({batch:b,recipe:recipe,step:s,color:color});
    });
  });
  var existing=document.querySelector('.modal-overlay');
  if(existing)existing.remove();
  var rows=items.length?items.map(function(it){
    return'<div style="padding:14px;border-left:3px solid '+it.color+';background:var(--bg3);border-radius:6px;margin-bottom:10px;cursor:pointer" onclick="closeModal();showView(\'batch\',\''+it.batch.id+'\')">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-family:var(--font-display);font-size:15px;color:'+it.color+'">'+escHtml(it.batch.name)+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px">DAY '+it.step.day+'</div></div>'
      +'<div style="font-size:14px;color:var(--gold2);margin-bottom:4px;font-weight:500">'+escHtml(it.step.title)+'</div>'
      +'<div style="font-size:12.5px;color:var(--text2);font-style:italic;line-height:1.5">'+escHtml(it.step.desc||'')+'</div>'
      +'</div>';
  }).join(''):'<div style="text-align:center;color:var(--text3);font-style:italic;padding:20px">Nothing scheduled for this day.</div>';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:600px">'
    +'<div class="modal-title">📅 '+fmtDate(dateStr)+'</div>'
    +rows
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
