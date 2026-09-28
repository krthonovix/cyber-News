"use client";

import React, { useState } from "react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePostModalProps) {
  const [tab, setTab] = useState<"discussion" | "link">("discussion");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<"EN" | "ES">("EN");
  const [customTag, setCustomTag] = useState("Forum Discussion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url: tab === "link" ? url : null,
          content,
          language,
          customTag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish thread.");
      } else {
        setTitle("");
        setUrl("");
        setContent("");
        onCreated();
        onClose();
      }
    } catch {
      setError("Network error while creating thread.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl border border-[var(--border-strong)] bg-[var(--bg)] p-7 text-[var(--fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
          <span className="font-tech text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            NEW DISPATCH // COMMUNITY SUBMISSION
          </span>
          <button
            onClick={onClose}
            className="font-tech text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            [ESC]
          </button>
        </div>

        <h2 className="font-editorial text-3xl tracking-tight mb-5">
          Publish Security Thread
        </h2>

        <div className="grid grid-cols-2 border border-[var(--border)] mb-5 font-tech text-[11px] uppercase tracking-[0.1em]">
          <button
            type="button"
            onClick={() => setTab("discussion")}
            className={`py-2 transition ${
              tab === "discussion"
                ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            TEXT DISCUSSION / IOCS
          </button>
          <button
            type="button"
            onClick={() => setTab("link")}
            className={`py-2 transition ${
              tab === "link"
                ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            EXTERNAL SOURCE LINK
          </button>
        </div>

        {error && (
          <div className="mb-4 border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 font-tech text-xs text-[var(--accent)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
              HEADLINE (CVE-YYYY-XXXX AUTO-DETECTED)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                tab === "discussion"
                  ? "Mitigation strategies for recent Edge Firewall RCE"
                  : "Critical Vulnerability in OpenSSH Disclosed (CVE-2026-XXXX)"
              }
              className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
            />
          </div>

          {tab === "link" && (
            <div>
              <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
                SOURCE URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
                LANGUAGE
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "EN" | "ES")}
                className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-tech text-[var(--fg)] focus:border-[var(--fg)] focus:outline-none"
              >
                <option value="EN">EN — ENGLISH</option>
                <option value="ES">ES — ESPAÑOL</option>
              </select>
            </div>
            <div>
              <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
                CLASSIFICATION
              </label>
              <select
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-tech text-[var(--fg)] focus:border-[var(--fg)] focus:outline-none"
              >
                <option value="Forum Discussion">FORUM DISCUSSION</option>
                <option value="Zero-Day">ZERO-DAY</option>
                <option value="Ransomware">RANSOMWARE</option>
                <option value="Vulnerability">VULNERABILITY</option>
                <option value="Malware">MALWARE</option>
                <option value="Data Breach">DATA BREACH</option>
                <option value="Phishing">PHISHING</option>
                <option value="Cloud & AI">CLOUD & AI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
              TECHNICAL BRIEF / IOCS
            </label>
            <textarea
              rows={5}
              required={tab === "discussion"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide technical analysis, indicators of compromise, or discussion prompt..."
              className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 font-tech text-xs uppercase tracking-[0.1em]">
            <button
              type="button"
              onClick={onClose}
              className="border border-[var(--border)] px-4 py-2 text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="border border-[var(--fg)] bg-[var(--fg)] px-5 py-2 font-semibold text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white disabled:opacity-50 transition"
            >
              {loading ? "PUBLISHING..." : "PUBLISH DISPATCH →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
