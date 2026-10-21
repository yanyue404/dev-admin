<template>
  <div class="dashboard-container">
    <!-- 模式切换 + 操作按钮 -->
    <div class="top-bar">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button label="json">JSON 对比</el-radio-button>
        <el-radio-button label="text">任意文本</el-radio-button>
      </el-radio-group>
      <div class="top-actions">
        <el-button @click="compare" type="primary" size="small" icon="el-icon-s-operation">开始比较</el-button>
        <el-button @click="clearAll" size="small" icon="el-icon-delete">清空</el-button>
        <el-button @click="loadSample" size="small" type="success" icon="el-icon-document">加载示例</el-button>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <div class="input-panel">
        <div class="panel-header">
          <span>原始内容</span>
          <el-button v-if="mode === 'json'" @click="formatLeft" size="mini" icon="el-icon-s-tools">格式化</el-button>
        </div>
        <el-input
          type="textarea"
          :rows="12"
          :placeholder="mode === 'json' ? '请输入原始 JSON...' : '请输入原始文本...'"
          v-model="leftText"
        ></el-input>
      </div>
      <div class="input-panel">
        <div class="panel-header">
          <span>目标内容</span>
          <el-button v-if="mode === 'json'" @click="formatRight" size="mini" icon="el-icon-s-tools">格式化</el-button>
        </div>
        <el-input
          type="textarea"
          :rows="12"
          :placeholder="mode === 'json' ? '请输入目标 JSON...' : '请输入目标文本...'"
          v-model="rightText"
        ></el-input>
      </div>
    </div>

    <!-- JSON 模式：高亮对比结果 -->
    <div v-if="mode === 'json' && jsonResult" class="result-area">
      <div class="result-summary">
        <el-tag v-if="jsonResult.identical" type="success" size="small">JSON 完全相同</el-tag>
        <el-tag v-else type="warning" size="small">共有 {{ jsonResult.differences.length }} 处不一致</el-tag>
      </div>
      <div v-if="!jsonResult.identical" class="compare-panels">
        <div class="compare-panel">
          <div class="panel-header"><span>原始 JSON</span></div>
          <div class="highlighted-display" ref="leftDisplay" v-html="leftHighlighted"></div>
        </div>
        <div class="compare-panel">
          <div class="panel-header"><span>目标 JSON</span></div>
          <div class="highlighted-display" ref="rightDisplay" v-html="rightHighlighted"></div>
        </div>
      </div>
    </div>

    <!-- 文本模式：行对齐对比结果 -->
    <div v-if="mode === 'text' && textResult" class="result-area">
      <div class="result-summary">
        <el-tag type="warning" size="small">共有 {{ textResult.diffCount }} 处行差异</el-tag>
        <span class="stats-detail">
          <span class="stat-added">+{{ textResult.addedCount }}</span>
          <span class="stat-removed">-{{ textResult.removedCount }}</span>
        </span>
      </div>
      <div class="diff-view">
        <div class="diff-col diff-col-left">
          <div class="diff-col-header">原始文本</div>
          <div
            v-for="(line, idx) in textResult.leftLines"
            :key="idx"
            :class="['diff-row', 'diff-row-' + line.type]"
          >
            <span class="line-num">{{ line.num }}</span>
            <span class="line-marker">{{ line.marker }}</span>
            <span class="line-text">{{ line.text }}</span>
          </div>
        </div>
        <div class="diff-col diff-col-right">
          <div class="diff-col-header">目标文本</div>
          <div
            v-for="(line, idx) in textResult.rightLines"
            :key="idx"
            :class="['diff-row', 'diff-row-' + line.type]"
          >
            <span class="line-num">{{ line.num }}</span>
            <span class="line-marker">{{ line.marker }}</span>
            <span class="line-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonCompare',
  data() {
    return {
      mode: 'json',
      leftText: '',
      rightText: '',
      // JSON 模式数据
      jsonResult: null,
      leftHighlighted: '',
      rightHighlighted: '',
      // 文本模式数据
      textResult: null,
      // 同步滚动
      isSyncingScroll: false
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.setupSyncScroll()
    })
  },
  updated() {
    this.$nextTick(() => {
      this.setupSyncScroll()
    })
  },
  methods: {
    // ========== 通用操作 ==========

    compare() {
      if (this.mode === 'json') {
        this.compareJSON()
      } else {
        this.compareText()
      }
    },

    clearAll() {
      this.leftText = ''
      this.rightText = ''
      this.jsonResult = null
      this.leftHighlighted = ''
      this.rightHighlighted = ''
      this.textResult = null
    },

    loadSample() {
      if (this.mode === 'json') {
        this.leftText = JSON.stringify({
          "name": "张三",
          "age": 25,
          "city": "北京",
          "hobbies": ["读书", "游泳"],
          "profile": {
            "email": "zhangsan@example.com",
            "phone": "13800138000",
            "address": { "street": "朝阳路100号", "district": "朝阳区" }
          },
          "skills": ["JavaScript", "Vue.js", "Node.js"],
          "employed": true
        }, null, 2)

        this.rightText = JSON.stringify({
          "name": "张三",
          "age": 26,
          "city": "上海",
          "hobbies": ["读书", "游泳", "跑步"],
          "profile": {
            "email": "zhangsan@newmail.com",
            "phone": "13800138000",
            "address": { "street": "南京路200号", "district": "黄浦区", "zipCode": "200001" }
          },
          "skills": ["JavaScript", "Vue.js", "React.js"],
          "employed": true,
          "salary": 15000
        }, null, 2)
      } else {
        this.leftText = `# 发布说明

- 支持 JSON 自动格式化
- 支持 URL 解码
- 支持 BigInt

> 如需升级，请重新打开扩展。`

        this.rightText = `# 发布说明

- 支持 JSON 自动格式化
- 支持 URL / Unicode 解码
- 支持 BigInt
- 新增任意文本对比

> 如需升级，请重新打开扩展。`
      }
      this.jsonResult = null
      this.textResult = null
      this.$message.success('示例已加载')
      this.compare()
    },

    // ========== JSON 模式 ==========

    formatLeft() {
      try {
        this.leftText = JSON.stringify(JSON.parse(this.leftText), null, 2)
      } catch (e) {
        this.$message.error('左侧 JSON 格式错误')
      }
    },

    formatRight() {
      try {
        this.rightText = JSON.stringify(JSON.parse(this.rightText), null, 2)
      } catch (e) {
        this.$message.error('右侧 JSON 格式错误')
      }
    },

    compareJSON() {
      if (!this.leftText.trim() || !this.rightText.trim()) {
        this.$message.warning('请输入两份 JSON 数据')
        return
      }
      try {
        const leftObj = JSON.parse(this.leftText)
        const rightObj = JSON.parse(this.rightText)
        const diffs = this.deepCompare(leftObj, rightObj, '')
        this.jsonResult = { identical: diffs.length === 0, differences: diffs }

        if (diffs.length === 0) {
          this.leftHighlighted = ''
          this.rightHighlighted = ''
        } else {
          const diffMap = new Map()
          diffs.forEach(d => diffMap.set(d.path, d))
          this.leftHighlighted = this.buildHL(leftObj, diffMap, 'left').html
          this.rightHighlighted = this.buildHL(rightObj, diffMap, 'right').html
        }
      } catch (e) {
        this.$message.error('JSON 解析失败: ' + e.message)
      }
    },

    deepCompare(left, right, path) {
      const diffs = []
      if (left === null && right === null) return diffs
      if (left === null || right === null) {
        if (left !== right) diffs.push({ path: path || 'root', type: 'modified', leftValue: left, rightValue: right })
        return diffs
      }
      if (typeof left !== typeof right) {
        diffs.push({ path: path || 'root', type: 'modified', leftValue: left, rightValue: right })
        return diffs
      }
      if (typeof left !== 'object') {
        if (left !== right) diffs.push({ path: path || 'root', type: 'modified', leftValue: left, rightValue: right })
        return diffs
      }
      if (Array.isArray(left) !== Array.isArray(right)) {
        diffs.push({ path: path || 'root', type: 'modified', leftValue: left, rightValue: right })
        return diffs
      }
      if (Array.isArray(left)) {
        const maxLen = Math.max(left.length, right.length)
        for (let i = 0; i < maxLen; i++) {
          const curPath = path ? `${path}[${i}]` : `[${i}]`
          if (i >= left.length) diffs.push({ path: curPath, type: 'added', leftValue: undefined, rightValue: right[i] })
          else if (i >= right.length) diffs.push({ path: curPath, type: 'removed', leftValue: left[i], rightValue: undefined })
          else diffs.push(...this.deepCompare(left[i], right[i], curPath))
        }
        return diffs
      }
      const lk = Object.keys(left), rk = Object.keys(right)
      for (const key of new Set([...lk, ...rk])) {
        const curPath = path ? `${path}.${key}` : key
        if (lk.includes(key) && !rk.includes(key)) diffs.push({ path: curPath, type: 'removed', leftValue: left[key], rightValue: undefined })
        else if (!lk.includes(key) && rk.includes(key)) diffs.push({ path: curPath, type: 'added', leftValue: undefined, rightValue: right[key] })
        else diffs.push(...this.deepCompare(left[key], right[key], curPath))
      }
      return diffs
    },

    // 结构感知高亮生成
    // forceDiff: 当父级元素是 added/removed 时，强制所有子元素也用该 diff 高亮
    // 返回 { html, hasDiff } 以便父级判断是否需要行级高亮
    buildHL(obj, diffMap, side, curPath, indent, forceDiff) {
      if (curPath === undefined) curPath = ''
      if (indent === undefined) indent = 0
      const ind = '&nbsp;&nbsp;'.repeat(indent)

      // 查找当前路径的 diff，如果有 forceDiff 则优先使用
      const d = forceDiff || diffMap.get(curPath)
      const shouldForce = !forceDiff && d && this.shouldHL(d, side) && (d.type === 'added' || d.type === 'removed')
      const childForce = shouldForce ? d : forceDiff
      const diffType = childForce?.type || d?.type

      if (obj === null) {
        const b = '<span class="j-null">null</span>'
        const html = d && this.shouldHL(d, side) ? this.wrapHL(b, d, side) : b
        return { html, hasDiff: !!(d && this.shouldHL(d, side)), diffType }
      }
      if (obj === undefined) return { html: '<span class="j-null">undefined</span>', hasDiff: false }
      if (typeof obj !== 'object') {
        const vs = typeof obj === 'string' ? this.esc(JSON.stringify(obj)) : String(obj)
        const b = `<span class="j-${typeof obj}">${vs}</span>`
        const html = d && this.shouldHL(d, side) ? this.wrapHL(b, d, side) : b
        return { html, hasDiff: !!(d && this.shouldHL(d, side)), diffType }
      }

      const lines = []
      let hasAnyDiff = false

      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          const b = `${ind}<span class="j-bk">[]</span>`
          const html = d && this.shouldHL(d, side) ? this.wrapHL(b, d, side) : b
          return { html, hasDiff: !!(d && this.shouldHL(d, side)), diffType }
        }
        lines.push(`${ind}<span class="j-bk">[</span>`)
        obj.forEach((item, i) => {
          const ip = curPath ? `${curPath}[${i}]` : `[${i}]`
          const result = this.buildHL(item, diffMap, side, ip, indent + 1, childForce)
          const c = i < obj.length - 1 ? '<span class="j-cm">,</span>' : ''
          // 整行高亮：如果子元素有差异，给整行加背景
          if (result.hasDiff) {
            hasAnyDiff = true
            const lineClass = `line-diff line-diff-${result.diffType}`
            lines.push(`${ind}<span class="${lineClass}">&nbsp;&nbsp;${result.html}${c}</span>`)
          } else {
            lines.push(`${ind}&nbsp;&nbsp;${result.html}${c}`)
          }
        })
        lines.push(`${ind}<span class="j-bk">]</span>`)
      } else {
        const keys = Object.keys(obj)
        if (keys.length === 0) {
          const b = `${ind}<span class="j-bk">{}</span>`
          const html = d && this.shouldHL(d, side) ? this.wrapHL(b, d, side) : b
          return { html, hasDiff: !!(d && this.shouldHL(d, side)), diffType }
        }
        lines.push(`${ind}<span class="j-bk">{</span>`)
        keys.forEach((key, i) => {
          const kp = curPath ? `${curPath}.${key}` : key
          const kd = childForce || diffMap.get(kp)
          const c = i < keys.length - 1 ? '<span class="j-cm">,</span>' : ''
          const ek = this.esc(JSON.stringify(key))
          const kh = kd && this.shouldHL(kd, side) ? this.wrapHL(`<span class="j-key">${ek}</span>`, kd, side) : `<span class="j-key">${ek}</span>`
          const vh = this.buildHL(obj[key], diffMap, side, kp, indent + 1, childForce)
          // 整行高亮
          if (vh.hasDiff) {
            hasAnyDiff = true
            const lineClass = `line-diff line-diff-${vh.diffType}`
            lines.push(`${ind}<span class="${lineClass}">&nbsp;&nbsp;${kh}<span class="j-col">: </span>${vh.html}${c}</span>`)
          } else {
            lines.push(`${ind}&nbsp;&nbsp;${kh}<span class="j-col">: </span>${vh.html}${c}`)
          }
        })
        lines.push(`${ind}<span class="j-bk">}</span>`)
      }
      return { html: lines.join('<br>'), hasDiff: hasAnyDiff, diffType }
    },

    shouldHL(d, side) {
      if (d.type === 'added') return side === 'right'
      if (d.type === 'removed') return side === 'left'
      return true
    },

    hlClass(d, side) {
      if (d.type === 'added' && side === 'right') return 'hl-added'
      if (d.type === 'removed' && side === 'left') return 'hl-removed'
      if (d.type === 'modified') return side === 'left' ? 'hl-mod-left' : 'hl-mod-right'
      return ''
    },

    wrapHL(base, d, side) {
      return `<span class="hl ${this.hlClass(d, side)}">${base}</span>`
    },

    esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },

    // ========== 同步滚动 ==========

    setupSyncScroll() {
      const left = this.$refs.leftDisplay
      const right = this.$refs.rightDisplay
      if (!left || !right) return

      // 移除旧监听
      left.removeEventListener('scroll', this._onLeftScroll)
      right.removeEventListener('scroll', this._onRightScroll)

      this._onLeftScroll = () => {
        if (this.isSyncingScroll) return
        this.isSyncingScroll = true
        right.scrollTop = left.scrollTop
        this.$nextTick(() => { this.isSyncingScroll = false })
      }
      this._onRightScroll = () => {
        if (this.isSyncingScroll) return
        this.isSyncingScroll = true
        left.scrollTop = right.scrollTop
        this.$nextTick(() => { this.isSyncingScroll = false })
      }

      left.addEventListener('scroll', this._onLeftScroll)
      right.addEventListener('scroll', this._onRightScroll)
    },

    // ========== 文本模式 ==========

    compareText() {
      if (!this.leftText && !this.rightText) {
        this.$message.warning('请输入两份文本')
        return
      }
      const lLines = this.leftText.split('\n')
      const rLines = this.rightText.split('\n')

      // LCS diff 算法：智能对齐相同行
      const ops = this.computeLCSDiff(lLines, rLines)

      const leftDisplay = []
      const rightDisplay = []
      let lNum = 0, rNum = 0, diffCount = 0, addedCount = 0, removedCount = 0

      for (const op of ops) {
        if (op.type === 'equal') {
          lNum++; rNum++
          leftDisplay.push({ num: lNum, marker: '', type: 'equal', text: op.left })
          rightDisplay.push({ num: rNum, marker: '', type: 'equal', text: op.right })
        } else if (op.type === 'modified') {
          lNum++; rNum++; diffCount++
          leftDisplay.push({ num: lNum, marker: '-', type: 'removed', text: op.left })
          rightDisplay.push({ num: rNum, marker: '+', type: 'added', text: op.right })
        } else if (op.type === 'removed') {
          lNum++; removedCount++; diffCount++
          leftDisplay.push({ num: lNum, marker: '-', type: 'removed', text: op.left })
          rightDisplay.push({ num: '', marker: '', type: 'empty', text: '' })
        } else if (op.type === 'added') {
          rNum++; addedCount++; diffCount++
          leftDisplay.push({ num: '', marker: '', type: 'empty', text: '' })
          rightDisplay.push({ num: rNum, marker: '+', type: 'added', text: op.right })
        }
      }

      this.textResult = { leftLines: leftDisplay, rightLines: rightDisplay, diffCount, addedCount, removedCount }
    },

    // LCS diff：用最长公共子序列智能对齐行
    computeLCSDiff(leftLines, rightLines) {
      const m = leftLines.length
      const n = rightLines.length

      // 大文本降级：超过 500 行用简单逐行比较
      if (m + n > 500) {
        return this.simpleLineDiff(leftLines, rightLines)
      }

      // 构建 LCS DP 表
      const dp = []
      for (let i = 0; i <= m; i++) {
        dp[i] = new Uint16Array(n + 1)
      }
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (leftLines[i - 1] === rightLines[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
          }
        }
      }

      // 回溯获取 diff 操作序列
      const ops = []
      let i = m, j = n
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
          ops.push({ type: 'equal', leftIdx: i - 1, rightIdx: j - 1 })
          i--; j--
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          ops.push({ type: 'added', rightIdx: j - 1 })
          j--
        } else {
          ops.push({ type: 'removed', leftIdx: i - 1 })
          i--
        }
      }
      ops.reverse()

      // 合并连续的 removed + added 为 modified
      const result = []
      let k = 0
      while (k < ops.length) {
        if (ops[k].type === 'equal') {
          result.push({ type: 'equal', left: leftLines[ops[k].leftIdx], right: rightLines[ops[k].rightIdx] })
          k++
        } else {
          // 收集连续的 removed 和 added
          const removedBatch = []
          const addedBatch = []
          while (k < ops.length && ops[k].type === 'removed') {
            removedBatch.push(ops[k].leftIdx)
            k++
          }
          while (k < ops.length && ops[k].type === 'added') {
            addedBatch.push(ops[k].rightIdx)
            k++
          }
          // 配对合并为 modified，余下保持原类型
          const pairCount = Math.min(removedBatch.length, addedBatch.length)
          for (let p = 0; p < pairCount; p++) {
            result.push({ type: 'modified', left: leftLines[removedBatch[p]], right: rightLines[addedBatch[p]] })
          }
          for (let p = pairCount; p < removedBatch.length; p++) {
            result.push({ type: 'removed', left: leftLines[removedBatch[p]] })
          }
          for (let p = pairCount; p < addedBatch.length; p++) {
            result.push({ type: 'added', right: rightLines[addedBatch[p]] })
          }
        }
      }

      return result
    },

    // 大文本降级：简单逐行对齐
    simpleLineDiff(leftLines, rightLines) {
      const maxLen = Math.max(leftLines.length, rightLines.length)
      const result = []
      for (let i = 0; i < maxLen; i++) {
        const l = i < leftLines.length ? leftLines[i] : null
        const r = i < rightLines.length ? rightLines[i] : null
        if (l !== null && r !== null) {
          if (l === r) result.push({ type: 'equal', left: l, right: r })
          else result.push({ type: 'modified', left: l, right: r })
        } else if (l !== null) {
          result.push({ type: 'removed', left: l })
        } else {
          result.push({ type: 'added', right: r })
        }
      }
      return result
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  margin: 30px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-lighter);

  .top-actions {
    display: flex;
    gap: 8px;
  }
}

.input-area {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.input-panel {
  flex: 1;
  min-width: 0;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
}

.result-area {
  margin-top: 16px;

  .result-summary {
    text-align: center;
    margin-bottom: 16px;

    .stats-detail {
      margin-left: 10px;
      font-size: 13px;

      .stat-added { color: #67c23a; }
      .stat-removed { color: #f56c6c; margin-left: 6px; }
    }
  }
}

/* JSON 高亮面板 */
.compare-panels {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.compare-panel {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-color);

  &:last-child {
    border-right: none;
  }

  .panel-header {
    font-weight: bold;
    font-size: 13px;
    color: var(--text-regular);
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .highlighted-display {
    min-height: 200px;
    max-height: 600px;
    padding: 10px 12px;
    background: var(--bg-primary);
    font-family: 'Courier New', Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

/* 文本 Diff 面板 */
.diff-view {
  display: flex;
  gap: 16px;
}

.diff-col {
  flex: 1;
  min-width: 0;

  .diff-col-header {
    font-weight: bold;
    font-size: 13px;
    color: var(--text-regular);
    padding: 6px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-bottom: none;
    border-radius: 4px 4px 0 0;
  }

  .diff-row {
    display: flex;
    align-items: baseline;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    border-left: 3px solid transparent;
    padding: 0 8px;
    min-height: 20px;

    .line-num {
      width: 35px;
      text-align: right;
      color: var(--text-placeholder);
      padding-right: 6px;
      user-select: none;
      flex-shrink: 0;
    }

    .line-marker {
      width: 16px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .line-text {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }

  .diff-row:last-child {
    border-radius: 0 0 4px 4px;
  }

  .diff-row-equal {
    background: var(--bg-primary);
    border-left-color: transparent;
  }

  .diff-row-removed {
    background: var(--diff-removed-bg);
    border-left-color: #f56c6c;
    .line-marker { color: var(--diff-removed-text); }
    .line-text { color: var(--diff-removed-text); }
  }

  .diff-row-added {
    background: var(--diff-added-bg);
    border-left-color: #67c23a;
    .line-marker { color: var(--diff-added-text); }
    .line-text { color: var(--diff-added-text); }
  }

  .diff-row-empty {
    background: var(--bg-tertiary);
    color: var(--text-placeholder);
  }

  .diff-row {
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-lighter);
  }

  .diff-col-header {
    border-right: 1px solid var(--border-color);
  }
}

@media (max-width: 768px) {
  .input-area, .compare-panels, .diff-view {
    flex-direction: column;
  }
}
</style>

<style lang="scss">
/* JSON 语法色（全局） - CSS 变量适配暗黑 */
.j-key { color: var(--code-key); }
.j-string { color: var(--code-string); }
.j-number { color: var(--code-number); }
.j-boolean { color: var(--code-boolean); }
.j-null { color: var(--code-null); }
.j-bk { color: var(--code-bracket); }
.j-cm { color: var(--code-bracket); }
.j-col { color: var(--code-bracket); }

/* JSON 差异高亮色（全局） */
.hl {
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 600;

  &.hl-added { background: rgba(103, 194, 58, 0.3); border: 1px solid rgba(103, 194, 58, 0.7); color: var(--diff-added-text); }
  &.hl-removed { background: rgba(245, 108, 108, 0.3); border: 1px solid rgba(245, 108, 108, 0.7); color: var(--diff-removed-text); text-decoration: line-through; }
  &.hl-mod-left { background: rgba(230, 162, 60, 0.3); border: 1px solid rgba(230, 162, 60, 0.7); color: #9a6700; }
  &.hl-mod-right { background: rgba(64, 158, 255, 0.3); border: 1px solid rgba(64, 158, 255, 0.7); color: #0550ae; }
}

/* 整行高亮 */
.line-diff {
  display: inline;
  border-radius: 3px;

  &.line-diff-added {
    background: rgba(103, 194, 58, 0.12);
    border-left: 3px solid rgba(103, 194, 58, 0.6);
    padding: 1px 4px 1px 2px;
  }
  &.line-diff-removed {
    background: rgba(245, 108, 108, 0.12);
    border-left: 3px solid rgba(245, 108, 108, 0.6);
    padding: 1px 4px 1px 2px;
  }
  &.line-diff-modified {
    background: rgba(230, 162, 60, 0.12);
    border-left: 3px solid rgba(230, 162, 60, 0.6);
    padding: 1px 4px 1px 2px;
  }
}
</style>
