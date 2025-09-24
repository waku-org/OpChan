import { useOpchanStore } from '../store/opchanStore';
import { useClient } from '../context/ClientContext';

export function useNetwork() {
  const client = useClient();
  const network = useOpchanStore(s => s.network);

  const refresh = async () => {
    try {
      // trigger a database refresh using core helper
      const { refreshData } = await import('@opchan/core');
      await refreshData(client.messageManager.isReady, () => {}, () => {}, () => {});
    } catch (e) {
      console.error('Network refresh failed', e);
    }
  };

  return {
    isConnected: network.isConnected,
    statusMessage: network.statusMessage,
    issues: network.issues,
    canRefresh: true,
    refresh,
  } as const;
}




