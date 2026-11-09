import type { Request, Response } from 'express';
import { chromium } from 'playwright';
import {
  deleteReport,
  getAllReports,
  getReportById,
  getReportFile,
  saveReport,
  updateReportAnalysis,
} from '../services/report.service.js';
import {
  buildReportSummaryPdfHtml,
  ingestReportSummaryContent,
} from '../services/pdfExport.service.js';
import { reportProcessor } from '../services/reportGraph.service.js';
import { serverConfig } from '../config/server.js';
import { getSafeAnalysisErrorMessage } from '../utils/analysis-error.util.js';
import { logger } from '../utils/logger.js';

const VALID_STATUSES = new Set(['pending', 'processing', 'completed', 'failed']);

export async function createReport(req: Request, res: Response) {
  try {
    const { fileName, fileSize, mimeType, language, files } = req.body;
    logger.info('report.create.requested', {
      requestId: req.requestId,
      fileName,
      fileSize,
      mimeType,
      language,
      fileCount: Array.isArray(files) ? files.length : 0,
    });

    if (typeof fileName !== 'string' || fileName.trim() === '') {
      logger.warn('report.create.validation_failed', { requestId: req.requestId, reason: 'missing_fileName' });
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    if (typeof fileSize !== 'number' || fileSize < 0) {
      logger.warn('report.create.validation_failed', { requestId: req.requestId, reason: 'invalid_fileSize' });
      return res.status(400).json({ success: false, error: 'fileSize must be a non-negative number' });
    }

    if (typeof mimeType !== 'string' || mimeType.trim() === '') {
      logger.warn('report.create.validation_failed', { requestId: req.requestId, reason: 'missing_mimeType' });
      return res.status(400).json({ success: false, error: 'mimeType is required' });
    }

    if (files !== undefined) {
      if (!Array.isArray(files)) {
        logger.warn('report.create.validation_failed', { requestId: req.requestId, reason: 'files_not_array' });
        return res.status(400).json({ success: false, error: 'files must be an array' });
      }

      for (const file of files) {
        if (
          typeof file?.fileName !== 'string' ||
          typeof file?.fileSize !== 'number' ||
          typeof file?.mimeType !== 'string' ||
          typeof file?.data !== 'string'
        ) {
          logger.warn('report.create.validation_failed', { requestId: req.requestId, reason: 'invalid_file_payload' });
          return res.status(400).json({ success: false, error: 'Each file requires fileName, fileSize, mimeType, and data' });
        }
      }
    }

    const reportId = await saveReport({
      fileName: fileName.trim(),
      fileSize,
      mimeType: mimeType.trim(),
      language: language || 'English',
      files,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      reportId,
      message: 'Report saved successfully',
      status: 'pending',
    });
  } catch (error) {
    logger.error('report.create.failed', {
      requestId: req.requestId,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to save report' });
  }
}

export async function updateAnalysis(req: Request, res: Response) {
  try {
    const { status, rawExtraction, simplifiedReport, recommendations, insights, resources, errorMessage } = req.body;
    logger.info('report.analysis_update.requested', {
      requestId: req.requestId,
      reportId: req.params.id,
      status,
    });

    if (!status) {
      logger.warn('report.analysis_update.validation_failed', { requestId: req.requestId, reportId: req.params.id, reason: 'missing_status' });
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    if (!VALID_STATUSES.has(status)) {
      logger.warn('report.analysis_update.validation_failed', { requestId: req.requestId, reportId: req.params.id, reason: 'invalid_status' });
      return res.status(400).json({ success: false, error: 'Invalid report status' });
    }

    const success = await updateReportAnalysis(req.params.id, {
      status,
      rawExtraction,
      simplifiedReport,
      recommendations: recommendations ? JSON.stringify(recommendations) : null,
      insights,
      resources: resources ? JSON.stringify(resources) : null,
      errorMessage,
    });

    if (!success) {
      logger.warn('report.analysis_update.not_found', { requestId: req.requestId, reportId: req.params.id });
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report analysis updated successfully',
      status,
    });
  } catch (error) {
    logger.error('report.analysis_update.failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to update report analysis' });
  }
}

export async function analyzeReport(req: Request, res: Response) {
  const startedAt = Date.now();
  let analysisSignal: AbortSignal | undefined;
  let slowAnalysisTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const { language, files } = req.body;
    logger.info('analysis.requested', {
      requestId: req.requestId,
      reportId: req.params.id,
      language,
      fileCount: Array.isArray(files) ? files.length : 0,
      fileSizeBytes: Array.isArray(files)
        ? files.reduce((total, file) => total + (typeof file?.fileSize === 'number' ? file.fileSize : 0), 0)
        : 0,
      analysisTimeoutMs: serverConfig.analysisTimeoutMs,
      groqRequestTimeoutMs: serverConfig.groqRequestTimeoutMs,
    });

    if (typeof language !== 'string' || language.trim() === '') {
      logger.warn('analysis.validation_failed', { requestId: req.requestId, reportId: req.params.id, reason: 'missing_language' });
      return res.status(400).json({ success: false, error: 'language is required' });
    }

    if (!Array.isArray(files) || files.length === 0) {
      logger.warn('analysis.validation_failed', { requestId: req.requestId, reportId: req.params.id, reason: 'missing_files' });
      return res.status(400).json({ success: false, error: 'At least one file is required for analysis' });
    }

    for (const file of files) {
      if (
        typeof file?.fileName !== 'string' ||
        typeof file?.mimeType !== 'string' ||
        typeof file?.data !== 'string'
      ) {
        logger.warn('analysis.validation_failed', { requestId: req.requestId, reportId: req.params.id, reason: 'invalid_file_payload' });
        return res.status(400).json({ success: false, error: 'Each file requires fileName, mimeType, and data' });
      }
    }

    const report = await getReportById(req.params.id);
    if (!report) {
      logger.warn('analysis.report_not_found', { requestId: req.requestId, reportId: req.params.id });
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await updateReportAnalysis(req.params.id, { status: 'processing' });
    logger.info('analysis.processing_started', {
      requestId: req.requestId,
      reportId: req.params.id,
    });

    analysisSignal = AbortSignal.timeout(serverConfig.analysisTimeoutMs);
    slowAnalysisTimer = setTimeout(() => {
      logger.warn('analysis.processing_slow', {
        requestId: req.requestId,
        reportId: req.params.id,
        elapsedMs: Date.now() - startedAt,
        timeoutMs: serverConfig.analysisTimeoutMs,
      });
    }, 60_000);

    const result = await reportProcessor.invoke({
      fileData: files[0]?.data,
      mimeType: files[0]?.mimeType,
      files,
      language,
    }, {
      signal: analysisSignal,
    });

    const analysis = {
      rawExtraction: result.rawExtraction || '',
      simplifiedReport: result.simplifiedReport || '',
      recommendations: result.recommendations || [],
      insights: result.insights || '',
      resources: result.resources || [],
    };

    await updateReportAnalysis(req.params.id, {
      status: 'completed',
      rawExtraction: analysis.rawExtraction,
      simplifiedReport: analysis.simplifiedReport,
      recommendations: JSON.stringify(analysis.recommendations),
      insights: analysis.insights,
      resources: JSON.stringify(analysis.resources),
    });

    logger.info('analysis.completed', {
      requestId: req.requestId,
      reportId: req.params.id,
      durationMs: Date.now() - startedAt,
      recommendationsCount: analysis.recommendations.length,
      resourcesCount: analysis.resources.length,
    });

    res.json({ success: true, result: analysis });
  } catch (error) {
    const timedOut = Boolean(analysisSignal?.aborted) ||
      (error instanceof Error && /timeout|timed out|deadline/i.test(error.message));
    const safeErrorMessage = getSafeAnalysisErrorMessage(error);
    const groqStatus = error instanceof Error
      ? Number(error.message.match(/Groq API request failed \((\d{3})\)/)?.[1])
      : Number.NaN;
    const responseStatus = timedOut
      ? 504
      : [429, 502, 503, 504].includes(groqStatus)
        ? groqStatus
        : 500;
    logger.error('analysis.failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      durationMs: Date.now() - startedAt,
      timedOut,
      responseStatus,
      error,
    });

    try {
      await updateReportAnalysis(req.params.id, {
        status: 'failed',
        errorMessage: safeErrorMessage,
      });
    } catch (updateError) {
      logger.error('analysis.failure_status_update_failed', {
        requestId: req.requestId,
        reportId: req.params.id,
        error: updateError,
      });
    }

    if (!res.headersSent && !res.destroyed) {
      res.status(responseStatus).json({
        success: false,
        code: timedOut
          ? 'AI_ANALYSIS_TIMEOUT'
          : groqStatus === 503
            ? 'GROQ_CAPACITY'
            : groqStatus === 429
              ? 'GROQ_RATE_LIMITED'
              : 'AI_ANALYSIS_FAILED',
        error: safeErrorMessage,
      });
    }
  } finally {
    if (slowAnalysisTimer) clearTimeout(slowAnalysisTimer);
  }
}

export async function exportSummaryPdf(req: Request, res: Response) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const { language, summary, insights, recommendations } = req.body;
    logger.info('pdf_export.requested', {
      requestId: req.requestId,
      recommendationCount: Array.isArray(recommendations) ? recommendations.length : 0,
      hasInsights: typeof insights === 'string' && insights.length > 0,
      summaryLength: typeof summary === 'string' ? summary.length : 0,
      language,
    });

    if (typeof language !== 'string' || language.trim() === '') {
      logger.warn('pdf_export.validation_failed', { requestId: req.requestId, reason: 'missing_language' });
      return res.status(400).json({ success: false, error: 'language is required' });
    }

    if (typeof summary !== 'string' || summary.trim() === '') {
      logger.warn('pdf_export.validation_failed', { requestId: req.requestId, reason: 'missing_summary' });
      return res.status(400).json({ success: false, error: 'summary is required' });
    }

    if (insights !== undefined && typeof insights !== 'string') {
      logger.warn('pdf_export.validation_failed', { requestId: req.requestId, reason: 'invalid_insights' });
      return res.status(400).json({ success: false, error: 'insights must be a string' });
    }

    if (recommendations !== undefined && !Array.isArray(recommendations)) {
      logger.warn('pdf_export.validation_failed', { requestId: req.requestId, reason: 'invalid_recommendations' });
      return res.status(400).json({ success: false, error: 'recommendations must be an array' });
    }

    const content = ingestReportSummaryContent({
      language,
      summary,
      insights,
      recommendations: Array.isArray(recommendations)
        ? recommendations.filter((recommendation) => typeof recommendation === 'string')
        : [],
    });
    const html = buildReportSummaryPdfHtml(content);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '18mm',
        bottom: '18mm',
        left: '18mm',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="medisync-ai-report-summary.pdf"');
    logger.info('pdf_export.completed', {
      requestId: req.requestId,
      bytes: pdf.length,
    });
    res.send(pdf);
  } catch (error) {
    logger.error('pdf_export.failed', {
      requestId: req.requestId,
      error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to export report summary PDF. Please make sure Playwright Chromium is installed.',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function listReports(req: Request, res: Response) {
  try {
    logger.info('reports.list.requested', { requestId: req.requestId });
    const reports = await getAllReports();
    res.json({ success: true, reports });
  } catch (error) {
    logger.error('reports.list.failed', {
      requestId: req.requestId,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
}

export async function getReport(req: Request, res: Response) {
  try {
    logger.info('report.fetch.requested', { requestId: req.requestId, reportId: req.params.id });
    const report = await getReportById(req.params.id);
    if (!report) {
      logger.warn('report.fetch.not_found', { requestId: req.requestId, reportId: req.params.id });
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (error) {
    logger.error('report.fetch.failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
}

export async function getReportUploadedFile(req: Request, res: Response) {
  try {
    const fileIndex = Number(req.params.fileIndex);
    logger.info('report_file.fetch.requested', {
      requestId: req.requestId,
      reportId: req.params.id,
      fileIndex,
    });

    if (!Number.isInteger(fileIndex) || fileIndex < 0) {
      logger.warn('report_file.fetch.validation_failed', {
        requestId: req.requestId,
        reportId: req.params.id,
        reason: 'invalid_file_index',
      });
      return res.status(400).json({ success: false, error: 'Invalid file index' });
    }

    const file = await getReportFile(req.params.id, fileIndex);

    if (!file) {
      logger.warn('report_file.fetch.not_found', {
        requestId: req.requestId,
        reportId: req.params.id,
        fileIndex,
      });
      return res.status(404).json({ success: false, error: 'Uploaded file not found' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    logger.info('report_file.fetch.completed', {
      requestId: req.requestId,
      reportId: req.params.id,
      fileIndex,
      mimeType: file.mimeType,
      bytes: file.data.length,
    });
    res.send(file.data);
  } catch (error) {
    logger.error('report_file.fetch.failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      fileIndex: req.params.fileIndex,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to fetch uploaded file' });
  }
}

export async function removeReport(req: Request, res: Response) {
  try {
    logger.info('report.delete.requested', {
      requestId: req.requestId,
      reportId: req.params.id,
    });
    const success = await deleteReport(req.params.id);
    if (!success) {
      logger.warn('report.delete.not_found', {
        requestId: req.requestId,
        reportId: req.params.id,
      });
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('report.delete.failed', {
      requestId: req.requestId,
      reportId: req.params.id,
      error,
    });
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
}
