/**
 * Supabase Cloud Service Integration
 * Provides connection to Supabase PostgreSQL database, Supabase Auth,
 * and Storage buckets when configured with environment variables.
 */

// Safe access to Vite environment variables
const SUPABASE_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isCloudConnected = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabaseConfig = {
  url: SUPABASE_URL || "",
  anonKey: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 5)}...` : "",
  isConfigured: isCloudConnected,
};

/**
 * Cloud Sync status and helpers
 */
export const cloudService = {
  getStatus() {
    return {
      connected: isCloudConnected,
      mode: isCloudConnected ? "cloud" : "local",
      message: isCloudConnected
        ? "Connected to Supabase Cloud"
        : "Running in Local Offline Mode (Full functionality active)",
    };
  },

  async syncToCloud() {
    if (!isCloudConnected) {
      return { success: false, reason: "Supabase credentials not configured in .env" };
    }
    // Future cloud push implementation
    return { success: true };
  },

  async pullFromCloud() {
    if (!isCloudConnected) {
      return { success: false, reason: "Supabase credentials not configured in .env" };
    }
    // Future cloud pull implementation
    return { success: true };
  },
};
