import express from 'express';
const router = express.Router();

import { askChatbot } from '../controllers/chatbotController.js';

router.route('/').post(askChatbot);

export default router;
