"use client";

import React, { useState } from "react";
import { ForumPost } from "@/types/forum";
import { getFallbackArticleImage } from "@/lib/fallbackImages";

interface ArticleCoverProps {
  post: ForumPost;
  className?: string;
}

function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function ArticleCover({
  post,
  className = "h-44 w-full",
}: ArticleCoverProps) {
  const [useFallback, setUseFallback] = useState(false);

  const domain =
    getDomain(post.url) || getDomain(post.source?.siteUrl) || post.authorName;

  const fallbackPhoto = getFallbackArticleImage(
    post.id || post.title,
    post.tags
  );

  const activeSrc =
    !useFallback && post.imageUrl ? post.imageUrl : fallbackPhoto;

  return (
    <div
      className={`relative overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] select-none ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSrc}
        alt={post.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useFallback) setUseFallback(true);
        }}
        className="h-full w-full object-cover object-center grayscale-[18%] contrast-[1.04] transition-all duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.03]"
      />

      {/* Subtle bottom gradient & publisher domain caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 py-1.5 font-tech text-[9px] uppercase tracking-[0.14em] text-white/90">
        <span className="truncate max-w-[75%]">{domain}</span>
        <span>{post.language}</span>
      </div>
    </div>
  );
}
