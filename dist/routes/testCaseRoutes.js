"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const testCaseController_1 = require("../controllers/testCaseController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/dashboard', auth_1.authMiddleware, testCaseController_1.getDashboardStats);
router.get('/projects/:projectId/activity-logs', auth_1.authMiddleware, testCaseController_1.getProjectActivityLogs);
router.get('/', auth_1.authMiddleware, testCaseController_1.getTestCases);
router.get('/:id', auth_1.authMiddleware, testCaseController_1.getTestCaseById);
router.post('/', auth_1.authMiddleware, testCaseController_1.createTestCase);
router.put('/:id', auth_1.authMiddleware, testCaseController_1.updateTestCase);
router.delete('/:id', auth_1.authMiddleware, testCaseController_1.deleteTestCase);
exports.default = router;
