import { useAuth } from './useAuth';
import { useContent } from './useContent';
import { usePermissions } from './usePermissions';
import { useNetwork } from './useNetwork';

export function useForum() {
  const user = useAuth();
  const content = useContent();
  const permissions = usePermissions();
  const network = useNetwork();
  return { user, content, permissions, network } as const;
}




