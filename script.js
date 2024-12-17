// Authentication
const CORRECT_PASSWORD = 'PalasseDigital';
let isAuthenticated = false;
let currentData = null;

// Initialize charts with null values
let charts = {
    clientGrowthChart: null,
    clientPerformanceHistory: null,
    competitorGrowthChart: null,
    competitorMarketShare: null
};

function parseDate(dateStr) {
    if (!dateStr) return moment();
    try {
        return moment(dateStr);
    } catch (error) {
        console.error('Date parsing error:', error);
        return moment();
    }
}

function checkAuth() {
    const auth = sessionStorage.getItem('dashboardAuth');
    if (auth === 'true') {
        isAuthenticated = true;
        hideLoginScreen();
        initDashboard();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    const loginOverlay = document.getElementById('loginOverlay');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const loading = document.getElementById('loading');
    
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
    if (loading) loading.classList.add('hidden');
}

function hideLoginScreen() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.add('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt');
    
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    
    if (!passwordInput) {
        console.error('Password input not found');
        return;
    }
    
    const password = passwordInput.value;
    console.log('Checking password...');
    
    if (password === CORRECT_PASSWORD) {
        console.log('Login successful');
        isAuthenticated = true;
        sessionStorage.setItem('dashboardAuth', 'true');
        hideLoginScreen();
        initDashboard();
    } else {
        console.log('Login failed - incorrect password');
        if (loginError) loginError.classList.remove('hidden');
        passwordInput.value = '';
    }
}

function handleLogout() {
    isAuthenticated = false;
    sessionStorage.removeItem('dashboardAuth');
    showLoginScreen();
    console.log('Logged out');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function initDashboard() {
    try {
        toggleLoading(true);
        
        // Check if required libraries are loaded
        if (typeof echarts === 'undefined') {
            throw new Error('ECharts library not loaded');
        }
        if (typeof moment === 'undefined') {
            throw new Error('Moment.js library not loaded');
        }
        
        const response = await fetch('./data/processed_followers.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        currentData = await response.json();
        
        initializeCharts();
        setupEventListeners();
        updateDashboard();
        
        toggleLoading(false);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="text-center">
                    <p class="text-red-500 mb-4">Error: ${error.message}</p>
                    <button onclick="initDashboard()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Retry
                    </button>
                </div>
            `;
        }
        toggleLoading(true);
    }
}

function toggleLoading(show) {
    const loading = document.getElementById('loading');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    if (loading) loading.classList.toggle('hidden', !show);
    if (dashboardContainer) dashboardContainer.classList.toggle('hidden', show);
}

function initializeCharts() {
    try {
        // Safely initialize each chart only if its container exists
        const chartContainers = {
            clientGrowthChart: 'clientGrowthChart',
            clientPerformanceHistory: 'clientPerformanceHistory',
            competitorGrowthChart: 'competitorGrowthChart',
            competitorMarketShare: 'competitorMarketShare'
        };

        Object.entries(chartContainers).forEach(([chartKey, containerId]) => {
            const container = document.getElementById(containerId);
            if (container) {
                charts[chartKey] = echarts.init(container);
            } else {
                console.warn(`Chart container ${containerId} not found`);
                charts[chartKey] = null;
            }
        });
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function setupEventListeners() {
    // Tab navigation
    const tabElements = {
        clientsTab: 'clients',
        weeklyTab: 'weekly',
        monthComparisonTab: 'monthComparison',
        competitorsTab: 'competitors'
    };
    
    Object.entries(tabElements).forEach(([elementId, tabName]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', () => switchTab(tabName));
        }
    });
    
    // Other buttons
    const buttonElements = {
        refreshBtn: initDashboard,
        exportBtn: exportData,
        logoutBtn: handleLogout
    };
    
    Object.entries(buttonElements).forEach(([elementId, handler]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
    
    // Window resize handling
    const resizeHandler = debounce(resizeCharts, 250);
    window.addEventListener('resize', resizeHandler);
}

function switchTab(tab) {
    // Hide all views first
    const views = ['clientsView', 'weeklyView', 'monthComparisonView', 'competitorsView'];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (element) element.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    const tabs = ['clientsTab', 'weeklyTab', 'monthComparisonTab', 'competitorsTab'];
    tabs.forEach(t => {
        const element = document.getElementById(t);
        if (element) element.classList.remove('tab-active');
    });
    
    // Show selected view and activate tab
    const selectedView = document.getElementById(`${tab}View`);
    const selectedTab = document.getElementById(`${tab}Tab`);
    
    if (selectedView) selectedView.classList.remove('hidden');
    if (selectedTab) selectedTab.classList.add('tab-active');
    
    // Resize charts if needed
    resizeCharts();
}

function resizeCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            try {
                chart.resize();
            } catch (error) {
                console.warn('Error resizing chart:', error);
            }
        }
    });
}

function updateDashboard() {
    if (!currentData) return;

    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = moment(currentData.lastUpdated).format('MMMM D, YYYY h:mm A');
    }
    
    if (currentData.clients?.data) {
        updateClientDashboard(currentData.clients);
        updateWeeklyPerformance(currentData.clients);
        setupMonthToMonthComparison(currentData.clients);
    }
    
    if (currentData.competitors?.data) {
        updateCompetitorDashboard(currentData.competitors);
    }
}

// Add all the other functions here (updateClientDashboard, updateWeeklyPerformance, etc.)
// ... (previous implementation remains the same)

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, adding event listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found');
    }
    checkAuth();
});
