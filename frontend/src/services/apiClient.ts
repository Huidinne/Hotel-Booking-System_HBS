// =============================================================================
// HOTEL BOOKING SYSTEM - API CLIENT & BACKEND INTEGRATION LAYER
// File: src/services/apiClient.ts
// Handles real HTTP communication with Spring Boot backend, JWT tokens,
// ApiResponse envelope unwrapping, and backend health status detection.
// =============================================================================

export interface BackendHealthStatus {
  online: boolean;
  service?: string;
  version?: string;
  timestamp?: string;
  error?: string;
}

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private baseUrl: string;
  private backendLiveStatus: boolean | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check connection to Spring Boot /api/v1/health
   */
  async checkHealth(): Promise<BackendHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.backendLiveStatus = true;
        return {
          online: true,
          service: data.service || 'Hotel Booking System API',
          version: data.version || '1.0.0',
          timestamp: data.timestamp || new Date().toISOString(),
        };
      } else {
        this.backendLiveStatus = false;
        return {
          online: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (err: any) {
      this.backendLiveStatus = false;
      return {
        online: false,
        error: err?.name === 'AbortError' ? 'Timeout (Backend chưa bật hoặc port 8080 chưa phản hồi)' : 'Không thể kết nối đến Backend',
      };
    }
  }

  isLive(): boolean {
    return this.backendLiveStatus === true;
  }

  /**
   * Main request handler with JWT token injection and ApiResponse unwrapping
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers || {});

    // Inject Bearer token if stored in localStorage
    const token = localStorage.getItem('hbs_access_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Set JSON content-type if not already specified and not FormData
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include HttpOnly cookies (e.g. refreshToken)
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    let responseData: any = null;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && typeof responseData === 'object' && (responseData.message || responseData.error)) ||
        `Lỗi hệ thống (${response.status}: ${response.statusText})`;
      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    // Spring Boot backend wraps successful responses in ApiResponse<T> = { success: true, message: "...", data: T }
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as T;
    }

    return responseData as T;
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
