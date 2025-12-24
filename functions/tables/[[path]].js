export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  
  // parts[0] = 'tables', parts[1] = 'agents', parts[2] = ID (если есть)
  const agentId = parts[2]; 

  try {
    // 1. GET /tables/agents - Список всех
    if (request.method === "GET" && !agentId) {
      const { results } = await env.DB.prepare("SELECT * FROM agents").all();
      return new Response(JSON.stringify({ data: results }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. POST /tables/agents - Создание
    if (request.method === "POST") {
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO agents (id, name, sales_today, sales_month, last_sale_date) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, body.name, 0, 0, new Date().toISOString()).run();
      return new Response(JSON.stringify({ success: true, id }), { status: 201 });
    }

    // РАБОТА С ID (/tables/agents/ID)
    if (agentId) {
      // 3. DELETE /tables/agents/ID
      if (request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM agents WHERE id = ?").bind(agentId).run();
        return new Response(null, { status: 204 });
      }

      // 4. PATCH или PUT /tables/agents/ID (СБРОС И ОБНОВЛЕНИЕ)
      if (request.method === "PATCH" || request.method === "PUT") {
        const body = await request.json();
        
        if (request.method === "PATCH") {
          // Для сброса: берем ключи (например, sales_today) и обновляем их
          for (const key of Object.keys(body)) {
            await env.DB.prepare(`UPDATE agents SET ${key} = ? WHERE id = ?`)
              .bind(body[key], agentId).run();
          }
        } else {
          // Для обычного обновления (PUT)
          await env.DB.prepare(
            "UPDATE agents SET name = ?, sales_today = ?, sales_month = ?, last_sale_date = ? WHERE id = ?"
          ).bind(body.name, body.sales_today, body.sales_month, body.last_sale_date, agentId).run();
        }
        return new Response(JSON.stringify({ success: true }));
      }
    }

    return new Response("Not Found", { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
