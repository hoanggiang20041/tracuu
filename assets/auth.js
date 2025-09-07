// Hệ thống xác thực đơn giản và tương thích
class HiddenAuth {
    constructor() {
        this.globalAdminKey = 'global_admin_account';
        this.secretKey = this.getOrCreateGlobalSecretKey();
        this.challenge = this.generateChallenge();
        this.remoteEnabled = true;
    }
    
    // Tạo hoặc lấy global secret key (cố định cho tất cả sessions)
    getOrCreateGlobalSecretKey() {
        try {
            // Try to get existing global secret key
            let globalAdmin = localStorage.getItem(this.globalAdminKey);
            if (globalAdmin) {
                const data = JSON.parse(globalAdmin);
                if (data.secretKey) {
                    console.log('Using existing global secret key');
                    return data.secretKey;
                }
            }
            
            // Create new global secret key
            const base = "admin_access_2024_global";
            const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Thay đổi mỗi ngày
            const secretKey = btoa(base + timestamp);
            
            // Ensure instance uses the new secret and a stable challenge before hashing
            this.secretKey = secretKey;
            if (!this.challenge) {
                this.challenge = this.generateChallenge();
            }
            // Save global admin data (hash computed with the instance's secret/challenge)
            const globalAdminData = {
                secretKey: this.secretKey,
                challenge: this.challenge,
                createdAt: Date.now(),
                passwordHash: this.encryptInput("admin123") // Default password hash
            };
            
            localStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            sessionStorage.setItem(this.globalAdminKey, JSON.stringify(globalAdminData));
            
            console.log('Created new global secret key');
            return secretKey;
        } catch (error) {
            console.error('Failed to get/create global secret key:', error);
            // Fallback to old method
            const base = "admin_access_2024";
            const timestamp = Math.floor(Date.now() / (1000 * 60 * 60));
            return btoa(base + timestamp);
        }
    }
    
    // Tạo challenge ngẫu nhiên
    generateChallenge() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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
        
        // Create temporary auth instance with stored values
        const tempAuth = new HiddenAuth();
        tempAuth.secretKey = storedSecretKey;
        tempAuth.challenge = storedChallenge;
        
        // Verify password using consistent hash
        const inputHash = tempAuth.encryptInput(input);
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
    
    // Reset and recreate global admin account with correct hash
    resetGlobalAdminAccount() {
        try {
            // Clear existing data
            localStorage.removeItem(this.globalAdminKey);
            sessionStorage.removeItem(this.globalAdminKey);
            
            // Create new secret/challenge and set on instance BEFORE hashing
            const secretKey = this.getOrCreateGlobalSecretKey();
            const challenge = this.generateChallenge();
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
            // Persist to remote (best-effort)
            this.persistToRemote(globalAdminData);
            
            // Update current instance
            this.secretKey = secretKey;
            this.challenge = challenge;
            
            console.log('Global admin account reset with correct hash');
            return { success: true, message: 'Global admin account đã được reset với hash đúng' };
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
                    localStorage.setItem(this.globalAdminKey, JSON.stringify(state));
                    sessionStorage.setItem(this.globalAdminKey, JSON.stringify(state));
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
                state.updatedAt = Date.now();
                await window.remoteStore.setAdminState(state);
            }
        } catch (e) {
            console.warn('persistToRemote failed', e);
        }
    }
}

// Tạo instance global
window.hiddenAuth = new HiddenAuth();
