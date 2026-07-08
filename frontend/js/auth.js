// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';
let isAPIConnected = false;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginButton = document.getElementById('loginButton');
const loginText = document.getElementById('loginText');
const loginLoading = document.getElementById('loginLoading');
const alertMessage = document.getElementById('alertMessage');
const apiStatus = document.getElementById('apiStatus');
const demoLoginBtn = document.getElementById('demoLogin');
const registerLink = document.getElementById('registerLink');

// Check API Connection
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            isAPIConnected = true;
            apiStatus.textContent = '✓ API Connected';
            apiStatus.className = 'api-status online';
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        isAPIConnected = false;
        apiStatus.textContent = '✗ API Connection Failed';
        apiStatus.className = 'api-status offline';
        console.error('API Connection Error:', error);
    }
}

// Toggle Password Visibility
togglePasswordBtn.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

// Show Alert Message
function showAlert(message, type = 'error') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type}`;
    alertMessage.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alertMessage.style.display = 'none';
    }, 5000);
}

// Handle Login Form Submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!isAPIConnected) {
        showAlert('Cannot connect to server. Please check if the backend is running.');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Basic validation
    if (!email || !password) {
        showAlert('Please enter both email and password');
        return;
    }
    
    // Show loading state
    loginText.style.display = 'none';
    loginLoading.style.display = 'inline';
    loginButton.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showAlert('Login successful! Redirecting to dashboard...', 'success');
            
            // Store user data in localStorage (for demo purposes)
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAuthenticated', 'true');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } else {
            showAlert(data.message || 'Login failed. Please check your credentials.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.');
    } finally {
        // Reset button state
        loginText.style.display = 'inline';
        loginLoading.style.display = 'none';
        loginButton.disabled = false;
    }
});

// Demo Login
demoLoginBtn.addEventListener('click', function() {
    emailInput.value = 'admin@churnanalysis.com';
    passwordInput.value = 'demo123';
    
    // Trigger form submission after a short delay
    setTimeout(() => {
        loginForm.dispatchEvent(new Event('submit'));
    }, 500);
});

// Register Link
registerLink.addEventListener('click', function(e) {
    e.preventDefault();
    showAlert('Registration feature coming soon! For now, use demo login.', 'success');
});

// Check if user is already logged in
function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
        // User is already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    checkAPIConnection();
    
    // Check API connection every 30 seconds
    setInterval(checkAPIConnection, 30000);
    
    // Add some interactive effects
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });
});