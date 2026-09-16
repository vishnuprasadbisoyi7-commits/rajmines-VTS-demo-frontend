import type { AxiosRequestConfig } from 'axios';
import { apiClient } from './httpClient';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
}

class HttpService {
  private defaultClient = apiClient;

  async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      ...options,
      headers: {
        ...options?.headers,
      },
    };

    const response = await this.defaultClient.request<T>(config);
    return response.data;
  }

  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  async patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }
}

export const httpService = new HttpService();
export { HttpService };
