const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const pdfParse   = require('pdf-parse');
const path       = require('path');
const fs         = require('fs');
const { v4: uuid }         = require('uuid');
const { db, proximoNumero } = require('../../config/database');
const { extrairDadosPDF }   = require('../../shared/geminiService');
const { calcularOrcamento } = require('../../shared/calcService');
const { gerarPDFProposta }  = require('../../shared/pdfService');
const { extrairImagensDoPDF } = require('../../shared/pdfImages');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const now = () => new Date().toISOString();

function salvar(dados) {
  if (dados.itens && typeof dados.itens !== 'string')
    dados.itens = JSON.stringify(dados.itens);
  return dados;
}

function ler(row) {
  if (!row) return null;
  return { ...row, itens: JSON.parse(row.itens || '[]') };
}

/* ── GET /api/orcamentos ── */
router.get('/', (req, res) => {
  let q = `SELECT * FROM orcamentos`;
  const p = [];
  if (req.query.status) { q += ` WHERE status=?`; p.push(req.query.status); }
  q += ` ORDER BY criado_em DESC`;
  res.json(db.prepare(q).all(...p).map(ler));
});

/* ── GET /api/orcamentos/:id ── */
router.get('/:id', (req, res) => {
  const o = ler(db.prepare(`SELECT * FROM orcamentos WHERE id=?`).get(req.params.id));
  o ? res.json(o) : res.status(404).json({ erro: 'Não encontrado' });
});

/* ── POST /api/orcamentos/upload ── */
router.post('/upload', upload.fields([
  { name: 'pdf',  maxCount: 1 },
  { name: 'foto', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfFile  = req.files['pdf']?.[0];
    const fotoFile = req.files['foto']?.[0];
    if (!pdfFile) return res.status(400).json({ erro: 'PDF obrigatório' });

    const id = uuid();

    // 1. Extrai texto
    const buf  = fs.readFileSync(pdfFile.path);
    const { text } = await pdfParse(buf);

    // 2. Extrai imagens do PDF
    const imagens = await extrairImagensDoPDF(pdfFile.path, id);
    const imgs64  = imagens.map(i => i.base64);

    // 3. IA interpreta
    const dadosIA = await extrairDadosPDF(text, imgs64);

    // 4. Associa imagens aos itens pelo indice_imagem
    const itensComImg = (dadosIA.itens || []).map(item => ({
      ...item,
      imagem: item.indice_imagem != null && imagens[item.indice_imagem]
        ? imagens[item.indice_imagem].path
        : null
    }));

    // 5. Calcula
    const calc = calcularOrcamento(itensComImg);
    const num  = proximoNumero();

    // 6. Salva
    db.prepare(`
      INSERT INTO orcamentos (
        id, numero, cliente_nome, cliente_telefone, cliente_email,
        status, pdf_cliente, foto_projeto, itens,
        custo_material, custo_pintura, custo_mao_obra, custo_total,
        valor_venda, valor_avista, valor_parcela, observacoes, criado_em
      ) VALUES (
        @id, @numero, @cliente_nome, @cliente_telefone, @cliente_email,
        @status, @pdf_cliente, @foto_projeto, @itens,
        @custo_material, @custo_pintura, @custo_mao_obra, @custo_total,
        @valor_venda, @valor_avista, @valor_parcela, @observacoes, @criado_em
      )`).run({
      id, numero: num,
      cliente_nome:     dadosIA.cliente?.nome     || req.body.cliente_nome     || null,
      cliente_telefone: dadosIA.cliente?.telefone || req.body.cliente_telefone || null,
      cliente_email:    dadosIA.cliente?.email    || req.body.cliente_email    || null,
      status:      'rascunho',
      pdf_cliente: pdfFile.path,
      foto_projeto: fotoFile?.path || null,
      itens:        JSON.stringify(calc.itens),
      custo_material: calc.custo_material,
      custo_pintura:  calc.custo_pintura,
      custo_mao_obra: calc.custo_mao_obra,
      custo_total:    calc.custo_total,
      valor_venda:    calc.valor_venda,
      valor_avista:   calc.valor_avista,
      valor_parcela:  calc.valor_parcela,
      observacoes:    dadosIA.observacoes_gerais || null,
      criado_em:      now()
    });

    res.status(201).json({
      id, numero: num,
      calculo: calc,
      dados_ia: dadosIA,
      imagens_extraidas: imagens.map(i => i.url)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

/* ── PUT /api/orcamentos/:id ── */
router.put('/:id', (req, res) => {
  const { itens, ...resto } = req.body;
  const updates = { ...resto };

  if (itens) {
    const calc = calcularOrcamento(itens);
    Object.assign(updates, {
      itens:          calc.itens,
      custo_material: calc.custo_material,
      custo_pintura:  calc.custo_pintura,
      custo_mao_obra: calc.custo_mao_obra,
      custo_total:    calc.custo_total,
      valor_venda:    calc.valor_venda,
      valor_avista:   calc.valor_avista,
      valor_parcela:  calc.valor_parcela
    });
  }
  updates.atualizado_em = now();
  salvar(updates);
  const campos = Object.keys(updates).map(k => `${k}=@${k}`).join(',');
  db.prepare(`UPDATE orcamentos SET ${campos} WHERE id=@id`)
    .run({ ...updates, id: req.params.id });
  res.json({ ok: true });
});

/* ── POST /api/orcamentos/:id/gerar-pdf ── */
router.post('/:id/gerar-pdf', async (req, res) => {
  const orc = ler(db.prepare(`SELECT * FROM orcamentos WHERE id=?`).get(req.params.id));
  if (!orc) return res.status(404).json({ erro: 'Não encontrado' });

  const dir = path.join(__dirname, '../../../propostas');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `proposta-${orc.numero}-${orc.id}.pdf`);

  await gerarPDFProposta(orc, out);

  db.prepare(`UPDATE orcamentos SET status=?, pdf_proposta=?, atualizado_em=? WHERE id=?`)
    .run('proposta_gerada', out, now(), orc.id);

  res.download(out, `Proposta-${String(orc.numero).padStart(4,'0')}-ArteEFerro.pdf`);
});

/* ── DELETE /api/orcamentos/:id ── */
router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM orcamentos WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
