import { type User } from '../types';

let tokenClient: any = null;
let resolveSignIn: ((value: any) => void) | null = null;
let rejectSignIn: ((reason: any) => void) | null = null;

export const initGoogleAuthClient = (clientId: string) => {
  if (typeof window === 'undefined') return;
  
  // Wait until window.google is loaded
  const checkGoogleLoaded = setInterval(() => {
    if ((window as any).google?.accounts?.oauth2) {
      clearInterval(checkGoogleLoaded);
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send profile email',
        callback: async (resp: any) => {
          if (resp.error) {
            if (rejectSignIn) rejectSignIn(resp);
            return;
          }
          
          if (resp.access_token) {
            try {
              const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              });
              if (!userinfoRes.ok) throw new Error('Failed to fetch user profile');
              const profile = await userinfoRes.json();
              
              const user: User = {
                uid: profile.sub,
                displayName: profile.name || profile.given_name || 'Google Gardener',
                email: profile.email || null,
                photoURL: profile.picture || null,
              };
              
              const expiresAt = Date.now() + (resp.expires_in || 3600) * 1000;
              
              localStorage.setItem('snygg_user', JSON.stringify(user));
              localStorage.setItem('snygg_access_token', resp.access_token);
              localStorage.setItem('snygg_token_expires_at', expiresAt.toString());
              
              if (resolveSignIn) resolveSignIn({ user, accessToken: resp.access_token });
            } catch (err) {
              if (rejectSignIn) rejectSignIn(err);
            }
          }
        }
      });
    }
  }, 100);

  // Safeguard: stop interval after 10 seconds if gsi script doesn't load
  setTimeout(() => clearInterval(checkGoogleLoaded), 10000);
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  return new Promise(async (resolve, reject) => {
    resolveSignIn = resolve;
    rejectSignIn = reject;
    
    if (!tokenClient) {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        initGoogleAuthClient(data.clientId);
      } catch (err) {
        initGoogleAuthClient('505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com');
      }
    }
    
    // Tiny delay to ensure client initialized
    setTimeout(() => {
      if (!tokenClient) {
        reject(new Error('Google Identity Services not loaded. Please try again in a moment.'));
        return;
      }
      tokenClient.requestAccessToken();
    }, 200);
  });
};

export const requestCalendarToken = async (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    let clientId = '505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com';
    try {
      const res = await fetch('/api/auth/google-client-id');
      const data = await res.json();
      if (data.clientId) clientId = data.clientId;
    } catch (err) {}

    const checkGoogleLoaded = setInterval(() => {
      const google = (window as any).google;
      if (google?.accounts?.oauth2) {
        clearInterval(checkGoogleLoaded);
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/calendar',
            callback: (response: any) => {
              if (response.error) {
                reject(response);
                return;
              }
              if (response.access_token) {
                localStorage.setItem('calendar_token', response.access_token);
                const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;
                localStorage.setItem('calendar_token_expires_at', expiresAt.toString());
                resolve(response.access_token);
              } else {
                reject(new Error('No access token returned'));
              }
            }
          });
          client.requestAccessToken();
        } catch (e) {
          reject(e);
        }
      }
    }, 100);

    // Safeguard: stop interval after 10 seconds if gsi script doesn't load
    setTimeout(() => {
      clearInterval(checkGoogleLoaded);
    }, 10000);
  });
};

export const getOrRefreshCalendarToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('calendar_token');
  const expiresAtStr = localStorage.getItem('calendar_token_expires_at');
  if (!token) return null;
  if (expiresAtStr) {
    const expiresAt = parseInt(expiresAtStr, 10);
    // If expired (or expiring in next 2 minutes), return null to trigger re-connection
    if (Date.now() >= expiresAt - 2 * 60 * 1000) {
      return null;
    }
  }
  return token;
};

export const logoutGoogle = () => {
  localStorage.removeItem('snygg_user');
  localStorage.removeItem('snygg_access_token');
  localStorage.removeItem('snygg_token_expires_at');
  localStorage.removeItem('calendar_token');
  localStorage.removeItem('calendar_token_expires_at');
  localStorage.removeItem('gcal_token');
  localStorage.removeItem('gcal_token_time');
};

export const getOrRefreshAccessToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('snygg_access_token');
  const expiresAtStr = localStorage.getItem('snygg_token_expires_at');
  
  if (!token || !expiresAtStr) return null;
  
  const expiresAt = parseInt(expiresAtStr, 10);
  // If token is still valid (with 5 min buffer), return it
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return token;
  }
  
  // Otherwise, attempt silent refresh
  return new Promise(async (resolve) => {
    resolveSignIn = ({ accessToken }) => resolve(accessToken);
    rejectSignIn = () => resolve(null);
    
    if (!tokenClient) {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        initGoogleAuthClient(data.clientId);
      } catch (err) {
        initGoogleAuthClient('505192974168-si8if6ir9mjd3bqdrrpbolv96qftjn1k.apps.googleusercontent.com');
      }
    }
    
    setTimeout(() => {
      if (!tokenClient) {
        resolve(null);
        return;
      }
      try {
        tokenClient.requestAccessToken({ prompt: 'none' });
      } catch (e) {
        resolve(null);
      }
    }, 200);
  });
};
