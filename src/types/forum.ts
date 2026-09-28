export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarColor: string;
}

export interface FeedSourceItem {
  id: string;
  name: string;
  url: string;
  siteUrl: string;
  language: "EN" | "ES";
  category: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  _count?: {
    posts: number;
  };
}

export interface ForumComment {
  id: string;
  postId: string;
  userId: string | null;
  authorName: string;
  authorRole: string;
  parentId: string | null;
  content: string;
  score: number;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  summary: string;
  content: string | null;
  authorName: string;
  postType: "NEWS" | "DISCUSSION";
  language: "EN" | "ES";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  cveIds: string[];
  tags: string[];
  score: number;
  commentCount: number;
  publishedAt: string;
  source?: {
    id: string;
    name: string;
    language: string;
    category: string;
    siteUrl: string;
  } | null;
  userVote: number;
  isBookmarked: boolean;
  comments?: ForumComment[];
}
