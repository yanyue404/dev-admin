<template>
  <div class="dashboard-container">
    <!-- 标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <i class="el-icon-document icon-accent"></i>
        <span class="header-title">Word 文档转富文本</span>
        <el-tag v-if="fileName" size="mini" type="info" effect="plain">{{ fileName }}</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="triggerUpload" size="small" icon="el-icon-upload2" type="primary">上传文档</el-button>
        <el-button @click="copyHtml" size="small" icon="el-icon-document-copy" :disabled="!contentVal">复制 HTML</el-button>
        <el-button @click="clearAll" size="small" icon="el-icon-delete" :disabled="!contentVal">清空</el-button>
      </div>
    </div>

    <!-- 拖拽上传区 -->
    <div
      v-if="!contentVal"
      class="drop-zone"
      :class="{ 'drop-zone-active': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerUpload"
    >
      <input type="file" ref="fileInput" @change="handleChange" accept=".docx" style="display: none" />
      <div class="drop-content">
        <i class="el-icon-upload drop-icon"></i>
        <p class="drop-title">拖拽 .docx 文件至此处</p>
        <p class="drop-desc">或点击选择文件上传</p>
        <div class="drop-hint">
          <i class="el-icon-info"></i>
          <span>仅支持 .docx 格式，文件将在本地解析</span>
        </div>
      </div>
    </div>

    <!-- 编辑 + 预览 双栏 -->
    <div v-if="contentVal" class="editor-preview">
      <!-- 左：HTML 编辑 -->
      <div class="panel edit-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-edit"></i> HTML 编辑</span>
          <div class="panel-actions">
            <el-tag v-if="contentLength" size="mini" type="info">{{ contentLength }} 字符</el-tag>
          </div>
        </div>
        <el-input
          type="textarea"
          v-model="contentVal"
          :rows="20"
          class="code-input"
          resize="none"
        ></el-input>
      </div>

      <!-- 右：渲染预览 -->
      <div class="panel preview-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-view"></i> 渲染预览</span>
          <div class="panel-actions">
            <el-radio-group v-model="previewDevice" size="mini">
              <el-radio-button label="pc">桌面</el-radio-button>
              <el-radio-button label="mobile">手机</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="preview-body" :class="'device-' + previewDevice">
          <div v-if="!contentVal" class="empty-state">
            <i class="el-icon-document empty-icon"></i>
            <p>渲染结果将显示在这里</p>
          </div>
          <div v-else class="preview-content">
            <div class="copy-writing">
              <div class="copy-item">
                <div class="copy-content" v-html="contentVal" ref="content"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      contentVal: '',
      fileName: '',
      isDragging: false,
      previewDevice: 'pc'
    }
  },
  computed: {
    contentLength() {
      return this.contentVal.length
    }
  },
  methods: {
    triggerUpload() {
      this.$refs.fileInput && this.$refs.fileInput.click()
    },
    handleChange(event) {
      const file = event.target.files[0]
      if (!file) return
      this.processFile(file)
    },
    handleDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]
      if (!file) return
      if (!file.name.endsWith('.docx')) {
        this.$message.warning('仅支持 .docx 格式文件')
        return
      }
      this.processFile(file)
    },
    processFile(file) {
      this.fileName = file.name
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const arrayBuffer = loadEvent.target.result
        window.mammoth
          .convertToHtml({ arrayBuffer: arrayBuffer })
          .then((resultObject) => {
            let html = resultObject.value
            html = html.replace(/<ol>|<\/ol>/g, "")
            html = html.replace(/(<\/?a.*?>)|(<\/?span.*?>)/g, "")
            html = html.replace(/<li>(.*?)<\/li>/g, "<p>$1</p>")
            this.contentVal = html
            this.$message.success('文档解析完成')
          })
          .catch(() => {
            this.$message.error('文档解析失败')
          })
      }
      reader.readAsArrayBuffer(file)
    },
    copyHtml() {
      const text = this.$refs.content ? this.$refs.content.innerHTML : this.contentVal
      navigator.clipboard
        .writeText(
          `<div class="copy-writing">
    <div class="copy-item">
      <div class="copy-content">
        ${text}
      </div>
    </div>
  </div>`
        )
        .then(() => {
          this.$message.success('已复制到剪贴板')
        })
        .catch(() => {
          this.$message.error('复制失败')
        })
    },
    clearAll() {
      this.contentVal = ''
      this.fileName = ''
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
    color: #409eff;
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

/* 拖拽上传区 */
.drop-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px dashed var(--border-light);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: #409eff;
    background: var(--bg-secondary);
  }
}

.drop-zone-active {
  border-color: #409eff !important;
  background: rgba(64, 158, 255, 0.05) !important;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
}

.drop-content {
  text-align: center;
  padding: 40px;

  .drop-icon {
    font-size: 56px;
    color: #409eff;
    opacity: 0.7;
    margin-bottom: 16px;
  }

  .drop-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .drop-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 20px;
  }

  .drop-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-placeholder);
    background: var(--bg-tertiary);
    padding: 6px 14px;
    border-radius: 6px;
  }
}

/* 编辑 + 预览双栏 */
.editor-preview {
  flex: 1;
  display: flex;
  gap: 16px;
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

.edit-panel {
  .panel-header {
    border-left: 3px solid #409eff;
  }
}

.preview-panel {
  .panel-header {
    border-left: 3px solid #67c23a;
  }
}

/* 代码输入区 */
.code-input .el-textarea__inner {
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
  box-shadow: inset 0 0 0 1px #409eff !important;
}

/* 预览区 */
.preview-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--bg-secondary);
  position: relative;
}

/* 手机预览模式 */
.device-mobile {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  background: var(--bg-page);

  .preview-content {
    width: 375px;
    max-height: 667px;
    border-radius: 16px;
    background: #f7f7f7;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: auto;
    position: relative;

    /* 顶部状态条模拟 */
    &::before {
      content: '';
      display: block;
      height: 6px;
      background: #e5e5e5;
      border-radius: 16px 16px 0 0;
    }
  }
}

.device-pc {
  .preview-content {
    width: 100%;
  }
}

.preview-content {
  background: #fff;
  min-height: 100%;

  .copy-writing {
    background: #f7f7f7;
    width: 100%;
    min-height: 100%;

    .copy-item {
      background: #fff;
      margin-top: 10px;

      &:first-child {
        margin-top: 0;
      }
    }
  }
}

.copy-content {
  padding: 15px;
  line-height: 21px;
  font-size: 14px;
  color: #333;
  background-color: #fff;

  p {
    padding: 4px;
    margin: 0;
    &.bold {
      font-weight: bold;
    }
    a {
      color: #246de2;
    }
  }

  table {
    width: 100%;
    border: 1px solid #e7e7e7;
    color: #666666;
    font-size: 14px;
    th {
      width: 50%;
      height: 30px;
      background: #ffe4a3;
    }
    td {
      height: 30px;
      line-height: 30px;
      text-align: center;
    }
  }
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  .empty-icon {
    font-size: 48px;
    color: var(--text-placeholder);
    margin-bottom: 12px;
  }

  p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }
}

/* 暗黑主题手机预览背景适配 */
html[data-theme="dark"] {
  .device-mobile .preview-content {
    background: #2a2a2e;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08);

    &::before {
      background: #3a3a3e;
    }
  }

  .copy-writing {
    background: #2a2a2e !important;
  }

  .copy-content {
    background: #333338 !important;
    color: #ddd !important;

    table {
      border-color: #555;
      color: #aaa;
      th { background: #4a4a2a; }
    }
    a { color: #79c0ff; }
  }
}
</style>
