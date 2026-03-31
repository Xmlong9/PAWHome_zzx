import { createPost } from "../../services/posts"
import { uploadFile } from "../../services/upload"
import { getPetList } from "../../services/user"
import { navigateBackWithTransition } from "../../utils/transition"

Page({
  data: {
    statusBarHeight: 0,
    postType: 'image', // 'image' | 'video' | 'qa'
    content: '',
    mediaList: [] as WechatMiniprogram.MediaFile[],
    topic: '',
    location: null as { name: string; address: string } | null,
    pet: '',
    petBreed: '',
    petRawType: '',
    petType: "all" as "all" | "cat" | "dog",
    petTypeText: "不分类",
    taggedPetType: "" as "" | "cat" | "dog",
    visibility: 'public', // 'public' | 'followers' | 'private'
    visibilityText: '所有人可见'
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: sysInfo.statusBarHeight + 44
    });
  },

  goBack() {
    navigateBackWithTransition()
  },

  switchType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type;
    this.setData({ postType: type });
    // Clear media if switching types might cause conflict, or keep it.
    // For simplicity, let's keep media but warn if video vs image conflict arises (wx.chooseMedia handles this).
  },

  onContentInput(e: WechatMiniprogram.Input) {
    this.setData({ content: e.detail.value });
  },

  chooseMedia() {
    const { postType, mediaList } = this.data;
    const count = postType === "video" ? 1 : 9 - mediaList.length;
    
    if (count <= 0) return;

    let mediaType: ('image' | 'video')[] = ['image', 'video'];
    if (postType === 'image') mediaType = ['image'];
    if (postType === 'video') mediaType = ['video'];

    wx.chooseMedia({
      count,
      mediaType,
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (postType === "video") {
          const v = res.tempFiles.find((f: any) => f.fileType === "video")
          this.setData({ mediaList: v ? [v] : [] })
          return
        }
        this.setData({ mediaList: [...this.data.mediaList, ...res.tempFiles] });
      }
    });
  },

  previewMedia(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.mediaList[index];
    
    if (item.fileType === 'video') {
      // For video, we might want a video player or just use native preview
      // wx.previewMedia is available for both
      wx.previewMedia({
        sources: this.data.mediaList.map(m => ({
          url: m.tempFilePath,
          type: m.fileType
        })),
        current: index
      });
    } else {
      wx.previewImage({
        current: item.tempFilePath,
        urls: this.data.mediaList.filter(m => m.fileType === 'image').map(m => m.tempFilePath)
      });
    }
  },

  deleteMedia(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.mediaList];
    list.splice(index, 1);
    this.setData({ mediaList: list });
  },

  // Mock options
  chooseTopic() {
    wx.showActionSheet({
      itemList: ['#猫猫探头', '#修勾日常', '#今日份可爱', '#养宠经验'],
      success: (res) => {
        this.setData({ topic: ['#猫猫探头', '#修勾日常', '#今日份可爱', '#养宠经验'][res.tapIndex] });
      }
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ location: res });
      }
    });
  },

  choosePetType() {
    const options = ["不分类", "猫咪", "狗狗"]
    const values: Array<"all" | "cat" | "dog"> = ["all", "cat", "dog"]
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        this.setData({
          petType: values[res.tapIndex],
          petTypeText: options[res.tapIndex]
        })
      }
    })
  },

  inferPetType(rawType?: string) {
    if (!rawType) return ""
    const normalized = String(rawType).toLowerCase()
    if (normalized.includes("cat") || normalized.includes("猫")) return "cat"
    if (normalized.includes("dog") || normalized.includes("狗")) return "dog"
    return ""
  },

  tagPet() {
    getPetList()
      .then((pets) => {
        if (!pets.length) {
          wx.showModal({
            title: "暂无宠物",
            content: "请先完善宠物档案后再标记宠物",
            confirmText: "去添加",
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({ url: "/pages/my/settings/pets/add/index" })
              }
            }
          })
          return
        }
        const names = pets.map((p) => p.name)
        wx.showActionSheet({
          itemList: names,
          success: (res) => {
            const selected = pets[res.tapIndex]
            this.setData({
              pet: selected.name,
              petBreed: (selected as any)?.breed ? String((selected as any).breed) : "",
              petRawType: (selected as any)?.type ? String((selected as any).type) : "",
              taggedPetType: this.inferPetType((selected as any).type)
            })
          }
        })
      })
      .catch(() => {
        wx.showToast({ title: "宠物列表加载失败", icon: "none" })
      })
  },

  chooseVisibility() {
    const options = ['所有人可见', '仅关注可见', '仅自己可见'];
    const values = ['public', 'followers', 'private'];
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        this.setData({ 
          visibility: values[res.tapIndex],
          visibilityText: options[res.tapIndex]
        });
      }
    });
  },

  publish() {
    const baseContent = (this.data.content || "").trim()
    const baseTopic = (this.data.topic || "").trim()
    const finalType = this.data.taggedPetType || this.data.petType || "all"
    const typeTag = finalType === "cat" ? "#猫咪" : finalType === "dog" ? "#狗狗" : ""
    const breedTagRaw = (this.data.petBreed || "").trim()
    const breedTag = breedTagRaw ? `#${breedTagRaw}` : ""
    const rawTypeTag = !typeTag && (this.data.petRawType || "").trim() ? `#${String(this.data.petRawType).trim()}` : ""

    const combined = `${baseContent} ${baseTopic}`.trim()
    const hasTag = (tag: string) => (tag ? combined.includes(tag) : false)

    const contentParts = [
      baseContent,
      baseTopic,
      !hasTag(typeTag) ? typeTag : "",
      !hasTag(rawTypeTag) ? rawTypeTag : "",
      !hasTag(breedTag) ? breedTag : ""
    ].filter(Boolean)
    const finalContent = contentParts.join(" ").trim()

    if (!finalContent && this.data.mediaList.length === 0) {
      wx.showToast({ title: '请输入内容或上传图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    Promise.resolve()
      .then(async () => {
        if (this.data.postType === "video") {
          const video = this.data.mediaList.find((m: any) => m.fileType === "video")
          if (!video?.tempFilePath) {
            wx.hideLoading()
            wx.showToast({ title: "请选择视频", icon: "none" })
            throw new Error("video required")
          }
          const videoUrl = await uploadFile(video.tempFilePath)
          const coverPath = (video as any).thumbTempFilePath
          const coverUrl = typeof coverPath === "string" && coverPath ? await uploadFile(coverPath) : undefined
          await createPost({
            content: finalContent,
            videoUrl,
            coverUrl,
            location: this.data.location?.name,
            visibility: this.data.visibility,
            type: finalType
          })
          return
        }

        const imagePaths = this.data.mediaList
          .filter((m: any) => m.fileType === "image")
          .map((m: any) => m.tempFilePath)
        const imageUrls: string[] = []
        for (const p of imagePaths) {
          imageUrls.push(await uploadFile(p))
        }
        await createPost({
          content: finalContent,
          images: imageUrls,
          location: this.data.location?.name,
          visibility: this.data.visibility,
          type: finalType
        })
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '发布成功' });
        setTimeout(() => {
          wx.setStorageSync("community_need_refresh", true)
          wx.navigateBack({
            delta: 1,
            fail: () => {
              wx.switchTab({ url: "/pages/community/index" })
            }
          });
        }, 800);
      })
      .catch((e) => {
        console.error(e)
        wx.hideLoading();
        wx.showToast({ title: '发布失败', icon: 'none' });
      })
  }
});
