import { Pool } from 'pg';

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

function sendResponse(res, statusCode, data) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
}

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

export default async function handler(req, res) {
    // CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.statusCode = 200;
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    console.log(`📌 ${req.method} ${path}`);

    try {
        // ============================================================
        // ROTA: /api/login (POST)
        // ============================================================
        if (path === '/api/login') {
            if (req.method !== 'POST') {
                return sendResponse(res, 405, { error: 'Método não permitido. Use POST.' });
            }

            try {
                const body = await parseBody(req);
                const { username, password, role } = body;

                if (!username || !password) {
                    return sendResponse(res, 400, { error: 'Usuário e senha são obrigatórios' });
                }

                if (username === 'cliente' && password === '123456' && role === 'cliente') {
                    return sendResponse(res, 200, {
                        success: true,
                        user: { name: 'Cliente', role: 'cliente', id: 1 }
                    });
                }

                if (username === 'adm' && password === '123456' && role === 'admin') {
                    return sendResponse(res, 200, {
                        success: true,
                        user: { name: 'Administrador', role: 'admin', id: 2 }
                    });
                }

                return sendResponse(res, 401, { error: 'Credenciais inválidas' });
            } catch (error) {
                console.error('❌ Erro no login:', error);
                return sendResponse(res, 500, { error: 'Erro interno do servidor' });
            }
        }

        // ============================================================
        // ROTA: /api/destinos (GET)
        // ============================================================
        if (path === '/api/destinos' && req.method === 'GET') {
            try {
                // Verificar se a tabela existe, se não criar
                await query(`
                    CREATE TABLE IF NOT EXISTS destinos (
                        id SERIAL PRIMARY KEY,
                        nome VARCHAR(100) NOT NULL,
                        preco VARCHAR(50) NOT NULL,
                        imagem TEXT,
                        parcelas VARCHAR(20) DEFAULT '10x',
                        texto TEXT DEFAULT 'Pacote especial',
                        whats VARCHAR(20) DEFAULT '5521991864436',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                const result = await query('SELECT * FROM destinos ORDER BY id ASC');
                return sendResponse(res, 200, result.rows);
            } catch (error) {
                console.error('❌ Erro ao buscar destinos:', error);
                return sendResponse(res, 500, { error: 'Erro ao buscar destinos' });
            }
        }

        // ============================================================
        // ROTA: /api/destinos (POST - ADICIONAR COM IMAGEM)
        // ============================================================
        if (path === '/api/destinos' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { nome, preco, imagem, parcelas, texto, whats } = body;

                if (!nome || !preco) {
                    return sendResponse(res, 400, { error: 'Nome e preço são obrigatórios' });
                }

                // Validar imagem Base64 (opcional)
                let imagemSalva = imagem || null;
                if (imagem && !imagem.startsWith('data:image')) {
                    return sendResponse(res, 400, { error: 'Formato de imagem inválido. Use Base64.' });
                }

                const result = await query(
                    `INSERT INTO destinos (nome, preco, imagem, parcelas, texto, whats) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [nome, preco, imagemSalva, parcelas || '10x', texto || 'Pacote especial', whats || '5521991864436']
                );

                return sendResponse(res, 201, result.rows[0]);
            } catch (error) {
                console.error('❌ Erro ao adicionar destino:', error);
                return sendResponse(res, 500, { error: 'Erro ao adicionar destino' });
            }
        }

        // ============================================================
        // ROTA: /api/destinos/:id (DELETE)
        // ============================================================
        if (path.startsWith('/api/destinos/')) {
            const id = path.split('/')[3];

            if (req.method === 'DELETE') {
                try {
                    const result = await query('DELETE FROM destinos WHERE id = $1 RETURNING *', [id]);
                    if (result.rowCount === 0) {
                        return sendResponse(res, 404, { error: 'Destino não encontrado' });
                    }
                    return sendResponse(res, 200, { message: 'Destino removido', id });
                } catch (error) {
                    console.error('❌ Erro ao remover destino:', error);
                    return sendResponse(res, 500, { error: 'Erro ao remover destino' });
                }
            }

            // ============================================================
            // ROTA: /api/destinos/:id (PUT - ATUALIZAR COM IMAGEM)
            // ============================================================
            if (req.method === 'PUT') {
                try {
                    const body = await parseBody(req);
                    const { nome, preco, imagem, parcelas, texto, whats } = body;

                    // Validar imagem Base64 se fornecida
                    if (imagem && !imagem.startsWith('data:image')) {
                        return sendResponse(res, 400, { error: 'Formato de imagem inválido. Use Base64.' });
                    }

                    const result = await query(
                        `UPDATE destinos 
                         SET nome = COALESCE($1, nome), 
                             preco = COALESCE($2, preco), 
                             imagem = COALESCE($3, imagem), 
                             parcelas = COALESCE($4, parcelas), 
                             texto = COALESCE($5, texto), 
                             whats = COALESCE($6, whats) 
                         WHERE id = $7 RETURNING *`,
                        [nome, preco, imagem, parcelas, texto, whats, id]
                    );

                    if (result.rowCount === 0) {
                        return sendResponse(res, 404, { error: 'Destino não encontrado' });
                    }

                    return sendResponse(res, 200, result.rows[0]);
                } catch (error) {
                    console.error('❌ Erro ao atualizar destino:', error);
                    return sendResponse(res, 500, { error: 'Erro ao atualizar destino' });
                }
            }

            return sendResponse(res, 405, { error: 'Método não permitido' });
        }

        return sendResponse(res, 404, { error: 'Rota não encontrada' });
    } catch (error) {
        console.error('❌ Erro geral:', error);
        return sendResponse(res, 500, { error: 'Erro interno do servidor' });
    }
}