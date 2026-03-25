import { request } from "./request";
import { MOCK_USERS } from "./user";

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

const MOCK = true;

// Mock data
const mockComments: Record<number, Comment[]> = {
  1: [
    {
      id: 1,
      postId: 1,
      userId: "101",
      user: {
        id: "101",
        nickname: MOCK_USERS["101"].nickname,
        avatarUrl: MOCK_USERS["101"].avatarUrl,
      },
      content: "哈哈哈哈哈哈哈我家那只也经常这样！",
      likeCount: 12,
      isLiked: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 2,
      postId: 1,
      userId: "102",
      user: {
        id: "102",
        nickname: MOCK_USERS["102"].nickname,
        avatarUrl: MOCK_USERS["102"].avatarUrl,
      },
      content: "太可爱了吧，想偷走~",
      parentId: 1,
      replyTo: {
        userId: "101",
        nickname: MOCK_USERS["101"].nickname,
      },
      likeCount: 3,
      isLiked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    }
  ]
};

export async function getComments(postId: number, page = 1, pageSize = 20): Promise<{ list: Comment[]; total: number }> {
  if (MOCK) {
    const list = mockComments[postId] || [];
    return {
      list,
      total: list.length
    };
  }
  return request({ url: `/posts/${postId}/comments`, method: "GET", data: { page, pageSize } });
}

export async function addComment(postId: number, content: string, parentId?: number): Promise<Comment> {
  if (MOCK) {
    const me = MOCK_USERS["324666"];
    return {
      id: Date.now(),
      postId,
      userId: me.id,
      user: {
        id: me.id,
        nickname: me.nickname,
        avatarUrl: me.avatarUrl,
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
