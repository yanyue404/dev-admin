# Dev Admin — 开发者在线工具箱

> 基于 Vue 2 + Element UI 的在线工具集，涵盖日常开发中常用的格式化、转换、编辑、检测等功能。

## 功能概览

### 📊 数据格式化

| 工具 | 路径 | 说明 |
|------|------|------|
| **JSON 美化** | `/jsondata` | JSON 格式化 / 压缩 / Lint 校验 / Key 排序 / JSONP 解析，左右分栏实时预览 |
| **文本/JSON Diff** | `/jsonCompare` | 逐行对比两段文本或 JSON，高亮增删改差异，支持 JSON 美化模式 |

### 📝 文档工具

| 工具 | 路径 | 说明 |
|------|------|------|
| **Word 转富文本** | `/doc-tools/docx` | 拖拽上传 `.docx`，mammoth 解析为 HTML，桌面/手机双模式预览 |
| **富文本 XSS 转换** | `/doc-tools/xss` | XSS 安全过滤 + 反转还原，左右实时对比，统计过滤数据量 |
| **富文本转 Markdown** | `/doc-tools/clipboard2markdown` | 粘贴富文本自动转为 Markdown 格式 |
| **Mermaid 图表** | `/doc-tools/mermaid-editor` | Mermaid 语法实时渲染，9 种模板示例（流程图/时序图/类图/状态图/Git分支图/甘特图/饼图/ER图/思维导图），5 种主题，拖拽平移+滚轮缩放，SVG/PNG 高清导出（3x） |
| **Markdown 编辑器** | `/doc-tools/markdown-editor` | 左右 50/50 分栏实时预览，默认主题/GitHub 主题切换，代码语法高亮，复制 HTML / 导出 HTML / 导出 PDF |

### 🔧 开发辅助

| 工具 | 路径 | 说明 |
|------|------|------|
| **正则表达式测试器** | `/regex` | 输入正则和测试文本，实时匹配高亮，支持分组提取、常用正则速查 |
| **HTTP 请求模拟器** | `/httpRequest` | 模拟 GET/POST/PUT/DELETE 请求，自定义 Headers/Body，实时响应预览 |
| **URL 编码/解码** | `/urlEncoder` | URL 编码与解码互转，支持全量编码/组件编码 |

### 🖼️ 图片与媒体

| 工具 | 路径 | 说明 |
|------|------|------|
| **二维码生成器** | `/qrcode` | 输入文本生成二维码，自定义前景色/背景色/容错级别/尺寸，下载 PNG/复制图片 |
| **图片压缩** | `/picCompress` | 上传图片批量压缩，自定义压缩质量/最大尺寸/输出格式 |
| **图片点击区域** | `/clickArea` | 在图片上划定可点击热区，生成 HTML area 标签坐标 |

### 🔍 信息查询

| 工具 | 路径 | 说明 |
|------|------|------|
| **网站信息分析** | `/siteInfo` | 输入 URL 查询网站部署信息（框架/CDN/服务器/SSL 等） |
| **身份证号码** | `/idcard` | 生成/解析身份证号码，支持身份证/永居证，证件照片合成，历史记录 |
| **费率表** | `/rate` | 业务费率查询（hidden 路由，需直接访问） |
| **试题练习** | `/lianxi` | 在线试题练习系统 |

## 技术架构

### 核心框架

- **Vue 2.6.10** + **Vue Router 3** + **Vuex 3** + **Element UI 2.13.2**
- **Vue CLI 4.4.4** (webpack 4)

### CDN Externals 加载策略

以下库通过 CDN + webpack externals 加载，不打包进 bundle：

| 库 | CDN 源 | 全局变量 |
|------|------|------|
| Vue | 内部 CDN | `window.Vue` |
| Element UI | 内部 CDN | `window.ELEMENT` |
| highlight.js | 内部 CDN | `window.hljs` |
| Mermaid | jsdelivr (v10) | `window.mermaid` — 路由 beforeEnter 动态注入 |
| Marked | cdnjs (v4.3.0) | `window.marked` — 路由 beforeEnter 动态注入 |

> **Mermaid 和 Marked 不走 npm 的原因**：mermaid v9/v10 使用 `.mjs` 格式 + `??` 运算符，webpack 4 无法编译。采用与 Vue/Element/hljs 一致的 CDN externals 方案彻底绕开 webpack 编译。

### 动态加载模式

```js
// 路由 beforeEnter：首次访问时注入 CDN script，后续直接跳过
beforeEnter: (to, from, next) => {
  if (window.mermaid) { next() }
  else {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
    script.onload = () => next()
    script.onerror = () => next()  // 加载失败仍放行，组件内兜底提示
    document.head.appendChild(script)
  }
}
```

### npm 依赖（打包进 bundle）

| 库 | 用途 |
|------|------|
| mammoth | Word → HTML 转换（按需动态 import） |
| jsondiffpatch | JSON/文本 Diff 对比 |
| vue-json-pretty | JSON 格式化渲染 |
| xss / cssfilter | XSS 安全过滤 |
| qrcode | 二维码生成 |
| html2canvas | 截图/证件照片合成 |
| clipboard | 复制到剪贴板 |
| exceljs | Excel 文件处理 |
| crypto-js | 加密工具 |
| tiny-pinyin | 中文拼音转换 |
| codemirror | 代码编辑器 |

### 主题系统

- **亮色/暗黑主题切换**：基于 CSS 变量体系（`--bg-primary`, `--card-bg`, `--border-lighter` 等），`html[data-theme="dark"]` 覆盖所有变量
- **全局搜索快速导航**：`Ctrl+K` / `Cmd+K` 搜索所有工具页面

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run serve

# 生产构建
npm run build

# 预览构建产物
npm run preview

# 部署
npm run deploy
```

## 项目结构

```
src/
├── api/                # 接层
├── components/         # 公共组件（ToolSearch 搜索导航等）
├── icons/              # SVG 图标
├── layout/             # 布局框架（Navbar + Sidebar + TagsView）
├── router.js           # 路由配置
├── styles/             # 全局样式 + 暗黑模式 CSS 变量
│   ├── index.scss      # 全局样式 + fzhei 字体
│   └── dark-mode.scss  # 亮色/暗黑 CSS 变量体系
├── utils/              # 工具函数
├── views/              # 功能页面
│   ├── qrcode/         # 二维码生成器
│   ├── jsonData/       # JSON 美化
│   ├── jsonCompare/    # 文本/JSON Diff
│   ├── idcard/         # 身份证号码
│   ├── regex/          # 正则表达式测试器
│   ├── httpRequest/    # HTTP 请求模拟器
│   ├── urlEncoder/     # URL 编码/解码
│   ├── siteInfo/       # 网站信息分析
│   ├── picCompress/    # 图片压缩
│   ├── clickArea/      # 图片点击区域
│   ├── docx/           # Word 转富文本
│   ├── xss/            # 富文本 XSS 转换
│   ├── clipboard2markdown/ # 富文本转 Markdown
│   ├── mermaid/        # Mermaid 图表编辑器
│   ├── markdown/       # Markdown 编辑器
│   ├── rate/           # 费率表
│   └── lianxi/         # 试题练习
```

## 相关项目

- [vue-admin-template](https://github.com/PanJiaChen/vue-admin-template/tree/4.4.0) — 基础模板
- [elementSrcCodeStudy](https://github.com/shuirongshuifu/elementSrcCodeStudy) — Element UI 源码学习

## License

[MIT](./LICENSE)
