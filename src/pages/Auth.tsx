import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Loader2 } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const { user, isLoading, signInWithPassword, signUpWithPassword } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const nextParam = new URLSearchParams(location.search).get('next');
  const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : '/';

  // Redirect if already logged in
  if (!isLoading && user) {
    return <Navigate to={safeNext} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setNeedsEmailConfirmation(false);

    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password.',
        variant: 'destructive',
      });
      return;
    }

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

    setIsSubmitting(true);

    if (mode === 'login') {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        const messageLc = error.message.toLowerCase();
        const hint = messageLc.includes("invalid login credentials")
          ? ' If you previously signed in via magic link, use "Forgot password?" to set a password.'
          : '';
        toast({
          title: 'Error',
          description: `${error.message}${hint}`,
          variant: 'destructive',
        });
      }
    } else {
      const { error, needsEmailConfirmation } = await signUpWithPassword(email, password);
      if (error) {
        const messageLc = error.message.toLowerCase();
        const hint = messageLc.includes("already registered") || messageLc.includes("user already registered")
          ? ' Account already exists — use "Forgot password?" to set a password.'
          : '';
        toast({
          title: 'Error',
          description: `${error.message}${hint}`,
          variant: 'destructive',
        });
      } else if (needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
        toast({
          title: 'Confirm your email',
          description: 'Check your email to confirm your account, then come back to log in.',
        });
      } else {
        toast({
          title: 'Account created',
          description: 'You are now signed in.',
        });
      }
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-4xl tracking-wide">365 Calendar</CardTitle>
          <CardDescription>
            {needsEmailConfirmation
              ? 'Confirm your email address to finish creating your account.'
              : mode === 'register'
                ? 'Create an account with email and password.'
                : 'Sign in with your email and password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as 'login' | 'register');
              setNeedsEmailConfirmation(false);
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={isSubmitting}>
                Login
              </TabsTrigger>
              <TabsTrigger value="register" disabled={isSubmitting}>
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
                <Button asChild variant="link" className="w-full px-0">
                  <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>Forgot password?</Link>
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>
                <Button asChild variant="link" className="w-full px-0">
                  <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                    Already used magic link before? Set a password
                  </Link>
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
