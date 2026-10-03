import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { initializeDatabase } from './database/db.js';
import tasksRouter from './routes/tasks.js';
import invoicesRouter from './routes/invoices.js';
import filesRouter from './routes/files.js';
import healthRouter from './routes/health.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

// Ensure DB is initialized
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.includes('/events') && !req.url.includes('/health')) {
      console.log(`[${req.method}] ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/files', filesRouter);
app.use('/api/health', healthRouter);
app.use('/api', healthRouter); // For /api/settings

// Root check
app.get('/', (req, res) => {
  res.json({
    name: 'CentrAlign AI — Autonomous AI Task Worker API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Centralized Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal server error occurred.',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CentrAlign AI Worker Server running on http://localhost:${PORT}`);
  console.log(` API Endpoints active: /api/tasks, /api/invoices, /api/files`);
  console.log(` Environment: Node ${process.version} | SQLite WAL`);
  console.log(`=======================================================`);
});
