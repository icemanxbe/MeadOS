// ==========================================================================
// Cellar misc: test notification, yeast-attenuation analytics, storage helpers, external-access password, tasting-wheel overlay.
// Split out of the former 10-cellar-supplies.js. Globals, no behaviour change.
// ==========================================================================

// ==================== TEST NOTIFICATION ====================
async function testNotification(){
  // Read directly from the settings inputs so the user doesn't have to click Save first
  var svcInput=document.getElementById('set-notify');
  var svc=(svcInput&&svcInput.value.trim())||APP.settings.notificationService;
  if(!svc){toast('⚠ Enter notification service first');return;}
  if(!haConfigured()){toast('⚠ Configure HA first');return;}
  toast('Sending test…');
  var ok=await haCallService('notify',svc,{
    title:'⚗ MeadOS Test',
    message:'Push notifications are working. Your mead awaits.',
    data:{tag:'meados-test'}
  });
  toast(ok?'✓ Test sent — check your phone':'✗ Failed — verify the service name');
}


// ==================== YEAST ATTENUATION ANALYTICS ====================
function calcAttenuationStats(){
  var bottled=APP.batches.filter(function(b){return APP.bottling[b.id]&&b.og&&(APP.bottling[b.id].fg||(getBatchLogs(b.id)).length);});
  if(!bottled.length)return null;
  var vals=bottled.map(function(b){
    var bot=APP.bottling[b.id];
    var fg=bot.fg||(APP.logs[b.id]&&APP.logs[b.id].length?APP.logs[b.id][APP.logs[b.id].length-1].gravity:null);
    if(!fg||!b.og||b.og<=fg)return null;
    return{
      name:b.name,
      og:b.og,
      fg:fg,
      attenuation:((b.og-fg)/(b.og-1))*100,
      color:getBatchColor(b)
    };
  }).filter(Boolean);
  if(!vals.length)return null;
  var avg=vals.reduce(function(s,v){return s+v.attenuation;},0)/vals.length;
  var min=Math.min.apply(null,vals.map(function(v){return v.attenuation;}));
  var max=Math.max.apply(null,vals.map(function(v){return v.attenuation;}));
  return{avg:avg,min:min,max:max,count:vals.length,batches:vals};
}

// ==================== STORAGE HELPERS ====================
async function verifyServerStorage(){
  var st=document.getElementById('conn-status');
  if(st)st.innerHTML='<span style="color:var(--text2)">⟳ Verifying…</span>';
  var results=[];
  var res=await apiFetch('/api/health');
  if(res&&res.ok){
    try{
      var h=await res.json();
      results.push('✓ <strong>server</strong>: reachable · SQLite database <code>'+escHtml(h.db||'meados.db')+'</code>');
      if(h.found)results.push('✓ <strong>stored state</strong>: '+((h.bytes||0)/1024).toFixed(1)+' KB · updated '+(h.updatedAt?fmtDateTime(h.updatedAt):'unknown')+(h.historyCount?' · '+h.historyCount+' snapshot'+(h.historyCount===1?'':'s')+' in history':''));
      else results.push('⊘ <strong>stored state</strong>: empty — nothing saved yet');
    }catch(e){
      results.push('✗ <strong>server</strong>: unexpected response');
    }
  }else{
    results.push('✗ <strong>server</strong>: unreachable — is server.py running?');
  }
  var ls=localStorage.getItem('meadows_data');
  if(ls)results.push('✓ <strong>local cache</strong>: '+(ls.length/1024).toFixed(1)+' KB');
  else results.push('✗ <strong>local cache</strong>: empty');
  if(st)st.innerHTML='<div style="font-size:12px;line-height:1.8">'+results.join('<br>')+'</div>';
}
var verifyHAStorage=verifyServerStorage; // legacy name

// ==================== EXTERNAL ACCESS PASSWORD ====================
// Server-enforced: when a password is set, requests from outside the LAN
// must pass HTTP Basic auth (the browser's native password prompt). LAN
// clients are never prompted, and only LAN clients may change the password.
async function refreshSecurityStatus(){
  var el=document.getElementById('security-status');
  if(!el)return;
  var res=await apiFetch('/api/security');
  if(!res||!res.ok){el.innerHTML='Server unreachable — status unknown.';return;}
  var s=null;
  try{s=await res.json();}catch(e){}
  if(!s){el.textContent='—';return;}
  var status=s.protected
    ?'<span style="color:var(--green2)">✓ Enabled.</span> Connections from outside the LAN get a styled login page. LAN devices are not asked'+(s.lanRequiresPassword?' — except you\'ve required it on LAN too.':' (unless you require it below).')
    :'<span style="color:var(--text2)">Off.</span> Anyone who can reach the server has full access (fine on a trusted LAN; enable this before exposing the server externally).';
  // Show how THIS connection is classified — makes proxy/CDN/hairpin issues
  // (public client IPs on requests that are really yours) self-diagnosing.
  status+='<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-top:6px">This connection appears as <span style="color:var(--text2)">'+escHtml(s.ip||'?')+'</span> → '+(s.lan?'<span style="color:var(--green2)">LAN</span>':'<span style="color:var(--honey)">EXTERNAL</span>')+'</div>';
  var controls='';
  if(s.lan){
    controls='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">'
      +'<input class="form-input" id="sec-password" type="password" placeholder="'+(s.protected?'New password':'Choose a password')+'" style="max-width:240px" onkeydown="if(event.key===\'Enter\')setExternalPassword()">'
      +'<button class="btn btn-secondary btn-sm" data-action="setExternalPassword">'+(s.protected?'Change password':'Enable')+'</button>'
      +(s.protected?'<button class="btn btn-danger btn-sm" data-action="disableExternalPassword">Disable</button>':'')
      +'</div>'
      +(s.protected?'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text2);cursor:pointer;margin-top:10px"><input type="checkbox" id="sec-lan-req" '+(s.lanRequiresPassword?'checked':'')+' onchange="saveLanRequiresPassword()" style="cursor:pointer"> Require the password on LAN devices too (no automatic bypass)</label>':'')
      +'<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px;margin-bottom:6px">TRUSTED NETWORKS — COUNT AS LAN</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      +'<input class="form-input" id="sec-trusted" type="text" placeholder="e.g. 100.64.0.0/10, 81.x.x.x/32" value="'+escHtml((s.trustedNets||[]).join(', '))+'" style="max-width:340px;font-family:var(--font-mono);font-size:12px">'
      +'<button class="btn btn-secondary btn-sm" data-action="saveTrustedNetworks">Save</button>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text2);cursor:pointer;margin-top:8px"><input type="checkbox" id="sec-trust-cf" '+(s.trustCf?'checked':'')+' onchange="saveTrustedNetworks()" style="cursor:pointer"> Behind Cloudflare: identify clients via the <code style="font-size:11px">CF-Connecting-IP</code> header</label>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:6px;font-style:italic;line-height:1.5">Comma-separated CIDRs that never get the password prompt — your WAN IP for hairpin access, VPN ranges, Tailscale (add 100.64.0.0/10). Standard private ranges (10.x, 172.16-31.x, 192.168.x) always count as LAN. Only enable the Cloudflare option if the domain actually goes through Cloudflare — otherwise the header is spoofable.</div>'
      +'</div>';
  }else{
    controls='<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">You are connected from outside the LAN — these settings can only be changed from a device inside the LAN.</div>';
  }
  el.innerHTML=status+controls;
}

async function setExternalPassword(){
  var inp=document.getElementById('sec-password');
  var pw=inp?inp.value:'';
  if(!pw||pw.length<4){toast('⚠ Password must be at least 4 characters');return;}
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(res&&res.ok){toast('🔒 External access password set');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed to set password');
}

async function saveLanRequiresPassword(){
  var cb=document.getElementById('sec-lan-req');
  var on=!!(cb&&cb.checked);
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lanRequiresPassword:on})});
  if(res&&res.ok){toast(on?'🔒 LAN devices will need the password (applies on next load)':'LAN devices no longer need the password');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

async function saveTrustedNetworks(){
  var inp=document.getElementById('sec-trusted');
  var cf=document.getElementById('sec-trust-cf');
  var nets=(inp?inp.value:'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trustedNets:nets,trustCf:!!(cf&&cf.checked)})});
  if(res&&res.ok){toast('✓ Trusted networks saved');refreshSecurityStatus();}
  else if(res&&res.status===400){var e=null;try{e=await res.json();}catch(x){}toast('⚠ '+((e&&e.error)||'Invalid network'));}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

async function disableExternalPassword(){
  if(!confirm('Disable the external access password?\n\nAnyone who can reach the server will have full access again.'))return;
  var res=await apiFetch('/api/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:''})});
  if(res&&res.ok){toast('External access password disabled');refreshSecurityStatus();}
  else if(res&&res.status===403)toast('⚠ Only possible from inside the LAN');
  else toast('⚠ Failed');
}

// ==================== TASTING WHEEL OVERLAY ====================
// Renders multiple batches' latest tasting wheels overlaid on a single radar
// for direct comparison. Each batch is a translucent polygon in its color.
function renderTastingOverlayRadar(batches){
  if(!batches||!batches.length||typeof TASTING_AXES==='undefined')return'';
  var size=300,cx=size/2,cy=size/2,r=size/2-44;
  var n=TASTING_AXES.length;
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(level/5);
      return(cx+Math.cos(angle)*dist).toFixed(1)+','+(cy+Math.sin(angle)*dist).toFixed(1);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>';
  }).join('');
  // Axis lines
  var axes=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var ex=cx+Math.cos(angle)*r;
    var ey=cy+Math.sin(angle)*r;
    return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex.toFixed(1)+'" y2="'+ey.toFixed(1)+'" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>';
  }).join('');
  // Axis labels
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+22);
    var ly=cy+Math.sin(angle)*(r+22)+4;
    return'<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle" fill="#a89880" font-family="ui-monospace,monospace" font-size="10" style="text-transform:uppercase;letter-spacing:1px">'+ax.label+'</text>';
  }).join('');
  // Each batch's polygon
  var polygons=batches.map(function(b){
    var color=getBatchColor(b);
    var tastings=APP.tastings[b.id]||[];
    var latest=tastings[tastings.length-1];
    if(!latest||!latest.wheel)return'';
    var pts=TASTING_AXES.map(function(ax,i){
      var v=latest.wheel[ax.key]||0;
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(v/5);
      return(cx+Math.cos(angle)*dist).toFixed(1)+','+(cy+Math.sin(angle)*dist).toFixed(1);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="'+color+'" fill-opacity="0.18" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/>'
      +TASTING_AXES.map(function(ax,i){
        var v=latest.wheel[ax.key]||0;
        if(!v)return'';
        var angle=(Math.PI*2*i/n)-Math.PI/2;
        var dist=r*(v/5);
        return'<circle cx="'+(cx+Math.cos(angle)*dist).toFixed(1)+'" cy="'+(cy+Math.sin(angle)*dist).toFixed(1)+'" r="3" fill="'+color+'"/>';
      }).join('');
  }).join('');
  var legend=batches.map(function(b){
    var color=getBatchColor(b);
    var tastings=APP.tastings[b.id]||[];
    var latest=tastings[tastings.length-1];
    return'<div style="display:flex;align-items:center;gap:8px;padding:5px 0">'
      +'<div style="width:14px;height:14px;background:'+color+';border-radius:50%;flex-shrink:0"></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:'+color+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(b.name)+'</div>'
      +'<div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">'+(latest&&latest.date?fmtDate(latest.date):'—')+(latest&&latest.rating?' · '+latest.rating+'★':'')+'</div></div>'
      +'</div>';
  }).join('');
  // viewBox expanded for label space (same approach as the standalone radar)
  return'<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px;align-items:center">'
    +'<div style="max-width:380px;margin:0 auto;width:100%">'
    +'<svg viewBox="-50 -10 400 320" width="100%" overflow="visible" style="display:block;overflow:visible" preserveAspectRatio="xMidYMid meet">'
    +rings+axes+polygons+labels
    +'</svg></div>'
    +'<div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">BATCHES</div>'
    +legend+'</div>'
    +'</div>';
}
