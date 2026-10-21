<template>
  <div class="dashboard-container">
    <el-alert title="正则表达式测试器" type="info" show-icon :closable="false"></el-alert>
    <br />

    <el-card class="box-card">
      <!-- 正则表达式输入区 -->
      <div class="regex-input-section">
        <div class="regex-pattern-row">
          <span class="regex-slash">/</span>
          <el-input
            v-model="pattern"
            placeholder="输入正则表达式，如：\d+、[a-zA-Z]+、(hello)\s(world)"
            class="regex-pattern-input"
            @input="runTest"
          ></el-input>
          <span class="regex-slash">/</span>
          <div class="flags-row">
            <el-checkbox v-model="flagsObj.g" @change="runTest">g</el-checkbox>
            <el-checkbox v-model="flagsObj.i" @change="runTest">i</el-checkbox>
            <el-checkbox v-model="flagsObj.m" @change="runTest">m</el-checkbox>
            <el-checkbox v-model="flagsObj.s" @change="runTest">s</el-checkbox>
            <el-checkbox v-model="flagsObj.u" @change="runTest">u</el-checkbox>
          </div>
        </div>
      </div>

      <!-- 常用正则预设 -->
      <div class="presets-section">
        <span class="presets-label">常用正则：</span>
        <el-tag
          v-for="preset in presets"
          :key="preset.name"
          size="small"
          :type="activePreset === preset.name ? '' : 'info'"
          class="preset-tag"
          @click.native="loadPreset(preset)"
        >
          {{ preset.name }}
        </el-tag>
      </div>

      <!-- 测试字符串输入 -->
      <div class="test-string-section">
        <div class="section-label">测试字符串</div>
        <el-input
          type="textarea"
          :rows="6"
          placeholder="在此输入需要测试的字符串..."
          v-model="testString"
          @input="runTest"
        ></el-input>
      </div>

      <!-- 高亮匹配结果 -->
      <div v-if="highlightedText" class="match-highlight-section">
        <div class="section-label">匹配结果高亮</div>
        <div class="highlighted-display" v-html="highlightedText"></div>
      </div>

      <!-- 错误提示 -->
      <el-alert v-if="regexError" :title="regexError" type="error" show-icon :closable="false" style="margin-top: 12px;"></el-alert>

      <!-- 匹配详情表格 -->
      <div v-if="matches.length > 0" class="match-details-section">
        <div class="section-label">
          匹配详情（共 {{ matches.length }} 个匹配）
        </div>
        <el-table :data="matchesTableData" border size="small" max-height="300">
          <el-table-column prop="index" label="#" width="60"></el-table-column>
          <el-table-column prop="match" label="完整匹配" min-width="150"></el-table-column>
          <el-table-column prop="position" label="位置" width="100"></el-table-column>
          <el-table-column prop="length" label="长度" width="80"></el-table-column>
        </el-table>
      </div>

      <!-- 分组详情 -->
      <div v-if="groupsTableData.length > 0" class="group-details-section">
        <div class="section-label">
          分组详情（共 {{ groupsTableData.length }} 个捕获组）
        </div>
        <el-table :data="groupsTableData" border size="small" max-height="400">
          <el-table-column prop="matchIndex" label="匹配#" width="60"></el-table-column>
          <el-table-column prop="groupIndex" label="分组#" width="70"></el-table-column>
          <el-table-column prop="groupName" label="命名" width="120">
            <template slot-scope="{ row }">
              <span v-if="row.groupName" class="named-group">{{ row.groupName }}</span>
              <span v-else class="index-group">{{ row.groupLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="groupValue" label="值" min-width="200"></el-table-column>
          <el-table-column prop="groupPos" label="位置" width="80"></el-table-column>
          <el-table-column prop="groupLen" label="长度" width="80"></el-table-column>
        </el-table>
      </div>

      <!-- 无匹配提示 -->
      <el-alert v-if="pattern && testString && !regexError && matches.length === 0" title="没有找到匹配" type="warning" show-icon :closable="false" style="margin-top: 12px;"></el-alert>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'RegexTester',
  data() {
    return {
      pattern: '',
      flagsObj: { g: true, i: false, m: false, s: false, u: false },
      testString: '',
      matches: [],
      highlightedText: '',
      regexError: '',
      activePreset: ''
    }
  },
  computed: {
    flags() {
      let f = ''
      if (this.flagsObj.g) f += 'g'
      if (this.flagsObj.i) f += 'i'
      if (this.flagsObj.m) f += 'm'
      if (this.flagsObj.s) f += 's'
      if (this.flagsObj.u) f += 'u'
      return f
    },
    matchesTableData() {
      return this.matches.map((m, i) => ({
        index: i + 1,
        match: m[0],
        position: m.index,
        length: m[0].length
      }))
    },
    groupsTableData() {
      const rows = []
      this.matches.forEach((m, mi) => {
        // 计算每个分组在原始字符串中的位置
        const groupPositions = this.computeGroupPositions(m)
        for (let g = 1; g < m.length; g++) {
          if (m[g] === undefined) continue
          // 查找命名
          let namedKey = null
          if (m.groups) {
            for (const [name, val] of Object.entries(m.groups)) {
              if (val === m[g] && !Object.values(m.groups).filter(v => v === m[g] && name !== Object.keys(m.groups).find(k => m.groups[k] === v)).length) {
                namedKey = name
              }
            }
          }
          const posInfo = groupPositions[g] || {}
          rows.push({
            matchIndex: mi + 1,
            groupIndex: g,
            groupName: namedKey || '',
            groupLabel: `$${g}`,
            groupValue: m[g],
            groupPos: posInfo.start !== undefined ? posInfo.start : '-',
            groupLen: m[g].length
          })
        }
        // 只在命名组中且不在 indexed groups 中的
        if (m.groups) {
          for (const [name, val] of Object.entries(m.groups)) {
            let isIndexed = false
            for (let g = 1; g < m.length; g++) {
              if (m[g] === val) { isIndexed = true; break }
            }
            if (!isIndexed) {
              rows.push({
                matchIndex: mi + 1,
                groupIndex: '-',
                groupName: name,
                groupLabel: name,
                groupValue: val || '',
                groupPos: '-',
                groupLen: (val || '').length
              })
            }
          }
        }
      })
      return rows
    },
    presets() {
      return [
        { name: '手机号', pattern: '^1[3-9]\\d{9}$', flags: '', test: '13800138000' },
        { name: '邮箱', pattern: '^\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$', flags: 'i', test: 'test@example.com' },
        { name: '身份证', pattern: '^\\d{17}[\\dXx]$', flags: '', test: '11010119900307771X' },
        { name: 'URL', pattern: 'https?://[\\w\\-]+(\\.[\\w\\-]+)+[\\w\\-.,@?^=%&:/~+#]*', flags: 'g', test: '访问 https://example.com/api 或 http://localhost:9528' },
        { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]+', flags: 'g', test: '你好，世界！' },
        { name: 'HTML标签', pattern: '<([a-z][a-z0-9]*)\\b[^>]*>(.*?)</\\1>', flags: 'gi', test: '<div class="box">内容</div><p>段落</p>' },
        { name: 'IP地址', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', flags: 'g', test: '服务器 192.168.1.100 和 10.0.0.1' },
        { name: '日期', pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}', flags: 'g', test: '2024-01-15 和 2023/12/31' },
        { name: '数字提取', pattern: '-?\\d+(\\.\\d+)?', flags: 'g', test: '价格 29.9 元，折扣 -5.5，总量 100' },
        { name: '密码强度', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$', flags: '', test: 'Abc123!@#' }
      ]
    }
  },
  methods: {
    runTest() {
      this.regexError = ''
      this.matches = []
      this.highlightedText = ''

      if (!this.pattern || !this.testString) return

      try {
        const regex = new RegExp(this.pattern, this.flags)
        const results = []

        if (this.flagsObj.g) {
          let match
          const maxMatches = 500
          let count = 0
          while ((match = regex.exec(this.testString)) !== null && count < maxMatches) {
            const arr = Array.from(match)
            arr.index = match.index
            arr.groups = match.groups || {}
            results.push(arr)
            count++
            if (match[0].length === 0) regex.lastIndex++
          }
        } else {
          const match = regex.exec(this.testString)
          if (match) {
            const arr = Array.from(match)
            arr.index = match.index
            arr.groups = match.groups || {}
            results.push(arr)
          }
        }

        this.matches = results
        this.buildHighlightedText()
      } catch (e) {
        this.regexError = '正则表达式错误: ' + e.message
      }
    },

    computeGroupPositions(match) {
      const positions = {}
      const fullMatch = match[0]
      const fullStart = match.index

      const groupValues = []
      for (let g = 1; g < match.length; g++) {
        if (match[g] !== undefined) {
          groupValues.push({ index: g, value: match[g] })
        }
      }

      groupValues.sort((a, b) => b.value.length - a.value.length)

      const usedRanges = []
      for (const gv of groupValues) {
        if (!gv.value) {
          positions[gv.index] = { start: fullStart, end: fullStart }
          continue
        }
        const searchStart = fullStart
        const searchEnd = fullStart + fullMatch.length
        let found = -1
        for (let s = searchStart; s <= searchEnd - gv.value.length; s++) {
          if (this.testString.substring(s, s + gv.value.length) === gv.value) {
            const conflict = usedRanges.some(r => s >= r.start && s < r.end)
            if (!conflict) {
              found = s
              break
            }
          }
        }
        if (found !== -1) {
          positions[gv.index] = { start: found, end: found + gv.value.length }
          usedRanges.push({ start: found, end: found + gv.value.length })
        }
      }
      return positions
    },

    buildHighlightedText() {
      if (this.matches.length === 0) {
        this.highlightedText = ''
        return
      }

      let html = ''
      let lastIdx = 0

      const sorted = [...this.matches].sort((a, b) => a.index - b.index)

      for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i]
        html += this.esc(this.testString.substring(lastIdx, m.index))
        const matchColors = [
          'match-0', 'match-1', 'match-2', 'match-3', 'match-4',
          'match-5', 'match-6', 'match-7', 'match-8', 'match-9'
        ]
        const colorClass = matchColors[i % matchColors.length]
        html += `<span class="match-hl ${colorClass}" data-match="${i + 1}">${this.esc(m[0])}</span>`
        lastIdx = m.index + m[0].length
      }

      html += this.esc(this.testString.substring(lastIdx))
      this.highlightedText = html
    },

    esc(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    },

    loadPreset(preset) {
      this.activePreset = preset.name
      this.pattern = preset.pattern
      this.testString = preset.test
      const f = preset.flags || ''
      this.flagsObj = { g: f.includes('g'), i: f.includes('i'), m: f.includes('m'), s: f.includes('s'), u: f.includes('u') }
      if (!f.includes('g') && !f.includes('i') && !f.includes('m') && !f.includes('s') && !f.includes('u')) {
        this.flagsObj.g = true
      }
      this.runTest()
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  margin: 30px;
}

.regex-input-section {
  margin-bottom: 16px;
}

.regex-pattern-row {
  display: flex;
  align-items: center;
  gap: 4px;

  .regex-slash {
    font-size: 20px;
    font-weight: bold;
    color: #c678dd;
    font-family: 'Courier New', monospace;
  }

  .regex-pattern-input {
    flex: 1;

    .el-input__inner {
      font-family: 'Courier New', Consolas, monospace;
      font-size: 15px;
      color: #c678dd;
    }
  }

  .flags-row {
    display: flex;
    gap: 4px;
    margin-left: 8px;

    .el-checkbox {
      margin-right: 0;

      .el-checkbox__label {
        font-family: 'Courier New', monospace;
        font-weight: bold;
        color: #e6a23c;
      }
    }
  }
}

.presets-section {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;

  .presets-label {
    font-weight: bold;
    color: var(--text-regular);
    font-size: 13px;
  }

  .preset-tag {
    cursor: pointer;
    transition: all 0.2s;
  }
}

.test-string-section,
.match-highlight-section,
.match-details-section,
.group-details-section {
  margin-top: 16px;
}

.section-label {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 14px;
  margin-bottom: 8px;
}

.named-group {
  color: #409eff;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.index-group {
  color: #e6a23c;
  font-family: 'Courier New', monospace;
}

.highlighted-display {
  min-height: 60px;
  max-height: 200px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
  background: var(--bg-secondary);
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

<style lang="scss">
/* 匹配高亮样式（全局，v-html 不受 scoped 限制） */
.match-hl {
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;

  &.match-0 { background: #e6ffec; border: 1px solid #67c23a; color: #1a7f37; }
  &.match-1 { background: #ddf4ff; border: 1px solid #409eff; color: #0550ae; }
  &.match-2 { background: #fff8e6; border: 1px solid #e6a23c; color: #9a6700; }
  &.match-3 { background: #ffebe9; border: 1px solid #f56c6c; color: #cf222e; }
  &.match-4 { background: #f3e8ff; border: 1px solid #9b59b6; color: #7b3fa0; }
  &.match-5 { background: #e6ffec; border: 1px solid #2ecc71; color: #1a7f37; }
  &.match-6 { background: #ddf4ff; border: 1px solid #3498db; color: #0550ae; }
  &.match-7 { background: #fff8e6; border: 1px solid #f39c12; color: #9a6700; }
  &.match-8 { background: #ffebe9; border: 1px solid #e74c3c; color: #cf222e; }
  &.match-9 { background: #f3e8ff; border: 1px solid #8e44ad; color: #7b3fa0; }
}
</style>
