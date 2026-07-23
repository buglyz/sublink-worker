export class MemoryKVAdapter {
    constructor() {
        this.store = new Map();
        this.expirations = new Map();
    }

    async get(key) {
        this.cleanExpired(key);
        return this.store.has(key) ? this.store.get(key) : null;
    }

    async put(key, value, options = {}) {
        this.store.set(key, value);
        if (options.expirationTtl) {
            this.expirations.set(key, Date.now() + options.expirationTtl * 1000);
        } else {
            this.expirations.delete(key);
        }
    }

    async delete(key) {
        this.store.delete(key);
        this.expirations.delete(key);
    }

    cleanExpired(key) {
        const expiresAt = this.expirations.get(key);
        if (expiresAt == null) return;
        if (expiresAt <= Date.now() || !this.store.has(key)) {
            this.store.delete(key);
            this.expirations.delete(key);
        }
    }
}
