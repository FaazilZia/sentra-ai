import React, { useState } from 'react';
import { X, Bot, ShieldCheck } from 'lucide-react';
import { AIAgent } from '../../lib/api';

interface RegisterAgentModalProps {
  onClose: () => void;
  onRegister: (agent: AIAgent) => void;
}

export function RegisterAgentModal({ onClose, onRegister }: RegisterAgentModalProps) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('GPT-4o');
  const [team, setTeam] = useState('Engineering');
  const [permissions, setPermissions] = useState<string[]>(['web']);
  const [compliance, setCompliance] = useState<string[]>(['SOC2']);
  
  const handleTogglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };
  
  const handleToggleCompliance = (comp: string) => {
    setCompliance(prev => prev.includes(comp) ? prev.filter(p => p !== comp) : [...prev, comp]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const newAgent: AIAgent = {
      id: `agt-${Math.random().toString(36).substring(2, 9)}`,
      name: name,
      model: model,
      permissions: permissions,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    onRegister(newAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">Register AI Agent</h2>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Provision a new governed model</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="register-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agent Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Support Copilot, Internal Code Gen" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Model Engine</label>
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
                  >
                    <option value="GPT-4o">OpenAI GPT-4o</option>
                    <option value="Claude 3.5 Sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="Gemini 1.5 Pro">Google Gemini 1.5 Pro</option>
                    <option value="Custom Internal Model">Custom Internal Model</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Team / Owner</label>
                  <select 
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Required Permissions</span>
                <span className="text-cyan-400 font-mono lowercase">Select allowed scopes</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['web', 'db', 'api', 'email'].map(perm => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => handleTogglePermission(perm)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      permissions.includes(perm) 
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      permissions.includes(perm) ? 'bg-cyan-500 border-cyan-500 text-slate-900' : 'border-slate-600'
                    }`}>
                      {permissions.includes(perm) && <ShieldCheck className="h-3 w-3" />}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{perm} Access</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Compliance Frameworks</span>
                <span className="text-emerald-400 font-mono lowercase">Enforce strict policies</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {['SOC2', 'HIPAA', 'GDPR', 'DPDP'].map(comp => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => handleToggleCompliance(comp)}
                    className={`px-4 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      compliance.includes(comp)
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="register-form"
            className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            Provision Agent
          </button>
        </div>

      </div>
    </div>
  );
}
