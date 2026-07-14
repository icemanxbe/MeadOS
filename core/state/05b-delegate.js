// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
//
// Event delegation core. Replaces inline onclick="..." attributes — which
// CSP treats as inline script and only permits via 'unsafe-inline'
// (server.py's CSP comment used to say a nonce/hash policy would "brick the
// UI" because of exactly this) — with a data-action/data-args pair, read by
// ONE delegated listener per container instead of ~500 individual inline
// handlers scattered across every rendered view.
//
// MIGRATION PATTERN (for converting a view's remaining onclick sites):
//   Before:  onclick="showView('batch','+b.id+'\')"
//   After:   data-action="showView" data-args='["batch",'+JSON.stringify(b.id)+']'
//
// For a call with no args:      data-action="openGlobalSearch"
// For a compound statement (was `onclick="a();b()"`), add a small named
// wrapper function next to the render function instead of inlining two
// calls — data-action can only name ONE function.
//
// data-args is a JSON array, single-quoted in the HTML attribute so the
// double quotes JSON.stringify produces don't need escaping. Any dynamic
// string going into it MUST go through JSON.stringify (not string
// concatenation) so a value containing a quote or backslash can't break out
// of the attribute — this is the same class of bug escHtml prevents for
// rendered text, just for attribute-embedded data instead.
// Backdrop clicks (dismiss a modal by clicking its dimmed overlay, not its
// content) need a DIFFERENT check than data-action: the original inline
// pattern was `onclick="if(event.target===this)closeModal()"` on the
// .modal-overlay div itself — it must fire only when the click landed
// EXACTLY on the overlay, not on a descendant that bubbled up. closest()
// can't express that (a click anywhere inside the modal is also a
// descendant of the overlay). So this checks e.target directly instead.
// Default (no data-backdrop-action attribute): call closeModal(). A modal
// needing different backdrop behavior (confirm-guarded, extra cleanup, a
// different close function) names its own small wrapper function via
// data-backdrop-action instead of relying on the default.
function _delegateBackdropClick(e){
  if(!e.target.classList||!e.target.classList.contains('modal-overlay'))return false;
  var action=e.target.getAttribute('data-backdrop-action');
  if(action){
    var fn=window[action];
    if(typeof fn==='function')fn.call(e.target);
    else console.error('[MeadOS] data-backdrop-action="'+action+'" has no matching function');
  }else if(typeof closeModal==='function'){
    closeModal();
  }
  return true;
}
function _delegateClick(root){
  if(!root||root._delegateClickBound)return;
  root._delegateClickBound=true;
  root.addEventListener('click',function(e){
    if(_delegateBackdropClick(e))return;
    var el=e.target.closest('[data-action]');
    if(!el||!root.contains(el))return;
    var action=el.getAttribute('data-action');
    var fn=window[action];
    if(typeof fn!=='function'){
      console.error('[MeadOS] data-action="'+action+'" has no matching function');
      return;
    }
    var argsAttr=el.getAttribute('data-args');
    var args=[];
    if(argsAttr){
      try{args=JSON.parse(argsAttr);}
      catch(err){console.error('[MeadOS] data-args on data-action="'+action+'" is not valid JSON:',argsAttr);return;}
    }
    fn.apply(el,args);
  });
}
