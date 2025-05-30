// sw.js
const CACHE_NAME = 'multiplication-trainer-cache-v1';
const urlsToCache = [
  './', // Representa a raiz, geralmente index.html
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
  // Se você tivesse arquivos CSS ou JS locais separados, adicionaria aqui.
  // O Tailwind CSS e a fonte Inter são carregados via CDN, então o Service Worker
  // tentará cacheá-los automaticamente quando forem requisitados pela primeira vez
  // se a política de cache da CDN permitir, ou o navegador os buscará da rede
  // se não estiverem no cache do Service Worker ou se a política não permitir cache.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto, adicionando URLs ao cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Falha ao abrir cache ou adicionar URLs:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: removendo cache antigo', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Para requisições de navegação (ex: abrir o index.html), tente a rede primeiro.
  // Isso garante que o usuário sempre veja a versão mais recente do HTML se online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se a resposta da rede for válida, clona e armazena no cache
          if (response && response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Se a rede falhar, tenta pegar do cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para outras requisições (assets como ícones, manifest), use a estratégia cache-first
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Retorna do cache se encontrado
        }
        // Se não estiver no cache, busca na rede
        return fetch(event.request).then(
          networkResponse => {
            // Se a resposta da rede for válida, clona e armazena no cache
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        );
      })
      .catch(err => {
        console.error('Erro no fetch do Service Worker:', err);
        // Você pode retornar uma página offline padrão aqui, se tiver uma
      })
  );
});
