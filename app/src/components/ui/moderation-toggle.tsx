import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { usePermissions, useContent, useUIState } from '@/hooks';

export function ModerationToggle() {
  const { canModerate } = usePermissions();
  const { cellsWithStats } = useContent();

  const [showModerated, setShowModerated] = useUIState<boolean>('showModerated', false);
  const toggleShowModerated = React.useCallback((value: boolean) => setShowModerated(value), [setShowModerated]);

  // Check if user is admin of any cell
  const isAdminOfAnyCell = cellsWithStats.some(cell => canModerate(cell.id));

  // Only show the toggle if user is admin of at least one cell
  if (!isAdminOfAnyCell) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="show-moderated"
        checked={showModerated}
        onCheckedChange={toggleShowModerated}
        className="data-[state=checked]:bg-cyber-accent"
      />
      <Label
        htmlFor="show-moderated"
        className="flex items-center gap-2 text-sm cursor-pointer"
      >
        {showModerated ? (
          <Eye className="w-4 h-4 text-cyber-accent" />
        ) : (
          <EyeOff className="w-4 h-4 text-cyber-neutral" />
        )}
        <span
          className={showModerated ? 'text-cyber-accent' : 'text-cyber-neutral'}
        >
          Show Moderated
        </span>
      </Label>
    </div>
  );
}
