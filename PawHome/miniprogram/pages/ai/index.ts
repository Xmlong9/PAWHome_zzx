import { getBanners } from "../../services/banners"

Page({
  data: {
    heroIconUrl: "/assets/icons/tab/ai-pet@1x.png",
    highlights: [
      { id: "ask", icon: "💬", title: "智能问答", desc: "聊饮食、行为、训练和日常护理", color: "#e8f3ff", textColor: "#1677ff" },
      { id: "health", icon: "💖", title: "健康建议", desc: "快速整理症状线索，辅助判断下一步", color: "#fff0f6", textColor: "#eb2f96" },
      { id: "plan", icon: "🗓️", title: "养宠计划", desc: "生成喂养、疫苗、驱虫等提醒思路", color: "#fff7e6", textColor: "#fa8c16" }
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
    wx.navigateTo({ url: "/pages/ai/chat/index" })
  }
})
