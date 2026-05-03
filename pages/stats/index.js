Page({
  data: {
    navHeight: 64, menuTop: 24, menuHeight: 32,
    activeChartTab: 'total', weeklyHistory: [], chartTouchX: -1,
    avgIntake: 0, peakIntake: 0
  },
  onLoad() { this.calculateNavRect(); },
  onShow() { this.refreshData(); },
  calculateNavRect() {
    try {
      const sys = wx.getWindowInfo(); 
      const menu = wx.getMenuButtonBoundingClientRect();
      const menuRight = sys.windowWidth - menu.left;
      this.setData({ 
        navHeight: menu.bottom + (menu.top - sys.statusBarHeight), 
        menuTop: menu.top, 
        menuHeight: menu.height,
        menuRight: menuRight + 16
      });
    } catch (e) {}
  },
  refreshData() {
    const history = wx.getStorageSync('daily_history') || [];
    const weekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
    const year = new Date().getFullYear();

    // 给历史数据加上对应的“周几”
    const formattedHistory = history.map(h => {
      const [m, d] = h.date.split('-');
      const dateObj = new Date(year, parseInt(m) - 1, parseInt(d));
      return {
        ...h,
        displayDate: weekNames[dateObj.getDay()] // 自动计算周几
      };
    });

    this.setData({ weeklyHistory: formattedHistory }, () => { 
      this.calculateStats(); 
      this.initChart(); 
    });
  },
  calculateStats() {
    const { weeklyHistory, activeChartTab } = this.data;
    if (!weeklyHistory.length) return;
    let data = (activeChartTab === 'total') ? weeklyHistory.map(h => (h.p*4+h.c*4+h.f*9)||0) : weeklyHistory.map(h => parseFloat(h[activeChartTab])||0);
    const sum = data.reduce((a, b) => a + b, 0);
    this.setData({ avgIntake: (sum/data.length).toFixed(0), peakIntake: Math.max(...data).toFixed(0) });
  },
  initChart() {
    wx.createSelectorQuery().select('#waveChart').fields({ node: true, size: true }).exec((res) => {
      if (!res?.[0]) return;
      const canvas = res[0].node; 
      const ctx = canvas.getContext('2d'); 
      
      // 🌟 核心修改：使用最新接口获取屏幕像素比
      const dpr = wx.getWindowInfo().pixelRatio; 
      
      canvas.width = res[0].width * dpr; 
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr); 
      this.ctx = ctx; 
      this.cw = res[0].width; 
      this.ch = res[0].height;
      this.drawWave();
    });
  },
  switchChartTab(e) {
    this.setData({ activeChartTab: e.currentTarget.dataset.tab, chartTouchX: -1 }, () => { this.calculateStats(); this.drawWave(); });
    wx.vibrateShort({ type: 'light' });
  },
  drawWave() {
    if (!this.ctx || !this.data.weeklyHistory.length) return;
    const { activeChartTab, weeklyHistory, chartTouchX } = this.data;
    const ctx = this.ctx; const w = this.cw; const h = this.ch;
    ctx.clearRect(0, 0, w, h);
    
    let data = (activeChartTab === 'total') ? weeklyHistory.map(h => (h.p*4+h.c*4+h.f*9)||0) : weeklyHistory.map(h => parseFloat(h[activeChartTab])||0);
    const colors = { total: '#1A1A1A', p: '#007AFF', c: '#FF9500', f: '#34C759' };
    const color = colors[activeChartTab];
    const maxVal = Math.max(...data, 10) * 1.3;
    const points = data.map((v, i) => ({ x: (i * w / (data.length - 1 || 1)), y: h - 60 - (v / maxVal * (h - 100)) }));

    // 绘制渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${color}22`); grad.addColorStop(1, `${color}00`);
    ctx.beginPath(); ctx.moveTo(points[0].x, h);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]; const p2 = points[i + 1]; const cp1x = p1.x + (p2.x - p1.x) / 2;
      ctx.bezierCurveTo(cp1x, p1.y, cp1x, p2.y, p2.x, p2.y);
    }
    ctx.lineTo(points[points.length - 1].x, h); ctx.fillStyle = grad; ctx.fill();

    // 绘制平滑曲线
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]; const p2 = points[i + 1]; const cp1x = p1.x + (p2.x - p1.x) / 2;
      ctx.bezierCurveTo(cp1x, p1.y, cp1x, p2.y, p2.x, p2.y);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

    // 绘制底部 X 轴标签（周几/英文，带边缘防裁切处理）
    ctx.fillStyle = '#AEAEB2'; 
    ctx.font = 'bold 12px Inter'; 
    weeklyHistory.forEach((item, i) => {
      let align = 'center';
      let xOffset = points[i].x;
      
      // 第一个点靠左，最后一个点靠右，中间居中
      if (i === 0) {
        align = 'left';
        xOffset = points[i].x + 4;
      } else if (i === weeklyHistory.length - 1) {
        align = 'right';
        xOffset = points[i].x - 4;
      }
      
      ctx.textAlign = align;
      ctx.fillText(item.displayDate || '', xOffset, h - 15);
    });

    // 处理手指触摸时的指示器和数值显示
    if (chartTouchX >= 0) {
      let idx = Math.round(chartTouchX / (w / (data.length - 1 || 1)));
      idx = Math.max(0, Math.min(idx, points.length - 1)); // 防止下标越界
      const tp = points[idx];
      
      // 竖线和圆点
      ctx.beginPath(); ctx.moveTo(tp.x, 0); ctx.lineTo(tp.x, h - 40); ctx.strokeStyle = '#E5E5EA'; ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tp.x, tp.y, 6, 0, Math.PI * 2); ctx.fill();
      
      // 悬浮数字也要做边缘防裁切
      let textAlign = 'center';
      let textXOffset = tp.x;
      if (idx === 0) { 
        textAlign = 'left'; 
        textXOffset = tp.x + 8; 
      } else if (idx === points.length - 1) { 
        textAlign = 'right'; 
        textXOffset = tp.x - 8; 
      }
      
      ctx.textAlign = textAlign;
      ctx.font = 'bold 12px Inter'; 
      ctx.fillText(data[idx].toFixed(0), textXOffset, tp.y - 15);
    }
  },
  handleChartTouch(e) { this.setData({ chartTouchX: e.touches[0].x }); this.drawWave(); },
  handleChartTouchEnd() { this.setData({ chartTouchX: -1 }); this.drawWave(); }
})
