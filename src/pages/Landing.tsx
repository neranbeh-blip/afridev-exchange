import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Code2,
  Lightbulb,
  Menu,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useState } from "react";
import { Link } from "react-router-dom";

import africaDeveloperNetwork from "../assets/africa-developer-network.png";

const flow = [
  [
    "01",
    "Discover",
    "Find African developers based on what they offer and need.",
    Users,
  ],
  [
    "02",
    "Match",
    "AI helps identify complementary capabilities and explains the match.",
    BrainCircuit,
  ],
  [
    "03",
    "Exchange",
    "Turn a skill match into a structured exchange.",
    Network,
  ],
  [
    "04",
    "Build",
    "Collaborate on real projects and transform problems into solutions.",
    Code2,
  ],
  [
    "05",
    "Verify",
    "Build evidence of what you actually accomplished.",
    ShieldCheck,
  ],
  [
    "06",
    "Grow",
    "Strengthen your Developer Passport and trusted track record.",
    Sparkles,
  ],
] as const;

const benefits = [
  [
    "Exchange Skills",
    "Trade what you know for what you need instead of competing for every opportunity.",
    Network,
  ],
  [
    "Smart Matching",
    "AI-assisted matching finds developers with complementary capabilities.",
    BrainCircuit,
  ],
  [
    "Solve Real Problems",
    "Community problems can become collaborative projects with real teams behind them.",
    Lightbulb,
  ],
  [
    "Prove Your Work",
    "Skills are supported by evidence, projects, exchanges and verified contributions.",
    CheckCircle2,
  ],
] as const;

function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">

          {/* BRAND */}

          <Link
            to="/"
            onClick={closeMobile}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black shadow-lg shadow-blue-600/25">
              AD
            </div>

            <div>
              <div className="text-base font-bold">
                AfriDev Exchange
              </div>

              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Build together
              </div>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#why-afridev"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Why AfriDev
            </a>

            <a
              href="#problem-to-project"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Problems
            </a>

            <a
              href="#passport"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Developer Passport
            </a>
          </nav>

          {/* DESKTOP ACTIONS */}

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Join AfriDev
            </Link>
          </div>

          {/* MOBILE BUTTON */}

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-xl border border-white/10 p-2.5 md:hidden"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {/* MOBILE MENU */}

        {mobileOpen && (
          <div className="border-t border-white/10 px-5 py-5 md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-2">

              <a
                href="#how-it-works"
                onClick={closeMobile}
                className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                How it works
              </a>

              <a
                href="#why-afridev"
                onClick={closeMobile}
                className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Why AfriDev
              </a>

              <a
                href="#problem-to-project"
                onClick={closeMobile}
                className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Problems
              </a>

              <a
                href="#passport"
                onClick={closeMobile}
                className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Developer Passport
              </a>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold"
                >
                  Join AfriDev
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>

        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="relative">
          <div className="absolute inset-0 -z-10 overflow-hidden">

            <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl" />

            <div className="absolute right-0 top-48 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

          </div>

          <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-28">

            {/* HERO CONTENT */}

            <div className="flex flex-col justify-center">

              <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300">
                <Sparkles size={14} />
                Built for African developers
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Exchange skills.

                <span className="block text-blue-400">
                  Build together.
                </span>

                <span className="block">
                  Prove your impact.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                AfriDev Exchange connects African developers
                through skill exchange, intelligent matching,
                real-world problems, collaborative projects
                and verified contributions.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold shadow-xl shadow-blue-600/20 transition hover:bg-blue-500"
                >
                  Join AfriDev
                  <ArrowRight size={17} />
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold transition hover:bg-white/10"
                >
                  See how it works
                  <ChevronRight size={17} />
                </a>

              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-400">

                <span className="flex items-center gap-2">
                  <CheckCircle2
                    size={15}
                    className="text-blue-400"
                  />
                  Skill exchange
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2
                    size={15}
                    className="text-blue-400"
                  />
                  AI-assisted matching
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2
                    size={15}
                    className="text-blue-400"
                  />
                  Verified contributions
                </span>

              </div>
            </div>

            {/* =================================================
                AFRICA DEVELOPER NETWORK HERO IMAGE
            ================================================== */}

            <div className="relative flex items-center justify-center">

              <div className="absolute h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl" />

              <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/50">

                <img
                  src={africaDeveloperNetwork}
                  alt="African developers connected through a digital network"
                  className="block h-auto w-full object-cover"
                />

                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:p-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                        African Developer Network
                      </p>

                      <p className="mt-1 text-sm font-bold text-white sm:text-base">
                        Connect. Exchange. Build.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">

                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

                    </div>

                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =====================================================
            FLOW
        ====================================================== */}

        <section
          id="how-it-works"
          className="scroll-mt-24 border-y border-white/10 bg-white/[0.025]"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 md:grid-cols-3 lg:grid-cols-6 lg:px-10">

            {flow.map(
              ([number, title, text, Icon]) => (
                <div
                  key={number}
                  title={text}
                  className="border-r border-white/10 px-4 py-7 first:border-l sm:px-5"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-[10px] font-bold tracking-[0.18em] text-slate-500">
                      {number}
                    </span>

                    <Icon
                      size={17}
                      className="text-blue-400"
                    />

                  </div>

                  <p className="mt-3 text-sm font-bold">
                    {title}
                  </p>

                </div>
              )
            )}

          </div>
        </section>

        {/* =====================================================
            WHY AFRIDEV
        ====================================================== */}

        <section
          id="why-afridev"
          className="scroll-mt-24"
        >
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-28">

            <div className="max-w-2xl">

              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                Why AfriDev
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                More than a developer directory.
              </h2>

              <p className="mt-4 text-slate-400">
                AfriDev is designed around what developers
                can exchange, what they can build together,
                and what they can prove.
              </p>

            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {benefits.map(
                ([title, text, Icon]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06]"
                  >

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Icon size={21} />
                    </div>

                    <h3 className="mt-5 font-bold">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {text}
                    </p>

                  </div>
                )
              )}

            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ====================================================== */}

        <section className="border-y border-white/10 bg-white/[0.02]">

          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-28">

            <div className="max-w-2xl">

              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                How it works
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                From capability to collaboration.
              </h2>

              <p className="mt-4 text-slate-400">
                A complete loop for discovering people,
                exchanging knowledge and turning capability
                into real-world impact.
              </p>

            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {flow.map(
                ([number, title, text, Icon]) => (
                  <div
                    key={number}
                    className="group rounded-2xl border border-white/10 bg-slate-950/50 p-6"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-black text-blue-400">
                        {number}
                      </span>

                      <Icon
                        size={20}
                        className="text-slate-500 group-hover:text-blue-400"
                      />

                    </div>

                    <h3 className="mt-8 text-lg font-bold">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {text}
                    </p>

                  </div>
                )
              )}

            </div>
          </div>
        </section>

        {/* =====================================================
            PROBLEMS → PROJECTS
        ====================================================== */}

        <section
          id="problem-to-project"
          className="scroll-mt-24"
        >

          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-28">

            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Problems → Projects
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Don't just post a problem.
                  Build the solution.
                </h2>

                <p className="mt-5 leading-7 text-slate-400">
                  A community problem can attract developers,
                  become a team, and turn into a real project
                  inside AfriDev Exchange.
                </p>

                <Link
                  to="/register"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300"
                >
                  Start building
                  <ArrowRight size={16} />
                </Link>

              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">

                <div className="grid gap-3 sm:grid-cols-5 sm:items-center">

                  {[
                    ["Problem", "A real need is posted."],
                    ["Interest", "Developers respond."],
                    ["Team", "The right people join."],
                    ["Project", "The problem becomes a build."],
                    ["Impact", "The work gets delivered."],
                  ].map(
                    ([title, text], index) => (
                      <div
                        key={title}
                        className="contents"
                      >

                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:min-h-32">

                          <div className="text-xs font-bold text-blue-400">
                            0{index + 1}
                          </div>

                          <p className="mt-3 text-sm font-bold">
                            {title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {text}
                          </p>

                        </div>

                        {index < 4 && (
                          <div className="hidden justify-center text-slate-600 sm:flex">
                            <ArrowRight size={16} />
                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            DEVELOPER PASSPORT
        ====================================================== */}

        <section
          id="passport"
          className="scroll-mt-24 border-y border-white/10 bg-white/[0.02]"
        >

          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-28">

            <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Developer Passport
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Don't just say you can build it.
                  Show it.
                </h2>

                <p className="mt-5 max-w-2xl leading-7 text-slate-400">
                  Your AfriDev Passport brings together
                  capabilities, evidence, projects,
                  exchanges and verified contributions
                  into a profile that demonstrates what
                  you actually do.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">

                  {[
                    "Skills & capability",
                    "Evidence and verification",
                    "Projects and collaborations",
                    "Verified contributions",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm"
                    >

                      <CheckCircle2
                        size={17}
                        className="text-blue-400"
                      />

                      {item}

                    </div>
                  ))}

                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/20">

                <div className="flex items-center gap-4 border-b border-white/10 pb-5">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black">
                    AD
                  </div>

                  <div>

                    <p className="font-bold">
                      Developer Passport
                    </p>

                    <p className="text-xs text-slate-500">
                      Capability + verified experience
                    </p>

                  </div>

                </div>

                <div className="mt-5 space-y-4">

                  <div>

                    <div className="mb-2 flex justify-between text-xs">

                      <span className="text-slate-400">
                        Capability
                      </span>

                      <span className="font-semibold text-blue-300">
                        Evidence-backed
                      </span>

                    </div>

                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[84%] rounded-full bg-blue-500" />
                    </div>

                  </div>

                  <div>

                    <div className="mb-2 flex justify-between text-xs">

                      <span className="text-slate-400">
                        AfriDev experience
                      </span>

                      <span className="font-semibold text-blue-300">
                        Growing
                      </span>

                    </div>

                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[68%] rounded-full bg-blue-400" />
                    </div>

                  </div>

                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">

                  {[
                    ["Skills", "8"],
                    ["Projects", "4"],
                    ["Verified", "11"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
                    >

                      <div className="text-lg font-black">
                        {value}
                      </div>

                      <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                        {label}
                      </div>

                    </div>
                  ))}

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ====================================================== */}

        <section>

          <div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 lg:py-32">

            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20">
              <Sparkles size={25} />
            </div>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Your skills have value.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Exchange them. Build with them.
              Prove them.
            </p>

            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold shadow-xl shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Join AfriDev Exchange
              <ArrowRight size={17} />
            </Link>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/10">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">

          <div>
            © {new Date().getFullYear()} AfriDev Exchange
          </div>

          <div className="text-slate-600">
            Don't just show what you can do.
            Exchange it. Build with it.
            Prove it.
          </div>

        </div>

      </footer>

    </div>
  );
}

export default Landing;