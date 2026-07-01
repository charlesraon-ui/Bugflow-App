import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMemberRole,
  getProjectMembers,
  sendProjectInvitation,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation
} from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/prisma';

const router = express.Router();

router.get('/', authMiddleware, getProjects);
router.get('/archived', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const projects = await prisma.project.findMany({
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
  } catch (error) {
    console.error('Get archived projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/completed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const projects = await prisma.project.findMany({
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
  } catch (error) {
    console.error('Get completed projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/:id', authMiddleware, getProjectById);
router.post('/', authMiddleware, createProject);
router.put('/:id', authMiddleware, updateProject);
router.put('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.update({
      where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
      data: { isArchived: true }
    });
    res.json(project);
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.put('/:id/resume', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.update({
      where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
      data: { isArchived: false }
    });
    res.json(project);
  } catch (error) {
    console.error('Resume project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/:id', authMiddleware, deleteProject);
router.post('/:projectId/members', authMiddleware, async (req, res) => {
  try {
    const projectIdParam = req.params.projectId;
    const { userId, role } = req.body;

    const projectMember = await prisma.projectMember.create({
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
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.put('/:projectId/members/:memberId', authMiddleware, updateProjectMemberRole);
router.delete('/:projectId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const memberIdParam = req.params.memberId;

    await prisma.projectMember.delete({
      where: { id: parseInt(Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam) }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/:projectId/members', authMiddleware, getProjectMembers);
router.post('/invitations', authMiddleware, sendProjectInvitation);
router.get('/invitations/pending', authMiddleware, getPendingInvitations);
router.post('/invitations/:invitationId/accept', authMiddleware, acceptInvitation);
router.post('/invitations/:invitationId/decline', authMiddleware, declineInvitation);

export default router;
