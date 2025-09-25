import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useContent, usePermissions } from '@/hooks';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { urlLoads } from '@/utils';

const formSchema = z.object({
  title: z
    .string()
    .min(3, 'Cell name must be at least 3 characters')
    .max(50, 'Cell name must be less than 50 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  icon: z
    .string()
    .optional()
    .refine(
      val => {
        if (!val) return true;
        return urlLoads(val);
      },
      {
        message: 'Icon must be a valid URL',
      }
    ),
});

interface CreateCellDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateCellDialog({
  open: externalOpen,
  onOpenChange,
}: CreateCellDialogProps = {}) {
  const { createCell } = useContent();
  const isCreatingCell = false;
  const { canCreateCell } = usePermissions();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = externalOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      icon: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!canCreateCell) {
      toast({
        title: 'Permission Denied',
        description: 'Only verified ENS or Logos Ordinal owners can create cells.',
        variant: 'destructive',
      });
      return;
    }

    const cell = await createCell({
      name: values.title,
      description: values.description,
      icon: values.icon,
    });
    if (cell) {
      form.reset();
      setOpen(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isCreatingCell && canCreateCell) {
        form.handleSubmit(onSubmit)();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-cyber-accent hover:bg-cyber-accent/80">
          Create Cell
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-cyber-dark border-cyber-muted">
        <DialogHeader>
          <DialogTitle className="text-glow">Create New Cell</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={handleKeyDown}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cell Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter cell name"
                      className="bg-cyber-muted/50 border-cyber-muted"
                      disabled={isCreatingCell}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your cell"
                      className="bg-cyber-muted/50 border-cyber-muted resize-none"
                      disabled={isCreatingCell}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/icon.png"
                      className="bg-cyber-muted/50 border-cyber-muted"
                      disabled={isCreatingCell}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isCreatingCell}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCell || !canCreateCell}
                className="bg-cyber-accent hover:bg-cyber-accent/80"
              >
                {isCreatingCell ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Cell'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
