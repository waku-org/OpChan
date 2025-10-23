import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useForum, useNetwork, useUIState } from '@/hooks';
import { EVerificationStatus } from '@opchan/core';
import { localDatabase } from '@opchan/core';
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
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WalletWizard } from '@/components/ui/wallet-wizard';

import { WakuHealthDot } from '@/components/ui/waku-health-indicator';

const Header = () => {
  const { currentUser, delegationInfo } = useAuth();
  const { statusMessage } = useNetwork();

  const location = useLocation();
  const { toast } = useToast();
  const { content } = useForum();

  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });
  const { disconnect } = useDisconnect();

  const isConnected = bitcoinAccount.isConnected || ethereumAccount.isConnected;

  const [walletWizardOpen, setWalletWizardOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Use centralized UI state instead of direct LocalDatabase access
  const [hasShownWizard, setHasShownWizard] = useUIState(
    'hasShownWalletWizard',
    false
  );

  // Auto-open wizard when wallet connects for the first time
  React.useEffect(() => {
    if (isConnected && !hasShownWizard) {
      setWalletWizardOpen(true);
      setHasShownWizard(true);
    }
  }, [isConnected, hasShownWizard, setHasShownWizard]);

  const handleConnect = async () => {
    setWalletWizardOpen(true);
  };

  const handleOpenWizard = () => {
    setWalletWizardOpen(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setHasShownWizard(false); // Reset so wizard can show again on next connection
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected successfully.',
    });
  };

  const handleClearDatabase = async () => {
    try {
      await localDatabase.clearAll();
      toast({
        title: 'Database Cleared',
        description: 'All local data has been cleared successfully.',
      });
    } catch (error) {
      console.error('Failed to clear database:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear local database. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return <CircleSlash className="w-4 h-4" />;

    if (
      currentUser?.verificationStatus ===
        EVerificationStatus.ENS_ORDINAL_VERIFIED &&
      delegationInfo?.isValid
    ) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (
      currentUser?.verificationStatus === EVerificationStatus.WALLET_CONNECTED
    ) {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (
      currentUser?.verificationStatus ===
      EVerificationStatus.ENS_ORDINAL_VERIFIED
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
                  {statusMessage}
                </span>
                {content.lastSync && (
                  <div className="flex items-center space-x-1 text-xs text-cyber-neutral/70">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(content.lastSync).toLocaleTimeString([], {
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
                      currentUser?.verificationStatus ===
                        EVerificationStatus.ENS_ORDINAL_VERIFIED &&
                      delegationInfo?.isValid
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : currentUser?.verificationStatus ===
                            EVerificationStatus.ENS_ORDINAL_VERIFIED
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    {getStatusIcon()}
                    <span className="ml-1">
                      {currentUser?.verificationStatus ===
                      EVerificationStatus.WALLET_UNCONNECTED
                        ? 'CONNECT'
                        : delegationInfo?.isValid
                          ? 'READY'
                          : currentUser?.verificationStatus ===
                              EVerificationStatus.ENS_ORDINAL_VERIFIED
                            ? 'EXPIRED'
                            : 'DELEGATE'}
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
                        <div className="text-sm font-mono">
                          {currentUser?.displayName}
                        </div>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-black/95 border-cyber-muted/30"
                    >
                      <DropdownMenuItem asChild>
                        <Link
                          to="/profile"
                          className="flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleOpenWizard}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Setup Wizard</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-cyber-muted/30" />

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={e => e.preventDefault()}
                            className="flex items-center space-x-2 text-orange-400 focus:text-orange-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Clear Database</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-black/95 border-cyber-muted/30">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">
                              Clear Local Database
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-cyber-neutral">
                              This will permanently delete all locally stored
                              data including:
                              <br />• Posts and comments
                              <br />• User identities and preferences
                              <br />• Bookmarks and votes
                              <br />• UI state and settings
                              <br />
                              <br />
                              <strong>This action cannot be undone.</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-cyber-muted/20 border-cyber-muted/30 text-white hover:bg-cyber-muted/30">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearDatabase}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Clear Database
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

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
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
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
                  <span>{statusMessage}</span>
                  {content.lastSync && (
                    <span className="ml-auto">
                      {new Date(content.lastSync).toLocaleTimeString([], {
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
