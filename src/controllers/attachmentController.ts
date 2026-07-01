import { Request, Response } from 'express';
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import prisma from '../config/prisma';
import { io } from '../server';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async (req, file) => {
    return {
      folder: 'bugflow-attachments',
      resource_type: 'auto'
    };
  }
});

export const upload = multer({ storage });

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { testCaseId, url, fileName, fileType } = req.body;

    if (!req.file && !url) {
      return res.status(400).json({ error: 'Either file or URL is required' });
    }

    const parsedTestCaseId = parseInt(Array.isArray(testCaseId) ? testCaseId[0] : testCaseId);

    let attachmentData: {
      testCaseId: number;
      url: string;
      publicId: string;
      fileName: string;
      fileType: string;
      size?: number;
    };

    if (req.file) {
      const file = req.file as Express.Multer.File & { filename?: string; path: string };
      attachmentData = {
        testCaseId: parsedTestCaseId,
        url: file.path,
        publicId: file.filename || '',
        fileName: file.originalname,
        fileType: file.mimetype,
        size: file.size
      };
    } else {
      attachmentData = {
        testCaseId: parsedTestCaseId,
        url: url,
        publicId: '',
        fileName: fileName || url,
        fileType: fileType || 'link'
      };
    }

    const attachment = await prisma.attachment.create({
      data: attachmentData
    });

    const testCase = await prisma.testCase.findUnique({
      where: { id: parsedTestCaseId }
    });

    if (testCase) {
      await prisma.activityLog.create({
        data: {
          testCaseId: parsedTestCaseId,
          userId: req.user!.userId,
          action: 'ATTACHMENT_ADDED',
          newValue: JSON.stringify({ fileName: attachmentData.fileName, url: attachmentData.url })
        }
      });

      io.to(`project-${testCase.projectId}`).emit('attachment-added', { attachment, testCaseId: parsedTestCaseId });
    }

    res.status(201).json(attachment);
  } catch (error: unknown) {
    console.error('Upload attachment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      error: 'Internal server error',
      details: errorMessage
    });
  }
};

export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(Array.isArray(id) ? id[0] : id);

    const attachment = await prisma.attachment.findUnique({
      where: { id: parsedId }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const testCaseId = attachment.testCaseId;
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId }
    });

    if (attachment.publicId) {
      await cloudinary.v2.uploader.destroy(attachment.publicId);
    }
    
    await prisma.attachment.delete({
      where: { id: parsedId }
    });

    if (testCase) {
      await prisma.activityLog.create({
        data: {
          testCaseId,
          userId: req.user!.userId,
          action: 'ATTACHMENT_REMOVED',
          oldValue: JSON.stringify({ fileName: attachment.fileName, url: attachment.url })
        }
      });

      io.to(`project-${testCase.projectId}`).emit('attachment-removed', { attachmentId: parsedId, testCaseId });
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
