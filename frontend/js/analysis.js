<body>
    <!-- Navigation will be loaded by app.js -->
    <div id="navbar-container"></div>
    
    <!-- Your analysis page content here -->
    
    <!-- Footer will be loaded by app.js -->
    <div id="footer-container"></div>
    
    <script>
        // Load navigation and footer
        fetch('components/navbar.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('navbar-container').innerHTML = data;
                // Initialize navigation after loading
                if (window.App && window.App.setupNavigation) {
                    window.App.setupNavigation();
                }
            })
            .catch(error => {
                console.error('Error loading navbar:', error);
                // Fallback: Create simple navigation
                document.getElementById('navbar-container').innerHTML = `
                    <nav class="navbar">
                        <div class="container">
                            <a href="index.html" class="logo">
                                <i class="fas fa-chart-line"></i>
                                <span>AI Churn Analysis</span>
                            </a>
                        </div>
                    </nav>
                `;
            });
        
        fetch('components/footer.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('footer-container').innerHTML = data;
            })
            .catch(error => {
                console.error('Error loading footer:', error);
            });
    </script>
    
    <!-- Your existing scripts -->
    <script src="js/analysis.js"></script>
</body>