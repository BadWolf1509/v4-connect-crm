import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../components/toast';

describe('UI primitives integration', () => {
  it('renders dialog content when open', () => {
    render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('renders dropdown menu items', () => {
    render(
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>First item</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Checked item</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Checked item')).toBeInTheDocument();
  });

  it('renders select options', () => {
    render(
      <Select open value="a" onOpenChange={() => {}} onValueChange={() => {}}>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getAllByText('Option A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Option B').length).toBeGreaterThan(0);
  });

  it('switches tab content', () => {
    const { rerender } = render(
      <Tabs value="one">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Content One')).toBeInTheDocument();

    rerender(
      <Tabs value="two">
        <TabsList>
          <TabsTrigger value="one">Tab One</TabsTrigger>
          <TabsTrigger value="two">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content One</TabsContent>
        <TabsContent value="two">Content Two</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Content Two')).toBeInTheDocument();
  });

  it('displays toast markup', () => {
    render(
      <ToastProvider swipeDirection="right">
        <Toast open>
          <ToastTitle>Saved</ToastTitle>
          <ToastDescription>All changes persisted</ToastDescription>
          <ToastAction altText="Undo">Undo</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('All changes persisted')).toBeInTheDocument();
  });
});
