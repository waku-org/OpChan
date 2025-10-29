import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hash, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks';
import { EVerificationStatus } from '@opchan/core';
import { useToast } from '@/hooks/use-toast';

export function InlineCallSignInput() {
  const { currentUser, updateProfile } = useAuth();
  const { toast } = useToast();
  const [callSign, setCallSign] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show for anonymous users without call sign
  if (!currentUser || currentUser.verificationStatus !== EVerificationStatus.ANONYMOUS) {
    return null;
  }

  // If user already has a call sign, don't show this
  if (currentUser.callSign) {
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedCallSign = callSign.trim();
    
    // Validation
    if (!trimmedCallSign) {
      toast({
        title: 'Call Sign Required',
        description: 'Please enter a call sign to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedCallSign.length < 3) {
      toast({
        title: 'Call Sign Too Short',
        description: 'Call sign must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedCallSign.length > 20) {
      toast({
        title: 'Call Sign Too Long',
        description: 'Call sign must be less than 20 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedCallSign)) {
      toast({
        title: 'Invalid Characters',
        description: 'Only letters, numbers, hyphens, and underscores allowed.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await updateProfile({ 
        callSign: trimmedCallSign 
      });
      
      if (success) {
        toast({
          title: 'Call Sign Set!',
          description: `You're now known as ${trimmedCallSign}`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to set call sign. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting call sign:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border border-cyber-muted rounded-sm bg-cyber-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="w-4 h-4 text-cyber-accent" />
        <p className="text-sm font-medium">Set a call sign to participate</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Choose a unique identifier to personalize your anonymous identity
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="your_call_sign"
          value={callSign}
          onChange={(e) => setCallSign(e.target.value)}
          disabled={isSubmitting}
          className="bg-cyber-muted/50 border-cyber-muted"
          maxLength={20}
        />
        <Button 
          type="submit"
          disabled={isSubmitting || !callSign.trim()}
          className="bg-cyber-accent hover:bg-cyber-accent/80 text-black"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Setting...
            </>
          ) : (
            'Set Call Sign'
          )}
        </Button>
      </form>
    </div>
  );
}

