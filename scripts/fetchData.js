const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function fetchSheetData(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SHEET_ID;

    try {
        // Fetch both client and competitor data with proper range formatting
        const [clientResponse, competitorResponse] = await Promise.all([
            sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'clients!A:Z'  // Updated range format
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'competitors!A:Z'  // Updated range format
            })
        ]);

        return {
            clients: clientResponse.data.values,
            competitors: competitorResponse.data.values
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

function processData(rows) {
    if (!rows || rows.length < 2) return null;

    const headers = rows[0];
    return rows.slice(1).map(row => {
        const entry = {};
        headers.forEach((header, index) => {
            if (index === 0) {
                entry[header] = row[index];
            } else {
                entry[header] = row[index] ? Number(row[index]) : null;
            }
        });
        return entry;
    });
}

function calculatePerformers(data) {
    if (!data || data.length < 2) {
        return { best: null, worst: null };
    }

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    let bestGrowth = -Infinity;
    let worstGrowth = Infinity;
    let bestPerformer = null;
    let worstPerformer = null;

    Object.keys(latest).forEach(account => {
        if (account !== 'Date' && latest[account] && previous[account]) {
            const growth = ((latest[account] - previous[account]) / previous[account]) * 100;
            
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

    return { best: bestPerformer, worst: worstPerformer };
}

function calculatePerformanceHistory(data) {
    const history = { bestPerformer: {}, worstPerformer: {} };
    
    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const previous = data[i - 1];
        let bestGrowth = -Infinity;
        let worstGrowth = Infinity;
        let bestAccount = '';
        let worstAccount = '';

        Object.keys(current).forEach(account => {
            if (account !== 'Date' && current[account] && previous[account]) {
                const growth = ((current[account] - previous[account]) / previous[account]) * 100;
                
                if (growth > bestGrowth) {
                    bestGrowth = growth;
                    bestAccount = account;
                }
                if (growth < worstGrowth) {
                    worstGrowth = growth;
                    worstAccount = account;
                }
            }
        });

        if (bestAccount) {
            history.bestPerformer[bestAccount] = (history.bestPerformer[bestAccount] || 0) + 1;
        }
        if (worstAccount) {
            history.worstPerformer[worstAccount] = (history.worstPerformer[worstAccount] || 0) + 1;
        }
    }

    return history;
}

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        console.log('Fetching data from sheets...');
        const sheetData = await fetchSheetData(auth);

        console.log('Processing client data...');
        const clientData = processData(sheetData.clients);
        console.log('Processing competitor data...');
        const competitorData = processData(sheetData.competitors);

        const processedData = {
            clients: {
                data: clientData,
                performers: calculatePerformers(clientData),
                performanceHistory: calculatePerformanceHistory(clientData)
            },
            competitors: {
                data: competitorData,
                performers: calculatePerformers(competitorData),
                performanceHistory: calculatePerformanceHistory(competitorData)
            },
            lastUpdated: new Date().toISOString()
        };

        const outputPath = path.join(__dirname, '../data/processed_followers.json');
        fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
        
        console.log('Data successfully processed');
        console.log('Output written to:', outputPath);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
