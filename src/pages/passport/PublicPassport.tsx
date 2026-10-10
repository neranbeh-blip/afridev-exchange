import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
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
  skill?: Skill | null;
}

interface Evidence {
  id: string;
  developer_skill_id?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  status?: string | null;
  verification_status?: string | null;
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

function getVerificationStatus(
  skillId: string,
  developerSkills: DeveloperSkill[],
  evidence: Evidence[],
) {
  const developerSkill = developerSkills.find(
    (item) => item.skill_id === skillId,
  );

  if (!developerSkill) {
    return "Self-declared";
  }

  const skillEvidence = evidence.filter(
    (item) => item.developer_skill_id === developerSkill.id,
  );

  const verified = skillEvidence.some(
    (item) =>
      item.status === "verified" ||
      item.verification_status === "verified",
  );

  const pending = skillEvidence.some(
    (item) =>
      item.status === "pending" ||
      item.verification_status === "pending",
  );

  if (verified) {
    return "Community verified";
  }

  if (pending) {
    return "Evidence pending";
  }

  return "Self-declared";
}

export default function PublicPassport() {
  const { developerId } = useParams<{ developerId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [developerSkills, setDeveloperSkills] = useState<DeveloperSkill[]>(
    [],
  );
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    let mounted = true;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setCurrentUserId(user?.id ?? null);
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
        ] = await Promise.all([
          supabase
            .from("developer_skills")
            .select("id, skill_id")
            .eq("developer_id", developerId),

          supabase
            .from("skill_evidence")
            .select(
              "id, developer_skill_id, title, description, url, status, verification_status",
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

        setProjects((projectsResult.data ?? []) as Project[]);

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

          setSkills(loadedSkills);

          setDeveloperSkills(
            rawDeveloperSkills.map((developerSkill) => ({
              ...developerSkill,
              skill:
                loadedSkills.find(
                  (skill) => skill.id === developerSkill.skill_id,
                ) ?? null,
            })),
          );
        } else {
          setSkills([]);
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
          message: `${profile?.full_name || profile?.username || "A developer"} started following you.`,
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
          message: `${profile?.full_name || profile?.username || "A developer"} started following you.`,
          link: `/developer/${currentUserId}`,
        });
      }
    } catch (error) {
      console.error("Network follow action failed:", error);
    }
  }

  const verifiedEvidenceCount = useMemo(
    () =>
      evidence.filter(
        (item) =>
          item.status === "verified" ||
          item.verification_status === "verified",
      ).length,
    [evidence],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading Developer Passport...</p>
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
            Developer not found
          </h1>
          <p className="text-slate-500 mb-6">
            {errorMessage || "This Developer Passport is unavailable."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Passport heading: same identity hierarchy as the signed-in Passport */}
      <div className="mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-600">
              Developer Identity
            </p>
            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950">
              Developer Passport
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Your verified developer identity, capabilities, experience, and contribution history on AfriDev Exchange.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {isOwnPassport ? (
              <button
                type="button"
                onClick={() => navigate("/passport")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                Edit Passport
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
                  Message
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
                  {followLoading ? "Please wait..." : isFollowing ? "Following" : "Follow"}
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
          <div className="-mt-12 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Developer"}
                  className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-md">
                  {getInitials(profile.full_name, profile.username)}
                </div>
              )}
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-2xl font-bold text-slate-950">
                    {profile.full_name || profile.username || "Developer"}
                  </h2>
                  <CheckCircle2 size={20} className="text-blue-600" />
                </div>
                {profile.username && <p className="text-sm text-slate-500">@{profile.username}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  {(profile.city || profile.country) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} />
                      {[profile.city, profile.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={15} />
                    African Developer
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <CheckCircle2 size={18} />
                AfriDev Passport
              </div>
              <p className="mt-1 text-xs text-blue-600">Identity & contribution record</p>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="max-w-4xl break-words text-sm leading-7 text-slate-600">{profile.bio}</p>
            </div>
          )}

          {(profile.github_url || profile.website_url || profile.linkedin_url) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  GitHub <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  Website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  LinkedIn <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => loadNetwork("followers")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50">
              <span className="font-bold text-slate-900">{followerCount}</span> <span className="text-slate-500">Followers</span>
            </button>
            <button type="button" onClick={() => loadNetwork("following")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50">
              <span className="font-bold text-slate-900">{followingCount}</span> <span className="text-slate-500">Following</span>
            </button>
          </div>
        </div>
      </section>

      <main className="min-w-0">
        {/* Same Capability / Trust introduction used on the signed-in Passport */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Star size={21} />
              </div>
              <div>
                <h3 className="font-bold text-slate-950">Capability</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Skills and evidence that describe this developer's capabilities and technical strengths.
                </p>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck size={21} />
              </div>
              <div>
                <h3 className="font-bold text-slate-950">AfriDev Trust & Experience</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Evidence, projects, and collaboration signals that help others understand this developer's work.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Signal cards: same three-card layout as the signed-in Passport */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Star size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Declared skills</span>
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-950">{skills.length}</p>
            <p className="mt-1 text-sm text-slate-500">Skills in this capability profile</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Link2 size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Evidence items</span>
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-950">{evidence.length}</p>
            <p className="mt-1 text-sm text-slate-500">Evidence supporting skills</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Verified evidence</span>
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-950">{verifiedEvidenceCount}</p>
            <p className="mt-1 text-sm text-slate-500">Evidence currently verified</p>
          </div>
        </section>

        {/* Capability */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">
                Capability
              </p>
              <h2 className="text-2xl font-bold mt-1">
                Skills & Evidence
              </h2>
            </div>
          </div>

          {developerSkills.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BriefcaseBusiness className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500">
                No skills have been added yet.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {developerSkills.map((developerSkill) => {
                const skill = developerSkill.skill;

                if (!skill) {
                  return null;
                }

                const status = getVerificationStatus(
                  skill.id,
                  developerSkills,
                  evidence,
                );

                const skillEvidence = evidence.filter(
                  (item) =>
                    item.developer_skill_id ===
                    developerSkill.id,
                );

                const isVerified =
                  status === "Community verified";

                const isPending =
                  status === "Evidence pending";

                return (
                  <div
                    key={developerSkill.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {skill.name}
                        </h3>

                        {skill.category && (
                          <p className="text-slate-500 text-sm mt-1">
                            {skill.category}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isVerified
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : isPending
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isVerified && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        Supporting evidence
                      </span>
                      <span className="text-slate-600 font-medium">
                        {skillEvidence.length}
                      </span>
                    </div>

                    {skillEvidence.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {skillEvidence
                          .slice(0, 3)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-slate-700"
                            >
                              <p className="text-sm font-medium">
                                {item.title ||
                                  "Skill evidence"}
                              </p>

                              {item.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <span
                                  className={`text-xs ${
                                    item.status ===
                                      "verified" ||
                                    item.verification_status ===
                                      "verified"
                                      ? "text-emerald-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {item.status ||
                                    item.verification_status ||
                                    "Submitted"}
                                </span>

                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-xs inline-flex items-center gap-1"
                                  >
                                    View
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Trust */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">
                AfriDev Trust & Experience
              </p>

              <h2 className="text-2xl font-bold mt-1">
                Contribution history
              </h2>

              <p className="text-slate-500 mt-2 max-w-2xl leading-6">
                AfriDev keeps capability evidence separate from
                the experience developers build through exchanges,
                projects, collaboration and verified contributions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[230px]">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-slate-500 text-xs">
                  Verified evidence
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {verifiedEvidenceCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-slate-500 text-xs">
                  Projects
                </p>
                <p className="text-2xl font-bold mt-1">
                  {projects.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">
              Build history
            </p>
            <h2 className="text-2xl font-bold mt-1">
              Projects
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BriefcaseBusiness className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500">
                No public projects yet.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {project.title}
                      </h3>

                      {project.status && (
                        <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs capitalize">
                          {project.status.replace(
                            "_",
                            " ",
                          )}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/projects/${project.id}`,
                        )
                      }
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-100 transition"
                      aria-label="View project"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {project.description && (
                    <p className="text-slate-500 text-sm leading-6 mt-4 line-clamp-3">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.repository_url && (
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Repository
                      </a>
                    )}

                    {project.demo_url && (
                      <a
                        href={project.demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                      >
                        <Globe2 className="w-3.5 h-3.5" />
                        Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact */}
        {!isOwnPassport && currentUserId && (
          <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h2 className="text-xl font-bold">
                Want to work together?
              </h2>
              <p className="text-slate-500 mt-1">
                Connect with this developer through AfriDev Exchange.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  navigate(`/messages?developer=${encodeURIComponent(developerId || "")}`)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>

              <button
                onClick={() => navigate("/discover")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <BriefcaseBusiness className="h-4 w-4" />
                Discover Exchanges
              </button>
            </div>
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
                  {networkOpen === "followers"
                    ? "Followers"
                    : "Following"}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {networkProfiles.length} developer
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
                    Loading developers...
                  </p>
                </div>
              ) : networkProfiles.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500">
                    No developers here yet.
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
                            {person.isFollowing
                              ? "Following"
                              : "Follow"}
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