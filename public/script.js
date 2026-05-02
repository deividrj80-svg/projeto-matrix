// --- CONFIGURAÇÃO INICIAL E MATRIX ---
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

// Função para ajustar o tamanho do canvas e recalcular as colunas
function setupMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Recalcula o número de colunas baseado na nova largura
    const columnsCount = Math.floor(canvas.width / fontSize);
    drops = Array(columnsCount).fill(1);
}

const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&";
const fontSize = 16;
let drops = []; // Começa vazio e é preenchido no setupMatrix

function drawMatrix() {
    // Fundo semi-transparente para criar o rastro
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0F0"; // Cor do texto
    ctx.font = fontSize + "px monospace";

    drops.forEach((y, i) => {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, y * fontSize);

        // Reseta o drop para o topo aleatoriamente após sair da tela
        if (y * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    });
}

// Inicializa o tamanho antes de começar a desenhar
setupMatrix();
setInterval(drawMatrix, 35);

// Garante que se você redimensionar a janela, a Matrix acompanhe
window.addEventListener('resize', setupMatrix);

// --- NAVEGAÇÃO ---
function showAuth(screenId) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById(screenId).style.display = 'flex';
}

function showSection(id) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// --- LÓGICA DE INTERAÇÃO (AGUARDA O DOM) ---
document.addEventListener('DOMContentLoaded', () => {
    setupMatrix();
    setInterval(drawMatrix, 35);
    
    // Relógio
    setInterval(() => {
        const el = document.getElementById('real-time-clock');
        if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
    }, 1000);

    // EVENTO: LOGIN
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const user = document.getElementById('userInput').value.trim();
        const pass = document.getElementById('passInput').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const dados = await res.json();

            if (res.ok) {
                entrarNoSistema(dados.tipo, dados.nome, dados.dataRegistro);
            } else {
                alert(dados.erro);
            }
        } catch (err) {
            alert("Servidor Offline!");
        }
    });

    // EVENTO: CADASTRO
    document.getElementById('regBtn').addEventListener('click', async () => {
        const user = document.getElementById('newRegUser').value.trim();
        const pass = document.getElementById('newRegPass').value;
        const confirm = document.getElementById('confirmRegPass').value;

        if (!user || pass !== confirm) return alert("Dados inválidos!");

        const dataStr = new Date().toLocaleString('pt-BR');

        const res = await fetch('/api/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, dataRegistro: dataStr })
        });
        const dados = await res.json();
        
        if (res.ok) {
            alert(dados.mensagem);
            showAuth('loginScreen');
        } else {
            alert(dados.erro);
        }
    });

    // EVENTO: ALTERAR SENHA (CLIENTE)
    const btnAlterar = document.getElementById('btnAlterarSenha');
    if (btnAlterar) {
        btnAlterar.addEventListener('click', async () => {
            const nova = document.getElementById('novaSenha').value;
            const confirma = document.getElementById('confirmaNovaSenha').value;
            const usuarioLogado = document.getElementById('perfilNome').innerText;

            if (nova !== confirma || nova.length < 4) {
                return alert("As senhas não coincidem ou são muito curtas!");
            }

            const res = await fetch('/api/alterar-senha', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usuarioLogado, novaSenha: nova })
            });
            const dados = await res.json();
            alert(dados.mensagem);
            document.getElementById('novaSenha').value = "";
            document.getElementById('confirmaNovaSenha').value = "";
        });
    }
});

// --- FUNÇÕES DE INTERFACE ---
function entrarNoSistema(tipo, nome, dataRegistro) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    document.getElementById('userNameDisplay').innerHTML = `${nome} <span class="matrix-text">${tipo.toUpperCase()}</span>`;
    
    // Preenche Dashboard Cliente
    document.getElementById('perfilNome').innerText = nome;
    document.getElementById('perfilData').innerText = dataRegistro || "Admin";

    if (tipo === 'cliente') {
        document.getElementById('menuUsuarios').style.display = 'none';
        showSection('secPerfil');
    } else {
        document.getElementById('menuUsuarios').style.display = 'block';
        atualizarListaClientes();
    }
}

async function atualizarListaClientes() {
    const res = await fetch('/api/clientes');
    const usuarios = await res.json();
    const tabela = document.getElementById('tabelaUsuarios');
    tabela.innerHTML = "";
    usuarios.forEach(u => {
        tabela.innerHTML += `
            <tr>
                <td>${u.username}</td>
                <td>${u.dataRegistro}</td>
                <td><button onclick="removerUser('${u.username}')" style="color:red; background:none; border:none; cursor:pointer;">X</button></td>
            </tr>
        `;
    });
}

async function removerUser(nome) {
    if (confirm(`Remover ${nome}?`)) {
        await fetch(`/api/clientes/${nome}`, { method: 'DELETE' });
        atualizarListaClientes();
    }
}

window.addEventListener('resize', setupMatrix);