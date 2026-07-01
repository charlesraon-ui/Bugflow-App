import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { io } from '../server';

const generateCaseNumber = async (projectId: number) => {
  const totalTestCasesInProject = await prisma.testCase.count({
    where: { projectId }
  });
  const nextNumber = totalTestCasesInProject + 1;
  return `CASE_${String(nextNumber).padStart(3, '0')}`;
};

export const getTestCases = async (req: Request, res: Response) => {
  try {
    const { projectId, status, severity, priority, assignedToId } = req.query;

    const where: any = {};
    if (projectId) where.projectId = parseInt(projectId as string);
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = parseInt(assignedToId as string);

    const testCases = await prisma.testCase.findMany({
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
  } catch (error) {
    console.error('Get test cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTestCaseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testCase = await prisma.testCase.findUnique({
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
  } catch (error) {
    console.error('Get test case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTestCase = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      version,
      title,
      expectedResult,
      actualResult,
      testData,
      stepsToReproduce,
      severity,
      priority,
      issueType,
      status,
      assignedToId,
      comments,
      rootCause,
      actionPlan,
      developerSolution
    } = req.body;
    
    // Check if project is completed
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId as string) }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.status === 'completed') {
      return res.status(403).json({ error: 'Cannot modify a completed project' });
    }

    const caseNumber = await generateCaseNumber(parseInt(projectId as string));

    const testCase = await prisma.testCase.create({
      data: {
        projectId: parseInt(projectId as string),
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
        assignedToId: assignedToId ? parseInt(assignedToId as string) : null,
        comments,
        rootCause,
        actionPlan,
        developerSolution,
        createdById: req.user!.userId
      },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        attachments: true
      }
    });

    await prisma.activityLog.create({
      data: {
        testCaseId: testCase.id,
        userId: req.user!.userId,
        action: 'CREATED',
        newValue: JSON.stringify({ title, caseNumber })
      }
    });

    io.to(`project-${parseInt(projectId)}`).emit('test-case-created', testCase);

    res.status(201).json(testCase);
  } catch (error) {
    console.error('Create test case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTestCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};
    
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

    if (updateData.projectId) updateData.projectId = parseInt(updateData.projectId as string);
    if (updateData.assignedToId !== undefined) {
      updateData.assignedToId = updateData.assignedToId ? parseInt(updateData.assignedToId as string) : null;
    }
    if (updateData.verifiedById !== undefined) {
      updateData.verifiedById = updateData.verifiedById ? parseInt(updateData.verifiedById as string) : null;
    }

    const oldTestCase = await prisma.testCase.findUnique({
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

    const activityLogsToCreate: any[] = [];

    if (updateData.status && oldTestCase.status !== updateData.status) {
      activityLogsToCreate.push({
        testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
        userId: req.user!.userId,
        action: 'STATUS_CHANGED',
        oldValue: oldTestCase.status,
        newValue: updateData.status
      });

      if (updateData.status === 'FOR_QA') {
        updateData.developerPushDate = new Date();
      }

      if (updateData.status === 'PASS' || updateData.status === 'FAILED') {
        updateData.verifiedById = req.user!.userId;
        updateData.verificationDate = new Date();
      }
    }

    if (updateData.assignedToId !== undefined && oldTestCase.assignedToId !== updateData.assignedToId) {
      activityLogsToCreate.push({
        testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
        userId: req.user!.userId,
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
      if (updateData[field] !== undefined && String((oldTestCase as any)[field] || '') !== String(updateData[field] || '')) {
        activityLogsToCreate.push({
          testCaseId: parseInt(Array.isArray(id) ? id[0] : id),
          userId: req.user!.userId,
          action: 'UPDATED',
          oldValue: JSON.stringify({ field, value: (oldTestCase as any)[field] }),
          newValue: JSON.stringify({ field, value: updateData[field] })
        });
      }
    });

    if (activityLogsToCreate.length > 0) {
      await prisma.activityLog.createMany({
        data: activityLogsToCreate
      });
    }

    const testCase = await prisma.testCase.update({
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

    io.to(`project-${testCase.projectId}`).emit('test-case-updated', testCase);

    res.json(testCase);
  } catch (error: any) {
    console.error('Update test case error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const deleteTestCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const testCase = await prisma.testCase.findUnique({
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

    await prisma.activityLog.deleteMany({
      where: { testCaseId: parseInt(Array.isArray(id) ? id[0] : id) }
    });

    await prisma.attachment.deleteMany({
      where: { testCaseId: parseInt(Array.isArray(id) ? id[0] : id) }
    });

    await prisma.testCase.delete({
      where: { id: parseInt(Array.isArray(id) ? id[0] : id) }
    });

    io.to(`project-${projectId}`).emit('test-case-deleted', parseInt(Array.isArray(id) ? id[0] : id));

    res.json({ message: 'Test case deleted successfully' });
  } catch (error) {
    console.error('Delete test case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalProjects = await prisma.project.count();
    const totalTestCases = await prisma.testCase.count();
    
    const statusCounts = await prisma.testCase.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    const stats: any = {
      totalProjects,
      totalTestCases,
      statusCounts: {}
    };

    statusCounts.forEach(item => {
      stats.statusCounts[item.status] = item._count.status;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectActivityLogs = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const activityLogs = await prisma.activityLog.findMany({
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
  } catch (error) {
    console.error('Get project activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
