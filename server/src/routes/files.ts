import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { readInvoiceFile } from '../tools/invoiceReader.js';
import { getInvoicesDir } from '../utils/paths.js';

const router = Router();

// GET /api/files - List all documents in the restricted sample invoice directory
router.get('/', async (req, res) => {
  try {
    const invoicesDir = getInvoicesDir();
    if (!fs.existsSync(invoicesDir)) {
      return res.json({ success: true, files: [] });
    }

    const fileNames = fs.readdirSync(invoicesDir).filter((f) => f.endsWith('.pdf'));
    const fileList: any[] = [];

    for (const fileName of fileNames) {
      const filePath = path.join(invoicesDir, fileName);
      const stat = fs.statSync(filePath);

      let parsedInfo: any = null;
      let status: 'processed' | 'warning' | 'corrupted' = 'processed';

      try {
        parsedInfo = await readInvoiceFile(fileName);
        if (parsedInfo.missing_fields && parsedInfo.missing_fields.length > 0) {
          status = 'warning';
        }
      } catch {
        status = 'corrupted';
      }

      fileList.push({
        file_name: fileName,
        file_size: stat.size,
        modified_at: stat.mtime.toISOString(),
        status,
        company: parsedInfo?.company_name || (fileName.includes('ABC') ? 'ABC Technologies' : 'Unknown'),
        invoice_number: parsedInfo?.invoice_number || null,
        amount: parsedInfo?.amount || null,
        currency: parsedInfo?.currency || 'USD',
        issue_date: parsedInfo?.issue_date || null,
        due_date: parsedInfo?.due_date || null,
        missing_fields: parsedInfo?.missing_fields || [],
        warnings: parsedInfo?.extraction_warnings || [],
      });
    }

    res.json({ success: true, count: fileList.length, files: fileList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:filename/preview - Get detailed extraction for a file
router.get('/:filename/preview', async (req, res) => {
  try {
    const invoicesDir = getInvoicesDir();
    const fileName = path.basename(req.params.filename);
    const filePath = path.join(invoicesDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    try {
      const extracted = await readInvoiceFile(fileName);
      res.json({ success: true, extracted });
    } catch (err: any) {
      res.status(422).json({ success: false, error: err.message, corrupted: true });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:filename/raw - Stream PDF for browser preview
router.get('/:filename/raw', (req, res) => {
  try {
    const invoicesDir = getInvoicesDir();
    const fileName = path.basename(req.params.filename);
    const filePath = path.join(invoicesDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
