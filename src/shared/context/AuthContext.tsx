import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sessionStorageService } from '../services/sessionStorage.service';
import { jwtService } from '../services/jwt.service';
import { loginService, type LoginPayload, type ChangePasswordPayload } from '../services/login.service';
import Swal from 'sweetalert2';

export interface UserProfile {
  userName: string;
  displayName?: string;
  email?: string;
  role?: string;
  department?: string;
  leftDays?: number;
  [key: string]: any;
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  passwordChangeRequired: boolean;
  login: (credentials: LoginPayload) => Promise<any>;
  logout: (silent?: boolean) => void;
  updatePassword: (payload: ChangePasswordPayload) => Promise<boolean>;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [passwordChangeRequired, setPasswordChangeRequiredState] = useState<boolean>(false);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const logout = useCallback((silent: boolean = false) => {
    clearExpiryTimer();
    sessionStorageService.clear();
    jwtService.removeJwtToken();
    setUser(null);
    setToken(null);
    setPasswordChangeRequiredState(false);

    if (!silent) {
      Swal.fire({
        icon: 'info',
        title: 'Signed Out',
        text: 'You have been successfully logged out.',
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }, [clearExpiryTimer]);

  const scheduleTokenExpiry = useCallback((jwtToken: string) => {
    clearExpiryTimer();
    const remainingSeconds = jwtService.getTokenRemainingSeconds(jwtToken);
    if (remainingSeconds <= 0) {
      logout(true);
      return;
    }

    // Set auto-logout timer before token expires
    expiryTimerRef.current = setTimeout(() => {
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Your security session has expired. Please login again.',
        confirmButtonColor: '#20B2AA',
      }).then(() => {
        logout(true);
        window.location.href = '/login';
      });
    }, remainingSeconds * 1000);
  }, [clearExpiryTimer, logout]);

  // Initial load: check session storage & multi-tab handoff
  useEffect(() => {
    sessionStorageService.restoreSessionFromNewTabHandoff();

    const storedUser = sessionStorageService.decryptSessionData<UserProfile>('user');
    const storedToken = sessionStorageService.decryptSessionData<string>('auth_token') || sessionStorageService.get('auth_token');
    const isPwChangeReq = sessionStorageService.isPasswordChangeRequired();

    if (storedToken && storedUser) {
      // Check if JWT token has expired
      if (jwtService.isTokenExpired(storedToken)) {
        sessionStorageService.clear();
        setUser(null);
        setToken(null);
        setPasswordChangeRequiredState(false);
      } else {
        setUser(storedUser);
        setToken(storedToken);
        setPasswordChangeRequiredState(isPwChangeReq);
        scheduleTokenExpiry(storedToken);
      }
    }

    setIsLoading(false);

    return () => {
      clearExpiryTimer();
    };
  }, [scheduleTokenExpiry, clearExpiryTimer]);

  const checkAuth = useCallback((): boolean => {
    const currentToken = token || jwtService.getJwtToken();
    if (!currentToken) return false;
    return !jwtService.isTokenExpired(currentToken);
  }, [token]);

  const login = async (credentials: LoginPayload): Promise<any> => {
    const response = await loginService.loginpagesucess(credentials);
    const responseData = response.data || response;
    const statusCode = responseData.statusCode || response.statusCode;
    const status = (responseData.status || response.status || '').toUpperCase();

    if (statusCode === 200 && status === 'SUCCESS') {
      const authUser = responseData.user;
      const authToken = responseData.auth_token;
      const checkPassword = responseData.checkPassword;

      if (authUser && authToken) {
        // Store encrypted session data
        sessionStorageService.encryptSessionData('user', authUser);
        sessionStorageService.encryptSessionData('auth_token', authToken);
        sessionStorageService.encryptSessionData('loginSource', 'NORMAL');

        setUser(authUser);
        setToken(authToken);

        const isPwReq = Boolean(
          checkPassword &&
            (checkPassword === true ||
              checkPassword === 'true' ||
              (typeof checkPassword === 'string' && checkPassword.trim().length > 0))
        );

        sessionStorageService.setPasswordChangeRequired(isPwReq);
        setPasswordChangeRequiredState(isPwReq);
        scheduleTokenExpiry(authToken);

        // Prepare handoff for newly opened tabs
        sessionStorageService.prepareSessionForNewTab();
      }
    }

    return response;
  };

  const updatePassword = async (payload: ChangePasswordPayload): Promise<boolean> => {
    try {
      const response = await loginService.changePassword(payload);
      const isSuccess = response?.statusCode === 200 || response?.status === 'SUCCESS' || response?.status === 'success';

      if (isSuccess) {
        sessionStorageService.setPasswordChangeRequired(false);
        setPasswordChangeRequiredState(false);
        if (user) {
          const updatedUser = { ...user, leftDays: 90 };
          sessionStorageService.encryptSessionData('user', updatedUser);
          setUser(updatedUser);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !jwtService.isTokenExpired(token),
        isLoading,
        passwordChangeRequired,
        login,
        logout,
        updatePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
