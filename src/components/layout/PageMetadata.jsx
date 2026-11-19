import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { publicPages, siteName, siteOrigin, websiteSchema } from '../../config/searchPages'

function updateHead(selector, tag, attributes) {
  let element = document.head.querySelector(selector)
  if (!attributes) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement(tag)
    document.head.append(element)
  }
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
}

export default function PageMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/'
    const page = publicPages[path]
    document.title = page?.title || siteName
    updateHead('meta[name="robots"]', 'meta', { name: 'robots', content: page ? 'index,follow' : 'noindex,follow' })
    updateHead('meta[name="description"]', 'meta', page && { name: 'description', content: page.description })
    updateHead('link[rel="canonical"]', 'link', page && { rel: 'canonical', href: siteOrigin + path })
    for (const [key, value] of Object.entries({ title: page?.title, description: page?.description, url: siteOrigin + path, site_name: siteName, type: 'website' })) {
      const property = 'og:' + key
      updateHead(`meta[property="${property}"]`, 'meta', page && { property, content: value })
    }
    updateHead('#website-schema', 'script', path === '/' && { id: 'website-schema', type: 'application/ld+json' })
    if (path === '/') document.getElementById('website-schema').textContent = JSON.stringify(websiteSchema)
  }, [pathname])
  return null
}
