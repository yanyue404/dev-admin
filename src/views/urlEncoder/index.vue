<template>
  <div class="dashboard-container">
    <el-alert title="URL 编码/解码" type="info" show-icon :closable="false"></el-alert>
    <br />
    <div class="main-content">
      <!-- 编码区 -->
      <el-card class="box-card">
        <div class="panel-header">
          <span class="panel-title">编码</span>
        </div>
        <div class="input-group">
          <label>输入字符串：</label>
          <el-input
            type="textarea"
            :rows="4"
            placeholder="Hello world :)"
            v-model="encodeInput"
            class="code-input"
          ></el-input>
        </div>
        <div class="input-group">
          <label>编码结果：</label>
          <el-input
            type="textarea"
            :autosize="{ minRows: 4 }"
            v-model="encodedOutput"
            class="code-output"
            readonly
          ></el-input>
        </div>
        <div class="copy-row">
          <el-button @click="copyEncoded" icon="el-icon-document-copy" size="small">复制结果</el-button>
        </div>
      </el-card>

      <!-- 解码区 -->
      <el-card class="box-card">
        <div class="panel-header">
          <span class="panel-title">解码</span>
        </div>
        <div class="input-group">
          <label>输入编码字符串：</label>
          <el-input
            type="textarea"
            :rows="4"
            placeholder="Hello%20world%20%3A)"
            v-model="decodeInput"
            class="code-input"
          ></el-input>
        </div>
        <div class="input-group">
          <label>解码结果：</label>
          <el-input
            type="textarea"
            :autosize="{ minRows: 4 }"
            v-model="decodedOutput"
            class="code-output"
            readonly
          ></el-input>
        </div>
        <div class="copy-row">
          <el-button @click="copyDecoded" icon="el-icon-document-copy" size="small">复制结果</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UrlEncoder',
  data() {
    return {
      encodeInput: 'Hello world :)',
      decodeInput: 'Hello%20world%20%3A)'
    };
  },
  computed: {
    encodedOutput() {
      if (!this.encodeInput) return '';
      try {
        return encodeURIComponent(this.encodeInput);
      } catch (e) {
        return '';
      }
    },
    decodedOutput() {
      if (!this.decodeInput) return '';
      try {
        return decodeURIComponent(this.decodeInput);
      } catch (e) {
        return '无效的 URL 编码格式';
      }
    }
  },
  methods: {
    copyEncoded() {
      if (!this.encodedOutput) return;
      this.copyToClipboard(this.encodedOutput);
    },
    copyDecoded() {
      if (!this.decodedOutput || this.decodedOutput === '无效的 URL 编码格式') return;
      this.copyToClipboard(this.decodedOutput);
    },
    copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('已复制');
        }).catch(() => {
          this.copyFallback(text);
        });
      } else {
        this.copyFallback(text);
      }
    },
    copyFallback(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.$message.success('已复制');
    }
  }
};
</script>

<style lang="scss" scoped>
.dashboard-container {
  margin: 30px;
}

.main-content {
  display: flex;
  gap: 16px;

  .box-card {
    flex: 1;
    min-width: 0;
  }
}

.panel-header {
  margin-bottom: 16px;

  .panel-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.input-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 13px;
    color: var(--text-regular);
    margin-bottom: 8px;
  }

  .code-input ::v-deep .el-textarea__inner,
  .code-output ::v-deep .el-textarea__inner {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.6;
    resize: none;
  }

  .code-output ::v-deep .el-textarea__inner {
    background: var(--bg-secondary, #f5f7fa);
  }
}

.copy-row {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
}
</style>
