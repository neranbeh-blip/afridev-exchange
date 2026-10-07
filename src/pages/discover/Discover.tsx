import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
  developer_id: string;
  proficiency: string;
  skill: {
    id: string;
    name: string;
    category: string | null;
  } | null;
};

type SkillEvidence = {
  id: string;
  developer_id: string;
  skill_id: string;
  verified: boolean;
  verification_status:
    | "pending"
    | "verified"
    | "rejected"
    | "changes_requested";
};

type AIMatch = {
  developer_id: string;
  developer_name: string;
  developer_avatar: string | null;
  offer_id: string;
  need_id: string;
  offer_title: string;
  need_title: string;
  matching_skills: string[];
  compatibility_score: number;
  explanation: string;
  exchange_value: string;
  direction:
    | "their_offer_matches_my_need"
    | "my_offer_matches_their_need";
};

type DeveloperCard = Profile & {
  skills: DeveloperSkill[];
  verifiedEvidenceCount: number;
  pendingEvidenceCount: number;
  completedExchanges: number;
  participatedExchanges: number;
  verifiedContributions: number;
  compatibilityScore: number | null;
  matchingOfferSkills: string[];
  matchingNeedSkills: string[];
  aiExplanation: string | null;
  aiExchangeValue: string | null;
  aiMatch: AIMatch | null;
};

function Discover() {
  const [developers, setDevelopers] = useState<DeveloperCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");

  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // LOAD DEVELOPERS
  // ============================================================

  async function loadDevelopers() {
    try {
      setLoading(true);
      setError(null);

      // --------------------------------------------------------
      // Profiles
      // --------------------------------------------------------

      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, bio, avatar_url"
          )
          .order("full_name", {
            ascending: true,
          });

      if (profilesError) {
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        setDevelopers([]);
        return;
      }

      const developerIds = profiles.map(
        (profile) => profile.id
      );

      const { data: { user: currentUser } } =
        await supabase.auth.getUser();

      const { data: offers, error: offersError } =
        await supabase
          .from("offers")
          .select("id, developer_id")
          .in("developer_id", developerIds);

      if (offersError) {
        console.warn("Could not load developer offers:", offersError.message);
      }

      const { data: needs, error: needsError } =
        await supabase
          .from("needs")
          .select("id, developer_id")
          .in("developer_id", developerIds);

      if (needsError) {
        console.warn("Could not load developer needs:", needsError.message);
      }

      const offerIds = (offers ?? []).map((item) => item.id);
      const needIds = (needs ?? []).map((item) => item.id);

      const { data: offerSkills, error: offerSkillsError } =
        offerIds.length > 0
          ? await supabase.from("offer_skills").select("offer_id, skill_id").in("offer_id", offerIds)
          : { data: [], error: null };

      if (offerSkillsError) {
        console.warn("Could not load offer skills:", offerSkillsError.message);
      }

      const { data: needSkills, error: needSkillsError } =
        needIds.length > 0
          ? await supabase.from("need_skills").select("need_id, skill_id").in("need_id", needIds)
          : { data: [], error: null };

      if (needSkillsError) {
        console.warn("Could not load need skills:", needSkillsError.message);
      }

      const developerOfferSkills = new Map<string, Set<string>>();
      const developerNeedSkills = new Map<string, Set<string>>();

      (offers ?? []).forEach((offer) => {
        const skillsForDeveloper = developerOfferSkills.get(offer.developer_id) ?? new Set<string>();
        (offerSkills ?? []).filter((link) => link.offer_id === offer.id).forEach((link) => skillsForDeveloper.add(link.skill_id));
        developerOfferSkills.set(offer.developer_id, skillsForDeveloper);
      });

      (needs ?? []).forEach((need) => {
        const skillsForDeveloper = developerNeedSkills.get(need.developer_id) ?? new Set<string>();
        (needSkills ?? []).filter((link) => link.need_id === need.id).forEach((link) => skillsForDeveloper.add(link.skill_id));
        developerNeedSkills.set(need.developer_id, skillsForDeveloper);
      });

      // --------------------------------------------------------
      // Developer skills
      // --------------------------------------------------------

      const { data: developerSkills, error: skillsError } =
        await supabase
          .from("developer_skills")
          .select(
            `
            developer_id,
            proficiency,
            skill:skills (
              id,
              name,
              category
            )
          `
          )
          .in("developer_id", developerIds);

      if (skillsError) {
        console.warn(
          "Could not load developer skills:",
          skillsError.message
        );
      }

      // --------------------------------------------------------
      // Evidence
      // --------------------------------------------------------

      const { data: evidence, error: evidenceError } =
        await supabase
          .from("skill_evidence")
          .select(
            `
            id,
            developer_id,
            skill_id,
            verified,
            verification_status
          `
          )
          .in("developer_id", developerIds);

      if (evidenceError) {
        console.warn(
          "Could not load skill evidence:",
          evidenceError.message
        );
      }

      // --------------------------------------------------------
      // Exchange participation
      // --------------------------------------------------------

      const {
        data: participants,
        error: participantsError,
      } = await supabase
        .from("exchange_participants")
        .select("developer_id, exchange_id")
        .in("developer_id", developerIds);

      if (participantsError) {
        console.warn(
          "Could not load exchange participation:",
          participantsError.message
        );
      }

      const exchangeIds = Array.from(
        new Set(
          (participants ?? [])
            .map((item) => item.exchange_id)
            .filter(Boolean)
        )
      );

      // --------------------------------------------------------
      // Completed exchanges
      // --------------------------------------------------------

      let completedExchangeIds = new Set<string>();

      if (exchangeIds.length > 0) {
        const { data: completedExchanges, error: completedError } =
          await supabase
            .from("exchanges")
            .select("id")
            .in("id", exchangeIds)
            .eq("status", "completed");

        if (completedError) {
          console.warn(
            "Could not load completed exchanges:",
            completedError.message
          );
        }

        completedExchangeIds = new Set(
          (completedExchanges ?? []).map(
            (exchange) => exchange.id
          )
        );
      }

      // --------------------------------------------------------
      // Verified contributions
      // --------------------------------------------------------

      const { data: contributions, error: contributionsError } =
        await supabase
          .from("contributions")
          .select("contributor_id")
          .in("contributor_id", developerIds)
          .eq("status", "verified");

      if (contributionsError) {
        console.warn(
          "Could not load verified contributions:",
          contributionsError.message
        );
      }

      // --------------------------------------------------------
      // Build developer cards
      // --------------------------------------------------------

      const allSkills =
        (developerSkills ?? []) as unknown as DeveloperSkill[];

      const allEvidence =
        (evidence ?? []) as SkillEvidence[];

      const skillNameById = new Map<string, string>();
      allSkills.forEach((item) => {
        if (item.skill) skillNameById.set(item.skill.id, item.skill.name);
      });

      const currentOfferSkills = currentUser
        ? developerOfferSkills.get(currentUser.id) ?? new Set<string>()
        : new Set<string>();
      const currentNeedSkills = currentUser
        ? developerNeedSkills.get(currentUser.id) ?? new Set<string>()
        : new Set<string>();

      const calculateCompatibility = (developerId: string) => {
        if (developerId === currentUser?.id || (currentOfferSkills.size === 0 && currentNeedSkills.size === 0)) {
          return { score: null as number | null, matchingOfferSkills: [] as string[], matchingNeedSkills: [] as string[] };
        }

        const theirOfferSkills = developerOfferSkills.get(developerId) ?? new Set<string>();
        const theirNeedSkills = developerNeedSkills.get(developerId) ?? new Set<string>();
        const matchingNeedSkills = Array.from(currentNeedSkills).filter((id) => theirOfferSkills.has(id)).map((id) => skillNameById.get(id) ?? "Skill");
        const matchingOfferSkills = Array.from(currentOfferSkills).filter((id) => theirNeedSkills.has(id)).map((id) => skillNameById.get(id) ?? "Skill");
        const needScore = currentNeedSkills.size > 0 ? matchingNeedSkills.length / currentNeedSkills.size : null;
        const offerScore = currentOfferSkills.size > 0 ? matchingOfferSkills.length / currentOfferSkills.size : null;
        const scores = [needScore, offerScore].filter((score): score is number => score !== null);
        const score = scores.length > 0 ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) : null;
        return { score, matchingOfferSkills, matchingNeedSkills };
      };

      const developerCards: DeveloperCard[] = profiles.map(
        (profile) => {
          const profileSkills = allSkills.filter(
            (item) => item.developer_id === profile.id
          );

          const profileEvidence = allEvidence.filter(
            (item) => item.developer_id === profile.id
          );

          const profileParticipants = (
            participants ?? []
          ).filter(
            (item) => item.developer_id === profile.id
          );

          const completedExchanges =
            profileParticipants.filter((item) =>
              completedExchangeIds.has(item.exchange_id)
            ).length;

          const verifiedEvidenceCount =
            profileEvidence.filter(
              (item) =>
                item.verified ||
                item.verification_status === "verified"
            ).length;

          const pendingEvidenceCount =
            profileEvidence.filter(
              (item) =>
                item.verification_status === "pending"
            ).length;

          const verifiedContributions =
            (contributions ?? []).filter(
              (item) => item.contributor_id === profile.id
            ).length;

          const compatibility = calculateCompatibility(profile.id);

          return {
            ...profile,
            skills: profileSkills,
            verifiedEvidenceCount,
            pendingEvidenceCount,
            completedExchanges,
            participatedExchanges: profileParticipants.length,
            verifiedContributions,
            compatibilityScore: compatibility.score,
            matchingOfferSkills: compatibility.matchingOfferSkills,
            matchingNeedSkills: compatibility.matchingNeedSkills,
            aiExplanation: null,
            aiExchangeValue: null,
            aiMatch: null,
          };
        }
      );

      setDevelopers(developerCards);
    } catch (err) {
      console.error("Discover loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load developers."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAIMatches() {
    try {
      setAiLoading(true);
      setAiError(null);

      const {
        data: functionData,
        error: functionError,
      } = await supabase.functions.invoke("ai-match", {
        body: {},
      });

      if (functionError) {
        throw functionError;
      }

      const matches: AIMatch[] = Array.isArray(functionData?.matches)
        ? functionData.matches
        : [];

      const bestByDeveloper = new Map<string, AIMatch>();

      for (const match of matches) {
        if (!match?.developer_id) continue;

        const existing = bestByDeveloper.get(match.developer_id);

        if (
          !existing ||
          match.compatibility_score > existing.compatibility_score
        ) {
          bestByDeveloper.set(match.developer_id, match);
        }
      }

      setDevelopers((current) =>
        current.map((developer) => {
          const match = bestByDeveloper.get(developer.id);

          if (!match) {
            return {
              ...developer,
              aiExplanation: null,
              aiExchangeValue: null,
              aiMatch: null,
            };
          }

          return {
            ...developer,
            compatibilityScore: match.compatibility_score,
            matchingOfferSkills:
              match.direction === "my_offer_matches_their_need"
                ? match.matching_skills
                : developer.matchingOfferSkills,
            matchingNeedSkills:
              match.direction === "their_offer_matches_my_need"
                ? match.matching_skills
                : developer.matchingNeedSkills,
            aiExplanation: match.explanation || null,
            aiExchangeValue: match.exchange_value || null,
            aiMatch: match,
          };
        }),
      );
    } catch (err) {
      console.error("AI matching error:", err);
      setAiError(
        err instanceof Error
          ? err.message
          : "AI matching is temporarily unavailable.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    void loadDevelopers();
    void loadAIMatches();
  }, []);

  // ============================================================
  // SKILL FILTER OPTIONS
  // ============================================================

  const skillOptions = useMemo(() => {
    const skillMap = new Map<string, string>();

    developers.forEach((developer) => {
      developer.skills.forEach((developerSkill) => {
        if (developerSkill.skill) {
          skillMap.set(
            developerSkill.skill.id,
            developerSkill.skill.name
          );
        }
      });
    });

    return Array.from(skillMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [developers]);

  // ============================================================
  // FILTER DEVELOPERS
  // ============================================================

  const filteredDevelopers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return developers.filter((developer) => {
      const developerSkills = developer.skills
        .map((item) => item.skill?.name || "")
        .join(" ")
        .toLowerCase();

      const searchableText = [
        developer.full_name || "",
        developer.username || "",
        developer.country || "",
        developer.city || "",
        developer.bio || "",
        developerSkills,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesSkill =
        selectedSkill === "all" ||
        developer.skills.some(
          (item) => item.skill?.id === selectedSkill
        );

      return matchesSearch && matchesSkill;
      })
      .sort((a, b) => (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1));
  }, [developers, search, selectedSkill]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <div>
        <p className="text-sm font-semibold text-blue-600">
          AFRIDEV NETWORK
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Discover Developers
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Find African developers with complementary skills,
          inspect their verified evidence, and discover people
          you can build with.
        </p>
      </div>

      {/* ======================================================
          SEARCH
      ======================================================= */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search developers, skills, countries..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={selectedSkill}
            onChange={(event) =>
              setSelectedSkill(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:w-64"
          >
            <option value="all">All skills</option>

            {skillOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Users size={14} />

          {filteredDevelopers.length} developer
          {filteredDevelopers.length === 1 ? "" : "s"} found
        </div>
      </div>

      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          LOADING
      ======================================================= */}

      {!loading && !error && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-blue-950">
                  AI-powered exchange matching
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  AfriDev AI
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Compatibility is calculated from complementary offers and needs, while AI explains the most useful exchange opportunities.
              </p>
              {aiLoading ? (
                <p className="mt-2 text-[11px] font-medium text-blue-700">
                  Finding your best exchange opportunities...
                </p>
              ) : aiError ? (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  AI explanations are temporarily unavailable. Standard matching is still active.
                </p>
              ) : (
                <p className="mt-2 text-[11px] font-medium text-emerald-700">
                  AI matching is active.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : filteredDevelopers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            No developers found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Try another search or select a different skill.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDevelopers.map((developer) => (
            <DeveloperCardView
              key={developer.id}
              developer={developer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEVELOPER CARD
// ============================================================

function DeveloperCardView({
  developer,
}: {
  developer: DeveloperCard;
}) {
  const initials =
    developer.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      {/* ======================================================
          PROFILE
      ======================================================= */}

      <div className="flex items-start gap-4">
        {developer.avatar_url ? (
          <img
            src={developer.avatar_url}
            alt={developer.full_name || "Developer"}
            className="h-14 w-14 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="truncate font-bold text-slate-950">
            {developer.full_name || "AfriDev Developer"}
          </h2>

          {developer.username && (
            <p className="truncate text-xs text-slate-500">
              @{developer.username}
            </p>
          )}

          {(developer.city || developer.country) && (
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={13} />

              {[developer.city, developer.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* ======================================================
          BIO
      ======================================================= */}

      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
        {developer.bio ||
          "This developer has not added a bio yet."}
      </p>

      {/* ======================================================
          SKILLS
      ======================================================= */}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Skills
        </p>

        {developer.skills.length === 0 ? (
          <p className="text-sm text-slate-500">
            No skills added yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {developer.skills.slice(0, 5).map((item) => {
              const isVerified =
                developer.verifiedEvidenceCount > 0 &&
                item.skill?.id;

              return (
                <span
                  key={`${item.developer_id}-${item.skill?.id ?? item.skill?.name ?? "skill"}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.skill?.name || "Skill"}

                  {isVerified && (
                    <CheckCircle2 size={12} />
                  )}
                </span>
              );
            })}

            {developer.skills.length > 5 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                +{developer.skills.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ======================================================
          COMPATIBILITY
      ======================================================= */}

      {developer.compatibilityScore !== null && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Compatibility</p>
              <p className="mt-1 text-xs text-blue-800">Based on complementary offers and needs</p>
            </div>
            <div className="text-2xl font-bold text-blue-700">{developer.compatibilityScore}%</div>
          </div>

          {developer.matchingNeedSkills.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-blue-900">They can help with your needs</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {developer.matchingNeedSkills.map((skill) => (
                  <span key={`need-${skill}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-blue-700">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {developer.matchingOfferSkills.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-blue-900">They need what you offer</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {developer.matchingOfferSkills.map((skill) => (
                  <span key={`offer-${skill}`} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          AI EXCHANGE INSIGHT
      ======================================================= */}

      {developer.aiExplanation && (
        <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-violet-700 shadow-sm">
              <ShieldCheck size={15} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
              AI exchange insight
            </p>
          </div>

          <p className="mt-2 text-xs leading-5 text-violet-950">
            {developer.aiExplanation}
          </p>

          {developer.aiExchangeValue && (
            <div className="mt-3 rounded-lg border border-white bg-white/80 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                Exchange value
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-700">
                {developer.aiExchangeValue}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          TRUST SIGNALS
      ======================================================= */}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <TrustSignal
          icon={<ShieldCheck size={15} />}
          label="Verified evidence"
          value={developer.verifiedEvidenceCount}
          positive={developer.verifiedEvidenceCount > 0}
        />

        <TrustSignal
          icon={<Users size={15} />}
          label="Completed exchanges"
          value={developer.completedExchanges}
          positive={developer.completedExchanges > 0}
        />

        <TrustSignal
          icon={<CheckCircle2 size={15} />}
          label="Verified contributions"
          value={developer.verifiedContributions}
          positive={developer.verifiedContributions > 0}
        />

        <TrustSignal
          icon={<UserRound size={15} />}
          label="Exchange activity"
          value={developer.participatedExchanges}
          positive={developer.participatedExchanges > 0}
        />
      </div>

      {/* ======================================================
          PENDING EVIDENCE
      ======================================================= */}

      {developer.pendingEvidenceCount > 0 && (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {developer.pendingEvidenceCount} evidence{" "}
          {developer.pendingEvidenceCount === 1
            ? "item is"
            : "items are"}{" "}
          pending community verification.
        </div>
      )}

      {/* ======================================================
          ACTIONS
      ======================================================= */}

      <div className="mt-auto flex gap-2 pt-5">
        <Link
          to={`/developer/${developer.id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ExternalLink size={16} />
          View Passport
        </Link>

        <Link
          to="/exchange"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          {developer.compatibilityScore !== null ? "Propose Exchange" : "Exchange"}
        </Link>
      </div>
    </article>
  );
}

// ============================================================
// TRUST SIGNAL
// ============================================================

function TrustSignal({
  icon,
  label,
  value,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  positive: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        positive
          ? "border-emerald-100 bg-emerald-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          positive ? "text-emerald-700" : "text-slate-500"
        }`}
      >
        {icon}

        <span className="text-xs font-semibold">
          {value}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default Discover;