const baseUrl = process.env.FARM_CHORES_API_URL || "http://127.0.0.1:3001";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${text}`);
  }

  return data;
}

const health = await request("/api/health");
const initialChores = await request("/api/chores");
const created = await request("/api/chores", {
  method: "POST",
  body: JSON.stringify({ text: "Smoke test chore" }),
});
const updated = await request(`/api/chores/${created.id}`, {
  method: "PATCH",
  body: JSON.stringify({ done: true }),
});
await request(`/api/chores/${created.id}`, { method: "DELETE" });
const finalChores = await request("/api/chores");

console.log(JSON.stringify({
  ok: true,
  health,
  initialCount: initialChores.length,
  created,
  updated,
  finalCount: finalChores.length,
}));
