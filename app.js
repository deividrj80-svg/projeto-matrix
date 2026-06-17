// ==========================================
// INK NOIR - APP COMPLETO (CORRIGIDO)
// ==========================================

// =============================================
// 1. CONFIGURAÇÕES INICIAIS
// =============================================
const API = 'http://localhost:3000/api';
let currentUser = JSON.parse(localStorage.getItem('ink_user') || 'null');
let selectedTime = '';
let selectedPayment = '';

console.log('🖤 INK NOIR carregado');
console.log('👤 Usuário atual:', currentUser);

// =============================================
// 2. SISTEMA DE PARTÍCULAS
// =============================================
const particleCanvas = document.getElementById('particles-canvas');

if (particleCanvas) {
    const particleCtx = particleCanvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };

    const PARTICLE_COUNT = 60;
    const PARTICLE_COLOR = '200, 169, 110';
    const CONNECTION_DISTANCE = 150;

    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * particleCanvas.width,
                y: Math.random() * particleCanvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: (Math.random() - 0.5) * 0.8,
                opacity: Math.random() * 0.5 + 0.1,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    function animateParticles() {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        particles.forEach((p, index) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += 0.02;

            if (p.x < 0 || p.x > particleCanvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > particleCanvas.height) p.speedY *= -1;

            p.x = Math.max(0, Math.min(particleCanvas.width, p.x));
            p.y = Math.max(0, Math.min(particleCanvas.height, p.y));

            const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.2;

            const gradient = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            gradient.addColorStop(0, `rgba(${PARTICLE_COLOR}, ${pulseOpacity})`);
            gradient.addColorStop(0.5, `rgba(${PARTICLE_COLOR}, ${pulseOpacity * 0.3})`);
            gradient.addColorStop(1, `rgba(${PARTICLE_COLOR}, 0)`);

            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            particleCtx.fillStyle = gradient;
            particleCtx.fill();

            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particleCtx.fillStyle = `rgba(${PARTICLE_COLOR}, ${pulseOpacity + 0.2})`;
            particleCtx.fill();

            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONNECTION_DISTANCE) {
                    const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.15;
                    particleCtx.beginPath();
                    particleCtx.moveTo(p.x, p.y);
                    particleCtx.lineTo(p2.x, p2.y);
                    particleCtx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${opacity})`;
                    particleCtx.lineWidth = 0.5;
                    particleCtx.stroke();
                }
            }

            if (mouse.x && mouse.y) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 2;
                    p.y += Math.sin(angle) * force * 2;

                    particleCtx.beginPath();
                    particleCtx.moveTo(p.x, p.y);
                    particleCtx.lineTo(mouse.x, mouse.y);
                    particleCtx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${force * 0.3})`;
                    particleCtx.lineWidth = force * 2;
                    particleCtx.stroke();
                }
            }
        });

        requestAnimationFrame(animateParticles);
    }

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    document.addEventListener('touchmove', (e) => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
        mouse.x = null;
        mouse.y = null;
    });

    resizeParticleCanvas();
    createParticles();
    animateParticles();

    window.addEventListener('resize', () => {
        resizeParticleCanvas();
        createParticles();
    });

    console.log('✨ Partículas INK NOIR ativadas');
}

// =============================================
// 3. CHAMADAS À API
// =============================================
async function apiCall(endpoint, options = {}) {
    const token = currentUser?.token || '';
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        ...options
    };

    console.log('📡 API:', endpoint, config.method || 'GET');

    try {
        const response = await fetch(`${API}${endpoint}`, config);
        const data = await response.json();
        console.log('📥 Resposta:', data);
        return data;
    } catch (error) {
        console.error('❌ Erro API:', error);
        return { error: 'Erro de conexão com o servidor' };
    }
}

// =============================================
// 4. AUTENTICAÇÃO
// =============================================
async function doLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const pass = document.getElementById('login-pass')?.value;
    const err = document.getElementById('login-err');

    if (!email || !pass) {
        if (err) { err.textContent = 'Preencha todos os campos'; err.style.display = 'block'; }
        return;
    }

    if (err) err.style.display = 'none';

    const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
    });

    if (data.error) {
        if (err) { err.textContent = data.error; err.style.display = 'block'; }
        return;
    }

    currentUser = { ...data.user, token: data.token };
    localStorage.setItem('ink_user', JSON.stringify(currentUser));
    closeModal();
    updateNav();
    toast('Bem-vindo, ' + data.user.name.split(' ')[0] + '! 🖤');

    if (data.user.role === 'admin') {
        showPage('admin');
    }
}

async function doRegister() {
    const name = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const pass = document.getElementById('reg-pass')?.value;
    const err = document.getElementById('reg-err');
    const ok = document.getElementById('reg-ok');

    if (!name || !email || !pass) {
        if (err) { err.textContent = 'Preencha todos os campos (nome, email e senha)'; err.style.display = 'block'; }
        return;
    }

    if (pass.length < 4) {
        if (err) { err.textContent = 'A senha deve ter no mínimo 4 caracteres'; err.style.display = 'block'; }
        return;
    }

    if (err) err.style.display = 'none';

    const data = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: pass })
    });

    if (data.error) {
        if (err) { err.textContent = data.error; err.style.display = 'block'; }
        return;
    }

    if (ok) { ok.textContent = '✅ Conta criada com sucesso! Faça login.'; ok.style.display = 'block'; }

    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';

    setTimeout(() => {
        switchTab('login');
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.value = email;
        if (ok) ok.style.display = 'none';
    }, 2000);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('ink_user');
    updateNav();
    showPage('home');
    toast('Até logo! 👋');
}

// =============================================
// 5. CATÁLOGO
// =============================================
async function loadCatalog() {
    console.log('🎨 Carregando catálogo...');
    const data = await apiCall('/catalog');
    const grid = document.getElementById('catalog-grid');

    if (data.catalog && data.catalog.length > 0 && grid) {
        grid.innerHTML = data.catalog.map(s => `
            <div class="cat-card">
                <div class="cat-bg"><div class="cat-symbol">${s.symbol}</div></div>
                <div class="cat-overlay"></div>
                <div class="cat-info">
                    <div class="cat-tag">${s.tag}</div>
                    <div class="cat-name">${s.name}</div>
                    <div class="cat-desc">${s.description}</div>
                </div>
            </div>
        `).join('');

        const select = document.getElementById('bk-style');
        if (select) {
            select.innerHTML = '<option value="">Selecione o estilo</option>' +
                data.catalog.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }

        console.log('✅ Catálogo carregado:', data.catalog.length, 'estilos');
    } else {
        garantirEstilosNoSelect();
    }
}

// =============================================
// 6. AGENDAMENTO
// =============================================
async function loadSlots() {
    const date = document.getElementById('bk-date')?.value;
    if (!date) return;

    const data = await apiCall(`/bookings/slots?date=${date}`);
    const container = document.getElementById('time-slots');

    if (data.slots && container) {
        container.innerHTML = data.slots.map(s => `
            <div class="time-slot ${s.available ? '' : 'disabled'}" 
                 ${s.available ? `onclick="selectTime(this,'${s.time}')"` : ''}>
                ${s.time}
            </div>
        `).join('');
    }
}

function selectTime(el, time) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    selectedTime = time;
}

function selectPayment(el, method) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    selectedPayment = method;
}

async function submitBooking() {
    if (!currentUser) {
        toast('Faça login para agendar!', 'error');
        return;
    }

    const style = document.getElementById('bk-style')?.value;
    const size = document.getElementById('bk-size')?.value;
    const body_part = document.getElementById('bk-body')?.value;
    const date = document.getElementById('bk-date')?.value;
    const desc = document.getElementById('bk-desc')?.value || '';

    if (!style || !size || !body_part || !date || !selectedTime || !selectedPayment) {
        toast('Preencha todos os campos!', 'error');
        return;
    }

    const result = await apiCall('/bookings', {
        method: 'POST',
        body: JSON.stringify({
            style, size, body_part, date,
            time: selectedTime,
            payment: selectedPayment,
            description: desc
        })
    });

    if (result.error) {
        toast(result.error, 'error');
        return;
    }

    toast('Agendamento confirmado! 🎨');

    // Limpar formulário
    ['bk-style', 'bk-size', 'bk-body', 'bk-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const timeSlots = document.getElementById('time-slots');
    if (timeSlots) timeSlots.innerHTML = '';
    selectedTime = '';
    selectedPayment = '';
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
}

// =============================================
// 7. PAINEL ADMIN
// =============================================
async function loadAdminBookings() {
    if (!currentUser || currentUser.role !== 'admin') return;

    const search = document.getElementById('admin-search')?.value || '';
    const status = document.getElementById('admin-filter-status')?.value || '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const data = await apiCall(`/bookings/all?${params}`);

    if (data.stats) {
        document.getElementById('stat-total').textContent = data.stats.total || 0;
        document.getElementById('stat-pending').textContent = data.stats.pending || 0;
        document.getElementById('stat-confirmed').textContent = data.stats.confirmed || 0;
        document.getElementById('stat-done').textContent = data.stats.done || 0;
    }

    const countEl = document.getElementById('bookings-count');
    if (countEl) countEl.textContent = (data.bookings?.length || 0) + ' registros';

    const table = document.getElementById('bookings-table-content');
    if (!table) return;

    if (!data.bookings || data.bookings.length === 0) {
        table.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum agendamento encontrado.</p></div>';
        return;
    }

    table.innerHTML = `
        <table>
            <thead><tr>
                <th>Cliente</th><th>Email</th><th>Estilo</th><th>Data</th><th>Hora</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody>
                ${data.bookings.map(b => `
                    <tr>
                        <td style="color:var(--white)">${b.clientName}</td>
                        <td>${b.clientEmail}</td>
                        <td>${b.style}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td><span class="badge badge-${b.status === 'Pendente' ? 'pending' : b.status === 'Confirmado' ? 'confirmed' : 'done'}">${b.status}</span></td>
                        <td>
                            ${b.status !== 'Confirmado' && b.status !== 'Concluído' ? `<button class="btn-action btn-confirm" onclick="updateStatus(${b.id},'Confirmado')">Confirmar</button>` : ''}
                            ${b.status === 'Confirmado' ? `<button class="btn-action btn-confirm" onclick="updateStatus(${b.id},'Concluído')">Concluir</button>` : ''}
                            <button class="btn-action btn-del" onclick="deleteBooking(${b.id})">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function updateStatus(id, status) {
    await apiCall(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
    loadAdminBookings();
    toast('Status atualizado! ✅');
}

async function deleteBooking(id) {
    if (!confirm('Excluir este agendamento?')) return;
    await apiCall(`/bookings/${id}`, { method: 'DELETE' });
    loadAdminBookings();
    toast('Agendamento excluído!');
}

// =============================================
// 8. INTERFACE DO USUÁRIO
// =============================================
function showPage(page) {
    console.log('📄 Navegando para:', page);

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    if (page === 'admin') {
        document.getElementById('page-admin')?.classList.add('active');
        loadAdminBookings();
        return;
    }

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    if (page === 'catalogo') loadCatalog();
    if (page === 'agendamento') {
        const locked = document.getElementById('booking-locked');
        const form = document.getElementById('booking-form-wrap');
        if (locked && form) {
            locked.style.display = currentUser ? 'none' : 'block';
            form.style.display = currentUser ? 'block' : 'none';
        }
    }

    window.scrollTo(0, 0);
}

function openModal(tab) {
    document.getElementById('auth-modal')?.classList.add('open');
    switchTab(tab || 'login');
}

function closeModal() {
    document.getElementById('auth-modal')?.classList.remove('open');
}

function switchTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const modalTitle = document.getElementById('modal-title-text');
    const modalSub = document.getElementById('modal-sub-text');

    if (formLogin) formLogin.style.display = tab === 'login' ? 'flex' : 'none';
    if (formRegister) formRegister.style.display = tab === 'register' ? 'flex' : 'none';
    if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', tab === 'register');
    if (modalTitle) modalTitle.textContent = tab === 'login' ? 'ENTRAR' : 'CADASTRAR';
    if (modalSub) modalSub.textContent = tab === 'login' ? 'Acesse sua conta' : 'Crie sua conta gratuita';

    // Limpar mensagens
    ['login-err', 'reg-err', 'reg-ok'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function updateNav() {
    const area = document.getElementById('nav-auth-area');
    if (!area) return;

    if (currentUser) {
        area.innerHTML = currentUser.role === 'admin'
            ? `<span style="color:var(--accent);font-weight:600;letter-spacing:1px">ADMIN</span>
               <button class="btn-ghost" onclick="showPage('admin')">Painel</button>
               <button class="btn-ghost" onclick="logout()">Sair</button>`
            : `<span style="color:var(--accent);font-weight:600;letter-spacing:1px">${currentUser.name.split(' ')[0].toUpperCase()}</span>
               <button class="btn-ghost" onclick="logout()">Sair</button>`;
    } else {
        area.innerHTML = `
            <button class="btn-ghost" onclick="openModal('login')">Entrar</button>
            <button class="btn-solid" onclick="openModal('register')">Cadastrar</button>`;
    }
}

function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
}


function garantirEstilosNoSelect() {
    const select = document.getElementById('bk-style');
    if (select && select.options.length <= 1) {
        console.warn('⚠️ Usando estilos fallback');
        const estilosFallback = ['BLACKWORK', 'FINE LINE', 'GEOMÉTRICO', 'OLD SCHOOL', 'REALISMO', 'AQUARELA'];
        select.innerHTML = '<option value="">Selecione o estilo</option>' +
            estilosFallback.map(e => `<option value="${e}">${e}</option>`).join('');
    }
}

function contadorVisitas() {
    let visitas = parseInt(localStorage.getItem('ink_visitas') || '0');
    visitas++;
    localStorage.setItem('ink_visitas', visitas);

    const footer = document.querySelector('.footer');
    if (footer && !document.getElementById('contador-visitas')) {
        const contador = document.createElement('p');
        contador.id = 'contador-visitas';
        contador.style.marginTop = '0.5rem';
        contador.style.opacity = '0.4';
        contador.style.fontSize = '0.7rem';
        contador.textContent = `👁️ ${visitas} visitas ao site`;
        footer.appendChild(contador);
    }
}


setInterval(async () => {
    if (currentUser?.role === 'admin') {
        try {
            const data = await apiCall('/bookings/all');
            const pendentes = data.stats?.pending || 0;
            document.title = pendentes > 0
                ? `(${pendentes}) 🔔 INK NOIR - Novos Agendamentos!`
                : 'INK NOIR — Studio de Tatuagem';
        } catch (error) {
            console.error('Erro ao verificar agendamentos:', error);
        }
    }
}, 30000);


const authModal = document.getElementById('auth-modal');
if (authModal) {
    authModal.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}



console.log('🚀 INK NOIR inicializado com sucesso!');
updateNav();
loadCatalog();
contadorVisitas();


setTimeout(garantirEstilosNoSelect, 2000);


if (currentUser && currentUser.role === 'admin') {
    showPage('admin');
}