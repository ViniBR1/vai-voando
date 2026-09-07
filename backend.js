// ============================================================
// BACKEND COMPLETO PARA VAI VOANDO - NEON POSTGRESQL
// ============================================================
// Este arquivo contém todas as rotas e configurações necessárias
// Para usar com Vercel Serverless Functions

import { createServer } from 'http';
import { parse } from 'url';
import { Pool } from 'pg';

// ============================================================
// 1. CONEXÃO COM O BANCO DE DADOS NEON
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rRxnsXZO31jM@ep-snowy-dust-ayspfldq-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Query executada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
}

// ============================================================
// 2. CONFIGURAÇÕES E UTILITÁRIOS
// ============================================================

// Configuração de CORS
const corsHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Função para enviar resposta
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...corsHeaders
  });
  res.end(JSON.stringify(data));
}

// Função para parsear body
function parseBody(req) {
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

// ============================================================
// 3. ROTAS DA API
// ============================================================

// 3.1. Rota de Destinos (GET, POST)
async function handleDestinos(req, res) {
  try {
    if (req.method === 'GET') {
      // Buscar todos os destinos
      const result = await query('SELECT * FROM destinos ORDER BY id ASC');
      return sendResponse(res, 200, result.rows);
    }

    if (req.method === 'POST') {
      // Adicionar novo destino
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

    return sendResponse(res, 405, { error: 'Método não permitido' });
  } catch (error) {
    console.error('❌ Erro em handleDestinos:', error);
    return sendResponse(res, 500, { error: 'Erro interno do servidor' });
  }
}

// 3.2. Rota de Destino Individual (DELETE, PUT)
async function handleDestinoById(req, res, id) {
  try {
    if (!id) {
      return sendResponse(res, 400, { error: 'ID não fornecido' });
    }

    if (req.method === 'DELETE') {
      // Remover destino
      const result = await query('DELETE FROM destinos WHERE id = $1 RETURNING *', [id]);
      
      if (result.rowCount === 0) {
        return sendResponse(res, 404, { error: 'Destino não encontrado' });
      }

      return sendResponse(res, 200, { message: 'Destino removido com sucesso', id });
    }

    if (req.method === 'PUT') {
      // Editar destino
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
         WHERE id = $7 
         RETURNING *`,
        [nome, preco, emoji, parcelas, texto, whats, id]
      );

      if (result.rowCount === 0) {
        return sendResponse(res, 404, { error: 'Destino não encontrado' });
      }

      return sendResponse(res, 200, result.rows[0]);
    }

    return sendResponse(res, 405, { error: 'Método não permitido' });
  } catch (error) {
    console.error('❌ Erro em handleDestinoById:', error);
    return sendResponse(res, 500, { error: 'Erro interno do servidor' });
  }
}

// 3.3. Rota de Login (POST)
async function handleLogin(req, res) {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, 405, { error: 'Método não permitido' });
    }

    const { username, password, role } = await parseBody(req);

    if (!username || !password) {
      return sendResponse(res, 400, { error: 'Usuário e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    const result = await query('SELECT * FROM usuarios WHERE username = $1', [username]);
    
    if (result.rowCount === 0) {
      // Criar usuário padrão se não existir (modo demo)
      const hashedPassword = await hashPassword(password);
      await query(
        'INSERT INTO usuarios (username, password, role) VALUES ($1, $2, $3)',
        [username, hashedPassword, role || 'cliente']
      );
      
      return sendResponse(res, 200, {
        success: true,
        user: {
          name: username === 'adm' ? 'Administrador' : 'Cliente',
          role: role || 'cliente'
        }
      });
    }

    // Verificar senha
    const user = result.rows[0];
    const passwordMatch = await comparePassword(password, user.password);
    
    if (!passwordMatch) {
      return sendResponse(res, 401, { error: 'Credenciais inválidas' });
    }

    // Verificar role
    if (role && user.role !== role) {
      return sendResponse(res, 401, { error: 'Role não corresponde' });
    }

    return sendResponse(res, 200, {
      success: true,
      user: {
        id: user.id,
        name: user.username === 'adm' ? 'Administrador' : 'Cliente',
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Erro em handleLogin:', error);
    return sendResponse(res, 500, { error: 'Erro interno do servidor' });
  }
}

// ============================================================
// 4. FUNÇÕES DE AUTENTICAÇÃO (simplificadas)
// ============================================================

// Função simples de hash (em produção use bcrypt)
async function hashPassword(password) {
  // Simulação - em produção use bcrypt
  return `hashed_${password}`;
}

async function comparePassword(password, hashed) {
  // Simulação - em produção use bcrypt.compare
  return hashed === `hashed_${password}`;
}

// ============================================================
// 5. ROTEADOR PRINCIPAL
// ============================================================

async function router(req, res) {
  const parsedUrl = parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`📌 ${method} ${path}`);

  // Lidar com CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  try {
    // Rotas
    if (path === '/api/destinos' && (method === 'GET' || method === 'POST')) {
      return await handleDestinos(req, res);
    }

    if (path.startsWith('/api/destinos/')) {
      const id = path.split('/')[3];
      if (id && (method === 'DELETE' || method === 'PUT')) {
        return await handleDestinoById(req, res, id);
      }
    }

    if (path === '/api/login' && method === 'POST') {
      return await handleLogin(req, res);
    }

    // Rota não encontrada
    return sendResponse(res, 404, { error: 'Rota não encontrada' });
  } catch (error) {
    console.error('❌ Erro no roteador:', error);
    return sendResponse(res, 500, { error: 'Erro interno do servidor' });
  }
}

// ============================================================
// 6. SERVIDOR (para desenvolvimento local)
// ============================================================

const server = createServer((req, res) => {
  router(req, res);
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Conectado ao Neon PostgreSQL`);
  });
}

// ============================================================
// 7. EXPORT PARA VERCEL
// ============================================================

// Para Vercel Serverless Functions
export default async function handler(req, res) {
  return router(req, res);
}

// ============================================================
// 8. SCRIPT PARA CRIAR TABELAS
// ============================================================

// Execute este script uma vez para criar as tabelas no Neon
export async function initDatabase() {
  try {
    console.log('📦 Inicializando banco de dados...');

    // Criar tabela de destinos
    await query(`
      CREATE TABLE IF NOT EXISTS destinos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        preco VARCHAR(50) NOT NULL,
        emoji VARCHAR(10) DEFAULT '✈️',
        parcelas VARCHAR(20) DEFAULT '10x',
        texto TEXT DEFAULT 'Pacote especial',
        whats VARCHAR(20) DEFAULT '5521991864436',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de usuários
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'cliente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir usuários padrão
    await query(`
      INSERT INTO usuarios (username, password, role) 
      VALUES 
        ('cliente', 'hashed_123456', 'cliente'),
        ('adm', 'hashed_123456', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);

    // Inserir destinos padrão
    await query(`
      INSERT INTO destinos (nome, preco, emoji, parcelas, texto, whats) VALUES
        ('Rio das Ostras', 'R$ 153,18', '🏖️', '10x', 'Hotel Vilarejo Praia · All Inclusive', '5521991864436'),
        ('Búzios', 'R$ 219,90', '⛵', '12x', 'Pacote Romance · 3 noites', '5521991864436'),
        ('Cabo Frio', 'R$ 189,00', '🌊', '10x', 'All inclusive + passeios', '5521991864436'),
        ('Angra dos Reis', 'R$ 267,50', '⛰️', '12x', 'Ilhas e mergulho', '5521991864436'),
        ('Arraial do Cabo', 'R$ 204,30', '🐠', '10x', 'Pacote familiar', '5521991864436'),
        ('Paraty', 'R$ 298,00', '⛪', '12x', 'História + praias', '5521991864436')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}

// Se executar diretamente, inicializa o banco
if (process.argv[1] === import.meta.url) {
  initDatabase();
}

// ============================================================
// 9. EXPORTAÇÕES PARA USO EM OUTROS ARQUIVOS
// ============================================================

export { 
  query, 
  pool, 
  router, 
  initDatabase,
  handleDestinos,
  handleDestinoById,
  handleLogin
};

console.log('✅ Backend Vai Voando carregado com sucesso!');
console.log('🔗 Conectado a:', process.env.DATABASE_URL || 'Neon PostgreSQL');