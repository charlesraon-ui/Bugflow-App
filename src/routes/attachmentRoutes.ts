import express from 'express';
import { uploadAttachment, deleteAttachment, upload } from '../controllers/attachmentController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/', authMiddleware, upload.single('file'), uploadAttachment);
router.delete('/:id', authMiddleware, deleteAttachment);

export default router;
