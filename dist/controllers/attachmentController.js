"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAttachment = exports.uploadAttachment = exports.upload = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../config/prisma"));
const server_1 = require("../server");
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.default.v2,
    params: async (req, file) => {
        return {
            folder: 'bugflow-attachments',
            resource_type: 'auto'
        };
    }
});
exports.upload = (0, multer_1.default)({ storage });
const uploadAttachment = async (req, res) => {
    try {
        const { testCaseId, url, fileName, fileType } = req.body;
        if (!req.file && !url) {
            return res.status(400).json({ error: 'Either file or URL is required' });
        }
        const parsedTestCaseId = parseInt(Array.isArray(testCaseId) ? testCaseId[0] : testCaseId);
        let attachmentData;
        if (req.file) {
            const file = req.file;
            attachmentData = {
                testCaseId: parsedTestCaseId,
                url: file.path,
                publicId: file.filename || '',
                fileName: file.originalname,
                fileType: file.mimetype,
                size: file.size
            };
        }
        else {
            attachmentData = {
                testCaseId: parsedTestCaseId,
                url: url,
                publicId: '',
                fileName: fileName || url,
                fileType: fileType || 'link'
            };
        }
        const attachment = await prisma_1.default.attachment.create({
            data: attachmentData
        });
        const testCase = await prisma_1.default.testCase.findUnique({
            where: { id: parsedTestCaseId }
        });
        if (testCase) {
            await prisma_1.default.activityLog.create({
                data: {
                    testCaseId: parsedTestCaseId,
                    userId: req.user.userId,
                    action: 'ATTACHMENT_ADDED',
                    newValue: JSON.stringify({ fileName: attachmentData.fileName, url: attachmentData.url })
                }
            });
            server_1.io.to(`project-${testCase.projectId}`).emit('attachment-added', { attachment, testCaseId: parsedTestCaseId });
        }
        res.status(201).json(attachment);
    }
    catch (error) {
        console.error('Upload attachment error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({
            error: 'Internal server error',
            details: errorMessage
        });
    }
};
exports.uploadAttachment = uploadAttachment;
const deleteAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(Array.isArray(id) ? id[0] : id);
        const attachment = await prisma_1.default.attachment.findUnique({
            where: { id: parsedId }
        });
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
        const testCaseId = attachment.testCaseId;
        const testCase = await prisma_1.default.testCase.findUnique({
            where: { id: testCaseId }
        });
        if (attachment.publicId) {
            await cloudinary_1.default.v2.uploader.destroy(attachment.publicId);
        }
        await prisma_1.default.attachment.delete({
            where: { id: parsedId }
        });
        if (testCase) {
            await prisma_1.default.activityLog.create({
                data: {
                    testCaseId,
                    userId: req.user.userId,
                    action: 'ATTACHMENT_REMOVED',
                    oldValue: JSON.stringify({ fileName: attachment.fileName, url: attachment.url })
                }
            });
            server_1.io.to(`project-${testCase.projectId}`).emit('attachment-removed', { attachmentId: parsedId, testCaseId });
        }
        res.json({ message: 'Attachment deleted successfully' });
    }
    catch (error) {
        console.error('Delete attachment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteAttachment = deleteAttachment;
