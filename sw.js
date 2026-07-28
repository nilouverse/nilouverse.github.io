/* nilouverse service worker — offline shell + cache-first static assets */
var CACHE = 'nv-v3';
var PRECACHE = [
  './','./index.html','./manifest.webmanifest',
  './art/hero.jpg','./art/cdown.jpg','./art/contact.svg','./art/contact-open.svg',
  './art/adown.png','./art/ablank.png','./art/acdown.jpg','./art/button.png'
];

self.addEventListener('install', function(e){
  e.waitUntil((async function(){
    var c = await caches.open(CACHE);
    /* one missing file must not fail the whole install */
    await Promise.all(PRECACHE.map(function(u){ return c.add(u).catch(function(){}); }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                 /* never intercept form posts */
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;  /* cross-origin (fonts/embeds) uses the network */

  if(req.mode === 'navigate'){                     /* pages: network-first, fall back to the cached shell offline */
    e.respondWith((async function(){
      try{
        var net = await fetch(req);
        var c = await caches.open(CACHE); c.put(req, net.clone());
        return net;
      }catch(_){
        var c2 = await caches.open(CACHE);
        return (await c2.match(req)) || (await c2.match('./index.html')) || (await c2.match('./'));
      }
    })());
    return;
  }

  e.respondWith((async function(){                 /* static assets: cache-first, then network */
    var c = await caches.open(CACHE);
    var hit = await c.match(req);
    if(hit) return hit;
    try{
      var net = await fetch(req);
      if(net && net.ok) c.put(req, net.clone());
      return net;
    }catch(_){ return hit || Response.error(); }
  })());
});
