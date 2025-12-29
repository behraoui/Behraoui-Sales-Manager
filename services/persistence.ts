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
        // If 404, the function doesn't exist (local dev without netlify dev, or not deployed)
        console.warn(`Cloud Database unreachable (Status: ${response.status}). Falling back to local storage.`);
        return null;
    }
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    console.log("Data loaded from Netlify Database");
    return data;
  } catch (error) {
    console.warn('Running in offline mode (LocalStorage)', error);
    return null;
  }
};

// Debounce helper to prevent API spamming
let timeoutId: any;

export const saveData = (key: string, data: any) => {
  // 1. Always save to LocalStorage immediately for instant UI updates and offline support
  try {
    localStorage.setItem(`nexus_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage quota exceeded or error", e);
  }

  // 2. Debounce network request (save to cloud)
  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      console.log(`Synced ${key} to Netlify database`);
    } catch (error) {
      // Silent fail on network error, data is safe in localStorage
      console.error(`Failed to sync ${key} to database:`, error);
    }
  }, 2000); // 2 second debounce
};