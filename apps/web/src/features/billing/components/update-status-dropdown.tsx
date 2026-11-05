'use client';

import { useState } from 'react';
import { InvoiceStatus } from '../api/get-invoices';
import { useUpdateInvoiceStatus } from '../api/update-invoice-status';
import { ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UpdateStatusDropdownProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}

// Same color mapping function
const getStatusBadgeVariant = (status: InvoiceStatus) => {
  switch (status) {
    case 'PAID': return 'default';
    case 'OVERDUE': return 'destructive';
    case 'PARTIALLY_PAID': return 'warning';
    case 'SENT': return 'secondary';
    default: return 'outline';
  }
};

export function UpdateStatusDropdown({ invoiceId, currentStatus }: UpdateStatusDropdownProps) {
  const { mutate: updateStatus, isPending } = useUpdateInvoiceStatus(invoiceId);

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    if (newStatus === currentStatus) return;
    updateStatus({ invoiceId, status: newStatus });
  };

  const availableStatuses: InvoiceStatus[] = [
    'DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent" disabled={isPending}>
          <Badge variant={getStatusBadgeVariant(currentStatus)} className="cursor-pointer gap-1 flex items-center">
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {!isPending && currentStatus.replace('_', ' ')}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {availableStatuses.map((status) => (
          <DropdownMenuItem 
            key={status} 
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus}
            className={status === currentStatus ? 'bg-muted' : ''}
          >
            Mark as {status.replace('_', ' ')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
