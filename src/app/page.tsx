"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FeedSourceItem, ForumPost, UserProfile } from "@/types/forum";
import AuthModal from "@/components/AuthModal";
import CreatePostModal from "@/components/CreatePostModal";
import ThreadDrawer from "@/components/ThreadDrawer";
import AddSourceModal from "@/components/AddSourceModal";
import ArticleCover from "@/components/ArticleCover";

const TOPIC_TAGS = [
  "Zero-Day",
  "Ransomware",
  "Data Breach",
  "Malware",
  "Vulnerability",
  "Patch / Advisory",
  "Phishing",
  "APT / Threat Intel",
  "Cloud & AI",
  "Forum Discussion",
];

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "NOW";
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  return `${days}D`;
}

export default function CiberNewsForumPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [sources, setSources] = useState<FeedSourceItem[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, discussions: 0 });

  // Theme & View state
  const [theme, setTheme] = useState<"carbon" | "paper">("carbon");
  const [viewMode, setViewMode] = useState<"wire" | "grid">("wire");

  // Filters & Sorts
  const [sort, setSort] = useState<string>("hot");
  const [lang, setLang] = useState<"ALL" | "EN" | "ES">("ALL");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // UI states
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  useEffect(() => {
    if (theme === "paper") {
      document.documentElement.setAttribute("data-theme", "paper");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds/sources");
      const data = await res.json();
      if (data.sources) setSources(data.sources);
    } catch {
      // ignore
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sort);
      params.set("lang", lang);
      if (selectedTag) params.set("tag", selectedTag);
      if (selectedSourceId) params.set("sourceId", selectedSourceId);
      if (bookmarkedOnly) params.set("bookmarked", "true");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
      if (data.stats) setStats(data.stats);
    } finally {
      setLoadingPosts(false);
    }
  }, [sort, lang, selectedTag, selectedSourceId, bookmarkedOnly, searchQuery]);

  useEffect(() => {
    fetchCurrentUser();
    fetchSources();
  }, [fetchCurrentUser, fetchSources]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSyncFeeds = async () => {
    setSyncing(true);
    setSyncToast("SYNCHRONIZING SYNDICATED FEEDS...");
    try {
      const res = await fetch("/api/feeds/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncToast(
          `SYNC COMPLETE — ${data.sourcesSynced} FEEDS // +${data.newPostsCount} NEW DISPATCHES`
        );
        await Promise.all([fetchPosts(), fetchSources()]);
      } else {
        setSyncToast("PARTIAL SYNC — USING CACHED ARCHIVE");
      }
    } catch {
      setSyncToast("NETWORK ERROR DURING SYNC");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncToast(null), 4500);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      handleSyncFeeds();
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = async (post: ForumPost, value: 1 | -1) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", value }),
    });

    if (res.ok) {
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, score: data.score, userVote: data.userVote }
            : p
        )
      );
    }
  };

  const handleBookmark = async (post: ForumPost) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bookmark" }),
    });

    if (res.ok) {
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isBookmarked: data.isBookmarked } : p
        )
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setBookmarkedOnly(false);
    fetchPosts();
  };

  const showEditorialFeature =
    !loadingPosts &&
    posts.length >= 4 &&
    !searchQuery &&
    !selectedTag &&
    !selectedSourceId &&
    !bookmarkedOnly &&
    sort !== "discussions";

  const leadPost = showEditorialFeature ? posts[0] : null;
  const subFeaturePosts = showEditorialFeature ? posts.slice(1, 4) : [];
  const wirePosts = showEditorialFeature ? posts.slice(4) : posts;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)]">
      {/* Top Telemetry Bar */}
      <div className="border-b border-[var(--border)] px-4 sm:px-8 py-2 font-tech text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[var(--fg)]">
              <span className="inline-block h-1.5 w-1.5 bg-[var(--accent)]" />
              WIRE ACTIVE
            </span>
            <span className="hidden sm:inline text-[var(--fg-subtle)]">/</span>
            <span className="hidden sm:inline">
              INDEXED: <strong className="text-[var(--fg)]">{stats.total}</strong>
            </span>
            <span className="hidden sm:inline text-[var(--fg-subtle)]">/</span>
            <span className="hidden sm:inline">
              CRITICAL:{" "}
              <strong className="text-[var(--accent)]">{stats.critical}</strong>
            </span>
            <span className="hidden md:inline text-[var(--fg-subtle)]">/</span>
            <span className="hidden md:inline">
              FORUM THREADS:{" "}
              <strong className="text-[var(--fg)]">{stats.discussions}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {syncToast && (
              <span className="text-[var(--accent)] font-semibold">
                {syncToast}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                setTheme(theme === "carbon" ? "paper" : "carbon")
              }
              className="hover:text-[var(--fg)] transition"
            >
              SURFACE: [{theme === "carbon" ? "CARBON" : "PAPER"}]
            </button>
            <button
              type="button"
              onClick={() => setSourceModalOpen(true)}
              className="hover:text-[var(--fg)] transition"
            >
              FEEDS [{sources.length}]
            </button>
          </div>
        </div>
      </div>

      {/* Main Masthead */}
      <header className="border-b border-[var(--border-strong)] px-4 sm:px-8 py-6">
        <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedTag("");
                setSelectedSourceId("");
                setBookmarkedOnly(false);
                setSearchQuery("");
                setSort("hot");
              }}
              className="text-left group"
            >
              <div className="font-tech text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)] mb-1">
                CYBERSECURITY INTELLIGENCE DISPATCH & ANALYST FORUM
              </div>
              <h1 className="font-editorial text-5xl sm:text-6xl tracking-tight leading-none text-[var(--fg)]">
                CiberNews<span className="text-[var(--accent)]">.</span>
              </h1>
            </button>
          </div>

          {/* Right Masthead Controls */}
          <div className="flex flex-wrap items-center gap-2.5 font-tech text-[11px] uppercase tracking-[0.1em]">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="/ SEARCH CVE, ACTOR, TOPIC..."
                className="w-52 sm:w-64 border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  ×
                </button>
              )}
            </div>

            {/* Language Selector */}
            <div className="flex border border-[var(--border-strong)]">
              {(["ALL", "EN", "ES"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2.5 py-1.5 transition ${
                    lang === code
                      ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Sync Button */}
            <button
              type="button"
              onClick={handleSyncFeeds}
              disabled={syncing}
              className="border border-[var(--border-strong)] px-3 py-1.5 text-[var(--fg)] hover:border-[var(--fg)] disabled:opacity-40 transition"
            >
              {syncing ? "SYNCING..." : "↻ SYNC"}
            </button>

            {/* New Thread Button */}
            <button
              type="button"
              onClick={() => {
                if (!user) setAuthModalOpen(true);
                else setCreateModalOpen(true);
              }}
              className="border border-[var(--fg)] bg-[var(--fg)] px-3.5 py-1.5 font-semibold text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white transition"
            >
              + SUBMIT
            </button>

            {/* User Session */}
            {user ? (
              <div className="flex items-center border border-[var(--border-strong)] px-2.5 py-1.5 gap-2">
                <span className="text-[var(--fg)] font-semibold">
                  @{user.username}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[var(--fg-subtle)] hover:text-[var(--accent)]"
                  title="Sign Out"
                >
                  [×]
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="border border-[var(--border-strong)] px-3 py-1.5 text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] transition"
              >
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Architectural Navigation & Filter Strip */}
      <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm px-4 sm:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Primary Feed Sort Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 font-tech text-[11px] uppercase tracking-[0.12em]">
            <div className="flex flex-wrap items-center gap-1 sm:gap-4">
              {[
                { id: "hot", code: "01", label: "HOT WIRE" },
                { id: "new", code: "02", label: "LATEST" },
                { id: "critical", code: "03", label: "CRITICAL & CVES" },
                { id: "top", code: "04", label: "TOP RANKED" },
                { id: "discussions", code: "05", label: "FORUM" },
              ].map((item) => {
                const active = !bookmarkedOnly && sort === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBookmarkedOnly(false);
                      setSort(item.id);
                    }}
                    className={`px-2 py-1 transition ${
                      active
                        ? "text-[var(--fg)] font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-8"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    <span className="text-[var(--fg-subtle)] mr-1">
                      {item.code}
                    </span>
                    {item.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setBookmarkedOnly(!bookmarkedOnly);
                }}
                className={`px-2 py-1 transition ${
                  bookmarkedOnly
                    ? "text-[var(--fg)] font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-8"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                <span className="text-[var(--fg-subtle)] mr-1">06</span>
                SAVED
              </button>
            </div>

            {/* Layout Mode Switch */}
            <div className="flex items-center gap-3 text-[10px]">
              <button
                type="button"
                onClick={() => setViewMode("wire")}
                className={
                  viewMode === "wire"
                    ? "text-[var(--fg)] font-semibold underline underline-offset-4"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                }
              >
                INDEX VIEW
              </button>
              <span className="text-[var(--fg-subtle)]">/</span>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "text-[var(--fg)] font-semibold underline underline-offset-4"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                }
              >
                ARCHIVE GRID
              </button>
            </div>
          </div>

          {/* Secondary Vector & Source Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-[var(--border)] py-2 font-tech text-[10px] uppercase tracking-[0.1em] no-scrollbar">
            <span className="text-[var(--fg-subtle)] shrink-0 mr-1">
              VECTOR:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag("")}
              className={`shrink-0 px-2 py-0.5 transition ${
                selectedTag === ""
                  ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              ALL
            </button>
            {TOPIC_TAGS.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(active ? "" : tag)}
                  className={`shrink-0 px-2 py-0.5 transition ${
                    active
                      ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}

            <span className="text-[var(--fg-subtle)] mx-2">|</span>
            <span className="text-[var(--fg-subtle)] shrink-0">SOURCE:</span>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="bg-transparent font-tech text-[10px] uppercase text-[var(--fg)] focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[var(--bg)] text-[var(--fg)]">
                ALL SOURCES ({sources.length})
              </option>
              {sources.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-[var(--bg)] text-[var(--fg)]"
                >
                  [{s.language}] {s.name.toUpperCase()} ({s._count?.posts ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-8">
        {loadingPosts ? (
          <div className="py-20 text-center font-tech text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            RETRIEVING INTELLIGENCE DISPATCHES...
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-[var(--border)] p-16 text-center space-y-4">
            <div className="font-editorial text-3xl text-[var(--fg)]">
              No Dispatches Match Current Query
            </div>
            <p className="font-tech text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Adjust vector filters or synchronize live RSS feeds.
            </p>
            <div className="pt-2 flex justify-center gap-3 font-tech text-xs uppercase">
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("");
                  setSelectedSourceId("");
                  setSearchQuery("");
                  setLang("ALL");
                  setBookmarkedOnly(false);
                }}
                className="border border-[var(--border-strong)] px-4 py-2 text-[var(--fg)] hover:border-[var(--fg)]"
              >
                RESET FILTERS
              </button>
              <button
                type="button"
                onClick={handleSyncFeeds}
                className="border border-[var(--fg)] bg-[var(--fg)] px-4 py-2 text-[var(--bg)]"
              >
                ↻ SYNC FEEDS
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Editorial Feature Section (Lead Dispatch + 3-Col Sub-Features) */}
            {showEditorialFeature && leadPost && (
              <section className="animate-reveal border-b border-[var(--border-strong)] pb-10 space-y-8">
                {/* 1. Lead Dispatch Split */}
                <div className="group grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left 7 Cols: Editorial Typography */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5 font-tech text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                      <span className="bg-[var(--accent)] px-1.5 py-0.5 text-white font-semibold">
                        LEAD // {leadPost.severity}
                      </span>
                      <span>[{leadPost.language}]</span>
                      <span className="text-[var(--fg)]">
                        {leadPost.source?.name || `@${leadPost.authorName}`}
                      </span>
                      <span>—</span>
                      <span>{formatRelativeTime(leadPost.publishedAt)}</span>
                      {leadPost.cveIds.map((cve) => (
                        <button
                          key={cve}
                          type="button"
                          onClick={() => setSearchQuery(cve)}
                          className="border border-[var(--accent)] px-1.5 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                        >
                          {cve}
                        </button>
                      ))}
                    </div>

                    {leadPost.url ? (
                      <a
                        href={leadPost.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block font-editorial text-4xl sm:text-5xl leading-[1.08] tracking-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                      >
                        {leadPost.title}
                      </a>
                    ) : (
                      <h2
                        onClick={() => setActiveThreadId(leadPost.id)}
                        className="cursor-pointer font-editorial text-4xl sm:text-5xl leading-[1.08] tracking-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                      >
                        {leadPost.title}
                      </h2>
                    )}

                    <p className="text-sm sm:text-base text-[var(--fg-muted)] leading-relaxed line-clamp-3">
                      {leadPost.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-5 pt-2 font-tech text-[11px] uppercase tracking-[0.12em]">
                      <button
                        type="button"
                        onClick={() => handleVote(leadPost, 1)}
                        className={`transition ${
                          leadPost.userVote === 1
                            ? "text-[var(--accent)] font-semibold"
                            : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                        }`}
                      >
                        ▲ UPVOTE [{leadPost.score}]
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveThreadId(leadPost.id)}
                        className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition"
                      >
                        DISCUSSION [{leadPost.commentCount}]
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBookmark(leadPost)}
                        className={
                          leadPost.isBookmarked
                            ? "text-[var(--fg)] font-semibold"
                            : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                        }
                      >
                        {leadPost.isBookmarked ? "★ SAVED" : "☆ SAVE"}
                      </button>

                      {leadPost.url && (
                        <a
                          href={leadPost.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[var(--fg)] hover:text-[var(--accent)] transition"
                        >
                          READ DISPATCH ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right 5 Cols: Lead Photograph Plate */}
                  <div className="lg:col-span-5">
                    <a
                      href={leadPost.url || "#"}
                      target={leadPost.url ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!leadPost.url) {
                          e.preventDefault();
                          setActiveThreadId(leadPost.id);
                        }
                      }}
                      className="block"
                    >
                      <ArticleCover
                        post={leadPost}
                        className="h-64 sm:h-72 w-full"
                      />
                    </a>
                  </div>
                </div>

                {/* 2. Three-Column Architectural Sub-Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[var(--border)] pt-8">
                  {subFeaturePosts.map((post, idx) => (
                    <article
                      key={post.id}
                      className={`group flex flex-col justify-between space-y-4 ${
                        idx > 0
                          ? "md:border-l md:border-[var(--border)] md:pl-6"
                          : ""
                      }`}
                    >
                      <div className="space-y-3">
                        <a
                          href={post.url || "#"}
                          target={post.url ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!post.url) {
                              e.preventDefault();
                              setActiveThreadId(post.id);
                            }
                          }}
                          className="block"
                        >
                          <ArticleCover post={post} className="h-44 w-full" />
                        </a>

                        <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                          <span
                            className={
                              post.severity === "CRITICAL"
                                ? "text-[var(--accent)] font-semibold"
                                : ""
                            }
                          >
                            0{idx + 2} // {post.source?.name || post.authorName} [
                            {post.language}]
                          </span>
                          <span>{formatRelativeTime(post.publishedAt)}</span>
                        </div>

                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block font-editorial text-2xl leading-[1.15] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors line-clamp-3"
                          >
                            {post.title}
                          </a>
                        ) : (
                          <h3
                            onClick={() => setActiveThreadId(post.id)}
                            className="cursor-pointer font-editorial text-2xl leading-[1.15] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors line-clamp-3"
                          >
                            {post.title}
                          </h3>
                        )}

                        <p className="text-xs text-[var(--fg-muted)] leading-relaxed line-clamp-2">
                          {post.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5 font-tech text-[10px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleVote(post, 1)}
                            className={
                              post.userVote === 1
                                ? "text-[var(--accent)] font-semibold"
                                : "hover:text-[var(--fg)]"
                            }
                          >
                            ▲ {post.score}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveThreadId(post.id)}
                            className="hover:text-[var(--fg)]"
                          >
                            THREAD [{post.commentCount}]
                          </button>
                        </div>

                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--fg)] hover:text-[var(--accent)]"
                          >
                            SOURCE ↗
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Main Intelligence Wire (Index View vs Archive Grid View) */}
            {viewMode === "grid" ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {wirePosts.map((post, idx) => {
                  const displayIndex = showEditorialFeature ? idx + 5 : idx + 1;
                  return (
                    <article
                      key={post.id}
                      className="group flex flex-col justify-between border-t border-[var(--border-strong)] pt-4 space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                          <span>
                            {String(displayIndex).padStart(3, "0")} //{" "}
                            {post.source?.name || `@${post.authorName}`}
                          </span>
                          <span
                            className={
                              post.severity === "CRITICAL"
                                ? "text-[var(--accent)] font-semibold"
                                : ""
                            }
                          >
                            {post.severity} · {formatRelativeTime(post.publishedAt)}
                          </span>
                        </div>

                        <a
                          href={post.url || "#"}
                          target={post.url ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!post.url) {
                              e.preventDefault();
                              setActiveThreadId(post.id);
                            }
                          }}
                          className="block"
                        >
                          <ArticleCover post={post} className="h-44 w-full" />
                        </a>

                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block font-editorial text-2xl leading-[1.16] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                          >
                            {post.title}
                          </a>
                        ) : (
                          <h2
                            onClick={() => setActiveThreadId(post.id)}
                            className="cursor-pointer font-editorial text-2xl leading-[1.16] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                          >
                            {post.title}
                          </h2>
                        )}

                        <p className="text-xs text-[var(--fg-muted)] leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5 font-tech text-[10px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleVote(post, 1)}
                            className={
                              post.userVote === 1
                                ? "text-[var(--accent)] font-semibold"
                                : "hover:text-[var(--fg)]"
                            }
                          >
                            ▲ {post.score}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveThreadId(post.id)}
                            className="hover:text-[var(--fg)]"
                          >
                            NOTES [{post.commentCount}]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookmark(post)}
                            className={
                              post.isBookmarked
                                ? "text-[var(--fg)] font-semibold"
                                : "hover:text-[var(--fg)]"
                            }
                          >
                            {post.isBookmarked ? "★" : "☆"}
                          </button>
                        </div>

                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--fg)] hover:text-[var(--accent)]"
                          >
                            READ ↗
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              /* Minimalist Swiss Index Wire View */
              <section className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {wirePosts.map((post, idx) => {
                  const displayIndex = showEditorialFeature ? idx + 5 : idx + 1;
                  return (
                    <article
                      key={post.id}
                      className="group grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 py-6 items-start hover:bg-[var(--bg-hover)]/50 transition px-2 -mx-2"
                    >
                      {/* Col 1-2: Tabular Index & Minimal Vote Control */}
                      <div className="sm:col-span-2 flex sm:flex-col justify-between sm:justify-start gap-2 font-tech text-[11px] uppercase tracking-[0.1em]">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[var(--fg-subtle)]">
                            {String(displayIndex).padStart(3, "0")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVote(post, 1)}
                            className={`border px-2 py-0.5 transition ${
                              post.userVote === 1
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white font-semibold"
                                : "border-[var(--border-strong)] text-[var(--fg)] hover:border-[var(--fg)]"
                            }`}
                          >
                            ▲ {post.score}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(post, -1)}
                            className={`px-1 text-[10px] transition ${
                              post.userVote === -1
                                ? "text-[var(--accent)]"
                                : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                            }`}
                            title="Downvote"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="font-tech text-[10px] text-[var(--fg-subtle)]">
                          {formatRelativeTime(post.publishedAt)} AGO · [{post.language}]
                        </div>
                      </div>

                      {/* Col 3-9: Editorial Headline, Metadata & Forum Actions */}
                      <div className="sm:col-span-7 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 font-tech text-[10px] uppercase tracking-[0.12em]">
                          {post.severity === "CRITICAL" && (
                            <span className="bg-[var(--accent)] px-1.5 py-0.5 text-white font-semibold">
                              CRITICAL
                            </span>
                          )}
                          {post.severity === "HIGH" && (
                            <span className="border border-[var(--fg)] px-1.5 py-0.5 text-[var(--fg)]">
                              HIGH
                            </span>
                          )}
                          <span className="text-[var(--fg-muted)] font-semibold">
                            {post.postType === "DISCUSSION"
                              ? `FORUM // @${post.authorName}`
                              : post.source?.name || post.authorName}
                          </span>

                          {post.cveIds.map((cve) => (
                            <button
                              key={cve}
                              type="button"
                              onClick={() => setSearchQuery(cve)}
                              className="border border-[var(--accent)] px-1.5 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                            >
                              {cve}
                            </button>
                          ))}

                          {post.tags.slice(0, 2).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setSelectedTag(selectedTag === tag ? "" : tag)
                              }
                              className="text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                            >
                              /{tag}
                            </button>
                          ))}
                        </div>

                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block font-editorial text-2xl sm:text-[26px] leading-[1.15] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                          >
                            {post.title}
                          </a>
                        ) : (
                          <h2
                            onClick={() => setActiveThreadId(post.id)}
                            className="cursor-pointer font-editorial text-2xl sm:text-[26px] leading-[1.15] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors"
                          >
                            {post.title}
                          </h2>
                        )}

                        <p className="text-xs sm:text-[13px] text-[var(--fg-muted)] leading-relaxed line-clamp-2">
                          {post.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-5 pt-1 font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                          <button
                            type="button"
                            onClick={() => setActiveThreadId(post.id)}
                            className="hover:text-[var(--fg)] transition"
                          >
                            DISCUSSION [{post.commentCount}]
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBookmark(post)}
                            className={
                              post.isBookmarked
                                ? "text-[var(--fg)] font-semibold"
                                : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                            }
                          >
                            {post.isBookmarked ? "★ SAVED" : "☆ SAVE"}
                          </button>

                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--fg)] hover:text-[var(--accent)] transition"
                            >
                              SOURCE ↗
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Col 10-12: Minimalist Architectural Image Plate */}
                      <div className="sm:col-span-3">
                        <a
                          href={post.url || "#"}
                          target={post.url ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!post.url) {
                              e.preventDefault();
                              setActiveThreadId(post.id);
                            }
                          }}
                          className="block"
                        >
                          <ArticleCover
                            post={post}
                            className="h-32 sm:h-28 w-full"
                          />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Minimalist Colophon Footer */}
      <footer className="border-t border-[var(--border)] px-4 sm:px-8 py-6 mt-16 font-tech text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span>CIBERNEWS // AUTOMATED THREAT INTELLIGENCE SYNDICATION</span>
          <span>EN & ES BILINGUAL WIRE · SQLITE ARCHIVE</span>
        </div>
      </footer>

      {/* Modals & Dossier Drawer */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          fetchPosts();
        }}
      />

      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchPosts()}
      />

      <ThreadDrawer
        postId={activeThreadId}
        user={user}
        onClose={() => setActiveThreadId(null)}
        onRequireAuth={() => setAuthModalOpen(true)}
        onPostUpdated={() => fetchPosts()}
      />

      <AddSourceModal
        isOpen={sourceModalOpen}
        sources={sources}
        onClose={() => setSourceModalOpen(false)}
        onUpdated={() => {
          fetchSources();
          fetchPosts();
        }}
      />
    </div>
  );
}
