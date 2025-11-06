import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { formService } from '../../services/formService';
import { Form } from '../../types/form';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const response = await formService.getForms();
      setForms(response.forms);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleCreateForm = () => {
    navigate('/forms/create');
  };

  const handleViewForm = (formId: string) => {
    if (user?.role === 'creator') {
      navigate(`/forms/${formId}/edit`);
    } else {
      navigate(`/forms/${formId}/fill`);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      await formService.deleteForm(formId);
      loadForms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete form');
    }
  };

  const handlePublishToggle = async (form: Form) => {
    try {
      if (form.status === 'published') {
        await formService.unpublishForm(form._id);
      } else {
        await formService.publishForm(form._id);
      }
      loadForms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update form status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">Form Management</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm">
                {user?.name} ({user?.role})
              </span>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">
            {user?.role === 'creator' ? 'My Forms' : 'Available Forms'}
          </h2>
          {user?.role === 'creator' && (
            <button onClick={handleCreateForm} className="btn btn-primary">
              Create New Form
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">
              {user?.role === 'creator'
                ? 'No forms created yet. Create your first form!'
                : 'No forms available to fill.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div key={form._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{form.title}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      form.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {form.status}
                  </span>
                </div>

                {form.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleViewForm(form._id)}
                    className="btn btn-primary w-full"
                  >
                    {user?.role === 'creator' ? 'Edit Form' : 'Fill Form'}
                  </button>

                  {user?.role === 'creator' && (
                    <>
                      <button
                        onClick={() => handlePublishToggle(form)}
                        className="btn btn-secondary w-full"
                      >
                        {form.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => navigate(`/forms/${form._id}/submissions`)}
                        className="btn btn-secondary w-full"
                      >
                        View Submissions
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form._id)}
                        className="btn btn-danger w-full"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
