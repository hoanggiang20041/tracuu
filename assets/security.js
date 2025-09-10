// Advanced Security System for Admin
class AdminSecurity {
    constructor() {
        this.storageKey = 'admin_security_data';
        this.sessionsKey = 'admin_sessions';
        this.devicesKey = 'admin_devices';
        this.remoteEnabled = true;
        this.init();
    }

    init() {
        this.loadSecurityData();
        this.trackCurrentSession();
        
        // Setup cross-tab sync for localhost testing
        this.setupCrossTabSync();

        // Try refresh from remote JSONBin (best-effort, async)
        this.refresh2FAFromRemote();
    }

    loadSecurityData() {
        let data = localStorage.getItem(this.storageKey);
        
        // If not in localStorage, try sessionStorage
        if (!data) {
            data = sessionStorage.getItem(this.storageKey);
        }
        
        if (data) {
            try {
                this.securityData = JSON.parse(data);
                console.log('Security data loaded successfully');
            } catch (error) {
                console.error('Failed to parse security data:', error);
                this.createDefaultSecurityData();
            }
        } else {
            this.createDefaultSecurityData();
        }
        
        // Sync with global 2FA status
        this.syncWithGlobal2FA();
    }
    
    // Sync local security data with global 2FA status
    syncWithGlobal2FA() {
        const global2FA = this.getGlobal2FAStatus();
        if (global2FA) {
            console.log('Syncing with global 2FA status:', global2FA);
            
            // Update local data with global 2FA status
            this.securityData.twoFactorEnabled = global2FA.enabled;
            this.securityData.twoFactorSecret = global2FA.secret;
            
            // Save the synced data (but don't call saveSecurityData to avoid infinite loop)
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.securityData));
                sessionStorage.setItem(this.storageKey, JSON.stringify(this.securityData));
                console.log('Local security data synced with global 2FA');
            } catch (error) {
                console.error('Failed to sync local security data:', error);
            }
        }
    }
    
    createDefaultSecurityData() {
        this.securityData = {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            passwordHistory: [],
            lastPasswordChange: null,
            maxSessions: 3,
            allowedIPs: [],
            securityQuestions: []
        };
        this.saveSecurityData();
    }

    saveSecurityData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.securityData));
            // Also save to sessionStorage as backup
            sessionStorage.setItem(this.storageKey, JSON.stringify(this.securityData));
            
            // Save 2FA status globally for all sessions
            this.saveGlobal2FAStatus();
            
            console.log('Security data saved successfully');
        } catch (error) {
            console.error('Failed to save security data:', error);
        }
    }
    
    // Save 2FA status globally so all sessions know about it
    saveGlobal2FAStatus() {
        try {
            const global2FA = {
                enabled: this.securityData.twoFactorEnabled,
                secret: this.securityData.twoFactorSecret,
                timestamp: Date.now()
            };
            
            // Save to localStorage with a global key
            localStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
            
            // Also save to sessionStorage for immediate access
            sessionStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
            
            console.log('Global 2FA status saved:', global2FA);
            
            // Also update global admin account
            this.updateGlobalAdminAccount();
            
            // Broadcast changes to other tabs
            this.broadcastDataChange();

            // Persist to remote (best-effort)
            this.persist2FAToRemote();
        } catch (error) {
            console.error('Failed to save global 2FA status:', error);
        }
    }
    
    // Update global admin account with current security data
    updateGlobalAdminAccount() {
        try {
            const globalAdminKey = 'global_admin_account';
            let globalAdmin = localStorage.getItem(globalAdminKey);
            
            if (globalAdmin) {
                const data = JSON.parse(globalAdmin);
                data.twoFactorEnabled = this.securityData.twoFactorEnabled;
                data.twoFactorSecret = this.securityData.twoFactorSecret;
                data.lastUpdated = Date.now();
                
                localStorage.setItem(globalAdminKey, JSON.stringify(data));
                sessionStorage.setItem(globalAdminKey, JSON.stringify(data));
                console.log('Global admin account updated');
            }
        } catch (error) {
            console.error('Failed to update global admin account:', error);
        }
    }

    async refresh2FAFromRemote() {
        try {
            if (this.remoteEnabled && window.remoteStore && window.remoteStore.isConfigured()) {
                const state = await window.remoteStore.getAdminState();
                if (state && (state.twoFactorEnabled !== undefined || state.twoFactorSecret)) {
                    this.securityData.twoFactorEnabled = !!state.twoFactorEnabled;
                    if (state.twoFactorSecret) {
                        this.securityData.twoFactorSecret = state.twoFactorSecret;
                    }
                    this.saveSecurityData();
                    console.log('2FA data refreshed from remote');
                }
            }
        } catch (e) {
            console.warn('refresh2FAFromRemote failed', e);
        }
    }

    async persist2FAToRemote() {
        try {
            if (this.remoteEnabled && window.remoteStore && window.remoteStore.isConfigured()) {
                // Merge with existing global admin data if any
                const baseRaw = localStorage.getItem('global_admin_account');
                const base = baseRaw ? JSON.parse(baseRaw) : {};
                const state = {
                    ...base,
                    twoFactorEnabled: this.securityData.twoFactorEnabled,
                    twoFactorSecret: this.securityData.twoFactorSecret,
                    updatedAt: Date.now(),
                    updatedBy: 'admin_security'
                };
                await window.remoteStore.setAdminState(state);
                console.log('2FA data persisted to remote');
            }
        } catch (e) {
            console.warn('persist2FAToRemote failed', e);
        }
    }
    
    // Force sync 2FA from remote
    async forceSync2FAFromRemote() {
        try {
            if (this.remoteEnabled && window.remoteStore && window.remoteStore.isConfigured()) {
                const result = await window.remoteStore.forceSyncFromRemote();
                if (result.success && result.data) {
                    // Update local security data with remote 2FA data
                    if (result.data.twoFactorEnabled !== undefined) {
                        this.securityData.twoFactorEnabled = result.data.twoFactorEnabled;
                    }
                    if (result.data.twoFactorSecret) {
                        this.securityData.twoFactorSecret = result.data.twoFactorSecret;
                    }
                    
                    // Save the updated data
                    this.saveSecurityData();
                    
                    console.log('2FA force synced from remote');
                    return { success: true, message: 'Đồng bộ 2FA thành công' };
                }
                return result;
            }
            return { success: false, message: 'Remote store không được cấu hình' };
        } catch (error) {
            console.error('Force sync 2FA failed:', error);
            return { success: false, message: 'Lỗi đồng bộ 2FA: ' + error.message };
        }
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
    
    // Force sync global 2FA status from current local data
    forceSyncGlobal2FA() {
        if (this.securityData.twoFactorEnabled && this.securityData.twoFactorSecret) {
            console.log('Force syncing global 2FA status from local data');
            this.saveGlobal2FAStatus();
            return true;
        }
        return false;
    }
    
    // Reset global admin account (for testing)
    resetGlobalAdminAccount() {
        try {
            localStorage.removeItem('global_admin_account');
            sessionStorage.removeItem('global_admin_account');
            localStorage.removeItem('global_admin_2fa');
            sessionStorage.removeItem('global_admin_2fa');
            console.log('Global admin account reset');
            return true;
        } catch (error) {
            console.error('Failed to reset global admin account:', error);
            return false;
        }
    }
    
    // Get global admin account info
    getGlobalAdminInfo() {
        try {
            const globalAdmin = localStorage.getItem('global_admin_account');
            if (globalAdmin) {
                return JSON.parse(globalAdmin);
            }
            return null;
        } catch (error) {
            console.error('Failed to get global admin info:', error);
            return null;
        }
    }
    
    // Setup cross-tab sync for localhost testing
    setupCrossTabSync() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'global_admin_2fa' || e.key === 'global_admin_account') {
                console.log('Storage changed in another tab:', e.key);
                this.syncWithGlobal2FA();
                this.loadSecurityData();
                
                // Trigger UI update if on security page
                if (typeof load2FAStatus === 'function') {
                    load2FAStatus();
                }
            }
        });
        
        // Also listen for custom events for same-tab sync
        window.addEventListener('adminDataChanged', () => {
            console.log('Admin data changed event received');
            this.syncWithGlobal2FA();
            this.loadSecurityData();
        });
    }
    
    // Broadcast data change to other tabs
    broadcastDataChange() {
        // Trigger storage event for other tabs
        const event = new StorageEvent('storage', {
            key: 'global_admin_2fa',
            newValue: localStorage.getItem('global_admin_2fa'),
            oldValue: localStorage.getItem('global_admin_2fa'),
            storageArea: localStorage
        });
        window.dispatchEvent(event);
        
        // Also dispatch custom event for same-tab listeners
        window.dispatchEvent(new CustomEvent('adminDataChanged'));
    }
    
    // Terminate all other sessions (force logout)
    terminateAllOtherSessions() {
        try {
            // Get current session ID
            const currentSessionId = this.getCurrentSessionId();
            
            // Get all active sessions
            const sessions = this.getActiveSessions();
            
            // Mark all other sessions as terminated
            const updatedSessions = sessions.map(session => {
                if (session.id !== currentSessionId) {
                    return {
                        ...session,
                        status: 'terminated',
                        terminatedAt: Date.now(),
                        terminatedBy: currentSessionId
                    };
                }
                return session;
            });
            
            // Save updated sessions
            localStorage.setItem(this.sessionsKey, JSON.stringify(updatedSessions));
            sessionStorage.setItem(this.sessionsKey, JSON.stringify(updatedSessions));
            
            // Broadcast session termination
            this.broadcastSessionTermination();
            
            console.log('All other sessions terminated');
            return { success: true, message: 'Đã kết thúc tất cả phiên đăng nhập khác' };
        } catch (error) {
            console.error('Failed to terminate sessions:', error);
            return { success: false, message: 'Lỗi khi kết thúc phiên đăng nhập: ' + error.message };
        }
    }
    
    // Broadcast session termination to all tabs
    broadcastSessionTermination() {
        // Trigger storage event for other tabs
        const event = new StorageEvent('storage', {
            key: this.sessionsKey,
            newValue: localStorage.getItem(this.sessionsKey),
            oldValue: localStorage.getItem(this.sessionsKey),
            storageArea: localStorage
        });
        window.dispatchEvent(event);
        
        // Also dispatch custom event
        window.dispatchEvent(new CustomEvent('sessionsTerminated'));
    }
    
    // Check if current session is terminated
    isSessionTerminated() {
        const currentSessionId = this.getCurrentSessionId();
        const sessions = this.getActiveSessions();
        const currentSession = sessions.find(s => s.id === currentSessionId);
        
        return currentSession && currentSession.status === 'terminated';
    }
    
    // Get current session ID
    getCurrentSessionId() {
        return this.currentSessionId || 'unknown';
    }

    generateTOTPSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    generateQRCodeData(secret, username = 'admin') {
        const issuer = 'Warranty System';
        const accountName = username;
        // Standard otpauth URL format for TOTP
        // Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
        return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    }

    enable2FA(verificationCode) {
        if (this.verifyTOTPCode(verificationCode, this.securityData.twoFactorSecret)) {
            this.securityData.twoFactorEnabled = true;
            this.saveSecurityData();
            
            // Persist to remote immediately
            this.persist2FAToRemote();
            
            return { success: true, message: '2FA đã được kích hoạt thành công!' };
        } else {
            return { success: false, message: 'Mã xác thực không đúng!' };
        }
    }

    disable2FA(verificationCode) {
        if (!this.securityData.twoFactorEnabled) {
            return { success: false, message: '2FA chưa được kích hoạt!' };
        }
        
        if (this.verifyTOTPCode(verificationCode, this.securityData.twoFactorSecret)) {
            this.securityData.twoFactorEnabled = false;
            // KHÔNG xóa secret key để có thể kích hoạt lại với cùng key
            this.saveSecurityData();
            
            // Persist to remote immediately
            this.persist2FAToRemote();
            
            return { success: true, message: '2FA đã được tắt thành công!' };
        } else {
            return { success: false, message: 'Mã xác thực không đúng!' };
        }
    }

    // Tạo secret key cố định (chỉ tạo 1 lần)
    getOrCreateSecretKey() {
        if (!this.securityData.twoFactorSecret) {
            this.securityData.twoFactorSecret = this.generateTOTPSecret();
            this.saveSecurityData();
            console.log('Created new 2FA secret key:', this.securityData.twoFactorSecret);
        }
        return this.securityData.twoFactorSecret;
    }

    verifyTOTPCode(code, secret) {
        if (!secret || !code) return false;
        
        console.log('Verifying TOTP code:', { code, secret: secret.substring(0, 8) + '...' });
        
        // Use TOTPAuth if available (preferred method)
        if (typeof TOTPAuth !== 'undefined') {
            try {
                const totp = TOTPAuth.fromBase32(secret, {
                    digits: 6,
                    algorithm: 'SHA1',
                    period: 30,
                    window: 2
                });
                
                const isValid = totp.verify(code);
                console.log('TOTPAuth verification result:', isValid);
                
                if (isValid) {
                    return true;
                }
                
                // If TOTPAuth fails, try with different time windows manually
                const currentTime = Math.floor(Date.now() / 1000);
                for (let offset = -60; offset <= 60; offset += 30) {
                    const testTime = currentTime + offset;
                    const testCode = totp.generate(testTime);
                    console.log(`Testing time offset ${offset}s: expected=${testCode}, input=${code}`);
                    if (testCode === code) {
                        console.log('Code verified with time offset:', offset);
                        return true;
                    }
                }
                
                return false;
            } catch (error) {
                console.error('TOTPAuth verify error:', error);
                return this.simpleVerifyTOTPCode(code, secret);
            }
        }
        
        // Fallback to otplib if available
        if (typeof otplib !== 'undefined' && otplib.authenticator) {
            try {
                otplib.authenticator.options = {
                    window: 2,
                    step: 30,
                    algorithm: 'sha1',
                    digits: 6
                };
                
                const isValid = otplib.authenticator.check(code, secret);
                console.log('otplib verification result:', isValid);
                return isValid;
            } catch (error) {
                console.error('otplib verify error:', error);
            }
        }
        
        return this.simpleVerifyTOTPCode(code, secret);
    }
    
    simpleVerifyTOTPCode(code, secret) {
        const currentTime = Math.floor(Date.now() / 1000 / 30);
        
        // Check current, previous, and next time windows for clock skew
        for (let i = -1; i <= 1; i++) {
            const timeWindow = currentTime + i;
            const expectedCode = this.simpleTOTPCode(secret, timeWindow);
            if (code === expectedCode) {
                return true;
            }
        }
        
        return false;
    }

    generateTOTPCode(secret, time) {
        // Use TOTPAuth if available (preferred method)
        if (typeof TOTPAuth !== 'undefined') {
            try {
                const totp = TOTPAuth.fromBase32(secret, {
                    digits: 6,
                    algorithm: 'SHA1',
                    period: 30
                });
                
                const code = totp.generate(time);
                console.log('Generated TOTP code:', { code, secret: secret.substring(0, 8) + '...', time });
                return code;
            } catch (error) {
                console.error('TOTPAuth generate error:', error);
                return this.simpleTOTPCode(secret, time);
            }
        }
        
        // Fallback to otplib if available
        if (typeof otplib !== 'undefined' && otplib.authenticator) {
            try {
                otplib.authenticator.options = {
                    step: 30,
                    algorithm: 'sha1',
                    digits: 6
                };
                
                const code = otplib.authenticator.generate(secret, time);
                console.log('Generated TOTP code (otplib):', { code, secret: secret.substring(0, 8) + '...', time });
                return code;
            } catch (error) {
                console.error('otplib generate error:', error);
            }
        }
        
        return this.simpleTOTPCode(secret, time);
    }
    
    simpleTOTPCode(secret, time) {
        // Fallback simple TOTP implementation
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let binary = '';
        
        for (let i = 0; i < secret.length; i++) {
            const char = secret[i];
            const index = base32Chars.indexOf(char);
            if (index !== -1) {
                binary += index.toString(2).padStart(5, '0');
            }
        }
        
        // Convert binary to bytes
        const bytes = [];
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.substring(i, i + 8);
            if (byte.length === 8) {
                bytes.push(parseInt(byte, 2));
            }
        }
        
        // Simple hash with time
        let hash = 0;
        for (let i = 0; i < bytes.length; i++) {
            hash = ((hash << 5) - hash + bytes[i]) & 0xffffffff;
        }
        hash = ((hash << 5) - hash + time) & 0xffffffff;
        
        // Extract 6-digit code
        const code = Math.abs(hash) % 1000000;
        return code.toString().padStart(6, '0');
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    changePassword(oldPassword, newPassword, confirmPassword) {
        if (!this.verifyPassword(oldPassword)) {
            return { success: false, message: 'Mật khẩu cũ không đúng!' };
        }

        if (newPassword !== confirmPassword) {
            return { success: false, message: 'Mật khẩu mới không khớp!' };
        }

        if (newPassword.length < 8) {
            return { success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự!' };
        }

        const newPasswordHash = this.hashPassword(newPassword);
        if (this.securityData.passwordHistory.includes(newPasswordHash)) {
            return { success: false, message: 'Mật khẩu này đã được sử dụng trước đây!' };
        }

        const oldPasswordHash = this.hashPassword(oldPassword);
        this.securityData.passwordHistory.unshift(oldPasswordHash);
        
        if (this.securityData.passwordHistory.length > 5) {
            this.securityData.passwordHistory = this.securityData.passwordHistory.slice(0, 5);
        }

        this.securityData.lastPasswordChange = Date.now();
        this.saveSecurityData();
        this.updateMainPassword(newPassword);

        return { success: true, message: 'Mật khẩu đã được thay đổi thành công!' };
    }

    updateMainPassword(newPassword) {
        const newHash = this.hashPassword(newPassword);
        localStorage.setItem('admin_password_hash', newHash);
    }

    hashPassword(password) {
        return this.simpleHash(password + 'admin_salt_2024');
    }

    verifyPassword(password) {
        // Check both new hash system and old auth system
        const storedHash = localStorage.getItem('admin_password_hash');
        const inputHash = this.hashPassword(password);
        
        console.log('Verifying password:', { storedHash, inputHash, password });
        
        if (storedHash && storedHash === inputHash) {
            console.log('Password verified via hash system');
            return true;
        }
        
        // Fallback to old auth system
        if (window.hiddenAuth) {
            const result = window.hiddenAuth.verify(password);
            console.log('Password verified via old auth system:', result.success);
            return result.success;
        }
        
        console.log('Password verification failed');
        return false;
    }

    trackCurrentSession() {
        // Check if we already have an active session for this device
        const currentIP = this.getClientIP();
        const currentUA = navigator.userAgent;
        const sessions = this.getSessions();
        
        // Find existing active session for this device
        const existingSession = Object.values(sessions).find(session => 
            session.ip === currentIP && 
            session.userAgent === currentUA && 
            session.isActive &&
            (Date.now() - session.lastActivity) < 30 * 60 * 1000 // 30 minutes
        );
        
        if (existingSession) {
            // Update existing session
            existingSession.lastActivity = Date.now();
            this.saveSession(existingSession);
            return existingSession.id;
        }
        
        // Create new session
        const sessionId = this.generateSessionId();
        const sessionData = {
            id: sessionId,
            ip: currentIP,
            userAgent: currentUA,
            loginTime: Date.now(),
            lastActivity: Date.now(),
            isActive: true
        };

        this.saveSession(sessionData);
        return sessionId;
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getClientIP() {
        return '192.168.1.100'; // Placeholder IP
    }

    saveSession(sessionData) {
        const sessions = this.getSessions();
        sessions[sessionData.id] = sessionData;
        localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
    }

    getSessions() {
        const data = localStorage.getItem(this.sessionsKey);
        return data ? JSON.parse(data) : {};
    }

    getActiveSessions() {
        const sessions = this.getSessions();
        return Object.values(sessions).filter(session => session.isActive);
    }

    killSession(sessionId) {
        const sessions = this.getSessions();
        if (sessions[sessionId]) {
            sessions[sessionId].isActive = false;
            sessions[sessionId].killedAt = Date.now();
            localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
            return { success: true, message: 'Phiên đã được kết thúc!' };
        }
        return { success: false, message: 'Không tìm thấy phiên!' };
    }

    killAllOtherSessions(currentSessionId) {
        const sessions = this.getSessions();
        let killedCount = 0;

        Object.keys(sessions).forEach(sessionId => {
            if (sessionId !== currentSessionId && sessions[sessionId].isActive) {
                sessions[sessionId].isActive = false;
                sessions[sessionId].killedAt = Date.now();
                killedCount++;
            }
        });

        localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
        return { success: true, message: `Đã kết thúc ${killedCount} phiên khác!` };
    }

    addTrustedDevice(deviceName) {
        const deviceId = this.generateDeviceId();
        const deviceData = {
            id: deviceId,
            name: deviceName,
            ip: this.getClientIP(),
            userAgent: navigator.userAgent,
            addedAt: Date.now(),
            isTrusted: true
        };

        const devices = this.getTrustedDevices();
        devices[deviceId] = deviceData;
        localStorage.setItem(this.devicesKey, JSON.stringify(devices));

        return { success: true, message: 'Thiết bị đã được thêm vào danh sách tin cậy!' };
    }

    generateDeviceId() {
        return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTrustedDevices() {
        const data = localStorage.getItem(this.devicesKey);
        return data ? JSON.parse(data) : {};
    }

    removeTrustedDevice(deviceId) {
        const devices = this.getTrustedDevices();
        if (devices[deviceId]) {
            delete devices[deviceId];
            localStorage.setItem(this.devicesKey, JSON.stringify(devices));
            return { success: true, message: 'Thiết bị đã được xóa khỏi danh sách tin cậy!' };
        }
        return { success: false, message: 'Không tìm thấy thiết bị!' };
    }

    isCurrentDeviceTrusted() {
        const devices = this.getTrustedDevices();
        const currentIP = this.getClientIP();
        const currentUA = navigator.userAgent;

        return Object.values(devices).some(device => 
            device.ip === currentIP && device.userAgent === currentUA && device.isTrusted
        );
    }

    getSecurityStatus() {
        return {
            twoFactorEnabled: this.securityData.twoFactorEnabled,
            activeSessions: this.getActiveSessions().length,
            trustedDevices: Object.keys(this.getTrustedDevices()).length,
            lastPasswordChange: this.securityData.lastPasswordChange,
            isCurrentDeviceTrusted: this.isCurrentDeviceTrusted()
        };
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString('vi-VN');
    }

    formatDuration(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} ngày trước`;
        if (hours > 0) return `${hours} giờ trước`;
        if (minutes > 0) return `${minutes} phút trước`;
        return 'Vừa xong';
    }
}

// Initialize security system
window.adminSecurity = new AdminSecurity();
window.AdminSecurity = AdminSecurity;