import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CypherImage } from './ui/CypherImage';

// Mock external dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null)[]) =>
    classes.filter(Boolean).join(' '),
}));

describe('Create Cell Without Icon - CypherImage Fallback', () => {
  it('shows fallback identicon when src is empty (simulating cell without icon)', () => {
    render(
      <CypherImage
        src=""
        alt="Test Cell"
        className="w-16 h-16"
        generateUniqueFallback={true}
      />
    );

    // Verify that the fallback identicon is rendered instead of an img tag
    const identicon = screen.getByTitle('Test Cell');
    expect(identicon).toBeInTheDocument();

    // Check for the fallback identicon characteristics
    expect(identicon).toHaveClass('flex', 'items-center', 'justify-center');

    // The fallback should contain the first letter of the alt text (cell name)
    const firstLetter = screen.getByText('T'); // First letter of "Test Cell"
    expect(firstLetter).toBeInTheDocument();
    expect(firstLetter).toHaveClass('font-bold');

    // Should not render an img element when src is empty
    const imgElement = screen.queryByRole('img');
    expect(imgElement).not.toBeInTheDocument();
  });

  it('shows fallback identicon when src is undefined (simulating cell without icon)', () => {
    render(
      <CypherImage
        src={undefined}
        alt="Another Cell"
        className="w-16 h-16"
        generateUniqueFallback={true}
      />
    );

    // Verify that the fallback identicon is rendered
    const identicon = screen.getByTitle('Another Cell');
    expect(identicon).toBeInTheDocument();

    // The fallback should contain the first letter of the alt text
    const firstLetter = screen.getByText('A'); // First letter of "Another Cell"
    expect(firstLetter).toBeInTheDocument();

    // Should not render an img element when src is undefined
    const imgElement = screen.queryByRole('img');
    expect(imgElement).not.toBeInTheDocument();
  });

  it('shows fallback identicon with correct cyberpunk styling', () => {
    render(
      <CypherImage
        src=""
        alt="Cyberpunk Cell"
        className="w-16 h-16"
        generateUniqueFallback={true}
      />
    );

    const identicon = screen.getByTitle('Cyberpunk Cell');

    // Check for cyberpunk styling elements
    expect(identicon).toHaveStyle({ backgroundColor: '#0a1119' });

    // Check that the first letter is rendered with appropriate styling
    const firstLetter = screen.getByText('C');
    expect(firstLetter).toHaveClass(
      'relative',
      'font-bold',
      'cyberpunk-glow',
      'z-10'
    );
  });

  it('renders normal img when src is provided (control test)', () => {
    render(
      <CypherImage
        src="https://example.com/valid-image.jpg"
        alt="Valid Image Cell"
        className="w-16 h-16"
      />
    );

    // Should render an img element when src is provided
    const imgElement = screen.getByRole('img');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute(
      'src',
      'https://example.com/valid-image.jpg'
    );
    expect(imgElement).toHaveAttribute('alt', 'Valid Image Cell');

    // Should not show fallback identicon when image src is provided
    const identicon = screen.queryByTitle('Valid Image Cell');
    expect(identicon).not.toBeInTheDocument();
  });

  it('generates unique fallbacks for different cell names', () => {
    const { rerender } = render(
      <CypherImage src="" alt="Alpha Cell" generateUniqueFallback={true} />
    );

    const alphaLetter = screen.getByText('A');
    expect(alphaLetter).toBeInTheDocument();

    rerender(
      <CypherImage src="" alt="Beta Cell" generateUniqueFallback={true} />
    );

    const betaLetter = screen.getByText('B');
    expect(betaLetter).toBeInTheDocument();

    // Alpha should no longer be present
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});
