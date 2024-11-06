import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
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
      range: 'A:P', // Get columns A through P
    });

    const rows = response.data.values || [];
    const [headers, ...dataRows] = rows;
    
    // Initialize processed data object
    const processedData = {};
    
    // Initialize accounts (columns B through P)
    headers.slice(1).forEach(account => {
      processedData[account] = [];
    });

    // Process each row
    dataRows.forEach(row => {
      const date = row[0]; // Column A is date
      
      // Process each account (starting from index 1 to skip date column)
      row.slice(1).forEach((value, index) => {
        const account = headers[index + 1];
        if (account && value !== undefined && value !== '') {
          processedData[account].push({
            date: date,
            value: parseFloat(value) || 0
          });
        }
      });
    });

    // Sort data points by date for each account
    Object.keys(processedData).forEach(account => {
      processedData[account].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return NextResponse.json(processedData);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}