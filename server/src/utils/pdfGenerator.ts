import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

export interface SampleInvoiceDefinition {
  fileName: string;
  invoiceNumber: string;
  companyName: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  description: string;
  recipient: string;
}

export const SAMPLE_INVOICE_DEFINITIONS: SampleInvoiceDefinition[] = [
  {
    fileName: 'INV-1001-ABC_Technologies.pdf',
    invoiceNumber: 'INV-1001',
    companyName: 'ABC Technologies',
    amount: 12500.00,
    currency: 'USD',
    issueDate: '2026-09-15',
    dueDate: '2026-10-15',
    description: 'Q3 Enterprise Cloud Infrastructure Retainer',
    recipient: 'CentrAlign AI Enterprises'
  },
  {
    fileName: 'INV-1002-ABC_Technologies.pdf',
    invoiceNumber: 'INV-1002',
    companyName: 'ABC Technologies',
    amount: 18750.50,
    currency: 'USD',
    issueDate: '2026-10-01',
    dueDate: '2026-11-01',
    description: 'Q4 AI Platform Optimization and Model Fine-tuning',
    recipient: 'CentrAlign AI Enterprises'
  },
  {
    fileName: 'INV-2001-Global_Corp.pdf',
    invoiceNumber: 'INV-2001',
    companyName: 'Global Corp',
    amount: 9200.00,
    currency: 'USD',
    issueDate: '2026-08-20',
    dueDate: '2026-09-20',
    description: 'Enterprise Data Migration & ETL Pipeline Architecture',
    recipient: 'CentrAlign AI Enterprises'
  },
  {
    fileName: 'INV-2002-Global_Corp.pdf',
    invoiceNumber: 'INV-2002',
    companyName: 'Global Corp',
    amount: 14400.00,
    currency: 'USD',
    issueDate: '2026-09-10',
    dueDate: '2026-10-10',
    description: 'Enterprise Security Audit and Compliance Architecture',
    recipient: 'CentrAlign AI Enterprises'
  },
  {
    fileName: 'INV-3001-Acme_Solutions.pdf',
    invoiceNumber: 'INV-3001',
    companyName: 'Acme Solutions',
    amount: 5600.00,
    currency: 'USD',
    issueDate: '2026-09-05',
    dueDate: '2026-10-05',
    description: 'Autonomous Workflow Automation & Custom Integration',
    recipient: 'CentrAlign AI Enterprises'
  },
  {
    fileName: 'INV-MISSING-DUE-Innovate_Ltd.pdf',
    invoiceNumber: 'INV-4001',
    companyName: 'Innovate Ltd',
    amount: 3450.00,
    currency: 'USD',
    issueDate: '2026-09-12',
    dueDate: null, // intentionally missing
    description: 'Strategic Technical Architecture Consultation',
    recipient: 'CentrAlign AI Enterprises'
  }
];

export async function generateSamplePdf(def: SampleInvoiceDefinition, outputPath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Top header bar (CentrAlign brand navy: #142B4A)
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.078, 0.168, 0.290), // #142B4A
  });

  page.drawText(def.companyName.toUpperCase(), {
    x: 40,
    y: height - 60,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('COMMERCIAL INVOICE', {
    x: width - 220,
    y: height - 60,
    size: 16,
    font: fontBold,
    color: rgb(0.576, 0.773, 0.992), // Light blue accent
  });

  // Invoice Details Box
  const startY = height - 150;
  page.drawText(`Invoice Number:`, { x: 40, y: startY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`${def.invoiceNumber}`, { x: 150, y: startY, size: 11, font: fontRegular, color: rgb(0.15, 0.38, 0.92) });

  page.drawText(`Issue Date:`, { x: 40, y: startY - 24, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`${def.issueDate}`, { x: 150, y: startY - 24, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  page.drawText(`Due Date:`, { x: 40, y: startY - 48, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(def.dueDate ? `${def.dueDate}` : 'NOT SPECIFIED (PENDING)', {
    x: 150,
    y: startY - 48,
    size: 11,
    font: def.dueDate ? fontRegular : fontBold,
    color: def.dueDate ? rgb(0.2, 0.2, 0.2) : rgb(0.86, 0.15, 0.15),
  });

  page.drawText(`Bill To:`, { x: 350, y: startY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`${def.recipient}`, { x: 350, y: startY - 20, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('100 Innovation Way, Suite 400', { x: 350, y: startY - 36, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  // Line item table
  const tableY = startY - 100;
  page.drawRectangle({
    x: 40,
    y: tableY - 10,
    width: width - 80,
    height: 30,
    color: rgb(0.95, 0.96, 0.98),
  });

  page.drawText('Description', { x: 50, y: tableY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Qty', { x: 380, y: tableY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Amount', { x: 470, y: tableY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  // Row 1
  page.drawText(`${def.description}`, { x: 50, y: tableY - 35, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('1.0', { x: 385, y: tableY - 35, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`${def.currency} $${def.amount.toFixed(2)}`, { x: 460, y: tableY - 35, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  // Divider
  page.drawLine({
    start: { x: 40, y: tableY - 60 },
    end: { x: width - 40, y: tableY - 60 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Total summary
  page.drawText('Total Amount Due:', { x: 330, y: tableY - 95, size: 12, font: fontBold, color: rgb(0.08, 0.17, 0.29) });
  page.drawText(`${def.currency} $${def.amount.toFixed(2)}`, { x: 450, y: tableY - 95, size: 14, font: fontBold, color: rgb(0.08, 0.5, 0.24) });

  // Footer notes
  page.drawText('Payment instructions: Electronic bank transfer within terms. Ref: ' + def.invoiceNumber, {
    x: 40,
    y: 60,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });
  // Embed standard PDF Document Information Dictionary
  pdfDoc.setTitle(def.invoiceNumber);
  pdfDoc.setAuthor(def.companyName);
  pdfDoc.setSubject(
    JSON.stringify({
      invoice_number: def.invoiceNumber,
      company_name: def.companyName,
      amount: def.amount,
      currency: def.currency,
      issue_date: def.issueDate,
      due_date: def.dueDate || null,
      description: def.description,
    })
  );
  pdfDoc.setKeywords([def.companyName, def.invoiceNumber, String(def.amount), def.issueDate, def.dueDate || '']);
  pdfDoc.setProducer('CentrAlign AI Enterprise PDF Engine');

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

export async function generateAllSamplePdfs(): Promise<void> {
  const invoicesDir = path.resolve(process.cwd(), '../data/invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  for (const def of SAMPLE_INVOICE_DEFINITIONS) {
    const filePath = path.join(invoicesDir, def.fileName);
    await generateSamplePdf(def, filePath);
  }

  // Also create a corrupted test document for error handling tests
  const corruptedPath = path.join(invoicesDir, 'CORRUPTED_DOCUMENT.pdf');
  fs.writeFileSync(corruptedPath, Buffer.from('NOT_A_VALID_PDF_HEADER_DATA_CONTENT_CORRUPTED_STREAM'));
}
