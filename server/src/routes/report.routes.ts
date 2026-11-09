import { Router } from 'express';
import {
  analyzeReport,
  createReport,
  exportSummaryPdf,
  getReport,
  getReportUploadedFile,
  listReports,
  removeReport,
  updateAnalysis,
} from '../controllers/report.controller.js';
import { reportRateLimit } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.use(reportRateLimit);

router.post('/', createReport);
router.put('/:id/analysis', updateAnalysis);
router.post('/:id/analyze', analyzeReport);
router.post('/export-summary-pdf', exportSummaryPdf);
router.get('/', listReports);
router.get('/:id/files/:fileIndex', getReportUploadedFile);
router.get('/:id', getReport);
router.delete('/:id', removeReport);

export default router;
