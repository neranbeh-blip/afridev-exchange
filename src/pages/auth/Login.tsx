
import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Network,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    locationState?.message ?? ""
  );

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
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

      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please check your credentials and try again.";

      if (message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage(
          'Your email address has not been verified yet. Please open your verification email and click "Verify my email" before signing in.'
        );
      } else if (
        message.toLowerCase().includes("invalid login credentials")
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

  async function handleGitHubLogin() {
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in with GitHub. Please try again.";

      setErrorMessage(message);
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050b17] text-white">
      <style>{authMotionStyles}</style>
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="auth-grid absolute inset-0" />
        <div className="auth-ambient-orb absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="auth-enter relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={afridevLogo}
              alt="AfriDev Exchange"
              className="h-10 w-auto"
            />
          </Link>

          <Link
            to="/register"
            className="text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            Create account
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:py-12">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.85fr] lg:gap-14">
          <section className="auth-enter relative hidden min-h-[650px] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[#071226] p-8 shadow-2xl shadow-blue-950/30 lg:flex xl:p-10">
            <img src={africaDeveloperNetwork} alt="African developers collaborating through a digital network" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#071226]/45 via-[#071226]/78 to-[#050b17]" />
            <div className="auth-grid absolute inset-0" />
            <div className="auth-ambient-orb absolute -right-20 top-12 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="auth-ambient-orb absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.08] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-cyan-100"><Sparkles size={14} /> The African developer network</div>
              <h2 className="mt-8 max-w-xl text-4xl font-black leading-[1.07] tracking-[-.04em] xl:text-5xl">Your next big idea starts with <span className="auth-heading-gradient">the right people.</span></h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Connect your strengths with people who need them. Turn shared knowledge into real products, lasting partnerships and proof of impact.</p>
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
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Sign in to continue building,
                collaborating and exchanging skills.
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

            {/* Error message */}
            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3">
                <p className="text-sm leading-6 text-red-300">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Login card */}
            <div className="auth-glass-card auth-enter auth-enter-delay relative rounded-3xl border border-white/10 p-6 sm:p-8">
              <form onSubmit={handleLogin} className="auth-form-animate space-y-5">
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
                      onChange={(event) => setEmail(event.target.value)}
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
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

                {/* Email/password sign-in */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-shimmer flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
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

              {/* Separator */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-500">
                  OR CONTINUE WITH
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* GitHub sign-in */}
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.04-1.14 3.04-1.14.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3.01 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.02.75 2.06V22c0 .29.2.63.77.52A11.1 11.1 0 0 0 12 .9Z" />
                </svg>
                Continue with GitHub
              </button>

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
          </div>
        </main>
      </div>
    </div>
  );
}

export default Login;
