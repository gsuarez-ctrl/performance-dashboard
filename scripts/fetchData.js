// scripts/fetchData.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Helper function to calculate month-over-month growth
function calculateGrowth(currentValue, previousValue) {
    if (!previousValue || previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
}

// Helper function to identify best and worst performers
function identifyPerformers(data) {
    const latestDate = data[data.length - 1].Date;
    const previousDate = data[data.length - 2]?.Date;
    
    if (!previousDate) return { best: null, worst: null, growthRates: {} };

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    let bestGrowth = -Infinity;
    let worstGrowth = Infinity;
    let bestAccount = '';
    let worstAccount = '';
    const growthRates = {};

    // Calculate growth rates for all accounts
    Object.keys(latest).forEach(key => {
        if (key !== 'Date' && latest[key] && previous[key]) {
            const growth = calculateGrowth(latest[key], previous[key]);
            growthRates[key] = growth;

            if (growth > bestGrowth) {
                bestGrowth = growth;
                bestAccount = key;
            }
            if (growth < worstGrowth) {
                worstGrowth = growth;
                worstAccount = key;
            }
        }
    });

    return {
        best: {
            account: bestAccount,
            growth: bestGrowth,
            currentFollowers: latest[bestAccount]
        },
        worst: {
            account: worstAccount,
            growth: worstGrowth,
            currentFollowers: latest[worstAccount]
        },
        growthRates
    };
}

// Helper function to track performance history
function trackPerformanceHistory(data) {
    const history = {
        bestPerformer: {},
        worstPerformer: {}
    };

    // Analyze each month's data
    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const previous = data[i - 1];
        const monthKey = new Date(current.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        let bestGrowth = -Infinity;
        let worstGrowth = Infinity;
        let bestAccount = '';
        let worstAccount = '';

        Object.keys(current).forEach(key => {
            if (key !== 'Date' && current[key] && previous[key]) {
                const growth = calculateGrowth(current[key], previous[key]);
                
                if (growth > bestGrowth) {
                    bestGrowth = growth;
                    bestAccount = key;
                }
                if (growth < worstGrowth) {
                    worstGrowth = growth;
                    worstAccount = key;
                }
            }
        });

        // Record monthly performance
        if (bestAccount) {
            history.bestPerformer[bestAccount] = (history.bestPerformer[bestAccount] || 0) + 1;
        }
        if (worstAccount) {
            history.worstPerformer[worstAccount] = (history.worstPerformer[worstAccount] || 0) + 1;
        }
    }

    return history;
}

async function fetchSheetData(sheets, spreadsheetId, range) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        
        return response.data.values;
    } catch (error) {
        console.error(`Error fetching ${range}:`, error);
        throw error;
    }
}

async function processData(rows, sheetName) {
    if (!rows || rows.length === 0) {
        throw new Error(`No data found in ${sheetName} sheet`);
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
        const entry = {};
        headers.forEach((header, index) => {
            if (index === 0) {
                // Convert date string to more readable format
                entry[header] = new Date(row[index]).toLocaleDateString();
            } else {
                entry[header] = row[index] ? Number(row[index]) : null;
            }
        });
        return entry;
    });

    // Calculate performance metrics
    const performers = identifyPerformers(data);
    const performanceHistory = trackPerformanceHistory(data);

    return {
        data,
        performers,
        performanceHistory
    };
}

async function fetchData() {
    try {
        console.log('Starting data fetch...');
        
        // Configure Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.SHEET_ID;
        
        // Fetch data from both sheets
        console.log('Fetching data from sheets...');
        const clientRows = await fetchSheetData(sheets, spreadsheetId, 'clients!A:Z');
        const competitorRows = await fetchSheetData(sheets, spreadsheetId, 'competitors!A:Z');

        // Process both datasets
        const clientData = await processData(clientRows, 'clients');
        const competitorData = await processData(competitorRows, 'competitors');

        // Combine data into a single structure
        const combinedData = {
            clients: clientData,
            competitors: competitorData,
            lastUpdated: new Date().toISOString()
        };

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write to data file
        const outputPath = path.join(dataDir, 'followers.json');
        fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
        
        console.log('Data successfully written to:', outputPath);
        console.log('Sample of processed data:', {
            clientSample: clientData.data[0],
            competitorSample: competitorData.data[0]
        });
        
    } catch (error) {
        console.error('Error in fetchData:', error);
        process.exit(1);
    }
}

fetchData();
