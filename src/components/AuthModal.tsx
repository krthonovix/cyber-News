"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types/forum";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SOC ANALYST");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          username,
          email,
          password,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
      } else if (data.user) {
        onSuccess(data.user);
        onClose();
      }
    } catch {
      setError("Network error while authenticating.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUser: string, demoPass: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: demoUser,
          password: demoPass,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onSuccess(data.user);
        onClose();
      } else {
        setError(data.error || "Demo login failed");
      }
    } catch {
      setError("Network error");
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
        className="relative w-full max-w-md border border-[var(--border-strong)] bg-[var(--bg)] p-7 text-[var(--fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
          <div className="font-tech text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            AUTHENTICATION // ACCESS CONTROL
          </div>
          <button
            onClick={onClose}
            className="font-tech text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            [ESC]
          </button>
        </div>

        <h2 className="font-editorial text-3xl tracking-tight mb-1">
          {mode === "login" ? "Operator Sign In" : "Register Analyst Identity"}
        </h2>
        <p className="text-xs text-[var(--fg-muted)] mb-6">
          Authenticate to vote on dispatches, save advisories, and post threads.
        </p>

        {/* Instant Demo Access */}
        <div className="mb-6 border border-[var(--border)] bg-[var(--bg-elevated)] p-3.5">
          <div className="font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-2.5">
            QUICK DEMO CREDENTIALS
          </div>
          <div className="grid grid-cols-2 gap-2 font-tech text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("analyst", "cyber123")}
              disabled={loading}
              className="border border-[var(--border-strong)] py-1.5 text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition"
            >
              @ANALYST ↗
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("zero_cool", "admin123")}
              disabled={loading}
              className="border border-[var(--border-strong)] py-1.5 text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition"
            >
              @ZERO_COOL ↗
            </button>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 border border-[var(--border)] mb-5 font-tech text-[11px] uppercase tracking-[0.1em]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`py-2 transition ${
              mode === "login"
                ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`py-2 transition ${
              mode === "register"
                ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            REGISTER
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
              HANDLE {mode === "login" && "/ EMAIL"}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="analyst"
              className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
                  EMAIL (OPTIONAL)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@domain.local"
                  className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
                  ROLE DESIGNATION
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] focus:border-[var(--fg)] focus:outline-none"
                >
                  <option value="SOC ANALYST">SOC ANALYST</option>
                  <option value="RED TEAM">RED TEAM</option>
                  <option value="THREAT RESEARCHER">THREAT RESEARCHER</option>
                  <option value="SEC ENGINEER">SEC ENGINEER</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block font-tech text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)] mb-1.5">
              PASSPHRASE
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:border-[var(--fg)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-[var(--fg)] bg-[var(--fg)] py-2.5 font-tech text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white disabled:opacity-50 transition"
          >
            {loading
              ? "AUTHENTICATING..."
              : mode === "login"
              ? "AUTHENTICATE →"
              : "CREATE IDENTITY →"}
          </button>
        </form>
      </div>
    </div>
  );
}
