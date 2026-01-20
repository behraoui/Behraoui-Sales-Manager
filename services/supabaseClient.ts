
import { createClient } from '@supabase/supabase-js';

// Access the global process shim defined in index.html safely
// This handles cases where 'process' might not be available in the browser scope directly
const globalProcess = (typeof process !== 'undefined' ? process : (window as any).process) || {};
const env = globalProcess.env || {};

const envUrl = env.SUPABASE_URL;
const envKey = env.SUPABASE_KEY;

// Validate URL to prevent "Failed to construct 'URL': Invalid URL" error
const isValidUrl = (urlString: string | undefined): boolean => {
    try {
        return !!urlString && !!new URL(urlString);
    } catch (e) {
        return false;
    }
};

// Use a valid placeholder URL if the env var is missing or invalid to prevent app crash
const supabaseUrl = isValidUrl(envUrl) ? envUrl! : 'https://placeholder.supabase.co';
const supabaseKey = envKey || 'placeholder-key';

if (!isValidUrl(envUrl) || !envKey) {
  console.warn("Supabase credentials missing or invalid in index.html. App running in offline/placeholder mode.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
