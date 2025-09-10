// Hệ thống xác thực đơn giản và tương thích
class HiddenAuth {
    constructor() {
        this.globalAdminKey = 'global_admin_account';
        this.secretKey = this.getOrCreateGlobalSecretKey();
        this.challenge = this.generateChallenge();
        this.remoteEnabled = true;
        // Ensure local admin state is consistent with fixed config
        this.ensureConsistentAdminState();
    }
    
    // Tạo hoặc lấy global secret key (CỐ ĐỊNH cho tất cả sessions)
    getOrCreateGlobalSecretKey() {
        try {
            // Check if password was already fixed
            const passwordFixed = localStorage.getItem('password_fixed');
            if (passwordFixed === 'true') {
                console.log('Password already fixed, using existing data');
                let globalAdmin = localStorage.getItem(this.globalAdminKey);
                if (globalAdmin) {
                    const data = JSON.parse(globalAdmin);
                    if (data.secretKey) {
                        console.log('Using existing fixed global secret key');
                        return data.secretKey;
                    }
                }
            }
            
            // Try to get existing global secret key
            let globalAdmin = localStorage.getItem(this.globalAdminKey);
            if (globalAdmin) {
                const data = JSON.parse(globalAdmin);
                if (data.secretKey) {
                    console.log('Using existing global secret key');
                    return data.secretKey;
                }
            }
            
            // Create FIXED global secret key (không thay đổi theo thời gian)
            const base = "admin_access_2024_global_fixed";
            const secretKey = btoa(base); // Không có timestamp để đảm bảo cố định
            
            // Generate FIXED challenge (cố định cho tất cả sessions)
            const challenge = "fixed_challenge_2024";
            
            // Ensure instance uses the new secret and challenge before hashing
            this.secretKey = secretKey;
            this.challenge = challenge;
            
            // Save global admin data (hash computed with the instance's secret/challenge)
            const globalAdminData = {
                secretKey: this.secretKey,
                challenge: this.challenge,
                createdAt: Date.now(),
                passwordHash: this.encryptInput("admin123") // Default password hash
            };
            
            localStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            sessionStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            
            // Mark password as fixed
            localStorage.setItem('password_fixed', 'true');
            localStorage.setItem('password_fix_time', Date.now().toString());
            
            console.log('Created new FIXED global secret key');
            return secretKey;
        } catch (error) {
            console.error('Failed to get/create global secret key:', error);
            // Fallback to fixed method - MUST match remote-store.js
            const base = "admin_access_2024_global_fixed";
            return btoa(base);
        }
    }
    
    // Ensure local admin state uses fixed keys and valid hash
    ensureConsistentAdminState() {
        try {
            const fixedSecret = btoa("admin_access_2024_global_fixed");
            const fixedChallenge = "fixed_challenge_2024";
            let raw = localStorage.getItem(this.globalAdminKey) || sessionStorage.getItem(this.globalAdminKey);
            let data = raw ? JSON.parse(raw) : null;
            const needsFix = !data || data.secretKey !== fixedSecret || data.challenge !== fixedChallenge || !data.passwordHash;
            if (needsFix) {
                // Lock instance to fixed values
                this.secretKey = fixedSecret;
                this.challenge = fixedChallenge;
                // Preserve 2FA fields if present
                const twoFactorEnabled = data && typeof data.twoFactorEnabled === 'boolean' ? data.twoFactorEnabled : false;
                const twoFactorSecret = data && data.twoFactorSecret ? data.twoFactorSecret : null;
                const globalAdminData = {
                    secretKey: this.secretKey,
                    challenge: this.challenge,
                    createdAt: (data && data.createdAt) ? data.createdAt : Date.now(),
                    passwordHash: this.encryptInput("admin123"),
                    twoFactorEnabled,
                    twoFactorSecret,
                    lastUpdated: Date.now()
                };
                localStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
                sessionStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
                // Mark password fixed
                localStorage.setItem('password_fixed', 'true');
                if (!localStorage.getItem('password_fix_time')) {
                    localStorage.setItem('password_fix_time', Date.now().toString());
                }
            }
        } catch (_) { /* ignore */ }
    }
    
    // Tạo challenge CỐ ĐỊNH (không ngẫu nhiên để đồng bộ)
    generateChallenge() {
        // Sử dụng challenge cố định để đảm bảo đồng bộ giữa các sessions
        return "fixed_challenge_2024";
    }
    
    // Hàm hash đơn giản và tương thích
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    // Mã hóa input với secret key
    encryptInput(input) {
        const combined = this.secretKey + input + this.challenge;
        return this.simpleHash(combined);
    }
    
    // Get global 2FA status (works across all sessions)
    getGlobal2FAStatus() {
        try {
            // Try localStorage first
            let global2FA = localStorage.getItem('global_admin_2fa');
            if (global2FA) {
                return JSON.parse(global2FA);
            }
            
            // Try sessionStorage as backup
            global2FA = sessionStorage.getItem('global_admin_2fa');
            if (global2FA) {
                return JSON.parse(global2FA);
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get global 2FA status:', error);
            return null;
        }
    }
    
    // Kiểm tra xác thực với global admin account
    verify(input, twoFactorCode = null) {
        // Get global admin data
        const globalAdmin = this.getGlobalAdminData();
        if (!globalAdmin) {
            return { success: false, message: 'Không tìm thấy tài khoản admin' };
        }
        
        // Use stored secret key and challenge for consistent hashing
        const storedSecretKey = globalAdmin.secretKey || this.secretKey;
        const storedChallenge = globalAdmin.challenge || this.challenge;
        
        // Verify password using consistent hash with stored values
        const combined = storedSecretKey + input + storedChallenge;
        const inputHash = this.simpleHash(combined);
        const storedHash = globalAdmin.passwordHash;
        
        console.log('Password verification:', {
            input: input,
            inputHash: inputHash,
            storedHash: storedHash,
            secretKey: storedSecretKey.substring(0, 10) + '...',
            challenge: storedChallenge
        });
        
        if (inputHash !== storedHash) {
            return { success: false, message: 'Mật khẩu không đúng' };
        }
        
        // Check 2FA if enabled (using global 2FA status)
        const global2FA = this.getGlobal2FAStatus();
        if (global2FA && global2FA.enabled && global2FA.secret) {
            if (!twoFactorCode) {
                return { success: false, message: 'Vui lòng nhập mã 2FA', requires2FA: true };
            }
            
            // Verify 2FA code
            if (window.adminSecurity && !window.adminSecurity.verifyTOTPCode(twoFactorCode, global2FA.secret)) {
                return { success: false, message: 'Mã 2FA không đúng' };
            }
        }
        
        return { success: true, message: 'Xác thực thành công' };
    }
    
    // Change admin password
    changePassword(oldPassword, newPassword) {
        try {
            // Get global admin data first
            const globalAdmin = this.getGlobalAdminData();
            if (!globalAdmin) {
                return { success: false, message: 'Không tìm thấy tài khoản admin' };
            }
            
            // Use stored secret key and challenge for consistent hashing
            const storedSecretKey = globalAdmin.secretKey || this.secretKey;
            const storedChallenge = globalAdmin.challenge || this.challenge;
            
            // Create temporary auth instance with stored values
            const tempAuth = new HiddenAuth();
            tempAuth.secretKey = storedSecretKey;
            tempAuth.challenge = storedChallenge;
            
            // Verify old password using consistent hash
            const oldPasswordHash = tempAuth.encryptInput(oldPassword);
            const storedHash = globalAdmin.passwordHash;
            
            console.log('Password change verification:', {
                oldPassword: oldPassword,
                oldPasswordHash: oldPasswordHash,
                storedHash: storedHash,
                match: oldPasswordHash === storedHash
            });
            
            if (oldPasswordHash !== storedHash) {
                return { success: false, message: 'Mật khẩu cũ không đúng' };
            }
            
            // Generate new password hash using same secret key and challenge
            const newPasswordHash = tempAuth.encryptInput(newPassword);
            
            // Update global admin data
            globalAdmin.passwordHash = newPasswordHash;
            globalAdmin.lastPasswordChange = Date.now();
            globalAdmin.secretKey = storedSecretKey; // Ensure consistency
            globalAdmin.challenge = storedChallenge; // Ensure consistency
            
            // Save updated data
            localStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdmin));
            sessionStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdmin));
            // Persist to remote (best-effort)
            this.persistToRemote(globalAdmin);
            
            // Update current instance
            this.secretKey = storedSecretKey;
            this.challenge = storedChallenge;
            
            // Broadcast password change to all sessions
            this.broadcastPasswordChange();
            
            console.log('Password changed successfully:', {
                newPasswordHash: newPasswordHash,
                secretKey: storedSecretKey.substring(0, 10) + '...',
                challenge: storedChallenge
            });
            
            return { success: true, message: 'Mật khẩu đã được thay đổi thành công' };
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, message: 'Lỗi khi thay đổi mật khẩu: ' + error.message };
        }
    }
    
    // Broadcast password change to all sessions
    broadcastPasswordChange() {
        // Trigger storage event for other tabs
        const event = new StorageEvent('storage', {
            key: this.globalAdminKey,
            newValue: localStorage.getItem(this.globalAdminKey),
            oldValue: localStorage.getItem(this.globalAdminKey),
            storageArea: localStorage
        });
        window.dispatchEvent(event);
        
        // Also dispatch custom event
        window.dispatchEvent(new CustomEvent('adminPasswordChanged'));
    }
    
    // Reset and recreate global admin account with FIXED hash
    resetGlobalAdminAccount() {
        try {
            // Clear existing data
            localStorage.removeItem(this.globalAdminKey);
            sessionStorage.removeItem(this.globalAdminKey);
            
            // Create FIXED secret/challenge and set on instance BEFORE hashing
            const secretKey = btoa("admin_access_2024_global_fixed");
            const challenge = "fixed_challenge_2024";
            this.secretKey = secretKey;
            this.challenge = challenge;
            
            const globalAdminData = {
                secretKey: this.secretKey,
                challenge: this.challenge,
                createdAt: Date.now(),
                passwordHash: this.encryptInput("admin123") // Default password hash
            };
            
            // Save new data
            localStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            sessionStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            // Persist to remote as well
            this.persistToRemote(globalAdminData);
            
            // Update current instance
            this.secretKey = secretKey;
            this.challenge = challenge;
            
            console.log('Global admin account reset with FIXED hash');
            return { success: true, message: 'Global admin account đã được reset với hash CỐ ĐỊNH' };
        } catch (error) {
            console.error('Failed to reset global admin account:', error);
            return { success: false, message: 'Lỗi khi reset global admin account: ' + error.message };
        }
    }
    
    // Get global admin data
    getGlobalAdminData() {
        try {
            // Try remote JSONBin first if configured
            if (this.remoteEnabled && window.remoteStore && window.remoteStore.isConfigured()) {
                // Return cached data synchronously if present while async refresh happens outside
                const cached = localStorage.getItem(window.remoteStore.adminCacheKey);
                if (cached) {
                    try { return JSON.parse(cached); } catch(_) {}
                }
            }
            let globalAdmin = localStorage.getItem(this.globalAdminKey);
            if (globalAdmin) {
                return JSON.parse(globalAdmin);
            }
            
            // Try sessionStorage as backup
            globalAdmin = sessionStorage.getItem(this.globalAdminKey);
            if (globalAdmin) {
                return JSON.parse(globalAdmin);
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get global admin data:', error);
            return null;
        }
    }

    // Async refresh from remote (to be called on app init/login)
    async refreshFromRemote() {
        try {
            if (window.remoteStore && window.remoteStore.isConfigured()) {
                const state = await window.remoteStore.getAdminState();
                if (state) {
                    // Ensure we have the correct secret key and challenge for consistency
                    if (state.secretKey && state.challenge) {
                        this.secretKey = state.secretKey;
                        this.challenge = state.challenge;
                    }
                    
                    localStorage.setItem(this.globalAdminKey, JSON.stringify(state));
                    sessionStorage.setItem(this.globalAdminKey, JSON.stringify(state));
                    
                    console.log('Auth system refreshed from remote with consistent keys');
                }
            }
        } catch (e) {
            console.warn('refreshFromRemote failed', e);
        }
    }

    // Persist to remote
    async persistToRemote(state) {
        try {
            if (window.remoteStore && window.remoteStore.isConfigured()) {
                // Ensure state has consistent secret key and challenge
                const stateToPersist = {
                    ...state,
                    secretKey: this.secretKey,
                    challenge: this.challenge,
                    updatedAt: Date.now(),
                    updatedBy: 'hidden_auth'
                };
                await window.remoteStore.setAdminState(stateToPersist);
                console.log('Auth state persisted to remote with consistent keys');
            }
        } catch (e) {
            console.warn('persistToRemote failed', e);
        }
    }
    
    // Force sync auth system from remote
    async forceSyncFromRemote() {
        try {
            if (window.remoteStore && window.remoteStore.isConfigured()) {
                const result = await window.remoteStore.forceSyncFromRemote();
                if (result.success) {
                    // Update current instance with synced data
                    const globalAdmin = this.getGlobalAdminData();
                    if (globalAdmin) {
                        this.secretKey = globalAdmin.secretKey || this.secretKey;
                        this.challenge = globalAdmin.challenge || this.challenge;
                    }
                    console.log('Auth system force synced from remote');
                    return { success: true, message: 'Đồng bộ auth system thành công' };
                }
                return result;
            }
            return { success: false, message: 'Remote store không được cấu hình' };
        } catch (error) {
            console.error('Force sync auth system failed:', error);
            return { success: false, message: 'Lỗi đồng bộ: ' + error.message };
        }
    }
}

// Tạo instance global
window.hiddenAuth = new HiddenAuth();
