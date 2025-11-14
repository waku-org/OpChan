import React from 'react';

interface GreentextRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders text with greentext support (lines starting with > are colored green)
 * 4chan-style formatting
 */
export const GreentextRenderer: React.FC<GreentextRendererProps> = ({ 
  text, 
  className = '' 
}) => {
  const lines = text.split('\n');
  
  return (
    <div className={className}>
      {lines.map((line, index) => {
        const isGreentext = line.trim().startsWith('>');
        
        return (
          <div
            key={index}
            className={isGreentext ? 'text-green-400' : ''}
          >
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
          </div>
        );
      })}
    </div>
  );
};

