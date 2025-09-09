// Remote JSONBin storage (private bin)
// Lightweight client with graceful offline fallback

class RemoteStore {
    constructor() {
        this.configKey = 'jsonbin_config';
        this.adminCacheKey = 'remote_admin_cache';
        this.config = this.loadConfig();
        // If no config but default provided via separate file, adopt it once
        if (!this.config && window.JSONBIN_DEFAULT && window.JSONBIN_DEFAULT.binId && window.JSONBIN_DEFAULT.masterKey) {
            this.saveConfig({ binId: window.JSONBIN_DEFAULT.binId, masterKey: window.JSONBIN_DEFAULT.masterKey });
        }
        // Use relative proxy endpoint (server-side) to avoid exposing keys on client
        this.baseUrl = '/api/admin-state';
    }

    loadConfig() {
        try {
            const raw = localStorage.getItem(this.configKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Failed to load JSONBin config', e);
            return null;
        }
    }

    saveConfig(config) {
        this.config = config;
        localStorage.setItem(this.configKey, JSON.stringify(config));
    }

    isConfigured() {
        // If using server-side proxy (relative /api endpoint), consider configured
        if (typeof this.baseUrl === 'string' && this.baseUrl.indexOf('/api/') === 0) {
            return true;
        }
        // Fallback to legacy client-side config
        return !!(this.config && this.config.masterKey && this.config.binId);
    }

    async getAdminState() {
        if (!this.isConfigured()) {
            return null;
        }
        try {
            const res = await fetch(this.baseUrl, { method: 'GET' });
            if (!res.ok) {
                throw new Error(`JSONBin GET failed: ${res.status}`);
            }
            const data = await res.json();
            const record = data && (data.record || data);
            if (record) {
                localStorage.setItem(this.adminCacheKey, JSON.stringify(record));
            }
            return record || null;
        } catch (e) {
            console.warn('RemoteStore.getAdminState fallback to cache', e);
            try {
                const cached = localStorage.getItem(this.adminCacheKey);
                return cached ? JSON.parse(cached) : null;
            } catch (_) {
                return null;
            }
        }
    }

    async setAdminState(state) {
        if (!this.isConfigured()) {
            return { ok: false, reason: 'not_configured' };
        }
        try {
            const res = await fetch(this.baseUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
            if (!res.ok) {
                throw new Error(`JSONBin PUT failed: ${res.status}`);
            }
            localStorage.setItem(this.adminCacheKey, JSON.stringify(state));
            return { ok: true };
        } catch (e) {
            console.error('RemoteStore.setAdminState error', e);
            return { ok: false, error: e.message };
        }
    }
}

// Global instance for convenience
window.remoteStore = new RemoteStore();


