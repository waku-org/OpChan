import { useState, useEffect } from 'react';
import { useAuth, useUserActions, useForumActions } from '@/hooks';
import { useUserDisplay } from '@/hooks';
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
import { Separator } from '@/components/ui/separator';
import { WalletWizard } from '@/components/ui/wallet-wizard';
import {
  Loader2,
  Wallet,
  Hash,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { EDisplayPreference, EVerificationStatus } from '@/types/identity';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { updateProfile } = useUserActions();
  const { refreshData } = useForumActions();
  const { toast } = useToast();

  // Get current user from auth context for the address
  const { currentUser, delegationInfo } = useAuth();
  const address = currentUser?.address;

  // Get comprehensive user information from the unified hook
  const userInfo = useUserDisplay(address || '');

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callSign, setCallSign] = useState(currentUser?.callSign || '');
  const [displayPreference, setDisplayPreference] = useState(
    currentUser?.displayPreference || EDisplayPreference.WALLET_ADDRESS
  );
  const [walletWizardOpen, setWalletWizardOpen] = useState(false);

  // Update local state when user data changes
  useEffect(() => {
    if (currentUser) {
      setCallSign(currentUser.callSign || '');
      setDisplayPreference(
        currentUser.displayPreference || EDisplayPreference.WALLET_ADDRESS
      );
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Please connect your wallet to view your profile.
            </div>
          </CardContent>
        </Card>
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
    setCallSign(currentUser.callSign || '');
    setDisplayPreference(currentUser.displayPreference);
    setIsEditing(false);
  };

  const getVerificationIcon = () => {
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.VERIFIED_OWNER:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case EVerificationStatus.VERIFIED_BASIC:
        return <Shield className="h-4 w-4 text-blue-500" />;
      case EVerificationStatus.UNVERIFIED:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getVerificationText = () => {
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.VERIFIED_OWNER:
        return 'Fully Verified';
      case EVerificationStatus.VERIFIED_BASIC:
        return 'Basic Verification';
      case EVerificationStatus.UNVERIFIED:
        return 'Unverified';
      default:
        return 'Unknown';
    }
  };

  const getVerificationColor = () => {
    switch (userInfo.verificationLevel) {
      case EVerificationStatus.VERIFIED_OWNER:
        return 'bg-green-100 text-green-800 border-green-200';
      case EVerificationStatus.VERIFIED_BASIC:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EVerificationStatus.UNVERIFIED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wallet Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Address
                </Label>
                <div className="mt-1 font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">
                  {currentUser.address}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Network
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {currentUser.walletType}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Identity Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  ENS Name
                </Label>
                <div className="mt-1 text-sm">
                  {currentUser.ensDetails?.ensName || 'N/A'}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Current Display Name
                </Label>
                <div className="mt-1 text-sm font-medium">
                  {userInfo.displayName}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editable Profile Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Profile Settings</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="callSign" className="text-sm font-medium">
                  Call Sign
                </Label>
                {isEditing ? (
                  <Input
                    id="callSign"
                    value={callSign}
                    onChange={e => setCallSign(e.target.value)}
                    placeholder="Enter your call sign"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="mt-1 text-sm bg-muted px-3 py-2 rounded-md">
                    {userInfo.callSign || currentUser.callSign || 'Not set'}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  3-20 characters, letters, numbers, underscores, and hyphens
                  only
                </p>
              </div>

              <div>
                <Label
                  htmlFor="displayPreference"
                  className="text-sm font-medium"
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
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EDisplayPreference.CALL_SIGN}>
                        Call Sign (when available)
                      </SelectItem>
                      <SelectItem value={EDisplayPreference.WALLET_ADDRESS}>
                        Wallet Address
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 text-sm bg-muted px-3 py-2 rounded-md">
                    {(userInfo.displayPreference || displayPreference) ===
                    EDisplayPreference.CALL_SIGN
                      ? 'Call Sign (when available)'
                      : 'Wallet Address'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Verification Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verification Status
            </h3>
            <div className="flex items-center gap-3">
              {getVerificationIcon()}
              <Badge className={getVerificationColor()}>
                {getVerificationText()}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Delegation Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Key Delegation
            </h3>
            <div className="space-y-4">
              {/* Delegation Status */}
              <div className="flex items-center gap-3">
                <Badge 
                  variant={delegationInfo.isActive ? "default" : "secondary"}
                  className={delegationInfo.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {delegationInfo.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {delegationInfo.isActive && delegationInfo.timeRemaining && (
                  <span className="text-sm text-muted-foreground">
                    {delegationInfo.timeRemaining} remaining
                  </span>
                )}
                {delegationInfo.needsRenewal && !delegationInfo.isExpired && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Renewal Recommended
                  </Badge>
                )}
                {delegationInfo.isExpired && (
                  <Badge variant="destructive">
                    Expired
                  </Badge>
                )}
              </div>

              {/* Delegation Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Browser Public Key
                  </Label>
                  <div className="mt-1 text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
                    {currentUser.browserPubKey ? (
                      `${currentUser.browserPubKey.slice(0, 12)}...${currentUser.browserPubKey.slice(-8)}`
                    ) : 'Not delegated'}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Delegation Signature
                  </Label>
                  <div className="mt-1 text-sm">
                    {currentUser.delegationSignature === 'valid' ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Valid
                      </Badge>
                    ) : (
                      'Not signed'
                    )}
                  </div>
                </div>

                {currentUser.delegationExpiry && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Expires At
                    </Label>
                    <div className="mt-1 text-sm">
                      {new Date(currentUser.delegationExpiry).toLocaleString()}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </Label>
                  <div className="mt-1 text-sm">
                    {currentUser.lastChecked ? 
                      new Date(currentUser.lastChecked).toLocaleString() : 
                      'Never'
                    }
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Can Delegate
                  </Label>
                  <div className="mt-1 text-sm">
                    {delegationInfo.canDelegate ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        No
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Delegation Actions */}
              {delegationInfo.canDelegate && (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setWalletWizardOpen(true)}
                  >
                    {delegationInfo.isActive ? 'Renew Delegation' : 'Delegate Key'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wallet Wizard */}
      <WalletWizard
        open={walletWizardOpen}
        onOpenChange={setWalletWizardOpen}
        onComplete={() => setWalletWizardOpen(false)}
      />
    </div>
  );
}
