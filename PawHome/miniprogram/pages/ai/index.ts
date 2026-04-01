import { getBanners } from "../../services/banners"

Page({
  data: {
    heroIconUrl: "/assets/icons/tab/ai-pet@1x.png",
    highlights: [
      { id: "ask", title: "智能问答", desc: "聊饮食、行为、训练和日常护理" },
      { id: "health", title: "健康建议", desc: "快速整理症状线索，辅助判断下一步" },
      { id: "plan", title: "养宠计划", desc: "生成喂养、疫苗、驱虫等提醒思路" }
    ]
  },
  async onLoad() {
    try {
      const list = await getBanners("ai_hero")
      const url = list?.[0]?.imageUrl
      if (typeof url === "string" && url) {
        this.setData({ heroIconUrl: url })
      }
    } catch (e) {
      console.error("AI_HERO_ICON_LOAD_FAILED", e)
    }
  },
  showComingSoon() {
    wx.showToast({
      title: "AI能力即将开放",
      icon: "none"
    })
  }
})
