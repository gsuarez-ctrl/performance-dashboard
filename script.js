// Initialize charts
let charts = {
    clientGrowth: null,
    clientPerformance: null,
    competitorGrowth: null,
    competitorMarket: null
};

let currentData = null;

// Initialize dashboard
async function initDashboard() {
    try {
        toggleLoading(true);
        const response = await fetch('/data/followers.json');
        currentData = await response.json();
        
        initializeCharts();
        setupEventListeners();
        updateDashboard();
        
        toggleLoading(false);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        alert('Error loading dashboard data');
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
    
    window.addEventListener('resize', debounceResize);
}

const debounceResize = _.debounce(() => {
    Object.values(charts).forEach(chart => chart?.resize());
}, 250);

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
    
    updateClientDashboard(currentData.clients);
    updateCompetitorDashboard(currentData.competitors);
}

function updateClientDashboard(data) {
    updatePerformerCard('bestPerformerClient', data.performers.best, data.performanceHistory.bestPerformer);
    updatePerformerCard('worstPerformerClient', data.performers.worst, data.performanceHistory.worstPerformer);
    updateClientGrowthChart(data.data);
    updateClientPerformanceChart(data.performanceHistory);
    updateClientHistoryTable(data);
}

function updateCompetitorDashboard(data) {
    updatePerformerCard('bestPerformerCompetitor', data.performers.best);
    updatePerformerCard('worstPerformerCompetitor', data.performers.worst);
    updateCompetitorGrowthChart(data.data);
    updateCompetitorMarketChart(data.data);
    updateCompetitorComparisonTable(data);
}

function updatePerformerCard(elementId, performer, history = null) {
    const element = document.getElementById(elementId);
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
    const months = data.map(d => moment(d.Date).format('MMM YYYY'));
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
    const months = data.map(d => moment(d.Date).format('MMM YYYY'));
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
    const months = data.map(d => moment(d.Date).format('MMM YYYY'));
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
document.addEventListener('DOMContentLoaded', initDashboard);
