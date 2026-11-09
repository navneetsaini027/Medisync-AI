import crypto from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serverRoot } from '../config/env.js';
import { logger } from '../utils/logger.js';

const reportsFilePath = path.join(serverRoot, 'reports.json');
const uploadsDirectory = path.join(serverRoot, 'uploads');

export interface ReportFileUpload {
  fileName: string;
  fileSize: number;
  mimeType: string;
  data: string;
}

export interface StoredReportFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

export interface ReportFileDownload {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export interface ReportRecord {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  files?: StoredReportFile[];
  fileStorageStatus?: 'stored' | 'skipped' | 'failed';
  rawExtraction?: string;
  simplifiedReport?: string;
  recommendations?: string | null;
  insights?: string | null;
  resources?: string | null;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportsFile {
  reports: ReportRecord[];
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'report-file';
}

function decodeBase64File(data: string): Buffer {
  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  return Buffer.from(base64, 'base64');
}

function getReportUploadDirectory(id: string): string {
  if (!/^[a-f0-9]{32}$/.test(id)) {
    throw new Error('Invalid report ID');
  }

  return path.join(uploadsDirectory, id);
}

let writeQueue: Promise<void> = Promise.resolve();

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readReports(): Promise<ReportsFile> {
  const contents = await readFile(reportsFilePath, 'utf8');
  const parsed: unknown = JSON.parse(contents);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('reports' in parsed) ||
    !Array.isArray(parsed.reports)
  ) {
    throw new Error(`Invalid reports database format in ${reportsFilePath}`);
  }

  return parsed as ReportsFile;
}

async function writeReports(data: ReportsFile): Promise<void> {
  const temporaryPath = `${reportsFilePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, reportsFilePath);
}

async function saveUploadedFiles(reportId: string, files: ReportFileUpload[]): Promise<StoredReportFile[]> {
  const reportDirectory = getReportUploadDirectory(reportId);
  await mkdir(reportDirectory, { recursive: true });

  const storedFiles: StoredReportFile[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const storagePath = path.join(reportId, `${index + 1}-${sanitizeFileName(file.fileName)}`);
      const filePath = path.join(uploadsDirectory, storagePath);
      const data = decodeBase64File(file.data);

      await writeFile(filePath, data, { flag: 'wx' });
      storedFiles.push({
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        storagePath,
      });
    }

    return storedFiles;
  } catch (error) {
    await rm(reportDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  await mkdir(uploadsDirectory, { recursive: true });

  try {
    await readReports();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      await writeFile(reportsFilePath, '{\n  "reports": []\n}\n', 'utf8');
    } else {
      logger.error('database.initialization_failed', { error });
      throw error;
    }
  }

  logger.info('database.initialized', {
    reportsFilePath,
    uploadsDirectory,
  });
}

export async function saveReport(report: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  language: string;
  files?: ReportFileUpload[];
  status?: ReportRecord['status'];
}): Promise<string> {
  const id = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const storedFiles = report.files?.length ? await saveUploadedFiles(id, report.files) : [];
  const record: ReportRecord = {
    id,
    fileName: report.fileName,
    fileSize: report.fileSize,
    mimeType: report.mimeType,
    language: report.language,
    status: report.status || 'pending',
    files: storedFiles,
    fileStorageStatus: storedFiles.length ? 'stored' : 'skipped',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await serializeWrite(async () => {
      const database = await readReports();
      database.reports.push(record);
      await writeReports(database);
    });
  } catch (error) {
    await rm(getReportUploadDirectory(id), { recursive: true, force: true });
    throw error;
  }

  logger.info('report.created', {
    reportId: id,
    status: record.status,
    fileCount: storedFiles.length,
    fileStorageStatus: record.fileStorageStatus,
  });
  return id;
}

export async function updateReportAnalysis(id: string, updates: {
  status?: ReportRecord['status'];
  rawExtraction?: string;
  simplifiedReport?: string;
  recommendations?: string | null;
  insights?: string | null;
  resources?: string | null;
  errorMessage?: string;
}): Promise<boolean> {
  return serializeWrite(async () => {
    const database = await readReports();
    const report = database.reports.find((item) => item.id === id);
    if (!report) return false;

    if (updates.status !== undefined) report.status = updates.status;
    if (updates.rawExtraction !== undefined) report.rawExtraction = updates.rawExtraction;
    if (updates.simplifiedReport !== undefined) report.simplifiedReport = updates.simplifiedReport;
    if (updates.recommendations !== undefined) report.recommendations = updates.recommendations;
    if (updates.insights !== undefined) report.insights = updates.insights;
    if (updates.resources !== undefined) report.resources = updates.resources;
    if (updates.errorMessage !== undefined) report.errorMessage = updates.errorMessage;
    report.updatedAt = new Date().toISOString();

    await writeReports(database);
    logger.info('report.analysis_updated', {
      reportId: id,
      status: updates.status,
      fields: Object.keys(updates),
    });
    return true;
  });
}

export async function getAllReports(): Promise<ReportRecord[]> {
  const { reports } = await readReports();
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportById(id: string): Promise<ReportRecord | null> {
  const { reports } = await readReports();
  return reports.find((report) => report.id === id) || null;
}

export async function getReportFile(id: string, fileIndex: number): Promise<ReportFileDownload | null> {
  const report = await getReportById(id);
  const file = report?.files?.[fileIndex];
  if (!file) return null;

  const filePath = path.resolve(uploadsDirectory, file.storagePath);
  const relativePath = path.relative(uploadsDirectory, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error(`Invalid upload path stored for report ${id}`);
  }

  return {
    fileName: file.fileName,
    mimeType: file.mimeType,
    data: await readFile(filePath),
  };
}

export async function deleteReport(id: string): Promise<boolean> {
  return serializeWrite(async () => {
    const database = await readReports();
    const reportIndex = database.reports.findIndex((report) => report.id === id);
    if (reportIndex < 0) return false;
    const report = database.reports[reportIndex];
    if (!report) return false;

    const reportDirectory = getReportUploadDirectory(id);
    const deletedDirectory = path.join(uploadsDirectory, `.${id}.${crypto.randomBytes(6).toString('hex')}.deleted`);
    let directoryMoved = false;

    try {
      await rename(reportDirectory, deletedDirectory);
      directoryMoved = true;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }

    database.reports.splice(reportIndex, 1);
    try {
      await writeReports(database);
    } catch (error) {
      if (directoryMoved) await rename(deletedDirectory, reportDirectory);
      throw error;
    }

    if (directoryMoved) await rm(deletedDirectory, { recursive: true });
    logger.info('report.deleted', {
      reportId: id,
      fileCount: report?.files?.length || 0,
    });
    return true;
  });
}
