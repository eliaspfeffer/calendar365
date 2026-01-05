import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const { user, session, isLoading, requestPasswordReset, updatePassword } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initialEmail = useMemo(() => {
    const emailParam = new URLSearchParams(location.search).get("email");
    return emailParam ?? "";
  }, [location.search]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const hasRecoverySession = Boolean(session && user);

  // If user navigates here while already signed in normally, we still allow changing password.
  const canSetPassword = hasRecoverySession;

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    const { error } = await requestPasswordReset(email.trim());
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a password reset link.",
    });
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast({ title: "Password required", description: "Please enter a new password.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Please use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your password.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    navigate("/auth", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user just changed their password and is already signed in, take them home.
  if (!canSetPassword && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="font-display text-3xl tracking-wide">
            {canSetPassword ? "Set a new password" : "Reset your password"}
          </CardTitle>
          <CardDescription>
            {canSetPassword
              ? "Choose a password for your account."
              : "Enter your email and we’ll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canSetPassword ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <Input
                type="password"
                placeholder="New password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-12"
                autoComplete="new-password"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-12"
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSendReset} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="h-12"
                autoComplete="email"
              />
              <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                Back to login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

