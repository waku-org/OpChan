import React, { useState } from 'react';
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
import { useEthereumWallet } from '@opchan/react';
import { WalletWizard } from '@/components/ui/wallet-wizard';
import { CallSignSetupDialog } from '@/components/ui/call-sign-setup-dialog';

import { WakuHealthDot } from '@/components/ui/waku-health-indicator';

const Header = () => {
  const { currentUser, delegationInfo } = useAuth();
  const { statusMessage } = useNetwork();

  const location = useLocation();
  const { toast } = useToast();
  const { content } = useForum();

  const { isConnected, disconnect } = useEthereumWallet();

  const [walletWizardOpen, setWalletWizardOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callSignDialogOpen, setCallSignDialogOpen] = useState(false);

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
    // For anonymous users, clear their session
    if (currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS) {
      await localDatabase.clearUser();
      await localDatabase.clearDelegation();
      window.location.reload(); // Reload to reset state
      return;
    }
    
    // For wallet users, disconnect wallet
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
        EVerificationStatus.ENS_VERIFIED &&
      delegationInfo?.isValid
    ) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (
      currentUser?.verificationStatus === EVerificationStatus.WALLET_CONNECTED
    ) {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (
      currentUser?.verificationStatus ===
      EVerificationStatus.ENS_VERIFIED
    ) {
      return <Key className="w-4 h-4" />;
    } else {
      return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <>
      <header className="bg-cyber-dark border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          {/* Top Row - Logo, Network Status, User Actions */}
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            {/* Left: Logo */}
            <div className="flex items-center min-w-0">
              <Link
                to="/"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-mono font-semibold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-foreground truncate"
              >
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">opchan</span>
              </Link>
            </div>

            {/* Center: Network Status (Desktop) */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 border border-border text-[10px] uppercase tracking-[0.2em]">
                <WakuHealthDot />
                <span className="text-[10px] text-muted-foreground">
                  {statusMessage}
                </span>
                {content.lastSync && (
                  <div className="flex items-center space-x-1 text-[10px] text-muted-foreground">
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
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* Network Status (Mobile) */}
              <div className="lg:hidden">
                <WakuHealthDot />
              </div>

              {/* User Status & Actions */}
              {isConnected || currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS ? (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {/* Status Badge - hidden for anonymous sessions */}
                  {currentUser?.verificationStatus !== EVerificationStatus.ANONYMOUS && (
                    <Badge
                      variant="outline"
                      className={`hidden sm:flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${
                        currentUser?.verificationStatus ===
                          EVerificationStatus.ENS_VERIFIED &&
                        delegationInfo?.isValid
                          ? 'border-green-500 text-green-300'
                          : currentUser?.verificationStatus ===
                              EVerificationStatus.ENS_VERIFIED
                            ? 'border-orange-500 text-orange-300'
                            : 'border-yellow-500 text-yellow-300'
                      }`}
                    >
                      {getStatusIcon()}
                      <span className="hidden md:inline">
                        {currentUser?.verificationStatus ===
                        EVerificationStatus.WALLET_UNCONNECTED
                          ? 'CONNECT'
                          : delegationInfo?.isValid
                            ? 'READY'
                            : currentUser?.verificationStatus ===
                                EVerificationStatus.ENS_VERIFIED
                              ? 'EXPIRED'
                              : 'DELEGATE'}
                      </span>
                    </Badge>
                  )}

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-1 sm:space-x-2 text-foreground border-border px-2 sm:px-3"
                      >
                        <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate max-w-[80px] sm:max-w-none">
                          {currentUser?.displayName}
                        </div>
                        <Settings className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-[#050505] border border-border text-sm"
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

                      {currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS ? (
                        <DropdownMenuItem
                          onClick={() => setCallSignDialogOpen(true)}
                          className="flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>{currentUser?.callSign ? 'Update' : 'Set'} Call Sign</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={handleOpenWizard}
                          className="flex items-center space-x-2"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Setup Wizard</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-border" />

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
                        <AlertDialogContent className="bg-[#050505] border border-border text-foreground">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground uppercase tracking-[0.2em] text-sm">
                              Clear Local Database
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
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
                            <AlertDialogCancel className="border border-border text-foreground hover:bg-white/5">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearDatabase}
                              className="border border-red-600 text-red-400 hover:bg-red-600/10"
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
                        <span>{currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS ? 'Exit Anonymous' : 'Disconnect'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  className="text-primary border-primary hover:bg-primary/10 text-[10px] sm:text-[11px] px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Connect</span>
                  <span className="sm:hidden">CON</span>
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden border-border text-foreground p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Navigation Bar (Desktop) */}
          <div className="hidden md:flex items-center justify-center border-t border-border py-2">
            <nav className="flex items-center space-x-0.5 text-[11px] uppercase tracking-[0.2em]">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 border-b ${
                  location.pathname === '/'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>HOME</span>
              </Link>
              <Link
                to="/cells"
                className={`flex items-center space-x-2 px-4 py-2 border-b ${
                  location.pathname === '/cells'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>CELLS</span>
              </Link>
              {isConnected && (
                <>
                  <Link
                    to="/bookmarks"
                    className={`flex items-center space-x-2 px-4 py-2 border-b ${
                      location.pathname === '/bookmarks'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
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
            <div className="md:hidden border-t border-border py-4 space-y-2">
              <nav className="space-y-1">
                <Link
                  to="/"
                  className={`flex items-center space-x-3 px-4 py-3 border ${
                    location.pathname === '/'
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="w-4 h-4" />
                  <span>HOME</span>
                </Link>
                <Link
                  to="/cells"
                  className={`flex items-center space-x-3 px-4 py-3 border ${
                    location.pathname === '/cells'
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
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
                      className={`flex items-center space-x-3 px-4 py-3 border ${
                        location.pathname === '/bookmarks'
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>BOOKMARKS</span>
                    </Link>
                    <Link
                      to="/profile"
                      className={`flex items-center space-x-3 px-4 py-3 border ${
                        location.pathname === '/profile'
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground'
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
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
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

      {/* Call Sign Dialog for Anonymous Users */}
      {currentUser?.verificationStatus === EVerificationStatus.ANONYMOUS && (
        <CallSignSetupDialog
          open={callSignDialogOpen}
          onOpenChange={setCallSignDialogOpen}
        />
      )}
    </>
  );
};

export default Header;
