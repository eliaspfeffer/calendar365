import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { ACTIVE_CALENDAR_OWNER_STORAGE_KEY } from "@/lib/calendarSharing";

export default function JoinCalendar() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [loginOpen, setLoginOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const parsedToken = useMemo(() => {
    if (!token) return null;
    return token;
  }, [token]);

  const handleJoin = async () => {
    if (!parsedToken) return;
    if (!user) {
      setLoginOpen(true);
      return;
    }

    setIsJoining(true);
    const { data, error } = await supabase.rpc("accept_calendar_share", {
      p_token: parsedToken,
    });
    setIsJoining(false);

    if (error) {
      toast({
        title: "Couldn’t join calendar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const row = data?.[0];
    if (!row?.owner_id) {
      toast({
        title: "Couldn’t join calendar",
        description: "Unexpected response from server.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem(ACTIVE_CALENDAR_OWNER_STORAGE_KEY, row.owner_id);
    toast({ title: "Calendar joined" });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="font-display text-3xl tracking-wide text-primary">
          Join calendar
        </div>
        <div className="text-sm text-muted-foreground">
          {parsedToken
            ? "Open the shared calendar link and join with your account."
            : "Missing invite token."}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleJoin} disabled={!parsedToken || isLoading || isJoining}>
            {user ? (isJoining ? "Joining..." : "Join") : "Sign in to join"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>
        </div>
      </Card>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

