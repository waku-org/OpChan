/**
 * Environment abstraction for the core library
 * This allows the library to work in different environments (Vite, Node, etc.)
 */

export interface EnvironmentConfig {
  apiKeys?: {
    ordiscan?: string;
  };
}

class Environment { 
  private config: EnvironmentConfig = {
  };

  public configure(config: EnvironmentConfig): void {
    this.config = { ...this.config, ...config };
  }

  public get ordiscanApiKey(): string | undefined {
    return this.config.apiKeys?.ordiscan;
  }
}

export const environment = new Environment();
