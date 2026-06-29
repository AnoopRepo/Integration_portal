import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Palette, Bell, Brain, Database, Shield,
  Globe, Type, Layout, Mail, Smartphone, Thermometer,
  Hash, AlignLeft, Download, Trash2, HardDrive,
  Lock, Smartphone as Phone, Monitor,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { checkConnection, OllamaStatus } from '../../lib/ollama';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Settings', icon: Brain },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
  checked,
  onChange,
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={cn(
      'relative w-10 rounded-full transition-colors duration-200 border border-border',
      checked ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-surface-2',
    )}
    style={{ height: '22px' }}
  >
    <motion.div
      animate={{ x: checked ? 20 : 2 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
    />
  </button>
);

const Slider: React.FC<{
  min: number; max: number; value: number;
  step?: number; onChange: (v: number) => void;
}> = ({ min, max, value, step = 1, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #6366f1 ${pct}%, var(--border-primary) ${pct}%)`,
          height: '4px',
          borderRadius: '2px',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />
    </div>
  );
};

const SettingRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-border gap-3">
    <div className="flex-1 pr-4">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-[11px] text-text-muted mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0 w-full sm:w-auto flex justify-end">{children}</div>
  </div>
);

const Select: React.FC<{
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="bg-surface-1 border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer w-full sm:w-auto transition-colors"
  >
    {options.map((o) => (
      <option key={o} value={o} className="bg-surface-1 text-text-primary">{o}</option>
    ))}
  </select>
);

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('UTC-5 (Eastern)');
  const [fontSize, setFontSize] = useState('Medium');
  const [density, setDensity] = useState('Comfortable');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('company_agent_ai_temperature');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [maxTokens, setMaxTokens] = useState(() => {
    const saved = localStorage.getItem('company_agent_ai_max_tokens');
    return saved ? parseInt(saved, 10) : 2048;
  });
  const [systemPrompt, setSystemPrompt] = useState(() => {
    const saved = localStorage.getItem('company_agent_ai_system_prompt');
    return saved ?? 'You are a helpful AI assistant. Respond clearly and concisely.';
  });
  
  const [twoFA, setTwoFA] = useState(false);

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const hasModels = ollamaStatus?.connected === true && ollamaStatus.models.length > 0;
  const hasNoModels = ollamaStatus?.connected === true && ollamaStatus.models.length === 0;
  const activeModel = ollamaStatus?.connected === true 
    ? (ollamaStatus.hasQwen ? ollamaStatus.qwenModelName : (ollamaStatus.models[0] || null))
    : null;

  const fetchOllamaStatus = async () => {
    setIsLoadingStatus(true);
    const status = await checkConnection();
    setOllamaStatus(status);
    setIsLoadingStatus(false);
  };

  useEffect(() => {
    fetchOllamaStatus();
  }, []);

  useEffect(() => {
    localStorage.setItem('company_agent_ai_temperature', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('company_agent_ai_max_tokens', maxTokens.toString());
  }, [maxTokens]);

  useEffect(() => {
    localStorage.setItem('company_agent_ai_system_prompt', systemPrompt);
  }, [systemPrompt]);

  const panelContent: Record<string, React.ReactNode> = {
    general: (
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">General Settings</h2>
        <SettingRow label="Workspace Name" description="Name displayed in the header">
          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 w-full sm:w-44 focus:outline-none focus:border-indigo-400"
          />
        </SettingRow>
        <SettingRow label="Language">
          <Select value={language} options={['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese']} onChange={setLanguage} />
        </SettingRow>
        <SettingRow label="Timezone">
          <Select value={timezone} options={['UTC-8 (Pacific)', 'UTC-5 (Eastern)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+5:30 (IST)', 'UTC+8 (CST)']} onChange={setTimezone} />
        </SettingRow>
      </div>
    ),

    appearance: (
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-4">Appearance</h2>
        <SettingRow label="Font Size">
          <Select value={fontSize} options={['Small', 'Medium', 'Large', 'Extra Large']} onChange={setFontSize} />
        </SettingRow>
        <SettingRow label="Density">
          <Select value={density} options={['Compact', 'Comfortable', 'Spacious']} onChange={setDensity} />
        </SettingRow>
      </div>
    ),

    notifications: (
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Notifications</h2>
        <SettingRow label="Email Notifications" description="Get updates via email">
          <Toggle checked={notifEmail} onChange={setNotifEmail} />
        </SettingRow>
        <SettingRow label="Push Notifications" description="Browser push alerts">
          <Toggle checked={notifPush} onChange={setNotifPush} />
        </SettingRow>
        <SettingRow label="Daily Digest" description="Summary email each morning">
          <Toggle checked={notifDigest} onChange={setNotifDigest} />
        </SettingRow>
        <SettingRow label="Digest Frequency">
          <Select value="Daily" options={['Daily', 'Weekly', 'Monthly', 'Never']} onChange={() => {}} />
        </SettingRow>
      </div>
    ),

    ai: (
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">AI Settings</h2>

        {/* Local Ollama Status Section */}
        <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Local Ollama Service</h3>
            <button 
              onClick={fetchOllamaStatus} 
              disabled={isLoadingStatus}
              className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingStatus ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
          
          <div className="flex items-center gap-2.5 py-1">
            <div className="relative">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                ollamaStatus?.connected 
                  ? (hasModels ? "bg-emerald-500" : "bg-amber-500")
                  : "bg-rose-500"
              )} />
              {ollamaStatus?.connected && (
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 rounded-full",
                    hasModels ? "bg-emerald-400" : "bg-amber-400"
                  )}
                />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {ollamaStatus === null && 'Loading...'}
                {ollamaStatus?.connected === false && 'Ollama: Offline'}
                {hasNoModels && 'Ollama: No Models Found'}
                {hasModels && `Ollama: Active (${activeModel})`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {ollamaStatus?.connected === false && 'Start your local Ollama application to connect.'}
                {hasNoModels && 'Ollama is running, but no models are downloaded locally.'}
                {hasModels && `Successfully integrated local ${activeModel} agent.`}
              </p>
            </div>
          </div>
          
          {ollamaStatus?.connected && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-medium">Downloaded Models:</p>
              <div className="flex flex-wrap gap-1.5">
                {ollamaStatus.models.length === 0 ? (
                  <span className="text-[10px] text-slate-400">No models found</span>
                ) : (
                  ollamaStatus.models.map(m => (
                    <span 
                      key={m} 
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded border font-mono",
                        m === activeModel
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-white text-slate-500 border-slate-200"
                      )}
                    >
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {ollamaStatus?.connected === false && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-600 leading-relaxed">
              💡 <strong>Setup Tip:</strong> Run <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-700 font-mono">ollama serve</code> in your terminal to start Ollama on port 11434.
            </div>
          )}

          {hasNoModels && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-600 leading-relaxed">
              💡 <strong>Missing Models:</strong> Pull a model in your terminal (e.g. <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-700 font-mono">ollama run qwen</code>) to download a model.
            </div>
          )}
        </div>

        <div className="py-3.5 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Temperature</p>
              <p className="text-[11px] text-slate-400">Controls randomness ({temperature})</p>
            </div>
            <span className="text-sm font-mono text-indigo-600 w-10 text-right">{temperature}</span>
          </div>
          <Slider min={0} max={1} step={0.05} value={temperature} onChange={setTemperature} />
        </div>
        <div className="py-3.5 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Max Tokens</p>
              <p className="text-[11px] text-slate-400">Maximum response length</p>
            </div>
            <span className="text-sm font-mono text-indigo-600">{maxTokens.toLocaleString()}</span>
          </div>
          <Slider min={256} max={4096} step={256} value={maxTokens} onChange={setMaxTokens} />
        </div>
        <SettingRow label="Response Language">
          <Select value="English" options={['English', 'Spanish', 'French', 'Auto-detect']} onChange={() => {}} />
        </SettingRow>
        <div className="py-3.5 space-y-2">
          <p className="text-sm font-medium text-slate-700">System Prompt</p>
          <p className="text-[11px] text-slate-400">Custom instructions for the AI agent</p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-400 resize-none placeholder:text-slate-400 scrollbar-thin"
          />
        </div>
      </div>
    ),

    data: (
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Data Management</h2>
        <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600">Storage Used</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">2.4 GB / 10 GB</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
              style={{ width: '24%' }}
            />
          </div>
          <p className="text-[10px] text-slate-400">7.6 GB remaining</p>
        </div>
        <SettingRow label="Export Conversations" description="Download all your conversation history">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all">
            <Download size={12} />
            Export JSON
          </button>
        </SettingRow>
        <SettingRow label="Clear History" description="Permanently delete all conversations">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs text-rose-500 hover:bg-rose-50 transition-all">
            <Trash2 size={12} />
            Clear All
          </button>
        </SettingRow>
      </div>
    ),

    security: (
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Security</h2>
        <SettingRow label="Two-Factor Authentication" description="Add an extra layer of security">
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </SettingRow>
        <div className="py-4 border-b border-border space-y-3">
          <p className="text-sm font-medium text-text-primary">Change Password</p>
          {['Current Password', 'New Password', 'Confirm Password'].map((label) => (
            <input
              key={label}
              type="password"
              placeholder={label}
              className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 placeholder:text-text-muted transition-colors"
            />
          ))}
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
            Update Password
          </button>
        </div>
        <div className="pt-4">
          <p className="text-sm font-medium text-text-primary mb-3">Active Sessions</p>
          {[
            { device: 'Chrome on Windows', location: 'New York, US', icon: Monitor, active: true },
            { device: 'Safari on iPhone', location: 'Boston, US', icon: Phone, active: false },
          ].map((s) => {
            const SIcon = s.icon;
            return (
              <div key={s.device} className="flex items-center justify-between py-2.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                    <SIcon size={14} className="text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">{s.device}</p>
                    <p className="text-[10px] text-text-muted">{s.location}</p>
                  </div>
                </div>
                {s.active ? (
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">Current</span>
                ) : (
                  <button className="text-[10px] text-rose-500 hover:text-rose-600 transition-colors font-medium">Revoke</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ),
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Tab list */}
      <div className="w-full md:w-48 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:gap-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-auto md:w-full flex-shrink-0 flex items-center gap-2.5 px-4 py-2 md:py-2.5 rounded-xl text-sm transition-all duration-150 whitespace-nowrap border',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border-transparent',
              )}
            >
              <Icon size={15} />
              <span className="font-medium">{tab.label}</span>
              {isActive && <ChevronRight size={12} className="text-indigo-500 hidden md:block ml-auto" />}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 rounded-2xl bg-surface-1 border border-border shadow-card h-full transition-colors duration-200"
          >
            {panelContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
