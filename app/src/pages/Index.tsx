import Header from '@/components/Header';
import CellList from '@/components/CellList';
import { useForumActions } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Wifi } from 'lucide-react';
import { useForum } from '@opchan/react';

const Index = () => {
  const {network} = useForum()
  const { refreshData } = useForumActions();

  return (
    <div className="page-container">
      <Header />
      <main className="page-content relative">
        <CellList />
        {!network.isConnected && (
          <div className="fixed bottom-4 right-4">
            <Button
              onClick={refreshData}
              variant="destructive"
              className="flex items-center gap-2 shadow-lg animate-pulse"
            >
              <Wifi className="w-4 h-4" />
              Reconnect
            </Button>
          </div>
        )}
      </main>
      <footer className="page-footer">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default Index;
