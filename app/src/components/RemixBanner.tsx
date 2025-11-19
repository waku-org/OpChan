import React, { useState } from 'react';
import { X, Users, Code } from 'lucide-react';
import { useUIState } from '@/hooks';

const RemixBanner = () => {
  const [isDismissed, setIsDismissed] = useUIState('remixBannerDismissed', false);
  const [activeTab, setActiveTab] = useState<'users' | 'devs'>('users');

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/30">
      <div className="max-w-6xl mx-auto px-2 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Tab Toggle */}
          <div className="flex items-center gap-2 text-[10px]">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1 px-2 py-1 border transition-colors ${
                activeTab === 'users'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              }`}
            >
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">USERS</span>
            </button>
            <button
              onClick={() => setActiveTab('devs')}
              className={`flex items-center gap-1 px-2 py-1 border transition-colors ${
                activeTab === 'devs'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              }`}
            >
              <Code className="w-3 h-3" />
              <span className="hidden sm:inline">DEVS</span>
            </button>
          </div>

          {/* Message Content */}
          <div className="flex-1 text-[10px] text-foreground">
            {activeTab === 'users' ? (
              <p>
                <span className="text-primary font-semibold">REMIX THIS:</span>{' '}
                <span className="text-muted-foreground">Use it • Create cells • Post comments • Shape the conversation</span>
              </p>
            ) : (
              <p>
                <span className="text-primary font-semibold">BUILD YOUR OWN:</span>{' '}
                <span className="text-muted-foreground">
                  Write your own UI with the forum library •{' '}
                  <a 
                    href="https://opchan.app/docs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Docs (WIP)
                  </a>
                </span>
              </p>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Dismiss banner"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemixBanner;

