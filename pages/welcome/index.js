Page({
  selectMode(e) {
    const { p, c, mode } = e.currentTarget.dataset;
    const targets = { p, c, f: 60 }; // 默认脂肪目标 60g
    wx.setStorageSync('diet_targets', targets);
    wx.setStorageSync('current_mode_name', mode);
    
    wx.switchTab({
      url: '/pages/diet/index'
    });
  }
})
