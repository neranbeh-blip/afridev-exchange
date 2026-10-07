import {
  Award,
  BriefcaseBusiness,
  Activity,
  Users,
  CheckCircle2,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import AddSkillModal from "../../components/passport/AddSkillModal";
import AddEvidenceModal from "../../components/passport/AddEvidenceModal";

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
  created_at: string;
  skill: {
    id: string;
    name: string;
  } | null;
};

const AFRICAN_COUNTRIES = [
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Democratic Republic of the Congo",
  "Republic of the Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "The Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Príncipe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
] as const;

type PassportStats = {
  projects: number;
  exchanges: number;
  participatedExchanges: number;
  verifiedContributions: number;
  verifiedEvidence: number;
};

function Passport() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<DeveloperSkill[]>([]);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);

  const [stats, setStats] = useState<PassportStats>({
    projects: 0,
    exchanges: 0,
    participatedExchanges: 0,
    verifiedContributions: 0,
    verifiedEvidence: 0,
  });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAddEvidenceModal, setShowAddEvidenceModal] =
    useState(false);

  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    loadPassport();
  }, []);

  async function loadPassport() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // PROFILE
      // --------------------------------------------------

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username, country, city, bio, avatar_url"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error("Profile loading error:", profileError);
      }

      if (profileData) {
        setProfile(profileData);
        setBio(profileData.bio || "");
        setCity(profileData.city || "");
        setCountry(profileData.country || "");
      }

      // --------------------------------------------------
      // SKILLS
      // --------------------------------------------------

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
          .eq("developer_id", user.id);

      if (skillsError) {
        console.error("Skills loading error:", skillsError);
      }

      if (skillsData) {
        setSkills(skillsData as unknown as DeveloperSkill[]);
      }

      // --------------------------------------------------
      // SKILL EVIDENCE
      // --------------------------------------------------

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
            created_at,
            skill:skills (
              id,
              name
            )
          `
          )
          .eq("developer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (evidenceError) {
        console.error(
          "Evidence loading error:",
          evidenceError
        );
      }

      if (evidenceData) {
        setEvidence(
          evidenceData as unknown as SkillEvidence[]
        );
      }

      // --------------------------------------------------
      // EXPERIENCE / ACTIVITY
      // --------------------------------------------------

      const { count: projectCount } = await supabase
        .from("projects")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("owner_id", user.id);

      // The exchange_participants table uses developer_id.
      const { data: participantRows, error: participantError } =
        await supabase
          .from("exchange_participants")
          .select("exchange_id")
          .eq("developer_id", user.id);

      if (participantError) {
        console.error(
          "Exchange participation loading error:",
          participantError
        );
      }

      const exchangeIds = Array.from(
        new Set(
          participantRows?.map((row) => row.exchange_id).filter(Boolean) || []
        )
      );

      let completedExchanges = 0;

      if (exchangeIds.length > 0) {
        const { count, error: exchangeError } = await supabase
          .from("exchanges")
          .select("id", {
            count: "exact",
            head: true,
          })
          .in("id", exchangeIds)
          .eq("status", "completed");

        if (exchangeError) {
          console.error(
            "Completed exchanges loading error:",
            exchangeError
          );
        }

        completedExchanges = count || 0;
      }

      // --------------------------------------------------
      // VERIFIED CONTRIBUTIONS
      // --------------------------------------------------

      const { count: verifiedCount, error: contributionError } =
        await supabase
          .from("contributions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("contributor_id", user.id)
          .eq("status", "verified");

      if (contributionError) {
        console.error(
          "Verified contributions loading error:",
          contributionError
        );
      }

      // --------------------------------------------------
      // VERIFIED SKILL EVIDENCE
      // --------------------------------------------------

      const verifiedEvidenceCount = (evidenceData || []).filter(
        (item) => item.verified
      ).length;

      setStats({
        projects: projectCount || 0,
        exchanges: completedExchanges,
        participatedExchanges: exchangeIds.length,
        verifiedContributions: verifiedCount || 0,
        verifiedEvidence: verifiedEvidenceCount,
      });
    } catch (error) {
      console.error("Passport loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
      })
      .eq("id", profile.id);

    if (error) {
      console.error("Profile update error:", error);
      alert(error.message);
      return;
    }

    setProfile({
      ...profile,
      bio: bio.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
    });

    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading your Developer Passport...
          </p>
        </div>
      </div>
    );
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------ */}

      <div className="mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Developer Identity
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Developer Passport
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Your verified developer identity, capabilities,
              experience, and contribution history on AfriDev
              Exchange.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil size={17} />

            {editing ? "Cancel editing" : "Edit Passport"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* PROFILE */}
      {/* ------------------------------------------------ */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Developer"}
                  className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-md">
                  {initials}
                </div>
              )}

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-950">
                    {profile?.full_name || "Developer"}
                  </h2>

                  <CheckCircle2
                    size={20}
                    className="text-blue-600"
                  />
                </div>

                {profile?.username && (
                  <p className="text-sm text-slate-500">
                    @{profile.username}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  {(profile?.city || profile?.country) && (
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

            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <ShieldCheck size={18} />
                AfriDev Passport
              </div>

              <p className="mt-1 text-xs text-blue-600">
                Identity & contribution record
              </p>
            </div>
          </div>

          {/* Edit Profile */}
          {editing ? (
            <div className="mt-8 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Bio
                </label>

                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  placeholder="Tell other developers what you build and what you are interested in..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  City
                </label>

                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="e.g. Yaoundé"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Country
                </label>

                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select your country</option>

                  {AFRICAN_COUNTRIES.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Select the African country you identify with professionally.
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Save changes
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm leading-7 text-slate-600">
                {profile?.bio ||
                  "Add a short introduction about yourself, your technical interests, and the kind of collaboration you are looking for."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* CAPABILITY / TRUST */}
      {/* ------------------------------------------------ */}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Star size={21} />
            </div>

            <div>
              <h3 className="font-bold text-slate-950">
                Capability
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                What you can do, based on skills, evidence,
                projects, experience, and professional signals.
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
              <h3 className="font-bold text-slate-950">
                AfriDev Trust & Experience
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                How you have performed through exchanges,
                collaborations, verified contributions, and
                feedback.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <SignalCard
          icon={<Star size={20} />}
          label="Declared skills"
          value={skills.length}
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

      {/* ------------------------------------------------ */}
      {/* SKILLS */}
      {/* ------------------------------------------------ */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Skills & Capabilities
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your technical capabilities and declared
              proficiency.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddSkillModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <Plus size={17} />
            Add Skill
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <CodeIcon />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No skills added yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Add your first skills so AfriDev can understand
              your capabilities and find complementary developers.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((developerSkill) => (
              <div
                key={developerSkill.id}
                className="rounded-xl border border-slate-200 p-4"
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

                  <CheckCircle2
                    size={18}
                    className="text-emerald-600"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ */}
      {/* SKILL EVIDENCE */}
      {/* ------------------------------------------------ */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Skill Evidence
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Evidence helps other developers understand what you
              can actually build.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddEvidenceModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Plus size={17} />
            Add Evidence
          </button>
        </div>

        {evidence.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Link2 size={21} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No evidence added yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Add GitHub repositories, portfolio projects,
              certificates, or other evidence that supports your
              skills.
            </p>

            <button
              type="button"
              onClick={() => setShowAddEvidenceModal(true)}
              className="mt-4 font-semibold text-blue-700 hover:text-blue-800"
            >
              Add your first evidence
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <EvidenceIcon
                        type={item.evidence_type}
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                          {item.title}
                        </h3>

                        {item.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pending verification
                          </span>
                        )}
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
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                      View evidence
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ */}
      {/* EXPERIENCE */}
      {/* ------------------------------------------------ */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              AfriDev Experience
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              A record of what you have actually done on AfriDev Exchange.
              These signals are separate from your technical capability.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={15} />
            Based on platform activity
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExperienceCard
            icon={<BriefcaseBusiness size={21} />}
            label="Projects"
            value={stats.projects}
            description="Projects created"
          />

          <ExperienceCard
            icon={<NetworkIcon />}
            label="Completed Exchanges"
            value={stats.exchanges}
            description="Successfully completed"
          />

          <ExperienceCard
            icon={<CheckCircle2 size={21} />}
            label="Verified Contributions"
            value={stats.verifiedContributions}
            description="Work validated by a partner"
          />

          <ExperienceCard
            icon={<Activity size={21} />}
            label="Exchange Activity"
            value={stats.participatedExchanges}
            description="Exchanges participated in"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-950">
                  Verified work
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {stats.verifiedContributions > 0
                    ? `${stats.verifiedContributions} contribution${
                        stats.verifiedContributions === 1 ? "" : "s"
                      } have been verified by exchange partners.`
                    : "Verified contributions will appear here as your work is reviewed."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Link2 size={20} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-950">
                  Verified evidence
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {stats.verifiedEvidence > 0
                    ? `${stats.verifiedEvidence} evidence item${
                        stats.verifiedEvidence === 1 ? "" : "s"
                      } currently marked as verified.`
                    : "Evidence can strengthen your capability profile as it is verified."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
              <Users size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-950">
                Trust grows from real collaboration
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                AfriDev does not reduce your professional identity to one
                arbitrary score. Your capabilities come from skills and
                evidence, while your AfriDev experience comes from completed
                exchanges, participation, and verified work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* FOOTER */}
      {/* ------------------------------------------------ */}

      <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              Your Passport grows with your work
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              As you exchange skills, collaborate on projects, and
              complete verified contributions, your AfriDev
              experience becomes part of your developer history.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* MODALS */}
      {/* ------------------------------------------------ */}

      {showAddSkillModal && (
        <AddSkillModal
          onClose={() => setShowAddSkillModal(false)}
          onSaved={loadPassport}
        />
      )}

      {showAddEvidenceModal && (
        <AddEvidenceModal
          onClose={() => setShowAddEvidenceModal(false)}
          onSaved={loadPassport}
        />
      )}
    </div>
  );
}

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
    default:
      return <CodeIcon />;
  }
}

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

function SignalCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </div>

        <span className="text-sm font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold text-slate-950">{value}</p>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ExperienceCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
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

function CodeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M9 6h3a6 6 0 0 1 6 6v3" />
      <path d="M15 18h-3a6 6 0 0 1-6-6V9" />
    </svg>
  );
}

export default Passport;