'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface ClientSelectProps {
  clients: Client[];
  selectedClientId?: string;
  onSelectClient: (clientId: string) => void;
  placeholder?: string;
}

export function ClientSelect({
  clients = [],
  selectedClientId,
  onSelectClient,
  placeholder = "Select client...",
}: ClientSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-[44px] bg-background border-border text-foreground hover:bg-accent hover:text-foreground rounded-[10px] px-3 font-normal"
        >
          <span className="truncate">
            {selectedClient ? selectedClient.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-2 bg-card border-border rounded-[12px] shadow-2xl text-foreground z-[999]"
      >
        <div className="flex items-center px-3 pb-2 border-b border-border mb-1">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Search client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-9 w-full rounded-md bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto space-y-1">
          {filteredClients.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No client found.
            </div>
          ) : (
            filteredClients.map((client) => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => {
                  onSelectClient(client.id);
                  setOpen(false);
                  setSearchQuery('');
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer text-sm text-muted-foreground",
                  "focus:bg-accent focus:text-foreground hover:bg-accent hover:text-foreground transition-colors"
                )}
              >
                <div>
                  <p className="font-medium text-foreground">{client.name}</p>
                  {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                </div>
                <Check
                  className={cn(
                    "h-4 w-4 text-primary",
                    selectedClientId === client.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
