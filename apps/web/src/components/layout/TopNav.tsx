'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; 
import { useTheme } from 'next-themes'; 
import { 
  Search, 
  Building2, 
  ChevronDown,
  Menu,
  X,
  Command,
  ShieldCheck,
  Loader2,
  Sun, 
  Moon 
} from 'lucide-react';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useLogout } from '@/features/auth/api/logout';
import { useAuthUser } from '@/features/auth/api/get-auth-user';
import { useOrganization } from '@/features/organizations/api/get-organization';
import { useMyOrganizations } from '@/features/organizations/api/get-organizations'; 
import { useSwitchOrganization } from '@/features/organizations/api/switch-organization'; 
import { axiosInstance } from '@/lib/axios'; 

import { CreateOrganizationModal } from '@/components/organizations/CreateOrganizationModal';
import { NotificationBell } from '@/features/notifications/components/NotificationBell'; 

function TopNavContent() {
  const pathname = usePathname();
  const router = useRouter(); 
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const { mutate: logout } = useLogout();
  const { data: user } = useAuthUser();
  const { data: currentOrganization } = useOrganization();
  const { data: myOrganizations } = useMyOrganizations(); 
  const switchOrgMutation = useSwitchOrganization(); 

  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() 
    : 'U';

  useEffect(() => {
    setMounted(true); 
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      setShowResults(true);
      
      const timer = setTimeout(() => {
        axiosInstance.get(`/projects?search=${searchQuery}&limit=5`)
          .then(res => {
            const projs = res.data?.data?.projects || res.data?.projects || (Array.isArray(res.data?.data) ? res.data.data : []);
            setSearchResults(Array.isArray(projs) ? projs : []);
          })
          .catch(() => setSearchResults([]))
          .finally(() => setIsSearching(false));
      }, 400); 
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidBg = isDark ? 'bg-[#0F172A]' : 'bg-white';

  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';
  
  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: isHealthcare ? 'Cases / Patients' : 'Projects', href: '/projects' },
    { name: isHealthcare ? 'Payors' : 'Clients', href: '/clients' },
    { name: 'Team', href: '/team' },
    { name: 'Reports', href: '/reports' },
    { name: 'Time Tracking', href: '/time-tracking' },
    { name: 'Expenses', href: '/expenses' },
    { name: 'Invoices', href: '/invoices' },
    ];

  if (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN') {
    navLinks.push({ name: 'Approvals', href: '/approvals' });
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-[100] w-full h-[64px] border-b border-border shadow-sm flex items-center transition-colors duration-200 ${solidBg}`}>
        <div className="w-full px-3 md:px-5 flex items-center justify-between relative gap-2 xl:gap-4">
          
          <div className="flex items-center gap-3 lg:gap-4 h-full shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <span className="text-white font-black text-base leading-none">T</span>
              </div>
              <span className="font-extrabold text-foreground text-lg tracking-tight hidden md:block">
                TimeFlow
              </span>
            </Link>

            <nav className="hidden lg:flex items-center h-full gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link 
                    key={link.name} 
                    href={link.href === '/' ? '/dashboard' : link.href}
                    prefetch={false}
                    className={`px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-bold transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-1 justify-center px-1 sm:px-2 relative z-[101] max-w-[280px] xl:max-w-[340px]">
            <div className="relative w-full">
              <div className={`relative w-full h-[36px] flex items-center px-2.5 border border-border focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 rounded-lg transition-all overflow-hidden group ${solidBg}`}>
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-focus-within:text-blue-600" />
                <input 
                  id="global-search"
                  type="text" 
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)} 
                  placeholder="Search..." 
                  className="flex-1 h-full bg-transparent border-none text-xs text-foreground px-2 placeholder:text-muted-foreground focus:outline-none focus:ring-0 min-w-0"
                />
                <kbd className={`hidden xl:inline-flex h-5 items-center gap-0.5 rounded border border-border px-1.5 font-mono text-[9px] font-medium text-muted-foreground shrink-0 ${solidBg}`}>
                  <Command className="h-2.5 w-2.5" />
                  <span>K</span>
                </kbd>
              </div>

              {showResults && (
                <div className={`absolute top-[44px] right-0 sm:left-0 sm:right-auto w-[280px] sm:w-[100%] sm:min-w-[300px] border border-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden z-[99999] flex flex-col ${solidBg}`}>
                  {isSearching ? (
                    <div className="flex items-center justify-center p-3 text-xs font-medium text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2 text-blue-600"/> Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <div className={`px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        {isHealthcare ? 'Cases Found' : 'Projects Found'}
                      </div>
                      {searchResults.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => { 
                            router.push(`/projects/${p.slug || p.id}`); 
                            setSearchQuery(''); 
                            setShowResults(false); 
                          }} 
                          className={`px-3 py-2.5 cursor-pointer border-b border-border last:border-0 transition-colors group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        >
                          <div className={`text-xs font-bold group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {p.name}
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                            <span className="text-blue-600 dark:text-blue-400">{p.client?.name || 'Internal'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs font-medium text-muted-foreground">
                      No matching records found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
            
            <div className="hidden lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 h-[36px] px-2.5 rounded-lg text-foreground hover:bg-accent border border-border transition-colors shrink-0 relative z-20 ${solidBg}`}>
                    <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex flex-col items-start justify-center text-left">
                      <span className="text-[8px] text-muted-foreground uppercase font-black leading-none">Organization</span>
                      <span className="text-xs font-bold max-w-[85px] xl:max-w-[120px] truncate leading-tight text-foreground">
                        {currentOrganization?.name || 'Loading...'}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`w-60 rounded-xl border border-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] mt-2 text-foreground z-[99999] ${solidBg}`}>
                  <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-2">Your Organizations</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  
                  {myOrganizations?.map((org: any) => (
                    <DropdownMenuItem 
                      key={org.id}
                      onSelect={() => {
                        if (org.id !== currentOrganization?.id) {
                          switchOrgMutation.mutate(org.id);
                        }
                      }}
                      className={`cursor-pointer py-2 text-xs font-semibold ${org.id === currentOrganization?.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold' : 'hover:bg-accent'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{org.name}</span>
                        {org.id === currentOrganization?.id && (
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator className="bg-border" />
                  
                  {currentOrganization?.id && (
                     <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent py-2 text-xs font-medium">
                       <Link href={`/organizations/${currentOrganization.id}`} prefetch={false}>
                         Organization Settings
                       </Link>
                     </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-border" />
                  
                  <DropdownMenuItem 
                    onSelect={() => setIsCreateModalOpen(true)}
                    className="cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold py-2 text-xs"
                  >
                    + Create New Workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {user?.role && (
              <div className="hidden xl:flex items-center justify-center px-2 h-[30px] rounded-md border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 shrink-0 relative z-20">
                <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 mr-1 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider truncate">
                  {user.role === 'USER' ? 'EMPLOYEE' : user.role}
                </span>
              </div>
            )}

            {mounted && (
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`hidden sm:flex relative z-20 h-[36px] w-[36px] items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors shrink-0 ${solidBg}`}
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-600" />}
              </button>
            )}

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative z-20 h-[36px] w-[36px] rounded-lg p-0 overflow-hidden border border-border hover:ring-2 hover:ring-blue-600 transition-all shrink-0">
                  <Avatar className="h-full w-full rounded-lg">
                    <AvatarImage src="" alt="User avatar" />
                    <AvatarFallback className="bg-blue-600 text-white font-black text-xs rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`w-56 rounded-xl border border-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] mt-2 text-foreground z-[99999] ${solidBg}`}>
                <DropdownMenuLabel className="font-normal py-3">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold leading-none truncate">
                        {user ? `${user.firstName} ${user.lastName || ''}` : 'Loading...'}
                      </p>
                    </div>
                    <p className="text-[11px] leading-none text-muted-foreground mt-1 truncate">
                      {user?.email || '...'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent py-2 text-xs font-medium">
                  <Link href="/profile" prefetch={false}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent py-2 text-xs font-medium">
                  <Link href="/settings" prefetch={false}>Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent py-2 text-xs font-medium">
                  <Link href="/billing/dashboard">Billing</Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-border" />
                
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault(); 
                    logout();
                  }}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold py-2 text-xs"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden relative z-20 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent border border-border transition-colors shrink-0 ml-1 ${solidBg}`}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 text-blue-600" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>

        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 top-[64px] bg-transparent z-[98] lg:hidden" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <div className={`absolute top-[72px] right-3 w-[260px] sm:w-[300px] border border-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-xl flex flex-col p-3 gap-1.5 z-[99999] animate-in slide-in-from-top-2 duration-200 lg:hidden ${solidBg}`}>
              
              <div className={`flex flex-col px-3 py-3 mb-2 rounded-lg border border-border ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Workspace</span>
                <select
                  value={currentOrganization?.id || ''}
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== currentOrganization?.id) {
                      switchOrgMutation.mutate(e.target.value);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  className={`w-full h-9 px-2 rounded-md border border-border text-xs font-bold focus:outline-none focus:border-blue-600 appearance-none ${isDark ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-900'}`}
                >
                  {myOrganizations?.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {mounted && (
                <div className={`flex sm:hidden items-center justify-between px-3 py-2 mb-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Theme</span>
                  <button 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={`h-8 w-8 flex items-center justify-center rounded-md border border-border shadow-sm ${isDark ? 'bg-slate-900' : 'bg-white'}`}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-600" />}
                  </button>
                </div>
              )}

              <div className="overflow-y-auto max-h-[50vh] space-y-1 custom-scrollbar">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href === '/' ? '/dashboard' : link.href}
                      prefetch={false} 
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className={`px-3 py-3 rounded-lg text-sm font-bold transition-all flex items-center ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : isDark 
                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </header>

      <CreateOrganizationModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
}

// 🟢 BULLETPROOF FIX: Use startsWith to cover all auth and password reset routes perfectly.
export function TopNav() {
  const pathname = usePathname();
  
  const isAuthPage = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');
  
  if (isAuthPage) return null;
  return <TopNavContent />;
}
