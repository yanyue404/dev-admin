import { isExternal } from '@/utils/validate'

export const SHELL_GROUPS = [
  { id: 'code', name: '编码' },
  { id: 'doc', name: '文档' },
  { id: 'media', name: '媒体' },
  { id: 'net', name: '网络' },
  { id: 'other', name: '其他' }
]

function joinPath(base, routePath) {
  if (!routePath) return base || '/'
  if (isExternal(routePath)) return routePath
  if (routePath.charAt(0) === '/') return routePath
  const head = !base || base === '/' ? '' : String(base).replace(/\/$/, '')
  return (head + '/' + routePath).replace(/\/+/g, '/')
}

export function collectShellTools(routes) {
  const items = []
  ;(routes || []).forEach(route => {
    if (!route || route.hidden || isExternal(route.path)) return
    const children = (route.children || []).filter(child => {
      return child && !child.hidden && child.meta && child.meta.title
    })
    if (!children.length) return
    const parentGroup = route.meta && route.meta.group
    children.forEach(child => {
      const nested = (child.children || []).filter(leaf => leaf && !leaf.hidden && leaf.meta && leaf.meta.title)
      if (nested.length) {
        nested.forEach(leaf => {
          items.push({
            title: leaf.meta.title,
            icon: leaf.meta.icon || child.meta.icon || 'el-icon-menu',
            group: leaf.meta.group || child.meta.group || parentGroup || 'other',
            path: joinPath(joinPath(route.path, child.path), leaf.path)
          })
        })
        return
      }
      items.push({
        title: child.meta.title,
        icon: child.meta.icon || 'el-icon-menu',
        group: child.meta.group || parentGroup || 'other',
        path: joinPath(route.path, child.path)
      })
    })
  })
  return SHELL_GROUPS.map(group => {
    return {
      id: group.id,
      name: group.name,
      tools: items.filter(item => item.group === group.id)
    }
  }).filter(group => group.tools.length)
}

export function findShellTool(routes, currentPath) {
  const groups = collectShellTools(routes)
  for (let i = 0; i < groups.length; i++) {
    const tool = groups[i].tools.find(item => item.path === currentPath)
    if (tool) {
      return {
        groupName: groups[i].name,
        title: tool.title,
        path: tool.path
      }
    }
  }
  return null
}
