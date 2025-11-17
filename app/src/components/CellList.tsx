import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useContent, usePermissions, useNetwork } from '@/hooks';
import {
  MessageSquare,
} from 'lucide-react';
import { CreateCellDialog } from './CreateCellDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModerationToggle } from './ui/moderation-toggle';
import { sortCells, SortOption } from '@/utils/sorting';
import type { Cell } from '@opchan/core';
import { useForum } from '@/hooks';



const CellList = () => {
  const { cellsWithStats } = useContent();
  const content = useContent();
  const { canCreateCell } = usePermissions();
  const { isHydrated } = useNetwork();
  const [sortOption, setSortOption] = useState<SortOption>('relevance');

  // Apply sorting to cells
  const sortedCells = useMemo(() => {
    return sortCells(cellsWithStats, sortOption);
  }, [cellsWithStats, sortOption]);

  // Simple loading
  if (!isHydrated && !cellsWithStats.length) {
    return (
      <div className="w-full mx-auto px-2 py-4 max-w-4xl">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-2 py-2 max-w-4xl">
      <div className="mb-2 pb-1 border-b border-border/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-primary font-semibold">CELLS</span>
          <ModerationToggle />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sortOption}
            onValueChange={(value: SortOption) => setSortOption(value)}
          >
            <SelectTrigger className="w-24 text-[10px] h-6">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="activity">Activity</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={content.refresh}
            className="text-muted-foreground hover:text-foreground text-[10px]"
          >
            refresh
          </button>
          {canCreateCell && <CreateCellDialog />}
        </div>
      </div>

      <div>
        {sortedCells.length === 0 ? (
          <div className="py-4 text-xs text-muted-foreground text-center">
            No cells yet. {canCreateCell ? 'Create one!' : 'Connect wallet to create.'}
          </div>
        ) : (
          sortedCells.map(cell => {
            const { content } = useForum();
            const isPending = content.pending.isPending(cell.id);
            
            return (
              <Link
                key={cell.id}
                to={`/cell/${cell.id}`}
                className="border-b border-border/30 py-1.5 px-2 text-xs flex items-baseline gap-2 hover:bg-border/5"
              >
                <span className="text-primary font-medium">{cell.name}</span>
                <span className="text-muted-foreground text-[10px] flex-1 truncate">
                  {cell.description}
                </span>
                <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                  {cell.postCount || 0}p
                </span>
                {isPending && (
                  <span className="text-yellow-400 text-[10px]">syncing</span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CellList;
