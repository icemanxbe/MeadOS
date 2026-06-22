// ==========================================================================
// Media-source resolver + Home Assistant websocket.
// Split out of the former 13-labels-share.js. Globals, no behaviour change.
// ==========================================================================

// ==================== MEDIA SOURCE RESOLVER (Phase 3) ====================
// Custom label images and the brand logo can be either:
//   1. A data URL (uploaded from device) — used directly as <img src>
//   2. A media-source:// identifier (picked from /config/media/) — must be
//      resolved against HA's media_source API to get a signed playable URL
//
// Resolved URLs are time-limited (~10min). We keep an in-memory cache and
// prefetch all known IDs at app boot. Cache misses cause getResolvedMediaUrl
// to return null (callers fall back to procedural/baked label) while an
// async resolution kicks off for next render.

if(typeof window._mediaResolveCache==='undefined')window._mediaResolveCache={};

// Determine the format of a stored label reference.
//   'data'    — data:image/...;base64,...  (use directly)
//   'media'   — media-source://...         (needs resolve)
//   'url'     — http(s) URL or /local/...  (use directly)
//   'none'    — null/empty/unknown
function classifyLabelRef(ref){
  if(!ref||typeof ref!=='string')return'none';
  if(ref.indexOf('data:')===0)return'data';
  if(ref.indexOf('media-source://')===0)return'media';
  if(/^https?:\/\//.test(ref)||ref.charAt(0)==='/')return'url';
  return'none';
}

// Synchronously resolve a label reference to a URL usable in <img src>.
// For data: URLs and direct URLs, returns the value unchanged. For
// media-source: refs, returns the cached resolved URL if fresh, else null
// (and schedules an async re-resolve so the cache fills for next render).
function getResolvedMediaUrl(ref){
  var kind=classifyLabelRef(ref);
  if(kind==='data'||kind==='url')return ref;
  if(kind==='media'){
    var cached=window._mediaResolveCache[ref];
    var now=Date.now();
    if(cached&&cached.expiresAt>now+30000)return cached.url;
    // Cache miss or near expiry — kick off async re-resolve in background
    if(!cached||!cached.refreshing){
      window._mediaResolveCache[ref]={url:cached?cached.url:null,expiresAt:cached?cached.expiresAt:0,refreshing:true};
      resolveMediaSourceId(ref).then(function(url){
        // Signed URLs typically last ~10 minutes; refresh at 8min to be safe
        window._mediaResolveCache[ref]={url:url,expiresAt:Date.now()+8*60*1000,refreshing:false};
        // Trigger re-renders so the new URL shows up immediately. We refresh
        // BOTH the main view (in case a label is visible there) AND the
        // designer modal if it's open (since renderMain doesn't touch the
        // designer's preview). Without the designer refresh, picking an HA
        // Media file would show the fallback label until the user reopened
        // the designer.
        if(!APP._shareMode&&typeof renderMain==='function')renderMain();
        if(window._designerState&&typeof refreshDesigner==='function')refreshDesigner();
        // Also refresh the topbar crest if this resolve was for the brand
        // logo — renderMain doesn't touch the topbar.
        if(APP.settings&&APP.settings.brandLogo===ref){
          var crest=document.getElementById('topbar-crest');
          if(crest&&typeof getBrandLogoSrc==='function'){
            crest.innerHTML='<img src="'+getBrandLogoSrc()+'" alt="MeadOS">';
          }
        }
      }).catch(function(err){
        console.warn('Media resolve failed for',ref,err);
        window._mediaResolveCache[ref]={url:null,expiresAt:0,refreshing:false,failed:true};
      });
    }
    return cached?cached.url:null;
  }
  return null;
}

// ==================== HA WEBSOCKET ====================
// HA's media_source/browse_media and media_source/resolve_media are exposed
// via the WebSocket API only — they are NOT REST endpoints. Earlier
// versions of this code POSTed to /api/media_source/browse_media which always
// failed with 404/405. The picker now talks WebSocket for these calls.
//
// One connection is maintained per session, authenticated once. Each call
// uses an incrementing id and resolves when the matching 'result' arrives.

if(typeof window._haWS==='undefined')window._haWS=null;
if(typeof window._haWSReady==='undefined')window._haWSReady=null;
if(typeof window._haWSPending==='undefined')window._haWSPending={};
if(typeof window._haWSId==='undefined')window._haWSId=0;

// The media-browser WebSocket needs the raw token (it can't go through the
// HTTP proxy). Fetch it on demand from the server — it isn't kept in app state.
function fetchHAToken(){
  return fetch('/api/ha-token')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(j){return(j&&j.token)||null;})
    .catch(function(){return null;});
}

function ensureHAWebSocket(){
  if(window._haWSReady)return window._haWSReady;
  window._haWSReady=fetchHAToken().then(function(token){return new Promise(function(resolve,reject){
    if(!token){reject(new Error('No HA token'));return;}
    var base=(typeof haBaseUrl==='function'?haBaseUrl():'')||'';
    if(!base){reject(new Error('No HA URL configured'));return;}
    // http→ws, https→wss
    base=base.replace(/^http/,'ws');
    if(base.slice(-1)==='/')base=base.slice(0,-1);
    var url=base+'/api/websocket';
    console.log('[MeadOS] HA WebSocket connecting to',url);
    var ws;
    try{ws=new WebSocket(url);}catch(e){reject(e);return;}
    var settled=false;
    ws.onmessage=function(ev){
      var msg;
      try{msg=JSON.parse(ev.data);}catch(e){return;}
      if(msg.type==='auth_required'){
        ws.send(JSON.stringify({type:'auth',access_token:token}));
      }else if(msg.type==='auth_ok'){
        console.log('[MeadOS] HA WebSocket authenticated');
        window._haWS=ws;
        settled=true;
        resolve(ws);
      }else if(msg.type==='auth_invalid'){
        console.warn('[MeadOS] HA WebSocket auth invalid:',msg.message);
        settled=true;
        window._haWSReady=null;
        reject(new Error('HA token rejected: '+(msg.message||'auth_invalid')));
        try{ws.close();}catch(e){}
      }else if(msg.type==='result'){
        var pending=window._haWSPending[msg.id];
        if(pending){
          delete window._haWSPending[msg.id];
          if(msg.success)pending.resolve(msg.result);
          else pending.reject(new Error((msg.error&&msg.error.message)||'WS error'));
        }
      }
    };
    ws.onerror=function(ev){
      console.warn('[MeadOS] HA WebSocket error',ev);
      if(!settled){settled=true;window._haWSReady=null;reject(new Error('WebSocket connection error'));}
    };
    ws.onclose=function(){
      console.log('[MeadOS] HA WebSocket closed');
      window._haWS=null;
      window._haWSReady=null;
      // Reject any still-pending calls
      Object.keys(window._haWSPending).forEach(function(id){
        window._haWSPending[id].reject(new Error('WebSocket closed'));
        delete window._haWSPending[id];
      });
    };
    // 8-second connect timeout
    setTimeout(function(){
      if(!settled){settled=true;window._haWSReady=null;try{ws.close();}catch(e){}reject(new Error('WebSocket connect timeout'));}
    },8000);
  });});
  return window._haWSReady;
}

async function haWSCall(cmd){
  var ws=await ensureHAWebSocket();
  var id=++window._haWSId;
  return new Promise(function(resolve,reject){
    window._haWSPending[id]={resolve:resolve,reject:reject};
    try{ws.send(JSON.stringify(Object.assign({id:id},cmd)));}
    catch(e){delete window._haWSPending[id];reject(e);return;}
    // 15s timeout per call
    setTimeout(function(){
      if(window._haWSPending[id]){
        delete window._haWSPending[id];
        reject(new Error('WebSocket call timeout: '+(cmd.type||'?')));
      }
    },15000);
  });
}

// Resolve a media-source ID to a playable URL via WebSocket.
async function resolveMediaSourceId(mediaContentId){
  var result=await haWSCall({type:'media_source/resolve_media',media_content_id:mediaContentId});
  var base=(typeof haBaseUrl==='function'?haBaseUrl():'')||'';
  if(base.slice(-1)==='/')base=base.slice(0,-1);
  // HA returns either an absolute URL or a relative path like /api/media_source_proxy/...
  if(result.url&&result.url.charAt(0)==='/')return base+result.url;
  return result.url;
}

// Browse a folder via WebSocket. Returns {children:[...]} structure.
async function browseMediaSource(mediaContentId){
  return haWSCall({type:'media_source/browse_media',media_content_id:mediaContentId||null});
}

// Pre-resolve all known media-source IDs at app boot so cache is warm.
// Failures are non-fatal — callers fall back to procedural labels.
// Skipped entirely when HA is not configured/enabled, since media-source
// resolution requires the HA WebSocket which would otherwise time out for
// each stored ID (8s × N IDs of wasted connect attempts).
function prefetchAllMediaUrls(){
  if(typeof haConfigured!=='function'||!haConfigured())return;
  var ids=[];
  var cl=APP.settings.customLabels||{};
  Object.keys(cl).forEach(function(k){
    if(classifyLabelRef(cl[k])==='media')ids.push(cl[k]);
  });
  if(classifyLabelRef(APP.settings.brandLogo)==='media'){
    ids.push(APP.settings.brandLogo);
  }
  // De-dup
  ids=ids.filter(function(v,i,a){return a.indexOf(v)===i;});
  ids.forEach(function(id){getResolvedMediaUrl(id);});
}
