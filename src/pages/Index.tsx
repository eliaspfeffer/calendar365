import { useState } from 'react';
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { LogOut, Loader2, LogIn, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

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
      {/* Header with settings and auth buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsDialogOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4" />
        </Button>
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
        textOverflowMode={settings.textOverflowMode}
      />

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        textOverflowMode={settings.textOverflowMode}
        onTextOverflowModeChange={(mode) => updateSettings({ textOverflowMode: mode })}
      />
    </div>
  );
};

export default Index;
