// GET /tables/agents - Получение списка всех агентов из базы D1
export async function onRequestGet(context) {
  const { env } = context;
  try {
    // Выполняем SQL запрос к таблице agents
    const { results } = await env.DB.prepare("SELECT * FROM agents").all();
    return new Response(JSON.stringify({ data: results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// POST /tables/agents - Создание нового агента
export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    const id = body.id || crypto.randomUUID(); // Генерируем уникальный ID, если его нет

    await env.DB.prepare(
      "INSERT INTO agents (id, name, sales_today, sales_month, last_sale_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      body.name, 
      body.name, 
      body.sales_today || 0, 
      body.sales_month || 0, 
      body.last_sale_date || new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({ success: true, id }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// Обработка запросов с ID: /tables/agents/{id} (DELETE, PUT, PATCH)
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agentId = pathParts[pathParts.length - 1];

  // Если в пути есть ID (не равен слову 'agents')
  if (agentId && agentId !== 'agents') {
    
    // УДАЛЕНИЕ АГЕНТА
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM agents WHERE id = ?").bind(agentId).run();
      return new Response(null, { status: 204 });
    }

    // ОБНОВЛЕНИЕ ДАННЫХ (Продажи или Сброс)
    if (request.method === "PUT" || request.method === "PATCH") {
      const body = await request.json();
      
      if (request.method === "PATCH") {
        // Частичное обновление (например, только sales_today при сбросе)
        const field = Object.keys(body)[0]; 
        await env.DB.prepare(`UPDATE agents SET ${field} = ? WHERE id = ?`)
          .bind(body[field], agentId).run();
      } else {
        // Полное обновление при добавлении продажи
        await env.DB.prepare(
          "UPDATE agents SET name = ?, sales_today = ?, sales_month = ?, last_sale_date = ? WHERE id = ?"
        ).bind(body.name, body.sales_today, body.sales_month, body.last_sale_date, agentId).run();
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Если метод не подошел, передаем управление дальше
  return context.next();
}
