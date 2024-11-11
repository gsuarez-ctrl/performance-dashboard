// scripts/fetchData.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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
        
        console.log('Fetching from sheet ID:', process.env.SHEET_ID);
        
        // Fetch data from Google Sheet - make sure range matches your sheet name
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'followers!A:Q',  // Make sure this matches your sheet name
        });

        const rows = response.data.values;
        
        if (!rows || rows.length === 0) {
            throw new Error('No data found in sheet');
        }

        console.log(`Found ${rows.length} rows of data`);

        // Process the data
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const entry = {};
            headers.forEach((header, index) => {
                if (index === 0) {
                    // Convert date string to more readable format
                    entry[header] = new Date(row[index]).toLocaleDateString();
                } else if (!header.includes('Change') && !header.includes('Weekly')) {
                    // Only include follower counts, not change or weekly percentage
                    entry[header] = row[index] ? Number(row[index]) : null;
                }
            });
            return entry;
        });

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write to data file
        const outputPath = path.join(dataDir, 'followers.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        
        console.log('Data successfully written to:', outputPath);
        console.log('Sample of processed data:', data[0]);
        
    } catch (error) {
        console.error('Error in fetchData:', error);
        process.exit(1);
    }
}

fetchData();