import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LogOut, Terminal, Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Header = () => {
  const { currentUser, isAuthenticated, connectWallet, disconnectWallet, verifyOrdinal } = useAuth();
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
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  className="flex items-center gap-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Ordinal</span>
                </Button>
              )}
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
