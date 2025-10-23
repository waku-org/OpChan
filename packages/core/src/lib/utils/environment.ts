/**
 * Environment abstraction for the core library
 * This allows the library to work in different environments (Vite, Node, etc.)
 */

export interface EnvironmentConfig {
  apiKeys?: {
    ordiscan?: string;
  };
  reownProjectId?: string;
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

  public get reownProjectId(): string | undefined {
    return this.config.reownProjectId;
  }
}

export const environment = new Environment();
