const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(bodyParser.json());

const config = {
  user: process.env.DB_USER,             
  password: process.env.DB_PASSWORD,  
  server: process.env.DB_SERVER, 
  port: 1433,                       
  database: process.env.DB_NAME,          
  options: {
    encrypt: true,                 
    trustServerCertificate: true    
  }
};

async function connect() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (error) {
    console.error('Erro de conexão com o banco de dados:', error);
    throw error;
  }
}

app.get('/contas', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT * FROM DelTeaching.dbo.BankAccounts');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar as contas', error: error.message });
  }
});

app.get('/contas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM DelTeaching.dbo.BankAccounts WHERE id = @id');
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ message: 'Conta não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar a conta', error: error.message });
  }
});

app.post('/contas', async (req, res) => {
  const { branch, number, type, holderName, holderEmail, holderDocument, holderType } = req.body;

  if (!branch || !number || !type || !holderName || !holderEmail || !holderDocument || holderType === undefined) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios (branch, number, type, holderName, holderEmail, holderDocument, holderType)' });
  }

  try {
    const pool = await connect();
    const result = await pool.request()
      .input('branch', sql.Int, branch)
      .input('number', sql.Int, number)
      .input('type', sql.NVarChar, type)
      .input('holderName', sql.NVarChar, holderName)
      .input('holderEmail', sql.NVarChar, holderEmail)
      .input('holderDocument', sql.NVarChar, holderDocument)
      .input('holderType', sql.Int, holderType)
      .query('INSERT INTO DelTeaching.dbo.BankAccounts (branch, number, type, holderName, holderEmail, holderDocument, holderType) OUTPUT INSERTED.* VALUES (@branch, @number, @type, @holderName, @holderEmail, @holderDocument, @holderType)');
    
    const novaConta = result.recordset[0];
    res.status(201).json(novaConta);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar a conta', error: error.message });
  }
});

app.put('/contas/:id', async (req, res) => {
  const { id } = req.params; 
  const { branch, number, type, holderName, holderEmail, holderDocument, holderType } = req.body;

  let updates = [];
  let queryValues = [];

  if (branch) {
    updates.push("branch = @branch");
    queryValues.push({ name: 'branch', value: branch });
  }
  if (number) {
    updates.push("number = @number");
    queryValues.push({ name: 'number', value: number });
  }
  if (type) {
    updates.push("type = @type");
    queryValues.push({ name: 'type', value: type });
  }
  if (holderName) {
    updates.push("holderName = @holderName");
    queryValues.push({ name: 'holderName', value: holderName });
  }
  if (holderEmail) {
    updates.push("holderEmail = @holderEmail");
    queryValues.push({ name: 'holderEmail', value: holderEmail });
  }
  if (holderDocument) {
    updates.push("holderDocument = @holderDocument");
    queryValues.push({ name: 'holderDocument', value: holderDocument });
  }
  if (holderType !== undefined) {
    updates.push("holderType = @holderType");
    queryValues.push({ name: 'holderType', value: holderType });
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Nenhum campo para atualizar fornecido' });
  }

  const updateQuery = `UPDATE DelTeaching.dbo.BankAccounts 
                        SET ${updates.join(", ")} 
                        WHERE id = @id`;

  try {
    const pool = await connect();
    const request = pool.request();
    
    request.input('id', sql.Int, id);
    
    queryValues.forEach((param) => {
      request.input(param.name, sql.NVarChar, param.value);
    });

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] > 0) {
      res.json({ message: 'Conta atualizada com sucesso' });
    } else {
      res.status(404).json({ message: 'Conta não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar a conta', error: error.message });
  }
});

app.delete('/contas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await connect();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM DelTeaching.dbo.BankAccounts WHERE id = @id');
    
    if (result.rowsAffected[0] > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Conta não encontrada' }); 
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir a conta', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});