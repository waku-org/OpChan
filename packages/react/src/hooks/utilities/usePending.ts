import { useEffect, useState } from 'react';
import { localDatabase } from '@opchan/core';
import { useAuth } from '../../contexts/AuthContext';

export function usePending(id: string | undefined) {
  const [isPending, setIsPending] = useState<boolean>(
    id ? localDatabase.isPending(id) : false
  );

  useEffect(() => {
    if (!id) return;
    setIsPending(localDatabase.isPending(id));
    const unsubscribe = localDatabase.onPendingChange(() => {
      setIsPending(localDatabase.isPending(id));
    });
    return unsubscribe;
  }, [id]);

  return { isPending };
}

export function usePendingVote(targetId: string | undefined) {
  const { currentUser } = useAuth();
  const [isPending, setIsPending] = useState<boolean>(false);

  useEffect(() => {
    const compute = () => {
      if (!targetId || !currentUser?.address) return setIsPending(false);
      // Find a vote authored by current user for this target that is pending
      const pending = Object.values(localDatabase.cache.votes).some(v => {
        return (
          v.targetId === targetId &&
          v.author === currentUser.address &&
          localDatabase.isPending(v.id)
        );
      });
      setIsPending(pending);
    };

    compute();
    const unsub = localDatabase.onPendingChange(compute);
    return unsub;
  }, [targetId, currentUser?.address]);

  return { isPending };
}
