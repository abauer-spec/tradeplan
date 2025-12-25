let agents = [];
let lastUpdateHash = '';
let isAnimationPlaying = false;

// Форматирование суммы в доллары
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Получение текущей даты
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const dateString = now.toLocaleDateString('ru-RU', options);
    document.getElementById('currentDate').textContent = dateString;
}

// Загрузка данных агентов
async function loadAgents() {
    try {
        const response = await fetch('tables/agents?limit=1000');
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Ошибка загрузки агентов:', error);
        return [];
    }
}

// Расчет тоталов
function calculateTotals(agentsData) {
    let totalToday = 0;
    let totalMonth = 0;
    agentsData.forEach(agent => {
        totalToday += agent.sales_today || 0;
        totalMonth += agent.sales_month || 0;
    });
    return { totalToday, totalMonth };
}

// Обновление отображения статистики
function updateStats(agentsData) {
    const { totalToday, totalMonth } = calculateTotals(agentsData);
    document.getElementById('totalToday').textContent = formatCurrency(totalToday);
    document.getElementById('totalMonth').textContent = formatCurrency(totalMonth);
}

// Создание конфетти
function createConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#00d9ff', '#ff00ff', '#00ff88', '#ffd700', '#ff4757'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
}

// Показ анимации продажи
function showSaleAnimation(agentName, amount) {
    if (isAnimationPlaying) return;
    isAnimationPlaying = true;

    const animation = document.getElementById('saleAnimation');
    const agentNameEl = document.getElementById('saleAgentName');
    const amountEl = document.getElementById('saleAmount');
    const saleSound = document.getElementById('saleSound'); // Получаем элемент звука

    agentNameEl.textContent = agentName;
    amountEl.textContent = formatCurrency(amount);
    
    // Запуск звука
    if (saleSound) {
        saleSound.currentTime = 0;
        saleSound.play().catch(error => {
            console.warn("Автовоспроизведение звука заблокировано браузером. Требуется взаимодействие пользователя с и страницей.", error);
        });
    }

    createConfetti();
    animation.classList.remove('hidden');

    setTimeout(() => {
        animation.classList.add('hidden');
        isAnimationPlaying = false;
        saleSound.pause()
    }, 6000);
}

// Обновление таблицы агентов
function updateTable(agentsData) {
    const tbody = document.getElementById('agentsTableBody');
    // Сортировка по продажам за месяц (убывание)
    const sortedAgents = [...agentsData].sort((a, b) => {
        return (b.sales_month || 0) - (a.sales_month || 0);
    });
    if (sortedAgents.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">
                    <i class="fas fa-inbox"></i>
                    <p>Нет данных о продажах</p>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = sortedAgents.map((agent, index) => {
        const rank = index + 1;
        const isTop = rank <= 3;
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        return `
            <tr ${isTop ? 'class="top-agent"' : ''}>
                <td>${rankIcon}</td>
                <td>${agent.name}</td>
                <td>${formatCurrency(agent.sales_today || 0)}</td>
                <td>${formatCurrency(agent.sales_month || 0)}</td>
            </tr>
        `;
    }).join('');
}

// Проверка новых продаж
function checkForNewSales(newAgents) {
    if (!agents || agents.length === 0) {
        return;
    }

    // Создаем карту старых данных агентов
    const oldAgentsMap = new Map();
    agents.forEach(agent => {
        oldAgentsMap.set(agent.id, agent);
    });

    // Проверяем каждого агента на новые продажи
    newAgents.forEach(newAgent => {
        const oldAgent = oldAgentsMap.get(newAgent.id);
        if (oldAgent) {
            const oldSalesMonth = oldAgent.sales_month || 0;
            const newSalesMonth = newAgent.sales_month || 0;
            // Если продажи за месяц увеличились
            if (newSalesMonth > oldSalesMonth) {
                const saleAmount = newSalesMonth - oldSalesMonth;
                showSaleAnimation(newAgent.name, saleAmount);
            }
        }
    });
}

// Основная функция обновления данных
async function updateData() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.opacity = '1';
    try {
        const newAgents = await loadAgents();
        // Проверяем на новые продажи перед обновлением данных
        if (agents.length > 0) {
            checkForNewSales(newAgents);
        }
        agents = newAgents;
        updateStats(agents);
        updateTable(agents);
    } catch (error) {
        console.error('Ошибка обновления данных:', error);
    }
    setTimeout(() => {
        loadingIndicator.style.opacity = '0.3';
    }, 300);
}

// Инициализация
async function init() {
    updateCurrentDate();
    await updateData();
    // Автоообновление каждые 2 секунды
    setInterval(updateData, 2000);
    // Обновление даты каждую минуту
    setInterval(updateCurrentDate, 60000);
}

// Запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
