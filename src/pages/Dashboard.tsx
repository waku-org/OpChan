import React from 'react';
import Index from './Index'; 
import ActivityFeed from '@/components/ActivityFeed'; 

const Dashboard: React.FC = () => {
  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 py-6"> 
        <ActivityFeed /> 
        <Index /> 
      </div>
    </div>  
  );
};

export default Dashboard; 