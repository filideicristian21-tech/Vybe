/* Vybe – service worker: notifiche + funzionamento offline
   - la pagina iniziale (/) viene salvata sul telefono: senza rete si apre lo stesso e
     carica l'app già salvata (la cache 'vybe-app' la gestisce la pagina iniziale)
   - font, librerie e modelli 3D con versione fissa vengono salvati la prima volta che servono
   - le foto già viste (/b2/... e Vercel Blob) restano visibili anche senza rete (max 300)
   - le chiamate /api/ vanno sempre in rete (niente dati vecchi) */
const ICON='/icon-192.png';
const SHELL='vybe-shell-v1',LIBS='vybe-libs-v1',MEDIA='vybe-media-v1',KEEP=[SHELL,LIBS,MEDIA,'vybe-app'];
const SHELL_URLS=['/','/manifest.webmanifest',ICON];
const MEDIA_MAX=300;

self.addEventListener('install',e=>{self.skipWaiting();
 e.waitUntil(caches.open(SHELL).then(c=>Promise.all(SHELL_URLS.map(u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?c.put(u,r):0).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(K=>Promise.all(K.filter(k=>/^vybe-(shell|libs|media)-/.test(k)&&!KEEP.includes(k)).map(k=>caches.delete(k)))).catch(()=>{}).then(()=>self.clients.claim())));

/* ---------- offline ---------- */
const timeout=(p,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
async function put(name,req,res){try{const c=await caches.open(name);await c.put(req,res)}catch(_){}}
async function trim(name,max){try{const c=await caches.open(name);const k=await c.keys();for(let i=0;i<k.length-max;i++)await c.delete(k[i])}catch(_){}}

/* pagine: prima la rete (sempre aggiornate), se non c'è rete o è lentissima la copia salvata */
async function page(e){const req=e.request,url=new URL(req.url);const key=url.pathname==='/'||url.pathname==='/index.html'?'/':url.pathname;
 const net=fetch(req).then(r=>{if(r.ok&&r.type==='basic')e.waitUntil(put(SHELL,key,r.clone()));return r});
 try{return await timeout(net,key==='/'?4000:8000)}catch(_){
  const c=await caches.match(key,{cacheName:SHELL})||await caches.match('/',{cacheName:SHELL});if(c)return c;
  try{return await net}catch(_){return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vybe</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0a10;color:#fff;font-family:system-ui;text-align:center"><div><b style="font-size:40px">Vybe</b><p style="opacity:.7">Nessuna connessione. Riprova tra poco.</p></div>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})}}}

/* file che non cambiano mai (hanno la versione nell'indirizzo): prima la copia salvata */
async function cacheFirst(e,name,opaqueOk,max){const req=e.request;const c=await caches.match(req,{cacheName:name});if(c)return c;
 const r=await fetch(req);if(r.ok||(opaqueOk&&r.type==='opaque'))e.waitUntil(put(name,req,r.clone()).then(()=>max&&trim(name,max)));return r}

/* file piccoli che possono cambiare: copia salvata subito, aggiornata in background */
async function swr(e,name,opaqueOk){const req=e.request;const c=await caches.match(req,{cacheName:name});
 const net=fetch(req).then(r=>{if(r.ok||(opaqueOk&&r.type==='opaque'))e.waitUntil(put(name,req,r.clone()));return r});
 if(c){e.waitUntil(net.catch(()=>{}));return c}return net}

/* foto dei post su Vercel Blob / Supabase: le scarico in modalità cors (così la copia salvata è leggibile e non "gonfia" lo spazio) */
const PUBIMG=/(^|\.)public\.blob\.vercel-storage\.com$|\.supabase\.co$/;
async function pubImg(e){const req=e.request;const c=await caches.match(req.url,{cacheName:MEDIA});if(c)return c;
 try{const r=await fetch(req.url,{mode:'cors',credentials:'omit'});if(r.ok){e.waitUntil(put(MEDIA,req.url,r.clone()).then(()=>trim(MEDIA,MEDIA_MAX)));return r}}catch(_){}
 return fetch(req)}

const VERSIONED=/^\/(npm\/[^/]+@\d[^/]*|npm\/@[^/]+\/[^/]+@\d[^/]*|gh\/[^/]+\/[^/]+@[0-9a-f]{7,40})\//;
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||req.headers.has('range'))return;
 let url;try{url=new URL(req.url)}catch(_){return}
 if(url.origin===self.location.origin){
  if(url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate')return e.respondWith(page(e));
  if(url.pathname.startsWith('/b2/')){if(req.destination==='image')e.respondWith(cacheFirst(e,MEDIA,false,MEDIA_MAX));return}
  if(SHELL_URLS.includes(url.pathname)||/\.(html|png|webmanifest|txt|xml)$/.test(url.pathname))return e.respondWith(swr(e,SHELL,false));
  return}
 if(url.hostname==='cdn.jsdelivr.net'&&VERSIONED.test(url.pathname)&&!url.pathname.endsWith('/index.html'))return e.respondWith(cacheFirst(e,LIBS,false));
 if(req.destination==='image'&&PUBIMG.test(url.hostname)&&(url.hostname.endsWith('vercel-storage.com')||url.pathname.includes('/storage/v1/object/public/')))return e.respondWith(pubImg(e));
 if(url.hostname==='fonts.gstatic.com')return e.respondWith(cacheFirst(e,LIBS,true));
 if(url.hostname==='fonts.googleapis.com')return e.respondWith(swr(e,LIBS,true));
});

/* ---------- notifiche ---------- */
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data?e.data.text():''}}
 e.waitUntil(self.registration.showNotification(d.title||'Vybe',{body:d.body||'',tag:d.tag||undefined,renotify:!!d.tag,icon:ICON,badge:ICON,data:{url:d.url||'/'}}).then(badge))});
/* numerino rosso sull'icona di Vybe nella schermata Home: quante notifiche ci sono */
function badge(){try{return self.registration.getNotifications().then(L=>{const n=L.length;if(self.navigator&&self.navigator.setAppBadge){return n?self.navigator.setAppBadge(n):self.navigator.clearAppBadge()}}).catch(()=>{})}catch(_){}}
self.addEventListener('notificationclose',e=>{e.waitUntil(badge())});
self.addEventListener('notificationclick',e=>{e.notification.close();badge();const url=(e.notification.data&&e.notification.data.url)||'/';
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{for(const c of L){if('focus' in c){try{c.postMessage({vybeNotif:url})}catch(_){}return c.focus()}}return self.clients.openWindow(url)}))});
