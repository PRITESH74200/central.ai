import { Router } from 'express';
import { db } from '../database/db.js';
import { getAiConfig } from '../services/gemini.js';
import { toolsRegistry } from '../tools/registry.js';
import { setSimulateTemporaryFailure, isSimulateTemporaryFailure } from '../tools/financeTools.js';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

// GET /api/health - System diagnostics
router.get('/', (req, res) => {
  try {
    // Check DB
    const dbCheck = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };

    // Check files directory
    const invoicesDir = path.resolve(process.cwd(), '../data/invoices');
    const filesExist = fs.existsSync(invoicesDir);
    const fileCount = filesExist ? fs.readdirSync(invoicesDir).length : 0;

    const aiConfig = getAiConfig();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      environment: {
        node_version: process.version,
        platform: process.platform,
        database: dbCheck.healthy === 1 ? 'connected' : 'error',
        invoices_in_db: invoiceCount.count,
        tasks_in_db: taskCount.count,
        sample_files_count: fileCount,
      },
      ai_worker: {
        model: aiConfig.modelName,
        connected: aiConfig.isConnected,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxOutputTokens,
        timeout_ms: aiConfig.timeoutMs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'unhealthy', error: err.message });
  }
});

// GET /api/settings - Settings page data
router.get('/settings', (req, res) => {
  const aiConfig = getAiConfig();
  const tools = Object.keys(toolsRegistry).map((key) => ({
    name: key,
    description: toolsRegistry[key].description,
    available: true,
  }));

  res.json({
    success: true,
    ai_configuration: {
      model_name: aiConfig.modelName,
      connected: aiConfig.isConnected,
      temperature: aiConfig.temperature,
      max_output_tokens: aiConfig.maxOutputTokens,
      timeout_ms: aiConfig.timeoutMs,
      transient_retries: 2,
    },
    execution_limits: {
      max_steps_per_task: 12,
      retry_count: 2,
      tool_timeout_ms: 10000,
      mode: 'autonomous_observe_decide_act',
    },
    tools,
    environment: {
      database: 'SQLite 3 (WAL mode)',
      backend_status: 'operational',
      sample_data_status: 'seeded',
      version: '1.0.0-enterprise',
      failure_simulation_active: isSimulateTemporaryFailure(),
    },
  });
});

// POST /api/settings/simulation - Toggle temporary failure simulation for Scenario 5
router.post('/settings/simulation', (req, res) => {
  const { enabled } = req.body;
  setSimulateTemporaryFailure(Boolean(enabled));
  res.json({
    success: true,
    failure_simulation_active: isSimulateTemporaryFailure(),
    message: isSimulateTemporaryFailure()
      ? 'Temporary Finance API gateway failure simulation is now ENABLED. The next finance write will simulate a 504 timeout and test autonomous retry recovery.'
      : 'Temporary failure simulation DISABLED.',
  });
});

export default router;
