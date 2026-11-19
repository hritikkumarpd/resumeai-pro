const launchPdfBrowser = require('../lib/pdfBrowser')

async function checkRenderer() {
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent('<h1>Resume export check</h1>')
    const bytes = await page.pdf({ format: 'A4' })
    if (!Buffer.from(bytes).subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error('PDF renderer returned an invalid document')
    }
  } finally {
    await browser.close()
  }
}
checkRenderer().catch(error => { console.error(error); process.exitCode = 1 })
