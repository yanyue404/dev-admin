<template>
  <div class="dashboard-container">
    <!-- 标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <i class="el-icon-share icon-accent"></i>
        <span class="header-title">二维码生成器</span>
        <el-tag size="mini" effect="plain">QRCode</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="onTapReset" size="small" icon="el-icon-delete" :disabled="!text && !url">清空</el-button>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="qr-main">
      <!-- 左：输入面板 -->
      <div class="panel input-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-edit-outline"></i> 输入内容</span>
          <el-tag v-if="textLength" size="mini" type="info">{{ textLength }} 字符</el-tag>
        </div>
        <div class="input-body">
          <el-input
            type="textarea"
            v-model="text"
            :rows="8"
            placeholder="输入文本、网址、联系方式等内容..."
            resize="none"
            class="text-input"
          ></el-input>

          <!-- 选项区 -->
          <div class="options-section">
            <div class="option-group">
              <span class="option-label">前景色</span>
              <el-color-picker v-model="darkColor" size="small"></el-color-picker>
            </div>
            <div class="option-group">
              <span class="option-label">背景色</span>
              <el-color-picker v-model="lightColor" size="small"></el-color-picker>
            </div>
            <div class="option-group">
              <span class="option-label">容错级别</span>
              <el-select v-model="errorLevel" size="small" style="width: 80px">
                <el-option label="L" value="L"></el-option>
                <el-option label="M" value="M"></el-option>
                <el-option label="Q" value="Q"></el-option>
                <el-option label="H" value="H"></el-option>
              </el-select>
            </div>
            <div class="option-group">
              <span class="option-label">尺寸</span>
              <el-select v-model="qrSize" size="small" style="width: 100px">
                <el-option label="256px" :value="256"></el-option>
                <el-option label="512px" :value="512"></el-option>
                <el-option label="1024px" :value="1024"></el-option>
              </el-select>
            </div>
          </div>

          <el-button @click="onTapQrcode" type="primary" icon="el-icon-share" :disabled="!text" class="generate-btn">生成二维码</el-button>
        </div>
      </div>

      <!-- 右：预览面板 -->
      <div class="panel preview-panel">
        <div class="panel-header">
          <span class="panel-title"><i class="el-icon-picture-outline"></i> 二维码预览</span>
          <div class="panel-actions" v-if="url">
            <el-button @click="downloadQR" size="mini" icon="el-icon-download" type="text">下载</el-button>
            <el-button @click="copyQR" size="mini" icon="el-icon-document-copy" type="text">复制</el-button>
          </div>
        </div>
        <div class="preview-body">
          <!-- 空状态 -->
          <div v-if="!url" class="empty-state">
            <div class="empty-pattern">
              <div class="qr-grid">
                <div v-for="i in 25" :key="i" :class="['qr-cell', { 'qr-cell-filled': pattern[i-1] }]"></div>
              </div>
            </div>
            <p class="empty-title">等待生成</p>
            <p class="empty-desc">输入内容后点击「生成二维码」</p>
          </div>
          <!-- QR 码显示 -->
          <div v-else class="qr-display">
            <img :src="url" alt="QR Code" class="qr-image" />
            <div class="qr-meta">
              <el-tag size="mini" type="success">已生成</el-tag>
              <el-tag size="mini" type="info">{{ errorLevel }} 容错</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'

// 模拟 QR 码图案的空状态装饰
const PATTERN = [
  1,1,1,0,1,0,1,1,1,
  1,0,1,0,0,0,1,0,1,
  1,1,1,0,1,0,1,1,1,
  0,0,0,0,0,0,0,0,0,
  1,0,1,0,0,0,1,0,0,
  0,0,0,0,1,0,0,0,0,
  1,1,1,0,0,0,1,1,1,
  1,0,1,0,0,0,1,0,1,
  1,1,1,0,0,0,1,1,1,
]

export default {
  data() {
    return {
      text: '',
      url: '',
      darkColor: '#000000',
      lightColor: '#ffffff',
      errorLevel: 'L',
      qrSize: 512,
      pattern: PATTERN
    }
  },
  computed: {
    textLength() {
      return this.text.length
    }
  },
  methods: {
    onTapQrcode() {
      if (!this.text) {
        this.$message.warning('请输入内容')
        return
      }
      QRCode.toDataURL(this.text, {
        errorCorrectionLevel: this.errorLevel,
        margin: 2,
        width: this.qrSize,
        color: {
          dark: this.darkColor,
          light: this.lightColor
        },
        rendererOpts: {
          quality: 0.9
        }
      })
        .then((base64) => {
          this.url = base64
        })
        .catch((err) => {
          console.log(err)
          this.$message.error('生成失败')
        })
    },
    onTapReset() {
      this.text = ''
      this.url = ''
    },
    downloadQR() {
      const link = document.createElement('a')
      link.download = `qrcode_${Date.now()}.png`
      link.href = this.url
      link.click()
    },
    copyQR() {
      // 复制二维码图片到剪贴板（通过复制 base64）
      navigator.clipboard.writeText(this.url).then(() => {
        this.$message.success('已复制图片 Base64')
      }).catch(() => {
        this.$message.error('复制失败')
      })
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
    color: #42b983;
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

/* 主内容 */
.qr-main {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.panel {
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
      gap: 4px;
    }
  }
}

.input-panel {
  width: 45%;
  border-left: 3px solid #42b983;

  .input-body {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .text-input .el-textarea__inner {
    font-size: 13px;
    line-height: 1.6;
    padding: 12px 14px;
    background: var(--code-bg) !important;
    border: 1px solid var(--border-light) !important;
    color: var(--text-primary) !important;
  }
}

/* 选项区 */
.options-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--border-lighter);
  border-bottom: 1px solid var(--border-lighter);

  .option-group {
    display: flex;
    align-items: center;
    gap: 6px;

    .option-label {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
    }
  }
}

.generate-btn {
  width: 100%;
}

.preview-panel {
  flex: 1;
  border-left: 3px solid #409eff;

  .preview-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg-secondary);
  }
}

/* 空状态 */
.empty-state {
  text-align: center;

  .empty-pattern {
    margin-bottom: 16px;
  }

  .qr-grid {
    display: grid;
    grid-template-columns: repeat(9, 10px);
    grid-template-rows: repeat(9, 10px);
    gap: 2px;
    justify-content: center;
  }

  .qr-cell {
    border-radius: 2px;
    background: var(--bg-tertiary);
  }

  .qr-cell-filled {
    background: var(--text-placeholder);
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

/* QR 码显示 */
.qr-display {
  text-align: center;

  .qr-image {
    max-width: 280px;
    border-radius: 8px;
    border: 2px solid var(--border-light);
    box-shadow: var(--shadow-md);
    background: #fff;
    padding: 8px;
  }

  .qr-meta {
    margin-top: 12px;
    display: flex;
    justify-content: center;
    gap: 8px;
  }
}

/* 暗黑主题：QR 码白色背景保持 */
html[data-theme="dark"] {
  .qr-image {
    background: #fff !important;
    border-color: var(--border-color) !important;
  }

  .qr-cell-filled {
    background: #666 !important;
  }
}
</style>
