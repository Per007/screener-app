import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { getAuthToken, clearAuthToken } from '../utils/authUtils';

class ApiService {
  private instance: AxiosInstance;
  private baseURL: string;
  
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    // Backend routes are mounted directly without /api prefix
    // So we use the base URL as-is
    console.log('[API Service] Initializing with baseURL:', this.baseURL);
    
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
        console.log(`[API Service] ${config.method?.toUpperCase()} ${config.url}`, {
          baseURL: config.baseURL,
          hasAuth: !!token
        });
        return config;
      },
      (error) => {
        console.error('[API Service] Request error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        console.log(`[API Service] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error('[API Service] Response error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code,
          request: error.request ? 'Request made but no response' : 'No request made'
        });
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          clearAuthToken();
          window.location.href = '/login';
        } else if (!error.response && error.request) {
          // Network error - backend not reachable
          console.error('[API Service] ⚠️ Backend connection failed! Is the server running?');
          console.error('[API Service] Attempted URL:', error.config?.baseURL + error.config?.url);
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
          const errorMessage = typeof axiosError.response.data === 'string' 
            ? axiosError.response.data 
            : (axiosError.response.data as any)?.message || axiosError.message;
          throw new Error(errorMessage);
        } else if (axiosError.request) {
          // Request was made but no response received - backend connection issue
          throw new Error(
            `Cannot connect to backend server at ${this.baseURL}. ` +
            `Please ensure the backend is running on port 3000. ` +
            `Error: ${axiosError.message}`
          );
        } else {
          // Something happened in setting up the request
          throw new Error(`Request setup error: ${axiosError.message}`);
        }
      }
      throw new Error('Unknown error occurred');
    }
  }
  
  // Health check method to test backend connection
  public async checkBackendConnection(): Promise<boolean> {
    try {
      const healthURL = `${this.baseURL}/health`;
      const response = await axios.get(healthURL, { timeout: 5000 });
      console.log('[API Service] Backend health check:', response.data);
      return response.status === 200;
    } catch (error) {
      console.error('[API Service] Backend health check failed:', error);
      return false;
    }
  }
  
  // Portfolio endpoints
  public async getPortfolios(): Promise<any> {
    return this.request({ method: 'GET', url: '/portfolios' });
  }
  
  public async getPortfolio(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/portfolios/${id}` });
  }
  
  public async createPortfolio(data: { name: string; clientId?: string }): Promise<any> {
    return this.request({ method: 'POST', url: '/portfolios', data });
  }

  public async deletePortfolio(id: string): Promise<void> {
    return this.request({ method: 'DELETE', url: `/portfolios/${id}` });
  }

  public async addHoldingToPortfolio(portfolioId: string, data: { companyId: string; weight: number }): Promise<any> {
    return this.request({ method: 'POST', url: `/portfolios/${portfolioId}/holdings/add`, data });
  }
  
  // Client endpoints
  public async getClients(): Promise<any> {
    return this.request({ method: 'GET', url: '/clients' });
  }
  
  public async screenPortfolio(id: string, data: any): Promise<any> {
    return this.request({ method: 'POST', url: `/portfolios/${id}/screen`, data });
  }

  public async screenPortfolioDirect(data: { portfolioId: string; criteriaSetId: string; asOfDate?: string }): Promise<any> {
    return this.request({ method: 'POST', url: '/screen', data });
  }

  public async getScreeningResults(filters?: { portfolioId?: string; criteriaSetId?: string }): Promise<any> {
    return this.request({ method: 'GET', url: '/screening-results', params: filters });
  }

  public async getScreeningResult(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/screening-results/${id}` });
  }

  public async deleteScreeningResult(id: string): Promise<any> {
    return this.request({ method: 'DELETE', url: `/screening-results/${id}` });
  }
  
  // Company endpoints
  public async getCompanies(filters?: any): Promise<any> {
    return this.request({ method: 'GET', url: '/companies', params: filters });
  }
  
  public async getCompany(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/companies/${id}` });
  }
  
  // Parameter endpoints
  public async getParameters(): Promise<any> {
    return this.request({ method: 'GET', url: '/parameters' });
  }

  public async getParameter(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/parameters/${id}` });
  }
  
  // Criteria sets endpoints
  public async getCriteriaSets(): Promise<any> {
    return this.request({ method: 'GET', url: '/criteria-sets' });
  }
  
  public async getCriteriaSet(id: string): Promise<any> {
    return this.request({ method: 'GET', url: `/criteria-sets/${id}` });
  }

  public async createCriteriaSet(data: {
    name: string;
    version: string;
    effectiveDate: string;
    clientId?: string;
    rules?: Array<{
      name: string;
      description?: string;
      expression: any;
      failureMessage?: string;
      severity?: 'exclude' | 'warn' | 'info';
    }>;
  }): Promise<any> {
    return this.request({ method: 'POST', url: '/criteria-sets', data });
  }

  public async addRuleToCriteriaSet(criteriaSetId: string, data: {
    name: string;
    description?: string;
    expression: any;
    failureMessage?: string;
    severity?: 'exclude' | 'warn' | 'info';
  }): Promise<any> {
    return this.request({ method: 'POST', url: `/criteria-sets/${criteriaSetId}/rules`, data });
  }

  public async deleteRule(criteriaSetId: string, ruleId: string): Promise<any> {
    return this.request({ method: 'DELETE', url: `/criteria-sets/${criteriaSetId}/rules/${ruleId}` });
  }

  public async updateCriteriaSet(criteriaSetId: string, data: {
    name?: string;
    version?: string;
    effectiveDate?: string;
  }): Promise<any> {
    return this.request({ method: 'PUT', url: `/criteria-sets/${criteriaSetId}`, data });
  }

  public async updateRule(criteriaSetId: string, ruleId: string, data: {
    name?: string;
    description?: string;
    expression?: any;
    failureMessage?: string;
    severity?: 'exclude' | 'warn' | 'info';
  }): Promise<any> {
    return this.request({ method: 'PUT', url: `/criteria-sets/${criteriaSetId}/rules/${ruleId}`, data });
  }

  public async deleteCriteriaSet(criteriaSetId: string): Promise<any> {
    return this.request({ method: 'DELETE', url: `/criteria-sets/${criteriaSetId}` });
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
  
  // Import endpoints
  public async validateCSV(formData: FormData): Promise<any> {
    return this.request({
      method: 'POST',
      url: '/import/validate',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  public async importPortfolio(clientId: string, formData: FormData): Promise<any> {
    return this.request({
      method: 'POST',
      url: `/import/portfolios/${clientId}`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  public async downloadTemplate(): Promise<void> {
    // Create a hidden link to trigger download
    const token = getAuthToken();
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    const link = document.createElement('a');
    link.href = `${baseURL}/import/template`;
    link.setAttribute('download', 'portfolio-template.csv');
    
    // For authenticated download, we need to fetch and create blob
    const response = await fetch(`${baseURL}/import/template`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
