// ==========================================================================
// Bottle-label rendering & printing — split out of 10-cellar-supplies.js.
// Legacy label art + overlays (renderLabelWithABV), single-label download/print,
// storage-box labels, and the multi-up A4 label sheet. All globals (no module
// system), so load order only needs to be before these run at user interaction.
// ==========================================================================

// ==================== LABEL IMAGE HELPERS ====================
// LABEL_IMAGES is defined in part2b_labels.js (base64 data URLs for r1..r8)
// Recipes with useGenericLabel:true fall back to a programmatically rendered SVG
// with the brand crest, recipe name, and ABV.

function recipeUsesGenericLabel(recipeId){
  var r=(APP.recipes||[]).find(function(x){return x.id===recipeId;});
  if(!r)return true;
  if(r.useGenericLabel)return true;
  // Custom recipes without specific artwork also use generic
  if(!LABEL_IMAGES||!LABEL_IMAGES[recipeId])return true;
  return false;
}

// Build a small QR-code SVG fragment for a batch, sized to fit the 900-viewBox label.
// Position: bottom-left corner, fully inside the viewBox (y0+size+pad ≤ 900).
// Encodes a SHARE URL — the recipient's browser loads live data from the
// MeadOS server. Falls back to a direct batch hash if share-URL building fails.
function buildBatchQRSVG(batch,cfg){
  if(!batch||typeof QR==='undefined')return'';
  var url;
  // Prefer the public share URL (encodes batch snapshot in the hash — works for anyone)
  if(typeof buildShareURL==='function'){
    url=buildShareURL(batch);
  }
  if(!url){
    // Fallback to direct deep-link. Prefer serial for readability of any
    // intermediate URL that ever leaks (e.g. someone shares the QR target
    // via copy/paste). findBatchByRef accepts either form.
    var base=appBaseUrl();
    url=base+'#batch='+(batch.serial||batch.id);
  }
  var qr;
  try{qr=QR.generate(url,{ecLevel:'L'});}catch(e){return'';}
  var n=qr.size;
  // Geometry — bigger inner QR (was 85) so the modules print large enough to
  // scan reliably off a small bottle label; generous padding gives the quiet
  // zone scanners need. Users can scale it further with the Designer SIZE slider.
  var size=120;
  var pad=14;
  var totalW=size+pad*2;
  var totalH=size+pad*2;
  // Position from cfg (interpreted as the CENTER of the card in % of viewBox);
  // default nudged in from the corner so the larger card stays on-canvas.
  var cx=(cfg&&cfg.x!=null?cfg.x:9)*9;
  var cy=(cfg&&cfg.y!=null?cfg.y:90.5)*9;
  var bx=cx-totalW/2, by=cy-totalH/2;
  var x0=bx+pad, y0=by+pad;
  // Theme — backing + dot color combinations chosen to stay legible across
  // light, dark, and transparent label backgrounds.
  var theme=(cfg&&cfg.theme)||'light';
  var bg,dot,stroke;
  if(theme==='dark'){bg='#1a1208';dot='#f0e6cc';stroke='#c9a350';}
  else if(theme==='transparent'){bg=null;dot='#1a1208';stroke=null;}
  else{bg='#faf3e0';dot='#222';stroke='#8a6a30';}
  var cell=size/n;
  var rects=[];
  for(var r=0;r<n;r++){
    for(var c=0;c<n;c++){
      if(qr.matrix[r][c]){
        rects.push('<rect x="'+(x0+c*cell).toFixed(2)+'" y="'+(y0+r*cell).toFixed(2)+'" width="'+(cell*1.05).toFixed(2)+'" height="'+(cell*1.05).toFixed(2)+'" fill="'+dot+'"/>');
      }
    }
  }
  var sc=(cfg&&parseFloat(cfg.scale))||1;
  var tf=sc!==1?' transform="translate('+cx.toFixed(2)+' '+cy.toFixed(2)+') scale('+sc+') translate('+(-cx).toFixed(2)+' '+(-cy).toFixed(2)+')"':'';
  return'<g'+tf+'>'
    +(bg?'<rect x="'+bx+'" y="'+by+'" width="'+totalW+'" height="'+totalH+'" fill="'+bg+'"'+(stroke?' stroke="'+stroke+'" stroke-width="0.5"':'')+' rx="4"/>':'')
    +rects.join('')
    +'</g>';
}

// Best-drink-between box: mirrors the QR position into the bottom-RIGHT corner.
// White card, black border, two dates from the recipe's aging window applied
// to the bottling date. Lets people glance-read whether a bottle is in window.
function buildBestDrinkBoxSVG(batch,cfg){
  if(!batch)return'';
  var bot=APP.bottling&&APP.bottling[batch.id];
  if(!bot||!bot.date)return'';
  var recipe=getRecipe(batch.recipeId);
  if(!recipe)return'';
  var minD=recipe.minAgeDays||recipe.minDays||30;
  var peakD=recipe.peakAgeDays||recipe.peakDays||(minD*3);
  var maxD=recipe.maxAgeDays||recipe.maxDays||(peakD*2);
  var botDate=new Date(bot.date);
  if(isNaN(botDate.getTime()))return'';
  function fmtShort(d){
    var dd=String(d.getDate()).padStart(2,'0');
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return dd+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  var readyDate=new Date(botDate.getTime()+minD*86400000);
  var peakDate=new Date(botDate.getTime()+peakD*86400000);
  var maxDate=new Date(botDate.getTime()+maxD*86400000);
  // Geometry: 105×105 card. Position cfg.x/cfg.y is the CENTER, in % of viewBox.
  // Defaults match original bottom-right placement (mirrored from QR).
  var size=120,pad=14;
  var bw=size+pad*2, bh=size+pad*2;
  var cx=(cfg&&cfg.x!=null?cfg.x:91)*9;
  var cy=(cfg&&cfg.y!=null?cfg.y:90.5)*9;
  var bx=cx-bw/2, by=cy-bh/2;
  // Theme — light (default white card) / dark / transparent
  var theme=(cfg&&cfg.theme)||'light';
  var bg,stroke,headFill,dateFill,subFill,peakFill;
  if(theme==='dark'){bg='#1a1208';stroke='#c9a350';headFill='#f0e6cc';dateFill='#fff8e8';subFill='#a89878';peakFill='#c9a350';}
  else if(theme==='transparent'){bg=null;stroke=null;headFill='#1a1208';dateFill='#1a1208';subFill='#4a3020';peakFill='#8a6a30';}
  else{bg='#ffffff';stroke='#000000';headFill='#000';dateFill='#000';subFill='#444';peakFill='#8a6a30';}
  var bottledMY=fmtShort(botDate).replace(/^\d+\s+/,''); // "Jun 2026"
  var ry=readyDate.getFullYear(), my=maxDate.getFullYear();
  var windowStr=(ry===my)?String(ry):ry+'–'+my;        // big, glanceable year range
  var winFont=windowStr.length<=4?34:22;               // single year can go larger
  var cxm=bx+bw/2;
  var sc=(cfg&&parseFloat(cfg.scale))||1;
  var tf=sc!==1?' transform="translate('+cx.toFixed(2)+' '+cy.toFixed(2)+') scale('+sc+') translate('+(-cx).toFixed(2)+' '+(-cy).toFixed(2)+')"':'';
  return'<g'+tf+'>'
    +(bg?'<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="'+bg+'"'+(stroke?' stroke="'+stroke+'" stroke-width="1.5"':'')+' rx="4"/>':'')
    +'<text x="'+cxm+'" y="'+(by+32)+'" font-family="Georgia,serif" font-size="13" font-weight="700" fill="'+headFill+'" text-anchor="middle" letter-spacing="2">BEST ENJOYED</text>'
    +'<text x="'+cxm+'" y="'+(by+90)+'" font-family="Georgia,serif" font-size="'+winFont+'" font-weight="700" fill="'+dateFill+'" text-anchor="middle" letter-spacing="1">'+windowStr+'</text>'
    +'<text x="'+cxm+'" y="'+(by+124)+'" font-family="Georgia,serif" font-size="12" fill="'+subFill+'" text-anchor="middle" letter-spacing="0.5">Bottled '+bottledMY+'</text>'
    +'</g>';
}

// Returns the URL to use as <img src> for a recipe's label.
// Priority order:
//   1. User custom label (APP.settings.customLabels[recipeId])
//      — data URL  → return as-is
//      — media-source ID → return cached resolved URL; null fall-through
//        triggers async resolution + re-render once URL arrives
//      — direct URL  → return as-is
//   2. Recipe-specific baked image (LABEL_IMAGES[recipeId])
//   3. Generic baked image (LABEL_IMAGES.generic)
function getLabelImage(recipeId){
  var custom=(APP.settings&&APP.settings.customLabels)?APP.settings.customLabels[recipeId]:null;
  if(custom&&typeof getResolvedMediaUrl==='function'){
    var resolved=getResolvedMediaUrl(custom);
    if(resolved)return resolved;
    // Media ref not yet resolved → fall through to baked default this render
  }
  if(LABEL_IMAGES&&LABEL_IMAGES[recipeId])return LABEL_IMAGES[recipeId];
  return LABEL_IMAGES&&LABEL_IMAGES['generic']?LABEL_IMAGES['generic']:'';
}

// Split a recipe name across up to 2 lines for the generic-label banner.
// The empty banner is ~600px wide × ~70px tall at 900-viewBox scale.
function splitLabelName(name,maxChars){
  maxChars=maxChars||20;
  if(!name)return[''];
  if(name.length<=maxChars)return[name];
  // Try splitting on natural separators first
  var sep=name.split(/[·,—–]/).map(function(s){return s.trim();}).filter(Boolean);
  if(sep.length===2&&sep[0].length<=maxChars&&sep[1].length<=maxChars)return sep;
  // Otherwise word-wrap to two lines
  var words=name.split(/\s+/);
  var line1='',line2='';
  for(var i=0;i<words.length;i++){
    if((line1+' '+words[i]).trim().length<=maxChars||!line1)line1=(line1+' '+words[i]).trim();
    else line2=(line2+' '+words[i]).trim();
  }
  return line2?[line1,line2]:[line1];
}

// SVG overlay text for the generic label: batch name in the empty banner + ABV above "% ALC."
// Coordinates calibrated to the 900×900 generic_label image:
//   - Empty banner spans y≈700-750, usable inner x≈260-640 (≈380 wide between the curls).
//   - ABV slot is the trapezoidal plaque at y≈775-870; "% ALC." text is at y=860.
// Cinzel is an all-caps display font, so character widths are wide. We dynamically size
// the font so any name fits in ~380 viewBox units.
// The banner shows the BATCH NAME only (user-chosen). If a batch has no name, banner is blank.
function buildGenericLabelOverlay(recipe,batch,abvText){
  var displayAbv=(abvText==='—'||abvText===''||abvText==null)?'':String(abvText).replace(/%$/,'').trim();
  var name=(batch&&batch.name)?String(batch.name).trim():'';
  // Cinzel cap width ≈ 0.55 × font-size with letter-spacing. Target inner width ~380.
  var maxInnerWidth=380;
  var charWidthRatio=0.55;
  var idealFontSize=name.length>0?Math.floor(maxInnerWidth/(name.length*charWidthRatio)):36;
  var nameFontSize=Math.max(14,Math.min(36,idealFontSize));
  return(name?'<text x="450" y="725" dominant-baseline="central" font-family="Cinzel,&quot;Times New Roman&quot;,serif" font-size="'+nameFontSize+'" font-weight="700" fill="#3a2010" text-anchor="middle" letter-spacing="0.5">'+escHtml(name)+'</text>':'')
    +(displayAbv?'<text x="450" y="830" font-family="Cinzel,&quot;Times New Roman&quot;,serif" font-size="48" font-weight="700" fill="#3a2010" text-anchor="middle" letter-spacing="1">'+escHtml(displayAbv)+'</text>':'');
}

// Renders an <img> + SVG overlay layer using the per-recipe overlay
// configuration (see renderOverlayLayer in part2c_extensions.js). With default
// config this produces output identical to the original baked-in positions;
// recipes with custom overrides get their personalized layout.
function renderLabelWithABV(recipeId,abvText,opts){
  opts=opts||{};
  var src=getLabelImage(recipeId);
  if(!src){
    // No custom label assigned and no baked image. Prompt the user toward
    // setting one — this used to silently render a generic WebP fallback,
    // but the baked images were removed (Kim hosts label art in HA media).
    return'<div style="border:1px dashed var(--border);border-radius:var(--radius);padding:24px 16px;text-align:center;color:var(--text3);font-size:13px;line-height:1.6">'
      +'<div style="font-size:22px;opacity:0.4;margin-bottom:6px">🏷</div>'
      +'<div>Label not yet configured for this recipe.</div>'
      +'<div style="font-size:11px;margin-top:6px;color:var(--text3);font-style:italic">Set one in <span style="color:var(--gold2);cursor:pointer;text-decoration:underline" onclick="showView(\'settings\')">Settings → Custom Labels</span> — upload an image, paste an image URL, or pick a Home Assistant media file.</div>'
      +'</div>';
  }
  var recipe=(APP.recipes||[]).find(function(x){return x.id===recipeId;});
  var batch=opts.batch||null;
  var overlayMarkup=(typeof renderOverlayLayer==='function')
    ?renderOverlayLayer(recipe,batch,abvText,{qr:opts.qr,bestDrink:opts.bestDrink,overlays:opts.overlays})
    :'';
  return'<div class="label-display" style="position:relative;width:100%;max-width:'+(opts.maxWidth||'100%')+';display:block;line-height:0">'
    +'<img src="'+src+'" alt="Mead Label" style="display:block;width:100%;height:auto;border-radius:'+(opts.radius||'4px')+'" loading="lazy">'
    +(overlayMarkup?'<svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'+overlayMarkup+'</svg>':'')
    +'</div>';
}

// Bake the overlay onto the image via canvas, then download as PNG (print-ready).
// Unified label download. Builds the same SVG that the on-screen preview shows
// (image + renderOverlayLayer output), rasterizes it to a canvas, then exports
// as PNG. By delegating the entire overlay to renderOverlayLayer, the PNG
// always matches the preview — including any Label Designer customizations.
// Previously this function hardcoded overlay coordinates separately, which
// meant Designer tweaks (font size, position, theme) silently vanished on
// export.
function downloadLabel(batchId,side){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var recipe=getRecipe(b.recipeId);
  if(!recipe){toast('⚠ Recipe not found');return;}
  // Prefer the Label Studio design when the recipe has one. side ('front'/'back'/
  // 'both') only applies here — the legacy single-image path below has no back.
  if(typeof studioHasDesign==='function'&&studioHasDesign(recipe.id)){studioDownloadFor(recipe.id,b.id,side);return;}
  var logs=getBatchLogs(b.id);
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var bot=APP.bottling[b.id];
  var abv=(bot&&bot.abv)||(b.og&&lastG?calcABV(b.og,lastG):null);
  if(abv===null){toast('⚠ Need OG and a reading or bottling ABV');return;}
  var src=getLabelImage(recipe.id);
  if(!src){toast('⚠ Label image not available');return;}

  // Step 1: ensure the base label image is a data URL. SVGs containing remote
  // <image href="..."> taint the canvas on draw (security restriction), so any
  // non-data URL must be fetched and inlined first.
  function ensureDataUrl(url,cb){
    if(/^data:/i.test(url)){cb(url);return;}
    fetch(url).then(function(r){return r.blob();}).then(function(blob){
      var reader=new FileReader();
      reader.onload=function(){cb(reader.result);};
      reader.onerror=function(){cb(null);};
      reader.readAsDataURL(blob);
    }).catch(function(){cb(null);});
  }

  ensureDataUrl(src,function(dataUrl){
    if(!dataUrl){toast('⚠ Image failed to load');return;}
    // Step 2: build the same SVG the preview uses. Single source of truth.
    // QR is explicitly enabled (opts.qr:true) — the bottle preview suppresses
    // it at small sizes, but the downloaded label should always carry it.
    var overlayMarkup=renderOverlayLayer(recipe,b,String(abv),{qr:true});
    // Escape any " inside the data URL just in case the encoder produced one
    // (rare but possible with some image content). Most data URLs are safe.
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" width="900" height="900" preserveAspectRatio="xMidYMid meet">'
      +'<image href="'+dataUrl+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'
      +overlayMarkup
      +'</svg>';
    // Step 3: rasterize via Image → canvas. Encode SVG as data URL using
    // base64 (avoids URL-encoding edge cases with the embedded data URL).
    var svgDataUrl='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
    var img=new Image();
    img.onload=function(){
      // Render at 1800×1800 for high-DPI print quality
      var out=1800;
      var canvas=document.createElement('canvas');
      canvas.width=out;canvas.height=out;
      var ctx=canvas.getContext('2d');
      // White background so any transparent label artwork prints clean
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,out,out);
      ctx.drawImage(img,0,0,out,out);
      canvas.toBlob(function(blob){
        if(!blob){toast('⚠ Could not encode PNG');return;}
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download=(b.name||'mead').replace(/[^\w-]+/g,'_')+'-label.png';
        document.body.appendChild(a);a.click();
        setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
        toast('✦ Label saved');
      },'image/png');
    };
    img.onerror=function(){toast('⚠ Could not rasterize label');};
    img.src=svgDataUrl;
  });
}

// Print the label via a popup window — opens browser print dialog with just the label sized to fit.
function printLabel(batchId){
  var b=getBatch(batchId);
  if(!b)return;
  var recipe=getRecipe(b.recipeId);
  if(!recipe)return;
  if(typeof studioHasDesign==='function'&&studioHasDesign(recipe.id)){studioPrintFor(recipe.id,b.id,studioAskSides(recipe.id));return;}
  var logs=getBatchLogs(b.id);
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var bot=APP.bottling[b.id];
  var abv=(bot&&bot.abv)||(b.og&&lastG?calcABV(b.og,lastG):'');
  var labelHtml=renderLabelWithABV(recipe.id,abv,{radius:'0',batch:b});
  var w=window.open('','_blank','width=700,height=800');
  if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(b.name)+' Label</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:sans-serif;background:#fafafa}'
    +'.label-display{width:90mm;max-width:100%}'
    +'.meta{margin-top:14px;font-size:11px;color:#444;text-align:center}'
    +'@page{size:A4;margin:18mm}'
    +'@media print{.no-print{display:none}body{padding:0;background:#fff}.meta{color:#000}}'
    +'.btns{margin:14px 0}.btns button{padding:8px 16px;font-size:13px;cursor:pointer;margin:0 4px}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +labelHtml
    +'<div class="meta"><strong>'+escHtml(b.name)+'</strong> · '+escHtml((recipe&&recipe.style)||'Mead')+'<br>'
    +'Bottled '+(bot&&bot.date?fmtDate(bot.date):fmtDate(b.startDate))+' · '+(b.volume||'?')+'L batch · '+(abv?abv+'% ABV':'')+'</div>'
    +'</body></html>');
  w.document.close();
}

// ==================== STORAGE BOX LABELS ====================
// Big landscape labels you stick on the side of an aging-storage box, so when
// you have multiple boxes in a cellar you can identify each at a glance. They
// carry the info you actually need across the room: batch name, style, ABV,
// bottled date, drinking window (ready / peak / drink-by), contents (bottle
// counts by size), and a QR code that links to the batch in this app.
//
// Format: 1500×1000 SVG (3:2 landscape). Prints cleanly at 15cm × 10cm on a
// 6×4" label sticker or 2-up on A4. Single source of truth via SVG — same
// rasterize-to-PNG pipeline as the bottle label download.

function renderStorageLabelSVG(b){
  var recipe=getRecipe(b.recipeId);
  var bot=APP.bottling[b.id]||{};
  var logs=getBatchLogs(b.id);
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var abv=bot.abv||(b.og&&(bot.fg||lastG)?calcABV(b.og,bot.fg||lastG):null);
  var color=(recipe&&recipe.brandColor)||getBatchColor(b)||'#c9a84c';
  var style=(recipe&&recipe.style)||b.style||'Custom Mead';
  var brandName=APP.settings.brewerName||'MeadOS';

  // Aging window using getAgingProfile (the same source the timeline uses, so
  // the storage label matches what the app says about the batch).
  var profile=(typeof getAgingProfile==='function')?getAgingProfile(b):null;
  var bottleDate=bot.date?new Date(bot.date):null;
  function addDays(d,n){return new Date(d.getTime()+n*86400000);}
  function fmtShort(d){
    if(!d||isNaN(d.getTime()))return'—';
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2,'0')+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  var readyDate=(bottleDate&&profile&&profile.minDays)?addDays(bottleDate,profile.minDays):null;
  var peakDate=(bottleDate&&profile&&profile.peakDays)?addDays(bottleDate,profile.peakDays):null;
  var drinkByDate=(bottleDate&&profile&&profile.maxDays)?addDays(bottleDate,profile.maxDays):null;

  // Bottle contents — "6×750ml + 2×500ml" style breakdown
  var counts=bot.countsAtBottling?(typeof _coerceLocations==='function'?_coerceLocations(bot.countsAtBottling):bot.countsAtBottling):{};
  var contentsParts=[];
  Object.keys(counts).map(Number).sort(function(a,b){return b-a;}).forEach(function(sz){
    if(counts[sz]>0)contentsParts.push(counts[sz]+'×'+sz+'ml');
  });
  var contentsStr=contentsParts.join(' + ')||((bot.bottleCount||'?')+' bottles');

  // QR code linking to the batch's share page in this app
  var qrTarget;
  if(typeof buildShareURL==='function')qrTarget=buildShareURL(b);
  if(!qrTarget){
    var base=appBaseUrl();
    qrTarget=base+'#batch='+(b.serial||b.id);
  }
  var qrSVG='';
  try{
    if(typeof QR!=='undefined'){
      var qr=QR.generate(qrTarget,{ecLevel:'M'});
      var qrSize=qr.size,cell=320/qrSize;
      var rects='';
      for(var r=0;r<qrSize;r++){
        for(var c=0;c<qrSize;c++){
          if(qr.matrix[r][c]){
            rects+='<rect x="'+(c*cell)+'" y="'+(r*cell)+'" width="'+(cell*1.04)+'" height="'+(cell*1.04)+'" fill="#1a0f08"/>';
          }
        }
      }
      qrSVG='<g transform="translate(110,360)"><rect x="-20" y="-20" width="360" height="360" fill="#fff" stroke="#3a2010" stroke-width="2"/>'+rects+'</g>';
    }
  }catch(e){}

  // Compute a luminance contrast so name text stays readable on the color band
  function pickContrast(hex){
    var m=/^#?([0-9a-f]{6})$/i.exec(hex||'');
    if(!m)return'#1a0f08';
    var n=parseInt(m[1],16);
    var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    var L=0.299*r+0.587*g+0.114*b;
    return L>140?'#1a0f08':'#faf3e0';
  }
  var bandText=pickContrast(color);

  // Build the SVG. ViewBox 1500×1000 (3:2 landscape).
  var nameStr=b.name||'Untitled';
  // Auto-scale the name font so long names still fit. Reserve ~970px width.
  var nameFontSize=nameStr.length<=14?92:(nameStr.length<=20?72:(nameStr.length<=28?58:48));

  var svgParts=[];
  svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1000" width="1500" height="1000">');
  // Background — warm cream
  svgParts.push('<rect x="0" y="0" width="1500" height="1000" fill="#faf3e0"/>');
  // Color band along the top (12% height)
  svgParts.push('<rect x="0" y="0" width="1500" height="120" fill="'+color+'"/>');
  // Bottom hairline accent
  svgParts.push('<rect x="0" y="985" width="1500" height="15" fill="'+color+'"/>');

  // Brewer name in the top band
  svgParts.push('<text x="60" y="78" font-family="Cinzel, Times New Roman, serif" font-size="36" font-weight="600" fill="'+bandText+'" letter-spacing="3">'+escHtml(brandName.toUpperCase())+'</text>');
  // Serial badge in the band (right side) — the batch's unique identifier.
  // Big and legible so you can call out "Box 2024-007" across the cellar.
  var serialStr=b.serial?('#'+b.serial):'';
  if(serialStr){
    svgParts.push('<text x="1440" y="78" text-anchor="end" font-family="Cinzel, Times New Roman, serif" font-size="42" font-weight="700" fill="'+bandText+'" letter-spacing="3">'+escHtml(serialStr)+'</text>');
  }else{
    svgParts.push('<text x="1440" y="78" text-anchor="end" font-family="Inter, sans-serif" font-size="22" fill="'+bandText+'" letter-spacing="2" font-style="italic">STORAGE LABEL</text>');
  }

  // Batch name (huge, centered horizontally in left column)
  svgParts.push('<text x="60" y="240" font-family="Cinzel, Times New Roman, serif" font-size="'+nameFontSize+'" font-weight="700" fill="'+color+'">'+escHtml(nameStr)+'</text>');
  // Style + ABV line
  var subline=style+(abv?'  ·  '+abv+'% ABV':'')+(b.volume?'  ·  '+b.volume+' L batch':'');
  svgParts.push('<text x="60" y="295" font-family="Inter, sans-serif" font-size="32" fill="#5a3a20" font-style="italic">'+escHtml(subline)+'</text>');

  // Separator
  svgParts.push('<line x1="60" y1="335" x2="1440" y2="335" stroke="#c9a84c" stroke-width="2" stroke-dasharray="4,4"/>');

  // QR (left, around y=360 set above)
  if(qrSVG)svgParts.push(qrSVG);

  // Information block (right of QR)
  var infoX=500,infoY=410,infoLineH=68;
  function infoRow(label,value,offset){
    var y=infoY+offset*infoLineH;
    return'<text x="'+infoX+'" y="'+y+'" font-family="Inter, sans-serif" font-size="22" fill="#8a6a30" letter-spacing="3">'+escHtml(label.toUpperCase())+'</text>'
      +'<text x="'+(infoX+340)+'" y="'+y+'" font-family="Cinzel, Times New Roman, serif" font-size="36" font-weight="600" fill="#1a0f08">'+escHtml(value)+'</text>';
  }
  svgParts.push(infoRow('Bottled', fmtShort(bottleDate), 0));
  svgParts.push(infoRow('Ready from', fmtShort(readyDate), 1));
  svgParts.push(infoRow('Peak', fmtShort(peakDate), 2));
  svgParts.push(infoRow('Drink by', fmtShort(drinkByDate), 3));
  svgParts.push(infoRow('Contents', contentsStr, 4));
  if(b.honeyType){
    svgParts.push(infoRow('Honey', b.honeyType, 5));
  }

  // Footer (just above the bottom band)
  // Show cellar shelf prominently when set — that's where the label
  // actually earns its keep ("where do I put this box? Shelf 4.").
  // New v11 cellarShelfId takes priority; falls back to legacy free-text.
  var sublocation='';
  if(bot.cellarShelfId&&typeof findShelfById==='function'){
    var hit=findShelfById(bot.cellarShelfId);
    if(hit)sublocation=hit.shelf.label+((hit.cabinet.name||hit.cabinet.model)?' · '+(hit.cabinet.name||hit.cabinet.model):'');
  }
  if(!sublocation)sublocation=bot.cellarSublocation||'';
  if(sublocation){
    svgParts.push('<text x="60" y="935" font-family="Inter, sans-serif" font-size="24" fill="#5a3a20" font-weight="600">📍 '+escHtml(sublocation)+'</text>');
    svgParts.push('<text x="60" y="970" font-family="Inter, sans-serif" font-size="16" fill="#8a6a30" letter-spacing="1">'+escHtml('Scan QR for full batch details')+'</text>');
  }else{
    svgParts.push('<text x="60" y="955" font-family="Inter, sans-serif" font-size="20" fill="#8a6a30" letter-spacing="2">'+escHtml('Scan QR to view full batch journey, tasting notes, and label.')+'</text>');
  }

  svgParts.push('</svg>');
  return svgParts.join('');
}

// Open a print-ready window with a single storage label. Cardboard-stick size.
function printStorageLabel(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id];
  if(!bot){toast('⚠ Batch is not bottled — bottle it first to generate a storage label');return;}
  var svg=renderStorageLabelSVG(b);
  var w=window.open('','_blank','width=900,height=700');
  if(!w){toast('⚠ Popup blocked — allow popups for this site to print labels');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Storage Label · '+escHtml(b.name)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:20px;font-family:Inter,sans-serif;background:#f3f3f3;display:flex;flex-direction:column;align-items:center}'
    +'.label{width:150mm;max-width:100%;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.15)}'
    +'.label svg{display:block;width:100%;height:auto}'
    +'.btns{margin-bottom:14px}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'.btns button:hover{background:#f0f0f0}'
    +'.hint{font-size:11px;color:#666;text-align:center;margin-top:14px;max-width:600px;line-height:1.5}'
    +'@page{size:A4 portrait;margin:15mm}'
    +'@media print{body{padding:0;background:#fff}.no-print{display:none}.label{box-shadow:none;width:150mm}.hint{display:none}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +'<div class="label">'+svg+'</div>'
    +'<div class="hint no-print">This label prints at 150mm × 100mm. Stick it on the side of your aging-storage box for quick identification across the cellar. The QR code scans to this batch\'s page in '+((b.beverageType||'mead')==='cider'?'CiderOS':'MeadOS')+' — handy for a guest browsing your collection. Use a 4×6\" sticker label or print on A4 and trim.</div>'
    +'</body></html>');
  w.document.close();
}

// Rasterize the storage label SVG to a high-DPI PNG. Same SVG → canvas pipeline
// used for bottle labels — single source of truth.
function downloadStorageLabel(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id];
  if(!bot){toast('⚠ Batch is not bottled — bottle it first to generate a storage label');return;}
  var svg=renderStorageLabelSVG(b);
  var svgDataUrl='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
  var img=new Image();
  img.onload=function(){
    // 3000×2000 → 300 DPI for a 10cm × ~6.7cm print (the label is rendered at
    // 1500×1000 viewBox, 3:2). Good enough for crisp printing.
    var outW=3000,outH=2000;
    var canvas=document.createElement('canvas');
    canvas.width=outW;canvas.height=outH;
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(img,0,0,outW,outH);
    canvas.toBlob(function(blob){
      if(!blob){toast('⚠ Could not encode PNG');return;}
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=(b.name||'mead').replace(/[^\w-]+/g,'_')+'-storage-label.png';
      document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
      toast('✦ Storage label saved');
    },'image/png');
  };
  img.onerror=function(){toast('⚠ Could not rasterize label');};
  img.src=svgDataUrl;
}

// Sheet of storage labels — all bottled batches, 2-up on A4. Useful when you
// bottle several batches in one session and want to print one stack.
// Top-level entry: open the selection modal. Replaces the old "just print
// everything" behavior because cellars accumulate — printing all of them
// produces a 30-page stack of labels for boxes that already have them.
function printAllStorageLabels(){
  openStorageLabelPicker();
}

function openStorageLabelPicker(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length){toast('⚠ No bottled batches yet');return;}
  // Selection state lives on window so re-renders within the modal don't lose
  // the user's checkbox state. Default to NOTHING selected — safer when the
  // typical workflow is "I just bottled one batch and want a label for it".
  if(!window._storagePrintSel)window._storagePrintSel={};
  // Drop any selections referring to batches that no longer exist
  Object.keys(window._storagePrintSel).forEach(function(id){
    if(!getBatch(id))delete window._storagePrintSel[id];
  });
  renderStorageLabelPicker();
}

function renderStorageLabelPicker(){
  closeModal();
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  // Sort most-recently-bottled first — newest are most likely to need labels.
  bottled.sort(function(a,b){
    var da=(APP.bottling[a.id]&&APP.bottling[a.id].date)||'';
    var db=(APP.bottling[b.id]&&APP.bottling[b.id].date)||'';
    return db.localeCompare(da);
  });
  var sel=window._storagePrintSel||{};
  var selCount=bottled.filter(function(b){return sel[b.id];}).length;
  var _nl=(typeof appLang==='function'&&appLang()==='nl');

  var rows=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    var isSel=!!sel[b.id];
    var color=getBatchColor(b);
    var recipe=getRecipe(b.recipeId);
    var style=(recipe&&recipe.style)||b.style||'Custom';
    var bottleDate=bot.date?fmtDate(bot.date):'—';
    var ageDays=bot.date?Math.floor((new Date()-new Date(bot.date))/86400000):null;
    var ageLabel=ageDays!=null?(ageDays<30?ageDays+(_nl?'d geleden':'d ago'):ageDays<365?Math.floor(ageDays/30)+(_nl?' mnd geleden':'mo ago'):Math.floor(ageDays/365)+(_nl?' j geleden':'y'+(ageDays>=365*2?'s':'')+' ago')):'';
    var onHand=typeof bottlesOnHand==='function'?bottlesOnHand(bot):(bot.bottleCount||0);
    var origTotal=typeof bottlesOriginal==='function'?bottlesOriginal(bot):(bot.bottleCount||0);
    var bottleInfo=onHand+' / '+origTotal+(_nl?' fles'+(origTotal!==1?'sen':'')+' in voorraad':' bottle'+(origTotal!==1?'s':'')+' on hand');
    return'<div onclick="toggleStoragePrintSelection(\''+b.id+'\')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:'+(isSel?'rgba(232,196,106,0.10)':'var(--bg)')+';border-left:3px solid '+color+';border-radius:var(--radius);cursor:pointer;margin-bottom:6px;transition:background 0.15s">'
      +'<input type="checkbox" '+(isSel?'checked':'')+' onclick="event.stopPropagation();toggleStoragePrintSelection(\''+b.id+'\')" style="width:18px;height:18px;cursor:pointer;accent-color:var(--gold2)">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:'+color+'">'+escHtml(b.name)+'</div>'
        +(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:1px 6px;border-radius:6px">#'+escHtml(b.serial)+'</span>':'')
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;text-transform:uppercase">'+escHtml(style)+'</div>'
      +'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:3px">'
        +(_nl?'Gebotteld ':'Bottled ')+bottleDate+(ageLabel?' · '+ageLabel:'')+' · '+bottleInfo
      +'</div></div>'
      +'</div>';
  }).join('');

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:720px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📦 PRINT STORAGE LABELS</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Select which batches to print labels for. Sorted newest-bottled first so a recent batch is at the top. Each selection prints a 15×10 cm label, stacked one per page on A4.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--border)">'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionAll(true)">Select all</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionAll(false)">Clear</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="setStoragePrintSelectionRecent(30)" title="Select batches bottled in the last 30 days">Recent (30d)</button>'
      +'<div style="margin-left:auto;font-family:var(--font-mono);font-size:11px;color:'+(selCount?'var(--gold2)':'var(--text3)')+'">'+selCount+' / '+bottled.length+' selected</div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;margin:0 -4px;padding:0 4px">'+rows+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" '+(selCount===0?'disabled style="opacity:0.4;cursor:not-allowed"':'')+' onclick="printSelectedStorageLabels()">🖨 Print '+(selCount?selCount+' label'+(selCount===1?'':'s'):'…')+'</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function toggleStoragePrintSelection(batchId){
  if(!window._storagePrintSel)window._storagePrintSel={};
  if(window._storagePrintSel[batchId])delete window._storagePrintSel[batchId];
  else window._storagePrintSel[batchId]=true;
  renderStorageLabelPicker();
}

function setStoragePrintSelectionAll(state){
  window._storagePrintSel=window._storagePrintSel||{};
  if(state){
    APP.batches.forEach(function(b){
      if(APP.bottling[b.id])window._storagePrintSel[b.id]=true;
    });
  }else{
    window._storagePrintSel={};
  }
  renderStorageLabelPicker();
}

function setStoragePrintSelectionRecent(days){
  window._storagePrintSel={};
  var cutoff=Date.now()-days*86400000;
  APP.batches.forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var t=new Date(bot.date).getTime();
    if(!isNaN(t)&&t>=cutoff)window._storagePrintSel[b.id]=true;
  });
  renderStorageLabelPicker();
}

function printSelectedStorageLabels(){
  var sel=window._storagePrintSel||{};
  var selected=APP.batches.filter(function(b){return sel[b.id]&&APP.bottling[b.id];});
  if(!selected.length){toast('⚠ Nothing selected');return;}
  // Preserve newest-first ordering for the print stack
  selected.sort(function(a,b){
    var da=(APP.bottling[a.id]&&APP.bottling[a.id].date)||'';
    var db=(APP.bottling[b.id]&&APP.bottling[b.id].date)||'';
    return db.localeCompare(da);
  });
  var w=window.open('','_blank','width=900,height=700');
  if(!w){toast('⚠ Popup blocked');return;}
  var labels=selected.map(function(b){
    return'<div class="label">'+renderStorageLabelSVG(b)+'</div>';
  }).join('');
  var title='Storage Labels · '+selected.length+' batch'+(selected.length===1?'':'es');
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(title)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:20px;font-family:Inter,sans-serif;background:#f3f3f3}'
    +'.btns{position:sticky;top:0;background:#fff;padding:12px;text-align:center;margin-bottom:14px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'.grid{display:grid;grid-template-columns:1fr;gap:14px;max-width:160mm;margin:0 auto}'
    +'.label{width:150mm;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);page-break-inside:avoid}'
    +'.label svg{display:block;width:100%;height:auto}'
    +'@page{size:A4 portrait;margin:10mm}'
    +'@media print{body{padding:0;background:#fff}.no-print{display:none}.label{box-shadow:none}.grid{grid-template-columns:1fr;gap:5mm}.label{page-break-inside:avoid;break-inside:avoid}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print '+selected.length+' label'+(selected.length===1?'':'s')+'</button><button onclick="window.close()">Close</button></div>'
    +'<div class="grid">'+labels+'</div>'
    +'</body></html>');
  w.document.close();
  closeModal();
}


// ==================== MULTI-UP LABEL SHEET ====================
function printAllLabels(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  if(!bottled.length){toast('⚠ No bottled batches yet');return;}
  openLabelSheetModal(bottled.map(function(b){return b.id;}));
}

// Layout cell counts
var LABEL_LAYOUTS={
  '2x3':{c:2,r:3,cells:6,label:'2 × 3 = 6 per page (90×80mm)'},
  '2x4':{c:2,r:4,cells:8,label:'2 × 4 = 8 per page (90×62mm)'},
  '3x4':{c:3,r:4,cells:12,label:'3 × 4 = 12 per page (60×62mm)'},
  '1x2':{c:1,r:2,cells:2,label:'1 × 2 = 2 large per page (180×130mm)'}
};

function openLabelSheetModal(batchIds){
  closeModal();
  // Union of bottle sizes across all bottled batches → "Version" options.
  var _bottled=APP.batches.filter(function(b){return APP.bottling[b.id];});
  var _sizes={};_bottled.forEach(function(b){activeBottleSizes(APP.bottling[b.id]).forEach(function(s){_sizes[s]=true;});});
  var _sizeList=Object.keys(_sizes).map(Number).filter(function(s){return s>0;}).sort(function(a,b){return a-b;});
  var _sizeOpts='<option value="match">Match bottle counts (per size)</option>'
    +'<option value="all">Every size × copies</option>'
    +'<option value="">Default design × copies</option>'
    +_sizeList.map(function(s){return '<option value="'+s+'">'+s+' ml only × copies</option>';}).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:540px">'
    +'<div class="modal-title">PRINT LABEL SHEET</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+(appLang()==='nl'?'A4-vel met meerdere etiketten. <strong>Versie</strong> kiest welke maatvariant wordt afgedrukt — <em>Flesaantallen volgen</em> drukt exact zoveel van elke maat als je bottelde, met het etiket van die maat.':'A4 sheet with multiple labels. <strong>Version</strong> picks which size variant to print — <em>Match bottle counts</em> prints exactly as many of each size as you bottled, using that size\'s label.')+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Layout per A4 page</label><select class="form-select" id="ls-layout" onchange="updateLabelSheetTotals()">'
    +Object.keys(LABEL_LAYOUTS).map(function(k){return'<option value="'+k+'"'+(k==='2x3'?' selected':'')+'>'+LABEL_LAYOUTS[k].label+'</option>';}).join('')
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Copies of each batch</label><input class="form-input" type="number" id="ls-copies" value="6" min="1" max="100" oninput="updateLabelSheetTotals()"></div>'
    +'<div class="form-group"><label class="form-label">Sides</label><select class="form-select" id="ls-sides" onchange="updateLabelSheetTotals()"><option value="front">Front only</option><option value="both">Front + back</option></select></div>'
    +'<div class="form-group"><label class="form-label">Version</label><select class="form-select" id="ls-size" onchange="updateLabelSheetTotals()">'+_sizeOpts+'</select></div></div>'
    +'<div style="background:var(--bg4);border-radius:var(--radius);padding:10px;font-family:var(--font-mono);font-size:12px;color:var(--text2);margin-bottom:14px" id="ls-summary">—</div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:8px 0">SELECT BATCHES</div>'
    +'<div style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:8px">'
    +APP.batches.filter(function(b){return APP.bottling[b.id];}).map(function(b){
      var checked=batchIds.indexOf(b.id)!==-1;
      return'<label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;border-radius:4px" class="ls-batch-row"><input type="checkbox" data-batch="'+b.id+'" '+(checked?'checked':'')+' style="cursor:pointer" onchange="updateLabelSheetTotals()"><span style="color:'+getBatchColor(b)+';font-family:var(--font-display);font-size:13px;letter-spacing:1px;flex:1">'+escHtml(b.name)+'</span><span style="color:var(--text3);font-size:11px">'+(APP.bottling[b.id].abv||'?')+'% · '+totalBottles(APP.bottling[b.id])+' btl</span></label>';
    }).join('')
    +'</div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-secondary" onclick="setLabelCopiesPerBottle()" title="Print exactly as many labels as you bottled, per size, each in that size\'s variant">Match Bottle Counts</button>'
    +'<button class="btn btn-primary" onclick="generateLabelSheet()">Generate &amp; Print</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(updateLabelSheetTotals,30);
}

function updateLabelSheetTotals(){
  var layout=document.getElementById('ls-layout').value;
  var copies=Math.max(1,parseInt(document.getElementById('ls-copies').value)||1);
  var sizeMode=(document.getElementById('ls-size')||{}).value||'';
  var sides=(document.getElementById('ls-sides')||{}).value||'front';
  var checked=Array.from(document.querySelectorAll('.ls-batch-row input:checked'));
  var layoutInfo=LABEL_LAYOUTS[layout];
  var labels=0;
  checked.forEach(function(cb){
    var bot=APP.bottling[cb.dataset.batch]||{};
    if(sizeMode==='match')activeBottleSizes(bot).forEach(function(sz){labels+=bottlesOriginalBySize(bot,sz)||0;});
    else if(sizeMode==='all')labels+=Math.max(1,activeBottleSizes(bot).length)*copies;
    else labels+=copies;
  });
  var cells=labels*(sides==='both'?2:1);
  var pages=Math.ceil(cells/layoutInfo.cells)||0;
  var s=document.getElementById('ls-summary');
  if(s){
    if(!checked.length){s.innerHTML='<span style="color:var(--text3)">No batches selected</span>';return;}
    var mode=sizeMode==='match'?'matched to bottle counts':(sizeMode==='all'?'every size × '+copies:(/^\d+$/.test(sizeMode)?sizeMode+' ml × '+copies:'default × '+copies));
    s.innerHTML='<strong style="color:var(--gold2)">'+labels+' label'+(labels!==1?'s':'')+'</strong> ('+mode+(sides==='both'?', front + back':'')+') across <strong>'+pages+' A4 page'+(pages!==1?'s':'')+'</strong>';
  }
}

function setLabelCopiesPerBottle(){
  // Switch the sheet to "Match bottle counts" — one label per bottle, per size,
  // each in that size's own label variant.
  var sel=document.getElementById('ls-size');if(sel)sel.value='match';
  updateLabelSheetTotals();
  toast('Matching bottle counts — one label per bottle, per size');
}

function generateLabelSheet(){
  var layout=document.getElementById('ls-layout').value;
  var copies=Math.max(1,parseInt(document.getElementById('ls-copies').value)||1);
  var checked=Array.from(document.querySelectorAll('.ls-batch-row input:checked'));
  if(!checked.length){toast('⚠ Select at least one batch');return;}
  var batchIds=checked.map(function(cb){return cb.dataset.batch;});
  var info=LABEL_LAYOUTS[layout];
  // Label dimensions per layout (slightly smaller than cell so they fit + breathing room)
  var dims={
    '2x3':{w:'90mm',h:'85mm',fs:'13px',abvFs:'15px'},
    '2x4':{w:'90mm',h:'62mm',fs:'12px',abvFs:'13px'},
    '3x4':{w:'58mm',h:'62mm',fs:'9px',abvFs:'10px'},
    '1x2':{w:'180mm',h:'130mm',fs:'18px',abvFs:'24px'}
  }[layout];
  var sizeMode=(document.getElementById('ls-size')||{}).value||'';
  var sides=(document.getElementById('ls-sides')||{}).value||'front';
  // Size-aware queue of {id, vol}. 'match' = one label per bottled bottle, per
  // size; 'all' = every size × copies; a number = that size × copies; '' = default.
  var queue=[];
  batchIds.forEach(function(id){
    var bot=APP.bottling[id]||{};
    if(sizeMode==='match'){
      activeBottleSizes(bot).forEach(function(sz){
        var n=bottlesOriginalBySize(bot,sz)||0;
        for(var i=0;i<n;i++)queue.push({id:id,vol:sz});
      });
    }else if(sizeMode==='all'){
      activeBottleSizes(bot).forEach(function(sz){for(var c=0;c<copies;c++)queue.push({id:id,vol:sz});});
    }else if(/^\d+$/.test(sizeMode)){
      var sz=parseInt(sizeMode);for(var c=0;c<copies;c++)queue.push({id:id,vol:sz});
    }else{
      for(var c=0;c<copies;c++)queue.push({id:id,vol:null});
    }
  });
  if(!queue.length){toast('⚠ Nothing to print for that version');return;}
  // One cell for a side at a bottle volume. Prefer the Studio design (the right
  // size variant); fall back to legacy art (front only) when there's no design.
  function sheetCell(b,abv,side,vol){
    if(typeof studioSideSVG==='function'){
      var svg=studioSideSVG(b.recipeId,b.id,side,{volume:(vol!=null?vol:undefined),style:'display:block;width:100%;height:100%;object-fit:contain'});
      if(svg)return'<div class="lbl" style="display:flex;align-items:center;justify-content:center;padding:1.5mm">'+svg+'</div>';
    }
    if(side==='back')return'';
    var labelImg=getLabelImage(b.recipeId);
    if(!labelImg)return'<div class="lbl placeholder">No label</div>';
    var recipe=getRecipe(b.recipeId);
    var overlay=(typeof renderOverlayLayer==='function')?renderOverlayLayer(recipe,b,abv||''):'';
    return'<div class="lbl"><svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
      +'<image href="'+labelImg+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'+overlay+'</svg></div>';
  }
  // Render labels (front, plus back when 'both' sides chosen)
  var labelHtmls=queue.map(function(item){
    var b=getBatch(item.id);
    if(!b)return'';
    var bot=APP.bottling[item.id]||{};
    var abv=bot.abv||(b.og&&bot.fg?calcABV(b.og,bot.fg):null);
    var cells=sheetCell(b,abv,'front',item.vol);
    if(sides==='both')cells+=sheetCell(b,abv,'back',item.vol);
    return cells;
  }).join('');
  var cellCount=(labelHtmls.match(/class="lbl/g)||[]).length||queue.length;
  closeModal();
  var w=window.open('','_blank');
  if(!w){toast('⚠ Pop-up blocked — allow pop-ups for this site');return;}
  w.document.write('<!DOCTYPE html><html><head><title>MeadOS — Label Sheet</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:A4;margin:6mm}'
    +'*{box-sizing:border-box}'
    +'body{margin:0;padding:0;font-family:Georgia,serif;background:#fff}'
    +'.sheet{display:grid;grid-template-columns:repeat('+info.c+',1fr);grid-auto-rows:'+dims.h+';gap:3mm;padding:0;width:100%}'
    +'.lbl{position:relative;width:100%;height:100%;overflow:hidden;break-inside:avoid;page-break-inside:avoid;'
      +'border:1px dashed rgba(120,120,120,0.45);'
      // ✂ — subtle cut guides on all four sides
    +'}'
    +'.lbl svg{width:100%;height:100%;display:block}'
    +'.lbl.placeholder{font-size:'+dims.fs+';color:#888;display:flex;align-items:center;justify-content:center}'
    +'.toolbar{padding:12px;background:#222;color:#fff;text-align:center;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}'
    +'.toolbar button{padding:10px 20px;font-size:14px;cursor:pointer;border:0;border-radius:4px;background:var(--gold);color:#0a0a0b;font-weight:600;font-family:Georgia,serif}'
    +'.toolbar .toolbar-toggle{font-size:12px;color:#bbb;display:flex;align-items:center;gap:6px;cursor:pointer}'
    +'.no-guides .lbl{border-color:transparent!important}'
    +'@media print{.toolbar{display:none!important}body{background:#fff}}'
    +'</style></head><body>'
    +'<div class="toolbar"><button onclick="window.print()">🖨 Print '+queue.length+' Labels</button><label class="toolbar-toggle"><input type="checkbox" checked onchange="document.body.classList.toggle(\'no-guides\',!this.checked)"> Show cut guides</label><span>'+queue.length+' labels · '+info.c+'×'+info.r+' grid · '+Math.ceil(cellCount/info.cells)+' page'+(Math.ceil(cellCount/info.cells)!==1?'s':'')+'</span></div>'
    +'<div class="sheet">'+labelHtmls+'</div>'
    +'</body></html>');
  w.document.close();
  setTimeout(function(){try{w.focus();}catch(e){}},500);
}
