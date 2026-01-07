import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCalendars } from "@/hooks/useCalendars";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

export default function Invite() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { updateSettings } = useSettings(user?.id || null);
  const { toast } = useToast();
  const { acceptInvite } = useCalendars(user?.id || null);

  const [isAccepting, setIsAccepting] = useState(false);

  const nextAuthUrl = useMemo(() => {
    const next = location.pathname;
    return `/auth?next=${encodeURIComponent(next)}`;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    if (!token) return;
    if (isAccepting) return;

    let cancelled = false;
    (async () => {
      setIsAccepting(true);
      const calendarId = await acceptInvite(token);
      if (cancelled) return;
      if (!calendarId) {
        setIsAccepting(false);
        toast({
          title: "Invalid invite",
          description: "The link has expired or no longer exists.",
          variant: "destructive",
        });
        return;
      }
      updateSettings({ activeCalendarId: calendarId });
      toast({ title: "Joined calendar" });
      navigate("/", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, token, acceptInvite, isAccepting, updateSettings, toast, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite</CardTitle>
            <CardDescription>No token found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle>Accept invite</CardTitle>
            <CardDescription>Please sign in to join the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link to={nextAuthUrl}>Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>Accepting invite…</CardTitle>
          <CardDescription>You’ll be redirected shortly.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
