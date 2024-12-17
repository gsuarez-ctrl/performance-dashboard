// Authentication
const CORRECT_PASSWORD = 'PalasseDigital';
let isAuthenticated = false;
let currentData = null;

// Initialize charts
let charts = {
    competitorGrowth: null
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
    document.getElementById('clientsTab')?.addEventListener('click', () => switchTab('clients'));
    document.getElementById('monthComparisonTab')?.addEventListener('click', () => switchTab('monthComparison'));
    document.getElementById('weeklyTab')?.addEventListener('click', () => switchTab('weekly'));
    document.getElementById('competitorsTab')?.addEventListener('click', () => switchTab('competitors'));
    document.getElementById('refreshBtn')?.addEventListener('click', initDashboard);
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    const resizeHandler = debounce(() => {
        Object.values(charts).forEach(chart => chart?.resize());
    }, 250);
    
    window.addEventListener('resize', resizeHandler);
}

function switchTab(tab) {
    // Hide all views
    document.getElementById('clientsView')?.classList.add('hidden');
    document.getElementById('monthComparisonView')?.classList.add('hidden');
    document.getElementById('weeklyView')?.classList.add('hidden');
    document.getElementById('competitorsView')?.classList.add('hidden');

    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('tab-active'));

    // Show selected view and activate tab
    switch(tab) {
        case 'clients':
            document.getElementById('clientsView')?.classList.remove('hidden');
            document.getElementById('clientsTab')?.classList.add('tab-active');
            break;
        case 'monthComparison':
            document.getElementById('monthComparisonView')?.classList.remove('hidden');
            document.getElementById('monthComparisonTab')?.classList.add('tab-active');
            break;
        case 'weekly':
            document.getElementById('weeklyView')?.classList.remove('hidden');
            document.getElementById('weeklyTab')?.classList.add('tab-active');
            break;
        case 'competitors':
            document.getElementById('competitorsView')?.classList.remove('hidden');
            document.getElementById('competitorsTab')?.classList.add('tab-active');
            break;
    }

    // Resize charts if necessary
    Object.values(charts).forEach(chart => chart?.resize());
}

function initializeCharts() {
    if (document.getElementById('competitorGrowthChart')) {
        charts.competitorGrowth = echarts.init(document.getElementById('competitorGrowthChart'));
    }
}

function updateDashboard() {
    if (!currentData) return;

    const lastUpdatedTime = moment(currentData.lastUpdated).format('MMMM D, YYYY h:mm A');
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = lastUpdatedTime;
    }
    
    if (currentData.clients?.data) {
        updateClientDashboard(currentData.clients);
        updateMonthToMonthComparison(currentData.clients);
        updateWeeklyPerformance(currentData.clients);
    }
    if (currentData.competitors?.data) {
        updateCompetitorDashboard(currentData.competitors);
    }
}

function updateClientDashboard(data) {
    if (!data?.data || data.data.length < 2) return;
    
    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    const accounts = Object.keys(latestData).filter(key => key !== 'Date');
    
    // Calculate growth for each account in absolute numbers
    const growthData = accounts.map(account => ({
        account,
        currentFollowers: latestData[account],
        previousFollowers: previousData[account],
        growth: latestData[account] - previousData[account]
    }));

    // Sort by growth
    growthData.sort((a, b) => b.growth - a.growth);
    
    // Update performer cards with exact date
    const dataDate = moment(latestData.Date).format('MMMM D, YYYY');
    
    updatePerformerCard('bestPerformerClient', {
        account: growthData[0].account,
        growth: growthData[0].growth,
        currentFollowers: growthData[0].currentFollowers,
        dataDate: dataDate
    });
    
    updatePerformerCard('worstPerformerClient', {
        account: growthData[growthData.length - 1].account,
        growth: growthData[growthData.length - 1].growth,
        currentFollowers: growthData[growthData.length - 1].currentFollowers,
        dataDate: dataDate
    });

    updateHistoricalPerformanceTable(data);
}

function updateHistoricalPerformanceTable(data) {
    const table = document.getElementById('historicalPerformanceTable');
    if (!table) return;

    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    
    // Create headers for each month
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
        ${data.data.map(entry => `
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${moment(entry.Date).format('MMM YYYY')}
            </th>
        `).join('')}
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Growth</th>
    `;
    const thead = table.querySelector('thead');
    if (thead) {
        thead.innerHTML = '';
        thead.appendChild(headerRow);
    }

    // Create rows for each account
    const tbody = table.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = accounts.map(account => {
            const monthlyData = data.data.map(entry => entry[account]);
            const monthlyGrowth = monthlyData.map((followers, index) => 
                index === 0 ? 0 : followers - monthlyData[index - 1]
            ).slice(1);
            const avgGrowth = Math.round(monthlyGrowth.reduce((a, b) => a + b, 0) / monthlyGrowth.length);
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium">${account}</td>
                    ${monthlyData.map(followers => `
                        <td class="px-6 py-4 whitespace-nowrap">${followers.toLocaleString()}</td>
                    `).join('')}
                    <td class="px-6 py-4 whitespace-nowrap">${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }
}

function updateWeeklyPerformance(data) {
    const table = document.getElementById('weeklyPerformanceTable');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const accounts = Object.keys(data.data[0]).filter(key => key !== 'Date');
    
    // Process data for weekly view
    const weeklyRows = [];
    accounts.forEach(account => {
        data.data.forEach((entry, index) => {
            const currentFollowers = entry[account];
            const previousFollowers = index > 0 ? data.data[index - 1][account] : currentFollowers;
            const weeklyChange = currentFollowers - previousFollowers;
            
            weeklyRows.push({
                account,
                date: entry.Date,
                followers: currentFollowers,
                change: weeklyChange
            });
        });
    });
    
    // Sort by date (newest first) and account
    weeklyRows.sort((a, b) => {
        const dateCompare = moment(b.date).valueOf() - moment(a.date).valueOf();
        return dateCompare || a.account.localeCompare(b.account);
    });
    
    tbody.innerHTML = weeklyRows.map(row => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">${row.account}</td>
            <td class="px-6 py-4 whitespace-nowrap">${moment(row.date).format('MMMM D, YYYY')}</td>
            <td class="px-6 py-4 whitespace-nowrap">${row.followers.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${row.change >= 0 ? '+' : ''}${row.change.toLocaleString()}
            </td>
        </tr>
    `).join('');
}

function updatePerformerCard(elementId, performer) {
    const element = document.getElementById(elementId);
    if (!element || !performer) return;
    
    element.innerHTML = `
        <p class="text-2xl font-bold">${performer.account}</p>
        <p class="text-gray-600">Growth: 
            <span class="${performer.growth >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${performer.growth >= 0 ? '+' : ''}${performer.growth.toLocaleString()} followers
            </span>
        </p>
        <p class="text-sm text-gray-500">Data from: ${performer.dataDate}</p>
        <div class="mt-2 text-sm text-gray-500">
            <p>Current Followers: <span class="font-medium">${performer.currentFollowers.toLocaleString()}</span></p>
        </div>
    `;
}

function updateMonthToMonthComparison(data) {
    if (!data?.data || data.data.length < 2) return;

    const accountSelect = document.getElementById('accountSelect');
    const monthSelect1 = document.getElementById('monthSelect1');
    const monthSelect2 = document.getElementById('monthSelect2');

    if (!accountSelect || !monthSelect1 || !monthSelect2) return;

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
        const month2Data = data.data.find(d => d.Date === monthSelect2.value);
        const comparisonResult = document.getElementById('monthComparisonResult');

        if (month1Data && month2Data && comparisonResult) {
            const followers1 = month1Data[account];
            const followers2 = month2Data[account];
            const difference = followers2 - followers1;

            comparisonResult.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
            `;
        }
    };

    accountSelect.addEventListener('change', updateComparison);
    monthSelect1.addEventListener('change', updateComparison);
    monthSelect2.addEventListener('change', updateComparison);

    // Initial comparison
    updateComparison();
}

function updateCompetitorDashboard(data) {
    if (!data?.data || data.data.length < 2) return;
    
    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    const competitors = Object.keys(latestData).filter(key => key !== 'Date');
    
    // Calculate growth for each competitor in absolute numbers
    const growthData = competitors.map(competitor => ({
        competitor,
        currentFollowers: latestData[competitor],
        previousFollowers: previousData[competitor],
        growth: latestData[competitor] - previousData[competitor]
    }));

    // Sort by growth
    growthData.sort((a, b) => b.growth - a.growth);
    
    // Update competitor cards
    updateCompetitorCard('bestPerformerCompetitor', {
        account: growthData[0].competitor,
        growth: growthData[0].growth,
        currentFollowers: growthData[0].currentFollowers
    });
    
    updateCompetitorCard('worstPerformerCompetitor', {
        account: growthData[growthData.length - 1].competitor,
        growth: growthData[growthData.length - 1].growth,
        currentFollowers: growthData[growthData.length - 1].currentFollowers
    });

    // Update competitor growth chart
    updateCompetitorGrowthChart(data);
    
    // Update competitor comparison table
    updateCompetitorComparisonTable(data);
}

function updateCompetitorCard(elementId, competitor) {
    const element = document.getElementById(elementId);
    if (!element || !competitor) return;
    
    element.innerHTML = `
        <p class="text-2xl font-bold">${competitor.account}</p>
        <p class="text-gray-600">Growth: 
            <span class="${competitor.growth >= 0 ? 'text-blue-500' : 'text-gray-500'}">
                ${competitor.growth >= 0 ? '+' : ''}${competitor.growth.toLocaleString()} followers
            </span>
        </p>
        <div class="mt-2 text-sm text-gray-500">
            <p>Current Followers: <span class="font-medium">${competitor.currentFollowers.toLocaleString()}</span></p>
        </div>
    `;
}

function updateCompetitorGrowthChart(data) {
    if (!data?.data || !data.data.length || !charts.competitorGrowth) return;
    
    const months = data.data.map(d => moment(d.Date).format('MMM YYYY'));
    const competitors = Object.keys(data.data[0]).filter(key => key !== 'Date');
    
    const series = competitors.map(competitor => {
        const values = data.data.map((entry, index) => {
            if (index === 0) return 0;
            const currentValue = entry[competitor];
            const previousValue = data.data[index - 1][competitor];
            return currentValue - previousValue;
        });
        
        return {
            name: competitor,
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8
        };
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return params.reduce((acc, param) => {
                    return acc + `${param.seriesName}: ${param.value >= 0 ? '+' : ''}${param.value.toLocaleString()} followers<br>`;
                }, `${params[0].axisValue}<br>`);
            }
        },
        legend: {
            type: 'scroll',
            bottom: 0,
            data: competitors
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
                formatter: value => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`
            }
        },
        series: series
    };

    charts.competitorGrowth.setOption(option);
}

function updateCompetitorComparisonTable(data) {
    if (!data?.data || !data.data.length) return;
    
    const tableBody = document.querySelector('#competitorComparisonTable tbody');
    if (!tableBody) return;

    const latestData = data.data[data.data.length - 1];
    const previousData = data.data[data.data.length - 2];
    const competitors = Object.keys(latestData).filter(key => key !== 'Date');
    
    tableBody.innerHTML = competitors.map(competitor => {
        const currentFollowers = latestData[competitor];
        const previousFollowers = previousData[competitor];
        const growth = currentFollowers - previousFollowers;
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${competitor}</td>
                <td class="px-6 py-4">${currentFollowers.toLocaleString()}</td>
                <td class="px-6 py-4 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${growth >= 0 ? '+' : ''}${growth.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');
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

// Initialize app when DOM is ready
function initializeApp() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    checkAuth();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
