import path from 'node:path';
import fs from 'node:fs';

export function getDataDir(): string {
  // Try relative to cwd
  const directData = path.resolve(process.cwd(), 'data');
  const parentData = path.resolve(process.cwd(), '../data');

  if (fs.existsSync(directData)) return directData;
  if (fs.existsSync(parentData)) return parentData;

  // Default to parentData if in server folder, or directData if in root
  if (path.basename(process.cwd()) === 'server') {
    return parentData;
  }
  return directData;
}

export function getInvoicesDir(): string {
  const dataDir = getDataDir();
  const invoicesDir = path.join(dataDir, 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
  return invoicesDir;
}
