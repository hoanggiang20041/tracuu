// Production Guard - CHỈ tắt console logs, KHÔNG chặn developer tools
(function() {
	'use strict';
	
	// Disable console logs only (for production)
	if (typeof console !== 'undefined') {
		console.log = console.warn = console.error = console.info = console.debug = function() {};
	}
	
	// Clear console periodically
	setInterval(function() {
		if (typeof console !== 'undefined' && console.clear) {
			console.clear();
		}
	}, 1000);
	
	// REMOVED: Developer tools detection - không chặn dev tools nữa
	
})();

// Cấu hình API endpoint (sử dụng proxy để ẩn thông tin nhạy cảm)
const API_URL = "/api/warranty-data";

// DOM Elements
const loadingOverlay = document.getElementById("loading-overlay");
const imageModal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const downloadBtn = document.getElementById("download-btn");
const closeModal = document.querySelector(".close-modal");
const renewModal = document.getElementById('renew-modal');

// Hiển thị loading
function showLoading() {
	loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
	loadingOverlay.classList.add("hidden");
}

// Modal xem ảnh
function showImageModal(imageSrc, customerName, customerId, endDate) {
	modalImage.src = imageSrc;
	imageModal.classList.remove("hidden");
	setTimeout(() => imageModal.classList.add("show"), 10);
	
	// Cập nhật nút download với tên file
	downloadBtn.onclick = () => downloadImage(imageSrc, customerName, customerId, endDate);
}

function hideImageModal() {
	imageModal.classList.remove("show");
	setTimeout(() => imageModal.classList.add("hidden"), 300);
}

// Gia hạn modal
function showRenewModal(customer){
	const el = document.getElementById('renew-customer');
	if (el) el.textContent = `${customer.name} (${customer.id})`;
	document.getElementById('renew-days').value = 30;
	document.getElementById('renew-discount').value = '';
	window.__currentRenewCustomer = customer;
	updateRenewAmount();
	if (renewModal){
		renewModal.classList.remove('hidden');
		setTimeout(()=>renewModal.classList.add('show'), 10);
	}
}
function hideRenewModal(){ if (!renewModal) return; renewModal.classList.remove('show'); setTimeout(()=>renewModal.classList.add('hidden'), 300); }

function getAdminExtrasSync(){
	try {
		const cached = localStorage.getItem('admin_extras');
		return cached ? JSON.parse(cached) : { pricing:{pricePerWeek:200000, pricePerDay:Math.round(200000/7)}, discounts:[] };
	} catch(_) { return { pricing:{pricePerWeek:200000, pricePerDay:Math.round(200000/7)}, discounts:[] }; }
}

function updateRenewAmount(){
	const extras = getAdminExtrasSync();
	const days = Math.max(1, parseInt(document.getElementById('renew-days').value||'30',10));
	const unit = extras.pricing?.pricePerDay || Math.round((extras.pricing?.pricePerWeek||200000)/7);
	let amount = days * unit;
	const code = (document.getElementById('renew-discount').value||'').trim().toUpperCase();
	let applied = '';
	if (code && days>= 31){
		const found = (extras.discounts||[]).find(d=>d.code===code && (!d.expire || new Date(d.expire)>=new Date()));
		if (found && days >= (found.minDays||31)){
			amount = Math.round(amount * (100 - found.percent)/100);
			applied = `Đã áp dụng mã ${found.code} (-${found.percent}%)`;
		}
	}
	document.getElementById('renew-amount').textContent = amount.toLocaleString('vi-VN') + ' đ';
	const c = window.__currentRenewCustomer || { id:'', name:'' };
	const content = `${c.id}_${(c.name||'').toUpperCase().replace(/\s+/g,' ') }_${days}`;
	document.getElementById('renew-content').textContent = 'Nội dung chuyển khoản: ' + content;
	document.getElementById('discount-note').textContent = applied;
	// VietQR image
	const bank = 'MB';
	const acct = '68610042009';
	const name = 'NGUYEN HOANG GIANG';
	const qr = `https://img.vietqr.io/image/${bank}-${acct}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(name)}`;
	document.getElementById('renew-qr').src = qr;
}

function applyRenewDiscount(){ updateRenewAmount(); }
function copyRenewContent(){
	const txt = document.getElementById('renew-content').textContent.replace('Nội dung chuyển khoản: ','');
	navigator.clipboard.writeText(txt).then(()=>{ alert('Đã sao chép nội dung!'); });
}

async function submitRenewRequest(){
	try {
		const c = window.__currentRenewCustomer; if (!c) return;
		const days = Math.max(1, parseInt(document.getElementById('renew-days').value||'30',10));
		const amountText = document.getElementById('renew-amount').textContent||'0';
		const amount = parseInt(amountText.replace(/\D/g,''),10)||0;
		const content = document.getElementById('renew-content').textContent.replace('Nội dung chuyển khoản: ','');
		const file = document.getElementById('renew-bill').files[0];
		let billUrl = '';
		if (file) {
			billUrl = await (async ()=>{
				const form = new FormData(); form.append('image', file);
				const r = await fetch('https://api.imgbb.com/1/upload?key=d46a4b1117287a127e5ae5e55e193046',{method:'POST', body:form});
				const j = await r.json(); if (j.success) return j.data.url; return '';
			})();
		}
		// push to admin-state
		const state = await (window.remoteStore && window.remoteStore.getAdminState ? window.remoteStore.getAdminState() : Promise.resolve({})) || {};
		const renewals = Array.isArray(state.renewals)? state.renewals : [];
		renewals.push({ id:c.id, name:c.name, days, amount, content, billUrl, status:'pending', createdAt:Date.now() });
		state.renewals = renewals;
		await window.remoteStore.setAdminState(state);
		alert('Đã gửi yêu cầu gia hạn. Vui lòng chờ admin duyệt.');
		hideRenewModal();
	} catch(e){ alert('Lỗi gửi yêu cầu: '+e.message); }
}

// Tải ảnh về
async function downloadImage(imageSrc, customerName, customerId, endDate) {
	const safe = (s)=> (s||'').toString().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'');
	const fileName = `${safe(customerName)}_${safe(customerId)}_${safe(endDate||'')}.jpg`;

	try {
		const resp = await fetch(imageSrc, { mode: 'cors' });
		const blob = await resp.blob();
		const url = URL.createObjectURL(blob);

		if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type||'image/jpeg' })] })) {
			const file = new File([blob], fileName, { type: blob.type||'image/jpeg' });
			await navigator.share({ files: [file], title: 'Phiếu bảo hành', text: fileName });
			URL.revokeObjectURL(url);
			return;
		}

		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(()=>URL.revokeObjectURL(url), 1000);
	} catch (e) {
		window.open(imageSrc, '_blank');
	}
}

// Đóng modal khi click bên ngoài hoặc nút close
closeModal.onclick = hideImageModal;
imageModal.onclick = (e) => {
	if (e.target === imageModal) hideImageModal();
};

// Dữ liệu fallback local
const FALLBACK_DATA = [
  {
    "id": "KH001",
    "name": "Nguyễn Văn An",
    "title": "Bảo hành điện thoại iPhone 14",
    "image": "https://via.placeholder.com/400x200?text=iPhone+14+Warranty",
    "start": "2024-01-15",
    "end": "2025-01-15"
  },
  {
    "id": "KH002", 
    "name": "Trần Thị Bình",
    "title": "Bảo hành laptop Dell XPS",
    "image": "https://via.placeholder.com/400x200?text=Dell+XPS+Warranty",
    "start": "2024-02-01",
    "end": "2025-02-01"
  },
  {
    "id": "KH003",
    "name": "Lê Văn Cường", 
    "title": "Bảo hành máy tính bảng iPad",
    "image": "https://via.placeholder.com/400x200?text=iPad+Warranty",
    "start": "2024-03-10",
    "end": "2025-03-10"
  },
  {
    "id": "KH001",
    "name": "Nguyễn Văn An",
    "title": "Bảo hành tai nghe AirPods",
    "image": "https://via.placeholder.com/400x200?text=AirPods+Warranty", 
    "start": "2024-01-20",
    "end": "2025-01-20"
  }
];

// Tải dữ liệu từ API proxy với fallback
async function loadData() {
	try {
		const res = await fetch(API_URL, { 
			cache: "no-store",
			headers: {
				"Content-Type": "application/json"
			}
		});
		
		if(!res.ok) {
			// Nếu API trả 404 hoặc lỗi, thử lấy dữ liệu local
			try {
				if (res.status === 404) {
					const localRes = await fetch('data/warranties.json', { cache: 'no-store' });
					if (localRes.ok) {
						const localData = await localRes.json();
						window.__DATA_SOURCE = 'local';
						return localData || [];
					}
				}
			} catch(_) {}

			// Thử parse error response để hiển thị thông báo chi tiết hơn
			try {
				const errorData = await res.json();
				if (errorData.message) {
					throw new Error(errorData.message);
				}
			} catch (parseError) {
				// Nếu không parse được error response
			}
			throw new Error(`Lỗi kết nối: HTTP ${res.status} - ${res.statusText}`);
		}
		
		const result = await res.json();
		
		// Kiểm tra nếu result có error
		if (result && result.error) {
			throw new Error(result.message || result.error);
		}
		// Đánh dấu nguồn dữ liệu
		window.__DATA_SOURCE = 'api';
		
		return result || [];
	} catch (error) {
		// Hiển thị thông báo lỗi chi tiết hơn cho debugging
		console.error('Load data error:', error);
		// Thử dùng dữ liệu local như một bước nữa
		try {
			const localRes = await fetch('data/warranties.json', { cache: 'no-store' });
			if (localRes.ok) {
				const localData = await localRes.json();
				window.__DATA_SOURCE = 'local';
				return localData || [];
			}
		} catch(_) {}

		// Sử dụng fallback data nếu API không hoạt động
		console.warn('Using fallback data due to API error');
		window.__DATA_SOURCE = 'fallback';
		return FALLBACK_DATA;
	}
}

// Chuẩn hóa dữ liệu
function normalize(records) {
	const byId = {};
	records.forEach(r => {
		const id = String(r.id || "").trim();
		if(!id) return;
		
		if(!byId[id]) {
			byId[id] = { 
				id, 
				name: r.name || "", 
				warranties: [] 
			};
		}
		
		byId[id].name = byId[id].name || r.name || "";
		byId[id].warranties.push({ 
			title: r.title || "", 
			image: r.image || "", 
			start: r.start || "", 
			end: r.end || "" 
		});
	});
	
	return Object.values(byId);
}

// Tìm kiếm khách hàng
function searchCustomers(customers, searchName, searchId) {
	return customers.filter(customer => {
		const nameMatch = !searchName || 
			customer.name.toLowerCase().includes(searchName.toLowerCase());
		const idMatch = !searchId || 
			customer.id.toLowerCase().includes(searchId.toLowerCase());
		
		return nameMatch && idMatch;
	});
}

// Tính số ngày còn lại của bảo hành
function calculateDaysRemaining(endDate) {
	if (!endDate) return null;
	
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	
	const end = new Date(endDate);
	end.setHours(0, 0, 0, 0);
	
	// Nếu đã hết hạn
	if (end < today) return -1;
	
	// Tính số ngày còn lại
	const diffTime = Math.abs(end - today);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	
	return diffDays;
}

// Render kết quả tìm kiếm
function render(customers, isUsingFallback = false) {
	const result = document.getElementById("result");
	const warrantyList = document.getElementById("warrantyList");
	const message = document.getElementById("message");
	
	message.textContent = "";
	warrantyList.innerHTML = "";
	
	if (!customers || customers.length === 0) {
		result.classList.add("hidden");
		message.textContent = "Không tìm thấy khách hàng.";
		message.className = "message error";
		return;
	}
	
	// Hiển thị thông tin khách hàng đầu tiên
	const customer = customers[0];
	document.getElementById("customerName").textContent = customer.name || "Khách hàng";
	document.getElementById("customerIdText").textContent = customer.id;
	const greet = document.getElementById("greeting-name");
	if (greet) greet.textContent = customer.name || "Quý khách";
	
	// Render tất cả phiếu bảo hành
	customer.warranties.forEach((warranty, index) => {
		const card = createWarrantyCard(warranty, customer, index);
		warrantyList.appendChild(card);
	});
	
	result.classList.remove("hidden");
	message.className = "message success";
	
	let messageText = `Tìm thấy ${customers.length} khách hàng với ${customer.warranties.length} phiếu bảo hành`;
	if (isUsingFallback) {
		messageText += " (đang sử dụng dữ liệu mẫu)";
	}
	message.textContent = messageText;
}

// Tạo card phiếu bảo hành
function createWarrantyCard(warranty, customer, index) {
	const card = document.createElement("div");
	card.className = "warranty-card";
	card.style.animationDelay = `${index * 0.1}s`;
	
	const today = new Date().toISOString().slice(0, 10);
	const isActive = (!warranty.start || warranty.start <= today) && 
					 (!warranty.end || warranty.end >= today);
	
	// Tính số ngày còn lại
	const daysRemaining = calculateDaysRemaining(warranty.end);
	
	// Hiển thị thông tin số ngày còn lại
	let remainingDaysText = '';
	if (daysRemaining === null) {
		remainingDaysText = '<span class="days-remaining unlimited">Không giới hạn</span>';
	} else if (daysRemaining < 0) {
		remainingDaysText = '<span class="days-remaining expired">Đã hết hạn</span>';
	} else if (daysRemaining === 0) {
		remainingDaysText = '<span class="days-remaining last-day">Còn hôm nay</span>';
	} else {
		remainingDaysText = `<span class="days-remaining active">Còn ${daysRemaining} ngày</span>`;
	}
	
	card.innerHTML = `
		<div class="warranty-image" onclick="showImageModal('${warranty.image || 'https://via.placeholder.com/400x200?text=No+Image'}', '${customer.name}', '${customer.id}', '${warranty.end}')">
			<img src="${warranty.image || 'https://via.placeholder.com/400x200?text=No+Image'}" 
				 alt="${warranty.title || 'Phiếu bảo hành'}" />
			<div class="view-overlay">
				<div class="view-text">
					<i class="fas fa-eye"></i>
					<span>Nhấn vào đây để xem ảnh</span>
				</div>
			</div>
		</div>
		<div class="warranty-content">
			<div class="warranty-title">${warranty.title || "Phiếu bảo hành"}</div>
			<div class="warranty-dates">
				<span><i class="fas fa-calendar-alt"></i> Bắt đầu: ${warranty.start || "?"}</span>
				<span><i class="fas fa-calendar-check"></i> Kết thúc: ${warranty.end || "?"}</span>
			</div>
			<div class="warranty-remaining">
				<i class="fas fa-hourglass-half"></i> ${remainingDaysText}
			</div>
			<div class="warranty-status">
				<span class="status-badge ${isActive ? 'active' : 'expired'}">
					${isActive ? 'Đang hiệu lực' : 'Hết hạn'}
				</span>
				<button class="download-btn" onclick="downloadImage('${warranty.image || 'https://via.placeholder.com/400x200?text=No+Image'}', '${customer.name}', '${customer.id}', '${warranty.end}')">
					<i class="fas fa-download"></i> Tải ảnh
				</button>
				${!isActive ? `<button class="download-btn" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);" onclick="showRenewModal({id: '${customer.id}', name: '${customer.name}'})"><i class=\"fas fa-sync\"></i> Gia hạn</button>` : ''}
			</div>
		</div>
	`;
	
	return card;
}

// Xử lý form submit
async function onSubmit(e) {
	e.preventDefault();
	
	const searchName = document.getElementById("customerName").value.trim();
	const searchId = document.getElementById("customerId").value.trim();
	
	// Kiểm tra cả hai trường đều phải được nhập
	if (!searchName || !searchId) {
		document.getElementById("message").textContent = "Vui lòng nhập đầy đủ cả họ tên và ID khách hàng!";
		document.getElementById("message").className = "message error";
		return;
	}
	
	try {
		showLoading();
		
		const records = await loadData();
		const isUsingFallback = records === FALLBACK_DATA;
		
		const customers = normalize(records);
		
		const searchResults = searchCustomers(customers, searchName, searchId);
		
		render(searchResults, isUsingFallback);
		
	} catch (error) {
		// Không log lỗi chi tiết để tránh lộ thông tin
		document.getElementById("message").textContent = error.message;
		document.getElementById("message").className = "message error";
	} finally {
		hideLoading();
	}
}

// Event listeners
document.getElementById("lookup-form").addEventListener("submit", onSubmit);

// Thêm hiệu ứng hover cho các card và cập nhật thời gian
document.addEventListener("DOMContentLoaded", function() {
	// Thêm class để trigger animation
	const result = document.getElementById("result");
	if (result) {
		result.classList.add("slide-up");
	}
	
	// Cập nhật thời gian và ngày tháng
	updateDateTime();
	setInterval(updateDateTime, 1000); // Cập nhật mỗi giây

	// Greeting live update when typing name
	const nameInput = document.getElementById('customerName');
	if (nameInput) {
		nameInput.addEventListener('input', function() {
			const greet = document.getElementById('greeting-name');
			if (greet) greet.textContent = (this.value && this.value.trim()) ? this.value.trim() : 'Quý khách';
		});
	}
});

// Hàm cập nhật thời gian và ngày tháng
function updateDateTime() {
	const now = new Date();
	
	// Cập nhật thời gian
	const timeElement = document.getElementById("current-time");
	if (timeElement) {
		const timeString = now.toLocaleTimeString('vi-VN', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		timeElement.textContent = timeString;
	}
	
	// Cập nhật ngày tháng
	const dateElement = document.getElementById("current-date");
	if (dateElement) {
		const dateString = now.toLocaleDateString('vi-VN', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		dateElement.textContent = dateString;
	}
}

// Keyboard shortcuts
document.addEventListener("keydown", function(e) {
	// ESC để đóng modal
	if (e.key === "Escape" && !imageModal.classList.contains("hidden")) {
		hideImageModal();
	}
	
	// Enter để submit form
	if (e.key === "Enter" && (e.target.id === "customerName" || e.target.id === "customerId")) {
		document.getElementById("lookup-form").dispatchEvent(new Event("submit"));
	}
});
