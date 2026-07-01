import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { io } from '../server';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statusFilter = req.query.status as string | undefined;
    
    const where: any = {
      isArchived: false,
      OR: [
        { createdById: userId },
        { members: { some: { userId } } }
      ]
    };

    if (statusFilter === 'active') {
      where.NOT = { status: 'completed' };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { testCases: true }
        },
        testCases: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(Array.isArray(id) ? id[0] : id) },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        testCases: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access
    const hasAccess = project.createdById === userId || 
      project.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user!.userId;

    // Check if project with same name already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        name,
        createdById: userId,
        isArchived: false
      }
    });

    if (existingProject) {
      return res.status(400).json({ error: 'A project with this name already exists. Please use another name.' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'active',
        createdById: userId
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user!.userId;
    const projectId = parseInt(Array.isArray(id) ? id[0] : id);

    // Get project first to check access
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access
    const hasAccess = existingProject.createdById === userId || 
      existingProject.members.some(member => member.userId === userId && 
        (member.role === 'author' || member.role === 'editor'));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if another project with same name exists for this user
    if (name && name !== existingProject.name) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          name,
          createdById: userId,
          isArchived: false,
          NOT: { id: projectId }
        }
      });

      if (duplicateProject) {
        return res.status(400).json({ error: 'A project with this name already exists. Please use another name.' });
      }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, description, status },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(Array.isArray(id) ? id[0] : id);

    // Delete all related records first
    await prisma.activityLog.deleteMany({
      where: { testCase: { projectId } }
    });

    await prisma.attachment.deleteMany({
      where: { testCase: { projectId } }
    });

    await prisma.testCase.deleteMany({
      where: { projectId }
    });

    await prisma.projectMember.deleteMany({
      where: { projectId }
    });

    await prisma.projectInvitation.deleteMany({
      where: { projectId }
    });

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addProjectMember = async (req: Request, res: Response) => {
  try {
    const { projectId, userId, role } = req.body;
    const currentUserId = req.user!.userId;
    
    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId as string) },
      include: { members: true }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isAuthor = project.createdById === currentUserId;
    const isEditor = project.members.some(m => m.userId === currentUserId && m.role === 'editor');
    
    if (!isAuthor && !isEditor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: parseInt(projectId as string),
        userId: parseInt(userId as string),
        role: role || 'editor'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    io.to(`project-${projectId}`).emit('project-member-added', projectMember);

    res.status(201).json(projectMember);
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const { projectId, memberId } = req.params;
    const currentUserId = req.user!.userId;
    
    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
      include: { members: true }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isAuthor = project.createdById === currentUserId;
    const isEditor = project.members.some(m => m.userId === currentUserId && m.role === 'editor');
    
    if (!isAuthor && !isEditor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.projectMember.delete({
      where: { id: parseInt(Array.isArray(memberId) ? memberId[0] : memberId) }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProjectMemberRole = async (req: Request, res: Response) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user!.userId;
    
    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(Array.isArray(projectId) ? projectId[0] : projectId) },
      include: { members: true }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isAuthor = project.createdById === currentUserId;
    const isEditor = project.members.some(m => m.userId === currentUserId && m.role === 'editor');
    
    if (!isAuthor && !isEditor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projectMember = await prisma.projectMember.update({
      where: { id: parseInt(Array.isArray(memberId) ? memberId[0] : memberId) },
      data: { role: role as 'author' | 'editor' | 'viewer' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    io.to(`project-${projectId}`).emit('project-member-role-updated', projectMember);

    res.json(projectMember);
  } catch (error) {
    console.error('Update project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    const projectIdParam = req.params.projectId;
    const userId = req.user!.userId;
    
    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam) },
      include: { members: true }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const hasAccess = project.createdById === userId || project.members.some(m => m.userId === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: parseInt(Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam) },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(members);
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      where: {
        NOT: {
          id: req.user!.userId
        }
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendProjectInvitation = async (req: Request, res: Response) => {
  try {
    const { projectId, invitedToId, role } = req.body;
    const invitedById = req.user!.userId;
    
    // Check if user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: { members: true }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isAuthor = project.createdById === invitedById;
    const isEditor = project.members.some(m => m.userId === invitedById && m.role === 'editor');
    
    if (!isAuthor && !isEditor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId: parseInt(projectId),
        invitedToId: parseInt(invitedToId),
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: parseInt(projectId),
        userId: parseInt(invitedToId)
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId: parseInt(projectId),
        invitedById,
        invitedToId: parseInt(invitedToId),
        role: role || 'editor'
      },
      include: {
        project: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
        invitedTo: { select: { id: true, name: true, email: true } }
      }
    });

    io.emit('project-invitation-sent', { invitation, invitedToId: parseInt(invitedToId) });

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const invitations = await prisma.projectInvitation.findMany({
      where: {
        invitedToId: userId,
        status: 'pending'
      },
      include: {
        project: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user!.userId;

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: parseInt(Array.isArray(invitationId) ? invitationId[0] : invitationId) }
    });

    if (!invitation || invitation.invitedToId !== userId) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await prisma.$transaction([
      prisma.projectInvitation.update({
        where: { id: parseInt(Array.isArray(invitationId) ? invitationId[0] : invitationId) },
        data: { status: 'accepted' }
      }),
      prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId,
          role: invitation.role
        }
      })
    ]);

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const declineInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user!.userId;

    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: parseInt(Array.isArray(invitationId) ? invitationId[0] : invitationId) }
    });

    if (!invitation || invitation.invitedToId !== userId) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await prisma.projectInvitation.update({
      where: { id: parseInt(Array.isArray(invitationId) ? invitationId[0] : invitationId) },
      data: { status: 'declined' }
    });

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
