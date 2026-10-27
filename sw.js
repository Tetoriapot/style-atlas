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

installWorker(self, {"version":"05fb6f932277bd6a","files":[{"path":"assets/backup-BjsOCWxh.js","sha256":"cbdb4d7b1c5bafdc93110a8aaa05e636a10847e33e9b4fc68ba233acb86ee6be"},{"path":"assets/button-BUZFCPWl.js","sha256":"fca6f044a00dce597cf432bd7b0dd6f78f44f9b4ba37ec44a40668324a79c80f"},{"path":"assets/catalog-data-D82DblVT.js","sha256":"f2d614bd4921f0a67a3bd9854ea9b0199598db4ebc11313e4de139b13f99260b"},{"path":"assets/Catalog-DQAzkjPt.js","sha256":"54218c050cbb3e9234e5f06daaca421665632381a3dc1935a9eda9b5fb786312"},{"path":"assets/Colors-DZ89WGmm.js","sha256":"1186f5a8996c801aafc68040f413c9abc60a6b53b2d959c062fd1f5ed9725810"},{"path":"assets/Compare-B7irRigl.js","sha256":"4a90a22f59f0a303a1417bb67cbd3887341242747f1d6d7539bf1ec7ec05eabf"},{"path":"assets/copy-Dnjk2TmD.js","sha256":"bb13376bb8fd0c37d6d0961d5568da9d082dd0822c2558806a7ce82de151287b"},{"path":"assets/createLucideIcon-DdQykxnT.js","sha256":"d672bf9d7a6e500f7c345430fb34aaf2ee510eb675d62ed982643f4739595164"},{"path":"assets/DesignPreview-BAAZsCM-.js","sha256":"57b7665fe7710cb24b9a45ee8080aacc0dbf0c5a27058457af14b3b1ffb19406"},{"path":"assets/Detail-Bo0Bm59b.js","sha256":"04d4a0cd45ff5ba88a00ce13a91051ff96c3333ff8ff1dc1258bb10598e16c52"},{"path":"assets/download-BxVTrkig.js","sha256":"9b268db53360409f40a9c6c42cee91e48b3c13d080809c97949789401e121f93"},{"path":"assets/image-colors-J7medDho.js","sha256":"b003a89d686821fc4ef77aa66a644d59391d9dbfd7d3c5c7e080033189cc4c75"},{"path":"assets/ImageEditor-hvoVDj6Q.js","sha256":"3bd4b586c64532bd4a7ca120bdac078bffab0c9c11a148190adced92e093d802"},{"path":"assets/index-CbNY4zk-.js","sha256":"1a57bb14bc689923e1c1c9981c7c834a96bfcb78aaa7a32e46d00dc11fa59d74"},{"path":"assets/index-DjpquvEg.css","sha256":"a1d376972864c382a7e7c0be6c7e2c7f3a19d6fccebdba27a69303c2e8fc341f"},{"path":"assets/Library-CKIVAuIr.js","sha256":"ec4f4d2e6a473e44472b4452af2c0647b11addf647b52a15abb88dece88bdb40"},{"path":"assets/LocalImage-_sGovtRT.js","sha256":"67c293b3d382ee6dcde08e8d3b5502ed2ee79890ce33a6f9dd06f74b398f9fab"},{"path":"assets/PersonalLibrary-ClOWuZ1t.js","sha256":"4c09dc99f0f2086d0ce1f4371f20b45898e7419f5fdad230491b7101dae39547"},{"path":"assets/PresetEditor-C8nyk8FP.js","sha256":"58927408b43a8b6e505dd0abcb5ad0769fed377e4e121b19bf46f983794e92a3"},{"path":"assets/Prompts-_Gfocdvh.js","sha256":"f7bc89223702b42f6e02b16ac9a8f01a06976b8c01170bdb89ffae3ec3923c85"},{"path":"assets/prompts-BZQ5atCf.js","sha256":"90ae892513c3c5ab8c5fccfe438c5dfa1e9bf8507901b298f1629ae23bc38b1f"},{"path":"assets/ReferenceEditor-u3KDg5ou.js","sha256":"49452399370c02232eb979e37eef2a3343d0dbfabd70fb1f6582945a558dc64a"},{"path":"assets/save-B0hPp3Qc.js","sha256":"683ba62e0e1054706c7d1b0443fd09e60c2a763bf6a83f8c7c96c276bdf7a985"},{"path":"assets/Settings-BwEg-WNM.js","sha256":"0188417e5794da01f19e2c6964c15c6a2ec1350276b6dc49ad37a7ba1e84f981"},{"path":"assets/studio-storage-BgUQe05Z.js","sha256":"0c34e15b6275b3a56681490b208f3d9a3bffaff961b42c99900d811c51a4e158"},{"path":"assets/StyleEditor-DDkDGy9U.js","sha256":"152849e0fabe81c307603190a8ef14b7ce9a823484ee384998d7e605b4291745"},{"path":"assets/UnsavedChangesGuard-BdDBwp4c.js","sha256":"354473e8363484991add9d027db2c2485bed9aa0298b1850de3122235320f71e"},{"path":"assets/use-personal-editor-JItOxBcf.js","sha256":"333225a08413f443e4784853788dc397aee153c17ddc138d461b72901be5a15a"},{"path":"favicon.svg","sha256":"6f682d3fc340d6fdcdcf809eb9cef0b33f1440b80827b9ecf34d25070a934801"},{"path":"icon-192.png","sha256":"1c4942069903e6d06794df990b167d816887a44cf2b8ac69974863596631a883"},{"path":"icon-512.png","sha256":"893b3fcbf60d8e3fe053ac8e1961e5ab6d7598bb3f4a02908b84a04e1f8bdb9b"},{"path":"index.html","sha256":"007eb365da6477f3515f9a78dea4a947c18fe79f60767c6fd045fc2dd5ce5480"},{"path":"manifest.webmanifest","sha256":"e5cf9673ba4db3a690c2d1755d8cb2a81c28c7438d65d583fcc9e567399d92ce"}]});
