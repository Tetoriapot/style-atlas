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

installWorker(self, {"version":"9944fba334e341b3","files":[{"path":"assets/backup-DR-3bnFw.js","sha256":"46c97dde32fd2cbf60c447615fad1963ea34a97537d1f5526f9758d666a879ca"},{"path":"assets/button-B2ctw3Wx.js","sha256":"7171d972aa97f52c8051cc2433a078d56600170254452c1ac66dbdda78067948"},{"path":"assets/catalog-data-D82DblVT.js","sha256":"f2d614bd4921f0a67a3bd9854ea9b0199598db4ebc11313e4de139b13f99260b"},{"path":"assets/Catalog-DMXvQZ9v.js","sha256":"3cddd666e727dc28115cc13a8d3c8366352de94b5d0739e1e8374e267317c4e7"},{"path":"assets/Colors-BCwAyZFj.js","sha256":"ffdf4088a6bfc7a6401e4f71814faf1034da406d45a49072cde5dcef0b84f409"},{"path":"assets/Compare-DnR2EU9f.js","sha256":"c3f950205843a81dc72fa2e5037b339a78bda9d4157ffb26522065f4fbd8d535"},{"path":"assets/copy-DPXVTQ64.js","sha256":"683a20cae3f679d48c49b76a700a6117b53c5e09e70ab7ce17c6b993a53b0bd8"},{"path":"assets/createLucideIcon-DpoihF5A.js","sha256":"9660fba779c593b7f38b6847c676f9b69bd77cfec436ad0764988109e70fa08c"},{"path":"assets/DesignPreview-BXo51gCf.js","sha256":"bf667cfe28a3023f711a2e56303f3f078d1f71cab96c7199d55437f40fa4dae2"},{"path":"assets/Detail-Dbzv7paF.js","sha256":"8d39fd9c240ba9a49d23ca2a101a14270d605e83a7e67886ef04d854767fec63"},{"path":"assets/download-GxPArmE7.js","sha256":"a8347652f4c120a358a9be8393cc231d295079069d25e6db0ee3d0d4c8e28fce"},{"path":"assets/image-colors-CAHeJW1A.js","sha256":"72e5e7dd301927a33f4eb99ee1c929b7ebda3b98a9a41b504dfb208cad5d3613"},{"path":"assets/ImageEditor-D7EzEePD.js","sha256":"f819dad130dacb724327ffa957a91e755a7ba2f3ba00e08f2d3aa60734f3d588"},{"path":"assets/index-BxCOJpgQ.css","sha256":"57e494054063b2db1fab138fbd558c924897cb3fa5a90b3b6fa79be559ecd740"},{"path":"assets/index-ByMz8ZgL.js","sha256":"46ba20a0f838f334c9039be23f36c2c8b2c613e77cbf22addce29cfcf37c1690"},{"path":"assets/Library-0wiaBvrK.js","sha256":"b0493c4da5562510563d19e84b3d05e6ab7ffc5d6b432f8976782d3bf3b2768e"},{"path":"assets/LocalImage-KkQc87BO.js","sha256":"f3fb9c254dda348b81bf8e912d9d617a0b52885119830541a471c2b3906b439c"},{"path":"assets/PersonalLibrary-BW1fsWOd.js","sha256":"5b35aa7e5ebb47111efb562e8f4f9798377ebf6c66e91798537e36010b766a0f"},{"path":"assets/PresetEditor-DQkY2J--.js","sha256":"54cdd869724b9c0fefc491627a1ae64e763e6095ffde5ba89e4a86741d605b1e"},{"path":"assets/prompts-C6vx745x.js","sha256":"666f64204ab2f3e3d5b697da54ff653bf976991a7abc2806ef424ac76f5a2887"},{"path":"assets/Prompts-CpbbKYWe.js","sha256":"909aff27bd270ce3ece4ff006a7ccd56ab2e67461f53977d13499702454f4a26"},{"path":"assets/ReferenceEditor-UBMpj008.js","sha256":"cec0dc0d25b2f9fca945e11251f4c17e1ea54f5ff57d65f37daf9fa1b8a84fc6"},{"path":"assets/save-a7gAz61R.js","sha256":"1cea1d544a7e5a7d62afc6fab9af0743899684f3c35bbb7ce8e0d2997c20447f"},{"path":"assets/Settings-C9rlQffM.js","sha256":"c584563b10b3e7d51d6522112888fb060703474dfb3656a927b53bc6b43f892c"},{"path":"assets/studio-storage-4mYLkxuU.js","sha256":"3faae43db9309dc3cb381f4a92dbc40b4f511373ee7c0e78e6b98c197b8acf34"},{"path":"assets/StyleEditor-Bip8WkH5.js","sha256":"c6fe364c97cb9a72fd139fccd90d7088bc67a51ea1d2be2c156c35e244d51487"},{"path":"assets/UnsavedChangesGuard-D-PuAIM0.js","sha256":"ae6ee4064e329f10dfce26d0da9661f9c371b855a626e8e673e67d56e2a8b60c"},{"path":"assets/use-personal-editor-BQraeayX.js","sha256":"999aab87b21cf29d1049364b25e4cb11dae078be8dcf277865bd01ab5d9d8a04"},{"path":"favicon.svg","sha256":"6f682d3fc340d6fdcdcf809eb9cef0b33f1440b80827b9ecf34d25070a934801"},{"path":"icon-192.png","sha256":"1c4942069903e6d06794df990b167d816887a44cf2b8ac69974863596631a883"},{"path":"icon-512.png","sha256":"893b3fcbf60d8e3fe053ac8e1961e5ab6d7598bb3f4a02908b84a04e1f8bdb9b"},{"path":"index.html","sha256":"acff5660e4ea74d40f0fec76af69d7e471ba3b24f78cef7cb5d8d7fff2786d6f"},{"path":"manifest.webmanifest","sha256":"e5cf9673ba4db3a690c2d1755d8cb2a81c28c7438d65d583fcc9e567399d92ce"}]});
