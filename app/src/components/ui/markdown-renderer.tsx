import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders sanitized Markdown with GFM support and 4chan-style greentext.
 * Lines starting with > are rendered in green.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
}) => {
  // Extend sanitize schema to allow common markdown elements (headings, lists, code, tables, etc.)
  const schema: typeof defaultSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'del',
      'blockquote',
      'hr',
      'code',
      'pre',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'span',
    ],
    attributes: {
      ...defaultSchema.attributes,
      a: [
        ...(defaultSchema.attributes?.a || []),
        ['href'],
        ['target'],
        ['rel'],
      ],
      img: [
        ...(defaultSchema.attributes?.img || []),
        ['src'],
        ['alt'],
        ['title'],
      ],
      code: [...(defaultSchema.attributes?.code || []), ['className']],
      span: [['className']],
    },
  };

  // Preprocess content to wrap greentext lines (lines starting with >) in special markers
  // We'll handle this by checking for lines that start with > but aren't markdown quotes (>>)
  const processedContent = content
    .split('\n')
    .map(line => {
      // Check if line starts with > but not >> (markdown quote)
      // and not a quote block (which would be > followed by space typically)
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('>') && !trimmedLine.startsWith('>>')) {
        // Wrap in a span with greentext class
        return `<span class="greentext">${line}</span>`;
      }
      return line;
    })
    .join('\n');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          p: ({ children, ...props }) => {
            // Check if this paragraph contains greentext
            const childText = String(children);
            if (childText.trim().startsWith('>')) {
              return (
                <p {...props} className="text-green-400 my-1">
                  {children}
                </p>
              );
            }
            return <p {...props}>{children}</p>;
          },
        }}
      >
        {content || ''}
      </ReactMarkdown>
      <style>{`
        .greentext {
          color: rgb(74 222 128);
        }
      `}</style>
    </div>
  );
};

export default MarkdownRenderer;
