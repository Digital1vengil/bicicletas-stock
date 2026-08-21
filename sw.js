var CACHE='parka-bicis-v2';
self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET')return;
  e.respondWith(caches.open(CACHE).then(function(cache){
    return fetch(r).then(function(net){ try{cache.put(r,net.clone());}catch(_){} return net; })
      .catch(function(){ return cache.match(r).then(function(c){ return c || cache.match('./index.html'); }); });
  }));
});
