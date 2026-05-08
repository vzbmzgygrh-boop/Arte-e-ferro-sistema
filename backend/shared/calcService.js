require('dotenv').config();

const CFG = {
  mult:         parseFloat(process.env.MULTIPLICADOR_VENDA)    || 2.5,
  pintBasica:   parseFloat(process.env.PRECO_PINTURA_BASICA)   || 100,
  pintEspecial: parseFloat(process.env.PRECO_PINTURA_ESPECIAL) || 150,
  descAvista:   parseFloat(process.env.DESCONTO_AVISTA)        || 0.10,
  parcelas:     parseInt(process.env.MAX_PARCELAS)             || 10
};

function area(l, a) { return (l / 100) * (a / 100); }

function custoPint(l, a, tipo) {
  if (!tipo || tipo === 'sem_pintura') return 0;
  return area(l, a) * (tipo === 'especial' ? CFG.pintEspecial : CFG.pintBasica);
}

function calcularOrcamento(itens = []) {
  let totMat = 0, totPint = 0, totMO = 0;

  const calc = itens.map(item => {
    const qtd      = item.quantidade || 1;
    const a        = area(item.largura_cm || 0, item.altura_cm || 0);
    const matU     = item.custo_material_unitario || 0;
    const pintU    = custoPint(item.largura_cm || 0, item.altura_cm || 0, item.tipo_pintura);
    const moU      = item.mao_obra_unitaria || 0;

    const matI     = matU  * qtd;
    const pintI    = pintU * qtd;
    const moI      = moU   * qtd;
    const custoI   = (matU + pintU + moU) * qtd;
    const vendaI   = custoI * CFG.mult;

    totMat  += matI;
    totPint += pintI;
    totMO   += moI;

    return {
      ...item,
      area_m2:                parseFloat(a.toFixed(4)),
      custo_material_item:    parseFloat(matI.toFixed(2)),
      custo_pintura_unitario: parseFloat(pintU.toFixed(2)),
      custo_pintura_item:     parseFloat(pintI.toFixed(2)),
      custo_mao_obra_item:    parseFloat(moI.toFixed(2)),
      custo_unitario:         parseFloat((matU + pintU + moU).toFixed(2)),
      custo_total_item:       parseFloat(custoI.toFixed(2)),
      valor_venda_item:       parseFloat(vendaI.toFixed(2))
    };
  });

  const custoTotal = totMat + totPint + totMO;
  const venda      = custoTotal * CFG.mult;

  return {
    itens:          calc,
    custo_material: parseFloat(totMat.toFixed(2)),
    custo_pintura:  parseFloat(totPint.toFixed(2)),
    custo_mao_obra: parseFloat(totMO.toFixed(2)),
    custo_total:    parseFloat(custoTotal.toFixed(2)),
    valor_venda:    parseFloat(venda.toFixed(2)),
    valor_avista:   parseFloat((venda * (1 - CFG.descAvista)).toFixed(2)),
    valor_parcela:  parseFloat((venda / CFG.parcelas).toFixed(2)),
    max_parcelas:   CFG.parcelas,
    multiplicador:  CFG.mult
  };
}

module.exports = { calcularOrcamento };
