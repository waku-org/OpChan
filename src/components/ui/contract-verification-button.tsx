import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';

interface ContractVerificationButtonProps {
  onVerify: () => Promise<string | null>;
  isVerifying: boolean;
  verificationType: 'adult' | 'country' | 'gender';
}

export function ContractVerificationButton({
  onVerify,
  isVerifying,
}: ContractVerificationButtonProps) {
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleVerify = async () => {
    setTxStatus('pending');
    setTxHash(null);
    try {
      const hash = await onVerify();
      console.log(hash)
      if (hash) {
        console.log("Setting TX hash")
        setTxHash(hash);
        setTxStatus('success');
      } else {
        setTxStatus('error');
      }
      setTimeout(() => {
        setTxStatus('idle');
        setTxHash(null);
      }, 60000);
    } catch (error) {
      setTxStatus('error');
      setTimeout(() => setTxStatus('idle'), 3000);
    }
  };

  const getButtonText = () => {
    if (txStatus === 'pending') return 'Recording...';
    if (txStatus === 'success') return txHash ? 'Recorded on chain!' : 'Success!';
    if (txStatus === 'error') return 'Error';
    return `Record Verified Claims`;
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleVerify}
        disabled={isVerifying || txStatus === 'pending'}
        className="w-full bg-cyber-accent hover:bg-cyber-accent/80 text-black font-mono"
      >
        {txStatus === 'pending' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {getButtonText()}
          </>
        ) : txStatus === 'success' ? (
          <>
            <Send className="mr-2 h-4 w-4" />
            {getButtonText()}
          </>
        ) : txStatus === 'error' ? (
          <>
            <span className="mr-2">⚠</span>
            {getButtonText()}
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            {getButtonText()}
          </>
        )}
      </Button>
      
      {txStatus === 'success' && txHash && (
        <div className="text-center text-xs text-cyber-neutral bg-cyber-dark/30 p-2 rounded border border-cyber-muted/30 font-mono">
          TX: <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyber-accent hover:underline"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-18)}
          </a>
        </div>
      )}
    </div>
  );
}
