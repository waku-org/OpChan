import { createLightNode, LightNode, WakuEvent, HealthStatus } from '@waku/sdk';
import { environment } from '../../utils/environment';

export type HealthChangeCallback = (
  isReady: boolean,
  health: HealthStatus
) => void;

export class WakuNodeManager {
  private node: LightNode | null = null;
  private _isReady: boolean = false;
  private _currentHealth: HealthStatus = HealthStatus.Unhealthy;
  private healthListeners: Set<HealthChangeCallback> = new Set();

  public static async create(): Promise<WakuNodeManager> {
    const manager = new WakuNodeManager();
    await manager.initialize();
    return manager;
  }

  private async initialize(): Promise<void> {
    this.node = await createLightNode({
      defaultBootstrap: true,
      autoStart: true,
    });
    this.setupHealthMonitoring();
  }

  private setupHealthMonitoring(): void {
    if (!this.node) return;

    this.node.events.addEventListener(WakuEvent.Health, event => {
      const health = event.detail;
      this._currentHealth = health;



      const wasReady = this._isReady;
      this._isReady =
        health === HealthStatus.SufficientlyHealthy ||
        health === HealthStatus.MinimallyHealthy;

      if (wasReady !== this._isReady) {
        this.notifyHealthChange();
      }
    });
  }

  private notifyHealthChange(): void {
    this.healthListeners.forEach(listener =>
      listener(this._isReady, this._currentHealth)
    );
  }

  public getNode(): LightNode {
    if (!this.node) {
      throw new Error('Node not initialized');
    }
    return this.node;
  }

  public async stop(): Promise<void> {
    this.healthListeners.clear();
    if (this.node) {
      await this.node.stop();
      this.node = null;
    }
  }

  public get isInitialized(): boolean {
    return this.node !== null;
  }

  public get isReady(): boolean {
    return this._isReady;
  }

  public get currentHealth(): HealthStatus {
    return this._currentHealth;
  }

  public onHealthChange(callback: HealthChangeCallback): () => void {
    this.healthListeners.add(callback);

    // Immediately call with current status
    callback(this._isReady, this._currentHealth);

    // Return unsubscribe function
    return () => {
      this.healthListeners.delete(callback);
    };
  }
}
