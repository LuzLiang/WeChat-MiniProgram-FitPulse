Page({
  data: {
    // Navigation Area Metrics
    navHeight: 64,
    menuTop: 24,
    menuHeight: 32,

    pantryList: [],
    foodDatabase: [], 
    showAddModal: false,
    categories: [],
    selectedCatIdx: 0,
    newFood: {
      name: '',
      protein: '',
      carbs: '',
      fat: '',
      totalWeight: ''
    },
    editingId: null
  },

  onLoad() {
    this.calculateNavRect();
  },

  onShow() {
    this.refreshPantry();
  },

  calculateNavRect() {
    try {
      const sys = wx.getWindowInfo(); 
      const menu = wx.getMenuButtonBoundingClientRect();
      const menuRight = sys.windowWidth - menu.left;
      
      // 🌟 补上了这行丢失的计算公式
      const calculatedNavHeight = menu.bottom + (menu.top - sys.statusBarHeight);
      
      this.setData({ 
        navHeight: calculatedNavHeight, 
        menuTop: menu.top, 
        menuHeight: menu.height,
        menuRight: menuRight + 16
      });
    } catch (e) {
      console.error('Failed to get nav rect', e);
    }
  },

  refreshPantry() {
    const list = wx.getStorageSync('pantry_list') || [];
    const foodDatabase = wx.getStorageSync('user_food_library') || [];
    let categories = wx.getStorageSync('custom_categories');
    if (!categories || categories.length === 0) {
      categories = ['肉蛋', '主食', '蔬果', '调味'];
      wx.setStorageSync('custom_categories', categories);
    }
    this.setData({ pantryList: list, foodDatabase, categories });
  },

  toggleAddModal() {
    this.setData({ 
      showAddModal: !this.data.showAddModal,
      selectedCatIdx: 0,
      newFood: { name: '', protein: '', carbs: '', fat: '', totalWeight: '' },
      editingId: null
    });
    if (this.data.showAddModal) this.refreshPantry();
  },

  selectAddCategory(e) {
    this.setData({ selectedCatIdx: e.currentTarget.dataset.idx });
  },

  handleAddNewCat() {
    wx.showModal({
      title: 'NEW CATEGORY',
      placeholderText: 'Name',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim();
          if (!name) return;
          let cats = [...this.data.categories];
          if (cats.includes(name)) return wx.showToast({ title: 'EXISTS', icon: 'none' });
          const updated = [...cats, name];
          wx.setStorageSync('custom_categories', updated);
          let lib = wx.getStorageSync('user_food_library') || [];
          if (!lib.find(f => f.category === name)) {
            lib.push({ category: name, items: [] });
            wx.setStorageSync('user_food_library', lib);
          }
          this.setData({ categories: updated, foodDatabase: lib, selectedCatIdx: updated.length - 1 });
        }
      }
    });
  },

  deleteCategory(e) {
    const idx = e.currentTarget.dataset.idx;
    const name = this.data.categories[idx];
    wx.showModal({
      title: 'DELETE CATEGORY',
      content: `Remove "${name}" and all templates?`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const updated = this.data.categories.filter((_, i) => i !== idx);
          wx.setStorageSync('custom_categories', updated);
          let lib = (wx.getStorageSync('user_food_library') || []).filter(f => f.category !== name);
          wx.setStorageSync('user_food_library', lib);
          this.setData({ categories: updated, foodDatabase: lib, selectedCatIdx: 0 });
        }
      }
    });
  },

  deleteLibraryItem(e) {
    const { catidx, itemidx } = e.currentTarget.dataset;
    const item = this.data.foodDatabase[catidx].items[itemidx];
    wx.showModal({
      title: 'REMOVE TEMPLATE',
      content: `Remove "${item.name}" permanently?`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          let lib = [...this.data.foodDatabase];
          lib[catidx].items.splice(itemidx, 1);
          wx.setStorageSync('user_food_library', lib);
          this.setData({ foodDatabase: lib });
        }
      }
    });
  },

  onInputChange(e) {
    this.setData({ [`newFood.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  addFoodToPantry() {
    const { newFood, pantryList, categories, selectedCatIdx, editingId } = this.data;
    if (!newFood.name || !newFood.totalWeight) return wx.showToast({ title: 'MISSING INFO', icon: 'none' });

    const item = {
      id: editingId || Date.now(),
      name: newFood.name,
      protein: parseFloat(newFood.protein) || 0,
      carbs: parseFloat(newFood.carbs) || 0,
      fat: parseFloat(newFood.fat) || 0,
      totalWeight: parseFloat(newFood.totalWeight),
      currentWeight: parseFloat(newFood.totalWeight),
      category: categories[selectedCatIdx]
    };

    let newList;
    if (editingId) {
      newList = pantryList.map(i => i.id === editingId ? item : i);
    } else {
      newList = [item, ...pantryList];
    }

    wx.setStorageSync('pantry_list', newList);
    this._updateSyncLibrary(item, selectedCatIdx);
    this.setData({ pantryList: newList, showAddModal: false, editingId: null });
    wx.showToast({ title: editingId ? 'UPDATED' : 'LOGGED', icon: 'none' });
  },

  _updateSyncLibrary(item, catIdx) {
    let lib = wx.getStorageSync('user_food_library') || [];
    const catName = this.data.categories[catIdx];
    let target = lib.find(f => f.category === catName);
    if (!target) { target = { category: catName, items: [] }; lib.push(target); }
    const idx = target.items.findIndex(i => i.name === item.name);
    const libItem = { name: item.name, p: item.protein, c: item.carbs, f: item.fat };
    if (idx > -1) target.items[idx] = libItem;
    else target.items.push(libItem);
    wx.setStorageSync('user_food_library', lib);
  },

  restockItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pantryList.find(i => i.id === id);
    if (!item) return;
    wx.showModal({
      title: `RESTOCK: ${item.name.toUpperCase()}`,
      placeholderText: 'Amount (g)',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const weight = parseFloat(res.content);
          if (isNaN(weight) || weight <= 0) return;
          const newList = this.data.pantryList.map(i => i.id === id ? {
            ...i,
            currentWeight: parseFloat((i.currentWeight + weight).toFixed(1)),
            totalWeight: parseFloat((i.totalWeight + weight).toFixed(1))
          } : i);
          wx.setStorageSync('pantry_list', newList);
          this.setData({ pantryList: newList });
        }
      }
    });
  },

  onLongPressPantryItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pantryList.find(i => i.id === id);
    if (!item) return;

    wx.vibrateShort({ type: 'medium' });
    wx.showActionSheet({
      itemList: ['编辑资料 (Edit Details)', '快速补货 (Restock)', '删除记录 (Delete)'],
      itemColor: '#000000',
      success: (res) => {
        if (res.tapIndex === 0) {
          const catIdx = this.data.categories.indexOf(item.category);
          this.setData({
            showAddModal: true,
            editingId: id,
            selectedCatIdx: catIdx > -1 ? catIdx : 0,
            newFood: {
              name: item.name,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              totalWeight: item.totalWeight
            }
          });
        } else if (res.tapIndex === 1) {
          this.restockItem(e);
        } else if (res.tapIndex === 2) {
          this.deleteItem(e);
        }
      }
    });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.pantryList.find(i => i.id === id);
    if (!item) return;

    wx.showActionSheet({
      itemList: ['仅从当前库存移除 (Remove from Pantry)', '从库存及常用模板库彻底删除 (Delete Permanently)'],
      itemColor: '#FF3B30',
      success: (res) => {
        if (res.tapIndex === -1) return;
        
        const newList = this.data.pantryList.filter(i => i.id !== id);
        wx.setStorageSync('pantry_list', newList);
        this.setData({ pantryList: newList });

        if (res.tapIndex === 1) {
          let lib = wx.getStorageSync('user_food_library') || [];
          const cat = lib.find(c => c.category === item.category);
          if (cat) {
            cat.items = cat.items.filter(f => f.name !== item.name);
            wx.setStorageSync('user_food_library', lib);
            this.setData({ foodDatabase: lib });
          }
        }
      }
    });
  },

  noop() {}
})
