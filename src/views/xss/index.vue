<template>
  <div class="dashboard-container">
    <!-- 标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <i class="el-icon-shield icon-accent"></i>
        <span class="header-title">富文本 XSS 安全过滤</span>
        <el-tag size="mini" type="warning" effect="dark">实时过滤</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="loadSample" size="small" icon="el-icon-document" type="success">加载示例</el-button>
        <el-button @click="clearAll" size="small" icon="el-icon-delete">清空</el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="xss-main">
      <!-- 左：输入面板 -->
      <div class="panel input-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-edit-outline"></i> 原始富文本</span>
          <el-tag v-if="inputLength" size="mini" type="info">{{ inputLength }} 字符</el-tag>
        </div>
        <el-input
          type="textarea"
          v-model="text"
          :rows="20"
          placeholder="粘贴含有潜在 XSS 风险的富文本 HTML..."
          class="code-input"
          resize="none"
        ></el-input>
      </div>

      <!-- 中间箭头分隔 -->
      <div class="flow-separator">
        <div class="arrow-icon">
          <i class="el-icon-right"></i>
        </div>
        <div class="filter-badge">
          <i class="el-icon-shield"></i>
          <span>XSS 过滤</span>
        </div>
      </div>

      <!-- 右：输出面板 -->
      <div class="panel output-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-circle-check"></i> 安全输出</span>
          <div class="panel-actions">
            <el-tag v-if="outputLength" size="mini" type="success">{{ outputLength }} 字符</el-tag>
            <el-button @click="copyResult" size="mini" icon="el-icon-document-copy" type="text" :disabled="!removeXssText">复制</el-button>
          </div>
        </div>
        <div v-if="!text" class="empty-state">
          <i class="el-icon-shield empty-icon"></i>
          <p class="empty-title">等待输入</p>
          <p class="empty-desc">在左侧粘贴富文本，自动过滤 XSS 危险代码</p>
        </div>
        <el-input
          v-else
          type="textarea"
          :value="removeXssText"
          :rows="20"
          class="code-output"
          resize="none"
          readonly
        ></el-input>
      </div>
    </div>

    <!-- 过滤统计 -->
    <div v-if="text" class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">原始长度</span>
        <span class="stat-value">{{ inputLength }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">过滤后长度</span>
        <span class="stat-value stat-value-success">{{ outputLength }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已移除</span>
        <span class="stat-value stat-value-danger">{{ removedLength }} 字符</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">缩减率</span>
        <span class="stat-value">{{ reductionRate }}%</span>
      </div>
    </div>
  </div>
</template>

<script>
import { FilterCSS } from 'cssfilter'
import xss from 'xss'

let xssFilter
getXssFilter()
function getXssFilter() {
  const cssFilter = new FilterCSS({
    whiteList: {
      color: true,
      'font-weight': true,
      'background-color': true
    }
  })
  xssFilter =
    xssFilter ||
    new xss.FilterXSS({
      onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
        // 保留data-属性
        if (name.substr(0, 5) === 'data-') {
          return `${name}="${xss.escapeAttrValue(value)}"`
        }
        // 样式过滤
        if (name === 'style') {
          return `${name}="${xss.escapeAttrValue(cssFilter.process(value))}"`
        }
      },
      // 忽略掉script
      stripIgnoreTagBody: ['script']
    })
}

const SAMPLE_HTML = `<div style="color:red;font-weight:bold;background-color:#ff0">
  <p onclick="alert('xss')">点击触发脚本</p>
  <a href="javascript:void(0)">危险链接</a>
  <img src=x onerror="alert(1)">
  <script>document.cookie<\/script>
  <p style="color:blue">这段是安全的</p>
  <div data-id="123" data-name="测试">data 属性保留</div>
</div>`

export default {
  data() {
    return {
      text: ''
    }
  },
  computed: {
    removeXssText() {
      try {
        return xssFilter.process(this.text).replace(/\s+style=\"\"/g, "")
      } catch (err) {
        console.log(err)
      }
      return '解析失败'
    },
    inputLength() {
      return this.text.length
    },
    outputLength() {
      return this.removeXssText ? this.removeXssText.length : 0
    },
    removedLength() {
      return this.inputLength - this.outputLength
    },
    reductionRate() {
      if (!this.inputLength) return 0
      return Math.round((this.removedLength / this.inputLength) * 100)
    }
  },
  methods: {
    copyResult() {
      navigator.clipboard.writeText(this.removeXssText).then(() => {
        this.$message.success('已复制到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    },
    clearAll() {
      this.text = ''
    },
    loadSample() {
      this.text = SAMPLE_HTML
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 16px;
  height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon-accent {
    font-size: 22px;
    color: #e6a23c;
  }

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

/* 主内容双栏 */
.xss-main {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-lighter);
    background: var(--bg-secondary);

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      i { margin-right: 4px; }
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.input-panel {
  .panel-header {
    border-left: 3px solid #e6a23c;
  }
}

.output-panel {
  .panel-header {
    border-left: 3px solid #67c23a;
  }
}

/* 中间箭头分隔 */
.flow-separator {
  width: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 4px;

  .arrow-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e6a23c, #f56c6c);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(230, 162, 60, 0.35);
    animation: pulse 2s ease-in-out infinite;
  }

  .filter-badge {
    font-size: 10px;
    color: var(--text-secondary);
    text-align: center;
    i { display: block; font-size: 14px; color: #e6a23c; margin-bottom: 2px; }
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

/* 输入输出区样式 */
.code-input .el-textarea__inner,
.code-output .el-textarea__inner {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 14px;
  border: none !important;
  background: var(--code-bg) !important;
  color: var(--text-primary) !important;
  resize: none;
  height: 100% !important;
  min-height: 100% !important;
}

.code-input .el-textarea__inner:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px #e6a23c !important;
}

.code-output .el-textarea__inner {
  cursor: default;
  color: var(--text-regular) !important;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--bg-secondary);

  .empty-icon {
    font-size: 48px;
    color: var(--text-placeholder);
    margin-bottom: 12px;
    opacity: 0.6;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0 0 6px;
  }

  .empty-desc {
    font-size: 12px;
    color: var(--text-placeholder);
    margin: 0;
  }
}

/* 统计条 */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 10px 20px;
  margin-top: 12px;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);

  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .stat-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .stat-value-success { color: #67c23a; }
    .stat-value-danger { color: #f56c6c; }
  }
}
</style>
