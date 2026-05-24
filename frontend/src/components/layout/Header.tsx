import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, Download, Plus, ChevronRight, LoaderCircle,
  Bot, FileText, ShieldCheck, ShieldAlert, ClipboardCheck, Activity, AlertTriangle
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useSocketStore } from '@/store/useSocketStore';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

// Helper to format notification relative time
function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Notification types mapping to icons & colors & links
const NOTIFICATION_CONFIG: Record<string, { icon: any; color: string; path: string }> = {
  alert: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10', path: '/app/guardrails' },
  policy: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', path: '/app/policies' },
  risk: { icon: ShieldCheck, color: 'text-orange-500 bg-orange-500/10', path: '/app/risk-assessment' },
  incident: { icon: ShieldAlert, color: 'text-rose-500 bg-rose-500/10', path: '/app/risk' },
  workflow: { icon: ClipboardCheck, color: 'text-purple-500 bg-purple-500/10', path: '/app/workflows' },
  drift: { icon: Activity, color: 'text-yellow-500 bg-yellow-500/10', path: '/app/drift' }
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter(x => x);
  const connectionStatus = useSocketStore(state => state.connectionStatus);
  const addToast = useStore(state => state.addToast);

  // States for Notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isBellOpen, setIsBellOpen] = useState(false);

  // States for Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs for closing on click outside
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Debounced search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await apiRequest<any[]>(`/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        setSearchResults(results);
        setIsSearchOpen(true);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Failed to perform search:', err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Notifications logic
  const loadNotificationsData = async () => {
    try {
      const countRes = await apiRequest<{ count: number }>('/notifications/unread-count');
      setUnreadCount(countRes.count);
      
      if (isBellOpen) {
        const notifRes = await apiRequest<{ notifications: any[] }>('/notifications?limit=10');
        setNotifications(notifRes.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    }
  };

  // Poll count every 30 seconds
  useEffect(() => {
    loadNotificationsData();
    const interval = setInterval(loadNotificationsData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload notifications when dropdown opens
  useEffect(() => {
    if (isBellOpen) {
      loadNotificationsData();
    }
  }, [isBellOpen]);

  // Close on click outside & keyboard navigation
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsBellOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation for Search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = highlightedIndex >= 0 ? searchResults[highlightedIndex] : searchResults[0];
      if (selected) {
        handleSearchItemClick(selected);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleSearchItemClick = async (item: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(item.url);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      addToast({ message: 'ALL NOTIFICATIONS MARKED AS READ', type: 'success' });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await apiRequest(`/notifications/${notif.id}/read`, { method: 'PATCH' });
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setIsBellOpen(false);
      
      // Redirect to correct target page
      const config = NOTIFICATION_CONFIG[notif.type];
      const targetPath = config ? config.path : '/app';
      navigate(targetPath);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Group search results by type
  const groupResults = () => {
    const groups: Record<string, any[]> = {};
    searchResults.forEach(item => {
      const typeLabel = 
        item.type === 'agent' ? 'Agents' :
        item.type === 'policy' ? 'Policies' :
        item.type === 'risk' ? 'Risks' :
        item.type === 'incident' ? 'Incidents' :
        item.type === 'guardrail' ? 'Guardrails' : 'Compliance Controls';
        
      if (!groups[typeLabel]) groups[typeLabel] = [];
      groups[typeLabel].push(item);
    });
    return groups;
  };

  const groupedSearch = groupResults();

  // Custom icons for search categories
  const getSearchGroupIcon = (groupName: string) => {
    switch (groupName) {
      case 'Agents': return Bot;
      case 'Policies': return FileText;
      case 'Risks': return ShieldCheck;
      case 'Incidents': return ShieldAlert;
      case 'Guardrails': return AlertTriangle;
      default: return ClipboardCheck;
    }
  };

  return (
    <header className="fixed top-0 right-0 z-40 h-[var(--topbar-height)] w-full lg:w-[calc(100%-var(--sidebar-width))] bg-[var(--bg-topbar)] border-b border-[var(--border-default)] px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[var(--text-xs)] font-medium text-[var(--text-secondary)]">
          <Link to="/app" className="hover:text-[var(--royal-indigo)] transition-colors">Governance Workspace</Link>
          {pathnames.map((name, index) => {
            const isLast = index === pathnames.length - 1;
            const label = name.replaceAll('-', ' ');
            
            return (
              <div key={name} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
                <span className={isLast ? "text-[var(--text-primary)] font-bold" : ""}>
                  {label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {/* Debounced Global Search */}
        <div ref={searchRef} className="relative hidden xl:block">
          <div className="relative">
            {isSearchLoading ? (
              <LoaderCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[var(--royal-indigo)]" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <input 
              type="text" 
              placeholder="Search agents, policies, risks, incidents..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (searchQuery.trim().length >= 2) setIsSearchOpen(true); }}
              className="w-84 bg-[var(--bg-page)] border border-[var(--border-default)] rounded py-1.5 pl-9 pr-4 text-[var(--text-xs)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--violet-blue)] transition-all"
            />
          </div>

          {/* Search Dropdown Panel */}
          {isSearchOpen && (
            <div className="absolute right-0 mt-2 w-96 max-h-[420px] overflow-y-auto bg-white/90 backdrop-blur-md border border-[var(--border-default)] rounded-[var(--radius)] shadow-2xl z-50 py-2 custom-scrollbar">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-[var(--text-muted)] text-[var(--text-xs)]">
                  NO RESULTS FOUND
                </div>
              ) : (
                Object.keys(groupedSearch).map(groupName => {
                  const Icon = getSearchGroupIcon(groupName);
                  return (
                    <div key={groupName} className="mb-2 last:mb-0">
                      <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--royal-indigo)]/80 flex items-center gap-1.5 border-b border-[var(--border-default)]/50 bg-[var(--bg-page)]/40">
                        <Icon className="h-3 w-3" />
                        <span>{groupName}</span>
                      </div>
                      <div className="divide-y divide-[var(--border-default)]/30">
                        {groupedSearch[groupName].map((item) => {
                          const globalIdx = searchResults.findIndex(r => r.id === item.id);
                          const isHighlighted = globalIdx === highlightedIndex;
                          return (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSearchItemClick(item)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSearchItemClick(item); } }}
                              className={cn(
                                "px-4 py-2 text-left cursor-pointer transition-colors outline-none",
                                isHighlighted ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-page)]/40"
                              )}
                            >
                              <div className="text-[var(--text-xs)] font-bold text-[var(--text-primary)]">{item.title}</div>
                              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{item.subtitle}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-3 pl-5 border-l border-[var(--border-default)]">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 mr-2" title={`Realtime: ${connectionStatus}`}>
            <div className="relative flex h-2.5 w-2.5">
              {connectionStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                connectionStatus === 'connected' ? "bg-emerald-500" :
                connectionStatus === 'reconnecting' ? "bg-amber-500" : "bg-slate-500"
              )}></span>
            </div>
          </div>

          {/* In-App Notification Bell System */}
          <div ref={bellRef} className="relative">
            <button 
              onClick={() => setIsBellOpen(prev => !prev)}
              className="p-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all relative outline-none"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--risk-critical)] text-[9px] font-bold text-white shadow-lg animate-fade-in">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isBellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-[var(--border-default)] rounded-[var(--radius)] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[460px] animate-fade-in">
                <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-page)]/40">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[9px] font-bold text-[var(--royal-indigo)] hover:text-[var(--mid-indigo)] uppercase tracking-wider transition-colors border-none bg-transparent cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)] custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[var(--text-muted)] text-[var(--text-xs)] uppercase tracking-wider">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const config = NOTIFICATION_CONFIG[notif.type] || { icon: AlertTriangle, color: 'text-slate-500 bg-slate-500/10' };
                      const TypeIcon = config.icon;
                      
                      return (
                        <div 
                          key={notif.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(notif)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(notif); } }}
                          className={cn(
                            "flex items-start gap-3 p-3.5 cursor-pointer text-left transition-colors relative outline-none border-l-2",
                            notif.isRead ? "border-l-transparent bg-transparent opacity-60 hover:opacity-100" : "border-l-[var(--royal-indigo)] bg-[var(--bg-hover)]/30 hover:bg-[var(--bg-hover)]/50"
                          )}
                        >
                          <div className={cn("p-1.5 rounded-full flex items-center justify-center shrink-0", config.color)}>
                            <TypeIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate">{notif.title}</div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-2">{notif.message}</div>
                            <div className="text-[9px] text-[var(--text-muted)] font-semibold mt-1 uppercase tracking-tight">{timeAgo(notif.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button 
            className="btn-secondary h-8 flex items-center gap-2 !px-3 !py-0 !text-[10px] uppercase tracking-widest"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>

          <button 
            onClick={() => useStore.getState().openModal('ADD_FRAMEWORK')}
            className="btn-primary h-8 flex items-center gap-2 !px-4 !py-0 !text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--royal-indigo)]/10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Case</span>
          </button>
        </div>
      </div>
    </header>
  );
}
