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
    // LOG PARA DEBUG
    console.log(`📌 ${req.method} ${req.url}`);
    
    // CORS para OPTIONS (PRECISA VIR PRIMEIRO)
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const path = parsedUrl.pathname;
        const method = req.method;

        console.log(`📌 ROTA: ${method} ${path}`);

        // ============================================================
        // ROTA: /api/login (POST)
        // ============================================================
        if (path === '/api/login') {
            console.log('🔐 Tentando login...');
            
            // VERIFICAR SE É POST
            if (method !== 'POST') {
                console.log(`❌ Método não permitido: ${method}`);
                return sendResponse(res, 405, { error: 'Método não permitido. Use POST.' });
            }

            try {
                const body = await parseBody(req);
                console.log('📦 Body recebido:', body);
                
                const { username, password, role } = body;

                if (!username || !password) {
                    return sendResponse(res, 400, { error: 'Usuário e senha são obrigatórios' });
                }

                // LOGIN DEMO
                if (username === 'cliente' && password === '123456' && role === 'cliente') {
                    console.log('✅ Login cliente realizado com sucesso');
                    return sendResponse(res, 200, {
                        success: true,
                        user: { 
                            name: 'Cliente', 
                            role: 'cliente',
                            id: 1
                        }
                    });
                }

                if (username === 'adm' && password === '123456' && role === 'admin') {
                    console.log('✅ Login admin realizado com sucesso');
                    return sendResponse(res, 200, {
                        success: true,
                        user: { 
                            name: 'Administrador', 
                            role: 'admin',
                            id: 2
                        }
                    });
                }

                console.log('❌ Credenciais inválidas');
                return sendResponse(res, 401, { error: 'Credenciais inválidas' });
                
            } catch (error) {
                console.error('❌ Erro ao processar login:', error);
                return sendResponse(res, 500, { error: 'Erro interno ao processar login' });
            }
        }

        // ============================================================
        // ROTA: /api/destinos (GET, POST)
        // ============================================================
        if (path === '/api/destinos') {
            if (method === 'GET') {
                try {
                    const result = await query('SELECT * FROM destinos ORDER BY id ASC');
                    return sendResponse(res, 200, result.rows);
                } catch (error) {
                    console.error('❌ Erro ao buscar destinos:', error);
                    return sendResponse(res, 500, { error: 'Erro ao buscar destinos' });
                }
            }

            if (method === 'POST') {
                try {
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
                } catch (error) {
                    console.error('❌ Erro ao adicionar destino:', error);
                    return sendResponse(res, 500, { error: 'Erro ao adicionar destino' });
                }
            }

            return sendResponse(res, 405, { error: 'Método não permitido' });
        }

        // ============================================================
        // ROTA: /api/destinos/:id (DELETE, PUT)
        // ============================================================
        if (path.startsWith('/api/destinos/')) {
            const id = path.split('/')[3];

            if (method === 'DELETE') {
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

            if (method === 'PUT') {
                try {
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
                } catch (error) {
                    console.error('❌ Erro ao atualizar destino:', error);
                    return sendResponse(res, 500, { error: 'Erro ao atualizar destino' });
                }
            }

            return sendResponse(res, 405, { error: 'Método não permitido' });
        }

        // ============================================================
        // ROTA NÃO ENCONTRADA
        // ============================================================
        console.log(`❌ Rota não encontrada: ${path}`);
        return sendResponse(res, 404, { error: 'Rota não encontrada' });
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
        return sendResponse(res, 500, { error: 'Erro interno do servidor' });
    }
}