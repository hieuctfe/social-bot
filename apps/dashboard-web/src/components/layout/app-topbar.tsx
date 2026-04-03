'use client';

import { Bell, Search } from 'lucide-react';

export function AppTopbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Search placeholder */}
      <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground w-64">
        <Search className="h-4 w-4" />
        <span>Search…</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          className="relative rounded-full p-2 hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        {/* Avatar placeholder */}
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
          U
        </div>
      </div>
    </header>
  );
}
