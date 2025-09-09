export type ToastFunction = (props: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
}) => void;
export declare const refreshData: (isNetworkConnected: boolean, toast: ToastFunction, updateStateFromCache: () => void, setError: (error: string | null) => void) => Promise<void>;
export declare const initializeNetwork: (toast: ToastFunction, setError: (error: string | null) => void) => Promise<void>;
export declare const monitorNetworkHealth: (setIsNetworkConnected: (isConnected: boolean) => void, toast: ToastFunction) => {
    unsubscribe: () => void;
};
//# sourceMappingURL=network.d.ts.map