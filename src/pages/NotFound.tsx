import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-[100px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10"
      >
        <motion.h1
          className="text-8xl font-bold glow-text mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          404
        </motion.h1>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Link to="/">
          <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/30">
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
