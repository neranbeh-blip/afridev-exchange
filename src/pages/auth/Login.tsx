import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import afridevLogo from "../../assets/afridev-logo-dark-wordmark.png";

type LocationState = {
  message?: string;
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState =
    (location.state as LocationState | null) ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    ""
  );
  const [successMessage, setSuccessMessage] =
    useState(locationState?.message ?? "");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error(
          "Unable to create your session. Please try again."
        );
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please check your credentials and try again.";

      if (
        message.toLowerCase().includes("email not confirmed")
      ) {
        setErrorMessage(
          "Your email address has not been verified yet. Please open your verification email and click \"Verify my email\" before signing in."
        );
      } else if (
        message
          .toLowerCase()
          .includes("invalid login credentials")
      ) {
        setErrorMessage(
          "Incorrect email or password. Please check your credentials and try again."
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Background */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">

        {/* Header */}

        <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">

            <Link
              to="/"
              className="flex items-center"
              aria-label="AfriDev Exchange home"
            >
              <img
                src={afridevLogo}
                alt="AfriDev Developer Exchange"
                className="h-11 w-auto max-w-[190px] object-contain"
              />
            </Link>

            <div className="text-sm text-slate-400">
              New to AfriDev?

              <Link
                to="/register"
                className="ml-2 font-bold text-blue-400 transition hover:text-blue-300"
              >
                Create account
              </Link>
            </div>

          </div>
        </header>

        {/* Main */}

        <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">

          <div className="w-full max-w-md">

            {/* Intro */}

            <div className="mb-8 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-xl shadow-blue-950/20">

                <img
                  src={afridevLogo}
                  alt="AfriDev"
                  className="h-full w-full object-contain"
                />

              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                Welcome back
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Sign in to continue building,
                collaborating and exchanging skills
                across Africa.
              </p>

            </div>

            {/* Success message */}

            {successMessage && (
              <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">

                <p className="text-sm leading-6 text-emerald-300">
                  {successMessage}
                </p>

              </div>
            )}

            {/* Error */}

            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3">

                <p className="text-sm leading-6 text-red-300">
                  {errorMessage}
                </p>

              </div>
            )}

            {/* Login card */}

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-8">

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                {/* Email */}

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Email address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      autoComplete="email"
                      placeholder="you@example.com"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                </div>

                {/* Password */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-200"
                    >
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                    >
                      Forgot password?
                    </Link>

                  </div>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Submit */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={17} />
                    </>
                  )}

                </button>

              </form>

              {/* Footer */}

              <div className="mt-6 border-t border-white/10 pt-5 text-center">

                <p className="text-sm text-slate-500">
                  Don't have an account?

                  <Link
                    to="/register"
                    className="ml-1 font-bold text-blue-400 hover:text-blue-300"
                  >
                    Create account
                  </Link>
                </p>

              </div>

            </div>

            {/* Security note */}

            <p className="mt-6 text-center text-xs leading-5 text-slate-600">
              Your account is secured through Supabase
              Authentication. Never share your password
              or authentication credentials.
            </p>

          </div>

        </main>

      </div>
    </div>
  );
}

export default Login;