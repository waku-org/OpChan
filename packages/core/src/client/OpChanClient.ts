import { environment, type EnvironmentConfig } from '../lib/utils/environment';
import messageManager, { DefaultMessageManager } from '../lib/waku';
import { LocalDatabase, localDatabase } from '../lib/database/LocalDatabase';
import { ForumActions } from '../lib/forum/ForumActions';
import { RelevanceCalculator } from '../lib/forum/RelevanceCalculator';
import { UserIdentityService } from '../lib/services/UserIdentityService';
import { DelegationManager, delegationManager } from '../lib/delegation';
import { walletManager } from '../lib/wallet';
import { MessageService } from '../lib/services/MessageService';

export interface OpChanClientConfig {
  ordiscanApiKey: string;
  debug?: boolean;
  isDevelopment?: boolean;
  isProduction?: boolean;
}

export class OpChanClient {
  readonly config: OpChanClientConfig;

  // Exposed subsystems
  readonly messageManager: DefaultMessageManager = messageManager;
  readonly database: LocalDatabase = localDatabase;
  readonly forumActions = new ForumActions();
  readonly relevance = new RelevanceCalculator();
  readonly messageService: MessageService;
  readonly userIdentityService: UserIdentityService;
  readonly delegation: DelegationManager = delegationManager;
  readonly wallet = walletManager;

  constructor(config: OpChanClientConfig) {
    this.config = config;

    const env: EnvironmentConfig = {
      isDevelopment: config.isDevelopment ?? config.debug ?? false,
      isProduction: config.isProduction ?? !config.debug,
      apiKeys: {
        ordiscan: config.ordiscanApiKey,
      },
    };

    environment.configure(env);

    this.messageService = new MessageService(this.delegation);
    this.userIdentityService = new UserIdentityService(this.messageService);
  }
}
