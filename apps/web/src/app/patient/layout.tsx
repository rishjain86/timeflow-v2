'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  CreditCard, 
  Settings,
  Menu,
  X,
  LogOut,
  Activity
} from 'lucide-react';

// Navigation configuration
const sidebarLinks = [
  { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/patient/appointments', icon: Calendar },
  { name: 'Treatment Plan', href: '/patient/treatment-plan', icon: Activity },
  { name: 'Documents', href: '/patient/documents', icon: FileText },
  { name: 'Billing', href: '/patient/billing', icon: CreditCard },
  { name: 'Settings', href: '/patient/settings', icon: Settings },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between bg-card border-b border-border p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-[8px] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">TF</span>
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">TimeFlow</span>
        </div>
        <button 
          onClick={toggleMobileMenu}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 z-40 h-screen bg-card border-r border-border w-64 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-[72px] hidden md:flex items-center gap-3 px-6 border-b border-border">
          <div className="h-8 w-8 bg-primary rounded-[8px] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">TF</span>
          </div>
          <span className="font-bold text-xl text-foreground tracking-tight">TimeFlow</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on click
              >
                <div 
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-[10px] text-sm font-semibold transition-all
                    ${isActive 
                      ? 'bg-primary/20 text-info border border-primary/30 shadow-sm' 
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {link.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border">
          <button className="flex items-center w-full px-3 py-3 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[10px] transition-colors text-sm font-semibold">
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-hidden">
        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {children}
      </main>
      
    </div>
  );
}
