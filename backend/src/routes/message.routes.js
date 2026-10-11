import express from 'express';
import {getMessages} from '../controllers/message.controller';
import {protectRoute} from '../middleware/auth.middleware';
import {upload} from '../middleware/upload.middleware';
import {getConversationsForSidebar,getMessages,getUsersForSidebar,sendMessage} from '../controllers/message.controller';

const router = express.Router();

router.use(protectRoute);

router.get('/users',getUsersForSidebar);
router.get('/conversations',getConversationsForSidebar);
router.get('/:id',getMessages);
router.post("/send/:id", upload.single("media"), sendMessage);

export default router;