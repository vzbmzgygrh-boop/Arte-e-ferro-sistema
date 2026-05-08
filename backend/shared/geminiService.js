const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extrairDadosPDF(texto, imagensBase64 = []) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const partes = [{
    text: `Você é especialista em orçamentos de serralheria artística.
Analise o texto e as imagens abaixo de um PDF de orçamento.
Retorne APENAS um JSON válido, sem markdown.

TEXTO DO PDF:
${texto}

REGRAS:
- tipo_pintura: "basica" (cores comuns), "especial" (epóxi/automotiva/powder), "sem_pintura"
- Se custo_material não informado, estime pelo material e dimensões
- mao_obra_unitaria: 0 se não informado (ajuste manual depois)
- indice_imagem: índice da imagem que representa esse item (0,1,2...) ou null
- confianca: "alta" se PDF tem medidas claras, "media" se falta algo, "baixa" se vago

FORMATO:
{
  "cliente": { "nome": null, "telefone": null, "email": null },
  "itens": [{
    "descricao": "",
    "largura_cm": 0,
    "altura_cm": 0,
    "quantidade": 1,
    "material": "",
    "custo_material_unitario": 0,
    "tipo_pintura": "basica",
    "mao_obra_unitaria": 0,
    "observacoes": null,
    "indice_imagem": null
  }],
  "observacoes_gerais": null,
  "confianca": "media"
}`
  }];

  // Adiciona imagens do PDF se existirem
  imagensBase64.forEach((img, i) => {
    partes.push({ text: `Imagem ${i} do PDF:` });
    partes.push({
      inlineData: { mimeType: 'image/png', data: img }
    });
  });

  const result = await model.generateContent(partes);
  const text   = result.response.text().trim()
    .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try { return JSON.parse(text); }
  catch { throw new Error('Erro ao interpretar resposta da IA. Tente novamente.'); }
}

module.exports = { extrairDadosPDF };
