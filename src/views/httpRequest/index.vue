<template>
  <div class="dashboard-container">
    <el-alert title="HTTP 请求模拟器" type="info" show-icon :closable="false">
      <template slot="default">
        <span>模拟发送 HTTP 请求并查看响应。注意：浏览器 CORS 限制可能影响外部 API 请求，内网接口可正常使用。</span>
      </template>
    </el-alert>
    <br />

    <el-card class="box-card">
      <!-- 请求配置区 -->
      <div class="request-config">
        <div class="url-row">
          <el-select v-model="method" style="width: 120px;" size="small">
            <el-option v-for="m in methods" :key="m" :value="m" :label="m"></el-option>
          </el-select>
          <el-input
            v-model="url"
            placeholder="输入请求 URL，如：https://example.com/api/data"
            size="small"
            style="flex: 1; margin-left: 8px;"
            @keyup.enter.native="sendRequest"
          >
            <template slot="append">
              <el-button @click="sendRequest" :loading="loading" type="primary" size="small">发送</el-button>
            </template>
          </el-input>
        </div>

        <!-- Headers -->
        <div class="headers-section">
          <div class="section-header">
            <span class="section-label">请求头 Headers</span>
            <el-button @click="addHeader" size="mini" icon="el-icon-plus">添加</el-button>
          </div>
          <div class="header-rows">
            <div v-for="(h, idx) in headers" :key="idx" class="header-row">
              <el-input v-model="h.key" placeholder="Key" size="small" style="width: 200px;"></el-input>
              <el-input v-model="h.value" placeholder="Value" size="small" style="flex: 1; margin-left: 8px;"></el-input>
              <el-button @click="removeHeader(idx)" size="mini" icon="el-icon-delete" type="danger" style="margin-left: 8px;"></el-button>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div v-if="method !== 'GET' && method !== 'HEAD'" class="body-section">
          <div class="section-header">
            <span class="section-label">请求体 Body</span>
            <el-radio-group v-model="bodyType" size="mini">
              <el-radio-button label="none">无</el-radio-button>
              <el-radio-button label="json">JSON</el-radio-button>
              <el-radio-button label="form">Form Data</el-radio-button>
              <el-radio-button label="raw">Raw Text</el-radio-button>
            </el-radio-group>
          </div>
          <div v-if="bodyType !== 'none'">
            <!-- Form Data 编辑器 -->
            <div v-if="bodyType === 'form'" class="form-rows">
              <div v-for="(f, idx) in formData" :key="idx" class="form-row">
                <el-input v-model="f.key" placeholder="Key" size="small" style="width: 200px;"></el-input>
                <el-input v-model="f.value" placeholder="Value" size="small" style="flex: 1; margin-left: 8px;"></el-input>
                <el-button @click="removeFormField(idx)" size="mini" icon="el-icon-delete" type="danger" style="margin-left: 8px;"></el-button>
              </div>
              <el-button @click="addFormField" size="mini" icon="el-icon-plus" style="margin-top: 8px;">添加字段</el-button>
            </div>
            <!-- JSON / Raw 编辑器 -->
            <el-input
              v-else
              type="textarea"
              :rows="8"
              :placeholder="bodyType === 'json' ? '输入 JSON 格式的请求体...' : '输入原始请求体文本...'"
              v-model="bodyText"
              class="body-input"
            ></el-input>
            <div v-if="bodyType === 'json'" class="body-actions">
              <el-button @click="formatBodyJson" size="mini" icon="el-icon-magic-stick">美化 JSON</el-button>
              <el-button @click="compressBodyJson" size="mini" icon="el-icon-minus">压缩 JSON</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 响应区域 -->
      <div v-if="response" class="response-section">
        <el-divider content-position="left">响应结果</el-divider>

        <div class="response-meta">
          <el-tag :type="statusTagType" size="medium">
            {{ response.status }} {{ response.statusText }}
          </el-tag>
          <el-tag size="small" type="info">
            耗时: {{ response.duration }}ms
          </el-tag>
          <el-tag size="small" type="info">
            大小: {{ response.size }}
          </el-tag>
        </div>

        <!-- 响应 Headers -->
        <div class="resp-headers">
          <div class="section-label">响应头</div>
          <el-table :data="response.headers" border size="mini" max-height="200">
            <el-table-column prop="key" label="Key" width="200"></el-table-column>
            <el-table-column prop="value" label="Value"></el-table-column>
          </el-table>
        </div>

        <!-- 响应 Body -->
        <div class="resp-body">
          <div class="section-header">
            <span class="section-label">响应体</span>
            <el-button-group>
              <el-button @click="formatResponseBody" size="mini" icon="el-icon-magic-stick">格式化</el-button>
              <el-button @click="copyResponse" size="mini" icon="el-icon-document-copy">复制</el-button>
            </el-button-group>
          </div>
          <el-input
            type="textarea"
            :rows="12"
            v-model="response.displayBody"
            class="body-input"
            readonly
          ></el-input>
        </div>
      </div>

      <!-- 错误提示 -->
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="true" @close="error = ''" style="margin-top: 12px;"></el-alert>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'HttpRequest',
  data() {
    return {
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      method: 'POST',
      url: '',
      headers: [
        { key: 'Content-Type', value: 'application/json' }
      ],
      bodyType: 'json',
      bodyText: '',
      formData: [
        { key: '', value: '' }
      ],
      loading: false,
      response: null,
      error: ''
    }
  },
  computed: {
    statusTagType() {
      if (!this.response) return 'info'
      const s = this.response.status
      if (s >= 200 && s < 300) return 'success'
      if (s >= 300 && s < 400) return 'info'
      if (s >= 400 && s < 500) return 'warning'
      return 'danger'
    }
  },
  methods: {
    addHeader() {
      this.headers.push({ key: '', value: '' })
    },
    removeHeader(idx) {
      this.headers.splice(idx, 1)
    },
    addFormField() {
      this.formData.push({ key: '', value: '' })
    },
    removeFormField(idx) {
      this.formData.splice(idx, 1)
    },

    async sendRequest() {
      if (!this.url.trim()) {
        this.$message.warning('请输入请求 URL')
        return
      }

      this.loading = true
      this.error = ''
      this.response = null

      const startTime = Date.now()

      try {
        // 构建请求配置
        const config = {
          method: this.method,
          headers: {}
        }

        // 添加自定义 headers
        this.headers.forEach(h => {
          if (h.key.trim()) {
            config.headers[h.key.trim()] = h.value
          }
        })

        // 构建 body
        if (this.method !== 'GET' && this.method !== 'HEAD' && this.bodyType !== 'none') {
          if (this.bodyType === 'json') {
            try {
              config.body = JSON.stringify(JSON.parse(this.bodyText))
              if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json'
              }
            } catch (e) {
              config.body = this.bodyText
            }
          } else if (this.bodyType === 'form') {
            const params = new URLSearchParams()
            this.formData.forEach(f => {
              if (f.key.trim()) {
                params.append(f.key.trim(), f.value)
              }
            })
            config.body = params.toString()
            if (!config.headers['Content-Type']) {
              config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
            }
          } else {
            config.body = this.bodyText
          }
        }

        // 发送请求
        const resp = await fetch(this.url, config)
        const duration = Date.now() - startTime

        // 读取响应
        const respBody = await resp.text()
        const respSize = new Blob([respBody]).size
        const sizeStr = respSize > 1024 ? `${(respSize / 1024).toFixed(1)} KB` : `${respSize} B`

        // 响应头
        const respHeaders = []
        resp.headers.forEach((value, key) => {
          respHeaders.push({ key, value })
        })

        // 尝试格式化 JSON
        let displayBody = respBody
        let isJSON = false
        try {
          const parsed = JSON.parse(respBody)
          displayBody = JSON.stringify(parsed, null, 2)
          isJSON = true
        } catch (e) {
          // 非 JSON，保持原样
        }

        this.response = {
          status: resp.status,
          statusText: resp.statusText,
          duration,
          size: sizeStr,
          headers: respHeaders,
          body: respBody,
          displayBody: displayBody,
          isJSON
        }

      } catch (e) {
        this.error = `请求失败: ${e.message}`
        if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
          this.error += '（可能是 CORS 限制，请确认目标服务器允许跨域请求）'
        }
      } finally {
        this.loading = false
      }
    },

    formatResponseBody() {
      if (!this.response) return
      try {
        this.response.displayBody = JSON.stringify(JSON.parse(this.response.body), null, 2)
        this.$message.success('格式化成功')
      } catch (e) {
        this.$message.warning('响应体不是 JSON 格式，无法格式化')
      }
    },

    formatBodyJson() {
      if (!this.bodyText.trim()) return
      try {
        this.bodyText = JSON.stringify(JSON.parse(this.bodyText), null, 2)
        this.$message.success('JSON 已美化')
      } catch (e) {
        this.$message.error('JSON 格式错误，无法美化')
      }
    },
    compressBodyJson() {
      if (!this.bodyText.trim()) return
      try {
        this.bodyText = JSON.stringify(JSON.parse(this.bodyText))
        this.$message.success('JSON 已压缩')
      } catch (e) {
        this.$message.error('JSON 格式错误，无法压缩')
      }
    },

    copyResponse() {
      if (!this.response) return
      const text = this.response.displayBody || this.response.body
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('已复制到剪贴板')
        }).catch(() => {
          this.copyFallback(text)
        })
      } else {
        this.copyFallback(text)
      }
    },
    copyFallback(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      this.$message.success('已复制到剪贴板')
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  margin: 30px;
}

.request-config {
  margin-bottom: 16px;
}

.url-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.headers-section, .body-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .section-label {
    font-weight: bold;
    font-size: 14px;
    color: var(--text-primary);
  }
}

.header-rows, .form-rows {
  .header-row, .form-row {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
  }
}

.body-input .el-textarea__inner {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.body-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.response-section {
  margin-top: 24px;
}

.response-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.resp-headers, .resp-body {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .url-row {
    flex-direction: column;
    gap: 8px;

    .el-select {
      width: 100%;
    }
  }

  .header-row, .form-row {
    flex-wrap: wrap;
    gap: 4px;

    .el-input {
      width: 100% !important;
      flex: none !important;
    }
  }
}
</style>
