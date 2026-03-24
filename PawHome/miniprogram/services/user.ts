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
  gender: "帅哥" | "美女";
  weight: string;
  isSterilized: "是" | "否";
  birthday: string;
}

export async function getUserProfile(): Promise<UserProfile> {
  if (MOCK) {
    return {
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
    }
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
