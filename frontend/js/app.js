// frontend/js/app.js - FIXED VERSION
class ChurnAnalysisApp {
    constructor() {
        this.api = window.churnAPI;
        this.currentPage = this.getCurrentPage();
        this.initialize();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.includes('index.html')) return 'home';
        if (path.includes('login.html')) return 'login';
        if (path.includes('register.html')) return 'register';
        if (path.includes('dashboard.html')) return 'dashboard';
        if (path.includes('data-input.html')) return 'data-input';
        if (path.includes('analysis.html')) return 'analysis';
        if (path.includes('reports.html')) return 'reports';
        if (path.includes('retention.html')) return 'retention';
        if (path.includes('model-performance.html')) return 'model-performance';
        return 'home';
    }

    async initialize() {
        console.log('App Initializing...');
        
        if (!this.api) {
            this.api = window.churnAPI;
        }
        
        this.checkAuthentication();
        this.initializePage();
        this.setupNavigation();
        this.setupCommonEventListeners();
        await this.checkAPIHealth();

        console.log('App initialized');
    }

    checkAuthentication() {
        const protectedPages = ['dashboard', 'data-input', 'analysis', 'reports', 'retention', 'model-performance'];
        
        const token = localStorage.getItem('authToken');
        const isAuthFlag = localStorage.getItem('isAuthenticated') === 'true';
        const isAuthenticated = !!(token && isAuthFlag);
        
        if (protectedPages.includes(this.currentPage) && !isAuthenticated) {
            window.location.href = '/login.html';
            return false;
        }

        if ((this.currentPage === 'login' || this.currentPage === 'register') && isAuthenticated) {
            window.location.href = '/dashboard.html';
            return false;
        }

        return true;
    }

    initializePage() {
        switch(this.currentPage) {
            case 'login':
                this.initializeLoginPage();
                break;
            case 'register':
                this.initializeRegisterPage();
                break;
            case 'dashboard':
                this.initializeDashboardPage();
                break;
            case 'data-input':
                this.initializeDataInputPage();
                break;
            case 'retention':
                this.initializeRetentionPage();
                break;
            case 'analysis':
                this.initializeAnalysisPage();
                break;
            case 'model-performance':
                this.initializeModelPerformancePage();
                break;
            default:
                this.initializeHomePage();
        }
    }

    setupNavigation() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar') && !e.target.closest('.nav-links.active')) {
                    navLinks.classList.remove('active');
                }
            });
        }

        // Only update auth link if it exists on the page
        this.updateAuthLinkIfExists();
        this.highlightCurrentPage();
    }

    // Only update auth link if the element exists on the page
    updateAuthLinkIfExists() {
        const authLink = document.getElementById('authLink');
        if (!authLink) return;

        const token = localStorage.getItem('authToken');
        const isAuthFlag = localStorage.getItem('isAuthenticated') === 'true';
        const isLoggedIn = !!(token && isAuthFlag);
        
        if (isLoggedIn) {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            authLink.innerHTML = '<i class="fas fa-user"></i> <span>' + (user ? user.name || 'User' : 'User') + '</span>';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                // DO NOTHING - NO LOGOUT ON CLICK
                console.log('Profile clicked - no action');
            };
        } else {
            authLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Login</span>';
            authLink.href = 'login.html';
            authLink.onclick = null;
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        window.location.href = '/login.html';
    }

    highlightCurrentPage() {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            const isActive = 
                (this.currentPage === 'home' && linkHref === 'index.html') ||
                (linkHref && linkHref.includes(`${this.currentPage}.html`));
            
            link.classList.toggle('active', isActive);
        });
    }

    setupCommonEventListeners() {
        window.addEventListener('resize', () => {
            const navLinks = document.querySelector('.nav-links');
            if (window.innerWidth > 768 && navLinks) {
                navLinks.classList.remove('active');
            }
        });

        document.addEventListener('submit', async (e) => {
            const form = e.target;
            const isApiForm = form.classList.contains('api-form') || 
                             form.hasAttribute('data-api-submit');
            
            if (isApiForm) {
                e.preventDefault();
                await this.handleFormSubmit(form);
            }
        });
    }

    async handleFormSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            let result;
            if (form.id === 'loginForm') {
                result = await this.api.login(data.email, data.password);
            } else if (form.id === 'customerForm') {
                result = await this.api.submitCustomer(data);
            } else if (form.id === 'uploadForm') {
                const fileInput = form.querySelector('input[type="file"]');
                if (fileInput && fileInput.files.length > 0) {
                    result = await this.api.uploadFile(fileInput.files[0]);
                } else {
                    throw new Error('Please select a file');
                }
            }

            this.showToast(result.message || 'Action completed successfully', 'success');
            
            if (result.success) {
                form.reset();
                
                if (form.id === 'loginForm' && result.success) {
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                }
            }
        } catch (error) {
            this.showToast(error.message || 'An error occurred', 'error');
            console.error('Form submission error:', error);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async checkAPIHealth() {
        try {
            if (this.api && typeof this.api.healthCheck === 'function') {
                const health = await this.api.healthCheck();
                if (health.status !== 'healthy') {
                    console.warn('API health check failed:', health);
                }
            }
        } catch (error) {
            console.error('API health check error:', error);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
            padding: 12px 20px;
            border-radius: 6px;
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
        `;

        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
            <button class="toast-close" style="margin-left: auto; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: inherit;">&times;</button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        });

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }

        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Page initializations
    initializeHomePage() {
        console.log('Home page');
    }

    initializeLoginPage() {
        console.log('Login page');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.classList.add('api-form');
        }
    }

    initializeRegisterPage() {
        console.log('Register page');
    }

    initializeDashboardPage() {
        console.log('Dashboard page');
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            if (this.api && typeof this.api.getAnalyticsOverview === 'function') {
                const analytics = await this.api.getAnalyticsOverview();
                const stats = analytics.data;
                this.updateElementText('totalCustomers', stats.total_customers || 0);
                this.updateElementText('highRiskCustomers', stats.high_risk_customers || 0);
                this.updateElementText('churnRate', stats.churn_rate ? `${stats.churn_rate}%` : '0%');
                this.updateElementText('retentionRate', stats.retention_rate ? `${stats.retention_rate}%` : '100%');
                
                const customers = await this.api.getCustomers(5);
                this.displayRecentCustomers(customers.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    displayRecentCustomers(customers) {
        const container = document.getElementById('recentCustomers');
        if (!container || !customers) return;

        container.innerHTML = customers.map(customer => `
            <div class="customer-item">
                <div class="customer-info">
                    <strong>${customer.age_group || 'N/A'}</strong>
                    <span>NPS: ${customer.nps_score || 'N/A'}</span>
                    <span class="risk-badge ${customer.churn_likelihood === 'Very likely' ? 'high-risk' : 'low-risk'}">
                        ${customer.churn_likelihood || 'Unknown'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    initializeDataInputPage() {
        console.log('Data input page');
        
        const customerForm = document.getElementById('customerForm');
        if (customerForm) {
            customerForm.classList.add('api-form');
        }

        const uploadForm = document.getElementById('uploadForm');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        if (uploadForm && fileInput && uploadBtn) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadBtn.innerHTML = `<i class="fas fa-file"></i> Upload ${file.name}`;
                }
            });

            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = fileInput.files[0];
                if (!file) {
                    this.showToast('Please select a file first', 'error');
                    return;
                }

                try {
                    const result = await this.api.uploadFile(file);
                    this.showToast(result.message || 'File uploaded successfully', 'success');
                    fileInput.value = '';
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Choose File';
                } catch (error) {
                    this.showToast(error.message || 'Upload failed', 'error');
                }
            });
        }
    }

    initializeRetentionPage() {
        console.log('Retention page');
    }

    initializeAnalysisPage() {
        console.log('Analysis page');
    }

    initializeModelPerformancePage() {
        console.log('Model performance page');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.churnApp = new ChurnAnalysisApp();
});

window.ChurnAnalysisApp = ChurnAnalysisApp;