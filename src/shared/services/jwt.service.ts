/**
 * JwtService
 * 
 * Manages JWT tokens, decoding payloads, checking expiration,
 * and generating Authorization headers.
 */

import { sessionStorageService } from './sessionStorage.service';

export interface JwtPayload {
  sub?: string;
  username?: string;
  name?: string;
  role?: string;
  roles?: string[];
  department?: string;
  checkPassword?: boolean | string;
  leftDays?: number;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export class JwtService {
  private static readonly AUTH_TOKEN_KEY = 'auth_token';

  /**
   * Retrieves decrypted JWT token from session storage.
   */
  getJwtToken(): string | null {
    const encrypted = sessionStorageService.decryptSessionData<string>(JwtService.AUTH_TOKEN_KEY);
    if (encrypted) {
      return encrypted;
    }
    return sessionStorageService.get(JwtService.AUTH_TOKEN_KEY);
  }

  /**
   * Stores encrypted JWT token in session storage.
   */
  setJwtToken(token: string): void {
    sessionStorageService.encryptSessionData(JwtService.AUTH_TOKEN_KEY, token);
    sessionStorageService.set(JwtService.AUTH_TOKEN_KEY, token);
  }

  /**
   * Removes token from storage.
   */
  removeJwtToken(): void {
    sessionStorageService.remove(JwtService.AUTH_TOKEN_KEY);
  }

  /**
   * Formats the Authorization header for HTTP requests.
   */
  getAuthorizationHeader(): string {
    const token = this.getJwtToken();
    if (!token) return '';
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  /**
   * Decodes JWT token payload safely.
   */
  decodeToken<T = JwtPayload>(token?: string | null): T | null {
    const rawToken = token || this.getJwtToken();
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    try {
      const parts = rawToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Base64URL to Base64
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload) as T;
    } catch (err) {
      console.warn('Failed to decode JWT token payload:', err);
      return null;
    }
  }

  /**
   * Checks whether the token has expired with an optional tolerance offset in seconds.
   */
  isTokenExpired(token?: string | null, offsetSeconds: number = 0): boolean {
    const payload = this.decodeToken<JwtPayload>(token);
    if (!payload || !payload.exp) {
      return false; // If no exp claim, assume valid until server rejects
    }

    const expTimeMs = payload.exp * 1000;
    const currentTimeWithOffsetMs = Date.now() + offsetSeconds * 1000;
    return expTimeMs <= currentTimeWithOffsetMs;
  }

  /**
   * Returns remaining token lifetime in seconds.
   */
  getTokenRemainingSeconds(token?: string | null): number {
    const payload = this.decodeToken<JwtPayload>(token);
    if (!payload || !payload.exp) {
      return Infinity;
    }
    const remainingMs = payload.exp * 1000 - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }

  /**
   * Returns the exact expiration Date.
   */
  getTokenExpirationDate(token?: string | null): Date | null {
    const payload = this.decodeToken<JwtPayload>(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }
}

export const jwtService = new JwtService();
