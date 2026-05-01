import React, { useState } from 'react';
import { X, Shield, Plus, CheckCircle2 } from 'lucide-react';

interface SimplePolicyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: any) => void;
}

export const SimplePolicyEditor: React.FC<SimplePolicyEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effect, setEffect] = useState('BLOCK');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      enabled: true,
      priority: 1,
      effect,
      scope: { agent: 'global' },
      conditions: {}
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Create Governance Policy</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control Layer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Policy Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Finance Data Protection"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Description</label>
            <input
              type="text"
              required
              placeholder="Briefly describe what this policy does..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Enforcement Action</label>
            <div className="flex gap-4">
              <button
                type="button"
                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                  effect === 'ALLOW' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'
                }`}
                onClick={() => setEffect('ALLOW')}
              >
                <CheckCircle2 className={`w-5 h-5 ${effect === 'ALLOW' ? 'block' : 'hidden'}`} />
                ALLOW
              </button>
              <button
                type="button"
                className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                  effect === 'BLOCK' 
                    ? 'bg-rose-50 border-rose-500 text-rose-700' 
                    : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'
                }`}
                onClick={() => setEffect('BLOCK')}
              >
                <X className={`w-5 h-5 ${effect === 'BLOCK' ? 'block' : 'hidden'}`} />
                BLOCK
              </button>
            </div>
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
              className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white text-sm font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-200/50 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
