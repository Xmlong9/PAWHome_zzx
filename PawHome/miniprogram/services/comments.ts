import { request } from "./request";
import { MOCK_USERS } from "./user";
import { isMockEnabled } from "./mock";
import { resolveImageSrc } from "../utils/mediaCache";

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  user: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  content: string;
  parentId?: string;
  replyTo?: {
    userId: string;
    nickname: string;
  };
  likeCount: number;
  isLiked: boolean;
  isPinned?: boolean;
  createdAt: string;
};

const MOCK = () => isMockEnabled();

// Mock data
const mockComments: Record<string, Comment[]> = {
  1: [
    {
      id: "1",
      postId: "1",
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
      id: "2",
      postId: "1",
      userId: "102",
      user: {
        id: "102",
        nickname: MOCK_USERS["102"].nickname,
        avatarUrl: MOCK_USERS["102"].avatarUrl,
      },
      content: "太可爱了吧，想偷走~",
      parentId: "1",
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

export async function getComments(postId: string, page = 1, pageSize = 20): Promise<{ list: Comment[]; total: number }> {
  if (MOCK()) {
    const list = mockComments[String(postId)] || [];
    return {
      list,
      total: list.length
    };
  }
  return request({ url: `/posts/${encodeURIComponent(postId)}/comments`, method: "GET", data: { page, pageSize } });
}

export async function addComment(postId: string, content: string, parentId?: string): Promise<Comment> {
  if (MOCK()) {
    const me = MOCK_USERS["324666"];
    return {
      id: String(Date.now()),
      postId: String(postId),
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

export async function likeComment(commentId: string): Promise<{ ok: boolean }> {
  if (MOCK()) return { ok: true };
  return request({ url: `/comments/${encodeURIComponent(commentId)}/like`, method: "POST" });
}

export async function unlikeComment(commentId: string): Promise<{ ok: boolean }> {
  if (MOCK()) return { ok: true };
  return request({ url: `/comments/${encodeURIComponent(commentId)}/like`, method: "DELETE" });
}

export async function deleteComment(commentId: string): Promise<{ ok: boolean; deleted: number }> {
  if (MOCK()) return { ok: true, deleted: 1 };
  return request({ url: `/comments/${encodeURIComponent(commentId)}`, method: "DELETE" });
}

export async function pinComment(commentId: string, isPinned: boolean): Promise<{ ok: boolean; isPinned: boolean }> {
  if (MOCK()) return { ok: true, isPinned };
  return request({
    url: `/comments/${encodeURIComponent(commentId)}/pin`,
    method: "PUT",
    data: { isPinned }
  });
}

export type MyCommentMsg = {
  id: string
  type: string
  actorId?: string | null
  userId?: string | null
  avatarUrl: string
  nickname: string
  createdAt: number
  text: string
  commentText?: string | null
  content?: string | null
  postId?: string | null
  commentId?: string | null
  thumbUrl?: string | null
}

export async function listMyComments(page = 1, pageSize = 20): Promise<{ list: MyCommentMsg[]; total: number }> {
  const res = await request<{ list: MyCommentMsg[]; total: number }>({
    url: "/users/me/comments",
    method: "GET",
    data: { page, pageSize }
  });
  const list = res.list || [];
  const hydrated = await Promise.all(
    list.map(async (x) => ({
      ...x,
      avatarUrl: await resolveImageSrc(String(x.avatarUrl || "")),
      thumbUrl: x.thumbUrl ? await resolveImageSrc(String(x.thumbUrl || "")) : x.thumbUrl
    }))
  );
  return { ...res, list: hydrated };
}
