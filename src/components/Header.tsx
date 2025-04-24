import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LogOut, Terminal, Wifi, WifiOff, Eye, MessageSquare, RefreshCw, Key } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Header = () => {
  const { 
    currentUser, 
    isAuthenticated, 
    verificationStatus, 
    connectWallet, 
    disconnectWallet, 
    verifyOrdinal, 
    delegateKey, 
    isDelegationValid,
    delegationTimeRemaining 
  } = useAuth();
  const { isNetworkConnected, isRefreshing } = useForum();
  
  const handleConnect = async () => {
    await connectWallet();
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
  };
  
  const handleVerify = async () => {
    await verifyOrdinal();
  };

  const handleDelegateKey = async () => {
    await delegateKey();
  };

  // Format delegation time remaining for display
  const formatDelegationTime = () => {
    if (!isDelegationValid()) return null;
    
    const timeRemaining = delegationTimeRemaining();
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const renderDelegationButton = () => {
    // Only show delegation button for verified Ordinal owners
    if (verificationStatus !== 'verified-owner') return null;
    
    const hasValidDelegation = isDelegationValid();
    const timeRemaining = formatDelegationTime();
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasValidDelegation ? "outline" : "default"}
            size="sm"
            className="flex items-center gap-1"
            onClick={handleDelegateKey}
          >
            <Key className="w-4 h-4" />
            {hasValidDelegation 
              ? <span>Key Delegated ({timeRemaining})</span> 
              : <span>Delegate Key</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">
          {hasValidDelegation ? (
            <p>You have a delegated browser key active for {timeRemaining}. 
               You won't need to sign messages with your wallet for most actions.</p>
          ) : (
            <p>Delegate a browser key to avoid signing every action with your wallet. 
               Improves UX by reducing wallet popups for 24 hours.</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderAccessBadge = () => {
    if (verificationStatus === 'unverified') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleVerify}
          className="flex items-center gap-1"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verify Ordinal</span>
        </Button>
      );
    }
    
    if (verificationStatus === 'verifying') {
      return (
        <Badge 
          variant="outline" 
          className="flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="text-xs">Verifying...</span>
        </Badge>
      );
    }
    
    if (verificationStatus === 'verified-none') {
      return (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1 cursor-help"
              >
                <Eye className="w-3 h-3" />
                <span className="text-xs">Read-Only Access</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="font-semibold mb-1">Wallet Verified - No Ordinals Found</p>
              <p className="text-sm mb-1">Your wallet has been verified but does not contain any Ordinal Operators.</p>
              <p className="text-sm text-muted-foreground">You can browse content but cannot post, comment, or vote.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6" 
                onClick={handleVerify}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verify again</p>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }
    
    if (verificationStatus === 'verified-owner') {
      return (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="default" 
                className="flex items-center gap-1 cursor-help bg-cyber-accent"
              >
                <MessageSquare className="w-3 h-3" />
                <span className="text-xs">Full Access</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="font-semibold mb-1">Ordinal Operators Verified!</p>
              <p className="text-sm">You have full forum access with permission to post, comment, and vote.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6" 
                onClick={handleVerify}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verify again</p>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <header className="border-b border-cyber-muted bg-cyber-dark">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Terminal className="text-cyber-accent w-6 h-6" />
          <Link to="/" className="text-xl font-bold text-glow text-cyber-accent">
            OpChan
          </Link>
          <span className="text-xs bg-cyber-muted px-2 py-0.5 rounded ml-2">
            PoC v0.1
          </span>
        </div>
        
        <div className="flex gap-2 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Badge 
                  variant={isNetworkConnected ? "default" : "destructive"}
                  className="flex items-center gap-1 mr-2"
                >
                  {isNetworkConnected ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span className="text-xs">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      <span className="text-xs">Offline</span>
                    </>
                  )}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isNetworkConnected 
                ? "Connected to Waku network" 
                : "Not connected to Waku network. Some features may be unavailable."}</p>
              {isRefreshing && <p>Refreshing data...</p>}
            </TooltipContent>
          </Tooltip>
          
          {!currentUser ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleConnect}
            >
              Connect Wallet
            </Button>
          ) : (
            <>
              {renderAccessBadge()}
              {renderDelegationButton()}
              <span className="hidden md:flex items-center text-sm text-cyber-neutral px-3">
                {currentUser.address.slice(0, 6)}...{currentUser.address.slice(-4)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                title="Disconnect wallet"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
