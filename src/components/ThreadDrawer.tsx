"use client";

import React, { useEffect, useState } from "react";
import { ForumComment, ForumPost, UserProfile } from "@/types/forum";
import ArticleCover from "./ArticleCover";

interface ThreadDrawerProps {
  postId: string | null;
  user: UserProfile | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onPostUpdated: () => void;
}

export default function ThreadDrawer({
  postId,
  user,
  onClose,
  onRequireAuth,
  onPostUpdated,
}: ThreadDrawerProps) {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchThread = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setPost(data.post);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchThread(postId);
      setReplyToId(null);
      setCommentText("");
    } else {
      setPost(null);
    }
  }, [postId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && postId) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [postId, onClose]);

  if (!postId) return null;

  const handleSubmitComment = async (
    e: React.FormEvent,
    parentId: string | null = null
  ) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    const text = parentId ? replyText.trim() : commentText.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          parentId,
        }),
      });
      if (res.ok) {
        if (parentId) {
          setReplyText("");
          setReplyToId(null);
        } else {
          setCommentText("");
        }
        await fetchThread(postId);
        onPostUpdated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", value: 1 }),
    });
    if (res.ok) {
      const data = await res.json();
      setPost((prev) =>
        prev ? { ...prev, score: data.score, userVote: data.userVote } : null
      );
      onPostUpdated();
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bookmark" }),
    });
    if (res.ok) {
      const data = await res.json();
      setPost((prev) =>
        prev ? { ...prev, isBookmarked: data.isBookmarked } : null
      );
      onPostUpdated();
    }
  };

  const comments: ForumComment[] = post?.comments || [];
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-[var(--border-strong)] bg-[var(--bg)] text-[var(--fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Dossier Top Bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 font-tech text-[11px] uppercase tracking-[0.12em]">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 bg-[var(--accent)]" />
            <span>DISPATCH DOSSIER // THREAD</span>
          </div>
          <button
            onClick={onClose}
            className="border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] transition"
          >
            CLOSE [ESC]
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
          {loading || !post ? (
            <div className="space-y-4 font-tech text-xs text-[var(--fg-muted)]">
              LOADING DISPATCH RECORD...
            </div>
          ) : (
            <>
              {/* Article Dossier Header */}
              <div className="space-y-5 border-b border-[var(--border)] pb-8">
                <div className="flex flex-wrap items-center gap-3 font-tech text-[11px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                  <span
                    className={
                      post.severity === "CRITICAL"
                        ? "bg-[var(--accent)] text-white px-1.5 py-0.5 font-semibold"
                        : "border border-[var(--border-strong)] px-1.5 py-0.5 text-[var(--fg)]"
                    }
                  >
                    {post.severity}
                  </span>
                  <span>{post.language}</span>
                  <span>—</span>
                  <span className="text-[var(--fg)]">
                    {post.source ? post.source.name : `@${post.authorName}`}
                  </span>
                  <span>—</span>
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <h1 className="font-editorial text-3xl sm:text-4xl leading-[1.12] tracking-tight text-[var(--fg)]">
                  {post.title}
                </h1>

                {/* CVE Identifiers & Tags */}
                <div className="flex flex-wrap gap-2 font-tech text-[10px] uppercase tracking-[0.08em]">
                  {post.cveIds.map((cve) => (
                    <a
                      key={cve}
                      href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                    >
                      {cve} ↗
                    </a>
                  ))}
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-[var(--border)] px-2 py-0.5 text-[var(--fg-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Editorial Image Plate */}
                <ArticleCover post={post} className="h-60 w-full" />

                {/* Dispatch Text */}
                <div className="text-sm leading-[1.75] text-[var(--fg-muted)] whitespace-pre-line">
                  {post.content || post.summary}
                </div>

                {/* Action Strip */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 font-tech text-[11px] uppercase tracking-[0.1em]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleVote}
                      className={`border px-3 py-1.5 transition ${
                        post.userVote === 1
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border-strong)] text-[var(--fg)] hover:border-[var(--fg)]"
                      }`}
                    >
                      ▲ UPVOTE [{post.score}]
                    </button>

                    <button
                      onClick={handleBookmark}
                      className={`border px-3 py-1.5 transition ${
                        post.isBookmarked
                          ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {post.isBookmarked ? "★ SAVED" : "☆ SAVE"}
                    </button>
                  </div>

                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-[var(--fg)] bg-[var(--fg)] px-4 py-1.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white transition"
                    >
                      OPEN SOURCE DISPATCH ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Analyst Notes / Comment Composer */}
              <div className="space-y-3">
                <div className="font-tech text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                  ANALYST DISCUSSION // {comments.length} ENTRIES
                </div>

                <form
                  onSubmit={(e) => handleSubmitComment(e, null)}
                  className="space-y-3"
                >
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      user
                        ? `Log observation as @${user.username}...`
                        : "Authenticate to append analyst notes or IOCs..."
                    }
                    className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
                  />
                  <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.1em]">
                    <span className="text-[var(--fg-subtle)]">
                      PLAIN TEXT / IOCS / TECHNICAL ANALYSIS
                    </span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="border border-[var(--fg)] bg-[var(--fg)] px-4 py-1.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white disabled:opacity-40 transition"
                    >
                      {user ? "APPEND NOTE" : "SIGN IN TO POST"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Comment Log */}
              <div className="space-y-5 pt-2">
                {rootComments.length === 0 ? (
                  <div className="border border-dashed border-[var(--border)] p-8 text-center font-tech text-xs uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                    NO ANALYST NOTES RECORDED YET.
                  </div>
                ) : (
                  rootComments.map((comment) => {
                    const replies = getReplies(comment.id);
                    return (
                      <div
                        key={comment.id}
                        className="border-t border-[var(--border)] pt-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between font-tech text-[11px]">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-[var(--fg)]">
                              @{comment.authorName}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                              [{comment.authorRole}]
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--fg-subtle)]">
                            {new Date(comment.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-[var(--fg-muted)] leading-relaxed whitespace-pre-line">
                          {comment.content}
                        </p>

                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setReplyToId(
                                replyToId === comment.id ? null : comment.id
                              )
                            }
                            className="font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                          >
                            ↳ REPLY
                          </button>
                        </div>

                        {replyToId === comment.id && (
                          <form
                            onSubmit={(e) =>
                              handleSubmitComment(e, comment.id)
                            }
                            className="mt-3 border-l border-[var(--border-strong)] pl-4 space-y-2"
                          >
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to @${comment.authorName}...`}
                              className="w-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg)] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2 font-tech text-[10px] uppercase">
                              <button
                                type="button"
                                onClick={() => setReplyToId(null)}
                                className="px-2.5 py-1 text-[var(--fg-muted)]"
                              >
                                CANCEL
                              </button>
                              <button
                                type="submit"
                                disabled={submitting}
                                className="border border-[var(--fg)] bg-[var(--fg)] px-3 py-1 text-[var(--bg)]"
                              >
                                SEND
                              </button>
                            </div>
                          </form>
                        )}

                        {replies.length > 0 && (
                          <div className="mt-3 space-y-3 border-l border-[var(--border)] pl-4">
                            {replies.map((reply) => (
                              <div key={reply.id} className="space-y-1">
                                <div className="flex items-center justify-between font-tech text-[10px]">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--fg)]">
                                      @{reply.authorName}
                                    </span>
                                    <span className="text-[var(--fg-subtle)]">
                                      [{reply.authorRole}]
                                    </span>
                                  </div>
                                  <span className="text-[var(--fg-subtle)]">
                                    {new Date(
                                      reply.createdAt
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--fg-muted)] leading-relaxed whitespace-pre-line">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
