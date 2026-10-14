import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import DeepLText from "../../components/layout/DeepLText";

type NetworkType = "followers" | "following";

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
}

interface Skill {
  id: string;
  name: string;
  category?: string | null;
}

interface DeveloperSkill {
  id: string;
  skill_id: string;
  proficiency?: string | null;
  skill?: Skill | null;
}

interface Evidence {
  id: string;
  developer_skill_id?: string | null;
  skill_id?: string | null;
  evidence_type?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
  status?: string | null;
  verification_status?: string | null;
}

interface PassportStats {
  projects: number;
  exchanges: number;
  participatedExchanges: number;
  verifiedContributions: number;
  verifiedEvidence: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  repository_url: string | null;
  demo_url: string | null;
}

interface NetworkProfile extends Profile {
  isFollowing: boolean;
}

function getInitials(name: string | null, username: string | null) {
  const value = name || username || "Developer";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function PublicPassport() {
  const { developerId } = useParams<{ developerId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [developerSkills, setDeveloperSkills] = useState<DeveloperSkill[]>(
    [],
  );
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<PassportStats>({
    projects: 0,
    exchanges: 0,
    participatedExchanges: 0,
    verifiedContributions: 0,
    verifiedEvidence: 0,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("A developer");

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [networkOpen, setNetworkOpen] = useState<NetworkType | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkProfiles, setNetworkProfiles] = useState<NetworkProfile[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isOwnPassport =
    Boolean(currentUserId) && currentUserId === developerId;

  useEffect(() => {
    if (isOwnPassport) {
      navigate("/passport", { replace: true });
    }
  }, [isOwnPassport, navigate]);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user?.id) {
        setCurrentUserId(null);
        setCurrentUserDisplayName("A developer");
        return;
      }

      const { data: currentProfile, error: currentProfileError } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      if (currentProfileError) {
        console.warn("Could not load current user's display name:", currentProfileError.message);
      }
      if (mounted) {
        setCurrentUserDisplayName(
          currentProfile?.full_name?.trim() || currentProfile?.username?.trim() || "A developer",
        );
        // Reveal actions like Follow only after the actor identity has been loaded.
        setCurrentUserId(user.id);
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
  if (!developerId) {
    return;
  }

  let mounted = true;

  async function loadPassport() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, bio, avatar_url, github_url, website_url, linkedin_url",
          )
          .eq("id", developerId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          setProfile(null);
          setErrorMessage("Developer profile not found.");
          return;
        }

        setProfile(profileData as Profile);

        const [
          developerSkillsResult,
          evidenceResult,
          projectsResult,
          followersResult,
          followingResult,
          participantsResult,
          contributionsResult,
        ] = await Promise.all([
          supabase
            .from("developer_skills")
            .select("id, skill_id, proficiency")
            .eq("developer_id", developerId),

          supabase
            .from("skill_evidence")
            .select(
              "id, developer_skill_id, skill_id, evidence_type, title, description, url, verified, created_at, status, verification_status",
            )
            .eq("developer_id", developerId),

          supabase
            .from("projects")
            .select(
              "id, title, description, status, repository_url, demo_url",
            )
            .eq("owner_id", developerId)
            .order("created_at", { ascending: false }),

          supabase
            .from("developer_follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("following_id", developerId),

          supabase
            .from("developer_follows")
            .select("following_id", { count: "exact", head: true })
            .eq("follower_id", developerId),

          supabase
            .from("exchange_participants")
            .select("exchange_id")
            .eq("developer_id", developerId),

          supabase
            .from("contributions")
            .select("id", { count: "exact", head: true })
            .eq("contributor_id", developerId)
            .eq("status", "verified"),
        ]);

        if (developerSkillsResult.error) {
          console.warn(
            "Could not load developer skills:",
            developerSkillsResult.error.message,
          );
        }

        if (evidenceResult.error) {
          console.warn(
            "Could not load evidence:",
            evidenceResult.error.message,
          );
        }

        if (projectsResult.error) {
          console.warn(
            "Could not load projects:",
            projectsResult.error.message,
          );
        }

        setFollowerCount(followersResult.count ?? 0);
        setFollowingCount(followingResult.count ?? 0);

        const rawDeveloperSkills = (developerSkillsResult.data ??
          []) as DeveloperSkill[];

        setDeveloperSkills(rawDeveloperSkills);

        setEvidence((evidenceResult.data ?? []) as Evidence[]);

        const loadedProjects = (projectsResult.data ?? []) as Project[];
        setProjects(loadedProjects);

        const participantRows = (participantsResult.data ?? []) as Array<{
          exchange_id: string | null;
        }>;
        const exchangeIds = Array.from(
          new Set(participantRows.map((row) => row.exchange_id).filter((id): id is string => Boolean(id))),
        );

        let completedExchanges = 0;
        if (exchangeIds.length > 0) {
          const { count, error: completedError } = await supabase
            .from("exchanges")
            .select("id", { count: "exact", head: true })
            .in("id", exchangeIds)
            .eq("status", "completed");
          if (completedError) {
            console.warn("Could not load completed exchanges:", completedError.message);
          }
          completedExchanges = count ?? 0;
        }

        if (contributionsResult.error) {
          console.warn("Could not load verified contributions:", contributionsResult.error.message);
        }

        const loadedEvidence = (evidenceResult.data ?? []) as Evidence[];
        setStats({
          projects: loadedProjects.length,
          exchanges: completedExchanges,
          participatedExchanges: exchangeIds.length,
          verifiedContributions: contributionsResult.count ?? 0,
          verifiedEvidence: loadedEvidence.filter((item) => item.verified === true || item.status === "verified" || item.verification_status === "verified").length,
        });

        if (rawDeveloperSkills.length > 0) {
          const skillIds = rawDeveloperSkills.map(
            (item) => item.skill_id,
          );

          const { data: skillsData, error: skillsError } = await supabase
            .from("skills")
            .select("id, name, category")
            .in("id", skillIds);

          if (skillsError) {
            console.warn(
              "Could not load skills:",
              skillsError.message,
            );
          }

          const loadedSkills = (skillsData ?? []) as Skill[];

          setDeveloperSkills(
            rawDeveloperSkills.map((developerSkill) => ({
              ...developerSkill,
              skill:
                loadedSkills.find(
                  (skill) => skill.id === developerSkill.skill_id,
                ) ?? null,
            })),
          );
        }

        if (currentUserId && currentUserId !== developerId) {
          const { data: followData, error: followError } =
            await supabase
              .from("developer_follows")
              .select("follower_id, following_id")
              .eq("follower_id", currentUserId)
              .eq("following_id", developerId)
              .maybeSingle();

          if (followError) {
            console.warn(
              "Could not load follow status:",
              followError.message,
            );
          }

          setIsFollowing(Boolean(followData));
        } else {
          setIsFollowing(false);
        }
      } catch (error) {
        console.error("Passport loading error:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load this Passport.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPassport();

    return () => {
      mounted = false;
    };
  }, [developerId, currentUserId]);

  async function toggleFollow() {
    if (!currentUserId || !developerId || currentUserId === developerId) {
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("developer_follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", developerId);

        if (error) {
          throw error;
        }

        setIsFollowing(false);
        setFollowerCount((count) => Math.max(0, count - 1));
      } else {
        const { error } = await supabase
          .from("developer_follows")
          .insert({
            follower_id: currentUserId,
            following_id: developerId,
          });

        if (error) {
          throw error;
        }

        setIsFollowing(true);
        setFollowerCount((count) => count + 1);

        await supabase.from("notifications").insert({
          user_id: developerId,
          type: "follow",
          title: "New follower",
          message: `${currentUserDisplayName} started following you.`,
          translation_key: "new_follower",
          translation_params: { name: currentUserDisplayName },
          link: `/developer/${currentUserId}`,
        });
      }
    } catch (error) {
      console.error("Follow action failed:", error);
    } finally {
      setFollowLoading(false);
    }
  }

  async function loadNetwork(type: NetworkType) {
    if (!developerId) {
      return;
    }

    setNetworkOpen(type);
    setNetworkLoading(true);
    setNetworkProfiles([]);

    try {
      let ids: string[] = [];

      if (type === "followers") {
        const { data, error } = await supabase
          .from("developer_follows")
          .select("follower_id")
          .eq("following_id", developerId);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as Array<{
          follower_id: string;
        }>;

        ids = rows
          .map((row) => row.follower_id)
          .filter((id): id is string => Boolean(id));
      } else {
        const { data, error } = await supabase
          .from("developer_follows")
          .select("following_id")
          .eq("follower_id", developerId);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as Array<{
          following_id: string;
        }>;

        ids = rows
          .map((row) => row.following_id)
          .filter((id): id is string => Boolean(id));
      }

      if (ids.length === 0) {
        setNetworkProfiles([]);
        return;
      }

      const { data: profilesData, error: profilesError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, bio, avatar_url, github_url, website_url, linkedin_url",
          )
          .in("id", ids);

      if (profilesError) {
        throw profilesError;
      }

      const profiles = (profilesData ?? []) as Profile[];

      let followingIds = new Set<string>();

      if (currentUserId) {
        const {
          data: myFollowing,
          error: myFollowingError,
        } = await supabase
          .from("developer_follows")
          .select("following_id")
          .eq("follower_id", currentUserId)
          .in("following_id", ids);

        if (myFollowingError) {
          console.warn(
            "Could not load network follow status:",
            myFollowingError.message,
          );
        }

        const followingRows = (myFollowing ?? []) as Array<{
          following_id: string;
        }>;

        followingIds = new Set(
          followingRows.map((row) => row.following_id),
        );
      }

      const orderedProfiles: NetworkProfile[] = ids
        .map((id) =>
          profiles.find((person) => person.id === id),
        )
        .filter(
          (person): person is Profile => Boolean(person),
        )
        .map((person) => ({
          ...person,
          isFollowing: followingIds.has(person.id),
        }));

      setNetworkProfiles(orderedProfiles);
    } catch (error) {
      console.error("Network loading error:", error);
    } finally {
      setNetworkLoading(false);
    }
  }

  async function toggleNetworkFollow(person: NetworkProfile) {
    if (
      !currentUserId ||
      currentUserId === person.id
    ) {
      return;
    }

    try {
      if (person.isFollowing) {
        const { error } = await supabase
          .from("developer_follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", person.id);

        if (error) {
          throw error;
        }

        setNetworkProfiles((current) =>
          current.map((item) =>
            item.id === person.id
              ? { ...item, isFollowing: false }
              : item,
          ),
        );
      } else {
        const { error } = await supabase
          .from("developer_follows")
          .insert({
            follower_id: currentUserId,
            following_id: person.id,
          });

        if (error) {
          throw error;
        }

        setNetworkProfiles((current) =>
          current.map((item) =>
            item.id === person.id
              ? { ...item, isFollowing: true }
              : item,
          ),
        );

        await supabase.from("notifications").insert({
          user_id: person.id,
          type: "follow",
          title: "New follower",
          message: `${currentUserDisplayName} started following you.`,
          translation_key: "new_follower",
          translation_params: { name: currentUserDisplayName },
          link: `/developer/${currentUserId}`,
        });
      }
    } catch (error) {
      console.error("Network follow action failed:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500"><DeepLText text={"Loading Developer Passport..."} /></p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            <DeepLText text={"Developer not found"} />
          </h1>
          <p className="text-slate-500 mb-6">
            <DeepLText text={errorMessage || "This Developer Passport is unavailable."} />
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <DeepLText text={"Go back"} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Passport heading: same identity hierarchy as the signed-in Passport */}
      <div className="mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-600">
              <DeepLText text={"Developer Identity"} />
            </p>
            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950">
              <DeepLText text={"Developer Passport"} />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <DeepLText text={"Back"} />
            </button>
            {isOwnPassport ? (
              <button
                type="button"
                onClick={() => navigate("/passport")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                <DeepLText text={"Edit Passport"} />
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : currentUserId ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/messages?developer=${encodeURIComponent(developerId || "")}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  <DeepLText text={"Message"} />
                </button>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isFollowing
                      ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  <DeepLText text={followLoading ? "Please wait..." : isFollowing ? "Following" : "Follow"} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Profile identity card: same banner, avatar scale, typography and card treatment */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />
        <div className="px-4 pb-6 sm:px-6">
          {/* Match the signed-in Passport: keep name and verification badge visible beside the overlapping avatar on small screens too. */}
          <div className="-mt-12 grid grid-cols-[6rem_minmax(0,1fr)] items-end gap-4 min-[480px]:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
            <div className="h-24 w-24 shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Developer"}
                  className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-md">
                  {getInitials(profile.full_name, profile.username)}
                </div>
              )}
            </div>

            <div className="min-w-0 self-start pt-12">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-xl font-bold leading-tight text-slate-950 min-[480px]:text-2xl">
                  {profile.full_name || profile.username || "Developer"}
                </h2>
                <BadgeCheck
                  size={21}
                  aria-label="Verified developer"
                  className="shrink-0 text-blue-600"
                />
              </div>

              {profile.username && (
                <p className="mt-0.5 break-words text-sm text-slate-500">
                  @{profile.username}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                {(profile.city || profile.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} className="shrink-0" />
                    {[profile.city, profile.country].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} className="shrink-0" />
                  <DeepLText text={"African Developer"} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="max-w-4xl break-words text-sm leading-7 text-slate-600">
              {profile.bio || <DeepLText text={"This developer has not added a bio yet."} />}
            </p>
          </div>

          {(profile.github_url || profile.website_url || profile.linkedin_url) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"GitHub"} /> <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"Website"} /> <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"LinkedIn"} /> <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => loadNetwork("followers")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50">
              <span className="font-bold text-slate-900">{followerCount}</span> <span className="text-slate-500"><DeepLText text={"Followers"} /></span>
            </button>
            <button type="button" onClick={() => loadNetwork("following")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50">
              <span className="font-bold text-slate-900">{followingCount}</span> <span className="text-slate-500"><DeepLText text={"Following"} /></span>
            </button>
          </div>
        </div>
      </section>

      <main className="min-w-0">
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <SignalCard
            icon={<Star size={20} />}
            label="Declared skills"
            value={developerSkills.length}
            description="Skills in your capability profile"
          />
          <SignalCard
            icon={<Link2 size={20} />}
            label="Evidence items"
            value={evidence.length}
            description="Evidence supporting your skills"
          />
          <SignalCard
            icon={<ShieldCheck size={20} />}
            label="Verified evidence"
            value={stats.verifiedEvidence}
            description="Evidence currently verified"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950"><DeepLText text={"Skills & Capabilities"} /></h2>
          </div>

          {developerSkills.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><CodeIcon /></div>
              <h3 className="mt-4 font-semibold text-slate-900"><DeepLText text={"No skills added yet"} /></h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500"><DeepLText text={"This developer has not added skills to their Passport yet."} /></p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {developerSkills.map((developerSkill) => {
                const skill = developerSkill.skill;
                if (!skill) return null;
                const proficiency = developerSkill.proficiency || "Intermediate";
                return (
                  <div key={developerSkill.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-950">{skill.name}</h3>
                        {skill.category && <p className="mt-1 text-xs text-slate-500">{skill.category}</p>}
                      </div>
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500"><DeepLText text={"Proficiency"} /></span>
                        <span className="font-semibold capitalize text-blue-700"><DeepLText text={proficiency} /></span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${getProficiencyWidth(proficiency)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950"><DeepLText text={"Skill Evidence"} /></h2>
            <p className="mt-1 text-sm text-slate-500"><DeepLText text={"Evidence that helps others assess these skills and technical strengths."} /></p>
          </div>

          {evidence.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Link2 size={21} /></div>
              <h3 className="mt-4 font-semibold text-slate-900"><DeepLText text={"No evidence added yet"} /></h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500"><DeepLText text={"Evidence will appear here when this developer adds repositories, projects, certificates, or other proof of their skills."} /></p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {evidence.map((item) => {
                const verified = item.verified === true || item.status === "verified" || item.verification_status === "verified";
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><EvidenceIcon type={item.evidence_type || "github"} /></div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words font-semibold text-slate-950">{item.title || "Skill evidence"}</h3>
                            {verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} /><DeepLText text={"Verified"} /></span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"><DeepLText text={"Pending verification"} /></span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600"><DeepLText text={formatEvidenceType(item.evidence_type || "github")} /></p>
                          {item.description && <p className="mt-2 break-words text-sm leading-6 text-slate-500">{item.description}</p>}
                        </div>
                      </div>
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"><ExternalLink size={16} /><DeepLText text={"View evidence"} /></a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950"><DeepLText text={"AfriDev Experience"} /></h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={15} /><DeepLText text={"Based on platform activity"} /></div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ExperienceCard icon={<BriefcaseBusiness size={21} />} label="Projects" value={stats.projects} description="Projects created" />
            <ExperienceCard icon={<NetworkIcon />} label="Completed Exchanges" value={stats.exchanges} description="Successfully completed" />
            <ExperienceCard icon={<CheckCircle2 size={21} />} label="Verified Contributions" value={stats.verifiedContributions} description="Work validated by a partner" />
            <ExperienceCard icon={<Activity size={21} />} label="Exchange Activity" value={stats.participatedExchanges} description="Exchanges participated in" />
          </div>

        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600"><DeepLText text={"Build history"} /></p>
            <h2 className="mt-1 text-xl font-bold text-slate-950"><DeepLText text={"Projects"} /></h2>
          </div>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><BriefcaseBusiness size={32} className="mx-auto mb-3 text-slate-600" /><p className="text-sm text-slate-500"><DeepLText text={"No public projects yet."} /></p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <div key={project.id} className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-950">{project.title}</h3>{project.status && <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-500"><DeepLText text={project.status.replace("_", " ")} /></span>}</div><button type="button" onClick={() => navigate(`/projects/${project.id}`)} className="rounded-lg bg-slate-100 p-2 transition hover:bg-blue-50 hover:text-blue-700" aria-label="View project"><ChevronRight size={16} /></button></div>
                  {project.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{project.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">{project.repository_url && <a href={project.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"><ExternalLink size={13} /><DeepLText text={"Repository"} /></a>}{project.demo_url && <a href={project.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"><Globe2 size={13} /><DeepLText text={"Live Demo"} /></a>}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isOwnPassport && currentUserId && (
          <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div><h2 className="text-xl font-bold text-slate-950"><DeepLText text={"Want to work together?"} /></h2><p className="mt-1 text-slate-500"><DeepLText text={"Connect with this developer through AfriDev Exchange."} /></p></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => navigate(`/messages?developer=${encodeURIComponent(developerId || "")}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"><MessageCircle className="h-4 w-4" /><DeepLText text={"Message"} /></button><button onClick={() => navigate("/discover")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"><BriefcaseBusiness className="h-4 w-4" /><DeepLText text={"Discover Exchanges"} /></button></div>
          </section>
        )}
      </main>

      {/* Followers / Following modal */}
      {networkOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onClick={() => setNetworkOpen(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold">
                  <DeepLText text={networkOpen === "followers"
                    ? "Followers"
                    : "Following"} />
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {networkProfiles.length} <DeepLText text={"developer"} />
                  {networkProfiles.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              <button
                onClick={() => setNetworkOpen(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh] p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {networkLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    <DeepLText text={"Loading developers..."} />
                  </p>
                </div>
              ) : networkProfiles.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500">
                    <DeepLText text={"No developers here yet."} />
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {networkProfiles.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100/70 transition"
                    >
                      <button
                        onClick={() => {
                          setNetworkOpen(null);
                          navigate(
                            `/developer/${person.id}`,
                          );
                        }}
                        className="shrink-0"
                      >
                        {person.avatar_url ? (
                          <img
                            src={person.avatar_url}
                            alt={
                              person.full_name ||
                              "Developer"
                            }
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-100 flex items-center justify-center font-bold text-blue-700">
                            {getInitials(
                              person.full_name,
                              person.username,
                            )}
                          </div>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            setNetworkOpen(null);
                            navigate(
                              `/developer/${person.id}`,
                            );
                          }}
                          className="text-left block max-w-full"
                        >
                          <p className="font-semibold truncate hover:text-blue-700 transition">
                            {person.full_name ||
                              person.username ||
                              "Developer"}
                          </p>

                          {person.username && (
                            <p className="text-xs text-slate-500 truncate">
                              @{person.username}
                            </p>
                          )}

                          {(person.city ||
                            person.country) && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {[
                                person.city,
                                person.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </button>
                      </div>

                      {currentUserId &&
                        currentUserId !== person.id && (
                          <button
                            onClick={() =>
                              toggleNetworkFollow(person)
                            }
                            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                              person.isFollowing
                                ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : "border-blue-500 bg-blue-600 text-white hover:bg-blue-500"
                            }`}
                          >
                            <DeepLText text={person.isFollowing
                              ? "Following"
                              : "Follow"} />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalCard({ icon, label, value, description }: { icon: ReactNode; label: string; value: number; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</div><span className="text-sm font-semibold text-slate-600"><DeepLText text={label} /></span></div>
      <p className="mt-5 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500"><DeepLText text={description} /></p>
    </div>
  );
}

function ExperienceCard({ icon, label, value, description }: { icon: ReactNode; label: string; value: number; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</div><span className="text-sm font-medium text-slate-500"><DeepLText text={label} /></span></div>
      <p className="mt-5 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500"><DeepLText text={description} /></p>
    </div>
  );
}

function getProficiencyWidth(proficiency: string) {
  switch (proficiency.toLowerCase()) {
    case "beginner": return 25;
    case "intermediate": return 50;
    case "advanced": return 75;
    case "expert": return 100;
    default: return 50;
  }
}

function CodeIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14" y1="4" x2="10" y2="20" /></svg>;
}

function NetworkIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 6h3a6 6 0 0 1 6 6v3" /><path d="M15 18h-3a6 6 0 0 1-6-6V9" /></svg>;
}

function EvidenceIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case "certificate": return <Award size={21} />;
    case "project": return <BriefcaseBusiness size={21} />;
    case "portfolio": return <ExternalLink size={21} />;
    case "assessment": return <CheckCircle2 size={21} />;
    default: return <CodeIcon />;
  }
}

function formatEvidenceType(type: string) {
  switch (type.toLowerCase()) {
    case "github": return "GitHub";
    case "portfolio": return "Portfolio";
    case "certificate": return "Certificate";
    case "project": return "Project";
    case "assessment": return "Assessment";
    default: return type;
  }
}

