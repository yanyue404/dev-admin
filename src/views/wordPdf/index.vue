<template>
  <div
    class="word-pdf-page"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <div class="page-header">
      <div class="header-left">
        <i class="el-icon-refresh icon-accent" />
        <span class="header-title">Word 与 PDF 互转</span>
      </div>
      <div class="header-right">
        <el-radio-group v-model="direction" size="small" :disabled="running" @change="reclassify">
          <el-radio-button label="docx-to-pdf">Word → PDF</el-radio-button>
          <el-radio-button label="pdf-to-docx">PDF → Word</el-radio-button>
        </el-radio-group>
        <el-button size="small" icon="el-icon-upload2" :disabled="running" @click="triggerUpload">添加文件</el-button>
        <el-button class="start-convert" size="small" type="primary" icon="el-icon-caret-right" :disabled="running || !hasWaiting" @click="start">开始转换</el-button>
        <el-button size="small" icon="el-icon-download" :disabled="running || !doneCount" @click="downloadResults">下载结果</el-button>
        <el-button size="small" icon="el-icon-delete" :disabled="running || !files.length" @click="clearAll">清空</el-button>
      </div>
    </div>

    <input ref="fileInput" class="file-input" type="file" multiple accept=".docx,.pdf,.doc,.docm" @change="handleChange">

    <p class="page-hint">文件在浏览器本地转换。Word 转 PDF 会嵌入本机字体，文字可以复制，页面和页边距跟 Word 一致。第一次转换请允许读取本机字体。扫描版 PDF 会按整页图片放进 Word。</p>

    <div v-if="!files.length" class="drop-zone" :class="{ 'drop-zone-active': isDragging }" @click="triggerUpload">
      <div class="drop-content">
        <i class="el-icon-upload drop-icon" />
        <p class="drop-title">拖拽文件到此处</p>
        <p class="drop-desc">或点击选择多个 .docx / .pdf 文件</p>
      </div>
    </div>

    <div v-else class="file-panel" :class="{ 'drop-zone-active': isDragging }">
      <div class="file-summary">
        <span>等待 {{ summary.waiting }}</span>
        <span>转换中 {{ summary.converting }}</span>
        <span>完成 {{ summary.done }}</span>
        <span>跳过 {{ summary.skipped }}</span>
        <span>失败 {{ summary.failed }}</span>
      </div>
      <div v-for="item in files" :key="item.id" class="file-row">
        <div class="file-name" :title="item.name">{{ item.name }}</div>
        <div class="file-size">{{ formatSize(item.size) }}</div>
        <el-tag size="mini" :type="statusType(item.status)">{{ statusText(item.status) }}</el-tag>
        <div class="file-reason">{{ item.reason }}</div>
        <el-button type="text" size="mini" icon="el-icon-close" :disabled="running" @click="removeFile(item.id)" />
      </div>
    </div>
  </div>
</template>

<script>
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import batchApi from './batch'
import { convertDocxToPdf } from './docxToPdf'
import { convertPdfToDocx } from './pdfToDocx'

const STATUS_TEXT = {
  waiting: '等待',
  converting: '转换中',
  done: '完成',
  skipped: '跳过',
  failed: '失败'
}

export default {
  name: 'WordPdf',
  data() {
    return {
      direction: 'docx-to-pdf',
      files: [],
      running: false,
      isDragging: false,
      seed: 1
    }
  },
  computed: {
    hasWaiting() {
      return this.files.some((item) => item.status === 'waiting')
    },
    doneCount() {
      return this.files.filter((item) => item.status === 'done' && item.blob).length
    },
    summary() {
      const count = { waiting: 0, converting: 0, done: 0, skipped: 0, failed: 0 }
      this.files.forEach((item) => {
        count[item.status] += 1
      })
      return count
    }
  },
  methods: {
    statusText(status) {
      return STATUS_TEXT[status] || status
    },
    statusType(status) {
      if (status === 'done') return 'success'
      if (status === 'failed') return 'danger'
      if (status === 'converting') return 'warning'
      if (status === 'waiting') return 'info'
      return ''
    },
    formatSize(size) {
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
      return (size / 1024 / 1024).toFixed(1) + ' MB'
    },
    triggerUpload() {
      if (this.running) return
      this.$refs.fileInput && this.$refs.fileInput.click()
    },
    handleChange(event) {
      const selected = event.target.files
      if (selected && selected.length) this.addFiles(selected)
      event.target.value = ''
    },
    handleDrop(event) {
      this.isDragging = false
      if (this.running) return
      const dropped = event.dataTransfer.files
      if (dropped && dropped.length) this.addFiles(dropped)
    },
    addFiles(fileList) {
      const incoming = Array.from(fileList)
      let overLimit = 0
      incoming.forEach((file) => {
        if (this.files.length >= batchApi.MAX_FILES) {
          overLimit += 1
          return
        }
        const classified = batchApi.classifyFile(file, this.direction)
        this.seed += 1
        this.files.push({
          id: this.seed,
          name: file.name,
          size: file.size,
          file,
          status: classified.status,
          reason: classified.reason,
          locked: classified.locked,
          blob: null,
          outputName: ''
        })
        console.log('[word-pdf] 加入文件', file.name, classified.status, classified.reason)
      })
      if (overLimit) this.$message.warning('最多一次转换 20 个文件')
    },
    removeFile(id) {
      this.files = this.files.filter((item) => item.id !== id)
    },
    clearAll() {
      this.files = []
    },
    reclassify() {
      this.files.forEach((item) => {
        if (item.locked || item.status === 'done' || item.status === 'converting') return
        const next = batchApi.classifyFile({ name: item.name, size: item.size }, this.direction)
        item.status = next.status
        item.reason = next.reason
        item.blob = null
        item.outputName = ''
      })
    },
    async start() {
      const queue = this.files.filter((item) => item.status === 'waiting')
      if (!queue.length) {
        this.$message.warning('没有可转换的文件')
        return
      }
      this.running = true
      const used = {}
      const ext = this.direction === 'docx-to-pdf' ? 'pdf' : 'docx'
      console.log('[word-pdf] 开始转换', { direction: this.direction, count: queue.length })
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]
        item.status = 'converting'
        item.reason = ''
        try {
          const buffer = await item.file.arrayBuffer()
          const blob = this.direction === 'docx-to-pdf'
            ? await convertDocxToPdf(buffer)
            : await convertPdfToDocx(buffer)
          item.blob = blob
          item.outputName = batchApi.buildOutputName(item.name, ext, used)
          item.status = 'done'
          item.reason = ''
          console.log('[word-pdf] 文件结果', item.name, 'done', item.outputName, blob.size)
        } catch (error) {
          item.status = 'failed'
          item.reason = (error && error.message) || '转换失败'
          item.blob = null
          console.warn('[word-pdf] 文件结果', item.name, 'failed', item.reason)
        }
      }
      this.running = false
      if (this.doneCount) {
        await this.downloadResults()
      } else {
        this.$message.warning('没有可下载的文件')
      }
    },
    async downloadResults() {
      const done = this.files.filter((item) => item.status === 'done' && item.blob)
      if (!done.length) {
        this.$message.warning('没有可下载的文件')
        return
      }
      if (done.length === 1) {
        saveAs(done[0].blob, done[0].outputName)
        console.log('[word-pdf] 下载', done[0].outputName)
        return
      }
      const zip = new JSZip()
      done.forEach((item) => {
        zip.file(item.outputName, item.blob)
      })
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, '转换结果.zip')
      console.log('[word-pdf] 下载', '转换结果.zip', done.length)
    }
  }
}
</script>

<style lang="scss" scoped>
.word-pdf-page {
  padding: 16px;
  height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

.file-input {
  display: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 20px;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  margin-bottom: 12px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-accent {
  font-size: 22px;
  color: #409eff;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.page-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.drop-zone,
.file-panel {
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  border: 2px dashed var(--border-light);
  background: var(--card-bg);
}

.drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.drop-zone:hover,
.drop-zone-active {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.05);
}

.drop-content {
  text-align: center;
  padding: 40px;
}

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
  margin: 0;
}

.file-panel {
  overflow: auto;
  padding: 8px 12px 12px;
}

.file-summary {
  display: flex;
  gap: 16px;
  padding: 8px 4px 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.file-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 80px 72px minmax(0, 1fr) 32px;
  gap: 8px;
  align-items: center;
  padding: 8px 4px;
  border-top: 1px solid var(--border-light);
}

.file-name,
.file-reason {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-primary);
}

.file-reason {
  color: var(--text-secondary);
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
