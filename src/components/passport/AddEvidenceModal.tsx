import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  FileCheck2,
  FileUp,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useDeepLTranslation } from "../../lib/useDeepLTranslation";
import DeepLText from "../layout/DeepLText";

type AddEvidenceModalProps = {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type Skill = {
  id: string;
  name: string;
  proficiency: string | null;
  onPassport: boolean;
};

type EvidenceType =
  | "github"
  | "portfolio"
  | "certificate"
  | "project"
  | "assessment";

const evidenceTypes: { value: EvidenceType; label: string }[] = [
  { value: "github", label: "GitHub / Repository" },
  { value: "portfolio", label: "Portfolio / Website" },
  { value: "certificate", label: "Certificate" },
  { value: "project", label: "Project" },
  { value: "assessment", label: "Assessment" },
];

const MAX_PROOF_SIZE = 10 * 1024 * 1024;

const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// Fix for TS2304: this function is used when validating the proof URL.
function validHttpUrl(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    return (
      (parsed.protocol === "http:" ||
        parsed.protocol === "https:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const { text: closeLabel } = useDeepLTranslation("Close");
  const { text: titlePlaceholder } = useDeepLTranslation("e.g. My React portfolio project");
  const { text: urlPlaceholder } = useDeepLTranslation("https://github.com/you/project (optional if uploading a file)");
  const { text: descriptionPlaceholder } = useDeepLTranslation("Explain what this demonstrates about your skill...");

  // Load the complete skill catalogue and identify skills already
  // present on the signed-in developer's Passport.
  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setLoadingSkills(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "You must be logged in to add evidence."
          );
        }

        const {
          data: catalogue,
          error: catalogueError,
        } = await supabase
          .from("skills")
          .select("id, name")
          .order("name", { ascending: true });

        if (catalogueError) {
          throw catalogueError;
        }

        const {
          data: developerSkills,
          error: developerSkillsError,
        } = await supabase
          .from("developer_skills")
          .select("skill_id, proficiency")
          .eq("developer_id", user.id);

        if (developerSkillsError) {
          throw developerSkillsError;
        }

        const passportSkillMap = new Map<
          string,
          string | null
        >();

        (developerSkills ?? []).forEach((row) => {
          passportSkillMap.set(
            row.skill_id,
            row.proficiency ?? null
          );
        });

        const formattedSkills: Skill[] = (
          catalogue ?? []
        ).map((skill) => ({
          id: skill.id,
          name: skill.name,
          proficiency:
            passportSkillMap.get(skill.id) ?? null,
          onPassport: passportSkillMap.has(skill.id),
        }));

        if (!cancelled) {
          setSkills(formattedSkills);
          setSkillId("");
        }
      } catch (err) {
        console.error(
          "Error loading skill catalogue:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the skill catalogue."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSkills(false);
        }
      }
    }

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!skillId) {
      setError(
        "Select the skill this evidence supports."
      );
      return;
    }

    if (!title.trim()) {
      setError("Enter a title for this evidence.");
      return;
    }

    if (!url.trim() && !file) {
      setError(
        "Provide a proof link or upload a proof file."
      );
      return;
    }

    if (url.trim() && !validHttpUrl(url)) {
      setError(
        "The proof link must start with http:// or https://."
      );
      return;
    }

    if (
      file &&
      !ALLOWED_PROOF_TYPES.has(file.type)
    ) {
      setError(
        "Proof files must be JPG, PNG, WEBP, GIF, or PDF."
      );
      return;
    }

    if (file && file.size > MAX_PROOF_SIZE) {
      setError(
        "Proof files must be 10 MB or smaller."
      );
      return;
    }

    const selectedSkill = skills.find(
      (skill) => skill.id === skillId
    );

    if (!selectedSkill) {
      setError(
        "Please select a skill from the platform catalogue."
      );
      return;
    }

    setSaving(true);

    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in to add evidence."
        );
      }

      type EvidenceInsert = {
        developer_id: string;
        skill_id: string;
        evidence_type: EvidenceType;
        title: string;
        description: string | null;
        url: string;
        verified: boolean;
      };

      const rows: EvidenceInsert[] = [];

      // Save the supplied proof link, if provided.
      if (url.trim()) {
        rows.push({
          developer_id: user.id,
          skill_id: selectedSkill.id,
          evidence_type: evidenceType,
          title: title.trim(),
          description: description.trim() || null,
          url: url.trim(),
          verified: false,
        });
      }

      // Upload the selected proof file, if provided.
      if (file) {
        const safeName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const path =
          `${user.id}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("skill-evidence")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const { data: publicUrlData } =
          supabase.storage
            .from("skill-evidence")
            .getPublicUrl(path);

        rows.push({
          developer_id: user.id,
          skill_id: selectedSkill.id,
          evidence_type: evidenceType,
          title:
            title.trim() +
            (url.trim() ? " (uploaded file)" : ""),
          description: description.trim() || null,
          url: publicUrlData.publicUrl,
          verified: false,
        });
      }

      if (rows.length === 0) {
        throw new Error(
          "Provide a proof link or upload a proof file."
        );
      }

      // If the selected catalogue skill is not already on
      // the Passport, add it at Intermediate proficiency.
      if (!selectedSkill.onPassport) {
        const { error: linkSkillError } = await supabase
          .from("developer_skills")
          .insert({
            developer_id: user.id,
            skill_id: selectedSkill.id,
            proficiency: "intermediate",
          });

        if (linkSkillError) {
          // If it was added concurrently, accept the existing link.
          const {
            data: existingLink,
            error: existingLinkError,
          } = await supabase
            .from("developer_skills")
            .select("id")
            .eq("developer_id", user.id)
            .eq("skill_id", selectedSkill.id)
            .maybeSingle();

          if (existingLinkError || !existingLink) {
            throw linkSkillError;
          }
        }
      }

      // Save the evidence records.
      const { error: insertError } = await supabase
        .from("skill_evidence")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      await onSaved();
      onClose();
    } catch (err) {
      // Remove files uploaded during this failed submission.
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } =
          await supabase.storage
            .from("skill-evidence")
            .remove(uploadedPaths);

        if (cleanupError) {
          console.warn(
            "Proof file cleanup error:",
            cleanupError.message
          );
        }
      }

      console.error("Error adding evidence:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save evidence."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FileCheck2 size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-950">
                <DeepLText text={"Add skill evidence"} /> </h2>

              <p className="mt-1 text-sm text-slate-500">
                <DeepLText text={"Provide a proof link or upload a document or image."} /> </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-5 p-5 sm:p-6"
        >
          {error && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="shrink-0"
              />
              <p><DeepLText text={error} /></p>
            </div>
          )}

          <div>
            <label
              htmlFor="evidence-skill"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              <DeepLText text={"Skill *"} /> </label>

            <p className="mb-2 text-xs leading-5 text-slate-500">
              <DeepLText text={"All skills in the platform catalogue are available. If a skill is not on your Passport yet, saving evidence will add it at Intermediate proficiency."} /> </p>

            {loadingSkills ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                <DeepLText text={"Loading skills..."} /> </div>
            ) : skills.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <DeepLText text={"No skills are available in the platform catalogue yet. Please try again later."} /> </div>
            ) : (
              <select
                id="evidence-skill"
                value={skillId}
                onChange={(event) =>
                  setSkillId(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value=""><DeepLText text={"Select a skill"} /></option>

                {skills.map((skill) => (
                  <option
                    key={skill.id}
                    value={skill.id}
                  >
                    {skill.name}
                    {skill.proficiency
                      ? ` — ${skill.proficiency}`
                      : skill.onPassport
                        ? ""
                        : " — added to Passport when saved"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="evidence-type"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              <DeepLText text={"Evidence type *"} /> </label>

            <select
              id="evidence-type"
              value={evidenceType}
              onChange={(event) =>
                setEvidenceType(
                  event.target.value as EvidenceType
                )
              }
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              {evidenceTypes.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  <DeepLText text={item.label} />
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="evidence-title"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              <DeepLText text={"Evidence title *"} /> </label>

            <input
              id="evidence-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              disabled={saving}
              placeholder={titlePlaceholder}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="evidence-url"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              <DeepLText text={"Proof link"} /> </label>

            <input
              id="evidence-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={saving}
              placeholder={urlPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              <DeepLText text={"Or upload proof from your device"} /> </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 hover:border-blue-300 hover:bg-blue-50">
              <FileUp
                size={22}
                className="shrink-0 text-blue-700"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {file?.name ?? <DeepLText text="Choose image or PDF" />}
                </span>

                <span className="block text-xs text-slate-500">
                  <DeepLText text={"JPG, PNG, WEBP, GIF or PDF · max 10 MB"} /> </span>
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                disabled={saving}
                className="sr-only"
                onChange={(event) => {
                  const next =
                    event.target.files?.[0] ?? null;

                  if (
                    next &&
                    next.size > MAX_PROOF_SIZE
                  ) {
                    setError(
                      "Proof files must be 10 MB or smaller."
                    );
                    event.target.value = "";
                    return;
                  }

                  if (
                    next &&
                    !ALLOWED_PROOF_TYPES.has(next.type)
                  ) {
                    setError(
                      "Proof files must be JPG, PNG, WEBP, GIF, or PDF."
                    );
                    event.target.value = "";
                    return;
                  }

                  setError("");
                  setFile(next);
                }}
              />
            </label>

            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={saving}
                className="mt-2 text-xs font-semibold text-rose-600"
              >
                <DeepLText text={"Remove uploaded file"} /> </button>
            )}
          </div>

          <div>
            <label
              htmlFor="evidence-description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              <DeepLText text={"What does this prove?"} />{" "}
              <span className="font-normal text-slate-400">
                <DeepLText text={"(optional)"} /> </span>
            </label>

            <textarea
              id="evidence-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={saving}
              rows={3}
              maxLength={1000}
              placeholder={descriptionPlaceholder}
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <DeepLText text={"Proof files are published as links that can be opened from your public Passport. Only upload material you are comfortable sharing publicly. New evidence remains unverified until reviewed."} /> </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <DeepLText text={"Cancel"} /> </button>

            <button
              type="submit"
              disabled={
                saving ||
                loadingSkills ||
                skills.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  <DeepLText text={"Saving..."} /> </>
              ) : (
                <>
                  <FileCheck2 size={16} />
                  <DeepLText text={"Save evidence"} /> </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}