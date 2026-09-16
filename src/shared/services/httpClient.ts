/**
 * Centralized Axios HTTP Client
 * 
 * Provides configured Axios instances with:
 * - Automatic Authorization header injection (JWT token from session/jwt service)
 * - Standard request/response interceptors
 * - Error normalization and status handling
 * - Support for cancellation via AbortSignal
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { VTS_SPRING_HOST, GO_BACKEND_HOST } from './api-config';
import { jwtService } from './jwt.service';

/**
 * Common request interceptor to attach JWT Authorization Bearer token
 */
function attachAuthToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  try {
    const authHeader = jwtService.getAuthorizationHeader();
    if (authHeader && !config.headers.Authorization) {
      config.headers.Authorization = authHeader;
    }
  } catch {
    // Graceful fallback if window/session is unavailable during SSR or tests
  }
  return config;
}

/**
 * Common response error interceptor for normalized error handling
 */
function handleResponseError(error: any) {
  if (axios.isCancel(error)) {
    return Promise.reject(error);
  }

  // Handle 401 Unauthorized
  if (error.response?.status === 401) {
    // In production with JWT active, can trigger session expiry handling here
    // For development/POC, we let caller handle fallback
  }

  // Normalize error message
  const serverMsg =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'Network request failed';

  const normalized = {
    status: error.response?.status || 500,
    message: serverMsg,
    data: error.response?.data,
    originalError: error,
  };

  return Promise.reject(normalized);
}

/**
 * 1. Default API Client (Relative or Proxy Base)
 * Used for general requests and Vite proxy routes (/vts/api, etc.)
 */
export const apiClient: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
apiClient.interceptors.response.use((response) => response, handleResponseError);

/**
 * 2. VTS Spring Boot Client
 * Direct connections to Spring Boot VTS Microservice
 */
export const vtsClient: AxiosInstance = axios.create({
  baseURL: VTS_SPRING_HOST,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

vtsClient.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
vtsClient.interceptors.response.use((response) => response, handleResponseError);

/**
 * 3. Go Ingestion Server Client
 * Direct connections to Go backend server
 */
export const goClient: AxiosInstance = axios.create({
  baseURL: GO_BACKEND_HOST,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

goClient.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
goClient.interceptors.response.use((response) => response, handleResponseError);

/**
 * Helper to check if an error was caused by cancellation/abort
 */
export const isAbortError = (error: unknown): boolean => {
  return axios.isCancel(error) || (error as any)?.name === 'CanceledError' || (error as any)?.name === 'AbortError';
};

export type { AxiosRequestConfig, AxiosResponse };
