<template>
  <div class="dashboard-container">
    <el-card class="box-card" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
      <div class="toolbar">
        <el-button @click="format" type="primary" size="small" icon="el-icon-s-tools">格式化</el-button>
        <el-button @click="compress" type="success" size="small" icon="el-icon-remove-outline">压缩</el-button>
        <span class="split">|</span>
        <el-checkbox v-model="jsonLintSwitch" @change="lintOn">JSONLint</el-checkbox>
        <span class="split">|</span>
        <el-checkbox v-model="autoDecode" @change="autoDecodeFn">自动解码</el-checkbox>
        <span class="split">|</span>
        <span class="sort-group">
          <span class="sort-title">排序：</span>
          <el-radio-group v-model="sortType" size="small" @change="format">
            <el-radio :label="0">默认</el-radio>
            <el-radio :label="1">升序</el-radio>
            <el-radio :label="-1">降序</el-radio>
          </el-radio-group>
        </span>
        <span class="split">|</span>
        <el-button @click="uniEncode" size="small">Uni编码</el-button>
        <el-button @click="uniDecode" size="small">Uni解码</el-button>
        <el-button @click="urlDecode" size="small">URL解码</el-button>
      </div>
      <div class="json-container">
        <div class="json-input">
          <el-input
            type="textarea"
            :autosize="{ minRows: 8 }"
            placeholder="在这里粘贴您需要进行格式化的JSON代码"
            v-model="jsonSource"
            @input="handleInput"
            class="json-textarea"
          ></el-input>
        </div>
        <div class="json-output">
          <div v-if="formatting" class="formatting-msg">
            <i class="el-icon-loading"></i> 格式化中...
          </div>
          <div v-else-if="errorMsg" class="error-msg">
            <i class="el-icon-warning"></i> {{ errorMsg }}
            <div v-if="errorDetail" class="error-detail" v-html="errorDetail"></div>
          </div>
          <div v-else-if="formattedJson" class="json-viewer-wrapper">
            <div v-if="jfCallbackName_start" class="callback-name" v-html="jfCallbackName_start"></div>
            <vue-json-pretty
              :data="formattedJson"
              :show-length="true"
              :showIcon="true"
              :show-line-number="true"
              :deep="5"
              :highlight-mouseover-node="true"
              :selectable-type="selectableType"
              :path="'res'"
              :show-double-quotes="false"
              :show-select-controller="false"
            ></vue-json-pretty>
            <div v-if="jfCallbackName_end" class="callback-name" v-html="jfCallbackName_end"></div>
          </div>
          <div v-else class="placeholder">
            <i class="el-icon-document"></i>
            <p>请在上方输入JSON代码进行格式化</p>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

// JSON 排序工具函数
function sortObject(obj, order = 0, deep = true) {
  if (order === 0) return obj
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(item => sortObject(item, order, deep))
  }
  const sorted = {}
  const keys = Object.keys(obj).sort((a, b) => {
    if (order > 0) return a.localeCompare(b)
    return b.localeCompare(a)
  })
  keys.forEach(key => {
    sorted[key] = deep ? sortObject(obj[key], order, deep) : obj[key]
  })
  return sorted
}

// Unicode 编码/解码
function uniEncode(str) {
  return escape(str)
    .replace(/%u/gi, '\\u')
    .replace(/%7b/gi, '{')
    .replace(/%7d/gi, '}')
    .replace(/%3a/gi, ':')
    .replace(/%2c/gi, ',')
    .replace(/%27/gi, "'")
    .replace(/%22/gi, '"')
    .replace(/%5b/gi, '[')
    .replace(/%5d/gi, ']')
}

function uniDecode(str) {
  str = str.replace(/(\\)?\\u/gi, '%u').replace('%u0025', '%25')
  let result = unescape(str.toString().replace(/%2B/g, '+'))
  let matches = result.match(/(%u00([0-9A-F]{2}))/gi)
  if (matches) {
    for (let i = 0; i < matches.length; i++) {
      let code = matches[i].substring(1, 3)
      if (Number('0x' + code) >= 128) {
        result = result.replace(matches[i], code)
      }
    }
  }
  return unescape(result.toString().replace(/%2B/g, '+'))
}

// URL 解码
async function urlDecode(str) {
  try {
    return decodeURIComponent(str)
  } catch (e) {
    try {
      const response = await fetch(`data:text/javascript;charset=utf8,${str.replace(/"/g, '%22').replace(/#/g, '%23')}`)
      return await response.text()
    } catch (e2) {
      return str
    }
  }
}

// JSON 验证
function validateJSON(str) {
  try {
    JSON.parse(str)
    return { valid: true, error: null }
  } catch (e) {
    // 尝试找到错误位置
    const match = e.message.match(/position (\d+)/)
    const pos = match ? parseInt(match[1]) : -1
    let line = 1
    let col = 1
    if (pos > 0) {
      const before = str.substring(0, pos)
      line = before.split('\n').length
      const lastLine = before.split('\n').pop()
      col = lastLine.length + 1
    }
    return {
      valid: false,
      error: {
        message: e.message,
        line: line,
        col: col,
        pos: pos
      }
    }
  }
}

export default {
  name: 'JsonData',
  components: {
    VueJsonPretty
  },
  data() {
    return {
      jsonSource: '',
      formattedJson: null,
      errorMsg: '',
      errorDetail: '',
      jfCallbackName_start: '',
      jfCallbackName_end: '',
      jsonLintSwitch: true,
      autoDecode: false,
      fireChange: true,
      formatting: false,
      sortType: 0,
      selectableType: 'single'
    }
  },
  mounted() {
    // 从 localStorage 读取配置
    this.autoDecode = localStorage.getItem('jsonformat:auto-decode') === 'true'
    this.jsonLintSwitch = localStorage.getItem('jsonformat:json-lint-switch') !== 'false'
    this.sortType = parseInt(localStorage.getItem('json_sort_type_key') || '0')
  },
  methods: {
    handleInput() {
      if (this.fireChange) {
        // 延迟格式化，避免频繁触发
        clearTimeout(this.formatTimer)
        this.formatTimer = setTimeout(() => {
          this.format()
        }, 300)
      }
    },
    format() {
      this.errorMsg = ''
      this.errorDetail = ''
      this.formattedJson = null
      this.jfCallbackName_start = ''
      this.jfCallbackName_end = ''
      this.formatting = true

      let jsonText = this.jsonSource.trim()
      if (!jsonText) {
        this.formatting = false
        return false
      }

      // 移除换行和多余空格
      jsonText = jsonText.replace(/\n/gm, ' ').replace(/\s+/g, ' ')

      let funcName = null
      let jsonObj = null

      try {
        // 尝试解析 JSONP
        let match = /^([\w\.]+)\(\s*([\s\S]*)\s*\)$/gim.exec(jsonText)
        if (match) {
          funcName = match[1]
          jsonText = match[2]
          this.jfCallbackName_start = funcName + '('
          this.jfCallbackName_end = ')'
        }

        // 尝试解析 JSON
        jsonObj = JSON.parse(jsonText)
      } catch (e) {
        try {
          // 尝试作为 JavaScript 对象解析
          jsonObj = new Function('return ' + jsonText)()
        } catch (e2) {
          try {
            // 尝试修复未加引号的键名
            const pattern = /([{,]\s*)(\w+)(\s*:)/g
            jsonText = jsonText.replace(pattern, '$1"$2"$3')
            jsonObj = JSON.parse(jsonText)
          } catch (e3) {
            this.errorMsg = 'JSON 解析失败'
            this.formatting = false
            if (this.jsonLintSwitch) {
              this.lintOn()
            }
            return false
          }
        }
      }

      if (jsonObj && typeof jsonObj === 'object') {
        try {
          // 排序
          if (this.sortType !== 0) {
            jsonObj = sortObject(jsonObj, this.sortType, true)
          }

          // 自动解码
          if (this.autoDecode) {
            this.formatWithDecode(JSON.stringify(jsonObj), funcName)
          } else {
            this.formattedJson = jsonObj
            this.formatting = false
          }
        } catch (e) {
          this.errorMsg = '处理失败: ' + e.message
          this.formatting = false
        }
      } else {
        this.errorMsg = '请输入有效的 JSON 对象'
        this.formatting = false
      }
    },
    async formatWithDecode(jsonText, funcName) {
      try {
        let decoded = await urlDecode(jsonText)
        decoded = uniDecode(decoded)
        const jsonObj = JSON.parse(decoded)
        if (this.sortType !== 0) {
          this.formattedJson = sortObject(jsonObj, this.sortType, true)
        } else {
          this.formattedJson = jsonObj
        }
        if (funcName) {
          this.jfCallbackName_start = funcName + '('
          this.jfCallbackName_end = ')'
        }
        this.formatting = false
      } catch (e) {
        this.errorMsg = '解码或格式化失败: ' + e.message
        this.formatting = false
      }
    },
    compress() {
      if (this.formattedJson) {
        const compressed = JSON.stringify(this.formattedJson)
        this.fireChange = false
        this.$nextTick(() => {
          this.jsonSource = compressed
          this.$nextTick(() => {
            this.fireChange = true
          })
        })
      } else {
        this.$message.warning('请先格式化 JSON')
      }
    },
    autoDecodeFn() {
      localStorage.setItem('jsonformat:auto-decode', this.autoDecode)
      if (this.jsonSource) {
        this.format()
      }
    },
    uniEncode() {
      this.jsonSource = uniEncode(this.jsonSource)
    },
    uniDecode() {
      this.jsonSource = uniDecode(this.jsonSource)
    },
    async urlDecode() {
      try {
        const decoded = await urlDecode(this.jsonSource)
        this.jsonSource = decoded
        this.$message.success('URL 解码成功')
      } catch (e) {
        this.$message.error('URL 解码失败: ' + e.message)
      }
    },
    lintOn() {
      localStorage.setItem('jsonformat:json-lint-switch', this.jsonLintSwitch)
      if (!this.jsonSource.trim()) {
        return false
      }
      const result = validateJSON(this.jsonSource)
      if (!result.valid && result.error) {
        this.errorMsg = `JSON 格式错误`
        this.errorDetail = `位置：第 ${result.error.line} 行，第 ${result.error.col} 列<br>${result.error.message}`
      }
      return false
    }
  },
  beforeDestroy() {
    if (this.formatTimer) {
      clearTimeout(this.formatTimer)
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
}

// 让 el-card body 填满（::v-deep 穿透 scoped）
.box-card {
  ::v-deep .el-card__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
}

.toolbar {
  background-color: var(--bg-secondary);
  margin: 0 0 12px;
  border: 1px solid var(--border-lighter);
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  .split {
    margin: 0 10px;
    color: var(--border-lighter);
  }

  .sort-group {
    display: flex;
    align-items: center;
    gap: 5px;

    .sort-title {
      margin-right: 5px;
    }
  }
}

.json-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;

  .json-input {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .json-output {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  // textarea 填满输入区高度（::v-deep 穿透 Element UI）
  .json-textarea {
    flex: 1;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;

    ::v-deep .el-textarea__inner {
      height: 100% !important;
      min-height: 200px !important;
      resize: none !important;
    }
  }

  .formatting-msg {
    text-align: center;
    padding: 40px;
    color: #409eff;
    font-size: 14px;

    i {
      margin-right: 5px;
      animation: rotating 2s linear infinite;
    }
  }

  .error-msg {
    padding: 15px;
    background: #fef0f0;
    border: 1px solid #fde2e2;
    border-radius: 6px;
    color: #f56c6c;
    font-size: 14px;

    i {
      margin-right: 5px;
    }

    .error-detail {
      margin-top: 10px;
      padding: 10px;
      background: #fff;
      border-radius: 4px;
      font-size: 12px;
      color: #606266;
    }
  }

  .json-viewer-wrapper {
    flex: 1;
    border: 1px solid var(--border-lighter);
    border-radius: 6px;
    padding: 12px 16px;
    background: var(--card-bg);
    overflow: auto;

    .callback-name {
      font-weight: bold;
      color: #a00;
      margin: 10px 0;
      font-family: monospace;
    }
  }

  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
    border: 1px solid var(--border-lighter);
    border-radius: 6px;

    i {
      font-size: 48px;
      margin-bottom: 15px;
      display: block;
      color: #c0c4cc;
    }

    p {
      font-size: 14px;
      margin: 0;
    }
  }
}

// 暗黑适配
html[data-theme="dark"] {
  .error-msg {
    background: #3d1a1a;
    border-color: #4d2a2a;
  }
  .error-msg .error-detail {
    background: var(--bg-tertiary);
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式
@media (max-width: 1200px) {
  .json-container {
    flex-direction: column;

    .json-textarea ::v-deep .el-textarea__inner {
      min-height: 160px !important;
      height: auto !important;
    }
  }
}
</style>
