import { Request, Response } from 'express';
import { Submission } from '../models/Submission';
import { Form } from '../models/Form';
import { AuthRequest } from '../middleware/auth';
import { stringify } from 'csv-stringify/sync';

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: formId } = req.params;
    const { formData, signature, submittedBy } = req.body;

    // Verify form exists and is published
    const form = await Form.findById(formId);
    
    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    if (form.status !== 'published') {
      res.status(400).json({ message: 'Form is not published and cannot accept submissions' });
      return;
    }

    const submission = await Submission.create({
      formId,
      formData,
      signature,
      submittedBy,
      submittedAt: new Date()
    });

    res.status(201).json({
      message: 'Form submitted successfully',
      submission
    });
  } catch (error: any) {
    console.error('Create submission error:', error);
    res.status(500).json({
      message: 'Error submitting form',
      error: error.message
    });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: formId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verify form exists and user has access
    const form = await Form.findById(formId);
    
    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Only form creators can view submissions
    if (req.user?.role === 'creator' && form.createdBy.toString() !== req.user.id) {
      res.status(403).json({ message: 'Access denied. You can only view submissions for your own forms.' });
      return;
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find({ formId })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments({ formId })
    ]);

    res.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      message: 'Error fetching submissions',
      error: error.message
    });
  }
};

export const getSubmissionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId).populate('formId');

    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    // Check access permissions
    const form = await Form.findById(submission.formId);
    if (form && req.user?.role === 'creator' && form.createdBy.toString() !== req.user.id) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    res.json({ submission });
  } catch (error: any) {
    console.error('Get submission error:', error);
    res.status(500).json({
      message: 'Error fetching submission',
      error: error.message
    });
  }
};

export const exportSubmissionsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: formId } = req.params;

    // Verify form exists and user has access
    const form = await Form.findById(formId);
    
    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    if (req.user?.role === 'creator' && form.createdBy.toString() !== req.user.id) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const submissions = await Submission.find({ formId }).sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      res.status(404).json({ message: 'No submissions found' });
      return;
    }

    // Prepare CSV data
    const csvData: any[] = [];
    
    submissions.forEach(submission => {
      const row: any = {
        'Submission ID': submission._id,
        'Submitted At': submission.submittedAt.toISOString(),
        'Submitter Name': submission.submittedBy?.name || 'N/A',
        'Submitter Email': submission.submittedBy?.email || 'N/A'
      };

      // Add form data fields
      if (submission.formData) {
        Object.keys(submission.formData).forEach(key => {
          row[key] = submission.formData[key];
        });
      }

      csvData.push(row);
    });

    const csv = stringify(csvData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="submissions-${formId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      message: 'Error exporting submissions',
      error: error.message
    });
  }
};

export const exportSubmissionsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: formId } = req.params;

    // Verify form exists and user has access
    const form = await Form.findById(formId);
    
    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    if (req.user?.role === 'creator' && form.createdBy.toString() !== req.user.id) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const submissions = await Submission.find({ formId }).sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      res.status(404).json({ message: 'No submissions found' });
      return;
    }

    // For now, return a simple JSON response
    // Full PDF generation would require PDFKit implementation
    res.json({
      message: 'PDF export feature coming soon',
      data: submissions.map(s => ({
        id: s._id,
        submittedAt: s.submittedAt,
        submittedBy: s.submittedBy,
        formData: s.formData
      }))
    });
  } catch (error: any) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      message: 'Error exporting submissions',
      error: error.message
    });
  }
};
