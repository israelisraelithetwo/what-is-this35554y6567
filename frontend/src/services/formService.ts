import { apiService } from './api';
import {
  Form,
  CreateFormData,
  UpdateFormData,
  Submission,
  CreateSubmissionData,
} from '../types/form';

export const formService = {
  async createForm(data: CreateFormData): Promise<{ message: string; form: Form }> {
    return apiService.post<{ message: string; form: Form }>('/forms', data);
  },

  async getForms(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ forms: Form[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    return apiService.get<{ forms: Form[]; pagination: any }>(
      `/forms?${queryParams.toString()}`
    );
  },

  async getFormById(id: string): Promise<{ form: Form }> {
    return apiService.get<{ form: Form }>(`/forms/${id}`);
  },

  async updateForm(
    id: string,
    data: UpdateFormData
  ): Promise<{ message: string; form: Form }> {
    return apiService.put<{ message: string; form: Form }>(`/forms/${id}`, data);
  },

  async deleteForm(id: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/forms/${id}`);
  },

  async publishForm(id: string): Promise<{ message: string; form: Form }> {
    return apiService.post<{ message: string; form: Form }>(`/forms/${id}/publish`);
  },

  async unpublishForm(id: string): Promise<{ message: string; form: Form }> {
    return apiService.post<{ message: string; form: Form }>(`/forms/${id}/unpublish`);
  },

  async submitForm(
    formId: string,
    data: CreateSubmissionData
  ): Promise<{ message: string; submission: Submission }> {
    return apiService.post<{ message: string; submission: Submission }>(
      `/forms/${formId}/submissions`,
      data
    );
  },

  async getSubmissions(
    formId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ submissions: Submission[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiService.get<{ submissions: Submission[]; pagination: any }>(
      `/forms/${formId}/submissions?${queryParams.toString()}`
    );
  },

  async exportSubmissionsCSV(formId: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/forms/${formId}/submissions/export/csv`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-storage')}`,
        },
      }
    );
    return response.blob();
  },
};
