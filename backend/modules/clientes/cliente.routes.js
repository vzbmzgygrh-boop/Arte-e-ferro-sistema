const express  = require('express');
const router   = express.Router();
const { db }   = require('../../config/database');
const { v4: uuid } = require('uuid');

const now = () => new Date().toISOString();

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT * FROM clientes WHERE ativo=1 ORDER BY nome`).all());
});

router.get('/buscar', (req, res) => {
  res.json(db.prepare(`SELECT * FROM clientes WHERE nome LIKE ? AND ativo=1`)
    .all(`%${req.query.nome || ''}%`));
});

router.get('/:id', (req, res) => {
  const c = db.prepare(`SELECT * FROM clientes WHERE id=?`).get(req.params.id);
  c ? res.json(c) : res.status(404).json({ erro: 'Não encontrado' });
});

router.post('/', (req, res) => {
  const id = uuid();
  const d  = req.body;
  db.prepare(`INSERT INTO clientes
    (id,nome,telefone,email,cpf_cnpj,endereco,cidade,tipo,observacoes,criado_em)
    VALUES (@id,@nome,@telefone,@email,@cpf_cnpj,@endereco,@cidade,@tipo,@observacoes,@criado_em)`)
    .run({ id, criado_em: now(), nome:'', telefone:null, email:null,
           cpf_cnpj:null, endereco:null, cidade:'Itajaí', tipo:'pessoa_fisica',
           observacoes:null, ...d });
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const d = req.body;
  const campos = Object.keys(d).map(k => `${k}=@${k}`).join(',');
  db.prepare(`UPDATE clientes SET ${campos} WHERE id=@id`).run({ ...d, id: req.params.id });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`UPDATE clientes SET ativo=0 WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
