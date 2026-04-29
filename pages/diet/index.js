Page({
  data: {
    targets: { p: 130, c: 220, f: 60 },
    intake: { p: 0, c: 0, f: 0 },
    foodDatabase: [
      {
        category: '肉蛋水产',
        items: [
          { name: '鸡胸肉', p: 28, c: 0, f: 3 },
          { name: '牛肉', p: 26, c: 0, f: 2 },
          { name: '全蛋', p: 13, c: 1, f: 9 },
          { name: '纯蛋白', p: 11, c: 0, f: 0 },
          { name: '纯蛋黄', p: 16, c: 3, f: 27 },
          { name: '三文鱼', p: 20, c: 0, f: 13 },
          { name: '虾仁', p: 18, c: 0, f: 1 }
        ]
      },
      {
        category: '五谷主食',
        items: [
          { name: '米饭', p: 2.6, c: 26, f: 0.3 },
          { name: '糙米', p: 2.7, c: 23, f: 0.9 },
          { name: '红薯', p: 1.6, c: 20, f: 0.1 },
          { name: '全麦面', p: 12, c: 70, f: 2.5 },
          { name: '燕麦', p: 15, c: 66, f: 7 }
        ]
      },
      {
        category: '蔬果类',
        items: [
          { name: '西兰花', p: 3, c: 7, f: 0.6 },
          { name: '香蕉', p: 1.1, c: 23, f: 0.3 },
          { name: '苹果', p: 0.3, c: 14, f: 0.2 },
          { name: '菠菜', p: 2.9, c: 3.6, f: 0.4 }
        ]
      },
      {
        category: '调味油脂',
        items: [
          { name: '橄榄油', p: 0, c: 0, f: 100 },
          { name: '花生酱', p: 25, c: 20, f: 50 },
          { name: '坚果', p: 15, c: 15, f: 55 }
        ]
      }
    ],
    currentCatIdx: 0,
    currentFoodIdx: 0,
    inputValue: '',
    calcResult: { p: 0, c: 0, f: 0 },
    modeName: '健身模式'
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    try {
      const intake = wx.getStorageSync('today_intake') || { p: 0, c: 0, f: 0 };
      const targets = wx.getStorageSync('diet_targets') || { p: 130, c: 220, f: 60 };
      const modeName = wx.getStorageSync('current_mode_name') || '健身模式';
      this.setData({ intake, targets, modeName });
    } catch (e) {
      console.error('Storage read error', e);
    }
  },

  resetTodayData() {
    wx.showModal({
      title: '重新开始',
      content: '确定要清零今日所有记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('today_intake');
          this.refreshData();
          wx.showToast({ title: '已清零', icon: 'success' });
        }
      }
    });
  },

  onModeChange(e) {
    const modes = ['健身模式', '减脂模式', '增肌模式'];
    const targetsMap = {
      '健身模式': { p: 130, c: 220, f: 60 },
      '减脂模式': { p: 150, c: 150, f: 50 },
      '增肌模式': { p: 140, c: 300, f: 70 }
    };
    const newMode = modes[e.detail.value];
    if (!newMode) return;

    const newTargets = targetsMap[newMode];
    wx.setStorageSync('current_mode_name', newMode);
    wx.setStorageSync('diet_targets', newTargets);
    
    this.setData({
      modeName: newMode,
      targets: newTargets
    });
  },

  selectCategory(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    if (isNaN(idx) || idx === this.data.currentCatIdx) return;
    
    this.setData({
      currentCatIdx: idx,
      currentFoodIdx: 0
    }, () => {
      this.doCalculate();
    });
  },

  onFoodChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      currentFoodIdx: idx
    }, () => {
      this.doCalculate();
    });
  },

  onWeightInput(e) {
    const value = e.detail.value;
    this.setData({ inputValue: value }, () => {
      this.doCalculate();
    });
  },

  doCalculate() {
    const { inputValue, foodDatabase, currentCatIdx, currentFoodIdx } = this.data;
    const weight = parseFloat(inputValue) || 0;
    const food = foodDatabase[currentCatIdx].items[currentFoodIdx];
    
    if (!weight || !food) {
      this.setData({ calcResult: { p: 0, c: 0, f: 0 } });
      return;
    }

    const ratio = weight / 100;
    this.setData({
      calcResult: {
        p: (ratio * food.p).toFixed(1),
        c: (ratio * food.c).toFixed(1),
        f: (ratio * food.f).toFixed(1)
      }
    });
  },

  addIntake() {
    const { calcResult, intake } = this.data;
    const p = parseFloat(calcResult.p) || 0;
    const c = parseFloat(calcResult.c) || 0;
    const f = parseFloat(calcResult.f) || 0;

    if (p === 0 && c === 0 && f === 0) return;

    const newIntake = {
      p: (parseFloat(intake.p) + p).toFixed(1),
      c: (parseFloat(intake.c) + c).toFixed(1),
      f: (parseFloat(intake.f) + f).toFixed(1)
    };

    try {
      wx.setStorageSync('today_intake', newIntake);
      this.setData({ 
        intake: newIntake, 
        inputValue: '', 
        calcResult: { p: 0, c: 0, f: 0 } 
      });
      wx.vibrateShort();
      wx.showToast({ title: '记入成功', icon: 'none' });
    } catch (e) {
      console.error('Save error', e);
    }
  }
})
