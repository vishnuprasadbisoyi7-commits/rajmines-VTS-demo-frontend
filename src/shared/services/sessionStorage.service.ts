/**
 * SessionStorageService
 * 
 * Ported from the RajMines Department of Mines & Geology Angular codebase.
 * Provides session management, government portal-compatible salt obfuscation,
 * password change state tracking, and 60-second multi-tab handoff.
 */

export class SessionStorageService {
  private static readonly PASSWORD_CHANGE_REQUIRED_KEY = 'passwordChangeRequired';
  private static readonly TAB_HANDOFF_KEY = 'rajmines_session_tab_handoff';
  private static readonly TAB_HANDOFF_TTL_MS = 60_000;

  get(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  set(key: string, value: string | number | null): void {
    sessionStorage.setItem(key, value != null ? String(value) : '');
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }

  /**
   * Encrypts and stores data into sessionStorage using portal-compatible
   * 5-character salt prefix + base64 + 5-character salt suffix.
   */
  encryptSessionData(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(key, this.encryptTheData(serialized));
    } catch (err) {
      console.error(`Error serializing session data for key: ${key}`, err);
    }
  }

  /**
   * Decrypts and retrieves data from sessionStorage.
   */
  decryptSessionData<T = any>(key: string): T | null {
    try {
      let data = sessionStorage.getItem(key);
      if (!data) {
        return null;
      }

      data = this.decrypTheData(data);
      if (!data || data.trim() === '') {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error decrypting session data for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Generates a 5-char random salt + base64 + 5-char random salt.
   */
  encryptTheData(data: any): string {
    if (data) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(String(data))));
        return this.generateRandomAlfaNumerics() + encoded + this.generateRandomAlfaNumerics();
      } catch {
        return this.generateRandomAlfaNumerics() + btoa(String(data)) + this.generateRandomAlfaNumerics();
      }
    }
    return data;
  }

  /**
   * Strips prefix & suffix 5-char salts and decodes base64 string.
   */
  decrypTheData(data: any): string | null {
    if (data && typeof data === 'string' && data.length > 10) {
      try {
        const stripped = data.substring(5, data.length - 5);
        try {
          return decodeURIComponent(escape(atob(stripped)));
        } catch {
          return atob(stripped);
        }
      } catch (error) {
        console.error('Error decoding base64 data:', error);
        return null;
      }
    }
    return data;
  }

  generateRandomAlfaNumerics(length: number = 5): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  setPasswordChangeRequired(required: boolean): void {
    if (required) {
      this.encryptSessionData(SessionStorageService.PASSWORD_CHANGE_REQUIRED_KEY, true);
    } else {
      sessionStorage.removeItem(SessionStorageService.PASSWORD_CHANGE_REQUIRED_KEY);
    }
  }

  isPasswordChangeRequired(): boolean {
    return this.decryptSessionData<boolean>(SessionStorageService.PASSWORD_CHANGE_REQUIRED_KEY) === true;
  }

  /**
   * Prepares session state snapshot into localStorage so a newly opened
   * browser tab can restore credentials within 60 seconds.
   */
  prepareSessionForNewTab(): void {
    const snapshot: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        snapshot[key] = sessionStorage.getItem(key) ?? '';
      }
    }

    localStorage.setItem(
      SessionStorageService.TAB_HANDOFF_KEY,
      JSON.stringify({
        createdAt: Date.now(),
        data: snapshot,
      })
    );
  }

  /**
   * Restores session state from handoff payload if valid and within TTL.
   */
  restoreSessionFromNewTabHandoff(): void {
    const raw = localStorage.getItem(SessionStorageService.TAB_HANDOFF_KEY);
    if (!raw) {
      return;
    }

    localStorage.removeItem(SessionStorageService.TAB_HANDOFF_KEY);

    try {
      const payload = JSON.parse(raw) as {
        createdAt?: number;
        data?: Record<string, string>;
      };

      if (
        !payload?.data ||
        !payload.createdAt ||
        Date.now() - payload.createdAt > SessionStorageService.TAB_HANDOFF_TTL_MS
      ) {
        return;
      }

      if (sessionStorage.getItem('auth_token') && sessionStorage.getItem('user')) {
        return;
      }

      Object.entries(payload.data).forEach(([key, value]) => {
        sessionStorage.setItem(key, value);
      });
    } catch {
      // Ignore invalid handoff payloads
    }
  }
}

export const sessionStorageService = new SessionStorageService();
