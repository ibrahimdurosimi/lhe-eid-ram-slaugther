import { Booking } from './types';
import { getAccessToken } from './firebaseAuth';

export const SPREADSHEET_ID_KEY = 'booking_spreadsheet_id';

export async function createSpreadsheet(title: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Bookings',
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create spreadsheet');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize header row
  await appendRow(spreadsheetId, ['Timestamp', 'House', 'SubUnit', 'Date', 'Slot']);

  return spreadsheetId;
}

export async function getBookings(spreadsheetId: string): Promise<Booking[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!A:E`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Spreadsheet not found. It may have been deleted.');
    }
    throw new Error('Failed to fetch bookings');
  }

  const data = await response.json();
  const rows = data.values || [];

  if (rows.length <= 1) return []; // Only header exists or empty

  // Skip header row
  return rows.slice(1).map((row: any[]) => ({
    timestamp: row[0] || '',
    house: row[1] || '',
    subUnit: row[2] || '',
    date: row[3] || '',
    slot: row[4] || '',
  }));
}

export async function appendRow(spreadsheetId: string, values: string[]): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Bookings!A:E:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to append row');
  }
}
