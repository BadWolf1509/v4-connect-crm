import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/card';

describe('Card', () => {
  describe('Card component', () => {
    it('should render card with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have base classes', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
    });

    it('should merge custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader component', () => {
    it('should render header content', () => {
      render(<CardHeader>Header</CardHeader>);
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveClass('flex');
    });

    it('should have padding', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveClass('p-6');
    });
  });

  describe('CardTitle component', () => {
    it('should render title text', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should be a heading', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should have font-semibold class', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('font-semibold');
    });
  });

  describe('CardDescription component', () => {
    it('should render description text', () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should have text-sm class', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId('desc')).toHaveClass('text-sm');
    });

    it('should have muted text color', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId('desc')).toHaveClass('text-gray-400');
    });
  });

  describe('CardContent component', () => {
    it('should render content', () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should have padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });
  });

  describe('CardFooter component', () => {
    it('should render footer content', () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveClass('flex');
    });

    it('should have items-center', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveClass('items-center');
    });
  });

  describe('Full card composition', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content</p>
          </CardContent>
          <CardFooter>
            <button type="button">Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
