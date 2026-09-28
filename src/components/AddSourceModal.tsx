"use client";

import React, { useState } from "react";
import { FeedSourceItem } from "@/types/forum";

interface AddSourceModalProps {
  isOpen: boolean;
  sources: FeedSourceItem[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function AddSourceModal({
  isOpen,
  sources,
  onClose,
  onUpdated,
}: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<"EN" | "ES">("EN");
  const [category, setCategory] = useState("Threat Intel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/feeds/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, language, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add RSS feed");
      } else {
        setName("");
        setUrl("");
        onUpdated();
      }
    } catch {
      setError("Network error while adding feed.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSource = async (source: FeedSourceItem) => {
    await fetch("/api/feeds/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, enabled: !source.enabled }),
    });
    onUpdated();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col border border-[var(--border-strong)] bg-[var(--bg)] p-7 text-[var(--fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
          <span className="font-tech text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            SYNDICATION // RSS & ATOM FEEDS
          </span>
          <button
            onClick={onClose}
            className="font-tech text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            [ESC]
          </button>
        </div>

        <h2 className="font-editorial text-3xl tracking-tight mb-5">
          Intelligence Feed Directory
        </h2>

        {/* Add Feed Form */}
        <form
          onSubmit={handleAddSource}
          className="mb-6 border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-3"
        >
          <div className="font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            REGISTER NEW RSS / ATOM ENDPOINT
          </div>
          {error && (
            <div className="border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 font-tech text-xs text-[var(--accent)]">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Publisher Name"
              className="border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
            />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://domain.com/feed.xml"
              className="border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none sm:col-span-2"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-tech text-[11px]">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "EN" | "ES")}
                className="border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5 text-[var(--fg)]"
              >
                <option value="EN">EN</option>
                <option value="ES">ES</option>
              </select>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className="border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5 text-[var(--fg)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="border border-[var(--fg)] bg-[var(--fg)] px-4 py-1.5 font-semibold uppercase tracking-[0.1em] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white disabled:opacity-50 transition"
            >
              {loading ? "SYNCING..." : "+ ADD ENDPOINT"}
            </button>
          </div>
        </form>

        {/* Sources Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
          {sources.map((src) => (
            <div
              key={src.id}
              className="flex items-center justify-between py-3 px-2"
            >
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2.5">
                  <span className="font-tech text-[10px] border border-[var(--border-strong)] px-1.5 py-0.5 text-[var(--fg-muted)]">
                    {src.language}
                  </span>
                  <span className="text-sm font-medium text-[var(--fg)] truncate">
                    {src.name}
                  </span>
                  <span className="font-tech text-[11px] text-[var(--fg-subtle)]">
                    [{src._count?.posts ?? 0}]
                  </span>
                </div>
                <div className="font-tech text-[10px] text-[var(--fg-subtle)] truncate mt-0.5">
                  {src.url}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSource(src)}
                className={`font-tech text-[10px] uppercase tracking-[0.12em] border px-3 py-1 transition ${
                  src.enabled
                    ? "border-[var(--fg)] text-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--fg-subtle)]"
                }`}
              >
                {src.enabled ? "ACTIVE" : "PAUSED"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
