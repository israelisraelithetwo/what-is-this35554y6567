import { Router } from 'express';
import { body } from 'express-validator';
import {
  createForm,
  getForms,
  getFormById,
  updateForm,
  deleteForm,
  publishForm,
  unpublishForm
} from '../controllers/formController';
import { authenticate, requireCreator } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation rules
const formValidation = [
  body('title').notEmpty().withMessage('Form title is required'),
  body('formStructure').notEmpty().withMessage('Form structure is required')
];

// Routes - All form management routes require authentication
router.post('/', authenticate, requireCreator, validate(formValidation), createForm);
router.get('/', authenticate, getForms);
router.get('/:id', authenticate, getFormById);
router.put('/:id', authenticate, requireCreator, updateForm);
router.delete('/:id', authenticate, requireCreator, deleteForm);
router.post('/:id/publish', authenticate, requireCreator, publishForm);
router.post('/:id/unpublish', authenticate, requireCreator, unpublishForm);

export default router;
