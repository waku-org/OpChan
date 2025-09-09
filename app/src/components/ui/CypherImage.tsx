import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type CypherImageProps = {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  generateUniqueFallback?: boolean;
} & Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'className'
>;

/**
 * CypherImage component that renders a cypherpunk-style fallback image
 * when the actual image cannot be loaded.
 */
export function CypherImage({
  src,
  alt,
  className,
  fallbackClassName,
  generateUniqueFallback = false,
  ...props
}: CypherImageProps) {
  const [imageError, setImageError] = useState(false);

  // Generate a seed based on the alt text or src to create consistent fallbacks for the same resource
  const seed = generateUniqueFallback
    ? (alt || src || 'fallback')
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;

  // Handle image load error
  const handleError = () => {
    setImageError(true);
  };

  if (imageError || !src || src.trim() === '') {
    // Generate some values based on the seed for variety
    const hue = (seed % 60) + 140; // Cyan-ish colors (140-200)
    const gridSize = (seed % 8) + 8; // 8-16px
    const noiseIntensity = (seed % 30) + 5; // 5-35%
    const scanlineOpacity = ((seed % 4) + 1) / 10; // 0.1-0.5

    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden relative',
          className,
          fallbackClassName
        )}
        title={alt}
        aria-label={alt}
        style={{
          backgroundColor: '#0a1119',
          backgroundImage: `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.9) 25%, 
              rgba(${hue / 3}, ${hue}, ${hue}, 0.15) 25%, 
              rgba(${hue / 3}, ${hue}, ${hue}, 0.15) 50%, 
              rgba(0, 0, 0, 0.9) 50%, 
              rgba(0, 0, 0, 0.9) 75%, 
              rgba(${hue / 3}, ${hue}, ${hue}, 0.15) 75%)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          boxShadow: 'inset 0 0 30px rgba(0, 255, 170, 0.2)',
        }}
        {...props}
      >
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${noiseIntensity / 100}'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            background: `repeating-linear-gradient(
              to bottom,
              transparent,
              transparent 1px,
              rgba(0, 255, 170, ${scanlineOpacity}) 1px,
              rgba(0, 255, 170, ${scanlineOpacity}) 2px
            )`,
          }}
        />

        {/* CRT glow effect */}
        <div className="absolute inset-0 opacity-10 bg-cyan-500 blur-xl"></div>

        <div className="relative w-full h-full flex items-center justify-center">
          {/* Glitch effect lines */}
          <div
            className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{
              top: `${(seed % 70) + 15}%`,
              opacity: 0.4,
              boxShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
              transform: `skewY(${(seed % 5) - 2.5}deg)`,
            }}
          />

          {/* Main content container with glitch effect */}
          <div
            className="relative flex items-center justify-center"
            style={{
              textShadow:
                '0 0 5px rgba(0, 255, 255, 0.8), 0 0 10px rgba(0, 255, 255, 0.5)',
            }}
          >
            {/* Glitched text behind the main letter */}
            <div
              className="absolute font-mono opacity-70"
              style={{
                color: `hsl(${hue}, 100%, 70%)`,
                transform: `translate(${(seed % 5) - 2.5}px, ${(seed % 5) - 2.5}px)`,
              }}
            >
              {Array.from({ length: 3 }, (_, i) => {
                const chars = '01[]{}><#$%&@!?;:+=*/\\|~^';
                return chars[(seed + i) % chars.length];
              }).join('')}
            </div>

            {/* First letter of alt text in center */}
            <div
              className="relative font-bold text-2xl md:text-3xl cyberpunk-glow z-10"
              style={{ color: `hsl(${hue}, 100%, 80%)` }}
            >
              {alt.charAt(0).toUpperCase()}
            </div>

            {/* Random characters that occasionally "glitch" in */}
            <div
              className="absolute font-mono text-xs text-cyan-400 opacity-80 z-0"
              style={{
                bottom: '20%',
                right: '20%',
                transform: `rotate(${(seed % 20) - 10}deg)`,
                mixBlendMode: 'screen',
              }}
            >
              {seed.toString(16).substring(0, 4)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}
