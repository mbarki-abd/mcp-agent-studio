import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Bot, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useVerifyEmail } from '../core/api/hooks';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  const verifyEmail = useVerifyEmail();

  useEffect(() => {
    if (token) {
      verifyEmail.mutateAsync(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-8">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <h1 className="text-2xl font-bold">Verifying your email...</h1>
            <p className="text-muted-foreground text-center mt-2">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Email Verified!</h1>
            <p className="text-muted-foreground text-center mt-2">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
          </div>

          <Button onClick={() => navigate('/login')} className="w-full">
            Continue to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">MCP Agent Studio</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">
            {token ? 'Verification Failed' : 'Invalid Link'}
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            {token
              ? 'This verification link is invalid or has expired.'
              : 'No verification token provided. Please use the link from your email.'}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>Need a new verification link?</p>
          <p className="mt-2">
            Sign in to your account and request a new verification email from your profile settings.
          </p>
        </div>

        <Button onClick={() => navigate('/login')} className="w-full">
          Go to Sign In
        </Button>

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

export default VerifyEmailPage;
