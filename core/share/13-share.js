// ==========================================================================
// Public batch URL sharing + the public share view (with full i18n).
// Split out of the former 13-labels-share.js. Globals, no behaviour change.
// ==========================================================================

// ==================== PUBLIC BATCH URL SHARING ====================
// Strategy: the QR encodes a SHORT URL with just the batch ID.
// When the recipient opens it, MeadOS loads the live data from the server
// and renders a static read-only "share" page — no sidebar, no nav, no
// modify UI.
//
// Why this approach: the alternative (encoding the full snapshot in the URL
// hash) blows up the QR to an unscannable density. By loading live data, we
// keep the QR small AND get always-current age/gravity/tasting info.
//
// Access model: anyone who can reach the MeadOS server can read its data.
// The standalone share view has no UI for editing, so casual recipients
// can't change anything.

// Base URL used for every generated link (share links, QR codes, the HA
// companion card). Defaults to wherever the app is currently being browsed,
// but Settings → Public URL overrides it — essential behind a reverse proxy,
// where the address YOU browse on (LAN IP) isn't the address recipients can
// reach. The override is stored in the shared blob so every device generates
// identical links.
function appBaseUrl(){
  var ext=((APP.settings&&APP.settings.externalUrl)||'').trim();
  if(ext)return ext.replace(/\/+$/,'')+'/';
  return window.location.origin+window.location.pathname.replace(/index\.html$/,'');
}

// Mint (or reuse) an unguessable share token for a batch. Tokens are stored in
// APP.shareTokens {token:batchId} and ride the state blob. One stable token per
// batch so re-copying a link doesn't spawn duplicates. ~128 bits of entropy.
function shareTokenForBatch(batchId){
  if(!APP.shareTokens||typeof APP.shareTokens!=='object')APP.shareTokens={};
  // Reuse an existing token for this batch if one was already minted.
  var existing=Object.keys(APP.shareTokens).find(function(t){return APP.shareTokens[t]===batchId;});
  if(existing)return existing;
  var tok='';
  try{
    var arr=new Uint8Array(16);(window.crypto||window.msCrypto).getRandomValues(arr);
    tok=Array.prototype.map.call(arr,function(x){return('0'+x.toString(16)).slice(-2);}).join('');
  }catch(e){
    tok=(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,32);
  }
  APP.shareTokens[tok]=batchId;
  // Persist the new token so the link resolves on the server. Never write from
  // a guest's share-mode page (it has no business saving state).
  if(!APP._shareMode&&typeof scheduleSave==='function')scheduleSave();
  return tok;
}

// Read-only check — has a share token already been minted for this batch?
// Used to decide whether to show the Revoke button without minting one.
function hasShareToken(batchId){
  return !!(APP.shareTokens&&Object.keys(APP.shareTokens).some(function(t){return APP.shareTokens[t]===batchId;}));
}

// Delete the token so the existing URL 404s immediately (server resolves
// tokens straight out of the synced state blob — nothing else to clean up).
function revokeShareLink(batchId){
  if(!APP.shareTokens)return;
  var tok=Object.keys(APP.shareTokens).find(function(t){return APP.shareTokens[t]===batchId;});
  if(!tok)return;
  if(!confirm('Revoke this batch\'s share link? The existing URL will stop working immediately.'))return;
  delete APP.shareTokens[tok];
  scheduleSave();
  toast('✦ Share link revoked');
  renderMain();
}

function buildShareURL(batch){
  if(!batch||!batch.id)return null;
  var base=appBaseUrl();
  // Tokenised path form: /share/<token>. The token resolves server-side to a
  // single sanitized batch — no serial or internal id is exposed in the URL,
  // and a leaked link reveals only that one batch. The /share path is exempt
  // from the external-access password so guests never hit a login prompt.
  var tok=shareTokenForBatch(batch.id);
  return base+'share/'+tok;
}

// Food pairing heuristic based on sweetness + style category + ABV
function suggestFoodPairings(s){
  var pairings=[];
  var sw=s.sw||s.sweetness||'';
  var cat=s.cat||s.category||'';
  var abv=s.abv||0;
  if(sw==='Bone Dry'||sw==='Dry'){
    pairings.push(_ST('Aged cheeses (gouda, manchego, parmesan)','Belegen kazen (gouda, manchego, parmezaan)'));
    pairings.push(_ST('Charcuterie boards — saucisson, prosciutto, jamón','Charcuterieplank — saucisson, prosciutto, jamón'));
    pairings.push(_ST('Grilled or roasted meats','Gegrild of gebraden vlees'));
  }else if(sw==='Off-Dry'||sw==='Semi-Sweet'){
    pairings.push(_ST('Soft cheeses (brie, camembert)','Zachte kazen (brie, camembert)'));
    pairings.push(_ST('Spicy Asian dishes — Thai curry, Korean BBQ','Pittige Aziatische gerechten — Thaise curry, Koreaanse BBQ'));
    pairings.push(_ST('Mild creamy sauces over poultry','Milde roomsauzen bij gevogelte'));
  }else if(sw==='Sweet'||sw==='Dessert'){
    pairings.push(_ST('Blue cheeses (roquefort, gorgonzola, stilton)','Blauwe kazen (roquefort, gorgonzola, stilton)'));
    pairings.push(_ST('Fruit-based desserts — tarte tatin, fruit pies','Fruitdesserts — tarte tatin, fruittaarten'));
    pairings.push(_ST('Dark chocolate and chocolate-based desserts','Pure chocolade en chocoladedesserts'));
    pairings.push(_ST('Foie gras and rich pâtés','Foie gras en rijke paté'));
  }
  if(cat==='Bochet')pairings.push(_ST('Caramel desserts, crème brûlée, vanilla ice cream','Karameldesserts, crème brûlée, vanille-ijs'));
  if(cat==='Cyser')pairings.push(_ST('Pork dishes, especially with apples or root vegetables','Varkensgerechten, vooral met appel of wortelgroenten'));
  if(cat==='Pyment')pairings.push(_ST('Match its body to the dish like a wine','Stem het lichaam af op het gerecht zoals bij wijn'));
  if(cat==='Melomel')pairings.push(_ST('Same fruit desserts especially','Vooral desserts met hetzelfde fruit'));
  if(cat==='Metheglin')pairings.push(_ST('Mulled cider season — spiced cookies, gingerbread','Winterse sfeer — speculaas, ontbijtkoek'));
  if(cat==='Braggot')pairings.push(_ST('Pub fare — sausages, hearty stews, smoked meats','Café-klassiekers — worst, stevige stoofpotten, gerookt vlees'));
  if(cat==='Specialty')pairings.push(_ST('Match the dominant flavor (chili → spicy, coffee → desserts)','Volg de dominante smaak (chili → pittig, koffie → desserts)'));
  if(abv>=13)pairings.push(_ST('Sipped on its own — treat like a digestif','Puur te drinken — als een digestief'));
  return pairings.slice(0,5);
}

// Copy share URL for a batch to clipboard
async function copyShareLink(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var url=buildShareURL(b);
  if(!url){toast('⚠ Failed to build share link');return;}
  // Make sure the freshly-minted token is on the server BEFORE handing out the
  // link, otherwise the recipient could 404 on a token the server hasn't seen.
  try{if(typeof saveData==='function')await saveData();}catch(e){}
  try{
    navigator.clipboard.writeText(url);
    toast('✦ Share link copied');
  }catch(e){
    window.prompt('Copy this share link:',url);
  }
}

// Render the standalone read-only share page for a batch.
// REPLACES the entire <body> — no sidebar, no topbar, no app shell.
// Operates on the live batch object from APP state, so age/gravity/tastings
// are always current as of page load.
// ===== Public share view — extra info sections =====
// Honey weight for the bee fun-fact: prefer the batch's logged kg, else parse
// the recipe's honey ingredient line ("1.7 kg").
function shareHoneyKg(b,recipe){
  if(b&&typeof b.honey==='number'&&b.honey>0)return b.honey;
  if(recipe&&recipe.ingredients){
    for(var i=0;i<recipe.ingredients.length;i++){
      var it=recipe.ingredients[i];
      if(/honey/i.test(it.item||'')){
        var m=String(it.amount||'').match(/([\d.]+)\s*kg/i);
        if(m)return parseFloat(m[1]);
      }
    }
  }
  return 0;
}

function renderShareIngredients(b,recipe){
  var ing=(recipe&&recipe.ingredients)||[];
  var adds=(APP.additions&&APP.additions[b.id])||[];
  if(!ing.length&&!adds.length)return'';
  var rows=ing.map(function(it){
    var item=it.item||'';
    // Reflect the batch's actual honey variety on the honey line.
    if(b.honeyType&&/honey\s*$/i.test(item)&&item.toLowerCase().indexOf(String(b.honeyType).toLowerCase())<0){
      item=b.honeyType+' Honey';
    }
    // Reflect the batch's actual yeast strain on the yeast line.
    if(b.yeast&&/yeast\s*$/i.test(item)&&typeof getYeastById==='function'){
      var yn=yeastShortName(getYeastById(b.yeast));
      if(yn&&item.toLowerCase().indexOf(yn.toLowerCase())<0)item=yn+' Yeast';
    }
    if(typeof labelTrIngredient==='function')item=labelTrIngredient(item);
    return'<li><span class="ing-item">'+escHtml(item)+'</span>'+(it.amount?'<span class="ing-amt">'+escHtml(it.amount)+'</span>':'')+'</li>';
  }).join('');
  // The batch's own logged additions (fruit, spices, oak, etc.) — what actually
  // went into THIS batch beyond the base recipe. Removed items are still shown
  // (they shaped the mead), flagged so the reader knows they're no longer in it.
  rows+=adds.map(function(a){
    var nm=(typeof labelTrIngredient==='function')?labelTrIngredient(a.item||'addition'):(a.item||'addition');
    var label=nm+(a.removedDate?_ST(' · removed',' · verwijderd'):'');
    return'<li><span class="ing-item">'+escHtml(label)+'</span>'+(a.amount?'<span class="ing-amt">'+escHtml(a.amount)+'</span>':'')+'</li>';
  }).join('');
  return'<section class="section"><div class="section-title">'+_ST('What’s Inside','Wat zit erin')+'</div>'
    +'<ul class="share-ingredients">'+rows+'</ul>'
    +'<div class="ing-note">'+_ST('Honey, water and yeast are the heart of every mead — the nutrients and finishing aids are consumed during fermentation or settle out, leaving no meaningful trace in the glass.','Honing, water en gist zijn het hart van elke mede — de voedingsstoffen en klaringsmiddelen worden tijdens de gisting verbruikt of zakken uit, en laten geen noemenswaardig spoor na in het glas.')+'</div>'
    +'</section>';
}

// Scan ingredients + style for the allergens that actually apply to mead.
function shareDietaryData(b,recipe){
  var ing=(recipe&&recipe.ingredients)||[];
  var adds=(APP.additions&&APP.additions[b.id])||[];
  var hay=(ing.map(function(i){return(i.item||'')+' '+(i.notes||'');}).join(' ')+' '
    +adds.map(function(a){return(a.item||'')+' '+(a.notes||'');}).join(' ')+' '
    +(b.honeyType||'')+' '+((recipe&&recipe.category)||'')+' '+((recipe&&recipe.name)||'')+' '
    +((recipe&&recipe.style)||'')+' '+(b.name||'')).toLowerCase();
  var contains=[];
  var gluten=/\bmalt|barley|\bwheat|braggot|\bdme\b|\brye\b|\bgrain/.test(hay);
  if(/almond|walnut|pecan|hazelnut|cashew|pistachio|chestnut|\bnut\b|praline|marzipan/.test(hay))contains.push({k:'tree nuts',d:'used as an ingredient'});
  if(/\bmilk\b|cream|lactose|\bwhey\b|\bdairy/.test(hay))contains.push({k:'milk',d:'a dairy ingredient is used'});
  if(/\begg|albumen|isinglass/.test(hay))contains.push({k:'egg or fish',d:'a possible fining agent'});
  var sulfites=/metabisul|campden|k-?meta|sulph?ite|\bso2\b|sorbate/.test(hay);
  return{contains:contains,sulfites:sulfites,gluten:gluten};
}

function renderShareDietary(b,recipe,bot){
  if(!recipe)return'';
  var d=shareDietaryData(b,recipe);
  function badge(txt,tone){
    var c=tone==='good'?'#7cc87c':tone==='warn'?'#e8a050':'#c9a84c';
    return'<span class="diet-badge" style="color:'+c+';border-color:'+c+'55;background:'+c+'14">'+escHtml(txt)+'</span>';
  }
  var badges=[];
  if(bot.abv)badges.push(badge(bot.abv.toFixed(1)+_ST('% alcohol','% alcohol'),'warn'));
  badges.push(d.gluten?badge(_ST('Contains gluten','Bevat gluten'),'warn'):badge(_ST('Gluten-free','Glutenvrij'),'good'));
  badges.push(badge(_ST('Vegetarian','Vegetarisch'),'good'));
  badges.push(badge(_ST('Not vegan · honey','Niet veganistisch · honing'),'base'));
  var allergenNl={'tree nuts':'noten','milk':'melk','egg or fish':'ei of vis'};
  var lines=[];
  lines.push(d.sulfites?_ST('<strong>Contains sulfites</strong> — added as an antioxidant and stabiliser.','<strong>Bevat sulfieten</strong> — toegevoegd als antioxidant en stabilisator.'):_ST('<strong>No sulfites added</strong> — though fermentation itself can leave trace amounts.','<strong>Geen sulfieten toegevoegd</strong> — al kan de gisting zelf sporen achterlaten.'));
  d.contains.forEach(function(c){var k=_ST(c.k,allergenNl[c.k]||c.k);lines.push(_ST('<strong>Contains '+escHtml(k)+'</strong> — '+escHtml(c.d)+'.','<strong>Bevat '+escHtml(k)+'</strong>.'));});
  if(!d.gluten)lines.push(_ST('<strong>Naturally gluten-free</strong> — mead is fermented from honey, not grain.','<strong>Van nature glutenvrij</strong> — mede wordt gegist uit honing, niet uit granen.'));
  return'<section class="section"><div class="section-title">'+_ST('Allergens &amp; Dietary','Allergenen &amp; dieet')+'</div>'
    +'<div class="diet-badges">'+badges.join('')+'</div>'
    +'<ul class="allergen-list">'+lines.map(function(l){return'<li>'+l+'</li>';}).join('')+'</ul>'
    +'<div class="ing-note">'+_ST('Homemade — not produced in an allergen-controlled facility. Contains alcohol; not for anyone under legal drinking age, pregnant, or avoiding alcohol.','Huisgemaakt — niet geproduceerd in een allergeenvrije omgeving. Bevat alcohol; niet voor personen onder de wettelijke leeftijd, zwangere vrouwen of wie alcohol vermijdt.')+'</div>'
    +'</section>';
}

// Public photo journal on the share page — a gallery of the batch's photos
// (oldest → newest), each opening the same lightbox the app uses. Only the
// whitelisted /labels/ asset URLs ship in the share payload.
function renderSharePhotos(b){
  var photos=(APP.photos&&APP.photos[b.id])||[];
  if(!photos.length)return'';
  var sorted=photos.slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  var thumbs=sorted.map(function(p){
    var st=(typeof photoStage==='function')?photoStage(p.stage):{label:'',color:'#c9a84c'};
    var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
    return'<figure class="share-photo" data-action="openPhotoLightbox" data-args=\''+JSON.stringify([b.id,p.id])+'\'>'
      +'<span class="share-photo-stage" style="background:'+st.color+'">'+escHtml((st.label||'').toUpperCase())+'</span>'
      +'<img src="'+escHtml(src)+'" alt="'+escHtml(p.caption||st.label||'Batch photo')+'" loading="lazy">'
      +(p.caption?'<figcaption>'+escHtml(p.caption)+'</figcaption>':'')
      +'</figure>';
  }).join('');
  return'<section class="section"><div class="section-title">'+_ST('Photo Journal','Fotodagboek')+'</div><div class="share-gallery">'+thumbs+'</div></section>';
}

function renderShareFunFacts(b,recipe,bot,ageDays){
  var cat=(recipe&&recipe.category)||'';
  var style=(recipe&&recipe.style)||'';
  var f=[];
  var meaning=_ST({
    Bochet:'A bochet is made from honey caramelised before fermenting — that’s where its toffee, marshmallow and dark-chocolate notes come from.',
    Cyser:'A cyser is a mead fermented with apples or apple juice — a honey-and-orchard hybrid.',
    Pyment:'A pyment is a mead made with grapes or grape juice — the point where mead and wine meet.',
    Melomel:'A melomel is simply a mead made with fruit; the name covers everything from berry to stone-fruit meads.',
    Metheglin:'A metheglin is a spiced or herbed mead — the word shares a root with “medicine”, as these were once brewed as tonics.',
    Braggot:'A braggot is an ancient mead-and-ale hybrid, brewed with both honey and malt.',
    Acerglyn:'An acerglyn is a mead made with maple syrup alongside the honey.',
    Sack:'A “sack” mead is a deliberately strong, sweet style, traditionally aged for years before drinking.'
  },{
    Bochet:'Een bochet wordt gemaakt van honing die vóór het gisten gekarameliseerd is — vandaar de toffee-, marshmallow- en pure-chocoladetonen.',
    Cyser:'Een cyser is een mede die met appels of appelsap gegist is — een kruising van honing en boomgaard.',
    Pyment:'Een pyment is een mede met druiven of druivensap — waar mede en wijn elkaar raken.',
    Melomel:'Een melomel is simpelweg een mede met fruit; de naam dekt alles van bessen- tot steenfruitmede.',
    Metheglin:'Een metheglin is een gekruide mede — het woord deelt een wortel met “medicijn”, want ze werden ooit als tonicum gebrouwen.',
    Braggot:'Een braggot is een oude kruising van mede en bier, gebrouwen met zowel honing als mout.',
    Acerglyn:'Een acerglyn is een mede die naast honing ook met ahornsiroop gemaakt is.',
    Sack:'Een “sack”-mede is een bewust sterke, zoete stijl, traditioneel jaren gerijpt voor het drinken.'
  });
  // Recipes carry the style word in either `category` or `style`.
  var styleFact=meaning[cat]||meaning[style];
  if(styleFact)f.push(styleFact);
  else if(/show|traditional/i.test(style+' '+cat))f.push(_ST('A “show mead” (or traditional) contains nothing but honey, water and yeast — it’s judged purely on the character of the honey, with nowhere to hide.','Een “show mede” (of traditionele) bevat niets dan honing, water en gist — ze wordt puur op het karakter van de honing beoordeeld, zonder ergens te kunnen schuilen.'));
  f.push(_ST('Mead is widely considered humanity’s oldest fermented drink — residue on pottery in northern China dates a honey-based brew to roughly 7000 BCE, predating both wine and beer.','Mede geldt als de oudste gegiste drank van de mens — resten op aardewerk in Noord-China dateren een honingdrank op ongeveer 7000 v.Chr., ouder dan wijn én bier.'));
  var kg=shareHoneyKg(b,recipe);
  if(kg>0){
    var flowers=Math.round(kg*4.4);
    var km=Math.round(kg*120000/1000)*1000;
    var laps=(kg*120000/40075).toFixed(1);
    var kgStr=(kg%1===0)?String(kg):kg.toFixed(1);
    f.push(_ST('The '+kgStr+' kg of honey in this batch took bees roughly '+flowers+' million flower visits to gather — about '+km.toLocaleString()+' km of flight, the equivalent of circling the Earth around '+laps+' times.','Voor de '+kgStr+' kg honing in dit lot bezochten bijen zo’n '+flowers+' miljoen bloemen — ongeveer '+km.toLocaleString()+' km vliegen, alsof ze de aarde zo’n '+laps+' keer rondvliegen.'));
  }
  if(bot.abv){
    var a=bot.abv;
    var ctx=a>=14?_ST('stronger than most wine','sterker dan de meeste wijn'):a>=11?_ST('right in wine territory','precies in wijngebied'):a>=8?_ST('between a strong beer and a light wine','tussen een sterk bier en een lichte wijn'):_ST('around the strength of a beer','ongeveer zo sterk als bier');
    f.push(_ST('At '+a.toFixed(1)+'% ABV this mead is '+ctx+'. Honey has no vintage: the very same honey can ferment bone-dry or lusciously sweet depending only on the yeast and the brewer.','Met '+a.toFixed(1)+'% vol is deze mede '+ctx+'. Honing heeft geen jaargang: dezelfde honing kan kurkdroog of weelderig zoet gisten, enkel afhankelijk van de gist en de brouwer.'));
  }
  // Honey history comes from English-only data — show it only in English.
  if(labelLocale()!=='nl'){
    var hp=(typeof HONEY_PROFILES!=='undefined'&&b.honeyType)?HONEY_PROFILES[b.honeyType]:null;
    var honeyHistory=hp&&((hp.details&&hp.details.history)||hp.history);
    if(honeyHistory){
      var first=String(honeyHistory).split('. ')[0];
      if(first)f.push(escHtmlStrip(b.honeyType)+' honey: '+first+'.');
    }
  }
  f.push(_ST('The word “honeymoon” may trace back to mead — a tradition of newlyweds drinking honey wine for one moon (a month) after the wedding to bless the union.','Het woord “huwelijksreis” gaat in sommige talen terug op mede — pasgetrouwden dronken een maan (maand) lang honingwijn om het huwelijk te zegenen.'));
  if(!f.length)return'';
  return'<section class="section"><div class="section-title">'+_ST('Fun Facts','Wist je dat')+'</div><ul class="facts-list">'+f.map(function(x){return'<li>'+escHtml(x)+'</li>';}).join('')+'</ul></section>';
}
// Tiny helper: strip any stray markup from a label before re-escaping in context.
function escHtmlStrip(s){return String(s||'').replace(/<[^>]*>/g,'');}

function shareSetLocale(loc){if(!APP.settings)APP.settings={};APP.settings.labelLocale=loc;if(window._shareBatch)renderPublicShareView(window._shareBatch);}
// Share-page text: EN by default, NL when the chosen label locale is Dutch.
function _ST(en,nl){return (typeof labelLocale==='function'&&labelLocale()==='nl')?nl:en;}
// A recipe's description in the active locale (Dutch built-in translation if any).
function shareRecipeDesc(recipe){
  if(!recipe)return '';
  if(typeof labelLocale==='function'&&labelLocale()==='nl'&&typeof RECIPE_DESC_NL!=='undefined'&&RECIPE_DESC_NL[recipe.id])return RECIPE_DESC_NL[recipe.id];
  return recipe.description||'';
}
function renderPublicShareView(b){
  if(!b||!b.id){
    document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:18px;padding:20px;text-align:center">This batch was not found.</div>';
    return;
  }
  window._shareBatch=b;                       // for the language toggle to re-render
  var bot=APP.bottling[b.id]||{};
  var recipe=getRecipe(b.recipeId);
  var tastings=APP.tastings[b.id]||[];
  var logs=getBatchLogs(b.id);
  var avgRating=tastings.length
    ?tastings.reduce(function(s,t){return s+(t.rating||0);},0)/tastings.length
    :0;
  var ageDays=bot.date?Math.floor((new Date()-new Date(bot.date))/86400000):0;
  var brewerName=(APP.settings&&APP.settings.brewerName)||'MeadOS';
  var recipeName=recipe?recipe.name:(b.style||'');
  if(typeof labelLocale==='function'&&labelLocale()==='nl'&&recipe&&typeof RECIPE_NAME_NL!=='undefined'&&RECIPE_NAME_NL[recipe.id])recipeName=RECIPE_NAME_NL[recipe.id];
  if(recipeName.indexOf('·')>0)recipeName=recipeName.split('·')[0].trim();

  // Aging window
  var minDays=recipe?(recipe.minAgeDays||recipe.minDays||30):30;
  var peakDays=recipe?(recipe.peakAgeDays||recipe.peakDays||180):180;
  var maxDays=recipe?(recipe.maxAgeDays||recipe.maxDays||peakDays*3):peakDays*3;

  // Gravity chart data: build a list of [days_from_start, gravity]
  var startDate=b.startDate?new Date(b.startDate):null;
  var chartData=[];
  if(startDate){
    if(b.og)chartData.push([0,b.og]);
    logs.filter(function(l){return l.gravity;}).sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(l){
      var d=Math.floor((new Date(l.date)-startDate)/86400000);
      if(d>0&&!chartData.some(function(p){return p[0]===d;})){
        chartData.push([d,l.gravity]);
      }
    });
    if(bot.fg&&bot.date){
      var bdDays=Math.floor((new Date(bot.date)-startDate)/86400000);
      if(!chartData.some(function(p){return p[0]===bdDays;})){
        chartData.push([bdDays,bot.fg]);
      }
    }
  }

  // Most recent tasting note (with full notes, not truncated)
  var lastTasting=null;
  if(tastings.length){
    var sortedT=tastings.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    lastTasting=sortedT[0];
  }

  // Food pairings
  var pairings=suggestFoodPairings({sw:bot.sweetness,cat:recipe?recipe.category:'',abv:bot.abv});

  // Build the sections
  var agingHtml=renderShareAgingTimeline(ageDays,minDays,peakDays,maxDays);
  var gravityHtml=renderShareGravityChart(chartData,b.og);
  var tastingHtml=renderShareTastingNotes(lastTasting);
  var ingredientsHtml=renderShareIngredients(b,recipe);
  var allergensHtml=renderShareDietary(b,recipe,bot);
  var photosHtml=renderSharePhotos(b);
  var factsHtml=renderShareFunFacts(b,recipe,bot,ageDays);

  var html=''
    +'<style>'
    +'*{box-sizing:border-box}'
    // The main-app stylesheet sets html,body{height:100%;overflow:hidden} for the
    // grid layout. Override here so the share page can scroll naturally.
    +'html,body{height:auto!important;overflow:auto!important;overflow-x:hidden}'
    +'body{margin:0;padding:0;background:linear-gradient(180deg,#1a0f08,#2a1810 40%,#1f1408);color:#e0d6b8;font-family:"EB Garamond",Georgia,"Times New Roman",serif;min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased}'
    // Faint honeycomb texture over the page gradient — fixed so it doesn't
    // scroll, pointer-events off so it never eats clicks.
    +'body:before{content:"";position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2756%27 height=%27100%27%3E%3Cpath d=%27M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100%27 fill=%27none%27 stroke=%27%23c9a84c%27 stroke-width=%271%27/%3E%3Cpath d=%27M28 0L28 34L0 50L0 84L28 100L56 84L56 50%27 fill=%27none%27 stroke=%27%23c9a84c%27 stroke-width=%271%27/%3E%3C/svg%3E");background-size:56px 100px;opacity:0.045;pointer-events:none;z-index:0}'
    +'.share-container{position:relative;z-index:1;max-width:600px;margin:22px auto;padding:38px 26px 46px;border:1px solid rgba(201,168,76,0.30);border-radius:8px;background:rgba(22,12,5,0.72);box-shadow:inset 0 0 0 3px rgba(26,15,8,0.95),inset 0 0 0 4px rgba(201,168,76,0.16),0 20px 60px rgba(0,0,0,0.5)}'
    +'.share-container:before{content:"❦";position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#1f1207;padding:0 12px;color:var(--gold);font-size:15px;line-height:1.5}'
    +'.share-header{text-align:center;padding:10px 0 26px;border-bottom:1px solid rgba(201,168,76,0.25)}'
    +'.brewed-by{font-family:"Cinzel","EB Garamond",serif;font-size:11px;color:var(--gold);letter-spacing:4px;margin-bottom:10px;text-transform:uppercase}'
    +'.brewer-name{font-family:"Cinzel","Times New Roman",serif;font-size:24px;color:#e8c878;letter-spacing:1px;line-height:1.2}'
    +'.batch-card{padding:28px 0 18px;text-align:center}'
    +'.batch-name{font-family:"Cinzel","Times New Roman",serif;font-size:34px;color:#e8c878;line-height:1.15;margin-bottom:6px;letter-spacing:0.5px}'
    +'.batch-style{font-style:italic;font-size:14px;color:#a0937a;letter-spacing:1.5px;margin-bottom:22px}'
    +'.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}'
    +'.stat{padding:14px 6px;background:linear-gradient(180deg,rgba(201,168,76,0.12),rgba(201,168,76,0.03));border:1px solid rgba(201,168,76,0.28);border-radius:6px;position:relative;overflow:hidden}'
    +'.stat:before{content:"";position:absolute;top:0;left:18%;right:18%;height:1px;background:linear-gradient(90deg,transparent,#e8c878,transparent)}'
    +'.stat-val{font-family:"Cinzel","Times New Roman",serif;font-size:22px;color:#e8c878;line-height:1.1}'
    +'.stat-lbl{font-family:"Cinzel",serif;font-size:9px;color:#8a7d68;letter-spacing:2px;margin-top:5px;text-transform:uppercase}'
    +'.meta-line{color:#a0937a;font-size:14px;margin:6px 0}'
    +'.meta-line strong{color:var(--gold);font-weight:500}'
    +'.section{margin-top:26px}'
    +'.section-title{display:flex;align-items:center;gap:14px;justify-content:center;text-align:center;font-family:"Cinzel",serif;font-size:11px;color:var(--gold);letter-spacing:3.5px;margin-bottom:16px;text-transform:uppercase}'
    +'.section-title:before,.section-title:after{content:"";height:1px;flex:1;min-width:20px}'
    +'.section-title:before{background:linear-gradient(90deg,transparent,rgba(201,168,76,0.45))}'
    +'.section-title:after{background:linear-gradient(90deg,rgba(201,168,76,0.45),transparent)}'
    +'.share-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}'
    +'.share-photo{position:relative;margin:0;cursor:pointer;border:1px solid rgba(201,168,76,0.28);border-radius:5px;overflow:hidden;background:rgba(0,0,0,0.28);transition:border-color .2s}'
    +'.share-photo:hover{border-color:rgba(201,168,76,0.6)}'
    +'.share-photo img{width:100%;height:108px;object-fit:cover;display:block}'
    +'.share-photo-stage{position:absolute;top:6px;left:6px;font-family:ui-monospace,Menlo,monospace;font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:7px;color:#1a0f08}'
    +'.share-photo figcaption{font-size:10.5px;color:#b8a87d;padding:5px 8px;line-height:1.35}'
    +'.share-chart-wrap{padding:16px 14px;background:rgba(0,0,0,0.18);border-radius:6px;border:1px solid rgba(201,168,76,0.1)}'
    // Thin horizontal aging bar — matches MeadOS .aging-bar-bg/.aging-bar-fill style
    +'.dw-wrap{padding:22px 18px 18px}'
    +'.dw-headline{display:flex;align-items:center;justify-content:center;gap:9px;font-family:"Cinzel",serif;font-size:16.5px;letter-spacing:0.4px}'
    +'.dw-icon{font-size:17px}'
    +'.dw-sub{text-align:center;font-size:12.5px;color:#a99a80;font-style:italic;margin:8px auto 22px;line-height:1.55;max-width:34em}'
    +'.dw-track{position:relative;height:20px;margin:0 7px}'
    +'.dw-rail{position:absolute;top:8px;left:0;right:0;height:5px;border-radius:3px;background:rgba(0,0,0,0.55);border:1px solid rgba(201,168,76,0.12)}'
    +'.dw-fill{position:absolute;top:8px;left:0;height:5px;border-radius:3px;box-shadow:0 0 8px rgba(201,168,76,0.25);transition:width .8s ease}'
    +'.dw-tick{position:absolute;top:4px;width:2px;height:13px;background:rgba(232,200,120,0.55);border-radius:1px;transform:translateX(-1px)}'
    +'.dw-now{position:absolute;top:1px;transform:translateX(-50%)}'
    +'.dw-now-dot{display:block;width:13px;height:13px;border-radius:50%;border:2px solid #1f1408}'
    +'.dw-milestones{display:flex;justify-content:space-between;gap:8px;margin-top:18px}'
    +'.dw-ms{flex:1;text-align:center;padding:9px 4px;border-radius:7px;border:1px solid rgba(201,168,76,0.12);background:rgba(0,0,0,0.16);transition:border-color .3s,background .3s}'
    +'.dw-ms-on{border-color:rgba(201,168,76,0.5);background:rgba(201,168,76,0.1)}'
    +'.dw-ms-v{display:block;font-family:"Cinzel",serif;font-size:14px;color:#e8c878}'
    +'.dw-ms-k{display:block;font-family:ui-monospace,Menlo,monospace;font-size:8.5px;color:#8a7d68;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}'
    +'.tasting-quote{background:rgba(201,168,76,0.06);border-left:3px solid var(--gold);padding:16px 18px;border-radius:0 6px 6px 0}'
    +'.tasting-quote .q{font-style:italic;color:#e0d6b8;font-size:15px;line-height:1.6}'
    +'.tasting-quote .attrib{margin-top:10px;font-size:11px;color:#8a7d68;font-family:"Cinzel",serif;letter-spacing:1.5px}'
    +'.pairings ul{padding-left:22px;line-height:1.85;margin:0}'
    +'.pairings li{margin-bottom:6px;color:#c9b990}'
    +'.share-ingredients{list-style:none;padding:0;margin:0}'
    +'.share-ingredients li{display:flex;justify-content:space-between;gap:14px;padding:9px 2px;border-bottom:1px solid rgba(201,168,76,0.1)}'
    +'.share-ingredients li:last-child{border-bottom:none}'
    +'.ing-item{color:#e0d6b8}'
    +'.ing-amt{color:var(--gold);font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:nowrap}'
    +'.ing-note{font-size:12px;color:#8a7d68;font-style:italic;line-height:1.6;margin-top:12px}'
    +'.diet-badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}'
    +'.diet-badge{font-family:"Cinzel",serif;font-size:10px;letter-spacing:1px;padding:5px 11px;border:1px solid;border-radius:20px;text-transform:uppercase;white-space:nowrap}'
    +'.allergen-list{list-style:none;padding:0;margin:0}'
    +'.allergen-list li{padding:6px 0 6px 18px;position:relative;color:#c9b990;font-size:13.5px;line-height:1.55}'
    +'.allergen-list li:before{content:"•";position:absolute;left:2px;color:var(--gold)}'
    +'.allergen-list strong{color:#e0d6b8;font-weight:500}'
    +'.facts-list{list-style:none;padding:0;margin:0}'
    +'.facts-list li{padding:10px 0 10px 26px;position:relative;color:#c9b990;font-size:13.5px;line-height:1.62;border-bottom:1px solid rgba(201,168,76,0.08)}'
    +'.facts-list li:last-child{border-bottom:none}'
    +'.facts-list li:before{content:"❦";position:absolute;left:0;top:9px;color:var(--gold);font-size:13px}'
    +'.footer{margin-top:38px;text-align:center;font-size:10px;color:#5e533f;font-family:"Cinzel",serif;letter-spacing:2.5px;padding-top:18px;border-top:1px solid rgba(201,168,76,0.12)}'
    +'.share-crest{width:200px;height:200px;object-fit:contain;margin:0 auto 18px;display:block;filter:drop-shadow(0 0 28px rgba(201,168,76,0.5))}'
    +'.share-orn{display:flex;align-items:center;gap:14px;color:var(--gold);font-size:14px;margin-top:18px}'
    +'.share-orn:before,.share-orn:after{content:"";height:1px;flex:1}'
    +'.share-orn:before{background:linear-gradient(90deg,transparent,rgba(201,168,76,0.5))}'
    +'.share-orn:after{background:linear-gradient(90deg,rgba(201,168,76,0.5),transparent)}'
    +'.label-frame{width:190px;margin:4px auto 22px;padding:9px;background:linear-gradient(150deg,#2c1a0c,#190f07);border:1px solid rgba(201,168,76,0.35);border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,0.55),inset 0 0 14px rgba(0,0,0,0.5)}'
    +'.label-frame img{width:100%;display:block;border-radius:4px}'
    +'.batch-desc{font-style:italic;font-size:14px;color:#bfae8a;line-height:1.7;max-width:430px;margin:0 auto 22px}'
    +'.seal{width:90px;height:90px;border-radius:50%;margin:6px auto 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px solid rgba(201,168,76,0.55);box-shadow:inset 0 0 0 3px #1a0f08,inset 0 0 0 4px rgba(201,168,76,0.3),0 6px 16px rgba(0,0,0,0.45);background:radial-gradient(circle at 35% 28%,#3a2410,#231304 70%)}'
    +'.seal .s1{font-family:"Cinzel",serif;font-size:8px;color:var(--gold);letter-spacing:2.5px}'
    +'.seal .s2{font-family:"Cinzel",serif;font-size:14px;color:#e8c878;letter-spacing:1px}'
    +'.footer-orn{color:var(--gold);font-size:14px;margin-bottom:8px;letter-spacing:8px}'
    +'.footer-tag{margin-top:7px;font-style:italic;font-family:"EB Garamond",Georgia,serif;font-size:11px;color:#8a7d68;letter-spacing:1px;text-transform:none}'
    +'@media (max-width:480px){'
    +'  .share-container{margin:10px;padding:28px 14px 40px}'
    +'  .label-frame{width:150px}'
    +'  .share-crest{width:150px;height:150px}'
    +'  .batch-name{font-size:26px}'
    +'  .brewer-name{font-size:20px}'
    +'  .stats{gap:6px}'
    +'  .stat{padding:10px 4px}'
    +'  .stat-val{font-size:18px}'
    +'  .stat-lbl{font-size:8px;letter-spacing:1.5px}'
    +'}'
    +'</style>'
    +'<div class="share-container">'
    +(function(){
      // Language toggle (EN / NL) — defaults to the visitor's locale, lets them switch.
      return '<div style="position:fixed;top:10px;right:10px;z-index:50;display:flex;border:1px solid rgba(200,170,90,0.45);border-radius:8px;overflow:hidden;font-family:Georgia,serif;font-size:12px;letter-spacing:1px">'
        +['en','nl'].map(function(L){var on=labelLocale()===L;return '<button data-action="shareSetLocale" data-args=\''+JSON.stringify([L])+'\' style="padding:6px 13px;border:0;cursor:pointer;background:'+(on?'#caa84c':'rgba(0,0,0,0.45)')+';color:'+(on?'#1a0f08':'#caa84c')+';font-weight:'+(on?'700':'400')+'">'+L.toUpperCase()+'</button>';}).join('')
        +'</div>';
    }())
    +'<header class="share-header">'
    +(function(){
      var lg=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():'';
      // Only embed directly displayable refs (custom logos are data: URLs;
      // unresolved media-source:// refs would render a broken image).
      return(lg&&/^(data:|https?:|\/)/.test(lg))?'<img class="share-crest" src="'+escHtml(lg)+'" alt="">':'';
    }())
    +'<div class="brewed-by">'+_ST('Brewed by','Gebrouwen door')+'</div>'
    +'<div class="brewer-name">'+escHtml(brewerName)+'</div>'
    +'<div class="share-orn">❦</div>'
    +'</header>'
    +'<section class="batch-card">'
    +(function(){
      // Bottle label, rendered through the SAME path as the Label Maker (art +
      // the recipe's overlay config) so it looks exactly as designed — just with
      // the QR code and drinking-window box suppressed for the public page.
      var hasStudio=(typeof studioHasDesign==='function'&&studioHasDesign(b.recipeId));
      if(!hasStudio&&(!window._shareLabelImage||typeof renderLabelWithABV!=='function'))return'';
      var abvText=(bot&&bot.abv!=null)?String(bot.abv):'';
      // Studio design → front-only (backEnabled:false on the reconstructed design).
      return'<div class="label-frame">'+renderBatchLabel(b.recipeId,abvText,{batch:b,qr:false,bestDrink:false})+'</div>';
    }())
    +'<div class="batch-name">'+escHtml(b.name||'')+'</div>'
    +'<div class="batch-style">'+escHtml(recipeName||'')+(recipe&&recipe.category&&recipe.category!==recipeName?' · '+escHtml((typeof recipeStyleNl==='function')?recipeStyleNl(recipe.category):recipe.category):'')+'</div>'
    +((recipe&&shareRecipeDesc(recipe))?'<div class="batch-desc">“'+escHtml(shareRecipeDesc(recipe))+'”</div>':'')
    +'<div class="stats">'
    +'<div class="stat"><div class="stat-val">'+(bot.abv?bot.abv.toFixed(1)+'%':'—')+'</div><div class="stat-lbl">'+_ST('ABV','Alcohol')+'</div></div>'
    +'<div class="stat"><div class="stat-val">'+escHtml(bot.sweetness||'—')+'</div><div class="stat-lbl">'+_ST('Sweetness','Zoetheid')+'</div></div>'
    +'<div class="stat"><div class="stat-val">'+(bot.date?(typeof fmtDurationCompact==='function'?fmtDurationCompact(ageDays):ageDays+'d'):'—')+'</div><div class="stat-lbl">'+_ST('Bottle Age','Flesleeftijd')+'</div></div>'
    +'</div>'
    +(b.honeyType?'<div class="meta-line"><strong>'+_ST('Honey:','Honing:')+'</strong> '+escHtml((typeof labelHoneyPhrase==='function')?labelHoneyPhrase(b.honeyType):b.honeyType)+'</div>':'')
    +(bot.date?'<div class="meta-line"><strong>'+_ST('Bottled:','Gebotteld:')+'</strong> '+escHtml(typeof fmtDate==='function'?fmtDate(bot.date):bot.date)+'</div>':'')
    +(avgRating>0&&tastings.length?'<div class="meta-line"><strong>'+_ST('Brewer\'s rating:','Beoordeling brouwer:')+'</strong> '+(Math.round(avgRating*10)/10)+'★ ('+tastings.length+' '+_ST(tastings.length!==1?'tastings':'tasting',tastings.length!==1?'proeverijen':'proeverij')+')</div>':'')
    +(b.serial?'<div class="seal"><div class="s1">'+_ST('BATCH','LOT')+'</div><div class="s2">'+escHtml(b.serial)+'</div></div>':'')
    +'</section>'
    +ingredientsHtml
    +allergensHtml
    +agingHtml
    +gravityHtml
    +tastingHtml
    +photosHtml
    +(pairings.length?'<section class="section"><div class="section-title">'+_ST('Suggested Pairings','Aanbevolen combinaties')+'</div><div class="pairings"><ul>'+pairings.map(function(p){return'<li>'+escHtml(p)+'</li>';}).join('')+'</ul></div></section>':'')
    +factsHtml
    +'<footer class="footer"><div class="footer-orn">❦</div>'+escHtml(brewerName)+(bot.date?' · '+escHtml(typeof fmtDate==='function'?fmtDate(bot.date):bot.date):'')+'<div class="footer-tag">'+_ST('Crafted with patience','Met geduld gemaakt')+'</div></footer>'
    +'</div>';
  document.body.innerHTML=html;
  document.title=(b.name||'Mead')+' · '+brewerName;
}

// Aging timeline: matches the MeadOS .aging-bar style — thin horizontal bar
// with gradient progress fill, vertical line markers at Ready/Peak, label row
// below, status sentence underneath.
function renderShareAgingTimeline(ageDays,minD,peakD,maxD){
  if(ageDays==null||!minD)return'';
  peakD=peakD||(minD*3);
  maxD=maxD||(peakD*2);
  var displayMax=Math.max(maxD,ageDays,1);
  var pct=Math.min(100,(ageDays/displayMax)*100);
  var minPct=(minD/displayMax)*100;
  var peakPct=(peakD/displayMax)*100;
  // Status, colour, gradient + a premium headline/sub by aging position.
  var gradient,statusColor,icon,head,sub;
  if(ageDays<minD){
    gradient='linear-gradient(90deg,#7a5e2a,#c9a84c)';statusColor='#c9a84c';icon='⏳';
    head=_ST('Still maturing','Nog aan het rijpen');sub=_ST('About '+fmtDuration(minD-ageDays)+' until it’s ready to pour — patience rewards a mead.','Nog ongeveer '+fmtDuration(minD-ageDays)+' tot ze schenkklaar is — geduld beloont een mede.');
  }else if(ageDays<peakD){
    gradient='linear-gradient(90deg,#c9a84c,#7cc87c)';statusColor='#7cc87c';icon='✦';
    head=_ST('In its drinking window','In haar drinkvenster');sub=_ST('Lovely to drink now — about '+fmtDuration(peakD-ageDays)+' until its estimated peak.','Heerlijk om nu te drinken — nog ongeveer '+fmtDuration(peakD-ageDays)+' tot het geschatte hoogtepunt.');
  }else if(ageDays<maxD){
    gradient='linear-gradient(90deg,#c9a84c,#7cc87c,#e8a050)';statusColor='#e8a050';icon='★';
    head=_ST('At its peak','Op haar hoogtepunt');sub=_ST('Right in the sweet spot — flavour will ease gently from here, so enjoy it before too long.','Precies op dreef — de smaak neemt vanaf hier langzaam af, dus geniet er niet te lang mee.');
  }else{
    gradient='linear-gradient(90deg,#c9a84c,#e8a050,#d06060)';statusColor='#d06060';icon='⚜';
    head=_ST('Beyond the usual window','Voorbij het gebruikelijke venster');sub=_ST('Older than the typical window — taste before sharing; a well-kept bottle can still surprise.','Ouder dan gebruikelijk — proef voor je deelt; een goed bewaarde fles kan nog verrassen.');
  }
  function on(lo,hi){return ageDays>=lo&&ageDays<hi?' dw-ms-on':'';}
  return'<section class="section"><div class="section-title">'+_ST('Drinking Window','Drinkvenster')+'</div>'
    +'<div class="share-chart-wrap dw-wrap">'
    +'<div class="dw-headline"><span class="dw-icon" style="color:'+statusColor+'">'+icon+'</span><span style="color:'+statusColor+'">'+escHtml(head)+'</span></div>'
    +'<div class="dw-sub">'+escHtml(sub)+'</div>'
    +'<div class="dw-track">'
    +'<div class="dw-rail"></div>'
    +'<div class="dw-fill" style="width:'+pct.toFixed(1)+'%;background:'+gradient+'"></div>'
    +'<div class="dw-tick" style="left:'+minPct.toFixed(1)+'%"></div>'
    +'<div class="dw-tick" style="left:'+peakPct.toFixed(1)+'%"></div>'
    +'<div class="dw-now" style="left:'+pct.toFixed(1)+'%"><span class="dw-now-dot" style="background:'+statusColor+';box-shadow:0 0 0 3px '+statusColor+'33,0 0 12px '+statusColor+'"></span></div>'
    +'</div>'
    +'<div class="dw-milestones">'
    +'<div class="dw-ms'+on(0,minD)+'"><span class="dw-ms-v">'+fmtDurationCompact(minD)+'</span><span class="dw-ms-k">'+_ST('Ready','Klaar')+'</span></div>'
    +'<div class="dw-ms'+on(minD,peakD)+'"><span class="dw-ms-v">'+fmtDurationCompact(peakD)+'</span><span class="dw-ms-k">'+_ST('Peak','Top')+'</span></div>'
    +'<div class="dw-ms'+on(peakD,1e12)+'"><span class="dw-ms-v">'+fmtDurationCompact(maxD)+'</span><span class="dw-ms-k">'+_ST('Best by','Best voor')+'</span></div>'
    +'</div>'
    +'</div></section>';
}

// Compact SVG line chart of the gravity readings, with the estimated ABV drawn
// on a second (right) axis so the ABV rise as gravity falls is visible. Takes an
// array of [days, gravity_float] and the original gravity (for the ABV scale).
function renderShareGravityChart(data,og){
  if(!data||data.length<2)return'';
  var w=440,h=210,padL=46,padR=44,padT=16,padB=28;
  var maxDay=Math.max.apply(null,data.map(function(p){return p[0];}));
  var grav=data.map(function(p){return p[1];});
  var minG=Math.min.apply(null,grav),maxG=Math.max.apply(null,grav);
  // Round to 3 decimals
  minG=Math.floor((minG-0.005)*1000)/1000;
  maxG=Math.ceil((maxG+0.005)*1000)/1000;
  if(maxG-minG<0.030)maxG=minG+0.030;
  // ABV axis (right): 0 → ABV at the lowest gravity, using OG.
  var ogVal=og||(data[0]&&data[0][0]===0?data[0][1]:null);
  var showAbv=!!ogVal&&(ogVal-minG)>0;
  var maxA=showAbv?Math.max(1,Math.ceil((ogVal-minG)*131.25)):0;
  var sx=function(d){return padL+(d/(maxDay||1))*(w-padL-padR);};
  var sy=function(g){return padT+((maxG-g)/(maxG-minG))*(h-padT-padB);};
  var ay=function(a){return padT+((maxA-a)/(maxA||1))*(h-padT-padB);};
  var pathD=data.map(function(p,i){return(i===0?'M':'L')+' '+sx(p[0]).toFixed(1)+' '+sy(p[1]).toFixed(1);}).join(' ');
  var fillD=pathD+' L '+sx(maxDay).toFixed(1)+' '+(h-padB)+' L '+padL+' '+(h-padB)+' Z';
  var dots=data.map(function(p){return'<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+sy(p[1]).toFixed(1)+'" r="3.5" fill="#e8c878" stroke="#1f1408" stroke-width="1.5"/>';}).join('');
  // ABV line + dots + right-axis %
  var abvPath='',abvDots='',abvLabels='';
  if(showAbv){
    abvPath='<path d="'+data.map(function(p,i){var a=(ogVal-p[1])*131.25;return(i===0?'M':'L')+' '+sx(p[0]).toFixed(1)+' '+ay(a).toFixed(1);}).join(' ')+'" stroke="#7cc87c" stroke-width="2" fill="none" stroke-linejoin="round"/>';
    abvDots=data.map(function(p){var a=(ogVal-p[1])*131.25;return'<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+ay(a).toFixed(1)+'" r="3" fill="#7cc87c" stroke="#1f1408" stroke-width="1.2"/>';}).join('');
    for(var j=0;j<=3;j++){var av=(maxA*j)/3;var yy=ay(av);abvLabels+='<text x="'+(w-padR+6)+'" y="'+(yy+3.5).toFixed(1)+'" font-family="monospace" font-size="9" fill="#7ca87c" text-anchor="start">'+av.toFixed(0)+'%</text>';}
  }
  var yLabels='';
  for(var i=0;i<=3;i++){
    var val=minG+((maxG-minG)*i)/3;
    var y=sy(val);
    yLabels+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(w-padR)+'" y2="'+y.toFixed(1)+'" stroke="rgba(201,168,76,0.1)" stroke-dasharray="2,3"/>'
      +'<text x="'+(padL-6)+'" y="'+(y+3.5).toFixed(1)+'" font-family="monospace" font-size="9" fill="#8a7d68" text-anchor="end">'+val.toFixed(3)+'</text>';
  }
  var xLabels='';
  var xStep=maxDay>60?Math.ceil(maxDay/4/10)*10:Math.max(1,Math.ceil(maxDay/4));
  for(var d=0;d<=maxDay;d+=xStep){
    xLabels+='<text x="'+sx(d).toFixed(1)+'" y="'+(h-padB+14)+'" font-family="monospace" font-size="9" fill="#8a7d68" text-anchor="middle">'+d+'d</text>';
  }
  return'<section class="section"><div class="section-title">'+_ST('Fermentation Curve','Gistingscurve')+'</div><div class="share-chart-wrap">'
    // Safari/WebKit collapses SVGs with bare height:auto + no width/height
    // attrs to wrong intrinsic dimensions, which made the chart caption render
    // ON TOP OF the next section title. Belt-and-braces: explicit width/height
    // attributes + aspect-ratio CSS so the browser computes the right box.
    +'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" style="width:100%;max-width:'+w+'px;height:auto;aspect-ratio:'+w+'/'+h+';display:block;margin:0 auto">'
    +yLabels+xLabels+abvLabels
    +'<path d="'+fillD+'" fill="rgba(201,168,76,0.08)"/>'
    +'<path d="'+pathD+'" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linejoin="round"/>'
    +dots
    +abvPath+abvDots
    +'</svg>'
    +'<div style="text-align:center;font-size:10px;color:#8a7d68;letter-spacing:1.5px;margin-top:6px;font-family:Cinzel,serif">'+(showAbv?'<span style="color:#c9a84c">●</span> '+_ST('GRAVITY','DICHTHEID')+' &nbsp;·&nbsp; <span style="color:#7cc87c">●</span> '+_ST('ABV %','% VOL')+' &nbsp;·&nbsp; '+_ST('OVER FERMENTATION DAYS','OVER GISTINGSDAGEN'):_ST('SPECIFIC GRAVITY OVER FERMENTATION DAYS','DICHTHEID OVER GISTINGSDAGEN'))+'</div>'
    +'</div></section>';
}

// Tasting Journal — matches MeadOS batch view: date + stars header, radar
// chart + 5-dot bar list if wheel data exists, then color/aroma/flavor/finish/notes.
function renderShareTastingNotes(t){
  if(!t)return'';
  // Build star display
  var stars='';
  for(var i=1;i<=5;i++)stars+='<span style="color:'+(i<=t.rating?'#e8c878':'rgba(201,168,76,0.2)')+';font-size:18px">★</span>';
  // Wheel section
  var wheelSection='';
  if(t.wheel&&typeof TASTING_AXES!=='undefined'&&typeof getTastingWheelRadarHTML==='function'){
    var hasAny=Object.values(t.wheel).some(function(v){return v>0;});
    if(hasAny){
      var bars=TASTING_AXES.filter(function(ax){return t.wheel[ax.key]>0;}).map(function(ax){
        var filled=t.wheel[ax.key];
        return'<div style="display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:11px;color:#a0937a;line-height:1.9"><span>'+ax.label+'</span><span><span style="color:var(--gold)">'+'●'.repeat(filled)+'</span><span style="color:rgba(201,168,76,0.15)">'+'●'.repeat(5-filled)+'</span></span></div>';
      }).join('');
      // Cap the radar's max-width so it doesn't grow huge in narrow grids, and
      // give the inner SVG room to render its labels (which extend past the
      // circle on left/right) without clipping.
      wheelSection='<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:center;margin:14px 0 10px"><div style="max-width:220px;margin:0 auto;width:100%;overflow:visible">'+getTastingWheelRadarHTML(t.wheel)+'</div><div>'+bars+'</div></div>';
    }
  }
  // Optional text fields
  function fieldRow(label,val){return val?'<div style="font-size:13px;color:#c9b990;margin:4px 0"><strong style="color:var(--gold)">'+label+':</strong> '+escHtml(val)+'</div>':'';}
  var fields=fieldRow(_ST('Color','Kleur'),t.color)+fieldRow(_ST('Aroma','Aroma'),t.aroma)+fieldRow(_ST('Flavor','Smaak'),t.flavor)+fieldRow(_ST('Finish','Afdronk'),t.finish);
  // Notes can be in `notes` or `note` depending on schema vintage
  var notes=t.notes||t.note||'';
  return'<section class="section"><div class="section-title">'+_ST('Tasting Journal','Proefdagboek')+'</div>'
    +'<div class="tasting-quote">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:6px"><div style="font-family:ui-monospace,monospace;font-size:12px;color:#8a7d68">'+escHtml(t.date||'')+'</div><div>'+stars+'</div></div>'
    +wheelSection
    +fields
    +(notes?'<div style="font-style:italic;color:#e0d6b8;font-size:14px;line-height:1.6;margin-top:10px">"'+escHtml(notes)+'"</div>':'')
    +'</div></section>';
}