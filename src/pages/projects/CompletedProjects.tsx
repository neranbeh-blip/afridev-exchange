import {
  ExternalLink,
  FolderKanban,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  repository_url: string | null;
  demo_url: string | null;
  created_at: string;
  owner: Profile | null;
  media: Media[];
  likeCount: number;
  likedByMe: boolean;
  comments: CommentRow[];
};

type Media = {
  id: string;
  project_id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
};

type LikeRow = {
  id: string;
  project_id: string;
  user_id: string;
};

type CommentRow = {
  id: string;
  project_id: string;
  developer_id: string;
  content: string;
  created_at: string;
  developer: Profile | null;
};

function CompletedProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [savingMedia, setSavingMedia] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  async function loadCompletedProjects() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      setCurrentUserId(user?.id ?? null);

      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select(
          "id, owner_id, title, description, repository_url, demo_url, created_at"
        )
        .eq("status", "completed")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      const rows = projectRows ?? [];
      if (!rows.length) {
        setProjects([]);
        return;
      }

      const projectIds = rows.map((project) => project.id);
      const ownerIds = Array.from(new Set(rows.map((project) => project.owner_id)));

      const [
        { data: owners, error: ownersError },
        { data: mediaRows, error: mediaError },
        { data: likeRows, error: likesError },
        { data: commentRows, error: commentsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", ownerIds),
        supabase
          .from("project_media")
          .select("id, project_id, media_url, media_type, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("project_likes")
          .select("id, project_id, user_id")
          .in("project_id", projectIds),
        supabase
          .from("project_comments")
          .select("id, project_id, developer_id, content, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: true }),
      ]);

      if (ownersError) throw ownersError;
      if (mediaError) throw mediaError;
      if (likesError) throw likesError;
      if (commentsError) throw commentsError;

      const commentDeveloperIds = Array.from(
        new Set((commentRows ?? []).map((comment) => comment.developer_id))
      );

      const { data: commentDevelopers, error: commentProfilesError } =
        commentDeveloperIds.length
          ? await supabase
              .from("profiles")
              .select("id, full_name, username, avatar_url")
              .in("id", commentDeveloperIds)
          : { data: [], error: null };

      if (commentProfilesError) throw commentProfilesError;

      const ownerMap = new Map(
        (owners ?? []).map((owner) => [owner.id, owner as Profile])
      );
      const commentDeveloperMap = new Map(
        (commentDevelopers ?? []).map((developer) => [
          developer.id,
          developer as Profile,
        ])
      );

      const mediaMap = new Map<string, Media[]>();
      (mediaRows ?? []).forEach((media) => {
        const list = mediaMap.get(media.project_id) ?? [];
        list.push(media as Media);
        mediaMap.set(media.project_id, list);
      });

      const likesMap = new Map<string, LikeRow[]>();
      (likeRows ?? []).forEach((like) => {
        const list = likesMap.get(like.project_id) ?? [];
        list.push(like as LikeRow);
        likesMap.set(like.project_id, list);
      });

      const commentsMap = new Map<string, CommentRow[]>();
      (commentRows ?? []).forEach((comment) => {
        const list = commentsMap.get(comment.project_id) ?? [];
        list.push({
          ...(comment as CommentRow),
          developer: commentDeveloperMap.get(comment.developer_id) ?? null,
        });
        commentsMap.set(comment.project_id, list);
      });

      setProjects(
        rows.map((project) => {
          const likes = likesMap.get(project.id) ?? [];
          return {
            ...(project as Omit<Project, "owner" | "media" | "likeCount" | "likedByMe" | "comments">),
            owner: ownerMap.get(project.owner_id) ?? null,
            media: mediaMap.get(project.id) ?? [],
            likeCount: likes.length,
            likedByMe: Boolean(
              user?.id && likes.some((like) => like.user_id === user.id)
            ),
            comments: commentsMap.get(project.id) ?? [],
          };
        })
      );
    } catch (err) {
      console.error("Completed projects error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load completed projects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompletedProjects();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("completed-project-social")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_likes" },
        () => void loadCompletedProjects()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_comments" },
        () => void loadCompletedProjects()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function deleteProject(project: Project) {
    if (!currentUserId || project.owner_id !== currentUserId || deletingProjectId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${project.title}" permanently? This completed project and its associated content may no longer be available. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingProjectId(project.id);
      setError(null);

      const { data, error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq("owner_id", currentUserId)
        .select("id")
        .maybeSingle();

      if (deleteError) throw deleteError;
      if (!data) {
        throw new Error(
          "Project was not deleted. You must be the project owner, and your database delete policy must allow this action."
        );
      }

      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (selectedProjectId === project.id) setSelectedProjectId(null);
    } catch (err) {
      console.error("Delete completed project error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this completed project. Check your database permissions and related records."
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function toggleLike(project: Project) {
    if (!currentUserId || likingId) return;

    try {
      setLikingId(project.id);
      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? {
                ...item,
                likedByMe: !item.likedByMe,
                likeCount: item.likeCount + (item.likedByMe ? -1 : 1),
              }
            : item
        )
      );

      if (project.likedByMe) {
        const { error: deleteError } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", project.id)
          .eq("user_id", currentUserId);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("project_likes")
          .insert({ project_id: project.id, user_id: currentUserId });
        if (insertError) throw insertError;

        if (project.owner_id !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: project.owner_id,
            type: "project",
            title: "Project liked",
            message: `Someone liked your completed project "${project.title}".`,
            link: "/completed-projects",
          });
        }
      }
    } catch (err) {
      console.error("Project like error:", err);
      await loadCompletedProjects();
    } finally {
      setLikingId(null);
    }
  }

  async function submitComment(project: Project) {
    const content = commentText.trim();
    if (!currentUserId || !content || commenting) return;

    try {
      setCommenting(true);

      const { error: insertError } = await supabase
        .from("project_comments")
        .insert({
          project_id: project.id,
          developer_id: currentUserId,
          content,
        });

      if (insertError) throw insertError;

      if (project.owner_id !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: project.owner_id,
          type: "project",
          title: "New project comment",
          message: `Someone commented on your completed project "${project.title}".`,
          link: "/completed-projects",
        });
      }

      setCommentText("");
      await loadCompletedProjects();
    } catch (err) {
      console.error("Project comment error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to post your comment."
      );
    } finally {
      setCommenting(false);
    }
  }

  async function addMedia(project: Project) {
    const url = mediaUrl.trim();
    if (!currentUserId || project.owner_id !== currentUserId || !url || savingMedia) {
      return;
    }

    try {
      setSavingMedia(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from("project_media")
        .insert({
          project_id: project.id,
          media_url: url,
          media_type: mediaType,
        })
        .select("id, project_id, media_url, media_type, created_at")
        .single();

      if (insertError) throw insertError;

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, media: [...item.media, data as Media] }
            : item
        )
      );
      setMediaUrl("");
    } catch (err) {
      console.error("Add project media error:", err);
      setError(err instanceof Error ? err.message : "Unable to add media.");
    } finally {
      setSavingMedia(false);
    }
  }

  async function removeMedia(projectId: string, mediaId: string) {
    try {
      const { error: deleteError } = await supabase
        .from("project_media")
        .delete()
        .eq("id", mediaId);

      if (deleteError) throw deleteError;

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                media: project.media.filter((media) => media.id !== mediaId),
              }
            : project
        )
      );
    } catch (err) {
      console.error("Remove project media error:", err);
      setError("Unable to remove media.");
    }
  }

  async function deleteComment(projectId: string, commentId: string) {
    if (!currentUserId) return;

    try {
      setDeletingCommentId(commentId);
      const { error: deleteError } = await supabase
        .from("project_comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) throw deleteError;

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                comments: project.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              }
            : project
        )
      );
    } catch (err) {
      console.error("Delete project comment error:", err);
      setError("Unable to delete the comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">AFRIDEV SHOWCASE</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Completed Projects
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Discover finished projects built by African developers. Like the work,
            leave feedback, and explore the final result.
          </p>
        </div>

        <Link
          to="/projects"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FolderKanban size={17} />
          Active Projects
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No completed projects yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Finished public projects will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const firstMedia = project.media[0];

            return (
              <article
                key={project.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {firstMedia?.media_type === "video" ? (
                    <video
                      src={firstMedia.media_url}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : firstMedia?.media_url ? (
                    <img
                      src={firstMedia.media_url}
                      alt={project.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={34} />
                      <span className="mt-2 text-xs">No project image</span>
                    </div>
                  )}

                  {project.media.length > 1 && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                      +{project.media.length - 1} media
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-950">
                        {project.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.owner?.full_name ||
                          project.owner?.username ||
                          "AfriDev Developer"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Completed
                      </span>
                      {project.owner_id === currentUserId && (
                        <button
                          type="button"
                          onClick={() => void deleteProject(project)}
                          disabled={deletingProjectId === project.id}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete completed project"
                          aria-label={`Delete completed project ${project.title}`}
                        >
                          {deletingProjectId === project.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.demo_url && (
                      <a
                        href={project.demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                      >
                        View Result
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {project.repository_url && (
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Repository
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <MessageCircle size={13} />
                      Comments ({project.comments.length})
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => void toggleLike(project)}
                      disabled={!currentUserId || likingId === project.id}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                        project.likedByMe
                          ? "bg-red-50 text-red-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {likingId === project.id ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Heart
                          size={17}
                          fill={project.likedByMe ? "currentColor" : "none"}
                        />
                      )}
                      {project.likeCount}
                    </button>

                    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <MessageCircle size={17} />
                      {project.comments.length}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
          <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Completed Project
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {selectedProject.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              {selectedProject.media.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedProject.media.map((media) =>
                    media.media_type === "video" ? (
                      <video
                        key={media.id}
                        src={media.media_url}
                        className="aspect-video w-full rounded-xl bg-slate-100 object-cover"
                        controls
                      />
                    ) : (
                      <img
                        key={media.id}
                        src={media.media_url}
                        alt={selectedProject.title}
                        className="aspect-video w-full rounded-xl bg-slate-100 object-cover"
                      />
                    )
                  )}
                </div>
              )}

              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {selectedProject.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedProject.demo_url && (
                  <a
                    href={selectedProject.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    View Result
                    <ExternalLink size={15} />
                  </a>
                )}
                {selectedProject.repository_url && (
                  <a
                    href={selectedProject.repository_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Repository
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>

              {selectedProject.owner_id === currentUserId && (
                <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div>
                    <h3 className="font-bold text-slate-950">Project media</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Add image or video URLs for the completed-project showcase.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                    <input
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      placeholder="https://..."
                      type="url"
                      className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <select
                      value={mediaType}
                      onChange={(event) =>
                        setMediaType(event.target.value as "image" | "video")
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void addMedia(selectedProject)}
                      disabled={!mediaUrl.trim() || savingMedia}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {savingMedia && <Loader2 size={15} className="animate-spin" />}
                      Add
                    </button>
                  </div>

                  {selectedProject.media.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedProject.media.map((media) => (
                        <div
                          key={media.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-700">
                              {media.media_url}
                            </p>
                            <p className="text-[11px] capitalize text-slate-400">
                              {media.media_type}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeMedia(selectedProject.id, media.id)}
                            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove media"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-950">
                    Comments
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedProject.comments.length}
                  </span>
                </div>

                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitComment(selectedProject);
                  }}
                >
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Share your feedback..."
                    maxLength={1000}
                    disabled={!currentUserId || commenting}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={!currentUserId || !commentText.trim() || commenting}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {commenting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Post
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  {selectedProject.comments.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No comments yet. Be the first to share feedback.
                    </p>
                  ) : (
                    selectedProject.comments.map((comment) => {
                      const canDelete = comment.developer_id === currentUserId;
                      return (
                        <div
                          key={comment.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {comment.developer?.full_name ||
                                  comment.developer?.username ||
                                  "Developer"}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(comment.created_at).toLocaleString()}
                              </p>
                            </div>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void deleteComment(
                                    selectedProject.id,
                                    comment.id
                                  )
                                }
                                disabled={deletingCommentId === comment.id}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                title="Delete comment"
                              >
                                {deletingCommentId === comment.id ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </button>
                            )}
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {comment.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompletedProjects;
