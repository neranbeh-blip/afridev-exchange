import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import afridevLogo from "../../assets/afridev-logo-dark-wordmark.png";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordIsValid =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccess(false);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!passwordIsValid) {
      setErrorMessage(
        "Your password must contain at least 8 characters, including uppercase, lowercase, a number and a special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * After the user clicks the verification link in the email,
       * Supabase will redirect them to this callback.
       *
       * The callback will exchange the Supabase verification code
       * for a real authenticated session and then send the user
       * directly to the dashboard.
       */
      const emailRedirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        throw error;
      }

      /*
       * If Supabase returns a session immediately,
       * email confirmation is disabled or not required.
       */
      if (data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      /*
       * When email confirmation is enabled,
       * Supabase normally returns no session.
       *
       * The user must verify their email first.
       */
      setSuccess(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link
              to="/"
              className="flex items-center gap-3"
              aria-label="AfriDev Exchange home"
            >
              <img
                src={afridevLogo}
                alt="AfriDev Developer Exchange"
                className="h-11 w-auto max-w-[190px] object-contain"
              />
            </Link>

            <div className="text-sm text-slate-400">
              Already a member?
              <Link
                to="/login"
                className="ml-2 font-bold text-blue-400 transition hover:text-blue-300"
              >
                Sign in
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
                Create your AfriDev account
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Join African developers who exchange skills,
                collaborate and build real solutions together.
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <h2 className="font-bold text-emerald-300">
                      Check your email
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                      We sent a confirmation link to{" "}
                      <span className="font-semibold text-emerald-200">
                        {email}
                      </span>
                      .
                    </p>

                    <p className="mt-2 text-xs leading-5 text-emerald-100/60">
                      Open the email and click the confirmation button.
                      Once your email is verified, you'll be signed in
                      automatically and taken to your AfriDev dashboard.
                    </p>

                    <Link
                      to="/login"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200"
                    >
                      Go to sign in
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
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

            {/* Registration card */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >
                {/* Full name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <UserRound
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      autoComplete="name"
                      placeholder="Your full name"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

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
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
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
                        setShowPassword((value) => !value)
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

                  <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[
                      [
                        passwordRequirements.length,
                        "At least 8 characters",
                      ],
                      [
                        passwordRequirements.uppercase,
                        "One uppercase letter",
                      ],
                      [
                        passwordRequirements.lowercase,
                        "One lowercase letter",
                      ],
                      [
                        passwordRequirements.number,
                        "One number",
                      ],
                      [
                        passwordRequirements.special,
                        "One special character",
                      ],
                    ].map(([valid, label]) => (
                      <div
                        key={String(label)}
                        className={`flex items-center gap-2 text-xs ${
                          valid
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            valid
                              ? "bg-emerald-400"
                              : "bg-slate-600"
                          }`}
                        />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        confirmPassword === password
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {confirmPassword === password
                        ? "Passwords match."
                        : "Passwords do not match."}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?
                  <Link
                    to="/login"
                    className="ml-1 font-bold text-blue-400 hover:text-blue-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            {/* Security note */}
            <p className="mt-6 text-center text-xs leading-5 text-slate-600">
              Your account is secured through Supabase
              Authentication. Never share your password or
              authentication credentials.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Register;