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

        // Wait for a short delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        
        // Initialize charts only after ensuring DOM is ready
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
        
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
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('dashboardContainer').classList.toggle('hidden', show);
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
    document.getElementById('clientsTab').addEventListener('click', () => switchTab('clients'));
    document.getElementById('weeklyTab').addEventListener('click', () => switchTab('weekly'));
    document.getElementById('monthComparisonTab').addEventListener('click', () => switchTab('monthComparison'));
    document.getElementById('competitorsTab').addEventListener('click', () => switchTab('competitors'));
    
    // Other buttons
    document.getElementById('refreshBtn').addEventListener('click', initDashboard);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Window resize handling
    const resizeHandler = debounce(resizeCharts, 250);
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

function updateClientDashboard(data) {
    if (!data?.data || data.data.length === 0) return;

    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    
    // Calculate growth for each client
    const clients = Object.keys(latestData).filter(key => key !== 'Date');
    const growthData = clients.map(client => {
        const currentValue = latestData[client];
        const previousValue = previousData[client];
        const growth = currentValue - previousValue;
        return { client, currentValue, previousValue, growth };
    });

    // Sort by growth to find best and worst performers
    growthData.sort((a, b) => b.growth - a.growth);
    
    // Update performer cards
    updatePerformerCard('bestPerformerClient', {
        date: latestData.Date,
        account: growthData[0].client,
        currentFollowers: growthData[0].currentValue,
        previousFollowers: growthData[0].previousValue,
        growth: growthData[0].growth
    });
    
    updatePerformerCard('worstPerformerClient', {
        date: latestData.Date,
        account: growthData[growthData.length - 1].client,
        currentFollowers: growthData[growthData.length - 1].currentValue,
        previousFollowers: growthData[growthData.length - 1].previousValue,
        growth: growthData[growthData.length - 1].growth
    });

    // Update charts
    updateClientGrowthChart(data.data);
    updateClientPerformanceChart(data.data);
}

function updatePerformerCard(elementId, performer) {
    const element = document.getElementById(elementId);
    if (!element || !performer) return;
    
    const followerDifference = performer.currentFollowers - performer.previousFollowers;
    
    element.innerHTML = `
        <p class="text-sm text-gray-500">Date: ${moment(performer.date).format('MMMM D, YYYY')}</p>
        <p class="text-2xl font-bold">${performer.account}</p>
        <p class="text-gray-600">Current Followers: ${performer.currentFollowers.toLocaleString()}</p>
        <p class="text-gray-600">Previous Followers: ${performer.previousFollowers.toLocaleString()}</p>
        <p class="text-gray-600">Follower Change: 
            <span class="${followerDifference >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${followerDifference >= 0 ? '+' : ''}${followerDifference.toLocaleString()}
            </span>
        </p>
    `;
}

function updateClientGrowthChart(data) {
    if (!charts.clientGrowthChart || !data || data.length === 0) return;
    
    const months = data.map(d => moment(d.Date).format('MMM YYYY'));
    const clients = Object.keys(data[0]).filter(key => key !== 'Date');
    
    const series = clients.map(client => ({
        name: client,
        type: 'line',
        data: data.map(d => d[client]),
        smooth: true
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return params.reduce((acc, param) => {
                    return acc + `${param.seriesName}: ${param.value.toLocaleString()}<br>`;
                }, `${params[0].axisValue}<br>`);
            }
        },
        legend: {
            type: 'scroll',
            bottom: 0,
            data: clients
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months,
            boundaryGap: false
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: val => val.toLocaleString()
            }
        },
        series: series
    };

    charts.clientGrowthChart.setOption(option);
}

function updateClientPerformanceChart(data) {
    if (!charts.clientPerformanceHistory || !data || data.length < 2) return;
    
    const clients = Object.keys(data[0]).filter(key => key !== 'Date');
    const followerChanges = clients.map(client => {
        const changes = [];
        for (let i = 1; i < data.length; i++) {
            const change = data[i][client] - data[i-1][client];
            changes.push(change);
        }
        return changes;
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: ['Monthly Follower Change'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: clients,
            axisLabel: {
                interval: 0,
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: 'Follower Change',
            axisLabel: {
                formatter: val => val.toLocaleString()
            }
        },
        series: [{
            name: 'Monthly Follower Change',
            type: 'bar',
            data: followerChanges.map(changes => {
                const avgChange = changes.reduce((sum, val) => sum + val, 0) / changes.length;
                return Math.round(avgChange);
            }),
            itemStyle: {
                color: params => {
                    const value = params.value;
                    return value >= 0 ? '#10B981' : '#EF4444';
                }
            }
        }]
    };

    charts.clientPerformanceHistory.setOption(option);
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
    
    const headerElement = document.querySelector('#weeklyPerformanceTable thead');
    if (headerElement) headerElement.innerHTML = header;
    if (tableBody) tableBody.innerHTML = rows;
}

function setupMonthToMonthComparison(data) {
    if (!data?.data || data.data.length < 2) return;

    const accountSelect = document.getElementById('accountSelect');
    const monthSelect1 = document.getElementById('monthSelect1');
    const monthSelect2 = document.getElementById('monthSelect2');

    // Get accounts and dates
    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    const dates = data.data.map(d => ({
        value: d.Date,
        label: moment(d.Date).format('MMMM YYYY')
    }));

    // Populate account dropdown
    accountSelect.innerHTML = accounts.map(account => 
        `<option value="${account}">${account}</option>`
    ).join('');

    // Populate month dropdowns
    const monthOptions = dates.map(date => 
        `<option value="${date.value}">${date.label}</option>`
    ).join('');
    monthSelect1.innerHTML = monthOptions;
    monthSelect2.innerHTML = monthOptions;

    // Set default selections
    monthSelect2.selectedIndex = dates.length - 1;  // Latest month
    monthSelect1.selectedIndex = dates.length - 2;  // Previous month

    // Add event listeners
    const updateComparison = () => {
        const account = accountSelect.value;
        const month1Data = data.data.find(d => d.Date === monthSelect1.value);
