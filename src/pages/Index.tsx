import React from 'react';
import Header from '@/components/Header';
import CellList from '@/components/CellList';
import { useForum } from '@/contexts/ForumContext';
import { Button } from '@/components/ui/button';
import { Wifi } from 'lucide-react';

const Index = () => {
  const { isNetworkConnected, refreshData } = useForum();

  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
      <Header />
      <main className="flex-1 relative">
        <CellList />
        {!isNetworkConnected && (
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
      <footer className="border-t border-cyber-muted py-4 text-center text-xs text-cyber-neutral">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default Index;
