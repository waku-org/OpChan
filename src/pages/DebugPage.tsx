import React, { useState, useEffect } from 'react';
import { useForum } from '@/contexts/useForum';
import { localDatabase } from '@/lib/database/LocalDatabase';
import messageManager from '@/lib/waku';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Trash2, Download, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MessageStats {
  totalMessages: number;
  cellMessages: number;
  postMessages: number;
  commentMessages: number;
  voteMessages: number;
  moderationMessages: number;
  userProfileMessages: number;
}

const DebugPage = () => {
  const {
    missingMessageCount,
    recoveredMessageCount,
    totalMissingMessages,
    totalRecoveredMessages,
    lastSync,
    isSyncing,
    isNetworkConnected,
  } = useForum();
  
  const [messageStats, setMessageStats] = useState<MessageStats>({
    totalMessages: 0,
    cellMessages: 0,
    postMessages: 0,
    commentMessages: 0,
    voteMessages: 0,
    moderationMessages: 0,
    userProfileMessages: 0,
  });
  
  const [dbStats, setDbStats] = useState<any>(null);
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const { toast } = useToast();

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const cache = localDatabase.cache;
      const messageCache = messageManager.messageCache;
      
      setMessageStats({
        totalMessages: Object.keys(cache.cells).length + 
                      Object.keys(cache.posts).length + 
                      Object.keys(cache.comments).length + 
                      Object.keys(cache.votes).length +
                      Object.keys(cache.moderations).length +
                      Object.keys(cache.userIdentities).length,
        cellMessages: Object.keys(cache.cells).length,
        postMessages: Object.keys(cache.posts).length,
        commentMessages: Object.keys(cache.comments).length,
        voteMessages: Object.keys(cache.votes).length,
        moderationMessages: Object.keys(cache.moderations).length,
        userProfileMessages: Object.keys(cache.userIdentities).length,
      });

      setDbStats(localDatabase.getMissingMessageStats());
      
      if (messageManager.isReady && messageManager.getMissingMessageCount) {
        setRealTimeStats({
          missingMessages: messageManager.getMissingMessageCount(),
          recoveredMessages: messageManager.getRecoveredMessageCount(),
          allMissingMessages: messageManager.getMissingMessages(),
          allRecoveredMessages: messageManager.getRecoveredMessages(),
        });
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResetStats = async () => {
    try {
      await localDatabase.resetMissingMessageStats();
      toast({
        title: 'Stats Reset',
        description: 'Missing message statistics have been reset.',
      });
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: 'Failed to reset statistics.',
        variant: 'destructive',
      });
    }
  };

  const handleExportDebugInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      network: {
        isConnected: isNetworkConnected,
        lastSync: lastSync,
        isSyncing: isSyncing,
      },
      missingMessages: {
        current: {
          missing: missingMessageCount,
          recovered: recoveredMessageCount,
        },
        total: {
          missing: totalMissingMessages,
          recovered: totalRecoveredMessages,
        },
        database: dbStats,
        realTime: realTimeStats,
      },
      messageStats,
      cache: {
        cellsCount: Object.keys(localDatabase.cache.cells).length,
        postsCount: Object.keys(localDatabase.cache.posts).length,
        commentsCount: Object.keys(localDatabase.cache.comments).length,
        votesCount: Object.keys(localDatabase.cache.votes).length,
        moderationsCount: Object.keys(localDatabase.cache.moderations).length,
        userIdentitiesCount: Object.keys(localDatabase.cache.userIdentities).length,
      },
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opchan-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Debug Info Exported',
      description: 'Debug information has been downloaded as JSON.',
    });
  };

  const recoveryRate = totalMissingMessages > 0 ? (totalRecoveredMessages / totalMissingMessages) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cyber-primary">Debug Console</h1>
          <p className="text-cyber-neutral mt-2">
            Real-time message synchronization and network diagnostics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportDebugInfo} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Debug Info
          </Button>
          <Button onClick={handleResetStats} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Reset Stats
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Network Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Connection</span>
              <Badge variant={isNetworkConnected ? "default" : "destructive"}>
                {isNetworkConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Syncing</span>
              <Badge variant={isSyncing ? "secondary" : "outline"}>
                {isSyncing ? "Syncing" : "Idle"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Last Sync</span>
              <span className="text-xs text-cyber-neutral">
                {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Missing Messages Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Missing Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Currently Missing</span>
              <Badge variant={missingMessageCount > 0 ? "destructive" : "outline"}>
                {missingMessageCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Recently Recovered</span>
              <Badge variant="default" className="bg-green-600">
                {recoveredMessageCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Total Missing</span>
              <span className="text-sm font-mono">{totalMissingMessages}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Total Recovered</span>
              <span className="text-sm font-mono">{totalRecoveredMessages}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recovery Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recovery Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyber-neutral">Recovery Rate</span>
              <span className="text-lg font-bold text-cyber-primary">
                {recoveryRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-cyber-muted/20 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(recoveryRate, 100)}%` }}
              />
            </div>
            <div className="text-xs text-cyber-neutral">
              {totalMissingMessages === 0 
                ? "No missing messages detected" 
                : `${totalRecoveredMessages} of ${totalMissingMessages} recovered`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Statistics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Message Statistics</CardTitle>
          <CardDescription>
            Breakdown of cached messages by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.totalMessages}</div>
              <div className="text-sm text-cyber-neutral">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.cellMessages}</div>
              <div className="text-sm text-cyber-neutral">Cells</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.postMessages}</div>
              <div className="text-sm text-cyber-neutral">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.commentMessages}</div>
              <div className="text-sm text-cyber-neutral">Comments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.voteMessages}</div>
              <div className="text-sm text-cyber-neutral">Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-primary">{messageStats.moderationMessages}</div>
              <div className="text-sm text-cyber-neutral">Moderations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Missing Message Details */}
      {realTimeStats && realTimeStats.allMissingMessages && realTimeStats.allMissingMessages.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Missing Messages
            </CardTitle>
            <CardDescription>
              Messages currently being tracked for recovery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {realTimeStats.allMissingMessages.slice(0, 20).map((msg: any, idx: number) => {
                const messageIdHex = Array.from(msg.messageId, (byte: number) => 
                  byte.toString(16).padStart(2, '0')
                ).join('');
                const hintHex = msg.retrievalHint ? Array.from(msg.retrievalHint, (byte: number) => 
                  byte.toString(16).padStart(2, '0')
                ).join('') : 'N/A';
                
                return (
                  <div key={idx} className="flex items-center justify-between p-2 bg-cyber-muted/10 rounded border">
                    <div className="flex flex-col">
                      <span className="text-sm font-mono">
                        ID: {messageIdHex.substring(0, 16)}...
                      </span>
                      <span className="text-xs text-cyber-neutral">
                        Hint: {hintHex.substring(0, 24)}...
                      </span>
                    </div>
                    <Badge variant="destructive" size="sm">
                      Missing
                    </Badge>
                  </div>
                );
              })}
              {realTimeStats.allMissingMessages.length > 20 && (
                <div className="text-center text-sm text-cyber-neutral py-2">
                  ... and {realTimeStats.allMissingMessages.length - 20} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Statistics */}
      {dbStats && (
        <Card>
          <CardHeader>
            <CardTitle>Persistent Statistics</CardTitle>
            <CardDescription>
              Statistics stored in local database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-cyber-neutral">Last Detected</div>
                <div className="text-sm font-mono">
                  {dbStats.lastDetected 
                    ? new Date(dbStats.lastDetected).toLocaleString()
                    : "Never"}
                </div>
              </div>
              <div>
                <div className="text-sm text-cyber-neutral">Last Recovered</div>
                <div className="text-sm font-mono">
                  {dbStats.lastRecovered 
                    ? new Date(dbStats.lastRecovered).toLocaleString()
                    : "Never"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DebugPage;
