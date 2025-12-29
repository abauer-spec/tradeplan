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

// 1. Функция отображения лучшего агента (вместо даты)
function updateBestAgentDisplay(agentsData) {
    const displayElement = document.getElementById('currentDate');
    
    if (!agentsData || agentsData.length === 0) {
        displayElement.textContent = "Нет данных";
        return;
    }

    // Ищем агента с максимальной суммой за сегодня
    const topAgent = agentsData.reduce((prev, current) => {
        return ((prev.sales_today || 0) > (current.sales_today || 0)) ? prev : current;
    });

    if (topAgent && topAgent.sales_today > 0) {
        // displayElement.textContent = `${topAgent.name}: ${formatCurrency(topAgent.sales_today)}`;
        displayElement.innerHTML = `
            <div>${topAgent.name}</div>
            <div style="font-size: 1.2em; font-weight: bold; margin-top: 5px; color: #ffd700;">
                ${formatCurrency(topAgent.sales_today)}
            </div>
        `;
    } else {
        displayElement.textContent = " ";
    }
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
    if (!container) return;
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
    const saleSound = document.getElementById('saleSound');

    if (agentNameEl) agentNameEl.textContent = agentName;
    if (amountEl) amountEl.textContent = formatCurrency(amount);
    
    if (saleSound) {
        saleSound.currentTime = 0;
        saleSound.play().catch(error => console.warn("Звук заблокирован", error));
    }

    createConfetti();
    if (animation) animation.classList.remove('hidden');

    setTimeout(() => {
        if (animation) animation.classList.add('hidden');
        isAnimationPlaying = false;
        if (saleSound) saleSound.pause();
    }, 6000);
}

// Обновление таблицы агентов
function updateTable(agentsData) {
    const tbody = document.getElementById('agentsTableBody');
    if (!tbody) return;

    const sortedAgents = [...agentsData].sort((a, b) => (b.sales_month || 0) - (a.sales_month || 0));
    
    if (sortedAgents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">Нет данных</td></tr>`;
        return;
    }
    
    tbody.innerHTML = sortedAgents.map((agent, index) => {
        const rank = index + 1;
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        return `
            <tr class="${rank <= 3 ? 'top-agent' : ''}">
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
    if (!agents || agents.length === 0) return;

    const oldAgentsMap = new Map();
    agents.forEach(agent => oldAgentsMap.set(agent.id, agent));

    newAgents.forEach(newAgent => {
        const oldAgent = oldAgentsMap.get(newAgent.id);
        if (oldAgent) {
            const oldSalesMonth = oldAgent.sales_month || 0;
            const newSalesMonth = newAgent.sales_month || 0;
            if (newSalesMonth > oldSalesMonth) {
                showSaleAnimation(newAgent.name, newSalesMonth - oldSalesMonth);
            }
        }
    });
}

// 2. Основная функция обновления (ЕДИНСТВЕННАЯ ВЕРСИЯ)
async function updateData() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.opacity = '1';
    
    try {
        const newAgents = await loadAgents();
        if (agents.length > 0) {
            checkForNewSales(newAgents);
        }
        agents = newAgents;
        
        updateStats(agents);
        updateTable(agents);
        updateBestAgentDisplay(agents); // Наш лучший агент

    } catch (error) {
        console.error('Ошибка обновления данных:', error);
    }
    
    if (loadingIndicator) {
        setTimeout(() => {
            loadingIndicator.style.opacity = '0.3';
        }, 300);
    }
}

// 3. Инициализация (ЕДИНСТВЕННАЯ ВЕРСИЯ)
async function init() {
    await updateData();
    setInterval(updateData, 2000);
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
