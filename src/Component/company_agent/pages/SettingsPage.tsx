import React from 'react';
import { motion } from 'framer-motion';
import { SettingsPanel } from '../components/settings/SettingsPanel';

export const SettingsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 min-h-full"
    >
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
          style={{ letterSpacing: '-0.02em' }}
        >
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">Configure your workspace and AI preferences</p>
      </div>
      <SettingsPanel />
    </motion.div>
  );
};
