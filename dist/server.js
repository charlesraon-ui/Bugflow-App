"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const testCaseRoutes_1 = __importDefault(require("./routes/testCaseRoutes"));
const attachmentRoutes_1 = __importDefault(require("./routes/attachmentRoutes"));
const prisma_1 = __importDefault(require("./config/prisma"));
const auth_1 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
exports.io = io;
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/test-cases', testCaseRoutes_1.default);
app.use('/api/attachments', attachmentRoutes_1.default);
app.get('/api/dashboard/stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const projects = await prisma_1.default.project.findMany({
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
                if (tc.status === 'PASS')
                    passed++;
                if (tc.status === 'FAILED')
                    failed++;
                if (tc.status === 'TO_FIX')
                    toFix++;
                if (tc.status === 'OPEN')
                    open++;
                if (tc.severity === 'CRITICAL')
                    critical++;
                if (tc.severity === 'HIGH')
                    high++;
                if (tc.issueType === 'BUG')
                    bugs++;
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
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BugFlow API is running!' });
});
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('join-project', (projectId) => {
        socket.join(`project-${projectId}`);
        console.log(`Client ${socket.id} joined project ${projectId}`);
    });
    socket.on('leave-project', (projectId) => {
        socket.leave(`project-${projectId}`);
        console.log(`Client ${socket.id} left project ${projectId}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});
