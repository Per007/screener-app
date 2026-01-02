import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { getAuthToken, clearAuthToken } from '../utils/authUtils';

class ApiService {
  private instance: AxiosInstance;
  private baseURL: string;
  
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          clearAuthToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
  
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.request(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // Server responded with a status code outside 2xx
          throw new Error(axiosError.response.data as string || axiosError.message);
        } else if (axiosError.request) {
          // Request was made but no response received
          throw new Error('No response received from server');
        } else {
          // Something happened in setting up the request
          throw new Error(axiosError.message);
        }
      }
      throw new Error('Unknown error occurred');
    }
  }
  
  // Portfolio endpoints
  public async getPortfolios(): Promise<any> {
    return this.request({ method: 'GET', url: '/portfolios' });
  }
  
  public async getPortfolio(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/portfolios/${id}` });
  }
  
  public async screenPortfolio(id: string, data: any): Promise<any> {
    return this.request({ method: 'POST', url: `/portfolios/${id}/screen`, data });
  }
  
  // Company endpoints
  public async getCompanies(filters?: any): Promise<any> {
    return this.request({ method: 'GET', url: '/companies', params: filters });
  }
  
  public async getCompany(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/companies/${id}` });
  }
  
  // Criteria sets endpoints
  public async getCriteriaSets(): Promise<any> {
    return this.request({ method: 'GET', url: '/criteria-sets' });
  }
  
  public async getCriteriaSet(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/criteria-sets/${id}` });
  }
  
  // Screening tools endpoints
  public async screenIndividualCompany(data: any): Promise<any> {
    return this.request({ method: 'POST', url: '/screen/company', data });
  }
  
  public async screenMultipleCompanies(data: any): Promise<any> {
    return this.request({ method: 'POST', url: '/screen/companies', data });
  }
  
  public async screenBySector(data: any): Promise<any> {
    return this.request({ method: 'POST', url: '/screen/sector', data });
  }
  
  public async screenByRegion(data: any): Promise<any> {
    return this.request({ method: 'POST', url: '/screen/region', data });
  }
  
  public async screenCustom(data: any): Promise<any> {
    return this.request({ method: 'POST', url: '/screen/custom', data });
  }
  
  // Auth endpoints
  public async login(email: string, password: string): Promise<any> {
    return this.request({ 
      method: 'POST', 
      url: '/auth/login', 
      data: { email, password }
    });
  }
  
  public async logout(): Promise<any> {
    return this.request({ method: 'POST', url: '/auth/logout' });
  }
}

export const apiService = new ApiService();
