import { request } from "./request"
import { MOCK_USERS } from "./user"
import { isMockEnabled } from "./mock"

export type Post = {
  id: string
  userId: string
  user?: { id: string; nickname: string; avatarUrl: string }
  title?: string
  content: string
  location?: string
  images: string[]
  videoUrl?: string
  petType?: string
  visibility?: string
  status?: string
  likeCount: number
  commentCount: number
  favoriteCount: number
  viewCount?: number
  isFavorited?: boolean // Current user has favorited
  isLiked?: boolean // Current user has liked
  isFollowed?: boolean // Current user has followed the author
  isPinned?: boolean
  createdAt: string
  updatedAt?: string
}

const MOCK = () => isMockEnabled()

// 全局缓存已经生成的 mock 帖子，保证内外一致
let cachedPosts: Post[] = [];

// Mock data generator
const generateMockPosts = (page: number, pageSize: number, type?: string): Post[] => {
  if (cachedPosts.length > 0 && page === 1) {
    // 如果已经生成过，并且请求第一页，就直接返回缓存的前几个，保证详情和列表一致
    return cachedPosts.slice(0, pageSize);
  }

  const baseId = cachedPosts.length;
  const now = new Date();
  const userIds = Object.keys(MOCK_USERS);
  
  // Create a base list
  const list = Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => {
    const id = String(baseId + i + 1);
    let timeOffset;

    if (type === '最新') {
      timeOffset = i * 1000 * 60 * 30; // 30 mins step
    } else {
      const randomHours = (id * 17) % 72; // 0 to 72 hours
      timeOffset = randomHours * 1000 * 60 * 60;
    }

    const createdAt = new Date(now.getTime() - timeOffset).toISOString();
    
    // Varying content structure
    const hasImage = i % 3 !== 0; // Some don't have images
    const images = hasImage ? [`https://picsum.photos/seed/${id}/400/300`] : [];
    
    // 从 mock users 中随机选一个用户，或者根据 index 固定选
    const userId = userIds[i % userIds.length];
    const user = MOCK_USERS[userId];

    return {
      id,
      userId,
      user: { 
        id: userId, 
        nickname: user.nickname, 
        avatarUrl: user.avatarUrl
      },
      title: i % 2 === 0 ? "哈哈哈哈好可爱的猫猫 #猫猫探头" : undefined,
      content: i % 2 === 0 
        ? "哈哈哈哈好可爱的猫猫 #猫猫探头" 
        : "家里养的涛涛又不听话了 :( 真的不知道该怎么办才好，大家有什么好办法吗？在线等挺急的。",
      location: i % 2 === 0 ? "杭州" : "",
      images,
      petType: i % 2 === 0 ? "cat" : "dog",
      visibility: "public",
      status: "approved",
      likeCount: 200 + i * 10,
      commentCount: 40 + i,
      favoriteCount: i % 4 === 0 ? Math.max(1, i) : i, // If favorited (i % 4 === 0), ensure at least 1
      isFavorited: i % 4 === 0,
      isLiked: i % 3 === 0,
      isFollowed: i % 5 === 0,
      createdAt
    };
  });

  if (type === '最新') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } 
  else if (type === '推荐') {
     list.sort((a, b) => b.likeCount - a.likeCount);
  }

  cachedPosts = [...cachedPosts, ...list];
  return list;
};

export async function getPosts(page = 1, pageSize = 10, tag = '推荐'): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize, tag);
    return { list, page, pageSize, total: 100 }
  }
  let serverType = "all"
  if (tag === "猫咪") serverType = "cat"
  if (tag === "狗狗") serverType = "dog"
  let tab = "recommend"
  if (tag === "关注") tab = "following"
  if (tag === "最新") tab = "latest"
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ 
    url: "/posts", 
    method: "GET", 
    data: { page, pageSize, type: serverType, tab } 
  })
  return res
}

export async function getMyPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize);
    return { list, page, pageSize, total: 20 }
  }
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ url: "/users/me/posts", method: "GET", data: { page, pageSize } })
  return res
}

export async function getUserPosts(userId: string, page = 1, pageSize = 10): Promise<{ list: Post[]; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize)
    return { list, total: 20 }
  }
  return request({ url: `/users/${encodeURIComponent(userId)}/posts`, method: "GET", data: { page, pageSize } })
}

export async function getUserLikedPosts(userId: string, page = 1, pageSize = 10): Promise<{ list: Post[]; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize)
    return { list, total: 20 }
  }
  return request({ url: `/users/${encodeURIComponent(userId)}/likes/posts`, method: "GET", data: { page, pageSize } })
}

export async function getUserFavoritePosts(userId: string, page = 1, pageSize = 10): Promise<{ list: Post[]; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize)
    return { list, total: 20 }
  }
  return request({ url: `/users/${encodeURIComponent(userId)}/favorites/posts`, method: "GET", data: { page, pageSize } })
}

export async function getMyHistoryPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; total: number }>{
  if (MOCK()) {
    const list = generateMockPosts(page, pageSize)
    return { list, total: 20 }
  }
  return request({ url: "/users/me/history/posts", method: "GET", data: { page, pageSize } })
}

export async function getPost(id: string): Promise<Post>{
  if (MOCK()) {
    const numericId = Number(id)
    let post = cachedPosts.find(p => p.id === String(id));
    
    if (!post) {
      // 如果直接从详情进，缓存没有，则生成一个对应的
      const userIds = Object.keys(MOCK_USERS);
      const userId = userIds[(numericId || 0) % userIds.length];
      const user = MOCK_USERS[userId];
      
      post = {
        id: String(id),
        userId,
        user: { 
          id: userId, 
          nickname: user.nickname, 
          avatarUrl: user.avatarUrl
        },
        title: "这是一个分享帖",
        content: "这是一段很长很长的文字。今天天气真好，带猫猫出去晒了晒太阳。家里养的涛涛又不听话了 :( 真的不知道该怎么办才好，大家有什么好办法吗？",
        location: "杭州",
        images: [`https://picsum.photos/seed/${numericId || 0}/600/400`],
        petType: "cat",
        visibility: "public",
        status: "approved",
        likeCount: 238,
        commentCount: 46,
        favoriteCount: 102,
        isFavorited: false,
        isLiked: true,
        isFollowed: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      };
    } else {
      // 如果是从缓存拿的，可能为了展示更好看，给它换个大图，但不改变发帖人
      post = { ...post };
      if (post.images && post.images.length > 0) {
        post.images = [`https://picsum.photos/seed/${post.id}/600/400`];
      }
      post.content = post.content + "\n这是一个非常可爱的猫咪，它的名字叫咪咪，今年两岁了。它非常喜欢吃鱼，也喜欢玩球。希望能找到更多喜欢猫咪的朋友一起交流！";
    }
    
    return post;
  }
  const res = await request<Post>({ url: `/posts/${encodeURIComponent(id)}`, method: "GET" })
  return res
}

export async function likePost(id: string): Promise<{ ok: boolean }>{
  if (MOCK()) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${encodeURIComponent(id)}/like`, method: "POST" })
  return res
}

export async function unlikePost(id: string): Promise<{ ok: boolean }>{
  if (MOCK()) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${encodeURIComponent(id)}/like`, method: "DELETE" })
  return res
}

export async function favoritePost(id: string): Promise<{ ok: boolean }>{
  if (MOCK()) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${encodeURIComponent(id)}/favorite`, method: "POST" })
  return res
}

export async function unfavoritePost(id: string): Promise<{ ok: boolean }>{
  if (MOCK()) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${encodeURIComponent(id)}/favorite`, method: "DELETE" })
  return res
}

export async function createPost(data: {
  content: string
  images?: string[]
  videoUrl?: string
  coverUrl?: string
  location?: string
  visibility?: string
  type?: string
}): Promise<Post> {
  if (MOCK()) {
    const userId = Object.keys(MOCK_USERS)[0]
    const user = MOCK_USERS[userId]
    return {
      id: String(Date.now()),
      userId,
      user: { id: userId, nickname: user.nickname, avatarUrl: user.avatarUrl },
      title: null,
      content: data.content,
      location: data.location,
      images: data.images || (data.coverUrl ? [data.coverUrl] : []),
      videoUrl: data.videoUrl,
      petType: data.type || "all",
      visibility: data.visibility || "public",
      status: "approved",
      likeCount: 0,
      commentCount: 0,
      favoriteCount: 0,
      isLiked: false,
      isFavorited: false,
      isFollowed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
  return request({ url: "/posts", method: "POST", data })
}

export async function updatePost(
  id: string,
  data: { content: string; visibility?: "public" | "followers" | "private" }
): Promise<Post> {
  if (MOCK()) {
    const post = cachedPosts.find((x) => x.id === String(id))
    if (post) {
      post.content = data.content
      post.updatedAt = new Date().toISOString()
      return { ...post }
    }
    return getPost(id)
  }
  return request({ url: `/posts/${encodeURIComponent(id)}`, method: "PUT", data })
}

export async function deletePost(id: string): Promise<{ ok: boolean }> {
  if (MOCK()) {
    cachedPosts = cachedPosts.filter((x) => x.id !== String(id))
    return { ok: true }
  }
  return request({ url: `/posts/${encodeURIComponent(id)}`, method: "DELETE" })
}

export type ShareTarget = {
  id: string
  nickname: string
  avatarUrl: string
  group: "mutual" | "following" | "follower"
}

export async function getPostShareTargets(postId: string): Promise<{ list: ShareTarget[] }> {
  if (MOCK()) {
    const ids = Object.keys(MOCK_USERS).slice(0, 8)
    return {
      list: ids.map((id, index) => ({
        id,
        nickname: MOCK_USERS[id].nickname,
        avatarUrl: MOCK_USERS[id].avatarUrl,
        group: index % 3 === 0 ? "mutual" : index % 3 === 1 ? "following" : "follower"
      }))
    }
  }
  return request({ url: `/posts/${encodeURIComponent(postId)}/share-targets`, method: "GET" })
}

export async function getPostShareLink(postId: string): Promise<{ path: string; shortUrl: string; trace: string }> {
  if (MOCK()) {
    const userId = wx.getStorageSync("userId") || "mock-user"
    const trace = String(Date.now()).slice(-8)
    return {
      path: `/pages/post-detail/index?id=${postId}&from=${userId}&trace=${trace}`,
      shortUrl: `https://pawhome.app/p/${String(postId).slice(0, 8)}?u=${String(userId).slice(0, 8)}&t=${trace}`,
      trace
    }
  }
  return request({ url: `/posts/${encodeURIComponent(postId)}/share-link`, method: "GET" })
}

export async function pinPost(postId: string, isPinned: boolean): Promise<{ ok: boolean; isPinned: boolean }> {
  if (MOCK()) return { ok: true, isPinned }
  return request({
    url: `/posts/${encodeURIComponent(postId)}/pin`,
    method: "PUT",
    data: { isPinned }
  })
}
