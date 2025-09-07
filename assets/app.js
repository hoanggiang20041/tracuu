// Production Guard - Chống debug và ẩn thông tin nhạy cảm
(function() {
	'use strict';
	
	// Disable console logs
	if (typeof console !== 'undefined') {
		console.log = console.warn = console.error = console.info = console.debug = function() {};
	}
	
	// Clear console periodically
	setInterval(function() {
		if (typeof console !== 'undefined' && console.clear) {
			console.clear();
		}
	}, 1000);
	
	// Disable developer tools detection
	let devtools = {open: false, orientation: null};
	const threshold = 160;
	
	setInterval(function() {
		if (window.outerHeight - window.innerHeight > threshold || 
			window.outerWidth - window.innerWidth > threshold) {
			if (!devtools.open) {
				devtools.open = true;
				// Redirect or show warning
				document.body.innerHTML = '<div style="text-align:center;padding:50px;font-family:Arial;"><h1>Access Denied</h1><p>Developer tools detected. Please close and refresh the page.</p></div>';
			}
		}
	}, 500);
	
})();

// Cấu hình API endpoint (sử dụng proxy để ẩn thông tin nhạy cảm)
const API_URL = "/api/warranty-data";

// DOM Elements
const loadingOverlay = document.getElementById("loading-overlay");
const imageModal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const downloadBtn = document.getElementById("download-btn");
const closeModal = document.querySelector(".close-modal");

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

// Tải ảnh về
function downloadImage(imageSrc, customerName, customerId, endDate) {
	// Tạo tên file theo format: hoten_id_ngayhethanbaohanh
	const fileName = `${customerName}_${customerId}_${endDate}.jpg`;
	
	// Tạo link download
	const link = document.createElement('a');
	link.href = imageSrc;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

// Đóng modal khi click bên ngoài hoặc nút close
closeModal.onclick = hideImageModal;
imageModal.onclick = (e) => {
	if (e.target === imageModal) hideImageModal();
};

// Tải dữ liệu từ API proxy (ẩn thông tin nhạy cảm)
async function loadData() {
	try {
		const res = await fetch(API_URL, { 
			cache: "no-store",
			headers: {
				"Content-Type": "application/json"
			}
		});
		
		if(!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		
		const result = await res.json();
		return result || [];
	} catch (error) {
		// Không log lỗi chi tiết để tránh lộ thông tin
		throw new Error(`Lỗi tải dữ liệu. Vui lòng thử lại sau.`);
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
function render(customers) {
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
	
	// Render tất cả phiếu bảo hành
	customer.warranties.forEach((warranty, index) => {
		const card = createWarrantyCard(warranty, customer, index);
		warrantyList.appendChild(card);
	});
	
	result.classList.remove("hidden");
	message.className = "message success";
	message.textContent = `Tìm thấy ${customers.length} khách hàng với ${customer.warranties.length} phiếu bảo hành`;
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
		
		const customers = normalize(records);
		
		const searchResults = searchCustomers(customers, searchName, searchId);
		
		render(searchResults);
		
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

// Thêm hiệu ứng hover cho các card
document.addEventListener("DOMContentLoaded", function() {
	// Thêm class để trigger animation
	const result = document.getElementById("result");
	if (result) {
		result.classList.add("slide-up");
	}
});

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
