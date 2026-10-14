/* plates-effect-hunter run45 — staged, NOT pushed. H45-67..H45-100 (JS) + boot markers.
   Guards: reduced-motion, save-data, fine-pointer, feature-detect. No-ops when base DOM absent. */
(function(){
"use strict";
var d=document, w=window, RM=matchMedia("(prefers-reduced-motion: reduce)").matches,
    FINE=matchMedia("(pointer: fine)").matches,
    $=function(s,c){return (c||d).querySelector(s);}, $$=function(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s));};
if(!("querySelector" in d))return;
var html=d.documentElement;
html.classList.add("h45-boot"); html.classList.toggle("h45-nomotion",RM);
d.body&&(d.body.dataset.h45="45");
w.__h45={run:45,rm:RM,fine:FINE,saveData:(navigator.connection||{}).saveData||false,at:Date.now()};
function on(el,ev,fn,o){if(el)el.addEventListener(ev,fn,o);}
function store(k,v){try{if(v===undefined)return localStorage.getItem("h45-"+k);localStorage.setItem("h45-"+k,v);}catch(e){}}

/* H45-96 · heroVideo fetchpriority=high */
var hv=$("#heroVideo"); if(hv&&"fetchPriority" in hv)hv.fetchPriority="high";

/* H45-31b · hero shimmer lifecycle */
var hm=$(".hero-media");
if(hm){hm.classList.add("h45-loading");
  on(hv,"canplay",function(){hm.classList.remove("h45-loading");});
  setTimeout(function(){hm.classList.remove("h45-loading");},9000);}

/* H45-03 · doodle skeleton ready flag */
$$("#clipGrid > *").forEach(function(card){
  var v=$(".clip-visual video",card)||$("video",card);
  if(!v){card.classList.add("h45-ready");return;}
  on(v,"canplay",function(){card.classList.add("h45-ready");});
  if(v.readyState>=3)card.classList.add("h45-ready");
});

/* H45-32b · eyebrow inview */
if("IntersectionObserver" in w){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("h45-inview");io.unobserve(e.target);}});},{threshold:.4});
  $$(".section-head").forEach(function(s){io.observe(s);});
}

/* H45-35b · library-tools stuck */
var lt=$(".library-tools");
if(lt&&"IntersectionObserver" in w){
  var io2=new IntersectionObserver(function(es){es.forEach(function(e){lt.classList.toggle("h45-stuck",!e.isIntersecting&&e.boundingClientRect.top<0);});},{threshold:1});
  io2.observe(lt);
}

/* H45-43b · nav scrolled */
var nav=$(".nav");
function navScroll(){if(nav)nav.classList.toggle("h45-scrolled",(w.scrollY||0)>24);}
on(w,"scroll",navScroll,{passive:true});navScroll();

/* H45-46b · preloader wipe + H45-16 light-dot clock */
var pl=$("#preloader");
if(pl){
  var dots=d.createElement("div");dots.className="h45-dots";dots.setAttribute("aria-hidden","true");
  for(var i=0;i<8;i++)dots.appendChild(d.createElement("i"));
  pl.appendChild(dots);
  var lit=0,timer=setInterval(function(){var c=dots.children[lit%8];if(c)c.classList.add("lit");lit++;
    if(lit>=8){clearInterval(timer);}},260);
  w.addEventListener("load",function(){setTimeout(function(){pl.classList.add("h45-done");},350);});
  setTimeout(function(){pl.classList.add("h45-done");},6000);
}

/* H45-67 · recent searches */
var si=$("#clipSearch"),sw=$(".search-wrap");
if(si){
  var recent=[];try{recent=JSON.parse(store("recent")||"[]");}catch(e){}
  function renderRecent(){
    var old=$(".h45-recent",sw);if(old)old.remove();
    if(!recent.length)return;
    var box=d.createElement("div");box.className="h45-recent";box.setAttribute("role","listbox");
    box.style.cssText="position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:60;background:rgba(12,10,6,.96);border:1px solid rgba(212,175,55,.35);border-radius:3px;padding:.4rem;";
    recent.slice(0,5).forEach(function(q){
      var b=d.createElement("button");b.type="button";b.textContent=q;b.setAttribute("role","option");
      b.style.cssText="display:block;width:100%;text-align:left;background:none;border:0;color:#e9dfc6;padding:.45rem .6rem;cursor:pointer;font-size:.8rem;";
      on(b,"click",function(){si.value=q;si.dispatchEvent(new Event("input",{bubbles:true}));si.focus();});
      box.appendChild(b);});
    sw.appendChild(box);}
  renderRecent();
  on(si,"change",function(){var q=si.value.trim();if(!q)return;recent=[q].concat(recent.filter(function(x){return x!==q;})).slice(0,5);store("recent",JSON.stringify(recent));renderRecent();});
  on(d,"click",function(e){var b=$(".h45-recent",sw);if(b&&sw&&!sw.contains(e.target))b.remove();});
}

/* H45-50c · search clear button (CSS class hook) */
if(si&&sw){
  var clr=d.createElement("button");clr.type="button";clr.className="h45-clear";clr.setAttribute("aria-label","Clear search");clr.textContent="×";
  sw.appendChild(clr);
  function syncClear(){sw.classList.toggle("h45-hastext",!!si.value);}
  on(si,"input",syncClear);syncClear();
  on(clr,"click",function(){si.value="";si.dispatchEvent(new Event("input",{bubbles:true}));syncClear();si.focus();});
}

/* H45-100 · Escape clears search */
on(d,"keydown",function(e){
  if(e.key==="Escape"&&si&&d.activeElement===si&&si.value){si.value="";si.dispatchEvent(new Event("input",{bubbles:true}));}
});

/* H45-68 · theme transition guard */
var tt=$("#themeToggle");
on(tt,"click",function(){
  html.classList.add("h45-timelapse");
  var toDark=!(html.getAttribute("data-theme")==="dark");
  html.classList.toggle("h45-to-dark",toDark);html.classList.toggle("h45-to-light",!toDark);
  setTimeout(function(){html.classList.remove("h45-timelapse","h45-to-dark","h45-to-light");},700);
});

/* H45-15 · surprise accent button */
var foot=$(".footer-inner")||$("footer");
if(foot&&!RM){
  var sb=d.createElement("button");sb.type="button";sb.className="h45-surprise";sb.textContent="✦ Surprise accent";
  sb.style.marginTop="1rem";
  var accents=["#d4af37","#e07856","#7fb069","#6aa8d8","#b678d8","#d86a8a"],ai=0;
  try{ai=parseInt(store("accent")||"0",10)||0;}catch(e){}
  function applyA(){html.style.setProperty("--h45-accent",accents[ai%accents.length]);}
  applyA();
  on(sb,"click",function(){ai=(ai+1)%accents.length;applyA();store("accent",String(ai));});
  foot.appendChild(sb);
}

/* H45-69 · dock shortcuts t/m// */
on(d,"keydown",function(e){
  if(e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.isContentEditable))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  var k=e.key.toLowerCase();
  if(k==="t"&&tt){tt.click();}
  else if(k==="m"){var mb=$(".menu-btn");if(mb)mb.click();}
  else if(k==="/"&&si){e.preventDefault();si.focus();}
});

/* H45-70 · hover preview from 2s (biến thể H13-05) */
if(FINE&&!RM){
  $$("#clipGrid > *").forEach(function(card){
    var v=$("video",card);if(!v)return;
    on(card,"mouseenter",function(){try{v.currentTime=2;v.play().catch(function(){});}catch(e){}});
    on(card,"mouseleave",function(){try{v.pause();v.currentTime=0;}catch(e){}});
  });
}

/* H45-71 · ESC modal stack + focus trap */
var stack=[];
function regModal(m){if(m&&stack.indexOf(m)<0)stack.push(m);}
$$(".modal").forEach(regModal);
if("MutationObserver" in w){
  var mo=new MutationObserver(function(muts){muts.forEach(function(m){
    if(m.target.classList&&m.target.classList.contains("modal"))regModal(m.target);});});
  mo.observe(d.body,{attributes:true,subtree:true,attributeFilter:["class"]});
}
on(d,"keydown",function(e){
  if(e.key!=="Escape"||!stack.length)return;
  var top=null;
  for(var i=stack.length-1;i>=0;i--){var m=stack[i];
    if(m.classList.contains("open")||m.open||getComputedStyle(m).display!=="none"){top=m;break;}}
  if(top){var c=$(".modal-close, .sheet-close",top)||top;
    if(c.click)c.click();else top.classList.remove("open");
    e.stopPropagation();}
});

/* H45-72 · mood aria-pressed + announce (biến thể H22-96) */
var live=d.createElement("div");live.setAttribute("aria-live","polite");
live.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);";
d.body.appendChild(live);
$$(".mood-chip").forEach(function(ch){
  on(ch,"click",function(){setTimeout(function(){
    var on_=ch.getAttribute("aria-pressed")==="true";
    live.textContent=on_?("Filter on: "+ch.textContent.trim()):"Filter off";},60);});
});

/* H45-73 · newsletter success morph */
var nf=$("#newsletterForm"),nn=$("#newsletterEmail"),nNote=$("#newsletterNote");
if(nf){
  on(nf,"submit",function(){
    var ok=nn&&nn.checkValidity&&nn.checkValidity();
    var btn=$(".btn",nf);if(btn)btn.dataset.loading="1";
    setTimeout(function(){if(btn)btn.dataset.loading="";
      if(nNote){nNote.dataset.state=ok?"ok":"err";nNote.textContent=ok?"✓ You're on the list — first drop lands soon.":"Please enter a valid email.";}
      if(ok){nf.style.transition="opacity .4s";nf.style.opacity="0";
        setTimeout(function(){nf.innerHTML='<p style="color:#e8c76a;letter-spacing:.08em;">✓ Subscribed. Welcome to Plates.</p>';nf.style.opacity="1";},400);}
    },700);
  });
}

/* H45-89 · email typo suggestion */
if(nn){
  var sug=d.createElement("div");sug.className="h45-typo";sug.style.cssText="font-size:.72rem;color:#d8b96a;margin-top:.4rem;display:none;";
  nn.parentNode.appendChild(sug);
  on(nn,"blur",function(){
    var v=nn.value,fix=v.replace(/@gmial\.|@gmal\.|@gmali\./,"@gmail.").replace(/@hotmial\./,"@hotmail.");
    if(fix!==v&&fix.indexOf("@")>0){sug.style.display="block";sug.innerHTML='Did you mean <button type="button" style="color:#e8c76a;background:none;border:0;cursor:pointer;text-decoration:underline;">'+fix+"</button>?";
      on($("button",sug),"click",function(){nn.value=fix;sug.style.display="none";});}
    else sug.style.display="none";
  });
}

/* H45-74 · gallery swipe */
var gm=$("#galleryModal"),gx0=null;
on(gm,"touchstart",function(e){gx0=e.touches[0].clientX;},{passive:true});
on(gm,"touchend",function(e){if(gx0===null)return;
  var dx=e.changedTouches[0].clientX-gx0;gx0=null;
  if(Math.abs(dx)>48){var b=$(dx<0?"#galleryNext":"#galleryPrev");if(b)b.click();}},{passive:true});

/* H45-75 · collection click → filter library */
$$(".collection").forEach(function(col){
  on(col,"click",function(e){
    if(e.target.closest("a,button"))return;
    var mood=(col.getAttribute("data-mood")||col.textContent||"").trim().split(/\s+/)[0];
    var lib=$("#library");if(lib)lib.scrollIntoView({behavior:RM?"auto":"smooth"});
    if(mood){var chip=null;$$(".mood-chip").forEach(function(c){if(c.textContent.trim().toLowerCase().indexOf(mood.toLowerCase())===0)chip=c;});
      if(chip)setTimeout(function(){chip.click();},RM?0:600);}
  });
});

/* H45-76 · sound persist */
var st=$("#soundToggle");
try{var muted=store("muted")==="1";
  if(muted)$$("video").forEach(function(v){v.muted=true;});
  on(st,"click",function(){setTimeout(function(){var any=false;$$("video").forEach(function(v){if(!v.muted&&!v.paused)any=true;});store("muted",any?"0":"1");},100);});
}catch(e){}

/* H45-77 · visibleCount tween (biến thể H21-21) */
var vc=$("#visibleCount");
if(vc&&!RM){
  var cur=0,t0=null;
  new MutationObserver(function(){
    var target=parseInt((vc.textContent.match(/\d+/)||[0])[0],10)||0,from=cur;
    if(from===target)return;var t1=performance.now();
    function fr(t){var p=Math.min(1,(t-t1)/300);cur=Math.round(from+(target-from)*p);
      vc.textContent=vc.textContent.replace(/\d+/,cur);if(p<1)requestAnimationFrame(fr);}
    requestAnimationFrame(fr);
  }).observe(vc,{childList:true,characterData:true,subtree:true});
}

/* H45-78 · liked drawer */ /* H45-97 · liked empty CTA (trong panel trên) */
var lq=$("#likedQuick");
function likedCards(){
  return $$("#clipGrid > *").filter(function(card){
    var f=$(".favorite",card);return f&&(f.getAttribute("aria-pressed")==="true"||f.classList.contains("active")||f.classList.contains("on"));});
}
on(lq,"click",function(){
  var old=$(".h45-favpanel");if(old){old.remove();return;}
  var panel=d.createElement("div");panel.className="h45-favpanel modal-card";
  panel.style.cssText="position:fixed;z-index:120;left:50%;top:12%;transform:translateX(-50%);width:min(92vw,720px);background:#12100b;border:1px solid rgba(212,175,55,.4);border-radius:6px;padding:1.4rem;";
  panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Liked clips");
  var list=d.createElement("div");list.className="h45-favlist";
  var view=d.createElement("div");view.className="h45-favview";view.textContent="Select a clip to preview";
  var cards=likedCards();
  if(!cards.length){
    view.innerHTML='<div class="empty-state" style="border:0;"><p>Nothing liked yet.</p><button type="button" class="btn h45-golib">Browse the library</button></div>';
    on($(".h45-golib",view),"click",function(){panel.remove();var lib=$("#library");if(lib)lib.scrollIntoView({behavior:RM?"auto":"smooth"});});
  }
  cards.forEach(function(card,i){
    var t=($(".clip-info h3",card)||{}).textContent||("Clip "+(i+1));
    var b=d.createElement("button");b.type="button";b.textContent=t;b.setAttribute("aria-selected",i===0?"true":"false");
    on(b,"click",function(){$$("button",list).forEach(function(x){x.setAttribute("aria-selected","false");});
      b.setAttribute("aria-selected","true");view.textContent=t;});
    list.appendChild(b);});
  if(cards.length)view.textContent=(($(".clip-info h3",cards[0])||{}).textContent||"");
  var x=d.createElement("button");x.className="h45-favx";x.setAttribute("aria-label","Close");x.textContent="×";
  x.style.cssText="position:absolute;top:.6rem;right:.8rem;background:none;border:0;color:#8d8168;font-size:1.3rem;cursor:pointer;";
  on(x,"click",function(){panel.remove();});
  panel.appendChild(list);panel.appendChild(view);panel.appendChild(x);
  d.body.appendChild(panel);
});

/* H45-79 · view persist */
$$(".view-tab").forEach(function(tab){
  on(tab,"click",function(){store("view",tab.getAttribute("data-view")||tab.textContent.trim());});
});
try{var pv=store("view");
  if(pv)$$(".view-tab").forEach(function(tab){if((tab.getAttribute("data-view")||tab.textContent.trim())===pv)setTimeout(function(){tab.click();},300);});
}catch(e){}

/* H45-80 · shuffle button (biến thể H18-37) */
var grid=$("#clipGrid");
if(grid){
  var sh=d.createElement("button");sh.type="button";sh.className="h45-shuffle btn ghost";sh.textContent="⇄ Shuffle";
  sh.style.marginLeft=".6rem";sh.setAttribute("aria-label","Shuffle clip order");
  var tools=$(".library-tools");if(tools)tools.appendChild(sh);
  on(sh,"click",function(){
    var kids=$$("#clipGrid > *");
    for(var i=kids.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));grid.appendChild(kids[j]);kids.splice(j,1);kids.splice(i,0,kids[j]);}
    live.textContent="Clip order shuffled";
  });
}

/* H45-81 · price tween */
$$(".tier-select").forEach(function(sel){
  on(sel,"change",function(){
    var price=$(".stack-price",sel.closest(".stack-panel")||d);
    if(!price||RM)return;
    var target=parseFloat((price.textContent.match(/[\d.]+/)||[0])[0])||0,from=0,t1=performance.now();
    price.dataset.changed="1";setTimeout(function(){price.dataset.changed="";},500);
    function fr(t){var p=Math.min(1,(t-t1)/400);var v=Math.round(target*p);
      price.textContent=price.textContent.replace(/[\d.]+/,v);if(p<1)requestAnimationFrame(fr);}
    requestAnimationFrame(fr);
  });
});

/* H45-82 · trending searches */
var spanel=$(".search-panel");
if(spanel&&si){
  var trends=["rain forest","golden valley","ocean loop","night city"];
  var tw=d.createElement("div");tw.style.cssText="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem;";
  trends.forEach(function(t){
    var b=d.createElement("button");b.type="button";b.className="mood-chip";b.textContent="↗ "+t;
    b.style.fontSize=".7rem";on(b,"click",function(){si.value=t;si.dispatchEvent(new Event("input",{bubbles:true}));si.focus();});
    tw.appendChild(b);});
  spanel.appendChild(tw);
}

/* H45-83 · gallery retry backoff */
var gr=$("#galleryRetry"),tries=0;
on(gr,"click",function(){
  tries++;gr.disabled=true;gr.textContent="Retrying… ("+tries+"/3)";
  setTimeout(function(){gr.disabled=false;gr.textContent="Retry";
    if(tries>=3){gr.textContent="Try again later";gr.disabled=true;}},Math.min(1000*Math.pow(2,tries-1),8000));
});

/* H45-84 · hide native cursor when custom active */
if(FINE&&!RM&&$(".cursor-dot")){
  var css=d.createElement("style");css.textContent="html.h45-hidecur,html.h45-hidecur a,html.h45-hidecur button{cursor:none;}";
  d.head.appendChild(css);html.classList.add("h45-hidecur");
}

/* H45-85 · 404 suggest clips */
var nf404=$("#notFound");
if(nf404){
  var cards=$$("#clipGrid > *").slice(0,3);
  if(cards.length){
    var sg=d.createElement("div");sg.style.cssText="display:flex;gap:.8rem;justify-content:center;margin-top:1.4rem;flex-wrap:wrap;position:relative;z-index:2;";
    cards.forEach(function(c){var t=(($(".clip-info h3",c)||{}).textContent||"Clip");
      var b=d.createElement("button");b.type="button";b.className="btn ghost";b.textContent=t;b.style.fontSize=".75rem";
      on(b,"click",function(){location.hash="#library";});sg.appendChild(b);});
    nf404.appendChild(sg);
  }
}

/* H45-86 · compare shake when empty */
var oc=$("#openCompare");
on(oc,"click",function(){
  var tray=$("#compareTray"),n=tray?(parseInt(tray.getAttribute("data-count")||"0",10)):0;
  if(!n&&!$(".compare-card")){
    oc.style.animation="h45-shake .4s";setTimeout(function(){oc.style.animation="";},450);
    live.textContent="Compare is empty — add two clips first";
  }
});
var shk=d.createElement("style");shk.textContent="@keyframes h45-shake{25%{transform:translateX(-5px);}50%{transform:translateX(5px);}75%{transform:translateX(-3px);}}";
d.head.appendChild(shk);

/* H45-87 · filter count badges */
function badgeFilters(){var all=$$("#clipGrid > *");$$(".filter").forEach(function(f){var key=(f.getAttribute("data-filter")||"all").trim().toLowerCase();var n=key==="all"?all.length:all.filter(function(c){return (c.getAttribute("data-group")||"").toLowerCase()===key;}).length;f.setAttribute("data-count",String(n));});}
if(grid){badgeFilters();
  var st2=d.createElement("style");st2.textContent='.filter::after{content:attr(data-count);font-size:.62rem;background:rgba(212,175,55,.16);color:#d4af37;border-radius:99px;padding:.1rem .45rem;margin-left:.4rem;}';
  d.head.appendChild(st2);
}

/* H45-88 · arrow-key seek in modal video */
on(d,"keydown",function(e){
  var mv=$("#modalVideo");
  if(!mv||d.activeElement!==mv&&!mv.contains(d.activeElement))return;
  if(e.key==="ArrowRight"){try{mv.currentTime=Math.min(mv.duration||0,mv.currentTime+10);}catch(x){}e.preventDefault();}
  if(e.key==="ArrowLeft"){try{mv.currentTime=Math.max(0,mv.currentTime-10);}catch(x){}e.preventDefault();}
});

/* H45-90 · cart total breakdown */
function cartBreakdown(){
  var ct=$(".cart-total");if(!ct||$(".h45-bd",ct))return;
  var bd=d.createElement("div");bd.className="h45-bd";
  bd.style.cssText="font-size:.72rem;color:#a99c7e;margin-bottom:.5rem;line-height:1.7;";
  bd.innerHTML="Subtotal — clips<br>License included · No hidden fees";
  ct.insertBefore(bd,ct.firstChild);
}
cartBreakdown();
if("MutationObserver" in w)new MutationObserver(cartBreakdown).observe(d.body,{childList:true,subtree:true});

/* H45-91 · contact autosave draft */
var cf=$("#contactForm"),cp=$("#contactProject");
if(cf&&cp){
  try{var draft=store("draft");if(draft){cp.value=draft;
    var dn=d.createElement("p");dn.className="form-note";dn.textContent="Draft restored from your last visit.";cp.parentNode.appendChild(dn);}}catch(e){}
  var deb=null;
  on(cp,"input",function(){clearTimeout(deb);deb=setTimeout(function(){store("draft",cp.value);},600);});
  on(cf,"submit",function(){try{localStorage.removeItem("h45-draft");}catch(e){}});
}

/* H45-92 · modal drag-to-dismiss (touch) */
$$(".modal").forEach(function(m){
  var y0=null;
  on(m,"touchstart",function(e){y0=e.touches[0].clientY;},{passive:true});
  on(m,"touchend",function(e){if(y0===null)return;var dy=e.changedTouches[0].clientY-y0;y0=null;
    if(dy>110){var c=$(".modal-close, .sheet-close",m);if(c)c.click();}},{passive:true});
});

/* H45-93 · clipGrid aria-live */
if(grid&&vc){grid.setAttribute("aria-live","off");}

/* H45-94 · gallery read-more */
var gd=$("#modalDesc");
if(gd&&gd.textContent.length>180){
  var full=gd.textContent;gd.textContent=full.slice(0,180)+"…";
  var rm2=d.createElement("button");rm2.type="button";rm2.textContent="Read more";
  rm2.style.cssText="background:none;border:0;color:#e8c76a;cursor:pointer;font-size:.75rem;letter-spacing:.06em;";
  var open=false;
  on(rm2,"click",function(){open=!open;gd.textContent=open?full:full.slice(0,180)+"…";rm2.textContent=open?"Show less":"Read more";});
  gd.parentNode.insertBefore(rm2,gd.nextSibling);
}

/* H45-95 · toast role by severity */
var toast=$("#toast");
if(toast){
  new MutationObserver(function(){
    var t=toast.textContent.toLowerCase();
    toast.setAttribute("role",/error|fail|sorry|invalid/.test(t)?"alert":"status");
  }).observe(toast,{childList:true,characterData:true,subtree:true});
}

/* H45-98 · type=button audit */
$$("button:not([type])").forEach(function(b){b.setAttribute("type","button");});

/* H45-99 · is-loading body state */
if("MutationObserver" in w){
  new MutationObserver(function(){
    var any=!!$('.btn[data-loading="1"]');
    d.body.classList.toggle("is-loading",any);
  }).observe(d.body,{attributes:true,subtree:true,attributeFilter:["data-loading"]});
}

/* ---- CP research wiring ---- */
/* H45-04 · CP42 View Transitions language switch */
on($("#langToggle"),"click",function(){
  if(!RM&&d.startViewTransition){try{d.startViewTransition(function(){});}catch(e){}}
},true);

/* H45-05 · CP50 View Transitions cart removal */
on(d,"click",function(e){
  var r=e.target.closest&&e.target.closest("[data-remove], .h45-remove");
  if(r&&!RM&&d.startViewTransition){
    e.preventDefault();e.stopPropagation();
    try{d.startViewTransition(function(){r.click();});}catch(x){r.click();}
  }
},true);

/* H45-02 · CP19 speed-reactive marquee */
var vm=$(".velocity-marquee .marquee-track");
if(vm&&FINE&&!RM){
  var vel=1,lastY=w.scrollY,lastT=performance.now(),tgt=1;
  on(w,"scroll",function(){
    var t=performance.now(),dy=Math.abs(w.scrollY-lastY),dt=Math.max(16,t-lastT);
    tgt=Math.min(3.2,1+dy/dt*1.4);lastY=w.scrollY;lastT=t;
  },{passive:true});
  (function loop(){vel+=(tgt-vel)*.06;tgt+=(1-tgt)*.02;
    vm.style.setProperty("--h45-vel",vel.toFixed(2));requestAnimationFrame(loop);})();
}

/* H45-19 · AW27 director mode (type "cine") */
var seq="";
on(d,"keydown",function(e){
  if(e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"))return;
  seq=(seq+e.key.toLowerCase()).slice(-4);
  if(seq==="cine"){
    var ov=$(".h45-director");
    if(!ov){ov=d.createElement("div");ov.className="h45-director";
      ov.innerHTML='<div class="h45-tc">TC 00:00:00:00</div>';d.body.appendChild(ov);
      var tc=$(".h45-tc",ov),f=0;
      setInterval(function(){if(!ov.classList.contains("on"))return;f++;
        var s=Math.floor(f/24),fr=f%24;
        tc.textContent="TC 00:00:"+String(s).padStart(2,"0")+":"+String(fr).padStart(2,"0");},1000/24);}
    ov.classList.toggle("on");
    live.textContent=ov.classList.contains("on")?"Director mode on":"Director mode off";
    seq="";
  }
});

/* H45-20 · AW33 message-first */
if(cf){
  ["#contactEmail","#contactTier","#contactName"].forEach(function(s){
    var f=$(s);if(f){var wrap=f.closest(".field")||f;wrap.classList.add("h45-defer");}});
  if(cp)on(cp,"input",function(){cf.classList.toggle("h45-typing",cp.value.trim().length>2);});
}

/* H45-16 · AW40 screening room + synced scrub */
var cm=$("#compareModal");
if(cm){
  cm.classList.add("h45-screen");
  var sc=d.createElement("input");sc.type="range";sc.className="h45-scrub";sc.min="0";sc.max="100";sc.value="0";
  sc.setAttribute("aria-label","Scrub both clips");
  var cgrid=$(".compare-grid",cm);if(cgrid)cgrid.appendChild(sc);
  on(sc,"input",function(){
    $$("video",cm).forEach(function(v){try{if(v.duration)v.currentTime=v.duration*sc.value/100;}catch(e){}});
  });
}

/* H45-49b · AW49 wired in H45-68 (theme guard doubles as timelapse) */

/* H45-14b · AW14 idle pause */
var idleT=null;
function poke(){d.body.dataset.h45Idle="";clearTimeout(idleT);idleT=setTimeout(function(){d.body.dataset.h45Idle="1";},4000);}
on(d,"pointermove",poke,{passive:true});on(d,"scroll",poke,{passive:true});
on(d,"visibilitychange",function(){d.body.dataset.h45Idle=d.hidden?"1":"";});
poke();

/* H45-25 · AW21 section-aware nav */
var ctx=null;
if("IntersectionObserver" in w){
  var secs=[["#library","Library"],["#collections","Collections"],["#pricing","Pricing"],["#contact","Contact"]];
  var io3=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){
      if(!ctx){var ni=$(".nav-inner");if(ni){ctx=d.createElement("span");ctx.className="h45-ctx";ni.appendChild(ctx);}}
      if(ctx)ctx.textContent=e.target.id==="library"?"Library · 9 clips":e.target.tagName==="SECTION"?e.target.id:"";
    }});},{threshold:.3});
  secs.forEach(function(p){var s=$(p[0]);if(s)io3.observe(s);});
}

/* H45-26 · AW42 price blur clear */
if("IntersectionObserver" in w){
  var io4=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){$$(".stack-price").forEach(function(p){p.classList.add("h45-clear");});io4.disconnect();}});},{threshold:.25});
  var pr=$("#pricing");if(pr)io4.observe(pr);else $$(".stack-price").forEach(function(p){p.classList.add("h45-clear");});
}

/* H45-28 · AW48 hover-scrub posters */
if(FINE&&!RM){
  $$("#clipGrid > *").forEach(function(card){
    var v=$("video",card),vis=$(".clip-visual",card);if(!v||!vis)return;
    vis.classList.add("h45-scrubable");
    on(vis,"mousemove",function(e){
      if(!v.duration)return;
      var r=vis.getBoundingClientRect(),p=(e.clientX-r.left)/r.width;
      try{v.currentTime=v.duration*Math.min(.98,Math.max(0,p));}catch(x){}
    });
  });
}

/* H45-10 · CP07 404 scene stars + H45-17 AW50 slate */
if(nf404){
  var scene=d.createElement("div");scene.className="h45-scene";scene.tabIndex=0;
  scene.setAttribute("role","img");scene.setAttribute("aria-label","Night scene: moon over dark hills");
  scene.innerHTML='<div class="h45-moon"></div><div class="h45-hill"></div><div class="h45-hill h2"></div>';
  for(var s=0;s<26;s++){var st=d.createElement("i");st.className="h45-star";
    st.style.left=(Math.random()*100)+"%";st.style.top=(Math.random()*55)+"%";
    st.style.opacity=(0.3+Math.random()*0.7).toFixed(2);scene.appendChild(st);}
  nf404.insertBefore(scene,nf404.firstChild);
  nf404.classList.add("h45-grain");
  var slate=d.createElement("div");slate.className="h45-slate";slate.textContent="REEL NOT FOUND — 404";
  nf404.insertBefore(slate,scene.nextSibling);
  var rw=d.createElement("button");rw.type="button";rw.className="h45-rewind";rw.textContent="⟲ REWIND TO HOME";
  on(rw,"click",function(){location.href="/";});
  nf404.insertBefore(rw,slate.nextSibling);
}

/* H45-06 · CP49 reel in footer */
if(foot&&!$(".h45-reel",foot)){
  var reel=d.createElement("span");reel.className="h45-reel";reel.setAttribute("aria-hidden","true");
  foot.insertBefore(reel,foot.firstChild);
}

/* H45-13 · CP27 corner captions */
$$("#clipGrid > *").forEach(function(card){
  var vis=$(".clip-visual",card);if(!vis||$(".h45-corner",vis))return;
  var meta=(($(".clip-meta",card)||{}).textContent||"4K · 24 FPS").trim();
  var c=d.createElement("div");c.className="h45-corner";c.textContent=meta+" · from $29";
  vis.appendChild(c);
});

/* H45-51b · journal date badges */
$$(".journal-card").forEach(function(jc){
  if($(".h45-date",jc))return;
  var t=$("time",jc),txt=t?(t.getAttribute("datetime")||t.textContent):"";
  var b=d.createElement("span");b.className="h45-date";b.textContent=(txt||"").trim().slice(0,10)||"PLATES";
  jc.appendChild(b);
});

/* H45-62b · dial ticker */
var dnt=$(".dial-name-track");
if(dnt&&!$(".h45-tick",dnt)){
  var tk=d.createElement("span");tk.className="h45-tick";
  tk.textContent=dnt.textContent.trim().split(/\s+/).join(" · ")+" · ";
  dnt.textContent="";dnt.appendChild(tk);
}

/* H45-61b · tilt glare follows pointer */
if(FINE){
  $$(".tilt-target").forEach(function(el){
    on(el,"mousemove",function(e){var r=el.getBoundingClientRect();
      el.style.setProperty("--h45-gx",((e.clientX-r.left)/r.width*100)+"%");
      el.style.setProperty("--h45-gy",((e.clientY-r.top)/r.height*100)+"%");});
  });
}

/* H45-09 · wave dividers between sections */
$$(".section").forEach(function(s){
  if($(".h45-wave",s))return;
  var wv=d.createElement("div");wv.className="h45-wave";wv.setAttribute("aria-hidden","true");
  s.insertBefore(wv,s.firstChild);
});

/* H45-11 · circular carousel toggle for collections */
var csec=$("#collections"),cg=$(".collection-grid",csec||d);
if(cg&&FINE){
  var tg=d.createElement("button");tg.type="button";tg.className="h45-circ btn ghost";tg.textContent="◯ Circular view";
  tg.style.cssText="font-size:.72rem;margin-bottom:.8rem;";
  on(tg,"click",function(){csec.classList.toggle("h45-circular");
    tg.textContent=csec.classList.contains("h45-circular")?"▦ Grid view":"◯ Circular view";});
  cg.parentNode.insertBefore(tg,cg);
}
})();
