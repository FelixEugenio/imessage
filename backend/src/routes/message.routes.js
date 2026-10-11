// Express: framework para criar as rotas
import express from 'express';
// Middleware que verifica se o utilizador está autenticado (preenche req.user)
import { protectRoute } from '../middleware/auth.middleware.js';
// Middleware (multer) que recebe o ficheiro enviado no campo "media"
import { upload } from '../middleware/upload.middleware.js';
// Funções que tratam cada rota
import {
  getConversationsForSidebar,
  getMessages,
  getUsersForSidebar,
  sendMessage,
} from '../controllers/message.controller.js';

// Cria um router: um grupo de rotas que depois é montado no app (ex.: app.use('/api/messages', router))
const router = express.Router();

// Todas as rotas abaixo exigem autenticação
router.use(protectRoute);

// GET /users -> lista todos os utilizadores, menos eu
router.get('/users', getUsersForSidebar);
// GET /conversations -> lista só quem já conversou comigo, mais recentes primeiro
router.get('/conversations', getConversationsForSidebar);
// GET /:id -> histórico de mensagens com o utilizador :id
router.get('/:id', getMessages);
// POST /send/:id -> envia mensagem ao utilizador :id
// upload.single("media") lê o ficheiro opcional enviado no campo "media" e põe-no em req.file
router.post('/send/:id', upload.single('media'), sendMessage);

export default router;