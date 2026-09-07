// api/index.js - VERSÃO SIMPLIFICADA E GARANTIDA

export default async function handler(req, res) {
    // Configurar CORS - SEMPRE RESPONDER PRIMEIRO
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Responder OPTIONS imediatamente
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    console.log(`📌 ${req.method} ${path}`);

    // ============================================================
    // ROTA: /api/login (POST)
    // ============================================================
    if (path === '/api/login') {
        // VERIFICAR SE É POST
        if (req.method !== 'POST') {
            console.log('❌ Método não é POST:', req.method);
            return res.status(405).json({ 
                error: 'Método não permitido. Use POST.',
                method: req.method 
            });
        }

        try {
            // LER O BODY
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const bodyString = Buffer.concat(buffers).toString();
            
            console.log('📦 Body recebido (raw):', bodyString);
            
            let data;
            try {
                data = JSON.parse(bodyString);
            } catch (e) {
                console.error('❌ Erro ao parsear JSON:', e);
                return res.status(400).json({ error: 'Body inválido. Envie JSON válido.' });
            }

            const { username, password, role } = data;
            console.log('📦 Dados:', { username, password, role });

            if (!username || !password) {
                return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
            }

            // LOGIN DEMO - CLIENTE
            if (username === 'cliente' && password === '123456' && role === 'cliente') {
                console.log('✅ Login CLIENTE realizado com sucesso');
                return res.status(200).json({
                    success: true,
                    user: { 
                        name: 'Cliente', 
                        role: 'cliente', 
                        id: 1 
                    }
                });
            }

            // LOGIN DEMO - ADMIN
            if (username === 'adm' && password === '123456' && role === 'admin') {
                console.log('✅ Login ADMIN realizado com sucesso');
                return res.status(200).json({
                    success: true,
                    user: { 
                        name: 'Administrador', 
                        role: 'admin', 
                        id: 2 
                    }
                });
            }

            console.log('❌ Credenciais inválidas');
            return res.status(401).json({ 
                error: 'Credenciais inválidas',
                hint: 'Use cliente/123456 ou adm/123456'
            });

        } catch (error) {
            console.error('❌ Erro no login:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }

    // ============================================================
    // ROTA: /api/destinos (GET)
    // ============================================================
    if (path === '/api/destinos' && req.method === 'GET') {
        // DADOS DE EXEMPLO
        const destinos = [
            { id: 1, nome: "Rio das Ostras", preco: "R$ 153,18", emoji: "🏖️", parcelas: "10x",
                texto: "Hotel Vilarejo Praia · All Inclusive", whats: "5521991864436" },
            { id: 2, nome: "Búzios", preco: "R$ 219,90", emoji: "⛵", parcelas: "12x",
                texto: "Pacote Romance · 3 noites", whats: "5521991864436" },
            { id: 3, nome: "Cabo Frio", preco: "R$ 189,00", emoji: "🌊", parcelas: "10x",
                texto: "All inclusive + passeios", whats: "5521991864436" },
            { id: 4, nome: "Angra dos Reis", preco: "R$ 267,50", emoji: "⛰️", parcelas: "12x",
                texto: "Ilhas e mergulho", whats: "5521991864436" },
            { id: 5, nome: "Arraial do Cabo", preco: "R$ 204,30", emoji: "🐠", parcelas: "10x",
                texto: "Pacote familiar", whats: "5521991864436" },
            { id: 6, nome: "Paraty", preco: "R$ 298,00", emoji: "⛪", parcelas: "12x",
                texto: "História + praias", whats: "5521991864436" }
        ];
        return res.status(200).json(destinos);
    }

    // ============================================================
    // ROTA: /api/destinos (POST - ADICIONAR)
    // ============================================================
    if (path === '/api/destinos' && req.method === 'POST') {
        try {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            const bodyString = Buffer.concat(buffers).toString();
            const data = JSON.parse(bodyString);
            
            const { nome, preco, emoji, parcelas, texto, whats } = data;

            if (!nome || !preco) {
                return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
            }

            // Simular adição (em memória)
            const novoDestino = {
                id: Date.now(),
                nome,
                preco,
                emoji: emoji || '✈️',
                parcelas: parcelas || '10x',
                texto: texto || 'Pacote especial',
                whats: whats || '5521991864436'
            };

            return res.status(201).json(novoDestino);
        } catch (error) {
            console.error('❌ Erro ao adicionar destino:', error);
            return res.status(500).json({ error: 'Erro ao adicionar destino' });
        }
    }

    // ============================================================
    // ROTA NÃO ENCONTRADA
    // ============================================================
    console.log('❌ Rota não encontrada:', path);
    return res.status(404).json({ 
        error: 'Rota não encontrada',
        path: path,
        method: req.method
    });
}