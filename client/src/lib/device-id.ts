// Device ID generation utility for persistent device identification
// Uses browser fingerprinting and localStorage for persistence

/**
 * Generates a persistent device ID that remains consistent for the same device/browser
 * Combines multiple browser characteristics to create a unique fingerprint
 */
export function generateDeviceId(): string {
  const STORAGE_KEY = 'restaurant_device_id';
  const BACKUP_KEY = 'restaurant_device_backup';
  const COOKIE_KEY = 'rest_device_id';
  
  // Multiple fallback checks for maximum persistence
  let deviceId = localStorage.getItem(STORAGE_KEY) || 
                sessionStorage.getItem(STORAGE_KEY) ||
                getCookie(COOKIE_KEY);
  
  if (deviceId) {
    // Ensure it's stored in all locations for redundancy
    storeDeviceIdEverywhere(deviceId);
    return deviceId;
  }

  // Check backup storage
  const backupId = localStorage.getItem(BACKUP_KEY);
  if (backupId) {
    storeDeviceIdEverywhere(backupId);
    return backupId;
  }

  // Generate new device ID based on browser fingerprinting
  const fingerprint = createBrowserFingerprint();
  const newDeviceId = `WEB_${fingerprint}_${Date.now().toString(36)}`;
  
  // Store everywhere for maximum persistence
  storeDeviceIdEverywhere(newDeviceId);
  
  return newDeviceId;
}

/**
 * Creates a browser fingerprint based on various characteristics
 */
function createBrowserFingerprint(): string {
  const characteristics = [
    // Screen resolution
    `${screen.width}x${screen.height}`,
    
    // Color depth
    screen.colorDepth.toString(),
    
    // Timezone offset
    new Date().getTimezoneOffset().toString(),
    
    // User agent (simplified)
    navigator.userAgent.slice(0, 50),
    
    // Language
    navigator.language,
    
    // Platform
    navigator.platform,
    
    // Hardware concurrency (CPU cores)
    navigator.hardwareConcurrency?.toString() || '0',
    
    // Available fonts (basic check)
    getFontFingerprint(),
    
    // Canvas fingerprint (basic)
    getCanvasFingerprint()
  ];

  // Add timestamp-based component for additional uniqueness
  characteristics.push(Math.floor(Date.now() / (1000 * 60 * 60 * 24)).toString()); // Daily component
  
  // Combine all characteristics and create a hash
  const combined = characteristics.join('|');
  return hashString(combined).slice(0, 16); // Take first 16 characters for more uniqueness
}

/**
 * Basic font detection fingerprint
 */
function getFontFingerprint(): string {
  const testFonts = ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia'];
  const available = [];
  
  for (const font of testFonts) {
    if (isFontAvailable(font)) {
      available.push(font);
    }
  }
  
  return available.join(',');
}

/**
 * Check if a font is available
 */
function isFontAvailable(fontName: string): boolean {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return false;
  
  const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
  context.font = '11px monospace';
  const baseline = context.measureText(text).width;
  
  context.font = `11px ${fontName}, monospace`;
  const width = context.measureText(text).width;
  
  return width !== baseline;
}

/**
 * Basic canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    // Draw some basic shapes and text
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test 123', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillRect(100, 5, 80, 20);
    
    return canvas.toDataURL().slice(-50, -30); // Get a small portion of the data URL
  } catch {
    return 'canvas-error';
  }
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Store device ID in multiple locations for redundancy
 */
function storeDeviceIdEverywhere(deviceId: string): void {
  const STORAGE_KEY = 'restaurant_device_id';
  const BACKUP_KEY = 'restaurant_device_backup';
  const COOKIE_KEY = 'rest_device_id';
  
  try {
    // Primary storage
    localStorage.setItem(STORAGE_KEY, deviceId);
    
    // Backup in localStorage
    localStorage.setItem(BACKUP_KEY, deviceId);
    
    // Session storage as fallback
    sessionStorage.setItem(STORAGE_KEY, deviceId);
    
    // Cookie with 1 year expiration
    setCookie(COOKIE_KEY, deviceId, 365);
    
  } catch (error) {
    console.warn('Failed to store device ID:', error);
  }
}

/**
 * Set a cookie with expiration
 */
function setCookie(name: string, value: string, days: number): void {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (error) {
    console.warn('Failed to set cookie:', error);
  }
}

/**
 * Get a cookie value
 */
function getCookie(name: string): string | null {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (error) {
    console.warn('Failed to get cookie:', error);
  }
  return null;
}

/**
 * Get the current device ID (generates if doesn't exist)
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * Reset the device ID (for testing purposes)
 */
export function resetDeviceId(): void {
  const STORAGE_KEY = 'restaurant_device_id';
  const BACKUP_KEY = 'restaurant_device_backup';
  const COOKIE_KEY = 'rest_device_id';
  
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  setCookie(COOKIE_KEY, '', -1); // Delete cookie
}

/**
 * Check if device ID exists and is persistent
 */
export function isDeviceIdPersistent(): boolean {
  const deviceId = getDeviceId();
  return !!deviceId && deviceId.length > 0;
}