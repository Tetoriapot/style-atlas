// Each deployment owns only its scope's application cache. IndexedDB is never touched.
export function installWorker(runtime, manifest) {
    const scope = new URL(runtime.registration.scope);
    const prefix = `style-atlas:${encodeURIComponent(scope.pathname)}:`;
    const cacheName = `${prefix}${manifest.version}`;
    const files = new Map(manifest.files.map((file) => [new URL(file.path, scope).href, file.sha256]));
    const indexUrl = new URL('index.html', scope).href;
    async function verifiedResponse(url) {
        const response = await runtime.fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
        if (!response.ok || response.redirected)
            throw new Error('Offline resource unavailable');
        const digest = await runtime.crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
        if (hash !== files.get(url))
            throw new Error('Offline resource version mismatch');
        return response;
    }
    async function prepare() {
        const cache = await runtime.caches.open(cacheName);
        // Sequential writes also prevent a failed install from leaving concurrent writes behind.
        for (const url of files.keys())
            if (!(await cache.match(url)))
                await cache.put(url, await verifiedResponse(url));
    }
    async function status() {
        const cache = await runtime.caches.open(cacheName);
        const entries = await Promise.all([...files.keys()].map((url) => cache.match(url)));
        return { version: manifest.version, ready: entries.every(Boolean), count: files.size };
    }
    runtime.addEventListener('install', (event) => {
        event.waitUntil(prepare().catch(async (error) => {
            await runtime.caches.delete(cacheName);
            throw error;
        }));
        // Do not skip waiting: other tabs may contain unsaved edits and older lazy chunks.
    });
    runtime.addEventListener('activate', (event) => {
        event.waitUntil((async () => {
            for (const name of await runtime.caches.keys())
                if (name.startsWith(prefix) && name !== cacheName)
                    await runtime.caches.delete(name);
            await runtime.clients.claim();
        })());
    });
    runtime.addEventListener('fetch', (event) => {
        const request = event.request;
        const url = new URL(request.url);
        if (request.method !== 'GET' ||
            url.origin !== scope.origin ||
            !url.pathname.startsWith(scope.pathname))
            return;
        url.search = '';
        const navigation = request.mode === 'navigate' && !files.has(url.href) && !/\/[^/]+\.[^/]+$/.test(url.pathname);
        const key = navigation ? indexUrl : url.href;
        if (!navigation && !files.has(key))
            return;
        event.respondWith((async () => {
            const cache = await runtime.caches.open(cacheName);
            const cached = await cache.match(key);
            if (cached)
                return cached;
            try {
                const response = await verifiedResponse(key);
                await cache.put(key, response.clone());
                return response;
            }
            catch {
                return new Response(navigation
                    ? '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>オフラインデータを確認してください</title><h1>画面を読み込めませんでした</h1><p>インターネットに接続して、再読み込みしてください。保存データは削除されていません。</p><a href="">再読み込み</a></html>'
                    : 'Offline resource unavailable', {
                    status: 503,
                    headers: { 'Content-Type': navigation ? 'text/html; charset=utf-8' : 'text/plain' },
                });
            }
        })());
    });
    runtime.addEventListener('message', (event) => {
        if (event.data !== 'OFFLINE_STATUS' && event.data !== 'OFFLINE_REPAIR')
            return;
        event.waitUntil((async () => {
            try {
                if (event.data === 'OFFLINE_REPAIR')
                    await prepare();
                event.ports[0]?.postMessage(await status());
            }
            catch {
                event.ports[0]?.postMessage({ error: true });
            }
        })());
    });
}

installWorker(self, {"version":"429b15bedc06f861","files":[{"path":"assets/backup-BgM7wXv6.js","sha256":"c551abdb3a900552f1fc120b9fb24e232f7f8f9850153a83d23c1b3bf9758be2"},{"path":"assets/button-B2ctw3Wx.js","sha256":"7171d972aa97f52c8051cc2433a078d56600170254452c1ac66dbdda78067948"},{"path":"assets/Catalog-BDkd0_ac.js","sha256":"b8fd8c7306f94ea7d012db152800ead128f5162b14cbaff58fbddce5d450ab77"},{"path":"assets/catalog-data-D82DblVT.js","sha256":"f2d614bd4921f0a67a3bd9854ea9b0199598db4ebc11313e4de139b13f99260b"},{"path":"assets/Colors-BxG-XtO8.js","sha256":"6bff4bc25634f59eddcfe43a62961ec7c2cfdc924a7bf502424ab33fbc09e0c2"},{"path":"assets/Compare-C-WX8HGD.js","sha256":"eac8b279fe15d8f089231c9ea730e018c01315fd670b4a29bddc076bd5428f90"},{"path":"assets/copy-DPXVTQ64.js","sha256":"683a20cae3f679d48c49b76a700a6117b53c5e09e70ab7ce17c6b993a53b0bd8"},{"path":"assets/createLucideIcon-DpoihF5A.js","sha256":"9660fba779c593b7f38b6847c676f9b69bd77cfec436ad0764988109e70fa08c"},{"path":"assets/DesignPreview-D9IjAzz9.js","sha256":"84d3d1504a32a6d2e28d8164d7738bab09001db016280036830563a7633872ea"},{"path":"assets/Detail-D6zUWHTB.js","sha256":"c5a015cba0f1100ca3990f0ab4daff9750d8d9c45f93eb09c26143327fece115"},{"path":"assets/download-GxPArmE7.js","sha256":"a8347652f4c120a358a9be8393cc231d295079069d25e6db0ee3d0d4c8e28fce"},{"path":"assets/image-colors-CAHeJW1A.js","sha256":"72e5e7dd301927a33f4eb99ee1c929b7ebda3b98a9a41b504dfb208cad5d3613"},{"path":"assets/ImageEditor-DLZVWb_n.js","sha256":"5a98120637178b386ced8e270f93d57d5d3206f604f9f5de7003996e2a62df62"},{"path":"assets/index-BsMROvpf.js","sha256":"7c4b10941f896fada0d32c2f4e05fb5252d6b880bab40f37e78999214c1acc5b"},{"path":"assets/index-BxCOJpgQ.css","sha256":"57e494054063b2db1fab138fbd558c924897cb3fa5a90b3b6fa79be559ecd740"},{"path":"assets/Library-4pwK9ED4.js","sha256":"11b3c83f8081b61a4210f28d287fc852ab28923442633028ce9b13152889f3fc"},{"path":"assets/LocalImage-KkQc87BO.js","sha256":"f3fb9c254dda348b81bf8e912d9d617a0b52885119830541a471c2b3906b439c"},{"path":"assets/PersonalLibrary-DJf7yH4c.js","sha256":"5aec3ecae6485e42f564d8440ba0f2601fa310ffedf00a6ffa012f19b6bd3729"},{"path":"assets/PresetEditor-DLWZLfQ2.js","sha256":"4e43faa06a019e50aa91ae04293719971788c7d0bddc33107f81887ba4e0b974"},{"path":"assets/prompts-C6vx745x.js","sha256":"666f64204ab2f3e3d5b697da54ff653bf976991a7abc2806ef424ac76f5a2887"},{"path":"assets/Prompts-YH8JYGiR.js","sha256":"95d560e99869e33c8b38d3c0cdc0940ab6a721f46e8eb1cd4a9b60ec31d6833e"},{"path":"assets/ReferenceEditor-DjbW7F6M.js","sha256":"3eb939d4c985644eadcf546cc3990672f51a5a639a01f9be813d4b519677f54c"},{"path":"assets/save-a7gAz61R.js","sha256":"1cea1d544a7e5a7d62afc6fab9af0743899684f3c35bbb7ce8e0d2997c20447f"},{"path":"assets/Settings-BQ90jVUH.js","sha256":"9784eda38d5a2517eef2fe7355d280453efe8e5a1b3e08c3277d56c3b82f1854"},{"path":"assets/studio-storage-4mYLkxuU.js","sha256":"3faae43db9309dc3cb381f4a92dbc40b4f511373ee7c0e78e6b98c197b8acf34"},{"path":"assets/StyleEditor-8wX2s9_L.js","sha256":"88aab0b99eece5987f5f28818884af12eea4dcf48a54c8a060d809549b6c257f"},{"path":"assets/UnsavedChangesGuard-D-PuAIM0.js","sha256":"ae6ee4064e329f10dfce26d0da9661f9c371b855a626e8e673e67d56e2a8b60c"},{"path":"assets/use-personal-editor-Bo4r9n-7.js","sha256":"829ecba338dc28ce62b1e4e3925e0cc3c6dcde831766bd9e4d5a251d1797ccaa"},{"path":"favicon.svg","sha256":"6f682d3fc340d6fdcdcf809eb9cef0b33f1440b80827b9ecf34d25070a934801"},{"path":"icon-192.png","sha256":"1c4942069903e6d06794df990b167d816887a44cf2b8ac69974863596631a883"},{"path":"icon-512.png","sha256":"893b3fcbf60d8e3fe053ac8e1961e5ab6d7598bb3f4a02908b84a04e1f8bdb9b"},{"path":"index.html","sha256":"d0d3ccb298381a63f5c39889b03700d4a7870fbebe1b22733290888dd4e87791"},{"path":"manifest.webmanifest","sha256":"e5cf9673ba4db3a690c2d1755d8cb2a81c28c7438d65d583fcc9e567399d92ce"}]});
