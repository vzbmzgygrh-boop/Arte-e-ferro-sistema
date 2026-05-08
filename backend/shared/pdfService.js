const puppeteer = require('puppeteer');
require('dotenv').config();

const fmt = v =>
  parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PINT_LABEL = { basica: 'Básica', especial: 'Especial', sem_pintura: 'Sem pintura' };

function gerarHTML(orc) {
  const dataEmissao = new Date(orc.criado_em).toLocaleDateString('pt-BR');
  const dias = parseInt(process.env.VALIDADE_ORCAMENTO_DIAS || 15);
  const dataValidade = new Date(
    new Date(orc.criado_em).getTime() + dias * 86400000
  ).toLocaleDateString('pt-BR');

  /* ── Foto geral do projeto ── */
  const fotoGeral = orc.foto_projeto
    ? `<div class="secao">Foto do Projeto</div>
       <div style="text-align:center;margin-bottom:20px;">
         <img src="file://${orc.foto_projeto}"
              style="max-width:100%;max-height:260px;border-radius:8px;
                     border:2px solid #e0d5b0;object-fit:contain;"/>
       </div>` : '';

  /* ── Tabela detalhada por peça ── */
  const itensHTML = (orc.itens || []).map((it, i) => {
    const imgTag = it.imagem
      ? `<img src="file://${it.imagem}"
              style="max-width:90px;max-height:90px;border-radius:4px;
                     border:1px solid #ccc;object-fit:contain;display:block;margin:4px auto;"/>`
      : '<span style="color:#bbb;font-size:11px;">sem imagem</span>';

    return `
      <tr class="${i % 2 === 0 ? 'par' : ''}">
        <td style="text-align:center;font-weight:700;">${i + 1}</td>
        <td>
          <strong>${it.descricao}</strong><br/>
          <span style="font-size:11px;color:#666;">
            ${it.largura_cm} × ${it.altura_cm} cm | ${it.material || '—'} |
            ${PINT_LABEL[it.tipo_pintura] || '—'} | Qtd: ${it.quantidade}
          </span>
        </td>
        <td style="text-align:center;">${imgTag}</td>
        <td style="text-align:right;">${fmt(it.custo_material_item)}</td>
        <td style="text-align:right;">${fmt(it.custo_pintura_item)}</td>
        <td style="text-align:right;">${fmt(it.custo_mao_obra_item)}</td>
        <td style="text-align:right;font-weight:700;">${fmt(it.custo_total_item)}</td>
        <td style="text-align:right;color:#8B6914;font-weight:700;">${fmt(it.valor_venda_item)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:32px 36px;font-size:12px;}

  .header{display:flex;justify-content:space-between;align-items:flex-end;
          border-bottom:4px solid #8B6914;padding-bottom:16px;margin-bottom:24px;}
  .emp-nome{font-size:24px;font-weight:800;color:#8B6914;letter-spacing:1.5px;}
  .emp-sub{color:#666;font-size:11px;margin-top:3px;}
  .num-orc .num{font-size:18px;font-weight:700;color:#8B6914;text-align:right;}
  .num-orc .datas{font-size:10px;color:#888;text-align:right;margin-top:3px;}

  .secao{background:#8B6914;color:#fff;padding:5px 14px;font-size:10px;
         font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
         border-radius:3px;margin:18px 0 10px;}

  .cli-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px;}
  .cli-item{background:#f8f5ee;padding:8px 12px;border-radius:4px;border-left:3px solid #8B6914;}
  .cli-item label{display:block;font-size:9px;color:#888;text-transform:uppercase;margin-bottom:2px;}
  .cli-item span{font-size:12px;font-weight:600;}

  table{width:100%;border-collapse:collapse;font-size:11px;}
  thead tr{background:#2a2a2a;color:#fff;}
  thead th{padding:8px 6px;text-align:left;font-weight:600;}
  tbody td{padding:7px 6px;border-bottom:1px solid #eee;vertical-align:middle;}
  tbody tr.par td{background:#faf8f3;}

  .resumo-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;}
  .custo-box{background:#f5f5f5;border-radius:6px;padding:14px;}
  .custo-box h4{font-size:10px;color:#777;text-transform:uppercase;
                letter-spacing:1px;margin-bottom:10px;}
  .cl{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:#444;}
  .cl.tot{border-top:2px solid #ccc;margin-top:8px;padding-top:8px;
           font-weight:800;font-size:14px;color:#1a1a1a;}
  .cl.venda{font-weight:800;font-size:16px;color:#8B6914;}

  .pag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .pag-box{text-align:center;padding:14px 10px;border-radius:8px;}
  .pag-box.av{background:#edfaed;border:2px solid #52b052;}
  .pag-box.pa{background:#edf3ff;border:2px solid #4a80d9;}
  .pag-box label{display:block;font-size:9px;font-weight:700;text-transform:uppercase;
                 letter-spacing:.8px;margin-bottom:6px;color:#555;}
  .pag-box .val{font-size:20px;font-weight:800;}
  .pag-box.av .val{color:#2f7d2f;}
  .pag-box.pa .val{color:#2a5bb8;}
  .pag-box .sub{font-size:10px;color:#888;margin-top:3px;}

  .obs{background:#fff8e6;border:1px solid #f0d070;border-radius:4px;
       padding:10px 14px;margin-top:18px;font-size:11px;color:#555;}
  .valid{text-align:center;background:#fff3cd;border:1px solid #ffc107;
         border-radius:4px;padding:9px;margin-top:14px;font-size:11px;}
  .rodape{margin-top:24px;border-top:1px solid #ddd;padding-top:10px;
          text-align:center;color:#aaa;font-size:10px;}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="emp-nome">${process.env.EMPRESA_NOME || 'ARTE E FERRO DESIGN'}</div>
    <div class="emp-sub">Serralheria Artística — ${process.env.EMPRESA_CIDADE || 'Itajaí, SC'}</div>
  </div>
  <div class="num-orc">
    <div class="num">Orçamento Nº ${String(orc.numero || 0).padStart(4,'0')}</div>
    <div class="datas">Emissão: ${dataEmissao} | Validade: ${dataValidade}</div>
  </div>
</div>

<div class="secao">Dados do Cliente</div>
<div class="cli-grid">
  <div class="cli-item"><label>Nome</label><span>${orc.cliente_nome || '—'}</span></div>
  <div class="cli-item"><label>Telefone</label><span>${orc.cliente_telefone || '—'}</span></div>
  <div class="cli-item"><label>E-mail</label><span>${orc.cliente_email || '—'}</span></div>
</div>

${fotoGeral}

<div class="secao">Detalhamento por Peça</div>
<table>
  <thead>
    <tr>
      <th style="width:30px;">#</th>
      <th>Descrição / Especificações</th>
      <th style="width:100px;text-align:center;">Imagem Ref.</th>
      <th style="text-align:right;">Material</th>
      <th style="text-align:right;">Pintura</th>
      <th style="text-align:right;">Mão de Obra</th>
      <th style="text-align:right;">Custo Total</th>
      <th style="text-align:right;">Valor Venda</th>
    </tr>
  </thead>
  <tbody>${itensHTML}</tbody>
</table>

<div class="resumo-grid">
  <div class="custo-box">
    <h4>Composição Geral dos Custos</h4>
    <div class="cl"><span>Total de Material</span><span>${fmt(orc.custo_material)}</span></div>
    <div class="cl"><span>Total de Pintura</span><span>${fmt(orc.custo_pintura)}</span></div>
    <div class="cl"><span>Total de Mão de Obra</span><span>${fmt(orc.custo_mao_obra)}</span></div>
    <div class="cl tot"><span>Custo Total</span><span>${fmt(orc.custo_total)}</span></div>
    <div class="cl venda"><span>Valor de Venda (×${orc.multiplicador || 2.5})</span>
                          <span>${fmt(orc.valor_venda)}</span></div>
  </div>
  <div>
    <h4 style="font-size:10px;color:#777;text-transform:uppercase;
               letter-spacing:1px;margin-bottom:10px;">Condições de Pagamento</h4>
    <div class="pag-grid">
      <div class="pag-box av">
        <label>À Vista (10% off)</label>
        <div class="val">${fmt(orc.valor_avista)}</div>
        <div class="sub">Economia de ${fmt(orc.valor_venda - orc.valor_avista)}</div>
      </div>
      <div class="pag-box pa">
        <label>Parcelado</label>
        <div class="val">${fmt(orc.valor_parcela)}</div>
        <div class="sub">${orc.max_parcelas || 10}× sem juros</div>
      </div>
    </div>
  </div>
</div>

${orc.observacoes
  ? `<div class="obs"><strong>Observações:</strong> ${orc.observacoes}</div>`
  : ''}

<div class="valid">
  ⚠️ Orçamento válido até <strong>${dataValidade}</strong>.
  Após essa data os valores poderão ser revisados.
</div>

<div class="rodape">
  ${process.env.EMPRESA_NOME || 'Arte e Ferro Design'} |
  ${process.env.EMPRESA_CIDADE || 'Itajaí, SC'} |
  ${process.env.EMPRESA_TELEFONE || ''} |
  ${process.env.EMPRESA_EMAIL || ''}
</div>

</body></html>`;
}

async function gerarPDFProposta(orc, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setContent(gerarHTML(orc), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath, format: 'A4', printBackground: true,
    margin: { top:'12mm', bottom:'12mm', left:'10mm', right:'10mm' }
  });
  await browser.close();
}

module.exports = { gerarPDFProposta };
