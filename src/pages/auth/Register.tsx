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
  Network,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import afridevLogo from "../../assets/afridev-logo-dark-wordmark.png";
import africaDeveloperNetwork from "../../assets/africa-developer-network.png";

const authMotionStyles = `
  @keyframes auth-rise {
    from { opacity: 0; transform: translate3d(0, 24px, 0) scale(.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes auth-drift {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(34px, -20px, 0) scale(1.08); }
  }
  @keyframes auth-float {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
    50% { transform: translate3d(0, -10px, 0) rotate(1.5deg); }
  }
  @keyframes auth-orbit { to { transform: rotate(360deg); } }
  @keyframes auth-gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes auth-sheen {
    0%, 18% { transform: translateX(-150%) skewX(-18deg); opacity: 0; }
    32% { opacity: .8; }
    58%, 100% { transform: translateX(160%) skewX(-18deg); opacity: 0; }
  }
  @keyframes auth-pulse-glow {
    0%, 100% { box-shadow: 0 0 22px rgba(34,211,238,.08); }
    50% { box-shadow: 0 0 38px rgba(59,130,246,.23); }
  }
  .auth-grid {
    background-image: linear-gradient(rgba(148,163,184,.075) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.075) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(to bottom, black, transparent 86%);
    opacity: .28;
  }
  .auth-ambient-orb { animation: auth-drift 17s ease-in-out infinite; will-change: transform; }
  .auth-enter { animation: auth-rise .8s cubic-bezier(.2,.75,.25,1) both; }
  .auth-enter-delay { animation-delay: .13s; }
  .auth-float { animation: auth-float 7s ease-in-out infinite; }
  .auth-orbit { animation: auth-orbit 34s linear infinite; }
  .auth-orbit-reverse { animation-direction: reverse; }
  .auth-heading-gradient {
    background: linear-gradient(100deg, #fff 0%, #bae6fd 32%, #60a5fa 58%, #a5b4fc 78%, #fff 100%);
    background-size: 220% 220%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: auth-gradient 8s ease-in-out infinite;
  }
  .auth-glass-card {
    background: linear-gradient(145deg, rgba(15,23,42,.92), rgba(9,15,29,.88));
    box-shadow: 0 30px 90px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.055);
    backdrop-filter: blur(24px);
  }
  .auth-form-animate > * { animation: auth-rise .55s cubic-bezier(.2,.75,.25,1) both; }
  .auth-form-animate > *:nth-child(1) { animation-delay: .12s; }
  .auth-form-animate > *:nth-child(2) { animation-delay: .19s; }
  .auth-form-animate > *:nth-child(3) { animation-delay: .26s; }
  .auth-form-animate > *:nth-child(4) { animation-delay: .33s; }
  .auth-form-animate > *:nth-child(5) { animation-delay: .40s; }
  .auth-form-animate > *:nth-child(6) { animation-delay: .47s; }
  .auth-shimmer {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: linear-gradient(110deg, #2563eb 0%, #4f46e5 48%, #0891b2 100%);
    background-size: 200% 200%;
    animation: auth-gradient 7s ease-in-out infinite, auth-pulse-glow 4s ease-in-out infinite;
    transition: filter .25s ease, transform .25s ease;
  }
  .auth-shimmer::after {
    content: '';
    position: absolute;
    inset: -30% auto -30% -30%;
    width: 32%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
    z-index: 0;
    pointer-events: none;
    animation: auth-sheen 5.5s ease-in-out infinite;
  }
  .auth-shimmer > * { position: relative; z-index: 1; }
  .auth-feature-chip { border: 1px solid rgba(255,255,255,.1); background: rgba(15,23,42,.52); transition: border-color .25s ease, background .25s ease, transform .25s ease; }
  .auth-feature-chip:hover { border-color: rgba(103,232,249,.35); background: rgba(30,41,59,.8); transform: translateY(-2px); }
  @media (prefers-reduced-motion: reduce) {
    .auth-ambient-orb, .auth-enter, .auth-float, .auth-orbit, .auth-heading-gradient, .auth-form-animate > *, .auth-shimmer, .auth-shimmer::after { animation: none !important; }
    .auth-feature-chip, .auth-shimmer { transition: none !important; }
  }
`;

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
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050b17] text-white">
      <style>{authMotionStyles}</style>
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="auth-grid absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="auth-ambient-orb absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        {/* Header */}
        <header className="auth-enter relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
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
        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:py-12">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.85fr] lg:gap-14">
          <section className="auth-enter relative hidden min-h-[690px] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[#071226] p-8 shadow-2xl shadow-blue-950/30 lg:flex xl:p-10">
            <img src={africaDeveloperNetwork} alt="African developers collaborating through a digital network" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#071226]/45 via-[#071226]/78 to-[#050b17]" />
            <div className="auth-grid absolute inset-0" />
            <div className="auth-ambient-orb absolute -right-20 top-12 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="auth-ambient-orb absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.08] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-cyan-100"><Sparkles size={14} /> The African developer network</div>
              <h2 className="mt-8 max-w-xl text-4xl font-black leading-[1.07] tracking-[-.04em] xl:text-5xl">Turn your skills into <span className="auth-heading-gradient">real-world impact.</span></h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Join a network where developers share what they know, learn what they need, solve real problems and prove what they can build.</p>
            </div>
            <div className="relative z-10 flex flex-1 items-center justify-center py-8">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <div className="auth-orbit absolute inset-0 rounded-full border border-cyan-200/20 border-dashed" />
                <div className="auth-orbit auth-orbit-reverse absolute inset-5 rounded-full border border-blue-300/20" />
                <div className="absolute inset-12 rounded-full border border-white/10 bg-blue-400/[.06]" />
                <div className="auth-float relative flex h-24 w-24 items-center justify-center rounded-[1.8rem] border border-cyan-200/25 bg-slate-950/80 text-cyan-200 shadow-[0_0_60px_rgba(34,211,238,.16)] backdrop-blur-xl"><Network size={42} strokeWidth={1.4} /></div>
                <div className="auth-float absolute -right-8 top-9 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 shadow-xl backdrop-blur-xl" style={{ animationDelay: "-2s" }}><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Smart match</p><p className="mt-1 text-lg font-black text-cyan-200">94% <span className="text-xs font-semibold text-emerald-300">compatible</span></p></div>
                <div className="auth-float absolute -left-10 bottom-8 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 shadow-xl backdrop-blur-xl" style={{ animationDelay: "-4s" }}><div className="flex items-center gap-2"><Users size={15} className="text-blue-300" /><span className="text-xs font-bold text-white">Build together</span></div><p className="mt-1 text-[10px] text-slate-400">Skills become solutions</p></div>
                <div className="absolute bottom-0 right-8 flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200"><CheckCircle2 size={18} /></div>
              </div>
            </div>
            <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <div className="auth-feature-chip rounded-xl px-3 py-3"><p className="text-sm font-bold text-white">Exchange</p><p className="mt-1 text-[11px] text-slate-400">Knowledge both ways</p></div>
              <div className="auth-feature-chip rounded-xl px-3 py-3"><p className="text-sm font-bold text-white">Collaborate</p><p className="mt-1 text-[11px] text-slate-400">Build with a team</p></div>
              <div className="auth-feature-chip rounded-xl px-3 py-3"><p className="text-sm font-bold text-white">Get verified</p><p className="mt-1 text-[11px] text-slate-400">Show real impact</p></div>
            </div>
          </section>
          <div className="auth-enter auth-enter-delay mx-auto w-full max-w-md">
            {/* Intro */}
            <div className="mb-8 text-center">
              <div className="auth-float mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-xl shadow-blue-950/20">
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
            <div className="auth-glass-card auth-enter auth-enter-delay relative rounded-3xl border border-white/10 p-6 sm:p-8">
              <form
                onSubmit={handleRegister}
                className="auth-form-animate space-y-5"
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
                  className="auth-shimmer flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default Register;