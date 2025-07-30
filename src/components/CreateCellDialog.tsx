import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useForum } from "@/contexts/ForumContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { urlLoads } from "@/lib/utils/urlLoads";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(50, "Title must be less than 50 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(200, "Description must be less than 200 characters"),
  icon: z
    .string()
    .optional()
    .refine((val) => !val || val.length === 0 || URL.canParse(val), {
      message: "Must be a valid URL"
    }),
});

export function CreateCellDialog() {
  const { createCell, isPostingCell } = useForum();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      icon: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate icon URL if provided
    if (values.icon && values.icon.trim()) {
      const ok = await urlLoads(values.icon, 5000);
      if (!ok) {
        toast({
          title: "Icon URL Error",
          description: "Icon URL could not be loaded. Please check the URL and try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const cell = await createCell(values.title, values.description, values.icon || undefined);
    if (cell) {
      setOpen(false);
      form.reset();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Create New Cell</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Cell</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cell title" {...field} disabled={isPostingCell} />
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
                      placeholder="Enter cell description"
                      {...field}
                      disabled={isPostingCell}
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
                  <FormLabel>Icon URL (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter icon URL (optional)"
                      type="url"
                      {...field}
                      value={field.value || ""}
                      disabled={isPostingCell}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={isPostingCell}
            >
              {isPostingCell && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Cell
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
