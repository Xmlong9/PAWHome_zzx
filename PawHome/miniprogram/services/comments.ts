import { request } from "./request";

export type Comment = {
  id: number;
  postId: number;
  userId: string;
  user: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  content: string;
  parentId?: number;
  replyTo?: {
    userId: string;
    nickname: string;
  };
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
};

type BackendComment = {
  id: number;
  post_id: number;
  author_id: string;
  parent_id?: number | null;
  content: string;
  like_count?: number;
  created_at: string;
  profiles?: { id: string; nickname: string; avatar_url?: string | null } | null;
};

function toComment(raw: BackendComment): Comment {
  return {
    id: raw.id,
    postId: raw.post_id,
    userId: raw.author_id,
    user: {
      id: raw.profiles?.id || raw.author_id,
      nickname: raw.profiles?.nickname || "用户",
      avatarUrl: raw.profiles?.avatar_url || "/assets/images/mine/头像.jpg"
    },
    content: raw.content,
    parentId: raw.parent_id || undefined,
    likeCount: Number(raw.like_count || 0),
    isLiked: false,
    createdAt: raw.created_at
  };
}

export async function getComments(postId: number, page = 1, pageSize = 20): Promise<{ list: Comment[]; total: number }> {
  const res = await request<{ list: BackendComment[]; total: number }>({
    url: `/posts/${postId}/comments`,
    method: "GET",
    data: { page, pageSize }
  });
  return {
    list: (res.list || []).map(toComment),
    total: Number(res.total || 0)
  };
}

export async function addComment(postId: number, content: string, parentId?: number): Promise<Comment> {
  const res = await request<{ comment: BackendComment | null }>({
    url: `/posts/${postId}/comments`,
    method: "POST",
    data: { content, parent_id: parentId || null }
  });
  if (!res.comment) {
    throw new Error("评论创建失败");
  }
  return toComment(res.comment);
}

export async function likeComment(commentId: number): Promise<{ ok: boolean }> {
  return request({ url: `/comments/${commentId}/like`, method: "POST" });
}

export async function unlikeComment(commentId: number): Promise<{ ok: boolean }> {
  return request({ url: `/comments/${commentId}/like`, method: "DELETE" });
}
