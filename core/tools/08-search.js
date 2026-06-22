// ==========================================================================
// Global search.
// Split out of the former 08-tools.js. Globals, no behaviour change.
// ==========================================================================

// ==================== GLOBAL SEARCH ====================
// Cross-everything search: batches, batch notes, tasting notes, addition
// notes, supply names/notes, custom recipes. Opens as a modal with a single
// input that filters in real time and groups results by type. Pressing Enter
// on the first result (or clicking) navigates to it.
//
// Triggered from the topbar search button or via Ctrl/Cmd-K. State lives on
// window._globalSearch = { query: '' } for the modal's lifetime.

function openGlobalSearch(){
  window._globalSearch={query:''};
  renderGlobalSearchModal();
  setTimeout(function(){
    var el=document.getElementById('gs-input');
    if(el)el.focus();
  },80);
}

function renderGlobalSearchModal(){
  closeModal();
  var q=(window._globalSearch&&window._globalSearch.query)||'';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()" id="gs-overlay">'
    +'<div class="modal" style="max-width:720px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🔍 SEARCH EVERYTHING</div>'
    +'<input type="text" id="gs-input" placeholder="Search batches, tastings, notes, additions, supplies, recipes…" '
      +'value="'+escHtml(q)+'" oninput="window._globalSearch.query=this.value;updateGlobalSearchResults()" '
      +'onkeydown="if(event.key===\'Enter\')gsActivateFirstResult();if(event.key===\'Escape\')closeModal()" '
      +'style="width:100%;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:15px;font-family:inherit;margin-bottom:12px">'
    +'<div id="gs-hint" style="font-size:11px;color:var(--text3);font-style:italic;margin-bottom:10px;line-height:1.55">Tip: type a couple of words from anywhere in your journal — batch names, tasting flavors, addition notes, supplier names. Results group by type. Press <kbd style="background:var(--bg4);padding:1px 5px;border-radius:3px;font-family:var(--font-mono);font-size:10px">Enter</kbd> to open the top result.</div>'
    +'<div id="gs-results" style="flex:1;overflow-y:auto;min-height:200px"></div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateGlobalSearchResults();
}

// Cached "first result" id+kind so Enter can activate it from anywhere
var _gsFirstHit=null;

function updateGlobalSearchResults(){
  var container=document.getElementById('gs-results');
  if(!container)return;
  var q=((window._globalSearch&&window._globalSearch.query)||'').trim().toLowerCase();
  _gsFirstHit=null;
  if(!q){
    container.innerHTML='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Start typing to search across your whole journal.</div>';
    return;
  }
  var hits=performGlobalSearch(q);
  var totalCount=hits.batches.length+hits.tastings.length+hits.additions.length+hits.supplies.length+hits.recipes.length+hits.logs.length;
  if(!totalCount){
    container.innerHTML='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">No matches for "'+escHtml(q)+'".</div>';
    return;
  }

  function highlight(text,query){
    if(!text)return'';
    var t=String(text);
    var ql=query.toLowerCase();
    var idx=t.toLowerCase().indexOf(ql);
    if(idx<0)return escHtml(t);
    // Show ~80 chars of context around the match
    var ctxBefore=40,ctxAfter=60;
    var start=Math.max(0,idx-ctxBefore);
    var end=Math.min(t.length,idx+ql.length+ctxAfter);
    var pre=(start>0?'…':'')+t.slice(start,idx);
    var match=t.slice(idx,idx+ql.length);
    var post=t.slice(idx+ql.length,end)+(end<t.length?'…':'');
    return escHtml(pre)+'<mark style="background:rgba(232,196,106,0.35);color:var(--gold2);padding:0 2px;border-radius:2px">'+escHtml(match)+'</mark>'+escHtml(post);
  }

  function section(label,icon,items,renderItem,emptyText){
    if(!items.length)return'';
    return'<div style="margin-bottom:18px">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold);letter-spacing:2px;margin-bottom:8px">'+icon+' '+label+' · '+items.length+'</div>'
      +items.map(renderItem).join('')
      +'</div>';
  }

  var html='';
  // Capture the first activatable result so Enter knows what to open
  function recordFirst(action){if(!_gsFirstHit)_gsFirstHit=action;}

  html+=section('BATCHES','⚗',hits.batches,function(b){
    var act='showView(\'batch\',\''+b.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(b)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13.5px;color:'+getBatchColor(b)+'">'+highlight(b.name,q)+(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:1px 6px;border-radius:6px;margin-left:8px">#'+highlight(b.serial,q)+'</span>':'')+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(fmtDate(b.startDate))+' · '+escHtml(b.style||(APP.recipes.find(function(r){return r.id===b.recipeId;})||{}).style||'Custom')
      +(b.notes&&b.notes.toLowerCase().indexOf(q)>=0?'<br><span style="font-style:italic">'+highlight(b.notes,q)+'</span>':'')
      +'</div></div>';
  });
  html+=section('TASTING NOTES','🍷',hits.tastings,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.tasting.date)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">'+highlight(h.matchedText,q)+'</div>'
      +'</div>';
  });
  html+=section('LOG ENTRIES','📊',hits.logs,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.log.date)+(h.log.gravity?' · SG '+h.log.gravity:'')+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5;font-style:italic">'+highlight(h.log.note||'',q)+'</div>'
      +'</div>';
  });
  html+=section('ADDITIONS','➕',hits.additions,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.addition.date)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">'
      +highlight((h.addition.item||'')+(h.addition.amount?' · '+h.addition.amount:'')+(h.addition.notes?' — '+h.addition.notes:''),q)
      +'</div></div>';
  });
  html+=section('SUPPLIES','📦',hits.supplies,function(s){
    var act='showView(\'supplies\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid var(--gold);border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+highlight(s.name||'',q)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml((s.qty||0)+' '+(s.unit||''))+(s.notes?' · '+highlight(s.notes,q):'')+'</div>'
      +'</div>';
  });
  html+=section('RECIPES','📜',hits.recipes,function(r){
    var act='currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+(r.brandColor||'var(--gold)')+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+(r.brandColor||'var(--gold2)')+'">'+highlight(r.name,q)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(r.style+' · '+r.difficulty)+'</div>'
      +'</div>';
  });
  container.innerHTML=html;
}

function performGlobalSearch(q){
  var hits={batches:[],tastings:[],additions:[],supplies:[],recipes:[],logs:[]};
  if(!q)return hits;
  q=q.toLowerCase();
  // Batches — name, notes, style, serial
  (APP.batches||[]).forEach(function(b){
    var hay=(b.name+' '+(b.serial||'')+' '+(b.notes||'')+' '+(b.style||'')+' '+(b.honeyType||'')+' '+(b.yeast||'')).toLowerCase();
    if(hay.indexOf(q)>=0)hits.batches.push(b);
  });
  // Tastings — any text field
  Object.keys(APP.tastings||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.tastings[bid]||[]).forEach(function(t){
      var fields=[t.note,t.notes,t.color,t.aroma,t.flavor,t.finish].filter(Boolean);
      var combined=fields.join(' · ').toLowerCase();
      if(combined.indexOf(q)>=0){
        // Pick the field that contains the match for display
        var matched=fields.find(function(f){return f.toLowerCase().indexOf(q)>=0;})||fields.join(' · ');
        hits.tastings.push({batch:b,tasting:t,matchedText:matched});
      }
    });
  });
  // Log entries — note field
  Object.keys(APP.logs||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.logs[bid]||[]).forEach(function(l){
      if(l.note&&l.note.toLowerCase().indexOf(q)>=0)hits.logs.push({batch:b,log:l});
    });
  });
  // Additions
  Object.keys(APP.additions||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.additions[bid]||[]).forEach(function(a){
      var hay=((a.item||'')+' '+(a.amount||'')+' '+(a.notes||'')).toLowerCase();
      if(hay.indexOf(q)>=0)hits.additions.push({batch:b,addition:a});
    });
  });
  // Supplies
  (APP.supplies||[]).forEach(function(s){
    var hay=((s.name||'')+' '+(s.notes||'')+' '+(s.supplier||'')).toLowerCase();
    if(hay.indexOf(q)>=0)hits.supplies.push(s);
  });
  // Recipes (built-in + custom)
  (APP.recipes||[]).forEach(function(r){
    var hay=(r.name+' '+(r.style||'')+' '+(r.difficulty||'')+' '+(r.description||'')+' '+((r.tags||[]).join(' '))).toLowerCase();
    if(hay.indexOf(q)>=0)hits.recipes.push(r);
  });
  return hits;
}

function gsActivateFirstResult(){
  if(_gsFirstHit){
    // _gsFirstHit is a string of JS to eval (the onclick handler). Safe here
    // because we constructed it ourselves from known-good batch IDs.
    try{(new Function(_gsFirstHit))();}catch(e){console.warn('gs activate failed:',e);}
  }
}

// Keyboard shortcut: Ctrl/Cmd-K opens global search anywhere
if(typeof document!=='undefined'){
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key&&e.key.toLowerCase()==='k'){
      // Don't hijack inside input/textarea where Ctrl-K may mean line-clear etc
      var tag=document.activeElement&&document.activeElement.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA')return;
      e.preventDefault();
      openGlobalSearch();
    }
  });
}


// Generates a 4-dose Fermaid-O TOSNA schedule for a chosen batch and provides
// an "Apply" action that:
//   1. Sets batch.nutrient = 'fermaid-o' so future getEffectiveSteps() calls
//      auto-inject the canonical TOSNA schedule into the coach.
//   2. Writes 4 concrete addition entries (days 1, 2, 3, and either +7 days
//      from batch start OR today+7 if the batch is already past day 7) so
//      the doses show up in the additions log, calendar, and overdue checks.
//
// The function reads the picker value live each call so re-renders during
// batch selection don't lose the user's choice.
