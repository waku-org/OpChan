import React, { createContext, useContext, useMemo, useState } from 'react';

export interface ModerationContextValue {
  showModerated: boolean;
  toggleShowModerated: () => void;
}

const ModerationContext = createContext<ModerationContextValue | null>(null);

export const ModerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showModerated, setShowModerated] = useState(false);

  const ctx = useMemo(() => ({
    showModerated,
    toggleShowModerated: () => setShowModerated(v => !v),
  }), [showModerated]);

  return <ModerationContext.Provider value={ctx}>{children}</ModerationContext.Provider>;
};

export function useModeration() {
  const ctx = useContext(ModerationContext);
  if (!ctx) throw new Error('useModeration must be used within OpChanProvider');
  return ctx;
}

export { ModerationContext };


