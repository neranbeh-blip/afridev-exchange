import { Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type AddSkillModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

const proficiencyLevels = [
  {
    value: "beginner",
    label: "Beginner",
  },
  {
    value: "intermediate",
    label: "Intermediate",
  },
  {
    value: "advanced",
    label: "Advanced",
  },
  {
    value: "expert",
    label: "Expert",
  },
];

function AddSkillModal({
  onClose,
  onSaved,
}: AddSkillModalProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [proficiency, setProficiency] = useState("intermediate");
  const [search, setSearch] = useState("");

  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    setError("");

    const { data, error: skillsError } = await supabase
      .from("skills")
      .select("id, name, category")
      .order("name");

    if (skillsError) {
      console.error("Skills loading error:", skillsError);
      setError(skillsError.message);
    } else {
      setSkills(data || []);
    }

    setLoading(false);
  }

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreateSkill() {
    const name = newSkillName.trim();

    if (!name) {
      setError("Please enter a skill name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: existingSkill, error: existingError } =
        await supabase
          .from("skills")
          .select("id, name, category")
          .ilike("name", name)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingSkill) {
        setSelectedSkillId(existingSkill.id);
        setShowCreateSkill(false);
        setNewSkillName("");
        setNewSkillCategory("");
        setSaving(false);
        return;
      }

      const { data: createdSkill, error: createError } =
        await supabase
          .from("skills")
          .insert({
            name,
            category: newSkillCategory.trim() || null,
          })
          .select("id, name, category")
          .single();

      if (createError) {
        throw createError;
      }

      if (createdSkill) {
        setSkills((current) =>
          [...current, createdSkill].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );

        setSelectedSkillId(createdSkill.id);
      }

      setShowCreateSkill(false);
      setNewSkillName("");
      setNewSkillCategory("");
    } catch (err) {
      console.error("Create skill error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create skill."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedSkillId) {
      setError("Please select a skill.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const { error: insertError } = await supabase
        .from("developer_skills")
        .insert({
          developer_id: user.id,
          skill_id: selectedSkillId,
          proficiency: proficiency.toLowerCase(),
        });

      if (insertError) {
        if (
          insertError.message
            .toLowerCase()
            .includes("duplicate")
        ) {
          throw new Error(
            "You already have this skill in your Passport."
          );
        }

        throw insertError;
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error("Save skill error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save skill."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Add Skill
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tell AfriDev what you can contribute.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!showCreateSkill ? (
            <>
              {/* Search */}
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Find a skill
              </label>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search React, PostgreSQL, Flutter..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Skills */}
              <div className="mt-4">
                {loading ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Loading skills...
                  </div>
                ) : filteredSkills.length > 0 ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {filteredSkills.map((skill) => {
                      const selected =
                        selectedSkillId === skill.id;

                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() =>
                            setSelectedSkillId(skill.id)
                          }
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {skill.name}
                              </p>

                              {skill.category && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {skill.category}
                                </p>
                              )}
                            </div>

                            <div
                              className={`h-4 w-4 rounded-full border-2 ${
                                selected
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-500">
                      No matching skill found.
                    </p>
                  </div>
                )}
              </div>

              {/* Create skill */}
              <button
                type="button"
                onClick={() => {
                  setShowCreateSkill(true);
                  setError("");
                }}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                <Plus size={17} />
                Create a new skill
              </button>
            </>
          ) : (
            <>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setShowCreateSkill(false)}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  ← Back to skills
                </button>
              </div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Skill name
              </label>

              <input
                value={newSkillName}
                onChange={(event) =>
                  setNewSkillName(event.target.value)
                }
                placeholder="e.g. Supabase"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <label className="mb-2 mt-5 block text-sm font-semibold text-slate-700">
                Category
              </label>

              <input
                value={newSkillCategory}
                onChange={(event) =>
                  setNewSkillCategory(event.target.value)
                }
                placeholder="e.g. Backend, Database, Mobile"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={handleCreateSkill}
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Skill"}
              </button>
            </>
          )}

          {/* Proficiency */}
          {!showCreateSkill && (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Proficiency
              </label>

              <select
                value={proficiency}
                onChange={(event) =>
                  setProficiency(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {proficiencyLevels.map((level) => (
                  <option
                    key={level.value}
                    value={level.value}
                  >
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreateSkill && (
          <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedSkillId}
              className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Skill"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddSkillModal;