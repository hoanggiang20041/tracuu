// Google Sign-In for Admin với xác thực 6 số qua email
(function(){
	'use strict';

	const GOOGLE_CLIENT_ID = window.APP_CONFIG?.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID || '';
	const ADMIN_GOOGLE_EMAIL = window.APP_CONFIG?.ADMIN_GOOGLE_EMAIL || window.ADMIN_GOOGLE_EMAIL || '';
	const GAS_API_URL = window.APP_CONFIG?.GAS_API_URL || '';

	let currentEmail = '';
	let verificationStep = 0; // 0: chưa đăng nhập, 1: đã đăng nhập Google, 2: đã xác thực 6 số

	function decodeJwt(token){
		try{
			const payload = token.split('.')[1];
			const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
			return JSON.parse(decodeURIComponent(escape(json)));
		}catch(_){ return null; }
	}

	function setAdminSession(email){
		localStorage.setItem('admin_logged_in', 'true');
		localStorage.setItem('admin_login_time', Date.now().toString());
		localStorage.setItem('admin_email', email);
		verificationStep = 2;
	}

	function checkAdminAccess(){
		const isLoggedIn = localStorage.getItem('admin_logged_in');
		const loginTime = localStorage.getItem('admin_login_time');
		const adminEmail = localStorage.getItem('admin_email');
		
		if (!isLoggedIn || isLoggedIn !== 'true') return false;
		
		const now = Date.now();
		const loginTimestamp = parseInt(loginTime);
		const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
		
		if (now - loginTimestamp > sessionTimeout) {
			localStorage.removeItem('admin_logged_in');
			localStorage.removeItem('admin_login_time');
			localStorage.removeItem('admin_email');
			return false;
		}
		
		return adminEmail === ADMIN_GOOGLE_EMAIL;
	}

	function showError(message){
		const errorDiv = document.getElementById('error-message');
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.style.display = 'block';
		}
	}

	function hideError(){
		const errorDiv = document.getElementById('error-message');
		if (errorDiv) {
			errorDiv.style.display = 'none';
		}
	}

	function showVerificationForm() {
		const container = document.getElementById('google-signin-btn');
		if (!container) return;

		container.innerHTML = `
			<div style="text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb;">
				<div style="margin-bottom: 15px;">
					<i class="fas fa-envelope" style="font-size: 2rem; color: #3b82f6; margin-bottom: 10px;"></i>
					<h3 style="margin: 0; color: #374151;">Xác thực bảo mật</h3>
					<p style="margin: 5px 0; color: #6b7280; font-size: 0.9rem;">
						Mã xác thực 6 số đã được gửi đến<br>
						<strong>${currentEmail}</strong>
					</p>
				</div>
				<div style="margin-bottom: 15px;">
					<input 
						type="text" 
						id="verification-code" 
						placeholder="Nhập mã 6 số" 
						maxlength="6"
						pattern="[0-9]{6}"
						style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; text-align: center; font-size: 1.2rem; letter-spacing: 2px;"
					/>
				</div>
				<div style="display: flex; gap: 10px; justify-content: center;">
					<button onclick="verifyCode()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
						<i class="fas fa-check"></i> Xác thực
					</button>
					<button onclick="resendCode()" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
						<i class="fas fa-redo"></i> Gửi lại
					</button>
					<button onclick="cancelVerification()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
						<i class="fas fa-times"></i> Hủy
					</button>
				</div>
				<div style="margin-top: 10px; font-size: 0.8rem; color: #6b7280;">
					<i class="fas fa-info-circle"></i> Mã có hiệu lực trong 10 phút
				</div>
			</div>
		`;

		// Focus vào input
		setTimeout(() => {
			const input = document.getElementById('verification-code');
			if (input) input.focus();
		}, 100);
	}

	async function sendVerificationCode(email) {
		try {
			const response = await fetch(GAS_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'send_verification_code',
					email: email
				})
			});

			const result = await response.json();
			
			if (result.success) {
				showVerificationForm();
				hideError();
			} else {
				showError(result.error || 'Không thể gửi mã xác thực');
			}
		} catch (error) {
			console.error('Error sending verification code:', error);
			showError('Lỗi kết nối. Vui lòng thử lại sau.');
		}
	}

	async function verifyCode() {
		const code = document.getElementById('verification-code').value;
		
		if (!code || code.length !== 6) {
			showError('Vui lòng nhập đúng mã 6 số');
			return;
		}

		try {
			const response = await fetch(GAS_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'verify_code',
					email: currentEmail,
					code: code
				})
			});

			const result = await response.json();
			
			if (result.success) {
				// Xác thực thành công
				setAdminSession(currentEmail);
				window.location.href = 'admin.html';
			} else {
				showError(result.error || 'Mã xác thực không đúng');
			}
		} catch (error) {
			console.error('Error verifying code:', error);
			showError('Lỗi xác thực. Vui lòng thử lại sau.');
		}
	}

	async function resendCode() {
		await sendVerificationCode(currentEmail);
	}

	function cancelVerification() {
		verificationStep = 0;
		currentEmail = '';
		initializeGoogleSignIn();
	}

	// Initialize Google Sign-In
	function initializeGoogleSignIn() {
		if (typeof google === 'undefined' || !google.accounts) {
			console.error('Google Sign-In library not loaded');
			return;
		}

		google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: handleCredentialResponse,
			auto_select: false
		});

		// Render the button
		const buttonDiv = document.getElementById('google-signin-btn');
		if (buttonDiv) {
			buttonDiv.innerHTML = '';
			google.accounts.id.renderButton(buttonDiv, {
				theme: 'outline',
				size: 'large',
				type: 'standard',
				text: 'signin_with',
				shape: 'rectangular'
			});
		}
	}

	// Handle the credential response
	async function handleCredentialResponse(response) {
		try {
			const credential = response.credential;
			const payload = decodeJwt(credential);
			
			if (!payload) {
				showError('Không thể xác thực thông tin đăng nhập');
				return;
			}

			const email = payload.email;
			
			// Check if email is allowed
			if (email !== ADMIN_GOOGLE_EMAIL) {
				showError('Email này không được phép đăng nhập admin');
				return;
			}

			// Lưu email và gửi mã xác thực
			currentEmail = email;
			verificationStep = 1;
			
			await sendVerificationCode(email);
			
		} catch (error) {
			console.error('Google Sign-In error:', error);
			showError('Lỗi đăng nhập: ' + error.message);
		}
	}

	// Make functions global
	window.verifyCode = verifyCode;
	window.resendCode = resendCode;
	window.cancelVerification = cancelVerification;

	// Initialize when DOM is ready
	document.addEventListener('DOMContentLoaded', function() {
		console.log('🔧 Debug info:');
		console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
		console.log('ADMIN_GOOGLE_EMAIL:', ADMIN_GOOGLE_EMAIL);
		console.log('GAS_API_URL:', GAS_API_URL);
		
		if (GOOGLE_CLIENT_ID && ADMIN_GOOGLE_EMAIL) {
			initializeGoogleSignIn();
		} else {
			console.error('❌ Google Sign-In not configured. Please set GOOGLE_CLIENT_ID and ADMIN_GOOGLE_EMAIL');
		}
	});

	// Export functions for use in other scripts
	window.googleAuth = {
		checkAdminAccess: checkAdminAccess,
		setAdminSession: setAdminSession
	};

})();