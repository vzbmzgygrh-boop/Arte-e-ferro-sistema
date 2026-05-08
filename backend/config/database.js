const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sistema.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL,
    telefone TEXT, email TEXT, cpf_cnpj TEXT,
    endereco TEXT, cidade TEXT, tipo TEXT DEFAULT 'pessoa_fisica',
    observacoes TEXT, criado_em TEXT NOT NULL, ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY, numero INTEGER,
    cliente_id TEXT, cliente_nome TEXT,
    cliente_telefone TEXT, cliente_email TEXT,
    status TEXT DEFAULT 'rascunho',
    pdf_cliente TEXT, foto_projeto TEXT,
    itens TEXT,
    custo_material REAL DEFAULT 0,
    custo_pintura  REAL DEFAULT 0,
    custo_mao_obra REAL DEFAULT 0,
    custo_total    REAL DEFAULT 0,
    valor_venda    REAL DEFAULT 0,
    valor_avista   REAL DEFAULT 0,
    valor_parcela  REAL DEFAULT 0,
    observacoes TEXT, pdf_proposta TEXT,
    criado_em TEXT NOT NULL, atualizado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS sequencias (
    chave TEXT PRIMARY KEY, valor INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO sequencias (chave, valor) VALUES ('orcamento', 0);
`);

function proximoNumero() {
  db.prepare(`UPDATE sequencias SET valor = valor + 1 WHERE chave = 'orcamento'`).run();
  return db.prepare(`SELECT valor FROM sequencias WHERE chave = 'orcamento'`).get().valor;
}

module.exports = { db, proximoNumero };
