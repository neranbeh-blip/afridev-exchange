import {
  Award,
  BriefcaseBusiness,
  Activity,
  Users,
  CheckCircle2,
  BadgeCheck,
  Camera,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import AddSkillModal from "../../components/passport/AddSkillModal";
import AddEvidenceModal from "../../components/passport/AddEvidenceModal";

import DeepLText from "../../components/layout/DeepLText";
import { useDeepLTranslation } from "../../lib/useDeepLTranslation";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
};

type NetworkType = "followers" | "following";

type NetworkProfile = Profile;

type PassportProject = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  repository_url: string | null;
  demo_url: string | null;
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
  const navigate = useNavigate();

  // Translate input placeholders and the native country select labels without
  // placing wrapper elements inside <option>, which only supports text labels.
  const { text: bioPlaceholder } = useDeepLTranslation(
    "Tell other developers what you build and what you are interested in..."
  );
  const { text: cityPlaceholder } = useDeepLTranslation("e.g. Yaoundé");
  const { text: countryPlaceholder } = useDeepLTranslation("Select your country");
  const { text: countryOptionsText } = useDeepLTranslation(
    AFRICAN_COUNTRIES.join("\n")
  );
  const translatedCountryOptions = countryOptionsText.split(/\r?\n/);
  const countryOptionsAligned =
    translatedCountryOptions.length === AFRICAN_COUNTRIES.length;
  const { text: changePictureLabel } = useDeepLTranslation(
    "Change profile picture"
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<DeveloperSkill[]>([]);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);
  const [projects, setProjects] = useState<PassportProject[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [networkOpen, setNetworkOpen] = useState<NetworkType | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkProfiles, setNetworkProfiles] = useState<NetworkProfile[]>([]);

  const [stats, setStats] = useState<PassportStats>({
    projects: 0,
    exchanges: 0,
    participatedExchanges: 0,
    verifiedContributions: 0,
    verifiedEvidence: 0,
  });

  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
            "id, full_name, username, country, city, bio, avatar_url, github_url, linkedin_url, website_url"
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

      // Load the developer's social network counts for the Passport.
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from("developer_follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", user.id),
        supabase
          .from("developer_follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", user.id),
      ]);

      if (followersResult.error) {
        console.warn("Could not load follower count:", followersResult.error.message);
      }
      if (followingResult.error) {
        console.warn("Could not load following count:", followingResult.error.message);
      }
      setFollowerCount(followersResult.count ?? 0);
      setFollowingCount(followingResult.count ?? 0);

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

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, title, description, status, repository_url, demo_url")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Projects loading error:", projectsError);
      }

      const loadedProjects = (projectsData ?? []) as PassportProject[];
      setProjects(loadedProjects);

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
        projects: loadedProjects.length,
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

  async function changeProfilePicture(file: File | undefined) {
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image smaller than 5 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${profile.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${data.publicUrl}${data.publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile((current) =>
        current ? { ...current, avatar_url: avatarUrl } : current,
      );
      alert("Profile picture updated successfully.");
    } catch (error) {
      console.error("Profile picture upload error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not update the profile picture.",
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  async function loadNetwork(type: NetworkType) {
    const ownerId = profile?.id;
    if (!ownerId) return;

    setNetworkOpen(type);
    setNetworkLoading(true);
    setNetworkProfiles([]);

    try {
      // Query each relationship direction separately so TypeScript can
      // correctly infer the selected column in each branch.
      let ids: string[];

      if (type === "followers") {
        const { data, error } = await supabase
          .from("developer_follows")
          .select("follower_id")
          .eq("following_id", ownerId);

        if (error) throw error;

        ids = (data ?? [])
          .map((row) => row.follower_id)
          .filter((id): id is string => typeof id === "string" && Boolean(id));
      } else {
        const { data, error } = await supabase
          .from("developer_follows")
          .select("following_id")
          .eq("follower_id", ownerId);

        if (error) throw error;

        ids = (data ?? [])
          .map((row) => row.following_id)
          .filter((id): id is string => typeof id === "string" && Boolean(id));
      }

      if (ids.length === 0) {
        setNetworkProfiles([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, country, city, bio, avatar_url, github_url, linkedin_url, website_url")
        .in("id", ids);

      if (profilesError) throw profilesError;

      const loadedProfiles = (profilesData ?? []) as Profile[];
      // Preserve the order from developer_follows instead of the profiles query.
      setNetworkProfiles(
        ids
          .map((id) => loadedProfiles.find((person) => person.id === id))
          .filter((person): person is Profile => Boolean(person)),
      );
    } catch (error) {
      console.error("Could not load Passport network:", error);
      setNetworkProfiles([]);
    } finally {
      setNetworkLoading(false);
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
            <DeepLText text={"Loading your Developer Passport..."} />
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
              <DeepLText text={"Developer Identity"} />
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              <DeepLText text={"Developer Passport"} />
            </h1>

          </div>

          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil size={17} />

            <DeepLText text={editing ? "Cancel editing" : "Edit Passport"} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* PROFILE */}
      {/* ------------------------------------------------ */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />

        <div className="px-4 pb-6 sm:px-6">
          {/* Keep the identity row horizontal even on phone-sized screens so the name and verification badge stay visible beside the avatar. */}
          <div className="-mt-12 grid grid-cols-[6rem_minmax(0,1fr)] items-end gap-4 min-[480px]:grid-cols-[8rem_minmax(0,1fr)] sm:gap-5">
            <div className="relative h-24 w-24 shrink-0">
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

              <label
                title={changePictureLabel}
                aria-label={changePictureLabel}
                className={`absolute -bottom-2 -right-2 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-blue-700 text-white shadow-md transition hover:bg-blue-800 ${avatarUploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <Camera size={16} aria-hidden="true" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={avatarUploading}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    void changeProfilePicture(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {avatarUploading && (
                <span className="absolute -bottom-8 left-0 whitespace-nowrap text-[11px] font-medium text-blue-700">
                  <DeepLText text={"Uploading photo…"} />
                </span>
              )}
            </div>

            <div className="min-w-0 self-start pt-12">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-xl font-bold leading-tight text-slate-950 min-[480px]:text-2xl">
                  {profile?.full_name || "Developer"}
                </h2>
                <BadgeCheck
                  size={21}
                  aria-label="Verified developer"
                  className="shrink-0 text-blue-600"
                />
              </div>

              {profile?.username && (
                <p className="mt-0.5 break-words text-sm text-slate-500">
                  @{profile.username}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                {(profile?.city || profile?.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} className="shrink-0" />
                    {[profile.city, profile.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={15} className="shrink-0" />
                  <DeepLText text={"African Developer"} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void loadNetwork("followers")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50"
              aria-label={`View ${followerCount} followers`}
            >
              <span className="font-bold text-slate-900">{followerCount}</span>{" "}
              <span className="text-slate-500"><DeepLText text={"Followers"} /></span>
            </button>
            <button
              type="button"
              onClick={() => void loadNetwork("following")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50"
              aria-label={`View ${followingCount} followed developers`}
            >
              <span className="font-bold text-slate-900">{followingCount}</span>{" "}
              <span className="text-slate-500"><DeepLText text={"Following"} /></span>
            </button>
          </div>

          {/* Edit Profile */}
          {editing ? (
            <div className="mt-8 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  <DeepLText text={"Bio"} />
                </label>

                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  placeholder={bioPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  <DeepLText text={"City"} />
                </label>

                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={cityPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  <DeepLText text={"Country"} />
                </label>

                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">{countryPlaceholder}</option>

                  {AFRICAN_COUNTRIES.map((countryName, index) => (
                    <option key={countryName} value={countryName}>
                      {countryOptionsAligned
                        ? translatedCountryOptions[index]
                        : countryName}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  <DeepLText text={"Select the African country you identify with professionally."} />
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <DeepLText text={"Save changes"} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm leading-7 text-slate-600">
                {profile?.bio || <DeepLText text={"Add a short introduction about yourself, your technical interests, and the kind of collaboration you are looking for."} />}
              </p>
            </div>
          )}

          {(profile?.github_url || profile?.website_url || profile?.linkedin_url) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"GitHub"} /> <ExternalLink size={14} />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"Website"} /> <ExternalLink size={14} />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <DeepLText text={"LinkedIn"} /> <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

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
              <DeepLText text={"Skills & Capabilities"} />
            </h2>

          </div>

          <button
            type="button"
            onClick={() => setShowAddSkillModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <Plus size={17} />
            <DeepLText text={"Add Skill"} />
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <CodeIcon />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              <DeepLText text={"No skills added yet"} />
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              <DeepLText text={"Add your first skills so AfriDev can understand your capabilities and find complementary developers."} />
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
                      <DeepLText text={"Proficiency"} />
                    </span>

                    <span className="font-semibold capitalize text-blue-700">
                      <DeepLText text={developerSkill.proficiency} />
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
              <DeepLText text={"Skill Evidence"} />
            </h2>

          </div>

          <button
            type="button"
            onClick={() => setShowAddEvidenceModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Plus size={17} />
            <DeepLText text={"Add Evidence"} />
          </button>
        </div>

        {evidence.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Link2 size={21} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              <DeepLText text={"No evidence added yet"} />
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              <DeepLText text={"Add GitHub repositories, portfolio projects, certificates, or other evidence that supports your skills."} />
            </p>

            <button
              type="button"
              onClick={() => setShowAddEvidenceModal(true)}
              className="mt-4 font-semibold text-blue-700 hover:text-blue-800"
            >
              <DeepLText text={"Add your first evidence"} />
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
                            <DeepLText text={"Verified"} />
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <DeepLText text={"Pending verification"} />
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600">
                        <DeepLText text={formatEvidenceType(
                          item.evidence_type
                        )} />
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
                      <DeepLText text={"View evidence"} />
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
              <DeepLText text={"AfriDev Experience"} />
            </h2>

          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={15} />
            <DeepLText text={"Based on platform activity"} />
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

      </section>


      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            <DeepLText text={"Build history"} />
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950"><DeepLText text={"Projects"} /></h2>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <BriefcaseBusiness size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500"><DeepLText text={"No public projects yet."} /></p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-950">{project.title}</h3>
                    {project.status && (
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-500">
                        <DeepLText text={project.status.replace("_", " ")} />
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => navigate(`/projects/${project.id}`)} className="rounded-lg bg-slate-100 p-2 transition hover:bg-blue-50 hover:text-blue-700" aria-label="View project">
                    <ExternalLink size={16} />
                  </button>
                </div>
                {project.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{project.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.repository_url && (
                    <a href={project.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
                      <ExternalLink size={13} /> <DeepLText text={"Repository"} />
                    </a>
                  )}
                  {project.demo_url && (
                    <a href={project.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
                      <Globe2 size={13} /> <DeepLText text={"Live Demo"} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ */}
      {/* FOOTER */}
      {/* ------------------------------------------------ */}

      {/* ------------------------------------------------ */}
      {/* MODALS */}
      {/* ------------------------------------------------ */}

      {networkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setNetworkOpen(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="passport-network-title"
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="passport-network-title" className="text-xl font-bold text-slate-950">
                  <DeepLText text={networkOpen === "followers" ? "Followers" : "Following"} />
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {networkProfiles.length} <DeepLText text={"developer"} />{networkProfiles.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNetworkOpen(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
                aria-label="Close followers and following"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {networkLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  <p className="text-sm text-slate-500"><DeepLText text={"Loading developers..."} /></p>
                </div>
              ) : networkProfiles.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-3 text-slate-400" size={36} />
                  <p className="text-sm text-slate-500"><DeepLText text={"No developers here yet."} /></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {networkProfiles.map((person) => {
                    const name = person.full_name || person.username || "Developer";
                    const initials = name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("") || "DV";

                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => {
                          setNetworkOpen(null);
                          navigate(`/developer/${person.id}`);
                        }}
                        className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                      >
                        {person.avatar_url ? (
                          <img src={person.avatar_url} alt={name} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-100 font-bold text-blue-700">
                            {initials}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block break-words font-semibold text-slate-900">{name}</span>
                          {person.username && <span className="block break-words text-xs text-slate-500">@{person.username}</span>}
                          {(person.city || person.country) && (
                            <span className="mt-0.5 block break-words text-xs text-slate-500">
                              {[person.city, person.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

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
          <DeepLText text={label} />
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold text-slate-950">{value}</p>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        <DeepLText text={description} />
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
          <DeepLText text={label} />
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        <DeepLText text={description} />
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