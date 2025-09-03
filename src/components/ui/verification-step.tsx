import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Bitcoin,
  Coins,
  Shield,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useAppKitAccount } from '@reown/appkit/react';
import { OrdinalDetails, EnsDetails } from '@/types/identity';

interface VerificationStepProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function VerificationStep({
  onComplete,
  onBack,
  isLoading,
  setIsLoading,
}: VerificationStepProps) {
  const { currentUser, verificationStatus, verifyOwnership, isAuthenticating } =
    useAuth();

  // Get account info to determine wallet type
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });

  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const walletType = isBitcoinConnected
    ? 'bitcoin'
    : isEthereumConnected
      ? 'ethereum'
      : undefined;

  const [verificationResult, setVerificationResult] = React.useState<{
    success: boolean;
    message: string;
    details?: OrdinalDetails | EnsDetails;
  } | null>(null);

  const handleVerify = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setVerificationResult(null);

    try {
      const success = await verifyOwnership();

      if (success) {
        setVerificationResult({
          success: true,
          message:
            walletType === 'bitcoin'
              ? 'Ordinal ownership verified successfully!'
              : 'ENS ownership verified successfully!',
          details:
            walletType === 'bitcoin'
              ? currentUser.ordinalDetails
              : currentUser.ensDetails,
        });
      } else {
        setVerificationResult({
          success: false,
          message:
            walletType === 'bitcoin'
              ? 'No Ordinal ownership found. You can still participate in the forum with your connected wallet!'
              : 'No ENS ownership found. You can still participate in the forum with your connected wallet!',
        });
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        message: `Verification failed. Please try again: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    onComplete();
  };

  const getVerificationType = () => {
    return walletType === 'bitcoin' ? 'Bitcoin Ordinal' : 'Ethereum ENS';
  };

  const getVerificationIcon = () => {
    return walletType === 'bitcoin' ? Bitcoin : Coins;
  };

  const getVerificationColor = () => {
    return walletType === 'bitcoin' ? 'text-orange-500' : 'text-blue-500';
  };

  const getVerificationDescription = () => {
    if (walletType === 'bitcoin') {
      return "Verify your Bitcoin Ordinal ownership to unlock premium features. If you don't own any Ordinals, you can still participate in the forum with your connected wallet.";
    } else {
      return "Verify your Ethereum ENS ownership to unlock premium features. If you don't own any ENS, you can still participate in the forum with your connected wallet.";
    }
  };

  // Show verification result
  if (verificationResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div
            className={`p-4 rounded-lg border ${
              verificationResult.success
                ? 'bg-green-900/20 border-green-500/30'
                : 'bg-yellow-900/20 border-yellow-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {verificationResult.success ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span
                className={`font-medium ${
                  verificationResult.success
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }`}
              >
                {verificationResult.success
                  ? 'Verification Complete'
                  : 'Verification Result'}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              {verificationResult.message}
            </p>
            {verificationResult.details && (
              <div className="text-xs text-neutral-400">
                {walletType === 'bitcoin' ? (
                  <p>
                    Ordinal ID:{' '}
                    {typeof verificationResult.details === 'object' &&
                    'ordinalId' in verificationResult.details
                      ? verificationResult.details.ordinalId
                      : 'Verified'}
                  </p>
                ) : (
                  <p>
                    ENS Name:{' '}
                    {typeof verificationResult.details === 'object' &&
                    'ensName' in verificationResult.details
                      ? verificationResult.details.ensName
                      : 'Verified'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Show verification status
  if (verificationStatus === 'verified-owner') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <span className="text-green-400 font-medium">
                Already Verified
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              Your {getVerificationType()} ownership has been verified.
            </p>
            {currentUser && (
              <div className="text-xs text-neutral-400">
                {walletType === 'bitcoin' && <p>Ordinal ID: Verified</p>}
                {walletType === 'ethereum' && <p>ENS Name: Verified</p>}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Show verification form
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {React.createElement(getVerificationIcon(), {
              className: `h-8 w-8 ${getVerificationColor()}`,
            })}
          </div>
          <h3 className="text-lg font-semibold text-white">
            Verify {getVerificationType()} Ownership
          </h3>
          <p className="text-sm text-neutral-400">
            {getVerificationDescription()}
          </p>
        </div>

        <div className="p-4 bg-neutral-900/50 border border-neutral-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-white">
              What happens during verification?
            </span>
          </div>
          <ul className="text-xs text-neutral-400 space-y-1">
            {walletType === 'bitcoin' ? (
              <>
                <li>• We'll check your wallet for Bitcoin Ordinal ownership</li>
                <li>• If found, you'll get full posting and voting access</li>
                <li>• If not found, you'll have read-only access</li>
              </>
            ) : (
              <>
                <li>• We'll check your wallet for ENS domain ownership</li>
                <li>• If found, you'll get full posting and voting access</li>
                <li>• If not found, you'll have read-only access</li>
              </>
            )}
          </ul>
        </div>

        <div className="text-xs text-neutral-500 text-center">
          Verification is required to access posting and voting features
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3">
        <Button
          onClick={handleVerify}
          disabled={isLoading || isAuthenticating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading || isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            `Verify ${getVerificationType()} Ownership`
          )}
        </Button>

        <Button
          onClick={onBack}
          variant="outline"
          className="w-full border-neutral-600 text-neutral-400 hover:bg-neutral-800"
          disabled={isLoading || isAuthenticating}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
