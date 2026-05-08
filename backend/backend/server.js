require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

['uploads','uploads/itens','propostas','data'].forEach(d =>
  fs.mkdirSync(path.join(__dirname, '..', d), { recursive: true })
);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads',   express.static(path.join(__dirname, '../uploads')));
app.use('/propostas', express.static(path.join(__dirname, '../propostas')));

app.use('/api/clientes',   require('./modules/clientes/cliente.routes'));
app.use('/api/orcamentos', require('./modules/orcamentos/orcamento.routes'));

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Arte e Ferro rodando na porta ${PORT}`)
);
