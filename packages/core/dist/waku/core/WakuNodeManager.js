import { createLightNode, WakuEvent, HealthStatus } from '@waku/sdk';
export class WakuNodeManager {
    constructor() {
        this.node = null;
        this._isReady = false;
        this._currentHealth = HealthStatus.Unhealthy;
        this.healthListeners = new Set();
    }
    static async create() {
        const manager = new WakuNodeManager();
        await manager.initialize();
        return manager;
    }
    async initialize() {
        this.node = await createLightNode({
            defaultBootstrap: true,
            autoStart: true,
        });
        this.setupHealthMonitoring();
    }
    setupHealthMonitoring() {
        if (!this.node)
            return;
        this.node.events.addEventListener(WakuEvent.Health, (event) => {
            const health = event.detail;
            this._currentHealth = health;
            if (process.env.NODE_ENV === 'development') {
                console.debug(`Waku health status: ${health}`);
            }
            const wasReady = this._isReady;
            this._isReady =
                health === HealthStatus.SufficientlyHealthy ||
                    health === HealthStatus.MinimallyHealthy;
            if (wasReady !== this._isReady) {
                this.notifyHealthChange();
            }
        });
    }
    notifyHealthChange() {
        this.healthListeners.forEach((listener) => listener(this._isReady, this._currentHealth));
    }
    getNode() {
        if (!this.node) {
            throw new Error('Node not initialized');
        }
        return this.node;
    }
    async stop() {
        this.healthListeners.clear();
        if (this.node) {
            await this.node.stop();
            this.node = null;
        }
    }
    get isInitialized() {
        return this.node !== null;
    }
    get isReady() {
        return this._isReady;
    }
    get currentHealth() {
        return this._currentHealth;
    }
    onHealthChange(callback) {
        this.healthListeners.add(callback);
        // Immediately call with current status
        callback(this._isReady, this._currentHealth);
        // Return unsubscribe function
        return () => {
            this.healthListeners.delete(callback);
        };
    }
}
//# sourceMappingURL=WakuNodeManager.js.map