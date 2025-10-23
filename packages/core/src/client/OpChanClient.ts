import { environment, type EnvironmentConfig } from '../lib/utils/environment';
import messageManager, { DefaultMessageManager } from '../lib/waku';
import { LocalDatabase, localDatabase } from '../lib/database/LocalDatabase';
import { ForumActions } from '../lib/forum/ForumActions';
import { RelevanceCalculator } from '../lib/forum/RelevanceCalculator';
import { UserIdentityService } from '../lib/services/UserIdentityService';
import { DelegationManager, delegationManager } from '../lib/delegation';
import WalletManager from '../lib/wallet';
import { MessageService } from '../lib/services/MessageService';
import { WakuConfig } from '../types';

export interface OpChanClientConfig {
  ordiscanApiKey: string;
  wakuConfig: WakuConfig;
}

export class OpChanClient {
  readonly config: OpChanClientConfig;

  readonly messageManager: DefaultMessageManager = messageManager;
  readonly database: LocalDatabase = localDatabase;
  readonly forumActions = new ForumActions();
  readonly relevance = new RelevanceCalculator();
  readonly messageService: MessageService;
  readonly userIdentityService: UserIdentityService;
  readonly delegation: DelegationManager = delegationManager;
  readonly wallet = WalletManager

  constructor(config: OpChanClientConfig) {
    this.config = config;

    const env: EnvironmentConfig = {
      apiKeys: {
        ordiscan: config.ordiscanApiKey,
      },
    };

    environment.configure(env);
    
    // Initialize message manager with WakuConfig
    this.messageManager.initialize(config.wakuConfig).catch(error => {
      console.error('Failed to initialize message manager:', error);
    });

    this.messageService = new MessageService(this.delegation);
    this.userIdentityService = new UserIdentityService(this.messageService);
  }
}
