import  { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useForum } from '@/contexts/useForum';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {  LogOut, Terminal, Wifi, WifiOff, AlertTriangle, CheckCircle, Key, RefreshCw, CircleSlash } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WalletConnectionDialog } from '@/components/ui/wallet-dialog';

const Header = () => {
  const { 
    currentUser, 
    isAuthenticated, 
    verificationStatus, 
    verifyOwnership, 
    delegateKey, 
    isDelegationValid,
    delegationTimeRemaining,
    isWalletAvailable
  } = useAuth();
  const { isNetworkConnected, isRefreshing } = useForum();
  const { toast } = useToast();
  // Use AppKit hooks for multi-chain support
  const bitcoinAccount = useAppKitAccount({ namespace: "bip122" });
  const ethereumAccount = useAppKitAccount({ namespace: "eip155" });
  const { disconnect } = useDisconnect();
  
  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;
  const address = isConnected ? (isBitcoinConnected ? bitcoinAccount.address : ethereumAccount.address) : undefined;
  
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  
  const handleConnect = async () => {
    setWalletDialogOpen(true);
  };
  
  const handleDisconnect = async () => {
    await disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected successfully.",
    });
  };
  
  const handleVerify = async () => {
    await verifyOwnership();
  };

  const handleDelegateKey = async () => {
    try {
      if (!isWalletAvailable()) {
        toast({
          title: "Wallet Not Available",
          description: "Wallet is not installed or not available. Please install a compatible wallet and try again.",
          variant: "destructive",
        });
        return;
      }

      await delegateKey();
    } catch (error) {
      console.error('Error in handleDelegateKey:', error);
    }
  };

  const formatDelegationTime = () => {
    if (!isDelegationValid()) return null;
    
    const timeRemaining = delegationTimeRemaining();
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`; 
  };

  const renderDelegationButton = () => {
    if (verificationStatus !== 'verified-owner') return null; 
    
    const hasValidDelegation = isDelegationValid();
    const timeRemaining = formatDelegationTime();
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasValidDelegation ? "outline" : "default"}
            size="sm"
            className="flex items-center gap-1 text-xs px-2 h-7" 
            onClick={handleDelegateKey}
          >
            <Key className="w-3 h-3" /> 
            {hasValidDelegation 
              ? <span>KEY ACTIVE ({timeRemaining})</span> 
              : <span>DELEGATE KEY</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-sm">
          {hasValidDelegation ? (
            <p>Browser key active for ~{timeRemaining}. Wallet signatures not needed for most actions.</p>
          ) : (
            <p>Delegate a browser key for 24h to avoid constant wallet signing. If your wallet is disconnected, it will be reconnected automatically.</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderAccessBadge = () => {
    if (verificationStatus === 'unverified') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerify}
              className="flex items-center gap-1 text-xs px-2 h-7 border-destructive text-destructive hover:bg-destructive/10" 
            >
              <AlertTriangle className="w-3 h-3" /> 
              <span>[UNVERIFIED] Verify</span>
            </Button>
          </TooltipTrigger>
           <TooltipContent className="max-w-[260px] text-sm">
             <p className="font-semibold mb-1">Action Required</p>
             <p>Verify your Ordinal ownership to enable posting, commenting, and voting.</p>
           </TooltipContent>
        </Tooltip>
      );
    }
    
    if (verificationStatus === 'verifying') {
      return (
        <Badge 
          variant="outline" 
          className="flex items-center gap-1 text-xs px-2 h-7"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>[VERIFYING...]</span>
        </Badge>
      );
    }
    
    if (verificationStatus === 'verified-none') {
      return (
        <Tooltip>
           <TooltipTrigger asChild>
             <Badge 
               variant="secondary" 
               className="flex items-center gap-1 cursor-help text-xs px-2 h-7"
             >
               <CircleSlash className="w-3 h-3" /> 
               <span>[VERIFIED | READ-ONLY]</span>
             </Badge>
           </TooltipTrigger>
           <TooltipContent className="max-w-[260px] text-sm">
             <p className="font-semibold mb-1">Wallet Verified - No Ordinals</p>
             <p>No Ordinal Operators found. Read-only access granted.</p>
             <Button size="sm" variant="link" onClick={handleVerify} className="p-0 h-auto mt-1 text-xs">Verify Again?</Button>
           </TooltipContent>
        </Tooltip>
      );
    }
    
    // Verified - Ordinal Owner
    if (verificationStatus === 'verified-owner') {
      return (
         <Tooltip>
           <TooltipTrigger asChild>
             <Badge 
               variant="default" 
               className="flex items-center gap-1 cursor-help text-xs px-2 h-7 bg-primary text-primary-foreground" 
             >
               <CheckCircle className="w-3 h-3" /> 
               <span>[OWNER ✔]</span>
             </Badge>
           </TooltipTrigger>
           <TooltipContent className="max-w-[260px] text-sm">
              <p className="font-semibold mb-1">Ordinal Owner Verified!</p>
              <p>Full forum access granted.</p>
              <Button size="sm" variant="link" onClick={handleVerify} className="p-0 h-auto mt-1 text-xs">Verify Again?</Button>
           </TooltipContent>
        </Tooltip>
      );
    }
    
    return null;
  };
  
  return (
    <>
      <header className="border-b border-cyber-muted bg-cyber-dark fixed top-0 left-0 right-0 z-50 h-16"> 
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyber-accent w-6 h-6" />
            <Link to="/" className="text-xl font-bold text-glow text-cyber-accent">
              OpChan
            </Link>
           
          </div>
          
          <div className="flex gap-3 items-center"> 
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={isNetworkConnected ? "default" : "destructive"}
                  className="flex items-center gap-1 text-xs px-2 h-7 cursor-help" 
                >
                  {isNetworkConnected ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span>WAKU: Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      <span>WAKU: Offline</span>
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="text-sm">
                <p>{isNetworkConnected ? "Waku network connection active." : "Waku network connection lost."}</p>
                {isRefreshing && <p>Refreshing data...</p>}
              </TooltipContent>
            </Tooltip>
            
            {!isConnected ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleConnect}
                className="text-xs px-2 h-7" 
              >
                Connect Wallet
              </Button>
            ) : (
              <div className="flex gap-2 items-center"> 
                {renderAccessBadge()}
                {renderDelegationButton()}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="hidden md:flex items-center text-xs text-muted-foreground cursor-default px-2 h-7"> 
                      {currentUser?.ensName || `${address?.slice(0, 5)}...${address?.slice(-4)}`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-sm">
                    <p>{currentUser?.ensName ? `${currentUser.ensName} (${address})` : address}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                   <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDisconnect}
                      className="w-7 h-7" 
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                   </TooltipTrigger>
                   <TooltipContent className="text-sm">Disconnect Wallet</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <WalletConnectionDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        onConnect={handleConnect}
      />
    </>
  );
};

export default Header;
