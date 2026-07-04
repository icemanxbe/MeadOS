// ==========================================================================
// Mead guide + bottle scanner.
// Split out of the former 08-tools.js. Globals, no behaviour change.
// ==========================================================================

// ==================== MEAD GUIDE ====================
// Beginner walkthrough — a complete first batch, empty fermenter to first
// tasting. Featured, always-open at the top of the guide.
var BEGINNER_HOWTO=[
  {t:'Gather your kit',d:'A fermenter with an airlock, a hydrometer + trial jar, an auto-siphon, a long spoon, and a no-rinse sanitiser. For a first 5 L batch: ~1.5–1.7 kg honey, chlorine-free water, a packet of mead yeast (e.g. M05), and yeast nutrient.'},
  {t:'Clean, then sanitise',d:'Clean everything that will touch the must with an oxygen cleaner, then sanitise with a no-rinse acid sanitiser (Chemipro SAN or Star San). Don\'t skip either — wild yeast and bacteria are the #1 cause of off-flavours.'},
  {t:'Mix the must & take OG',d:'Stir the honey into room-temperature water until fully dissolved; top up to your target volume. Take a hydrometer reading — that\'s your Original Gravity (OG), usually 1.090–1.110. Don\'t heat the honey; it drives off the aromatics.'},
  {t:'Pitch the yeast',d:'Sprinkle dry mead yeast over the surface (or rehydrate per the packet). Seal with the airlock filled to the line, and keep it somewhere stable at 18–22 °C.'},
  {t:'Feed it (days 1–3)',d:'Honey is nutrient-poor, so add yeast nutrient in stages over the first few days — see the Nutrient Protocols guide for SNA/TOSNA. All nutrient goes in before the 1/3 sugar break.'},
  {t:'Let it ferment',d:'Bubbling starts within a day or two and slows over 2–4 weeks. Take a gravity reading every few days. Resist opening the vessel — temperature stability matters more than fussing.'},
  {t:'Rack to secondary',d:'When gravity is stable, siphon the mead off the sediment (lees) into a clean vessel, leaving the gunk behind. Optionally add a pinch of K-meta to guard against oxidation.'},
  {t:'Age it',d:'Mead is transformed by time. Leave it months — a year or more for big ones — in a cool, dark place with minimal headspace. It will clear and the harshness will mellow.'},
  {t:'Bottle',d:'Two identical gravity readings a few days apart mean it\'s done. Sanitise bottles, siphon in with minimal headspace, cap, and label with the batch, date, OG/FG and ABV.'},
  {t:'Taste & learn',d:'Pour, observe, smell, taste — and write it down. Most meads keep improving for 6–12 months. Your notes are how the next batch gets better.'}
];
function renderBeginnerHowto(){
  var steps=BEGINNER_HOWTO.map(function(s,i){
    return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:var(--bg4);border:1px solid var(--gold);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:12px">'+(i+1)+'</div>'
      +'<div><div style="font-size:14px;color:var(--text);font-weight:500;margin-bottom:2px">'+escHtml(s.t)+'</div><div style="font-size:13px;color:var(--text2);line-height:1.6">'+escHtml(s.d)+'</div></div>'
    +'</div>';
  }).join('');
  return'<details class="card" open style="margin-bottom:20px;border-left:3px solid var(--gold)"><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px"><span style="font-size:22px">🍯</span><div style="flex:1"><div class="card-title" style="font-size:15px">HOW TO MAKE MEAD — A BEGINNER\'S FIRST BATCH</div><div style="font-size:12px;color:var(--text3);font-style:italic;margin-top:2px">A complete walkthrough, from empty fermenter to first tasting</div></div><span style="color:var(--text3);font-size:14px">▾</span></summary>'
    +'<div style="margin-top:12px">'+steps+'</div></details>';
}
// Topic detail opens in a modal so the grid stays a tidy set of small cards.
function openGuideSection(i){
  var s=GUIDE_SECTIONS()[i];
  if(!s)return;
  closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">'+s.icon+' '+escHtml(s.title.toUpperCase())+'</div>'
    +'<div style="font-size:14px;color:var(--text2);line-height:1.8;white-space:pre-line">'+escHtml(s.content)+'</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function renderGuide(){
  var sections=GUIDE_SECTIONS();
  var cards=sections.map(function(s,i){
    if(s.type==='honey-library')return'';
    var teaser=String(s.content||'').replace(/\s+/g,' ').trim().slice(0,104);
    return'<div class="card" style="cursor:pointer;margin:0" onclick="openGuideSection('+i+')">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:20px">'+s.icon+'</span><div class="card-title" style="font-size:12.5px">'+escHtml(s.title.toUpperCase())+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);line-height:1.5">'+escHtml(teaser)+'…</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1px;margin-top:10px">READ →</div>'
    +'</div>';
  }).join('');
  return'<div class="page-title">Mead Guide</div><div class="page-subtitle">The Beginner Meadwright\'s Compendium</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +renderBeginnerHowto()
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:6px 0 12px">TOPICS · tap to read</div>'
    +'<div class="grid-3">'+cards+'</div>';
}

// ==================== CIDER GUIDE ====================
// Same structure as the Mead Guide above, keyed off CIDER_BEGINNER_HOWTO /
// CIDER_GUIDE_SECTIONS() in 01-state.js. proseL() is called explicitly here
// (rather than relying solely on translateChrome's whole-text-node pass) —
// safer against the whitespace-mismatch translation gaps found elsewhere in
// this codebase for HTML-template-generated text nodes.
function renderCiderBeginnerHowto(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var steps=CIDER_BEGINNER_HOWTO.map(function(s,i){
    return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:var(--bg4);border:1px solid var(--gold);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:12px">'+(i+1)+'</div>'
      +'<div><div style="font-size:14px;color:var(--text);font-weight:500;margin-bottom:2px">'+escHtml(proseL(s.t))+'</div><div style="font-size:13px;color:var(--text2);line-height:1.6">'+escHtml(proseL(s.d))+'</div></div>'
    +'</div>';
  }).join('');
  return'<details class="card" open style="margin-bottom:20px;border-left:3px solid var(--gold)"><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px"><span style="font-size:22px">🍎</span><div style="flex:1"><div class="card-title" style="font-size:15px">'+(nl?'HOE MAAK JE CIDER — EERSTE BROUWSEL VOOR BEGINNERS':'HOW TO MAKE CIDER — A BEGINNER\'S FIRST BATCH')+'</div><div style="font-size:12px;color:var(--text3);font-style:italic;margin-top:2px">'+(nl?'Een complete wandeling, van lege vergister tot eerste proeverij':'A complete walkthrough, from empty fermenter to first tasting')+'</div></div><span style="color:var(--text3);font-size:14px">▾</span></summary>'
    +'<div style="margin-top:12px">'+steps+'</div></details>';
}
function openCiderGuideSection(i){
  var s=CIDER_GUIDE_SECTIONS()[i];
  if(!s)return;
  closeModal();
  var title=proseL(s.title).toUpperCase();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">'+s.icon+' '+escHtml(title)+'</div>'
    +'<div style="font-size:14px;color:var(--text2);line-height:1.8;white-space:pre-line">'+escHtml(proseL(s.content))+'</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function renderCiderGuide(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var sections=CIDER_GUIDE_SECTIONS();
  var cards=sections.map(function(s,i){
    var content=proseL(s.content);
    var title=proseL(s.title).toUpperCase();
    var teaser=String(content||'').replace(/\s+/g,' ').trim().slice(0,104);
    return'<div class="card" style="cursor:pointer;margin:0" onclick="openCiderGuideSection('+i+')">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:20px">'+s.icon+'</span><div class="card-title" style="font-size:12.5px">'+escHtml(title)+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);line-height:1.5">'+escHtml(teaser)+'…</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1px;margin-top:10px">'+(nl?'LEZEN →':'READ →')+'</div>'
    +'</div>';
  }).join('');
  return'<div class="page-title">'+(nl?'Cider Gids':'Cider Guide')+'</div><div class="page-subtitle">'+(nl?'Het Compendium voor de Beginnende Cidermaker':'The Beginner Cidermaker\'s Compendium')+'</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +renderCiderBeginnerHowto()
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:6px 0 12px">'+(nl?'ONDERWERPEN · tik om te lezen':'TOPICS · tap to read')+'</div>'
    +'<div class="grid-3">'+cards+'</div>';
}

// ==================== BOTTLE SCANNER ====================
// Opens the camera, watches for a QR code, and routes to the matching batch.
//
// Detection strategy:
//   1. Try the native BarcodeDetector API first (Chrome/Edge on Android,
//      Safari 17+). When available it's faster and more accurate because the
//      browser delegates to the OS image-processing pipeline.
//   2. Fall back to jsQR, a pure-JS QR decoder loaded lazily from a CDN. This
//      works on every browser that supports getUserMedia + canvas — basically
//      everything modern, including desktop Chrome on macOS where
//      BarcodeDetector isn't implemented.
//
// The QR codes on bottle/storage labels contain the full share URL
// (e.g. .../meadows.html#share=2024-001). We extract the batch ref via regex
// and pass it through findBatchByRef so legacy hex-id URLs still work.

function openBottleScanner(){
  closeModal();
  window._bottleScanner={stream:null,active:false,interval:null,detector:null,jsqrLoading:null};
  renderBottleScannerModal();
  setTimeout(startBottleScanner,100);
}

function renderBottleScannerModal(){
  closeModal();
  // Always show the camera UI — we'll figure out which decode path works at
  // runtime. The old "your browser doesn't support" message fired for every
  // desktop Chrome and Firefox user even though jsQR works there fine.
  var html='<div class="modal-overlay" onclick="if(event.target===this){stopBottleScanner();closeModal();}"><div class="modal" style="max-width:560px;display:flex;flex-direction:column">'
    +'<div class="modal-title">📷 SCAN BOTTLE QR</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Point your camera at a QR code on a bottle or storage label. The batch opens automatically once detected.</div>'
    +'<div style="position:relative;background:#000;border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3;margin-bottom:14px">'
    +'<video id="bs-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;display:block"></video>'
    // Hidden canvas — used by the jsQR fallback path to extract image data
    // from video frames. Kept out of the DOM flow with display:none.
    +'<canvas id="bs-canvas" style="display:none"></canvas>'
    +'<div id="bs-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">'
    +'<div style="width:60%;aspect-ratio:1;border:2px solid var(--gold2);border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35)"></div>'
    +'</div>'
    +'<div id="bs-status" style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:rgba(0,0,0,0.7);color:var(--gold2);font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-align:center">INITIALISING…</div>'
    +'</div>'
    +'<div style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.55;text-align:center">Or paste a share URL if the camera isn\'t cooperating:</div>'
    +'<input type="text" id="bs-fallback-url" placeholder="https://your-meados-server/share/&lt;token&gt;" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px;font-family:var(--font-mono);margin-bottom:10px" onkeydown="if(event.key===\'Enter\')handleBottleScannerURL(this.value)">'
    +'<button class="btn btn-secondary btn-sm" onclick="handleBottleScannerURL(document.getElementById(\'bs-fallback-url\').value)" style="width:100%">Open from pasted URL</button>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="stopBottleScanner();closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// Lazy-load jsQR from a CDN. Pinned version + integrity-by-version so a
// CDN compromise can't silently swap in malicious code. Cached on
// window.jsQR after first load so re-opening the scanner is instant.
function loadJsQR(){
  if(window.jsQR)return Promise.resolve(window.jsQR);
  if(window._bottleScanner&&window._bottleScanner.jsqrLoading)return window._bottleScanner.jsqrLoading;
  var p=new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src='/jsQR.min.js';
    s.async=true;
    s.onload=function(){
      if(window.jsQR)resolve(window.jsQR);
      else reject(new Error('jsQR loaded but window.jsQR undefined'));
    };
    s.onerror=function(){reject(new Error('Failed to load jsQR from CDN'));};
    document.head.appendChild(s);
  });
  if(window._bottleScanner)window._bottleScanner.jsqrLoading=p;
  return p;
}

async function startBottleScanner(){
  var video=document.getElementById('bs-video');
  var status=document.getElementById('bs-status');
  if(!video)return;

  // Step 1 — open the camera. This is the same on every code path. If it
  // fails (permission denied, no camera, insecure context), report and stop.
  try{
    var stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    window._bottleScanner.stream=stream;
    video.srcObject=stream;
    await video.play();
  }catch(e){
    if(status){
      // Common cases: NotAllowedError (user denied), NotFoundError (no camera),
      // NotReadableError (camera busy). Insecure context errors have a
      // distinctive message — surface that hint explicitly.
      var msg=String(e&&e.message||e);
      if(/secure context|https/i.test(msg))status.textContent='⚠ Camera needs HTTPS — load this app via your HA URL, not the LAN IP';
      else if(/not allowed|denied/i.test(msg))status.textContent='⚠ Camera access denied — grant permission in browser settings';
      else if(/not found/i.test(msg))status.textContent='⚠ No camera detected on this device';
      else status.textContent='⚠ '+msg;
      status.style.color='var(--red2)';
    }
    return;
  }

  // Step 2 — pick a decoder. Native is faster on supported browsers, jsQR
  // works everywhere else. If neither path can be set up, show the URL paste
  // box as the only option.
  var useNative=false;
  if(typeof BarcodeDetector!=='undefined'){
    try{
      // Some browsers expose BarcodeDetector but throw when you actually try
      // to construct one (e.g. macOS Chrome doesn't bundle the underlying
      // decoder library). Guard with a try/catch and ALSO probe getSupportedFormats.
      window._bottleScanner.detector=new BarcodeDetector({formats:['qr_code']});
      // Probe — does this detector actually do anything?
      if(BarcodeDetector.getSupportedFormats){
        var fmts=await BarcodeDetector.getSupportedFormats();
        if(Array.isArray(fmts)&&fmts.indexOf('qr_code')>=0)useNative=true;
      }else{
        useNative=true; // assume yes if no probe method exists
      }
    }catch(e){useNative=false;}
  }

  if(status){
    status.style.color='var(--gold2)';
    status.textContent=useNative?'SCANNING (native)…':'LOADING DECODER…';
  }

  // Load jsQR up-front even if native is available — gives instant fallback
  // if native silently fails. Non-blocking.
  if(!useNative){
    try{
      await loadJsQR();
      if(status)status.textContent='SCANNING…';
    }catch(e){
      if(status){
        status.textContent='⚠ Couldn\'t load decoder — check network or paste URL below';
        status.style.color='var(--red2)';
      }
      return;
    }
  }

  // Step 3 — start the scan loop.
  window._bottleScanner.active=true;
  window._bottleScanner.interval=setInterval(function(){
    if(!window._bottleScanner.active)return;
    if(useNative)scanFrameNative(video,status);
    else scanFrameJsQR(video,status);
  },350);
}

async function scanFrameNative(video,status){
  try{
    var barcodes=await window._bottleScanner.detector.detect(video);
    if(barcodes&&barcodes.length){
      var qr=barcodes[0].rawValue||'';
      if(status)status.textContent='✓ FOUND — opening';
      handleBottleScannerURL(qr);
    }
  }catch(e){}
}

function scanFrameJsQR(video,status){
  if(!window.jsQR||video.readyState<2)return;
  var canvas=document.getElementById('bs-canvas');
  if(!canvas)return;
  // Match canvas to current video dimensions. Reading these every frame is
  // cheap and handles orientation/zoom changes mid-scan.
  var w=video.videoWidth,h=video.videoHeight;
  if(!w||!h)return;
  canvas.width=w;canvas.height=h;
  var ctx=canvas.getContext('2d');
  ctx.drawImage(video,0,0,w,h);
  try{
    var imageData=ctx.getImageData(0,0,w,h);
    // dontInvert is faster — bottle labels print dark on light, no need
    // to also check the inverted form.
    var result=window.jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'dontInvert'});
    if(result&&result.data){
      if(status)status.textContent='✓ FOUND — opening';
      handleBottleScannerURL(result.data);
    }
  }catch(e){}
}

function stopBottleScanner(){
  if(!window._bottleScanner)return;
  window._bottleScanner.active=false;
  if(window._bottleScanner.interval){clearInterval(window._bottleScanner.interval);window._bottleScanner.interval=null;}
  if(window._bottleScanner.stream){
    window._bottleScanner.stream.getTracks().forEach(function(t){t.stop();});
    window._bottleScanner.stream=null;
  }
  window._bottleScanner.detector=null;
}

function handleBottleScannerURL(url){
  url=String(url||'').trim();
  if(!url){toast('⚠ Nothing to open');return;}
  var batch=null;
  // Current label QR form: /share/<token>. Resolve the token to a batch via the
  // owner's local shareTokens map (the owner is the one scanning in-app).
  var pm=/\/share\/([A-Za-z0-9_-]+)/.exec(url);
  if(pm){
    var bid=(APP.shareTokens||{})[decodeURIComponent(pm[1])];
    if(bid)batch=APP.batches.find(function(b){return b.id===bid;});
  }
  if(!batch){
    // Legacy hash forms: #share=<ref> / #batch=<ref> (serial or hex id).
    var m=/#(?:share|batch)=([^&]+)/.exec(url);
    if(m){
      var ref=decodeURIComponent(m[1]);
      batch=(typeof findBatchByRef==='function')?findBatchByRef(ref):APP.batches.find(function(b){return b.id===ref;});
    }
  }
  if(!batch){toast('⚠ URL doesn\'t match any batch in this database');return;}
  stopBottleScanner();
  closeModal();
  showView('batch',batch.id);
}
