import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Handshake,
  Layers3,
  Plus,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
};

type Match = {
  id: string;
  compatibility_score: number;
  explanation: string | null;
  status: string;
  otherDeveloperId: string;
  otherDeveloperName: string;
  otherDeveloperUsername: string | null;
  otherDeveloperAvatar: string | null;
  offerTitle: string;
  needTitle: string;
};

type Exchange = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updated_at: string;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "exchange" | "project" | "contribution";
};

type DashboardStats = {
  activeOffers: number;
  activeNeeds: number;
  suggestedMatches: number;
  activeExchanges: number;
  projects: number;
  completedProjects: number;
  completedExchanges: number;
  verifiedContributions: number;
  verifiedEvidence: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeOffers: 0,
    activeNeeds: 0,
    suggestedMatches: 0,
    activeExchanges: 0,
    projects: 0,
    completedProjects: 0,
    completedExchanges: 0,
    verifiedContributions: 0,
    verifiedEvidence: 0,
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [activeExchanges, setActiveExchanges] = useState<Exchange[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
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
        if (!user) {
          if (mounted) setError("You are not authenticated.");
          return;
        }

        const [
          profileResult,
          offersResult,
          needsResult,
          participantResult,
          ownedProjectsResult,
          memberProjectsResult,
          contributionsResult,
          evidenceResult,
          matchesResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, username, country, city, avatar_url")
            .eq("id", user.id)
            .single(),

          supabase
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("developer_id", user.id)
            .eq("status", "active"),

          supabase
            .from("needs")
            .select("id", { count: "exact", head: true })
            .eq("developer_id", user.id)
            .eq("status", "active"),

          supabase
            .from("exchange_participants")
            .select("exchange_id")
            .eq("developer_id", user.id),

          supabase
            .from("projects")
            .select("id, title, description, status, updated_at")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false }),

          supabase
            .from("project_members")
            .select("project_id")
            .eq("developer_id", user.id),

          supabase
            .from("contributions")
            .select("id, title, status, created_at")
            .eq("contributor_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("skill_evidence")
            .select("id", { count: "exact", head: true })
            .eq("developer_id", user.id)
            .eq("verification_status", "verified"),

          supabase
            .from("matches")
            .select(
              "id, compatibility_score, explanation, status, offer_developer_id, need_developer_id, offer_id, need_id"
            )
            .or(
              `offer_developer_id.eq.${user.id},need_developer_id.eq.${user.id}`
            )
            .order("compatibility_score", { ascending: false })
            .limit(6),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (offersResult.error) throw offersResult.error;
        if (needsResult.error) throw needsResult.error;
        if (participantResult.error) throw participantResult.error;
        if (ownedProjectsResult.error) throw ownedProjectsResult.error;
        if (memberProjectsResult.error) throw memberProjectsResult.error;
        if (contributionsResult.error) throw contributionsResult.error;
        if (evidenceResult.error) throw evidenceResult.error;
        if (matchesResult.error) throw matchesResult.error;

        const exchangeIds =
          participantResult.data?.map((item) => item.exchange_id) ?? [];

        let exchanges: Exchange[] = [];

        if (exchangeIds.length > 0) {
          const { data, error: exchangesError } = await supabase
            .from("exchanges")
            .select("id, title, status, updated_at")
            .in("id", exchangeIds)
            .order("updated_at", { ascending: false });

          if (exchangesError) throw exchangesError;
          exchanges = (data ?? []) as Exchange[];
        }

        const activeStatuses = new Set([
          "pending",
          "negotiating",
          "accepted",
          "active",
        ]);

        const activeExchangeRows = exchanges.filter((exchange) =>
          activeStatuses.has(exchange.status)
        );

        const completedExchangeCount = exchanges.filter(
          (exchange) => exchange.status === "completed"
        ).length;

        const ownedProjects = (ownedProjectsResult.data ?? []) as Project[];
        const memberProjectIds =
          memberProjectsResult.data?.map((item) => item.project_id) ?? [];

        let participatedProjects: Project[] = [];

        if (memberProjectIds.length > 0) {
          const { data, error: memberProjectError } = await supabase
            .from("projects")
            .select("id, title, description, status, updated_at")
            .in("id", memberProjectIds)
            .order("updated_at", { ascending: false });

          if (memberProjectError) throw memberProjectError;
          participatedProjects = (data ?? []) as Project[];
        }

        const projectMap = new Map<string, Project>();

        [...ownedProjects, ...participatedProjects].forEach((project) => {
          projectMap.set(project.id, project);
        });

        const allProjects = Array.from(projectMap.values()).sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        );

        const completedProjects = allProjects.filter(
          (project) => project.status === "completed"
        ).length;

        const contributionRows = contributionsResult.data ?? [];

        const activityItems: ActivityItem[] = [
          ...exchanges.slice(0, 4).map((exchange) => ({
            id: `exchange-${exchange.id}`,
            title: exchange.title,
            description: `Exchange ${statusLabel(exchange.status)}`,
            date: exchange.updated_at,
            type: "exchange" as const,
          })),
          ...allProjects.slice(0, 4).map((project) => ({
            id: `project-${project.id}`,
            title: project.title,
            description: `Project ${statusLabel(project.status)}`,
            date: project.updated_at,
            type: "project" as const,
          })),
          ...contributionRows.slice(0, 4).map((contribution) => ({
            id: `contribution-${contribution.id}`,
            title: contribution.title ?? "Contribution",
            description: `Contribution ${statusLabel(contribution.status)}`,
            date: contribution.created_at,
            type: "contribution" as const,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, 6);

        // Resolve the developers and offer/need titles represented by matches.
        const rawMatches = matchesResult.data ?? [];
        const developerIds = Array.from(
          new Set(
            rawMatches
              .flatMap((match) => [
                match.offer_developer_id,
                match.need_developer_id,
              ])
              .filter((id) => id !== user.id)
          )
        );

        const offerIds = Array.from(
          new Set(rawMatches.map((match) => match.offer_id))
        );
        const needIds = Array.from(
          new Set(rawMatches.map((match) => match.need_id))
        );

        const [developerResult, offerResult, needResult] = await Promise.all([
          developerIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", developerIds)
            : Promise.resolve({ data: [], error: null }),

          offerIds.length > 0
            ? supabase
                .from("offers")
                .select("id, title")
                .in("id", offerIds)
            : Promise.resolve({ data: [], error: null }),

          needIds.length > 0
            ? supabase
                .from("needs")
                .select("id, title")
                .in("id", needIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (developerResult.error) throw developerResult.error;
        if (offerResult.error) throw offerResult.error;
        if (needResult.error) throw needResult.error;

        const developers = new Map(
          (developerResult.data ?? []).map((developer) => [
            developer.id,
            developer,
          ])
        );
        const offers = new Map(
          (offerResult.data ?? []).map((offer) => [offer.id, offer.title])
        );
        const needs = new Map(
          (needResult.data ?? []).map((need) => [need.id, need.title])
        );

        const resolvedMatches: Match[] = rawMatches
          .filter(
            (match) =>
              match.offer_developer_id !== user.id ||
              match.need_developer_id !== user.id
          )
          .map((match) => {
            const otherDeveloperId =
              match.offer_developer_id === user.id
                ? match.need_developer_id
                : match.offer_developer_id;

            const developer = developers.get(otherDeveloperId);

            return {
              id: match.id,
              compatibility_score: Number(match.compatibility_score ?? 0),
              explanation: match.explanation,
              status: match.status,
              otherDeveloperId,
              otherDeveloperName:
                developer?.full_name || "Developer",
              otherDeveloperUsername: developer?.username ?? null,
              otherDeveloperAvatar: developer?.avatar_url ?? null,
              offerTitle: offers.get(match.offer_id) || "Skill offer",
              needTitle: needs.get(match.need_id) || "Skill need",
            };
          });

        if (!mounted) return;

        setProfile(profileResult.data as Profile);
        setMatches(resolvedMatches);
        setActiveExchanges(activeExchangeRows.slice(0, 4));
        setProjects(allProjects.slice(0, 4));
        setActivity(activityItems);

        setStats({
          activeOffers: offersResult.count ?? 0,
          activeNeeds: needsResult.count ?? 0,
          suggestedMatches: resolvedMatches.length,
          activeExchanges: activeExchangeRows.length,
          projects: allProjects.length,
          completedProjects,
          completedExchanges: completedExchangeCount,
          verifiedContributions:
            contributionRows.filter(
              (contribution) => contribution.status === "verified"
            ).length,
          verifiedEvidence: evidenceResult.count ?? 0,
        });
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load your dashboard data. Please refresh the page."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const firstName =
    profile?.full_name?.split(" ")[0] || "Developer";

  const country = profile?.country || "Cameroon";

  const profileItems = [
    Boolean(profile?.full_name),
    Boolean(profile?.username),
    Boolean(profile?.country),
    Boolean(profile?.city),
    Boolean(profile?.avatar_url),
  ];

  const profileCompletion = Math.round(
    (profileItems.filter(Boolean).length / profileItems.length) * 100
  );

  const statCards = [
    {
      value: stats.activeOffers,
      label: "Active offers",
      icon: Zap,
      action: "/exchange",
    },
    {
      value: stats.activeNeeds,
      label: "Active needs",
      icon: Target,
      action: "/exchange",
    },
    {
      value: stats.suggestedMatches,
      label: "Suggested matches",
      icon: Sparkles,
      action: "/discover",
    },
    {
      value: stats.activeExchanges,
      label: "Active exchanges",
      icon: Handshake,
      action: "/exchange",
    },
    {
      value: stats.projects,
      label: "Projects",
      icon: FolderKanban,
      action: "/projects",
    },
    {
      value: stats.verifiedContributions,
      label: "Verified contributions",
      icon: CheckCircle2,
      action: "/passport",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-16 w-16 rounded-2xl object-cover ring-4 ring-blue-50"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
              {firstName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-blue-700">
              Welcome back 👋
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {loading ? "Loading your dashboard..." : `Welcome, ${firstName}.`}
            </h1>

            <p className="mt-2 text-slate-500">
              Turn your skills into opportunities.
            </p>

            {!loading && profile && (
              <p className="mt-1 text-sm text-slate-400">
                {profile.city ? `${profile.city}, ${country}` : country}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/exchange")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={17} />
            Add Need
          </button>

          <button
            type="button"
            onClick={() => navigate("/exchange")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={17} />
            Add Offer
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PROFILE COMPLETION */}
      <section className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-700">
              Developer Passport
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">
              {profileCompletion}% profile completion
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A complete profile helps other developers understand your
              capabilities and trust your identity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/passport")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Open Passport
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-700 transition-all"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </section>

      {/* STATS */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => navigate(card.action)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Icon size={19} />
                </div>

                <ArrowRight
                  size={17}
                  className="text-slate-300 transition group-hover:text-blue-700"
                />
              </div>

              <p className="mt-5 text-2xl font-bold text-slate-950">
                {loading ? "—" : card.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* MATCHES */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-blue-700">
              <Sparkles size={16} />
              Skill matching
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Developers who complement your skills
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/discover")}
            className="hidden items-center gap-2 text-sm font-semibold text-blue-700 sm:flex"
          >
            View all
            <ArrowRight size={16} />
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Sparkles className="mx-auto text-blue-700" size={24} />
            <h3 className="mt-4 font-bold text-slate-900">
              No suggested matches yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add active offers and needs to let AfriDev Exchange find
              complementary developers for you.
            </p>
            <button
              type="button"
              onClick={() => navigate("/exchange")}
              className="mt-5 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Manage offers & needs
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {matches.slice(0, 4).map((match) => (
              <div
                key={match.id}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {match.otherDeveloperAvatar ? (
                      <img
                        src={match.otherDeveloperAvatar}
                        alt={match.otherDeveloperName}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {match.otherDeveloperName
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-slate-950">
                        {match.otherDeveloperName}
                      </p>
                      {match.otherDeveloperUsername && (
                        <p className="text-sm text-slate-500">
                          @{match.otherDeveloperUsername}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                    {Math.round(match.compatibility_score)}% match
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold text-blue-600">
                      OFFER
                    </p>
                    <p className="mt-2 font-bold text-slate-900">
                      {match.offerTitle}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      NEED
                    </p>
                    <p className="mt-2 font-bold text-slate-900">
                      {match.needTitle}
                    </p>
                  </div>
                </div>

                {match.explanation && (
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {match.explanation}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/discover")}
                  className="mt-5 w-full rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  View match
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EXCHANGES + PROJECTS */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-blue-700">Collaboration</p>
              <h2 className="mt-1 text-lg font-bold">Active exchanges</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/exchange")}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Open Exchange
            </button>
          </div>

          {activeExchanges.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-center">
              <Handshake className="mx-auto text-slate-400" size={22} />
              <p className="mt-3 text-sm font-medium text-slate-700">
                No active exchanges yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your active skill exchanges will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activeExchanges.map((exchange) => (
                <button
                  key={exchange.id}
                  type="button"
                  onClick={() =>
                    navigate(`/exchange/${exchange.id}`)
                  }
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-100 hover:bg-blue-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {exchange.title}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {statusLabel(exchange.status)} ·{" "}
                      {formatDate(exchange.updated_at)}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-blue-700">Build together</p>
              <h2 className="mt-1 text-lg font-bold">My projects</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              View Projects
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-center">
              <FolderKanban className="mx-auto text-slate-400" size={22} />
              <p className="mt-3 text-sm font-medium text-slate-700">
                No projects yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Start a project and invite developers to build together.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-100 hover:bg-blue-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {project.title}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {statusLabel(project.status)} ·{" "}
                      {formatDate(project.updated_at)}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TRUST + ACTIVITY */}
      <section className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Layers3 size={19} className="text-blue-700" />
            <h2 className="text-lg font-bold">AfriDev Trust & Experience</h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your activity on AfriDev Exchange is tracked separately from your
            technical capability.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-2xl font-bold">{stats.completedExchanges}</p>
              <p className="mt-1 text-xs text-slate-500">
                Completed exchanges
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-2xl font-bold">{stats.completedProjects}</p>
              <p className="mt-1 text-xs text-slate-500">
                Completed projects
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-2xl font-bold">
                {stats.verifiedContributions}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Verified contributions
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-2xl font-bold">{stats.verifiedEvidence}</p>
              <p className="mt-1 text-xs text-slate-500">
                Verified evidence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/passport")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
          >
            View full Passport
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-blue-700">
                <Activity size={16} />
                Activity
              </p>
              <h2 className="mt-1 text-lg font-bold">Recent activity</h2>
            </div>
          </div>

          {activity.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Clock3 className="mx-auto text-slate-400" size={22} />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Your recent activity will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-1">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    {item.type === "exchange" && <Handshake size={17} />}
                    {item.type === "project" && <FolderKanban size={17} />}
                    {item.type === "contribution" && (
                      <CheckCircle2 size={17} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <span className="ml-auto shrink-0 text-xs text-slate-400">
                    {formatDate(item.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MOBILE DISCOVER LINK */}
      <button
        type="button"
        onClick={() => navigate("/discover")}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 sm:hidden"
      >
        <Users size={17} />
        Discover developers
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

export default Dashboard;
