// ==========================================================================
// BeerXML import / export.
// Split out of the former 08-tools.js. Globals, no behaviour change.
// ==========================================================================

// ==================== BEERXML IMPORT / EXPORT ====================
// BeerXML 1.0 is the cross-app standard for recipe interchange. Supported by
// BeerSmith, Brewfather, Grainfather, etc. We map the meadows recipe model
// to BeerXML's RECIPE element, focusing on the parts that survive translation.

// Build a BeerXML <RECIPE> element string from one of our recipes.
function recipeToBeerXML(r){
  if(!r)return null;
  var vol=r.volume||5;
  var og=r.ogTarget||1.095;
  var fg=r.fgTarget||1.000;
  var abv=((og-fg)*131.25).toFixed(1);
  // Ingredients — honey is the primary fermentable. Other items go to MISCS.
  var fermentables='';
  var miscs='';
  var hops='';
  (r.ingredients||[]).forEach(function(ing){
    var amountG=parseHoneyGrams(ing.amount);
    var nameL=(ing.item||'').toLowerCase();
    if(nameL.indexOf('honey')>=0||nameL.indexOf('mel')>=0){
      var amountKg=amountG/1000;
      fermentables+='<FERMENTABLE>'
        +'<NAME>'+xmlEscape(ing.item)+'</NAME>'
        +'<VERSION>1</VERSION>'
        +'<TYPE>Sugar</TYPE>'
        +'<AMOUNT>'+amountKg.toFixed(3)+'</AMOUNT>'
        +'<YIELD>80.0</YIELD>'  // honey is ~80% fermentable
        +'<COLOR>2.0</COLOR>'
        +(ing.notes?'<NOTES>'+xmlEscape(ing.notes)+'</NOTES>':'')
        +'</FERMENTABLE>';
    }else if(nameL.indexOf('hop')>=0){
      var amountKg2=amountG/1000;
      hops+='<HOP><NAME>'+xmlEscape(ing.item)+'</NAME><VERSION>1</VERSION><AMOUNT>'+amountKg2.toFixed(4)+'</AMOUNT><USE>Aroma</USE><TIME>0</TIME></HOP>';
    }else{
      miscs+='<MISC>'
        +'<NAME>'+xmlEscape(ing.item)+'</NAME>'
        +'<VERSION>1</VERSION>'
        +'<TYPE>Other</TYPE>'
        +'<USE>Primary</USE>'
        +'<TIME>0</TIME>'
        +'<AMOUNT>'+(amountG/1000).toFixed(4)+'</AMOUNT>'
        +'<AMOUNT_IS_WEIGHT>TRUE</AMOUNT_IS_WEIGHT>'
        +(ing.notes?'<NOTES>'+xmlEscape(ing.notes)+'</NOTES>':'')
        +'</MISC>';
    }
  });

  // Yeast — pull strain name from the YEAST_STRAINS lookup if available
  var yeastObj=(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS[r.yeast])||null;
  var yeastName=(yeastObj&&yeastObj.name)||r.yeast||'Mead Yeast (M05)';
  var yeasts='<YEAST>'
    +'<NAME>'+xmlEscape(yeastName)+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<TYPE>Wine</TYPE>'
    +'<FORM>Dry</FORM>'
    +'<AMOUNT>0.010</AMOUNT>'  // typical 10g packet
    +'<AMOUNT_IS_WEIGHT>TRUE</AMOUNT_IS_WEIGHT>'
    +'<ATTENUATION>95.0</ATTENUATION>'
    +'</YEAST>';

  // Style — BeerXML expects a <STYLE> entry. Map to BJCP M-categories.
  var styleEntry='<STYLE>'
    +'<NAME>'+xmlEscape(r.style||'Mead')+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<CATEGORY>Mead</CATEGORY>'
    +'<CATEGORY_NUMBER>M</CATEGORY_NUMBER>'
    +'<STYLE_LETTER>'+xmlEscape((r.style||'M').substring(0,1))+'</STYLE_LETTER>'
    +'<STYLE_GUIDE>BJCP 2015</STYLE_GUIDE>'
    +'<TYPE>Mead</TYPE>'
    +'<OG_MIN>'+(og-0.010).toFixed(3)+'</OG_MIN>'
    +'<OG_MAX>'+(og+0.010).toFixed(3)+'</OG_MAX>'
    +'<FG_MIN>'+(fg-0.005).toFixed(3)+'</FG_MIN>'
    +'<FG_MAX>'+(fg+0.005).toFixed(3)+'</FG_MAX>'
    +'<ABV_MIN>'+(parseFloat(abv)-1).toFixed(1)+'</ABV_MIN>'
    +'<ABV_MAX>'+(parseFloat(abv)+1).toFixed(1)+'</ABV_MAX>'
    +'</STYLE>';

  // Steps → notes (BeerXML's notes field carries free text)
  var notes=(r.notes||'')
    +(r.steps&&r.steps.length?'\n\nProcedure:\n'+r.steps.map(function(s){return'Day '+s.day+' — '+s.title+': '+s.desc;}).join('\n'):'');

  var xml='<?xml version="1.0" encoding="UTF-8"?>'
    +'<RECIPES><RECIPE>'
    +'<NAME>'+xmlEscape(r.name)+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<TYPE>All Grain</TYPE>'  // BeerXML doesn't have a Mead type — All Grain is the convention
    +'<BREWER>'+xmlEscape(APP.settings.brewerName||'MeadOS')+'</BREWER>'
    +'<BATCH_SIZE>'+vol.toFixed(1)+'</BATCH_SIZE>'
    +'<BOIL_SIZE>'+vol.toFixed(1)+'</BOIL_SIZE>'
    +'<BOIL_TIME>0</BOIL_TIME>'
    +'<EFFICIENCY>100.0</EFFICIENCY>'
    +'<OG>'+og.toFixed(3)+'</OG>'
    +'<FG>'+fg.toFixed(3)+'</FG>'
    +'<EST_ABV>'+abv+'</EST_ABV>'
    +'<NOTES>'+xmlEscape(notes)+'</NOTES>'
    +'<TASTE_NOTES>'+xmlEscape(r.description||'')+'</TASTE_NOTES>'
    +styleEntry
    +(fermentables?'<FERMENTABLES>'+fermentables+'</FERMENTABLES>':'')
    +(hops?'<HOPS>'+hops+'</HOPS>':'')
    +(miscs?'<MISCS>'+miscs+'</MISCS>':'')
    +'<YEASTS>'+yeasts+'</YEASTS>'
    +'</RECIPE></RECIPES>';
  return xml;
}

// Parse honey amount strings — "1.5 kg" → 1500 g, "200 g" → 200 g, "200ml" → 200 (approximate)
function parseHoneyGrams(amountStr){
  if(!amountStr)return 0;
  var m=/^(\d+(?:\.\d+)?)\s*(\w+)?/.exec(String(amountStr));
  if(!m)return 0;
  var n=parseFloat(m[1]);
  var unit=(m[2]||'g').toLowerCase();
  if(unit.indexOf('kg')===0)return n*1000;
  if(unit.indexOf('lb')===0)return n*453.6;
  if(unit.indexOf('oz')===0)return n*28.35;
  return n; // assume grams or ml (close enough for honey)
}

// Parse a BeerXML <RECIPE> element into our recipe shape.
function beerXMLToRecipe(xmlText){
  var parser=new DOMParser();
  var doc=parser.parseFromString(xmlText,'text/xml');
  // Check for parse errors
  if(doc.querySelector('parsererror'))return null;
  var recipeEl=doc.querySelector('RECIPE');
  if(!recipeEl)return null;
  function txt(node,sel){var el=node.querySelector(sel);return el?el.textContent.trim():'';}
  function num(node,sel,d){var v=parseFloat(txt(node,sel));return isNaN(v)?d:v;}
  var name=txt(recipeEl,'NAME');
  if(!name)return null;
  var vol=num(recipeEl,'BATCH_SIZE',5);
  var og=num(recipeEl,'OG',1.095);
  var fg=num(recipeEl,'FG',1.000);
  var style=txt(recipeEl,'STYLE > NAME')||'Custom';
  var notes=txt(recipeEl,'NOTES');
  var description=txt(recipeEl,'TASTE_NOTES')||(notes.split('\n')[0]||'');

  // Ingredients — pull from fermentables (treat as honey), miscs, hops
  var ingredients=[];
  recipeEl.querySelectorAll('FERMENTABLE').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    ingredients.push({
      item:txt(f,'NAME'),
      amount:amountKg>=1?amountKg.toFixed(2)+' kg':(amountKg*1000).toFixed(0)+' g',
      notes:txt(f,'NOTES')||'fermentable'
    });
  });
  recipeEl.querySelectorAll('MISC').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    var isWeight=txt(f,'AMOUNT_IS_WEIGHT').toLowerCase()==='true';
    ingredients.push({
      item:txt(f,'NAME'),
      amount:isWeight?(amountKg>=1?amountKg.toFixed(2)+' kg':(amountKg*1000).toFixed(0)+' g'):(amountKg*1000).toFixed(0)+' ml',
      notes:txt(f,'NOTES')||txt(f,'USE')||''
    });
  });
  recipeEl.querySelectorAll('HOP').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    ingredients.push({
      item:txt(f,'NAME')+' hops',
      amount:(amountKg*1000).toFixed(1)+' g',
      notes:'hop addition · '+txt(f,'USE')
    });
  });

  // Yeast — map to our internal yeast IDs where possible
  var yeastName=txt(recipeEl,'YEAST > NAME').toLowerCase();
  var yeast='m05';
  if(yeastName.indexOf('ec-1118')>=0||yeastName.indexOf('ec1118')>=0)yeast='ec-1118';
  else if(yeastName.indexOf('71b')>=0)yeast='71b';
  else if(yeastName.indexOf('d-47')>=0||yeastName.indexOf('d47')>=0)yeast='d47';
  else if(yeastName.indexOf('k1v')>=0||yeastName.indexOf('k1-v1116')>=0)yeast='k1v';

  return{
    id:'r-imported-'+genId().slice(0,8),
    name:name,
    style:style,
    difficulty:'Intermediate',
    brandName:name,
    brandColor:'#c9a350',
    description:description||'Imported BeerXML recipe',
    volume:vol,
    ogTarget:og,
    fgTarget:fg,
    honey:null,
    honeyType:'Wildflower',
    yeast:yeast,
    nutrient:'mj-mead',
    tags:['imported','beerxml'],
    ingredients:ingredients,
    steps:[
      {day:0,title:'Day 0 — Brew',desc:'Imported recipe. Combine honey + water + nutrients per the ingredient list, pitch yeast, attach airlock. Set OG '+og.toFixed(3)+'.'},
      {day:14,title:'Day 14 — Check gravity',desc:'Target FG around '+fg.toFixed(3)+'. Take readings every few days until stable.'}
    ],
    notes:notes,
    // Imported recipes are user-owned like forks/designs — mark them so they
    // get the "MINE" badge and the Edit/Delete affordances (not just Fork).
    isCustom:true,
    // BeerXML has no mead/cider distinction — tag it with whichever mode is
    // active at import time, same convention as a freshly-authored custom recipe.
    beverageType:(typeof activeBevMode==='function')?activeBevMode():'mead'
  };
}

// Browser file picker for BeerXML import
function importBeerXMLClick(){
  var input=document.createElement('input');
  input.type='file';
  input.accept='.xml,application/xml,text/xml';
  input.style.display='none';
  input.onchange=function(e){
    var file=e.target.files&&e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var xml=ev.target.result;
        // BeerXML files can contain multiple <RECIPE> elements
        var parser=new DOMParser();
        var doc=parser.parseFromString(xml,'text/xml');
        if(doc.querySelector('parsererror')){
          toast('⚠ Invalid XML file');
          return;
        }
        var recipeEls=doc.querySelectorAll('RECIPE');
        if(!recipeEls.length){toast('⚠ No RECIPE elements found');return;}
        var imported=0;
        recipeEls.forEach(function(rEl){
          // Build a partial document just for this RECIPE so beerXMLToRecipe can use querySelector
          var wrapper='<?xml version="1.0" encoding="UTF-8"?><RECIPES>'+(new XMLSerializer()).serializeToString(rEl)+'</RECIPES>';
          var recipe=beerXMLToRecipe(wrapper);
          if(recipe){
            APP.customRecipes.push(recipe);
            imported++;
          }
        });
        if(imported){
          // Recipe list cache needs rebuilding
          APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes);
          scheduleSave();
          toast('✦ Imported '+imported+' recipe'+(imported===1?'':'s'));
          renderMain();
        }else{
          toast('⚠ Could not parse recipe(s)');
        }
      }catch(err){
        console.error(err);
        toast('⚠ Import failed: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function(){input.remove();},100);
}

function exportRecipeBeerXML(recipeId){
  var r=getRecipe(recipeId);
  if(!r){toast('⚠ Recipe not found');return;}
  var xml=recipeToBeerXML(r);
  if(!xml){toast('⚠ Could not generate XML');return;}
  var blob=new Blob([xml],{type:'application/xml;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(r.name||'recipe').replace(/[^\w-]+/g,'_')+'.beerxml.xml';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
  toast('✦ BeerXML exported');
}

function exportAllCustomRecipesBeerXML(){
  var custom=APP.customRecipes||[];
  if(!custom.length){toast('⚠ No custom recipes to export');return;}
  // Concatenate all into one <RECIPES> document
  var inner=custom.map(function(r){
    var xml=recipeToBeerXML(r);
    if(!xml)return'';
    // Strip the outer <?xml...?><RECIPES>...</RECIPES> wrap and just keep <RECIPE>...</RECIPE>
    var m=/<RECIPE>[\s\S]*<\/RECIPE>/.exec(xml);
    return m?m[0]:'';
  }).filter(Boolean).join('');
  var combined='<?xml version="1.0" encoding="UTF-8"?><RECIPES>'+inner+'</RECIPES>';
  var blob=new Blob([combined],{type:'application/xml;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='meadows_custom_recipes.beerxml.xml';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
  toast('✦ '+custom.length+' recipe'+(custom.length===1?'':'s')+' exported');
}
