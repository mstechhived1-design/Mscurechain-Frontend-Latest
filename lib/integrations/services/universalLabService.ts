import { apiClient } from '../api/apiClient';

export interface UniversalTestParameter {
  name: string;
  unit?: string;
  referenceRange?: string;
  isHeading?: boolean;
  options?: string[];
  inputType?: 'number' | 'text' | 'select' | 'boolean';
  displayOrder?: number;
}

export interface UniversalLabTest {
  _id?: string;
  testCode: string;
  testName: string;
  departmentName: string;
  suggestedPrice: number;
  isActive: boolean;
  displayOrder: number;
  resultType: 'numeric' | 'text' | 'boolean' | 'multiple';
  sampleType?: string;
  methodology?: string;
  turnaroundTime?: string;
  parameters?: UniversalTestParameter[];
}

export const universalLabService = {
  getTests: async (params?: { page?: number; limit?: number; search?: string; department?: string }) => {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.department) searchParams.append('department', params.department);
      const str = searchParams.toString();
      if (str) query = '?' + str;
    }
    return apiClient<any>(`/lab/universal/tests${query}`, { method: 'GET' });
  },

  getTestById: async (id: string) => {
    return apiClient<any>(`/lab/universal/tests/${id}`, { method: 'GET' });
  },

  createTest: async (data: Partial<UniversalLabTest>) => {
    return apiClient<any>('/lab/universal/tests', { 
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateTest: async (id: string, data: Partial<UniversalLabTest>) => {
    return apiClient<any>(`/lab/universal/tests/${id}`, { 
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteTest: async (id: string) => {
    return apiClient<any>(`/lab/universal/tests/${id}`, { method: 'DELETE' });
  },

  getSeedStatus: async () => {
    return apiClient<any>('/lab/universal/seed/status', { method: 'GET' });
  },

  syncUniversalSeed: async () => {
    return apiClient<any>('/lab/universal/seed/sync', { method: 'POST' });
  },

  resetUniversalSeed: async () => {
    return apiClient<any>('/lab/universal/seed/reset', { method: 'POST' });
  }
};
