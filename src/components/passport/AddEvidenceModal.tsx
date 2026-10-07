import { useEffect, useState } from "react";
import {
  X,
  Link as LinkIcon,
  FileCheck2,
  Code2,
  BriefcaseBusiness,
  Award,
  FolderKanban,
  ClipboardCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type AddEvidenceModalProps = {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type Skill = {
  id: string;
  name: string;
  proficiency: string | null;
};

type DeveloperSkillRow = {
  id: string;
  proficiency?: string | null;
  skill:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type EvidenceType =
  | "github"
  | "portfolio"
  | "certificate"
  | "project"
  | "assessment";

const evidenceTypes: {
  value: EvidenceType;
  label: string;
  description: string;
  icon: typeof Code2;
}[] = [
  {
    value: "github",
    label: "GitHub",
    description: "Repository, commits or open-source work",
    icon: Code2,
  },
  {
    value: "portfolio",
    label: "Portfolio",
    description: "Personal website or portfolio project",
    icon: BriefcaseBusiness,
  },
  {
    value: "certificate",
    label: "Certificate",
    description: "Training or professional certification",
    icon: Award,
  },
  {
    value: "project",
    label: "Project",
    description: "A project demonstrating this skill",
    icon: FolderKanban,
  },
  {
    value: "assessment",
    label: "Assessment",
    description: "Test, challenge or technical assessment",
    icon: ClipboardCheck,
  },
];

function getSkillObject(
  skill:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null
): {
  id: string;
  name: string;
} | null {
  if (!skill) {
    return null;
  }

  if (Array.isArray(skill)) {
    return skill.length > 0 ? skill[0] : null;
  }

  return skill;
}

export default function AddEvidenceModal({
  onClose,
  onSaved,
}: AddEvidenceModalProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [saving, setSaving] = useState(false);

  const [skillId, setSkillId] = useState("");
  const [evidenceType, setEvidenceType] =
    useState<EvidenceType>("github");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadSkills = async () => {
      setLoadingSkills(true);
      setError("");

      try {
        const {
          data: {
            user,
          },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be logged in to add evidence.");
        }

        const { data, error: skillsError } = await supabase
          .from("developer_skills")
          .select(
            `
              id,
              proficiency,
              skill:skills (
                id,
                name
              )
            `
          )
          .eq("developer_id", user.id);

        if (skillsError) {
          throw skillsError;
        }

        const rows = (data ?? []) as DeveloperSkillRow[];

        const formattedSkills: Skill[] = [];

for (const row of rows) {
  const skill = getSkillObject(row.skill);

  if (!skill) {
    continue;
  }

  formattedSkills.push({
    id: skill.id,
    name: skill.name,
    proficiency: row.proficiency ?? null,
  });
}

setSkills(formattedSkills);

if (formattedSkills.length > 0) {
  setSkillId(formattedSkills[0].id);
}
      } catch (err) {
        console.error("Error loading skills:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your skills."
        );
      } finally {
        setLoadingSkills(false);
      }
    };

    void loadSkills();
  }, []);

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      return true;
    }

    try {
      const parsed = new URL(value.trim());

      return (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:"
      );
    } catch {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!skillId) {
      setError("Please select the skill this evidence supports.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for this evidence.");
      return;
    }

    if (!validateUrl(url)) {
      setError(
        "Please enter a valid URL beginning with http:// or https://."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to add evidence.");
      }

      const { error: insertError } = await supabase
        .from("skill_evidence")
        .insert({
          developer_id: user.id,
          skill_id: skillId,
          evidence_type: evidenceType,
          title: title.trim(),
          description: description.trim() || null,
          url: url.trim() || null,
          verified: false,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Evidence added successfully.");

      await onSaved();

      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      console.error("Error adding evidence:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add this evidence."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <FileCheck2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Add Evidence
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Prove your capability with real evidence.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to add evidence</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              {success}
            </div>
          )}

          {/* Skill */}
          <div>
            <label
              htmlFor="evidence-skill"
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Skill
            </label>

            {loadingSkills ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your skills...
              </div>
            ) : skills.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                You do not have any skills yet. Add a skill to your
                Developer Passport before adding evidence.
              </div>
            ) : (
              <select
                id="evidence-skill"
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:disabled:bg-slate-800/60"
              >
                <option value="">Select a skill</option>

                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                    {skill.proficiency
                      ? ` — ${skill.proficiency}`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Evidence type */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Evidence Type
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {evidenceTypes.map((type) => {
                const Icon = type.icon;
                const selected = evidenceType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    disabled={saving}
                    onClick={() => setEvidenceType(type.value)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-400 dark:bg-blue-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          selected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {type.label}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="evidence-title"
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Evidence Title
            </label>

            <input
              id="evidence-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={saving}
              placeholder="e.g. AfriDev Exchange Backend Project"
              maxLength={150}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:disabled:bg-slate-800/60"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="evidence-description"
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Description
              <span className="ml-2 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <textarea
              id="evidence-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              placeholder="Explain what this evidence demonstrates about your skill..."
              rows={4}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:disabled:bg-slate-800/60"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length}/1000
            </p>
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="evidence-url"
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Evidence URL
              <span className="ml-2 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="evidence-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={saving}
                placeholder="https://github.com/username/project"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:disabled:bg-slate-800/60"
              />
            </div>
          </div>

          {/* Verification note */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Evidence verification
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
                  New evidence is initially marked as unverified. Once
                  it has been reviewed and validated, it can contribute
                  to your verified capability on your Developer Passport.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingSkills || skills.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" />
                  Add Evidence
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}