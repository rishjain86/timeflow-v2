'use client';

import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="min-h-[75vh] w-full flex flex-col items-center justify-center relative overflow-hidden p-6 select-none">
      {/* Top Laser Sweep Bar */}
      <div className="loader-laser-bar" />

      {/* Center Quantum Dual-Ring Spinner */}
      <div className="relative flex flex-col items-center justify-center p-8 rounded-[24px] bg-card/60 border border-border/60 backdrop-blur-xl shadow-2xl">
        <div className="loader-quantum mb-5" />

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-wider uppercase text-foreground">
            Syncing Workspace
          </span>
          <div className="loader-eq scale-75">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
          Preparing real-time clinical & billing metrics...
        </p>
      </div>
    </div>
  );
}
