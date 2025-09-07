// Cấu hình JSONBin.io
// Switch to server proxy to avoid exposing keys
const JSONBIN_GET_URL = 'https://tracuu-5j4.pages.dev/api/warranty-data';
const JSONBIN_PUT_URL = 'https://tracuu-5j4.pages.dev/api/warranty-data';

// Global variables
let allWarranties = [];
let allCustomers = [];
let currentEditId = null;

// DOM Elements
const warrantyTbody = document.getElementById('warranty-tbody');
const customerTbody = document.getElementById('customer-tbody');
const warrantySearch = document.getElementById('warranty-search');
const customerSearch = document.getElementById('customer-search');
const warrantyFilter = document.getElementById('warranty-filter');
const addWarrantyForm = document.getElementById('add-warranty-form');

// Initialize admin functionality
console.log('Admin.js loaded, setting up initialization...');

// Đợi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded - Admin.js');
        setTimeout(() => {
            console.log('Starting admin initialization...');
            initializeAdmin();
        }, 100);
    });
} else {
    // DOM đã sẵn sàng
    console.log('DOM already ready - Admin.js');
    setTimeout(() => {
        console.log('Starting admin initialization...');
        initializeAdmin();
    }, 100);
}

async function initializeAdmin() {
    try {
        console.log('Initializing admin...');
        await loadAllData();
        setupEventListeners();
        
        // Đảm bảo tab warranty được hiển thị đầu tiên
        if (typeof showTab === 'function') {
            showTab('warranty', null); // Không có element được click khi khởi tạo
        }
        
        // Kiểm tra ID trùng lặp khi khởi tạo
        const duplicates = checkDuplicateIds();
        if (duplicates.length > 0) {
            console.warn('Duplicate IDs found on initialization:', duplicates);
        }
        
        showNotification('Hệ thống admin đã sẵn sàng!', 'success');
    } catch (error) {
        console.error('Admin initialization error:', error);
        showNotification('Lỗi khởi tạo: ' + error.message, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Search functionality
    if (warrantySearch) {
        warrantySearch.addEventListener('input', debounce(filterWarranties, 300));
        console.log('Warranty search listener added');
    } else {
        console.error('Warranty search not found!');
    }
    
    if (customerSearch) {
        customerSearch.addEventListener('input', debounce(filterCustomers, 300));
        console.log('Customer search listener added');
    } else {
        console.error('Customer search not found!');
    }
    
    // Filter functionality
    if (warrantyFilter) {
        warrantyFilter.addEventListener('change', filterWarranties);
        console.log('Warranty filter listener added');
    } else {
        console.error('Warranty filter not found!');
    }
    
    // Form submission - Đảm bảo chỉ thêm listener một lần
    if (addWarrantyForm) {
        // Xóa listener cũ nếu có
        addWarrantyForm.removeEventListener('submit', handleAddWarranty);
        // Thêm listener mới
        addWarrantyForm.addEventListener('submit', handleAddWarranty);
        console.log('Form submission listener added successfully');
        
        // Test form submission
        console.log('Form element:', addWarrantyForm);
        console.log('Form action:', addWarrantyForm.action);
        console.log('Form method:', addWarrantyForm.method);
        
        // Thêm test click để đảm bảo form hoạt động
        console.log('Testing form submission...');
        const submitBtn = addWarrantyForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log('Submit button found:', submitBtn);
            console.log('Submit button onclick:', submitBtn.onclick);
        }
    } else {
        console.error('Form not found! Check if element exists');
    }
    
    console.log('Event listeners setup completed');

    // Setup blur click-to-reveal and lightbox once the table renders
    setTimeout(setupImageLightbox, 300);
}

// Load all data from JSONBin
async function loadAllData() {
    try {
        console.log('Loading data from JSONBin...');
        
        const response = await fetch(JSONBIN_GET_URL, { headers: { "X-Bin-Meta": "false" } });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const payload = await response.json();
        console.log('Loaded data from JSONBin:', payload);
        // JSONBin v3 returns {record: ...}
        const data = Array.isArray(payload?.record) ? payload.record : (Array.isArray(payload) ? payload : []);
        
        // Nếu dữ liệu đã có và không rỗng, không load lại
        if (allWarranties && allWarranties.length > 0 && data && data.length > 0) {
            console.log('Data already loaded, skipping reload');
            return;
        }
        
        allWarranties = Array.isArray(data) ? data : [];
        
        // Process data for display
        processDataForDisplay();
        
        // Render initial data
        renderWarranties();
        renderCustomers();
        
        console.log('Data loading completed');
        
    } catch (error) {
        console.error('Load data error:', error);
        showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
    }
}

// Process raw data for display
function processDataForDisplay() {
    // Normalize warranties array first
    const warrantiesRaw = allWarranties ?? [];
    const warranties = Array.isArray(warrantiesRaw)
        ? warrantiesRaw
        : Array.isArray(warrantiesRaw?.record)
            ? warrantiesRaw.record
            : Array.isArray(warrantiesRaw?.data)
                ? warrantiesRaw.data
                : [];

    // Group warranties by customer
    const customerMap = new Map();
    
    warranties.forEach(warranty => {
        const customerId = warranty.id || warranty.customerId || '';
        const customerName = warranty.name || warranty.customerName || '';
        
        if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
                id: customerId,
                name: customerName,
                warranties: []
            });
        }
        
        customerMap.get(customerId).warranties.push({
            id: warranty.id || '',
            title: warranty.title || '',
            image: warranty.image || '',
            start: warranty.start || '',
            end: warranty.end || '',
            notes: warranty.notes || ''
        });
    });
    
    allCustomers = Array.from(customerMap.values());
    // Keep normalized warranties
    allWarranties = warranties;
}

// Render warranties table
function renderWarranties(warranties = null) {
    const dataToRender = warranties || allWarranties;
    
    if (!warrantyTbody) return;
    
    warrantyTbody.innerHTML = '';
    
    if (!dataToRender || dataToRender.length === 0) {
        warrantyTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Chưa có phiếu bảo hành nào
                </td>
            </tr>
        `;
        return;
    }
    
    dataToRender.forEach(warranty => {
        const row = createWarrantyRow(warranty);
        warrantyTbody.appendChild(row);
    });

    // Rebind lightbox after render
    setupImageLightbox();
}

// Create warranty table row
function createWarrantyRow(warranty) {
    const row = document.createElement('tr');
    
    const today = new Date().toISOString().slice(0, 10);
    const isActive = (!warranty.start || warranty.start <= today) && 
                     (!warranty.end || warranty.end >= today);
    
    row.innerHTML = `
        <td>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    ${(warranty.name || warranty.customerName || 'N/A').charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style="font-weight: 600;">${warranty.name || warranty.customerName || 'N/A'}</div>
                    <div style="font-size: 0.8rem; color: #666;">${warranty.id || warranty.customerId || 'N/A'}</div>
                </div>
            </div>
        </td>
        <td><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${warranty.id || warranty.customerId || 'N/A'}</code></td>
        <td>
            <div style="font-weight: 600;">${warranty.title || 'N/A'}</div>
            ${warranty.notes ? `<div style=\"font-size: 0.8rem; color: #666; margin-top: 4px;\">${warranty.notes}</div>` : ''}
            ${warranty.image ? `<div style=\"margin-top:8px;\"><img class=\"blur-img\" src=\"${warranty.image}\" alt=\"${(warranty.title||'Ảnh')}\" style=\"max-width:90px; border-radius:6px;\"></div>` : ''}
        </td>
        <td>${warranty.start || 'N/A'}</td>
        <td>${warranty.end || 'N/A'}</td>
        <td>
            <span class="status-badge ${isActive ? 'active' : 'expired'}">
                ${isActive ? 'Đang hiệu lực' : 'Hết hạn'}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-warning btn-sm" onclick="editWarranty('${warranty.id || warranty.customerId}')" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteWarranty('${warranty.id || warranty.customerId}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Render customers table
function renderCustomers(customers = null) {
    const dataToRender = customers || allCustomers;
    
    if (!customerTbody) return;
    
    customerTbody.innerHTML = '';
    
    if (!dataToRender || dataToRender.length === 0) {
        customerTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Chưa có khách hàng nào
                </td>
            </tr>
        `;
        return;
    }
    
    dataToRender.forEach(customer => {
        const row = createCustomerRow(customer);
        customerTbody.appendChild(row);
    });
}

// Create customer table row
function createCustomerRow(customer) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${customer.id}</code></td>
        <td>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    ${customer.name.charAt(0).toUpperCase()}
                </div>
                <div style="font-weight: 600;">${customer.name}</div>
            </div>
        </td>
        <td>
            <span class="status-badge active">${customer.warranties.length} phiếu</span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-warning btn-sm" onclick="editCustomer('${customer.id}')" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Filter warranties
function filterWarranties() {
    const searchTerm = warrantySearch.value.toLowerCase();
    const filterValue = warrantyFilter.value;
    
    let filteredWarranties = allWarranties;
    
    // Apply search filter
    if (searchTerm) {
        filteredWarranties = filteredWarranties.filter(warranty => 
            (warranty.name || warranty.customerName || '').toLowerCase().includes(searchTerm) ||
            (warranty.id || warranty.customerId || '').toLowerCase().includes(searchTerm) ||
            (warranty.title || '').toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (filterValue) {
        const today = new Date().toISOString().slice(0, 10);
        filteredWarranties = filteredWarranties.filter(warranty => {
            const isActive = (!warranty.start || warranty.start <= today) && 
                           (!warranty.end || warranty.end >= today);
            return filterValue === 'active' ? isActive : !isActive;
        });
    }
    
    renderWarranties(filteredWarranties);
}

// Filter customers
function filterCustomers() {
    const searchTerm = customerSearch.value.toLowerCase();
    
    let filteredCustomers = allCustomers;
    
    if (searchTerm) {
        filteredCustomers = filteredCustomers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.id.toLowerCase().includes(searchTerm)
        );
    }
    
    renderCustomers(filteredCustomers);
}

// Handle add warranty form submission
async function handleAddWarranty(e) {
    console.log('Form submission started...');
    console.log('Event object:', e);
    console.log('Event type:', e.type);
    
    // Ngăn chặn form submit mặc định
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submission prevented');
    
    const formData = new FormData(addWarrantyForm);
    
    try {
        // Validate required fields
        const customerId = formData.get('customer-id');
        const customerName = formData.get('customer-name');
        const warrantyTitle = formData.get('warranty-title');
        
        console.log('Form data:', { customerId, customerName, warrantyTitle });
        console.log('Form data entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        if (!customerId || !customerName || !warrantyTitle) {
            showNotification('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
            return;
        }
        
        // Kiểm tra ID khách hàng trùng lặp (chỉ khi thêm mới)
        if (!currentEditId) {
            const existingCustomer = allWarranties.find(w => (w.id || w.customerId) === customerId);
            if (existingCustomer) {
                showNotification(`ID khách hàng "${customerId}" đã tồn tại! Vui lòng sử dụng ID khác.`, 'error');
                return;
            }
        }
        
        // Prepare warranty data
        const warrantyData = {
            id: customerId,
            name: customerName,
            title: warrantyTitle,
            start: formData.get('start-date') || '',
            end: formData.get('end-date') || '',
            notes: formData.get('warranty-notes') || ''
        };
        
        console.log('Prepared warranty data:', warrantyData);
        
        // Handle image upload
        const imageFile = formData.get('warranty-image');
        if (imageFile && imageFile.size > 0) {
            try {
                showNotification('Đang upload ảnh...', 'info');
                const imageUrl = await uploadImage(imageFile);
                warrantyData.image = imageUrl;
                showNotification('Upload ảnh thành công!', 'success');
                console.log('Image uploaded:', imageUrl);
            } catch (error) {
                console.error('Image upload error:', error);
                showNotification('Lỗi upload ảnh: ' + error.message, 'error');
                return;
            }
        } else if (currentEditId) {
            // Nếu đang sửa và không có ảnh mới, giữ lại ảnh cũ
            const existingWarranty = allWarranties.find(w => (w.id || w.customerId) === currentEditId);
            if (existingWarranty && existingWarranty.image) {
                warrantyData.image = existingWarranty.image;
                console.log('Keeping existing image:', existingWarranty.image);
            }
        }
        
        if (currentEditId) {
            // Update existing warranty
            const index = allWarranties.findIndex(w => (w.id || w.customerId) === currentEditId);
            if (index !== -1) {
                allWarranties[index] = warrantyData;
                showNotification('Cập nhật phiếu bảo hành thành công!', 'success');
                console.log('Updated warranty at index:', index);
            }
        } else {
            // Add new warranty
            allWarranties.push(warrantyData);
            showNotification('Thêm phiếu bảo hành thành công!', 'success');
            console.log('Added new warranty, total count:', allWarranties.length);
        }
        
        // Save to JSONBin
        console.log('Saving to JSONBin...', warrantyData);
        await saveToJSONBin();
        console.log('Saved successfully!');
        
        // Refresh display
        processDataForDisplay();
        renderWarranties();
        renderCustomers();
        
        // Reset form and edit state
        resetForm();
        
        // Switch to warranty tab
        if (typeof showTab === 'function') {
            showTab('warranty', null);
        }
        
        console.log('Form submission completed successfully');
        
    } catch (error) {
        console.error('Add/Edit warranty error:', error);
        showNotification('Lỗi: ' + error.message, 'error');
    }
}

// Upload image to ImgBB
async function uploadImage(file) {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('Kích thước ảnh không được vượt quá 5MB');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Chỉ chấp nhận file ảnh: JPG, PNG, GIF');
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('https://api.imgbb.com/1/upload?key=d46a4b1117287a127e5ae5e55e193046', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            return result.data.url;
        } else {
            throw new Error(result.error?.message || 'Upload failed');
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Lỗi kết nối mạng. Vui lòng thử lại!');
        }
        throw error;
    }
}

// Save data to JSONBin
async function saveToJSONBin() {
    try {
        console.log('Saving data to JSONBin...', allWarranties);
        
        // Kiểm tra và làm sạch dữ liệu trước khi gửi
        const cleanData = allWarranties.map(warranty => {
            return {
                id: warranty.id || warranty.customerId || '',
                name: warranty.name || warranty.customerName || '',
                title: warranty.title || '',
                start: warranty.start || '',
                end: warranty.end || '',
                notes: warranty.notes || '',
                image: warranty.image || ''
            };
        }).filter(warranty => warranty.id && warranty.name && warranty.title); // Chỉ giữ lại dữ liệu hợp lệ
        
        console.log('Cleaned data to save:', cleanData);
        
        // Kiểm tra dữ liệu trước khi gửi
        if (!Array.isArray(cleanData)) {
            throw new Error('Dữ liệu không phải là array');
        }
        
        if (cleanData.length === 0) {
            // Nếu không có dữ liệu, gửi array rỗng
            console.log('No valid data to save, sending empty array');
        }
        
        const response = await fetch(JSONBIN_PUT_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanData) });
        
        console.log('JSONBin response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('JSONBin error response:', errorText);
            
            // Thử parse error response để có thông tin chi tiết hơn
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    throw new Error(`HTTP ${response.status}: ${errorJson.message}`);
                }
            } catch (parseError) {
                // Nếu không parse được JSON, sử dụng text gốc
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('JSONBin save result:', result);
        
        // Cập nhật lại dữ liệu local với dữ liệu đã được làm sạch
        allWarranties = cleanData;
        
        return result;
    } catch (error) {
        console.error('Save error:', error);
        throw new Error('Lỗi lưu dữ liệu: ' + error.message);
    }
}

// Edit warranty
function editWarranty(warrantyId) {
    const warranty = allWarranties.find(w => (w.id || w.customerId) === warrantyId);
    if (!warranty) return;
    
    // Populate form with warranty data
    document.getElementById('customer-id').value = warranty.id || warranty.customerId || '';
    document.getElementById('customer-name').value = warranty.name || warranty.customerName || '';
    document.getElementById('warranty-title').value = warranty.title || '';
    document.getElementById('start-date').value = warranty.start || '';
    document.getElementById('end-date').value = warranty.end || '';
    document.getElementById('warranty-notes').value = warranty.notes || '';
    
    // Show current image if exists
    const imageField = document.getElementById('warranty-image');
    if (warranty.image) {
        // Tạo preview ảnh hiện tại
        const imagePreview = document.createElement('div');
        imagePreview.id = 'current-image-preview';
        imagePreview.style.cssText = `
            margin-top: 10px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
        `;
        imagePreview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-image" style="color: #667eea;"></i>
                <strong>Ảnh hiện tại:</strong>
            </div>
            <img src="${warranty.image}" alt="Ảnh hiện tại" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #dee2e6;">
            <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                <i class="fas fa-info-circle"></i>
                Chọn ảnh mới để thay thế, hoặc để trống để giữ ảnh hiện tại
            </div>
        `;
        
        // Xóa preview cũ nếu có
        const oldPreview = document.getElementById('current-image-preview');
        if (oldPreview) oldPreview.remove();
        
        // Thêm preview mới
        imageField.parentNode.appendChild(imagePreview);
    }
    
    // Switch to add tab
    if (typeof showTab === 'function') {
        showTab('add', null);
    }
    
    // Change form title and button
    const formTitle = document.querySelector('.form-title');
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Sửa phiếu bảo hành';
    
    const submitBtn = addWarrantyForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Cập nhật';
    
    // Store current edit ID
    currentEditId = warrantyId;
    
    showNotification('Đang chỉnh sửa phiếu bảo hành...', 'info');
}

// Delete warranty
async function deleteWarranty(warrantyId) {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu bảo hành này?')) {
        return;
    }
    
    try {
        console.log('Deleting warranty:', warrantyId);
        console.log('Warranties before deletion:', allWarranties.length);
        
        // Remove from data
        const originalLength = allWarranties.length;
        allWarranties = allWarranties.filter(w => (w.id || w.customerId) !== warrantyId);
        
        console.log('Warranties after deletion:', allWarranties.length);
        console.log('Deleted count:', originalLength - allWarranties.length);
        
        if (allWarranties.length === originalLength) {
            showNotification('Không tìm thấy phiếu bảo hành để xóa!', 'warning');
            return;
        }
        
        // Save to JSONBin
        console.log('Saving to JSONBin after deletion...');
        await saveToJSONBin();
        console.log('Save completed successfully');
        
        // Refresh display
        processDataForDisplay();
        renderWarranties();
        renderCustomers();
        
        showNotification('Xóa phiếu bảo hành thành công!', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        
        // Khôi phục dữ liệu nếu lưu thất bại
        console.log('Restoring data due to save failure...');
        await loadAllData();
        
        showNotification('Lỗi xóa phiếu bảo hành: ' + error.message, 'error');
    }
}

// Edit customer
function editCustomer(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // For now, just show customer info
    showNotification(`Chỉnh sửa khách hàng: ${customer.name}`, 'info');
}

// Delete customer
async function deleteCustomer(customerId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này? Tất cả phiếu bảo hành sẽ bị xóa theo!')) {
        return;
    }
    
    try {
        console.log('Deleting customer:', customerId);
        console.log('Warranties before deletion:', allWarranties.length);
        
        // Remove customer and all their warranties
        const originalLength = allWarranties.length;
        allWarranties = allWarranties.filter(w => (w.id || w.customerId) !== customerId);
        
        console.log('Warranties after deletion:', allWarranties.length);
        console.log('Deleted count:', originalLength - allWarranties.length);
        
        if (allWarranties.length === originalLength) {
            showNotification('Không tìm thấy khách hàng để xóa!', 'warning');
            return;
        }
        
        // Save to JSONBin
        console.log('Saving to JSONBin after deletion...');
        await saveToJSONBin();
        console.log('Save completed successfully');
        
        // Refresh display
        processDataForDisplay();
        renderWarranties();
        renderCustomers();
        
        showNotification('Xóa khách hàng thành công!', 'success');
        
    } catch (error) {
        console.error('Delete customer error:', error);
        
        // Khôi phục dữ liệu nếu lưu thất bại
        console.log('Restoring data due to save failure...');
        await loadAllData();
        
        showNotification('Lỗi xóa khách hàng: ' + error.message, 'error');
    }
}

// Refresh functions
function refreshWarranties() {
    loadAllData();
}

function refreshCustomers() {
    loadAllData();
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Blur + Lightbox for images
function setupImageLightbox(){
    // Inject styles once
    if (!document.getElementById('lightbox-style')) {
        const style = document.createElement('style');
        style.id = 'lightbox-style';
        style.textContent = `
          .blur-img{filter:blur(14px);transition:filter .2s ease, transform .2s ease; cursor: zoom-in;}
          .blur-img.reveal{filter:blur(0); cursor: zoom-out; transform: scale(1.02);} 
          .lightbox{position:fixed; inset:0; background:rgba(0,0,0,.85); display:none; align-items:center; justify-content:center; z-index:9999}
          .lightbox img{max-width:90vw; max-height:90vh; border-radius:8px}
        `;
        document.head.appendChild(style);
    }

    // Create lightbox once
    let box = document.getElementById('lightbox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'lightbox';
        box.className = 'lightbox';
        box.innerHTML = '<img alt="">';
        document.body.appendChild(box);
        box.addEventListener('click', function(){
            box.style.display='none';
            const img = document.querySelector('.blur-img.reveal');
            if (img) img.classList.remove('reveal');
        });
    }

    // Bind click handlers
    document.querySelectorAll('.blur-img').forEach(function(img){
        if (img.dataset.bound) return; // prevent rebinding
        img.dataset.bound = '1';
        img.addEventListener('click', function(){
            const lb = document.getElementById('lightbox');
            const lbImg = lb.querySelector('img');
            if (!img.classList.contains('reveal')) {
                img.classList.add('reveal');
                lbImg.src = img.src;
                lb.style.display = 'flex';
            } else {
                img.classList.remove('reveal');
                lb.style.display = 'none';
            }
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'}; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 350px; word-wrap: break-word; animation: slideInRight 0.3s ease-out;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}" style="font-size: 1.2rem;"></i>
                <span style="font-weight: 500;">${message}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                &times;
            </button>
        </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds (longer for better UX)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Kiểm tra ID trùng lặp
function checkDuplicateIds() {
    const idCounts = {};
    const duplicates = [];
    
    allWarranties.forEach(warranty => {
        const id = warranty.id || warranty.customerId;
        if (id) {
            idCounts[id] = (idCounts[id] || 0) + 1;
            if (idCounts[id] === 2) {
                duplicates.push(id);
            }
        }
    });
    
    if (duplicates.length > 0) {
        const message = `Phát hiện ${duplicates.length} ID trùng lặp: ${duplicates.join(', ')}`;
        showNotification(message, 'warning');
        console.warn('Duplicate IDs found:', duplicates);
        return duplicates;
    }
    
    return [];
}

// Dọn dẹp dữ liệu trùng lặp
async function cleanupDuplicateData() {
    const duplicates = checkDuplicateIds();
    if (duplicates.length === 0) {
        showNotification('Không có dữ liệu trùng lặp!', 'success');
        return;
    }
    
    if (!confirm(`Phát hiện ${duplicates.length} ID trùng lặp. Bạn có muốn dọn dẹp dữ liệu không?`)) {
        return;
    }
    
    try {
        console.log('Starting cleanup of duplicate data...');
        
        // Giữ lại phiếu bảo hành đầu tiên của mỗi ID, xóa các phiếu trùng lặp
        const cleanedWarranties = [];
        const processedIds = new Set();
        
        allWarranties.forEach(warranty => {
            const id = warranty.id || warranty.customerId;
            if (!processedIds.has(id)) {
                processedIds.add(id);
                cleanedWarranties.push(warranty);
            }
        });
        
        console.log('Original warranties count:', allWarranties.length);
        console.log('Cleaned warranties count:', cleanedWarranties.length);
        
        allWarranties = cleanedWarranties;
        
        // Lưu vào JSONBin
        console.log('Saving cleaned data to JSONBin...');
        await saveToJSONBin();
        console.log('Cleanup save completed');
        
        // Refresh display
        processDataForDisplay();
        renderWarranties();
        renderCustomers();
        
        showNotification(`Đã dọn dẹp ${duplicates.length} ID trùng lặp!`, 'success');
        
    } catch (error) {
        console.error('Cleanup error:', error);
        
        // Khôi phục dữ liệu nếu lưu thất bại
        console.log('Restoring data due to cleanup failure...');
        await loadAllData();
        
        showNotification('Lỗi dọn dẹp dữ liệu: ' + error.message, 'error');
    }
}

// Kiểm tra và sửa lỗi dữ liệu
async function validateAndFixData() {
    try {
        console.log('Validating data structure...');
        
        let hasErrors = false;
        const errors = [];
        
        // Kiểm tra từng warranty
        allWarranties.forEach((warranty, index) => {
            if (!warranty.id && !warranty.customerId) {
                errors.push(`Warranty ${index}: Missing ID`);
                hasErrors = true;
            }
            if (!warranty.name && !warranty.customerName) {
                errors.push(`Warranty ${index}: Missing name`);
                hasErrors = true;
            }
            if (!warranty.title) {
                errors.push(`Warranty ${index}: Missing title`);
                hasErrors = true;
            }
        });
        
        if (hasErrors) {
            console.warn('Data validation errors found:', errors);
            
            if (confirm(`Phát hiện ${errors.length} lỗi dữ liệu. Bạn có muốn sửa tự động không?`)) {
                // Lọc bỏ dữ liệu không hợp lệ
                allWarranties = allWarranties.filter(warranty => 
                    (warranty.id || warranty.customerId) && 
                    (warranty.name || warranty.customerName) && 
                    warranty.title
                );
                
                console.log('Data cleaned, saving to JSONBin...');
                await saveToJSONBin();
                
                // Refresh display
                processDataForDisplay();
                renderWarranties();
                renderCustomers();
                
                showNotification(`Đã sửa ${errors.length} lỗi dữ liệu!`, 'success');
            }
        } else {
            showNotification('Dữ liệu hợp lệ!', 'success');
        }
        
    } catch (error) {
        console.error('Data validation error:', error);
        showNotification('Lỗi kiểm tra dữ liệu: ' + error.message, 'error');
    }
}

// Export functions to global scope for HTML onclick
window.editWarranty = editWarranty;
window.deleteWarranty = deleteWarranty;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.refreshWarranties = refreshWarranties;
window.refreshCustomers = refreshCustomers;
window.filterWarranties = filterWarranties;
window.checkDuplicateIds = checkDuplicateIds;
window.cleanupDuplicateData = cleanupDuplicateData;
window.validateAndFixData = validateAndFixData;
window.resetForm = function() {
    console.log('Resetting form...');
    
    if (addWarrantyForm) {
        addWarrantyForm.reset();
        console.log('Form reset completed');
    }
    
    currentEditId = null;
    console.log('Edit ID cleared');
    
    // Remove image preview if exists
    const imagePreview = document.getElementById('current-image-preview');
    if (imagePreview) {
        imagePreview.remove();
        console.log('Image preview removed');
    }
    
    // Reset form title and button
    const formTitle = document.querySelector('.form-title');
    if (formTitle) {
        formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Thêm phiếu bảo hành mới';
        console.log('Form title reset');
    }
    
    const submitBtn = addWarrantyForm?.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Lưu phiếu bảo hành';
        console.log('Submit button reset');
    }
    
    console.log('Form reset completed successfully');
};
