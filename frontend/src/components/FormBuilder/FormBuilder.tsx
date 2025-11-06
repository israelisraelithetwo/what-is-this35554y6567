import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formService } from '../../services/formService';

export const FormBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formStructure, setFormStructure] = useState({
    components: [] as any[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditMode = Boolean(id);

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await formService.getFormById(id!);
      setTitle(response.form.title);
      setDescription(response.form.description || '');
      setFormStructure(response.form.formStructure);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const addField = (type: string) => {
    const newField = {
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      key: `field_${Date.now()}`,
      input: true,
      validate: {
        required: false,
      },
    };

    setFormStructure({
      ...formStructure,
      components: [...formStructure.components, newField],
    });
  };

  const removeField = (index: number) => {
    const newComponents = [...formStructure.components];
    newComponents.splice(index, 1);
    setFormStructure({ ...formStructure, components: newComponents });
  };

  const updateField = (index: number, updates: any) => {
    const newComponents = [...formStructure.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setFormStructure({ ...formStructure, components: newComponents });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please provide a form title');
      return;
    }

    if (formStructure.components.length === 0) {
      alert('Please add at least one field to the form');
      return;
    }

    try {
      setLoading(true);
      const formData = { title, description, formStructure };

      if (isEditMode) {
        await formService.updateForm(id!, formData);
      } else {
        await formService.createForm(formData);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const fieldTypes = [
    { type: 'textfield', label: 'Text Field' },
    { type: 'email', label: 'Email' },
    { type: 'number', label: 'Number' },
    { type: 'textarea', label: 'Text Area' },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'select', label: 'Dropdown' },
    { type: 'datetime', label: 'Date' },
  ];

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Form' : 'Create New Form'}
            </h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Form Details</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Form Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Enter form title"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={3}
              placeholder="Enter form description (optional)"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Add Fields</h3>
              <div className="flex flex-col gap-2">
                {fieldTypes.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    className="btn btn-secondary text-left"
                  >
                    + {fieldType.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Form Fields</h3>

              {formStructure.components.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No fields added yet. Add fields from the sidebar.
                </p>
              ) : (
                <div className="space-y-4">
                  {formStructure.components.map((field, index) => (
                    <div
                      key={field.key}
                      className="border border-gray-200 rounded p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-500">
                          {field.type}
                        </span>
                        <button
                          onClick={() => removeField(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              updateField(index, { label: e.target.value })
                            }
                            className="input"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-${field.key}`}
                            checked={field.validate?.required || false}
                            onChange={(e) =>
                              updateField(index, {
                                validate: {
                                  ...field.validate,
                                  required: e.target.checked,
                                },
                              })
                            }
                            className="w-5 h-5"
                          />
                          <label
                            htmlFor={`required-${field.key}`}
                            className="text-sm"
                          >
                            Required field
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Form' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
