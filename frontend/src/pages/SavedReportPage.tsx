import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import type { ReportResult } from "@/types/report";
import { ReportResultPage } from "@/pages/ReportResultPage";

interface SavedReportPageProps {
  loadReport: (reportId: string) => Promise<void>;
  loading: boolean;
  result: ReportResult | null;
  error: string | null;
  exporting: boolean;
  onBackToReports: () => void;
  onExportPdf: () => void;
}

export function SavedReportPage({
  loadReport,
  loading,
  result,
  error,
  exporting,
  onBackToReports,
  onExportPdf,
}: SavedReportPageProps) {
  const { reportId } = useParams();

  useEffect(() => {
    if (reportId) {
      void loadReport(reportId);
    }
  }, [loadReport, reportId]);

  if (!reportId) {
    return <Navigate to="/reports" replace />;
  }

  if (loading || !result) {
    return (
      <motion.div
        key="saved-report-loading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card mx-auto flex max-w-4xl items-center justify-center gap-3 rounded-2xl p-10 font-bold text-clay"
      >
        <Loader2 className="animate-spin text-primary-400" />
        Loading saved report...
      </motion.div>
    );
  }

  return (
    <ReportResultPage
      result={result}
      error={error}
      source="history"
      exporting={exporting}
      onBackToReports={onBackToReports}
      onExportPdf={onExportPdf}
    />
  );
}
