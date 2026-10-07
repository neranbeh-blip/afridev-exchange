import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Link2,
  MapPin,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type DeveloperSkill = {
  id: string;
  proficiency: string;
  skill: {
    id: string;
    name: string;
    category: string | null;
  } | null;
};

type SkillEvidence = {
  id: string;
  skill_id: string;
  evidence_type: string;
  title: string;
  description: string | null;
  url: string | null;
  verified: boolean;
  verification_status:
    | "pending"
    | "verified"
    | "rejected"
    | "changes_requested";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  skill: {
    id: string;
    name: string;
  } | null;
};

type PassportStats = {
  completedExchanges: number;
  participatedExchanges: number;
  verifiedContributions: number;
  verifiedEvidence: number;
};

function PublicPassport() {
  const { developerId } = useParams<{ developerId: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<DeveloperSkill[]>([]);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);

  const [stats, setStats] = useState<PassportStats>({
    completedExchanges: 0,
    participatedExchanges: 0,
    verifiedContributions: 0,
    verifiedEvidence: 0,
  });

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (developerId) {
      void loadPassport(developerId);
    }
  }, [developerId]);

  async function loadPassport(id: string) {
    setLoading(true);
    setNotFound(false);

    try {
      // ========================================================
      // PROFILE
      // ========================================================

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, bio, avatar_url"
          )
          .eq("id", id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Public profile loading error:",
          profileError
        );
      }

      if (!profileData) {
        setNotFound(true);
        return;
      }

      setProfile(profileData);

      // ========================================================
      // SKILLS
      // ========================================================

      const { data: skillsData, error: skillsError } =
        await supabase
          .from("developer_skills")
          .select(
            `
            id,
            proficiency,
            skill:skills (
              id,
              name,
              category
            )
          `
          )
          .eq("developer_id", id);

      if (skillsError) {
        console.error(
          "Public skills loading error:",
          skillsError
        );
      }

      setSkills(
        (skillsData ?? []) as unknown as DeveloperSkill[]
      );

      // ========================================================
      // EVIDENCE
      // ========================================================

      const { data: evidenceData, error: evidenceError } =
        await supabase
          .from("skill_evidence")
          .select(
            `
            id,
            skill_id,
            evidence_type,
            title,
            description,
            url,
            verified,
            verification_status,
            reviewed_by,
            reviewed_at,
            review_comment,
            created_at,
            skill:skills (
              id,
              name
            )
          `
          )
          .eq("developer_id", id)
          .order("created_at", {
            ascending: false,
          });

      if (evidenceError) {
        console.error(
          "Public evidence loading error:",
          evidenceError
        );
      }

      const publicEvidence = (evidenceData ??
        []) as unknown as SkillEvidence[];

      setEvidence(publicEvidence);

      // ========================================================
      // EXCHANGE PARTICIPATION
      // ========================================================

      const {
        data: participantRows,
        error: participantError,
      } = await supabase
        .from("exchange_participants")
        .select("exchange_id")
        .eq("developer_id", id);

      if (participantError) {
        console.error(
          "Public exchange participation error:",
          participantError
        );
      }

      const exchangeIds = Array.from(
        new Set(
          participantRows
            ?.map((row) => row.exchange_id)
            .filter(Boolean) || []
        )
      );

      let completedExchanges = 0;

      if (exchangeIds.length > 0) {
        const { count, error: exchangeError } =
          await supabase
            .from("exchanges")
            .select("id", {
              count: "exact",
              head: true,
            })
            .in("id", exchangeIds)
            .eq("status", "completed");

        if (exchangeError) {
          console.error(
            "Public completed exchanges error:",
            exchangeError
          );
        }

        completedExchanges = count || 0;
      }

      // ========================================================
      // VERIFIED CONTRIBUTIONS
      // ========================================================

      const {
        count: verifiedContributionCount,
        error: contributionError,
      } = await supabase
        .from("contributions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("contributor_id", id)
        .eq("status", "verified");

      if (contributionError) {
        console.warn(
          "Verified contribution count unavailable:",
          contributionError.message
        );
      }

      // ========================================================
      // STATS
      // ========================================================

      const verifiedEvidenceCount = publicEvidence.filter(
        (item) =>
          item.verified ||
          item.verification_status === "verified"
      ).length;

      setStats({
        completedExchanges,
        participatedExchanges: exchangeIds.length,
        verifiedContributions:
          verifiedContributionCount || 0,
        verifiedEvidence: verifiedEvidenceCount,
      });
    } catch (error) {
      console.error("Public Passport loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // VERIFIED EVIDENCE BY SKILL
  // ============================================================

  const evidenceBySkill = useMemo(() => {
    const map = new Map<
      string,
      {
        verified: SkillEvidence[];
        pending: SkillEvidence[];
      }
    >();

    evidence.forEach((item) => {
      if (!map.has(item.skill_id)) {
        map.set(item.skill_id, {
          verified: [],
          pending: [],
        });
      }

      const bucket = map.get(item.skill_id);

      if (!bucket) {
        return;
      }

      if (
        item.verified ||
        item.verification_status === "verified"
      ) {
        bucket.verified.push(item);
      } else if (
        item.verification_status === "pending"
      ) {
        bucket.pending.push(item);
      }
    });

    return map;
  }, [evidence]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading Developer Passport...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // NOT FOUND
  // ============================================================

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <UserRound size={26} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          Developer not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          This Developer Passport does not exist or is not
          currently available.
        </p>

        <Link
          to="/discover"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <ArrowLeft size={17} />
          Back to Discover
        </Link>
      </div>
    );
  }

  const initials =
    profile.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ======================================================
          BACK
      ======================================================= */}

      <Link
        to="/discover"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        Back to Discover
      </Link>

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />

        <div className="px-6 pb-7">
          <div className="-mt-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Developer"}
                  className="h-28 w-28 rounded-2xl border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-3xl font-bold text-blue-700 shadow-lg">
                  {initials}
                </div>
              )}

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-slate-950">
                    {profile.full_name || "Developer"}
                  </h1>

                  <ShieldCheck
                    size={21}
                    className="text-blue-600"
                  />
                </div>

                {profile.username && (
                  <p className="mt-1 text-sm text-slate-500">
                    @{profile.username}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                  {(profile.city || profile.country) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} />
                      {[profile.city, profile.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={15} />
                    African Developer
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <ShieldCheck size={18} />
                Public Developer Passport
              </div>

              <p className="mt-1 text-xs text-blue-600">
                Capability & collaboration record
              </p>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="max-w-4xl text-sm leading-7 text-slate-600">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          TRUST SUMMARY
      ======================================================= */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PublicStat
          icon={<ShieldCheck size={20} />}
          label="Verified capabilities"
          value={stats.verifiedEvidence}
          description="Verified evidence items"
        />

        <PublicStat
          icon={<BriefcaseBusiness size={20} />}
          label="Completed exchanges"
          value={stats.completedExchanges}
          description="Successfully completed"
        />

        <PublicStat
          icon={<CheckCircle2 size={20} />}
          label="Verified contributions"
          value={stats.verifiedContributions}
          description="Work validated by partners"
        />

        <PublicStat
          icon={<Users size={20} />}
          label="Exchange activity"
          value={stats.participatedExchanges}
          description="Exchanges participated in"
        />
      </section>

      {/* ======================================================
          CAPABILITIES
      ======================================================= */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Capability
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Skills & Capabilities
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Skills are separated from evidence so you can see
            which capabilities are supported by community review.
          </p>
        </div>

        {skills.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">
              No skills have been added yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((developerSkill) => {
              const skillId = developerSkill.skill?.id;

              const skillEvidence = skillId
                ? evidenceBySkill.get(skillId)
                : undefined;

              const verifiedCount =
                skillEvidence?.verified.length || 0;

              const pendingCount =
                skillEvidence?.pending.length || 0;

              return (
                <div
                  key={developerSkill.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {developerSkill.skill?.name ||
                          "Unknown skill"}
                      </h3>

                      {developerSkill.skill?.category && (
                        <p className="mt-1 text-xs text-slate-500">
                          {developerSkill.skill.category}
                        </p>
                      )}
                    </div>

                    {verifiedCount > 0 ? (
                      <CheckCircle2
                        size={19}
                        className="text-emerald-600"
                      />
                    ) : (
                      <ShieldCheck
                        size={19}
                        className="text-slate-300"
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Proficiency
                    </span>

                    <span className="font-semibold capitalize text-blue-700">
                      {developerSkill.proficiency}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${getProficiencyWidth(
                          developerSkill.proficiency
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {verifiedCount > 0 ? (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 size={16} />
                          Community verified
                        </div>

                        <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                          {verifiedCount} verified evidence{" "}
                          {verifiedCount === 1
                            ? "item"
                            : "items"}{" "}
                          supporting this skill.
                        </p>
                      </div>
                    ) : pendingCount > 0 ? (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                          Evidence pending
                        </div>

                        <p className="mt-1 text-xs leading-5 text-amber-700/80">
                          {pendingCount} evidence{" "}
                          {pendingCount === 1
                            ? "item is"
                            : "items are"}{" "}
                          awaiting verification.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          Self-declared
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          No supporting evidence has been verified
                          yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================
          VERIFIED EVIDENCE
      ======================================================= */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Proof
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Verified Evidence
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Evidence that other developers have reviewed and
            verified.
          </p>
        </div>

        {evidence.filter(
          (item) =>
            item.verified ||
            item.verification_status === "verified"
        ).length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No verified evidence yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Verified evidence will appear here as the
              community reviews this developer's work.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {evidence
              .filter(
                (item) =>
                  item.verified ||
                  item.verification_status === "verified"
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <EvidenceIcon
                          type={item.evidence_type}
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">
                            {item.title}
                          </h3>

                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            Community verified
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600">
                          {formatEvidenceType(
                            item.evidence_type
                          )}

                          {item.skill?.name
                            ? ` · ${item.skill.name}`
                            : ""}
                        </p>

                        {item.description && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.description}
                          </p>
                        )}

                        {item.reviewed_at && (
                          <p className="mt-2 text-xs text-slate-400">
                            Verified on{" "}
                            {new Date(
                              item.reviewed_at
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <ExternalLink size={16} />
                        Inspect evidence
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* ======================================================
          EXPERIENCE
      ======================================================= */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              AfriDev Trust & Experience
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Collaboration History
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              These signals come from actual activity on AfriDev,
              not from self-declared claims.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={15} />
            Platform activity
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <PublicStat
            icon={<BriefcaseBusiness size={20} />}
            label="Completed exchanges"
            value={stats.completedExchanges}
            description="Successfully completed"
          />

          <PublicStat
            icon={<CheckCircle2 size={20} />}
            label="Verified contributions"
            value={stats.verifiedContributions}
            description="Work validated by partners"
          />

          <PublicStat
            icon={<Users size={20} />}
            label="Exchange activity"
            value={stats.participatedExchanges}
            description="Exchanges participated in"
          />
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-950">
                Evidence and experience are different
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Verified evidence supports what this developer can
                do. Completed exchanges and verified contributions
                show what this developer has actually done through
                AfriDev.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA
      ======================================================= */}

      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-950">
              Interested in working together?
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Use AfriDev Exchange to find complementary skills
              and start a collaboration.
            </p>
          </div>

          <Link
            to="/exchange"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <Link2 size={17} />
            Go to Exchange
          </Link>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// PUBLIC STAT
// ============================================================

function PublicStat({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// EVIDENCE ICON
// ============================================================

function EvidenceIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case "certificate":
      return <Award size={21} />;

    case "project":
      return <BriefcaseBusiness size={21} />;

    case "portfolio":
      return <ExternalLink size={21} />;

    case "assessment":
      return <CheckCircle2 size={21} />;

    case "github":
      return <Link2 size={21} />;

    default:
      return <ShieldCheck size={21} />;
  }
}

// ============================================================
// EVIDENCE TYPE
// ============================================================

function formatEvidenceType(type: string) {
  switch (type.toLowerCase()) {
    case "github":
      return "GitHub";

    case "portfolio":
      return "Portfolio";

    case "certificate":
      return "Certificate";

    case "project":
      return "Project";

    case "assessment":
      return "Assessment";

    default:
      return type;
  }
}

// ============================================================
// PROFICIENCY
// ============================================================

function getProficiencyWidth(proficiency: string) {
  switch (proficiency.toLowerCase()) {
    case "beginner":
      return 25;

    case "intermediate":
      return 50;

    case "advanced":
      return 75;

    case "expert":
      return 100;

    default:
      return 50;
  }
}

export default PublicPassport;