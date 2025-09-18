/**
 * @opchan/core - Browser library for opchan
 */

export interface OpchanOptions {
  debug?: boolean;
  version?: string;
}

export class Opchan {
  private options: OpchanOptions;

  constructor(options: OpchanOptions = {}) {
    this.options = {
      debug: false,
      version: '1.0.0',
      ...options,
    };
  }

  public getVersion(): string {
    return this.options.version || '1.0.0';
  }

  public isDebug(): boolean {
    return this.options.debug || false;
  }

  public log(message: string): void {
    if (this.options.debug) {
      console.log(`[Opchan] ${message}`);
    }
  }
}

// Default export
export default Opchan;

// Named exports for convenience
export { Opchan as OpchanCore };