'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  FileText, 
  LayoutDashboard, 
  Settings, 
  Users, 
  FolderKanban,
  Search,
  PlusCircle,
  LogOut
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {/* Trigger Button or Global Listener */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in-0 flex items-start justify-center pt-[15vh]">
          <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[16px] overflow-hidden text-foreground animate-in zoom-in-95 duration-200">
            
            {/* Search Input */}
            <div className="flex items-center border-b border-border px-4 bg-background">
              <Search className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
              <CommandInput 
                placeholder="Type a command or search..." 
                className="w-full bg-transparent h-[56px] text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              />
            </div>

            <CommandList className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </CommandEmpty>

              <CommandGroup heading="Quick Actions" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/invoices/create'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <PlusCircle className="h-4 w-4 text-primary" />
                  <span>Create New Invoice</span>
                  <CommandShortcut className="ml-auto text-xs text-muted-foreground font-mono">⌘I</CommandShortcut>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/projects/create'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <FolderKanban className="h-4 w-4 text-info" />
                  <span>Create New Project</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator className="my-1 bg-border" />

              <CommandGroup heading="Navigation" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/dashboard'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-info" />
                  <span>Dashboard</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/projects'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <FolderKanban className="h-4 w-4 text-info" />
                  <span>Projects</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/invoices'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <CreditCard className="h-4 w-4 text-info" />
                  <span>Invoices & Billing</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/calendar'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <Calendar className="h-4 w-4 text-info" />
                  <span>Calendar & Appointments</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/team'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <Users className="h-4 w-4 text-info" />
                  <span>Team & Users</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/reports'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <FileText className="h-4 w-4 text-info" />
                  <span>Reports & Analytics</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator className="my-1 bg-border" />

              <CommandGroup heading="Preferences" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                <CommandItem 
                  onSelect={() => runCommand(() => router.push('/settings'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>

            <div className="border-t border-border px-4 py-3 bg-background flex items-center justify-between text-xs text-muted-foreground">
              <span>Use <kbd className="bg-card px-1.5 py-0.5 rounded border border-border">↑</kbd> <kbd className="bg-card px-1.5 py-0.5 rounded border border-border">↓</kbd> to navigate</span>
              <span>Press <kbd className="bg-card px-1.5 py-0.5 rounded border border-border">ESC</kbd> to exit</span>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
