import React from 'react';
import ResizableTextarea from '@/components/ui/resizable-textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './markdown-renderer';

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
  initialHeight?: number;
  maxHeight?: number;
}

/**
 * Textarea with Markdown preview tabs.
 */
export const MarkdownInput: React.FC<MarkdownInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  minHeight,
  initialHeight,
  maxHeight,
}) => {
  const [tab, setTab] = React.useState<'write' | 'preview'>('write');

  return (
    <div className={className}>
      <Tabs value={tab} onValueChange={v => setTab(v as 'write' | 'preview')}>
        <TabsList className="mb-2">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="write">
          <ResizableTextarea
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-cyber-muted/50 border-cyber-muted"
            disabled={disabled}
            minHeight={minHeight}
            initialHeight={initialHeight}
            maxHeight={maxHeight}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 mb-2">
            <span>Markdown supported • Ctrl+Enter or Shift+Enter to send</span>
            <button
              type="button"
              className="underline hover:opacity-80"
              onClick={() => setTab('preview')}
            >
              Preview
            </button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="p-3 border rounded-sm bg-card">
            <MarkdownRenderer
              content={value}
              className="prose prose-invert max-w-none"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarkdownInput;
