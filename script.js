// Authentication
const CORRECT_PASSWORD = 'PalasseDigital';
let isAuthenticated = false;

// Initialize charts
let charts = {
    clientGrowth: null,
    monthlyComparison: null,
    competitorGrowth: null
};

let currentData = null;

// Parse date helper function
function parseDate(dateStr) {
    if (!dateStr) return moment();
    try {
        return moment(dateStr, 'M/D/YYYY');
    } catch (error) {
        console.error('Date parsing error:', error);
        return moment();
    }
}

function setupMonthToMonthComparison(data) {
    if (!data || data.length < 2) return;

    const accountSelect = document.getElementById('accountSelect');
    const monthSelect1 = document.getElementById('monthSelect1');
    const monthSelect2 = document.getElementById('monthSelect2');

    // Get accounts and dates
    const accounts = Object.keys(data[0]).filter(key => key !== 'Date');
    const monthlyData = aggregateMonthlyData(data);
    const dates = monthlyData.map(d => ({
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
    monthSelect2.selectedIndex = dates.length - 1;
    monthSelect1.selectedIndex = dates.length - 2;

    // Add event listeners
    const updateComparison = () => {
        const account = accountSelect.value;
        const month1Data = monthlyData.find(d => d.Date === monthSelect1.value);
        const month2Data = monthlyData.find(d => d.Date === monthSelect2.value);

        if (month1Data && month2Data && month1Data[account] && month2Data[account]) {
            const followers1 = month1Data[account];
            const followers2 = month2Data[account];
            const difference = followers2 - followers1;
            const growth = ((followers2 - followers1) / followers1) * 100;

            document.getElementById('monthComparisonResult').innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">${moment(monthSelect1.value).format('MMMM YYYY')}</h4>
                        <p class="text-xl font-bold mt-1">${followers1.toLocaleString()}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">${moment(monthSelect2.value).format('MMMM YYYY')}</h4>
                        <p class="text-xl font-bold mt-1">${followers2.toLocaleString()}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">Follower Change</h4>
                        <p class="text-xl font-bold mt-1 ${difference >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${difference >= 0 ? '+' : ''}${difference.toLocaleString()}
                        </p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">Growth Rate</h4>
                        <p class="text-xl font-bold mt-1 ${growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%
                        </p>
                    </div>
                </div>
            `;
        }
    };

    accountSelect.addEventListener('change', updateComparison);
    monthSelect1.addEventListener('change', updateComparison);
    monthSelect2.addEventListener('change', updateComparison);

    updateComparison();
}

function setupWeekToWeekComparison(data) {
    if (!data || data.length < 2) return;

    const weeklyAccountSelect = document.getElementById('weeklyAccountSelect');
    const weekSelect1 = document.getElementById('weekSelect1');
    const weekSelect2 = document.getElementById('weekSelect2');

    const accounts = Object.keys(data[0]).filter(key => key !== 'Date');
    const dates = data.map(d => ({
    value: d.Date,
    label: moment(d.Date, 'MM/DD/YYYY', true).format('MMM D, YYYY')
    }));

    weeklyAccountSelect.innerHTML = accounts.map(account => 
        `<option value="${account}">${account}</option>`
    ).join('');

    const weekOptions = dates.map(date => 
        `<option value="${date.value}">${date.label}</option>`
    ).join('');
    weekSelect1.innerHTML = weekOptions;
    weekSelect2.innerHTML = weekOptions;

    weekSelect2.selectedIndex = dates.length - 1;
    weekSelect1.selectedIndex = dates.length - 2;

    const updateWeekComparison = () => {
        const account = weeklyAccountSelect.value;
        const week1Data = data.find(d => d.Date === weekSelect1.value);
        const week2Data = data.find(d => d.Date === weekSelect2.value);

        if (week1Data && week2Data && week1Data[account] && week2Data[account]) {
            const followers1 = week1Data[account];
            const followers2 = week2Data[account];
            const difference = followers2 - followers1;
            const growth = ((followers2 - followers1) / followers1) * 100;

            document.getElementById('weekComparisonResult').innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">${moment(weekSelect1.value, 'M/D/YYYY').format('MMM D, YYYY')}</h4>
                        <p class="text-xl font-bold mt-1">${followers1.toLocaleString()}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">${moment(weekSelect2.value, 'M/D/YYYY').format('MMM D, YYYY')}</h4>
                        <p class="text-xl font-bold mt-1">${followers2.toLocaleString()}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">Follower Change</h4>
                        <p class="text-xl font-bold mt-1 ${difference >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${difference >= 0 ? '+' : ''}${difference.toLocaleString()}
                        </p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <h4 class="text-sm font-medium text-gray-500">Growth Rate</h4>
                        <p class="text-xl font-bold mt-1 ${growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%
                        </p>
                    </div>
                </div>
            `;
        }
    };

    weeklyAccountSelect.addEventListener('change', updateWeekComparison);
    weekSelect1.addEventListener('change', updateWeekComparison);
    weekSelect2.addEventListener('change', updateWeekComparison);

    updateWeekComparison();
}

function aggregateMonthlyData(data) {
    const monthlyData = {};
    
    data.forEach(entry => {
        if (!entry.Date) return;
        const parsedDate = moment(entry.Date, 'MM/DD/YYYY', true);
        if (!parsedDate.isValid()) return;
        
        const monthKey = parsedDate.format('YYYY-MM-01');
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { Date: monthKey };
            Object.keys(entry).forEach(key => {
                if (key !== 'Date') {
                    monthlyData[monthKey][key] = entry[key];
                }
            });
        }
    });

    return Object.values(monthlyData).sort((a, b) => moment(a.Date).diff(moment(b.Date)));
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
    return function executedFunction(...args) {
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
        toggleLoading(true);
    }
}

function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('dashboardContainer').classList.toggle('hidden', show);
}

function setupEventListeners() {
    document.getElementById('clientsTab').addEventListener('click', () => switchTab('clients'));
    document.getElementById('weeklyTab').addEventListener('click', () => switchTab('weekly'));
    document.getElementById('monthlyTab').addEventListener('click', () => switchTab('monthly'));
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
    const tabs = {
        clients: ['clientsTab', 'clientsView'],
        weekly: ['weeklyTab', 'weeklyView'],
        monthly: ['monthlyTab', 'monthlyView'],
        competitors: ['competitorsTab', 'competitorsView']
    };
    
    // Remove active class from all tabs and hide all views
    Object.values(tabs).flat().forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('Tab')) {
                element.classList.remove('tab-active');
            } else {
                element.classList.add('hidden');
            }
        }
    });
    
    // Activate selected tab and view
    const [tabId, viewId] = tabs[tab];
    document.getElementById(tabId).classList.add('tab-active');
    document.getElementById(viewId).classList.remove('hidden');
    
    resizeCharts();
}

function initializeCharts() {
    charts.clientGrowth = echarts.init(document.getElementById('clientGrowthChart'));
    charts.monthlyComparison = echarts.init(document.getElementById('monthlyComparisonChart'));
    charts.competitorGrowth = echarts.init(document.getElementById('competitorGrowthChart'));
}

function resizeCharts() {
    Object.values(charts).forEach(chart => chart?.resize());
}

function updateDashboard() {
    if (!currentData) return;

    const lastUpdatedTime = moment().format('MMMM D, YYYY h:mm A');
    document.getElementById('lastUpdated').textContent = lastUpdatedTime;
    
    if (currentData.clients?.data) {
        updateClientDashboard(currentData.clients);
        setupMonthToMonthComparison(currentData.clients.data);
        setupWeekToWeekComparison(currentData.clients.data);
    }
    if (currentData.competitors?.data) updateCompetitorDashboard(currentData.competitors);
}

function updateClientDashboard(data) {
    if (!data?.performers?.best || !data?.performers?.worst) return;
    
    updatePerformerCard('bestPerformerClient', data.performers.best, data.performanceHistory.bestPerformer);
    updatePerformerCard('worstPerformerClient', data.performers.worst, data.performanceHistory.worstPerformer);
    if (data.data && data.data.length > 0) {
        updateIndividualScorecards(data);
        updateClientGrowthChart(data.data);
        updateMonthlyComparison(data);
        updateMonthlySummary(data);
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
        const followerDifference = currentValue - previousValue;
        const growth = ((currentValue - previousValue) / previousValue) * 100;
        const timesBest = data.performanceHistory.bestPerformer[account] || 0;
        const timesWorst = data.performanceHistory.worstPerformer[account] || 0;
        
        return `
            <div class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
                <h4 class="font-bold text-lg mb-2">${account}</h4>
                <div class="space-y-2">
                    <p class="text-gray-600">Current Followers: <span class="font-medium">${currentValue.toLocaleString()}</span></p>
                    <p class="text-gray-600">Previous Month: <span class="font-medium">${previousValue.toLocaleString()}</span></p>
                    <p class="text-gray-600">Follower Growth: 
                        <span class="${followerDifference >= 0 ? 'text-green-500' : 'text-red-500'} font-medium">
                            ${followerDifference >= 0 ? '+' : ''}${followerDifference.toLocaleString()} followers
                        </span>
                    </p>
                    <p class="text-gray-600">Growth Rate: 
                        <span class="${growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                            ${growth > 0 ? '+' : ''}${growth.toFixed(2)}%
                        </span>
                    </p>
                    <div class="text-sm text-gray-500 pt-2 border-t border-gray-200 mt-2">
                        <p>Times Best: ${timesBest}</p>
                        <p>Times Worst: ${timesWorst}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateMonthlySummary(data) {
    if (!data?.data || data.data.length < 2) return;
    
    const lastTwoMonths = data.data.slice(-2);
    const accounts = Object.keys(lastTwoMonths[0]).filter(key => key !== 'Date');
    
    const growthData = accounts.map(account => {
        const currentValue = lastTwoMonths[1][account];
        const previousValue = lastTwoMonths[0][account];
        const growth = ((currentValue - previousValue) / previousValue) * 100;
        return { account, growth, currentValue, previousValue };
    });

    growthData.sort((a, b) => b.growth - a.growth);

    const mostImproved = growthData[0];
    document.getElementById('mostImproved').innerHTML = `
        <p class="font-medium">${mostImproved.account}</p>
        <p class="text-green-500">+${mostImproved.growth.toFixed(2)}%</p>
        <p class="text-sm text-gray-500">${mostImproved.currentValue.toLocaleString()} followers</p>
    `;

    const needsFocus = growthData[growthData.length - 1];
    document.getElementById('needsFocus').innerHTML = `
        <p class="font-medium">${needsFocus.account}</p>
        <p class="text-red-500">${needsFocus.growth.toFixed(2)}%</p>
        <p class="text-sm text-gray-500">${needsFocus.currentValue.toLocaleString()} followers</p>
    `;

    const totalPrevious = growthData.reduce((sum, item) => sum + item.previousValue, 0);
    const totalCurrent = growthData.reduce((sum, item) => sum + item.currentValue, 0);
    const overallGrowth = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    
    document.getElementById('overallGrowth').innerHTML = `
        <p class="font-medium">All Accounts</p>
        <p class="${overallGrowth >= 0 ? 'text-green-500' : 'text-red-500'}">
            ${overallGrowth > 0 ? '+' : ''}${overallGrowth.toFixed(2)}%
        </p>
        <p class="text-sm text-gray-500">
            ${totalCurrent.toLocaleString()} total followers
        </p>
    `;
}

function updateCompetitorDashboard(data) {
    if (!data?.performers?.best || !data?.performers?.worst) return;
    
    updatePerformerCard('bestPerformerCompetitor', data.performers.best);
    updatePerformerCard('worstPerformerCompetitor', data.performers.worst);
    if (data.data && data.data.length > 0) {
        updateCompetitorGrowthChart(data.data);
        updateCompetitorComparisonTable(data);
    }
}

function updateMonthlyComparison(data) {
    if (!data?.data || data.data.length < 2) return;
    
    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    const lastTwoMonths = data.data.slice(-2);
    
    const growthData = accounts.map(account => {
        const currentValue = lastTwoMonths[1][account];
        const previousValue = lastTwoMonths[0][account];
        const growth = ((currentValue - previousValue) / previousValue) * 100;
        return { account, growth };
    });

    growthData.sort((a, b) => b.growth - a.growth);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: params => `${params[0].name}<br/>Growth: ${params[0].value.toFixed(2)}%`
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: growthData.map(d => d.account),
            axisLabel: {
                interval: 0,
                rotate: 45
            }
        },
        yAxis: {
            type: 'value',
            name: 'Growth %',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: [{
            type: 'bar',
            data: growthData.map(d => d.growth),
            itemStyle: {
                color: params => {
                    const value = params.value;
                    return value >= 0 ? '#10B981' : '#EF4444';
                }
            }
        }]
    };

    charts.monthlyComparison.setOption(option);
}

function updateClientGrowthChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => moment(d.Date, 'MM/DD/YYYY', true).format('MMM D, YYYY'));
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

function updateCompetitorGrowthChart(data) {
    if (!data || !data.length) return;
    
    const months = data.map(d => moment(d.Date, 'MM/DD/YYYY', true).format('MMM D, YYYY'));
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

function calculateGrowthRates(data, account) {
    return data.map((current, index) => {
        if (index === 0) return 0;
        const previous = data[index - 1][account];
        return ((current[account] - previous) / previous) * 100;
    });
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
