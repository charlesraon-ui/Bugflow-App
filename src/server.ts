import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import testCaseRoutes from './routes/testCaseRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import prisma from './config/prisma';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/attachments', attachmentRoutes);

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const projects = await prisma.project.findMany({
      where: {
        isArchived: false,
        status: 'active',
        OR: [
          { createdById: userId },
          { members: { some: { userId } } }
        ]
      },
      include: { testCases: true }
    });

    let totalProjects = projects.length;
    let totalTestCases = 0;
    let passed = 0;
    let failed = 0;
    let toFix = 0;
    let open = 0;
    let critical = 0;
    let high = 0;
    let bugs = 0;

    for (const project of projects) {
      const testCases = project.testCases || [];
      totalTestCases += testCases.length;
      
      for (const tc of testCases) {
        if (tc.status === 'PASS') passed++;
        if (tc.status === 'FAILED') failed++;
        if (tc.status === 'TO_FIX') toFix++;
        if (tc.status === 'OPEN') open++;
        if (tc.severity === 'CRITICAL') critical++;
        if (tc.severity === 'HIGH') high++;
        if (tc.issueType === 'BUG') bugs++;
      }
    }

    res.json({
      totalProjects,
      totalTestCases,
      statusCounts: {
        PASS: passed,
        FAILED: failed,
        TO_FIX: toFix,
        OPEN: open,
      },
      passed,
      failed,
      toFix,
      open,
      critical,
      high,
      bugs,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BugFlow API is running!' });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-project', (projectId: number) => {
    socket.join(`project-${projectId}`);
    console.log(`Client ${socket.id} joined project ${projectId}`);
  });

  socket.on('leave-project', (projectId: number) => {
    socket.leave(`project-${projectId}`);
    console.log(`Client ${socket.id} left project ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { io };

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});
