import { request } from "./request";

const MOCK = true;

export type UserProfile = {
  id: string;
  nickname: string;
  avatarUrl: string;
  location: string;
  signature?: string;
  gender?: "男" | "女";
  birthday?: string;
  postCount: number;
  followingCount: number;
  followerCount: number;
  likeCount: number;
}

export type PetProfile = {
  id: string;
  name: string;
  avatarUrl: string;
  type?: string;
  breed?: string;
  gender: "帅哥" | "美女";
  weight: string;
  isSterilized: "是" | "否";
  birthday: string;
}

export const MOCK_USERS: Record<string, UserProfile> = {
  "324666": {
    id: "324666",
    nickname: "淡水鱼",
    avatarUrl: "/assets/images/mine/头像.jpg",
    location: "浙江杭州",
    signature: "热爱生活，善待动物，希望能在这里认识更多爱宠物的朋友~",
    gender: "男",
    birthday: "2000-01-01",
    postCount: 128,
    followingCount: 256,
    followerCount: 512,
    likeCount: 1024
  },
  "101": {
    id: "101",
    nickname: "赵嘉航",
    avatarUrl: "https://picsum.photos/seed/user2/100",
    location: "北京",
    signature: "一名普通的铲屎官，家里有一只调皮的狗狗。",
    gender: "男",
    birthday: "1995-05-15",
    postCount: 42,
    followingCount: 128,
    followerCount: 356,
    likeCount: 888
  },
  "102": {
    id: "102",
    nickname: "李华",
    avatarUrl: "https://picsum.photos/seed/user3/100",
    location: "上海",
    signature: "猫咪就是正义！",
    gender: "女",
    birthday: "1998-08-08",
    postCount: 56,
    followingCount: 200,
    followerCount: 890,
    likeCount: 2341
  },
  "103": {
    id: "103",
    nickname: "王小明",
    avatarUrl: "https://picsum.photos/seed/user4/100",
    location: "广州",
    signature: "爬宠爱好者，欢迎交流。",
    gender: "男",
    birthday: "1992-12-12",
    postCount: 12,
    followingCount: 45,
    followerCount: 120,
    likeCount: 340
  },
  "104": {
    id: "104",
    nickname: "张伟",
    avatarUrl: "https://picsum.photos/seed/user5/100",
    location: "深圳",
    signature: "专注水族造景10年。",
    gender: "男",
    birthday: "1988-03-03",
    postCount: 89,
    followingCount: 300,
    followerCount: 1500,
    likeCount: 5600
  }
};

export async function getUserProfile(userId?: string): Promise<UserProfile> {
  if (MOCK) {
    if (userId && MOCK_USERS[userId]) {
      return MOCK_USERS[userId];
    }
    // 兼容名字匹配（赵嘉航）
    if (userId === '赵嘉航') {
       return MOCK_USERS["101"];
    }
    
    // 默认返回自己（淡水鱼）
    return MOCK_USERS["324666"];
  }
  return request({ url: "/users/me", method: "GET" });
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: "/users/me", method: "PUT", data });
}

let mockPets: PetProfile[] = [
  {
    id: "pet_1",
    name: "涛涛",
    avatarUrl: "/assets/images/mine/宠物.png",
    type: "水族",
    breed: "热带鱼",
    gender: "帅哥",
    weight: "4kg",
    isSterilized: "是",
    birthday: "2022.5.20"
  }
];

export async function getPetList(): Promise<PetProfile[]> {
  if (MOCK) {
    return [...mockPets];
  }
  return request({ url: "/users/me/pets", method: "GET" });
}

export async function getPetProfile(id?: string): Promise<PetProfile> {
  if (MOCK) {
    if (id) {
      return mockPets.find(p => p.id === id) || mockPets[0];
    }
    return mockPets[0];
  }
  return request({ url: "/users/me/pet", method: "GET", data: { id } });
}

export async function addPetProfile(data: Omit<PetProfile, 'id'>): Promise<{ ok: boolean; data: PetProfile }> {
  if (MOCK) {
    const newPet: PetProfile = {
      ...data,
      id: `pet_${Date.now()}`
    };
    mockPets.push(newPet);
    return { ok: true, data: newPet };
  }
  return request({ url: "/users/me/pets", method: "POST", data });
}

export async function updatePetProfile(id: string, data: Partial<Omit<PetProfile, "id">>): Promise<{ ok: boolean; data: PetProfile | null }> {
  if (MOCK) {
    const index = mockPets.findIndex(p => p.id === id);
    if (index === -1) {
      return { ok: false, data: null };
    }
    mockPets[index] = {
      ...mockPets[index],
      ...data
    };
    return { ok: true, data: mockPets[index] };
  }
  return request({ url: `/users/me/pets/${id}`, method: "PUT", data });
}

export type UserSettings = {
  pushNotice: boolean;
  interactNotice: boolean;
  homeAccess: "所有人可见" | "仅关注者可见" | "仅自己可见";
  commentAccess: "所有人" | "仅关注者" | "关闭评论";
}

let mockSettings: UserSettings = {
  pushNotice: true,
  interactNotice: true,
  homeAccess: "仅关注者可见",
  commentAccess: "所有人"
};

export async function getUserSettings(): Promise<UserSettings> {
  if (MOCK) {
    return mockSettings;
  }
  return request({ url: "/users/me/settings", method: "GET" });
}

export async function updateUserSettings(data: Partial<UserSettings>): Promise<{ ok: boolean }> {
  if (MOCK) {
    mockSettings = { ...mockSettings, ...data };
    return { ok: true };
  }
  return request({ url: "/users/me/settings", method: "PUT", data });
}

export async function followUser(userId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/users/${userId}/follow`, method: "POST" });
}

export async function unfollowUser(userId: number): Promise<{ ok: boolean }> {
  if (MOCK) return { ok: true };
  return request({ url: `/users/${userId}/follow`, method: "DELETE" });
}
