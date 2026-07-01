"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../config/prisma"));
const router = express_1.default.Router();
router.get('/', auth_1.authMiddleware, projectController_1.getProjects);
router.get('/archived', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const projects = await prisma_1.default.project.findMany({
            where: {
                isArchived: true,
                OR: [
                    { createdById: userId },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                testCases: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Get archived projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/completed', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const projects = await prisma_1.default.project.findMany({
            where: {
                status: 'completed',
                isArchived: false,
                OR: [
                    { createdById: userId },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                testCases: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Get completed projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id', auth_1.authMiddleware, projectController_1.getProjectById);
router.post('/', auth_1.authMiddleware, projectController_1.createProject);
router.put('/:id', auth_1.authMiddleware, projectController_1.updateProject);
router.put('/:id/archive', auth_1.authMiddleware, async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await prisma_1.default.project.update({
            where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
            data: { isArchived: true }
        });
        res.json(project);
    }
    catch (error) {
        console.error('Archive project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id/resume', auth_1.authMiddleware, async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await prisma_1.default.project.update({
            where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
            data: { isArchived: false }
        });
        res.json(project);
    }
    catch (error) {
        console.error('Resume project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authMiddleware, projectController_1.deleteProject);
router.post('/:projectId/members', auth_1.authMiddleware, async (req, res) => {
    try {
        const projectIdParam = req.params.projectId;
        const { userId, role } = req.body;
        const projectMember = await prisma_1.default.projectMember.create({
            data: {
                projectId: parseInt(Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam),
                userId: parseInt(Array.isArray(userId) ? userId[0] : userId),
                role: role || 'editor'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        res.status(201).json(projectMember);
    }
    catch (error) {
        console.error('Add project member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:projectId/members/:memberId', auth_1.authMiddleware, projectController_1.updateProjectMemberRole);
router.delete('/:projectId/members/:memberId', auth_1.authMiddleware, async (req, res) => {
    try {
        const memberIdParam = req.params.memberId;
        await prisma_1.default.projectMember.delete({
            where: { id: parseInt(Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam) }
        });
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error('Remove project member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:projectId/members', auth_1.authMiddleware, projectController_1.getProjectMembers);
router.post('/invitations', auth_1.authMiddleware, projectController_1.sendProjectInvitation);
router.get('/invitations/pending', auth_1.authMiddleware, projectController_1.getPendingInvitations);
router.post('/invitations/:invitationId/accept', auth_1.authMiddleware, projectController_1.acceptInvitation);
router.post('/invitations/:invitationId/decline', auth_1.authMiddleware, projectController_1.declineInvitation);
exports.default = router;
