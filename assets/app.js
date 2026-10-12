
(function(){
"use strict";
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---------------- data ---------------- */
const CLIPS=[
 {id:"fog-road",   name:"Fog Road",    coll:"Valley Road", meta:"4K · 24 fps · 12 s", desc:"Empty asphalt at night. Rain, wet reflections, drifting mist. 3D render, Unreal Engine 5."},
 {id:"wet-asphalt",name:"Wet Asphalt", coll:"Valley Road", meta:"4K · 24 fps · 10 s", desc:"Low tracking shot over soaked tarmac. Sheets of rain in the dark. 3D render, Unreal Engine 5."},
 {id:"mist-line",  name:"Mist Line",   coll:"Valley Road", meta:"4K · 24 fps · 14 s", desc:"A valley road dissolving into mist. Slow push through layered fog. 3D render, Unreal Engine 5."},
 {id:"cold-aisle", name:"Cold Aisle",  coll:"Data Center", meta:"4K · 24 fps · 10 s", desc:"Cold aisle containment. Server rows, cyan status light, chilled haze. 3D render, Unreal Engine 5."},
 {id:"immersion-tank",name:"Immersion Tank",coll:"Data Center",meta:"4K · 24 fps · 12 s", desc:"Immersion cooling tank. Boards submerged in dielectric fluid, slow bubbles. 3D render, Unreal Engine 5."},
 {id:"subsea-cable",name:"Subsea Cable",coll:"Data Center", meta:"4K · 24 fps · 15 s", desc:"Undersea cable run. Dark water, faint guide lights along the line. 3D render, Unreal Engine 5."},
 {id:"black-smoker",name:"Black Smoker",coll:"Deep Ocean",  meta:"4K · 24 fps · 12 s", desc:"Black smoker vent. Mineral smoke rising through crushing dark. 3D render, Unreal Engine 5."},
 {id:"abyss-drift",name:"Abyss Drift", coll:"Deep Ocean",  meta:"4K · 24 fps · 14 s", desc:"Slow drift above the abyssal plain. Marine snow, distant bioluminescence. 3D render, Unreal Engine 5."},
 {id:"vent-field", name:"Vent Field",  coll:"Deep Ocean",  meta:"4K · 24 fps · 10 s", desc:"Hydrothermal vent field. Orange glow against blue-black water. 3D render, Unreal Engine 5."}
];
const STACK_IDS=["fog-road","cold-aisle","subsea-cable","black-smoker"];
const byId=id=>CLIPS.find(c=>c.id===id);
/* collection poster stills (placeholder plates — swap with real UE5 exports) */
const COLL_POSTER={"Valley Road":"assets/posters/valley-road.jpg","Data Center":"assets/posters/data-center.jpg","Deep Ocean":"assets/posters/deep-ocean.jpg"};

/* ---------------- render cards ---------------- */
function stripCard(c){
  return `<article class="strip-card tilt" role="listitem" tabindex="0" data-clip="${c.id}">
    <div class="poster p-${c.id}" data-poster="${c.id}"><img src="${COLL_POSTER[c.coll]}" alt="${c.name} plate still" loading="lazy" decoding="async" width="1280" height="720"><span class="preview-pill">Preview</span><span class="tc">${tcOf(c)}</span><button class="sl-btn" data-sl="${c.id}" aria-label="Shortlist ${c.name}" title="Add to shortlist">♡</button></div>
    <div class="strip-body">
      <p class="eyebrow">${c.coll}</p><h3>${c.name}</h3><p>${c.desc}</p>
      <div class="meta-row"><span class="meta">${c.meta}</span>
      <button class="btn-license magnetic" data-lic="${c.id}">License</button></div>
    </div></article>`;
}
function gridCard(c){
  return `<article class="card tilt" role="listitem" tabindex="0" data-clip="${c.id}">
    <div class="poster p-${c.id}" data-poster="${c.id}"><img src="${COLL_POSTER[c.coll]}" alt="${c.name} plate still" loading="lazy" decoding="async" width="1280" height="720"><span class="preview-pill">Preview</span><span class="tc">${tcOf(c)}</span><button class="sl-btn" data-sl="${c.id}" aria-label="Shortlist ${c.name}" title="Add to shortlist">♡</button></div>
    <div class="card-body">
      <p class="eyebrow">${c.coll}</p>
      <h3 class="mask"><span class="mi">${c.name}</span></h3>
      <p class="desc">${c.desc}</p>
      <div class="card-foot"><span class="meta">${c.meta}</span>
      <button class="btn-license magnetic" data-lic="${c.id}">License</button></div>
    </div></article>`;
}
function stackCard(c,i){
  return `<article class="stack-card" tabindex="0" data-clip="${c.id}">
    <span class="stack-num">0${i+1} / 04</span>
    <div class="poster p-${c.id}" data-poster="${c.id}"><img src="${COLL_POSTER[c.coll]}" alt="${c.name} plate still" loading="lazy" decoding="async" width="1280" height="720"><span class="tc">${tcOf(c)}</span><button class="sl-btn" data-sl="${c.id}" aria-label="Shortlist ${c.name}" title="Add to shortlist">♡</button></div>
    <div class="stack-info">
      <p class="eyebrow">${c.coll} · Spotlight</p><h3>${c.name}</h3><p>${c.desc}</p>
      <div class="meta-row" style="margin-top:18px"><span class="meta">${c.meta}</span>
      <button class="btn-license magnetic" data-lic="${c.id}">License</button></div>
    </div></article>`;
}
$("#stripTrack").innerHTML=CLIPS.map(stripCard).join("");
$("#grid").innerHTML=CLIPS.map(gridCard).join("");
$("#stackStage").innerHTML=STACK_IDS.map((id,i)=>stackCard(byId(id),i)).join("");

/* ---------------- hero word split ---------------- */
$$(".w-split").forEach(el=>{
  const words=el.textContent.trim().split(/\s+/);
  el.innerHTML=words.map((w,i)=>`<span class="w" style="animation-delay:${.25+i*.1}s">${w}</span>`).join(" ");
});

/* ---------------- scroll engine ---------------- */
const nav=$("#nav"), progress=$("#progress"), hero=$("#overview"), heroIn=$("#heroIn"),
      light=$("#cursorLight"), dimmer=$("#dimmer"),
      scWrap=$("#scenes"), frame=$("#sceneFrame"), wordsEl=$("#sceneWords"),
      words=$$("#sceneWords span"), scenes=[$(".s0"),$(".s1"),$(".s2")],
      colWrap=$("#collections"), track=$("#stripTrack"), stripView=$(".strip-view"),
      stWrap=$("#spotlight"), stackCards=$$(".stack-card");
const toTop=$("#toTop"), ttFg=$("#ttFg"), TT_C=119.4;
/* Ken Burns targets: poster frames that breathe with scroll */
const scenePosters=scenes.map(s=>s.querySelector(".poster")).filter(Boolean);
const stripPosters=$$("#stripTrack .poster");
const bgWordStrip=document.querySelector("#collections .bg-word");
const bgWordStack=document.querySelector("#spotlight .bg-word");
/* scroll-driven text fill (Apple-style word illumination) */
const fillEls=$$(".fill-text").map(el=>{
  const words=el.textContent.trim().split(/\s+/);
  el.innerHTML=words.map(w=>`<span class="fw">${w}</span>`).join(" ");
  return {el,words:[...el.querySelectorAll(".fw")],top:0,total:1};
});
function measureFill(){
  const vh=document.documentElement.clientHeight||innerHeight;
  fillEls.forEach(f=>{ f.top=docTop(f.el)-vh*.72; f.total=Math.max(vh*.45,1); });
}
function applyFill(){
  const y=scrollY;
  for(const f of fillEls){
    const n=Math.round(clamp((y-f.top)/f.total,0,1)*f.words.length);
    f.words.forEach((w,i)=>w.classList.toggle("on",i<n));
  }
}

/* Scroll-robust progress: cache each section's document-relative position
   using offsetTop/offsetHeight (pure layout values, immune to viewport
   changes); during scroll only scrollY is read, so browser-chrome
   show/hide can never inject measurement noise. */
let secCache={};
function docTop(el){
  let top=0;
  while(el){ top+=el.offsetTop; el=el.offsetParent; }
  return top;
}
function measureSections(){
  const vh=document.documentElement.clientHeight||innerHeight;
  [[scWrap,"scenes"],[colWrap,"strip"],[stWrap,"stack"]].forEach(([node,k])=>{
    secCache[k]={top:docTop(node), total:node.offsetHeight-vh};
  });
}
function secPCached(k){
  const c=secCache[k];
  return c&&c.total>0?clamp((scrollY-c.top)/c.total,0,1):0;
}
/* ---------- scroll engine: 1:1 tracking ----------
   Animations lock exactly to the native scroll position (no lerp lag),
   so motion stays perfectly in sync like a normal page. */
const targ={hero:0,scenes:0,strip:0,stack:0};  /* scroll targets */
let stripMax=0;
function measure(){ stripMax=Math.max(track.scrollWidth-stripView.clientWidth,0); }
function readTargets(){
  const y=scrollY, doc=document.documentElement.scrollHeight-innerHeight, vh=document.documentElement.clientHeight||innerHeight;
  progress.style.width=(doc>0?y/doc*100:0)+"%";
  nav.classList.toggle("compact",y>vh*.65);
  toTop.classList.toggle("show",y>vh*.8);
  ttFg.style.strokeDashoffset=(TT_C*(1-(doc>0?y/doc:0))).toFixed(1);
  targ.hero=clamp(y/(hero.offsetHeight*.92),0,1);
  targ.scenes=secPCached("scenes");
  targ.strip=secPCached("strip");
  targ.stack=secPCached("stack");
}
function applyHero(p){
  heroIn.style.transform=`translate3d(0,${(p*90).toFixed(1)}px,0) scale(${(1-p*.1).toFixed(4)})`;
  heroIn.style.opacity=(1-p*1.15).toFixed(3);
}
function applyScenes(p){
  frame.style.transform=`scale(${(.82+.18*p).toFixed(4)})`;
  /* Telegram-style cross-dissolve: scenes melt into each other */
  for(let k=0;k<3;k++){
    const s=k/3, e=(k+1)/3, f=.12;
    let op=1;
    if(k>0) op=Math.min(op,clamp((p-s)/f,0,1));
    if(k<2) op=Math.min(op,clamp((e-p)/f,0,1));
    scenes[k].style.opacity=op.toFixed(3);
    scenes[k].style.transform=`scale(${(1+(1-op)*.06).toFixed(4)})`;
    /* Ken Burns: the visible scene's frame breathes slightly */
    if(scenePosters[k]) scenePosters[k].style.transform=`scale(${(1.04+op*.05).toFixed(4)})`;
  }
  const wi=clamp(Math.floor(p*3),0,2);
  words.forEach((w,k)=>w.classList.toggle("on",k===wi));
  const dim=Math.sin(p*Math.PI);
  dimmer.style.opacity=dim.toFixed(3);
  wordsEl.classList.toggle("light",dim>0.35);
}
function applyStrip(p){
  /* track position is handled every frame in render() (scroll + drag);
     here only the Ken Burns breathing on the frames */
  const kb=(1+p*.07).toFixed(4);
  for(const el of stripPosters) el.style.transform=`scale(${kb})`;
  if(bgWordStrip) bgWordStrip.style.transform=`translateX(calc(-50% + ${(p*140-70).toFixed(1)}px))`;
}
function applyStack(p){
  const af=p*(stackCards.length-1);
  if(bgWordStack) bgWordStack.style.transform=`translateX(calc(-50% + ${(p*120-60).toFixed(1)}px))`;
  stackCards.forEach((c,i)=>{
    const d=i-af; let scale,yy,op;
    if(d<=0){ scale=1+d*.07; yy=d*46; op=d<-2.6?0:1; }
    else{ scale=1-d*.08; yy=d*160; op=d>=1?0:(d>0.7?(1-d)/0.3:1); }
    c.style.transform=`translate(-50%,-50%) translate3d(0,${yy.toFixed(1)}px,0) rotateY(${(d*-7).toFixed(2)}deg) scale(${Math.max(scale,.5).toFixed(4)})`;
    c.style.opacity=op.toFixed(3);
    c.style.zIndex=100+i;
    c.style.pointerEvents=Math.abs(d)<.5?"auto":"none";
  });
}
let needApply=true;
/* hero collage mouse parallax (outer scope so render() can reach it) */
let hvtx=0,hvty=0,hvx=0,hvy=0;
const hvInEls=$$(".hv-in");
function heroParallax(){
  if(scrollY>innerHeight*1.3||!hvInEls.length) return;
  hvx=lerp(hvx,hvtx,.06); hvy=lerp(hvy,hvty,.06);
  for(const el of hvInEls){
    const d=+el.dataset.depth||20, b=+el.dataset.base||0;
    el.style.transform=`translate3d(${(hvx*d).toFixed(1)}px,${(hvy*d).toFixed(1)}px,0) rotate(${b}deg)`;
  }
}
/* strip drag-to-scroll */
let stripOff=0,stripOffCur=0,sDrag=false,sDragMoved=false,sStartX=0,sStartOff=0;
/* marquee: JS-driven (not CSS animation) so weak GPUs don't need a giant
   compositor layer; whole-pixel steps kill sub-pixel shimmer. */
const mqTrack=document.querySelector(".mq-track");
const mqReduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
let mqX=0, mqHalf=0, mqLast=0, mqPaused=false;
const MQ_PX_PER_SEC=14;
function mqMeasure(){ if(mqTrack) mqHalf=mqTrack.scrollWidth/2; }
function mqTick(now){
  if(mqTrack&&mqHalf>0&&!mqReduce&&!mqPaused&&!document.hidden){
    if(mqLast) mqX=(mqX+MQ_PX_PER_SEC*(now-mqLast)/1000)%mqHalf;
    mqTrack.style.transform=`translateX(${-Math.round(mqX)}px)`;
  }
  mqLast=now;
}
/* marquee pauses while the reader hovers it */
const mqEl=document.querySelector(".marquee");
if(mqEl){
  mqEl.addEventListener("pointerenter",()=>mqPaused=true);
  mqEl.addEventListener("pointerleave",()=>mqPaused=false);
}
function render(now){
  if(document.hidden){ requestAnimationFrame(render); return; }
  mqTick(now||0);
  if(needRead){ needRead=false; readTargets(); needApply=true; }
  heroParallax();
  /* strip: scroll-driven travel + smoothed drag offset, every frame */
  stripOffCur=lerp(stripOffCur,stripOff,.14);
  if(stripMax>0){
    const sx=clamp(-targ.strip*stripMax+stripOffCur,-stripMax,0);
    track.style.transform=`translate3d(${sx.toFixed(1)}px,0,0)`;
  }
  if(needApply){
    needApply=false;
    applyHero(targ.hero); applyScenes(targ.scenes); applyStrip(targ.strip); applyStack(targ.stack);
    applyFill();
  }
  requestAnimationFrame(render);
}
/* strip drag-to-scroll (pointer) */
stripView.addEventListener("pointerdown",e=>{
  sDrag=true; sDragMoved=false; sStartX=e.clientX; sStartOff=stripOff;
  stripView.classList.add("dragging");
  try{ stripView.setPointerCapture(e.pointerId); }catch(_){}
});
stripView.addEventListener("pointermove",e=>{
  if(!sDrag) return;
  const dx=e.clientX-sStartX;
  if(Math.abs(dx)>6) sDragMoved=true;
  stripOff=clamp(sStartOff+dx*1.4,-stripMax,stripMax);
});
const endStripDrag=()=>{ sDrag=false; stripView.classList.remove("dragging"); };
stripView.addEventListener("pointerup",endStripDrag);
stripView.addEventListener("pointercancel",endStripDrag);
stripView.addEventListener("click",e=>{ if(sDragMoved){ e.stopPropagation(); e.preventDefault(); sDragMoved=false; } },true);
let lastY=0;
addEventListener("scroll",()=>{
  const y=scrollY;
  /* nav hides on scroll down, returns on scroll up */
  if(y>lastY+6&&y>420) nav.classList.add("hide");
  else if(y<lastY-6) nav.classList.remove("hide");
  lastY=y;
  needRead=true;
},{passive:true});
let needRead=false;
let rzT=0; addEventListener("resize",()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ measure(); measureSections(); mqMeasure(); measureFill(); readTargets(); needApply=true; },150); });
addEventListener("load",()=>{ measure(); measureSections(); mqMeasure(); measureFill(); readTargets(); needApply=true; });
measure(); measureSections(); mqMeasure(); measureFill(); readTargets(); render();

/* cursor light follows (lerped) */
let tx=innerWidth/2,ty=innerHeight/2,cx=tx,cy=ty;
hero.addEventListener("pointermove",e=>{
  const r=hero.getBoundingClientRect(); tx=e.clientX-r.left; ty=e.clientY-r.top;
});
let heroVisible=true;
try{ new IntersectionObserver(es=>{ heroVisible=es[0].isIntersecting; },{threshold:0}).observe(hero); }catch(_){}
(function lightLoop(){
  if(!document.hidden&&heroVisible){
    cx=lerp(cx,tx,.07); cy=lerp(cy,ty,.07);
    light.style.transform=`translate(${cx-320}px,${cy-320}px)`;
  }
  requestAnimationFrame(lightLoop);
})();

/* pause hero glow drift when hero is off-screen (saves GPU) */
const glowIO=new IntersectionObserver(es=>es.forEach(e=>{
  $$(".glow").forEach(g=>g.style.animationPlayState=e.isIntersecting?"running":"paused");
}),{threshold:0});
glowIO.observe(hero);

/* ---------------- reveal + spy ---------------- */
$$(".rv").forEach(el=>{
  const sibs=[...el.parentNode.children].filter(c=>c.classList&&c.classList.contains("rv"));
  el.style.setProperty("--d",(sibs.indexOf(el)*.09).toFixed(2)+"s");
});
const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }),{threshold:.18});
$$(".rv,.mask").forEach(el=>io.observe(el));

const links=$$(".nav-link"), ink=$("#navInk"), navLinks=$("#navLinks");
function setActive(id){
  links.forEach(a=>{ const on=a.dataset.sec===id; a.classList.toggle("active",on); if(on) a.setAttribute("aria-current","true"); else a.removeAttribute("aria-current"); });
  const a=links.find(l=>l.dataset.sec===id);
  if(a){ ink.style.left=a.offsetLeft+"px"; ink.style.width=a.offsetWidth+"px"; }
}
const spy=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) setActive(e.target.id); }),{rootMargin:"-38% 0px -55% 0px"});
["overview","scenes","collections","spotlight","library","license","process","faq"].forEach(id=>{ const s=document.getElementById(id); if(s) spy.observe(s); });
addEventListener("resize",()=>{ const a=$(".nav-link.active"); if(a) setActive(a.dataset.sec); });
setActive("overview");

/* ---------------- 3D tilt + dynamic shadow ---------------- */
$$(".tilt").forEach(card=>{
  card.addEventListener("pointermove",e=>{
    const r=card.getBoundingClientRect();
    const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`perspective(950px) rotateX(${(-py*9).toFixed(2)}deg) rotateY(${(px*11).toFixed(2)}deg) translateY(-4px)`;
    card.style.setProperty("--shx",`${(-px*26).toFixed(1)}px`);
    card.style.setProperty("--shy",`${(22+py*26).toFixed(1)}px`);
  });
  card.addEventListener("pointerleave",()=>{ card.style.transform=""; card.style.removeProperty("--shx"); card.style.removeProperty("--shy"); });
});

/* ---------------- magnetic buttons ---------------- */
$$(".magnetic").forEach(btn=>{
  btn.addEventListener("pointermove",e=>{
    const r=btn.getBoundingClientRect();
    const dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
    btn.style.transform=`translate(${(dx*.26).toFixed(1)}px,${(dy*.26).toFixed(1)}px)`;
  });
  btn.addEventListener("pointerleave",()=>{ btn.style.transform="translate(0,0)"; });
});

/* ---------------- bottom sheet + FLIP ---------------- */
const sheet=$("#sheet"), backdrop=$("#backdrop"),
      sThumb=$("#sheetThumb"), sColl=$("#sheetColl"), sName=$("#sheetName"),
      sDesc=$("#sheetDesc"), sMeta=$("#sheetMeta"), clipField=$("#clipField");
let sheetClips=[], sheetSource=null;
const sheetClip=()=>sheetClips[0];

function fillSheet(){
  const c=sheetClips[0]; if(!c) return;
  sThumb.className="sheet-thumb poster p-"+c.id;
  sColl.textContent=c.coll+" · Plate";
  if(sheetClips.length===1){
    sName.textContent=c.name;
    sDesc.textContent=c.desc;
    sMeta.innerHTML=c.meta.split("·").map(s=>`<span class="chip">${s.trim()}</span>`).join("");
    clipField.value=c.name;
  }else{
    sName.textContent=sheetClips.length+" plates";
    sDesc.textContent="One request for the whole shortlist — the same tier applies to every plate.";
    sMeta.innerHTML=`<span class="chip">${sheetClips.length} clips</span><span class="chip">4K · 24 fps</span>`;
    clipField.value=sheetClips.map(x=>x.name).join(", ");
  }
  $("#bundleNote").classList.toggle("show",sheetClips.length>=3);
}
function flyTo(fromRect,toRect,dur,done){
  const fly=document.createElement("div");
  fly.className="poster p-"+sheetClip().id;
  Object.assign(fly.style,{position:"fixed",left:fromRect.left+"px",top:fromRect.top+"px",
    width:fromRect.width+"px",height:fromRect.height+"px",margin:"0",zIndex:125,
    borderRadius:"16px",pointerEvents:"none",transformOrigin:"0 0"});
  document.body.appendChild(fly);
  const dx=toRect.left-fromRect.left, dy=toRect.top-fromRect.top,
        sx=toRect.width/fromRect.width, sy=toRect.height/fromRect.height;
  const anim=fly.animate(
    [{transform:"translate(0px,0px) scale(1,1)"},
     {transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`}],
    {duration:dur,easing:"cubic-bezier(.3,1.25,.4,1)",fill:"forwards"});
  anim.onfinish=()=>{ fly.remove(); done&&done(); };
}
function openSheet(clips,sourceEl){
  trackFocus();
  sheetClips=Array.isArray(clips)?clips:[clips];
  sheetSource=sourceEl;
  fillSheet();
  if(!sourceEl){
    /* no FLIP source (e.g. shortlist drawer) — open directly */
    backdrop.classList.add("show");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    return;
  }
  const srcRect=sourceEl.getBoundingClientRect();
  backdrop.classList.add("show");
  /* measure the thumb's final position with the slide transition disabled,
     then restart the slide so the FLIP flight runs in sync with the sheet */
  sheet.style.transition="none";
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden","false");
  sThumb.style.visibility="hidden";
  const toRect=sThumb.getBoundingClientRect();
  sheet.classList.remove("open");
  void sheet.offsetWidth;
  sheet.style.transition="";
  sheet.classList.add("open");
  document.body.style.overflow="hidden";
  flyTo(srcRect,toRect,560,()=>{ sThumb.style.visibility=""; });
}
function closeSheet(){
  if(!sheet.classList.contains("open")) return;
  const toRect=(sheetSource&&document.contains(sheetSource))
    ? sheetSource.getBoundingClientRect()
    : {left:innerWidth/2-60,top:innerHeight-60,width:120,height:70};
  const fromRect=sThumb.getBoundingClientRect();
  sThumb.style.visibility="hidden";
  sheet.classList.remove("open");
  backdrop.classList.remove("show");
  sheet.setAttribute("aria-hidden","true");
  flyTo(fromRect,toRect,480,()=>{
    sThumb.style.visibility="";
    document.body.style.overflow="";
    restoreFocus();
  });
}
/* ---------------- shortlist ---------------- */
const drawer=$("#slDrawer"), slItems=$("#slItems"), slCount=$("#slCount");
let shortlist=[];
try{ shortlist=(JSON.parse(localStorage.getItem("plates-shortlist")||"[]")||[]).filter(id=>byId(id)); }catch(_){}
function saveShortlist(){ try{ localStorage.setItem("plates-shortlist",JSON.stringify(shortlist)); }catch(_){} }
function renderShortlist(){
  slCount.textContent=shortlist.length;
  slCount.classList.toggle("show",shortlist.length>0);
  $$("[data-sl]").forEach(b=>{
    const on=shortlist.includes(b.dataset.sl);
    b.classList.toggle("in",on);
    b.textContent=on?"♥":"♡";
    b.title=on?"Remove from shortlist":"Add to shortlist";
  });
  if(!shortlist.length){
    slItems.innerHTML=`<p class="sl-empty">Nothing here yet.<br>Tap ♡ on any plate to build your pick.</p>`;
    return;
  }
  slItems.innerHTML=shortlist.map(id=>{
    const c=byId(id);
    return `<div class="sl-item">
      <img class="thumb" src="${COLL_POSTER[c.coll]}" alt="${c.name} plate still" decoding="async" width="152" height="96">
      <div><p class="nm">${c.name}</p><p class="mt">${c.coll} · ${c.meta}</p></div>
      <button class="rm" data-rm="${id}" aria-label="Remove ${c.name}">×</button>
    </div>`;
  }).join("");
}
function toggleShortlist(id,btn){
  const i=shortlist.indexOf(id);
  if(i>=0){ shortlist.splice(i,1); toast("Removed from shortlist."); }
  else{ shortlist.push(id); toast("Added to shortlist.",{label:"View →",fn:openDrawer}); }
  saveShortlist(); renderShortlist();
  if(btn){ btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
  const live=$("#slLive");
  if(live) live.textContent=shortlist.length?shortlist.length+" plate"+(shortlist.length>1?"s":"")+" in your shortlist":"Shortlist is empty.";
}
function openDrawer(){ trackFocus(); renderShortlist(); drawer.classList.add("open"); drawer.setAttribute("aria-hidden","false"); backdrop.classList.add("show"); document.body.style.overflow="hidden"; }
function closeDrawer(){
  if(!drawer.classList.contains("open")) return;
  drawer.classList.remove("open"); drawer.setAttribute("aria-hidden","true");
  if(!pvModal.classList.contains("show")&&!sheet.classList.contains("open")){ backdrop.classList.remove("show"); document.body.style.overflow=""; }
  restoreFocus();
}
$("#slBtn").addEventListener("click",openDrawer);
$("#slClose").addEventListener("click",closeDrawer);
slItems.addEventListener("click",e=>{
  const rm=e.target.closest("[data-rm]");
  if(!rm) return;
  const item=rm.closest(".sl-item");
  if(item){ item.classList.add("leaving"); setTimeout(()=>toggleShortlist(rm.dataset.rm),240); }
  else toggleShortlist(rm.dataset.rm);
});
$("#slLicense").addEventListener("click",()=>{
  if(!shortlist.length){ toast("Your shortlist is empty."); return; }
  closeDrawer();
  openSheet(shortlist.map(byId),null);
});
renderShortlist();

/* ---------------- library filter ---------------- */
let fColl="all", fQ="";
function applyFilter(){
  const run=()=>{
  const q=fQ.trim().toLowerCase();
  let n=0;
  const test=c=>(fColl==="all"||c.coll===fColl)&&(!q||(c.name+" "+c.desc+" "+c.coll).toLowerCase().includes(q));
  $$("#grid .card").forEach(card=>{
    const c=byId(card.dataset.clip); if(!c) return;
    const ok=test(c);
    card.style.display=ok?"":"none";
    if(ok) n++;
  });
  $$("#listView .lrow").forEach(row=>{
    const c=byId(row.dataset.clip); if(!c) return;
    row.style.display=test(c)?"":"none";
  });
  $("#noResult").classList.toggle("show",n===0);
  };
  if(typeof document.startViewTransition==="function"&&!reduced){ try{ document.startViewTransition(run); return; }catch(_){} }
  run();
}
$("#fchips").addEventListener("click",e=>{
  const b=e.target.closest(".fchip"); if(!b) return;
  $$(".fchip").forEach(x=>x.classList.toggle("on",x===b));
  fColl=b.dataset.f; applyFilter();
});
let libQT=0; const libQ=$("#libQ"), libClear=$("#libClear");
libQ.addEventListener("input",()=>{ libClear.classList.toggle("show",libQ.value.length>0); clearTimeout(libQT); libQT=setTimeout(()=>{ fQ=libQ.value; applyFilter(); },150); });
libClear.addEventListener("click",()=>{ libQ.value=""; fQ=""; applyFilter(); libClear.classList.remove("show"); libQ.focus(); });

/* ---------------- cinematic preview modal ---------------- */
const pvModal=$("#pvModal");
function clipURL(id){ return location.origin+location.pathname+`?clip=${id}`; }
function setClipParam(id){
  try{
    const u=new URL(location.href);
    if(id) u.searchParams.set("clip",id); else u.searchParams.delete("clip");
    history.replaceState(null,"",u);
  }catch(_){}
}
function preloadAdjacent(id){
  const i=CLIPS.findIndex(c=>c.id===id);
  [CLIPS[(i+1)%CLIPS.length],CLIPS[(i-1+CLIPS.length)%CLIPS.length]].forEach(c=>{
    const im=new Image(); im.src=COLL_POSTER[c.coll];
  });
}
function updateCounter(id){
  const i=CLIPS.findIndex(c=>c.id===id);
  $("#pvCount").textContent=(i+1)+" / "+CLIPS.length;
}
function openPreview(id,sourceEl){
  const c=byId(id); if(!c) return;
  trackFocus();
  pvModal.dataset.clip=id; setClipParam(id); pushRecent(id); preloadAdjacent(id);
  const img=$("#pvImg");
  img.src=COLL_POSTER[c.coll]; img.alt=c.name+" — "+c.coll+" plate still";
  $("#pvCap").textContent=c.coll+" · Preview still";
  $("#pvColl").textContent=c.coll;
  $("#pvCollTop").textContent=c.coll;
  $("#pvName").textContent=c.name;
  $("#pvDesc").textContent=c.desc;
  $("#pvMeta").textContent=c.meta;
  $("#pvLicense").dataset.lic=c.id;
  updateCounter(id);
  document.querySelector(".pv-media").classList.remove("zoomed");
  pvModal.classList.add("show"); pvModal.setAttribute("aria-hidden","false");
  backdrop.classList.add("show"); document.body.style.overflow="hidden";
  resetIdle();
  /* shared-element morph from the clicked card */
  if(sourceEl&&sourceEl.getClientRects().length){
    const target=document.querySelector(".pv-media").getBoundingClientRect();
    const from=sourceEl.getBoundingClientRect();
    const fly=sourceEl.cloneNode(true);
    fly.removeAttribute("data-poster");
    Object.assign(fly.style,{position:"fixed",left:from.left+"px",top:from.top+"px",width:from.width+"px",height:from.height+"px",margin:"0",zIndex:130,borderRadius:"18px",pointerEvents:"none",overflow:"hidden",transformOrigin:"0 0"});
    const slb=fly.querySelector("[data-sl]"); if(slb) slb.remove();
    document.body.appendChild(fly);
    pvModal.classList.add("morphing");
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const dx=target.left-from.left, dy=target.top-from.top;
      fly.style.transition="transform .55s cubic-bezier(.3,1.15,.4,1),border-radius .55s";
      fly.style.borderRadius="26px";
      fly.style.transform=`translate(${dx}px,${dy}px) scale(${target.width/from.width},${target.height/from.height})`;
      setTimeout(()=>{ fly.remove(); pvModal.classList.remove("morphing"); },580);
    }));
  }
}
function closePreview(){
  if(!pvModal.classList.contains("show")) return;
  pvModal.classList.remove("show","morphing","idle"); pvModal.setAttribute("aria-hidden","true");
  clearTimeout(idleT);
  pvBox.style.transition=""; pvBox.style.transform=""; backdrop.style.opacity="";
  setClipParam(null);
  backdrop.classList.remove("show"); document.body.style.overflow="";
  $("#floatPrev").style.opacity=0;
  restoreFocus();
}
/* auto-hide chrome on pointer idle */
let idleT;
function resetIdle(){
  pvModal.classList.remove("idle");
  clearTimeout(idleT);
  idleT=setTimeout(()=>{ if(pvModal.classList.contains("show")) pvModal.classList.add("idle"); },2500);
}
pvModal.addEventListener("pointermove",resetIdle,{passive:true});
/* swipe-down-to-dismiss on the poster */
(function(){
  const media=document.querySelector(".pv-media");
  let sy0=null,sx0=null,vdrag=false;
  media.addEventListener("touchstart",e=>{ sy0=e.touches[0].clientY; sx0=e.touches[0].clientX; vdrag=false; },{passive:true});
  media.addEventListener("touchmove",e=>{
    if(sy0===null) return;
    const dy=e.touches[0].clientY-sy0, dx=e.touches[0].clientX-sx0;
    if(!vdrag&&dy>12&&Math.abs(dy)>Math.abs(dx)*1.4) vdrag=true;
    if(vdrag){
      pvBox.style.transition="none";
      pvBox.style.transform=`translateY(${dy}px) scale(${Math.max(.9,1-dy/1400)})`;
      backdrop.style.opacity=Math.max(0,1-dy/420);
    }
  },{passive:true});
  media.addEventListener("touchend",e=>{
    if(!vdrag){ sy0=null; return; }
    const dy=e.changedTouches[0].clientY-sy0;
    pvBox.style.transition=""; pvBox.style.transform=""; backdrop.style.opacity="";
    sy0=null; vdrag=false;
    if(dy>130) closePreview(); else resetIdle();
  },{passive:true});
})();
$("#pvCopy").addEventListener("click",e=>{
  e.stopPropagation();
  const id=pvModal.dataset.clip; if(!id) return;
  const cpBtn=$("#pvCopy"), cpOrig=cpBtn.textContent;
  const done=()=>{ toast("Link copied — share this plate."); cpBtn.textContent="\u2713 Copied"; setTimeout(()=>{ cpBtn.textContent=cpOrig; },1200); };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(clipURL(id)).then(done).catch(()=>toast("Copy failed — copy the URL manually."));
  }else{ toast("Copy failed — copy the URL manually."); }
});
/* ---------------- 20 UX upgrades ---------------- */
/* 1-3: new badges, sort, surprise */
const NEW_IDS=["mist-line","subsea-cable","vent-field"];
$$("#grid .card").forEach(card=>{
  if(NEW_IDS.includes(card.dataset.clip)){
    const b=document.createElement("span"); b.className="new-badge"; b.textContent="New";
    card.querySelector(".poster").append(b);
  }
});
function parseDur(c){ const m=c.meta.match(/(\d+)\s*s/); return m?+m[1]:0; }
function tcOf(c){ const t=parseDur(c); return "00:"+String(t).padStart(2,"0"); }
$("#sortSel").addEventListener("change",e=>{
  const mode=e.target.value, grid=$("#grid");
  orderedClips=[...CLIPS].sort((ca,cb)=>{
    if(mode==="name") return ca.name.localeCompare(cb.name);
    if(mode==="dur") return parseDur(ca)-parseDur(cb);
    if(mode==="coll") return ca.coll.localeCompare(cb.coll)||ca.name.localeCompare(cb.name);
    return CLIPS.indexOf(ca)-CLIPS.indexOf(cb);
  });
  const byIdEl={}; $$("#grid .card").forEach(el=>{ byIdEl[el.dataset.clip]=el; });
  orderedClips.forEach(c=>{ if(byIdEl[c.id]) grid.appendChild(byIdEl[c.id]); });
  if(viewMode==="list") renderList(); else applyFilter();
});
$("#surpriseBtn").addEventListener("click",()=>openPreview(CLIPS[Math.floor(Math.random()*CLIPS.length)].id));
/* 4: collection quick cards */
$$(".coll-card").forEach(b=>b.addEventListener("click",()=>{
  const f=b.dataset.cc;
  $$(".fchip").forEach(x=>x.classList.toggle("on",x.dataset.f===f));
  fColl=f; applyFilter();
  $("#grid").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
}));
/* 5: recently viewed */
let recent=[];
try{ recent=(JSON.parse(localStorage.getItem("plates-recent")||"[]")||[]).filter(id=>byId(id)); }catch(_){}
function renderRecent(){
  const w=$("#recentWrap"), t=$("#recentTrack");
  w.classList.toggle("show",recent.length>0);
  t.innerHTML=recent.map(id=>{ const c=byId(id);
    return `<button class="recent-item" data-recent="${id}"><img src="${COLL_POSTER[c.coll]}" alt="${c.name} plate still" loading="lazy" decoding="async" width="300" height="168"><span>${c.name}</span></button>`;
  }).join("");
}
function pushRecent(id){
  recent=[id,...recent.filter(x=>x!==id)].slice(0,5);
  try{ localStorage.setItem("plates-recent",JSON.stringify(recent)); }catch(_){}
  renderRecent();
}
$("#recentTrack").addEventListener("click",e=>{
  const b=e.target.closest("[data-recent]"); if(b) openPreview(b.dataset.recent);
});
if("requestIdleCallback" in window){ requestIdleCallback(()=>renderRecent(),{timeout:1600}); }else{ setTimeout(()=>renderRecent(),40); }
/* 6: modal swipe */
let tx0=0;
const pvBox=$(".pv-box");
pvBox.addEventListener("touchstart",e=>{ tx0=e.touches[0].clientX; },{passive:true});
pvBox.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-tx0;
  if(Math.abs(dx)>60) stepPreview(dx<0?1:-1);
},{passive:true});
/* 7: share */
$("#shX").addEventListener("click",e=>{ e.stopPropagation();
  const id=pvModal.dataset.clip; if(!id) return;
  open("https://twitter.com/intent/tweet?text="+encodeURIComponent(byId(id).name+" — cinematic 4K plate")+"&url="+encodeURIComponent(clipURL(id)),"_blank","noopener,width=560,height=460");
});
$("#shFb").addEventListener("click",e=>{ e.stopPropagation();
  const id=pvModal.dataset.clip; if(!id) return;
  open("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(clipURL(id)),"_blank","noopener,width=560,height=460");
});
/* 8: poster zoom */
document.querySelector(".pv-media").addEventListener("click",function(){ this.classList.toggle("zoomed"); });
/* 9: currency */
const CURR={USD:{s:"$",r:1},EUR:{s:"€",r:.92},VND:{s:"₫",r:25000}};
let cur="USD";
try{ cur=localStorage.getItem("plates-cur")||"USD"; }catch(_){}
function fmtPrice(usd){
  const c=CURR[cur]||CURR.USD;
  const v=cur==="VND"?Math.round(usd*c.r/1000)*1000:Math.round(usd*c.r);
  return c.s+v.toLocaleString(cur==="VND"?"vi-VN":"en-US");
}
function applyCurr(){
  $$(".tier-price").forEach(el=>{ el.textContent=fmtPrice(+el.dataset.usd); });
  $$('#licForm input[name="tier"]').forEach(inp=>{
    const card=inp.closest(".tier");
    inp.value=card.querySelector(".tier-name").textContent+" — "+fmtPrice(+card.querySelector(".tier-price").dataset.usd);
  });
  try{ localStorage.setItem("plates-cur",cur); }catch(_){}
}
$("#curSel").value=cur;
$("#curSel").addEventListener("change",e=>{ cur=e.target.value; applyCurr(); if(viewMode==="list") renderList(); });
applyCurr();
/* 10: custom plate */
const CUSTOM_CLIP={id:"custom",name:"Custom plate",coll:"Commission",meta:"4K · 24 fps · your brief",desc:"A plate rendered to your brief — mood, weather, camera move. Describe the scene in Notes."};
$("#customBtn").addEventListener("click",()=>openSheet([CUSTOM_CLIP],null));
/* 11: shortcuts */
const scHelp=$("#scHelp");
function toggleHelp(force){ scHelp.classList.toggle("open",force!==undefined?force:!scHelp.classList.contains("open")); }
scHelp.addEventListener("click",e=>{ if(e.target===scHelp) toggleHelp(false); });
/* 12: newsletter */
$("#newsForm").addEventListener("submit",e=>{
  e.preventDefault();
  const em=e.target.email.value.trim(); if(!em) return;
  location.href=`mailto:${LICENSE_EMAIL}?subject=${encodeURIComponent("Notify me about new plates")}&body=${encodeURIComponent("Please notify me when new plates drop.\nEmail: "+em)}`;
  toast("Opening your email app to confirm.");
  const nb=e.target.querySelector('[type="submit"]');
  if(nb){ const no=nb.textContent; nb.textContent="You're in \u2713"; nb.disabled=true; setTimeout(()=>{ nb.textContent=no; nb.disabled=false; },2600); }
  e.target.reset();
});
/* 13: focus traps */
function trapFocus(container){
  container.addEventListener("keydown",e=>{
    if(e.key!=="Tab") return;
    const f=$$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',container).filter(el=>!el.disabled&&el.getClientRects().length);
    if(!f.length) return;
    if(e.shiftKey&&document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey&&document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); }
  });
}
trapFocus(pvModal); trapFocus(sheet); trapFocus(drawer);

/* 8: progressive blur-up */
function sharpUp(scope){
  $$(".poster img, .hv-in img, .coll-card img",(scope||document)).forEach(img=>{
    if(img.complete&&img.naturalWidth) img.classList.add("sharp");
    else img.addEventListener("load",()=>img.classList.add("sharp"),{once:true});
  });
}
if("requestIdleCallback" in window){ requestIdleCallback(()=>sharpUp(),{timeout:1600}); }else{ setTimeout(()=>sharpUp(),40); }
/* 7: clickable collection marquee */
(function(){
  const colls=["Valley Road","Data Center","Deep Ocean"];
  const half=colls.map(c=>`<button data-mq="${c}">${c}<i>·</i></button>`).join("");
  $("#mqColl").innerHTML=half+'<span inert aria-hidden="true" style="display:contents">'+half+'</span>';
  $("#mqColl").addEventListener("click",e=>{
    const b=e.target.closest("[data-mq]"); if(!b) return;
    const f=b.dataset.mq;
    $$(".fchip").forEach(x=>x.classList.toggle("on",x.dataset.f===f));
    fColl=f; applyFilter();
    $("#library").scrollIntoView({behavior:reduced?"auto":"smooth"});
  });
})();
/* 10: list view */
let orderedClips=[...CLIPS], viewMode="grid";
function durShort(c){ return parseDur(c)+"s"; }
function renderList(){
  $("#listView").innerHTML=orderedClips.map(c=>`
    <button class="lrow" role="listitem" data-clip="${c.id}">
      <span class="lr-name">${c.name}</span>
      <span class="lr-coll">${c.coll}</span>
      <span class="lr-dur">${durShort(c)}</span>
      <span class="lr-price">${fmtPrice(29)}</span>
      <span class="lr-go">→</span>
    </button>`).join("");
  applyFilter();
}
$$(".vt").forEach(b=>b.addEventListener("click",()=>{
  viewMode=b.dataset.v;
  $$(".vt").forEach(x=>x.classList.toggle("on",x===b));
  $("#listView").classList.toggle("show",viewMode==="list");
  $("#grid").classList.toggle("list-hidden",viewMode==="list");
  if(viewMode==="list") renderList();
}));
$("#listView").addEventListener("click",e=>{
  const r=e.target.closest(".lrow"); if(r) openPreview(r.dataset.clip);
});
const floatPrev=$("#floatPrev"), floatImg=floatPrev.querySelector("img");
$("#listView").addEventListener("pointermove",e=>{
  const r=e.target.closest(".lrow");
  if(r){ const c=byId(r.dataset.clip); if(floatImg.getAttribute("src")!==COLL_POSTER[c.coll]) floatImg.src=COLL_POSTER[c.coll]; floatPrev.style.opacity=1; }
  else floatPrev.style.opacity=0;
  floatPrev.style.transform=`translate(${e.clientX+20}px,${e.clientY-85}px)`;
},{passive:true});
$("#listView").addEventListener("pointerleave",()=>{ floatPrev.style.opacity=0; },{passive:true});

/* deep link: ?clip=fog-road opens that plate on load */
(function deepLink(){
  let id=null;
  try{ id=new URLSearchParams(location.search).get("clip"); }catch(_){}
  if(!id||!byId(id)) return;
  const tryOpen=()=>{ document.body.classList.contains("ready")?openPreview(id):setTimeout(tryOpen,200); };
  tryOpen();
})();
$("#pvClose").addEventListener("click",closePreview);
document.addEventListener("click",e=>{
  const sl=e.target.closest("[data-sl]");
  if(sl){ toggleShortlist(sl.dataset.sl,sl); return; }
  const lic=e.target.closest("[data-lic]");
  if(lic){
    e.stopPropagation();
    const wasModal=pvModal.classList.contains("show");
    if(wasModal) closePreview();
    const clipEl=lic.closest("[data-clip]");
    openSheet(byId(lic.dataset.lic), clipEl?clipEl.querySelector(".poster"):$("#pvImg"));
    return;
  }
  const card=e.target.closest("[data-clip]");
  if(card&&!sheet.classList.contains("open")&&!pvModal.classList.contains("show")) openPreview(card.dataset.clip,card.querySelector(".poster"));
});
$("#sheetClose").addEventListener("click",closeSheet);
backdrop.addEventListener("click",()=>{ closePreview(); closeSheet(); closeDrawer(); });
addEventListener("keydown",e=>{
  if(e.key==="Escape"){ closePreview(); closeSheet(); closeDrawer(); toggleHelp(false); }
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||"");
  if(e.key==="?"&&!typing){ toggleHelp(); return; }
  if(e.key==="/"&&!typing){ e.preventDefault(); $("#library").scrollIntoView({behavior:reduced?"auto":"smooth"}); $("#libQ").focus(); return; }
  if(pvModal.classList.contains("show")){
    if(e.key==="ArrowRight") stepPreview(1);
    else if(e.key==="ArrowLeft") stepPreview(-1);
  }
});

/* modal prev/next */
function stepPreview(d){
  const id=pvModal.dataset.clip; if(!id) return;
  const i=CLIPS.findIndex(c=>c.id===id);
  openPreview(CLIPS[(i+d+CLIPS.length)%CLIPS.length].id);
}
$("#pvPrev").addEventListener("click",e=>{ e.stopPropagation(); stepPreview(-1); });
$("#pvNext").addEventListener("click",e=>{ e.stopPropagation(); stepPreview(1); });

/* ---------------- form + toast ---------------- */
let toastT;
function toast(msg,action){
  const t=$("#toast"); t.innerHTML="";
  t.appendChild(document.createTextNode(msg));
  if(action){
    const b=document.createElement("button");
    b.className="toast-act"; b.textContent=action.label;
    b.addEventListener("click",()=>{ t.classList.remove("show"); action.fn(); });
    t.appendChild(b);
  }
  t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),action?5000:3200);
}
/* license requests go to this inbox — swap for the real address before launch */
const LICENSE_EMAIL="hello@plates.studio";
$("#licForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=e.target, d=new FormData(f);
  const licBtn=f.querySelector('button[type="submit"]'), licOrig=licBtn?licBtn.innerHTML:"";
  if(licBtn){ licBtn.disabled=true; licBtn.innerHTML='<span class="btn-spin" aria-hidden="true"></span>Sending…'; }
  const finishSend=()=>{
  const tier=(f.querySelector('input[name="tier"]:checked')||{}).value||"Commercial — $79";
  const subject=`Plate license request — ${sheetClips.length>1?sheetClips.length+" plates":clipField.value} (${tier.split(" — ")[0]})`;
  const clipLines=sheetClips.map((x,i)=>`  ${i+1}. ${x.name} — ${x.coll} (${x.meta})`).join("\n");
  const body=[
    `Clips (${sheetClips.length}):`,
    clipLines,
    `Tier: ${tier}${sheetClips.length>=3?" (bundle 15% off applied at checkout)":""}`,
    `Name: ${d.get("name")||""}`,
    `Email: ${d.get("email")||""}`,
    `Notes: ${d.get("notes")||"—"}`,
    ``,
    `Sent from the Plates library.`
  ].join("\n");
  location.href=`mailto:${LICENSE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Opening your email app — the request is pre-filled, just hit send.");
    if(licBtn){ licBtn.innerHTML="\u2713 Request ready"; setTimeout(()=>{ licBtn.innerHTML=licOrig; licBtn.disabled=false; },2400); }
  };
  setTimeout(finishSend,650);
});

/* ---------------- fx: count-up / loader / cursor / theme / toTop ---------------- */
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(el){
  const target=+el.dataset.n;
  if(reduced){ el.textContent=target; return; }
  const t0=performance.now(), D=1300;
  (function step(t){
    const p=Math.min((t-t0)/D,1), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(e*target);
    if(p<1) requestAnimationFrame(step);
  })(t0);
}
const statIO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ countUp(e.target); statIO.unobserve(e.target); } }),{threshold:.5});
$$(".num").forEach(el=>statIO.observe(el));
/* count immediately for stats already in view on load (no lonely zeros) */
$$(".num").forEach(el=>{ const r=el.getBoundingClientRect(); if(r.top<innerHeight&&r.bottom>0){ countUp(el); statIO.unobserve(el); } });

/* loader */
(function(){
  const loader=$("#loader"), ldNum=$("#ldNum"), ldBar=$("#ldBar");
  const lt0=performance.now(), LD=1300;
  (function ldStep(t){
    const p=Math.min((t-lt0)/LD,1), e=1-Math.pow(1-p,3), v=Math.round(e*100);
    ldNum.textContent=v; ldBar.style.width=v+"%";
    if(p<1) requestAnimationFrame(ldStep);
    else{ loader.classList.add("done"); document.body.classList.remove("loading"); document.body.classList.add("ready"); setTimeout(()=>loader.remove(),700); }
  })(lt0);
})();

/* custom cursor (fine pointers only) */
if(matchMedia("(pointer:fine)").matches){
  document.body.classList.add("cur-on");
  const dot=$("#curDot"), ring=$("#curRing"), curLabel=$("#curLabel");
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
  addEventListener("pointermove",e=>{
    document.body.classList.add("cur-moved");
    mx=e.clientX; my=e.clientY;
    hvtx=e.clientX/innerWidth-.5; hvty=e.clientY/innerHeight-.5;
    dot.style.transform=`translate3d(${mx-3.5}px,${my-3.5}px,0)`;
    const hov=e.target.closest&&e.target.closest("a,button,.tilt,.stack-card,input,textarea");
    ring.classList.toggle("big",!!hov);
    /* talking cursor: View on cards, Drag on the strip */
    const card=e.target.closest&&e.target.closest(".card,.strip-card,.stack-card");
    const strip=e.target.closest&&e.target.closest(".strip-view");
    const tag=card?"View":(strip?"Drag":null);
    ring.classList.toggle("tag",!!tag);
    if(curLabel) curLabel.textContent=tag||"";
  },{passive:true});
  (function curLoop(){
    rx=lerp(rx,mx,.16); ry=lerp(ry,my,.16);
    const s=ring.classList.contains("tag")?39:(ring.classList.contains("big")?30:18);
    ring.style.transform=`translate3d(${(rx-s).toFixed(1)}px,${(ry-s).toFixed(1)}px,0)`;
    requestAnimationFrame(curLoop);
  })();
}

/* theme: default cross-fade; auto dark on first visit via system preference */
(function(){
  const root=document.documentElement, themeBtn=$("#themeBtn");
  try{
    const saved=localStorage.getItem("plates-theme");
    if(saved==="dark") root.classList.add("dark");
    else if(!saved&&matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  }catch(_){}
  themeBtn.addEventListener("click",()=>{
    themeBtn.classList.remove("spin"); void themeBtn.offsetWidth; themeBtn.classList.add("spin");
    setTimeout(()=>themeBtn.classList.remove("spin"),600);
    const toDark=!root.classList.contains("dark");
    const apply=()=>{
      root.classList.toggle("dark",toDark);
      try{ localStorage.setItem("plates-theme",toDark?"dark":"light"); }catch(_){}
    };
    /* Use only the browser's default cross-fade (no custom wipe):
       battle-tested, cannot leave stuck snapshots. */
    if(typeof document.startViewTransition==="function"){
      try{ document.startViewTransition(apply); return; }catch(_){}
    }
    apply();
  });
})();

/* ripple */
$$(".btn-pill,.btn-ghost,.btn-license").forEach(b=>{
  b.addEventListener("pointerdown",e=>{
    const r=b.getBoundingClientRect(), s=Math.max(r.width,r.height);
    const rip=document.createElement("span");
    rip.className="ripple";
    rip.style.width=rip.style.height=s+"px";
    rip.style.left=(e.clientX-r.left-s/2)+"px";
    rip.style.top=(e.clientY-r.top-s/2)+"px";
    b.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
});

/* back to top */
toTop.addEventListener("click",()=>scrollTo({top:0,behavior:reduced?"auto":"smooth"}));

})();


/* ================= bundled app.js ================= */

/* ================= RUN8 · behavior batch ================= */
(function(){
"use strict";
const $=(s,c)=>(c||document).querySelector(s);

/* E3 · return focus to the opener when a layer closes */
let lastFocus=null;
window.trackFocus=function(){ lastFocus=(document.activeElement instanceof HTMLElement)?document.activeElement:null; };
window.restoreFocus=function(){ try{ if(lastFocus&&document.contains(lastFocus)) lastFocus.focus({preventScroll:true}); }catch(_){} lastFocus=null; };

/* B8 · tier card picked bounce */
const licForm=$("#licForm");
if(licForm) licForm.addEventListener("change",e=>{
  const t=e.target.closest?e.target.closest(".tier"):null; if(!t) return;
  const card=t.querySelector(".tier-card"); if(!card) return;
  card.classList.remove("picked"); void card.offsetWidth; card.classList.add("picked");
});

/* B10 · pause marquee while keyboard focus is inside it */
const mqEl=document.querySelector(".marquee");
if(mqEl){ mqEl.addEventListener("focusin",()=>{ try{ mqPaused=true; }catch(_){} }); mqEl.addEventListener("focusout",()=>{ try{ mqPaused=false; }catch(_){} }); }

/* C2 · swipe down on the sheet handle closes the license sheet */
const shHandle=document.querySelector(".sheet-handle");
if(shHandle){
  let shY=null;
  shHandle.addEventListener("touchstart",e=>{ shY=e.touches[0].clientY; },{passive:true});
  shHandle.addEventListener("touchend",e=>{
    if(shY===null) return;
    const dy=e.changedTouches[0].clientY-shY; shY=null;
    if(dy>70&&typeof closeSheet==="function") closeSheet();
  });
}

/* C14 · first touch on a poster pulses the preview pill as a hint */
let tappedOnce=false;
document.addEventListener("pointerdown",e=>{
  if(tappedOnce||(e.pointerType&&e.pointerType!=="touch")) return;
  const p=e.target.closest?e.target.closest(".card .poster,.strip-card .poster"):null;
  if(p){ tappedOnce=true; p.classList.add("tap-hint"); setTimeout(()=>p.classList.remove("tap-hint"),1700); }
},{passive:true});

/* E10 · keyboard activation for clip cards */
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ") return;
  const t=e.target;
  if(!t||!t.closest) return;
  if(t.closest("button,a,input,select,textarea,summary,[contenteditable]")) return;
  const card=t.closest("[data-clip]");
  if(card){ e.preventDefault(); card.click(); }
});
})();
