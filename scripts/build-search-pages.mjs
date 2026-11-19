import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { publicPages, siteName, siteOrigin, websiteSchema } from '../src/config/searchPages.js'

const shell = await readFile('dist/index.html', 'utf8')
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const navigation = '<nav><a href="/">DailyResumeAI</a> · <a href="/templates">Resume templates</a> · <a href="/pricing">Plans and pricing</a></nav>'
const privateShell = shell.replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
await mkdir('dist/pages', { recursive: true })
await writeFile('dist/pages/account.html', privateShell)

for (const [path, page] of Object.entries(publicPages)) {
  const url = siteOrigin + path
  const meta = [
    '<meta name="robots" content="index,follow">',
    `<meta name="description" content="${escape(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${siteName}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${escape(page.title)}">`,
    `<meta property="og:description" content="${escape(page.description)}">`,
  ]
  if (path === '/') meta.push(`<script id="website-schema" type="application/ld+json">${JSON.stringify(websiteSchema)}</script>`)
  const html = shell.replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace('</head>', meta.join('\n') + '\n</head>')
    .replace('<div id="root"></div>', `<div id="root"><main><h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>${navigation}</main></div>`)
  await writeFile(path === '/' ? 'dist/index.html' : `dist/pages${path}.html`, html)
}

const entries = Object.keys(publicPages).map(path => `  <url><loc>${siteOrigin}${path}</loc></url>`)
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`)
