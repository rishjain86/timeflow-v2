'use client';

import React from 'react';
import { Briefcase, AlertTriangle, CheckCircle, ShieldAlert, Clock } from 'lucide-react';
import { ProjectBudget } from '../api/get-project-budget';

interface BudgetOverviewCardProps {
  budget: ProjectBudget;
  onAllocateClick?: () => void;
}

export function BudgetOverviewCard({ budget, onAllocateClick }: BudgetOverviewCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Healthy</span>;
      case 'WARNING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 50% Warning</span>;
      case 'NEAR_EXHAUSTION':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning border border-warning/30 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 90% Near Exhaustion</span>;
      case 'EXHAUSTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Exhausted</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted/20 text-muted-foreground border border-border">{status}</span>;
    }
  };

  const progressColor = budget.status === 'EXHAUSTED' ? 'bg-destructive' : budget.status === 'NEAR_EXHAUSTION' || budget.status === 'WARNING' ? 'bg-warning' : 'bg-success';

  return (
    <div className="bg-card border border-border rounded-[16px] p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Project Budget Tracking
            </h3>
            {getStatusBadge(budget.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Over-budget allocation is {budget.allowOverBudget ? 'Allowed' : 'Strictly Restricted'}
          </p>
        </div>
        {onAllocateClick && (
          <button 
            onClick={onAllocateClick}
            className="btn-primary h-[38px] px-4 text-xs"
          >
            + Allocate Member Budget
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background p-4 rounded-[12px] border border-border">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Allocated</p>
          <p className="text-xl font-bold text-foreground mt-1">{budget.totalAllocatedHours.toFixed(2)}h</p>
        </div>
        <div className="bg-background p-4 rounded-[12px] border border-border">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Consumed</p>
          <p className="text-xl font-bold text-primary mt-1">{budget.consumedHours.toFixed(2)}h</p>
        </div>
        <div className="bg-background p-4 rounded-[12px] border border-border">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Remaining Hours</p>
          <p className={`text-xl font-bold mt-1 ${budget.remainingHours === 0 ? 'text-destructive' : 'text-success'}`}>
            {budget.remainingHours.toFixed(2)}h
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Consumption Progress</span>
          <span className="text-foreground font-bold">{budget.progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-background border border-border rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, budget.progressPercentage)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
