import Vue from 'vue'
import Router from 'vue-router'

// Convert Word documents from docx to simple HTML and Markdown
const mammoth = () => import('mammoth')

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * Note: sub-menu only appear when route children.length >= 1
 * Detail see: https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 *
 * hidden: true                   if set true, item will not show in the sidebar(default is false)
 * alwaysShow: true               if set true, will always show the root menu
 *                                if not set alwaysShow, when item has more than one children route,
 *                                it will becomes nested mode, otherwise not show the root menu
 * redirect: noRedirect           if set noRedirect will no redirect in the breadcrumb
 * name:'router-name'             the name is used by <keep-alive> (must set!!!)
 * meta : {
    roles: ['admin','editor']    control the page roles (you can set multiple roles)
    title: 'title'               the name show in sidebar and breadcrumb (recommend set)
    icon: 'svg-name'/'el-icon-x' the icon show in the sidebar
    breadcrumb: false            if set false, the item will hidden in breadcrumb(default is true)
    activeMenu: '/example/list'  if set path, the sidebar will highlight the path you set
  }
 */

/**
 * 常量路由
 * 基础路由，不受权限控制，所有角色都可以使用
 */
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },

  {
    path: '/404',
    component: () => import('@/views/404'),
    hidden: true
  },

  {
    path: '/',
    component: Layout,
    redirect: '/qrcode',
    children: [
      {
        path: 'qrcode',
        name: 'qrcode',
        component: () => import('@/views/qrcode/index'),
        meta: { title: '二维码生成器', icon: 'el-icon-link', group: 'code' }
      }
    ]
  },

  {
    path: '/rate',
    component: Layout,
    hidden: true,
    children: [
      {
        path: 'rate',
        name: 'rate',
        component: () => import('@/views/rate/index'),
        meta: { title: '费率表', icon: 'el-icon-s-order' }
      }
    ]
  },
  {
    path: '/idcard',
    component: Layout,
    children: [
      {
        path: 'index',
        name: 'idcard',
        component: () => import('@/views/idcard/index'),
        meta: { title: '身份证号码', icon: 'el-icon-bank-card', group: 'code' }
      }
    ]
   },
    {
    path: "/jsondata",
    component: Layout,
    children: [
      {
        path: "index",
        name: "JSON数据格式化",
        component: () => import("@/views/jsonData/index"),
        meta: { title: "JSON 美化", icon: "el-icon-s-unfold", group: "code" }
      }
    ]
  },
      {
    path: "/jsonCompare",
    component: Layout,
    children: [
      {
        path: "index",
        name: "jsonCompare",
        component: () => import("@/views/jsonCompare/index"),
        meta: { title: "文本/JSON Diff", icon: "el-icon-s-operation", group: "code" }
      }
    ]
  },
  {
    path: '/doc-tools',
    component: Layout,
    redirect: '/doc-tools/docx',
    name: 'DocTools',
    meta: { title: '文档工具', icon: 'el-icon-document', group: 'doc' },
    children: [
      {
        path: 'docx',
        name: 'docx',
        component: () => import('@/views/docx/index'),
        meta: { title: 'Word 转富文本', icon: 'el-icon-document-copy' },
        beforeEnter: (to, from, next) => {
          mammoth().then((mammothLoad) => {
            window.mammoth = mammothLoad
          })
          next()
        }
      },
      {
        path: 'word-pdf',
        name: 'wordPdf',
        component: () => import('@/views/wordPdf/index'),
        meta: { title: 'Word 与 PDF 互转', icon: 'el-icon-refresh' }
      },
      {
        path: 'xss',
        name: 'xss',
        component: () => import('@/views/xss/index'),
        meta: { title: '富文本 XSS 转换', icon: 'el-icon-document-remove' }
      },
      {
        path: 'clipboard2markdown',
        name: 'clipboard2markdown',
        component: () => import('@/views/clipboard2markdown/index'),
        meta: { title: '富文本转 Markdown', icon: 'el-icon-notebook-2' }
      },
      {
        path: 'mermaid-editor',
        name: 'mermaid-editor',
        component: () => import('@/views/mermaid/index'),
        meta: { title: 'Mermaid 图表', icon: 'el-icon-share' },
        beforeEnter: (to, from, next) => {
          if (window.mermaid) {
            next()
          } else {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
            script.onload = () => {
              next()
            }
            script.onerror = () => {
              next()
            }
            document.head.appendChild(script)
          }
        }
      },
      {
        path: 'markdown-editor',
        name: 'markdown-editor',
        component: () => import('@/views/markdown/index'),
        meta: { title: 'Markdown 编辑器', icon: 'el-icon-tickets' },
        beforeEnter: (to, from, next) => {
          if (window.marked) {
            next()
          } else {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js'
            script.onload = () => {
              next()
            }
            script.onerror = () => {
              next()
            }
            document.head.appendChild(script)
          }
        }
      }
    ]
  },
  {
    path: "/clickArea",
    component: Layout,
    children: [
      {
        path: "index",
        name: "base64",
        component: () => import("@/views/clickArea/index"),
        meta: { title: "图片点击区域", icon: "el-icon-picture", group: "media" }
      }
    ]
  },

  {
    path: "/picCompress",
    component: Layout,
    children: [
      {
        path: "index",
        name: "picCompress",
        component: () => import("@/views/picCompress/index"),
        meta: { title: "图片压缩", icon: "el-icon-picture-outline", group: "media" }
      }
    ]
  },
  {
    path: "/regex",
    component: Layout,
    children: [
      {
        path: "index",
        name: "regex",
        component: () => import("@/views/regex/index"),
        meta: { title: "正则表达式测试器", icon: "el-icon-search", group: "net" }
      }
    ]
  },
  {
    path: "/httpRequest",
    component: Layout,
    children: [
      {
        path: "index",
        name: "httpRequest",
        component: () => import("@/views/httpRequest/index"),
        meta: { title: "HTTP 请求模拟器", icon: "el-icon-connection", group: "net" }
      }
    ]
  },
  {
    path: "/urlEncoder",
    component: Layout,
    children: [
      {
        path: "index",
        name: "urlEncoder",
        component: () => import("@/views/urlEncoder/index"),
        meta: { title: "URL 编码/解码", icon: "el-icon-link", group: "net" }
      }
    ]
  },
  {
    path: "/siteInfo",
    component: Layout,
    children: [
      {
        path: "index",
        name: "siteInfo",
        component: () => import("@/views/siteInfo/index"),
        meta: { title: "网站信息", icon: "el-icon-data-analysis", group: "net" }
      }
    ]
  },
  {
    path: "/lianxi",
    component: Layout,
    children: [
      {
        path: "index",
        name: "lianxi",
        component: () => import("@/views/lianxi/index"),
        meta: { title: "试题练习", icon: "el-icon-edit-outline", group: "other" }
      }
    ]
  },
  {
    path: "/skillCommander",
    component: Layout,
    children: [
      {
        path: "index",
        name: "skillCommander",
        component: () => import("@/views/skillCommander/index"),
        meta: { title: "MattPocock×Superpowers", icon: "el-icon-chat-line-square", group: "other" },
      },
    ],
  },
  {
    path: '/example',
    component: Layout,
    redirect: '/example/table',
    name: 'Example',
    hidden: true,
    meta: { title: '结构示例', icon: 'el-icon-s-help' },
    children: [
      {
        path: 'table',
        name: 'Table',
        component: () => import('@/views/table/index'),
        meta: { title: '列表结构', icon: 'table' }
      },
      {
        path: 'tree',
        name: 'Tree',
        component: () => import('@/views/tree/index'),
        meta: { title: '树形结构', icon: 'tree' }
      }
    ]
  },

  {
    path: '/form',
    component: Layout,
    hidden: true,
    children: [
      {
        path: 'index',
        name: 'Form',
        component: () => import('@/views/form/index'),
        meta: { title: 'Form', icon: 'form' }
      }
    ]
  },

  {
    path: '/nested',
    component: Layout,
    redirect: '/nested/menu1',
    name: 'Nested',
    hidden: true,
    meta: {
      title: 'Nested',
      icon: 'nested'
    },
    children: [
      {
        path: 'menu1',
        component: () => import('@/views/nested/menu1/index'), // Parent router-view
        name: 'Menu1',
        meta: { title: 'Menu1' },
        children: [
          {
            path: 'menu1-1',
            component: () => import('@/views/nested/menu1/menu1-1'),
            name: 'Menu1-1',
            meta: { title: 'Menu1-1' }
          },
          {
            path: 'menu1-2',
            component: () => import('@/views/nested/menu1/menu1-2'),
            name: 'Menu1-2',
            meta: { title: 'Menu1-2' },
            children: [
              {
                path: 'menu1-2-1',
                component: () =>
                  import('@/views/nested/menu1/menu1-2/menu1-2-1'),
                name: 'Menu1-2-1',
                meta: { title: 'Menu1-2-1' }
              },
              {
                path: 'menu1-2-2',
                component: () =>
                  import('@/views/nested/menu1/menu1-2/menu1-2-2'),
                name: 'Menu1-2-2',
                meta: { title: 'Menu1-2-2' }
              }
            ]
          },
          {
            path: 'menu1-3',
            component: () => import('@/views/nested/menu1/menu1-3'),
            name: 'Menu1-3',
            meta: { title: 'Menu1-3' }
          }
        ]
      },
      {
        path: 'menu2',
        component: () => import('@/views/nested/menu2/index'),
        name: 'Menu2',
        meta: { title: 'menu2' }
      }
    ]
  },

  {
    path: 'external-link',
    component: Layout,
    hidden: true,
    children: [
      {
        path: 'https://panjiachen.github.io/vue-element-admin-site/#/',
        meta: { title: 'External Link', icon: 'link' }
      }
    ]
  },

  // 404 page must be placed at the end !!!
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () =>
  new Router({
    // mode: 'history', // require service support
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes
  })

const router = createRouter()

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
