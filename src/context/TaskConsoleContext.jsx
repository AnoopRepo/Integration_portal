import React, { createContext, useContext, useState } from 'react';

const TaskConsoleContext = createContext(null);

export const TaskConsoleProvider = ({ children }) => {
  const [activeTask, setActiveTask] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openTask = (name, department) => {
    setActiveTask({ name, department });
    setIsOpen(true);
  };

  const closeTask = () => {
    setIsOpen(false);
    // Keep activeTask slightly during slide-out animation to prevent sudden content flash
    setTimeout(() => {
      setActiveTask(null);
    }, 300);
  };

  return (
    <TaskConsoleContext.Provider value={{ activeTask, isOpen, openTask, closeTask }}>
      {children}
    </TaskConsoleContext.Provider>
  );
};

export const useTaskConsole = () => {
  const context = useContext(TaskConsoleContext);
  if (!context) {
    throw new Error('useTaskConsole must be used within a TaskConsoleProvider');
  }
  return context;
};
