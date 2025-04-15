
import React from 'react';
import { Link } from 'react-router-dom';
import { useForum } from '@/contexts/ForumContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Layout, MessageSquare } from 'lucide-react';
import { CreateCellDialog } from './CreateCellDialog';

const CellList = () => {
  const { cells, loading, posts } = useForum();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-glow">Loading Cells...</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-cyber-muted rounded-sm p-4">
              <div className="flex gap-4 items-start">
                <Skeleton className="w-16 h-16 rounded-sm bg-cyber-muted" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-24 mb-2 bg-cyber-muted" />
                  <Skeleton className="h-4 w-full mb-1 bg-cyber-muted" />
                  <Skeleton className="h-4 w-1/2 bg-cyber-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getPostCount = (cellId: string) => {
    return posts.filter(post => post.cellId === cellId).length;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Layout className="text-cyber-accent w-6 h-6" />
          <h1 className="text-2xl font-bold text-glow">Cells</h1>
        </div>
        <CreateCellDialog />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cells.map((cell) => (
          <Link to={`/cell/${cell.id}`} key={cell.id} className="board-card group">
            <div className="flex gap-4 items-start">
              <img 
                src={cell.icon} 
                alt={cell.name} 
                className="w-16 h-16 object-cover rounded-sm border border-cyber-muted group-hover:border-cyber-accent transition-colors"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1 group-hover:text-cyber-accent transition-colors">{cell.name}</h2>
                <p className="text-sm text-cyber-neutral mb-2">{cell.description}</p>
                <div className="flex items-center text-xs text-cyber-neutral">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  <span>{getPostCount(cell.id)} threads</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CellList;
