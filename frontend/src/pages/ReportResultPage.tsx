import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Download, ExternalLink, Eye, FileDown, FileText, ImageIcon, Lightbulb, Loader2, Stethoscope, X } from "lucide-react";
import { downloadUploadedReportFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ReportResult, UploadedReportFile } from "@/types/report";

interface ReportResultPageProps {
  result: ReportResult;
  error: string | null;
  source: "analysis" | "history";
  exporting: boolean;
  onBackToReports: () => void;
  onExportPdf: () => void;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isImageFile(file: UploadedReportFile): boolean {
  return file.mimeType.startsWith("image/");
}

function isPdfFile(file: UploadedReportFile): boolean {
  return file.mimeType === "application/pdf";
}

function UploadedFilesPanel({ result }: { result: ReportResult }) {
  const files = result.uploadedFiles || [];
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [result.reportId]);

  useEffect(() => {
    if (!open || !result.reportId || files.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setPreviewError(null);

      try {
        const blob = await downloadUploadedReportFile(result.reportId as string, selectedIndex);
        if (cancelled) return;

        setPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return URL.createObjectURL(blob);
        });
        setPreviewType(files[selectedIndex]?.mimeType || blob.type);
        setPreviewName(files[selectedIndex]?.fileName || "uploaded-report");
      } catch (err) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewType(null);
          setPreviewName(null);
          setPreviewError(err instanceof Error ? err.message : "Could not load uploaded file.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [files, open, result.reportId, selectedIndex]);

  const downloadCurrentFile = () => {
    if (!previewUrl || !previewName) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = previewName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const closePreview = () => {
    setOpen(false);
    setPreviewError(null);
  };

  if (files.length === 0) {
    return (
      <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-lg p-4 border border-primary-100 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2.5 text-clay">
          <FileText size={18} />
          <h4 className="font-bold text-xs uppercase tracking-widest">Uploaded Report</h4>
        </div>
        <p className="text-xs text-cocoa leading-5 font-medium">
          {result.fileStorageStatus === "skipped"
            ? "This saved report does not include original file storage."
            : "No uploaded files are attached to this saved report."}
        </p>
      </motion.section>
    );
  }

  const selectedFile = files[selectedIndex] || files[0];

  return (
    <>
      <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-lg border border-primary-100 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left transition-colors hover:bg-primary-50/60"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Eye size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-extrabold text-ink">Uploaded Report</span>
              <span className="mt-0.5 block truncate text-[11px] font-bold uppercase tracking-widest text-clay">
                {files.length} saved {files.length === 1 ? "file" : "files"}
              </span>
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-white text-primary-600">
            <ChevronRight size={18} />
          </span>
        </button>
      </motion.section>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="glass-card flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/50"
            role="dialog"
            aria-modal="true"
            aria-label="Uploaded report preview"
          >
            <div className="flex items-center justify-between gap-3 border-b border-primary-100 px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-ink">Uploaded Report</h3>
                <p className="mt-0.5 truncate text-xs font-semibold text-clay">
                  {selectedFile.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadCurrentFile}
                  disabled={!previewUrl || loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-100 text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Download uploaded file"
                >
                  <FileDown size={17} />
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-100 text-cocoa transition-colors hover:bg-primary-50 hover:text-primary-600"
                  aria-label="Close uploaded report preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-primary-100 bg-primary-50/35 p-3 lg:max-h-[calc(90vh-4.25rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
                  {files.map((file, index) => (
                    <button
                      key={`${file.fileName}-${index}`}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={cn(
                        "flex min-w-[13rem] items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full lg:min-w-0",
                        selectedIndex === index
                          ? "border-primary-300 bg-white text-primary-800 shadow-sm"
                          : "border-primary-100 bg-white/70 text-cocoa hover:bg-white"
                      )}
                    >
                      {isImageFile(file) ? <ImageIcon size={16} className="shrink-0" /> : <FileText size={16} className="shrink-0" />}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-extrabold">{file.fileName}</span>
                        <span className="block text-[10px] font-bold uppercase tracking-widest opacity-65">{formatFileSize(file.fileSize)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="min-h-0 bg-bg">
                <div className="flex items-center justify-between gap-3 border-b border-primary-100 px-4 py-2">
                  <p className="truncate text-xs font-extrabold text-ink">{selectedFile.fileName}</p>
                  <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-black uppercase text-primary-600">
                    {isPdfFile(selectedFile) ? "PDF" : isImageFile(selectedFile) ? "Image" : "File"}
                  </span>
                </div>

                <div className="flex h-[64vh] min-h-80 items-center justify-center bg-bg">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-clay">
                      <Loader2 size={18} className="animate-spin text-primary-600" />
                      Loading preview...
                    </div>
                  ) : previewError ? (
                    <div className="p-5 text-center">
                      <AlertCircle size={24} className="mx-auto mb-2 text-rose-600" />
                      <p className="text-sm font-bold text-rose-700">{previewError}</p>
                    </div>
                  ) : previewUrl && previewType?.startsWith("image/") ? (
                    <img src={previewUrl} alt={`Preview of ${selectedFile.fileName}`} className="h-full w-full object-contain" />
                  ) : previewUrl && previewType === "application/pdf" ? (
                    <iframe src={`${previewUrl}#toolbar=0&navpanes=0`} title={`Preview of ${selectedFile.fileName}`} className="h-full w-full bg-bg" />
                  ) : (
                    <div className="p-5 text-center">
                      <FileText size={28} className="mx-auto mb-2 text-primary-600" />
                      <p className="text-sm font-bold text-ink">Preview is not available for this file type.</p>
                      <p className="mt-1 text-xs font-medium text-clay">Use the download button to open the original file.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

export function ReportResultPage({ result, error, source, exporting, onBackToReports, onExportPdf }: ReportResultPageProps) {
  return (
    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 p-4 text-rose-700 shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 shadow-2xl shadow-black/20 sm:p-6 lg:col-span-8">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg"><FileText size={22} /></div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold tracking-tight text-ink">Report Summary</h2>
                <p className="text-xs font-bold text-clay uppercase tracking-widest mt-0.5">Simplified View</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              {source === "history" && (
                <button type="button" onClick={onBackToReports} className="flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold text-cocoa transition-colors hover:bg-primary-50 hover:text-primary-400">
                  <ArrowLeft size={16} />
                  Saved Reports
                </button>
              )}
              <button type="button" onClick={onExportPdf} disabled={!result.simplifiedReport || exporting} className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-primary-400 px-3 text-xs font-bold text-primary-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-primary-50 disabled:text-primary-100">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Exporting..." : "Export PDF"}
              </button>
              <div className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all",
                result.recommendations ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-primary-50 text-primary-600 border-primary-100 animate-pulse"
              )}>
                {result.recommendations ? <><CheckCircle2 size={14} /> Analysis Complete</> : <><Loader2 size={14} className="animate-spin" /> Processing...</>}
              </div>
            </div>
          </div>

          <div className="markdown-content overflow-hidden text-sm leading-7 sm:text-[15px] lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-2">
            {result.simplifiedReport ? <Markdown>{result.simplifiedReport}</Markdown> : (
              <div className="space-y-3">
                <div className="h-4 bg-primary-50 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-primary-50 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-primary-50 rounded w-5/6 animate-pulse"></div>
              </div>
            )}
          </div>
        </motion.section>

        <div className="lg:col-span-4 space-y-4">
          {source === "history" && <UploadedFilesPanel result={result} />}

          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-primary-900 rounded-lg p-4 text-primary-50 shadow-sm">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4">
              <Stethoscope size={20} className="text-accent-100" />
            </div>
            <h3 className="text-lg font-extrabold mb-2 tracking-tight">Doctor's Visit Prep</h3>
            <p className="text-primary-50/80 text-xs font-medium mb-4 leading-5">Key questions to discuss with your healthcare provider based on this report:</p>
            <ul className="space-y-2">
              {["What do these specific values mean for my long-term health?", "Are there lifestyle changes that can improve these results?", "When should I schedule a follow-up test?"].map((q, i) => (
                <motion.li key={i} whileHover={{ x: 4 }} className="flex gap-2.5 text-xs bg-white/8 p-3 rounded-lg border border-white/10 hover:bg-white/12 transition-colors cursor-default">
                  <ChevronRight size={16} className="shrink-0 text-accent-100 mt-0.5" />
                  <span className="font-medium leading-5">{q}</span>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-4 shadow-xl shadow-black/10">
            <div className="flex items-center gap-2.5 mb-2.5 text-clay">
              <AlertCircle size={18} />
              <h4 className="font-bold text-xs uppercase tracking-widest">Medical Disclaimer</h4>
            </div>
            <p className="text-xs text-cocoa leading-5 font-medium">
              This analysis is generated by AI for informational purposes only. It is not a medical diagnosis or professional medical advice. Always consult with a qualified healthcare provider.
            </p>
          </motion.section>
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-4 shadow-2xl shadow-black/20 sm:p-6 lg:col-span-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-accent-50 text-accent-600 rounded-lg"><Lightbulb size={22} /></div>
            <h2 className="text-xl font-extrabold text-ink tracking-tight">Personalized Insights</h2>
          </div>
          {result.insights ? (
            <blockquote className="insight-markdown mb-4 border-l-4 border-primary-400 pl-4 text-sm font-bold leading-7 text-cocoa sm:text-base">
              <Markdown>{result.insights}</Markdown>
            </blockquote>
          ) : <div className="h-10 bg-primary-50 rounded w-full animate-pulse mb-4"></div>}
          <div className="grid grid-cols-1 gap-3">
            {result.recommendations ? result.recommendations.map((rec, i) => (
              <motion.div key={i} whileHover={{ y: -1 }} className="flex min-w-0 gap-3 rounded-lg border border-primary-100 bg-bg p-3 shadow-sm transition-all hover:shadow-md sm:p-3.5">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-[11px] font-black text-primary-600">{i + 1}</div>
                <div className="recommendation-markdown min-w-0 flex-1 text-sm text-cocoa font-medium leading-6 break-words"><Markdown>{rec}</Markdown></div>
              </motion.div>
            )) : [1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-primary-50 rounded-2xl animate-pulse"></div>)}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-4 shadow-xl shadow-black/10 sm:p-6 lg:col-span-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg"><ExternalLink size={22} /></div>
            <h2 className="text-xl font-extrabold text-ink tracking-tight">Trusted Resources</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {result.resources ? result.resources.map((resource, i) => (
              <motion.a key={i} href={resource.url} target="_blank" rel="noopener noreferrer" whileHover={{ y: -2 }} className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-primary-100 bg-bg p-3.5 transition-all hover:border-primary-200 hover:bg-white hover:shadow-md">
                <span className="min-w-0 break-words text-sm font-bold leading-5 text-cocoa transition-colors group-hover:text-primary-600">{resource.title}</span>
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-clay/60 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all shadow-sm shrink-0">
                  <ExternalLink size={16} />
                </div>
              </motion.a>
            )) : [1, 2, 3].map(i => <div key={i} className="h-16 bg-primary-50 rounded-2xl animate-pulse"></div>)}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
