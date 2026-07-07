type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

class HttpService {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    options?: RequestOptions,
    body?: unknown
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    };

    if (body && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  async post<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, options, body);
  }

  async put<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, options, body);
  }

  async patch<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, options, body);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }
}

export const httpService = new HttpService();
export { HttpService };
