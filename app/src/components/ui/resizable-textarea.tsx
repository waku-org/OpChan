import * as React from 'react';
import { Resizable } from 're-resizable';

import { cn } from '@opchan/core';
import { Textarea } from '@/components/ui/textarea';

type ResizableTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
};

export const ResizableTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ResizableTextareaProps
>(
  (
    {
      className,
      initialHeight = 120,
      minHeight = 80,
      maxHeight = 800,
      ...textareaProps
    },
    ref
  ) => {
    const [height, setHeight] = React.useState<number>(initialHeight);

    const isDisabled = Boolean(textareaProps.disabled);

    return (
      <Resizable
        size={{ width: '100%', height }}
        enable={{
          top: false,
          right: false,
          bottom: !isDisabled,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        minHeight={minHeight}
        maxHeight={maxHeight}
        onResizeStop={(_event, _dir, _elementRef, delta) => {
          setHeight(current => Math.max(minHeight, Math.min(maxHeight, current + delta.height)));
        }}
        handleComponent={{
          bottom: (
            <div
              className="w-full h-2 cursor-row-resize bg-border/40 hover:bg-border rounded-b-[3px]"
              aria-label="Resize textarea"
            />
          ),
        }}
        handleStyles={{ bottom: { bottom: 0 } }}
        className="mb-3"
      >
        <Textarea
          ref={ref}
          {...textareaProps}
          className={cn('h-full resize-none', className)}
          style={{ height: '100%' }}
        />
      </Resizable>
    );
  }
);

ResizableTextarea.displayName = 'ResizableTextarea';

export default ResizableTextarea;


