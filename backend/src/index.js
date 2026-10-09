import dns from 'node:dns';
import express from 'express';
import 'dotenv/config';
import {clerkMiddleware} from '@clerk/express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import job from './lib/cron.js';
import clerkWebhook from './webhooks/clerk.webhook.js';
import authRoutes from './routes/auth.routes.js';

import connectDB from './lib/db.js';

// Força DNS público (corrige o erro querySrv EBADRESP em hotspots/redes que bloqueiam SRV)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const publicDir = path.join(process.cwd(), 'public');

app.use('/api/webhooks/clerk',express.raw({type: 'application/json'}),clerkWebhook); // Necessário para webhooks do Clerk
app.use(express.json());
app.use(cors({origin: FRONTEND_URL, credentials: true}));
app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok'});
});

app.use('/api', authRoutes);

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*any}', (req, res, next) => {
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
if(process.env.NODE_ENV === 'production')  job.start(); // Inicia o cron job para manter o servidor acordado no Render.
