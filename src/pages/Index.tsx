import { useEffect, useMemo, useRef, useState } from 'react';
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { LogOut, Loader2, LogIn, Settings, Share2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useCalendars } from '@/hooks/useCalendars';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarShareDialog } from '@/components/calendar/CalendarShareDialog';
import { CreateCalendarDialog } from '@/components/calendar/CreateCalendarDialog';

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const hasWarnedAboutCalendars = useRef(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [createCalendarDialogOpen, setCreateCalendarDialogOpen] = useState(false);

  const {
    calendars,
    byId,
    isLoading: calendarsLoading,
    defaultCalendarId,
    schemaStatus: calendarsSchemaStatus,
    schemaError: calendarsSchemaError,
    createCalendar,
    createInvite,
  } = useCalendars(user?.id || null);

  const effectiveCalendarId = useMemo(() => {
    if (!user) return null;
    return settings.activeCalendarId ?? defaultCalendarId ?? null;
  }, [user, settings.activeCalendarId, defaultCalendarId]);

  const activeCalendar = useMemo(() => {
    if (!effectiveCalendarId) return null;
    return byId.get(effectiveCalendarId) ?? null;
  }, [byId, effectiveCalendarId]);

  useEffect(() => {
    if (!user) return;
    if (calendarsLoading) return;
    if (!hasWarnedAboutCalendars.current && calendars.length === 0) {
      hasWarnedAboutCalendars.current = true;
      if (calendarsSchemaStatus === "missing") {
        toast({
          title: "Kalender-Funktion nicht verfügbar",
          description:
            calendarsSchemaError ??
            "Bitte die neuesten Supabase-Migrationen anwenden (shared calendars).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Keine Kalender gefunden",
          description: "Wenn du Supabase gerade aktiviert hast: bitte die neuesten Migrationen anwenden (shared calendars).",
          variant: "destructive",
        });
      }
    }
    const ids = new Set(calendars.map((c) => c.id));
    const current = settings.activeCalendarId;
    if (current && ids.has(current)) return;
    const fallback = defaultCalendarId && ids.has(defaultCalendarId) ? defaultCalendarId : calendars[0]?.id ?? null;
    if (fallback && fallback !== current) {
      updateSettings({ activeCalendarId: fallback });
    }
  }, [
    user,
    calendarsLoading,
    calendars,
    defaultCalendarId,
    calendarsSchemaStatus,
    calendarsSchemaError,
    settings.activeCalendarId,
    updateSettings,
    toast,
  ]);

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
      {/* Calendar controls */}
      {user && (
        <div className="fixed top-4 left-4 z-50 flex gap-2 items-center">
          <Select
            value={effectiveCalendarId ?? ''}
            onValueChange={(id) => updateSettings({ activeCalendarId: id })}
            disabled={calendarsLoading || calendars.length === 0}
          >
            <SelectTrigger className="w-[220px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder={calendarsLoading ? 'Lade Kalender…' : 'Kalender wählen'} />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (calendarsSchemaStatus === "missing") {
                toast({
                  title: "Kalender-Funktion nicht verfügbar",
                  description:
                    calendarsSchemaError ??
                    "Bitte die neuesten Supabase-Migrationen anwenden (shared calendars).",
                  variant: "destructive",
                });
                return;
              }
              setCreateCalendarDialogOpen(true);
            }}
            className="bg-background/80 backdrop-blur-sm"
            title="Neuen Kalender erstellen"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="bg-background/80 backdrop-blur-sm"
            title="Kalender teilen"
            disabled={!activeCalendar || (activeCalendar.role !== 'owner' && activeCalendar.role !== 'editor')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}

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
        calendarId={effectiveCalendarId}
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

      <CreateCalendarDialog
        open={createCalendarDialogOpen}
        onOpenChange={setCreateCalendarDialogOpen}
        onCreate={async (name) => {
          const result = await createCalendar(name);
          if (result.id) updateSettings({ activeCalendarId: result.id });
          return result;
        }}
      />

      <CalendarShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        calendar={activeCalendar}
        onCreateInvite={async (role, expiresInDays) => {
          if (!activeCalendar) return null;
          const token = await createInvite(activeCalendar.id, role, expiresInDays);
          if (!token) {
            toast({ title: 'Fehler beim Teilen', variant: 'destructive' });
          }
          return token;
        }}
      />
    </div>
  );
};

export default Index;
