// Device ID generation utility for persistent device identification
// Uses browser fingerprinting and localStorage for persistence

/**
 * Generates a persistent device ID that remains consistent for the same device/browser
 * Combines multiple browser characteristics to create a unique fingerprint
 */
export function generateDeviceId(): string {
  const STORAGE_KEY = 'restaurant_device_id';
  
  // First, check if we already have a stored device ID
  const storedDeviceId = localStorage.getItem(STORAGE_KEY);
  if (storedDeviceId) {
    return storedDeviceId;
  }

  // Generate new device ID based on browser fingerprinting
  const fingerprint = createBrowserFingerprint();
  const deviceId = `WEB_${fingerprint}`;
  
  // Store for future use
  localStorage.setItem(STORAGE_KEY, deviceId);
  
  return deviceId;
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

  // Combine all characteristics and create a hash
  const combined = characteristics.join('|');
  return hashString(combined).slice(0, 12); // Take first 12 characters
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
 * Get the current device ID (generates if doesn't exist)
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * Reset the device ID (for testing purposes)
 */
export function resetDeviceId(): void {
  localStorage.removeItem('restaurant_device_id');
}