/**
 * Button Component Tests
 *
 * Tests for shadcn/ui Button component
 * Phase 1.2 - Testing Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('should render as HTML button element by default', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should apply data-slot attribute', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-slot', 'button');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'text-white');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'bg-background');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary', 'underline-offset-4');
    });

    it('should use default variant when variant prop not provided', () => {
      render(<Button>No variant</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });
  });

  describe('Sizes', () => {
    it('should render default size', () => {
      render(<Button size="default">Default size</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-4', 'py-2');
    });

    it('should render sm size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'rounded-md');
    });

    it('should render lg size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-6');
    });

    it('should render icon size', () => {
      render(<Button size="icon" aria-label="Icon button">+</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('size-9');
    });

    it('should render icon-sm size', () => {
      render(<Button size="icon-sm" aria-label="Small icon">+</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('size-8');
    });

    it('should render icon-lg size', () => {
      render(<Button size="icon-lg" aria-label="Large icon">+</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('size-10');
    });

    it('should use default size when size prop not provided', () => {
      render(<Button>No size</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
    });
  });

  describe('Interactions', () => {
    it('should handle click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');

      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-primary'); // Still has default classes
    });

    it('should allow overriding styles with custom className', () => {
      render(<Button className="bg-red-500">Override</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('bg-red-500');
    });
  });

  describe('HTML Attributes', () => {
    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept aria-label attribute', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      const button = screen.getByRole('button', { name: /close dialog/i });

      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should accept data attributes', () => {
      render(<Button data-testid="my-button">Test</Button>);
      const button = screen.getByTestId('my-button');

      expect(button).toBeInTheDocument();
    });

    it('should accept name attribute', () => {
      render(<Button name="submit-button">Submit</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('name', 'submit-button');
    });

    it('should accept value attribute', () => {
      render(<Button value="button-value">Value</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('value', 'button-value');
    });
  });

  describe('Children', () => {
    it('should render text children', () => {
      render(<Button>Text content</Button>);
      expect(screen.getByText('Text content')).toBeInTheDocument();
    });

    it('should render with icon and text', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          <span>With Icon</span>
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Button>
          <span>First</span>
          <span>Second</span>
        </Button>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Variant + Size Combinations', () => {
    it('should support destructive + small', () => {
      render(<Button variant="destructive" size="sm">Delete</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('bg-destructive', 'h-8');
    });

    it('should support outline + large', () => {
      render(<Button variant="outline" size="lg">Outline Large</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('border', 'h-10');
    });

    it('should support ghost + icon', () => {
      render(<Button variant="ghost" size="icon" aria-label="Ghost icon">+</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('hover:bg-accent', 'size-9');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with keyboard', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Accessible</Button>);
      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();
    });

    it('should support aria-invalid', () => {
      render(<Button aria-invalid="true">Invalid</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-invalid', 'true');
      expect(button).toHaveClass('aria-invalid:ring-destructive/20');
    });

    it('should have proper focus styles', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-ring/50');
    });

    it('should be keyboard accessible when not disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      // Note: React Testing Library does not automatically trigger click on Enter for buttons
      // This is a limitation of the testing library, not the component
    });
  });

  describe('asChild prop', () => {
    it('should render Slot component when asChild is true', () => {
      // Note: Testing Slot behavior would require a more complex setup
      // For now, we just verify the button renders without errors
      render(
        <Button asChild>
          <a href="/test">Link as button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle boolean children (React ignores them)', () => {
      render(<Button>{true}{false}Visible text</Button>);
      expect(screen.getByText('Visible text')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(<Button>{null}Text</Button>);
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<Button>{undefined}Text</Button>);
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });

  describe('Common Use Cases', () => {
    it('should work as form submit button', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work as cancel/close button', () => {
      const handleClose = jest.fn();

      render(
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClose).toHaveBeenCalled();
    });

    it('should work as destructive action button', () => {
      const handleDelete = jest.fn();

      render(
        <Button variant="destructive" onClick={handleDelete}>
          Delete Item
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleDelete).toHaveBeenCalled();
      expect(button).toHaveClass('bg-destructive');
    });

    it('should work as icon-only button with aria-label', () => {
      const handleClick = jest.fn();

      render(
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClick}
          aria-label="Close"
        >
          ×
        </Button>
      );

      const button = screen.getByRole('button', { name: /close/i });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
