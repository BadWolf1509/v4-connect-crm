import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../components/badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(<Badge>Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge.tagName).toBe('DIV');
    });

    it('should render children correctly', () => {
      render(
        <Badge>
          <span data-testid="child">Child</span>
        </Badge>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply default variant classes', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-v4-red-500/10');
      expect(badge).toHaveClass('text-v4-red-500');
    });

    it('should apply secondary variant classes', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-gray-800');
      expect(badge).toHaveClass('text-gray-400');
    });

    it('should apply success variant classes', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-500/10');
      expect(badge).toHaveClass('text-green-500');
    });

    it('should apply warning variant classes', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-yellow-500/10');
      expect(badge).toHaveClass('text-yellow-500');
    });

    it('should apply destructive variant classes', () => {
      render(<Badge variant="destructive">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-red-500/10');
      expect(badge).toHaveClass('text-red-500');
    });

    it('should apply outline variant classes', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-gray-700');
    });
  });

  describe('base styles', () => {
    it('should have rounded-full class', () => {
      render(<Badge>Rounded</Badge>);
      expect(screen.getByText('Rounded')).toHaveClass('rounded-full');
    });

    it('should have inline-flex class', () => {
      render(<Badge>Inline</Badge>);
      expect(screen.getByText('Inline')).toHaveClass('inline-flex');
    });

    it('should have correct padding', () => {
      render(<Badge>Padded</Badge>);
      const badge = screen.getByText('Padded');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
    });

    it('should have text-xs class', () => {
      render(<Badge>Small</Badge>);
      expect(screen.getByText('Small')).toHaveClass('text-xs');
    });

    it('should have font-medium class', () => {
      render(<Badge>Medium</Badge>);
      expect(screen.getByText('Medium')).toHaveClass('font-medium');
    });
  });

  describe('custom classes', () => {
    it('should merge custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('should preserve variant classes when adding custom class', () => {
      render(<Badge variant="success" className="extra">Both</Badge>);
      const badge = screen.getByText('Both');
      expect(badge).toHaveClass('bg-green-500/10');
      expect(badge).toHaveClass('extra');
    });
  });

  describe('additional props', () => {
    it('should pass through data attributes', () => {
      render(<Badge data-testid="custom-badge">Test</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('should pass through aria attributes', () => {
      render(<Badge aria-label="Status badge">Status</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });
  });
});
