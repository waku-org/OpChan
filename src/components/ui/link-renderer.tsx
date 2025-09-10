import React from 'react';

interface LinkRendererProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with clickable links
 * Detects URLs and converts them to clickable <a> tags
 */
export const LinkRenderer: React.FC<LinkRendererProps> = ({ text, className }) => {
  // URL regex pattern that matches http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split text by URLs and create array of text segments and URLs
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a URL
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-accent hover:text-cyber-accent/80 underline transition-colors"
            >
              {part}
            </a>
          );
        }
        // Regular text
        return part;
      })}
    </span>
  );
};

export default LinkRenderer;
