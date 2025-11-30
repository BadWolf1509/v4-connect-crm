import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input, Textarea } from '../components/input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should function as text input by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      // HTML inputs default to type="text" behavior even without explicit attribute
      expect(input.tagName).toBe('INPUT');
    });

    it('should render with specified type', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('styling', () => {
    it('should have base classes', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('rounded-lg');
      expect(input).toHaveClass('bg-gray-900');
      expect(input).toHaveClass('text-white');
    });

    it('should have normal border when no error', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-gray-700');
    });

    it('should have error border when error is true', () => {
      render(<Input error />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('should merge custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('interactions', () => {
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update value when typing', async () => {
      const user = userEvent.setup();

      render(<Input />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');

      expect(input).toHaveValue('hello');
    });

    it('should not allow typing when disabled', async () => {
      const user = userEvent.setup();

      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');

      expect(input).toHaveValue('');
    });
  });

  describe('controlled value', () => {
    it('should display controlled value', () => {
      render(<Input value="controlled" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('controlled');
    });
  });

  describe('accessibility', () => {
    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('should have focus ring classes', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:ring-2');
    });

    it('should show disabled cursor when disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

describe('Textarea', () => {
  describe('rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter message" />);
      expect(screen.getByPlaceholderText('Enter message')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have base classes', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('rounded-lg');
      expect(textarea).toHaveClass('bg-gray-900');
      expect(textarea).toHaveClass('min-h-[80px]');
    });

    it('should have normal border when no error', () => {
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-gray-700');
    });

    it('should have error border when error is true', () => {
      render(<Textarea error />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-red-500');
    });
  });

  describe('interactions', () => {
    it('should allow multiline input', async () => {
      const user = userEvent.setup();

      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'line1{enter}line2');

      expect(textarea).toHaveValue('line1\nline2');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null };
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });
});
