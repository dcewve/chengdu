// 预置的抽奖人员名单（来自用户提供），顺序稍后会随机打乱
const PRESET_NAMES = [
  "梁永红", "于含", "邹德君", "廖晓涛", "宋立新", "路亮", "于孝民", "赵红云", 
  "郑瑶", "李欣然", "李洪栋", "郑茜", "张靖", "李婷婷", "周静", "赵洋", 
  "魏阔", "赵晨", "冀娟", "魏庆飞", "赵静", "魏丽红", "左丽萍", "刘津酉", 
  "颜颜", "张方", "王雷", "孙丽颖", "白红英", "贾燕", "姜立娜", "吴萍", 
  "司霞", "刘春花", "张雪", "赵涛", "王琼", "杨星雨", "唐丽萍", "曹雪梅", 
  "李敏", "黄玲", "王杰", "李京川", "刘伟", "陈明", "王毅", "何莉婕", 
  "莫小枫", "银焕邦", "黄丽娟", "王杰", "周兴颖", "姜鹏", "肖旺", "陈皓", 
  "郑航", "崔昕瞳", "乔国桂", "袁伦鹏", "周自棋", "于光华", "李魏", 
  "董德旭", "李洋", "袁学", "吴彬", "杨永志", "干川川", "张应华", "张代根", 
  "吕静", "徐明军", "左明伟", "胡先豪", "沈清元", "华健森", "赵玉林", "魏阳", 
  "白成渝", "龙洪彬", "徐操", "祝东", "陶中富", "张万勤", "宋先福", "唐发祥", 
  "赵德福", "谢永洪", "郭鹏博", "石玉刚", "郭鹏飞", "秦晓东", "梁伟", 
  "袁宝忠", "吕相超", "胡云奎", "毛波", "邹亮", "石强", "张家豪", "刘良明", 
  "何琦", "李洪兆", "张文宇", "唐洪全", "张利红", "付明兴", "施祖成", "秦小风", 
  "袁文月", "吴富发", "张静", "胡洪", "张作昌", "周贵权", "王代强", "张俊雨", 
  "张立丰", "向申磊", "车宛靖", "郭宇", "黄治龙", "白志敏", "廖义根", "于文达",
];

// 简单的数据结构：所有待抽奖人员 & 获奖记录
const state = {
  people: [], // { id, name }
  remaining: [], // 剩余可抽的人 id 列表
  winners: {
    special: [],
    first: [],
    second: [],
    third: [],
  },
  rollingTimer: null,
  autoStopTimer: null,
  currentCandidateId: null,
  isRolling: false,
  // 新增：记录每个奖项是否已完成抽奖
  levelsCompleted: {
    third: false,
    second: false,
    first: false,
    special: false
  },
  // 新增：记录当前轮次的中奖者（用于重置功能）
  currentRoundWinners: []
};

// DOM 引用
const els = {
  levelSelect: document.getElementById("level-select"),
  countInput: document.getElementById("count-input"),
  modeRadios: document.querySelectorAll('input[name="mode"]'),
  autoDuration: document.getElementById("auto-duration"),
  autoRandom: document.getElementById("auto-random"),
  flashInterval: document.getElementById("flash-interval"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  resetRoundBtn: document.getElementById("reset-round-btn"),
  displayArea: document.getElementById("display-area"),
  placeholderText: document.querySelector(".placeholder-text"),
  currentName: document.getElementById("current-name"),
  levelText: document.getElementById("current-level-text"),
  levelCountText: document.getElementById("level-count-text"), // 新增：人数显示元素
  namesImport: document.getElementById("names-import"),
  applyImportBtn: document.getElementById("apply-import-btn"),
  poolList: document.getElementById("pool-list"),
  winnersLists: {
    special: document.getElementById("winners-special"),
    first: document.getElementById("winners-first"),
    second: document.getElementById("winners-second"),
    third: document.getElementById("winners-third"),
  },
  overlayControls: document.getElementById("overlay-controls"),
  // 移除 levelInfoText 相关代码
};

// 工具函数
function uuid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  ).toUpperCase();
}

function getMode() {
  const checked = Array.from(els.modeRadios).find((r) => r.checked);
  return checked?.value || "auto";
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 根据奖项自动设置抽取人数
function updateCountByLevel() {
  const level = els.levelSelect.value;
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  
  const count = countMap[level] || 1;
  els.countInput.value = count;
  
  // 更新当前奖项的显示
  updateLevelDisplay();
}

// 更新当前奖项和人数显示
function updateLevelDisplay() {
  const level = els.levelSelect.value;
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  const count = countMap[level] || 1;
  
  const levelNames = {
    third: "三等奖",
    second: "二等奖", 
    first: "一等奖",
    special: "特等奖"
  };
  
  // 更新奖项名称
  els.levelText.textContent = levelNames[level];
  
  // 更新人数显示
  if (els.levelCountText) {
    els.levelCountText.textContent = `（${count}人）`;
  }
}

// 检查当前奖项是否已完成抽奖
function checkLevelCompleted(level) {
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  const targetCount = countMap[level] || 0;
  const currentCount = state.winners[level].length;
  
  return currentCount >= targetCount;
}

// 自动切换到下一个奖项
function autoSwitchToNextLevel() {
  const order = ["third", "second", "first", "special"];
  const currentLevel = els.levelSelect.value;
  const currentIndex = order.indexOf(currentLevel);
  
  // 如果当前奖项已经完成且不是最后一个奖项
  if (currentIndex < order.length - 1 && state.levelsCompleted[currentLevel]) {
    const nextLevel = order[currentIndex + 1];
    
    // 切换到下一个奖项
    els.levelSelect.value = nextLevel;
    
    // 更新显示
    updateLevelDisplay();
    
    // 显示新奖项的中奖结果
    updateDisplayNameForCurrentLevel();
    
    return true; // 表示已切换奖项
  }
  
  return false; // 表示未切换奖项
}

// 渲染相关
function updateDisplayName(names, isMultiple = false) {
  if (!names || names.length === 0) {
    els.currentName.classList.add("hidden");
    els.placeholderText.style.display = "block";
    return;
  }
  
  els.placeholderText.style.display = "none";
  els.currentName.classList.remove("hidden");
  
  if (isMultiple) {
    // 如果是多个名字，创建多行显示
    const nameArray = Array.isArray(names) ? names : [names];
    const lines = splitNamesIntoLines(nameArray, 4);
    
    els.currentName.innerHTML = '';
    els.currentName.className = "current-name multiple";
    
    lines.forEach(lineNames => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'name-line';
      lineDiv.textContent = lineNames.join('、');
      els.currentName.appendChild(lineDiv);
    });
  } else {
    // 单个名字
    els.currentName.className = "current-name single";
    els.currentName.textContent = names;
  }
}

// 将名字数组分成多行，每行最多maxNames个
function splitNamesIntoLines(names, maxNamesPerLine) {
  const lines = [];
  for (let i = 0; i < names.length; i += maxNamesPerLine) {
    lines.push(names.slice(i, i + maxNamesPerLine));
  }
  return lines;
}

function showControls() {
  if (!els.overlayControls) return;
  els.overlayControls.classList.remove("hidden");
}

function hideControls() {
  if (!els.overlayControls) return;
  els.overlayControls.classList.add("hidden");
}

// 渲染当前奖池
function renderPool() {
  if (!els.poolList) return;
  els.poolList.innerHTML = "";
  state.remaining.forEach((id) => {
    const person = state.people.find((p) => p.id === id);
    if (!person) return;
    const li = document.createElement("li");
    li.textContent = person.name;
    li.title = "点击可将其从奖池中移除";
    li.addEventListener("click", () => {
      removeFromPool(id);
    });
    els.poolList.appendChild(li);
  });
}

// 渲染中奖结果
function renderWinners() {
  if (!els.winnersLists) return;
  ["special", "first", "second", "third"].forEach((level) => {
    const ul = els.winnersLists[level];
    if (!ul) return;
    ul.innerHTML = "";
    state.winners[level].forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.name;
      ul.appendChild(li);
    });
  });
}

// 从奖池中移除某人
function removeFromPool(id) {
  state.remaining = state.remaining.filter((pid) => pid !== id);
  state.people = state.people.filter((p) => p.id !== id);
  renderPool();
}

// 抽奖逻辑
function canStartDraw() {
  const remaining = state.remaining.length;
  const level = els.levelSelect.value;
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  
  const targetCount = countMap[level] || 1;
  const currentCount = state.winners[level].length;
  const remainingToDraw = Math.max(0, targetCount - currentCount);
  
  if (remaining === 0) {
    alert("没有可抽取的人员，名单已全部抽完。");
    return false;
  }
  
  if (remainingToDraw === 0) {
    // 当前奖项已完成，自动切换到下一个奖项
    const switched = autoSwitchToNextLevel();
    if (switched) {
      // 如果成功切换到下一个奖项，重新检查是否可以抽奖
      return canStartDraw();
    } else {
      // 已经是最后一个奖项且已完成
      alert("所有奖项抽奖已完成！");
      return false;
    }
  }
  
  if (remainingToDraw > remaining) {
    alert(
      `当前奖项需要抽取${remainingToDraw}人，但剩余人数只有${remaining}人。`
    );
    return false;
  }
  
  return true;
}

function startRolling() {
  if (!canStartDraw()) return;
  if (state.isRolling) return;

  state.isRolling = true;
  state.currentCandidateId = null;
  state.currentRoundWinners = []; // 清空当前轮次记录

  showControls();

  els.startBtn.disabled = true;
  els.stopBtn.disabled = false;

  const ids = state.remaining.slice();
  if (ids.length === 0) return;

  // 闪烁轮播：不停随机切换剩余人员
  const interval =
    Math.max(
      30,
      Math.min(
        500,
        parseInt(els.flashInterval.value || "80", 10)
      )
    ) || 80;
  state.rollingTimer = setInterval(() => {
    if (ids.length === 0) return;
    const randIndex = Math.floor(Math.random() * ids.length);
    const id = ids[randIndex];
    const person = state.people.find((p) => p.id === id);
    if (person) {
      state.currentCandidateId = id;
      updateDisplayName(person.name, false);
    }
  }, interval);

  if (getMode() === "auto") {
    const baseSec = Math.max(
      1,
      parseInt(els.autoDuration.value || "5", 10)
    );
    let durationSec = baseSec;
    if (els.autoRandom && els.autoRandom.checked) {
      const minSec = 1;
      const maxSec = Math.max(minSec, baseSec);
      durationSec =
        Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    }
    state.autoStopTimer = setTimeout(() => {
      stopAndConfirm();
    }, durationSec * 1000);
  }
}

// 显示当前奖项的中奖结果
function updateDisplayNameForCurrentLevel() {
  const level = els.levelSelect.value;
  const winners = state.winners[level];
  
  if (winners.length === 0) {
    els.placeholderText.style.display = "block";
    els.currentName.classList.add("hidden");
    return;
  }
  
  if (winners.length === 1) {
    updateDisplayName(winners[0].name, false);
  } else {
    const names = winners.map(p => p.name);
    updateDisplayName(names, true);
  }
}

function stopAndConfirm() {
  if (!state.isRolling) return;

  state.isRolling = false;
  clearInterval(state.rollingTimer);
  state.rollingTimer = null;

  if (state.autoStopTimer) {
    clearTimeout(state.autoStopTimer);
    state.autoStopTimer = null;
  }

  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;

  // 根据当前奖项设置抽取人数
  const level = els.levelSelect.value;
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  const targetCount = countMap[level] || 0;
  const currentCount = state.winners[level].length;
  const remainingToDraw = Math.max(0, targetCount - currentCount);
  
  // 计算本轮实际抽取人数
  const needCount = Math.min(remainingToDraw, state.remaining.length);
  
  const remainingIds = state.remaining.slice();
  const shuffled = shuffle(remainingIds);
  const takeIds = shuffled.slice(0, needCount);

  // 清空当前轮次记录，重新记录本轮中奖者
  state.currentRoundWinners = [];

  takeIds.forEach((id) => {
    const person = state.people.find((p) => p.id === id);
    if (!person) return;
    state.currentRoundWinners.push({...person}); // 复制人员信息
    state.winners[level].push(person);
    state.remaining = state.remaining.filter((pid) => pid !== id);
  });

  // 检查当前奖项是否已完成
  const newCount = state.winners[level].length;
  if (newCount >= targetCount) {
    state.levelsCompleted[level] = true;
  }

  // 更新显示
  renderPool();
  renderWinners();
  updateDisplayNameForCurrentLevel();

  // 隐藏控制按钮
  hideControls();
  
  // 3秒后显示控制按钮，准备下一轮抽奖
  setTimeout(() => {
    showControls();
  }, 3000);
}

// 重置本轮抽奖结果
function resetCurrentRound() {
  if (state.isRolling) {
    alert("请先停止抽奖，然后再重置本轮");
    return;
  }
  
  if (state.currentRoundWinners.length === 0) {
    alert("没有本轮抽奖结果可以重置");
    return;
  }
  
  const level = els.levelSelect.value;
  
  // 将本轮中奖者从获奖名单中移除
  state.currentRoundWinners.forEach(person => {
    // 从获奖名单中移除
    state.winners[level] = state.winners[level].filter(p => p.id !== person.id);
    
    // 将人员重新加入奖池
    if (!state.people.some(p => p.id === person.id)) {
      state.people.push({...person});
    }
    
    if (!state.remaining.includes(person.id)) {
      state.remaining.push(person.id);
    }
  });
  
  // 重新打乱奖池顺序
  state.remaining = shuffle(state.remaining);
  
  // 清空当前轮次记录
  state.currentRoundWinners = [];
  
  // 重新检查当前奖项是否完成
  const countMap = {
    third: 8,
    second: 5,
    first: 3,
    special: 2
  };
  const targetCount = countMap[level] || 0;
  const currentCount = state.winners[level].length;
  state.levelsCompleted[level] = currentCount >= targetCount;
  
  // 更新显示
  renderPool();
  renderWinners();
  updateDisplayNameForCurrentLevel();
  
  alert(`已重置本轮抽奖结果，${state.currentRoundWinners.length}人中奖者已重新加入奖池`);
  
  // 显示控制按钮
  showControls();
}

// 从文本导入奖池姓名
function applyImportNames() {
  if (!els.namesImport) return;
  const raw = els.namesImport.value.trim();
  if (!raw) {
    alert("请输入要导入的姓名。");
    return;
  }

  const rawNames = raw
    .split(/[\n,，,]+/)
    .map((n) => n.trim())
    .filter((n) => !!n);

  if (rawNames.length === 0) {
    alert("未解析到有效姓名，请检查格式。");
    return;
  }

  const uniqueNames = Array.from(new Set(rawNames));
  uniqueNames.forEach((name) => {
    if (state.people.some((p) => p.name === name)) {
      return;
    }
    const id = uuid();
    const person = { id, name };
    state.people.push(person);
    state.remaining.push(id);
  });

  state.remaining = shuffle(state.remaining);
  els.namesImport.value = "";
  resetRound();
  renderPool();
  alert(`已成功导入并追加人员，当前奖池总人数：${state.people.length}。`);
}

function resetRound() {
  if (state.isRolling) {
    clearInterval(state.rollingTimer);
    state.rollingTimer = null;
    state.isRolling = false;
  }
  if (state.autoStopTimer) {
    clearTimeout(state.autoStopTimer);
    state.autoStopTimer = null;
  }
  state.currentCandidateId = null;
  state.currentRoundWinners = [];
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
  updateDisplayNameForCurrentLevel();
  showControls();
}

// 事件绑定
function bindEvents() {
  els.startBtn.addEventListener("click", startRolling);
  els.stopBtn.addEventListener("click", stopAndConfirm);
  els.resetRoundBtn.addEventListener("click", resetCurrentRound);

  // 奖项下拉变更时，实时更新
  els.levelSelect.addEventListener("change", () => {
    updateLevelDisplay();
    updateDisplayNameForCurrentLevel();
  });

  if (els.applyImportBtn) {
    els.applyImportBtn.addEventListener("click", applyImportNames);
  }
}

function init() {
  // 初始化人员列表
  const uniquePreset = Array.from(new Set(PRESET_NAMES));
  const shuffledNames = shuffle(uniquePreset);
  shuffledNames.forEach((name) => {
    const id = uuid();
    const person = { id, name };
    state.people.push(person);
    state.remaining.push(id);
  });

  bindEvents();
  renderPool();
  renderWinners();
  
  // 初始化显示
  updateLevelDisplay();
  updateDisplayNameForCurrentLevel();
  showControls();
}

document.addEventListener("DOMContentLoaded", init);