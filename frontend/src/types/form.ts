export interface Form {
  _id: string;
  title: string;
  description?: string;
  formStructure: any;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormData {
  title: string;
  description?: string;
  formStructure: any;
}

export interface UpdateFormData {
  title?: string;
  description?: string;
  formStructure?: any;
}

export interface Submission {
  _id: string;
  formId: string;
  formData: any;
  signature?: string;
  submittedBy?: {
    name?: string;
    email?: string;
  };
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionData {
  formData: any;
  signature?: string;
  submittedBy?: {
    name?: string;
    email?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
