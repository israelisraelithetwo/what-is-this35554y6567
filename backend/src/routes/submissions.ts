import { Router } from 'express';
import { body } from 'express-validator';
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  exportSubmissionsCSV,
  exportSubmissionsPDF
} from '../controllers/submissionController';
import { authenticate, requireCreator } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation rules
const submissionValidation = [
  body('formData').notEmpty().withMessage('Form data is required')
];

// Routes
// Public submission (anyone can submit)
router.post('/forms/:id/submissions', validate(submissionValidation), createSubmission);

// Protected routes (require authentication)
router.get('/forms/:id/submissions', authenticate, requireCreator, getSubmissions);
router.get('/submissions/:submissionId', authenticate, requireCreator, getSubmissionById);
router.get('/forms/:id/submissions/export/csv', authenticate, requireCreator, exportSubmissionsCSV);
router.get('/forms/:id/submissions/export/pdf', authenticate, requireCreator, exportSubmissionsPDF);

export default router;
