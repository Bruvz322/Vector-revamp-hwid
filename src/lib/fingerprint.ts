// Browser fingerprinting utilities

export interface FingerprintData {
  fingerprint: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  colorDepth: number;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  touchSupport: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  canvas: string;
  webglVendor: string;
  webglRenderer: string;
  fonts: string[];
  plugins: string[];
  audioContext: string;
}

// Generate canvas fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unavailable';
    
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas', 4, 17);
    
    return canvas.toDataURL().slice(-50);
  } catch {
    return 'unavailable';
  }
}

// Get WebGL info
function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: 'unavailable', renderer: 'unavailable' };
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { vendor: 'unavailable', renderer: 'unavailable' };
    
    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unavailable',
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unavailable',
    };
  } catch {
    return { vendor: 'unavailable', renderer: 'unavailable' };
  }
}

// Get installed fonts (basic detection)
function getInstalledFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Comic Sans MS',
    'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
    'Lucida Console', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman',
    'Trebuchet MS', 'Verdana'
  ];
  
  const detected: string[] = [];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return detected;
  
  const getWidth = (font: string) => {
    ctx.font = `${testSize} ${font}`;
    return ctx.measureText(testString).width;
  };
  
  const baseWidths = baseFonts.map(getWidth);
  
  for (const font of testFonts) {
    for (let i = 0; i < baseFonts.length; i++) {
      const width = getWidth(`'${font}', ${baseFonts[i]}`);
      if (width !== baseWidths[i]) {
        detected.push(font);
        break;
      }
    }
  }
  
  return detected;
}

// Get plugins list
function getPlugins(): string[] {
  const plugins: string[] = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins;
}

// Get audio context fingerprint
function getAudioFingerprint(): string {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gain = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.start(0);
    
    const fingerprint = analyser.frequencyBinCount.toString();
    
    oscillator.stop();
    audioContext.close();
    
    return fingerprint;
  } catch {
    return 'unavailable';
  }
}

// Simple hash function
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main fingerprint collection function
export async function collectFingerprint(): Promise<FingerprintData> {
  const webglInfo = getWebGLInfo();
  const fonts = getInstalledFonts();
  const plugins = getPlugins();
  
  const rawData = {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    colorDepth: window.screen.colorDepth,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchSupport: 'ontouchstart' in window,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    canvas: getCanvasFingerprint(),
    webglVendor: webglInfo.vendor,
    webglRenderer: webglInfo.renderer,
    fonts,
    plugins,
    audioContext: getAudioFingerprint(),
  };
  
  // Generate unique fingerprint hash
  const fingerprintString = JSON.stringify(rawData);
  const fingerprint = await hashString(fingerprintString);
  
  return {
    fingerprint,
    ...rawData,
  };
}

// Get client IP via external service (fallback)
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}
