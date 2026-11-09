import { motion } from "motion/react";
import { Activity } from "lucide-react";

interface ProcessingPageProps {
  status: string;
}

export function ProcessingPage({ status }: ProcessingPageProps) {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="glass-card mx-auto my-8 max-w-2xl rounded-3xl px-6 py-14 text-center shadow-2xl shadow-black/30 sm:px-12 sm:py-16"
    >
      <div className="relative mx-auto mb-9 h-28 w-28">
        <div className="absolute inset-0 rotate-45 rounded-[2rem] border border-primary-100 bg-primary-400/5"></div>
        <div className="absolute inset-0 rotate-45 animate-spin rounded-[2rem] border-2 border-primary-400 border-t-transparent shadow-[0_0_28px_rgba(45,212,191,0.18)]"></div>
        <div className="absolute inset-0 flex animate-float items-center justify-center text-primary-400">
          <Activity size={48} />
        </div>
      </div>
      <p className="mb-3 bg-gradient-to-r from-accent-200 via-primary-400 to-pink-300 bg-clip-text text-[10px] font-black uppercase tracking-[0.24em] text-transparent">Medisync AI Intelligence</p>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {status || "AI is Thinking..."}
      </h2>
      <p className="mx-auto max-w-lg text-sm font-medium leading-relaxed text-clay sm:text-base">
        We’re carefully reading your report and preparing a clear, patient-friendly explanation. This may take a little while.
      </p>
      <div className="mx-auto mt-10 max-w-sm space-y-3 rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-left sm:p-5">
        {["Scanning report structure...", "Identifying key findings...", "Simplifying medical terms...", "Preparing recommendations..."].map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="flex items-center gap-3 text-sm font-semibold text-cocoa/70"
          >
            <div className="h-2 w-2 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(45,212,191,0.65)]"></div>
            {text}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
