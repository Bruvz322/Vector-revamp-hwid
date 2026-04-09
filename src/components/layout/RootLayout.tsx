import { Outlet } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Outlet />
    </TooltipProvider>
  );
}
