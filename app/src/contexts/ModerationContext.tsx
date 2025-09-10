import React, { createContext, useContext, useState, useEffect } from 'react';
import { localDatabase } from 'opchan-core/database/LocalDatabase';

interface ModerationContextType {
  showModerated: boolean;
  setShowModerated: (show: boolean) => void;
  toggleShowModerated: () => void;
}

const ModerationContext = createContext<ModerationContextType | undefined>(
  undefined
);

export function ModerationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showModerated, setShowModerated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load initial state from IndexedDB
  useEffect(() => {
    const loadModerationPreference = async () => {
      try {
        const saved = await localDatabase.loadUIState('show-moderated');
        setShowModerated(saved === true);
      } catch (error) {
        console.warn(
          'Failed to load moderation preference from IndexedDB:',
          error
        );
        setShowModerated(false);
      } finally {
        setIsInitialized(true);
      }
    };

    loadModerationPreference();
  }, []);

  // Save to IndexedDB whenever the value changes (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const saveModerationPreference = async () => {
      try {
        await localDatabase.storeUIState('show-moderated', showModerated);
      } catch (error) {
        console.warn(
          'Failed to save moderation preference to IndexedDB:',
          error
        );
      }
    };

    saveModerationPreference();
  }, [showModerated, isInitialized]);

  const toggleShowModerated = () => {
    setShowModerated(prev => !prev);
  };

  return (
    <ModerationContext.Provider
      value={{
        showModerated,
        setShowModerated,
        toggleShowModerated,
      }}
    >
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  const context = useContext(ModerationContext);
  if (context === undefined) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }
  return context;
}
