// ─── Message & Chat ─────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  tokens?: number;
  documentContext?: string;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  pinned?: boolean;
  messages: Message[];
  agentId: string;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'coming_soon' | 'offline';

export interface AgentMetrics {
  uptime: string;
  totalQueries: number;
  avgResponseTime: string;
  tokensUsed: number;
  confidence: number;
  memory: number;
  requests: number;
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  provider: string;
  description: string;
  contextWindow: string;
  maxOutput: string;
  temperature: number;
  status: AgentStatus;
  metrics?: AgentMetrics;
  tags: string[];
  color: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface StatCard {
  id: string;
  title: string;
  value: string;
  trend: number;
  trendLabel: string;
  icon: string;
  color: 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'sky';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface ActivityRow {
  id: string;
  time: string;
  user: string;
  queryPreview: string;
  agent: string;
  tokens: number;
  status: 'completed' | 'processing' | 'failed';
  latency: string;
}

export interface DashboardData {
  stats: StatCard[];
  queryTrend: ChartDataPoint[];
  tokenUsage: ChartDataPoint[];
  userActivity: ChartDataPoint[];
  performance: ChartDataPoint[];
  activityTable: ActivityRow[];
}

// ─── Live Activity ───────────────────────────────────────────────────────────

export type ActivityStatus = 'completed' | 'processing' | 'generating';

export interface LiveActivity {
  id: string;
  timestamp: string;
  status: ActivityStatus;
  description: string;
  detail?: string;
}

// ─── User / Profile ──────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface SavedConversation {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  agent: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'chat' | 'setting' | 'agent' | 'system';
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notificationFrequency: string;
  fontSize: string;
  density: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
  joinedAt: string;
  queriesThisMonth: number;
  tokensUsed: number;
  totalConversations: number;
  achievements: Achievement[];
  savedConversations: SavedConversation[];
  timeline: TimelineEvent[];
  preferences: UserPreferences;
}

// ─── Monitor Panel ───────────────────────────────────────────────────────────

export interface MonitorMetrics {
  confidence: number;
  responseTime: number;
  tokensUsed: number;
  requests: number;
  memory: number;
  uptime: number;
}

// ─── Resume CSV ──────────────────────────────────────────────────────────────

export type ResumeCsvStage =
  | 'idle'
  | 'extracting'
  | 'processing'
  | 'validating'
  | 'complete'
  | 'error';

// ─── Bill Extractor ──────────────────────────────────────────────────────────

/** A single extracted bill record returned from Ollama */
export interface BillRecord {
  name: string;
  bill_number: string;
  date: string;
  purpose_of_bill: string;
  /** Optional: source filename for traceability */
  filename?: string;
  /** Optional: per-file error message if extraction failed */
  error?: string;
}

/** Payload sent to the backend for a single bill */
export interface BillPayload {
  filename: string;
  text: string;
}

/** Full request body sent to POST /extract-bills */
export interface BillExtractRequest {
  bills: BillPayload[];
}

export interface ResumeCsvState {
  stage: ResumeCsvStage;
  fileName: string | null;
  fileSize: string | null;
  extractedText: string | null;
  extractedFields: Record<string, string> | null;
  confidence: Record<string, 'high' | 'medium' | 'low'> | null;
  csvContent: string | null;
  csvPreview: { headers: string[]; values: string[] } | null;
  validationResult: {
    valid: boolean;
    errors: { field: string; label: string; type: string; message: string }[];
    warnings: { field: string; label: string; type: string; message: string }[];
  } | null;
  missingFieldsReport: {
    requiredMissing: { key: string; label: string; required: boolean }[];
    optionalMissing: { key: string; label: string; required: boolean }[];
    populated: { key: string; label: string; required: boolean }[];
    totalFields: number;
    populatedCount: number;
    missingCount: number;
  } | null;
  error: string | null;
}
