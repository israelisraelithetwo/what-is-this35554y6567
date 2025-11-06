import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formService } from '../../services/formService';
import { Submission, Form } from '../../types/form';
import { format } from 'date-fns';

export const SubmissionsList: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [formResponse, submissionsResponse] = await Promise.all([
        formService.getFormById(id!),
        formService.getSubmissions(id!),
      ]);
      setForm(formResponse.form);
      setSubmissions(submissionsResponse.submissions);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await formService.exportSubmissionsCSV(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export submissions');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">Submissions</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="card mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">{form?.title}</h2>
              <p className="text-gray-600">
                Total Submissions: {submissions.length}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="btn btn-primary"
              disabled={submissions.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No submissions yet for this form.</p>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {format(new Date(submission.submittedAt), 'PPpp')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {submission.submittedBy?.name || 'Anonymous'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {submission.submittedBy?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal for viewing submission details */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">Submission Details</h3>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Submitted At</p>
                    <p className="font-medium">
                      {format(new Date(selectedSubmission.submittedAt), 'PPpp')}
                    </p>
                  </div>

                  {selectedSubmission.submittedBy && (
                    <div>
                      <p className="text-sm text-gray-500">Submitted By</p>
                      <p className="font-medium">
                        {selectedSubmission.submittedBy.name || 'Anonymous'}
                        {selectedSubmission.submittedBy.email && (
                          <> ({selectedSubmission.submittedBy.email})</>
                        )}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Form Data</p>
                    <div className="bg-gray-50 rounded p-4 space-y-3">
                      {Object.entries(selectedSubmission.formData).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-sm font-medium text-gray-700">
                              {key}
                            </p>
                            <p className="text-gray-900">
                              {typeof value === 'boolean'
                                ? value
                                  ? 'Yes'
                                  : 'No'
                                : String(value)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {selectedSubmission.signature && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Signature</p>
                      <img
                        src={selectedSubmission.signature}
                        alt="Signature"
                        className="border-2 border-gray-300 rounded max-w-full"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="btn btn-secondary w-full mt-6"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
