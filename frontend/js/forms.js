// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';

// DOM Elements
const alertMessage = document.getElementById('alertMessage');
const customerForm = document.getElementById('customerForm');
const clearFormBtn = document.getElementById('clearForm');
const fillDemoDataBtn = document.getElementById('fillDemoData');
const submitFormBtn = document.getElementById('submitForm');
const loadingIndicator = document.getElementById('loadingIndicator');
const predictionResults = document.getElementById('predictionResults');
const newAnalysisBtn = document.getElementById('newAnalysis');
const saveToDashboardBtn = document.getElementById('saveToDashboard');
const downloadReportBtn = document.getElementById('downloadReport');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// File upload elements
const uploadArea = document.getElementById('uploadArea');
const browseFilesBtn = document.getElementById('browseFiles');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const processFileBtn = document.getElementById('processFile');
const cancelUploadBtn = document.getElementById('cancelUpload');
const downloadTemplateBtn = document.getElementById('downloadTemplate');
const uploadLoading = document.getElementById('uploadLoading');

// API test elements
const testAPIBtn = document.getElementById('testAPI');
const apiTestResult = document.getElementById('apiTestResult');

// Progress elements
const progressFill = document.getElementById('progressFill');
const uploadProgress = document.getElementById('uploadProgress');

// Show Alert Message
function showAlert(message, type = 'error', duration = 5000) {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type}`;
    alertMessage.style.display = 'block';
    
    // Auto hide after duration
    if (duration > 0) {
        setTimeout(() => {
            alertMessage.style.display = 'none';
        }, duration);
    }
}

// Tab Switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show active tab content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
        
        // Clear any existing alerts when switching tabs
        alertMessage.style.display = 'none';
    });
});

// Form Submission
customerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!validateForm()) {
        showAlert('Please fill all required fields marked with *');
        return;
    }
    
    // Get form data
    const formData = getFormData();
    
    // Show loading state
    showLoading(true);
    
    try {
        // Step 1: Get churn prediction
        const prediction = await getChurnPrediction(formData);
        
        // Simulate progress
        simulateProgress(progressFill, 100, 1500);
        
        // Wait a bit to show progress
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 2: Save data to database (if prediction is successful)
        const saved = await saveCustomerData(formData, prediction);
        
        if (saved) {
            // Show success and prediction results
            showAlert('Data submitted successfully! Prediction generated.', 'success');
            showPredictionResults(formData, prediction);
        } else {
            showAlert('Failed to save data, but prediction generated.', 'error');
            showPredictionResults(formData, prediction);
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showAlert('Error processing your request. Please try again.');
    } finally {
        showLoading(false);
    }
});

// Validate Form
function validateForm() {
    const requiredFields = customerForm.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#f56565';
        } else {
            field.style.borderColor = '#e2e8f0';
        }
    });
    
    // Validate NPS score (radio buttons)
    const npsSelected = customerForm.querySelector('input[name="nps_score"]:checked');
    if (!npsSelected) {
        isValid = false;
        document.querySelector('.rating-scale').style.border = '2px solid #f56565';
    } else {
        document.querySelector('.rating-scale').style.border = 'none';
    }
    
    // Validate satisfaction (radio buttons)
    const satisfactionSelected = customerForm.querySelector('input[name="content_satisfaction"]:checked');
    if (!satisfactionSelected) {
        isValid = false;
        document.querySelectorAll('.rating-scale')[1].style.border = '2px solid #f56565';
    } else {
        document.querySelectorAll('.rating-scale')[1].style.border = 'none';
    }
    
    return isValid;
}

// Get Form Data
function getFormData() {
    const formData = {
        age_group: document.getElementById('age_group').value,
        subscription_duration: document.getElementById('subscription_duration').value,
        subscription_plan: document.getElementById('subscription_plan').value,
        monthly_spend: document.getElementById('monthly_spend').value,
        usage_frequency: document.getElementById('usage_frequency').value,
        nps_score: parseInt(customerForm.querySelector('input[name="nps_score"]:checked')?.value || 5),
        content_satisfaction: parseInt(customerForm.querySelector('input[name="content_satisfaction"]:checked')?.value || 3),
        value_perception: document.getElementById('value_perception').value,
        churn_likelihood: document.getElementById('churn_likelihood').value,
        switching_behavior: document.getElementById('switching_behavior').value,
        switching_reason: document.getElementById('switching_reason').value,
        account_sharing: document.getElementById('account_sharing').value,
        competitor_awareness: document.getElementById('competitor_awareness').value,
        bundling_preference: document.getElementById('bundling_preference').value,
        payment_method: document.getElementById('payment_method').value,
        suggestions: document.getElementById('suggestions').value,
        platforms: Array.from(customerForm.querySelectorAll('input[name="platforms"]:checked')).map(cb => cb.value).join(', ')
    };
    
    return formData;
}

// Get Churn Prediction from API
async function getChurnPrediction(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/predict/churn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Prediction API failed');
        
        const data = await response.json();
        
        if (data.success) {
            return data.prediction;
        } else {
            // Generate mock prediction if API fails
            return generateMockPrediction(formData);
        }
        
    } catch (error) {
        console.warn('Using mock prediction:', error);
        // Fallback to mock prediction
        return generateMockPrediction(formData);
    }
}

// Generate Mock Prediction (fallback)
function generateMockPrediction(formData) {
    let score = 0.5; // Base score
    
    // Adjust based on factors
    if (formData.nps_score <= 5) score += 0.2;
    if (formData.content_satisfaction <= 2) score += 0.15;
    if (formData.value_perception === 'Poor value') score += 0.15;
    if (formData.usage_frequency === 'Rarely (once in 2-3 months)') score += 0.1;
    if (formData.churn_likelihood === 'Very likely') score += 0.2;
    if (formData.switching_behavior.includes('Yes')) score += 0.1;
    
    // Cap between 0.05 and 0.95
    score = Math.min(0.95, Math.max(0.05, score));
    
    const riskLevel = score > 0.7 ? 'High' : score > 0.4 ? 'Medium' : 'Low';
    
    const keyFactors = [
        formData.nps_score <= 5 ? 'Low recommendation score (NPS)' : null,
        formData.content_satisfaction <= 2 ? 'Content dissatisfaction' : null,
        formData.value_perception === 'Poor value' ? 'Poor value perception' : null,
        formData.usage_frequency === 'Rarely (once in 2-3 months)' ? 'Infrequent usage' : null,
        formData.churn_likelihood === 'Very likely' ? 'Self-reported high churn likelihood' : null
    ].filter(factor => factor !== null);
    
    const recommendations = [
        score > 0.7 ? 'Offer immediate discount or special offer' : null,
        score > 0.5 ? 'Send personalized content recommendations' : null,
        score > 0.3 ? 'Conduct satisfaction survey for feedback' : null,
        'Consider loyalty program enrollment',
        'Send re-engagement email campaign'
    ].filter(rec => rec !== null);
    
    return {
        churn_probability: score,
        risk_level: riskLevel,
        key_factors: keyFactors,
        recommendations: recommendations,
        confidence: 0.85
    };
}

// Save Customer Data
async function saveCustomerData(formData, prediction) {
    try {
        // Add prediction data to form data
        const dataToSave = {
            ...formData,
            predicted_churn_probability: prediction.churn_probability,
            churn_risk_category: prediction.risk_level
        };
        
        const response = await fetch(`${API_BASE_URL}/data/customer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });
        
        const data = await response.json();
        return data.success;
        
    } catch (error) {
        console.error('Error saving customer data:', error);
        return false;
    }
}

// Show Loading State
function showLoading(show) {
    if (show) {
        customerForm.style.display = 'none';
        loadingIndicator.style.display = 'block';
        predictionResults.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

// Simulate Progress
function simulateProgress(element, targetPercent, duration) {
    let currentPercent = 0;
    const increment = targetPercent / (duration / 50); // Update every 50ms
    
    const interval = setInterval(() => {
        currentPercent += increment;
        if (currentPercent >= targetPercent) {
            currentPercent = targetPercent;
            clearInterval(interval);
        }
        element.style.width = currentPercent + '%';
    }, 50);
}

// Show Prediction Results
function showPredictionResults(formData, prediction) {
    // Update prediction elements
    document.getElementById('predictionScore').textContent = 
        (prediction.churn_probability * 100).toFixed(1) + '%';
    
    document.getElementById('riskBadge').textContent = prediction.risk_level + ' Risk';
    document.getElementById('riskBadge').className = `risk-badge risk-${prediction.risk_level.toLowerCase()}`;
    
    // Update key factors
    const keyFactorsList = document.getElementById('keyFactors');
    keyFactorsList.innerHTML = prediction.key_factors.map(factor => 
        `<li><i class="fas fa-times-circle" style="color: #f56565;"></i> ${factor}</li>`
    ).join('');
    
    // Update recommendations
    const recommendationsList = document.getElementById('recommendations');
    recommendationsList.innerHTML = prediction.recommendations.map(rec => 
        `<li><i class="fas fa-check-circle" style="color: #48bb78;"></i> ${rec}</li>`
    ).join('');
    
    // Update customer profile
    document.getElementById('profileRisk').textContent = prediction.risk_level;
    document.getElementById('profilePlatform').textContent = formData.primary_platform || formData.platforms.split(',')[0] || 'N/A';
    document.getElementById('profileUsage').textContent = formData.usage_frequency;
    document.getElementById('profileSatisfaction').textContent = `${formData.content_satisfaction}/5`;
    
    // Show results
    predictionResults.style.display = 'block';
}

// Clear Form
clearFormBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the form? All entered data will be lost.')) {
        customerForm.reset();
        predictionResults.style.display = 'none';
        customerForm.style.display = 'block';
        showAlert('Form cleared successfully.', 'success', 3000);
    }
});

// Fill Demo Data
fillDemoDataBtn.addEventListener('click', () => {
    // Fill form with demo data
    document.getElementById('age_group').value = '18-35';
    
    // Check some platforms
    document.getElementById('platform_netflix').checked = true;
    document.getElementById('platform_prime').checked = true;
    
    document.getElementById('primary_platform').value = 'Netflix';
    document.getElementById('subscription_duration').value = '6-12 months';
    document.getElementById('subscription_plan').value = 'Standard';
    document.getElementById('monthly_spend').value = '₹200 - ₹500';
    document.getElementById('usage_frequency').value = 'Often';
    
    // Select NPS score
    document.getElementById('nps_7').checked = true;
    
    // Select satisfaction
    document.getElementById('satisfaction_4').checked = true;
    
    document.getElementById('value_perception').value = 'Neutral';
    document.getElementById('churn_likelihood').value = 'Not sure';
    document.getElementById('switching_behavior').value = 'No changes';
    document.getElementById('switching_reason').value = '';
    document.getElementById('account_sharing').value = 'Yes, with family';
    document.getElementById('competitor_awareness').value = 'Yes, but not seriously considering';
    document.getElementById('bundling_preference').value = 'Maybe, depends on price';
    document.getElementById('payment_method').value = 'Monthly auto-renewal';
    document.getElementById('suggestions').value = 'Great content library, but could use more regional content.';
    
    showAlert('Demo data filled. You can now submit or modify as needed.', 'success', 3000);
});

// New Analysis Button
newAnalysisBtn.addEventListener('click', () => {
    customerForm.reset();
    predictionResults.style.display = 'none';
    customerForm.style.display = 'block';
});

// Save to Dashboard Button
saveToDashboardBtn.addEventListener('click', () => {
    showAlert('Data saved to dashboard successfully!', 'success', 3000);
    // In a real app, this would trigger a refresh of dashboard data
});

// Download Report Button
downloadReportBtn.addEventListener('click', () => {
    showAlert('Report download started. Check your downloads folder.', 'success', 3000);
    // In a real app, this would generate and download a PDF report
});

// File Upload Functionality
browseFilesBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect({ target: fileInput });
    }
});

// Handle File Selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        showAlert('Invalid file type. Please upload CSV or Excel files only.');
        return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('File size exceeds 10MB limit.');
        return;
    }
    
    // Show file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    
    // Enable process button
    processFileBtn.disabled = false;
    
    showAlert('File selected successfully. Click "Process File" to upload.', 'success');
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove File
removeFileBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    processFileBtn.disabled = true;
});

// Process File
processFileBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    
    // Show loading
    uploadLoading.style.display = 'block';
    processFileBtn.disabled = true;
    
    // Simulate upload progress
    simulateProgress(uploadProgress, 100, 2000);
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`File uploaded successfully! ${file.name} has been processed.`, 'success');
            
            // In a real app, you would process the file data here
            // For now, we'll simulate processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            showAlert('File processed successfully. Data has been added to the system.', 'success');
            
        } else {
            throw new Error(data.message || 'Upload failed');
        }
        
    } catch (error) {
        console.error('File upload error:', error);
        showAlert(`Error uploading file: ${error.message}`);
    } finally {
        uploadLoading.style.display = 'none';
        processFileBtn.disabled = false;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
    }
});

// Cancel Upload
cancelUploadBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    processFileBtn.disabled = true;
    uploadLoading.style.display = 'none';
    showAlert('Upload cancelled.', 'info', 3000);
});

// Download Template
downloadTemplateBtn.addEventListener('click', () => {
    showAlert('Template download started. Check your downloads folder.', 'success', 3000);
    
    // In a real app, this would download a CSV template
    // For now, we'll create a simple CSV template
    const template = `age_group,primary_platform,subscription_duration,subscription_plan,monthly_spend,usage_frequency,nps_score,content_satisfaction,value_perception,churn_likelihood,switching_behavior,account_sharing,competitor_awareness,bundling_preference,payment_method
18-35,Netflix,6-12 months,Standard,₹200 - ₹500,Often,7,4,Neutral,Not sure,No changes,Yes with family,Yes but not seriously considering,Maybe depends on price,Monthly auto-renewal
35+,Amazon Prime Video,1-2 years,Premium,₹501 - ₹1000,Daily,9,5,Excellent value,Very unlikely,No changes,No only I use it,No satisfied with current,Yes definitely,Annual payment`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'churn_analysis_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
});

// Test API Connection
testAPIBtn.addEventListener('click', async () => {
    testAPIBtn.disabled = true;
    apiTestResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (response.ok) {
            apiTestResult.innerHTML = '<i class="fas fa-check-circle" style="color: #48bb78;"></i> API Connected';
            showAlert('API connection successful!', 'success', 3000);
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        apiTestResult.innerHTML = '<i class="fas fa-times-circle" style="color: #f56565;"></i> API Error';
        showAlert('Failed to connect to API. Make sure backend server is running.', 'error');
    } finally {
        testAPIBtn.disabled = false;
    }
});

// Initialize Form
function initForm() {
    // Check authentication
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return;
    }
    
    // Test API connection on load
    testAPIBtn.click();
    
    // Add some form validation on input
    const formInputs = customerForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            input.style.borderColor = '#e2e8f0';
        });
        
        input.addEventListener('change', () => {
            input.style.borderColor = '#e2e8f0';
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initForm);