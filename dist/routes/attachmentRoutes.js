"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const attachmentController_1 = require("../controllers/attachmentController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authMiddleware, attachmentController_1.upload.single('file'), attachmentController_1.uploadAttachment);
router.delete('/:id', auth_1.authMiddleware, attachmentController_1.deleteAttachment);
exports.default = router;
