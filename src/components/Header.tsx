import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useWakuHealthStatus } from '@/hooks';
import { useAuth as useAuthContext } from '@/contexts/useAuth';
import { EVerificationStatus } from '@/types/identity';
import { useForum } from '@/contexts/useForum';
import { localDatabase } from '@/lib/database/LocalDatabase';
import { DelegationFullStatus } from '@/lib/delegation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  LogOut,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Key,
  CircleSlash,
  Home,
  Grid3X3,
  User,
  Bookmark,
  Settings,
  Menu,
  X,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WalletWizard } from '@/components/ui/wallet-wizard';

import { useUserDisplay } from '@/hooks';
import { WakuHealthDot } from '@/components/ui/waku-health-indicator';

const Header = () => {
  const { verificationStatus } = useAuth();
  const { getDelegationStatus } = useAuthContext();
  const [delegationInfo, setDelegationInfo] =
    useState<DelegationFullStatus | null>(null);
  const wakuHealth = useWakuHealthStatus();
  const location = useLocation();
  const { toast } = useToast();
  const forum = useForum();

  // Use AppKit hooks for multi-chain support
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });
  const { disconnect } = useDisconnect();

  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;
  const address = isConnected
    ? isBitcoinConnected
      ? bitcoinAccount.address
      : ethereumAccount.address
    : undefined;

  const [walletWizardOpen, setWalletWizardOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ Get display name from enhanced hook
  const { displayName } = useUserDisplay(address || '');

  // Load delegation status
  React.useEffect(() => {
    getDelegationStatus().then(setDelegationInfo).catch(console.error);
  }, [getDelegationStatus]);

  // Use LocalDatabase to persist wizard state across navigation
  const getHasShownWizard = async (): Promise<boolean> => {
    try {
      const value = await localDatabase.loadUIState('hasShownWalletWizard');
      return value === true;
    } catch {
      return false;
    }
  };

  const setHasShownWizard = async (value: boolean): Promise<void> => {
    try {
      await localDatabase.storeUIState('hasShownWalletWizard', value);
    } catch (e) {
      console.error('Failed to store wizard state', e);
    }
  };

  // Auto-open wizard when wallet connects for the first time
  React.useEffect(() => {
    if (isConnected) {
      getHasShownWizard().then(hasShown => {
        if (!hasShown) {
          setWalletWizardOpen(true);
          setHasShownWizard(true).catch(console.error);
        }
      });
    }
  }, [isConnected]);

  const handleConnect = async () => {
    setWalletWizardOpen(true);
  };

  const handleOpenWizard = () => {
    setWalletWizardOpen(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
    await setHasShownWizard(false); // Reset so wizard can show again on next connection
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected successfully.',
    });
  };


  const getStatusIcon = () => {
    if (!isConnected) return <CircleSlash className="w-4 h-4" />;

    if (
      verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED &&
      delegationInfo?.isValid
    ) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (verificationStatus === EVerificationStatus.WALLET_CONNECTED) {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (
      verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED
    ) {
      return <Key className="w-4 h-4" />;
    } else {
      return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <>
      <header className="bg-black/80 border-b border-cyber-muted/30 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4">
          {/* Top Row - Logo, Network Status, User Actions */}
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-2 text-xl font-mono font-bold text-white hover:text-cyber-accent transition-colors"
              >
                <Terminal className="w-6 h-6" />
                <span className="tracking-wider">opchan</span>
              </Link>
            </div>

            {/* Center: Network Status (Desktop) */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-cyber-muted/20 rounded-full border border-cyber-muted/30">
                <WakuHealthDot />
                <span className="text-xs font-mono text-cyber-neutral">
                  {wakuHealth.statusMessage}
                </span>
                {forum.lastSync && (
                  <div className="flex items-center space-x-1 text-xs text-cyber-neutral/70">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(forum.lastSync).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center space-x-3">
              {/* Network Status (Mobile) */}
              <div className="lg:hidden">
                <WakuHealthDot />
              </div>

              {/* User Status & Actions */}
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  {/* Status Badge */}
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs border-0 ${
                      verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED && delegationInfo?.isValid
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    {getStatusIcon()}
                    <span className="ml-1">
                      {verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED && delegationInfo?.isValid
                        ? 'READY'
                        : verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED
                        ? 'EXPIRED'
                        : 'VERIFY'
                      }
                    </span>
                  </Badge>

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 text-white hover:bg-cyber-muted/30"
                      >
                        <div className="text-sm font-mono">{displayName}</div>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-black/95 border-cyber-muted/30">
                      <div className="px-3 py-2 border-b border-cyber-muted/30">
                        <div className="text-sm font-medium text-white">{displayName}</div>
                        <div className="text-xs text-cyber-neutral">{address?.slice(0, 8)}...{address?.slice(-4)}</div>
                      </div>
                      
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link to="/bookmarks" className="flex items-center space-x-2">
                          <Bookmark className="w-4 h-4" />
                          <span>Bookmarks</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="bg-cyber-muted/30" />
                      
                      <DropdownMenuItem onClick={handleOpenWizard} className="flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Setup Wizard</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="bg-cyber-muted/30" />
                      
                      <DropdownMenuItem 
                        onClick={handleDisconnect} 
                        className="flex items-center space-x-2 text-red-400 focus:text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  className="bg-cyber-accent hover:bg-cyber-accent/80 text-black font-mono font-medium"
                >
                  Connect
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:bg-cyber-muted/30"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Navigation Bar (Desktop) */}
          <div className="hidden md:flex items-center justify-center border-t border-cyber-muted/20 py-2">
            <nav className="flex items-center space-x-1">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                  location.pathname === '/'
                    ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                    : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>HOME</span>
              </Link>
              <Link
                to="/cells"
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                  location.pathname === '/cells'
                    ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                    : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>CELLS</span>
              </Link>
              {isConnected && (
                <>
                  <Link
                    to="/bookmarks"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                      location.pathname === '/bookmarks'
                        ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                        : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>BOOKMARKS</span>
                  </Link>
                  <Link
                    to="/profile"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                      location.pathname === '/profile'
                        ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                        : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>PROFILE</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-cyber-muted/20 py-4 space-y-2">
              <nav className="space-y-1">
                <Link
                  to="/"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-mono transition-all ${
                    location.pathname === '/'
                      ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                      : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="w-4 h-4" />
                  <span>HOME</span>
                </Link>
                <Link
                  to="/cells"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-mono transition-all ${
                    location.pathname === '/cells'
                      ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                      : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>CELLS</span>
                </Link>
                {isConnected && (
                  <>
                    <Link
                      to="/bookmarks"
                      className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-mono transition-all ${
                        location.pathname === '/bookmarks'
                          ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                          : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>BOOKMARKS</span>
                    </Link>
                    <Link
                      to="/profile"
                      className={`flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-mono transition-all ${
                        location.pathname === '/profile'
                          ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                          : 'text-cyber-neutral hover:text-white hover:bg-cyber-muted/20'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>PROFILE</span>
                    </Link>
                  </>
                )}
              </nav>
              
              {/* Mobile Network Status */}
              <div className="px-4 py-3 border-t border-cyber-muted/20">
                <div className="flex items-center space-x-2 text-xs text-cyber-neutral">
                  <WakuHealthDot />
                  <span>{wakuHealth.statusMessage}</span>
                  {forum.lastSync && (
                    <span className="ml-auto">
                      {new Date(forum.lastSync).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Wallet Wizard */}
      <WalletWizard
        open={walletWizardOpen}
        onOpenChange={setWalletWizardOpen}
        onComplete={() => {
          setWalletWizardOpen(false);
          toast({
            title: 'Setup Complete',
            description: 'Your wallet is ready to use!',
          });
        }}
      />
    </>
  );
};

export default Header;
