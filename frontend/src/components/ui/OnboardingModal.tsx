import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { createApiKey } from '../../lib/api';

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch or generate an API key on mount
    createApiKey('Default API Key')
      .then((res: any) => {
        setApiKey(res.api_key);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to create initial API key', err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippet = `import { checkAction } from "@sentra/sdk";

await checkAction({
  apiKey: "${apiKey || 'YOUR_API_KEY'}",
  input: userInput
});`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">You're ready to go 🚀</h2>
                <p className="text-sm text-slate-400">Here is your first API key.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* API Key Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your API Key</label>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-1 pl-4">
                <code className="text-sm font-mono text-emerald-400 truncate">
                  {loading ? 'Generating...' : apiKey}
                </code>
                <button
                  disabled={loading}
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-amber-500/80">Store this securely. You won't be able to see it again.</p>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Integration Example</label>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
                  {codeSnippet}
                </pre>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
