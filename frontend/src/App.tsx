/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Activity, FileText, Loader2, RefreshCcw } from "lucide-react";
import {
  analyzeReport,
  downloadReportSummaryPdf,
  getAllReports,
  getReportById,
  saveReport as saveReportToAPI,
  SavedReport,
  deleteReport,
} from "@/lib/api";
import { ProcessingPage } from "@/pages/ProcessingPage";
import { ReportResultPage } from "@/pages/ReportResultPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SavedReportPage } from "@/pages/SavedReportPage";
import { UploadPage } from "@/pages/UploadPage";
import type { LanguageOption, ReportResult } from "@/types/report";

const languages: LanguageOption[] = [
  { name: "English", native: "English", flag: "🇬🇧" },
  { name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
  { name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { name: "Urdu", native: "اردو", flag: "🇮🇳" },
  { name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { name: "Assamese", native: "অসমীয়া", flag: "🇮🇳" },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("Hindi");
  const [processingStatus, setProcessingStatus] = useState("");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  const isUploadRoute = location.pathname === "/";
  const showNewAnalysis = location.pathname === "/result" || location.pathname.startsWith("/reports");

  const fileToBase64 = (fileToRead: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileToRead);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (readerError) => reject(readerError);
    });
  };

  const processReport = async () => {
    if (files.length === 0) return;

    setLoading(true);
    navigate("/processing");
    setError(null);

    let reportId: string | null = null;

    try {
      const reportFiles = await Promise.all(
        files.map(async (selectedFile) => ({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          data: await fileToBase64(selectedFile),
        }))
      );

      try {
        const totalFileSize = files.reduce((total, selectedFile) => total + selectedFile.size, 0);
        const fileName = files.length === 1
          ? files[0].name
          : `${files.length} files: ${files.map((selectedFile) => selectedFile.name).join(", ")}`;
        const mimeType = files.length === 1 ? files[0].type : "multiple";

        const saveResponse = await saveReportToAPI({
          fileName,
          fileSize: totalFileSize,
          mimeType,
          language,
          files: reportFiles,
        });
        reportId = saveResponse.reportId;
      } catch (saveError) {
        throw new Error(
          saveError instanceof Error
            ? saveError.message
            : "Could not connect to the local report API. Make sure the backend server is running."
        );
      }

      setProcessingStatus("Analyzing your report...");
      const analysisResponse = await analyzeReport(reportId, {
        files: reportFiles,
        language,
      });

      setResult({
        simplifiedReport: analysisResponse.result.simplifiedReport,
        recommendations: analysisResponse.result.recommendations,
        insights: analysisResponse.result.insights,
        resources: analysisResponse.result.resources,
      });
      setProcessingStatus("");
      navigate("/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process the report. Please ensure the file is clear and try again.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    navigate("/");
  };

  const loadReports = useCallback(async (shouldNavigate = true) => {
    setHistoryLoading(true);
    setError(null);

    try {
      const response = await getAllReports();
      setReports(response.reports);
      if (shouldNavigate) {
        navigate("/reports");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved reports. Please start the backend server and try again.");
    } finally {
      setHistoryLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (location.pathname === "/reports") {
      void loadReports(false);
    }
  }, [loadReports, location.pathname]);

  const loadSavedReport = useCallback(async (reportId: string) => {
    setHistoryLoading(true);
    setError(null);

    try {
      const response = await getReportById(reportId);
      const report = response.report;
      setResult({
        reportId: report.id,
        simplifiedReport: report.simplifiedReport,
        recommendations: report.recommendations,
        insights: report.insights,
        resources: report.resources,
        uploadedFiles: report.files,
        fileStorageStatus: report.fileStorageStatus,
      });
      setLanguage(report.language);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this report.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      void loadReports(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this report.");
    }
  };

  const exportReportSummary = async () => {
    if (!result?.simplifiedReport) return;

    setPdfExporting(true);
    setError(null);

    try {
      const pdfBlob = await downloadReportSummaryPdf({
        language,
        summary: result.simplifiedReport,
        insights: result.insights,
        recommendations: result.recommendations,
      });

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = downloadUrl;
      link.download = `medisync-ai-report-summary-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export report summary as PDF.");
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans text-ink selection:bg-primary-400/30 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-primary-600/15 blur-3xl" />
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-accent-600/15 blur-3xl" />
        <div className="absolute left-1/3 bottom-[-18rem] h-[34rem] w-[34rem] rounded-full bg-pink-500/[0.07] blur-3xl" />
      </div>
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-white/90 shadow-lg shadow-black/10 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-5 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-950 shadow-lg shadow-primary-400/20">
              <Activity size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold tracking-tight text-ink sm:text-xl">Medisync AI</h1>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-primary-400 sm:block">AI Health Intelligence</p>
            </div>
          </motion.div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <AnimatePresence mode="popLayout">
              {isUploadRoute && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => loadReports()}
                  disabled={historyLoading}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[13px] font-bold leading-none text-primary-400 shadow-sm transition-all hover:border-primary-400/30 hover:bg-primary-400/10 disabled:opacity-50 sm:px-3"
                >
                  {historyLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  <span className="hidden sm:inline">Saved Reports</span>
                </motion.button>
              )}
              {showNewAnalysis && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={reset}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[13px] font-bold leading-none text-primary-400 shadow-sm transition-all hover:border-primary-400/30 hover:bg-primary-400/10 sm:px-3"
                >
                  <RefreshCcw size={14} />
                  <span className="hidden sm:inline">New Analysis</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-9">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <UploadPage
                  files={files}
                  loading={loading}
                  error={error}
                  language={language}
                  languages={languages}
                  onFilesSelected={(selectedFiles) => {
                    setFiles(selectedFiles);
                    setError(null);
                  }}
                  onLanguageChange={setLanguage}
                  onProcessReport={processReport}
                />
              }
            />
            <Route path="/processing" element={<ProcessingPage status={processingStatus} />} />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  reports={reports}
                  loading={historyLoading}
                  error={error}
                  onBack={() => {
                    setError(null);
                    navigate("/");
                  }}
                  onOpenReport={(reportId) => navigate(`/reports/${reportId}`)}
                  onDeleteReport={handleDeleteReport}
                />
              }
            />
            <Route
              path="/result"
              element={result ? (
                <ReportResultPage
                  result={result}
                  error={error}
                  source="analysis"
                  exporting={pdfExporting}
                  onBackToReports={() => navigate("/reports")}
                  onExportPdf={exportReportSummary}
                />
              ) : <Navigate to="/" replace />}
            />
            <Route
              path="/reports/:reportId"
              element={
                <SavedReportPage
                  loadReport={loadSavedReport}
                  loading={historyLoading}
                  result={result}
                  error={error}
                  exporting={pdfExporting}
                  onBackToReports={() => {
                    setError(null);
                    navigate("/reports");
                  }}
                  onExportPdf={exportReportSummary}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/[0.07] px-3 py-5 text-center text-xs font-semibold text-clay sm:flex-row sm:px-5 sm:text-left lg:px-8">
        <p>© 2026 Medisync AI. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
          <button type="button" className="hover:text-primary-400 transition-colors">Privacy Policy</button>
          <button type="button" className="hover:text-primary-400 transition-colors">Terms of Service</button>
          <button type="button" className="hover:text-primary-400 transition-colors">Contact</button>
        </div>
      </footer>
    </div>
  );
}
