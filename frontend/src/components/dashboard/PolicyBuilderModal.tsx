import React, { useState } from 'react';
import { X, Shield, Plus, Info, CheckCircle2 } from 'lucide-react';

interface PolicyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: any) => void;
}

export const PolicyBuilderModal: React.FC<PolicyBuilderModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [agent, setAgent] = useState('finance-bot');
  const [action, setAction] = useState('send_email');
  const [effect, setEffect] = useState('deny');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: `Custom policy for ${agent}: ${effect} ${action}`,
      enabled: true,
      priority: 1,
      effect,
      scope: { agent },
      conditions: {
        blocked_actions: effect === 'deny' ? [action] : [],
        allowed_actions: effect === 'allow' ? [action] : []
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Create Governance Policy</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Control Layer v2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Policy Identity</label>
            <input
              type="text"
              required
              placeholder="e.g. Finance Data Protection"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target AI Agent</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
              >
                <option value="finance-bot">finance-bot</option>
                <option value="med-ai">med-ai</option>
                <option value="support-bot">support-bot</option>
                <option value="dev-copilot">dev-copilot</option>
                <option value="global">Global (All Agents)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Requested Action</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="send_email">send_email</option>
                <option value="external_api">external_api</option>
                <option value="read_pii">read_pii</option>
                <option value="export_csv">export_csv</option>
                <option value="delete_record">delete_record</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enforcement Decision</label>
            <div className="flex gap-4">
              <button
                type="button"
                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                  effect === 'allow' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
                onClick={() => setEffect('allow')}
              >
                <CheckCircle2 className={`w-5 h-5 ${effect === 'allow' ? 'block' : 'hidden'}`} />
                ALLOW
              </button>
              <button
                type="button"
                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                  effect === 'deny' 
                    ? 'bg-rose-50 border-rose-500 text-rose-700' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
                onClick={() => setEffect('deny')}
              >
                <X className={`w-5 h-5 ${effect === 'deny' ? 'block' : 'hidden'}`} />
                DENY
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
              <strong>Pro-tip:</strong> Denying an action for an agent will trigger an immediate "Policy Violation" interception in the activity stream.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Save Policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
