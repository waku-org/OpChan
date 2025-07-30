import React from 'react';
import { Link } from 'react-router-dom';
import { useForum } from '@/contexts/useForum';
import { Layout, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { CreateCellDialog } from './CreateCellDialog';
import { Button } from '@/components/ui/button';
import { CypherImage } from './ui/CypherImage';

const CellList = () => {
  const { cells, isInitialLoading, posts, refreshData, isRefreshing } = useForum();

  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Loading Cells...</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Connecting to the network and fetching data...</p>
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshData} 
            disabled={isRefreshing}
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <CreateCellDialog />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cells.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <div className="text-cyber-neutral mb-4">
              No cells found. Be the first to create one!
            </div>
          </div>
        ) : (
          cells.map((cell) => (
            <Link to={`/cell/${cell.id}`} key={cell.id} className="board-card group">
              <div className="flex gap-4 items-start">
                <CypherImage 
                  src={cell.icon} 
                  alt={cell.name} 
                  className="w-16 h-16 object-cover rounded-sm border border-cyber-muted group-hover:border-cyber-accent transition-colors"
                  generateUniqueFallback={true}
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
          ))
        )}
      </div>
    </div>
  );
};

export default CellList;
