// Authentication
const CORRECT_PASSWORD = 'PalasseDigital';
let isAuthenticated = false;

// Initialize charts
let charts = {
    clientGrowth: null,
    clientPerformance: null,
    growthComparison: null,
    competitorGrowth: null,
    competitorMarket: null
};

let currentData = null;

// Parse date helper function
function parseDate(dateStr) {
    if (!dateStr) return moment();
    try {
        // Check if date is already in ISO format
        if (dateStr.includes('-')) {
            return moment(dateStr);
        }
        // Parse MM/DD/YYYY format
        const [month, day, year] = dateStr.split('/');
        if (!month || !day || !year) {
            console.error('Invalid date format:', dateStr);
            return moment();
        }
        return moment(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } catch (error) {
        console.error('Date parsing error:', error);
        return moment();
    }
}

// Check if user is already authenticated
function checkAuth() {
    const auth = sessionStorage.getItem('dashboardAuth');
    if (auth === 'true') {
        console.log('Found existing auth');
        isAuthenticated = true;
        hideLoginScreen();
        initDashboard();
    } else {
        console.log('No existing auth found');
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
    console.log('Login attempt');
    
    if (password === CORRECT_PASSWORD) {
        console.log('Login successful');
        isAuthenticated = true;
        sessionStorage.setItem('dashboardAuth', 'true');
        hideLoginScreen();
        initDashboard();
    } else {
        console.log('Login failed - incorrect password');
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('password').value = '';
    }
}

function handleLogout() {
    isAuthenticated = false;
    sessionStorage.removeItem('dashboardAuth');
    showLoginScreen();
    console.log('Logged out');
}

// Simple debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize dashboard
async function initDashboard() {
    try {
        toggleLoading(true);
        console.log('Fetching data...');
        
        const response = await fetch('./data/processed_followers.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentData = await response.json();
        console.log('Data loaded:', currentData);
        
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
        toggleLoading(true);
    }
}

function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('dashboardContainer').classList.toggle('hidden', show);
}

function setupEventListeners() {
    document.getElementById('clientsTab').addEventListener('click', () => switchTab('clients'));
    document.getElementById('competitorsTab').addEventListener('click', () => switchTab('competitors'));
    document.getElementById('refreshBtn').addEventListener('click', initDashboard);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    const resizeHandler = debounce(() => {
        Object.values(charts).forEach(chart => chart?.resize());
    }, 250);
    
    window.addEventListener('resize', resizeHandler);
}

function switchTab(tab) {
    const isClients = tab === 'clients';
    document.getElementById('clientsTab').classList.toggle('tab-active', isClients);
    document.getElementById('competitorsTab').classList.toggle('tab-active', !isClients);
    document.getElementById('clientsView').classList.toggle('hidden', !isClients);
    document.getElementById('competitorsView').classList.toggle('hidden', isClients);
    resizeCharts();
}

function initializeCharts() {
    charts.clientGrowth = echarts.init(document.getElementById('clientGrowthChart'));
    charts.clientPerformance = echarts.init(document.getElementById('clientPerformanceHistory'));
    charts.growthComparison = echarts.init(document.getElementById('growthComparisonChart'));
    charts.competitorGrowth = echarts.init(document.getElementById('competitorGrowthChart'));
    charts.competitorMarket = echarts.init(document.getElementById('competitorMarketShare'));
}

function resizeCharts() {
    Object.values(charts).forEach(chart => chart?.resize());
}

function updateDashboard() {
    if (!currentData) return;
    
    document.getElementById('lastUpdated').textContent = 
        moment(currentData.lastUpdated).format('MMMM D, YYYY h:mm A');
    
    if (currentData.clients) updateClientDashboard(currentData.clients);
    if (currentData.competitors) updateCompetitorDashboard(currentData.competitors);
}

function updateClientDashboard(data) {
    if (!data?.performers?.best || !data?.performers?.worst) return;
    
    updatePerformerCard('bestPerformerClient', data.performers.best, data.performanceHistory.bestPerformer);
    updatePerformerCard('worstPerformerClient', data.performers.worst, data.performanceHistory.worstPerformer);
    if (data.data && data.data.length > 0) {
        updateIndividualScorecards(data);
        updateClientGrowthChart(data.data);
        updateGrowthComparisonChart(data.data);
        updateClientHistoryTable(data);
    }
    if (data.performanceHistory) {
        updateClientPerformanceChart(data.performanceHistory);
    }
}

function updateCompetitorDashboard(data) {
    if (!data?.performers?.best || !data?.performers?.worst) return;
    
    updatePerformerCard('bestPerformerCompetitor', data.performers.best);
    updatePerformerCard('worstPerformerCompetitor', data.performers.worst);
    if (data.data && data.data.length > 0) {
        updateCompetitorGrowthChart(data.data);
        updateCompetitorMarketChart(data.data);
        updateCompetitorComparisonTable(data);
    }
}

function updateIndividualScorecards(data) {
    if (!data?.data || !data.data.length) return;
    
    const container = document.getElementById('individualScorecardsContainer');
    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    
    container.innerHTML = accounts.map(account => {
        const currentValue = latestData[account];
        const previousValue = previousData[account];
        const growth = ((currentValue - previousValue) / previousValue) * 100;
        const timesBest = data.performanceHistory.bestPerformer[account] || 0;
        const timesWorst = data.performanceHistory.worstPerformer[account] || 0;
        
        return `
            <div class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
                <h4 class="font-bold text-lg mb-2">${account}</h4>
                <div class="space-y-2">
                    <p class="text-gray-600">Current Followers: <span class="font-medium">${currentValue.toLocaleString()}</span></p>
                    <p class="text-gray-600">Growth: 
                        <span class="${growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${growth > 0 ? '+' : ''}${growth.toFixed(2)}%
                        </span>
                    </p>
                    <div class="text-sm text-gray-500">
                        <p>Times Best: ${timesBest}</p>
                        <p>Times Worst: ${timesWorst}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateGrowthComparisonChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => parseDate(d.Date).format('MMM YYYY'));
    const accounts = Object.keys(data[0]).filter(key => key !== 'Date');
    
    const series = accounts.map(account => {
        const values = data.map((entry, index) => {
            if (index === 0) return 0;
            const currentValue = entry[account];
            const previousValue = data[index - 1][account];
            return ((currentValue - previousValue) / previousValue) * 100;
        });
        
        return {
            name: account,
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            emphasis: {
                focus: 'series'
            }
        };
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return params.reduce((acc, param) => {
                    return acc + `${param.seriesName}: ${param.value.toFixed(2)}%<br>`;
                }, `${params[0].axisValue}<br>`);
            }
        },
        legend: {
            type: 'scroll',
            bottom: 0,
            data: accounts
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
            name: 'Growth %',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: series
    };

    charts.growthComparison.setOption(option);
}

function updatePerformerCard(elementId, performer, history = null) {
    const element = document.getElementById(elementId);
    if (!element || !performer) return;
    
    const historyCount = history ? history[performer.account] || 0 : null;
    
    element.innerHTML = `
        <p class="text-2xl font-bold">${performer.account}</p>
        <p class="text-gray-600">Growth: 
            <span class="${performer.growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${performer.growth > 0 ? '+' : ''}${performer.growth.toFixed(2)}%
            </span>
        </p>
        ${history !== null ? `
            <p class="text-sm text-gray-500">
                ${elementId.includes('best') ? 'Times as best performer: ' : 'Times needing attention: '}
                ${historyCount}
            </p>
        ` : ''}
        <div class="mt-2 text-sm text-gray-500">
            <p>Current Followers: <span class="font-medium">${performer.currentFollowers.toLocaleString()}</span></p>
        </div>
    `;
}

function updateClientGrowthChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => parseDate(d.Date).format('MMM YYYY'));
    const accounts = Object.keys(data[0]).filter(key => key !== 'Date');
    
    const series = accounts.map(account => ({
        name: account,
        type: 'line',
        data: calculateGrowthRates(data, account),
        smooth: true
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return params.reduce((acc, param) => {
                    return acc + `${param.seriesName}: ${param.value.toFixed(2)}%<br>`;
                }, `${params[0].axisValue}<br>`);
            }
        },
        legend: {
            type: 'scroll',
            bottom: 0,
            data: accounts
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months
        },
        yAxis: {
            type: 'value',
            name: 'Growth %',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: series
    };

    charts.clientGrowth.setOption(option);
}

function updateClientPerformanceChart(history) {
    if (!history) return;
    
    const accounts = Object.keys(history.bestPerformer);
    const bestData = accounts.map(account => history.bestPerformer[account] || 0);
    const worstData = accounts.map(account => history.worstPerformer[account] || 0);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: ['Best Performance', 'Needs Attention'],
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
            data: accounts,
            axisLabel: {
                interval: 0,
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: 'Times'
        },
        series: [
            {
                name: 'Best Performance',
                type: 'bar',
                data: bestData,
                itemStyle: { color: '#10B981' }
            },
            {
                name: 'Needs Attention',
                type: 'bar',
                data: worstData,
                itemStyle: { color: '#EF4444' }
            }
        ]
    };

    charts.clientPerformance.setOption(option);
}

function updateCompetitorGrowthChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => parseDate(d.Date).format('MMM YYYY'));
    const competitors = Object.keys(data[0]).filter(key => key !== 'Date');
    
    const series = competitors.map(competitor => ({
        name: competitor,
        type: 'line',
        data: calculateGrowthRates(data, competitor),
        smooth: true
    }));

    const option = {
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            type: 'scroll',
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
            data: months
        },
        yAxis: {
            type: 'value',
            name: 'Growth %'
        },
        series: series
    };

    charts.competitorGrowth.setOption(option);
}

function updateCompetitorMarketChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => parseDate(d.Date).format('MMM YYYY'));
    const competitors = Object.keys(data[0]).filter(key => key !== 'Date');
    
    const series = competitors.map(competitor => ({
        name: competitor,
        type: 'line',
        stack: 'total',
        areaStyle: {},
        emphasis: {
            focus: 'series'
        },
        data: data.map(d => d[competitor])
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        legend: {
            type: 'scroll',
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
            boundaryGap: false,
            data: months
        },
        yAxis: {
            type: 'value'
        },
        series: series
    };

    charts.competitorMarket.setOption(option);
}

function calculateGrowthRates(data, account) {
    return data.map((current, index) => {
        if (index === 0) return 0;
        const previous = data[index - 1][account];
        return ((current[account] - previous) / previous) * 100;
    });
}

function updateClientHistoryTable(data) {
    if (!data?.data || !data.data.length) return;
    
    const tableBody = document.querySelector('#clientHistoryTable tbody');
    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    
    tableBody.innerHTML = accounts.map(account => {
        const timesBest = data.performanceHistory.bestPerformer[account] || 0;
        const timesWorst = data.performanceHistory.worstPerformer[account] || 0;
        const avgGrowth = calculateAverageGrowth(data.data, account);
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${account}</td>
                <td class="px-6 py-4">${timesBest}</td>
                <td class="px-6 py-4">${timesWorst}</td>
                <td class="px-6 py-4 ${avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${avgGrowth.toFixed(2)}%
                </td>
            </tr>
        `;
    }).join('');
}

function updateCompetitorComparisonTable(data) {
    if (!data?.data || !data.data.length) return;
    
    const tableBody = document.querySelector('#competitorComparisonTable tbody');
    const latestData = data.data[data.data.length - 1];
    const competitors = Object.keys(latestData).filter(key => key !== 'Date');
    const totalFollowers = competitors.reduce((sum, comp) => sum + latestData[comp], 0);
    
    tableBody.innerHTML = competitors.map(competitor => {
        const marketShare = (latestData[competitor] / totalFollowers) * 100;
        const growth = calculateGrowthRate(data.data, competitor);
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${competitor}</td>
                <td class="px-6 py-4">${latestData[competitor].toLocaleString()}</td>
                <td class="px-6 py-4 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${growth.toFixed(2)}%
                </td>
                <td class="px-6 py-4">${marketShare.toFixed(2)}%</td>
            </tr>
        `;
    }).join('');
}

function calculateAverageGrowth(data, account) {
    const growthRates = data.map((current, index) => {
        if (index === 0) return 0;
        const previous = data[index - 1][account];
        return ((current[account] - previous) / previous) * 100;
    }).slice(1);
    
    return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
}

function calculateGrowthRate(data, account) {
    const current = data[data.length - 1][account];
    const previous = data[data.length - 2][account];
    return ((current - previous) / previous) * 100;
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
