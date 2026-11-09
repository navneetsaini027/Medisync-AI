import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderOpen,
  Globe2,
  Headphones,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Search,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LanguageOption } from "@/types/report";

interface UploadPageProps {
  files: File[];
  loading: boolean;
  error: string | null;
  language: string;
  languages: LanguageOption[];
  onFilesSelected: (files: File[]) => void;
  onLanguageChange: (language: string) => void;
  onProcessReport: () => void;
}

const MAX_REPORT_FILES = 4;

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function ReportPreview({ files }: { files: File[] }) {
  const [previewUrls, setPreviewUrls] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const nextPreviewUrls = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewUrls(nextPreviewUrls);

    return () => {
      nextPreviewUrls.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  if (previewUrls.length === 0) {
    return null;
  }

  const hasPdf = files.some(isPdfFile);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-primary-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-ink">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-ink">Report preview</h3>
            <p className="mt-0.5 max-w-xl truncate text-xs font-semibold text-clay">
              {files.length} {files.length === 1 ? "file" : "files"} selected
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-primary-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-600">
          {hasPdf ? "Single PDF" : `Max ${MAX_REPORT_FILES} images`}
        </span>
      </div>

      <div className="bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {previewUrls.map(({ file, url }, index) => {
            const isImage = isImageFile(file);
            const isPdf = isPdfFile(file);

            return (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="overflow-hidden rounded-md border border-primary-100 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-primary-100 bg-primary-50/40 px-3 py-2">
                  <p className="truncate text-xs font-extrabold text-ink">{file.name}</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-primary-600">
                    {isPdf ? "PDF" : isImage ? "Image" : "File"}
                  </span>
                </div>
                {isImage ? (
                  <div className="flex h-48 items-center justify-center bg-white sm:h-56">
                    <img src={url} alt={`Preview of ${file.name}`} className="h-full w-full object-contain" />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={`${url}#toolbar=0&navpanes=0`}
                    title={`Preview of ${file.name}`}
                    className="h-56 w-full bg-white sm:h-64"
                  />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
                    <FileText size={30} className="mb-3 text-primary-400" />
                    <p className="text-sm font-extrabold text-ink">Preview is not available.</p>
                    <p className="mt-1 text-xs font-medium text-clay">This file is ready for analysis.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function LanguagePicker({
  language,
  languages,
  onLanguageChange,
}: {
  language: string;
  languages: LanguageOption[];
  onLanguageChange: (language: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedLanguage = languages.find((lang) => lang.name === language) || languages[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLanguages = normalizedQuery
    ? languages.filter((lang) =>
        `${lang.name} ${lang.native}`.toLowerCase().includes(normalizedQuery)
      )
    : languages;

  return (
    <div className="relative w-full sm:w-[360px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white px-4 text-left shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50/50"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="text-lg">{selectedLanguage.flag}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-ink">{selectedLanguage.native}</span>
            <span className="block truncate text-[11px] font-semibold text-clay">{selectedLanguage.name}</span>
          </span>
        </span>
        <ChevronDown size={17} className={cn("shrink-0 text-primary-600 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 z-30 mt-2 w-full overflow-hidden rounded-xl border border-primary-100 bg-white shadow-xl shadow-primary-100/50"
        >
          <div className="border-b border-primary-100 bg-primary-50/50 p-3">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-clay" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search language"
                className="h-10 w-full rounded-lg border border-primary-100 bg-white pl-9 pr-3 text-sm font-semibold text-ink outline-none transition-all placeholder:text-clay/60 focus:border-primary-200 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredLanguages.length > 0 ? filteredLanguages.map((lang) => {
              const selected = language === lang.name;

              return (
                <button
                  key={lang.name}
                  type="button"
                  onClick={() => {
                    onLanguageChange(lang.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-primary-50 text-primary-600" : "text-cocoa hover:bg-primary-50/70 hover:text-primary-600"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">{lang.native}</span>
                      <span className="block truncate text-xs font-semibold opacity-75">{lang.name}</span>
                    </span>
                  </span>
                  {selected && <CheckCircle2 size={17} className="shrink-0" />}
                </button>
              );
            }) : (
              <div className="px-3 py-6 text-center">
                <p className="text-sm font-bold text-ink">No language found</p>
                <p className="mt-1 text-xs font-medium text-clay">Try searching by English or native name.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function UploadPage({
  files,
  loading,
  error,
  language,
  languages,
  onFilesSelected,
  onLanguageChange,
  onProcessReport,
}: UploadPageProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const acceptedPdf = acceptedFiles.find(isPdfFile);

      if (acceptedPdf) {
        onFilesSelected([acceptedPdf]);
        return;
      }

      const acceptedImages = acceptedFiles.filter(isImageFile);
      const existingImages = files.filter(isImageFile);
      const nextFiles = [...existingImages, ...acceptedImages]
        .filter((file, index, allFiles) =>
          allFiles.findIndex((candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified
          ) === index
        )
        .slice(0, MAX_REPORT_FILES);

      onFilesSelected(nextFiles);
    }
  }, [files, onFilesSelected]);

  const removeFile = (fileToRemove: File) => {
    onFilesSelected(files.filter((file) => file !== fileToRemove));
  };

  const clearFiles = () => {
    onFilesSelected([]);
  };

  const totalFileSize = files.reduce((total, file) => total + file.size, 0);
  const hasPdf = files.some(isPdfFile);
  const canAddMoreFiles = !hasPdf && files.length < MAX_REPORT_FILES;
  const canStartAnalysis = files.length > 0 && !loading;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    multiple: true,
    noClick: true,
  });

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-5"
    >
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <div className="space-y-4">
          <section className="glass-card overflow-hidden rounded-2xl shadow-2xl shadow-black/20">
            <div className="relative min-h-44 overflow-hidden border-b border-white/[0.07] bg-gradient-to-br from-bg via-bg-surface/90 to-primary-50/60 p-5 sm:p-8">
              <div className="relative z-10 max-w-xl">
                <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(45,212,191,0.9)]" />
                  Your health, made clearer
                </p>
                <h4 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-[34px]">
                  Upload a medical report
                </h4>
                <p className="max-w-xl text-sm leading-6 text-clay">
                  Get a simplified summary, practical recommendations, and trusted resources in the language you choose.
                </p>
              </div>

              <div className="absolute right-6 top-4 hidden lg:block h-32 w-44">
                <div className="absolute right-0 top-2 h-32 w-32 rounded-full bg-accent-50"></div>
                <div className="absolute right-7 top-6 h-24 w-24 rotate-[-2deg] rounded-lg border border-primary-100 bg-white shadow-md"></div>
                <div className="absolute right-12 top-0 h-28 w-24 rotate-[-1deg] rounded-lg border border-primary-100 bg-white shadow-lg">
                  <div className="mx-auto mt-4 h-1 w-7 rounded-full bg-primary-100"></div>
                  <div className="mx-auto mt-4 h-1.5 w-14 rounded-full bg-primary-50"></div>
                  <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-primary-50"></div>
                  <div className="mx-auto mt-6 flex h-11 w-16 items-center justify-center rounded-lg bg-primary-400 text-primary-50">
                    <Upload size={22} />
                  </div>
                </div>
                <span className="absolute left-0 top-14 text-accent-200">+</span>
                <span className="absolute right-2 bottom-8 text-primary-400">+</span>
              </div>
            </div>

            <div className="divide-y divide-primary-100">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Globe2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">1. Pick the language</h3>
                    <p className="mt-0.5 text-xs font-medium text-clay">for your simplified report explanation</p>
                  </div>
                </div>
                <LanguagePicker language={language} languages={languages} onLanguageChange={onLanguageChange} />
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Upload size={20} />
                  </div>
                  <h3 className="text-sm font-extrabold text-ink">2. Upload your report</h3>
                </div>

                <div className={cn(
                  "gemini-frame rounded-2xl p-px transition-transform duration-300",
                  isDragActive && "scale-[1.01]",
                  files.length > 0 && "from-emerald-400 via-primary-400 to-accent-400"
                )}>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-[15px] border border-white/[0.08] bg-[#101116]/95 p-4 text-center transition-all sm:p-7",
                      isDragActive
                        ? "bg-primary-50/60 shadow-[inset_0_0_48px_rgba(155,130,245,0.12)]"
                        : "hover:bg-[#14141c]/95",
                      files.length > 0 && "bg-emerald-950/15"
                    )}
                  >
                    <input {...getInputProps()} />
                    {isDragActive && (
                      <div className="pointer-events-none absolute inset-0 rounded-[15px] border-2 border-dashed border-primary-400/70 bg-primary-400/[0.06]" />
                    )}
                    <div className={cn(
                      "relative mb-4 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-transform duration-300",
                      files.length > 0
                        ? "bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10"
                        : "animate-float bg-gradient-to-br from-primary-400/20 via-accent-400/15 to-pink-400/15 text-primary-400 shadow-primary-400/10"
                    )}>
                      {files.length > 0 ? <CheckCircle2 size={29} /> : <Upload size={29} />}
                      {files.length === 0 && <span className="absolute inset-0 rounded-2xl border border-primary-400/30 animate-ping [animation-duration:2.5s]" />}
                    </div>
                  {files.length > 0 ? (
                    <>
                      <p className="max-w-lg text-base font-extrabold text-ink break-words">
                        {files.length} {files.length === 1 ? "file" : "files"} selected
                      </p>
                      <p className="mt-2 text-sm font-bold text-emerald-700">{formatFileSize(totalFileSize)} - Ready to analyze</p>
                      <div className="mt-4 w-full max-w-2xl space-y-2">
                        {files.map((selectedFile) => (
                          <div key={`${selectedFile.name}-${selectedFile.lastModified}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white px-3 py-2 text-left">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-ink">{selectedFile.name}</p>
                              <p className="text-xs font-semibold text-clay">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(selectedFile)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-clay transition-colors hover:bg-primary-50 hover:text-primary-600"
                              aria-label={`Remove ${selectedFile.name}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={open}
                          disabled={!canAddMoreFiles}
                          className="inline-flex h-10 items-center gap-2 rounded-md border border-primary-100 bg-white px-4 text-sm font-bold text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                        >
                          <FileText size={16} />
                          {hasPdf ? "PDF selected" : "Add More Images"}
                        </button>
                        <button type="button" onClick={clearFiles} className="h-10 px-4 rounded-md text-sm font-bold text-clay hover:bg-primary-50 hover:text-primary-600 transition-colors">
                          Clear all
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-extrabold tracking-tight text-ink sm:text-lg">
                        {isDragActive ? "Drop your report to begin" : "Drag & Drop Medical Report Here"}
                      </p>
                      <p className="mt-1.5 text-xs text-clay">or browse files from your device</p>
                      <p className="mt-2 text-xs text-clay">Upload 1 PDF or up to {MAX_REPORT_FILES} images.</p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        {["PDF", "PNG", "JPG"].map((format) => (
                          <span key={format} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black tracking-[0.16em] text-cocoa/80">
                            {format}
                          </span>
                        ))}
                      </div>
                      <button type="button" onClick={open} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary-400 px-6 text-sm font-extrabold text-slate-950 shadow-lg shadow-primary-400/20 transition-all hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-primary-400/30">
                        <FolderOpen size={15} />
                        Browse Files
                      </button>
                    </>
                  )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                {error && (
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canStartAnalysis}
                  onClick={onProcessReport}
                  className={cn(
                    "flex h-12 w-full items-center justify-center gap-3 rounded-xl border text-base font-extrabold transition-all",
                    !canStartAnalysis
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-clay/60"
                      : "border-primary-400 bg-primary-400 text-slate-950 shadow-lg shadow-primary-400/15 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-primary-400/25"
                  )}
                >
                  {loading ? "Starting analysis..." : "Start Analysis"}
                  <ArrowRight size={20} />
                </button>

                <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-clay">
                  <Lock size={15} />
                  Your files are secure and private. We never share your data.
                </p>
              </div>
            </div>
          </section>

          <ReportPreview files={files} />
        </div>

        <aside className="grid gap-4 md:grid-cols-3 xl:block xl:space-y-4">
          <section className="rounded-2xl border border-primary-400/15 bg-gradient-to-br from-primary-800 via-primary-900 to-slate-950 p-5 text-primary-50 shadow-xl shadow-black/20">
            <h3 className="text-lg font-extrabold mb-4">What you get</h3>
            <div className="space-y-4">
              {[
                { icon: <Stethoscope size={18} />, title: "Patient-friendly explanation", desc: "We simplify complex medical terms." },
                { icon: <Sparkles size={18} />, title: "Personalized insights", desc: "Relevant insights tailored to your report." },
                { icon: <FileText size={18} />, title: "Saved report history", desc: "Access and download your past reports anytime." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-200/25 text-accent-50">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold leading-5">{item.title}</h4>
                    <p className="text-xs leading-5 text-primary-50/75">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5 shadow-lg shadow-black/10">
            <div className="flex items-center gap-3 mb-3 text-primary-600">
              <Lightbulb size={20} />
              <h3 className="text-base font-extrabold text-primary-400">Before you start</h3>
            </div>
            <p className="text-xs text-clay leading-5">Use a clear report image or PDF. Blurry scans can reduce extraction quality and accuracy.</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-14 w-14 rounded-lg border border-primary-50 bg-primary-50 blur-[1px]"></div>
              <ArrowRight size={18} className="text-primary-600" />
              <div className="relative h-14 w-14 rounded-lg border border-primary-100 bg-white">
                <div className="mx-auto mt-5 h-1.5 w-12 rounded-full bg-primary-100"></div>
                <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-primary-100"></div>
                <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-primary-100"></div>
                <div className="absolute -right-2 bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-400 text-primary-50">
                  <Check size={16} />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5 shadow-lg shadow-black/10">
            <div className="flex items-center gap-3 mb-3 text-primary-600">
              <Headphones size={20} />
              <h3 className="text-base font-extrabold text-primary-400">Need help?</h3>
            </div>
            <p className="text-xs text-clay leading-5 mb-3">Check out our guides or contact support.</p>
            <button type="button" className="h-9 w-full rounded-md border border-primary-100 text-xs font-extrabold text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2">
              View Resources
              <ArrowRight size={16} />
            </button>
          </section>
        </aside>
      </div>

      <section className="glass-card grid grid-cols-1 gap-3 rounded-2xl p-3 shadow-xl shadow-black/10 sm:p-4 md:grid-cols-3">
        {[
          { icon: <Stethoscope size={36} />, title: "Simplified Jargon", desc: "We break down complex medical terms into plain language you can actually understand." },
          { icon: <Lightbulb size={36} />, title: "Actionable Insights", desc: "Get personalized recommendations and specific questions to ask your healthcare provider." },
          { icon: <ShieldCheck size={36} />, title: "Secure & Private", desc: "Your sensitive medical data is processed securely and never shared." },
        ].map((item) => (
          <div key={item.title} className="grid grid-cols-[52px_1fr] items-start gap-3 p-2 sm:grid-cols-[64px_1fr]">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              {item.icon}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-ink mb-1.5">{item.title}</h3>
              <p className="text-xs leading-5 text-clay mb-2.5">{item.desc}</p>
              <button type="button" className="text-xs font-extrabold text-primary-600 inline-flex items-center gap-1.5">
                Learn more <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
