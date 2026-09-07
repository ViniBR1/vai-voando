// api/index.js
import { createServer } from 'http';
import { parse } from 'url';
import { Pool } from 'pg';

// Conexão com Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
}

// Função para enviar resposta
function sendResponse(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// Parsear body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// Handler principal
export default async function handler(req, res) {
  const parsedUrl = parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`📌 ${method} ${path}`);

  // CORS para OPTIONS
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    // ROTA: /api/destinos (GET, POST)
    if (path === '/api/destinos' && method === 'GET') {
      const result = await query('SELECT * FROM destinos ORDER BY id ASC');
      return sendResponse(res, 200, result.rows);
    }

    if (path === '/api/destinos' && method === 'POST') {
      const body = await parseBody(req);
      const { nome, preco, emoji, parcelas, texto, whats } = body;
      
      if (!nome || !preco) {
        return sendResponse(res, 400, { error: 'Nome e preço são obrigatórios' });
      }

      const result = await query(
        `INSERT INTO destinos (nome, preco, emoji, parcelas, texto, whats) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [nome, preco, emoji || '✈️', parcelas || '10x', texto || 'Pacote especial', whats || '5521991864436']
      );

      return sendResponse(res, 201, result.rows[0]);
    }

    // ROTA: /api/destinos/:id (DELETE, PUT)
    if (path.startsWith('/api/destinos/')) {
      const id = path.split('/')[3];
      
      if (method === 'DELETE') {
        const result = await query('DELETE FROM destinos WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
          return sendResponse(res, 404, { error: 'Destino não encontrado' });
        }
        return sendResponse(res, 200, { message: 'Destino removido', id });
      }

      if (method === 'PUT') {
        const body = await parseBody(req);
        const { nome, preco, emoji, parcelas, texto, whats } = body;

        const result = await query(
          `UPDATE destinos 
           SET nome = COALESCE($1, nome), 
               preco = COALESCE($2, preco), 
               emoji = COALESCE($3, emoji), 
               parcelas = COALESCE($4, parcelas), 
               texto = COALESCE($5, texto), 
               whats = COALESCE($6, whats) 
           WHERE id = $7 RETURNING *`,
          [nome, preco, emoji, parcelas, texto, whats, id]
        );

        if (result.rowCount === 0) {
          return sendResponse(res, 404, { error: 'Destino não encontrado' });
        }

        return sendResponse(res, 200, result.rows[0]);
      }
    }

    // ROTA: /api/login (POST)
    if (path === '/api/login' && method === 'POST') {
      const { username, password, role } = await parseBody(req);

      if (!username || !password) {
        return sendResponse(res, 400, { error: 'Usuário e senha são obrigatórios' });
      }

      // Login demo
      if (username === 'cliente' && password === '123456' && role === 'cliente') {
        return sendResponse(res, 200, {
          success: true,
          user: { name: 'Cliente', role: 'cliente' }
        });
      }

      if (username === 'adm' && password === '123456' && role === 'admin') {
        return sendResponse(res, 200, {
          success: true,
          user: { name: 'Administrador', role: 'admin' }
        });
      }

      return sendResponse(res, 401, { error: 'Credenciais inválidas' });
    }

    // Rota não encontrada
    return sendResponse(res, 404, { error: 'Rota não encontrada' });
  } catch (error) {
    console.error('❌ Erro:', error);
    return sendResponse(res, 500, { error: 'Erro interno do servidor' });
  }
}