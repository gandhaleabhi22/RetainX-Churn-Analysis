// frontend/js/api-integration.js - SIMPLE VERSION
// API Integration without ES modules

const API_BASE_URL = 'http://localhost:5001/api';

// Make API functions available globally
window.AuthAPI = {
    login: async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) throw new Error('Login failed');
        return response.json();
    },
    
    logout: () => {
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

window.DataAPI = {
    submitCustomer: async (customerData) => {
        const response = await fetch(`${API_BASE_URL}/data/customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        if (!response.ok) throw new Error('Failed to submit data');
        return response.json();
    }
};

window.SystemAPI = {
    health: async () => {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.json();
    }
};

// Test API connection on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const health = await window.SystemAPI.health();
        console.log('✅ Backend API is healthy:', health);
    } catch (error) {
        console.warn('⚠️ Backend API not available:', error.message);
    }
});