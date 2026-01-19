
import { createClient } from '@supabase/supabase-js';

// process.env is defined in index.html
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY;

// Validate URL to prevent "Failed to construct 'URL': Invalid URL" error
const isValidUrl = (urlString: string | undefined): boolean => {
    try {
        return !!urlString && !!new URL(urlString);
    } catch (e) {
        return false;
    }
};

// Use a valid placeholder URL if the env var is missing or invalid to prevent crash
const supabaseUrl = isValidUrl(envUrl) ? envUrl! : 'https://placeholder.supabase.co';
const supabaseKey = envKey || 'placeholder-key';

if (!isValidUrl(envUrl) || !envKey) {
  console.warn("Supabase credentials missing or invalid in index.html. App running in offline/placeholder mode.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
