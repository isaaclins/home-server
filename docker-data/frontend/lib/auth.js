import { jwtDecode } from 'jwt-decode';

const AUTH_TOKEN_KEY = 'authToken';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getUserFromToken() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // Basic check for expiration, though jwtDecode doesn't validate it aggressively.
    // For true validation, a library that checks signature and expiration is needed,
    // or the backend should re-validate the token on sensitive operations.
    if (decoded.exp * 1000 < Date.now()) {
      console.warn('Token expired');
      removeAuthToken(); // Clean up expired token
      return null;
    }
    return { username: decoded.username, isAdmin: decoded.isAdmin };
  } catch (error) {
    console.error('Invalid token:', error);
    removeAuthToken(); // Clean up invalid token
    return null;
  }
} 
