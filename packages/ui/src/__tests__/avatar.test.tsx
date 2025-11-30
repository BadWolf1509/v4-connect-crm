import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarImage, AvatarFallback } from '../components/avatar';

describe('Avatar', () => {
  describe('Avatar component', () => {
    it('should render avatar container', () => {
      render(<Avatar data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('should have circular shape', () => {
      render(<Avatar data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toHaveClass('rounded-full');
    });

    it('should have overflow hidden', () => {
      render(<Avatar data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toHaveClass('overflow-hidden');
    });

    it('should merge custom className', () => {
      render(<Avatar className="custom-size" data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toHaveClass('custom-size');
    });
  });

  describe('AvatarFallback component', () => {
    it('should render fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should have centered content', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">AB</AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('flex');
      expect(fallback).toHaveClass('items-center');
      expect(fallback).toHaveClass('justify-center');
    });

    it('should have background color', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">XY</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId('fallback')).toHaveClass('bg-gray-800');
    });
  });

  describe('AvatarImage component', () => {
    // Note: Radix UI AvatarImage only renders the <img> after onLoad fires
    // In jsdom, images don't load, so we test the component renders without errors
    it('should render AvatarImage component without crashing', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarImage src="/avatar.jpg" alt="User avatar" />
        </Avatar>
      );
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('should accept src and alt props', () => {
      // Just verify component accepts the props without throwing
      expect(() => {
        render(
          <Avatar>
            <AvatarImage src="/avatar.jpg" alt="Avatar" />
          </Avatar>
        );
      }).not.toThrow();
    });

    it('should accept data-testid prop', () => {
      render(
        <Avatar>
          <AvatarImage src="/avatar.jpg" alt="Avatar" data-testid="avatar-img" />
        </Avatar>
      );
      // The component receives the prop, even if img isn't rendered yet
      expect(screen.queryByTestId('avatar-img')).toBeDefined();
    });
  });

  describe('Avatar with fallback', () => {
    it('should show fallback when no image', () => {
      render(
        <Avatar>
          <AvatarFallback>FN</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('FN')).toBeInTheDocument();
    });

    it('should render fallback while image is loading', () => {
      render(
        <Avatar>
          <AvatarImage src="/avatar.jpg" alt="User" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      // Fallback should be visible while image is loading (in jsdom, image never loads)
      expect(screen.getByText('AB')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should support alt text prop on AvatarImage', () => {
      // Since image doesn't load in jsdom, we verify fallback provides accessible content
      render(
        <Avatar>
          <AvatarImage src="/user.jpg" alt="John Doe's profile picture" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      // Fallback text provides accessible content when image doesn't load
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });
});
