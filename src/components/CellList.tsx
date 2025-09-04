import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForumData, useForumActions, usePermissions } from '@/hooks';
import {
  Layout,
  MessageSquare,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { CreateCellDialog } from './CreateCellDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CypherImage } from './ui/CypherImage';
import { RelevanceIndicator } from './ui/relevance-indicator';
import { sortCells, SortOption } from '@/lib/utils/sorting';
import { usePending } from '@/hooks/usePending';

const CellList = () => {
  const { cellsWithStats, isInitialLoading } = useForumData();
  const { refreshData } = useForumActions();
  const { canCreateCell } = usePermissions();
  const [sortOption, setSortOption] = useState<SortOption>('relevance');

  // Apply sorting to cells
  const sortedCells = useMemo(() => {
    return sortCells(cellsWithStats, sortOption);
  }, [cellsWithStats, sortOption]);

  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">
          Loading Cells...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-glow mb-2">
            Decentralized Cells
          </h1>
          <p className="text-cyber-neutral">
            Discover communities built on Bitcoin Ordinals
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={sortOption}
            onValueChange={(value: SortOption) => setSortOption(value)}
          >
            <SelectTrigger className="w-40 bg-cyber-muted/50 border-cyber-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">
                <TrendingUp className="w-4 h-4 mr-2 inline" />
                Relevance
              </SelectItem>
              <SelectItem value="activity">
                <MessageSquare className="w-4 h-4 mr-2 inline" />
                Activity
              </SelectItem>
              <SelectItem value="newest">
                <Clock className="w-4 h-4 mr-2 inline" />
                Newest
              </SelectItem>
              <SelectItem value="alphabetical">
                <Layout className="w-4 h-4 mr-2 inline" />
                A-Z
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={refreshData}
            disabled={isInitialLoading}
            title="Refresh data"
            className="px-3"
          >
            <RefreshCw
              className={`w-4 h-4 ${isInitialLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <CreateCellDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedCells.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <div className="text-cyber-neutral mb-4">
              No cells found. Be the first to create one!
            </div>
          </div>
        ) : (
          sortedCells.map(cell => (
            <Link
              key={cell.id}
              to={`/cell/${cell.id}`}
              className="group block p-4 border border-cyber-muted rounded-sm bg-cyber-muted/10 hover:bg-cyber-muted/20 hover:border-cyber-accent/50 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <CypherImage
                  src={cell.icon}
                  alt={cell.name}
                  className="w-12 h-12 object-cover rounded-sm border border-cyber-muted flex-shrink-0"
                  generateUniqueFallback={true}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-bold text-glow group-hover:text-cyber-accent transition-colors line-clamp-1">
                      {cell.name}
                    </h2>
                    {cell.relevanceScore !== undefined && (
                      <RelevanceIndicator
                        score={cell.relevanceScore}
                        details={cell.relevanceDetails}
                        type="cell"
                        className="ml-2 flex-shrink-0"
                        showTooltip={true}
                      />
                    )}
                  </div>
                  {usePending(cell.id).isPending && (
                    <div className="mb-2">
                      <span className="px-2 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs">
                        syncing…
                      </span>
                    </div>
                  )}

                  <p className="text-cyber-neutral text-sm mb-3 line-clamp-2">
                    {cell.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-cyber-neutral">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {cell.postCount || 0} posts
                      </span>
                      <span className="flex items-center gap-1">
                        <Layout className="w-3 h-3" />
                        {cell.activeMemberCount || 0} members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {canCreateCell && (
        <div className="text-center mt-8">
          <p className="text-cyber-neutral text-sm mb-4">
            Ready to start your own community?
          </p>
          <CreateCellDialog />
        </div>
      )}
    </div>
  );
};

export default CellList;
