import { describe, it, expect, beforeAll } from "vitest";
import pg from "pg";

const API_BASE = process.env.API_BASE || "http://localhost:8080/v1";
const DATABASE_URL = process.env.DATABASE_URL;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const TICKET_ID = "33333333-3333-3333-3333-333333333333";

async function seedIfNeeded() {
  if (!DATABASE_URL) return;
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    // 仅示例：插入一个 ticket（依赖 migrations 已执行）
    await client.query(
      `insert into tickets(id, org_id, status, title, description, created_by, updated_by)
       values ($1,$2,'OPEN','Seed Ticket','seed', $3, $3)
       on conflict (id) do nothing`,
      [TICKET_ID, ORG_ID, USER_ID]
    );
  } finally {
    client.release();
    await pool.end();
  }
}

function parseSetCookie(setCookie: string[]): Record<string,string> {
  const out: Record<string,string> = {};
  for (const c of setCookie) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) out[kv.slice(0,i)] = kv.slice(i+1);
  }
  return out;
}

async function debugLogin(): Promise<{ cookieHeader: string; csrf: string }> {
  const res = await fetch(`${API_BASE}/auth/_debug_login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, orgId: ORG_ID, roles: ["ADMIN"] })
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.getSetCookie?.() ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  const cookies = parseSetCookie(setCookie);
  const cookieHeader = Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join("; ");
  const csrf = cookies["csrf"];
  if (!csrf) throw new Error("Missing csrf cookie; check apps/api preHandler");
  return { cookieHeader, csrf };
}

describe("Gate1 contract smoke", () => {
  beforeAll(async () => {
    await seedIfNeeded();
  });

  it("GET /health returns envelope", async () => {
    const res = await fetch(`${API_BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("requestId");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("data.status", "ok");
  });

  it("GET /me without session returns 401 envelope error", async () => {
    const res = await fetch(`${API_BASE}/me`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error.code");
  });

  it("PATCH /tickets/:id missing If-Match -> 428", async () => {
    const { cookieHeader, csrf } = await debugLogin();
    const res = await fetch(`${API_BASE}/tickets/${TICKET_ID}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "cookie": cookieHeader,
        "x-csrf-token": csrf
      },
      body: JSON.stringify({ status: "OPEN" })
    });
    expect(res.status).toBe(428);
  });

  it("PATCH /tickets/:id stale If-Match -> 412", async () => {
    const { cookieHeader, csrf } = await debugLogin();

    // 1) GET to obtain ETag
    const get1 = await fetch(`${API_BASE}/tickets/${TICKET_ID}`, {
      headers: { "cookie": cookieHeader }
    });
    expect(get1.status).toBe(200);
    const etag1 = get1.headers.get("etag");
    expect(etag1).toBeTruthy();

    // 2) PATCH with etag1 -> success and ETag changes
    const p1 = await fetch(`${API_BASE}/tickets/${TICKET_ID}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "cookie": cookieHeader,
        "x-csrf-token": csrf,
        "if-match": etag1!
      },
      body: JSON.stringify({ description: "updated once" })
    });
    expect(p1.status).toBe(200);
    const etag2 = p1.headers.get("etag");
    expect(etag2).toBeTruthy();

    // 3) PATCH again using stale etag1 -> 412
    const p2 = await fetch(`${API_BASE}/tickets/${TICKET_ID}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "cookie": cookieHeader,
        "x-csrf-token": csrf,
        "if-match": etag1!
      },
      body: JSON.stringify({ description: "updated twice" })
    });
    expect(p2.status).toBe(412);
  });
});
