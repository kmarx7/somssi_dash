// Isolated test gateway. Auth responses are synthetic; SQL is real PostgreSQL/PGlite.
// Never imported by the application and never used for production credentials.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
export const fixtureProject = "11111111-1111-4111-8111-111111111111";
export const fixtureOwner = "22222222-2222-4222-8222-222222222222";
export async function startFixture(port = 54329) {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261029060302_somssi_operations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query("insert into auth.users values($1)", [fixtureOwner]);
  await db.query("insert into public.somssi_projects(id,name) values($1,$2)", [
    fixtureProject,
    "통합 테스트 전용 프로젝트",
  ]);
  await db.query(
    "insert into public.somssi_project_members values($1,$2,'owner',true)",
    [fixtureProject, fixtureOwner],
  );
  const user = {
    id: fixtureOwner,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const json = (res, status, data, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(data));
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = body ? JSON.parse(body) : null;
      if (url.pathname === "/auth/v1/token") {
        if (
          input?.email !== user.email ||
          input?.password !== "fixture-password"
        )
          return json(res, 400, {
            error: "invalid_grant",
            error_description: "Invalid fixture credentials",
          });
        const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
        const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), role: "authenticated" })}.fixture-signature`;
        return json(res, 200, {
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "fixture-refresh",
          user,
        });
      }
      const token = req.headers.authorization?.replace("Bearer ", "");
      let actor;
      try {
        actor = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString(),
        ).sub;
      } catch {}
      if (actor !== fixtureOwner)
        return json(res, 401, {
          code: "invalid_jwt",
          message: "Not a fixture session",
        });
      if (url.pathname === "/auth/v1/user") return json(res, 200, user);
      if (url.pathname === "/auth/v1/logout") {
        res.writeHead(204);
        return res.end();
      }
      const result = await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          actor,
        ]);
        if (url.pathname === "/rest/v1/rpc/somssi_write_record")
          return (
            await tx.query(
              "select public.somssi_write_record($1,$2,$3,$4,$5) as value",
              [
                input.p_project_id,
                input.p_id,
                input.p_kind,
                JSON.stringify(input.p_payload),
                input.p_expected_version,
              ],
            )
          ).rows[0].value;
        if (url.pathname === "/rest/v1/rpc/somssi_export_backup")
          return (
            await tx.query("select public.somssi_export_backup($1) as value", [
              input.p_project_id,
            ])
          ).rows[0].value;
        const table = url.pathname.split("/").pop();
        if (
          ![
            "somssi_projects",
            "somssi_project_members",
            "somssi_records",
          ].includes(table)
        )
          throw new Error("Unsupported fixture route");
        const conditions = [],
          args = [];
        for (const [key, value] of url.searchParams) {
          if (!["id", "project_id", "user_id", "active", "kind"].includes(key))
            continue;
          if (!value.startsWith("eq.")) throw new Error("Unsupported filter");
          args.push(value.slice(3));
          conditions.push(`${key}=$${args.length}`);
        }
        return (
          await tx.query(
            `select * from public.${table}${conditions.length ? " where " + conditions.join(" and ") : ""} order by ${table === "somssi_project_members" ? "user_id" : "id"}`,
            args,
          )
        ).rows;
      });
      const headers = {
        "content-range": `0-${Math.max(0, result.length - 1)}/${result.length}`,
      };
      if (req.method === "HEAD") {
        res.writeHead(200, headers);
        return res.end();
      }
      if (req.headers.accept?.includes("vnd.pgrst.object"))
        return result.length === 1
          ? json(res, 200, result[0], headers)
          : json(res, 406, { code: "PGRST116", details: "0 rows" });
      return json(res, 200, result, headers);
    } catch (error) {
      json(
        res,
        error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400,
        { code: error.code ?? "FIXTURE_ERROR", message: error.message },
      );
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    db,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}
