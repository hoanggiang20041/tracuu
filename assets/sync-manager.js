// Comprehensive Sync Manager for 2FA and Password synchronization
class SyncManager {
    constructor() {
        this.syncStatusKey = 'sync_status';
        this.lastSyncKey = 'last_sync_timestamp';
        this.syncErrorsKey = 'sync_errors';
        this.maxRetries = 3;
        this.syncInterval = 30000; // 30 seconds
        this.autoSyncEnabled = true;
        this.init();
    }

    init() {
        this.loadSyncStatus();
        this.setupAutoSync();
        this.setupEventListeners();
    }

    loadSyncStatus() {
        try {
            const status = localStorage.getItem(this.syncStatusKey);
            this.syncStatus = status ? JSON.parse(status) : {
                lastSuccessfulSync: null,
                lastFailedSync: null,
                consecutiveFailures: 0,
                isOnline: navigator.onLine,
                remoteConfigured: false
            };
        } catch (error) {
            console.error('Failed to load sync status:', error);
            this.syncStatus = {
                lastSuccessfulSync: null,
                lastFailedSync: null,
                consecutiveFailures: 0,
                isOnline: navigator.onLine,
                remoteConfigured: false
            };
        }
    }

    saveSyncStatus() {
        try {
            localStorage.setItem(this.syncStatusKey, JSON.stringify(this.syncStatus));
        } catch (error) {
            console.error('Failed to save sync status:', error);
        }
    }

    setupAutoSync() {
        if (this.autoSyncEnabled) {
            // Auto sync every 30 seconds
            setInterval(() => {
                if (this.shouldAutoSync()) {
                    this.performAutoSync();
                }
            }, this.syncInterval);
        }
    }

    setupEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.syncStatus.isOnline = true;
            this.saveSyncStatus();
            this.performAutoSync();
        });

        window.addEventListener('offline', () => {
            this.syncStatus.isOnline = false;
            this.saveSyncStatus();
        });

        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'global_admin_account' || e.key === 'global_admin_2fa') {
                this.performAutoSync();
            }
        });
    }

    shouldAutoSync() {
        return this.syncStatus.isOnline && 
               window.remoteStore && 
               window.remoteStore.isConfigured() &&
               this.syncStatus.consecutiveFailures < this.maxRetries;
    }

    async performAutoSync() {
        try {
            console.log('Performing auto sync...');
            const result = await this.syncAll();
            if (result.success) {
                this.syncStatus.lastSuccessfulSync = Date.now();
                this.syncStatus.consecutiveFailures = 0;
                this.saveSyncStatus();
                console.log('Auto sync completed successfully');
            } else {
                this.handleSyncError(result.error);
            }
        } catch (error) {
            this.handleSyncError(error.message);
        }
    }

    async syncAll() {
        const results = {
            success: true,
            errors: [],
            details: {}
        };

        try {
            // Check if remote store is configured
            if (!window.remoteStore || !window.remoteStore.isConfigured()) {
                results.success = false;
                results.errors.push('Remote store not configured');
                return results;
            }

            // Sync auth system
            if (window.hiddenAuth) {
                try {
                    const authResult = await window.hiddenAuth.forceSyncFromRemote();
                    results.details.auth = authResult;
                    if (!authResult.success) {
                        results.errors.push('Auth sync failed: ' + authResult.message);
                    }
                } catch (error) {
                    results.errors.push('Auth sync error: ' + error.message);
                }
            }

            // Sync security system
            if (window.adminSecurity) {
                try {
                    const securityResult = await window.adminSecurity.forceSync2FAFromRemote();
                    results.details.security = securityResult;
                    if (!securityResult.success) {
                        results.errors.push('Security sync failed: ' + securityResult.message);
                    }
                } catch (error) {
                    results.errors.push('Security sync error: ' + error.message);
                }
            }

            // Check for any critical errors
            if (results.errors.length > 0) {
                results.success = false;
            }

            return results;
        } catch (error) {
            results.success = false;
            results.errors.push('General sync error: ' + error.message);
            return results;
        }
    }

    handleSyncError(error) {
        this.syncStatus.lastFailedSync = Date.now();
        this.syncStatus.consecutiveFailures++;
        this.saveSyncStatus();

        // Log error
        this.logSyncError(error);

        // Show notification if too many failures
        if (this.syncStatus.consecutiveFailures >= this.maxRetries) {
            this.showSyncErrorNotification();
        }
    }

    logSyncError(error) {
        try {
            const errors = JSON.parse(localStorage.getItem(this.syncErrorsKey) || '[]');
            errors.push({
                timestamp: Date.now(),
                error: error,
                consecutiveFailures: this.syncStatus.consecutiveFailures
            });

            // Keep only last 10 errors
            if (errors.length > 10) {
                errors.splice(0, errors.length - 10);
            }

            localStorage.setItem(this.syncErrorsKey, JSON.stringify(errors));
        } catch (e) {
            console.error('Failed to log sync error:', e);
        }
    }

    showSyncErrorNotification() {
        if (typeof showNotification === 'function') {
            showNotification(
                `Đồng bộ thất bại ${this.syncStatus.consecutiveFailures} lần liên tiếp. Vui lòng kiểm tra kết nối mạng.`, 
                'error'
            );
        }
    }

    // Manual sync with user feedback
    async manualSync() {
        try {
            if (typeof showNotification === 'function') {
                showNotification('Đang đồng bộ dữ liệu...', 'info');
            }

            const result = await this.syncAll();
            
            if (result.success) {
                this.syncStatus.lastSuccessfulSync = Date.now();
                this.syncStatus.consecutiveFailures = 0;
                this.saveSyncStatus();
                
                if (typeof showNotification === 'function') {
                    showNotification('Đồng bộ thành công!', 'success');
                }
                
                // Trigger UI refresh if available
                if (typeof load2FAStatus === 'function') {
                    load2FAStatus();
                }
            } else {
                this.handleSyncError(result.errors.join(', '));
                
                if (typeof showNotification === 'function') {
                    showNotification('Đồng bộ thất bại: ' + result.errors.join(', '), 'error');
                }
            }

            return result;
        } catch (error) {
            this.handleSyncError(error.message);
            
            if (typeof showNotification === 'function') {
                showNotification('Lỗi đồng bộ: ' + error.message, 'error');
            }
            
            return { success: false, error: error.message };
        }
    }

    // Get sync status for UI
    getSyncStatus() {
        return {
            ...this.syncStatus,
            isConfigured: window.remoteStore && window.remoteStore.isConfigured(),
            lastSyncTime: this.syncStatus.lastSuccessfulSync ? 
                new Date(this.syncStatus.lastSuccessfulSync).toLocaleString('vi-VN') : 
                'Chưa đồng bộ',
            consecutiveFailures: this.syncStatus.consecutiveFailures,
            isHealthy: this.syncStatus.consecutiveFailures < this.maxRetries
        };
    }

    // Reset sync status
    resetSyncStatus() {
        this.syncStatus = {
            lastSuccessfulSync: null,
            lastFailedSync: null,
            consecutiveFailures: 0,
            isOnline: navigator.onLine,
            remoteConfigured: false
        };
        this.saveSyncStatus();
        localStorage.removeItem(this.syncErrorsKey);
    }

    // Validate sync data integrity
    validateSyncData() {
        const issues = [];

        try {
            // Check global admin account
            const globalAdmin = localStorage.getItem('global_admin_account');
            if (globalAdmin) {
                const adminData = JSON.parse(globalAdmin);
                if (!adminData.secretKey || !adminData.challenge) {
                    issues.push('Global admin account missing secret key or challenge');
                }
            }

            // Check global 2FA status
            const global2FA = localStorage.getItem('global_admin_2fa');
            if (global2FA) {
                const twoFAData = JSON.parse(global2FA);
                if (twoFAData.enabled && !twoFAData.secret) {
                    issues.push('2FA enabled but missing secret key');
                }
            }

            // Check consistency between systems
            if (globalAdmin && global2FA) {
                const adminData = JSON.parse(globalAdmin);
                const twoFAData = JSON.parse(global2FA);
                
                if (adminData.twoFactorEnabled !== twoFAData.enabled) {
                    issues.push('2FA status inconsistent between admin account and global 2FA');
                }
                
                if (adminData.twoFactorSecret !== twoFAData.secret) {
                    issues.push('2FA secret inconsistent between admin account and global 2FA');
                }
            }

        } catch (error) {
            issues.push('Error validating sync data: ' + error.message);
        }

        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    // Fix common sync issues
    async fixSyncIssues() {
        try {
            const validation = this.validateSyncData();
            if (validation.isValid) {
                return { success: true, message: 'Không có vấn đề cần sửa' };
            }

            let fixed = 0;
            const issues = validation.issues;

            // Fix 2FA status inconsistency
            if (issues.some(issue => issue.includes('2FA status inconsistent'))) {
                const globalAdmin = JSON.parse(localStorage.getItem('global_admin_account') || '{}');
                const global2FA = JSON.parse(localStorage.getItem('global_admin_2fa') || '{}');
                
                // Use global 2FA as source of truth
                globalAdmin.twoFactorEnabled = global2FA.enabled;
                globalAdmin.twoFactorSecret = global2FA.secret;
                
                localStorage.setItem('global_admin_account', JSON.stringify(globalAdmin));
                sessionStorage.setItem('global_admin_account', JSON.stringify(globalAdmin));
                fixed++;
            }

            // Sync with remote to get latest data
            await this.manualSync();

            return { 
                success: true, 
                message: `Đã sửa ${fixed} vấn đề đồng bộ`,
                issuesFixed: fixed
            };
        } catch (error) {
            return { success: false, message: 'Lỗi khi sửa vấn đề đồng bộ: ' + error.message };
        }
    }
}

// Initialize sync manager
window.syncManager = new SyncManager();
