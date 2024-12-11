// scripts/fetchData.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function calculateGrowth(current, previous) {
    return previous ? ((current - previous) / previous) * 100 : 0;
}

function processRawData(data, accounts) {
    if (!data || data.length < 2) {
        return {
            data: [],
            performers: {
                best: null,
                worst: null
            },
            performanceHistory: {
                bestPerformer: {},
                worstPerformer: {}
            }
        };
    }

    // Get latest and previous entries
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    // Initialize best/worst trackers
    let bestGrowth = -Infinity;
    let worstGrowth = Infinity;
    let bestPerformer = null;
    let worstPerformer = null;

    // Calculate current period growth rates
    Object.keys(latest).forEach(account => {
        if (account !== 'Date' && latest[account] && previous[account]) {
            const growth = calculateGrowth(latest[account], previous[account]);
            
            if (growth > bestGrowth) {
                bestGrowth = growth;
                bestPerformer = {
                    account,
                    growth,
                    currentFollowers: latest[account]
                };
            }
            if (growth < worstGrowth) {
                worstGrowth = growth;
                worstPerformer = {
                    account,
                    growth,
                    currentFollowers: latest[account]
                };
            }
        }
    });

    // Track performance history
    const performanceHistory = {
        bestPerformer: {},
        worstPerformer: {}
    };

    // Calculate historical performance
    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const prev = data[i - 1];
        let monthBest = { growth: -Infinity };
        let monthWorst = { growth: Infinity };

        Object.keys(current).forEach(account => {
            if (account !== 'Date' && current[account] && prev[account]) {
                const growth = calculateGrowth(current[account], prev[account]);
                
                if (growth > monthBest.growth) {
                    monthBest = { account, growth };
                }
                if (growth < monthWorst.growth) {
                    monthWorst = { account, growth };
                }
            }
        });

        if (monthBest.account) {
            performanceHistory.bestPerformer[monthBest.account] = 
                (performanceHistory.bestPerformer[monthBest.account] || 0) + 1;
        }
        if (monthWorst.account) {
            performanceHistory.worstPerformer[monthWorst.account] = 
                (performanceHistory.worstPerformer[monthWorst.account] || 0) + 1;
        }
    }

    return {
        data,
        performers: {
            best: bestPerformer,
            worst: worstPerformer
        },
        performanceHistory
    };
}

async function fetchData() {
    try {
        console.log('Starting data processing...');
        
        // Read the raw JSON file
        const rawDataPath = path.join(__dirname, '../data/followers.json');
        const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
        
        // Define account groups
        const clientAccounts = [
            "reddymadedesign", "rottetcollection", "lrottet", "rottetstudio",
            "StudioCAHS", "caterinahstewart", "lucreziabuccellati", 
            "lindsaybartonbarrett", "forddrive", "alfredoparedesstudio",
            "bobbyanspachstudiosfoundation", "liveone38", "200e20th",
            "williamsburgwharf", "westwharfbk", "aspromisedmag"
        ];

        const competitorAccounts = [
            "centralparktower", "waldorfnyc", "111west57st",
            "jdsdevelopmentgroup", "thebrooklyntower", "onedominosquare",
            "greenpointlanding"
        ];

        // Split data into client and competitor datasets
        const clientData = rawData.map(entry => {
            const clientEntry = { Date: entry.Date };
            clientAccounts.forEach(account => {
                if (entry[account] !== undefined) clientEntry[account] = entry[account];
            });
            return clientEntry;
        });

        const competitorData = rawData.map(entry => {
            const competitorEntry = { Date: entry.Date };
            competitorAccounts.forEach(account => {
                if (entry[account] !== undefined) competitorEntry[account] = entry[account];
            });
            return competitorEntry;
        });

        // Process both datasets
        const processedData = {
            clients: processRawData(clientData, clientAccounts),
            competitors: processRawData(competitorData, competitorAccounts),
            lastUpdated: new Date().toISOString()
        };

        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write processed data
        const outputPath = path.join(dataDir, 'processed_followers.json');
        fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
        
        console.log('Data successfully processed');
        console.log('Output written to:', outputPath);
        
    } catch (error) {
        console.error('Error processing data:', error);
        process.exit(1);
    }
}

// Execute the script
fetchData();
