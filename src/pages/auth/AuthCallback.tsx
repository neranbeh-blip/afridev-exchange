import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";

function AuthCallback() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error(
            "Your email was verified, but we could not create your session."
          );
        }

        if (!mounted) return;

        setMessage(
          "Email verified successfully. Taking you to your dashboard..."
        );

        window.setTimeout(() => {
          if (mounted) {
            navigate("/dashboard", { replace: true });
          }
        }, 900);
      } catch (callbackError) {
        console.error("Authentication callback error:", callbackError);

        if (!mounted) return;

        setError(true);
        setMessage(
          "Your email may have been verified, but we could not sign you in automatically."
        );

        window.setTimeout(() => {
          if (mounted) {
            navigate("/login", {
              replace: true,
              state: {
                message:
                  "Your email verification may have completed. Please sign in to continue.",
              },
            });
          }
        }, 1800);
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {!error ? (
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Loader2 size={30} className="animate-spin" />
            </div>
          ) : (
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={30} />
            </div>
          )}

          <h1 className="text-2xl font-black tracking-tight">
            {error
              ? "Email verification complete"
              : "Verifying your email"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {message}
          </p>

          <div className="mt-8 text-xs text-slate-600">
            AfriDev Exchange
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthCallback;