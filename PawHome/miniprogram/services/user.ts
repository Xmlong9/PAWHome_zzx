import { request } from "./request";

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

const DEFAULT_AVATAR_URL = "/assets/images/mine/头像.jpg";

function toUserProfile(raw: any): UserProfile {
  return {
    id: raw?.id || "",
    nickname: raw?.nickname || "用户",
    avatarUrl: raw?.avatar_url || DEFAULT_AVATAR_URL,
    location: raw?.location || "",
    signature: raw?.signature || "",
    gender: (raw?.gender as any) || undefined,
    birthday: raw?.birthday || undefined,
    postCount: Number(raw?.post_count || 0),
    followingCount: Number(raw?.following_count || 0),
    followerCount: Number(raw?.follower_count || 0),
    likeCount: Number(raw?.like_count || 0)
  };
}

function parseWeightKg(value: string): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/kg/i, "").trim());
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function toPetProfile(raw: any): PetProfile {
  const weight = raw?.weight_kg != null ? `${raw.weight_kg}kg` : "";
  return {
    id: raw?.id || "",
    name: raw?.name || "",
    avatarUrl: raw?.avatar_url || "/assets/images/mine/宠物.png",
    type: raw?.type || undefined,
    breed: raw?.breed || undefined,
    gender: raw?.gender === "美女" ? "美女" : "帅哥",
    weight,
    isSterilized: raw?.is_sterilized ? "是" : "否",
    birthday: raw?.birthday ? String(raw.birthday) : ""
  };
}

export async function getUserProfile(userId?: string): Promise<UserProfile> {
  if (!userId) {
    const res = await request<any>({ url: "/users/me/profile", method: "GET" });
    return toUserProfile(res);
  }
  const res = await request<any>({ url: `/users/${encodeURIComponent(userId)}/profile`, method: "GET" });
  return toUserProfile(res);
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<{ ok: boolean }> {
  const payload: any = {};
  if (data.nickname != null) payload.nickname = data.nickname;
  if (data.avatarUrl != null) payload.avatar_url = data.avatarUrl;
  if (data.location != null) payload.location = data.location;
  if (data.signature != null) payload.signature = data.signature;
  if (data.gender != null) payload.gender = data.gender;
  if (data.birthday != null) payload.birthday = data.birthday;
  return request({ url: "/users/me/profile", method: "PUT", data: payload });
}

export async function getPetList(): Promise<PetProfile[]> {
  const res = await request<{ list: any[] }>({ url: "/pets", method: "GET", data: { page: 1, pageSize: 100 } });
  return (res.list || []).map(toPetProfile);
}

export async function getPetProfile(id?: string): Promise<PetProfile> {
  if (!id) {
    const list = await getPetList();
    if (list.length) return list[0];
    return {
      id: "",
      name: "",
      avatarUrl: "/assets/images/mine/宠物.png",
      gender: "帅哥",
      weight: "",
      isSterilized: "否",
      birthday: ""
    };
  }
  const res = await request<any>({ url: `/pets/${encodeURIComponent(id)}`, method: "GET" });
  return toPetProfile(res);
}

export async function addPetProfile(data: Omit<PetProfile, 'id'>): Promise<{ ok: boolean; data: PetProfile }> {
  const payload: any = {
    name: data.name,
    avatar_url: data.avatarUrl,
    type: data.type,
    breed: data.breed,
    gender: data.gender,
    weight_kg: parseWeightKg(data.weight),
    is_sterilized: data.isSterilized === "是",
    birthday: data.birthday
  };
  const res = await request<any>({ url: "/pets", method: "POST", data: payload });
  return { ok: true, data: toPetProfile(res) };
}

export async function updatePetProfile(id: string, data: Partial<Omit<PetProfile, "id">>): Promise<{ ok: boolean; data: PetProfile | null }> {
  const payload: any = {};
  if (data.name != null) payload.name = data.name;
  if (data.avatarUrl != null) payload.avatar_url = data.avatarUrl;
  if (data.type != null) payload.type = data.type;
  if (data.breed != null) payload.breed = data.breed;
  if (data.gender != null) payload.gender = data.gender;
  if (data.weight != null) payload.weight_kg = parseWeightKg(data.weight);
  if (data.isSterilized != null) payload.is_sterilized = data.isSterilized === "是";
  if (data.birthday != null) payload.birthday = data.birthday;

  const res = await request<any>({ url: `/pets/${encodeURIComponent(id)}`, method: "PUT", data: payload });
  const row = (res as any)?.data?.[0];
  return { ok: true, data: row ? toPetProfile(row) : null };
}

export type UserSettings = {
  pushNotice: boolean;
  interactNotice: boolean;
  homeAccess: "所有人可见" | "仅关注者可见" | "仅自己可见";
  commentAccess: "所有人" | "仅关注者" | "关闭评论";
}

function mapSettingsFromApi(raw: any): UserSettings {
  const homeAccessMap: Record<string, UserSettings["homeAccess"]> = {
    all: "所有人可见",
    followers: "仅关注者可见",
    self: "仅自己可见"
  };
  const commentAccessMap: Record<string, UserSettings["commentAccess"]> = {
    all: "所有人",
    followers: "仅关注者",
    disabled: "关闭评论"
  };
  return {
    pushNotice: !!raw?.pushNotice,
    interactNotice: !!raw?.interactNotice,
    homeAccess: homeAccessMap[String(raw?.homeAccess || "followers")] || "仅关注者可见",
    commentAccess: commentAccessMap[String(raw?.commentAccess || "all")] || "所有人"
  };
}

function mapSettingsToApi(data: Partial<UserSettings>): any {
  const homeAccessMap: Record<UserSettings["homeAccess"], string> = {
    "所有人可见": "all",
    "仅关注者可见": "followers",
    "仅自己可见": "self"
  };
  const commentAccessMap: Record<UserSettings["commentAccess"], string> = {
    "所有人": "all",
    "仅关注者": "followers",
    "关闭评论": "disabled"
  };
  const payload: any = {};
  if (data.pushNotice != null) payload.pushNotice = data.pushNotice;
  if (data.interactNotice != null) payload.interactNotice = data.interactNotice;
  if (data.homeAccess != null) payload.homeAccess = homeAccessMap[data.homeAccess];
  if (data.commentAccess != null) payload.commentAccess = commentAccessMap[data.commentAccess];
  return payload;
}

export async function getUserSettings(): Promise<UserSettings> {
  const res = await request<any>({ url: "/users/me/settings", method: "GET" });
  return mapSettingsFromApi(res);
}

export async function updateUserSettings(data: Partial<UserSettings>): Promise<{ ok: boolean }> {
  return request({ url: "/users/me/settings", method: "PUT", data: mapSettingsToApi(data) });
}

export async function followUser(userId: string): Promise<{ ok: boolean }> {
  return request({ url: `/users/${encodeURIComponent(userId)}/follow`, method: "POST" });
}

export async function unfollowUser(userId: string): Promise<{ ok: boolean }> {
  return request({ url: `/users/${encodeURIComponent(userId)}/follow`, method: "DELETE" });
}
