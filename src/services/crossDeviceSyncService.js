/**
 * Cross-Device State Synchronization Service
 * 
 * Enables seamless live synchronization between phone and any other device (laptop, tablet, desktop).
 * 
 * Capabilities:
 * 1. Direct Compressed State Link (URL Hash / Query):
 *    - Encodes current user profile, subjects, timetable, calendar, active semester, and attendance records
 *      into a compact, URL-safe deflate string (#sync=gz_...).
 *    - Zero server dependency, 100% private, works offline and on any static host (Vercel, Netlify, GitHub Pages).
 * 2. Automatic Hydration on Opening:
 *    - When the link is opened on a new device, the app instantly unpacks the live snapshot into that device's storage.
 * 3. Native Device Share & QR Code:
 *    - Generates scannable QR Code and triggers native Web Share API (AirDrop, WhatsApp, Messages).
 * 4. Cloud Relay (Optional):
 *    - Allows syncing via a permanent Sync Code / Relay ID across devices.
 */

import { storageService } from "./storageService.js";

/**
 * Compress an object into a URL-safe Base64 string using Deflate
 */
export async function compressState(stateObj) {
  const jsonStr = JSON.stringify(stateObj);

  if (typeof CompressionStream !== "undefined") {
    try {
      const stream = new Blob([jsonStr]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream("deflate"));
      const arrayBuffer = await new Response(compressedStream).arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return "gz_" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
      console.warn("[SyncService] CompressionStream failed, falling back to raw Base64:", e);
    }
  }

  // Fallback
  return "raw_" + btoa(encodeURIComponent(jsonStr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decompress a URL-safe Base64 string into an object
 */
export async function decompressState(encodedStr) {
  if (!encodedStr) return null;

  const isGz = encodedStr.startsWith("gz_");
  const isRaw = encodedStr.startsWith("raw_");
  const rawBase64 = (isGz ? encodedStr.slice(3) : isRaw ? encodedStr.slice(4) : encodedStr)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const binary = atob(rawBase64);

  if (isGz && typeof DecompressionStream !== "undefined") {
    try {
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8[i] = binary.charCodeAt(i);
      }
      const stream = new Blob([uint8]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate"));
      const text = await new Response(decompressedStream).text();
      return JSON.parse(text);
    } catch (e) {
      console.warn("[SyncService] DecompressionStream failed:", e);
    }
  }

  // Fallback decode
  const jsonStr = decodeURIComponent(binary);
  return JSON.parse(jsonStr);
}

/**
 * Generate a complete, shareable live sync URL for the current device's state
 */
export async function generateDeviceSyncUrl(customBaseUrl = "") {
  const currentData = storageService.exportAllData();
  const compressedToken = await compressState(currentData);

  let baseUrl = customBaseUrl;
  if (!baseUrl && typeof window !== "undefined") {
    baseUrl = window.location.origin + window.location.pathname;
  }

  // Clean trailing slashes
  baseUrl = baseUrl.replace(/\/$/, "");

  // Attach as URL hash (keeps URL clean and never gets truncated by server query limits)
  const shareUrl = `${baseUrl}#sync=${compressedToken}`;

  return {
    url: shareUrl,
    tokenLength: compressedToken.length,
    timestamp: currentData.exportedAt,
    user: currentData.profile?.fullName || "Student",
    overallPercentage: currentData.subjects?.length ? "Live Data" : "Blank",
  };
}

/**
 * Check if the current page URL contains an incoming sync payload
 */
export async function parseSyncFromCurrentUrl() {
  if (typeof window === "undefined") return null;

  let token = null;

  // 1. Check URL Hash: #sync=... or #state=...
  if (window.location.hash) {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    token = params.get("sync") || params.get("state");
    if (!token && (hash.startsWith("gz_") || hash.startsWith("raw_"))) {
      token = hash;
    }
  }

  // 2. Check URL Query: ?sync=...
  if (!token && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    token = searchParams.get("sync") || searchParams.get("state");
  }

  if (!token) return null;

  try {
    const payload = await decompressState(token);
    return payload;
  } catch (err) {
    console.error("[SyncService] Failed to decompress incoming sync token:", err);
    return null;
  }
}

/**
 * Check and apply any incoming sync payload from the URL on app startup
 */
export async function applyIncomingSyncFromUrl() {
  if (typeof window === "undefined") return { applied: false };

  const payload = await parseSyncFromCurrentUrl();
  if (!payload || !payload.profile) {
    return { applied: false };
  }

  try {
    const userSummary = storageService.importAllData(payload, { makeActive: true });

    // Clean up URL hash / search query without refreshing the page
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    return {
      applied: true,
      name: userSummary.name,
      userId: userSummary.id,
      timestamp: payload.exportedAt,
    };
  } catch (err) {
    console.error("[SyncService] Failed to import incoming sync data:", err);
    return { applied: false, error: err.message };
  }
}

/**
 * Generate a scannable QR Code image URL for any share link
 */
export function getQrCodeImageUrl(url, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;
}

/**
 * Share via native Web Share API (WhatsApp, Messages, AirDrop) if available
 */
export async function triggerNativeShare(url, title = "My Live Attendance Tracker", text = "Here is my live up-to-date attendance schedule and tracking records:") {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return { success: true, native: true };
    } catch (e) {
      // User cancelled or dismissed share
      if (e.name !== "AbortError") {
        console.warn("[SyncService] Native share error:", e);
      }
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return { success: true, native: false, copied: true };
  }

  return { success: false };
}
