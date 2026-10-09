import dns from 'node:dns';
import express from 'express';
import 'dotenv/config';

import connectDB from './lib/db.js';

// Força DNS público (corrige o erro querySrv EBADRESP em hotspots/redes que bloqueiam SRV)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

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