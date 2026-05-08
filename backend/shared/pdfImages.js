const { PDFDocument } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

async function extrairImagensDoPDF(pdfPath, orcId) {
  const dir = path.join(__dirname, '../../uploads/itens');
  fs.mkdirSync(dir, { recursive: true });

  const bytes  = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const imagens = [];

  try {
    const pages = pdfDoc.getPages();
    for (let p = 0; p < pages.length; p++) {
      const page    = pages[p];
      const node    = page.node;
      const res     = node.Resources();
      if (!res) continue;

      let xObj;
      try { xObj = res.lookup(res.context.obj('XObject')); } catch { continue; }
      if (!xObj) continue;

      for (const [, ref] of Object.entries(xObj.dict || {})) {
        try {
          const obj = pdfDoc.context.lookup(ref);
          const sub = obj.get(obj.context.obj('Subtype'));
          if (!sub || sub.name !== 'Image') continue;

          const imgBytes = obj.contents || obj.getContents?.();
          if (!imgBytes) continue;

          const filename = `${orcId}-img${imagens.length}.png`;
          const outPath  = path.join(dir, filename);
          fs.writeFileSync(outPath, imgBytes);
          imagens.push({
            path:   outPath,
            url:    `/uploads/itens/${filename}`,
            base64: Buffer.from(imgBytes).toString('base64')
          });
        } catch { /* imagem inválida, pula */ }
      }
    }
  } catch (e) {
    console.warn('Extração de imagens parcial:', e.message);
  }

  return imagens;
}

module.exports = { extrairImagensDoPDF };
