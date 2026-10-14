import { Check, FileUp, Link as LinkIcon, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useDeepLTranslation } from "../../lib/useDeepLTranslation";
import DeepLText from "../layout/DeepLText";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type EvidenceType = "github" | "portfolio" | "certificate" | "project" | "assessment";

type ProofDraft = {
  evidenceType: EvidenceType;
  title: string;
  description: string;
  url: string;
  file: File | null;
};

type AddSkillModalProps = {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  existingSkillIds?: string[];
};

const proficiencyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

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

function emptyProof(): ProofDraft {
  return {
    evidenceType: "github",
    title: "",
    description: "",
    url: "",
    file: null,
  };
}

function validHttpUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function AddSkillModal({
  onClose,
  onSaved,
  existingSkillIds = [],
}: AddSkillModalProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [proofs, setProofs] = useState<Record<string, ProofDraft>>({});
  const [proficiency, setProficiency] = useState("intermediate");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { text: closeLabel } = useDeepLTranslation("Close");
  const { text: removeLabel } = useDeepLTranslation("Remove");
  const { text: searchPlaceholder } = useDeepLTranslation("Search React, PostgreSQL, Flutter...");
  const { text: proofForPlaceholder } = useDeepLTranslation("Proof for");
  const { text: thisSkillPlaceholder } = useDeepLTranslation("this skill");
  const { text: urlPlaceholder } = useDeepLTranslation("https://github.com/you/project (optional if uploading a file)");
  const { text: descriptionPlaceholder } = useDeepLTranslation("Briefly explain how this demonstrates your skill...");

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      setLoading(true);
      setError("");
      const { data, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, category")
        .order("name");

      if (cancelled) return;
      if (skillsError) {
        console.error("Skills loading error:", skillsError);
        setError("Unable to load the platform skill catalog.");
      } else {
        setSkills((data ?? []) as Skill[]);
      }
      setLoading(false);
    }

    void loadSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  const existingSet = useMemo(() => new Set(existingSkillIds), [existingSkillIds]);
  const availableSkills = useMemo(
    () => skills.filter((skill) => !existingSet.has(skill.id)),
    [skills, existingSet],
  );
  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? availableSkills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(query) ||
            (skill.category ?? "").toLowerCase().includes(query),
        )
      : availableSkills;
  }, [availableSkills, search]);

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) {
        return current.filter((id) => id !== skillId);
      }
      return [...current, skillId];
    });
    setProofs((current) => {
      if (current[skillId]) return current;
      return { ...current, [skillId]: emptyProof() };
    });
    setError("");
  }

  function updateProof(skillId: string, patch: Partial<ProofDraft>) {
    setProofs((current) => ({
      ...current,
      [skillId]: { ...(current[skillId] ?? emptyProof()), ...patch },
    }));
    setError("");
  }

  async function handleSave() {
    if (selectedSkillIds.length === 0) {
      setError("Select at least one existing skill.");
      return;
    }

    for (const skillId of selectedSkillIds) {
      const proof = proofs[skillId] ?? emptyProof();
      const skill = skills.find((item) => item.id === skillId);
      if (!proof.title.trim()) {
        setError(`Enter an evidence title for ${skill?.name ?? "each selected skill"}.`);
        return;
      }
      if (!proof.url.trim() && !proof.file) {
        setError(`A proof link or uploaded proof file is required for ${skill?.name ?? "each selected skill"}.`);
        return;
      }
      if (proof.url.trim() && !validHttpUrl(proof.url)) {
        setError(`The proof link for ${skill?.name ?? "this skill"} must start with http:// or https://.`);
        return;
      }
      if (proof.file) {
        if (!ALLOWED_PROOF_TYPES.has(proof.file.type)) {
          setError("Proof files must be JPG, PNG, WEBP, GIF, or PDF.");
          return;
        }
        if (proof.file.size > MAX_PROOF_SIZE) {
          setError("Each proof file must be 10 MB or smaller.");
          return;
        }
      }
    }

    setSaving(true);
    setError("");
    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in.");

      const items: Array<{
        skill_id: string;
        proficiency: string;
        evidence: Array<{
          evidence_type: EvidenceType;
          title: string;
          description: string | null;
          url: string;
        }>;
      }> = [];

      for (const skillId of selectedSkillIds) {
        const proof = proofs[skillId] ?? emptyProof();
        const skill = skills.find((item) => item.id === skillId);
        const evidenceItems: Array<{
          evidence_type: EvidenceType;
          title: string;
          description: string | null;
          url: string;
        }> = [];

        if (proof.url.trim()) {
          evidenceItems.push({
            evidence_type: proof.evidenceType,
            title: proof.title.trim(),
            description: proof.description.trim() || null,
            url: proof.url.trim(),
          });
        }

        if (proof.file) {
          const safeName = proof.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("skill-evidence")
            .upload(path, proof.file, {
              cacheControl: "3600",
              upsert: false,
              contentType: proof.file.type,
            });
          if (uploadError) throw uploadError;
          uploadedPaths.push(path);

          const { data: publicUrlData } = supabase.storage
            .from("skill-evidence")
            .getPublicUrl(path);

          evidenceItems.push({
            evidence_type: proof.evidenceType,
            title: proof.title.trim() + (proof.url.trim() ? " (uploaded file)" : ""),
            description: proof.description.trim() || null,
            url: publicUrlData.publicUrl,
          });
        }

        if (evidenceItems.length === 0) {
          throw new Error(`A proof is required for ${skill?.name ?? "each skill"}.`);
        }

        items.push({
          skill_id: skillId,
          proficiency,
          evidence: evidenceItems,
        });
      }

      const { error: rpcError } = await supabase.rpc(
        "add_developer_skills_with_required_evidence",
        { p_items: items },
      );

      if (rpcError) throw rpcError;

      await onSaved();
      onClose();
    } catch (err) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from("skill-evidence")
          .remove(uploadedPaths);
        if (cleanupError) {
          console.warn("Could not clean up uploaded proof files:", cleanupError.message);
        }
      }
      console.error("Save skills with evidence error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save skills and required evidence.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950"><DeepLText text={"Add skills with proof"} /></h2>
            <p className="mt-1 text-sm text-slate-500">
              <DeepLText text={"Select existing skills and attach proof for each one."} /> </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label={closeLabel}
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <DeepLText text={error} />
            </div>
          )}

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            <DeepLText text={"Search existing platform skills"} /> </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {selectedSkillIds.length} <DeepLText text={"selected · A link or uploaded proof is required for every selected skill."} /> </p>

          <div className="mt-3">
            {loading ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"><DeepLText text={"Loading skills..."} /></div>
            ) : filteredSkills.length > 0 ? (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {filteredSkills.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={saving}
                      onClick={() => toggleSkill(skill.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{skill.name}</span>
                          {skill.category && <span className="mt-0.5 block text-xs text-slate-500">{skill.category}</span>}
                        </span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {availableSkills.length === 0
                  ? "All catalog skills are already on your Passport."
                  : "No matching skill found. New skills cannot be created from Passport."}
              </div>
            )}
          </div>

          {selectedSkillIds.length > 0 && (
            <div className="mt-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900"><DeepLText text={"Required proof for each selected skill"} /></h3>
              {selectedSkillIds.map((skillId) => {
                const skill = skills.find((item) => item.id === skillId);
                const proof = proofs[skillId] ?? emptyProof();
                return (
                  <section key={skillId} className="rounded-xl border border-slate-200 p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700"><DeepLText text={"Skill evidence"} /></p>
                        <h4 className="mt-1 font-bold text-slate-950">{skill?.name ?? "Selected skill"}</h4>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setSelectedSkillIds((current) => current.filter((id) => id !== skillId))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`${removeLabel} ${skill?.name ?? thisSkillPlaceholder}`}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700"><DeepLText text={"Evidence type"} /></label>
                        <select
                          value={proof.evidenceType}
                          disabled={saving}
                          onChange={(event) => updateProof(skillId, { evidenceType: event.target.value as EvidenceType })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {evidenceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700"><DeepLText text={"Evidence title *"} /></label>
                        <input
                          value={proof.title}
                          maxLength={150}
                          disabled={saving}
                          onChange={(event) => updateProof(skillId, { title: event.target.value })}
                          placeholder={`${proofForPlaceholder} ${skill?.name ?? thisSkillPlaceholder}`}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700"><DeepLText text={"Proof link"} /></label>
                      <div className="relative">
                        <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={proof.url}
                          disabled={saving}
                          onChange={(event) => updateProof(skillId, { url: event.target.value })}
                          placeholder={urlPlaceholder}
                          className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700"><DeepLText text={"Or upload proof from your device"} /></label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 hover:border-blue-300 hover:bg-blue-50">
                        <FileUp size={20} className="shrink-0 text-blue-700" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{proof.file?.name ?? "Choose image or PDF"}</span>
                          <span className="block text-xs text-slate-500"><DeepLText text={"JPG, PNG, WEBP, GIF or PDF · max 10 MB"} /></span>
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          disabled={saving}
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (file && file.size > MAX_PROOF_SIZE) {
                              setError("Each proof file must be 10 MB or smaller.");
                              event.target.value = "";
                              return;
                            }
                            if (file && !ALLOWED_PROOF_TYPES.has(file.type)) {
                              setError("Proof files must be JPG, PNG, WEBP, GIF, or PDF.");
                              event.target.value = "";
                              return;
                            }
                            updateProof(skillId, { file });
                          }}
                        />
                      </label>
                      {proof.file && (
                        <button type="button" disabled={saving} onClick={() => updateProof(skillId, { file: null })} className="mt-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
                          <DeepLText text={"Remove uploaded file"} /> </button>
                      )}
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700"><DeepLText text={"What does this prove?"} /> <span className="font-normal text-slate-400"><DeepLText text={"(optional)"} /></span></label>
                      <textarea
                        value={proof.description}
                        maxLength={1000}
                        rows={2}
                        disabled={saving}
                        onChange={(event) => updateProof(skillId, { description: event.target.value })}
                        placeholder={descriptionPlaceholder}
                        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500"><DeepLText text={"Required: add a proof link, upload a proof file, or provide both."} /></p>
                  </section>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700"><DeepLText text={"Proficiency for selected skills"} /></label>
            <select
              value={proficiency}
              disabled={saving}
              onChange={(event) => setProficiency(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              {proficiencyLevels.map((level) => <option key={level.value} value={level.value}><DeepLText text={level.label} /></option>)}
            </select>
            <p className="mt-2 text-xs text-slate-500"><DeepLText text={"The selected proficiency applies to all skills in this submission."} /></p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            <DeepLText text={"Cancel"} /> </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || selectedSkillIds.length === 0}
            className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DeepLText text={saving ? "Saving skills & proof..." : `Add ${selectedSkillIds.length || ""} skill${selectedSkillIds.length === 1 ? "" : "s"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddSkillModal;
