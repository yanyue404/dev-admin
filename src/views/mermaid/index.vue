<template>
  <div class="dashboard-container">
    <!-- 左：编辑区 -->
    <div class="editor-panel">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="currentTemplate" size="mini" placeholder="模板示例" @change="onTemplateChange" style="width: 160px">
            <el-option-group label="流程图">
              <el-option label="基本流程图" value="flow-basic"></el-option>
              <el-option label="带子流程" value="flow-subgraph"></el-option>
            </el-option-group>
            <el-option-group label="时序图">
              <el-option label="基本时序图" value="sequence-basic"></el-option>
              <el-option label="循环/分支" value="sequence-loop"></el-option>
            </el-option-group>
            <el-option-group label="类图">
              <el-option label="基本类图" value="class-basic"></el-option>
            </el-option-group>
            <el-option-group label="状态图">
              <el-option label="基本状态图" value="state-basic"></el-option>
            </el-option-group>
            <el-option-group label="Git">
              <el-option label="Git 分支图" value="git-basic"></el-option>
            </el-option-group>
            <el-option-group label="其他">
              <el-option label="甘特图" value="gantt"></el-option>
              <el-option label="饼图" value="pie"></el-option>
              <el-option label="ER 图" value="er"></el-option>
              <el-option label="思维导图" value="mindmap"></el-option>
            </el-option-group>
          </el-select>

          <el-select v-model="currentTheme" size="mini" placeholder="主题" style="width: 110px">
            <el-option label="Default" value="default"></el-option>
            <el-option label="Forest" value="forest"></el-option>
            <el-option label="Dark" value="dark"></el-option>
            <el-option label="Neutral" value="neutral"></el-option>
          </el-select>
        </div>

        <div class="toolbar-right">
          <el-tooltip content="语法速查" placement="bottom">
            <el-button size="mini" icon="el-icon-info" circle @click="showSyntax = true"></el-button>
          </el-tooltip>
          <el-tooltip content="清空" placement="bottom">
            <el-button size="mini" icon="el-icon-delete" circle @click="clearCode"></el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 代码编辑区 -->
      <div class="code-area">
        <textarea
          ref="editor"
          v-model="mermaidCode"
          class="code-editor"
          spellcheck="false"
          @input="debouncedRender"
        ></textarea>
      </div>

      <!-- 错误提示 -->
      <div v-if="parseError" class="error-bar">
        <i class="el-icon-warning"></i>
        <span>{{ parseError }}</span>
      </div>
    </div>

    <!-- 右：预览区 -->
    <div class="preview-panel">
      <!-- 预览工具栏 -->
      <div class="preview-toolbar">
        <div class="zoom-controls">
          <el-button size="mini" icon="el-icon-minus" circle @click="zoomOut"></el-button>
          <span class="zoom-text">{{ zoomPercent }}%</span>
          <el-button size="mini" icon="el-icon-plus" circle @click="zoomIn"></el-button>
          <el-button size="mini" @click="zoomReset">1:1</el-button>
        </div>
        <div class="export-controls">
          <el-button size="mini" icon="el-icon-download" @click="exportSVG">导出 SVG</el-button>
          <el-button size="mini" icon="el-icon-picture" @click="exportPNG">导出 PNG</el-button>
          <el-button size="mini" icon="el-icon-document-copy" @click="copySVG">复制 SVG</el-button>
        </div>
      </div>

      <!-- SVG 预览（支持拖拽平移 + 滚轮缩放） -->
      <div
        class="preview-body"
        ref="previewBody"
        :class="{ 'is-dragging': isDragging }"
        @wheel.prevent="onWheel"
        @mousedown="onDragStart"
      >
        <div v-if="parseError" class="preview-error">
          <i class="el-icon-warning-outline"></i>
          <p>语法错误，无法渲染</p>
          <p class="error-detail">{{ parseError }}</p>
        </div>
        <div v-else-if="!mermaidCode.trim()" class="preview-empty">
          <i class="el-icon-edit-outline"></i>
          <p>在左侧输入 Mermaid 代码</p>
        </div>
        <div
          v-else
          ref="previewContainer"
          class="preview-content"
          :style="contentTransform"
          v-html="renderedSVG"
        ></div>
      </div>
    </div>

    <!-- 语法速查对话框 -->
    <el-dialog title="Mermaid 语法速查" :visible.sync="showSyntax" width="720px" top="6vh">
      <div class="syntax-grid">
        <div class="syntax-section">
          <h4>流程图</h4>
          <div class="syntax-item"><code>graph TD</code> 从上到下</div>
          <div class="syntax-item"><code>graph LR</code> 从左到右</div>
          <div class="syntax-item"><code>A[矩形]</code> 矩形节点</div>
          <div class="syntax-item"><code>A(圆角)</code> 圆角节点</div>
          <div class="syntax-item"><code>A{条件}</code> 菱形节点</div>
          <div class="syntax-item"><code>A((圆形))</code> 圆形节点</div>
          <div class="syntax-item"><code>A --> B</code> 实线箭头</div>
          <div class="syntax-item"><code>A --- B</code> 实线无箭头</div>
          <div class="syntax-item"><code>A -.-> B</code> 虚线箭头</div>
          <div class="syntax-item"><code>A ==> B</code> 粗线箭头</div>
          <div class="syntax-item"><code>A -->|标签| B</code> 带标签连线</div>
        </div>
        <div class="syntax-section">
          <h4>时序图</h4>
          <div class="syntax-item"><code>sequenceDiagram</code></div>
          <div class="syntax-item"><code>participant A</code> 定义角色</div>
          <div class="syntax-item"><code>A->B: 消息</code> 实线</div>
          <div class="syntax-item"><code>A-->B: 消息</code> 虚线</div>
          <div class="syntax-item"><code>A->>B: 消息</code> 箭头实线</div>
          <div class="syntax-item"><code>A-->>B: 消息</code> 箭头虚线</div>
          <div class="syntax-item"><code>loop 描述</code> 循环</div>
          <div class="syntax-item"><code>alt 条件</code> 分支</div>
          <div class="syntax-item"><code>opt 可选</code> 可选操作</div>
        </div>
        <div class="syntax-section">
          <h4>类图</h4>
          <div class="syntax-item"><code>classDiagram</code></div>
          <div class="syntax-item"><code>class Animal</code> 定义类</div>
          <div class="syntax-item"><code>Animal : +String name</code> 属性</div>
          <div class="syntax-item"><code>Animal : +eat()</code> 方法</div>
          <div class="syntax-item"><code>Animal <|-- Dog</code> 继承</div>
          <div class="syntax-item"><code>Car *-- Engine</code> 组合</div>
          <div class="syntax-item"><code>Car o-- Tire</code> 聚合</div>
        </div>
        <div class="syntax-section">
          <h4>状态图</h4>
          <div class="syntax-item"><code>stateDiagram-v2</code></div>
          <div class="syntax-item"><code>[*] --> State1</code> 开始</div>
          <div class="syntax-item"><code>State1 --> State2</code> 转换</div>
          <div class="syntax-item"><code>State2 --> [*]</code> 结束</div>
          <div class="syntax-item"><code>state "长名" as S1</code> 别名</div>
        </div>
        <div class="syntax-section">
          <h4>其他</h4>
          <div class="syntax-item"><code>gantt</code> 甘特图</div>
          <div class="syntax-item"><code>pie</code> 饼图</div>
          <div class="syntax-item"><code>erDiagram</code> ER图</div>
          <div class="syntax-item"><code>mindmap</code> 思维导图</div>
          <div class="syntax-item"><code>journey</code> 用户旅程</div>
        </div>
        <div class="syntax-section">
          <h4>Git 图</h4>
          <div class="syntax-item"><code>gitGraph</code> Git分支图</div>
          <div class="syntax-item"><code>commit id:"标签"</code> 提交</div>
          <div class="syntax-item"><code>branch name</code> 创建分支</div>
          <div class="syntax-item"><code>checkout name</code> 切换分支</div>
          <div class="syntax-item"><code>merge name</code> 合并分支</div>
          <div class="syntax-item"><code>merge name tag:"v1"</code> 带标签合并</div>
          <div class="syntax-item"><code>type: HIGHLIGHT</code> 高亮提交</div>
          <div class="syntax-item"><code>type: REVERSE</code> 反向提交</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// mermaid 通过 CDN + externals 加载，import 会被 webpack 映射为 window.mermaid
import mermaid from 'mermaid'

// 模板示例
const TEMPLATES = {
  'flow-basic': `graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E`,
  'flow-subgraph': `graph TD
    A[开始] --> B[处理1]
    B --> C{判断?}
    C -->|Yes| D[子流程]
    C -->|No| E[结束]
    subgraph 子流程
        D --> F[步骤A]
        F --> G[步骤B]
        G --> H[步骤C]
    end
    H --> E`,
  'sequence-basic': `sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库

    用户->>前端: 发起请求
    前端->>后端: API调用
    后端->>数据库: 查询数据
    数据库-->>后端: 返回结果
    后端-->>前端: 返回响应
    前端-->>用户: 显示结果`,
  'sequence-loop': `sequenceDiagram
    participant 客户
    participant 服务器
    participant 缓存

    loop 每次请求
        客户->>服务器: 请求数据
        alt 缓存命中
            服务器->>缓存: 查询缓存
            缓存-->>服务器: 返回数据
        else 缓存未命中
            服务器->>服务器: 从DB读取
            服务器->>缓存: 写入缓存
        end
        服务器-->>客户: 返回结果
    end`,
  'class-basic': `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
        +fetch()
    }
    class Cat {
        +String color
        +meow()
        +purr()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  'state-basic': `stateDiagram-v2
    [*] --> 待提交
    待提交 --> 审核中: 提交申请
    审核中 --> 已通过: 审核通过
    审核中 --> 已拒绝: 审核拒绝
    已通过 --> [*]
    已拒绝 --> 待提交: 重新提交`,
  'gantt': `gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 设计阶段
        需求分析     :a1, 2024-01-01, 10d
        UI设计       :a2, after a1, 8d
    section 开发阶段
        前端开发     :b1, after a2, 15d
        后端开发     :b2, after a2, 20d
    section 测试阶段
        功能测试     :c1, after b1, 10d
        上线部署     :c2, after c1, 5d`,
  'pie': `pie title 市场份额分布
    "产品A" : 35
    "产品B" : 25
    "产品C" : 20
    "产品D" : 15
    "其他" : 5`,
  'er': `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int orderNumber
        date created
    }
    LINE-ITEM {
        string productName
        int quantity
        float price
    }`,
  'mindmap': `mindmap
  root((核心技术))
    前端
      Vue
      React
      Angular
    后端
      Node.js
      Java
      Python
    数据库
      MySQL
      MongoDB
      Redis`,
  'git-basic': `gitGraph
    commit id: "初始提交"
    commit id: "添加 README"
    branch develop
    checkout develop
    commit id: "开始开发"
    branch feature/login
    checkout feature/login
    commit id: "登录页面"
    commit id: "接入 API"
    checkout develop
    merge feature/login tag: "v1.0"
    branch feature/payment
    checkout feature/payment
    commit id: "支付模块"
    commit id: "集成测试"
    checkout develop
    merge feature/payment
    checkout main
    merge develop tag: "v1.1"
    commit id: "hotfix" type: HIGHLIGHT`
}

let debounceTimer = null

export default {
  name: 'MermaidEditor',
  data() {
    return {
      mermaidCode: TEMPLATES['flow-basic'],
      renderedSVG: '',
      parseError: '',
      currentTemplate: 'flow-basic',
      currentTheme: 'default',
      showSyntax: false,
      zoom: 1,
      zoomPercent: 100,
      renderCounter: 0,
      // 拖拽平移状态
      panX: 0,
      panY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      panStartX: 0,
      panStartY: 0,
    }
  },
  computed: {
    contentTransform() {
      return {
        transform: `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`,
        transformOrigin: '0 0',
      }
    },
  },
  watch: {
    currentTheme() {
      this.renderMermaid()
    },
  },
  mounted() {
    if (mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: this.currentTheme,
        securityLevel: 'loose',
      })
      this.renderMermaid()
    } else {
      this.parseError = 'Mermaid 加载失败，请检查网络连接'
    }
  },
  methods: {
    debouncedRender() {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        this.renderMermaid()
      }, 300)
    },

    async renderMermaid() {
      if (!this.mermaidCode.trim()) {
        this.renderedSVG = ''
        this.parseError = ''
        return
      }

      try {
        // 每次渲染用唯一 id 避免 mermaid 缓存冲突
        const id = `mermaid-svg-${++this.renderCounter}`
        mermaid.initialize({ theme: this.currentTheme, startOnLoad: false, securityLevel: 'loose' })
        const result = await mermaid.render(id, this.mermaidCode)
        // v9 返回 string，v10 返回 { svg: string }
        this.renderedSVG = typeof result === 'string' ? result : result.svg
        this.parseError = ''
      } catch (err) {
        this.parseError = err.message || '语法解析失败'
        this.renderedSVG = ''
        // 清理 mermaid 可能残留的错误 DOM
        const errEl = document.getElementById(`d${id}`)
        if (errEl) errEl.remove()
      }
    },

    onTemplateChange(val) {
      this.mermaidCode = TEMPLATES[val] || ''
      this.renderMermaid()
    },

    clearCode() {
      this.mermaidCode = ''
      this.renderedSVG = ''
      this.parseError = ''
      this.currentTemplate = ''
    },

    zoomIn() {
      this.zoom = Math.min(this.zoom + 0.1, 3)
      this.zoomPercent = Math.round(this.zoom * 100)
    },

    zoomOut() {
      this.zoom = Math.max(this.zoom - 0.1, 0.2)
      this.zoomPercent = Math.round(this.zoom * 100)
    },

    zoomReset() {
      this.zoom = 1
      this.zoomPercent = 100
      this.panX = 0
      this.panY = 0
    },

    getPreviewSVG() {
      const container = this.$refs.previewContainer
      if (!container) return ''
      const svgEl = container.querySelector('svg')
      return svgEl ? svgEl.outerHTML : this.renderedSVG
    },

    exportSVG() {
      const svgContent = this.getPreviewSVG()
      if (!svgContent) {
        this.$message.warning('没有可导出的图表')
        return
      }
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mermaid_${Date.now()}.svg`
      link.click()
      URL.revokeObjectURL(url)
      this.$message.success('SVG 已导出')
    },

    exportPNG() {
      const container = this.$refs.previewContainer
      if (!container) {
        this.$message.warning('没有可导出的图表')
        return
      }
      const svgEl = container.querySelector('svg')
      if (!svgEl) {
        this.$message.warning('没有可导出的图表')
        return
      }

      // 获取 SVG 原始尺寸（基于 viewBox）
      const viewBox = svgEl.getAttribute('viewBox')
      let svgWidth, svgHeight
      if (viewBox) {
        const parts = viewBox.split(/\s+/)
        svgWidth = parseFloat(parts[2])
        svgHeight = parseFloat(parts[3])
      } else {
        svgWidth = parseFloat(svgEl.getAttribute('width')) || svgEl.clientWidth || 800
        svgHeight = parseFloat(svgEl.getAttribute('height')) || svgEl.clientHeight || 600
      }

      const scale = 3 // 3x 高清导出
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(svgWidth * scale, 1)
      canvas.height = Math.max(svgHeight * scale, 1)
      const ctx = canvas.getContext('2d')

      // 用显式尺寸的 SVG 避免浏览器缩放导致模糊
      const svgCopy = svgEl.cloneNode(true)
      svgCopy.setAttribute('width', svgWidth * scale)
      svgCopy.setAttribute('height', svgHeight * scale)
      svgCopy.removeAttribute('style')
      // 移除外部样式引用，防止 canvas 被污染（tainted）
      svgCopy.querySelectorAll('style').forEach((el) => {
        // 只保留内联 CSS，移除 @import 外部引用
        el.textContent = el.textContent.replace(/@import\s+[^;]+;/g, '')
      })

      const svgString = svgCopy.outerHTML
      // 使用 Base64 data URL 而非 Blob URL，data URL 是同源资源不会污染 canvas
      const base64 = 'data:image/svg+xml;base64,' + btoa(Array.from(new TextEncoder().encode(svgString), (b) => String.fromCharCode(b)).join(''))
      const img = new Image()
      img.onload = () => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          const pngUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = pngUrl
          link.download = `mermaid_${Date.now()}.png`
          link.click()
          URL.revokeObjectURL(pngUrl)
          this.$message.success('高清 PNG 已导出 (3x)')
        }, 'image/png')
      }
      img.onerror = () => {
        this.$message.error('PNG 导出失败')
      }
      img.src = base64
    },

    copySVG() {
      const svgContent = this.getPreviewSVG()
      if (!svgContent) {
        this.$message.warning('没有可复制的图表')
        return
      }
      navigator.clipboard.writeText(svgContent).then(() => {
        this.$message.success('SVG 已复制到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    },

    // 滚轮缩放
    onWheel(e) {
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      this.zoom = Math.max(0.2, Math.min(5, this.zoom + delta))
      this.zoomPercent = Math.round(this.zoom * 100)
    },

    // 拖拽平移
    onDragStart(e) {
      if (e.button !== 0) return // 仅左键
      this.isDragging = true
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.panStartX = this.panX
      this.panStartY = this.panY

      // 绑定全局 mousemove/mouseup，确保拖拽在鼠标离开预览区后仍生效
      document.addEventListener('mousemove', this._onDragMove)
      document.addEventListener('mouseup', this._onDragEnd)
    },

    _onDragMove(e) {
      if (!this.isDragging) return
      this.panX = this.panStartX + (e.clientX - this.dragStartX)
      this.panY = this.panStartY + (e.clientY - this.dragStartY)
    },

    _onDragEnd() {
      this.isDragging = false
      document.removeEventListener('mousemove', this._onDragMove)
      document.removeEventListener('mouseup', this._onDragEnd)
    },
  },
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 16px;
  height: calc(100vh - 84px);
  display: flex;
  gap: 16px;
  background: var(--bg-page);
}

/* 编辑面板 */
.editor-panel {
  width: 460px;
  min-width: 320px;
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
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      gap: 4px;
    }
  }

  .code-area {
    flex: 1;
    overflow: hidden;
  }

  .code-editor {
    width: 100%;
    height: 100%;
    padding: 14px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--code-bg);
    border: none;
    outline: none;
    resize: none;
    tab-size: 2;
  }
}

/* 错误提示条 */
.error-bar {
  padding: 8px 14px;
  background: #fef0f0;
  border-top: 1px solid #fde2e2;
  color: #f56c6c;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  i { font-size: 14px; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

/* 预览面板 */
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

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 6px;

      .zoom-text {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        min-width: 40px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
    }

    .export-controls {
      display: flex;
      gap: 8px;
    }
  }

  .preview-body {
    flex: 1;
    overflow: hidden;
    padding: 0;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;

    &.is-dragging {
      cursor: grabbing;
    }
  }
}

/* 预览内容 */
.preview-content {
  background: #fff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: var(--shadow-sm);
  min-width: 200px;

  ::v-deep svg {
    max-width: 100% !important;
    height: auto !important;
  }
}

/* 空状态 */
.preview-empty {
  text-align: center;
  padding: 60px 20px;

  i { font-size: 48px; color: var(--text-placeholder); margin-bottom: 16px; }
  p { font-size: 14px; color: var(--text-secondary); margin: 0; }
}

.preview-error {
  text-align: center;
  padding: 60px 20px;

  i { font-size: 48px; color: #f56c6c; margin-bottom: 16px; }
  p { font-size: 14px; color: var(--text-secondary); margin: 0 0 8px; }
  .error-detail { font-size: 12px; color: #f56c6c; max-width: 400px; margin: 0 auto; }
}

/* 语法速查对话框 */
.syntax-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.syntax-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px 16px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-lighter);
  }

  .syntax-item {
    font-size: 12px;
    color: var(--text-regular);
    padding: 3px 0;
    display: flex;
    align-items: center;
    gap: 6px;

    code {
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      color: var(--text-primary);
    }
  }
}

/* 暗黑主题适配 */
html[data-theme="dark"] {
  .error-bar {
    background: #3d1a1a;
    border-top-color: #4d2a2a;
  }

  .preview-content {
    background: var(--bg-secondary) !important;
  }

  .syntax-section code {
    background: var(--bg-tertiary) !important;
  }
}
</style>
