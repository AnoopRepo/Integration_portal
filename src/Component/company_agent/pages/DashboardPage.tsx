import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, RefreshCw } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { AnalyticsChart } from '../components/dashboard/AnalyticsChart';
import { ActivityTable } from '../components/dashboard/ActivityTable';
import { mockDashboardData } from '../data/mockDashboard';

export const DashboardPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 space-y-6 min-h-full"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
            style={{ letterSpacing: '-0.02em' }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time analytics and system performance
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all text-sm">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {mockDashboardData.stats.map((card, i) => (
          <StatsCard key={card.id} card={card} index={i} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsChart
          title="Query Trends"
          subtitle="30-day overview"
          data={mockDashboardData.queryTrend}
          type="area"
          color="violet"
          index={0}
        />
        <AnalyticsChart
          title="Token Usage"
          subtitle="Past 7 days"
          data={mockDashboardData.tokenUsage}
          type="bar"
          color="cyan"
          index={1}
        />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsChart
          title="User Activity"
          subtitle="24-hour distribution"
          data={mockDashboardData.userActivity}
          type="line"
          color="emerald"
          index={2}
        />
        <AnalyticsChart
          title="Response Performance"
          subtitle="Latency trend (seconds)"
          data={mockDashboardData.performance}
          type="area"
          color="cyan"
          index={3}
        />
      </div>

      {/* Activity Table */}
      <ActivityTable rows={mockDashboardData.activityTable} />
    </motion.div>
  );
};
