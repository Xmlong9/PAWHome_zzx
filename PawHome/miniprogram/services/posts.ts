import { request } from "./request"

export type Post = {
  id: number
  userId: number
  user?: { id: number; nickname: string; avatarUrl: string }
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

const MOCK = true

// Mock data generator
const generateMockPosts = (page: number, pageSize: number, type?: string): Post[] => {
  const baseId = (page - 1) * pageSize;
  const now = new Date();
  
  // Create a base list
  const list = Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => {
    const id = baseId + i + 1;
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
    
    return {
      id,
      userId: 100 + i,
      user: { 
        id: 100 + i, 
        nickname: i % 2 === 0 ? "淡水鱼鱼鱼鱼鱼鱼鱼" : "赵嘉航", 
        avatarUrl: i % 2 === 0 ? "https://picsum.photos/seed/user1/100" : "https://picsum.photos/seed/user2/100" 
      },
      title: i % 2 === 0 ? "哈哈哈哈好可爱的猫猫 #猫猫探头" : undefined,
      content: i % 2 === 0 
        ? "哈哈哈哈好可爱的猫猫 #猫猫探头" 
        : "家里养的涛涛又不听话了 :( 真的不知道该怎么办才好，大家有什么好办法吗？在线等挺急的。",
      images,
      petType: i % 2 === 0 ? "cat" : "dog",
      visibility: "public",
      status: "approved",
      likeCount: 200 + i * 10,
      commentCount: 40 + i,
      favoriteCount: i,
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

  return list;
};

export async function getPosts(page = 1, pageSize = 10, type = '推荐'): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK) {
    const list = generateMockPosts(page, pageSize, type);
    return { list, page, pageSize, total: 100 }
  }
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ 
    url: "/posts", 
    method: "GET", 
    data: { page, pageSize, type } 
  })
  return res
}

export async function getMyPosts(page = 1, pageSize = 10): Promise<{ list: Post[]; page: number; pageSize: number; total: number }>{
  if (MOCK) {
    const list = generateMockPosts(page, pageSize);
    return { list, page, pageSize, total: 20 }
  }
  const res = await request<{ list: Post[]; page: number; pageSize: number; total: number }>({ url: "/users/me/posts", method: "GET", data: { page, pageSize } })
  return res
}

export async function getPost(id: number): Promise<Post>{
  if (MOCK) {
    const post = generateMockPosts(1, 1)[0];
    post.id = Number(id);
    post.images = [`https://picsum.photos/seed/${id}/600/400`]; // Larger image for detail
    post.content = "哈哈哈哈好可爱的猫猫 #猫猫探头\n这是一个非常可爱的猫咪，它的名字叫咪咪，今年两岁了。它非常喜欢吃鱼，也喜欢玩球。希望能找到更多喜欢猫咪的朋友一起交流！";
    return post;
  }
  const res = await request<Post>({ url: `/posts/${id}`, method: "GET" })
  return res
}

export async function likePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/like`, method: "POST" })
  return res
}

export async function unlikePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/like`, method: "DELETE" })
  return res
}

export async function favoritePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/favorite`, method: "POST" })
  return res
}

export async function unfavoritePost(id: number): Promise<{ ok: boolean }>{
  if (MOCK) return { ok: true }
  const res = await request<{ ok: boolean }>({ url: `/posts/${id}/favorite`, method: "DELETE" })
  return res
}
