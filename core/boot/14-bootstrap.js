// ==========================================================================
// App init + central accessibility layer. Loads LAST (calls init()).
// ==========================================================================

// ==================== INIT ====================
function updateTopbarDate(){
  var el=document.getElementById('topbar-date');
  if(el)el.textContent=new Date().toLocaleDateString(_dloc(),{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
}

async function init(){
  // Register the service worker for offline support + installability. Fire and
  // forget — never block app start on it, and stay silent on failure (e.g.
  // unsupported browser, or http:// on a non-localhost host where SW is
  // disallowed). Runs in both normal and share mode.
  if('serviceWorker' in navigator){
    try{navigator.serviceWorker.register('/sw.js').catch(function(){});}catch(e){}
  }
  // Share-link mode. The recipient gets a read-only standalone page — no
  // sidebar, no nav, no modify UI — built from a single sanitized batch that
  // the server returns in exchange for an unguessable token. Two URL shapes:
  //   /share/<token>            ← current form (token in the path)
  //   /share#<token>            ← bounce-page / hash form, same token
  // The legacy /#share=<serial> links no longer resolve (they exposed the
  // whole state); the owner re-shares to get a tokenised link.
  var pm=window.location.pathname.match(/\/share\/([^/?#]+)\/?$/);
  var sharePathBare=/\/share\/?$/.test(window.location.pathname);
  var hashTok=(window.location.hash&&window.location.hash.indexOf('#share=')===0)
    ?window.location.hash.slice(7):'';
  if(pm||sharePathBare||hashTok){
    var shareToken=pm?decodeURIComponent(pm[1])
      :(hashTok||decodeURIComponent((window.location.hash||'').replace(/^#/,'')));
    await initShareMode(shareToken);
    return;
  }
  loadSettings();
  // Combine built-in + user-saved custom recipes
  function rebuildRecipes(){
    // Everything in customRecipes is user-owned, so backfill isCustom — older
    // imports/forks saved before the flag existed still get Edit/Delete. Also
    // backfill display fields some imports omit so the header doesn't read
    // "undefined% ABV · undefined-day fermentation".
    (APP.customRecipes||[]).forEach(function(r){
      if(!r.isCustom)r.isCustom=true;
      if(r.abvTarget==null&&r.ogTarget&&r.fgTarget)r.abvTarget=Math.round((r.ogTarget-r.fgTarget)*131.25*10)/10;
      if(r.fermentDays==null)r.fermentDays=42;
    });
    APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes||[]);
  }
  window.rebuildRecipes=rebuildRecipes;
  rebuildRecipes();
  // Populate topbar crest with the MeadOS logo
  var crest=document.getElementById('topbar-crest');
  if(crest&&typeof MEADOS_LOGO!=='undefined'&&MEADOS_LOGO){
    var src=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():MEADOS_LOGO;
    crest.innerHTML='<img src="'+src+'" alt="MeadOS">';
  }
  updateTopbarDate();
  await loadData();
  // Learn whether the server holds an HA token (and when it expires) — the
  // token itself never comes to the browser. Drives haConfigured() & reminders.
  await loadHAConfig();
  // Backfill the square dark-background PWA/app icon for a brand logo that was
  // set before this feature existed — one-time, then it rides the shared blob.
  if(APP.settings&&APP.settings.brandLogo&&!APP.settings.appIcon&&typeof regenerateAppIcon==='function'){
    regenerateAppIcon().then(function(){scheduleSave();});
  }
  // Prefetch any media-source IDs in custom labels / brand logo so cache is warm
  if(typeof prefetchAllMediaUrls==='function')prefetchAllMediaUrls();
  // Ensure fermenters exist on fresh installs (loadData may have been a no-op
  // if there's no local cache and HA is unreachable, leaving APP.fermenters
  // empty). This mirrors what the v6 migration would do.
  if(!APP.fermenters||!APP.fermenters.length){
    APP.fermenters=[
      {id:'f1',name:'Primary 1',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#c9a84c',tempSensorEntity:''},
      {id:'f2',name:'Primary 2',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#a87aa0',tempSensorEntity:''},
      {id:'f3',name:'Secondary 1',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa8c0',tempSensorEntity:''},
      {id:'f4',name:'Secondary 2',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa850',tempSensorEntity:''},
      {id:'f5',name:'Bulk Aging 1',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#c87850',tempSensorEntity:''},
      {id:'f6',name:'Bulk Aging 2',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#5a8a7a',tempSensorEntity:''}
    ];
  }
  if(!APP.settings.favoriteRecipes)APP.settings.favoriteRecipes=[];
  rebuildRecipes(); // Re-merge after loadData populated customRecipes
  if(typeof applyUiLanguage==='function')applyUiLanguage(); // localise the static app shell
  // Hash routing: support QR code deep-links like #batch=b1, #recipe=r9, #view=cellar
  handleHashRoute();
  window.addEventListener('hashchange',handleHashRoute);
  if(!window.location.hash)renderMain();
  setInterval(updateTopbarDate,60000);
  // Start temp polling + check for due-today notifications
  startTempPolling();
  setTimeout(function(){maybeNotifyForToday();},2000);
  // Check for batch milestones (ready age, anniversaries) — fires confetti once per milestone
  setTimeout(function(){if(typeof checkMilestoneConfetti==='function')checkMilestoneConfetti();},3500);
  // Move any legacy inline (base64) label/logo images out of the state blob
  // into the server's labels/ folder — done post-load so it never blocks paint
  setTimeout(function(){if(typeof migrateInlineImagesToAssets==='function')migrateInlineImagesToAssets();},2500);
  // Token rotation alert. Only fires for critical/expired states; the warning
  // band lives quietly in settings. Dedup'd per-day via APP.notifiedTasks so
  // we don't pester on every reload.
  setTimeout(function(){
    if(typeof getActiveTokenExpiry!=='function')return;
    if(typeof haConfigured!=='function'||!haConfigured())return;
    var info=getActiveTokenExpiry();
    if(!info||info.status==='ok'||info.status==='warning')return;
    var todayKey=new Date().toISOString().slice(0,10);
    var dedupKey=todayKey+'-token-'+info.status;
    if(APP.notifiedTasks&&APP.notifiedTasks[dedupKey])return;
    if(!APP.notifiedTasks)APP.notifiedTasks={};
    APP.notifiedTasks[dedupKey]=true;
    var msg=info.status==='expired'
      ?'⛔ HA access token has EXPIRED — sync is failing. Open Settings to rotate.'
      :'⚠ HA access token expires in '+info.daysLeft+' day'+(info.daysLeft===1?'':'s')+'. Rotate soon in Settings.';
    toast(msg);
    scheduleSave();
  },4500);
  // Surface any pending schema-migration report once UI has settled
  setTimeout(function(){
    if(APP._pendingMigrationReport&&typeof showMigrationReport==='function'){
      showMigrationReport(APP._pendingMigrationReport);
      APP._pendingMigrationReport=null;
    }
  },1200);
}

async function initShareMode(token){
  // Loading state — replace body immediately so no nav flashes
  document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:14px;letter-spacing:2px">Loading…</div>';
  // Flag share mode so any incidental save/sync paths stay inert. Unlike the
  // old flow we do NOT loadData() the full state — we fetch exactly one
  // sanitized batch by token, so a guest's browser never receives anything
  // beyond the batch they were given.
  APP._shareMode=true;
  function notFound(msg){
    document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:16px;padding:20px;text-align:center">'+(msg||'This share link is no longer valid.')+'</div>';
  }
  if(!token){notFound('Missing share token.');return;}
  var payload=null;
  try{
    var res=await fetch('/api/share?token='+encodeURIComponent(token),{cache:'no-store'});
    if(res&&res.status===200)payload=await res.json();
  }catch(e){}
  if(!payload||!payload.ok||!payload.batch){notFound('This share link is no longer valid — the batch may have been deleted.');return;}
  // Build a MINIMAL in-memory state from the single-batch payload. Only this
  // one batch exists in the guest's APP; there is no other data to leak.
  var b=payload.batch;
  APP.batches=[b];
  APP.logs={};APP.logs[b.id]=payload.logs||[];
  APP.tastings={};APP.tastings[b.id]=payload.tastings||[];
  // Share photos arrive without their internal id (privacy). Assign a stable
  // synthetic id per photo so the gallery's lightbox can address them.
  APP.photos={};APP.photos[b.id]=(payload.photos||[]).map(function(p,i){return Object.assign({id:'sp'+i},p);});
  APP.bottling={};APP.bottling[b.id]=payload.bottling||{};
  APP.customRecipes=payload.recipe?[payload.recipe]:[];
  if(typeof BUILTIN_RECIPES==='function'){
    APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes);
  }
  APP.settings=APP.settings||{};
  if(payload.meadery){
    APP.settings.brewerName=payload.meadery.brewerName||APP.settings.brewerName;
    if(payload.meadery.brandLogo)APP.settings.brandLogo=payload.meadery.brandLogo;
  }
  // Bottle-label art + the recipe's Label-Maker overlay config, so the share
  // page renders the label EXACTLY as configured (just with QR + drinking-window
  // suppressed). Feeding customLabels/recipeOverlays lets getLabelImage and
  // getRecipeOverlays resolve them via the normal label render path.
  window._shareLabelImage=(typeof payload.labelImage==='string'&&/^(data:image\/|\/labels\/|\/assets\/)/.test(payload.labelImage))?payload.labelImage:'';
  if(window._shareLabelImage){
    APP.settings.customLabels=APP.settings.customLabels||{};
    APP.settings.customLabels[b.recipeId]=window._shareLabelImage;
  }
  if(payload.recipeOverlays&&typeof payload.recipeOverlays==='object'){
    APP.settings.recipeOverlays=APP.settings.recipeOverlays||{};
    APP.settings.recipeOverlays[b.recipeId]=payload.recipeOverlays;
  }
  // Visitor-facing label locale: default to Dutch when the visitor's browser is
  // Dutch-speaking (nl-BE / nl-NL), else the brewer's chosen locale. A toggle on
  // the share page can override this.
  var navLang=((navigator.languages&&navigator.languages.join(','))||navigator.language||navigator.userLanguage||'').toLowerCase();
  APP.settings.labelLocale=/(^|,)nl\b/.test(navLang)?'nl':((typeof payload.labelLocale==='string'&&payload.labelLocale)||'en');
  // Label Studio design (front only) so the share page renders the new label,
  // print-ready. backEnabled:false → renderBatchLabel shows the front alone.
  if(payload.labelStudio&&payload.labelStudio.front){
    APP.settings.labelStudio=APP.settings.labelStudio||{};
    var ls=payload.labelStudio;
    APP.settings.labelStudio[b.recipeId]={w:ls.w||340,h:ls.h||440,front:ls.front,back:ls.front,backEnabled:false};
  }
  renderPublicShareView(b);
  // Don't register hashchange — share view is static and we don't want any
  // navigation to fire later. If user changes the hash, nothing happens.
}

function handleHashRoute(){
  var h=window.location.hash.slice(1);
  if(!h){renderMain();return;}
  // #share= is handled at init time, not here — if it fires here it means
  // the user clicked something or pasted a URL after the app already loaded.
  // Easiest UX: reload the page so init runs in share mode.
  if(h.indexOf('share=')===0){
    window.location.reload();
    return;
  }
  var params={};
  h.split('&').forEach(function(kv){
    var p=kv.split('=');
    if(p.length===2)params[p[0]]=decodeURIComponent(p[1]);
  });
  if(params.batch){
    // Accept either the serial (e.g. "2024-001") or the internal id — both
    // legitimate references depending on which generation of share link or
    // QR code is being used. findBatchByRef tries serial first, falls back.
    var b=findBatchByRef(params.batch);
    if(b){showView('batch',b.id);return;}
    toast('⚠ Batch not found');
  }
  if(params.recipe){
    var r=APP.recipes.find(function(x){return x.id===params.recipe;});
    if(r){window.currentRecipeId=params.recipe;showView('recipe-detail');return;}
    toast('⚠ Recipe not found');
  }
  if(params.view){showView(params.view);return;}
  renderMain();
}

document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});

// ===== Accessibility layer (central — covers all dynamically-rendered UI) =====
// Icon/tooltip buttons get a screen-reader label; clickable non-button elements
// become keyboard-operable; modals trap & restore focus and announce as dialogs.
function a11yEnhance(root){
  root=root||document;
  try{
    root.querySelectorAll('button[title]:not([aria-label])').forEach(function(b){
      var t=b.getAttribute('title');if(t)b.setAttribute('aria-label',t);
    });
    root.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea):not([role])').forEach(function(el){
      var tag=el.tagName;
      if(tag!=='DIV'&&tag!=='SPAN'&&tag!=='LI'&&tag!=='TR'&&tag!=='LABEL')return;
      if(el.querySelector('button,a,input,select,textarea'))return; // keeps its own controls as the tab stops
      el.setAttribute('role','button');
      if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
    });
  }catch(e){}
}
(function(){
  function focusables(root){
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      function(el){return el.offsetWidth>0||el.offsetHeight>0||el===document.activeElement;});
  }
  // Enter / Space activates role="button" elements that aren't native controls.
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ')return;
    var t=e.target;
    if(t&&t.getAttribute&&t.getAttribute('role')==='button'&&t.tagName!=='BUTTON'&&t.tagName!=='A'){e.preventDefault();t.click();}
  });
  // Trap Tab within an open modal.
  document.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var ov=document.querySelector('.modal-overlay');if(!ov)return;
    var f=focusables(ov);if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  // Modal lifecycle: announce as dialog, move focus in on open, restore on close.
  var _return=null;
  var mo=new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.prototype.forEach.call(m.addedNodes,function(n){
        if(n.nodeType!==1)return;
        var ov=(n.classList&&n.classList.contains('modal-overlay'))?n:(n.querySelector&&n.querySelector('.modal-overlay'));
        if(!ov||ov._a11y)return;ov._a11y=1;
        _return=document.activeElement;
        var modal=ov.querySelector('.modal')||ov;
        modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
        var ttl=modal.querySelector('.modal-title');
        if(ttl&&!modal.getAttribute('aria-label'))modal.setAttribute('aria-label',ttl.textContent.trim());
        a11yEnhance(modal);
        if(typeof translateChrome==='function')translateChrome(modal);
        var f=focusables(modal);if(f.length){try{f[0].focus();}catch(e){}}
      });
      Array.prototype.forEach.call(m.removedNodes,function(n){
        if(n.nodeType!==1)return;
        if(n.classList&&n.classList.contains('modal-overlay')){
          if(_return&&_return.focus){try{_return.focus();}catch(e){}}
          _return=null;
        }
      });
    });
  });
  if(document.body)mo.observe(document.body,{childList:true});
})();

init();

