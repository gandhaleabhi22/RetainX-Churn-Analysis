// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';
let charts = {};

// DOM Elements
const userNameElement = document.getElementById('userName');
const userRoleElement = document.getElementById('userRole');
const apiStatusElement = document.getElementById('apiStatus');
const logoutLink = document.getElementById('logoutLink');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');

// Stats Elements
const totalCustomersElement = document.getElementById('totalCustomers');
const highRiskCustomersElement = document.getElementById('highRiskCustomers');
const avgSatisfactionElement = document.getElementById('avgSatisfaction');
const predictedChurnElement = document.getElementById('predictedChurn');
const recentCustomersBody = document.getElementById('recentCustomersBody');

// Check Authentication
function checkAuthentication() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    userNameElement.textContent = user.name || 'Demo User';
    userRoleElement.textContent = user.role || 'Administrator';
}

// Check API Connection
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            apiStatusElement.innerHTML = '<i class="fas fa-circle" style="color: #48bb78;"></i> API Connected';
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        apiStatusElement.innerHTML = '<i class="fas fa-circle" style="color: #f56565;"></i> API Disconnected';
        console.error('API Connection Error:', error);
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load customers data
        const response = await fetch(`${API_BASE_URL}/data/customers`);
        const data = await response.json();
        
        if (data.success && data.data) {
            const customers = data.data;
            
            // Update stats
            updateStats(customers);
            
            // Update recent customers table
            updateRecentCustomersTable(customers);
            
            // Initialize charts
            initializeCharts(customers);
        } else {
            // If no real data, use mock data
            await loadMockData();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        await loadMockData();
    }
}

// Load Mock Data
async function loadMockData() {
    try {
        const response = await fetch(`${API_BASE_URL}/data/customers/mock`);
        const data = await response.json();
        
        if (data.success) {
            updateStats(data.data);
            updateRecentCustomersTable(data.data);
            initializeCharts(data.data);
        }
    } catch (error) {
        console.error('Error loading mock data:', error);
        showFallbackData();
    }
}

// Update Stats
function updateStats(customers) {
    const total = customers.length;
    const highRisk = customers.filter(c => c.churn_risk_category === 'High').length;
    const avgSatisfaction = customers.reduce((sum, c) => sum + (c.content_satisfaction || 3), 0) / total || 0;
    const avgChurnProb = customers.reduce((sum, c) => sum + (c.predicted_churn_probability || 0), 0) / total || 0;
    
    totalCustomersElement.textContent = total;
    highRiskCustomersElement.textContent = highRisk;
    avgSatisfactionElement.textContent = avgSatisfaction.toFixed(1);
    predictedChurnElement.textContent = `${(avgChurnProb * 100).toFixed(1)}%`;
}

// Update Recent Customers Table
function updateRecentCustomersTable(customers) {
    // Sort by date (newest first) and take first 5
    const recentCustomers = [...customers]
        .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()))
        .slice(0, 5);
    
    if (recentCustomers.length === 0) {
        recentCustomersBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No customer data available. <a href="data-input.html">Add some data</a>
                </td>
            </tr>
        `;
        return;
    }
    
    recentCustomersBody.innerHTML = recentCustomers.map(customer => `
        <tr>
            <td>${customer.id || 'N/A'}</td>
            <td>${customer.age_group || 'N/A'}</td>
            <td>
                <div class="satisfaction-stars">
                    ${getStars(customer.content_satisfaction || 3)}
                </div>
            </td>
            <td>${customer.predicted_churn_probability ? (customer.predicted_churn_probability * 100).toFixed(1) + '%' : 'N/A'}</td>
            <td>
                <span class="risk-badge risk-${customer.churn_risk_category?.toLowerCase() || 'medium'}">
                    ${customer.churn_risk_category || 'Medium'}
                </span>
            </td>
            <td>${formatDate(customer.created_at)}</td>
        </tr>
    `).join('');
}

// Helper function for star ratings
function getStars(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(`<i class="fas fa-star ${i <= rating ? 'text-yellow-500' : 'text-gray-300'}"></i>`);
    }
    return stars.join('');
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize Charts
function initializeCharts(customers) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Risk Distribution Chart
    const riskCtx = document.getElementById('riskChart').getContext('2d');
    const riskData = calculateRiskDistribution(customers);
    
    charts.riskChart = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
            labels: ['Low Risk', 'Medium Risk', 'High Risk'],
            datasets: [{
                data: [riskData.low, riskData.medium, riskData.high],
                backgroundColor: [
                    '#48bb78', // green
                    '#ed8936', // orange
                    '#f56565'  // red
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw} customers`;
                        }
                    }
                }
            }
        }
    });
    
    // Trend Chart (mock data)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    
    charts.trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'Churn Rate %',
                data: [25, 28, 26, 32, 30, 27, 24],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 20,
                    max: 35,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Calculate Risk Distribution
function calculateRiskDistribution(customers) {
    const distribution = {
        low: 0,
        medium: 0,
        high: 0
    };
    
    customers.forEach(customer => {
        const risk = customer.churn_risk_category?.toLowerCase();
        if (risk === 'low') distribution.low++;
        else if (risk === 'medium') distribution.medium++;
        else if (risk === 'high') distribution.high++;
        else distribution.medium++; // Default to medium if not specified
    });
    
    return distribution;
}

// Show Fallback Data
function showFallbackData() {
    totalCustomersElement.textContent = '12';
    highRiskCustomersElement.textContent = '3';
    avgSatisfactionElement.textContent = '3.8';
    predictedChurnElement.textContent = '28.5%';
    
    recentCustomersBody.innerHTML = `
        <tr>
            <td>101</td>
            <td>18-35</td>
            <td>★★★★☆</td>
            <td>15.2%</td>
            <td><span class="risk-badge risk-low">Low</span></td>
            <td>Today</td>
        </tr>
        <tr>
            <td>102</td>
            <td>35+</td>
            <td>★★☆☆☆</td>
            <td>85.5%</td>
            <td><span class="risk-badge risk-high">High</span></td>
            <td>Yesterday</td>
        </tr>
    `;
}

// Logout Handler
function setupLogout() {
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Clear authentication
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = 'login.html';
    });
}

// Mobile Menu Toggle
function setupMobileMenu() {
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Close menu when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Auto-refresh data every 30 seconds
function setupAutoRefresh() {
    setInterval(loadDashboardData, 30000);
}

// Initialize Dashboard
async function initDashboard() {
    checkAuthentication();
    await checkAPIConnection();
    await loadDashboardData();
    setupLogout();
    setupMobileMenu();
    setupAutoRefresh();
    
    // Check API connection every minute
    setInterval(checkAPIConnection, 60000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);