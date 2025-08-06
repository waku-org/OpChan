import React from 'react';
import Header from '@/components/Header';
import FeedPage from './FeedPage';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark">
      <Header />
      <main className="flex-1 pt-16">
        <FeedPage />
      </main>
    </div>
  );
};

export default Dashboard; 