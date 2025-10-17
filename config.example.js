// File cấu hình mẫu - Sao chép thành config.js và điền thông tin thật
// KHÔNG commit file config.js lên Git

window.APP_CONFIG = {
    // Google OAuth - Lấy từ Google Cloud Console
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    ADMIN_GOOGLE_EMAIL: 'admin@gmail.com',
    
    // Google Sheets (Excel online) - Publish to web → CSV
    GS_PUBLISHED_CSV_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv',
    
    // Google Apps Script API URL - Deploy script và lấy URL
    GAS_API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // API endpoints (nếu có)
    API_BASE_URL: '/api',
    
    // Các cấu hình khác
    APP_NAME: 'Hệ thống tra cứu bảo hành',
    VERSION: '1.0.0',
    
    // Debug mode (chỉ bật khi phát triển)
    DEBUG: false
};
