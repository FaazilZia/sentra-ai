import { useState, useEffect } from 'react';
import { 
  Key, 
  Bell, 
  Copy, 
  RefreshCw, 
  Save,
  Slack,
  Globe,
  Database,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Shield,
  QrCode,
  Lock,
  Unlock,
  Users,
  User,
  Sliders
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { 
  fetchApiKeys, 
  rotateApiKey, 
  updateAlertEmail, 
  updateWebhookUrl,
  fetchSlackConfig,
  saveSlackConfig,
  testSlackConnection,
  deleteSlackConfig,
  fetchCompany,
  fetchMcpAgentKeys,
  createMcpAgentKey,
  revokeMcpAgentKey,
  fetchMcpAuditLogs,
  saveSsoConfig,
  apiRequest
} from '@/lib/api';


export default function Settings() {
  const addToast = useStore((state) => state.addToast);
  const { user } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'llmkeys' | 'features' | 'general' | 'mcp' | 'sso' | 'team'>('profile');

  // Company Details
  const [company, setCompany] = useState<any>(null);

  // Profile Settings States
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileJobTitle, setProfileJobTitle] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Settings States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // LLM API Keys States
  const [llmKeysList, setLlmKeysList] = useState<any[]>([]);
  const [loadingLlmKeys, setLoadingLlmKeys] = useState(false);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [addingLlmKey, setAddingLlmKey] = useState(false);

  // Feature Flags States
  const [featureFlagsList, setFeatureFlagsList] = useState<any[]>([]);
  const [loadingFeatureFlags, setLoadingFeatureFlags] = useState(false);

  // General Settings States
  const [apiKey, setApiKey] = useState('sk-sentra-••••••••••••••••');
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Slack Integration States
  const [slackUrl, setSlackUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [slackNotifyOn, setSlackNotifyOn] = useState<string[]>([]);
  const [slackStatus, setSlackStatus] = useState<'connected' | 'not_configured'>('not_configured');
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackSaving, setSlackSaving] = useState(false);

  // MCP Gateway Key Management States
  const [mcpKeys, setMcpKeys] = useState<any[]>([]);
  const [mcpKeysLoading, setMcpKeysLoading] = useState(false);
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyAllowedTools, setNewKeyAllowedTools] = useState('');
  const [newKeyBlockedTools, setNewKeyBlockedTools] = useState('');
  const [creatingMcpKey, setCreatingMcpKey] = useState(false);

  // Generated Raw Key Display Modal States
  const [generatedRawKey, setGeneratedRawKey] = useState('');
  const [rawKeyModalOpen, setRawKeyModalOpen] = useState(false);

  // Revocation Modal States
  const [keyToRevoke, setKeyToRevoke] = useState<any>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingMcpKey, setRevokingMcpKey] = useState(false);

  // MCP Audit Logs States
  const [mcpLogs, setMcpLogs] = useState<any[]>([]);
  const [mcpLogsLoading, setMcpLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilterDecision, setLogsFilterDecision] = useState<'all' | 'allowed' | 'blocked'>('all');

  // SAML SSO Configuration States
  const [ssoProviderName, setSsoProviderName] = useState('');
  const [idpMetadataXml, setIdpMetadataXml] = useState('');
  const [savingSso, setSavingSso] = useState(false);

  // MFA States
  const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean } | null>(null);
  const [mfaSetupData, setMfaSetupData] = useState<{
    qrCodeUrl: string;
    manualKey: string;
  } | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);


  // Initialize and Load Data
  const loadMfaStatus = async () => {
    try {
      const res = await apiRequest<{ enabled: boolean }>('/auth/mfa/status');
      setMfaStatus(res);
    } catch (_) {
      setMfaStatus({ enabled: false });
    }
  };

  useEffect(() => {
    async function loadGeneralData() {
      try {
        const keys = await fetchApiKeys();
        if (keys && keys.length > 0) {
          const key = keys[0];
          setApiKey(key.key || `sk-sentra-****${key.key_prefix || 'abcd'}`);
        }
      } catch (err) {
        console.error('Settings load API keys error:', err);
      }

      try {
        const slack = await fetchSlackConfig();
        if (slack && slack.webhookUrl) {
          setSlackUrl(slack.webhookUrl);
          setSlackChannel(slack.channel);
          setSlackEnabled(slack.enabled);
          setSlackNotifyOn(slack.notifyOn || []);
          setSlackStatus('connected');
        }
      } catch (err) {
        console.error('Settings load Slack config error:', err);
      }

      await loadMfaStatus();
    }
    loadGeneralData();
  }, []);

  // Fetch company details for dynamic ACS and Entity IDs
  useEffect(() => {
    if (user?.organizationId) {
      fetchCompany(user.organizationId)
        .then((data) => {
          setCompany(data);
          if (data.alertEmail) setEmail(data.alertEmail);
          if (data.slackWebhookUrl) setWebhookUrl(data.slackWebhookUrl);
          
          // Seed SSO inputs
          setSsoProviderName(data.sso_provider || '');
          if (data.saml_metadata) {
            setIdpMetadataXml(data.saml_metadata.idpMetadataXml || '');
          }
        })
        .catch((err) => console.error('Settings load company details error:', err));
    }
  }, [user]);

  // Profile, Password, LLM Keys and Features Helpers
  const fetchUserProfile = async () => {
    try {
      const res = await apiRequest<{ data: any }>('/user/me');
      if (res?.data) {
        setProfileName(res.data.fullName || '');
        setProfileJobTitle(res.data.jobTitle || '');
        setProfileAvatarUrl(res.data.avatarUrl || '');
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiRequest<any>('/user/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: profileName, jobTitle: profileJobTitle }),
      });
      addToast({ message: 'Profile updated successfully. Refresh to apply all layout updates.', type: 'success' });
      if (res?.data) {
        setProfileName(res.data.fullName || '');
        setProfileJobTitle(res.data.jobTitle || '');
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('sentra_access_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1'}/user/me/avatar`, {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Avatar upload failed');

      setProfileAvatarUrl(data?.data?.avatarUrl || '');
      addToast({ message: 'Avatar uploaded successfully. Refresh to apply all layout updates.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      addToast({ message: err.message || 'Failed to upload avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ message: 'Passwords do not match', type: 'warning' });
      return;
    }
    setChangingPassword(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      addToast({ message: 'Password changed successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchLlmKeys = async () => {
    setLoadingLlmKeys(true);
    try {
      const res = await apiRequest<{ data: any[] }>('/settings/llm-keys');
      setLlmKeysList(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLlmKeys(false);
    }
  };

  const handleAddLlmKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!llmApiKey.trim()) return;
    setAddingLlmKey(true);
    try {
      await apiRequest('/settings/llm-keys', {
        method: 'POST',
        body: JSON.stringify({ provider: llmProvider, apiKey: llmApiKey.trim() }),
      });
      addToast({ message: 'LLM Key added successfully', type: 'success' });
      setLlmApiKey('');
      fetchLlmKeys();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to add LLM key', type: 'error' });
    } finally {
      setAddingLlmKey(false);
    }
  };

  const handleDeleteLlmKey = async (id: string) => {
    try {
      await apiRequest(`/settings/llm-keys/${id}`, {
        method: 'DELETE',
      });
      addToast({ message: 'LLM Key deleted successfully', type: 'success' });
      fetchLlmKeys();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to delete key', type: 'error' });
    }
  };

  const fetchFeatureFlags = async () => {
    setLoadingFeatureFlags(true);
    try {
      const res = await apiRequest<{ data: any[] }>('/settings/features');
      setFeatureFlagsList(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeatureFlags(false);
    }
  };

  const handleToggleFeatureFlag = async (key: string, currentStatus: boolean) => {
    try {
      await apiRequest('/settings/features', {
        method: 'PATCH',
        body: JSON.stringify({ key, enabled: !currentStatus }),
      });
      addToast({ message: `Feature updated successfully`, type: 'success' });
      fetchFeatureFlags();
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update feature', type: 'error' });
    }
  };

  useEffect(() => {
    if (activeTab === 'llmkeys') {
      fetchLlmKeys();
    } else if (activeTab === 'features') {
      fetchFeatureFlags();
    }
  }, [activeTab]);

  // Load MCP Tab Data (Keys and Logs)
  const loadMcpData = async () => {
    if (activeTab !== 'mcp') return;

    try {
      setMcpKeysLoading(true);
      const keys = await fetchMcpAgentKeys();
      setMcpKeys(keys);
    } catch (err) {
      console.error('Failed to load MCP keys:', err);
      addToast({ message: 'Failed to load MCP agent keys', type: 'error' });
    } finally {
      setMcpKeysLoading(false);
    }
  };

  const loadMcpLogs = async () => {
    if (activeTab !== 'mcp') return;

    try {
      setMcpLogsLoading(true);
      const res = await fetchMcpAuditLogs(logsPage, 10, logsFilterDecision);
      setMcpLogs(res.logs || []);
      setLogsPages(res.pages || 1);
      setLogsTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load MCP logs:', err);
    } finally {
      setMcpLogsLoading(false);
    }
  };

  useEffect(() => {
    loadMcpData();
  }, [activeTab]);

  useEffect(() => {
    loadMcpLogs();
  }, [activeTab, logsPage, logsFilterDecision]);

  // Team management states and handlers
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [inviting, setInviting] = useState(false);

  const loadInvitations = async () => {
    if (activeTab !== 'team') return;
    try {
      setLoadingInvitations(true);
      const data = await apiRequest<any[]>('/tenant/invitations');
      setInvitations(data);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [activeTab]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      await apiRequest('/tenant/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      addToast({ message: `Invite sent to ${inviteEmail}`, type: 'success' });
      setInviteEmail('');
      loadInvitations();
    } catch (err: any) {
      console.error('Failed to invite user:', err);
      addToast({ message: err.message || 'Failed to send invitation', type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      await apiRequest(`/tenant/invitations/${id}`, {
        method: 'DELETE',
      });
      addToast({ message: 'Invitation revoked', type: 'success' });
      loadInvitations();
    } catch (err: any) {
      console.error('Failed to revoke invitation:', err);
      addToast({ message: err.message || 'Failed to revoke invitation', type: 'error' });
    }
  };

  // General tab actions
  const handleRotateKey = async () => {
    try {
      setLoading(true);
      const res = await rotateApiKey();
      setApiKey(res.api_key);
      addToast({ message: 'API key regenerated successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to regenerate API key', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    addToast({ message: 'API key copied to clipboard', type: 'info' });
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAlertEmail(email);
      addToast({ message: 'Alert email saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save alert email', type: 'error' });
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateWebhookUrl(webhookUrl);
      addToast({ message: 'Webhook URL saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save webhook URL', type: 'error' });
    }
  };

  // Slack Integration Handlers
  const handleSaveSlack = async () => {
    try {
      setSlackSaving(true);
      await saveSlackConfig({
        webhookUrl: slackUrl,
        channel: slackChannel,
        enabled: slackEnabled,
        notifyOn: slackNotifyOn
      });
      setSlackStatus('connected');
      addToast({ message: 'Slack configuration saved successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to save Slack configuration', type: 'error' });
    } finally {
      setSlackSaving(false);
    }
  };

  const handleTestSlack = async () => {
    try {
      setSlackTesting(true);
      await testSlackConnection({
        webhookUrl: slackUrl,
        channel: slackChannel
      });
      addToast({ message: 'Slack integration test message dispatched successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Slack connection test failed', type: 'error' });
    } finally {
      setSlackTesting(false);
    }
  };

  const handleDeleteSlack = async () => {
    try {
      await deleteSlackConfig();
      setSlackUrl('');
      setSlackChannel('');
      setSlackEnabled(true);
      setSlackNotifyOn([]);
      setSlackStatus('not_configured');
      addToast({ message: 'Slack integration disconnected', type: 'info' });
    } catch (err) {
      addToast({ message: 'Failed to disconnect Slack integration', type: 'error' });
    }
  };

  // MFA Handlers
  const handleMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const res = await apiRequest<{ qrCodeUrl: string; manualKey: string }>('/auth/mfa/setup', { method: 'POST' });
      setMfaSetupData(res || null);
      addToast({ message: 'Scan the QR code with your authenticator app', type: 'info' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to set up MFA', type: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaEnable = async () => {
    if (!mfaToken || mfaToken.length < 6) return addToast({ message: 'Enter your 6-digit TOTP code', type: 'error' });
    setMfaLoading(true);
    try {
      const res = await apiRequest<{ recoveryCodes?: string[] }>('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: mfaToken }),
      });
      const codes = res?.recoveryCodes || [];
      setRecoveryCodes(codes);
      setShowRecoveryCodes(true);
      setMfaSetupData(null);
      setMfaToken('');
      await loadMfaStatus();
      addToast({ message: 'MFA enabled successfully', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Invalid token — try again', type: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!mfaToken || mfaToken.length < 6) return addToast({ message: 'Enter your current TOTP code to disable MFA', type: 'error' });
    setMfaLoading(true);
    try {
      await apiRequest('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: mfaToken }),
      });
      setMfaToken('');
      await loadMfaStatus();
      addToast({ message: 'MFA disabled', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to disable MFA', type: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  // MCP Gateway Handlers
  const handleCreateMcpKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast({ message: 'Key name is required', type: 'warning' });
      return;
    }

    try {
      setCreatingMcpKey(true);
      const allowed = newKeyAllowedTools.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const blocked = newKeyBlockedTools.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await createMcpAgentKey(newKeyName.trim(), allowed, blocked);
      
      setNewKeyName('');
      setNewKeyAllowedTools('');
      setNewKeyBlockedTools('');
      setCreateKeyModalOpen(false);
      
      // Store the generated raw key, then open display modal
      setGeneratedRawKey(res.rawKey);
      setRawKeyModalOpen(true);
      
      loadMcpData();
      addToast({ message: 'MCP Agent Key generated successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to create agent key:', err);
      addToast({ message: 'Failed to create agent key', type: 'error' });
    } finally {
      setCreatingMcpKey(false);
    }
  };

  const handleRevokeMcpKey = async () => {
    if (!keyToRevoke) return;

    try {
      setRevokingMcpKey(true);
      await revokeMcpAgentKey(keyToRevoke.id);
      addToast({ message: `Revoked key: ${keyToRevoke.name}`, type: 'success' });
      setRevokeModalOpen(false);
      setKeyToRevoke(null);
      loadMcpData();
    } catch (err) {
      console.error('Failed to revoke key:', err);
      addToast({ message: 'Failed to revoke key', type: 'error' });
    } finally {
      setRevokingMcpKey(false);
    }
  };

  // SAML SSO configuration handlers
  const handleSaveSso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idpMetadataXml.trim()) {
      addToast({ message: 'IdP Metadata XML is required', type: 'warning' });
      return;
    }

    try {
      setSavingSso(true);
      const res = await saveSsoConfig(idpMetadataXml.trim(), ssoProviderName.trim());
      setCompany(res);
      addToast({ message: 'SAML SSO Configuration updated successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to save SSO config:', err);
      addToast({ message: 'Failed to update SAML SSO Configuration', type: 'error' });
    } finally {
      setSavingSso(false);
    }
  };

  // Helper values for SAML configuration display
  const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/v1$/, '').replace(/\/api$/, '') || 'http://localhost:10000';
  const spEntityId = company ? `${backendUrl}/api/v1/saml/${company.slug}/metadata` : '';
  const spAcsUrl = company ? `${backendUrl}/api/v1/saml/${company.slug}/callback` : '';
  const ssoLoginUrl = company ? `${backendUrl}/api/v1/saml/${company.slug}` : '';

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase">Settings</h1>
          <p className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-1">
            Global Configuration & Enterprise Controls
          </p>
        </div>
      </div>

      {/* Sleek Custom Tab Switcher */}
      <div className="flex border-b border-[var(--border-default)] mb-4 gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'profile'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Profile Settings
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'password'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Password
        </button>
        <button
          onClick={() => setActiveTab('llmkeys')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'llmkeys'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          LLM Keys
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'features'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Features
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'general'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          General & Alerts
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'mcp'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          MCP Gateway
        </button>
        <button
          onClick={() => setActiveTab('sso')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'sso'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          SAML SSO
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 shrink-0 ${
            activeTab === 'team'
              ? 'border-[var(--royal-indigo)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Team Management
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            profileName={profileName}
            setProfileName={setProfileName}
            profileJobTitle={profileJobTitle}
            setProfileJobTitle={setProfileJobTitle}
            savingProfile={savingProfile}
            handleSaveProfile={handleSaveProfile}
            profileAvatarUrl={profileAvatarUrl}
            uploadingAvatar={uploadingAvatar}
            handleAvatarUpload={handleAvatarUpload}
          />
        )}

        {activeTab === 'password' && (
          <PasswordTab
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            changingPassword={changingPassword}
            handleChangePasswordSubmit={handleChangePasswordSubmit}
          />
        )}

        {activeTab === 'llmkeys' && (
          <LlmKeysTab
            llmProvider={llmProvider}
            setLlmProvider={setLlmProvider}
            llmApiKey={llmApiKey}
            setLlmApiKey={setLlmApiKey}
            addingLlmKey={addingLlmKey}
            handleAddLlmKey={handleAddLlmKey}
            loadingLlmKeys={loadingLlmKeys}
            llmKeysList={llmKeysList}
            handleDeleteLlmKey={handleDeleteLlmKey}
          />
        )}

        {activeTab === 'features' && (
          <FeaturesTab
            loadingFeatureFlags={loadingFeatureFlags}
            featureFlagsList={featureFlagsList}
            handleToggleFeatureFlag={handleToggleFeatureFlag}
          />
        )}

        {activeTab === 'general' && (
          <GeneralTab
            apiKey={apiKey}
            handleCopyKey={handleCopyKey}
            handleRotateKey={handleRotateKey}
            loading={loading}
            email={email}
            setEmail={setEmail}
            handleSaveEmail={handleSaveEmail}
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            handleSaveWebhook={handleSaveWebhook}
            slackStatus={slackStatus}
            slackUrl={slackUrl}
            setSlackUrl={setSlackUrl}
            slackChannel={slackChannel}
            setSlackChannel={setSlackChannel}
            slackEnabled={slackEnabled}
            setSlackEnabled={setSlackEnabled}
            slackNotifyOn={slackNotifyOn}
            setSlackNotifyOn={setSlackNotifyOn}
            handleDeleteSlack={handleDeleteSlack}
            slackTesting={slackTesting}
            handleTestSlack={handleTestSlack}
            slackSaving={slackSaving}
            handleSaveSlack={handleSaveSlack}
            mfaStatus={mfaStatus}
            showRecoveryCodes={showRecoveryCodes}
            setShowRecoveryCodes={setShowRecoveryCodes}
            recoveryCodes={recoveryCodes}
            codesCopied={codesCopied}
            setCodesCopied={setCodesCopied}
            mfaToken={mfaToken}
            setMfaToken={setMfaToken}
            mfaLoading={mfaLoading}
            handleMfaDisable={handleMfaDisable}
            mfaSetupData={mfaSetupData}
            setMfaSetupData={setMfaSetupData}
            handleMfaSetup={handleMfaSetup}
            handleMfaEnable={handleMfaEnable}
            addToast={addToast}
          />
        )}

        {activeTab === 'mcp' && (
          <McpTab
            mcpKeysLoading={mcpKeysLoading}
            mcpKeys={mcpKeys}
            setCreateKeyModalOpen={setCreateKeyModalOpen}
            setKeyToRevoke={setKeyToRevoke}
            setRevokeModalOpen={setRevokeModalOpen}
            user={user}
            logsFilterDecision={logsFilterDecision}
            setLogsFilterDecision={setLogsFilterDecision}
            setLogsPage={setLogsPage}
            mcpLogsLoading={mcpLogsLoading}
            mcpLogs={mcpLogs}
            logsPage={logsPage}
            logsPages={logsPages}
            logsTotal={logsTotal}
          />
        )}

        {activeTab === 'sso' && (
          <SsoTab
            company={company}
            ssoProviderName={ssoProviderName}
            setSsoProviderName={setSsoProviderName}
            idpMetadataXml={idpMetadataXml}
            setIdpMetadataXml={setIdpMetadataXml}
            savingSso={savingSso}
            handleSaveSso={handleSaveSso}
            spEntityId={spEntityId}
            spAcsUrl={spAcsUrl}
            ssoLoginUrl={ssoLoginUrl}
            addToast={addToast}
          />
        )}

        {activeTab === 'team' && (
          <TeamTab
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            inviting={inviting}
            handleInviteUser={handleInviteUser}
            loadingInvitations={loadingInvitations}
            invitations={invitations}
            handleRevokeInvitation={handleRevokeInvitation}
          />
        )}
      </div>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* 1. MCP CREATE AGENT KEY MODAL */}
      {createKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setCreateKeyModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-[var(--royal-indigo)]" />
              Generate MCP Agent Key
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mb-6 border-b border-[var(--border-default)] pb-3">
              Configure allowed and blocked tools to restrict agent behavior. Leave lists blank to authorize all tools.
            </p>

            <form onSubmit={handleCreateMcpKey} className="space-y-4">
              <div>
                <label htmlFor="mcp-key-name" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Key Name / Agent Name *
                </label>
                <input
                  id="mcp-key-name"
                  type="text"
                  placeholder="e.g. LangChain Invoice Agent"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                  required
                />
              </div>

              <div>
                <label htmlFor="mcp-allowed-tools" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Allowed Tools (Comma-separated)
                </label>
                <input
                  id="mcp-allowed-tools"
                  type="text"
                  placeholder="e.g. sentra.checkAction, database.read"
                  value={newKeyAllowedTools}
                  onChange={(e) => setNewKeyAllowedTools(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div>
                <label htmlFor="mcp-blocked-tools" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                  Blocked Tools (Comma-separated)
                </label>
                <input
                  id="mcp-blocked-tools"
                  type="text"
                  placeholder="e.g. filesystem.write, shell.execute"
                  value={newKeyBlockedTools}
                  onChange={(e) => setNewKeyBlockedTools(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]/60">
                <button
                  type="button"
                  onClick={() => setCreateKeyModalOpen(false)}
                  className="px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] hover:bg-black/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMcpKey || !newKeyName.trim()}
                  className="px-5 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {creatingMcpKey ? 'Generating...' : 'Generate key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MCP KEY DISPLAY (RAW KEY SHOWN ONLY ONCE) */}
      {rawKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-page)] border border-red-500/20 rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-sm font-black uppercase tracking-wider text-green-500 flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Agent Secret Key Generated
            </h3>
            
            {/* Warning Message */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3.5 mb-6 flex gap-3 text-red-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider">Security Warning</p>
                <p className="text-[9px] font-bold leading-normal mt-0.5">
                  Store this key securely. It will not be shown again. If you lose this key, you will have to regenerate a new one.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Raw Key Value
                </span>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 font-mono text-[11px] text-green-400 break-all select-all">
                    {generatedRawKey}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedRawKey);
                      addToast({ message: 'Secret key copied!', type: 'success' });
                    }}
                    className="p-2.5 border border-[var(--border-default)] rounded bg-[var(--bg-page)] hover:text-green-400 hover:border-green-500/30 transition-all self-start"
                    title="Copy Key"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border-default)]/60">
                <button
                  onClick={() => {
                    setGeneratedRawKey('');
                    setRawKeyModalOpen(false);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  I have saved this key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MCP KEY REVOCATION CONFIRMATION */}
      {revokeModalOpen && keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--bg-page)] border border-red-500/20 rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-sm font-black uppercase tracking-wider text-red-500 flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4" />
              Revoke Agent Credentials?
            </h3>
            
            <p className="text-[10px] text-[var(--text-secondary)] font-bold mb-6">
              Are you sure you want to revoke "{keyToRevoke.name}"? 
              Any external AI agent running on this token will immediately be blocked from verifying tools or executing actions. This operation is permanent.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]/60">
              <button
                type="button"
                onClick={() => {
                  setRevokeModalOpen(false);
                  setKeyToRevoke(null);
                }}
                className="px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)] hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeMcpKey}
                disabled={revokingMcpKey}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {revokingMcpKey ? 'Revoking...' : 'Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// SUBCOMPONENTS
// ==============================================================

interface ProfileTabProps {
  user: any;
  profileName: string;
  setProfileName: (val: string) => void;
  profileJobTitle: string;
  setProfileJobTitle: (val: string) => void;
  savingProfile: boolean;
  handleSaveProfile: (e: React.FormEvent) => void;
  profileAvatarUrl: string;
  uploadingAvatar: boolean;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ProfileTab({
  user,
  profileName,
  setProfileName,
  profileJobTitle,
  setProfileJobTitle,
  savingProfile,
  handleSaveProfile,
  profileAvatarUrl,
  uploadingAvatar,
  handleAvatarUpload,
}: ProfileTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--royal-indigo)]" />
            User Profile Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                Email Address (Read-only)
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-muted)] cursor-not-allowed opacity-60"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
                placeholder="e.g. Director of Compliance / AI Security Engineer"
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <div className="card-base p-6 flex flex-col items-center text-center">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 w-full text-left">
            Profile Avatar
          </h3>

          <div className="relative group mb-6">
            {profileAvatarUrl ? (
              <img
                src={profileAvatarUrl}
                alt="Avatar"
                className="h-28 w-28 rounded-full object-cover border-2 border-[var(--border-default)] bg-zinc-900"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-indigo-600 border border-white/10 flex items-center justify-center text-3xl font-black text-white">
                {(profileName || user?.fullName || 'AD')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-xs text-white font-bold uppercase">
                Uploading...
              </div>
            )}
          </div>

          <label className="px-4 py-2 bg-zinc-800 border border-[var(--border-default)] hover:bg-zinc-700 text-white rounded text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95">
            Choose New Avatar
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
          <p className="text-[9px] text-[var(--text-muted)] mt-2 uppercase tracking-wider font-bold">
            PNG, JPG or GIF up to 5MB
          </p>
        </div>
      </div>
    </div>
  );
}

interface PasswordTabProps {
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  changingPassword: boolean;
  handleChangePasswordSubmit: (e: React.FormEvent) => void;
}

function PasswordTab({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  changingPassword,
  handleChangePasswordSubmit,
}: PasswordTabProps) {
  return (
    <div className="max-w-xl">
      <div className="card-base p-6">
        <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
          <Lock className="h-4 w-4 text-[var(--royal-indigo)]" />
          Change Password
        </h3>

        <form onSubmit={handleChangePasswordSubmit} className="space-y-6">
          <div>
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LlmKeysTabProps {
  llmProvider: string;
  setLlmProvider: (val: string) => void;
  llmApiKey: string;
  setLlmApiKey: (val: string) => void;
  addingLlmKey: boolean;
  handleAddLlmKey: (e: React.FormEvent) => void;
  loadingLlmKeys: boolean;
  llmKeysList: any[];
  handleDeleteLlmKey: (id: string) => void;
}

function LlmKeysTab({
  llmProvider,
  setLlmProvider,
  llmApiKey,
  setLlmApiKey,
  addingLlmKey,
  handleAddLlmKey,
  loadingLlmKeys,
  llmKeysList,
  handleDeleteLlmKey,
}: LlmKeysTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--royal-indigo)]" />
            Add Provider Key
          </h3>

          <form onSubmit={handleAddLlmKey} className="space-y-6">
            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                LLM Provider
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              >
                <option value="openai">OpenAI (GPT-4o, etc.)</option>
                <option value="anthropic">Anthropic (Claude 3.5, etc.)</option>
                <option value="google">Google Gemini</option>
                <option value="cohere">Cohere</option>
                <option value="meta">Meta Llama (Replicate/Ollama)</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                API Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] font-mono"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={addingLlmKey || !llmApiKey.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {addingLlmKey ? 'Adding...' : 'Add Key'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6">
            Configured API Keys
          </h3>

          {loadingLlmKeys ? (
            <div className="py-12 flex justify-center items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
              <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
              Loading provider keys...
            </div>
          ) : llmKeysList.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs italic">
              No API keys configured yet. Set up a provider key to power AI features.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[9px] font-black text-gray-500 uppercase tracking-widest bg-zinc-950/20">
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Masked Key</th>
                    <th className="py-3 px-4">Configured By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {llmKeysList.map((k) => (
                    <tr key={k.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white uppercase tracking-wider">
                        {k.provider}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                        {k.maskedKey}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400">
                        {k.users?.full_name || k.users?.email || 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteLlmKey(k.id)}
                          type="button"
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20 transition-all active:scale-95"
                          title="Delete key"
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
    </div>
  );
}

interface FeaturesTabProps {
  loadingFeatureFlags: boolean;
  featureFlagsList: any[];
  handleToggleFeatureFlag: (key: string, enabled: boolean) => void;
}

function FeaturesTab({
  loadingFeatureFlags,
  featureFlagsList,
  handleToggleFeatureFlag,
}: FeaturesTabProps) {
  return (
    <div className="card-base p-6">
      <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
        <Sliders className="h-4 w-4 text-[var(--royal-indigo)]" />
        Feature Flags & System Overrides
      </h3>

      {loadingFeatureFlags ? (
        <div className="py-12 flex justify-center items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
          <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
          Loading feature states...
        </div>
      ) : featureFlagsList.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-xs italic">
          No system feature flags registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureFlagsList.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-4 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl hover:border-zinc-800 transition-all"
            >
              <div>
                <p className="text-xs font-bold text-white tracking-wide">{flag.name}</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mt-0.5">{flag.key}</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flag.enabled}
                  onChange={() => handleToggleFeatureFlag(flag.key, flag.enabled)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface GeneralTabProps {
  apiKey: string;
  handleCopyKey: () => void;
  handleRotateKey: () => void;
  loading: boolean;
  email: string;
  setEmail: (val: string) => void;
  handleSaveEmail: (e: React.FormEvent) => void;
  webhookUrl: string;
  setWebhookUrl: (val: string) => void;
  handleSaveWebhook: (e: React.FormEvent) => void;
  slackStatus: string;
  slackUrl: string;
  setSlackUrl: (val: string) => void;
  slackChannel: string;
  setSlackChannel: (val: string) => void;
  slackEnabled: boolean;
  setSlackEnabled: (val: boolean) => void;
  slackNotifyOn: string[];
  setSlackNotifyOn: (val: string[]) => void;
  handleDeleteSlack: () => void;
  slackTesting: boolean;
  handleTestSlack: () => void;
  slackSaving: boolean;
  handleSaveSlack: () => void;
  mfaStatus: { enabled: boolean } | null;
  showRecoveryCodes: boolean;
  setShowRecoveryCodes: (val: boolean) => void;
  recoveryCodes: string[];
  codesCopied: boolean;
  setCodesCopied: (val: boolean) => void;
  mfaToken: string;
  setMfaToken: (val: string) => void;
  mfaLoading: boolean;
  handleMfaDisable: () => void;
  mfaSetupData: { qrCodeUrl: string; manualKey: string } | null;
  setMfaSetupData: (val: { qrCodeUrl: string; manualKey: string } | null) => void;
  handleMfaSetup: () => void;
  handleMfaEnable: () => void;
  addToast: any;
}

function GeneralTab({
  apiKey,
  handleCopyKey,
  handleRotateKey,
  loading,
  email,
  setEmail,
  handleSaveEmail,
  webhookUrl,
  setWebhookUrl,
  handleSaveWebhook,
  slackStatus,
  slackUrl,
  setSlackUrl,
  slackChannel,
  setSlackChannel,
  slackEnabled,
  setSlackEnabled,
  slackNotifyOn,
  setSlackNotifyOn,
  handleDeleteSlack,
  slackTesting,
  handleTestSlack,
  slackSaving,
  handleSaveSlack,
  mfaStatus,
  showRecoveryCodes,
  setShowRecoveryCodes,
  recoveryCodes,
  codesCopied,
  setCodesCopied,
  mfaToken,
  setMfaToken,
  mfaLoading,
  handleMfaDisable,
  mfaSetupData,
  setMfaSetupData,
  handleMfaSetup,
  handleMfaEnable,
  addToast,
}: GeneralTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Section 1: API Keys */}
      <div className="lg:col-span-6 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Key className="h-4 w-4 text-[var(--royal-indigo)]" />
            API Authentication
          </h3>
          
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Active API Key</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] overflow-hidden text-ellipsis">
                  {apiKey}
                </div>
                <button 
                  onClick={handleCopyKey}
                  type="button"
                  className="p-2.5 text-[var(--text-muted)] hover:text-[var(--royal-indigo)] bg-[var(--bg-page)] border border-[var(--border-default)] rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
                Use this key to authenticate your SDK calls to Sentra AI.
              </p>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleRotateKey}
                disabled={loading}
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-[var(--border-default)] rounded text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest hover:bg-black/10 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Regenerate Key
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Alert Configuration */}
      <div className="lg:col-span-6 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--royal-indigo)]" />
            Alert Configuration
          </h3>

          <div className="space-y-8">
            <form onSubmit={handleSaveEmail}>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="alert-email" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Alert Email</label>
                  <input 
                    id="alert-email"
                    type="email" 
                    placeholder="alerts@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                  />
                </div>
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] rounded text-[9px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all w-fit self-end"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Email
                </button>
              </div>
            </form>

            <div className="h-px bg-[var(--border-default)] opacity-50" />

            <form onSubmit={handleSaveWebhook}>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="webhook-url" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Webhook URL</label>
                  <input 
                    id="webhook-url"
                    type="url" 
                    placeholder="https://hooks.slack.com/services/..." 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                  />
                </div>
                <button 
                  type="submit"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] rounded text-[9px] font-black text-white uppercase tracking-widest hover:bg-[var(--royal-indigo)] transition-all w-fit self-end"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Section 3: Slack Integration */}
      <div className="lg:col-span-12 space-y-4">
        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Slack className="h-4 w-4 text-[#4A154B]" />
              Slack Integration
            </h3>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
              slackStatus === 'connected' 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}>
              {slackStatus === 'connected' ? 'Connected' : 'Not Configured'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="slack-webhook" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Slack Webhook URL</label>
                <input 
                  id="slack-webhook"
                  type="password" 
                  placeholder="https://hooks.slack.com/services/..." 
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                />
              </div>

              <div>
                <label htmlFor="slack-channel" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">Slack Channel</label>
                <input 
                  id="slack-channel"
                  type="text" 
                  placeholder="#alerts-compliance" 
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]" 
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  id="slack-enabled"
                  type="checkbox"
                  checked={slackEnabled}
                  onChange={(e) => setSlackEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[var(--royal-indigo)] rounded border-[var(--border-default)] cursor-pointer"
                />
                <label htmlFor="slack-enabled" className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-wider cursor-pointer">
                  Enable Slack Notifications
                </label>
              </div>
            </div>

            <div>
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-2.5">Alert Triggers</span>
              <div className="space-y-2.5 bg-[var(--bg-page)] border border-[var(--border-default)] rounded p-4">
                {[
                  { id: 'guardrail_block', label: 'Guardrail Blocks' },
                  { id: 'drift_detected', label: 'Behavioral Drift Detected' },
                  { id: 'incident_created', label: 'Security Incidents' },
                  { id: 'policy_violation', label: 'Policy Violations' },
                  { id: 'workflow_change', label: 'Workflow Phase Transitions' }
                ].map((trigger) => (
                  <div key={trigger.id} className="flex items-center gap-2">
                    <input 
                      id={`trigger-${trigger.id}`}
                      type="checkbox"
                      checked={slackNotifyOn.includes(trigger.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSlackNotifyOn([...slackNotifyOn, trigger.id]);
                        } else {
                          setSlackNotifyOn(slackNotifyOn.filter(x => x !== trigger.id));
                        }
                      }}
                      className="h-3.5 w-3.5 accent-[var(--royal-indigo)] rounded cursor-pointer"
                    />
                    <label htmlFor={`trigger-${trigger.id}`} className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer">
                      {trigger.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t border-[var(--border-default)] pt-4">
            {slackStatus === 'connected' && (
              <button 
                onClick={handleDeleteSlack}
                type="button"
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Disconnect Slack
              </button>
            )}
            <button 
              onClick={handleTestSlack}
              disabled={slackTesting || !slackUrl || !slackChannel}
              type="button"
              className="px-4 py-2 bg-black/5 hover:bg-black/10 text-[var(--text-primary)] border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {slackTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              onClick={handleSaveSlack}
              disabled={slackSaving || !slackUrl || !slackChannel}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {slackSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Multi-Factor Authentication (MFA) */}
      <div className="lg:col-span-12 space-y-4">
        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--royal-indigo)]" />
              Multi-Factor Authentication (MFA)
            </h3>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
              mfaStatus?.enabled 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}>
              {mfaStatus?.enabled ? 'Active & Enforced' : 'Disabled'}
            </span>
          </div>

          <div className="space-y-6">
            {mfaStatus?.enabled ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded p-4 text-[var(--text-primary)]">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-green-400">TOTP Authenticator Protection Active</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Your account is protected by an industry-standard time-based one-time password (TOTP) authenticator. Verification will be required at login.
                    </p>
                  </div>
                </div>

                {showRecoveryCodes && recoveryCodes.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">MFA Recovery Codes Generated</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Write down these recovery codes in a secure location. Each code can be used once to bypass MFA if you lose your authentication device.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-page)] p-3 rounded border border-[var(--border-default)]">
                      {recoveryCodes.map((code, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black/10 px-2.5 py-1.5 rounded">
                          <span>{code}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(recoveryCodes.join('\n'));
                          setCodesCopied(true);
                          addToast({ message: 'Recovery codes copied', type: 'info' });
                          setTimeout(() => setCodesCopied(false), 2000);
                        }}
                        type="button"
                        className="flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-all"
                      >
                        <Copy className="h-3 w-3" />
                        {codesCopied ? 'Copied!' : 'Copy Codes'}
                      </button>
                      <button
                        onClick={() => setShowRecoveryCodes(false)}
                        type="button"
                        className="px-3 py-1.5 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        I Have Saved These Codes
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-[var(--border-default)]/60 pt-4">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-2">Disable Multi-Factor Authentication</span>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit TOTP code to confirm" 
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] w-64"
                    />
                    <button 
                      onClick={handleMfaDisable}
                      disabled={mfaLoading || mfaToken.length < 6}
                      type="button"
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Disable Authenticator
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Add an extra layer of security to your enterprise account by configuring a mobile authenticator app (such as Google Authenticator, Duo, or 1Password). Verification tokens will be prompted on every system dashboard login request.
                </p>

                {!mfaSetupData ? (
                  <button
                    onClick={handleMfaSetup}
                    disabled={mfaLoading}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Enable Authenticator
                  </button>
                ) : (
                  <div className="border border-[var(--border-default)] rounded p-5 bg-[var(--bg-page)] space-y-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      <div className="bg-white p-2 rounded-xl border border-[var(--border-default)] shrink-0 flex items-center justify-center shadow-lg animate-fade-in">
                        <img src={mfaSetupData.qrCodeUrl} alt="MFA QR Code" className="h-32 w-32 object-contain" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">Configure mobile app</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                          Scan the QR code using your mobile authenticator app. If your device camera is unable to scan it, enter the manual configuration key below:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="bg-black/10 border border-[var(--border-default)] rounded px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {mfaSetupData.manualKey}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(mfaSetupData.manualKey);
                              addToast({ message: 'Manual key copied', type: 'info' });
                            }}
                            type="button"
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--royal-indigo)] bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded transition-colors"
                            title="Copy Manual Key"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
                      <label htmlFor="mfa-totp-enable" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block">Verify Authenticator Setup</label>
                      <p className="text-[10px] text-[var(--text-secondary)] mb-2">
                        Enter the 6-digit verification code generated by your mobile app to finalize configuration:
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <input 
                          id="mfa-totp-enable"
                          type="text" 
                          placeholder="Enter 6-digit TOTP code" 
                          value={mfaToken}
                          onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] w-64"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleMfaEnable}
                            disabled={mfaLoading || mfaToken.length < 6}
                            type="button"
                            className="px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            Verify & Enable MFA
                          </button>
                          <button
                            onClick={() => { setMfaSetupData(null); setMfaToken(''); }}
                            type="button"
                            className="px-4 py-2 border border-[var(--border-default)] rounded text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:bg-black/5 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface McpTabProps {
  mcpKeysLoading: boolean;
  mcpKeys: any[];
  setCreateKeyModalOpen: (val: boolean) => void;
  setKeyToRevoke: (val: any) => void;
  setRevokeModalOpen: (val: boolean) => void;
  user: any;
  logsFilterDecision: 'all' | 'allowed' | 'blocked';
  setLogsFilterDecision: (val: 'all' | 'allowed' | 'blocked') => void;
  setLogsPage: (val: number | ((prev: number) => number)) => void;
  mcpLogsLoading: boolean;
  mcpLogs: any[];
  logsPage: number;
  logsPages: number;
  logsTotal: number;
}

function McpTab({
  mcpKeysLoading,
  mcpKeys,
  setCreateKeyModalOpen,
  setKeyToRevoke,
  setRevokeModalOpen,
  user,
  logsFilterDecision,
  setLogsFilterDecision,
  setLogsPage,
  mcpLogsLoading,
  mcpLogs,
  logsPage,
  logsPages,
  logsTotal,
}: McpTabProps) {
  return (
    <div className="space-y-6">
      {/* API Keys Table */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Key className="h-4 w-4 text-[var(--royal-indigo)]" />
              MCP Agent Keys
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-xl">
              SAML-authenticated API access credentials for dynamic, real-time agent governance over Model Context Protocol (MCP) integrations.
            </p>
          </div>
          
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setCreateKeyModalOpen(true)}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Agent Key
            </button>
          )}
        </div>

        {mcpKeysLoading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-muted)]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs uppercase tracking-wider font-bold">Loading agent credentials...</span>
          </div>
        ) : mcpKeys.length === 0 ? (
          <div className="py-12 text-center bg-black/5 rounded border border-dashed border-[var(--border-default)]">
            <AlertTriangle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">No Agent Keys Registered</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Generate a key to grant your external AI agents access to Sentra's governance pipeline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="pb-3 font-black">Key Name</th>
                  <th className="pb-3 font-black">Prefix</th>
                  <th className="pb-3 font-black">Created At</th>
                  <th className="pb-3 font-black">Last Used</th>
                  <th className="pb-3 font-black text-center">Allowed Tools</th>
                  <th className="pb-3 font-black text-center">Status</th>
                  <th className="pb-3 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpKeys.map((key) => (
                  <tr key={key.id} className="border-b border-[var(--border-default)]/30 hover:bg-white/5 transition-colors">
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{key.name}</td>
                    <td className="py-3.5 font-mono text-[var(--text-secondary)] text-[10px]">{key.key_prefix}••••</td>
                    <td className="py-3.5 text-[var(--text-muted)]">{new Date(key.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 text-[var(--text-muted)]">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() + ' ' + new Date(key.last_used_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span className="italic">Never</span>}
                    </td>
                    <td className="py-3.5 text-center">
                      {key.allowed_tools && key.allowed_tools.length > 0 ? (
                        <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/20">
                          {key.allowed_tools.length} Limit
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">All Tools</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <div className="flex justify-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          key.is_active 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      {key.is_active && user?.role === 'ADMIN' ? (
                        <button
                          onClick={() => {
                            setKeyToRevoke(key);
                            setRevokeModalOpen(true);
                          }}
                          type="button"
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Revoke Key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[10px] italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--royal-indigo)]" />
              MCP Gateway Audit Logs
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Immutable governance evaluation logs intercepting external model execution attempts.
            </p>
          </div>

          {/* Filter Selector */}
          <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5">
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Decision:</span>
            <select
              value={logsFilterDecision}
              onChange={(e) => {
                setLogsFilterDecision(e.target.value as any);
                setLogsPage(1);
              }}
              className="bg-transparent text-xs text-[var(--text-primary)] font-bold border-none outline-none cursor-pointer"
            >
              <option value="all">All Logs</option>
              <option value="allowed">Allowed Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>
        </div>

        {mcpLogsLoading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-muted)]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs uppercase tracking-wider font-bold">Loading audit trails...</span>
          </div>
        ) : mcpLogs.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <CheckCircle2 className="h-8 w-8 text-green-500/20 mx-auto mb-2" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">No Evaluation Logs Recorded</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Logs will appear as soon as external agents trigger registered MCP tools.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="pb-3 font-black">Timestamp</th>
                    <th className="pb-3 font-black">Tool Name</th>
                    <th className="pb-3 font-black">Args Summary</th>
                    <th className="pb-3 font-black text-center">Decision</th>
                    <th className="pb-3 font-black text-center">Risk</th>
                    <th className="pb-3 font-black">Reason</th>
                    <th className="pb-3 font-black text-right">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {mcpLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border-default)]/30 hover:bg-white/5 transition-colors">
                      <td className="py-3 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 font-bold font-mono text-[var(--text-primary)]">{log.tool_name}</td>
                      <td className="py-3 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-secondary)] font-mono text-[10px]">
                        {log.input_summary || '{}'}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-center">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            log.decision === 'allowed'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {log.decision}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-center">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            log.risk_level === 'high' 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : log.risk_level === 'medium'
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {log.risk_level}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={log.reason}>
                        {log.reason || 'None provided'}
                      </td>
                      <td className="py-3 text-right font-mono text-[10px] text-[var(--text-muted)]">
                        {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Simple Pagination Controls */}
            {logsPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border-default)]/30 pt-4 text-xs">
                <span className="text-[var(--text-muted)]">
                  Showing page <span className="font-bold text-[var(--text-secondary)]">{logsPage}</span> of <span className="font-bold text-[var(--text-secondary)]">{logsPages}</span> ({logsTotal} logs)
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                    disabled={logsPage === 1}
                    type="button"
                    className="px-3 py-1 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider disabled:opacity-50 text-[var(--text-primary)]"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setLogsPage(prev => Math.min(logsPages, prev + 1))}
                    disabled={logsPage === logsPages}
                    type="button"
                    className="px-3 py-1 bg-black/5 hover:bg-black/10 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-wider disabled:opacity-50 text-[var(--text-primary)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SsoTabProps {
  company: any;
  ssoProviderName: string;
  setSsoProviderName: (val: string) => void;
  idpMetadataXml: string;
  setIdpMetadataXml: (val: string) => void;
  savingSso: boolean;
  handleSaveSso: (e: React.FormEvent) => void;
  spEntityId: string;
  spAcsUrl: string;
  ssoLoginUrl: string;
  addToast: any;
}

function SsoTab({
  company,
  ssoProviderName,
  setSsoProviderName,
  idpMetadataXml,
  setIdpMetadataXml,
  savingSso,
  handleSaveSso,
  spEntityId,
  spAcsUrl,
  ssoLoginUrl,
  addToast,
}: SsoTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form configuration */}
      <div className="lg:col-span-7 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--royal-indigo)]" />
            SAML 2.0 Identity Provider Config
          </h3>

          <form onSubmit={handleSaveSso} className="space-y-6">
            <div>
              <label htmlFor="sso-provider" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                SSO Provider Name
              </label>
              <input
                id="sso-provider"
                type="text"
                placeholder="e.g. Okta, Azure Active Directory, Google Workspace"
                value={ssoProviderName}
                onChange={(e) => setSsoProviderName(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              />
            </div>

            <div>
              <label htmlFor="idp-xml" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                IdP Metadata XML
              </label>
              <textarea
                id="idp-xml"
                rows={12}
                placeholder="Paste the full IdP XML metadata string provided by your Identity Provider..."
                value={idpMetadataXml}
                onChange={(e) => setIdpMetadataXml(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[10px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)] resize-y"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSso || !idpMetadataXml.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingSso ? 'Configuring SSO...' : 'Save & Enable SSO'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Read-only details */}
      <div className="lg:col-span-5 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--royal-indigo)]" />
            Service Provider (SP) Credentials
          </h3>

          {!company ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">
              Resolving tenant workspace slug...
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  SAML Status
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${company.sso_enabled ? 'bg-green-500' : 'bg-zinc-500'}`} />
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)]">
                    {company.sso_enabled ? `SAML SSO Enabled (${company.sso_provider || 'SAML'})` : 'Inactive (Mock SSO Active)'}
                  </span>
                </div>
              </div>

              <div className="h-px bg-[var(--border-default)]/40" />

              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Your SP Entity ID
                </span>
                <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                  {spEntityId}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  Your ACS URL (Assertion Consumer Service)
                </span>
                <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                  {spAcsUrl}
                </div>
              </div>

              <div className="h-px bg-[var(--border-default)]/40" />

              <div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1">
                  SSO Login URL
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    {ssoLoginUrl}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ssoLoginUrl);
                      addToast({ message: 'SSO Login URL copied!', type: 'info' });
                    }}
                    type="button"
                    className="p-2 border border-[var(--border-default)] rounded hover:text-[var(--royal-indigo)] bg-[var(--bg-page)]"
                    title="Copy Link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {company.sso_enabled && (
                <div className="pt-2">
                  <a
                    href={spEntityId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border-default)] rounded text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-black/10 transition-colors w-full"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Download SP Metadata XML
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TeamTabProps {
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteRole: string;
  setInviteRole: (val: string) => void;
  inviting: boolean;
  handleInviteUser: (e: React.FormEvent) => void;
  loadingInvitations: boolean;
  invitations: any[];
  handleRevokeInvitation: (id: string) => void;
}

function TeamTab({
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviting,
  handleInviteUser,
  loadingInvitations,
  invitations,
  handleRevokeInvitation,
}: TeamTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Invite Form */}
      <div className="lg:col-span-5 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--royal-indigo)]" />
            Invite New Member
          </h3>

          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              />
            </div>

            <div>
              <label htmlFor="invite-role" className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest block mb-1.5">
                Organization Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-2 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--royal-indigo)]"
              >
                <option value="VIEWER">Viewer (Read-only access)</option>
                <option value="AUDITOR">Auditor (Audit logs & policies read)</option>
                <option value="SECURITY_ANALYST">Security Analyst (Monitor & resolve incidents)</option>
                <option value="COMPLIANCE_MANAGER">Compliance Manager (Workflows & evidence)</option>
                <option value="ADMIN">Admin (Full tenant control)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] text-white rounded text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 w-full"
            >
              <Plus className="h-3.5 w-3.5" />
              {inviting ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>

      {/* Pending Invitations list */}
      <div className="lg:col-span-7 space-y-4">
        <div className="card-base p-6">
          <h3 className="text-[var(--text-md)] font-bold text-[var(--text-primary)] uppercase tracking-tight mb-6 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--royal-indigo)]" />
            Sent Invitations
          </h3>

          {loadingInvitations ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--royal-indigo)]" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
              No active invitations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                    <th className="pb-3 font-bold">Email</th>
                    <th className="pb-3 font-bold">Role</th>
                    <th className="pb-3 font-bold">Expires</th>
                    <th className="pb-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]/40">
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    const isAccepted = !!inv.accepted_at;
                    return (
                      <tr key={inv.id} className="text-[11px] text-[var(--text-primary)]">
                        <td className="py-3.5 font-mono">{inv.email}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-[var(--text-muted)]">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 text-right">
                          {isAccepted ? (
                            <span className="text-green-500 font-bold uppercase text-[9px]">Accepted</span>
                          ) : isExpired ? (
                            <span className="text-red-500 font-bold uppercase text-[9px]">Expired</span>
                          ) : (
                            <button
                              onClick={() => handleRevokeInvitation(inv.id)}
                              type="button"
                              className="p-1 hover:text-red-500 text-[var(--text-muted)] transition-colors"
                              title="Revoke invitation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
