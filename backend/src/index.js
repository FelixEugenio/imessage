import dns from 'node:dns';
import express from 'express';
import 'dotenv/config';
import {clerkMiddleware} from '@clerk/express';

import connectDB from './lib/db.js';

// Força DNS público (corrige o erro querySrv EBADRESP em hotspots/redes que bloqueiam SRV)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(express.json());
app.use(cors({origin: FRONTEND_URL, credentials: true}));
app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok'});
});

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