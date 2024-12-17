// Authentication
const CORRECT_PASSWORD = 'PalasseDigital';
let isAuthenticated = false;
let currentData = null;

// Initialize charts with null values
let charts = {
    clientGrowth: null,
    competitorGrowth: null,
    competitorMarket: null,
    monthlyComparison: null
};

// Parse date helper function
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
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
}

function hideLoginScreen() {
    document.getElementById('loginOverlay').classList.add('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    if (password === CORRECT_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('dashboardAuth', 'true');
        hideLoginScreen();
        initDashboard();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('password').value = '';
    }
}

function handleLogout() {
    isAuthenticated = false;
    sessionStorage.removeItem('dashboardAuth');
    showLoginScreen();
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
        
        const response = await fetch('./data/processed_followers.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        currentData = await response.json();
        
        initializeCharts();
        setupEventListeners();
        updateDashboard();
        
        toggleLoading(false);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        document.getElementById('loading').innerHTML = `
            <div class="text-center">
                <p class="text-red-500 mb-4">Error loading dashboard data: ${error.message}</p>
                <button onclick="initDashboard()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Retry
                </button>
            </div>
        `;
    }
}

function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('dashboardContainer').classList.toggle('hidden', show);
}

function setupEventListeners() {
    // Tab navigation
    document.getElementById('clientsTab').addEventListener('click', () => switchTab('clients'));
    document.getElementById('weeklyTab').addEventListener('click', () => switchTab('weekly'));
    document.getElementById('monthComparisonTab').addEventListener('click', () => switchTab('monthComparison'));
    document.getElementById('competitorsTab').addEventListener('click', () => switchTab('competitors'));
    
    // Other buttons
    document.getElementById('refreshBtn').addEventListener('click', initDashboard);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Window resize handling
    const resizeHandler = debounce(() => {
        Object.values(charts).forEach(chart => chart?.resize());
    }, 250);
    
    window.addEventListener('resize', resizeHandler);
}

function switchTab(tab) {
    // Hide all views first
    const views = ['clientsView', 'weeklyView', 'monthComparisonView', 'competitorsView'];
    views.forEach(view => document.getElementById(view).classList.add('hidden'));
    
    // Remove active class from all tabs
    const tabs = ['clientsTab', 'weeklyTab', 'monthComparisonTab', 'competitorsTab'];
    tabs.forEach(t => document.getElementById(t).classList.remove('tab-active'));
    
    // Show selected view and activate tab
    document.getElementById(`${tab}View`).classList.remove('hidden');
    document.getElementById(`${tab}Tab`).classList.add('tab-active');
    
    // Resize charts if needed
    resizeCharts();
}

function initializeCharts() {
    charts.clientGrowth = echarts.init(document.getElementById('clientGrowthChart'));
    charts.competitorGrowth = echarts.init(document.getElementById('competitorGrowthChart'));
    charts.competitorMarket = echarts.init(document.getElementById('competitorMarketChart'));
    charts.monthlyComparison = echarts.init(document.getElementById('monthlyComparisonChart'));
}

function resizeCharts() {
    Object.values(charts).forEach(chart => chart?.resize());
}

function updateDashboard() {
    if (!currentData) return;

    const lastUpdatedTime = moment(currentData.lastUpdated).format('MMMM D, YYYY h:mm A');
    document.getElementById('lastUpdated').textContent = lastUpdatedTime;
    
    if (currentData.clients?.data) {
        updateClientDashboard(currentData.clients);
        updateWeeklyPerformance(currentData.clients);
        setupMonthToMonthComparison(currentData.clients);
    }
    
    if (currentData.competitors?.data) {
        updateCompetitorDashboard(currentData.competitors);
    }
}

function updatePerformerCard(elementId, performer) {
    const element = document.getElementById(elementId);
    if (!element || !performer) return;
    
    const followerDifference = performer.currentFollowers - performer.previousFollowers;
    
    element.innerHTML = `
        <p class="text-sm text-gray-500">Date: ${moment(performer.date).format('MMMM D, YYYY')}</p>
        <p class="text-2xl font-bold">${performer.account}</p>
        <p class="text-gray-600">Current Followers: ${performer.currentFollowers.toLocaleString()}</p>
        <p class="text-gray-600">Follower Change: 
            <span class="${followerDifference >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${followerDifference >= 0 ? '+' : ''}${followerDifference.toLocaleString()}
            </span>
        </p>
    `;
}

function updateWeeklyPerformance(data) {
    if (!data?.data || data.data.length === 0) return;
    
    const tableBody = document.querySelector('#weeklyPerformanceTable tbody');
    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    
    // Group data by week
    const weeklyData = _.groupBy(data.data, item => 
        moment(item.Date).startOf('week').format('YYYY-MM-DD')
    );
    
    const rows = Object.entries(weeklyData).map(([weekStart, entries]) => {
        const weekEnd = moment(weekStart).endOf('week').format('MMM D');
        const weekStartFormatted = moment(weekStart).format('MMM D');
        
        const accountData = accounts.map(account => {
            const startValue = entries[0][account];
            const endValue = entries[entries.length - 1][account];
            const change = endValue - startValue;
            
            return `
                <td class="px-6 py-4">
                    <div class="text-sm">
                        <div>${endValue.toLocaleString()}</div>
                        <div class="${change >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${change >= 0 ? '+' : ''}${change.toLocaleString()}
                        </div>
                    </div>
                </td>
            `;
        }).join('');
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${weekStartFormatted} - ${weekEnd}
                </td>
                ${accountData}
            </tr>
        `;
    }).join('');
    
    // Create header
    const header = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
            ${accounts.map(account => `
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${account}
                </th>
            `).join('')}
        </tr>
    `;
    
    document.querySelector('#weeklyPerformanceTable thead').innerHTML = header;
    tableBody.innerHTML = rows;
}

function exportData() {
    const exportData = {
        timestamp: moment().format('YYYY-MM-DD_HH-mm'),
        data: currentData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social_media_analytics_${exportData.timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    checkAuth();
});
