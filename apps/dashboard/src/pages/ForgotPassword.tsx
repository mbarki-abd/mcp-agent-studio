import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bot, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useForgotPassword } from '../core/api/hooks';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPassword.mutateAsync(email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-center mt-2">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>Didn't receive the email? Check your spam folder or</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-primary hover:underline"
            >
              try another email address
            </button>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">MCP Agent Studio</span>
          </div>
          <h1 className="text-xl font-semibold mt-4">Forgot your password?</h1>
          <p className="text-muted-foreground text-center mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="pl-10"
              />
            </div>
          </div>

          {forgotPassword.error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
              {forgotPassword.error instanceof Error
                ? forgotPassword.error.message
                : 'An error occurred'}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

        {/* Back to login */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
