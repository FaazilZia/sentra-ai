import { useEffect, useState } from 'react';
import { Layers, Database, ShieldAlert, Link2, Plus, Trash2, ShieldCheck, Tag, Info, RefreshCw, X } from 'lucide-react';
import { fetchDatasets, createDataset, deleteDataset, linkDatasetToSystem, fetchAISystems, Dataset, AISystemItem } from '@/lib/api';

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [aiSystems, setAiSystems] = useState<AISystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('TRAINING');
  const [newClassification, setNewClassification] = useState('CONFIDENTIAL');
  const [newRecordCount, setNewRecordCount] = useState<number>(0);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newLinkedSystemId, setNewLinkedSystemId] = useState('');
  const [newTagsString, setNewTagsString] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [datasetList, systemList] = await Promise.all([
        fetchDatasets().catch(() => []),
        fetchAISystems().catch(() => [])
      ]);
      setDatasets(datasetList || []);
      setAiSystems(systemList || []);
    } catch (err) {
      console.error('Failed to load datasets/systems', err);
      setDatasets([]);
      setAiSystems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset from the inventory?')) return;
    try {
      await deleteDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete dataset', err);
    }
  };

  const handleLinkSystem = async (datasetId: string, systemId: string) => {
    try {
      const targetSystemId = systemId === 'none' ? null : systemId;
      await linkDatasetToSystem(datasetId, targetSystemId);
      
      setDatasets(prev => prev.map(d => {
        if (d.id === datasetId) {
          const sys = aiSystems.find(s => s.id === systemId);
          return {
            ...d,
            ai_system_id: targetSystemId,
            ai_system: sys ? { id: sys.id, name: sys.name } : null
          };
        }
        return d;
      }));
    } catch (err) {
      console.error('Failed to link system to dataset', err);
    }
  };

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const payload = {
        name: newName,
        description: newDesc,
        dataset_type: newType,
        data_classification: newClassification,
        record_count: newRecordCount || null,
        source_url: newSourceUrl || null,
        ai_system_id: newLinkedSystemId || null,
        tags: newTagsString ? newTagsString.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      const created = await createDataset(payload);
      setDatasets(prev => [created, ...prev]);
      setIsDrawerOpen(false);

      // Reset Form
      setNewName('');
      setNewDesc('');
      setNewType('TRAINING');
      setNewClassification('CONFIDENTIAL');
      setNewRecordCount(0);
      setNewSourceUrl('');
      setNewLinkedSystemId('');
      setNewTagsString('');
      
      loadData();
    } catch (err) {
      console.error('Failed to create dataset', err);
    }
  };

  const getClassificationBadgeColor = (classification: string) => {
    switch (classification) {
      case 'RESTRICTED': return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'CONFIDENTIAL': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'INTERNAL': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  // Compute Metrics
  const totalDatasets = datasets.length;
  const restrictedCount = datasets.filter(d => d.data_classification === 'RESTRICTED').length;
  const confidentialCount = datasets.filter(d => d.data_classification === 'CONFIDENTIAL').length;
  const activeLinkedCount = datasets.filter(d => d.ai_system_id).length;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in relative min-h-full">
      
      {/* Sliding Registration Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="card-base w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-fade-in">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 text-[var(--royal-indigo)] p-1.5 rounded-lg">
                    <Database className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Register Dataset</h3>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDataset} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Dataset Name</label>
                  <input 
                    type="text" 
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Fine-tuning Customer Support v3"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide details on data origin, features, and target usage."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 h-16 focus:border-[var(--royal-indigo)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Usage Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-bold text-slate-700"
                    >
                      <option value="TRAINING">TRAINING</option>
                      <option value="VALIDATION">VALIDATION</option>
                      <option value="TEST">TEST</option>
                      <option value="PRODUCTION">PRODUCTION</option>
                      <option value="SYNTHETIC">SYNTHETIC</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Classification</label>
                    <select
                      value={newClassification}
                      onChange={(e) => setNewClassification(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-bold text-slate-700"
                    >
                      <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                      <option value="RESTRICTED">RESTRICTED</option>
                      <option value="INTERNAL">INTERNAL</option>
                      <option value="PUBLIC">PUBLIC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Record Count</label>
                    <input 
                      type="number" 
                      value={newRecordCount}
                      onChange={(e) => setNewRecordCount(parseInt(e.target.value) || 0)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Source URL</label>
                    <input 
                      type="text" 
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="s3://sentraa-data-bucket/..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Link to AI System</label>
                  <select
                    value={newLinkedSystemId}
                    onChange={(e) => setNewLinkedSystemId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)] text-slate-700 font-bold"
                  >
                    <option value="">Do not link system</option>
                    {aiSystems.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.risk_tier})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    value={newTagsString}
                    onChange={(e) => setNewTagsString(e.target.value)}
                    placeholder="e.g. pii, customer-support, chatbot"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-[var(--royal-indigo)]"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--royal-indigo)] text-white hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                  >
                    Save Dataset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 bg-white px-4 py-3 rounded-[var(--radius)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl text-[var(--royal-indigo)]">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Dataset Inventory</h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Catalog data assets, tag PII characteristics, and link sets to AI System pipelines</p>
          </div>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--royal-indigo)] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--mid-indigo)] active:scale-95 transition-all shadow-md shadow-indigo-500/10"
        >
          <Plus className="h-4 w-4" />
          Register Dataset
        </button>
      </div>

      {/* Sensitivity Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-base p-4 flex items-center justify-between bg-white border-l-4 border-l-slate-400">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registered Sets</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{totalDatasets}</div>
          </div>
          <div className="bg-slate-50 text-slate-500 p-2.5 rounded-xl border border-slate-100">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white border-l-4 border-l-rose-500">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Restricted Sensitivity</div>
            <div className="text-xl font-bold mt-1 text-rose-600">{restrictedCount}</div>
          </div>
          <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl border border-rose-100">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white border-l-4 border-l-amber-500">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Confidential Classification</div>
            <div className="text-xl font-bold mt-1 text-amber-600">{confidentialCount}</div>
          </div>
          <div className="bg-amber-50 text-amber-500 p-2.5 rounded-xl border border-amber-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="card-base p-4 flex items-center justify-between bg-white border-l-4 border-l-indigo-600">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Linked to AI Systems</div>
            <div className="text-xl font-bold mt-1 text-[var(--royal-indigo)]">{activeLinkedCount}</div>
          </div>
          <div className="bg-indigo-50 text-[var(--royal-indigo)] p-2.5 rounded-xl border border-indigo-100">
            <Link2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Datasets Table Grid */}
      <div className="card-base bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Governance Datasets Registry</h3>
          <span className="badge-pill bg-slate-200 text-slate-600 font-bold">{datasets.length} Total</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2 font-mono">
            <RefreshCw className="h-5 w-5 animate-spin text-[var(--royal-indigo)]" />
            SYNCHRONIZING DATA INVENTORY...
          </div>
        ) : datasets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No datasets cataloged. Register your training, validation, or test sets to complete compliance auto-linking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Dataset Details</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Sensitivity Class</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Usage Type</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Volume</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Linked AI System</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Governance Linker</th>
                  <th className="px-6 py-3.5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Details */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-[12px] text-slate-800">{d.name}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{d.description || 'No description provided.'}</p>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {d.tags && (Array.isArray(d.tags) ? d.tags : []).map((t: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-bold uppercase font-mono">
                            <Tag className="h-2 w-2" />
                            {typeof t === 'string' ? t : t.tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    
                    {/* Classification */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-wider font-mono ${getClassificationBadgeColor(d.data_classification)}`}>
                        {d.data_classification}
                      </span>
                    </td>
                    
                    {/* Usage */}
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-600 font-mono">
                      {d.dataset_type}
                    </td>
                    
                    {/* Record count */}
                    <td className="px-6 py-4 text-[10px] font-medium text-slate-600 font-mono">
                      {d.record_count ? d.record_count.toLocaleString() : '--'} rows
                    </td>
                    
                    {/* Linked system */}
                    <td className="px-6 py-4">
                      <select
                        value={d.ai_system_id || 'none'}
                        onChange={(e) => handleLinkSystem(d.id, e.target.value)}
                        className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:border-[var(--royal-indigo)] text-slate-700"
                      >
                        <option value="none">UNLINKED</option>
                        {aiSystems.map(sys => (
                          <option key={sys.id} value={sys.id}>{sys.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* EU AI Act autolinker details */}
                    <td className="px-6 py-4">
                      {d.ai_system_id ? (
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="text-[9px] font-bold uppercase tracking-wide">
                            Art 10 Linked
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Info className="h-4 w-4 shrink-0" />
                          <div className="text-[9px] font-bold uppercase tracking-wide">
                            Pending link
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(d.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
