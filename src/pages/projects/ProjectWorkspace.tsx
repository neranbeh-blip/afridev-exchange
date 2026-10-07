import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  File,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type ProjectStatus = "idea" | "open" | "in_progress" | "completed";
type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
type TaskPriority = "low" | "medium" | "high";
type Tab = "overview" | "tasks" | "files" | "team" | "discussions" | "activity";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
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
};

type Member = {
  project_id: string;
  developer_id: string;
  role: "owner" | "collaborator";
  joined_at: string;
  profile: Profile | null;
};

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectFile = {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  uploader?: Profile | null;
};

type Comment = {
  id: string;
  project_id: string;
  developer_id: string;
  content: string;
  created_at: string;
  developer?: Profile | null;
};

type ActivityItem = {
  id: string;
  project_id: string;
  developer_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  developer?: Profile | null;
};

const taskColumns: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const isOwner = Boolean(project && currentUserId === project.owner_id);
  const isMember = members.some((member) => member.developer_id === currentUserId);
  const canUseWorkspace = isOwner || isMember;

  async function loadWorkspace() {
    if (!projectId) {
      setError("Project not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("You must be logged in.");
      setCurrentUserId(authData.user.id);

      const { data: projectRow, error: projectError } = await supabase
        .from("projects")
        .select("id, owner_id, title, description, status, repository_url, demo_url, created_at")
        .eq("id", projectId)
        .single();
      if (projectError) throw projectError;

      const [memberResult, taskResult, fileResult, commentResult, activityResult] = await Promise.all([
        supabase
          .from("project_members")
          .select("project_id, developer_id, role, joined_at")
          .eq("project_id", projectId)
          .order("joined_at", { ascending: true }),
        supabase
          .from("project_tasks")
          .select("id, project_id, title, description, assigned_to, created_by, status, priority, due_date, created_at, updated_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_files")
          .select("id, project_id, uploaded_by, file_name, storage_path, mime_type, file_size, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_comments")
          .select("id, project_id, developer_id, content, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("project_activity")
          .select("id, project_id, developer_id, activity_type, title, description, metadata, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      for (const result of [memberResult, taskResult, fileResult, commentResult, activityResult]) {
        if (result.error) throw result.error;
      }

      const memberRows = memberResult.data ?? [];
      const taskRows = (taskResult.data ?? []) as Task[];
      const fileRows = (fileResult.data ?? []) as ProjectFile[];
      const commentRows = (commentResult.data ?? []) as Comment[];
      const activityRows = (activityResult.data ?? []) as ActivityItem[];

      const developerIds = Array.from(
        new Set([
          ...memberRows.map((row) => row.developer_id),
          ...taskRows.flatMap((row) => [row.assigned_to, row.created_by]).filter(Boolean) as string[],
          ...fileRows.map((row) => row.uploaded_by),
          ...commentRows.map((row) => row.developer_id),
          ...activityRows.map((row) => row.developer_id).filter(Boolean) as string[],
          projectRow.owner_id,
        ])
      );

      const { data: profileRows, error: profileError } = developerIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, country, city, avatar_url")
            .in("id", developerIds)
        : { data: [], error: null };
      if (profileError) throw profileError;

      const profileMap = new Map((profileRows ?? []).map((profile) => [profile.id, profile as Profile]));

      setProject(projectRow as Project);
      setMembers(
        memberRows.map((member) => ({
          ...member,
          role: member.role as Member["role"],
          profile: profileMap.get(member.developer_id) ?? null,
        }))
      );
      setTasks(taskRows);
      setFiles(fileRows.map((file) => ({ ...file, uploader: profileMap.get(file.uploaded_by) ?? null })));
      setComments(commentRows.map((comment) => ({ ...comment, developer: profileMap.get(comment.developer_id) ?? null })));
      setActivities(activityRows.map((activity) => ({ ...activity, developer: activity.developer_id ? profileMap.get(activity.developer_id) ?? null : null })));
    } catch (err) {
      console.error("Project workspace loading error:", err);
      setError(err instanceof Error ? err.message : "Unable to load the project workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-workspace-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` }, () => void refreshWorkspaceData())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` }, () => void refreshWorkspaceData())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_files", filter: `project_id=eq.${projectId}` }, () => void refreshWorkspaceData())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_activity", filter: `project_id=eq.${projectId}` }, () => void refreshWorkspaceData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  async function refreshWorkspaceData() {
    if (!projectId) return;

    const [taskResult, fileResult, commentResult, activityResult] = await Promise.all([
      supabase.from("project_tasks").select("id, project_id, title, description, assigned_to, created_by, status, priority, due_date, created_at, updated_at").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("project_files").select("id, project_id, uploaded_by, file_name, storage_path, mime_type, file_size, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("project_comments").select("id, project_id, developer_id, content, created_at").eq("project_id", projectId).order("created_at", { ascending: true }),
      supabase.from("project_activity").select("id, project_id, developer_id, activity_type, title, description, metadata, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100),
    ]);

    if (taskResult.error || fileResult.error || commentResult.error || activityResult.error) return;

    setTasks((taskResult.data ?? []) as Task[]);
    setFiles((fileResult.data ?? []) as ProjectFile[]);
    setComments((commentResult.data ?? []) as Comment[]);
    setActivities((activityResult.data ?? []) as ActivityItem[]);
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || !currentUserId || !isOwner) return;
    if (!taskTitle.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setSavingTask(true);
      setError(null);

      const { error: insertError } = await supabase.from("project_tasks").insert({
        project_id: projectId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        assigned_to: taskAssignee || null,
        created_by: currentUserId,
        priority: taskPriority,
        due_date: taskDueDate || null,
        status: "todo",
      });
      if (insertError) throw insertError;

      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setShowTaskForm(false);
      await addActivity("task_created", "Task created", taskTitle.trim());
      await refreshWorkspaceData();
    } catch (err) {
      console.error("Create task error:", err);
      setError(err instanceof Error ? err.message : "Unable to create task.");
    } finally {
      setSavingTask(false);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    if (!currentUserId) return;

    try {
      const { error: updateError } = await supabase
        .from("project_tasks")
        .update({ status })
        .eq("id", task.id);
      if (updateError) throw updateError;

      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
      await addActivity("task_status_changed", `Task moved to ${taskColumnLabel(status)}`, task.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task status.");
    }
  }

  async function deleteTask(task: Task) {
    if (!isOwner) return;
    if (!window.confirm(`Delete task “${task.title}”?`)) return;

    const { error: deleteError } = await supabase.from("project_tasks").delete().eq("id", task.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await addActivity("task_deleted", "Task deleted", task.title);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile || !projectId || !currentUserId || !canUseWorkspace) return;

    const maxSize = 25 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("Files must be 25 MB or smaller.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, selectedFile, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase.from("project_files").insert({
        project_id: projectId,
        uploaded_by: currentUserId,
        file_name: selectedFile.name,
        storage_path: storagePath,
        mime_type: selectedFile.type || null,
        file_size: selectedFile.size,
      });

      if (metadataError) {
        await supabase.storage.from("project-files").remove([storagePath]);
        throw metadataError;
      }

      await addActivity("file_uploaded", "File uploaded", selectedFile.name);
      await refreshWorkspaceData();
    } catch (err) {
      console.error("File upload error:", err);
      setError(err instanceof Error ? err.message : "Unable to upload this file.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(file: ProjectFile) {
    const { data, error: signedUrlError } = await supabase.storage
      .from("project-files")
      .createSignedUrl(file.storage_path, 60 * 10);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? "Unable to create a download link.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteFile(file: ProjectFile) {
    if (!isOwner && file.uploaded_by !== currentUserId) return;
    if (!window.confirm(`Delete “${file.file_name}”?`)) return;

    const { error: storageError } = await supabase.storage.from("project-files").remove([file.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }

    const { error: metadataError } = await supabase.from("project_files").delete().eq("id", file.id);
    if (metadataError) {
      setError(metadataError.message);
      return;
    }

    await addActivity("file_deleted", "File deleted", file.file_name);
    setFiles((current) => current.filter((item) => item.id !== file.id));
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || !currentUserId || !commentText.trim()) return;

    try {
      const content = commentText.trim();
      const { error: insertError } = await supabase.from("project_comments").insert({
        project_id: projectId,
        developer_id: currentUserId,
        content,
      });
      if (insertError) throw insertError;

      setCommentText("");
      await addActivity("comment_posted", "Discussion comment posted", content.slice(0, 120));
      await refreshWorkspaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post the comment.");
    }
  }

  async function addActivity(type: string, title: string, description?: string) {
    if (!projectId || !currentUserId) return;
    const { error } = await supabase.from("project_activity").insert({
      project_id: projectId,
      developer_id: currentUserId,
      activity_type: type,
      title,
      description: description ?? null,
    });
    if (error) console.warn("Activity entry failed:", error.message);
  }

  const taskStats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    review: tasks.filter((task) => task.status === "in_review").length,
    done: tasks.filter((task) => task.status === "done").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-[600px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!project || error && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? "Project not found."}</div>
        <Link to="/projects" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
          <ChevronLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  if (!canUseWorkspace) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">
          <ChevronLeft size={16} /> Back to Project
        </Link>
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FolderOpen className="mx-auto text-slate-300" size={44} />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Workspace access required</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Only the project owner and accepted collaborators can access this workspace.</p>
        </div>
      </div>
    );
  }

  const statusLabel = project.status === "in_progress" ? "In Progress" : project.status.replace("_", " ");

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">
          <ChevronLeft size={16} /> Back to Project
        </Link>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}

        <header className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm"><FolderOpen size={26} /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{project.title}</h1>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-blue-700">{statusLabel}</span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{project.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.repository_url && <a href={project.repository_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Repository</a>}
                {project.demo_url && <a href={project.demo_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Demo</a>}
              </div>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 p-2">
            {([
              ["overview", "Overview", FolderOpen],
              ["tasks", "Tasks", CheckCircle2],
              ["files", "Files", FileText],
              ["team", "Team", Users],
              ["discussions", "Discussions", MessageSquare],
              ["activity", "Activity", Activity],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${activeTab === key ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon size={16} /> {label}
                {key === "tasks" && taskStats.total > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === key ? "bg-white/20" : "bg-slate-200"}`}>{taskStats.total}</span>}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === "overview" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-4">
                <Kpi label="Tasks" value={taskStats.total} />
                <Kpi label="In progress" value={taskStats.inProgress} />
                <Kpi label="Completed tasks" value={taskStats.done} />
                <Kpi label="Team members" value={members.length} />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Project progress</h2>
                    <p className="mt-1 text-sm text-slate-500">Track delivery through tasks and team activity.</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%</span>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${taskStats.total ? (taskStats.done / taskStats.total) * 100 : 0}%` }} /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {taskColumns.map((column) => <div key={column.status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{column.label}</p><p className="mt-1 text-xl font-bold text-slate-950">{tasks.filter((task) => task.status === column.status).length}</p></div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">Recent activity</h2><button type="button" onClick={() => setActiveTab("activity")} className="text-xs font-semibold text-blue-700">View all</button></div>
                <ActivityList activities={activities.slice(0, 6)} />
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-950">Quick actions</h2>
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => { setActiveTab("tasks"); setShowTaskForm(true); }} disabled={!isOwner} className="flex w-full items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} /> Create task</button>
                  <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload size={16} /> {uploading ? "Uploading..." : "Upload file"}<input type="file" className="hidden" onChange={uploadFile} disabled={uploading} /></label>
                  <button type="button" onClick={() => setActiveTab("discussions")} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MessageSquare size={16} /> Start discussion</button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-950">Team</h2>
                <div className="mt-4 space-y-3">{members.slice(0, 5).map((member) => <MemberRow key={member.developer_id} member={member} />)}</div>
                {members.length > 5 && <button type="button" onClick={() => setActiveTab("team")} className="mt-4 text-xs font-semibold text-blue-700">View all members</button>}
              </section>
            </aside>
          </div>
        )}

        {activeTab === "tasks" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xl font-bold text-slate-950">Project Tasks</h2><p className="mt-1 text-sm text-slate-500">Break the project into clear, trackable work.</p></div>
              {isOwner && <button type="button" onClick={() => setShowTaskForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus size={16} /> New task</button>}
            </div>

            {showTaskForm && isOwner && (
              <form onSubmit={createTask} className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400" />
                  <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">
                    <option value="">Unassigned</option>{members.map((member) => <option key={member.developer_id} value={member.developer_id}>{member.profile?.full_name || member.profile?.username || "Developer"}{member.role === "owner" ? " (Owner)" : ""}</option>)}
                  </select>
                  <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={3} placeholder="Description (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none md:col-span-2" />
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>
                  <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
                </div>
                <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowTaskForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={savingTask} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingTask && <Loader2 size={15} className="animate-spin" />}Create Task</button></div>
              </form>
            )}

            <div className="mt-6 grid gap-4 xl:grid-cols-4">
              {taskColumns.map((column) => (
                <div key={column.status} className="min-h-64 rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{column.label}</h3><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{tasks.filter((task) => task.status === column.status).length}</span></div>
                  <div className="mt-3 space-y-3">
                    {tasks.filter((task) => task.status === column.status).map((task) => (
                      <TaskCard key={task.id} task={task} members={members} currentUserId={currentUserId} isOwner={isOwner} onStatus={(status) => void updateTaskStatus(task, status)} onDelete={() => void deleteTask(task)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "files" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-slate-950">Project Files</h2><p className="mt-1 text-sm text-slate-500">Shared files are stored privately for this project.</p></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">{uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploading ? "Uploading..." : "Upload file"}<input type="file" className="hidden" onChange={uploadFile} disabled={uploading} /></label></div>
            {files.length === 0 ? <EmptyState icon={<FileText size={32} />} title="No files yet" text="Upload specifications, designs, documents or other project assets." /> : <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-100">{files.map((file) => <div key={file.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-700"><File size={18} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{file.file_name}</p><p className="text-xs text-slate-500">{formatBytes(file.file_size)} · {formatDate(file.created_at)} · {file.uploader?.full_name || "Developer"}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void downloadFile(file)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Download</button>{(isOwner || file.uploaded_by === currentUserId) && <button type="button" onClick={() => void deleteFile(file)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}</div></div>)}</div>}
          </section>
        )}

        {activeTab === "team" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-950">Project Team</h2><p className="mt-1 text-sm text-slate-500">Everyone currently participating in this project.</p></div><Users className="text-blue-600" size={24} /></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">{members.map((member) => <div key={member.developer_id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4"><Avatar profile={member.profile} /><div className="min-w-0 flex-1"><Link to={`/developer/${member.developer_id}`} className="truncate font-semibold text-slate-900 hover:text-blue-700">{member.profile?.full_name || member.profile?.username || "Developer"}</Link><p className="mt-1 text-xs text-slate-500">{member.role === "owner" ? "Project Owner" : "Collaborator"}</p>{member.profile?.city && <p className="mt-1 text-xs text-slate-400">{member.profile.city}{member.profile.country ? `, ${member.profile.country}` : ""}</p>}</div><Link to={`/developer/${member.developer_id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Passport</Link></div>)}</div>
          </section>
        )}

        {activeTab === "discussions" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6"><h2 className="text-xl font-bold text-slate-950">Discussions</h2><p className="mt-1 text-sm text-slate-500">Coordinate work with the project team.</p></div>
            <div className="max-h-[520px] space-y-4 overflow-y-auto p-6">{comments.length === 0 ? <EmptyState icon={<MessageSquare size={32} />} title="No discussion yet" text="Start the conversation with your team." /> : comments.map((comment) => <div key={comment.id} className="flex gap-3"><Avatar profile={comment.developer} small /><div className="min-w-0 flex-1 rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{comment.developer?.full_name || "Developer"}</p><span className="text-[11px] text-slate-400">{formatDate(comment.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.content}</p></div></div>)}</div>
            <form onSubmit={postComment} className="border-t border-slate-100 p-5"><div className="flex gap-3"><Avatar profile={members.find((member) => member.developer_id === currentUserId)?.profile} small /><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} placeholder="Write a message to your project team..." className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400" /><button type="submit" disabled={!commentText.trim()} className="self-end rounded-xl bg-blue-700 p-3 text-white hover:bg-blue-800 disabled:opacity-40" aria-label="Post comment"><Send size={17} /></button></div></form>
          </section>
        )}

        {activeTab === "activity" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Project Activity</h2><p className="mt-1 text-sm text-slate-500">A timeline of workspace actions.</p><ActivityList activities={activities} /></section>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, members, currentUserId, isOwner, onStatus, onDelete }: { task: Task; members: Member[]; currentUserId: string | null; isOwner: boolean; onStatus: (status: TaskStatus) => void; onDelete: () => void }) {
  const assignee = members.find((member) => member.developer_id === task.assigned_to)?.profile;
  const isAssignedUser = task.assigned_to === currentUserId;
  const canMove = isOwner || isAssignedUser;
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-slate-900">{task.title}</p>{task.description && <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{task.description}</p>}</div>{isOwner && <button type="button" onClick={onDelete} className="text-slate-300 hover:text-red-600" aria-label="Delete task"><Trash2 size={14} /></button>}</div><div className="mt-3 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${task.priority === "high" ? "bg-red-50 text-red-700" : task.priority === "low" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{task.priority} priority</span>{task.due_date && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"><Calendar size={10} /> {task.due_date}</span>}</div><div className="mt-3 flex items-center gap-2">{assignee ? <><Avatar profile={assignee} small /><span className="truncate text-[11px] text-slate-500">{assignee.full_name || assignee.username || "Developer"}</span></> : <span className="text-[11px] text-slate-400">Unassigned</span>}</div>{canMove && <select value={task.status} onChange={(e) => onStatus(e.target.value as TaskStatus)} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600"><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></select>}</div>;
}

function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) return <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center"><Clock3 className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-600">No activity yet</p></div>;
  return <div className="mt-5 divide-y divide-slate-100">{activities.map((activity) => <div key={activity.id} className="flex gap-3 py-4"><div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700"><Activity size={16} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{activity.title}</p><span className="text-[11px] text-slate-400">{formatDate(activity.created_at)}</span></div>{activity.description && <p className="mt-1 text-xs leading-5 text-slate-500">{activity.description}</p>}{activity.developer?.full_name && <p className="mt-1 text-[11px] text-slate-400">by {activity.developer.full_name}</p>}</div></div>)}</div>;
}

function MemberRow({ member }: { member: Member }) {
  return <Link to={`/developer/${member.developer_id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50"><Avatar profile={member.profile} small /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.profile?.full_name || member.profile?.username || "Developer"}</p><p className="text-[11px] text-slate-400">{member.role === "owner" ? "Owner" : "Collaborator"}</p></div></Link>;
}

function Avatar({ profile, small = false }: { profile?: Profile | null; small?: boolean }) {
  const name = profile?.full_name || profile?.username || "Developer";
  const size = small ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
  return profile?.avatar_url ? <img src={profile.avatar_url} alt={name} className={`${size} rounded-full object-cover`} /> : <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700`}>{name.charAt(0).toUpperCase()}</div>;
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>;
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">{icon}</div><p className="mt-3 text-sm font-semibold text-slate-700">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">{text}</p></div>;
}

function taskColumnLabel(status: TaskStatus) {
  return taskColumns.find((column) => column.status === status)?.label ?? status;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default ProjectWorkspace;
