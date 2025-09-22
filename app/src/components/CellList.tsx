import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForumData, usePermissions } from '@/hooks';
import {
  Layout,
  MessageSquare,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
  Grid3X3,
  Shield,
  Hash,
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
import { ModerationToggle } from './ui/moderation-toggle';
import { sortCells, SortOption } from '@/utils/sorting';
import type { Cell } from '@opchan/core';
import { useForum } from '@opchan/react';
import { ShareButton } from './ui/ShareButton';

// Empty State Component
const EmptyState: React.FC<{ canCreateCell: boolean }> = ({
  canCreateCell,
}) => {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-16 px-4">
      {/* Visual Element */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-cyber-muted/20 border border-cyber-muted/30 rounded-lg flex items-center justify-center">
          <Grid3X3 className="w-16 h-16 text-cyber-accent/50" />
        </div>
        {/* Floating elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyber-accent/20 border border-cyber-accent/30 rounded-full flex items-center justify-center">
          <Hash className="w-3 h-3 text-cyber-accent" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
          <Shield className="w-3 h-3 text-green-400" />
        </div>
      </div>

      {/* Content */}
      <div className="text-center max-w-2xl">
        <h2 className="text-2xl font-mono font-bold text-white mb-4">
          No Cells Found
        </h2>

        {canCreateCell ? (
          <div className="space-y-4">
            <p className="text-cyber-neutral">
              Ready to start your own decentralized community?
            </p>
            <CreateCellDialog />
          </div>
        ) : (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-md">
            <p className="text-orange-400 text-sm">
              Connect your wallet and verify ownership to create cells
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Separate component to properly use hooks
const CellItem: React.FC<{ cell: Cell }> = ({ cell }) => {
  const { content } = useForum();
  const isPending = content.pending.isPending(cell.id);

  return (
    <Link to={`/cell/${cell.id}`} className="group block board-card">
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
          {isPending && (
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
            <ShareButton
              size="sm"
              url={`${window.location.origin}/cell/${cell.id}`}
              title={cell.name}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

const CellList = () => {
  const { cellsWithStats, isInitialLoading } = useForumData();
  const { content } = useForum();
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

  const hasCells = sortedCells.length > 0;

  return (
    <div className="page-main">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="page-title">Decentralized Cells</h1>
            <p className="page-subtitle">
              Discover communities built on Bitcoin Ordinals
            </p>
          </div>

          {/* Only show controls when cells exist */}
          {hasCells && (
            <div className="flex items-center gap-4">
              <ModerationToggle />

              <Select
                value={sortOption}
                onValueChange={(value: SortOption) => setSortOption(value)}
              >
                <SelectTrigger className="w-40 bg-cyber-muted/50 border-cyber-muted text-cyber-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cyber-dark border-cyber-muted/30">
                  <SelectItem
                    value="relevance"
                    className="text-cyber-light hover:bg-cyber-muted/30"
                  >
                    <TrendingUp className="w-4 h-4 mr-2 inline" />
                    Relevance
                  </SelectItem>
                  <SelectItem
                    value="activity"
                    className="text-cyber-light hover:bg-cyber-muted/30"
                  >
                    <MessageSquare className="w-4 h-4 mr-2 inline" />
                    Activity
                  </SelectItem>
                  <SelectItem
                    value="newest"
                    className="text-cyber-light hover:bg-cyber-muted/30"
                  >
                    <Clock className="w-4 h-4 mr-2 inline" />
                    Newest
                  </SelectItem>
                  <SelectItem
                    value="alphabetical"
                    className="text-cyber-light hover:bg-cyber-muted/30"
                  >
                    <Layout className="w-4 h-4 mr-2 inline" />
                    A-Z
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={content.refresh}
                disabled={isInitialLoading}
                title="Refresh data"
                className="px-3 border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isInitialLoading ? 'animate-spin' : ''}`}
                />
              </Button>

              {canCreateCell && <CreateCellDialog />}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!hasCells ? (
          <EmptyState canCreateCell={canCreateCell} />
        ) : (
          sortedCells.map(cell => <CellItem key={cell.id} cell={cell} />)
        )}
      </div>
    </div>
  );
};

export default CellList;
