import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '../../types';

interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  type: 'area' | 'bar' | 'line';
  color?: 'violet' | 'cyan' | 'emerald';
  index: number;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl border border-border text-xs shadow-xl bg-surface-1 text-text-primary"
    >
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color ?? '#6366f1' }}>
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

const colorConfig = {
  violet: {
    stroke: '#6366f1',
    fill: 'url(#gradientViolet)',
    gradientStart: 'rgba(99,102,241,0.3)',
    gradientEnd: 'rgba(99,102,241,0)',
    id: 'gradientViolet',
  },
  cyan: {
    stroke: '#0ea5e9',
    fill: 'url(#gradientCyan)',
    gradientStart: 'rgba(14,165,233,0.3)',
    gradientEnd: 'rgba(14,165,233,0)',
    id: 'gradientCyan',
  },
  emerald: {
    stroke: '#10b981',
    fill: 'url(#gradientEmerald)',
    gradientStart: 'rgba(16,185,129,0.3)',
    gradientEnd: 'rgba(16,185,129,0)',
    id: 'gradientEmerald',
  },
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  subtitle,
  data,
  type,
  color = 'violet',
  index,
}) => {
  const cfg = colorConfig[color];

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="p-5 rounded-2xl bg-surface-1 border border-border shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={cfg.id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.gradientStart} />
                <stop offset="100%" stopColor={cfg.gradientEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 5)}
            />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={cfg.stroke}
              strokeWidth={2}
              fill={cfg.fill}
              dot={false}
              activeDot={{ r: 4, fill: cfg.stroke, stroke: 'var(--bg-surface-1)', strokeWidth: 2 }}
            />
          </AreaChart>
        ) : type === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={cfg.stroke} radius={[4, 4, 0, 0]} opacity={0.85} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 5)}
            />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={cfg.stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: cfg.stroke }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
};
