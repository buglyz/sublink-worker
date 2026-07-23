import { createApp } from './app/createApp.jsx';
import { createCloudflareRuntime } from './runtime/cloudflare.js';

export { StorageCoordinator } from './durableObjects/storageCoordinator.js';

// Rebuild per request so AUTH_PASSWORD / KV bindings always match current env.
// (Workers may reuse isolates; do not cache a runtime from a cold empty env.)
export default {
    fetch(request, env, ctx) {
        const runtime = createCloudflareRuntime(env);
        const app = createApp(runtime);
        return app.fetch(request, env, ctx);
    }
};
