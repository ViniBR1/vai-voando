export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Responder OPTIONS
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
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método não permitido. Use POST.' });
        }

        try {
            // Ler o body
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    console.log('📦 Body recebido:', data);

                    const { username, password, role } = data;

                    if (!username || !password) {
                        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
                    }

                    // LOGIN DEMO
                    if (username === 'cliente' && password === '123456' && role === 'cliente') {
                        console.log('✅ Login cliente realizado com sucesso');
                        return res.status(200).json({
                            success: true,
                            user: { name: 'Cliente', role: 'cliente', id: 1 }
                        });
                    }

                    if (username === 'adm' && password === '123456' && role === 'admin') {
                        console.log('✅ Login admin realizado com sucesso');
                        return res.status(200).json({
                            success: true,
                            user: { name: 'Administrador', role: 'admin', id: 2 }
                        });
                    }

                    console.log('❌ Credenciais inválidas');
                    return res.status(401).json({ error: 'Credenciais inválidas' });

                } catch (error) {
                    console.error('❌ Erro ao parsear body:', error);
                    return res.status(400).json({ error: 'Body inválido' });
                }
            });
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        return;
    }

    // ============================================================
    // ROTA: /api/destinos (GET)
    // ============================================================
    if (path === '/api/destinos' && req.method === 'GET') {
        // Dados de exemplo (fallback)
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
    // ROTA NÃO ENCONTRADA
    // ============================================================
    return res.status(404).json({ error: 'Rota não encontrada' });
}