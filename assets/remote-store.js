// Remote JSONBin storage (private bin)
// Lightweight client with graceful offline fallback

class RemoteStore {
    constructor() {
        this.configKey = 'jsonbin_config';
        this.adminCacheKey = 'remote_admin_cache';
        this.config = this.loadConfig();
        this.syncStatusKey = 'sync_status';
        // If no config but default provided via separate file, adopt it once
        if (!this.config && window.JSONBIN_DEFAULT && window.JSONBIN_DEFAULT.binId && window.JSONBIN_DEFAULT.masterKey) {
            this.saveConfig({ binId: window.JSONBIN_DEFAULT.binId, masterKey: window.JSONBIN_DEFAULT.masterKey });
        }
        // Use relative proxy endpoint (server-side) to avoid exposing keys on client
        this.baseUrl = '/api/admin-state';
    }

    getSyncStatus() {
        try {
            const raw = localStorage.getItem(this.syncStatusKey);
            return raw ? JSON.parse(raw) : { lastSuccessfulSync: null, lastFailedSync: null, consecutiveFailures: 0, isOnline: navigator.onLine, remoteConfigured: true };
        } catch(_) {
            return { lastSuccessfulSync: null, lastFailedSync: null, consecutiveFailures: 0, isOnline: navigator.onLine, remoteConfigured: true };
        }
    }

    setSyncStatus(status) {
        try { localStorage.setItem(this.syncStatusKey, JSON.stringify(status)); } catch(_) {}
    }

    noteSuccess() {
        const s = this.getSyncStatus();
        s.lastSuccessfulSync = Date.now();
        s.consecutiveFailures = 0;
        s.isOnline = navigator.onLine;
        s.remoteConfigured = true;
        delete s.blockUntil;
        this.setSyncStatus(s);
    }

    noteFailure() {
        const s = this.getSyncStatus();
        s.lastFailedSync = Date.now();
        s.consecutiveFailures = (s.consecutiveFailures || 0) + 1;
        s.isOnline = navigator.onLine;
        // Circuit breaker: back off progressively (1, 2, 5, 10 mins)
        const backoffs = [60_000, 120_000, 300_000, 600_000];
        const idx = Math.min(s.consecutiveFailures - 1, backoffs.length - 1);
        s.blockUntil = Date.now() + backoffs[idx];
        this.setSyncStatus(s);
    }

    isBlocked() {
        const s = this.getSyncStatus();
        return s.blockUntil && Date.now() < s.blockUntil;
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
        if (this.isBlocked()) {
            // During backoff window, prefer cached data
            try {
                const cached = localStorage.getItem(this.adminCacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    return parsed && parsed.data ? parsed.data : parsed;
                }
            } catch(_) {}
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
                // Store with timestamp for cache validation
                const cacheData = {
                    data: record,
                    timestamp: Date.now(),
                    version: record.version || 1
                };
                localStorage.setItem(this.adminCacheKey, JSON.stringify(cacheData));
                this.noteSuccess();
                
                // Also sync to global admin account if it contains auth data
                if (record.secretKey || record.passwordHash || record.twoFactorEnabled !== undefined) {
                    this.syncToGlobalAdminAccount(record);
                }
            }
            return record || null;
        } catch (e) {
            console.warn('RemoteStore.getAdminState fallback to cache', e);
            this.noteFailure();
            try {
                const cached = localStorage.getItem(this.adminCacheKey);
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    // Return cached data if it's less than 5 minutes old
                    if (Date.now() - cacheData.timestamp < 5 * 60 * 1000) {
                        return cacheData.data;
                    }
                }
                return null;
            } catch (_) {
                return null;
            }
        }
    }

    async setAdminState(state) {
        if (!this.isConfigured()) {
            return { ok: false, reason: 'not_configured' };
        }
        if (this.isBlocked()) {
            return { ok: false, reason: 'backoff' };
        }
        try {
            // Add version and timestamp to state
            const stateWithMeta = {
                ...state,
                version: (state.version || 0) + 1,
                lastUpdated: Date.now(),
                updatedBy: 'remote_store'
            };
            
            const res = await fetch(this.baseUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stateWithMeta) });
            if (!res.ok) {
                throw new Error(`JSONBin PUT failed: ${res.status}`);
            }
            
            // Store with timestamp for cache validation
            const cacheData = {
                data: stateWithMeta,
                timestamp: Date.now(),
                version: stateWithMeta.version
            };
            localStorage.setItem(this.adminCacheKey, JSON.stringify(cacheData));
            this.noteSuccess();
            
            // Also sync to global admin account if it contains auth data
            if (state.secretKey || state.passwordHash || state.twoFactorEnabled !== undefined) {
                this.syncToGlobalAdminAccount(stateWithMeta);
            }
            
            return { ok: true };
        } catch (e) {
            console.error('RemoteStore.setAdminState error', e);
            this.noteFailure();
            return { ok: false, error: e.message };
        }
    }
    
    // Sync remote data to global admin account
    syncToGlobalAdminAccount(remoteData) {
        try {
            const globalAdminKey = 'global_admin_account';
            let globalAdmin = localStorage.getItem(globalAdminKey);
            
            if (globalAdmin) {
                const data = JSON.parse(globalAdmin);
                
                // Always use fixed values for secret key and challenge to ensure consistency
                data.secretKey = btoa("admin_access_2024_global_fixed"); // Fixed across all machines
                data.challenge = "fixed_challenge_2024"; // Fixed across all machines
                
                // Update with remote data
                if (remoteData.passwordHash) data.passwordHash = remoteData.passwordHash;
                if (remoteData.twoFactorEnabled !== undefined) data.twoFactorEnabled = remoteData.twoFactorEnabled;
                if (remoteData.twoFactorSecret) data.twoFactorSecret = remoteData.twoFactorSecret;
                if (remoteData.lastUpdated) data.lastRemoteSync = remoteData.lastUpdated;
                
                // Save updated data
                localStorage.setItem(globalAdminKey, JSON.stringify(data));
                sessionStorage.setItem(globalAdminKey, JSON.stringify(data));
                
                console.log('Synced remote data to global admin account with fixed secret key and challenge');
            } else {
                // Create new global admin account with fixed values
                const newGlobalAdmin = {
                    secretKey: btoa("admin_access_2024_global_fixed"), // Fixed across all machines
                    challenge: "fixed_challenge_2024", // Fixed across all machines
                    passwordHash: remoteData.passwordHash || null,
                    twoFactorEnabled: remoteData.twoFactorEnabled || false,
                    twoFactorSecret: remoteData.twoFactorSecret || null,
                    lastUpdated: Date.now(),
                    lastRemoteSync: Date.now()
                };
                
                localStorage.setItem(globalAdminKey, JSON.stringify(newGlobalAdmin));
                sessionStorage.setItem(globalAdminKey, JSON.stringify(newGlobalAdmin));
                
                console.log('Created new global admin account with fixed secret key and challenge');
            }
        } catch (error) {
            console.error('Failed to sync remote data to global admin account:', error);
        }
    }
    
    // Force sync from remote and update all local systems
    async forceSyncFromRemote() {
        try {
            const remoteData = await this.getAdminState();
            if (remoteData) {
                // Sync to global admin account
                this.syncToGlobalAdminAccount(remoteData);
                
                // Sync to global 2FA status
                if (remoteData.twoFactorEnabled !== undefined || remoteData.twoFactorSecret) {
                    const global2FA = {
                        enabled: remoteData.twoFactorEnabled || false,
                        secret: remoteData.twoFactorSecret || null,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
                    sessionStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
                }
                
                // Trigger sync in other systems
                if (window.adminSecurity) {
                    window.adminSecurity.syncWithGlobal2FA();
                }
                if (window.hiddenAuth) {
                    window.hiddenAuth.refreshFromRemote();
                }
                
                console.log('Force sync from remote completed');
                return { success: true, data: remoteData };
            }
            return { success: false, message: 'No remote data available' };
        } catch (error) {
            console.error('Force sync from remote failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance for convenience
window.remoteStore = new RemoteStore();


