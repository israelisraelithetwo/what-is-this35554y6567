import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formService } from '../../services/formService';
import { Form } from '../../types/form';
import { SignaturePadComponent } from '../SignaturePad/SignaturePadComponent';

export const FormSigner: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [signature, setSignature] = useState<string>('');
  const [submitterInfo, setSubmitterInfo] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await formService.getFormById(id!);
      setForm(response.form);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData({
      ...formData,
      [fieldKey]: value,
    });
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl);
    alert('Signature saved! You can now submit the form.');
  };

  const validateForm = (): boolean => {
    if (!form) return false;

    // Check required fields
    for (const component of form.formStructure.components) {
      if (component.validate?.required) {
        if (!formData[component.key] || formData[component.key].trim() === '') {
          alert(`Please fill in the required field: ${component.label}`);
          return false;
        }
      }
    }

    if (!signature) {
      alert('Please provide your signature before submitting');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await formService.submitForm(id!, {
        formData,
        signature,
        submittedBy: submitterInfo.name || submitterInfo.email ? submitterInfo : undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (component: any) => {
    const isRequired = component.validate?.required;

    switch (component.type) {
      case 'textfield':
      case 'email':
        return (
          <input
            type={component.type === 'email' ? 'email' : 'text'}
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            required={isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            required={isRequired}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            rows={4}
            required={isRequired}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={formData[component.key] || false}
            onChange={(e) => handleFieldChange(component.key, e.target.checked)}
            className="w-5 h-5"
            required={isRequired}
          />
        );

      case 'select':
        return (
          <select
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            required={isRequired}
          >
            <option value="">Select an option</option>
            {component.data?.values?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'datetime':
        return (
          <input
            type="date"
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            required={isRequired}
          />
        );

      default:
        return (
          <input
            type="text"
            value={formData[component.key] || ''}
            onChange={(e) => handleFieldChange(component.key, e.target.value)}
            className="input"
            required={isRequired}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Loading form...</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="card max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary mt-4 w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="card max-w-md text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Form Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for filling out the form. Your submission has been received.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">Fill Form</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="card mb-6">
          <h2 className="text-3xl font-bold mb-2">{form?.title}</h2>
          {form?.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Submitter Information */}
          <div className="card mb-6">
            <h3 className="text-xl font-semibold mb-4">Your Information (Optional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={submitterInfo.name}
                  onChange={(e) =>
                    setSubmitterInfo({ ...submitterInfo, name: e.target.value })
                  }
                  className="input"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={submitterInfo.email}
                  onChange={(e) =>
                    setSubmitterInfo({ ...submitterInfo, email: e.target.value })
                  }
                  className="input"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="card mb-6">
            <h3 className="text-xl font-semibold mb-4">Form Fields</h3>
            <div className="space-y-6">
              {form?.formStructure.components.map((component: any) => (
                <div key={component.key}>
                  <label className="block text-sm font-medium mb-2">
                    {component.label}
                    {component.validate?.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderField(component)}
                </div>
              ))}
            </div>
          </div>

          {/* Signature Section */}
          <div className="card mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Digital Signature <span className="text-red-500">*</span>
            </h3>
            
            {signature ? (
              <div>
                <img
                  src={signature}
                  alt="Your signature"
                  className="border-2 border-gray-300 rounded-lg mb-4"
                />
                <button
                  type="button"
                  onClick={() => setSignature('')}
                  className="btn btn-secondary"
                >
                  Change Signature
                </button>
              </div>
            ) : (
              <SignaturePadComponent onSave={handleSignatureSave} />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </form>
      </div>
    </div>
  );
};
