const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta atual
app.use(express.static(__dirname));


// Banco de dados JSON
const DB_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

function readJSON(filename) {
    const filePath = path.join(DB_PATH, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filename, data) {
    fs.writeFileSync(path.join(DB_PATH, filename), JSON.stringify(data, null, 2));
}

// Inicializar dados
function initDB() {
    const bcrypt = require('bcryptjs');
    
    // Admin
    let users = readJSON('users.json');
    if (!users.find(u => u.email === 'admin@inknoir.com')) {
        users.push({
            id: 1,
            name: 'Admin INK NOIR',
            email: 'admin@inknoir.com',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        writeJSON('users.json', users);
        console.log('✅ Admin criado');
    }
    
    // Catálogo
    let catalog = readJSON('catalog.json');
    if (catalog.length === 0) {
        catalog = [
            { id: 1, name: 'BLACKWORK', tag: 'Tradicional', symbol: '◈', description: 'Traços fortes em tinta preta.' },
            { id: 2, name: 'FINE LINE', tag: 'Minimalista', symbol: '◉', description: 'Linhas ultra-finas e delicadas.' },
            { id: 3, name: 'GEOMÉTRICO', tag: 'Moderno', symbol: '◬', description: 'Padrões geométricos precisos.' },
            { id: 4, name: 'OLD SCHOOL', tag: 'Clássico', symbol: '◊', description: 'Estilo tradicional americano.' },
            { id: 5, name: 'REALISMO', tag: 'Técnico', symbol: '⊕', description: 'Acabamento fotorrealista.' },
            { id: 6, name: 'AQUARELA', tag: 'Artístico', symbol: '✦', description: 'Coloração fluida estilo aquarela.' }
        ];
        writeJSON('catalog.json', catalog);
        console.log('✅ Catálogo criado');
    }
    
    if (!fs.existsSync(path.join(DB_PATH, 'bookings.json'))) {
        writeJSON('bookings.json', []);
    }
}

initDB();

// JWT
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'INK_NOIR_2025';

function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido' });
    }
}

// Rotas API
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
    
    const bcrypt = require('bcryptjs');
    let users = readJSON('users.json');
    
    if (users.find(u => u.email === email.toLowerCase())) {
        return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const newUser = {
        id: Date.now(),
        name,
        email: email.toLowerCase(),
        password: bcrypt.hashSync(password, 10),
        role: 'client',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeJSON('users.json', users);
    
    const token = jwt.sign({ id: newUser.id, name, email: newUser.email, role: 'client' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'Conta criada!', token, user: { id: newUser.id, name, email: newUser.email } });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
    
    const bcrypt = require('bcryptjs');
    const users = readJSON('users.json');
    const user = users.find(u => u.email === email.toLowerCase());
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login realizado!', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/catalog', (req, res) => {
    const catalog = readJSON('catalog.json');
    console.log('📚 Catálogo solicitado:', catalog.length, 'itens');
    res.json({ catalog: catalog });
});

app.post('/api/bookings', authMiddleware, (req, res) => {
    const { style, size, body_part, date, time, payment } = req.body;
    if (!style || !size || !body_part || !date || !time || !payment) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    let bookings = readJSON('bookings.json');
    const exists = bookings.find(b => b.date === date && b.time === time && b.status !== 'Cancelado');
    if (exists) return res.status(409).json({ error: 'Horário já reservado' });
    
    const newBooking = {
        id: Date.now(),
        userId: req.user.id,
        clientName: req.user.name,
        clientEmail: req.user.email,
        style, size, bodyPart: body_part, date, time, payment,
        status: 'Pendente',
        createdAt: new Date().toISOString()
    };
    
    bookings.push(newBooking);
    writeJSON('bookings.json', bookings);
    res.status(201).json({ message: 'Agendamento realizado!', booking: newBooking });
});

app.get('/api/bookings/all', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    
    let bookings = readJSON('bookings.json');
    const { search, status } = req.query;
    
    if (search) {
        bookings = bookings.filter(b => b.clientName.toLowerCase().includes(search.toLowerCase()));
    }
    if (status) {
        bookings = bookings.filter(b => b.status === status);
    }
    
    const stats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'Pendente').length,
        confirmed: bookings.filter(b => b.status === 'Confirmado').length,
        done: bookings.filter(b => b.status === 'Concluído').length
    };
    
    res.json({ bookings, stats });
});

app.patch('/api/bookings/:id/status', authMiddleware, (req, res) => {
    let bookings = readJSON('bookings.json');
    const booking = bookings.find(b => b.id === parseInt(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Não encontrado' });
    booking.status = req.body.status;
    writeJSON('bookings.json', bookings);
    res.json({ message: 'Status atualizado!' });
});

app.delete('/api/bookings/:id', authMiddleware, (req, res) => {
    let bookings = readJSON('bookings.json');
    bookings = bookings.filter(b => b.id !== parseInt(req.params.id));
    writeJSON('bookings.json', bookings);
    res.json({ message: 'Excluído!' });
});

app.get('/api/bookings/slots', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Data obrigatória' });
    
    const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const bookings = readJSON('bookings.json');
    const booked = bookings.filter(b => b.date === date && b.status !== 'Cancelado').map(b => b.time);
    
    res.json({ slots: allSlots.map(time => ({ time, available: !booked.includes(time) })) });
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log('🖤 INK NOIR: http://localhost:' + PORT);
    console.log('👤 Admin: admin@inknoir.com / admin123');
});