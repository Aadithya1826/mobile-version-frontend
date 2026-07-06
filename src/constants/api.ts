import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  // If running on Web (browser), use the window location hostname dynamically
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8001`;
  }
  
  // Dynamically get the IP address of the Expo dev server (your computer)
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8001`;
  }
  
  // Fallback to the current local Wi-Fi IP if hostUri is unavailable
  return 'http://192.168.0.5:8001';
};

export const API_BASE_URL = getApiUrl();
