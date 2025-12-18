import { useEffect, useMemo, useState } from "react";
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { LogOut, Loader2, LogIn, Settings, Share2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useCalendars } from "@/hooks/useCalendars";
import { CalendarSwitcher } from "@/components/calendar/CalendarSwitcher";
import { ShareCalendarDialog } from "@/components/calendar/ShareCalendarDialog";
import { ACTIVE_CALENDAR_OWNER_STORAGE_KEY } from "@/lib/calendarSharing";

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const { calendars } = useCalendars(user?.id ?? null);
  const [activeCalendarOwnerId, setActiveCalendarOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveCalendarOwnerId(null);
      return;
    }
    const stored = localStorage.getItem(ACTIVE_CALENDAR_OWNER_STORAGE_KEY);
    const allowedOwnerIds = new Set(calendars.map((c) => c.ownerId));
    if (stored && allowedOwnerIds.has(stored)) {
      setActiveCalendarOwnerId(stored);
    } else {
      setActiveCalendarOwnerId(user.id);
      localStorage.setItem(ACTIVE_CALENDAR_OWNER_STORAGE_KEY, user.id);
    }
  }, [user, calendars]);

  const activeCalendar = useMemo(() => {
    if (!user || !activeCalendarOwnerId) return null;
    return calendars.find((c) => c.ownerId === activeCalendarOwnerId) ?? null;
  }, [user, activeCalendarOwnerId, calendars]);

  const canEdit = Boolean(activeCalendar && activeCalendar.role !== "viewer");

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
      <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {user && activeCalendarOwnerId && calendars.length > 0 && (
            <CalendarSwitcher
              calendars={calendars}
              value={activeCalendarOwnerId}
              onChange={(ownerId) => {
                setActiveCalendarOwnerId(ownerId);
                localStorage.setItem(ACTIVE_CALENDAR_OWNER_STORAGE_KEY, ownerId);
              }}
            />
          )}
          {user && activeCalendar?.role !== "owner" && activeCalendar && (
            <div className="text-xs px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border">
              Shared · {activeCalendar.role === "editor" ? "can edit" : "view only"}
            </div>
          )}
        </div>

        <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsDialogOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4" />
        </Button>
        {user && activeCalendar?.role === "owner" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="bg-background/80 backdrop-blur-sm"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
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
      </div>
      
      <YearCalendar 
        years={[2025, 2026]} 
        authUserId={user?.id || null}
        calendarOwnerId={activeCalendarOwnerId}
        canEdit={canEdit}
        onAuthRequired={handleAuthRequired}
        textOverflowMode={settings.textOverflowMode}
        calendarColor={settings.calendarColor}
      />

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        textOverflowMode={settings.textOverflowMode}
        onTextOverflowModeChange={(mode) => updateSettings({ textOverflowMode: mode })}
        calendarColor={settings.calendarColor}
        onCalendarColorChange={(color) => updateSettings({ calendarColor: color })}
      />
      {user && (
        <ShareCalendarDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          ownerId={user.id}
        />
      )}
    </div>
  );
};

export default Index;
