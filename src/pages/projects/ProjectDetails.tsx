import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FolderKanban,
  Loader2,
  Send,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type ProjectMember = {
  developer_id: string;
  role: "owner" | "collaborator";
  joined_at: string;
  profile: Profile | null;
};

type ProjectStatus = "idea" | "open" | "in_progress" | "completed";

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
  required_skills: Skill[];
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url?: string | null;
};

type ApplicationStatus = "pending" | "accepted" | "rejected";

type Application = {
  id: string;
  project_id: string;
  developer_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  developer: Profile | null;
};

type AIProjectCollaborator = {
  developer_id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
  compatibility_score: number;
  matching_skills: string[];
  verified_skills: string[];
  explanation: string;
  suggested_role: string;
};

function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [aiCollaborators, setAiCollaborators] = useState([] as AIProjectCollaborator[]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProject() {
    if (!projectId) {
      setError("Project not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      setCurrentUserId(user?.id ?? null);

      const { data: projectRow, error: projectError } = await supabase
        .from("projects")
        .select(
          "id, owner_id, title, description, status, repository_url, demo_url, created_at, updated_at"
        )
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      const [
        { data: ownerRow, error: ownerError },
        { data: applicationRows, error: applicationsError },
        { data: projectSkillRows, error: projectSkillsError },
        { data: projectMemberRows, error: projectMembersError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, country, city, avatar_url")
          .eq("id", projectRow.owner_id)
          .single(),
        supabase
          .from("project_applications")
          .select(
            "id, project_id, developer_id, message, status, created_at"
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_skills")
          .select("skill_id")
          .eq("project_id", projectId),
        supabase
          .from("project_members")
          .select("developer_id, role, joined_at")
          .eq("project_id", projectId)
          .order("joined_at", { ascending: true }),
      ]);

      if (ownerError) throw ownerError;
      if (applicationsError) throw applicationsError;
      if (projectSkillsError) throw projectSkillsError;
      if (projectMembersError) throw projectMembersError;

      const developerIds = Array.from(
        new Set([
          ...(applicationRows ?? []).map(
            (application) => application.developer_id
          ),
          ...(projectMemberRows ?? []).map((member) => member.developer_id),
        ])
      );

      const { data: developerProfiles, error: profilesError } =
        developerIds.length
          ? await supabase
              .from("profiles")
              .select(
                "id, full_name, username, country, city, avatar_url"
              )
              .in("id", developerIds)
          : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (developerProfiles ?? []).map((profile) => [profile.id, profile])
      );

      const skillIds = (projectSkillRows ?? []).map((row) => row.skill_id);
      const { data: skillRows, error: skillsError } = skillIds.length
        ? await supabase
            .from("skills")
            .select("id, name, category")
            .in("id", skillIds)
        : { data: [], error: null };

      if (skillsError) throw skillsError;

      const requiredSkills = (skillRows ?? []) as Skill[];

      const loadedMembers: ProjectMember[] = (projectMemberRows ?? []).map(
        (member) => ({
          developer_id: member.developer_id,
          role: member.role as "owner" | "collaborator",
          joined_at: member.joined_at,
          profile: profileMap.get(member.developer_id) ?? null,
        })
      );

      const enrichedApplications = (
        (applicationRows ?? []) as Application[]
      ).map((application) => ({
        ...application,
        developer: profileMap.get(application.developer_id) ?? null,
      }));

      setProject({
        ...(projectRow as Project),
        required_skills: requiredSkills,
      });
      setOwner(ownerRow as Profile);
      setApplications(enrichedApplications);
      setMembers(loadedMembers);

      setMyApplication(
        user
          ? enrichedApplications.find(
              (application) => application.developer_id === user.id
            ) ?? null
          : null
      );
    } catch (err) {
      console.error("Project details loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this project."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const channel = supabase
      .channel(`project-details-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_applications",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            project_id: string;
            developer_id: string;
            message: string | null;
            status: ApplicationStatus;
            created_at: string;
          };

          setApplications((current) =>
            current.map((application) =>
              application.id === updated.id
                ? {
                    ...application,
                    project_id: updated.project_id,
                    developer_id: updated.developer_id,
                    message: updated.message,
                    status: updated.status,
                    created_at: updated.created_at,
                  }
                : application
            )
          );

          setMyApplication((current) =>
            current && current.id === updated.id
              ? {
                  ...current,
                  project_id: updated.project_id,
                  developer_id: updated.developer_id,
                  message: updated.message,
                  status: updated.status,
                  created_at: updated.created_at,
                }
              : current
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_applications",
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const inserted = payload.new as {
            id: string;
            project_id: string;
            developer_id: string;
            message: string | null;
            status: ApplicationStatus;
            created_at: string;
          };

          const { data: developerProfile } = await supabase
            .from("profiles")
            .select("id, full_name, username, country, city, avatar_url")
            .eq("id", inserted.developer_id)
            .maybeSingle();

          setApplications((current) => {
            if (current.some((application) => application.id === inserted.id)) {
              return current;
            }

            return [
              {
                ...inserted,
                developer: developerProfile as Profile | null,
              },
              ...current,
            ];
          });

          if (inserted.developer_id === currentUserId) {
            setMyApplication({
              ...inserted,
              developer: developerProfile as Profile | null,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_members",
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const inserted = payload.new as {
            project_id: string;
            developer_id: string;
            role: "owner" | "collaborator";
            joined_at: string;
          };

          const { data: developerProfile } = await supabase
            .from("profiles")
            .select("id, full_name, username, country, city, avatar_url")
            .eq("id", inserted.developer_id)
            .maybeSingle();

          setMembers((current) => {
            if (current.some((member) => member.developer_id === inserted.developer_id)) {
              return current;
            }

            return [
              ...current,
              {
                developer_id: inserted.developer_id,
                role: inserted.role,
                joined_at: inserted.joined_at,
                profile: developerProfile as Profile | null,
              },
            ];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Project realtime channel error.");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, currentUserId]);

  async function changeProjectStatus(nextStatus: ProjectStatus) {
    if (!project || project.owner_id !== currentUserId) return;

    const allowedNextStatus: Record<ProjectStatus, ProjectStatus | null> = {
      idea: "open",
      open: "in_progress",
      in_progress: "completed",
      completed: null,
    };

    if (allowedNextStatus[project.status] !== nextStatus) {
      setError("Projects must move through Idea → Open → In progress → Completed.");
      return;
    }

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from("projects")
        .update({ status: nextStatus })
        .eq("id", project.id)
        .eq("owner_id", currentUserId);

      if (updateError) throw updateError;

      setProject((current) =>
        current ? { ...current, status: nextStatus } : current
      );
    } catch (err) {
      console.error("Project status update error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change the project status."
      );
    }
  }

  async function applyToProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project || !currentUserId) {
      setError("You must be logged in to apply.");
      return;
    }

    if (project.owner_id === currentUserId) {
      setError("Project owners cannot apply to their own project.");
      return;
    }

    if (project.status !== "open") {
      setError("This project is not accepting collaboration applications.");
      return;
    }

    if (myApplication) {
      setError(
        myApplication.status === "accepted"
          ? "Your application was already accepted. You are a project collaborator."
          : myApplication.status === "rejected"
            ? "Your application for this project was already rejected."
            : "You already sent an application for this project."
      );
      return;
    }

    if (!message.trim()) {
      setError("Tell the project owner how you can contribute.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: createdApplication, error: rpcError } = await supabase.rpc(
        "submit_project_application",
        {
          p_project_id: project.id,
          p_message: message.trim(),
        }
      );

      if (rpcError) throw rpcError;

      const created = Array.isArray(createdApplication)
        ? createdApplication[0]
        : createdApplication;

      if (!created) {
        throw new Error("The application was not created.");
      }

      const application = {
        ...created,
        developer: null,
      } as Application;

      setMyApplication(application);
      setApplications((current) => {
        if (current.some((item) => item.id === application.id)) return current;
        return [application, ...current];
      });
      setMessage("");

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: project.owner_id,
          type: "project",
          title: "New project application",
          message: `A developer applied to collaborate on "${project.title}".`,
          link: `/projects/${project.id}`,
        });

      if (notificationError) {
        console.warn(
          "Application created, but notification failed:",
          notificationError.message
        );
      }
    } catch (err) {
      console.error("Project application error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your application."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function decideApplication(
    application: Application,
    decision: "accepted" | "rejected"
  ) {
    if (!project || project.owner_id !== currentUserId) return;

    if (application.status !== "pending") {
      setError("This application has already been reviewed.");
      return;
    }

    try {
      setDecisionId(application.id);
      setError(null);

      const { data: updatedApplication, error: rpcError } = await supabase.rpc(
        "review_project_application",
        {
          p_application_id: application.id,
          p_decision: decision,
        }
      );

      if (rpcError) throw rpcError;

      const updated = Array.isArray(updatedApplication)
        ? updatedApplication[0]
        : updatedApplication;

      if (!updated) {
        throw new Error("The application decision was not applied.");
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? { ...item, status: updated.status as ApplicationStatus }
            : item
        )
      );

      if (decision === "accepted") {
        setMembers((current) => {
          if (current.some((member) => member.developer_id === application.developer_id)) {
            return current;
          }

          return [
            ...current,
            {
              developer_id: application.developer_id,
              role: "collaborator",
              joined_at: new Date().toISOString(),
              profile: application.developer,
            },
          ];
        });
      }

      const notificationTitle =
        decision === "accepted"
          ? "Project application accepted"
          : "Project application rejected";

      const notificationMessage =
        decision === "accepted"
          ? `Your application to "${project.title}" was accepted.`
          : `Your application to "${project.title}" was rejected.`;

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: application.developer_id,
          type: "project",
          title: notificationTitle,
          message: notificationMessage,
          link: `/projects/${project.id}`,
        });

      if (notificationError) {
        console.warn(
          "Application updated, but notification failed:",
          notificationError.message
        );
      }
    } catch (err) {
      console.error("Application decision error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the application."
      );
    } finally {
      setDecisionId(null);
    }
  }

  async function findAIProjectCollaborators() {
    if (!project || project.owner_id !== currentUserId) {
      return;
    }

    try {
      setAiLoading(true);
      setError(null);

      const { data, error: functionError } =
        await supabase.functions.invoke("ai-project-match", {
          body: {
            project_id: project.id,
          },
        });

      if (functionError) {
        throw functionError;
      }

      const recommendations = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      setAiCollaborators(recommendations as AIProjectCollaborator[]);
      setAiLoaded(true);
    } catch (err) {
      console.error("AI project collaborator matching error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate AI collaborator recommendations."
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.owner_id === currentUserId;
  const existingApplication =
    myApplication ??
    applications.find(
      (application) => application.developer_id === currentUserId
    ) ??
    null;

  const isProjectMember = members.some(
    (member) => member.developer_id === currentUserId
  );

  const canApply =
    !isOwner &&
    !isProjectMember &&
    !existingApplication &&
    project.status === "open";

  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <FolderKanban size={25} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                    {project.title}
                  </h1>
                  <StatusBadge status={project.status} />
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Created{" "}
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {isOwner && (
              <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                Project Owner
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_300px]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              About this project
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {project.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {project.repository_url && (
                <a
                  href={project.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Repository
                  <ExternalLink size={15} />
                </a>
              )}

              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Demo
                  <ExternalLink size={15} />
                </a>
              )}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Stat
                icon={<Users size={17} />}
                value={applications.length}
                label="Applications"
              />
              <Stat
                icon={<CheckCircle2 size={17} />}
                value={acceptedApplications.length}
                label="Accepted collaborators"
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Project Owner
            </p>

            <div className="mt-3">
              <p className="font-bold text-slate-950">
                {owner?.full_name || "AfriDev Developer"}
              </p>

              {owner?.username && (
                <p className="text-xs text-slate-500">
                  @{owner.username}
                </p>
              )}

              {(owner?.city || owner?.country) && (
                <p className="mt-2 text-xs text-slate-500">
                  {[owner.city, owner.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            {(isOwner || isProjectMember) && (
              <Link
                to={`/projects/${project.id}/workspace`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <FolderKanban size={16} />
                Open Project Workspace
              </Link>
            )}

            {isOwner && (
              <div className="mt-6 rounded-xl border border-blue-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Project lifecycle
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {project.status === "idea"
                    ? "Concept stage — prepare the project for recruitment."
                    : project.status === "open"
                      ? "Recruitment stage — collaborators can apply."
                      : project.status === "in_progress"
                        ? "Development stage — the team is building."
                        : "Completed — the project is now part of your project history."}
                </p>

                {project.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() =>
                      void changeProjectStatus(
                        project.status === "idea"
                          ? "open"
                          : project.status === "open"
                            ? "in_progress"
                            : "completed"
                      )
                    }
                    className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    {project.status === "idea"
                      ? "Open for Collaboration"
                      : project.status === "open"
                        ? "Start Development"
                        : "Mark as Completed"}
                  </button>
                )}
              </div>
            )}

            {!isOwner && (
              <div className="mt-6">
                {canApply && (
                  <form onSubmit={applyToProject}>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      How can you contribute?
                    </label>

                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={5}
                      placeholder="Tell the owner about your skills and how you can help..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {submitting ? "Sending..." : "Apply to Collaborate"}
                    </button>
                  </form>
                )}

                {existingApplication && (
                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Your application
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {existingApplication.status === "pending"
                        ? "Application Sent"
                        : existingApplication.status === "accepted"
                          ? "Accepted — Collaborating"
                          : "Application Rejected"}
                    </p>

                    {existingApplication.message && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {existingApplication.message}
                      </p>
                    )}

                    {existingApplication.status === "accepted" && (
                      <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        You are accepted as a project collaborator.
                      </div>
                    )}
                  </div>
                )}

                {!canApply && !existingApplication && (
                  <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500">
                    {project.status === "idea"
                      ? "This project is still an idea. Collaboration applications will open when the owner publishes it."
                      : project.status === "in_progress"
                        ? "This project is already in progress. New collaboration applications are closed."
                        : "This project is completed and is no longer accepting applications."}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Required Skills</h2>
          <p className="mt-1 text-sm text-slate-500">
            Skills this project is looking for from collaborators.
          </p>

          {project.required_skills.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No specific skills have been added yet.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.required_skills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                >
                  {skill.name}
                  {skill.category ? ` · ${skill.category}` : ""}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Project Team</h2>
          <p className="mt-1 text-sm text-slate-500">
            Developers currently working on this project.
          </p>

          {members.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No team members yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {members.map((member) => {
                const name =
                  member.profile?.full_name ||
                  member.profile?.username ||
                  "Developer";

                return (
                  <Link
                    key={member.developer_id}
                    to={`/developer/${member.developer_id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.role === "owner" ? "Project owner" : "Collaborator"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isOwner && (
        <section className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">
                  <Sparkles size={17} />
                </div>
                <h2 className="text-lg font-bold text-slate-950">
                  AI Collaborator Matching
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Find developers whose capabilities best match this project's
                required skills. AI explains the fit while the compatibility
                score remains based on the project's skill requirements.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void findAIProjectCollaborators()}
              disabled={aiLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}

              {aiLoading
                ? "Finding collaborators..."
                : aiLoaded
                  ? "Refresh AI Matches"
                  : "Find Collaborators"}
            </button>
          </div>

          {aiLoaded && (
            <div className="mt-6">
              {aiCollaborators.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No strong collaborator matches found yet.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Add more required skills or grow the developer network to
                    improve matching.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {aiCollaborators.map((candidate) => {
                    const candidateName =
                      candidate.full_name ||
                      candidate.username ||
                      "AfriDev Developer";

                    return (
                      <div
                        key={candidate.developer_id}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-start gap-3">
                          {candidate.avatar_url ? (
                            <img
                              src={candidate.avatar_url}
                              alt={candidateName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                              {candidateName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-950">
                                {candidateName}
                              </p>

                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                {Math.round(candidate.compatibility_score)}%
                                match
                              </span>
                            </div>

                            {(candidate.city || candidate.country) && (
                              <p className="mt-1 text-xs text-slate-500">
                                {[candidate.city, candidate.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}

                            <p className="mt-2 text-xs font-semibold text-blue-700">
                              Suggested role: {candidate.suggested_role}
                            </p>
                          </div>
                        </div>

                        {candidate.matching_skills.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Matching skills
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {candidate.matching_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {candidate.verified_skills.length > 0 && (
                          <p className="mt-3 text-xs font-medium text-emerald-700">
                            ✓ Verified: {candidate.verified_skills.join(", ")}
                          </p>
                        )}

                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs leading-5 text-slate-600">
                            {candidate.explanation}
                          </p>
                        </div>

                        <Link
                          to={`/developer/${candidate.developer_id}`}
                          className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Developer Passport
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {isOwner && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Collaboration applications
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review developers who want to contribute to your project.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {applications.length}
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No applications yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Developers will appear here when they apply.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {application.developer?.full_name ||
                          application.developer?.username ||
                          "Developer"}
                      </p>

                      {application.developer?.username && (
                        <p className="text-xs text-slate-500">
                          @{application.developer.username}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        Applied{" "}
                        {new Date(
                          application.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <ApplicationBadge status={application.status} />
                  </div>

                  {application.message && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {application.message}
                    </div>
                  )}

                  {application.status === "pending" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void decideApplication(
                            application,
                            "accepted"
                          )
                        }
                        disabled={decisionId === application.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {decisionId === application.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Accept
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void decideApplication(
                            application,
                            "rejected"
                          )
                        }
                        disabled={decisionId === application.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
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

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${config}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function ApplicationBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const config =
    status === "accepted"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${config}`}
    >
      {status}
    </span>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default ProjectDetails;
