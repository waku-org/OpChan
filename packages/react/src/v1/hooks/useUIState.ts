import React from 'react';
import { useClient } from '../context/ClientContext';

export function useUIState<T>(key: string, defaultValue: T): [T, (value: T) => void, { loading: boolean; error?: string }] {
  const client = useClient();
  const [state, setState] = React.useState<T>(defaultValue);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const value = await client.database.loadUIState(key);
        if (mounted) {
          if (value !== undefined) setState(value as T);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, key]);

  const set = React.useCallback((value: T) => {
    setState(value);
    client.database.storeUIState(key, value).catch(() => {});
  }, [client, key]);

  return [state, set, { loading, error }];
}


