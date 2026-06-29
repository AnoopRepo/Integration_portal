import type { DashboardData } from '../types';

const generate30DayData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const base = 1200 + Math.floor(Math.random() * 800);
    data.push({ label, value: base, secondary: Math.floor(base * 0.85) });
  }
  return data;
};

const generate7DayData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label) => ({
    label,
    value: Math.floor(80000 + Math.random() * 60000),
  }));
};

const generate24HrData = () => {
  const data = [];
  for (let h = 0; h < 24; h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    const peak = h >= 9 && h <= 18 ? 1 : 0.3;
    data.push({ label, value: Math.floor(peak * (200 + Math.random() * 300)) });
  }
  return data;
};

const generatePerfData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data.push({ label, value: parseFloat((0.8 + Math.random() * 0.8).toFixed(2)) });
  }
  return data;
};

export const mockDashboardData: DashboardData = {
  stats: [
    {
      id: 'total-queries',
      title: 'Total Queries',
      value: '48,291',
      trend: 12.4,
      trendLabel: 'vs last month',
      icon: 'MessageSquare',
      color: 'violet',
    },
    {
      id: 'total-responses',
      title: 'Total Responses',
      value: '47,844',
      trend: 11.8,
      trendLabel: 'vs last month',
      icon: 'Bot',
      color: 'cyan',
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: '1,247',
      trend: 5.2,
      trendLabel: 'vs last month',
      icon: 'Users',
      color: 'emerald',
    },
    {
      id: 'daily-usage',
      title: 'Daily Usage',
      value: '3,421',
      trend: 8.1,
      trendLabel: 'vs yesterday',
      icon: 'Activity',
      color: 'amber',
    },
    {
      id: 'monthly-usage',
      title: 'Monthly Usage',
      value: '94,302',
      trend: 23.5,
      trendLabel: 'vs last month',
      icon: 'TrendingUp',
      color: 'sky',
    },
    {
      id: 'avg-response',
      title: 'Avg Response Time',
      value: '1.24s',
      trend: -0.3,
      trendLabel: 'vs last week',
      icon: 'Zap',
      color: 'rose',
    },
  ],
  queryTrend: generate30DayData(),
  tokenUsage: generate7DayData(),
  userActivity: generate24HrData(),
  performance: generatePerfData(),
  activityTable: [
    {
      id: 'act-1',
      time: '14:52:01',
      user: 'alice@acme.com',
      queryPreview: 'Explain quantum computing concepts...',
      agent: 'Company Agent',
      tokens: 1247,
      status: 'completed',
      latency: '1.12s',
    },
    {
      id: 'act-2',
      time: '14:51:34',
      user: 'bob@startup.io',
      queryPreview: 'Write unit tests for the auth module',
      agent: 'Company Agent',
      tokens: 2841,
      status: 'completed',
      latency: '2.34s',
    },
    {
      id: 'act-3',
      time: '14:50:22',
      user: 'carol@enterprise.com',
      queryPreview: 'Summarize Q3 financial report...',
      agent: 'Company Agent',
      tokens: 3912,
      status: 'processing',
      latency: '—',
    },
    {
      id: 'act-4',
      time: '14:49:18',
      user: 'dave@labs.ai',
      queryPreview: 'Generate a Python data pipeline',
      agent: 'Company Agent',
      tokens: 1876,
      status: 'completed',
      latency: '1.89s',
    },
    {
      id: 'act-5',
      time: '14:48:55',
      user: 'eve@tech.co',
      queryPreview: 'Translate contract to Spanish',
      agent: 'Company Agent',
      tokens: 4201,
      status: 'completed',
      latency: '0.97s',
    },
    {
      id: 'act-6',
      time: '14:47:40',
      user: 'frank@corp.net',
      queryPreview: 'Debug this TypeScript error...',
      agent: 'Company Agent',
      tokens: 892,
      status: 'failed',
      latency: '3.21s',
    },
    {
      id: 'act-7',
      time: '14:46:29',
      user: 'grace@media.com',
      queryPreview: 'Write marketing copy for product launch',
      agent: 'Company Agent',
      tokens: 2103,
      status: 'completed',
      latency: '1.56s',
    },
    {
      id: 'act-8',
      time: '14:45:12',
      user: 'henry@dev.io',
      queryPreview: 'Create a SQL migration script',
      agent: 'Company Agent',
      tokens: 1567,
      status: 'completed',
      latency: '1.23s',
    },
    {
      id: 'act-9',
      time: '14:44:08',
      user: 'iris@analytics.co',
      queryPreview: 'Analyze this dataset for trends',
      agent: 'Company Agent',
      tokens: 3344,
      status: 'completed',
      latency: '2.01s',
    },
    {
      id: 'act-10',
      time: '14:43:55',
      user: 'jack@saas.app',
      queryPreview: 'Draft a technical specification doc',
      agent: 'Company Agent',
      tokens: 4892,
      status: 'completed',
      latency: '1.78s',
    },
  ],
};
