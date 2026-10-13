/* plates-hunter-run38 — staged LOCAL, KHONG push GitHub (cho chu "up").
   H38-01/16/22/27 + H38-100 bootstrap. 0 byte <head>. Moi query deu null-check;
   API moi deu feature-detect. */
(function(){
"use strict";
var RM=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
var FINE=!!(window.matchMedia&&matchMedia("(hover:hover) and (pointer:fine)").matches);
var CONN=navigator.connection||{};
var SAVE=!!(CONN.saveData||/^(slow-2g|2g)$/.test(CONN.effectiveType||""));
var VI=(document.documentElement.lang||"en").indexOf("vi")===0;
function $(s,r){try{return (r||document).querySelector(s)}catch(e){return null}}
function $$(s,r){try{return Array.prototype.slice.call((r||document).querySelectorAll(s))}catch(e){return[]}}
function on(elm,ev,fn){if(elm&&elm.addEventListener)elm.addEventListener(ev,fn,false)}
function idle(fn){if("requestIdleCallback" in window){requestIdleCallback(fn,{timeout:2600})}else{setTimeout(fn,500)}}

/* H38-100 · bootstrap: RM kill-switch + live listener + save-data flag + idle init */
if(RM)document.documentElement.classList.add("h38-nomotion");
if(SAVE)document.documentElement.classList.add("h38-savedata");
try{
  var rmq=matchMedia("(prefers-reduced-motion: reduce)");
  var rmf=function(e){document.documentElement.classList.toggle("h38-nomotion",!!(e&&e.matches))};
  if(rmq.addEventListener)rmq.addEventListener("change",rmf);
  else if(rmq.addListener)rmq.addListener(rmf);
}catch(e){}

/* H38-22 · storage quota-safe: moi setItem deu try/catch (tranh mat trang thai) */
var store={
  get:function(k){try{return window.localStorage.getItem("h38:"+k)}catch(e){return null}},
  set:function(k,v){try{window.localStorage.setItem("h38:"+k,String(v));return true}catch(e){return false}},
  del:function(k){try{window.localStorage.removeItem("h38:"+k)}catch(e){}}
};

/* H38-01 · updateCallbackDone: hook sau moi View Transition (patch an toan) */
function patchVT(){
  if(!("startViewTransition" in document))return;
  try{
    var _svt=document.startViewTransition.bind(document);
    document.startViewTransition=function(update,opts){
      var t=null;
      try{t=_svt(update,opts)}catch(e){return t}
      if(t&&t.updateCallbackDone&&typeof t.updateCallbackDone.then==="function"){
        t.updateCallbackDone.then(function(){
          if(RM)return;
          document.documentElement.classList.add("h38-vt-settled");
          setTimeout(function(){document.documentElement.classList.remove("h38-vt-settled")},160);
        },function(){});
      }
      return t;
    };
  }catch(e){}
}

/* H38-16 · aria-relevant tren #cartList: SR chi doc item them/xoa */
function ariaRelevant(){
  var cl=$("#cartList");
  if(cl&&!cl.hasAttribute("aria-relevant"))cl.setAttribute("aria-relevant","additions text");
}

/* H38-27 · #cartRequest aria-disabled khi gio trong (quan sat #cartCount) */
function cartReqState(){
  var cc=$("#cartCount"),req=$("#cartRequest");
  if(!cc||!req)return;
  var n=parseInt((cc.textContent||"0").replace(/\D/g,""),10)||0;
  var empty=n===0;
  req.setAttribute("aria-disabled",empty?"true":"false");
  req.classList.toggle("h38-req-empty",empty);
}
function watchCart(){
  var cc=$("#cartCount");
  if(!cc)return;
  cartReqState();
  if("MutationObserver" in window){
    var mo=new MutationObserver(function(){cartReqState()});
    try{mo.observe(cc,{childList:true,characterData:true,subtree:true})}catch(e){}
  }
}

/* H38-07 · dem 00->09 chi 1 lan/trinh duyet (quota-safe) */
function countOnce(){
  if(store.get("counted")==="1"){
    document.documentElement.classList.add("h38-counted");
  }else{
    idle(function(){store.set("counted","1")});
  }
}

function init(){
  patchVT();      /* H38-01 */
  ariaRelevant(); /* H38-16 */
  watchCart();    /* H38-27 */
  countOnce();    /* H38-07 */
}
idle(init);
})();
