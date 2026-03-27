import { request } from "./request"

export type Post = {
  id: number
  userId: string
  user?: { id: string; nickname: string; avatarUrl: string }
  title?: string
  content: string
  images: string[]
  petType?: string
  visibility?: string
  status?: string
  likeCount: number
  commentCount: number
  favoriteCount: number
  isFavorited?: boolean // Current user has favorited
  isLiked?: boolean // Current user has liked
  isFollowed?: boolean // Current user has followed the author
  createdAt: string
  updatedAt?: string
}

type BackendPost = {
  id: number;
  author_id: string;
  title?: string | null;
  content: string;
  pet_type?: string | null;
  visibility?: string;
  status?: string;
  like_count?: number;
  comment_count?: number;
  favorite_count?: number;
  created_at: string;
  profiles?: { id: string; nickname: string; avatar_url?: string | null } | null;
  post_media?: { id: number; type: string; url: string; cover_url?: string | null; sort_order?: number | null }[] | null;
};

function toPost(raw: BackendPost): Post {
  const user = raw.profiles
    ? {
        id: raw.profiles.id,
        nickname: raw.profiles.nickname,
        avatarUrl: raw.profiles.avatar_url || "/assets/images/mine/头像.jpg"
      }
    : undefined;

  const images = (raw.post_media || [])
    .filter(m => m && m.type === "image" && !!m.url)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map(m => m.url);

  return {
    id: raw.id,
    userId: raw.author_id,
    user,
    title: raw.title || undefined,
    content: raw.content,
    images,
    petType: raw.pet_type || undefined,
    visibility: raw.visibility,
    status: raw.status,
    likeCount: Number(raw.like_count || 0),
    commentCount: Number(raw.comment_count || 0),
    favoriteCount: Number(raw.favorite_count || 0),
    isFavorited: false,
    isLiked: false,
    isFollowed: false,
    createdAt: raw.created_at
  };
}

export async function getPosts(page = 1, pageSize = 10, type = '推荐'): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  const res = await request<{ list: BackendPost[]; page: number; pageSize: number; total: number }>({ 
    url: "/posts", 
    method: "GET", 
    data: { page, pageSize, type } 
  })
  return {
    list: (res.list || []).map(toPost),
    page: res.page,
    pageSize: res.pageSize,
    total: res.total
  }
}

export async function getMyPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  const res = await request<{ list: BackendPost[]; page: number; pageSize: number; total: number }>({ url: "/users/me/posts", method: "GET", data: { page, pageSize } })
  return {
    list: (res.list || []).map(toPost),
    page: res.page,
    pageSize: res.pageSize,
    total: res.total
  }
}

export async function getPost(id: number): Promise<Post>{
  const res = await request<BackendPost>({ url: `/posts/${id}`, method: "GET" })
  return toPost(res)
}

export async function likePost(id: number): Promise<{ ok: boolean }>{
  await request<{ ok: boolean; post_counts?: any }>({ url: `/posts/${id}/like`, method: "POST" })
  return { ok: true }
}

export async function unlikePost(id: number): Promise<{ ok: boolean }>{
  await request<{ ok: boolean; post_counts?: any }>({ url: `/posts/${id}/like`, method: "DELETE" })
  return { ok: true }
}

export async function favoritePost(id: number): Promise<{ ok: boolean }>{
  await request<{ ok: boolean; post_counts?: any }>({ url: `/posts/${id}/favorite`, method: "POST" })
  return { ok: true }
}

export async function unfavoritePost(id: number): Promise<{ ok: boolean }>{
  await request<{ ok: boolean; post_counts?: any }>({ url: `/posts/${id}/favorite`, method: "DELETE" })
  return { ok: true }
}

export async function createPost(params: {
  title?: string
  content: string
  petType?: string
  visibility?: "public" | "followers" | "private"
  location?: { name?: string; address?: string } | null
  media?: Array<{ type: "image" | "video"; url: string; coverUrl?: string; sortOrder?: number }>
}): Promise<Post> {
  const payload: any = {
    title: params.title || null,
    content: params.content,
    pet_type: params.petType || null,
    visibility: params.visibility || "public",
    location_name: params.location?.name || null,
    location_address: params.location?.address || null,
    media: (params.media || []).map((m, idx) => ({
      type: m.type,
      url: m.url,
      cover_url: m.coverUrl || null,
      sort_order: m.sortOrder != null ? m.sortOrder : idx
    }))
  }

  const res = await request<BackendPost>({ url: "/posts", method: "POST", data: payload })
  return toPost(res)
}
