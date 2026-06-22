// ==========================================================================
// Storage-budget breakdown + card (split out of 14-bootstrap.js).
// ==========================================================================

// ==================== STORAGE BUDGET ====================
// Computes a breakdown of the synced JSON payload so the user can see what's
// taking up space and how close they are to their mode's limit.
// Uploaded images (data: URLs) bloat the payload; media-source IDs are tiny.

function computeStorageBreakdown(){
  var pkg=(typeof packageState==='function')?packageState():null;
  if(!pkg)return null;
  var fullJson=JSON.stringify(pkg);
  var total=fullJson.length;
  // Compute the data: URL portion of customLabels + brandLogo (these are the
  // big-ticket items — full base64-encoded images).
  var labels=(pkg.sharedSettings&&pkg.sharedSettings.customLabels)||{};
  var dataLabelBytes=0,mediaLabelCount=0,urlLabelCount=0,dataLabelCount=0;
  Object.keys(labels).forEach(function(k){
    var v=labels[k]||'';
    if(typeof v!=='string')return;
    if(v.indexOf('data:')===0){dataLabelBytes+=v.length;dataLabelCount++;}
    else if(v.indexOf('media-source://')===0)mediaLabelCount++;
    else if(v.length>0)urlLabelCount++;
  });
  // Brand logo
  var brandLogo=(pkg.sharedSettings&&pkg.sharedSettings.brandLogo)||'';
  var brandLogoBytes=0,brandLogoKind='none';
  if(typeof brandLogo==='string'&&brandLogo){
    if(brandLogo.indexOf('data:')===0){brandLogoBytes=brandLogo.length;brandLogoKind='data';}
    else if(brandLogo.indexOf('media-source://')===0)brandLogoKind='media';
    else brandLogoKind='url';
  }
  // Limit — the SQLite server stores far more than this without complaint,
  // but the localStorage offline cache and page-load time degrade past a few
  // MB. 5 MB is a safe soft warning threshold.
  var mode='server';
  var limit=5*1024*1024;
  var limitNote='offline-cache soft limit';
  // Label Studio designs (+ saved layouts) carry the bottle-label art. Embedded
  // data: URLs cost storage (and used to be mislabelled as "core data"); /assets
  // references are free.
  var studioImgBytes=0,studioImgCount=0,studioRefCount=0;
  function _scanDesign(d){
    if(!d)return;
    ['front','back'].forEach(function(side){
      var s=d[side];if(!s)return;
      function tally(v){if(typeof v!=='string'||!v)return;if(v.indexOf('data:')===0){studioImgBytes+=v.length;studioImgCount++;}else if(v.indexOf('/assets/')===0||v.indexOf('/labels/')===0)studioRefCount++;}
      tally(s.bgImage);
      (s.elements||[]).forEach(function(el){if(el)tally(el.src);});
    });
  }
  var studio=(pkg.sharedSettings&&pkg.sharedSettings.labelStudio)||{};
  Object.keys(studio).forEach(function(k){_scanDesign(studio[k]);});
  ((pkg.sharedSettings&&pkg.sharedSettings.labelLayouts)||[]).forEach(_scanDesign);
  var imagesBytes=dataLabelBytes+brandLogoBytes+studioImgBytes;
  var coreBytes=total-imagesBytes;
  return{
    total:total,
    coreBytes:coreBytes,
    imagesBytes:imagesBytes,
    dataLabelBytes:dataLabelBytes,
    dataLabelCount:dataLabelCount,
    mediaLabelCount:mediaLabelCount,
    urlLabelCount:urlLabelCount,
    brandLogoBytes:brandLogoBytes,
    brandLogoKind:brandLogoKind,
    studioImgBytes:studioImgBytes,
    studioImgCount:studioImgCount,
    studioRefCount:studioRefCount,
    mode:mode,
    limit:limit,
    limitNote:limitNote,
    pct:Math.min(100,total/limit*100)
  };
}

function fmtBytes(n){
  if(n<1024)return n+' B';
  if(n<1024*1024)return(n/1024).toFixed(1)+' KB';
  return(n/1024/1024).toFixed(2)+' MB';
}

function renderStorageBudgetCard(){
  var b=computeStorageBreakdown();
  if(!b)return'';
  // Color zones based on % usage
  var barColor='var(--green2)',statusLabel='Healthy',statusColor='var(--green2)';
  if(b.pct>85){barColor='var(--red2)';statusLabel='Near limit';statusColor='var(--red2)';}
  else if(b.pct>60){barColor='var(--gold2)';statusLabel='Watch';statusColor='var(--gold2)';}
  // Breakdown rows
  var rows=[];
  rows.push({label:'Core data (batches, logs, supplies, etc.)',bytes:b.coreBytes,color:'var(--text2)'});
  if(b.dataLabelCount>0)rows.push({label:b.dataLabelCount+' uploaded label'+(b.dataLabelCount===1?'':'s')+' (data URLs)',bytes:b.dataLabelBytes,color:'var(--gold2)'});
  if(b.brandLogoBytes>0)rows.push({label:'Uploaded brand logo',bytes:b.brandLogoBytes,color:'var(--gold2)'});
  if(b.studioImgCount>0)rows.push({label:b.studioImgCount+' Label Studio image'+(b.studioImgCount===1?'':'s')+' (data URLs — reload to optimise)',bytes:b.studioImgBytes,color:'var(--gold2)'});
  // Storage-free items get a separate informational note
  var freeItems=[];
  if(b.mediaLabelCount>0)freeItems.push(b.mediaLabelCount+' HA Media label'+(b.mediaLabelCount===1?'':'s'));
  if(b.urlLabelCount>0)freeItems.push(b.urlLabelCount+' URL-referenced label'+(b.urlLabelCount===1?'':'s'));
  if(b.studioRefCount>0)freeItems.push(b.studioRefCount+' Label Studio image'+(b.studioRefCount===1?'':'s')+' (/assets)');
  if(b.brandLogoKind==='media')freeItems.push('brand logo (HA Media)');
  if(b.brandLogoKind==='url')freeItems.push('brand logo (URL)');
  // Recommendation
  var recommendation='';
  if(b.dataLabelCount>=3){
    recommendation='<div style="margin-top:10px;padding:10px;background:rgba(201,163,80,0.08);border-left:3px solid var(--gold);border-radius:3px;font-size:12px;color:var(--text2)">'
      +'<strong style="color:var(--gold2)">Tip:</strong> '+b.dataLabelCount+' uploaded labels are riding the synced blob ('+fmtBytes(b.dataLabelBytes)+'). For tighter syncs and easier backups, drop those PNGs into <code>/config/media/labels/</code> and re-pick them via the 🗂 HA Media tab. Media-source picks add ~60 bytes regardless of image size.'
      +'</div>';
  }else if(b.pct>85){
    recommendation='<div style="margin-top:10px;padding:10px;background:rgba(199,80,80,0.08);border-left:3px solid var(--red2);border-radius:3px;font-size:12px;color:var(--text2)">'
      +'<strong style="color:var(--red2)">Approaching capacity.</strong> Consider replacing uploaded labels with URL or HA-media references, or trimming old batches.'
      +'</div>';
  }
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📊 STORAGE BUDGET</div></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
    +'<div style="font-family:var(--font-display);font-size:18px;color:var(--text)">'+fmtBytes(b.total)+'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:'+statusColor+';letter-spacing:0.5px">'+statusLabel.toUpperCase()+' · '+b.pct.toFixed(1)+'%</div>'
    +'</div>'
    // Progress bar
    +'<div style="background:var(--bg4);border-radius:3px;overflow:hidden;height:8px;margin-bottom:6px">'
    +'<div style="background:'+barColor+';height:100%;width:'+b.pct.toFixed(1)+'%;transition:width 0.3s"></div>'
    +'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:14px">'
    +'of '+fmtBytes(b.limit)+' · '+escHtml(b.limitNote)
    +'</div>'
    // Breakdown table
    +(rows.length>0?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:6px">BREAKDOWN</div>':'')
    +rows.map(function(r){
      return'<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12.5px;color:var(--text2);border-bottom:1px solid var(--bg4)">'
        +'<span style="color:'+r.color+'">'+escHtml(r.label)+'</span>'
        +'<span style="font-family:var(--font-mono);color:var(--text)">'+fmtBytes(r.bytes)+'</span>'
        +'</div>';
    }).join('')
    +(freeItems.length>0?'<div style="margin-top:10px;padding:8px 10px;background:var(--bg);border-radius:3px;font-size:11.5px;color:var(--text3);font-style:italic">'
      +'+ '+escHtml(freeItems.join(', '))+' — references only, no storage cost'
      +'</div>':'')
    +recommendation
    +'<button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%;justify-content:center" onclick="openSnapshotRestoreModal()" title="Roll back all your data to a recent saved snapshot">🕘 Restore from snapshot…</button>'
    +'</div>';
}
