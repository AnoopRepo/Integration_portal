import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { ActivityRow } from '../../types';

interface ActivityTableProps {
  rows: ActivityRow[];
}

const StatusBadge: React.FC<{ status: ActivityRow['status'] }> = ({ status }) => {
  const config = {
    completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    processing: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    failed: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
        config[status],
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'completed'
            ? 'bg-emerald-500'
            : status === 'processing'
            ? 'bg-blue-500'
            : 'bg-rose-500',
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const ActivityTable: React.FC<ActivityTableProps> = ({ rows }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl bg-surface-1 border border-border shadow-card overflow-hidden transition-colors"
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">
          Last 24 hours
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Time', 'User', 'Query', 'Agent', 'Tokens', 'Status', 'Latency'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border hover:bg-surface-2 transition-colors',
                  i % 2 === 0 ? '' : 'bg-surface-2/30',
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-[11px] font-mono text-text-muted">{row.time}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-text-secondary max-w-[120px] truncate block">
                    {row.user}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-text-primary max-w-[180px] truncate block">
                    {row.queryPreview}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-500 font-medium">
                    {row.agent}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-text-muted">
                    {row.tokens.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-text-muted">{row.latency}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
