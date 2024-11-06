const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

async function generateData() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A:P',
    });

    const rows = response.data.values || [];
    const [headers, ...dataRows] = rows;
    
    const processedData = {};
    
    headers.slice(1).forEach(account => {
      if (typeof account === 'string') {
        processedData[account] = [];
      }
    });

    dataRows.forEach(row => {
      const date = row[0];
      
      row.slice(1).forEach((value, index) => {
        const account = headers[index + 1];
        if (account && value !== undefined && value !== '') {
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue)) {
            processedData[account].push({
              date,
              value: numericValue
            });
          }
        }
      });
    });

    Object.keys(processedData).forEach(account => {
      processedData[account].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    // Ensure the public directory exists
    await fs.mkdir(path.join(process.cwd(), 'public'), { recursive: true });

    // Write the data to a JSON file
    await fs.writeFile(
      path.join(process.cwd(), 'public', 'data.json'),
      JSON.stringify(processedData, null, 2)
    );

    console.log('Data file generated successfully');
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

generateData();