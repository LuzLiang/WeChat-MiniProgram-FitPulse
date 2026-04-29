Page({
  data: {
    tabs: ['主食/碳水', '肉类/蛋白质'],
    currentTab: 0,
    
    // 主食模块数据
    liangValue: '',
    weightG: 0,
    carbG: 0,

    // 肉类模块数据
    meatG: '',
    proteinG: 0,
    meatTypes: [
      { name: '即食鸡胸肉', ratio: 0.28 },
      { name: '熟牛肉', ratio: 0.26 }
    ],
    meatIndex: 0
  },

  // 切换 Tab
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
  },

  // 主食输入处理
  onLiangInput(e) {
    const value = e.detail.value;
    if (!value || isNaN(value)) {
      this.setData({ liangValue: value, weightG: 0, carbG: 0 });
      return;
    }
    const weightG = parseFloat(value) * 50;
    const carbG = (weightG * 0.26).toFixed(1);
    this.setData({
      liangValue: value,
      weightG: weightG.toFixed(1),
      carbG: carbG
    });
  },

  // 肉类输入处理
  onMeatInput(e) {
    const value = e.detail.value;
    if (!value || isNaN(value)) {
      this.setData({ meatG: value, proteinG: 0 });
      return;
    }
    this.calculateProtein(value, this.data.meatIndex);
  },

  // 肉类类型切换
  onMeatChange(e) {
    const index = e.detail.value;
    this.setData({ meatIndex: index });
    if (this.data.meatG) {
      this.calculateProtein(this.data.meatG, index);
    }
  },

  // 计算蛋白质
  calculateProtein(grams, typeIndex) {
    const ratio = this.data.meatTypes[typeIndex].ratio;
    const proteinG = (parseFloat(grams) * ratio).toFixed(1);
    this.setData({
      meatG: grams,
      proteinG: proteinG
    });
  }
})
