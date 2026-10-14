import {
  AtSign,
  Check,
  Code2,
  ExternalLink,
  Globe2,
  KeyRound,
  LogOut,
  QrCode,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DeepLText from "../../components/layout/DeepLText";

type Profile = {
  id: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  years_experience: number | null;
  availability: "available" | "busy" | "unavailable" | null;
};

type Tab = "profile" | "account";

const africanCountries = [
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
  "Congo",
  "Democratic Republic of the Congo",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Ivory Coast",
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
  "Sao Tome and Principe",
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
];


function FieldLabel({
  children,
  optional = false,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-bold text-slate-800">
      {children}
      {optional && (
        <span className="ml-1 font-normal text-slate-400">(optional)</span>
      )}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
}

function Settings() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("profile");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("Cameroon");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("Africa/Douala");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [availability, setAvailability] = useState<
    "available" | "busy" | "unavailable"
  >("available");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaRemoving, setMfaRemoving] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function loadMfa() {
    setMfaLoading(true);

    try {
      const { data, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const verifiedTotp =
        data.totp?.find((factor) => factor.status === "verified") ?? null;

      setMfaFactorId(verifiedTotp?.id ?? null);
    } catch (err) {
      console.error("MFA loading error:", err);
    } finally {
      setMfaLoading(false);
    }
  }

  async function beginMfaEnrollment() {
    setMfaEnrolling(true);
    setError("");
    setSuccess("");
    setMfaQrCode("");
    setMfaSecret("");
    setMfaChallengeId(null);
    setMfaCode("");

    try {
      const { data, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "AfriDev Authenticator",
        });

      if (enrollError) throw enrollError;

      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);

      showSuccess(
        "Authenticator setup started. Scan the QR code, then enter the 6-digit code."
      );
    } catch (err) {
      console.error("MFA enrollment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start two-factor authentication."
      );
    } finally {
      setMfaEnrolling(false);
    }
  }

  async function verifyMfaEnrollment(event: React.FormEvent) {
    event.preventDefault();

    if (!mfaFactorId || !mfaCode.trim()) {
      setError("Enter the 6-digit authenticator code.");
      return;
    }

    setMfaVerifying(true);
    setError("");
    setSuccess("");

    try {
      let challengeId = mfaChallengeId;

      if (!challengeId) {
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({
            factorId: mfaFactorId,
          });

        if (challengeError) throw challengeError;

        challengeId = challengeData.id;
        setMfaChallengeId(challengeId);
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId,
        code: mfaCode.trim(),
      });

      if (verifyError) throw verifyError;

      setMfaQrCode("");
      setMfaSecret("");
      setMfaChallengeId(null);
      setMfaCode("");

      await loadMfa();

      showSuccess("Two-factor authentication is now enabled.");
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "The authenticator code could not be verified."
      );
    } finally {
      setMfaVerifying(false);
    }
  }

  async function disableMfa() {
    if (!mfaFactorId) return;

    const confirmed = window.confirm(
      "Disable two-factor authentication for your AfriDev account?"
    );

    if (!confirmed) return;

    setMfaRemoving(true);
    setError("");
    setSuccess("");

    try {
      const { error: unenrollError } =
        await supabase.auth.mfa.unenroll({
          factorId: mfaFactorId,
        });

      if (unenrollError) throw unenrollError;

      setMfaFactorId(null);
      setMfaQrCode("");
      setMfaSecret("");
      setMfaChallengeId(null);
      setMfaCode("");

      showSuccess("Two-factor authentication has been disabled.");
    } catch (err) {
      console.error("MFA disable error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to disable two-factor authentication."
      );
    } finally {
      setMfaRemoving(false);
    }
  }

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, bio, country, city, timezone, github_url, linkedin_url, website_url, years_experience, availability"
        )
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const loaded = data as Profile;

      setFullName(loaded.full_name ?? "");
      setUsername(loaded.username ?? "");
      setBio(loaded.bio ?? "");
      setCountry(loaded.country ?? "Cameroon");
      setCity(loaded.city ?? "");
      setTimezone(loaded.timezone ?? "Africa/Douala");
      setGithubUrl(loaded.github_url ?? "");
      setLinkedinUrl(loaded.linkedin_url ?? "");
      setWebsiteUrl(loaded.website_url ?? "");
      setYearsExperience(String(loaded.years_experience ?? 0));

      setAvailability(loaded.availability ?? "available");
    } catch (err) {
      console.error("Settings loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    void loadMfa();
  }, []);

  function showSuccess(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  }


  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You are not authenticated.");

      const cleanUsername = username.trim() || null;
      const cleanFullName = fullName.trim();

      if (!cleanFullName) {
        throw new Error("Full name is required.");
      }

      const experience = Number(yearsExperience);

      if (!Number.isFinite(experience) || experience < 0) {
        throw new Error("Years of experience must be a valid positive number.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: cleanFullName,
          username: cleanUsername,
          bio: bio.trim() || null,
          country: country || "Cameroon",
          city: city.trim() || null,
          timezone: timezone || "Africa/Douala",
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          years_experience: Math.floor(experience),
          availability,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select(
          "id, username, full_name, avatar_url, bio, country, city, timezone, github_url, linkedin_url, website_url, years_experience, availability"
        )
        .single();

      if (updateError) throw updateError;

      showSuccess("Profile settings saved successfully.");
    } catch (err) {
      console.error("Profile settings save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile settings."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setChangingPassword(true);
    setError("");
    setSuccess("");

    try {
      if (newPassword.length < 8) {
        throw new Error(
          "Your new password must contain at least 8 characters."
        );
      }

      if (newPassword !== confirmPassword) {
        throw new Error("The password confirmation does not match.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Your password has been updated.");
    } catch (err) {
      console.error("Password update error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("Sign out error:", signOutError);
      setError(signOutError.message);
      setSigningOut(false);
      return;
    }

    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            <DeepLText text={"Account control"} />
          </p>

          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            <DeepLText text={"Settings"} />
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            <DeepLText text={"Manage your developer identity, language preference, account\n            security and profile information used across AfriDev Exchange."} />
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <Check size={17} />
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                tab === "profile"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <UserRound size={18} />
              <DeepLText text={"Profile & Identity"} />
            </button>

            <button
              type="button"
              onClick={() => setTab("account")}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                tab === "account"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck size={18} />
              <DeepLText text={"Account & Security"} />
            </button>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => navigate("/passport")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              >
                <ExternalLink size={17} />
                <DeepLText text={"View Developer Passport"} />
              </button>
            </div>
          </aside>

          <main className="min-w-0">
            {tab === "profile" ? (
              <form onSubmit={saveProfile} className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <UserRound size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Developer identity"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"This information appears across your Passport and\n                          collaboration surfaces."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <FieldLabel><DeepLText text={"Full name"} /></FieldLabel>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className={inputClassName()}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Username"} /></FieldLabel>

                      <div className="relative">
                        <AtSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          className={`${inputClassName()} pl-9`}
                          placeholder="yourusername"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel optional><DeepLText text={"Bio"} /></FieldLabel>

                      <textarea
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        rows={4}
                        maxLength={500}
                        className={`${inputClassName()} resize-y`}
                        placeholder="Tell the African developer community what you build, what interests you and how you want to collaborate."
                      />

                      <p className="mt-1 text-right text-[11px] text-slate-400">
                        {bio.length}/500
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Globe2 size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Location"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Tell other developers where you are based."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <FieldLabel><DeepLText text={"Country"} /></FieldLabel>

                      <select
                        value={country}
                        onChange={(event) => setCountry(event.target.value)}
                        className={inputClassName()}
                      >
                        {africanCountries.map((item) => (
                          <option key={item} value={item}>
                            <DeepLText text={item} />
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel optional><DeepLText text={"City"} /></FieldLabel>

                      <input
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        className={inputClassName()}
                        placeholder="e.g. Yaoundé"
                      />
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Timezone"} /></FieldLabel>

                      <select
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        className={inputClassName()}
                      >
                        <option value="Africa/Douala">Africa/Douala</option>
                        <option value="Africa/Lagos">Africa/Lagos</option>
                        <option value="Africa/Accra">Africa/Accra</option>
                        <option value="Africa/Nairobi">Africa/Nairobi</option>
                        <option value="Africa/Johannesburg">
                          Africa/Johannesburg
                        </option>
                        <option value="Africa/Cairo">Africa/Cairo</option>
                        <option value="Africa/Casablanca">
                          Africa/Casablanca
                        </option>
                        <option value="Africa/Dakar">Africa/Dakar</option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Availability"} /></FieldLabel>

                      <select
                        value={availability}
                        onChange={(event) =>
                          setAvailability(
                            event.target.value as
                              | "available"
                              | "busy"
                              | "unavailable"
                          )
                        }
                        className={inputClassName()}
                      >
                        <option value="available">
                          <DeepLText text={"Available for collaboration"} />
                        </option>

                        <option value="busy"><DeepLText text={"Busy"} /></option>

                        <option value="unavailable">
                          <DeepLText text={"Not currently available"} />
                        </option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Years of experience"} /></FieldLabel>

                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={yearsExperience}
                        onChange={(event) =>
                          setYearsExperience(event.target.value)
                        }
                        className={inputClassName()}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Code2 size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Professional links"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Add the profiles and portfolio links you want other\n                          developers to discover."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <FieldLabel optional><DeepLText text={"GitHub"} /></FieldLabel>

                      <div className="relative">
                        <Code2
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(event) => setGithubUrl(event.target.value)}
                          className={`${inputClassName()} pl-9`}
                          placeholder="https://github.com/username"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel optional><DeepLText text={"LinkedIn"} /></FieldLabel>

                      <div className="relative">
                        <ExternalLink
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(event) =>
                            setLinkedinUrl(event.target.value)
                          }
                          className={`${inputClassName()} pl-9`}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel optional><DeepLText text={"Personal website"} /></FieldLabel>

                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(event) => setWebsiteUrl(event.target.value)}
                        className={inputClassName()}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void loadSettings()}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Reset changes
                  </button>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={17} />
                    {savingProfile
                      ? "Saving..."
                      : "Save profile settings"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <AtSign size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Account"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Your authenticated account information."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <FieldLabel><DeepLText text={"Email address"} /></FieldLabel>

                    <input
                      value={email}
                      readOnly
                      className={`${inputClassName()} bg-slate-50 text-slate-500`}
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      <DeepLText text={"Your login email is managed by Supabase Authentication."} />
                    </p>
                  </div>
                </section>

                <form
                  onSubmit={changePassword}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <KeyRound size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Change password"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Use at least 8 characters and keep your password\n                          unique to AfriDev."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <FieldLabel><DeepLText text={"New password"} /></FieldLabel>

                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        className={inputClassName()}
                        placeholder="At least 8 characters"
                      />
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Confirm new password"} /></FieldLabel>

                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        className={inputClassName()}
                        placeholder="Repeat your new password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <KeyRound size={17} />
                      {changingPassword
                        ? "Updating..."
                        : "Update password"}
                    </button>
                  </div>
                </form>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <ShieldCheck size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Two-factor authentication"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Add an authenticator app as an extra security layer\n                          when signing in to AfriDev Exchange."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    {mfaLoading ? (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                        <DeepLText text={"Checking your security status..."} />
                      </div>
                    ) : mfaFactorId && !mfaQrCode ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <p className="font-bold text-slate-950">
                              <DeepLText text={"Authenticator enabled"} />
                            </p>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            <DeepLText text={"Your account has an active verified TOTP\n                            authenticator factor."} />
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void disableMfa()}
                          disabled={mfaRemoving}
                          className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {mfaRemoving
                            ? "Disabling..."
                            : "Disable 2FA"}
                        </button>
                      </div>
                    ) : mfaQrCode ? (
                      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            <DeepLText text={"Scan with your app"} />
                          </p>

                          <img
                            src={mfaQrCode}
                            alt="AfriDev two-factor authentication QR code"
                            className="h-48 w-48 rounded-xl bg-white p-2"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <QrCode size={18} className="text-blue-600" />
                            <p className="font-bold text-slate-950">
                              Finish authenticator setup
                            </p>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            <DeepLText text={"Scan the QR code with Google Authenticator,\n                            Microsoft Authenticator, 1Password or another\n                            compatible TOTP app."} />
                          </p>

                          <p className="mt-4 text-xs font-bold text-slate-500">
                            Manual setup key
                          </p>

                          <code className="mt-1 block break-all rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                            {mfaSecret}
                          </code>

                          <form
                            onSubmit={verifyMfaEnrollment}
                            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                          >
                            <div className="flex-1">
                              <FieldLabel><DeepLText text={"6-digit verification code"} /></FieldLabel>
                              <input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={mfaCode}
                                onChange={(event) =>
                                  setMfaCode(
                                    event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                  )
                                }
                                className={inputClassName()}
                                placeholder="123456"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={
                                mfaVerifying || mfaCode.length !== 6
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ShieldCheck size={17} />
                              {mfaVerifying
                                ? "Verifying..."
                                : "Verify & enable"}
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">
                            <DeepLText text={"Protect your account with 2FA"} />
                          </p>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            <DeepLText text={"Use a time-based authenticator code in addition to\n                            your password. This helps protect your account if\n                            your password is ever exposed."} />
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void beginMfaEnrollment()}
                          disabled={mfaEnrolling}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <ShieldCheck size={17} />
                          {mfaEnrolling
                            ? "Preparing..."
                            : "Enable 2FA"}
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <AtSign size={19} />
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-950">
                          <DeepLText text={"Recovery & contact"} />
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          <DeepLText text={"Keep your account recovery information visible and\n                          up to date."} />
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <FieldLabel><DeepLText text={"Account email"} /></FieldLabel>
                      <input
                        value={email}
                        readOnly
                        className={`${inputClassName()} bg-slate-50 text-slate-500`}
                      />
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        <DeepLText text={"Email verification and password recovery are handled\n                        by Supabase Authentication."} />
                      </p>
                    </div>

                    <div>
                      <FieldLabel><DeepLText text={"Phone"} /></FieldLabel>
                      <input
                        value={phone || "No phone number linked"}
                        readOnly
                        className={`${inputClassName()} bg-slate-50 text-slate-500`}
                      />
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        <DeepLText text={"A phone number is shown here only when one is linked to\n                        your authenticated account."} />
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-extrabold text-slate-950">
                        <DeepLText text={"Sign out of AfriDev"} />
                      </h2>

                      <p className="mt-1 text-sm text-slate-600">
                        <DeepLText text={"End your current authenticated session on this device."} />
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      disabled={signingOut}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <LogOut size={17} />
                      {signingOut ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Settings;
