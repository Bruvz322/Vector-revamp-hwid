import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, Pin, Plus, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Announcement, User } from '@/lib/types';

interface AnnouncementWithCreator extends Announcement {
  creator: User | null;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select(`*, creator:users(*)`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data as unknown as AnnouncementWithCreator[]);
    }
    setIsLoading(false);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setShowDialog(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.is_pinned);
    setShowDialog(true);
  };

  const saveAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Required Fields', description: 'Title and content are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('announcements')
        .update({ title, content, is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', editingId);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update announcement.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Announcement updated.' });
        setShowDialog(false);
        fetchAnnouncements();
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert({ title, content, is_pinned: isPinned, created_by: user?.id });

      if (error) {
        toast({ title: 'Error', description: 'Failed to create announcement.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Announcement created.' });
        setShowDialog(false);
        fetchAnnouncements();
      }
    }

    setIsSaving(false);
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete announcement.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Announcement deleted.' });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold glow-text">Announcements</h1>
            <p className="text-muted-foreground mt-1">Stay updated with the latest news</p>
          </div>
          {user?.is_admin && (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-card border-border/50">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement..." className="bg-secondary/50 min-h-32" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <Label htmlFor="pinned" className="cursor-pointer flex items-center gap-2">
                      <Pin className="w-4 h-4" />Pin Announcement
                    </Label>
                    <Switch id="pinned" checked={isPinned} onCheckedChange={setIsPinned} />
                  </div>
                  <Button onClick={saveAnnouncement} className="w-full" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingId ? 'Update' : 'Post'} Announcement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            </div>
          </div>
        ) : announcements.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlowCard>
              <GlowCardContent className="py-12 text-center">
                <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No announcements yet.</p>
              </GlowCardContent>
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="show">
            {announcements.map((announcement) => (
              <motion.div key={announcement.id} variants={itemVariants}>
                <GlowCard>
                  <GlowCardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {announcement.is_pinned && (
                            <Badge className="bg-primary/20 text-primary border-primary/50">
                              <Pin className="w-3 h-3 mr-1" />Pinned
                            </Badge>
                          )}
                        </div>
                        <GlowCardTitle className="text-xl mt-2">{announcement.title}</GlowCardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Posted by {announcement.creator?.username || announcement.creator?.email || 'Admin'} on {formatDate(announcement.created_at)}
                        </p>
                      </div>
                      {user?.is_admin && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(announcement)} className="hover:text-primary transition-colors">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(announcement.id)} className="hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </GlowCardHeader>
                  <GlowCardContent>
                    <div className="prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-foreground/80">{announcement.content}</p>
                    </div>
                  </GlowCardContent>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}
