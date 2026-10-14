import {
  ArrowDown,
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
  Zap,
  Globe2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import afridevLogo from "../assets/afridev-logo-dark-wordmark.png";
import africaDeveloperNetwork from "../assets/africa-developer-network.png";

const flow = [
  { number: "01", title: "Discover", text: "Find African developers based on what they offer and need.", icon: Users },
  { number: "02", title: "Match", text: "Identify complementary capabilities and understand why they fit.", icon: BrainCircuit },
  { number: "03", title: "Exchange", text: "Turn a promising skill match into a structured exchange.", icon: Network },
  { number: "04", title: "Build", text: "Collaborate on projects and transform problems into solutions.", icon: Code2 },
  { number: "05", title: "Verify", text: "Build evidence of what you actually accomplished.", icon: ShieldCheck },
  { number: "06", title: "Grow", text: "Strengthen your Developer Passport and trusted track record.", icon: Sparkles },
] as const;

const benefits = [
  { title: "Exchange Skills", text: "Trade what you know for what you need instead of competing for every opportunity.", icon: Network, tone: "cyan" },
  { title: "Smart Matching", text: "Discover developers with complementary capabilities and shared goals.", icon: BrainCircuit, tone: "violet" },
  { title: "Solve Real Problems", text: "Turn community challenges into collaborative projects with real teams behind them.", icon: Lightbulb, tone: "amber" },
  { title: "Prove Your Work", text: "Back your skills with evidence, projects, exchanges and verified contributions.", icon: CheckCircle2, tone: "green" },
] as const;

const problemStages = [
  ["01", "Problem", "A real need is posted."],
  ["02", "Interest", "Developers respond."],
  ["03", "Team", "The right people join."],
  ["04", "Project", "The solution gets built."],
  ["05", "Impact", "The work gets delivered."],
] as const;

function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="af-landing min-h-screen overflow-hidden bg-[#050b18] text-white selection:bg-cyan-300/30">
      <style>{`
        .af-landing { --af-cyan:#67e8f9; --af-blue:#3b82f6; --af-violet:#8b5cf6; }
        .af-grid { background-image: linear-gradient(rgba(148,163,184,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.055) 1px,transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom,black,transparent 90%); }
        .af-hero-glow { background: conic-gradient(from 90deg,rgba(34,211,238,.05),rgba(59,130,246,.28),rgba(139,92,246,.18),rgba(34,211,238,.05)); filter: blur(40px); animation: afHue 16s linear infinite; }
        .af-in { animation: afRise .85s cubic-bezier(.2,.7,.2,1) both; }
        .af-delay-1 { animation-delay: .12s; } .af-delay-2 { animation-delay: .24s; } .af-delay-3 { animation-delay: .36s; }
        .af-float { animation: afFloat 6s ease-in-out infinite; }
        .af-float-late { animation: afFloat 7s ease-in-out -2.5s infinite; }
        .af-orbit { transform-origin: center; animation: afOrbit 26s linear infinite; }
        .af-orbit-reverse { transform-origin: center; animation: afOrbit 34s linear infinite reverse; }
        .af-shimmer { background: linear-gradient(110deg,#fff 15%,#a5f3fc 42%,#93c5fd 58%,#fff 82%); background-size: 220% 100%; background-clip: text; -webkit-background-clip:text; color:transparent; animation: afShimmer 7s ease-in-out infinite; }
        .af-node { animation: afPulse 2.8s ease-in-out infinite; }
        .af-card { transition: transform .35s ease,border-color .35s ease,background .35s ease,box-shadow .35s ease; }
        .af-card:hover { transform: translateY(-7px); border-color:rgba(103,232,249,.42); background:rgba(255,255,255,.075); box-shadow:0 24px 70px rgba(8,145,178,.10); }
        .af-button { transition:transform .2s ease,box-shadow .2s ease,background .2s ease; }
        .af-button:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(37,99,235,.28); }
        .af-flow-line { background:linear-gradient(90deg,transparent,rgba(103,232,249,.75),transparent); background-size:200% 100%; animation:afLine 4s ease-in-out infinite; }
        @keyframes afRise { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes afFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes afOrbit { to { transform:rotate(360deg); } }
        @keyframes afPulse { 0%,100% { opacity:.7; box-shadow:0 0 0 0 rgba(103,232,249,.16); } 50% { opacity:1; box-shadow:0 0 0 9px rgba(103,232,249,0); } }
        @keyframes afShimmer { 0%,100% { background-position:100% 0; } 50% { background-position:0 0; } }
        @keyframes afHue { to { transform:rotate(360deg); } }
        @keyframes afLine { 0%,100% { background-position:100% 0; opacity:.4; } 50% { background-position:0 0; opacity:1; } }
        @media (prefers-reduced-motion: reduce) { .af-landing *, .af-landing *::before, .af-landing *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; } }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#050b18]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3" onClick={closeMobile} aria-label="AfriDev Exchange home">
            <img src={afridevLogo} alt="AfriDev Developer Exchange" className="h-10 w-auto max-w-[185px] object-contain" />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            <a href="#how-it-works" className="text-sm text-slate-300 transition hover:text-cyan-200">How it works</a>
            <a href="#why-afridev" className="text-sm text-slate-300 transition hover:text-cyan-200">Why AfriDev</a>
            <a href="#problem-to-project" className="text-sm text-slate-300 transition hover:text-cyan-200">Problems</a>
            <a href="#passport" className="text-sm text-slate-300 transition hover:text-cyan-200">Developer Passport</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[.06]">Sign in</Link>
            <Link to="/register" className="af-button inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-extrabold text-slate-950">Join AfriDev <ArrowRight size={16} /></Link>
          </div>
          <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(v => !v)} className="rounded-xl border border-white/10 p-2.5 md:hidden">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileOpen && <div className="border-t border-white/10 bg-[#071020] px-5 py-5 md:hidden"><nav className="mx-auto flex max-w-7xl flex-col gap-2">
          <a href="#how-it-works" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">How it works</a>
          <a href="#why-afridev" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">Why AfriDev</a>
          <a href="#problem-to-project" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">Problems</a>
          <a href="#passport" onClick={closeMobile} className="rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">Developer Passport</a>
          <div className="mt-3 grid grid-cols-2 gap-3"><Link to="/login" onClick={closeMobile} className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold">Sign in</Link><Link to="/register" onClick={closeMobile} className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold">Join AfriDev</Link></div>
        </nav></div>}
      </header>

      <main>
        <section className="relative isolate">
          <div className="af-grid pointer-events-none absolute inset-x-0 top-0 -z-20 h-[850px] opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[800px] overflow-hidden">
            <div className="af-hero-glow absolute -top-40 left-[12%] h-[540px] w-[540px] rounded-full opacity-80" />
            <div className="af-hero-glow absolute -right-40 top-32 h-[500px] w-[500px] rounded-full opacity-50" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-24">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="af-in mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-4 py-2 text-xs font-bold text-cyan-100 shadow-lg shadow-cyan-950/20"><span className="af-node h-2 w-2 rounded-full bg-cyan-300" /> A new way for African developers to grow</div>
              <h1 className="af-in af-delay-1 max-w-4xl text-[clamp(2.8rem,6.4vw,5.6rem)] font-black leading-[.99] tracking-[-.065em]">Exchange skills.<span className="af-shimmer block pb-2">Build together.</span><span className="block text-white">Prove your <span className="text-blue-300">impact.</span></span></h1>
              <p className="af-in af-delay-2 mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">AfriDev Exchange connects African developers through skill exchange, intelligent matching, real-world problems, collaborative projects and verified contributions.</p>
              <div className="af-in af-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="af-button inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-extrabold text-slate-950">Join AfriDev <ArrowRight size={17} /></Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-200/40 hover:bg-white/[.08]">Explore the network <ChevronRight size={17} /></a>
              </div>
              <div className="af-in af-delay-3 mt-9 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-400"><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-cyan-300" /> Skill exchange</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-cyan-300" /> Smart matching</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-cyan-300" /> Verified work</span></div>
              <a href="#how-it-works" className="mt-12 hidden w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-slate-500 transition hover:text-cyan-200 lg:flex">Scroll to explore <ArrowDown size={13} /></a>
            </div>

            <div className="relative mx-auto flex w-full max-w-[590px] items-center justify-center py-5 lg:py-0">
              <div className="pointer-events-none absolute inset-3 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/[.11]" />
              <div className="af-orbit pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-blue-300/20"><span className="af-node absolute left-[18%] top-[20%] h-3 w-3 rounded-full bg-cyan-200" /><span className="absolute bottom-[18%] right-[16%] h-2.5 w-2.5 rounded-full bg-violet-300 shadow-lg shadow-violet-300/50" /></div>
              <div className="af-orbit-reverse pointer-events-none absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10"><span className="absolute right-[9%] top-[31%] h-2 w-2 rounded-full bg-blue-300" /></div>

              <div className="af-float relative w-full max-w-[440px] overflow-hidden rounded-[30px] border border-white/15 bg-[#0b1425]/90 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={africaDeveloperNetwork} alt="African developers connected through a digital network" className="h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071020] via-[#071020]/10 to-[#071020]/5" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100 backdrop-blur-xl"><Globe2 size={13} /> Connected across Africa</div>
                  <div className="absolute bottom-4 left-5 right-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">African Developer Network</p><p className="mt-1 text-xl font-extrabold tracking-tight">Talent meets possibility.</p></div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Smart exchange match</p><p className="mt-1 text-base font-bold">Complementary capabilities</p></div><div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-lg font-black text-cyan-200"><span className="absolute inset-0 rounded-2xl border border-cyan-200/20 animate-ping" style={{ animationDuration: "3s" }} />94%</div></div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:p-4"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /><span className="text-[10px] font-semibold text-slate-400">DEVELOPER A</span></div><p className="mt-3 text-xs font-bold sm:text-sm">Offers PostgreSQL</p><p className="mt-1 text-[11px] text-slate-400">Needs Flutter</p></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><ArrowRight size={16} /></div>
                    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:p-4"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-300" /><span className="text-[10px] font-semibold text-slate-400">DEVELOPER B</span></div><p className="mt-3 text-xs font-bold sm:text-sm">Offers Flutter</p><p className="mt-1 text-[11px] text-slate-400">Needs PostgreSQL</p></div>
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-300/15 bg-blue-400/[.08] p-3.5"><BrainCircuit className="mt-0.5 shrink-0 text-cyan-200" size={18} /><div><p className="text-xs font-bold text-cyan-100">A match with purpose</p><p className="mt-1 text-[11px] leading-5 text-slate-300">Two developers. Complementary skills. A shared path to build something real.</p></div></div>
                </div>
              </div>
              <div className="af-float-late absolute -left-2 top-[18%] hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#0b1425]/95 p-3.5 shadow-2xl backdrop-blur-xl sm:flex"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Code2 size={20} /></div><div><p className="text-xs font-bold">Skills connected</p><p className="mt-1 text-[10px] text-slate-400">Beyond the CV</p></div></div>
              <div className="af-float absolute -right-1 bottom-[14%] hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#0b1425]/95 p-3.5 shadow-2xl backdrop-blur-xl sm:flex" style={{ animationDelay: "-3s" }}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200"><ShieldCheck size={20} /></div><div><p className="text-xs font-bold">Impact verified</p><p className="mt-1 text-[10px] text-slate-400">Show what you built</p></div></div>
            </div>
          </div>
        </section>

        <section className="relative border-y border-white/[.08] bg-white/[.025]">
          <div className="af-flow-line absolute left-0 right-0 top-0 h-px" />
          <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 md:grid-cols-3 lg:grid-cols-6 lg:px-10">{flow.map(({ number, title, icon: Icon }) => <div key={number} className="group border-r border-white/[.07] px-4 py-6 first:border-l sm:px-5 sm:py-7"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.18em] text-slate-500">{number}</span><Icon size={17} className="text-cyan-300 transition group-hover:scale-110" /></div><p className="mt-3 text-sm font-bold">{title}</p></div>)}</div>
        </section>

        <section id="why-afridev" className="scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="af-in max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">Why AfriDev</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">More than a developer directory.</h2><p className="mt-4 leading-7 text-slate-400">AfriDev is designed around what developers can exchange, what they can build together, and what they can prove.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({ title, text, icon: Icon, tone }, index) => <div key={title} className={`af-card af-in rounded-2xl border border-white/10 bg-white/[.035] p-6`} style={{ animationDelay: `${index * 100}ms` }}><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone === "cyan" ? "bg-cyan-300/10 text-cyan-200" : tone === "violet" ? "bg-violet-300/10 text-violet-200" : tone === "amber" ? "bg-amber-300/10 text-amber-200" : "bg-emerald-300/10 text-emerald-200"}`}><Icon size={22} /></div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>)}</div></div></section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-white/[.08] bg-white/[.02]"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">How it works</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">From capability to collaboration.</h2><p className="mt-4 leading-7 text-slate-400">A complete loop for discovering people, exchanging knowledge and turning capability into real-world impact.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{flow.map(({ number, title, text, icon: Icon }) => <div key={number} className="af-card group relative overflow-hidden rounded-2xl border border-white/10 bg-[#080f1e]/80 p-6"><div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl transition group-hover:bg-cyan-400/10" /><div className="relative flex items-center justify-between"><span className="text-xs font-black text-cyan-300">{number}</span><Icon size={21} className="text-slate-500 transition group-hover:text-cyan-200" /></div><h3 className="relative mt-8 text-lg font-bold">{title}</h3><p className="relative mt-2 text-sm leading-6 text-slate-400">{text}</p><div className="mt-6 h-px w-full bg-white/[.07]"><div className="h-px w-0 bg-cyan-300 transition-all duration-500 group-hover:w-full" /></div></div>)}</div></div></section>

        <section id="problem-to-project" className="scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">Problems → Projects</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Don&apos;t just post a problem. <span className="text-blue-300">Build the solution.</span></h2><p className="mt-5 leading-7 text-slate-400">A community problem can attract developers, become a team, and turn into a real project inside AfriDev Exchange.</p><Link to="/register" className="af-button mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Start building <ArrowRight size={16} /></Link></div><div className="relative rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7"><div className="pointer-events-none absolute left-[12%] right-[12%] top-[43%] hidden h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/40 to-cyan-300/0 sm:block" /><div className="relative grid gap-3 sm:grid-cols-5">{problemStages.map(([number, title, text], index) => <div key={title} className="af-card rounded-2xl border border-white/10 bg-[#080f1e]/90 p-4"><div className="flex items-center justify-between"><span className="text-xs font-black text-cyan-300">{number}</span>{index < 4 && <ArrowRight size={13} className="text-slate-600 sm:hidden" />}</div><p className="mt-5 text-sm font-bold">{title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>)}</div></div></div></div></section>

        <section id="passport" className="scroll-mt-24 border-y border-white/[.08] bg-white/[.02]"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="grid gap-12 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">Developer Passport</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Don&apos;t just say you can build it. <span className="text-blue-300">Show it.</span></h2><p className="mt-5 max-w-2xl leading-7 text-slate-400">Your AfriDev Passport brings together capabilities, evidence, projects, exchanges and verified contributions into a profile that demonstrates what you actually do.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{["Skills & capability","Evidence and verification","Projects and collaborations","Verified contributions"].map(item => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#080f1e]/80 px-4 py-3 text-sm"><CheckCircle2 size={17} className="shrink-0 text-cyan-300" />{item}</div>)}</div></div><div className="af-float relative overflow-hidden rounded-3xl border border-white/10 bg-[#070e1b] p-6 shadow-[0_30px_90px_rgba(0,0,0,.35)]"><div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" /><div className="relative flex items-center gap-4 border-b border-white/10 pb-5"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2"><img src={afridevLogo} alt="AfriDev" className="h-full w-full object-contain" /></div><div><p className="font-bold">Developer Passport</p><p className="mt-1 text-xs text-slate-500">Capability + verified experience</p></div><ShieldCheck className="ml-auto text-cyan-200" size={23} /></div><div className="relative mt-6 space-y-5">{[["Capability","Evidence-backed","84%"],["AfriDev experience","Growing","68%"]].map(([label, status, width]) => <div key={label}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-slate-400">{label}</span><span className="font-semibold text-cyan-200">{status}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" style={{ width }} /></div></div>)}</div><div className="relative mt-6 grid grid-cols-3 gap-2">{[["Skills","8"],["Projects","4"],["Verified","11"]].map(([label,value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-center"><div className="text-lg font-black">{value}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</div></div>)}</div></div></div></div></section>

        <section className="relative isolate overflow-hidden"><div className="pointer-events-none absolute inset-0 -z-10"><div className="absolute left-1/2 top-1/2 h-[430px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/15 blur-3xl" /></div><div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 lg:py-32"><div className="af-float mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-blue-600/30 to-cyan-300/10 text-cyan-100 shadow-xl shadow-blue-950/50"><Zap size={28} /></div><p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-300">Your next chapter starts here</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Your skills have value.</h2><p className="mx-auto mt-4 max-w-xl text-slate-400">Exchange them. Build with them. Prove them.</p><Link to="/register" className="af-button mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3.5 text-sm font-extrabold text-slate-950">Join AfriDev Exchange <ArrowRight size={17} /></Link></div></section>
      </main>

      <footer className="border-t border-white/10 bg-[#040914]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><div className="flex items-center gap-4"><img src={afridevLogo} alt="AfriDev Developer Exchange" className="h-9 w-auto max-w-[160px] object-contain" /><span className="text-xs text-slate-600">© {new Date().getFullYear()}</span></div><div className="text-xs text-slate-500">Don&apos;t just show what you can do. Exchange it. Build with it. Prove it.</div></div>
      </footer>
    </div>
  );
}

export default Landing;
