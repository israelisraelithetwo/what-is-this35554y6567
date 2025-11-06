import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { Dashboard } from './components/Dashboard/Dashboard';
import { FormBuilder } from './components/FormBuilder/FormBuilder';
import { FormSigner } from './components/FormSigner/FormSigner';
import { SubmissionsList } from './components/Dashboard/SubmissionsList';
import { ProtectedRoute } from './components/Common/ProtectedRoute';
import { useAuthStore } from './store/authStore';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/create"
          element={
            <ProtectedRoute requireRole="creator">
              <FormBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/:id/edit"
          element={
            <ProtectedRoute requireRole="creator">
              <FormBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/:id/fill"
          element={
            <ProtectedRoute>
              <FormSigner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/:id/submissions"
          element={
            <ProtectedRoute requireRole="creator">
              <SubmissionsList />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
