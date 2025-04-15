
import React from 'react';
import Header from '@/components/Header';
import CellList from '@/components/CellList';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
      <Header />
      <main className="flex-1">
        <CellList />
      </main>
      <footer className="border-t border-cyber-muted py-4 text-center text-xs text-cyber-neutral">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default Index;
