'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Image,
  FileText,
  CalendarDays,
  CheckSquare,
  Zap,
  Settings,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/workspaces', label: 'Workspaces', icon: FolderOpen },
  { href: '/social-connections', label: 'Social Connections', icon: Bot },
  { href: '/assets', label: 'Assets', icon: Image },
  { href: '/content-drafts', label: 'Content Drafts', icon: FileText },
  { href: '/publish-queue', label: 'Publish Queue', icon: CalendarDays },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Bot className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">Social Bot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-3 text-xs text-sidebar-foreground/40">
        Social Bot v0.1
      </div>
    </aside>
  );
}
