/**
 * Environment abstraction for the core library
 * This allows the library to work in different environments (Vite, Node, etc.)
 */

export interface EnvironmentConfig {
  isDevelopment?: boolean;
  isProduction?: boolean;
  apiKeys?: {
    ordiscan?: string;
  };
}

class Environment {
  private config: EnvironmentConfig = {
    isDevelopment: false,
    isProduction: true,
  };

  public configure(config: EnvironmentConfig): void {
    this.config = { ...this.config, ...config };
  }

  public get isDev(): boolean {
    return this.config.isDevelopment || false;
  }

  public get isProduction(): boolean {
    return this.config.isProduction ?? true;
  }

  public get ordiscanApiKey(): string | undefined {
    return this.config.apiKeys?.ordiscan;
  }
}

export const environment = new Environment();
