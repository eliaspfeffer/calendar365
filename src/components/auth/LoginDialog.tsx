import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Please use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please confirm your password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    if (mode === 'login') {
      const { error } = await signInWithPassword(email, password);
      setIsLoading(false);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        handleOpenChange(false);
      }
    } else {
      const { error, needsEmailConfirmation } = await signUpWithPassword(email, password);
      setIsLoading(false);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else if (needsEmailConfirmation) {
        toast({
          title: 'Confirm your email',
          description: 'Check your email to confirm your account, then come back to log in.',
        });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        handleOpenChange(false);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMode('login');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Sign in to save notes
          </DialogTitle>
          <DialogDescription>
            Sign in (or create an account) to save your calendar notes privately.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as 'login' | 'register');
            setPassword('');
            setConfirmPassword('');
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" disabled={isLoading}>
              Login
            </TabsTrigger>
            <TabsTrigger value="register" disabled={isLoading}>
              Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSupabaseConfigured && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  Supabase isn’t configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable sign-in.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || !isSupabaseConfigured}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !isSupabaseConfigured}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !isSupabaseConfigured}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              <Button asChild variant="link" className="w-full px-0">
                <Link to={`/reset-password?email=${encodeURIComponent(email)}`} onClick={() => handleOpenChange(false)}>
                  Forgot password?
                </Link>
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSupabaseConfigured && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  Supabase isn’t configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable sign-in.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || !isSupabaseConfigured}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !isSupabaseConfigured}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password-confirm">Confirm password</Label>
                <Input
                  id="register-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !isSupabaseConfigured}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !isSupabaseConfigured}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
              <Button asChild variant="link" className="w-full px-0">
                <Link to={`/reset-password?email=${encodeURIComponent(email)}`} onClick={() => handleOpenChange(false)}>
                  Already used magic link before? Set a password
                </Link>
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
