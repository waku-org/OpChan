import React from 'react';
import Header from '@/components/Header';
import PostList from '@/components/PostList';

const CellPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
      <Header />
      <main className="flex-1 pt-16">
        <PostList />
      </main>
      <footer className="border-t border-cyber-muted py-4 text-center text-xs text-cyber-neutral">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default CellPage;
