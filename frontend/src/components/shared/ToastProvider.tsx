import { useStore } from '@/store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastProvider() {
  const { toasts, removeToast } = useStore();

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-[var(--risk-low-text)]" />,
    warning: <AlertTriangle className="h-4 w-4 text-[var(--risk-medium-text)]" />,
    info: <Info className="h-4 w-4 text-[var(--risk-compliant-text)]" />,
    error: <XCircle className="h-4 w-4 text-[var(--risk-critical-text)]" />,
  };

  const bgs = {
    success: 'bg-[var(--risk-low)] border-[var(--risk-low-text)]/10',
    warning: 'bg-[var(--risk-medium)] border-[var(--risk-medium-text)]/10',
    info: 'bg-[var(--risk-compliant)] border-[var(--risk-compliant-text)]/10',
    error: 'bg-[var(--risk-critical)] border-[var(--risk-critical-text)]/10',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto min-w-[300px] p-4 rounded border shadow-xl flex items-start gap-3",
              bgs[toast.type as keyof typeof bgs]
            )}
          >
            <div className="mt-0.5">{icons[toast.type as keyof typeof icons]}</div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-current opacity-60 mb-0.5">
                {toast.type}
              </p>
              <p className="text-[var(--text-sm)] font-bold text-current leading-tight">
                {toast.message}
              </p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5 text-current opacity-40" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
