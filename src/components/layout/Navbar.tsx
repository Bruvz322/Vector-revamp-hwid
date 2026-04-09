import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Shield, Package, LogOut, Clock, Download, Megaphone, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { user, logout, updateShowEmail, isStaff, userRoleLabels } = useAuth();
  const location = useLocation();
  const [discordLink, setDiscordLink] = useState('https://discord.gg/');

  useEffect(() => {
    const fetchDiscordLink = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'discord_link')
        .maybeSingle();
      if (data?.value) setDiscordLink(data.value);
    };
    fetchDiscordLink();
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Products', icon: Package },
    { path: '/subscriptions', label: 'My Subscriptions', icon: Clock },
    { path: '/cart', label: 'Cart', icon: ShoppingCart },
    { path: '/loader', label: 'Loader', icon: Download },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
  ];

  const isActive = (path: string) => location.pathname === path;

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.slice(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  };

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
          <div className="relative">
            <img
              src="https://i.imgur.com/ut5E3rs.png"
              alt="Logo"
              className="w-8 h-8 rounded glow-subtle transition-shadow duration-300 group-hover:glow"
              crossOrigin="anonymous"
            />
          </div>
          <span className="font-semibold text-lg glow-text hidden sm:inline">Vector</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link, i) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={link.path}>
                <Button
                  variant={isActive(link.path) ? 'default' : 'ghost'}
                  size="sm"
                  className={`gap-2 transition-all duration-300 ${isActive(link.path) ? 'shadow-lg shadow-primary/20' : 'hover:bg-secondary/80'}`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            </motion.div>
          ))}
          {isStaff && (
            <Link to="/admin">
              <Button
                variant={isActive('/admin') ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 transition-all duration-300 ${isActive('/admin') ? 'shadow-lg shadow-primary/20' : ''}`}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <a href={discordLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary/30 transition-all duration-300">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span className="hidden sm:inline">Discord</span>
            </Button>
          </a>

          <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground border-l border-border/50 pl-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{user?.show_email !== false ? user?.email : maskEmail(user?.email || '')}</span>
              <button
                onClick={() => updateShowEmail(!user?.show_email)}
                className="p-1 hover:bg-secondary rounded transition-colors duration-200"
                title={user?.show_email !== false ? 'Hide email' : 'Show email'}
              >
                {user?.show_email !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            {userRoleLabels.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {userRoleLabels.map((role) => (
                  <Badge key={role.label} variant="outline" className={`text-xs ${role.colorClass}`}>
                    {role.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={logout} className="gap-2 hover:text-destructive transition-colors duration-300">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <div className="lg:hidden border-t border-border/50 px-4 py-2 flex gap-1 overflow-x-auto bg-background/40 backdrop-blur-xl">
        {navLinks.map((link) => (
          <Link key={link.path} to={link.path}>
            <Button
              variant={isActive(link.path) ? 'default' : 'ghost'}
              size="sm"
              className={`gap-2 shrink-0 ${isActive(link.path) ? 'shadow-md shadow-primary/20' : ''}`}
            >
              <link.icon className="w-4 h-4" />
              <span className="text-xs">{link.label}</span>
            </Button>
          </Link>
        ))}
        {isStaff && (
          <Link to="/admin">
            <Button variant={isActive('/admin') ? 'default' : 'ghost'} size="sm" className="gap-2 shrink-0">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Admin</span>
            </Button>
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
