App({
  onLaunch() {
    this.checkDailyReset();
  },

  onShow() {
    // 保持生命周期清晰，不在此处编写复杂的跳转逻辑
  },

  checkDailyReset() {
    try {
      const lastDate = wx.getStorageSync('last_open_date');
      const today = new Date().toDateString();

      if (lastDate !== today) {
        wx.removeStorageSync('today_intake');
        wx.setStorageSync('last_open_date', today);
      }
    } catch (e) {
      console.error('App Reset Logic Error:', e);
    }
  }
})
