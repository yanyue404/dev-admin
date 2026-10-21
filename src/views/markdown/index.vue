<template>
  <div class="dashboard-container">
    <!-- 左：编辑区 -->
    <div class="editor-panel">
      <div class="toolbar">
        <div class="toolbar-left">
          <i class="el-icon-edit"></i>
          <span class="panel-title">Markdown 编辑</span>
        </div>
        <div class="toolbar-right">
          <el-button size="mini" icon="el-icon-delete" @click="clearCode">清空</el-button>
        </div>
      </div>
      <div class="editor-body">
        <textarea
          ref="editor"
          v-model="markdownCode"
          class="md-editor"
          placeholder="在这里输入 Markdown 内容..."
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <!-- 右：预览区 -->
    <div class="preview-panel">
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <i class="el-icon-view"></i>
          <span class="panel-title">实时预览</span>
        </div>
        <div class="toolbar-right">
          <el-select v-model="currentTheme" size="mini" style="width: 110px">
            <el-option label="默认主题" value="default"></el-option>
            <el-option label="GitHub 主题" value="github"></el-option>
          </el-select>
          <el-button size="mini" icon="el-icon-document-copy" @click="copyHTML">复制 HTML</el-button>
          <el-dropdown size="mini" @command="onExportCommand">
            <el-button size="mini" icon="el-icon-download">
              导出 <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="html" icon="el-icon-document">导出 HTML</el-dropdown-item>
              <el-dropdown-item command="pdf" icon="el-icon-printer">导出 PDF</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
      <div class="preview-body" ref="previewBody">
        <div v-if="!markdownCode.trim()" class="preview-empty">
          <i class="el-icon-edit-outline"></i>
          <p>在左侧输入 Markdown 内容</p>
        </div>
        <div
          v-else
          ref="previewContent"
          class="preview-content markdown-body"
          :class="'theme-' + currentTheme"
          v-html="renderedHTML"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
// marked 通过 CDN + externals 加载，import 会被 webpack 映射为 window.marked
import marked from 'marked'

// ===== 默认 Markdown 内容 =====
const DEFAULT_MD = `# Markdown 编辑器

## 基本语法

### 文本样式

**粗体文本** 和 *斜体文本* 以及 ~~删除线~~

### 列表

无序列表：
- 项目一
- 项目二
  - 子项目 2.1
  - 子项目 2.2
- 项目三

有序列表：
1. 第一步
2. 第二步
3. 第三步

### 代码

行内代码：\`const x = 10\`

代码块：
\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return { message: 'success', code: 200 };
}
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
\`\`\`

### 引用

> 这是一段引用文本
> 可以包含多行内容

### 链接

[链接示例](https://example.com)

### 表格

| 功能 | 描述 | 状态 |
|------|------|------|
| 实时预览 | 左右同步渲染 | ✅ |
| 主题切换 | 默认 / GitHub | ✅ |
| 导出 HTML | 独立 HTML 文件 | ✅ |
| 导出 PDF | 浏览器打印导出 | ✅ |

### 分割线

---

### 任务列表

- [x] 已完成任务
- [ ] 待完成任务
- [ ] 另一个待完成项
`

// ===== 主题 CSS（用于导出 HTML/PDF 时的内嵌样式） =====
const THEME_CSS = {
  default: `
    .markdown-body {
      font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 15px; line-height: 1.8; color: #333; word-wrap: break-word;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      font-weight: 600; color: #1a1a1a; margin-top: 1.5em; margin-bottom: 0.5em; line-height: 1.4;
    }
    .markdown-body h1 { font-size: 1.8em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.4em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
    .markdown-body h3 { font-size: 1.2em; }
    .markdown-body p { margin: 0.8em 0; }
    .markdown-body code {
      background: #f5f5f5; border-radius: 3px; padding: 2px 6px; font-size: 90%; color: #c7254e;
      font-family: Consolas, Monaco, "Courier New", monospace;
    }
    .markdown-body pre { background: #f5f5f5; border-radius: 4px; padding: 12px 16px; overflow: auto; border: 1px solid #ddd; }
    .markdown-body pre code { background: transparent; padding: 0; color: inherit; font-size: 100%; border-radius: 0; }
    .markdown-body blockquote { border-left: 4px solid #ddd; padding: 10px 20px; color: #666; margin: 1em 0; background: #f9f9f9; }
    .markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .markdown-body table th, .markdown-body table td { border: 1px solid #ddd; padding: 8px 12px; }
    .markdown-body table th { background: #f5f5f5; font-weight: 600; }
    .markdown-body table tr:nth-child(even) { background: #f9f9f9; }
    .markdown-body ul, .markdown-body ol { margin: 0.5em 0; padding-left: 2em; }
    .markdown-body a { color: #428bca; text-decoration: none; }
    .markdown-body a:hover { color: #2a6496; text-decoration: underline; }
    .markdown-body hr { border: none; border-top: 1px solid #eee; margin: 1.5em 0; }
    .markdown-body img { max-width: 100%; }
  `,
  github: `
    .markdown-body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 16px; line-height: 1.6; color: #24292e; word-wrap: break-word;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      font-weight: 600; line-height: 1.25; margin-top: 24px; margin-bottom: 16px;
    }
    .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1em; }
    .markdown-body p { margin-top: 0; margin-bottom: 16px; }
    .markdown-body code {
      background: #eff1f3; border-radius: 3px; padding: 2px 4px; font-size: 85%;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    }
    .markdown-body pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto; }
    .markdown-body pre code { background: transparent; padding: 0; font-size: 100%; border-radius: 0; }
    .markdown-body blockquote { border-left: 4px solid #dfe2e5; padding: 0 1em; color: #6a737d; margin: 0 0 16px; }
    .markdown-body table { border-collapse: collapse; width: 100%; overflow: auto; margin: 0 0 16px; }
    .markdown-body table th, .markdown-body table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    .markdown-body table th { font-weight: 600; background: #f6f8fa; }
    .markdown-body table tr { background: #fff; border-top: 1px solid #c6cbd1; }
    .markdown-body table tr:nth-child(2n) { background: #f6f8fa; }
    .markdown-body ul, .markdown-body ol { margin-top: 0; margin-bottom: 16px; padding-left: 2em; }
    .markdown-body ul ul, .markdown-body ol ol, .markdown-body ul ol, .markdown-body ol ul { margin-top: 0; margin-bottom: 0; }
    .markdown-body a { color: #0366d6; text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body hr { border-bottom: 1px solid #eaecef; margin: 24px 0; height: 0.25em; padding: 0; background: #eaecef; border: 0; }
    .markdown-body img { max-width: 100%; box-sizing: border-box; }
    .markdown-body .task-list-item { list-style-type: none; }
    .markdown-body .task-list-item-checkbox { margin: 0 0.2em 0.25em -1.6em; vertical-align: middle; }
  `,
}

let debounceTimer = null

export default {
  name: 'MarkdownEditor',
  data() {
    return {
      markdownCode: DEFAULT_MD,
      currentTheme: 'github',
      renderedHTML: '',
    }
  },
  mounted() {
    if (marked) {
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: function (code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value
            } catch (e) {
              return code
            }
          }
          return code
        },
      })
      this.renderMarkdown()
    } else {
      this.renderedHTML = '<p style="color:#f56c6c">Markdown 解析库加载失败，请刷新页面重试</p>'
    }
  },
  watch: {
    markdownCode() {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        this.renderMarkdown()
      }, 300)
    },
    currentTheme() {
      // 主题切换只需重新高亮代码（HTML 内容不变）
      this.$nextTick(() => {
        this.highlightCode()
      })
    },
  },
  methods: {
    renderMarkdown() {
      if (!marked) return
      try {
        this.renderedHTML = marked.parse(this.markdownCode)
      } catch (e) {
        this.renderedHTML = '<p style="color:#f56c6c">解析错误: ' + e.message + '</p>'
      }
    },

    // 手动高亮（主题切换后 DOM 不变但需要确保 hljs 样式生效）
    highlightCode() {
      if (!this.$refs.previewBody) return
      if (typeof hljs !== 'undefined') {
        this.$refs.previewBody.querySelectorAll('pre code').forEach((block) => {
          if (!block.classList.contains('hljs')) {
            hljs.highlightElement(block)
          }
        })
      }
    },

    clearCode() {
      this.markdownCode = ''
    },

    // 复制 HTML（纯 HTML 片段）
    copyHTML() {
      const html = this.renderedHTML
      if (!html) {
        this.$message.warning('没有可复制的 HTML 内容')
        return
      }
      navigator.clipboard.writeText(html).then(() => {
        this.$message.success('HTML 已复制到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    },

    // 导出命令分发
    onExportCommand(command) {
      if (command === 'html') {
        this.exportHTML()
      } else if (command === 'pdf') {
        this.exportPDF()
      }
    },

    // 导出完整 HTML 文件（含主题 CSS + hljs CSS）
    exportHTML() {
      const html = this.renderedHTML
      if (!html) {
        this.$message.warning('没有可导出的内容')
        return
      }
      const themeCSS = THEME_CSS[this.currentTheme]
      const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <style>${themeCSS}</style>
</head>
<body>
  <div class="markdown-body">${html}</div>
</body>
</html>`
      const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'markdown_' + Date.now() + '.html'
      link.click()
      URL.revokeObjectURL(url)
      this.$message.success('HTML 文件已导出')
    },

    // 导出 PDF（浏览器打印）
    exportPDF() {
      const html = this.renderedHTML
      if (!html) {
        this.$message.warning('没有可导出的内容')
        return
      }
      const themeCSS = THEME_CSS[this.currentTheme]
      const printHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Markdown PDF Export</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <style>
    ${themeCSS}
    @media print {
      body { margin: 0; padding: 20px; }
      .markdown-body { max-width: 800px; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="markdown-body">${html}</div>
  <script>
    window.onload = function() { window.print(); }
  <\/script>
</body>
</html>`
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        this.$message.error('无法打开打印窗口，请检查浏览器弹窗权限')
        return
      }
      printWindow.document.write(printHTML)
      printWindow.document.close()
    },
  },
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  height: calc(100vh - 84px);
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-page);
}

/* ===== 编辑面板 ===== */
.editor-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border-left: 3px solid #409eff;

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-lighter);
    background: var(--bg-secondary);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 6px;

      .panel-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      i {
        font-size: 16px;
        color: #409eff;
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .editor-body {
    flex: 1;
    padding: 12px;
    overflow: hidden;
  }

  .md-editor {
    width: 100%;
    height: 100%;
    border: 1px solid var(--border-lighter);
    border-radius: 6px;
    padding: 12px 16px;
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--input-bg);
    resize: none;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #409eff;
    }

    &::placeholder {
      color: var(--text-placeholder);
    }
  }
}

/* ===== 预览面板 ===== */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border-left: 3px solid #67c23a;

  .preview-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-lighter);
    background: var(--bg-secondary);

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 6px;

      .panel-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      i {
        font-size: 16px;
        color: #67c23a;
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }
}

.preview-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: var(--bg-secondary);

  .preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);

    i {
      font-size: 48px;
      margin-bottom: 12px;
      color: var(--text-placeholder);
    }

    p {
      font-size: 14px;
    }
  }
}

/* ===== 预览内容 ===== */
.preview-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px 32px;
  box-shadow: var(--shadow-sm);
  min-height: 200px;
}

/* ===== 默认主题 ===== */
.markdown-body.theme-default {
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  word-wrap: break-word;

  ::v-deep h1, ::v-deep h2, ::v-deep h3, ::v-deep h4, ::v-deep h5, ::v-deep h6 {
    font-weight: 600;
    color: #1a1a1a;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.4;
  }
  ::v-deep h1 { font-size: 1.8em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
  ::v-deep h2 { font-size: 1.4em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
  ::v-deep h3 { font-size: 1.2em; }
  ::v-deep p { margin: 0.8em 0; }
  ::v-deep code {
    background: #f5f5f5; border-radius: 3px; padding: 2px 6px; font-size: 90%; color: #c7254e;
    font-family: Consolas, Monaco, "Courier New", monospace;
  }
  ::v-deep pre {
    background: #f5f5f5; border-radius: 4px; padding: 12px 16px; overflow: auto; border: 1px solid #ddd;
  }
  ::v-deep pre code {
    background: transparent; padding: 0; color: inherit; font-size: 100%; border-radius: 0;
  }
  ::v-deep blockquote {
    border-left: 4px solid #ddd; padding: 10px 20px; color: #666; margin: 1em 0; background: #f9f9f9;
  }
  ::v-deep table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  ::v-deep table th, ::v-deep table td { border: 1px solid #ddd; padding: 8px 12px; }
  ::v-deep table th { background: #f5f5f5; font-weight: 600; }
  ::v-deep table tr:nth-child(even) { background: #f9f9f9; }
  ::v-deep ul, ::v-deep ol { margin: 0.5em 0; padding-left: 2em; }
  ::v-deep a { color: #428bca; text-decoration: none; }
  ::v-deep a:hover { color: #2a6496; text-decoration: underline; }
  ::v-deep hr { border: none; border-top: 1px solid #eee; margin: 1.5em 0; }
  ::v-deep img { max-width: 100%; }
}

/* ===== GitHub 主题 ===== */
.markdown-body.theme-github {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.6;
  color: #24292e;
  word-wrap: break-word;

  ::v-deep h1, ::v-deep h2, ::v-deep h3, ::v-deep h4, ::v-deep h5, ::v-deep h6 {
    font-weight: 600; line-height: 1.25; margin-top: 24px; margin-bottom: 16px;
  }
  ::v-deep h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
  ::v-deep h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
  ::v-deep h3 { font-size: 1.25em; }
  ::v-deep h4 { font-size: 1em; }
  ::v-deep p { margin-top: 0; margin-bottom: 16px; }
  ::v-deep code {
    background: #eff1f3; border-radius: 3px; padding: 2px 4px; font-size: 85%;
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  }
  ::v-deep pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto; }
  ::v-deep pre code {
    background: transparent; padding: 0; font-size: 100%; border-radius: 0;
  }
  ::v-deep blockquote {
    border-left: 4px solid #dfe2e5; padding: 0 1em; color: #6a737d; margin: 0 0 16px;
  }
  ::v-deep table { border-collapse: collapse; width: 100%; overflow: auto; margin: 0 0 16px; }
  ::v-deep table th, ::v-deep table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
  ::v-deep table th { font-weight: 600; background: #f6f8fa; }
  ::v-deep table tr { background: #fff; border-top: 1px solid #c6cbd1; }
  ::v-deep table tr:nth-child(2n) { background: #f6f8fa; }
  ::v-deep ul, ::v-deep ol { margin-top: 0; margin-bottom: 16px; padding-left: 2em; }
  ::v-deep a { color: #0366d6; text-decoration: none; }
  ::v-deep a:hover { text-decoration: underline; }
  ::v-deep hr { height: 0.25em; padding: 0; margin: 24px 0; background: #eaecef; border: 0; }
  ::v-deep img { max-width: 100%; box-sizing: border-box; }
}

// 响应式
@media (max-width: 1200px) {
  .dashboard-container {
    flex-direction: column;
  }
  .editor-panel {
    width: 100%;
    min-width: 0;
    max-height: 50vh;
    flex: none;
  }
}
</style>
