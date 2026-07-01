// ==========================================================================
// Image upload utility, image picker modal, brand logo picker.
// Split out of the former 13-labels-share.js. Globals, no behaviour change.
// ==========================================================================

// ==================== IMAGE UPLOAD UTILITY ====================
// Reads a File from <input type="file"> and returns a resized data URL.
// Resize keeps images under reasonable storage size — labels can be 900×900
// max (matches label spec); logos cap at 256×256. Output is JPEG @ quality
// 0.85 to balance fidelity with localStorage budget. PNG kept for images
// with transparency (logos often have it).
// Push a data-URL image to the server, which stores it as a plain file in
// the labels/ folder next to index.html and returns a tiny '/labels/<hash>'
// URL. Keeping URLs instead of megabytes of base64 in the state blob is what
// keeps page loads fast. Falls back to the data URL when the server can't
// store it (offline, etc.) — heavier but functional.
async function storeImageAsset(dataUrl,kind){
  try{
    var res=await apiFetch('/api/asset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:dataUrl,kind:kind||'labels'})});
    if(res&&res.ok){
      var j=await res.json();
      if(j&&j.url)return j.url;
    }
  }catch(e){}
  return dataUrl;
}

// Build a square, dark-background app icon from the brand logo and store it as
// settings.appIcon. The OS masks the home-screen icon to a circle/squircle, so
// compositing the (often round/transparent) logo onto a padded dark square keeps
// it from being clipped. No image library needed — the browser canvas does it.
// Falls back to leaving appIcon unset (server then uses the raw logo) if the
// logo can't be drawn (e.g. a cross-origin source that taints the canvas).
async function regenerateAppIcon(){
  var prev=APP.settings&&APP.settings.appIcon;
  try{
    var brand=APP.settings&&APP.settings.brandLogo;
    if(!brand){APP.settings.appIcon=null;}
    else{
      var src=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():brand;
      var img=await new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im);};im.onerror=function(){rej(new Error('load failed'));};im.src=src;});
      var iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      if(!iw||!ih)throw new Error('no dimensions');
      var S=512,box=Math.round(S*0.78); // content in the central ~78% (maskable safe zone)
      var scale=Math.min(box/iw,box/ih),w=iw*scale,h=ih*scale;
      var cv=document.createElement('canvas');cv.width=S;cv.height=S;
      var ctx=cv.getContext('2d');
      ctx.fillStyle='#0a0a0b';ctx.fillRect(0,0,S,S);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
      APP.settings.appIcon=await storeImageAsset(cv.toDataURL('image/png'),'brand');
    }
  }catch(e){APP.settings.appIcon=null;}
  if(prev&&prev!==APP.settings.appIcon&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
}

// Is a stored /labels/ asset URL still referenced ANYWHERE in app state?
// Assets are content-addressed, so one file can back several references
// (two batches photographed with the same image, a label reused as a logo…).
// We only delete the file once the last reference is gone. Call this AFTER
// removing the reference from APP, so the scan reflects the post-delete state.
function assetUrlReferenced(url){
  if(!url)return true; // unknown → treat as in use (never delete)
  // Photos
  var photos=APP.photos||{};
  for(var bid in photos){
    if((photos[bid]||[]).some(function(p){return p.url===url;}))return true;
  }
  // Custom labels + brand logo
  var labels=(APP.settings&&APP.settings.customLabels)||{};
  for(var k in labels){if(labels[k]===url)return true;}
  if(APP.settings&&APP.settings.brandLogo===url)return true;
  if(APP.settings&&APP.settings.appIcon===url)return true;
  return false;
}

// Delete the underlying asset file IF it's a server-stored /labels/ asset and
// nothing else references it. Safe to call with any ref (data:/media:/empty —
// it no-ops). Best-effort: a failed delete just leaves the file (no orphan
// guarantee, but no user-facing error either).
async function deleteAssetIfUnused(url){
  if(classifyLabelRef(url)!=='url')return;       // only our own stored URLs
  if(url.indexOf('/labels/')!==0&&url.indexOf('/assets/')!==0)return; // not an uploaded asset
  if(assetUrlReferenced(url))return;              // still in use elsewhere
  try{
    await apiFetch('/api/asset/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});
  }catch(e){/* best-effort */}
}

// One-time migration: older versions embedded uploaded images as base64
// inside settings (and therefore inside every save/load of the state blob),
// which ballooned page loads to multiple seconds. Move them to the labels/
// folder and keep only the URLs.
async function migrateInlineImagesToAssets(){
  if(APP._shareMode)return;
  var jobs=[];
  var labels=APP.settings.customLabels||{};
  Object.keys(labels).forEach(function(k){
    if(typeof classifyLabelRef==='function'&&classifyLabelRef(labels[k])==='data')jobs.push({kind:'label',key:k,data:labels[k]});
  });
  if(typeof classifyLabelRef==='function'&&classifyLabelRef(APP.settings.brandLogo)==='data')jobs.push({kind:'logo',data:APP.settings.brandLogo});
  if(!jobs.length)return;
  var moved=0;
  for(var i=0;i<jobs.length;i++){
    var ref=await storeImageAsset(jobs[i].data,jobs[i].kind==='label'?'labels':'brand');
    if(ref!==jobs[i].data){
      if(jobs[i].kind==='label')APP.settings.customLabels[jobs[i].key]=ref;
      else APP.settings.brandLogo=ref;
      moved++;
    }
  }
  if(moved){
    scheduleSave();
    toast('🚀 Moved '+moved+' image'+(moved===1?'':'s')+' to the labels/ folder — page loads will be much faster');
  }
}

function readImageAsDataUrl(file,opts,callback){
  opts=opts||{};
  var maxDim=opts.maxDim||900;
  var preferPng=opts.preferPng===true;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var w=img.width,h=img.height;
      if(w>maxDim||h>maxDim){
        var scale=Math.min(maxDim/w,maxDim/h);
        w=Math.round(w*scale);
        h=Math.round(h*scale);
      }
      var canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      var ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      // Use PNG if requested OR if file already had transparency (heuristic
      // via the source mime type)
      var usePng=preferPng||/\.(png|svg)$/i.test(file.name||'')||(file.type||'').indexOf('png')>=0;
      var dataUrl=canvas.toDataURL(usePng?'image/png':'image/jpeg',0.85);
      callback(null,dataUrl,{w:w,h:h,bytes:dataUrl.length});
    };
    img.onerror=function(){callback(new Error('Image failed to load'));};
    img.src=e.target.result;
  };
  reader.onerror=function(){callback(new Error('File read failed'));};
  reader.readAsDataURL(file);
}

// ==================== IMAGE PICKER MODAL ====================
// Lets the user choose an image via:
//   • File upload from device (always available)
//   • HA Media Source browser (available when HA is configured)
//   • Direct URL paste (escape hatch)
//
// On selection, calls the provided callback with the stored reference (data
// URL string for uploads, media-source ID for HA picks, URL string for paste).

function openImagePicker(opts){
  opts=opts||{};
  var title=opts.title||'Pick an image';
  var callback=opts.onPick||function(){};
  var maxDim=opts.maxDim||900;
  var preferPng=opts.preferPng===true;
  var folder=opts.mediaFolder||'media-source://media_source/local';
  var canHA=(typeof haConfigured==='function')&&haConfigured();
  window._pickerState={
    title:title,
    callback:callback,
    kind:opts.kind||'labels',  // assets/<kind>/ subdir for uploads
    maxDim:maxDim,
    preferPng:preferPng,
    folder:folder,
    canHA:canHA,
    mode:canHA?'media':'upload',
    mediaItems:null,
    mediaLoading:false,
    mediaError:null,
    currentFolder:folder
  };
  document.body.insertAdjacentHTML('beforeend',renderImagePickerModal());
  if(canHA)loadMediaFolder(folder);
}

function renderImagePickerModal(){
  var s=window._pickerState;
  var tabBtn=function(key,label,enabled){
    var active=s.mode===key;
    return'<button onclick="setPickerMode(\''+key+'\')" '+(enabled?'':'disabled')+' '
      +'style="padding:8px 14px;border:1px solid '+(active?'var(--gold)':'var(--border)')+';'
      +'background:'+(active?'rgba(201,163,80,0.1)':'transparent')+';'
      +'color:'+(enabled?'var(--text)':'var(--text3)')+';'
      +'border-radius:4px;cursor:'+(enabled?'pointer':'not-allowed')+';'
      +'font-family:var(--font-mono);font-size:11px;letter-spacing:0.5px;margin-right:4px">'
      +escHtml(label)+'</button>';
  };
  var body='';
  if(s.mode==='upload')body=renderPickerUpload();
  else if(s.mode==='media')body=renderPickerMedia();
  else body=renderPickerUrl();
  return'<div class="modal-overlay modal-static" id="picker-overlay" onclick="if(event.target===this)closeImagePicker()">'
    +'<div class="modal" style="max-width:760px;width:94vw;max-height:88vh;overflow:auto;background:var(--bg2)">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">'
    +'<div class="modal-title" style="margin:0">🖼 '+escHtml(s.title)+'</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="closeImagePicker()">✕</button>'
    +'</div>'
    +'<div style="display:flex;margin-bottom:14px;border-bottom:1px solid var(--border);padding-bottom:10px">'
    +tabBtn('upload','📤 Upload',true)
    +tabBtn('media','🗂 HA Media',s.canHA)
    +tabBtn('url','🔗 URL',true)
    +(!s.canHA?'<span style="margin-left:8px;font-size:11px;color:var(--text3);font-style:italic;align-self:center">HA media browsing requires the optional Home Assistant connection (Settings)</span>':'')
    +'</div>'
    +'<div id="picker-body">'+body+'</div>'
    +'</div></div>';
}

function setPickerMode(mode){
  window._pickerState.mode=mode;
  // Re-render in place
  var overlay=document.getElementById('picker-overlay');
  if(overlay)overlay.outerHTML=renderImagePickerModal();
  if(mode==='media'&&!window._pickerState.mediaItems&&!window._pickerState.mediaLoading){
    loadMediaFolder(window._pickerState.currentFolder);
  }
}

function renderPickerUpload(){
  return'<div style="text-align:center;padding:30px 20px;border:2px dashed var(--border);border-radius:6px">'
    +'<div style="font-size:32px;margin-bottom:8px">📤</div>'
    +'<div style="font-family:var(--font-display);font-size:16px;color:var(--text);margin-bottom:8px">Upload from device</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:18px">PNG, JPEG, WEBP, or SVG · auto-resized to '+window._pickerState.maxDim+'px max</div>'
    +'<input type="file" id="picker-file-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="handlePickerUpload(this)" style="display:none">'
    +'<button class="btn btn-primary" onclick="document.getElementById(\'picker-file-input\').click()">Choose image…</button>'
    +'<div id="picker-upload-status" style="margin-top:14px;font-size:12px;color:var(--text3)"></div>'
    +'</div>';
}

function handlePickerUpload(input){
  var file=input.files&&input.files[0];
  if(!file)return;
  var status=document.getElementById('picker-upload-status');
  if(status)status.textContent='Processing '+file.name+'…';
  var s=window._pickerState;
  readImageAsDataUrl(file,{maxDim:s.maxDim,preferPng:s.preferPng},function(err,dataUrl,info){
    if(err){
      if(status){status.style.color='var(--red2)';status.textContent='⚠ '+err.message;}
      return;
    }
    if(status){
      status.style.color='var(--green2)';
      status.textContent='✓ Loaded '+info.w+'×'+info.h+' · '+(info.bytes/1024).toFixed(0)+'KB';
    }
    if(status)status.textContent='✓ Loaded '+info.w+'×'+info.h+' · storing on server…';
    storeImageAsset(dataUrl,s.kind||'labels').then(function(ref){
      var cb=s.callback;closeImagePicker();cb(ref);
    });
  });
}

function renderPickerUrl(){
  return'<div style="padding:20px">'
    +'<div style="font-family:var(--font-display);font-size:16px;color:var(--text);margin-bottom:8px">Paste an image URL</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:14px">A direct URL to a PNG/JPEG/SVG. Works for /local/… paths inside HA or external https URLs.</div>'
    +'<div style="display:flex;gap:8px">'
    +'<input type="text" id="picker-url-input" class="form-input" style="flex:1" placeholder="/local/labels/my-mead.png or https://...">'
    +'<button class="btn btn-primary" onclick="confirmPickerUrl()">Use URL</button>'
    +'</div>'
    +'</div>';
}

function confirmPickerUrl(){
  var inp=document.getElementById('picker-url-input');
  if(!inp||!inp.value.trim())return;
  var url=inp.value.trim();
  var s=window._pickerState;var cb=s.callback;closeImagePicker();cb(url);
}

function renderPickerMedia(){
  var s=window._pickerState;
  if(s.mediaLoading)return'<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Loading folder…</div>';
  if(s.mediaError)return'<div style="padding:20px;color:var(--red2);font-size:13px">⚠ '+escHtml(s.mediaError)+'<div style="margin-top:10px;color:var(--text3);font-size:12px">Make sure your HA <code>/config/media/labels/</code> folder exists and has images. If you haven\'t set up the folder, the Files addon can create it.</div></div>';
  if(!s.mediaItems)return'<div style="padding:20px;color:var(--text3)">No data</div>';
  var children=s.mediaItems.children||[];
  if(!children.length){
    // Convert media-source ID into a friendly /config/media-relative path.
    var friendly=s.currentFolder
      .replace('media-source://media_source/local/','/config/media/')
      .replace('media-source://media_source/local','/config/media');
    return'<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">'
      +'Empty folder. Drop images into <code>'+escHtml(friendly)+'</code> on your HA.'
      +(s.currentFolder!=='media-source://media_source/local'?'<div style="margin-top:10px;font-size:11px"><button class="btn btn-secondary btn-sm" onclick="loadMediaFolder(\'media-source://media_source/local\')">↰ Back to /config/media</button></div>':'')
      +'</div>';
  }
  // Path breadcrumb
  var path=s.currentFolder.replace('media-source://media_source/local/','/config/media/')
    .replace('media-source://media_source/local','/config/media');
  var crumb='<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:10px;padding:6px 10px;background:var(--bg);border-radius:4px">📂 '+escHtml(path)+'</div>';
  var grid=children.map(function(c){
    var isFolder=c.media_class==='directory';
    var isImage=c.media_class==='image'||/\.(png|jpe?g|webp|svg)$/i.test(c.title||'');
    if(isFolder){
      return'<button onclick="loadMediaFolder(\''+escHtml(c.media_content_id).replace(/'/g,"\\'")+'\')" '
        +'style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;background:var(--bg);'
        +'border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);font-family:var(--font);font-size:12px">'
        +'<div style="font-size:28px">📁</div>'
        +'<div style="text-align:center;word-break:break-word">'+escHtml(c.title||'(folder)')+'</div>'
        +'</button>';
    }
    if(!isImage)return'';
    // Image item — show thumbnail if available, else filename
    return'<button onclick="confirmPickerMedia(\''+escHtml(c.media_content_id).replace(/'/g,"\\'")+'\')" '
      +'style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;background:var(--bg);'
      +'border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text)" '
      +'onmouseenter="this.style.borderColor=\'var(--gold)\'" onmouseleave="this.style.borderColor=\'var(--border)\'">'
      +(c.thumbnail?'<img src="'+escHtml(c.thumbnail)+'" style="width:100%;height:90px;object-fit:cover;border-radius:3px" loading="lazy">':'<div style="width:100%;height:90px;display:flex;align-items:center;justify-content:center;font-size:32px;background:var(--bg2);border-radius:3px">🖼</div>')
      +'<div style="font-size:11px;text-align:center;word-break:break-word;width:100%">'+escHtml(c.title||'(image)')+'</div>'
      +'</button>';
  }).filter(Boolean).join('');
  return crumb
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">'+grid+'</div>'
    +(s.currentFolder!=='media-source://media_source/local'?'<div style="margin-top:14px"><button class="btn btn-secondary btn-sm" onclick="loadMediaFolder(\'media-source://media_source/local\')">↰ Up to /config/media</button></div>':'');
}

function loadMediaFolder(mediaContentId){
  var s=window._pickerState;
  if(!s)return;
  s.currentFolder=mediaContentId;
  s.mediaLoading=true;
  s.mediaError=null;
  s.mediaItems=null;
  refreshPickerBody();
  browseMediaSource(mediaContentId).then(function(data){
    s.mediaLoading=false;
    s.mediaItems=data;
    refreshPickerBody();
  }).catch(function(err){
    s.mediaLoading=false;
    s.mediaError=err.message||String(err);
    refreshPickerBody();
  });
}

function refreshPickerBody(){
  var body=document.getElementById('picker-body');
  if(body)body.innerHTML=renderPickerMedia();
}

function confirmPickerMedia(mediaContentId){
  var s=window._pickerState;var cb=s.callback;closeImagePicker();cb(mediaContentId);
}

function closeImagePicker(){
  var overlay=document.getElementById('picker-overlay');
  if(overlay)overlay.remove();
  window._pickerState=null;
}

// Render the BACKGROUND IMAGE card in the Label Designer's left column.
// Shows what artwork the label is currently using and provides upload/clear.
function renderDesignerBackgroundCard(){
  var s=window._designerState;
  if(!s)return'';
  var customRef=(APP.settings.customLabels||{})[s.recipeId];
  var kind=classifyLabelRef(customRef);
  var source,sourceColor;
  if(kind==='data'){source='Uploaded image';sourceColor='var(--green2)';}
  else if(kind==='media'){source='HA media · '+(customRef.replace(/^media-source:\/\/[^\/]+\/[^\/]+\//,''));sourceColor='var(--blue2)';}
  else if(kind==='url'){source='URL';sourceColor='var(--blue2)';}
  else{
    var isGen=(typeof recipeUsesGenericLabel==='function')&&recipeUsesGenericLabel(s.recipeId);
    source=isGen?'Generated artwork':'Built-in image';
    sourceColor='var(--text3)';
  }
  return'<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px">BACKGROUND IMAGE</div>'
    +'<div style="font-size:12px;color:'+sourceColor+';margin-bottom:10px;word-break:break-all">'+escHtml(source)+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" onclick="pickDesignerBackground()" style="flex:1">🖼 Pick image…</button>'
    +(kind!=='none'?'<button class="btn btn-secondary btn-sm" onclick="clearDesignerBackground()">Clear</button>':'')
    +'</div>'
    +'</div>';
}

// Opens the image picker, on selection stores the ref in customLabels and
// refreshes the designer preview.
function pickDesignerBackground(){
  var s=window._designerState;
  openImagePicker({
    title:'Pick background image for label',
    maxDim:900,
    onPick:function(ref){
      if(!APP.settings.customLabels)APP.settings.customLabels={};
      var prev=APP.settings.customLabels[s.recipeId];
      APP.settings.customLabels[s.recipeId]=ref;
      // If it's a media-source ID, kick off resolution immediately
      if(classifyLabelRef(ref)==='media')getResolvedMediaUrl(ref);
      // Save right away so it survives a Cancel
      scheduleSave();
      // The replaced background's file is orphaned if nothing else uses it.
      if(prev&&prev!==ref&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
      refreshDesigner();
      toast('✦ Background updated');
    }
  });
}

function clearDesignerBackground(){
  var s=window._designerState;
  var prev=APP.settings.customLabels&&APP.settings.customLabels[s.recipeId];
  if(APP.settings.customLabels)delete APP.settings.customLabels[s.recipeId];
  scheduleSave();
  if(typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
  refreshDesigner();
  toast('Background reverted to default');
}

// ==================== BRAND LOGO PICKER ====================
// Wraps the image picker for the topbar/dashboard logo. Stored server-side as
// an asset at the same 900px/PNG detail as bottle labels — the 200px preview is
// retina/HiDPI, so a smaller source visibly pixelates.
function pickBrandLogo(){
  openImagePicker({
    title:'Pick brand logo',
    kind:'brand',
    maxDim:900,
    preferPng:true,
    onPick:function(ref){
      var prev=APP.settings.brandLogo;
      APP.settings.brandLogo=ref;
      if(classifyLabelRef(ref)==='media')getResolvedMediaUrl(ref);
      scheduleSave();
      if(prev&&prev!==ref&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
      // Rebuild the square dark-background PWA/app icon from the new logo.
      regenerateAppIcon().then(function(){scheduleSave();});
      // Refresh the topbar logo immediately (renderMain doesn't touch it)
      var crest=document.getElementById('topbar-crest');
      if(crest){
        var src=getBrandLogoSrc();
        crest.innerHTML='<img src="'+src+'" alt="MeadOS">';
      }
      renderMain();
      toast('✦ Brand logo updated');
    }
  });
}

function clearBrandLogo(){
  if(!confirm('Restore the default brand logo?'))return;
  var prev=APP.settings.brandLogo;
  var prevIcon=APP.settings.appIcon;
  APP.settings.brandLogo=null;
  APP.settings.appIcon=null;  // revert PWA/app icon to the bundled default too
  scheduleSave();
  if(typeof deleteAssetIfUnused==='function'){deleteAssetIfUnused(prev);if(prevIcon)deleteAssetIfUnused(prevIcon);}
  var crest=document.getElementById('topbar-crest');
  if(crest){
    crest.innerHTML='<img src="'+MEADOS_LOGO+'" alt="MeadOS">';
  }
  renderMain();
  toast('Brand logo reverted');
}

// Returns the URL to use as <img src> for the brand logo. Prefers the user's
// custom logo (APP.settings.brandLogo) — data URL, media-source ID, or direct
// URL — falling back to the bundled MEADOS_LOGO when none is set or the
// media-source ID hasn't yet been resolved.
function getBrandLogoSrc(){
  var custom=(APP.settings&&APP.settings.brandLogo)||null;
  if(custom&&typeof getResolvedMediaUrl==='function'){
    var resolved=getResolvedMediaUrl(custom);
    if(resolved)return resolved;
  }
  return(typeof MEADOS_LOGO!=='undefined')?MEADOS_LOGO:'';
}