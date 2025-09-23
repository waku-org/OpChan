import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OpChanClient } from '@opchan/core';
import { localDatabase } from '@opchan/core';
import { ClientProvider } from '../contexts/ClientContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ForumProvider } from '../contexts/ForumContext';
import { ModerationProvider } from '../contexts/ModerationContext';
import { IdentityProvider } from '../contexts/IdentityContext';

export interface OpChanProviderProps {
  ordiscanApiKey: string;
  debug?: boolean;
  children: React.ReactNode;
}

export const OpChanProvider: React.FC<OpChanProviderProps> = ({
  ordiscanApiKey,
  debug,
  children,
}) => {
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<OpChanClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === 'undefined') return; // SSR guard

      // Configure environment and create client
      const client = new OpChanClient({
        ordiscanApiKey,
      });
      clientRef.current = client;

      // Open local DB early for warm cache
      await localDatabase.open().catch(console.error);

      try {
        await client.messageManager.initialize();
      } catch (e) {
        console.error('Failed to initialize message manager:', e);
      }


      if (!cancelled) setIsReady(true);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [ordiscanApiKey, debug]);

  const providers = useMemo(() => {
    if (!isReady || !clientRef.current) return null;
    return (
      <ClientProvider client={clientRef.current}>
        <IdentityProvider client={clientRef.current}>
          <AuthProvider>
            <ModerationProvider>
              <ForumProvider>{children}</ForumProvider>
            </ModerationProvider>
          </AuthProvider>
        </IdentityProvider>
      </ClientProvider>
    );
  }, [isReady, children]);

  return providers || null;
};


