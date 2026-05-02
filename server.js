const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt'); // Para segurança das senhas
const app = express();

// Porta dinâmica para funcionar no Host (Render/Heroku) ou localmente no 3000
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'usuarios.json');

// --- FUNÇÕES DE APOIO ---
const lerUsuarios = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const dados = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(dados || "[]");
    } catch (error) {
        return [];
    }
};

const salvarUsuarios = (usuarios) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(usuarios, null, 2));
};

// --- ROTA: CADASTRO (COM BCRYPT) ---
app.post('/api/cadastrar', async (req, res) => {
    const { username, password, dataRegistro } = req.body;
    const usuarios = lerUsuarios();

    if (usuarios.find(u => u.username === username)) {
        return res.status(400).json({ erro: "Usuário já existe!" });
    }

    // Criptografando a senha antes de salvar no arquivo
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const novoUsuario = { 
        username, 
        password: hashedPassword, 
        tipo: 'cliente', 
        dataRegistro 
    };

    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    res.json({ mensagem: "Usuário registrado com segurança máxima!" });
});

// --- ROTA: LOGIN (COM VALIDAÇÃO BCRYPT) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Admin Master
    if (username === "admin" && password === "1234") {
        return res.json({ tipo: 'admin', nome: 'Administrador' });
    }

    const usuarios = lerUsuarios();
    const conta = usuarios.find(u => u.username === username);

    if (conta) {
        const senhaCorreta = await bcrypt.compare(password, conta.password);
        if (senhaCorreta) {
            return res.json({ 
                tipo: 'cliente', 
                nome: conta.username,
                dataRegistro: conta.dataRegistro 
            });
        }
    }
    
    res.status(401).json({ erro: "Acesso Negado: Credenciais inválidas." });
});

// --- ROTA: Para ALTERAR SENHA (SEGURANÇA Para o CLIENTE) ---
app.put('/api/alterar-senha', async (req, res) => {
    const { username, novaSenha } = req.body;
    let usuarios = lerUsuarios();
    
    const index = usuarios.findIndex(u => u.username === username);
    
    if (index === -1) {
        return res.status(404).json({ erro: "Usuário não localizado." });
    }

    // Criptografando a nova senha antes de atualizar
    const hashed = await bcrypt.hash(novaSenha, 10);
    usuarios[index].password = hashed;
    
    salvarUsuarios(usuarios);
    res.json({ mensagem: "Chave de acesso atualizada com sucesso!" });
});

// --- ROTA: De LISTA De CLIENTES (PAINEL ADMIN) ---
app.get('/api/clientes', (req, res) => {
    const usuarios = lerUsuarios();
    const listaExibicao = usuarios.map(u => ({ 
        username: u.username, 
        dataRegistro: u.dataRegistro 
    }));
    res.json(listaExibicao);
});

// --- ROTA: Para DELETAR o CLIENTE ---
app.delete('/api/clientes/:nome', (req, res) => {
    const nome = req.params.nome;
    let usuarios = lerUsuarios();
    usuarios = usuarios.filter(u => u.username !== nome);
    salvarUsuarios(usuarios);
    res.json({ mensagem: "Conexão encerrada com o usuário." });
});

// Início do Servidor
app.listen(PORT, () => {
    console.log(`\n====================================`);
    console.log(`   SISTEMA MATRIX ONLINE ATIVO`);
    console.log(`   MODO: FULL STACK / BCRYPT`);
    console.log(`   PORTA: ${PORT}`);
    console.log(`====================================\n`);
});