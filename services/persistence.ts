
// Service to handle data persistence with Netlify Database (Blobs)
// Falls back to LocalStorage if API is unreachable

const API_ENDPOINT = '/.netlify/functions/database';

interface AppData {
  projects?: any[];
  users?: any[];
  notifications?: any[];
  messages?: any[];
}

export const loadData = async (): Promise<AppData | null> => {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
        throw new Error('Database unreachable');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Running in offline mode (LocalStorage)');
    return null;
  }
};

// Debounce helper to prevent API spamming
let timeoutId: any;
export const saveData = (key: string, data: any) => {
  // Always save to LocalStorage immediately for offline support
  localStorage.setItem(`nexus_${key}`, JSON.stringify(data));

  // Debounce network request (save to cloud)
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });
      console.log(`Synced ${key} to database`);
    } catch (error) {
      console.error(`Failed to sync ${key} to database`);
    }
  }, 2000); // 2 second debounce
};
