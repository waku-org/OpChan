import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Hash } from 'lucide-react';
import { useAuth, useUserActions, useForumActions } from '@/hooks';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EDisplayPreference } from 'opchan-core/types/identity';

const formSchema = z.object({
  callSign: z
    .string()
    .min(3, 'Call sign must be at least 3 characters')
    .max(20, 'Call sign must be less than 20 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Only letters, numbers, hyphens, and underscores allowed'
    )
    .refine(val => !/[-_]{2,}/.test(val), 'No consecutive special characters'),
  displayPreference: z.nativeEnum(EDisplayPreference),
});

interface CallSignSetupDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CallSignSetupDialog({
  open: externalOpen,
  onOpenChange,
}: CallSignSetupDialogProps = {}) {
  const { currentUser } = useAuth();
  const { updateProfile } = useUserActions();
  const { refreshData } = useForumActions();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = externalOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      callSign: currentUser?.callSign || '',
      displayPreference:
        currentUser?.displayPreference || EDisplayPreference.WALLET_ADDRESS,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // ✅ All validation and logic handled in hook
    const success = await updateProfile({
      callSign: values.callSign,
      displayPreference: values.displayPreference,
    });

    if (success) {
      // Refresh forum data to update user display
      await refreshData();
      setOpen(false);
      form.reset();
    }

    setIsSubmitting(false);
  };

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Setup Call Sign
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Setup Call Sign & Display Preferences</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="callSign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Call Sign
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your call sign (e.g., cypherpunk_42)"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a unique identifier (3-20 characters, letters,
                    numbers, hyphens, underscores)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Preference</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select display preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EDisplayPreference.CALL_SIGN}>
                        Call Sign (when available)
                      </SelectItem>
                      <SelectItem value={EDisplayPreference.WALLET_ADDRESS}>
                        Wallet Address
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how your name appears in the forum
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Profile
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CallSignSetupDialog;
