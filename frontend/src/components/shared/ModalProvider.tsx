import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AnimatePresence, motion } from 'framer-motion';

export function ModalProvider() {
  const { type, isOpen, closeModal, data } = useStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeModal]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
          className="absolute inset-0 bg-[var(--royal-indigo)]/40 backdrop-blur-sm" 
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden border-[0.5px] border-[var(--border-default)]"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-page)]">
            <h3 className="text-[var(--text-sm)] font-bold uppercase tracking-[0.1em] text-[var(--text-primary)]">
              {type?.replace(/_/g, ' ')}
            </h3>
            <button 
              onClick={closeModal}
              className="p-2 hover:bg-[var(--ghost-violet)]/40 rounded transition-colors group"
            >
              <X className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--royal-indigo)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {renderModalContent(type, data)}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function renderModalContent(type: string | null, data: any) {
  switch (type) {
    case 'ADD_FRAMEWORK':
      return (
        <div className="space-y-6">
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
            Select a regulatory framework to baseline your governance pipeline. This action will initialize automated assessment trails.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {['EU AI Act', 'NIST AI RMF', 'ISO/IEC 42001', 'HIPAA'].map(f => (
              <button 
                key={f} 
                onClick={() => useStore.getState().addToast({ message: `INITIALIZING ${f.toUpperCase()}`, type: 'info' })}
                className="w-full p-4 text-left rounded border border-[var(--border-default)] hover:border-[var(--royal-indigo)] hover:bg-[var(--ghost-violet)]/20 transition-all group"
              >
                <span className="text-[var(--text-base)] font-bold text-[var(--text-primary)] group-hover:text-[var(--royal-indigo)]">{f}</span>
              </button>
            ))}
          </div>
        </div>
      );
    
    case 'DELETE_CONFIRMATION':
      return (
        <div className="space-y-6">
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
            Confirm permanent deletion of <span className="font-bold text-[var(--text-primary)]">{data?.name || 'this item'}</span>. This action is irreversible.
          </p>
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => useStore.getState().closeModal()} 
              className="btn-secondary flex-1 font-bold"
            >
              Cancel
            </button>
            <button 
              className="btn-danger flex-1 font-bold"
            >
              Confirm Action
            </button>
          </div>
        </div>
      );

    default:
      return (
        <div className="py-12 text-center">
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">
            Interface Pending Redesign
          </p>
        </div>
      );
  }
}
