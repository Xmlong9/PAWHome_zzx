Page({
  data: {
    imports: [
      { id: "i1", name: "导入成功！", time: "2026-03-30 11:40", status: "已导入" }
    ]
  },

  pickFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album"],
      success: () => {
        wx.showToast({ title: "已选择图片", icon: "success" });
      }
    });
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera"],
      success: () => {
        wx.showToast({ title: "已拍照", icon: "success" });
      }
    });
  },

  startImport() {
    wx.showToast({ title: "开始导入", icon: "success" });
    setTimeout(() => {
      wx.redirectTo({ url: "/pages/vaccine/record/index" });
    }, 600);
  }
});

