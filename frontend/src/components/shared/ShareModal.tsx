import { useState, useEffect } from 'react';
import { 
  createShareLink, fetchShareLinks, revokeShareLink, ShareLink 
} from '@/lib/api';
import { 
  X, Copy, Check, Trash2, Calendar, Eye, AlertTriangle, LoaderCircle 
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface ShareModalProps {
  resourceType: 'report' | 'compliance' | 'risk' | 'audit';
  resourceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ resourceType, resourceId, isOpen, onClose }: ShareModalProps) {
  const addToast = useStore((state) => state.addToast);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<string>('7');

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await fetchShareLinks(resourceType, resourceId);
      setLinks(res);
    } catch (err) {
      console.error('Failed to load share links:', err);
      addToast({ message: 'Failed to fetch active share links', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, resourceType, resourceId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const days = expiryDays === 'never' ? undefined : parseInt(expiryDays, 10);
      const newLink = await createShareLink(resourceType, resourceId, days);
      setLinks((prev) => [newLink, ...prev]);
      addToast({ message: 'Share link created successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to create share link:', err);
      addToast({ message: 'Failed to create share link', type: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      addToast({ message: 'Share link revoked successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to revoke share link:', err);
      addToast({ message: 'Failed to revoke share link', type: 'danger' });
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    addToast({ message: 'Link copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Share dashboard
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
              Manage public access tokens
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors outline-none text-[var(--text-secondary)] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold uppercase tracking-wider block mb-0.5">Warning: Sensitive Data Access</span>
              Anyone with these links can view the dashboard data publicly without logging in.
            </div>
          </div>

          {/* Create New Link Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Create new shared view
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[var(--royal-indigo)]"
                >
                  <option value="7">Expire in 7 days</option>
                  <option value="30">Expire in 30 days</option>
                  <option value="90">Expire in 90 days</option>
                  <option value="never">Never expire</option>
                </select>
              </div>
              <button
                disabled={creating}
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-[var(--mid-indigo)] rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] disabled:opacity-50 transition-colors shrink-0"
              >
                {creating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : 'Generate link'}
              </button>
            </div>
          </div>

          {/* Active Links Section */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Active Share Links
            </h4>

            {loading ? (
              <div className="py-8 flex justify-center">
                <LoaderCircle className="h-6 w-6 animate-spin text-[var(--royal-indigo)]" />
              </div>
            ) : links.length > 0 ? (
              <div className="space-y-3">
                {links.map((link) => {
                  const url = `${window.location.origin}/share/${link.token}`;
                  return (
                    <div 
                      key={link.id}
                      className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl p-3.5 space-y-3 font-sans text-xs text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 truncate pr-2 font-mono text-[10px] text-indigo-400 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5 truncate select-all">
                          {url}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => copyToClipboard(link.token)}
                            className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
                            title="Copy link to clipboard"
                          >
                            {copiedToken === link.token ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleRevoke(link.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                            title="Revoke and deactivate link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{link.viewCount} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                  No active share links found
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
