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
  
  public async createPortfolio(data: { name: string; clientId?: string }): Promise<any> {
    return this.request({ method: 'POST', url: '/portfolios', data });
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
