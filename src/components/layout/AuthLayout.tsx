import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Navbar from './Navbar';
import { Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireStaff?: boolean;
}

export default function AuthLayout({ children, requireAdmin = false, requireStaff = false }: AuthLayoutProps) {
  const { user, isLoading, isStaff, lockedInfo } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <motion.div
          className="flex flex-col items-center gap-4 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full animate-pulse-glow" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-grid opacity-[0.04] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <Navbar />
      
      {lockedInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 relative z-10"
        >
          <div className="container mx-auto flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive text-sm">Account Locked</p>
              <p className="text-sm text-muted-foreground">
                Logged into Loader from a Different Device. Please make a ticket in the discord for assistance.
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.main
        className="container mx-auto px-4 py-6 relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.main>
    </div>
  );
}
