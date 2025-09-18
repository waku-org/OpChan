import { useState, useEffect } from 'react';
import { useUserActions, useForumActions } from '@/hooks';
import { useAuth } from '@opchan/react';
import { useUserDisplay } from '@/hooks';
import { useDelegation } from '@opchan/react';
import { DelegationFullStatus } from '@opchan/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WalletWizard } from '@/components/ui/wallet-wizard';
import Header from '@/components/Header';
import {
  Loader2,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Copy,
  Globe,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { updateProfile } = useUserActions();
  const { refreshData } = useForumActions();
  const { toast } = useToast();

  // Get current user from auth context for the address
  const { currentUser, getDelegationStatus } = useAuth();
  const { delegationStatus } = useDelegation();
  const [delegationInfo, setDelegationInfo] =
    useState<DelegationFullStatus | null>(null);
  const address = currentUser?.address;

  // Load delegation status
  useEffect(() => {
    getDelegationStatus().then(setDelegationInfo).catch(console.error);
  }, [getDelegationStatus]);

  // Get comprehensive user information from the unified hook
  const userInfo = useUserDisplay(address || '');

  // Debug current user ENS info
  console.log('📋 Profile page debug:', {
    address,
    currentUser: currentUser
      ? {
          address: currentUser.address,
          callSign: currentUser.callSign,
          ensDetails: currentUser.ensDetails,
          verificationStatus: currentUser.verificationStatus,
        }
      : null,
    userInfo,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callSign, setCallSign] = useState('');
  const [displayPreference, setDisplayPreference] = useState(
    EDisplayPreference.WALLET_ADDRESS
  );
  const [walletWizardOpen, setWalletWizardOpen] = useState(false);

  // Initialize and update local state when user data changes
  useEffect(() => {
    if (currentUser) {
      // Use the same data source as the display (userInfo) for consistency
      const currentCallSign = userInfo.callSign || currentUser.callSign || '';
      const currentDisplayPreference =
        userInfo.displayPreference ||
        currentUser.displayPreference ||
        EDisplayPreference.WALLET_ADDRESS;

      setCallSign(currentCallSign);
      setDisplayPreference(currentDisplayPreference);
    }
  }, [currentUser, userInfo.callSign, userInfo.displayPreference]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-16">
          <Card className="w-full max-w-md bg-cyber-muted/20 border-cyber-muted/30">
            <CardContent className="pt-6">
              <div className="text-center text-cyber-neutral">
                <User className="w-12 h-12 mx-auto mb-4 text-cyber-accent" />
                <h2 className="text-xl font-mono font-bold mb-2">
                  Connect Required
                </h2>
                <p className="text-sm">
                  Please connect your wallet to view your profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleSave = async () => {
    if (!callSign.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Call sign cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    // Basic validation for call sign
    if (callSign.length < 3 || callSign.length > 20) {
      toast({
        title: 'Invalid Call Sign',
        description: 'Call sign must be between 3 and 20 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(callSign)) {
      toast({
        title: 'Invalid Call Sign',
        description:
          'Call sign can only contain letters, numbers, underscores, and hyphens.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await updateProfile({
        callSign: callSign.trim(),
        displayPreference,
      });

      if (success) {
        await refreshData();
        setIsEditing(false);
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
        });
      }
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset to the same data source as display for consistency
    const currentCallSign = userInfo.callSign || currentUser.callSign || '';
    const currentDisplayPreference =
      userInfo.displayPreference ||
      currentUser.displayPreference ||
      EDisplayPreference.WALLET_ADDRESS;

    setCallSign(currentCallSign);
    setDisplayPreference(currentDisplayPreference);
    setIsEditing(false);
  };

  const getVerificationIcon = () => {
    // Use verification level from UserIdentityService (central database store)
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.ENS_ORDINAL_VERIFIED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case EVerificationStatus.WALLET_CONNECTED:
        return <Shield className="h-4 w-4 text-blue-500" />;
      case EVerificationStatus.WALLET_UNCONNECTED:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getVerificationText = () => {
    // Use verification level from UserIdentityService (central database store)
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.ENS_ORDINAL_VERIFIED:
        return 'Owns ENS or Ordinal';
      case EVerificationStatus.WALLET_CONNECTED:
        return 'Connected Wallet';
      case EVerificationStatus.WALLET_UNCONNECTED:
        return 'Unconnected Wallet';
      default:
        return 'Unknown';
    }
  };

  const getVerificationColor = () => {
    // Use verification level from UserIdentityService (central database store)
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.ENS_ORDINAL_VERIFIED:
        return 'bg-green-100 text-green-800 border-green-200';
      case EVerificationStatus.WALLET_CONNECTED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EVerificationStatus.WALLET_UNCONNECTED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="page-container">
      <Header />
      <main className="page-content">
        <div className="page-main">
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Two-Card Layout: User Profile + Security Status */}
          <div className="grid-main-sidebar content-spacing">
            {/* User Profile Card - Primary (2/3 width) */}
            <div className="grid-main-content">
              <Card className="content-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-cyber-accent" />
                      User Profile
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Identity Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-cyber-accent/20 border border-cyber-accent/30 rounded-lg flex items-center justify-center">
                        <User className="w-8 h-8 text-cyber-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-mono font-bold text-white">
                          {userInfo.displayName}
                        </div>
                        <div className="text-sm text-cyber-neutral">
                          {/* Show ENS name if available */}
                          {(userInfo.ensName ||
                            currentUser?.ensDetails?.ensName) && (
                            <div>
                              ENS:{' '}
                              {userInfo.ensName ||
                                currentUser?.ensDetails?.ensName}
                            </div>
                          )}
                          {/* Show Ordinal details if available */}
                          {(userInfo.ordinalDetails ||
                            currentUser?.ordinalDetails?.ordinalDetails) && (
                            <div>
                              Ordinal:{' '}
                              {userInfo.ordinalDetails ||
                                currentUser?.ordinalDetails?.ordinalDetails}
                            </div>
                          )}
                          {/* Show fallback if neither ENS nor Ordinal */}
                          {!(
                            userInfo.ensName || currentUser?.ensDetails?.ensName
                          ) &&
                            !(
                              userInfo.ordinalDetails ||
                              currentUser?.ordinalDetails?.ordinalDetails
                            ) && <div>No ENS or Ordinal verification</div>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getVerificationIcon()}
                          <Badge className={getVerificationColor()}>
                            {getVerificationText()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyber-neutral uppercase tracking-wide">
                      Wallet Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-cyber-neutral">
                          Address
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 font-mono text-sm bg-cyber-dark/50 border border-cyber-muted/30 px-3 py-2 rounded-md text-cyber-light">
                            {currentUser.address.slice(0, 8)}...
                            {currentUser.address.slice(-6)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(currentUser.address, 'Address')
                            }
                            className="border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-cyber-neutral">
                          Network
                        </Label>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyber-neutral" />
                          <Badge
                            variant="outline"
                            className="capitalize bg-cyber-accent/20 text-cyber-accent border-cyber-accent/30"
                          >
                            {currentUser.walletType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-cyber-neutral uppercase tracking-wide">
                      Profile Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="callSign"
                          className="text-sm font-medium text-cyber-neutral"
                        >
                          Call Sign
                        </Label>
                        {isEditing ? (
                          <Input
                            id="callSign"
                            value={callSign}
                            onChange={e => setCallSign(e.target.value)}
                            placeholder="Enter your call sign"
                            className="bg-cyber-dark/50 border-cyber-muted/30 text-cyber-light"
                            disabled={isSubmitting}
                          />
                        ) : (
                          <div className="text-sm bg-cyber-dark/50 border border-cyber-muted/30 px-3 py-2 rounded-md text-cyber-light">
                            {userInfo.callSign ||
                              currentUser.callSign ||
                              'Not set'}
                          </div>
                        )}
                        <p className="text-xs text-cyber-neutral">
                          3-20 characters, letters, numbers, underscores, and
                          hyphens only
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="displayPreference"
                          className="text-sm font-medium text-cyber-neutral"
                        >
                          Display Preference
                        </Label>
                        {isEditing ? (
                          <Select
                            value={displayPreference}
                            onValueChange={value =>
                              setDisplayPreference(value as EDisplayPreference)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="bg-cyber-dark/50 border-cyber-muted/30 text-cyber-light">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-cyber-dark border-cyber-muted/30">
                              <SelectItem
                                value={EDisplayPreference.CALL_SIGN}
                                className="text-cyber-light hover:bg-cyber-muted/30"
                              >
                                Call Sign (when available)
                              </SelectItem>
                              <SelectItem
                                value={EDisplayPreference.WALLET_ADDRESS}
                                className="text-cyber-light hover:bg-cyber-muted/30"
                              >
                                Wallet Address
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm bg-cyber-dark/50 border border-cyber-muted/30 px-3 py-2 rounded-md text-cyber-light">
                            {(userInfo.displayPreference ||
                              displayPreference) ===
                            EDisplayPreference.CALL_SIGN
                              ? 'Call Sign (when available)'
                              : 'Wallet Address'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-cyber-muted/30">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="bg-cyber-accent hover:bg-cyber-accent/80 text-black font-mono"
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Security Status Card - Secondary (1/3 width) */}
            <div className="grid-sidebar">
              <Card className="content-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-cyber-accent" />
                      Security
                    </div>
                    {(delegationStatus.hasDelegation ||
                      delegationInfo?.hasDelegation) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWalletWizardOpen(true)}
                        className="border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {delegationStatus.isValid || delegationInfo?.isValid
                          ? 'Renew'
                          : 'Setup'}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delegation Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-cyber-neutral">
                        Delegation
                      </span>
                      <Badge
                        variant={
                          delegationStatus.isValid || delegationInfo?.isValid
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          delegationStatus.isValid || delegationInfo?.isValid
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {delegationStatus.isValid || delegationInfo?.isValid
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Expiry Date */}
                    {(delegationStatus.expiresAt ||
                      currentUser.delegationExpiry) && (
                      <div className="space-y-1">
                        <span className="text-xs text-cyber-neutral">
                          Valid until
                        </span>
                        <div className="text-sm font-mono text-cyber-light">
                          {(
                            delegationStatus.expiresAt ||
                            new Date(currentUser.delegationExpiry!)
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* Signature Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-cyber-neutral">
                        Signature
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          delegationStatus.isValid ||
                          currentUser.delegationSignature === 'valid'
                            ? 'text-green-400 border-green-500/30 bg-green-500/10'
                            : 'text-red-400 border-red-500/30 bg-red-500/10'
                        }
                      >
                        {delegationStatus.isValid ||
                        currentUser.delegationSignature === 'valid'
                          ? 'Valid'
                          : 'Not signed'}
                      </Badge>
                    </div>
                  </div>

                  {/* Browser Public Key */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-cyber-neutral">
                      Browser Public Key
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-xs bg-cyber-dark/50 border border-cyber-muted/30 px-2 py-1 rounded text-cyber-light">
                        {delegationStatus.publicKey || currentUser.browserPubKey
                          ? `${(delegationStatus.publicKey || currentUser.browserPubKey!).slice(0, 12)}...${(delegationStatus.publicKey || currentUser.browserPubKey!).slice(-8)}`
                          : 'Not delegated'}
                      </div>
                      {(delegationStatus.publicKey ||
                        currentUser.browserPubKey) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              delegationStatus.publicKey ||
                                currentUser.browserPubKey!,
                              'Public Key'
                            )
                          }
                          className="border-cyber-muted/30 text-cyber-neutral hover:bg-cyber-muted/30"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Warning for expired delegation */}
                  {(!delegationStatus.isValid &&
                    delegationStatus.hasDelegation) ||
                    (!delegationInfo?.isValid &&
                      delegationInfo?.hasDelegation && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-md">
                          <div className="flex items-center gap-2 text-orange-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-medium">
                              Delegation expired. Renew to continue using your
                              browser key.
                            </span>
                          </div>
                        </div>
                      ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="page-footer">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>

      {/* Wallet Wizard */}
      <WalletWizard
        open={walletWizardOpen}
        onOpenChange={setWalletWizardOpen}
        onComplete={() => setWalletWizardOpen(false)}
      />
    </div>
  );
}
