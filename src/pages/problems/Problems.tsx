import {
  AlertCircle,
  ArrowRight,
  Filter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type Problem = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  status: string;
  created_at: string;
  converted_project_id: string | null;
  skills: Skill[];
  interestCount: number;
  creatorName: string;
};

const emptySkills: Skill[] = [];

function Problems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problemCategory, setProblemCategory] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  useEffect(() => {
    void loadProblems();
  }, []);

  async function loadProblems() {
    setLoading(true);
    setError("");

    try {
      const [
        { data: problemRows, error: problemError },
        { data: skillRows, error: skillError },
      ] = await Promise.all([
        supabase
          .from("problems")
          .select(
            "id, creator_id, title, description, category, location, status, created_at, converted_project_id"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("skills")
          .select("id, name, category")
          .order("name"),
      ]);

      if (problemError) throw problemError;
      if (skillError) throw skillError;

      setAvailableSkills((skillRows || []) as Skill[]);

      const rows = problemRows || [];
      if (rows.length === 0) {
        setProblems([]);
        return;
      }

      const problemIds = rows.map((row) => row.id);
      const creatorIds = Array.from(
        new Set(rows.map((row) => row.creator_id))
      );

      const [
        { data: problemSkillRows, error: problemSkillError },
        { data: interestRows, error: interestError },
        { data: creatorRows, error: creatorError },
      ] = await Promise.all([
        supabase
          .from("problem_skills")
          .select("problem_id, skill_id")
          .in("problem_id", problemIds),
        supabase
          .from("problem_interests")
          .select("problem_id, developer_id, status")
          .in("problem_id", problemIds),
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds),
      ]);

      if (problemSkillError) throw problemSkillError;
      if (interestError) throw interestError;
      if (creatorError) throw creatorError;

      const skillMap = new Map(
        ((skillRows || []) as Skill[]).map((skill) => [skill.id, skill])
      );

      const creatorMap = new Map(
        (creatorRows || []).map((profile) => [
          profile.id,
          profile.full_name || "AfriDev Developer",
        ])
      );

      const skillsByProblem = new Map<string, Skill[]>();
      for (const row of problemSkillRows || []) {
        const skill = skillMap.get(row.skill_id);
        if (!skill) continue;

        const current = skillsByProblem.get(row.problem_id) || [];
        current.push(skill);
        skillsByProblem.set(row.problem_id, current);
      }

      const interestsByProblem = new Map<string, number>();
      for (const row of interestRows || []) {
        if (row.status === "rejected" || row.status === "withdrawn") continue;
        interestsByProblem.set(
          row.problem_id,
          (interestsByProblem.get(row.problem_id) || 0) + 1
        );
      }

      setProblems(
        rows.map((row) => ({
          ...row,
          skills: skillsByProblem.get(row.id) || emptySkills,
          interestCount: interestsByProblem.get(row.id) || 0,
          creatorName:
            creatorMap.get(row.creator_id) || "AfriDev Developer",
        }))
      );
    } catch (err) {
      console.error("Problems loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load problems."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setProblemCategory("");
    setLocation("");
    setSelectedSkillIds([]);
    setSkillSearch("");
    setShowForm(false);
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    );
  }

  async function createProblem() {
    if (!title.trim() || !description.trim()) {
      setError("Please provide a title and description.");
      return;
    }

    if (selectedSkillIds.length === 0) {
      setError("Select at least one required skill.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in.");

      const { data: problem, error: problemError } = await supabase
        .from("problems")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category: problemCategory.trim() || null,
          location: location.trim() || null,
          status: "open",
        })
        .select("id")
        .single();

      if (problemError) throw problemError;

      const { error: skillsError } = await supabase
        .from("problem_skills")
        .insert(
          selectedSkillIds.map((skillId) => ({
            problem_id: problem.id,
            skill_id: skillId,
          }))
        );

      if (skillsError) {
        await supabase.from("problems").delete().eq("id", problem.id);
        throw skillsError;
      }

      resetForm();
      await loadProblems();
    } catch (err) {
      console.error("Problem creation error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to create the problem."
      );
    } finally {
      setCreating(false);
    }
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          problems
            .map((problem) => problem.category)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [problems]
  );

  const filteredSkills = useMemo(() => {
    const term = skillSearch.trim().toLowerCase();
    if (!term) return availableSkills;
    return availableSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(term) ||
        skill.category?.toLowerCase().includes(term)
    );
  }, [availableSkills, skillSearch]);

  const filteredProblems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesSearch =
        !term ||
        problem.title.toLowerCase().includes(term) ||
        problem.description.toLowerCase().includes(term) ||
        problem.skills.some((skill) =>
          skill.name.toLowerCase().includes(term)
        );

      const matchesCategory =
        category === "all" || problem.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [problems, search, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">Community Problems</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Turn real problems into real projects
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Discover problems posted by African developers, bring your skills,
            and turn promising problems into collaborative projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          <Plus size={17} />
          Post a Problem
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-950">
              From problem to project
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              A problem can become a project when the right developers come
              together. Required skills are preserved during conversion.
            </p>
          </div>
        </div>
      </section>

      {error && !showForm && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search problems, descriptions or skills..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="relative">
          <Filter
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <AlertCircle className="mx-auto text-slate-300" size={34} />
          <h2 className="mt-4 font-bold text-slate-800">No problems found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try another search or be the first developer to post a problem.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProblems.map((problem) => (
            <article
              key={problem.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {problem.category || "General"}
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    problem.converted_project_id
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {problem.converted_project_id ? "Project created" : problem.status}
                </span>
              </div>

              <h2 className="mt-4 line-clamp-2 text-lg font-bold text-slate-950">
                {problem.title}
              </h2>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                {problem.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {problem.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  >
                    {skill.name}
                  </span>
                ))}
                {problem.skills.length > 5 && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    +{problem.skills.length - 5}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  {problem.interestCount} interested developer
                  {problem.interestCount === 1 ? "" : "s"}
                </div>

                {problem.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    {problem.location}
                  </div>
                )}

                <div>Posted by {problem.creatorName}</div>
              </div>

              <Link
                to={`/problems/${problem.id}`}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Problem
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Community Problems
                </p>
                <h2 className="text-xl font-bold text-slate-950">
                  Post a Problem
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Field label="Problem title">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Build a low-bandwidth clinic booking platform"
                  className="input-base"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Describe the problem, who it affects, and what you believe could be built."
                  className="input-base resize-none"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <input
                    value={problemCategory}
                    onChange={(event) => setProblemCategory(event.target.value)}
                    placeholder="Health, FinTech, GovTech..."
                    className="input-base"
                  />
                </Field>

                <Field label="Location">
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Cameroon, Senegal, Africa..."
                    className="input-base"
                  />
                </Field>
              </div>

              <Field label="Required skills">
                <input
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  placeholder="Search skills..."
                  className="input-base"
                />

                <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {filteredSkills.map((skill) => {
                    const selected = selectedSkillIds.includes(skill.id);

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {selectedSkillIds.length} skill
                  {selectedSkillIds.length === 1 ? "" : "s"} selected
                </p>
              </Field>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createProblem()}
                  disabled={creating}
                  className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Publishing..." : "Publish Problem"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-base {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-base:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(219 234 254);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

export default Problems;
