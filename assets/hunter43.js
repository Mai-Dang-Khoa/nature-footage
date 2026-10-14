/* =====================================================================
   hunter43 · Plates Luxury · batch #43 — STAGED LOCAL, KHONG PUSH GITHUB
   100 cai tien H43-01 -> H43-100 · JS vanilla, additive, khong pha base
   ===================================================================== */
(function(){
"use strict";
var d=document,w=window;
function $(s,c){return (c||d).querySelector(s)}
function $$(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
function on(el,ev,fn,opt){if(el)el.addEventListener(ev,fn,opt||false)}
function idle(fn){if("requestIdleCallback" in w)w.requestIdleCallback(fn,{timeout:2500});else setTimeout(fn,800)}

/* H43-88 · boot marker */
d.documentElement.classList.add("h43-boot");
if(d.body)d.body.dataset.h43="1";

/* H43-85 · RM live listener -> html.h43-nomotion */
var mqRM=w.matchMedia? w.matchMedia("(prefers-reduced-motion: reduce)") : null;
function syncRM(){d.documentElement.classList.toggle("h43-nomotion",!!(mqRM&&mqRM.matches))}
syncRM(); if(mqRM&&mqRM.addEventListener)mqRM.addEventListener("change",syncRM);
var RM=!!(mqRM&&mqRM.matches);

/* H43-86 · save-data */
var conn=w.navigator&&w.navigator.connection;
var SAVE=!!(conn&&conn.saveData);
if(SAVE&&d.body)d.body.dataset.h43Savedata="1";

/* H43-87 · fine-pointer */
var mqFine=w.matchMedia? w.matchMedia("(pointer: fine)") : null;
function syncFine(){if(d.body)d.body.dataset.h43Fine=(mqFine&&mqFine.matches)?"1":"0"}
syncFine(); if(mqFine&&mqFine.addEventListener)mqFine.addEventListener("change",syncFine);
var FINE=!!(mqFine&&mqFine.matches);

/* H43-10 · DV16 — Long Animation Frames diagnostics (dev console, >200ms) */
try{
  if("PerformanceObserver" in w){
    var lof=new PerformanceObserver(function(list){
      list.getEntries().forEach(function(en){
        if(en.duration>200)console.info("[h43] long-frame "+Math.round(en.duration)+"ms");
      });
    });
    lof.observe({type:"long-animation-frame",buffered:true});
  }
}catch(e){}

/* H43-09 · DV15 — debounce search 300ms + scheduler.yield, khong pha base */
(function(){
  var search=$("#clipSearch"); if(!search)return;
  var deb=null;
  w.addEventListener("input",function(e){
    if(e.target!==search||e.__h43ok||e.isComposing)return;
    e.stopPropagation();
    clearTimeout(deb);
    deb=setTimeout(function(){
      var ev=new Event("input",{bubbles:true,cancelable:true});
      ev.__h43ok=true;
      function go(){search.dispatchEvent(ev)}
      if(w.scheduler&&w.scheduler.yield)w.scheduler.yield().then(go); else go();
    },300);
  },true);
})();

/* H43-12 · DV32 — add-to-cart morph: idle -> spinner -> check (visual layer) */
on($("#galleryCart"),"click",function(){
  var b=this; if(b.classList.contains("h43-morphing"))return;
  b.classList.add("h43-morphing");
  var sp=b.querySelector("span"),old=sp?sp.textContent:"";
  if(sp)sp.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity=".35"/><path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur=".7s" repeatCount="indefinite"/></path></svg>';
  setTimeout(function(){
    if(sp)sp.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    setTimeout(function(){ if(sp)sp.textContent=old; b.classList.remove("h43-morphing"); },900);
  },650);
});

/* H43-13 · DV33 + H43-14 · DV34 — odometer + pulse khi cart doi */
(function(){
  var cc=$("#cartCount"),cq=$("#cartQuick");
  if(!cc)return;
  var mo=new MutationObserver(function(){
    cc.classList.remove("h43-flip"); void cc.offsetWidth; cc.classList.add("h43-flip","h43-odometer");
    cc.classList.add("h43-badge-in");
    if(cq){cq.classList.remove("h43-cart-pulse");void cq.offsetWidth;cq.classList.add("h43-cart-pulse");}
    setTimeout(function(){cc.classList.remove("h43-badge-in");if(cq)cq.classList.remove("h43-cart-pulse");},900);
    h43CartAnnounce(); h43SpeedBump(); h43DocTitle();
  });
  mo.observe(cc,{childList:true,characterData:true,subtree:true});
})();

/* H43-25 · WB40 — aria-live thong bao cart rieng (khong dung toast chung) */
var h43live=null;
function h43CartAnnounce(){
  var cc=$("#cartCount"); if(!cc)return;
  if(!h43live){
    h43live=d.createElement("p");
    h43live.id="h43-cartlive";h43live.setAttribute("aria-live","polite");
    h43live.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    d.body.appendChild(h43live);
  }
  var n=(cc.textContent||"0").replace(/\D/g,"")||"0";
  h43live.textContent=(+n===0)?"Cart is empty":"Plate added to cart, "+n+" item"+(+n>1?"s":"")+" total";
}

/* H43-76 · document.title phan anh so luong cart */
var h43baseTitle=d.title;
function h43DocTitle(){
  var cc=$("#cartCount"),n=cc?((cc.textContent||"0").replace(/\D/g,"")||"0"):"0";
  d.title=(+n>0?"("+n+") ":"")+h43baseTitle;
}

/* H43-15 + H43-36 · DV36 + iris-open — modal mo tu diem click */
(function(){
  var ox="50%",oy="30%";
  d.addEventListener("click",function(e){
    var card=e.target.closest?e.target.closest(".clip-card"):null;
    if(card){var r=card.getBoundingClientRect();ox=((e.clientX-r.left)/Math.max(r.width,1)*100)+"%";oy=((e.clientY-r.top)/Math.max(r.height,1)*100)+"%";}
  },true);
  var gm=$("#galleryModal"); if(!gm)return;
  var mo=new MutationObserver(function(){
    var sheet=gm.querySelector(".feature-sheet"); if(!sheet)return;
    if(!gm.hasAttribute("hidden")){
      sheet.style.setProperty("--h43-ox",ox);sheet.style.setProperty("--h43-oy",oy);
      sheet.classList.add("h43-from-click");
      if(!RM)gm.classList.add("h43-iris");
      h43Leader(); h43Dust();
    }else{
      sheet.classList.remove("h43-from-click");gm.classList.remove("h43-iris");
    }
  });
  mo.observe(gm,{attributes:true,attributeFilter:["hidden","class"]});
})();

/* H43-16 · DV37 — hero title split-text reveal, chay 1 lan */
(function(){
  var t=$(".hero-title"); if(!t||RM)return;
  $$(".scramble-part",t).forEach(function(sp){
    var words=(sp.textContent||"").split(/(\s+)/),i=0,frag=d.createDocumentFragment();
    words.forEach(function(wd){
      if(!wd.trim()){frag.appendChild(d.createTextNode(wd));return;}
      var s=d.createElement("span");s.className="h43-w";s.style.setProperty("--h43-i",i++);s.textContent=wd;
      frag.appendChild(s);
    });
    sp.textContent="";sp.appendChild(frag);
  });
  t.classList.add("h43-split");
  var io=new IntersectionObserver(function(es){
    es.forEach(function(en){if(en.isIntersecting){t.classList.add("h43-in");io.disconnect();}});
  },{threshold:.4});
  io.observe(t);
})();

/* H43-21 · WB35 — Grid / List / Spotlight switcher */
(function(){
  var tools=$(".library-tools"),grid=$("#clipGrid");
  if(!tools||!grid)return;
  var wrap=d.createElement("div");wrap.className="h43-viewswitch";wrap.setAttribute("role","group");wrap.setAttribute("aria-label","Change layout");
  [["grid","Grid"],["list","List"],["spotlight","Spotlight"]].forEach(function(v,i){
    var b=d.createElement("button");b.type="button";b.textContent=v[1];
    b.setAttribute("aria-pressed",i===0?"true":"false");
    b.addEventListener("click",function(){
      $$("button",wrap).forEach(function(x){x.setAttribute("aria-pressed","false")});
      b.setAttribute("aria-pressed","true");
      grid.dataset.h43view=v[0];
      if(v[0]==="spotlight"){
        var vis=$$(".clip-card",grid).filter(function(c){return !c.hidden&&c.style.display!=="none"});
        $$(".clip-card",grid).forEach(function(c){c.classList.remove("h43-spot")});
        if(vis[0])vis[0].classList.add("h43-spot");
      }
    });
    wrap.appendChild(b);
  });
  tools.appendChild(wrap);
})();

/* H43-23 · WB38 — magnetic pull 50px + snapback lo xo (desktop only) */
(function(){
  if(!FINE||RM)return;
  $$(".btn-magnetic").forEach(function(b){
    b.addEventListener("pointermove",function(e){
      var r=b.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      var dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.hypot(dx,dy);
      if(dist<50){
        var k=(1-dist/50)*8;
        b.style.setProperty("--h43-px",(dx/dist*k).toFixed(1)+"px");
        b.style.setProperty("--h43-py",(dy/dist*k).toFixed(1)+"px");
        b.classList.add("h43-pull");b.classList.remove("h43-snap");
      }else h43Release(b);
    });
    b.addEventListener("pointerleave",function(){h43Release(b)});
  });
  function h43Release(b){
    if(!b.classList.contains("h43-pull"))return;
    b.classList.remove("h43-pull");b.classList.add("h43-snap");
    b.style.setProperty("--h43-px","0px");b.style.setProperty("--h43-py","0px");
    setTimeout(function(){b.classList.remove("h43-snap")},550);
  }
})();

/* H43-24 · WB39 — aria-label cu the cho input khong label nhin thay */
(function(){
  var s=$("#clipSearch");if(s&&!s.getAttribute("aria-label"))s.setAttribute("aria-label","Search plates by title, mood or description");
  var n=$("#newsletterEmail");if(n&&!n.getAttribute("aria-label"))n.setAttribute("aria-label","Email address for new-plate notes");
})();

/* H43-26 · WB42 — terms line + aria-describedby cho pricing */
(function(){
  var terms="One-time payment · Lifetime access · Free updates";
  $$("#pricing .stack-panel").forEach(function(p,i){
    var t=d.createElement("p");t.className="h43-terms";t.id="h43-terms-"+i;t.textContent=terms;
    t.style.cssText="font-size:.74rem;letter-spacing:.04em;opacity:.7;margin:.6rem 0 0";
    p.appendChild(t);
    var btn=p.querySelector("button,a.btn");
    if(btn){var ex=btn.getAttribute("aria-describedby");btn.setAttribute("aria-describedby",ex?ex+" "+t.id:t.id);}
  });
})();

/* H43-27 · WB45 — verb+noun qua aria-label (khong doi text, an toan EN/VI dict) */
(function(){
  var map=[["#openCompare","Compare selected plates"],["#cartRequest","Request licenses by email"],["#homeRoute","Return to the library"]];
  map.forEach(function(m){var el=$(m[0]);if(el&&!el.getAttribute("aria-label"))el.setAttribute("aria-label",m[1]);});
})();

/* H43-28 · WB46 — empty cart What-Why-Next (giu microcopy cu, them ly do + CTA) */
(function(){
  var list=$("#cartList");if(!list)return;
  function render(){
    var box=$("#h43-emptycart");
    if(list.children.length===0){
      if(!box){
        box=d.createElement("div");box.id="h43-emptycart";
        box.innerHTML='<p class="h43-ec-why">Nothing here yet — every plate is licensed individually, so your cart starts empty.</p><a class="btn ghost" href="#library"><span>Browse clips</span></a>';
        list.appendChild(box);
      }
    }else if(box)box.remove();
  }
  new MutationObserver(render).observe(list,{childList:true});
  render();
})();

/* H43-29 · WB47 — no-results: echo query + Clear + 3 mood goi y */
(function(){
  var grid=$("#clipGrid"),search=$("#clipSearch");if(!grid||!search)return;
  var box=null;
  function render(){
    var vis=$$(".clip-card",grid).filter(function(c){return !c.hidden&&c.style.display!=="none"}).length;
    if(vis===0&&search.value.trim()){
      if(!box){
        box=d.createElement("div");box.className="h43-noresults";box.setAttribute("role","status");
        box.innerHTML='<p>No plates match <strong></strong>.</p><div class="h43-nr-row"><button type="button" class="btn ghost h43-nr-clear"><span>Clear search</span></button></div><p class="h43-nr-moods">Try a mood:</p><div class="h43-nr-chips"></div>';
        box.querySelector(".h43-nr-clear").addEventListener("click",function(){
          search.value="";search.dispatchEvent(new Event("input",{bubbles:true}));
        });
        var chips=box.querySelector(".h43-nr-chips");
        ["rain","night","ocean"].forEach(function(m){
          var b=d.createElement("button");b.type="button";b.className="mood-chip";b.textContent=m[0].toUpperCase()+m.slice(1);
          b.addEventListener("click",function(){
            var real=document.querySelector('.mood-chip[data-mood="'+m+'"]');
            if(real)real.click();
          });
          chips.appendChild(b);
        });
        grid.parentNode.insertBefore(box,grid.nextSibling);
      }
      box.querySelector("strong").textContent="“"+search.value.trim()+"”";
      box.style.display="";
    }else if(box)box.style.display="none";
  }
  on(search,"input",function(){setTimeout(render,350)});
  d.addEventListener("click",function(e){if(e.target.closest&&e.target.closest(".filter,.mood-chip"))setTimeout(render,350)});
})();

/* ============ C. creative tu soan ============ */

/* H43-32 · Frame guides — toggle safe-area trong gallery */
(function(){
  var media=$("#galleryMedia"),tools=$(".gallery-tools");
  if(!media||!tools)return;
  var g=d.createElement("div");g.className="h43-guides";g.setAttribute("aria-hidden","true");
  ["2.39:1","16:9","9:16","1:1"].forEach(function(r){
    var i=d.createElement("i");i.setAttribute("data-ratio",r);g.appendChild(i);
  });
  media.appendChild(g);
  var b=d.createElement("button");b.type="button";b.className="btn ghost h43-guides-btn";
  b.innerHTML="<span>Guides: off</span>";b.setAttribute("aria-pressed","false");
  var modes=[["off",""],["239","2.39:1"],["169","16:9"],["916","9:16"],["11","1:1"]],ix=0;
  b.addEventListener("click",function(){
    ix=(ix+1)%modes.length;var m=modes[ix];
    g.classList.toggle("on",m[0]!=="off");
    g.dataset.h43g=m[0];b.querySelector("span").textContent="Guides: "+m[1];
    b.setAttribute("aria-pressed",m[0]!=="off"?"true":"false");
  });
  tools.appendChild(b);
})();

/* H43-33 · Film leader 3·2·1 truoc khi gallery video chay */
function h43Leader(){
  if(RM)return;
  var media=$("#galleryMedia"),v=$("#galleryVideo");
  if(!media||!v)return;
  var old=media.querySelector(".h43-leader");if(old)old.remove();
  var l=d.createElement("div");l.className="h43-leader h43-n3";l.setAttribute("aria-hidden","true");
  l.innerHTML='<b>3</b><span class="h43-sweep"></span>';
  media.appendChild(l);v.pause();
  var n=3,b=l.querySelector("b");
  var iv=setInterval(function(){
    n--;if(n<=0){clearInterval(iv);l.remove();v.play().catch(function(){});return;}
    b.textContent=n;
  },450);
}

/* H43-34 · Double-exposure hero tu chinh poster */
(function(){
  var hm=$(".hero-media"),img=$(".hero-media img");
  if(!hm||!img||!img.src)return;
  hm.style.setProperty("--h43-de-img",'url("'+img.src+'")');
  hm.classList.add("h43-de");
})();

/* H43-35 · Grade-temperature filter chips (curatorial mapping theo ten clip) */
(function(){
  var row=$(".mood-row"),grid=$("#clipGrid");if(!row||!grid)return;
  function tempOf(name){
    name=(name||"").toLowerCase();
    if(/sunset|dusk|dawn|amber|gold/.test(name))return "warm";
    if(/rain|mist|night|storm|deep|cold|blue/.test(name))return "cool";
    return "neutral";
  }
  $$(".clip-card",grid).forEach(function(c){
    var h=c.querySelector(".clip-info h3");
    c.dataset.h43temp=tempOf(h?h.textContent:"");
  });
  var wrap=d.createElement("div");wrap.className="h43-tempfilter";wrap.setAttribute("role","group");wrap.setAttribute("aria-label","Filter by color temperature");
  var lab=d.createElement("span");lab.className="h43-tlabel";lab.textContent="TONE";wrap.appendChild(lab);
  var cur="";
  [["warm","Warm"],["neutral","Neutral"],["cool","Cool"]].forEach(function(t){
    var b=d.createElement("button");b.type="button";b.dataset.temp=t[0];
    b.setAttribute("aria-pressed","false");b.innerHTML="<i></i><span>"+t[1]+"</span>";
    b.addEventListener("click",function(){
      cur=(cur===t[0])?"":t[0];
      $$("button",wrap).forEach(function(x){x.setAttribute("aria-pressed",x.dataset.temp===cur?"true":"false")});
      $$(".clip-card",grid).forEach(function(c){c.hidden=!!(cur&&c.dataset.h43temp!==cur)});
    });
    wrap.appendChild(b);
  });
  row.parentNode.insertBefore(wrap,row.nextSibling);
})();

/* H43-37 · End card khi gallery video ket thuc */
(function(){
  var media=$("#galleryMedia"),v=$("#galleryVideo");if(!media||!v)return;
  var ec=d.createElement("div");ec.className="h43-endcard";ec.setAttribute("role","group");ec.setAttribute("aria-label","Clip finished");
  ec.innerHTML='<p>End of plate.</p><div class="h43-endrow"><button type="button" class="btn ghost" data-h43e="replay"><span>↻ Replay</span></button><button type="button" class="btn ghost" data-h43e="next"><span>Next plate →</span></button><a class="btn" href="#pricing" data-h43e="license"><span>See licensing</span></a></div>';
  media.appendChild(ec);
  v.addEventListener("ended",function(){ec.classList.add("on")});
  v.addEventListener("play",function(){ec.classList.remove("on")});
  ec.addEventListener("click",function(e){
    var a=e.target.closest("[data-h43e]");if(!a)return;
    var k=a.getAttribute("data-h43e");
    if(k==="replay"){ec.classList.remove("on");v.currentTime=0;v.play().catch(function(){})}
    if(k==="next"){var nx=$("#galleryNext");if(nx)nx.click()}
    if(k==="license"){var gm=$("#galleryModal");var c=gm?gm.querySelector('[data-close="galleryModal"]'):null;if(c)c.click()}
  });
})();

/* H43-38 · Loop counter hero */
(function(){
  var v=$("#heroVideo"),hm=$(".hero-media");if(!v||!hm)return;
  var el=d.createElement("span");el.className="h43-loopcount";el.setAttribute("aria-hidden","true");
  var n=0,last=0;el.textContent="LOOP 001";hm.appendChild(el);
  v.addEventListener("timeupdate",function(){
    var t=v.currentTime;
    if(t<last-0.5){n++;el.textContent="LOOP "+String(n+1).padStart(3,"0")}
    last=t;
  });
})();

/* H43-39 · Reel-change cue marks tren video dang chay */
(function(){
  var v=$("#galleryVideo"),media=$("#galleryMedia");if(!v||!media)return;
  var cue=d.createElement("span");cue.className="h43-cue";cue.setAttribute("aria-hidden","true");media.appendChild(cue);
  var lastCue=0;
  v.addEventListener("timeupdate",function(){
    if(RM)return;
    var t=v.currentTime;
    if(t-lastCue>12){lastCue=t;cue.classList.remove("on");void cue.offsetWidth;cue.classList.add("on");}
  });
})();

/* H43-40 · Projection dust trong gallery modal */
function h43Dust(){
  if(RM||SAVE)return;
  var sheet=$("#galleryModal .feature-sheet");if(!sheet||sheet.querySelector(".h43-dust"))return;
  var dz=d.createElement("div");dz.className="h43-dust h43-anim";dz.setAttribute("aria-hidden","true");
  for(var i=0;i<14;i++){
    var p=d.createElement("i"),s=(Math.random()*3+1.5).toFixed(1);
    p.style.cssText="left:"+ (Math.random()*100)+"%;top:"+(20+Math.random()*80)+"%;width:"+s+"px;height:"+s+"px;animation-duration:"+(9+Math.random()*14).toFixed(1)+"s;animation-delay:-"+(Math.random()*12).toFixed(1)+"s;opacity:"+(0.15+Math.random()*0.4).toFixed(2);
    dz.appendChild(p);
  }
  sheet.appendChild(dz);
}

/* H43-41 · Dissolve khi doi clip trong gallery */
(function(){
  var v=$("#galleryVideo"),t=$("#galleryTitle");if(!v||!t)return;
  var mo=new MutationObserver(function(){
    ["#galleryImage","#galleryVideo"].forEach(function(s){
      var el=$(s);if(el){el.classList.add("h43-dissolving");setTimeout(function(){el.classList.remove("h43-dissolving")},300);}
    });
  });
  mo.observe(t,{childList:true,characterData:true,subtree:true});
})();

/* H43-42 · INTERMISSION khi stall > 3s */
(function(){
  var v=$("#galleryVideo"),media=$("#galleryMedia");if(!v||!media)return;
  var im=d.createElement("div");im.className="h43-intermission";im.setAttribute("role","status");
  im.innerHTML="<strong>INTERMISSION</strong><span>BUFFERING THE NEXT REEL</span>";
  media.appendChild(im);var t=null;
  v.addEventListener("waiting",function(){t=setTimeout(function(){im.classList.add("on")},3000)});
  ["playing","canplay","error"].forEach(function(ev){v.addEventListener(ev,function(){clearTimeout(t);im.classList.remove("on")})});
})();

/* H43-43 + H43-44 · SMPTE bars khi loi + tu retry 1 lan */
(function(){
  var v=$("#galleryVideo"),media=$("#galleryMedia");if(!v||!media)return;
  v.addEventListener("error",function(){
    if(!v.dataset.h43Retried){v.dataset.h43Retried="1";try{v.load()}catch(e){}}
    else media.classList.add("h43-smpte");
  });
})();

/* ============ D/E. micro ============ */

/* H43-30 · WB49 — validate khi blur, khong do khi dang go */
(function(){
  ["#contactForm","#newsletterForm"].forEach(function(s){
    var f=$(s);if(!f)return;
    f.addEventListener("focusout",function(e){
      var el=e.target;
      if(el&&(el.tagName==="INPUT"||el.tagName==="TEXTAREA"||el.tagName==="SELECT")){
        el.classList.add("h43-touched");
        el.setAttribute("aria-invalid",el.checkValidity()?"false":"true");
      }
    });
    f.addEventListener("input",function(e){
      var el=e.target;
      if(el.classList&&el.classList.contains("h43-touched")&&el.checkValidity()){
        el.classList.remove("h43-touched");el.setAttribute("aria-invalid","false");
      }
    });
  });
})();

/* H43-31 · WB50 — speed bump: tom tat license truoc nut checkout */
function h43SpeedBump(){
  var req=$("#cartRequest"),total=$("#cartTotal"),cc=$("#cartCount");if(!req)return;
  var sb=$("#h43-speedbump");
  if(!sb){sb=d.createElement("p");sb.id="h43-speedbump";
    sb.style.cssText="font-size:.78rem;letter-spacing:.03em;opacity:.75;margin:0 0 .6rem";
    req.parentNode.insertBefore(sb,req);}
  var n=cc?((cc.textContent||"0").replace(/\D/g,"")||"0"):"0";
  var t=total?(total.textContent||"$0").trim():"$0";
  sb.textContent=(+n>0)?("License summary: "+n+" plate"+(+n>1?"s":"")+" · "+t+" total — pay only to publish."):"Your cart is empty — add a plate to begin.";
}

/* H43-50 + H43-83 · card focus duoc + roving bang phim mui ten */
(function(){
  var grid=$("#clipGrid");if(!grid)return;
  function cards(){return $$(".clip-card",grid).filter(function(c){return !c.hidden&&c.style.display!=="none"})}
  cards().forEach(function(c){if(!c.hasAttribute("tabindex"))c.setAttribute("tabindex","0")});
  new MutationObserver(function(){cards().forEach(function(c){if(!c.hasAttribute("tabindex"))c.setAttribute("tabindex","0")})}).observe(grid,{childList:true});
  grid.addEventListener("keydown",function(e){
    var cs=cards(),ix=cs.indexOf(d.activeElement);if(ix<0)return;
    var nx=null;
    if(e.key==="ArrowRight"||e.key==="ArrowDown")nx=(ix+1)%cs.length;
    if(e.key==="ArrowLeft"||e.key==="ArrowUp")nx=(ix-1+cs.length)%cs.length;
    if(e.key==="Home")nx=0; if(e.key==="End")nx=cs.length-1;
    if(nx!==null){e.preventDefault();cs[nx].focus();}
  });
})();

/* H43-71, H43-72 · aria-label cho form (bo sung, khong doi UI) */
(function(){
  var nf=$("#newsletterForm");if(nf&&!nf.getAttribute("aria-label"))nf.setAttribute("aria-label","New plates newsletter");
  var cf=$("#contactForm");if(cf&&!cf.getAttribute("aria-label"))cf.setAttribute("aria-label","License inquiry form");
})();

/* H43-73 · Escape xoa search */
(function(){
  var s=$("#clipSearch");if(!s)return;
  s.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&s.value){e.stopPropagation();s.value="";s.dispatchEvent(new Event("input",{bubbles:true}));}
  });
})();

/* H43-74 · .library-count thanh live region dem ket qua */
(function(){
  var lc=$(".library-count");if(!lc)return;
  lc.setAttribute("aria-live","polite");lc.setAttribute("aria-atomic","true");
})();

/* H43-75 · prefetch video clip ke tiep khi idle (khong save-data) */
(function(){
  var gm=$("#galleryModal");if(!gm||SAVE)return;
  function prefetchNext(){
    var cards=$$("#clipGrid .clip-card").filter(function(c){return !c.hidden});
    var curT=$("#galleryTitle"),ix=0;
    if(curT)cards.forEach(function(c,i){var h=c.querySelector(".clip-info h3");if(h&&h.textContent===curT.textContent)ix=i;});
    var nx=cards[(ix+1)%Math.max(cards.length,1)];
    var url=nx&&nx.dataset?nx.dataset.video:null;
    if(url&&!document.querySelector('link[data-h43pf="'+url+'"]')){
      var l=d.createElement("link");l.rel="prefetch";l.as="video";l.href=url;l.setAttribute("data-h43pf",url);
      d.head.appendChild(l);
    }
  }
  new MutationObserver(function(){
    if(!gm.hasAttribute("hidden"))idle(prefetchNext);
  }).observe(gm,{attributes:true,attributeFilter:["hidden"]});
})();

/* H43-77 · theme-color sync theo toggle theme */
(function(){
  var meta=document.querySelector('meta[name="theme-color"]:not([media])');
  var tt=$("#themeToggle");if(!meta||!tt)return;
  function sync(){
    var dark=d.documentElement.classList.contains("dark")||d.documentElement.dataset.theme==="dark";
    meta.setAttribute("content",dark?"#0a0c0f":"#faf8f4");
  }
  tt.addEventListener("click",function(){setTimeout(sync,50)});
  idle(sync);
})();

/* H43-78 · galleryVideo preload none cho den khi mo modal */
(function(){
  var v=$("#galleryVideo"),gm=$("#galleryModal");if(!v||!gm)return;
  if(v.getAttribute("preload")!=="none")v.setAttribute("data-h43-pre",v.getAttribute("preload")||"");
  v.setAttribute("preload","none");
  new MutationObserver(function(){
    if(!gm.hasAttribute("hidden"))v.setAttribute("preload","auto");
  }).observe(gm,{attributes:true,attributeFilter:["hidden"]});
})();

/* H43-79 · canh bao khi roi trang luc cart con item */
w.addEventListener("beforeunload",function(e){
  var cc=$("#cartCount"),n=cc?((cc.textContent||"0").replace(/\D/g,"")||"0"):"0";
  if(+n>0){e.preventDefault();e.returnValue="";}
});

/* H43-80 · #cartTotal aria-live (atomic da co tu batch truoc) */
(function(){var t=$("#cartTotal");if(t&&!t.getAttribute("aria-live"))t.setAttribute("aria-live","polite")})();

/* H43-81 · "N min read" cho article modal, tinh tu text that */
(function(){
  var body=$("#articleBody"),kick=$("#articleKicker");if(!body||!kick)return;
  new MutationObserver(function(){
    var words=(body.textContent||"").trim().split(/\s+/).length;
    var old=kick.querySelector(".h43-readtime");if(old)old.remove();
    if(words>20){
      var s=d.createElement("span");s.className="h43-readtime";
      s.textContent=" · "+Math.max(1,Math.round(words/200))+" min read";
      kick.appendChild(s);
    }
  }).observe(body,{childList:true,characterData:true,subtree:true});
})();

/* H43-82 · chan download preview video */
(function(){["#galleryVideo","#modalVideo"].forEach(function(s){var v=$(s);if(v)v.setAttribute("controlsList","nodownload")})})();

/* H43-84 · console brand (khong credit AI) */
try{console.info("%cPlates%c — cinematic background plates","font-family:Georgia,serif;font-size:18px;color:#d5b776","color:inherit")}catch(e){}

/* H43-89 · enterkeyhint send cho nut submit contact */
(function(){var b=$("#contactForm button[type=submit]");if(b)b.setAttribute("enterkeyhint","send")})();

/* H43-90 · autocapitalize words cho ten */
(function(){var n=$("#contactName");if(n)n.setAttribute("autocapitalize","words")})();

/* H43-91 · tat autocorrect cho search */
(function(){var s=$("#clipSearch");if(s)s.setAttribute("autocorrect","off")})();

/* H43-92 · galleryModal describedby galleryDesc */
(function(){var g=$("#galleryModal");if(g&&$("#galleryDesc"))g.setAttribute("aria-describedby","galleryDesc")})();

/* H43-93 + H43-95 · aria-pressed cho filter + mood chips */
function h43Pressed(sel){
  $$(sel).forEach(function(b){
    if(!b.hasAttribute("aria-pressed"))b.setAttribute("aria-pressed",b.classList.contains("active")?"true":"false");
  });
  d.addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest(sel):null;if(!b)return;
    setTimeout(function(){$$(sel).forEach(function(x){x.setAttribute("aria-pressed",x.classList.contains("active")?"true":"false")})},60);
  });
}
h43Pressed(".filter");h43Pressed(".mood-chip");

/* H43-94 · tab aria-controls */
(function(){["#allTab","#likedTab"].forEach(function(s){var t=$(s);if(t&&!t.getAttribute("aria-controls"))t.setAttribute("aria-controls","clipGrid")})})();

/* H43-96 · skip link: #main focus duoc de chuyen focus that */
(function(){var m=$("#main");if(m&&!m.hasAttribute("tabindex"))m.setAttribute("tabindex","-1")})();

/* H43-97 · footer year tu dong */
(function(){
  var fc=$(".footer-copy");if(!fc)return;
  fc.innerHTML=fc.innerHTML.replace(/©\s*\d{4}/,"© "+new Date().getFullYear());
})();

/* H43-98 · focus nut retry khi hien */
(function(){
  var r=$("#galleryRetry");if(!r)return;
  new MutationObserver(function(){
    if(!r.hasAttribute("hidden"))r.focus({preventScroll:true});
  }).observe(r,{attributes:true,attributeFilter:["hidden"]});
})();

/* H43-99 · #clipSearch aria-controls */
(function(){var s=$("#clipSearch");if(s&&!s.getAttribute("aria-controls"))s.setAttribute("aria-controls","clipGrid")})();

/* H43-100 · #notFound focus duoc khi hien (a11y route change) */
(function(){
  var nf=$("#notFound");if(!nf)return;
  if(!nf.hasAttribute("tabindex"))nf.setAttribute("tabindex","-1");
  new MutationObserver(function(){
    if(nf.classList.contains("show"))nf.focus({preventScroll:true});
  }).observe(nf,{attributes:true,attributeFilter:["class"]});
})();

/* init cac render phu thuoc cart */
h43SpeedBump();
})();
