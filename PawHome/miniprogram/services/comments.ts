import { request } from "./request";

export type Comment = {
  id: number;
  postId: number;
  userId: number;
  user: {
    id: number;
    nickname: string;
    avatarUrl: string;
  };
  content: string;
  parentId?: number;
  replyTo?: {
    userId: number;
    nickname: string;
  };
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
};

const MOCK = true;

export async function getComments(postId: number, page = 1, pageSize = 20): Promise<{ list: Comment[]; total: number }> {
  if (MOCK) {
    const list: Comment[] = Array.from({ length: 5 }).map((_, i) => ({
      id: i + 1,
      postId,
      userId: 200 + i,
      user: {
        id: 200 + i,
        nickname: i === 0 ? "赵嘉航" : `用户${200 + i}`,
        avatarUrl: `https://picsum.photos/seed/${200 + i}/100`,
      },
      content: i === 0 ? "哈哈哈哈哈哈哈我家那只也经常这样！" : "太可爱了吧！想撸！",
      likeCount: i === 0 ? 23 : 5,
      isLiked: false,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));
    return { list, total: 46 };
  }
  return request({ url: `/posts/${postId}/comments`, method: "GET", data: { page, pageSize } });
}

export async function addComment(postId: number, content: string, parentId?: number): Promise<Comment> {
  if (MOCK) {
    return {
      id: Date.now(),
      postId,
      userId: 999,
      user: {
        id: 999,
        nickname: "我",
        avatarUrl: "https://picsum.photos/seed/me/100",
      },
      content,
      parentId,
      likeCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };
  }
  return request({ url: "/comments", method: "POST", data: { postId, content, parentId } });
}

export async function likeComment(commentId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/comments/${commentId}/like`, method: "POST" });
}

export async function unlikeComment(commentId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/comments/${commentId}/like`, method: "DELETE" });
}
