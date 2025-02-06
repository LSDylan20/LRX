import type { ApiResponse } from '@/types/api'

export class BaseApiClient {
  constructor(
    private baseUrl: string,
    private serviceName: string
  ) {}

  protected async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  protected async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  protected async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'X-Service': this.serviceName,
    }
  }

  private getAuthToken(): string {
    // TODO: Implement auth token retrieval
    return ''
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json()
      return {
        data: null as any,
        error: {
          message: error.message || 'An error occurred',
          code: error.code || 'UNKNOWN_ERROR',
        },
      }
    }

    const data = await response.json()
    return {
      data,
      error: null,
    }
  }
}
