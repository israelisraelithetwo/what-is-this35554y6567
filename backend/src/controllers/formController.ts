import { Response } from 'express';
import { Form } from '../models/Form';
import { AuthRequest } from '../middleware/auth';

export const createForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, formStructure } = req.body;

    const form = await Form.create({
      title,
      description,
      formStructure,
      createdBy: req.user?.id,
      status: 'draft'
    });

    res.status(201).json({
      message: 'Form created successfully',
      form
    });
  } catch (error: any) {
    console.error('Create form error:', error);
    res.status(500).json({
      message: 'Error creating form',
      error: error.message
    });
  }
};

export const getForms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const query: any = {};
    
    // Creators see their own forms, signers see published forms
    if (req.user?.role === 'creator') {
      query.createdBy = req.user.id;
    } else {
      query.status = 'published';
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [forms, total] = await Promise.all([
      Form.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Form.countDocuments(query)
    ]);

    res.json({
      forms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Get forms error:', error);
    res.status(500).json({
      message: 'Error fetching forms',
      error: error.message
    });
  }
};

export const getFormById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await Form.findById(id).populate('createdBy', 'name email');

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Check access permissions
    if (form.status === 'draft' && req.user?.role !== 'creator') {
      res.status(403).json({ message: 'Access denied. Form is not published.' });
      return;
    }

    if (req.user?.role === 'creator' && form.createdBy._id.toString() !== req.user.id) {
      res.status(403).json({ message: 'Access denied. You can only view your own forms.' });
      return;
    }

    res.json({ form });
  } catch (error: any) {
    console.error('Get form error:', error);
    res.status(500).json({
      message: 'Error fetching form',
      error: error.message
    });
  }
};

export const updateForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, formStructure } = req.body;

    const form = await Form.findById(id);

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Check ownership
    if (form.createdBy.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Access denied. You can only update your own forms.' });
      return;
    }

    if (title) form.title = title;
    if (description !== undefined) form.description = description;
    if (formStructure) form.formStructure = formStructure;

    await form.save();

    res.json({
      message: 'Form updated successfully',
      form
    });
  } catch (error: any) {
    console.error('Update form error:', error);
    res.status(500).json({
      message: 'Error updating form',
      error: error.message
    });
  }
};

export const deleteForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await Form.findById(id);

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Check ownership
    if (form.createdBy.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Access denied. You can only delete your own forms.' });
      return;
    }

    await Form.findByIdAndDelete(id);

    res.json({ message: 'Form deleted successfully' });
  } catch (error: any) {
    console.error('Delete form error:', error);
    res.status(500).json({
      message: 'Error deleting form',
      error: error.message
    });
  }
};

export const publishForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await Form.findById(id);

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Check ownership
    if (form.createdBy.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Access denied. You can only publish your own forms.' });
      return;
    }

    form.status = 'published';
    await form.save();

    res.json({
      message: 'Form published successfully',
      form
    });
  } catch (error: any) {
    console.error('Publish form error:', error);
    res.status(500).json({
      message: 'Error publishing form',
      error: error.message
    });
  }
};

export const unpublishForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await Form.findById(id);

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Check ownership
    if (form.createdBy.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Access denied. You can only unpublish your own forms.' });
      return;
    }

    form.status = 'draft';
    await form.save();

    res.json({
      message: 'Form unpublished successfully',
      form
    });
  } catch (error: any) {
    console.error('Unpublish form error:', error);
    res.status(500).json({
      message: 'Error unpublishing form',
      error: error.message
    });
  }
};
