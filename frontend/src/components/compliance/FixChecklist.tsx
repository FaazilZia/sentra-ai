import { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  MoreVertical
} from 'lucide-react';
import { ComplianceFixTask, uploadEvidence } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';

interface FixChecklistProps {
  tasks: ComplianceFixTask[];
  onTaskUpdated: () => void;
}

export function FixChecklist({ tasks, onTaskUpdated }: FixChecklistProps) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [evidenceValue, setEvidenceValue] = useState('');
  const [evidenceType, setEvidenceType] = useState<'text' | 'link'>('text');

  const handleUpload = async (taskId: string) => {
    if (!evidenceValue) return;
    try {
      await uploadEvidence(taskId, evidenceType, evidenceValue);
      setUploadingFor(null);
      setEvidenceValue('');
      onTaskUpdated();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className={`glass-card rounded-2xl p-5 border transition-all ${
            task.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/40 border-white/5'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="mt-1">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h4 className={`font-bold text-sm ${task.status === 'completed' ? 'text-emerald-400 line-through' : 'text-white'}`}>
                    {task.title}
                  </h4>
                  <StatusBadge 
                    label={`P${task.priority}`} 
                    tone={task.priority === 1 ? 'danger' : task.priority === 2 ? 'warning' : 'info'} 
                  />
                </div>
                {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                
                {task.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.evidence.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400">
                        {ev.type === 'link' ? <LinkIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        <span className="truncate max-w-[150px]">{ev.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {task.status !== 'completed' && (
                <button 
                  onClick={() => setUploadingFor(uploadingFor === task.id ? null : task.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <Upload className="h-4 w-4" />
                </button>
              )}
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {uploadingFor === task.id && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setEvidenceType('text')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    evidenceType === 'text' ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Text Description
                </button>
                <button 
                  onClick={() => setEvidenceType('link')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    evidenceType === 'link' ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Reference Link
                </button>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={evidenceValue}
                  onChange={(e) => setEvidenceValue(e.target.value)}
                  placeholder={evidenceType === 'link' ? "https://..." : "Describe the fix implementation..."}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
                <button 
                  onClick={() => handleUpload(task.id)}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
