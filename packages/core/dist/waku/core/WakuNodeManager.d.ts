import { LightNode, HealthStatus } from '@waku/sdk';
export type HealthChangeCallback = (isReady: boolean, health: HealthStatus) => void;
export declare class WakuNodeManager {
    private node;
    private _isReady;
    private _currentHealth;
    private healthListeners;
    static create(): Promise<WakuNodeManager>;
    private initialize;
    private setupHealthMonitoring;
    private notifyHealthChange;
    getNode(): LightNode;
    stop(): Promise<void>;
    get isInitialized(): boolean;
    get isReady(): boolean;
    get currentHealth(): HealthStatus;
    onHealthChange(callback: HealthChangeCallback): () => void;
}
//# sourceMappingURL=WakuNodeManager.d.ts.map