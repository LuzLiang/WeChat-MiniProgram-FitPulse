Page({
  data: {
    // Navigation Area Metrics
    navHeight: 64,
    menuTop: 24,
    menuHeight: 32,

    // Core Data
    targets: { p: 130, c: 200, f: 50 },
    intake: { p: 0, c: 0, f: 0 },
    percentages: { p: 0, c: 0, f: 0 },
    
    // Database & Navigation
    foodDatabase: [], 
    customCategories: [],
    currentCatIdx: 0,
    currentFoodIdx: 0,
    
    // UI State
    inputValue: '',
    calcResult: { p: 0, c: 0, f: 0 },
    lastRecord: '',
    showTargetModal: false,
    tempTargets: { p: 130, c: 200, f: 50 },

    // Quick Converter State
    customConverters: [],
    displayConverters: [],
    convertIdx: 0,
    convertInput: '',
    convertResult: '0.0',
    convertUnit: 'g 碳水',
    showConverterModal: false,
    newRule: { name: '', factor: '', unit: '' }
  },

  onLoad() {
    this.calculateNavRect();
  },

  onShow() {
    this.refreshData();
  },

// 找到原来这个方法，替换为以下代码：
calculateNavRect() {
  try {
    const sys = wx.getWindowInfo(); 
    const menu = wx.getMenuButtonBoundingClientRect();
    const menuRight = sys.windowWidth - menu.left;
    const navHeight = menu.bottom + (menu.top - sys.statusBarHeight);
    this.setData({
      navHeight: navHeight,
      menuTop: menu.top,
      menuHeight: menu.height,
      menuRight: menuRight + 16 // 额外加一点安全边距
    });
  } catch (e) {
    console.error('Failed to get nav rect', e);
  }
},

  noop() {},

  refreshData() {
    const intake = wx.getStorageSync('today_intake') || { p: 0, c: 0, f: 0 };
    const targets = wx.getStorageSync('custom_targets') || { p: 130, c: 200, f: 50 };
    const lastRecord = wx.getStorageSync('last_record_trace') || '';
    const customCategories = wx.getStorageSync('custom_categories') || ['肉蛋', '主食', '蔬果', '调味'];
    const foodDatabase = wx.getStorageSync('user_food_library') || [];
    
    // Load Dynamic Converters
    const defaults = [
      { id: 1, name: '米饭(熟/g)算碳水', factor: 0.28, unit: 'g 碳水' },
      { id: 2, name: '米饭(生/g)算碳水', factor: 0.76, unit: 'g 碳水' },
      { id: 3, name: '米饭(两)算碳水', factor: 38, unit: 'g 碳水' },
      { id: 4, name: '巴沙鱼(冻/g)算净肉', factor: 0.64, unit: 'g 净肉' }
    ];
    const customConverters = wx.getStorageSync('custom_converters') || defaults;
    const displayConverters = customConverters.map(c => c.name).concat(['+ 新增自定义换算']);

    this.setData({ 
      intake, 
      targets, 
      lastRecord,
      customCategories,
      foodDatabase,
      customConverters,
      displayConverters,
      convertUnit: customConverters[this.data.convertIdx]?.unit || 'g',
      percentages: this._calcPercentages(intake, targets)
    });
  },

  _calcPercentages(intake, targets) {
    const calc = (v, t) => (!t || t <= 0) ? 0 : Math.min(100, Math.round((v / t) * 100));
    return { p: calc(intake.p, targets.p), c: calc(intake.c, targets.c), f: calc(intake.f, targets.f) };
  },

  addIntake() {
    const { calcResult, intake, targets, foodDatabase, currentCatIdx, currentFoodIdx, inputValue } = this.data;
    if (!foodDatabase[currentCatIdx] || !foodDatabase[currentCatIdx].items[currentFoodIdx]) return;
    
    const p = parseFloat(calcResult.p) || 0;
    const c = parseFloat(calcResult.c) || 0;
    const f = parseFloat(calcResult.f) || 0;
    if (p === 0 && c === 0 && f === 0) return;

    const newIntake = {
      p: parseFloat((parseFloat(intake.p) + p).toFixed(1)),
      c: parseFloat((parseFloat(intake.c) + c).toFixed(1)),
      f: parseFloat((parseFloat(intake.f) + f).toFixed(1))
    };

    const foodName = foodDatabase[currentCatIdx].items[currentFoodIdx].name;
    const trace = `${foodName} ${inputValue}g`;

    wx.setStorageSync('today_intake', newIntake);
    wx.setStorageSync('last_record_trace', trace);
    
    const history = wx.getStorageSync('daily_history') || [];
    this._updateHistoryEntry(history, newIntake);

    this.setData({ 
      intake: newIntake, 
      inputValue: '', 
      calcResult: { p: 0, c: 0, f: 0 },
      lastRecord: trace,
      percentages: this._calcPercentages(newIntake, targets)
    });
    wx.vibrateShort();
    wx.showToast({ title: 'LOGGED', icon: 'none' });
  },

  _updateHistoryEntry(history, intake) {
    const dateStr = `${new Date().getMonth() + 1}-${new Date().getDate()}`;
    const idx = history.findIndex(h => h.date === dateStr);
    if (idx > -1) history[idx] = { ...intake, date: dateStr };
    else history.push({ ...intake, date: dateStr });
    if (history.length > 14) history.shift();
    wx.setStorageSync('daily_history', history);
  },

  selectCategory(e) {
    this.setData({ currentCatIdx: e.currentTarget.dataset.idx, currentFoodIdx: 0 }, () => this.doCalculate());
    wx.vibrateShort({ type: 'light' });
  },

  doCalculate() {
    const { inputValue, foodDatabase, currentCatIdx, currentFoodIdx } = this.data;
    const weight = parseFloat(inputValue) || 0;
    const food = foodDatabase[currentCatIdx]?.items[currentFoodIdx];
    if (!food) return this.setData({ calcResult: { p: 0, c: 0, f: 0 } });
    const ratio = weight / 100;
    this.setData({
      calcResult: { p: (ratio * food.p).toFixed(1), c: (ratio * food.c).toFixed(1), f: (ratio * food.f).toFixed(1) }
    });
  },

  onFoodChange(e) { this.setData({ currentFoodIdx: parseInt(e.detail.value) }, () => this.doCalculate()); },

  onLongPressLibraryItem() {
    const { foodDatabase, currentCatIdx, currentFoodIdx } = this.data;
    const item = foodDatabase[currentCatIdx]?.items[currentFoodIdx];
    if (!item) return;

    wx.vibrateShort({ type: 'medium' });
    wx.showModal({
      title: 'DELETE TEMPLATE',
      content: `Permanently delete "${item.name}" from library?`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          let lib = [...foodDatabase];
          lib[currentCatIdx].items.splice(currentFoodIdx, 1);
          wx.setStorageSync('user_food_library', lib);
          this.setData({ foodDatabase: lib, currentFoodIdx: 0 });
          this.doCalculate();
          wx.showToast({ title: 'DELETED', icon: 'none' });
        }
      }
    });
  },

  toggleTargetModal() { this.setData({ showTargetModal: !this.data.showTargetModal, tempTargets: { ...this.data.targets } }); },
  onTargetInput(e) { this.setData({ [`tempTargets.${e.currentTarget.dataset.key}`]: parseFloat(e.detail.value) || 0 }); },
  saveCustomTargets() {
    wx.setStorageSync('custom_targets', this.data.tempTargets);
    this.setData({ targets: { ...this.data.tempTargets }, showTargetModal: false, percentages: this._calcPercentages(this.data.intake, this.data.tempTargets) });
  },
  resetTodayData() {
    wx.showModal({ title: 'RESET', content: 'Clear records?', success: (res) => {
      if (res.confirm) {
        const empty = { p: 0, c: 0, f: 0 };
        wx.setStorageSync('today_intake', empty);
        this._updateHistoryEntry(wx.getStorageSync('daily_history') || [], empty);
        this.setData({ intake: empty, lastRecord: '', percentages: { p: 0, c: 0, f: 0 } });
      }
    }});
  },

  onConvertTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const { customConverters } = this.data;
    if (idx === customConverters.length) {
      this.setData({ 
        showConverterModal: true,
        newRule: { name: '', factor: '', unit: '' } // 确保新增时表单为空
      });
      return;
    }
    this.setData({ 
      convertIdx: idx, 
      convertUnit: customConverters[idx].unit 
    }, () => this.calculateQuickConvert());
  },
  onConvertInput(e) {
    this.setData({ convertInput: e.detail.value }, () => this.calculateQuickConvert());
  },

  calculateQuickConvert() {
    const { convertIdx, convertInput, customConverters } = this.data;
    const val = parseFloat(convertInput) || 0;
    const rule = customConverters[convertIdx];
    
    if (!rule || val === 0) {
      return this.setData({ convertResult: '0.0', convertUnit: rule?.unit || 'g' });
    }

    let resultValue = val * rule.factor;
    let displayUnit = rule.unit;

    // 智能识别：如果是“两”换算成“g”，自动补上碳水估算
    if (rule.name.includes('两') && rule.unit.toLowerCase().includes('g')) {
      const carbs = (val * 13).toFixed(1); // 1两熟米饭约13g碳水
      resultValue = resultValue.toFixed(0); // 物理重量取整
      displayUnit = `g (≈${carbs}g 碳水)`;
    } 
    // 如果是单纯的碳水计算
    else if (rule.unit.includes('碳水')) {
      resultValue = resultValue.toFixed(1);
    }
    // 其他情况（如巴沙鱼净重）
    else {
      resultValue = resultValue > 100 ? Math.round(resultValue) : resultValue.toFixed(1);
    }

    this.setData({ 
      convertResult: resultValue,
      convertUnit: displayUnit
    });
  },

// 1. 升级长按逻辑：呼出底部 Action Sheet
onLongPressConverter() {
  const { convertIdx, customConverters } = this.data;
  const rule = customConverters[convertIdx];
  if (!rule) return;
  
  wx.vibrateShort({ type: 'medium' }); 
  
  wx.showActionSheet({
    itemList: ['编辑规则 (Edit)', '删除规则 (Delete)'],
    itemColor: '#000000',
    success: (res) => {
      if (res.tapIndex === 0) {
        // 点击了编辑：打开弹窗，并把当前规则的数据回填进表单
        this.setData({
          showConverterModal: true,
          newRule: { ...rule } // 关键：带入 id 和原有数据
        });
      } else if (res.tapIndex === 1) {
        // 点击了删除：弹出确认框
        wx.showModal({
          title: '删除规则',
          content: `确定删除「${rule.name}」吗？`,
          confirmColor: '#FF3B30',
          success: (delRes) => {
            if (delRes.confirm) {
              const newList = customConverters.filter((_, i) => i !== convertIdx);
              if (newList.length === 0) {
                wx.showToast({ title: '至少保留一项哦', icon: 'none' });
                return;
              }
              wx.setStorageSync('custom_converters', newList);
              this.setData({ convertIdx: 0, convertInput: '', convertResult: '0.0' });
              this.refreshData();
            }
          }
        });
      }
    }
  });
},

// 2. 确保关闭弹窗时，清空表单数据，防止污染下一次的新增
toggleConverterModal() {
  this.setData({ 
    showConverterModal: !this.data.showConverterModal,
    newRule: { name: '', factor: '', unit: '' } 
  });
},

  onNewRuleInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`newRule.${key}`]: e.detail.value });
  },

// 3. 升级保存逻辑：自动判断是“新增”还是“更新”
saveConverter() {
  const { newRule, customConverters } = this.data;
  if (!newRule.name || !newRule.factor || !newRule.unit) {
    wx.showToast({ title: '请填写完整', icon: 'none' });
    return;
  }

  let newList = [...customConverters];
  let targetIdx = 0;

  // 如果 newRule 里面有 id，说明是【编辑更新】
  if (newRule.id) {
    const index = newList.findIndex(r => r.id === newRule.id);
    if (index > -1) {
      newList[index] = { ...newRule, factor: parseFloat(newRule.factor) };
      targetIdx = index; // 保持选中的还是这一项
    }
  } 
  // 否则就是【完全新增】
  else {
    const rule = {
      ...newRule,
      id: Date.now(), // 生成新 id
      factor: parseFloat(newRule.factor)
    };
    newList.push(rule);
    targetIdx = newList.length - 1; // 自动跳到最新添加的这一项
  }

  wx.setStorageSync('custom_converters', newList);
  this.setData({ convertIdx: targetIdx });
  this.refreshData();
  
  // 关掉弹窗，震动反馈
  this.setData({ showConverterModal: false });
  wx.vibrateShort({ type: 'light' });
}
})
