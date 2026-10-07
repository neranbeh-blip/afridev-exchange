import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FolderKanban,
  Loader2,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type ProjectStatus = "idea" | "open" | "in_progress" | "completed";
type ApplicationStatus = "pending" | "accepted" | "rejected";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  repository_url: string | null;
  demo_url: string | null;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
  application_count: number;
  accepted_count: number;
  required_skills: Skill[];
  member_count: number;
};

type Application = {
  id: string;
  project_id: string;
  developer_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "idea", label: "Idea" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      setCurrentUserId(user?.id ?? null);

      const { data: projectRows, error: projectError } = await supabase
        .from("projects")
        .select(
          "id, owner_id, title, description, status, repository_url, demo_url, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (projectError) throw projectError;

      const rows = projectRows ?? [];

      const ownerIds = Array.from(
        new Set(rows.map((project) => project.owner_id))
      );

      const projectIds = rows.map((project) => project.id);

      const [
        { data: owners, error: ownersError },
        { data: applications, error: applicationsError },
        { data: skills, error: skillsError },
        { data: projectSkills, error: projectSkillsError },
        { data: projectMembers, error: projectMembersError },
      ] = await Promise.all([
        ownerIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, username")
              .in("id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
        projectIds.length
          ? supabase
              .from("project_applications")
              .select(
                "id, project_id, developer_id, message, status, created_at"
              )
              .in("project_id", projectIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("skills")
          .select("id, name, category")
          .order("name"),
        projectIds.length
          ? supabase
              .from("project_skills")
              .select("project_id, skill_id")
              .in("project_id", projectIds)
          : Promise.resolve({ data: [], error: null }),
        projectIds.length
          ? supabase
              .from("project_members")
              .select("project_id, developer_id")
              .in("project_id", projectIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (ownersError) throw ownersError;
      if (applicationsError) throw applicationsError;
      if (skillsError) throw skillsError;
      if (projectSkillsError) throw projectSkillsError;
      if (projectMembersError) throw projectMembersError;

      const allSkills = (skills ?? []) as Skill[];
      setAvailableSkills(allSkills);

      const ownerMap = new Map(
        (owners ?? []).map((owner) => [owner.id, owner])
      );
      const skillMap = new Map(allSkills.map((skill) => [skill.id, skill]));
      const applicationRows = (applications ?? []) as Application[];

      const applicationCountMap = new Map<string, number>();
      const acceptedCountMap = new Map<string, number>();

      applicationRows.forEach((application) => {
        applicationCountMap.set(
          application.project_id,
          (applicationCountMap.get(application.project_id) ?? 0) + 1
        );

        if (application.status === "accepted") {
          acceptedCountMap.set(
            application.project_id,
            (acceptedCountMap.get(application.project_id) ?? 0) + 1
          );
        }
      });

      const projectSkillRows = projectSkills ?? [];
      const projectMemberRows = projectMembers ?? [];

      setProjects(
        rows.map((project) => ({
          ...project,
          owner: ownerMap.get(project.owner_id) ?? null,
          application_count:
            applicationCountMap.get(project.id) ?? 0,
          accepted_count: acceptedCountMap.get(project.id) ?? 0,
          required_skills: projectSkillRows
            .filter((row) => row.project_id === project.id)
            .map((row) => skillMap.get(row.skill_id))
            .filter((skill): skill is Skill => Boolean(skill)),
          member_count: projectMemberRows.filter(
            (row) => row.project_id === project.id
          ).length,
        }))
      );

      setMyApplications(
        user
          ? applicationRows.filter(
              (application) => application.developer_id === user.id
            )
          : []
      );
    } catch (err) {
      console.error("Projects loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();

    const channel = supabase
      .channel("projects-list-lifecycle")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_applications" },
        () => {
          void loadProjects();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_applications" },
        () => {
          void loadProjects();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        () => {
          void loadProjects();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_members" },
        () => {
          void loadProjects();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Projects realtime channel error.");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError("Project title and description are required.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to create a project.");
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: "idea",
          repository_url: repositoryUrl.trim() || null,
          demo_url: demoUrl.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (data?.id) {
        await supabase.from("project_members").upsert({
          project_id: data.id,
          developer_id: user.id,
          role: "owner",
        });

        if (selectedSkillIds.length > 0) {
          const { error: skillsError } = await supabase
            .from("project_skills")
            .insert(
              selectedSkillIds.map((skillId) => ({
                project_id: data.id,
                skill_id: skillId,
              }))
            );

          if (skillsError) throw skillsError;
        }
      }

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setRepositoryUrl("");
      setDemoUrl("");
      setSelectedSkillIds([]);
      setSkillSearch("");

      await loadProjects();

      if (data?.id) {
        navigate(`/projects/${data.id}`);
      }
    } catch (err) {
      console.error("Create project error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create project."
      );
    } finally {
      setCreating(false);
    }
  }

  const filteredSkills = useMemo(
    () =>
      availableSkills.filter((skill) =>
        skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase())
      ),
    [availableSkills, skillSearch]
  );

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    );
  }

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      const searchable = [
        project.title,
        project.description,
        project.owner?.full_name ?? "",
        project.owner?.username ?? "",
        ...project.required_skills.map((skill) => skill.name),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  function applicationFor(projectId: string) {
    return myApplications.find(
      (application) => application.project_id === projectId
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            AFRIDEV NETWORK
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Projects
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Turn ideas and problems into collaborative projects with
            African developers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Plus size={18} />
          Create Project
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, developers, ideas..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:w-56"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <FolderKanban size={14} />
          {filteredProjects.length} project
          {filteredProjects.length === 1 ? "" : "s"} found
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
      ) : filteredProjects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            No projects found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create the first project or change your search filters.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const application = applicationFor(project.id);
            const isOwner = project.owner_id === currentUserId;

            return (
              <article
                key={project.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <FolderKanban size={20} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-slate-950">
                        {project.title}
                      </h2>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {project.owner?.full_name ||
                          project.owner?.username ||
                          "AfriDev Developer"}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={project.status} />
                </div>

                <p className="mt-4 line-clamp-4 min-h-[6rem] text-sm leading-6 text-slate-600">
                  {project.description}
                </p>

                {project.required_skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.required_skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                      >
                        {skill.name}
                      </span>
                    ))}
                    {project.required_skills.length > 4 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        +{project.required_skills.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Metric
                    icon={<Users size={15} />}
                    value={project.application_count}
                    label="Applications"
                  />

                  <Metric
                    icon={<CheckCircle2 size={15} />}
                    value={project.accepted_count}
                    label="Accepted"
                  />

                  <Metric
                    icon={<Users size={15} />}
                    value={project.member_count}
                    label="Team"
                  />
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex gap-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View Project
                      <ArrowRight size={16} />
                    </Link>

                    {!isOwner && (
                      <Link
                        to={`/projects/${project.id}`}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          application?.status === "accepted"
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : project.status === "open" && !application
                              ? "bg-blue-700 text-white hover:bg-blue-800"
                              : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {application?.status === "accepted"
                          ? "Collaborating"
                          : application?.status === "pending"
                            ? "View Application"
                            : application?.status === "rejected"
                              ? "View Application"
                              : project.status === "idea"
                                ? "View Idea"
                                : project.status === "in_progress"
                                  ? "View Project"
                                  : "View Completed Project"}
                      </Link>
                    )}
                  </div>

                  {!isOwner && application && (
                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          application.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700"
                            : application.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {application.status === "accepted"
                          ? "Accepted — Collaborating"
                          : application.status === "rejected"
                            ? "Application Rejected"
                            : "Application Sent"}
                      </span>
                    </div>
                  )}

                  {(project.repository_url || project.demo_url) && (
                    <div className="mt-3 flex gap-3 text-xs">
                      {project.repository_url && (
                        <a
                          href={project.repository_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-blue-700"
                        >
                          Repository
                          <ExternalLink size={12} />
                        </a>
                      )}

                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-blue-700"
                        >
                          Demo
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  NEW PROJECT
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  Create a project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Publish an idea and invite developers to collaborate.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={createProject} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Project title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Cameroon SME Inventory Platform"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="What problem does this project solve? What do you want to build?"
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Required skills
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Select the skills you need from collaborators.
                </p>

                <input
                  value={skillSearch}
                  onChange={(event) => setSkillSearch(event.target.value)}
                  placeholder="Search skills..."
                  className="mb-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />

                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredSkills.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-slate-500">
                      No skills found.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredSkills.map((skill) => (
                        <label
                          key={skill.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2 hover:border-blue-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSkillIds.includes(skill.id)}
                            onChange={() => toggleSkill(skill.id)}
                            className="h-4 w-4 accent-blue-700"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-slate-700">
                              {skill.name}
                            </span>
                            {skill.category && (
                              <span className="block truncate text-[10px] text-slate-400">
                                {skill.category}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSkillIds.length > 0 && (
                  <p className="mt-2 text-xs font-medium text-blue-700">
                    {selectedSkillIds.length} skill{selectedSkillIds.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Project starts as an Idea
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    New projects start in Idea status. After creation, the owner can move the project through Open, In progress, and finally Completed.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Repository URL
                  </label>
                  <input
                    value={repositoryUrl}
                    onChange={(event) => setRepositoryUrl(event.target.value)}
                    placeholder="https://github.com/..."
                    type="url"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Demo URL <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  value={demoUrl}
                  onChange={(event) => setDemoUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "open"
      ? "bg-emerald-50 text-emerald-700"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700"
        : status === "completed"
          ? "bg-purple-50 text-purple-700"
          : "bg-amber-50 text-amber-700";

  const label = status.replace("_", " ");

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${config}`}
    >
      {label}
    </span>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-slate-600">
        {icon}
        <span className="text-xs font-semibold">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

export default Projects;
