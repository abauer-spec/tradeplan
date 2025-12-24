export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare("SELECT * FROM agents").all();
    return new Response(JSON.stringify({ data: results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    const id = crypto.randomUUID();

    // Исправлено: 5 знаков '?' и 5 аргументов в .bind()
    await env.DB.prepare(
      "INSERT INTO agents (id, name, sales_today, sales_month, last_sale_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      id, 
      body.name, 
      0, 
      0, 
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({ success: true, id }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const agentId = pathParts[pathParts.length - 1];

  if (agentId && agentId !== 'agents') {
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM agents WHERE id = ?").bind(agentId).run();
      return new Response(null, { status: 204 });
    }
    if (request.method === "PUT" || request.method === "PATCH") {
      const body = await request.json();
      if (request.method === "PATCH") {
        const field = Object.keys(body)[0]; 
        await env.DB.prepare(`UPDATE agents SET ${field} = ? WHERE id = ?`).bind(body[field], agentId).run();
      } else {
        await env.DB.prepare("UPDATE agents SET name = ?, sales_today = ?, sales_month = ?, last_sale_date = ? WHERE id = ?")
          .bind(body.name, body.sales_today, body.sales_month, body.last_sale_date, agentId).run();
      }
      return new Response(JSON.stringify({ success: true }));
    }
  }
  return context.next();
}
