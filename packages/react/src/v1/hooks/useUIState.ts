import React from 'react';
import { useClient } from '../context/ClientContext';
import { useOpchanStore, opchanStore } from '../store/opchanStore';

export function useUIState<T>(key: string, defaultValue: T, category: 'wizardStates' | 'preferences' | 'temporaryStates' = 'preferences'): [T, (value: T) => void, { loading: boolean; error?: string }] {
  const client = useClient();
  
  // Get value from central store
  const storeValue = useOpchanStore(s => s.uiState[category][key] as T | undefined);
  
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [hasHydrated, setHasHydrated] = React.useState<boolean>(false);

  // Hydrate from LocalDatabase on first load (if not already in store)
  React.useEffect(() => {
    if (hasHydrated) return;
    
    let mounted = true;
    (async () => {
      try {
        // Check if already in store
        if (storeValue !== undefined) {
          if (mounted) {
            setLoading(false);
            setHasHydrated(true);
          }
          return;
        }

        // Load from LocalDatabase and populate store
        const dbKey = category === 'wizardStates' ? `wizard_${key}` : 
                     category === 'preferences' ? `pref_${key}` : key;
        const value = await client.database.loadUIState(dbKey);
        
        if (mounted) {
          if (value !== undefined) {
            opchanStore.setUIState(key, value as T, category);
          }
          setLoading(false);
          setHasHydrated(true);
        }
      } catch (e) {
        if (mounted) {
          setError((e as Error).message);
          setLoading(false);
          setHasHydrated(true);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [client, key, category, storeValue, hasHydrated]);

  const set = React.useCallback((value: T) => {
    // Update store (will auto-persist via StoreWiring)
    opchanStore.setUIState(key, value, category);
  }, [key, category]);

  // Use store value if available, otherwise default
  const currentValue = storeValue !== undefined ? storeValue : defaultValue;

  return [currentValue, set, { loading, error }];
}


