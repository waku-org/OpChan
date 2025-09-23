// New v1 exports are namespaced to avoid breaking the app while we migrate.
// Old API remains available under ./old/index exports.

export * from './old/index';

export {
  OpChanProvider as OpChanProviderV1,
  useClient as useClientV1,
} from './v1/context/ClientContext';

export { OpChanProvider as NewOpChanProvider } from './v1/provider/OpChanProvider';

export { useAuth as useAuthV1 } from './v1/hooks/useAuth';
export { useContent as useContentV1 } from './v1/hooks/useContent';
export { usePermissions as usePermissionsV1 } from './v1/hooks/usePermissions';
export { useNetwork as useNetworkV1 } from './v1/hooks/useNetwork';
export { useUserDisplay as useUserDisplayV1 } from './v1/hooks/useUserDisplay';
export { useForum as useForumV1 } from './v1/hooks/useForum';


