const CACHE="plates-assets-v2";
const ASSETS=["https://files.catbox.moe/9992su.jpg","https://files.catbox.moe/fh02wg.jpg","https://files.catbox.moe/8d1i1o.jpg","https://files.catbox.moe/f39081.jpg","https://files.catbox.moe/7ofidu.mp4","https://files.catbox.moe/cdnlhs.mp4","https://files.catbox.moe/y71ohm.png","https://files.catbox.moe/frp853.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(!response||response.status!==200)return response;const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>hit)))});
