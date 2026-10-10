import {
  ArrowRight,
  ArrowRightLeft,
  Bell,
  FolderKanban,
  Lightbulb,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
};

type DashboardStats = {
  matches: number;
  exchanges: number;
  projects: number;
  followers: number;
};

type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  type: string;
};

type MatchRecord = {
  id: string;
  compatibility_score: number;
  explanation: string | null;
  offer_developer_id: string;
  need_developer_id: string;
};

type SuggestedDeveloper = Profile & {
  skills: string[];
};

function timeAgo(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function initials(name: string | null | undefined) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD"
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    matches: 0,
    exchanges: 0,
    projects: 0,
    followers: 0,
  });
  const [notifications, setNotifications] = useState<
    DashboardNotification[]
  >([]);
  const [match, setMatch] = useState<{
    record: MatchRecord;
    developer: Profile;
  } | null>(null);
  const [suggestedDevelopers, setSuggestedDevelopers] = useState<
    SuggestedDeveloper[]
  >([]);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("You are not authenticated.");

        const [
          profileResult,
          projectResult,
          participantResult,
          contributionResult,
          followerResult,
          matchResult,
          notificationResult,
          suggestedResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, username, country, city, avatar_url"
            )
            .eq("id", user.id)
            .single(),

          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id),

          supabase
            .from("exchange_participants")
            .select("exchange_id")
            .eq("developer_id", user.id),

          supabase
            .from("contributions")
            .select("id", { count: "exact", head: true })
            .eq("contributor_id", user.id)
            .eq("status", "verified"),

          supabase
            .from("developer_follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("following_id", user.id),

          supabase
            .from("matches")
            .select(
              "id, compatibility_score, explanation, offer_developer_id, need_developer_id"
            )
            .or(
              `offer_developer_id.eq.${user.id},need_developer_id.eq.${user.id}`
            )
            .neq("status", "rejected")
            .order("compatibility_score", { ascending: false })
            .limit(6),

          supabase
            .from("notifications")
            .select(
              "id, title, message, link, read, created_at, type"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("profiles")
            .select(
              "id, full_name, username, country, city, avatar_url"
            )
            .neq("id", user.id)
            .limit(4),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (projectResult.error) throw projectResult.error;
        if (participantResult.error) throw participantResult.error;
        if (contributionResult.error) throw contributionResult.error;
        if (followerResult.error) throw followerResult.error;
        if (matchResult.error) throw matchResult.error;
        if (notificationResult.error) throw notificationResult.error;

        const exchangeIds =
          participantResult.data?.map((item) => item.exchange_id) ?? [];

        let activeExchangeCount = 0;

        if (exchangeIds.length > 0) {
          const { data: exchangeRows, error: exchangeError } =
            await supabase
              .from("exchanges")
              .select("id, status")
              .in("id", exchangeIds);

          if (exchangeError) throw exchangeError;

          activeExchangeCount =
            exchangeRows?.filter((item) =>
              ["pending", "negotiating", "accepted", "active"].includes(
                item.status
              )
            ).length ?? 0;
        }

        const matchRows = (matchResult.data ?? []) as MatchRecord[];
        const otherDeveloperIds = Array.from(
          new Set(
            matchRows
              .map((item) =>
                item.offer_developer_id === user.id
                  ? item.need_developer_id
                  : item.offer_developer_id
              )
              .filter(Boolean)
          )
        );

        let matchDeveloper: Profile | null = null;

        if (otherDeveloperIds.length > 0) {
          const { data: matchProfiles, error: matchProfilesError } =
            await supabase
              .from("profiles")
              .select(
                "id, full_name, username, country, city, avatar_url"
              )
              .in("id", otherDeveloperIds);

          if (matchProfilesError) throw matchProfilesError;

          const topMatch = matchRows[0];
          const topDeveloperId =
            topMatch.offer_developer_id === user.id
              ? topMatch.need_developer_id
              : topMatch.offer_developer_id;

          matchDeveloper =
            matchProfiles?.find((item) => item.id === topDeveloperId) ??
            null;

          if (topMatch && matchDeveloper) {
            setMatch({
              record: topMatch,
              developer: matchDeveloper,
            });
          }
        }

        const suggestedProfiles = (suggestedResult.data ??
          []) as Profile[];

        const suggestedIds = suggestedProfiles.map((item) => item.id);
        type SuggestedSkillRow = {
          developer_id: string;
          skill: { name: string }[] | null;
        };

        let suggestedSkills: SuggestedSkillRow[] = [];

        if (suggestedIds.length > 0) {
          const { data: skillRows, error: skillError } =
            await supabase
              .from("developer_skills")
              .select("developer_id, skill:skills(name)")
              .in("developer_id", suggestedIds);

          if (skillError) throw skillError;

          suggestedSkills = (skillRows ?? []) as SuggestedSkillRow[];
        }

        const developersWithSkills: SuggestedDeveloper[] =
          suggestedProfiles.map((developer) => ({
            ...developer,
            skills: suggestedSkills
              .filter((row) => row.developer_id === developer.id)
              .flatMap((row) => row.skill ?? [])
              .map((skill) => skill.name)
              .filter(Boolean)
              .slice(0, 3),
          }));

        if (!mounted) return;

        setProfile(profileResult.data as Profile);
        setStats({
          matches: matchRows.length,
          exchanges: activeExchangeCount,
          projects: projectResult.count ?? 0,
          followers: followerResult.count ?? 0,
        });
        setNotifications(
          (notificationResult.data ??
            []) as DashboardNotification[]
        );
        setSuggestedDevelopers(developersWithSkills);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load your dashboard data."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    let cancelled = false;

    async function searchDevelopers() {
      setSearchLoading(true);
      setSearchOpen(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, avatar_url"
          )
          .or(
            `full_name.ilike.%${query}%,username.ilike.%${query}%,country.ilike.%${query}%,city.ilike.%${query}%`
          )
          .order("full_name", { ascending: true })
          .limit(8);

        if (error) throw error;

        if (!cancelled) {
          setSearchResults((data ?? []) as Profile[]);
        }
      } catch (searchError) {
        console.error("Dashboard search error:", searchError);

        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    const timer = window.setTimeout(searchDevelopers, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  const firstName = profile?.full_name?.split(" ")[0] || "Developer";
  const country = profile?.country || "Cameroon";

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const heroTitle = (
    <>
      Exchange skills.
      <br />
      Build solutions.
      <br />
      <span className="text-sky-400">Grow Africa.</span>
    </>
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* SEARCH / PAGE CONTEXT */}
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Developer workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Welcome back, {firstName}.
            </h1>
          </div>

          <div className="relative w-full max-w-xl">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Search size={20} className="shrink-0 text-slate-400" />
              <input
                aria-label="Search AfriDev"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() => {
                  if (search.trim()) setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search developers, projects, skills, problems..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <kbd className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 sm:block">
                Ctrl + K
              </kbd>
            </div>

            {searchOpen && search.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {searchLoading ? (
                  <div className="px-5 py-6 text-center text-sm text-slate-500">
                    Searching developers...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <Users size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">No developers found</p>
                    <p className="mt-1 text-xs text-slate-400">Try another name or username.</p>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Developers</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {searchResults.map((developer) => (
                        <button
                          key={developer.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearch("");
                            navigate(`/developer/${developer.id}`);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                            {developer.avatar_url ? (
                              <img src={developer.avatar_url} alt={developer.full_name || "Developer"} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-blue-700">{initials(developer.full_name)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{developer.full_name || "AfriDev Developer"}</p>
                            <p className="truncate text-xs text-slate-500">{developer.username ? `@${developer.username}` : developer.city || developer.country || "African Developer"}</p>
                          </div>
                          <ArrowRight size={16} className="shrink-0 text-slate-300" />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); navigate("/discover"); }}
                      className="w-full border-t border-slate-100 px-4 py-3 text-center text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                    >
                      View all developers
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            {/* HERO */}
            <section className="relative min-h-[300px] overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/10" />
              <div className="absolute inset-x-0 bottom-0 h-5 bg-slate-950/50" />

              <div className="relative flex min-h-[300px] flex-col justify-center px-7 py-8 sm:px-9">
                <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                  <Sparkles size={15} />
                  Africa's developer exchange
                </p>

                <h2 className="afridev-display max-w-xl text-4xl font-extrabold leading-[0.98] tracking-[-0.035em] text-white sm:text-5xl">
                  {heroTitle}
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-6 text-slate-200 sm:text-base">
                  A community of African developers connecting,
                  collaborating and building a greater tomorrow.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/discover")}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                  >
                    Find developers
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/exchange")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    Exchange skills
                  </button>
                </div>
              </div>
            </section>

            {/* KPI CARDS */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Skill Matches",
                  value: stats.matches,
                  caption: "Compatible opportunities",
                  icon: Zap,
                  iconClass: "bg-blue-50 text-blue-600",
                },
                {
                  label: "Active Exchanges",
                  value: stats.exchanges,
                  caption: "Currently in progress",
                  icon: ArrowRightLeft,
                  iconClass: "bg-emerald-50 text-emerald-600",
                },
                {
                  label: "Projects",
                  value: stats.projects,
                  caption: "Projects you own",
                  icon: FolderKanban,
                  iconClass: "bg-orange-50 text-orange-600",
                },
                {
                  label: "My Network",
                  value: stats.followers,
                  caption: "Followers",
                  icon: Users,
                  iconClass: "bg-violet-50 text-violet-600",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.label === "Skill Matches") navigate("/discover");
                      if (item.label === "Active Exchanges") navigate("/exchange");
                      if (item.label === "Projects") navigate("/projects");
                      if (item.label === "My Network") navigate("/passport");
                    }}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full ${item.iconClass}`}
                      >
                        <Icon size={21} />
                      </span>

                      <ArrowRight
                        size={16}
                        className="text-slate-300 transition group-hover:text-blue-500"
                      />
                    </div>

                    <div className="mt-4 flex items-end gap-2">
                      <span className="afridev-display text-3xl font-extrabold tracking-[-0.025em] text-slate-950">
                        {loading ? "—" : item.value}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.caption}
                    </p>
                  </button>
                );
              })}
            </section>

            {/* LOWER GRID */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              {/* RECENT ACTIVITY */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-extrabold tracking-[-0.015em] text-slate-950">
                      Recent Activity
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Latest activity around your account
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <Bell className="mx-auto text-slate-300" size={28} />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No recent activity yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Matches, follows, messages and project updates will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          if (notification.link) navigate(notification.link);
                          else navigate("/notifications");
                        }}
                        className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                            notification.read
                              ? "bg-slate-200"
                              : "bg-blue-600"
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {timeAgo(notification.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                            {notification.message}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              {/* QUICK ACTIONS */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="font-extrabold tracking-[-0.015em] text-slate-950">
                    Quick Actions
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Move your work forward
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Find Developers",
                      text: "Discover and connect with African talent",
                      icon: Search,
                      className: "bg-blue-600",
                      path: "/discover",
                    },
                    {
                      label: "Create a Project",
                      text: "Turn ideas into reality together",
                      icon: Plus,
                      className: "bg-emerald-600",
                      path: "/projects",
                    },
                    {
                      label: "Post a Problem",
                      text: "Get help from the community",
                      icon: Lightbulb,
                      className: "bg-orange-500",
                      path: "/problems",
                    },
                    {
                      label: "Exchange Skills",
                      text: "Teach, learn and grow",
                      icon: ArrowRightLeft,
                      className: "bg-violet-600",
                      path: "/exchange",
                    },
                  ].map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => navigate(action.path)}
                        className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-blue-100 hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${action.className}`}
                        >
                          <Icon size={20} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                            {action.text}
                          </span>
                        </span>

                        <ArrowRight size={17} className="text-slate-300" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="space-y-5">
            {/* PROFILE SNAPSHOT */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-20 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-400" />

              <div className="px-5 pb-5">
                <div className="-mt-9 flex items-end justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/passport")}
                    className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || "Developer"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-blue-700">
                        {initials(profile?.full_name)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/passport")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600"
                  >
                    View Passport
                  </button>
                </div>

                <h2 className="mt-3 text-lg font-bold text-slate-950">
                  {profile?.full_name || "AfriDev Developer"}
                </h2>

                <p className="text-sm text-slate-500">
                  {profile?.username
                    ? `@${profile.username}`
                    : "Developer"}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={14} className="text-blue-500" />
                  {profile?.city
                    ? `${profile.city}, ${country}`
                    : country}
                </div>
              </div>
            </section>

            {/* NOTIFICATIONS */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-extrabold tracking-[-0.015em] text-slate-950">
                    Notifications
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {unreadNotifications} unread
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  className="text-sm font-bold text-blue-600"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Bell className="mx-auto text-slate-300" size={26} />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No notifications
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          notification.link || "/notifications"
                        )
                      }
                      className="flex w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          notification.read
                            ? "bg-slate-200"
                            : "bg-blue-600"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {timeAgo(notification.created_at)}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {notification.message}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* SUGGESTED DEVELOPERS */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-extrabold tracking-[-0.015em] text-slate-950">
                    Suggested Developers
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    People you may want to collaborate with
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/discover")}
                  className="text-sm font-bold text-blue-600"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {suggestedDevelopers.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Users className="mx-auto text-slate-300" size={26} />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      More developers will appear here
                    </p>
                  </div>
                ) : (
                  suggestedDevelopers.map((developer) => (
                    <div
                      key={developer.id}
                      className="flex items-center gap-3 px-5 py-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/developer/${developer.id}`)
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100"
                      >
                        {developer.avatar_url ? (
                          <img
                            src={developer.avatar_url}
                            alt={developer.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-blue-700">
                            {initials(developer.full_name)}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/developer/${developer.id}`)
                          }
                          className="block max-w-full truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600"
                        >
                          {developer.full_name || "Developer"}
                        </button>

                        <p className="truncate text-xs text-slate-500">
                          {developer.city
                            ? `${developer.city}, ${
                                developer.country || ""
                              }`
                            : developer.country || "African Developer"}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(developer.skills.length
                            ? developer.skills
                            : ["Developer"]
                          ).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/developer/${developer.id}`)
                        }
                        className="hidden rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 sm:block"
                      >
                        View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* MATCH CARD */}
            <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                <Sparkles size={14} />
                Best skill match
              </div>

              {match ? (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                      {match.developer.avatar_url ? (
                        <img
                          src={match.developer.avatar_url}
                          alt={match.developer.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-blue-700">
                          {initials(match.developer.full_name)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950">
                        {match.developer.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {match.developer.country || "Africa"}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                      {Math.round(match.record.compatibility_score)}%
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {match.record.explanation ||
                      "Your capabilities complement this developer's needs."}
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/discover")}
                    className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Explore match
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Add more skills, offers and needs to unlock
                    complementary developer matches.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/passport")}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
                  >
                    Complete your Passport
                    <ArrowRight size={15} />
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
