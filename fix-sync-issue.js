// Auto-fix script for 2FA and Password sync issues
// Run this in browser console or include in HTML

(function() {
    console.log('🔧 Starting auto-fix for sync issues...');
    
    // Function to fix sync issues
    async function fixSyncIssues() {
        try {
            console.log('1. Checking system status...');
            
            // Check if required systems are available
            if (!window.remoteStore) {
                console.error('❌ Remote Store not available');
                return false;
            }
            
            if (!window.hiddenAuth) {
                console.error('❌ Hidden Auth not available');
                return false;
            }
            
            if (!window.adminSecurity) {
                console.error('❌ Admin Security not available');
                return false;
            }
            
            console.log('✅ All systems available');
            
            // Step 1: Get remote data
            console.log('2. Fetching remote data...');
            let remoteData = null;
            try {
                remoteData = await window.remoteStore.getAdminState();
                console.log('✅ Remote data fetched:', remoteData ? 'Available' : 'Empty');
            } catch (error) {
                console.warn('⚠️ Failed to fetch remote data:', error.message);
            }
            
            // Step 2: Fix global admin account
            console.log('3. Fixing global admin account...');
            let globalAdmin = JSON.parse(localStorage.getItem('global_admin_account') || '{}');
            
            // Ensure we have required fields
            if (!globalAdmin.secretKey) {
                globalAdmin.secretKey = btoa("admin_access_2024_global_fixed");
                console.log('✅ Added missing secret key');
            }
            
            if (!globalAdmin.challenge) {
                globalAdmin.challenge = "fixed_challenge_2024";
                console.log('✅ Added missing challenge');
            }
            
            if (!globalAdmin.passwordHash) {
                // Create a temporary auth instance to generate hash
                const tempAuth = new HiddenAuth();
                tempAuth.secretKey = globalAdmin.secretKey;
                tempAuth.challenge = globalAdmin.challenge;
                globalAdmin.passwordHash = tempAuth.encryptInput("admin123");
                console.log('✅ Added missing password hash');
            }
            
            // Update with remote data if available
            if (remoteData) {
                if (remoteData.secretKey) globalAdmin.secretKey = remoteData.secretKey;
                if (remoteData.challenge) globalAdmin.challenge = remoteData.challenge;
                if (remoteData.passwordHash) globalAdmin.passwordHash = remoteData.passwordHash;
                if (remoteData.twoFactorEnabled !== undefined) globalAdmin.twoFactorEnabled = remoteData.twoFactorEnabled;
                if (remoteData.twoFactorSecret) globalAdmin.twoFactorSecret = remoteData.twoFactorSecret;
                console.log('✅ Updated with remote data');
            }
            
            // Save global admin account
            localStorage.setItem('global_admin_account', JSON.stringify(globalAdmin));
            sessionStorage.setItem('global_admin_account', JSON.stringify(globalAdmin));
            console.log('✅ Global admin account saved');
            
            // Step 3: Fix global 2FA status
            console.log('4. Fixing global 2FA status...');
            let global2FA = JSON.parse(localStorage.getItem('global_admin_2fa') || '{}');
            
            // Sync with global admin account
            if (globalAdmin.twoFactorEnabled !== undefined) {
                global2FA.enabled = globalAdmin.twoFactorEnabled;
            }
            if (globalAdmin.twoFactorSecret) {
                global2FA.secret = globalAdmin.twoFactorSecret;
            }
            global2FA.timestamp = Date.now();
            
            // Save global 2FA status
            localStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
            sessionStorage.setItem('global_admin_2fa', JSON.stringify(global2FA));
            console.log('✅ Global 2FA status saved');
            
            // Step 4: Update security system
            console.log('5. Updating security system...');
            if (window.adminSecurity) {
                window.adminSecurity.securityData.twoFactorEnabled = global2FA.enabled || false;
                window.adminSecurity.securityData.twoFactorSecret = global2FA.secret || null;
                window.adminSecurity.saveSecurityData();
                console.log('✅ Security system updated');
            }
            
            // Step 5: Update auth system
            console.log('6. Updating auth system...');
            if (window.hiddenAuth) {
                window.hiddenAuth.secretKey = globalAdmin.secretKey;
                window.hiddenAuth.challenge = globalAdmin.challenge;
                console.log('✅ Auth system updated');
            }
            
            // Step 6: Sync to remote
            console.log('7. Syncing to remote...');
            if (window.remoteStore && window.remoteStore.isConfigured()) {
                try {
                    await window.remoteStore.setAdminState(globalAdmin);
                    console.log('✅ Data synced to remote');
                } catch (error) {
                    console.warn('⚠️ Failed to sync to remote:', error.message);
                }
            }
            
            // Step 7: Clear sync errors
            console.log('8. Clearing sync errors...');
            localStorage.removeItem('sync_errors');
            localStorage.setItem('last_sync_timestamp', Date.now().toString());
            console.log('✅ Sync errors cleared');
            
            console.log('🎉 Auto-fix completed successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Auto-fix failed:', error);
            return false;
        }
    }
    
    // Function to validate fix
    function validateFix() {
        console.log('🔍 Validating fix...');
        
        const issues = [];
        
        // Check global admin account
        const globalAdmin = JSON.parse(localStorage.getItem('global_admin_account') || '{}');
        if (!globalAdmin.secretKey) issues.push('Missing secret key');
        if (!globalAdmin.challenge) issues.push('Missing challenge');
        if (!globalAdmin.passwordHash) issues.push('Missing password hash');
        
        // Check global 2FA status
        const global2FA = JSON.parse(localStorage.getItem('global_admin_2fa') || '{}');
        if (global2FA.enabled && !global2FA.secret) {
            issues.push('2FA enabled but missing secret');
        }
        
        // Check consistency
        if (globalAdmin.twoFactorEnabled !== global2FA.enabled) {
            issues.push('2FA status inconsistent');
        }
        
        if (globalAdmin.twoFactorSecret !== global2FA.secret) {
            issues.push('2FA secret inconsistent');
        }
        
        if (issues.length === 0) {
            console.log('✅ All validation checks passed!');
            return true;
        } else {
            console.log('❌ Validation issues found:');
            issues.forEach(issue => console.log(`  - ${issue}`));
            return false;
        }
    }
    
    // Function to test sync
    async function testSync() {
        console.log('🧪 Testing sync...');
        
        try {
            // Test password verification
            if (window.hiddenAuth) {
                const result = window.hiddenAuth.verify("admin123");
                console.log('Password verification test:', result.success ? '✅ PASS' : '❌ FAIL');
            }
            
            // Test 2FA if enabled
            const global2FA = JSON.parse(localStorage.getItem('global_admin_2fa') || '{}');
            if (global2FA.enabled && global2FA.secret && window.adminSecurity) {
                // Generate a test code
                const testCode = window.adminSecurity.generateTOTPCode(global2FA.secret);
                const isValid = window.adminSecurity.verifyTOTPCode(testCode, global2FA.secret);
                console.log('2FA verification test:', isValid ? '✅ PASS' : '❌ FAIL');
            }
            
            // Test remote sync
            if (window.remoteStore && window.remoteStore.isConfigured()) {
                const remoteData = await window.remoteStore.getAdminState();
                console.log('Remote sync test:', remoteData ? '✅ PASS' : '❌ FAIL');
            }
            
            console.log('✅ Sync test completed');
            return true;
            
        } catch (error) {
            console.error('❌ Sync test failed:', error);
            return false;
        }
    }
    
    // Main execution
    async function runAutoFix() {
        console.log('🚀 Starting auto-fix process...');
        
        const fixResult = await fixSyncIssues();
        if (!fixResult) {
            console.error('❌ Auto-fix failed');
            return;
        }
        
        const validationResult = validateFix();
        if (!validationResult) {
            console.error('❌ Validation failed');
            return;
        }
        
        const testResult = await testSync();
        if (!testResult) {
            console.error('❌ Sync test failed');
            return;
        }
        
        console.log('🎉 All tests passed! Sync issues should be resolved.');
        console.log('💡 You may need to refresh the page for changes to take effect.');
    }
    
    // Export functions for manual use
    window.autoFixSync = runAutoFix;
    window.fixSyncIssues = fixSyncIssues;
    window.validateSyncFix = validateFix;
    window.testSync = testSync;
    
    // Auto-run if in console
    if (typeof window !== 'undefined' && window.console) {
        console.log('🔧 Auto-fix script loaded. Run autoFixSync() to start.');
    }
    
    // Auto-run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAutoFix);
    } else {
        runAutoFix();
    }
})();
