import { useState } from 'react';
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAuthRequired = () => {
    setLoginDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header with auth button */}
      <div className="fixed top-4 right-4 z-50">
        {user ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="bg-background/80 backdrop-blur-sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoginDialogOpen(true)}
            className="bg-background/80 backdrop-blur-sm"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in
          </Button>
        )}
      </div>
      
      <YearCalendar 
        years={[2025, 2026]} 
        userId={user?.id || null}
        onAuthRequired={handleAuthRequired}
      />

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
};

export default Index;
