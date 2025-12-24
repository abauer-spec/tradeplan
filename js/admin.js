// Глобальные переменные
let agents = [];

// Показать уведомление
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden', 'error');
    
    if (isError) {
        notification.classList.add('error');
    }
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Загрузка агентов
async function loadAgents() {
    try {
        const response = await fetch('tables/agents?limit=1000');
        const data = await response.json();
        agents = data.data || [];
        updateAgentsList();
        updateAgentsSelect();
    } catch (error) {
        console.error('Ошибка загрузки агентов:', error);
        showNotification('Ошибка загрузки агентов', true);
    }
}

// Обновление списка агентов
function updateAgentsList() {
    const agentsList = document.getElementById('agentsList');
    
    if (agents.length === 0) {
        agentsList.innerHTML = `
            <div class="empty-state-admin">
                <i class="fas fa-users"></i>
                <p>Агенты не добавлены</p>
            </div>
        `;
        return;
    }
    
    agentsList.innerHTML = agents.map(agent => `
        <div class="agent-item" data-id="${agent.id}">
            <div class="agent-name">
                <i class="fas fa-user"></i>
                ${agent.name}
            </div>
            <button class="btn btn-delete" onclick="deleteAgent('${agent.id}')">
                <i class="fas fa-trash"></i> Удалить
            </button>
        </div>
    `).join('');
}

// Обновление выпадающего списка агентов
function updateAgentsSelect() {
    const select = document.getElementById('saleAgent');
    
    select.innerHTML = '<option value="">-- Выберите агента --</option>' +
        agents.map(agent => `
            <option value="${agent.id}">${agent.name}</option>
        `).join('');
}

// Добавление нового агента
async function addAgent(name) {
    try {
        const response = await fetch('tables/agents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                sales_today: 0,
                sales_month: 0,
                last_sale_date: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            showNotification(`Агент "${name}" успешно добавлен`);
            await loadAgents();
            return true;
        } else {
            throw new Error('Ошибка добавления агента');
        }
    } catch (error) {
        console.error('Ошибка добавления агента:', error);
        showNotification('Ошибка добавления агента', true);
        return false;
    }
}

// Удаление агента
async function deleteAgent(agentId) {
    if (!confirm('Вы уверены, что хотите удалить этого агента?')) {
        return;
    }
    
    try {
        const response = await fetch(`tables/agents/${agentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            showNotification('Агент успешно удален');
            await loadAgents();
        } else {
            throw new Error('Ошибка удаления агента');
        }
    } catch (error) {
        console.error('Ошибка удаления агента:', error);
        showNotification('Ошибка удаления агента', true);
    }
}

// Добавление продажи
async function addSale(agentId, amount) {
    try {
        // Находим агента
        const agent = agents.find(a => a.id === agentId);
        if (!agent) {
            throw new Error('Агент не найден');
        }
        
        // Обновляем суммы продаж
        const updatedAgent = {
            name: agent.name,
            sales_today: (agent.sales_today || 0) + amount,
            sales_month: (agent.sales_month || 0) + amount,
            last_sale_date: new Date().toISOString()
        };
        
        const response = await fetch(`tables/agents/${agentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedAgent)
        });
        
        if (response.ok) {
            showNotification(`Продажа на сумму $${amount} успешно добавлена для ${agent.name}`);
            await loadAgents();
            return true;
        } else {
            throw new Error('Ошибка добавления продажи');
        }
    } catch (error) {
        console.error('Ошибка добавления продажи:', error);
        showNotification('Ошибка добавления продажи', true);
        return false;
    }
}

// Сброс продаж за сегодня
async function resetTodaySales() {
    if (!confirm('Вы уверены, что хотите сбросить продажи за сегодня для всех агентов?')) {
        return;
    }
    
    try {
        const updatePromises = agents.map(agent => {
            // Добавили "/" перед tables
            return fetch(`/tables/agents/${agent.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sales_today: 0
                })
            });
        });
        
        const results = await Promise.all(updatePromises);
        
        // Проверяем, все ли запросы прошли успешно
        if (results.every(r => r.ok)) {
            showNotification('Продажи за сегодня успешно сброшены');
            await loadAgents();
        } else {
            throw new Error('Один или несколько запросов завершились ошибкой');
        }
    } catch (error) {
        console.error('Ошибка сброса продаж за сегодня:', error);
        showNotification('Ошибка сброса продаж за сегодня', true);
    }
}

// Сброс продаж за месяц
async function resetMonthSales() {
    if (!confirm('Вы уверены, что хотите сбросить продажи за месяц для всех агентов?')) {
        return;
    }
    
    try {
        const updatePromises = agents.map(agent => {
            return fetch(`tables/agents/${agent.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sales_month: 0,
                    sales_today: 0
                })
            });
        });
        
        await Promise.all(updatePromises);
        showNotification('Продажи за месяц успешно сброшены для всех агентов');
        await loadAgents();
    } catch (error) {
        console.error('Ошибка сброса продаж за месяц:', error);
        showNotification('Ошибка сброса продаж за месяц', true);
    }
}

// Обработчики форм
document.getElementById('addAgentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('agentName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('Пожалуйста, введите имя агента', true);
        return;
    }
    
    const success = await addAgent(name);
    if (success) {
        nameInput.value = '';
    }
});

document.getElementById('addSaleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const agentSelect = document.getElementById('saleAgent');
    const amountInput = document.getElementById('saleAmount');
    
    const agentId = agentSelect.value;
    const amount = parseFloat(amountInput.value);
    
    if (!agentId) {
        showNotification('Пожалуйста, выберите агента', true);
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Пожалуйста, введите корректную сумму', true);
        return;
    }
    
    const success = await addSale(agentId, amount);
    if (success) {
        amountInput.value = '';
        agentSelect.value = '';
    }
});

document.getElementById('resetTodayBtn').addEventListener('click', resetTodaySales);
document.getElementById('resetMonthBtn').addEventListener('click', resetMonthSales);

// Инициализация
async function init() {
    await loadAgents();
}

// Запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
