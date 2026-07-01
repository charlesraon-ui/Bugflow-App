"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectActivityLogs = exports.getDashboardStats = exports.deleteTestCase = exports.updateTestCase = exports.createTestCase = exports.getTestCaseById = exports.getTestCases = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const server_1 = require("../server");
const generateCaseNumber = async (projectId) => {
    const totalTestCasesInProject = await prisma_1.default.testCase.count({
        where: { projectId }
    });
    const nextNumber = totalTestCasesInProject + 1;
    return `CASE_${String(nextNumber).padStart(3, '0')}`;
};
const getTestCases = async (req, res) => {
    try {
        const { projectId, status, severity, priority, assignedToId } = req.query;
        const where = {};
        if (projectId)
            where.projectId = parseInt(projectId);
        if (status)
            where.status = status;
        if (severity)
            where.severity = severity;
        if (priority)
            where.priority = priority;
        if (assignedToId)
            where.assignedToId = parseInt(assignedToId);
        const testCases = await prisma_1.default.testCase.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                verifiedBy: { select: { id: true, name: true, email: true } },
                attachments: {
                    orderBy: { createdAt: 'asc' }
                },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(testCases);
    }
    catch (error) {
        console.error('Get test cases error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTestCases = getTestCases;
const getTestCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const testCase = await prisma_1.default.testCase.findUnique({
            where: { id: parseInt(Array.isArray(id) ? id[0] : id) },
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                verifiedBy: { select: { id: true, name: true, email: true } },
                attachments: {
                    orderBy: { createdAt: 'asc' }
                },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!testCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        res.json(testCase);
    }
    catch (error) {
        console.error('Get test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTestCaseById = getTestCaseById;
const createTestCase = async (req, res) => {
    try {
        const { projectId, version, title, expectedResult, actualResult, testData, stepsToReproduce, severity, priority, issueType, status, assignedToId, comments, rootCause, actionPlan, developerSolution } = req.body;
        // Check if project is completed
        const project = await prisma_1.default.project.findUnique({
            where: { id: parseInt(projectId) }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (project.status === 'completed') {
            return res.status(403).json({ error: 'Cannot modify a completed project' });
        }
        const caseNumber = await generateCaseNumber(parseInt(projectId));
        const testCase = await prisma_1.default.testCase.create({
            data: {
                projectId: parseInt(projectId),
                caseNumber,
                version,
                title,
                expectedResult,
                actualResult,
                testData,
                stepsToReproduce,
                severity: severity || 'MEDIUM',
                priority: priority || 'MEDIUM',
                issueType: issueType || 'BUG',
                status: status || 'OPEN',
                assignedToId: assignedToId ? parseInt(assignedToId) : null,
                comments,
                rootCause,
                actionPlan,
                developerSolution,
                createdById: req.user.userId
            },
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                attachments: true
            }
        });
        await prisma_1.default.activityLog.create({
            data: {
                testCaseId: testCase.id,
                userId: req.user.userId,
                action: 'CREATED',
                newValue: JSON.stringify({ title, caseNumber })
            }
        });
        server_1.io.to(`project-${parseInt(projectId)}`).emit('test-case-created', testCase);
        res.status(201).json(testCase);
    }
    catch (error) {
        console.error('Create test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createTestCase = createTestCase;
const updateTestCase = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};
        const allowedFields = [
            'version', 'title', 'expectedResult', 'actualResult', 'testData',
            'stepsToReproduce', 'severity', 'priority', 'issueType', 'status',
            'assignedToId', 'comments', 'rootCause', 'actionPlan', 'developerSolution',
            'verifiedById', 'verificationDate', 'developerPushDate'
        ];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        if (updateData.projectId)
            updateData.projectId = parseInt(updateData.projectId);
        if (updateData.assignedToId !== undefined) {
            updateData.assignedToId = updateData.assignedToId ? parseInt(updateData.assignedToId) : null;
        }
        if (updateData.verifiedById !== undefined) {
            updateData.verifiedById = updateData.verifiedById ? parseInt(updateData.verifiedById) : null;
        }
        const oldTestCase = await prisma_1.default.testCase.findUnique({
            where: { id: parseInt(Array.isArray(id) ? id[0] : id) },
            include: { project: true }
        });
        if (!oldTestCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        // Check if project is completed
        if (oldTestCase.project.status === 'completed') {
            return res.status(403).json({ error: 'Cannot modify a completed project' });
        }
        delete updateData.logsDate;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.id;
        delete updateData.caseNumber;
        delete updateData.createdById;
        delete updateData.project;
        const activityLogsToCreate = [];
        if (updateData.status && oldTestCase.status !== updateData.status) {
            activityLogsToCreate.push({
                testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
                userId: req.user.userId,
                action: 'STATUS_CHANGED',
                oldValue: oldTestCase.status,
                newValue: updateData.status
            });
            if (updateData.status === 'FOR_QA') {
                updateData.developerPushDate = new Date();
            }
            if (updateData.status === 'PASS' || updateData.status === 'FAILED') {
                updateData.verifiedById = req.user.userId;
                updateData.verificationDate = new Date();
            }
        }
        if (updateData.assignedToId !== undefined && oldTestCase.assignedToId !== updateData.assignedToId) {
            activityLogsToCreate.push({
                testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
                userId: req.user.userId,
                action: 'ASSIGNED',
                oldValue: oldTestCase.assignedToId ? String(oldTestCase.assignedToId) : null,
                newValue: updateData.assignedToId ? String(updateData.assignedToId) : null
            });
        }
        const fieldsToTrack = [
            'title', 'version', 'expectedResult', 'actualResult',
            'testData', 'stepsToReproduce', 'severity', 'priority',
            'issueType', 'comments', 'rootCause', 'actionPlan',
            'developerSolution'
        ];
        fieldsToTrack.forEach(field => {
            if (updateData[field] !== undefined && String(oldTestCase[field] || '') !== String(updateData[field] || '')) {
                activityLogsToCreate.push({
                    testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
                    userId: req.user.userId,
                    action: 'UPDATED',
                    oldValue: JSON.stringify({ field, value: oldTestCase[field] }),
                    newValue: JSON.stringify({ field, value: updateData[field] })
                });
            }
        });
        if (activityLogsToCreate.length > 0) {
            await prisma_1.default.activityLog.createMany({
                data: activityLogsToCreate
            });
        }
        const testCase = await prisma_1.default.testCase.update({
            where: { id: parseInt(Array.isArray(id) ? id[0] : id) },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                verifiedBy: { select: { id: true, name: true, email: true } },
                attachments: true,
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        server_1.io.to(`project-${testCase.projectId}`).emit('test-case-updated', testCase);
        res.json(testCase);
    }
    catch (error) {
        console.error('Update test case error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};
exports.updateTestCase = updateTestCase;
const deleteTestCase = async (req, res) => {
    try {
        const { id } = req.params;
        const testCase = await prisma_1.default.testCase.findUnique({
            where: { id: parseInt(Array.isArray(id) ? id[0] : id) },
            include: { project: true }
        });
        if (!testCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        // Check if project is completed
        if (testCase.project.status === 'completed') {
            return res.status(403).json({ error: 'Cannot modify a completed project' });
        }
        const projectId = testCase.projectId;
        await prisma_1.default.activityLog.deleteMany({
            where: { testCaseId: parseInt(Array.isArray(id) ? id[0] : id) }
        });
        await prisma_1.default.attachment.deleteMany({
            where: { testCaseId: parseInt(Array.isArray(id) ? id[0] : id) }
        });
        await prisma_1.default.testCase.delete({
            where: { id: parseInt(Array.isArray(id) ? id[0] : id) }
        });
        server_1.io.to(`project-${projectId}`).emit('test-case-deleted', parseInt(Array.isArray(id) ? id[0] : id));
        res.json({ message: 'Test case deleted successfully' });
    }
    catch (error) {
        console.error('Delete test case error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteTestCase = deleteTestCase;
const getDashboardStats = async (req, res) => {
    try {
        const totalProjects = await prisma_1.default.project.count();
        const totalTestCases = await prisma_1.default.testCase.count();
        const statusCounts = await prisma_1.default.testCase.groupBy({
            by: ['status'],
            _count: { status: true }
        });
        const stats = {
            totalProjects,
            totalTestCases,
            statusCounts: {}
        };
        statusCounts.forEach(item => {
            stats.statusCounts[item.status] = item._count.status;
        });
        res.json(stats);
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getProjectActivityLogs = async (req, res) => {
    try {
        const { projectId } = req.params;
        const activityLogs = await prisma_1.default.activityLog.findMany({
            where: {
                testCase: {
                    projectId: parseInt(Array.isArray(projectId) ? projectId[0] : projectId),
                },
            },
            include: {
                testCase: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(activityLogs);
    }
    catch (error) {
        console.error('Get project activity logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProjectActivityLogs = getProjectActivityLogs;
