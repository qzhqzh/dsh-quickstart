/**
 * dsh-quickstart-plugin — host half.
 *
 * Registers three exact HTTP routes on the dsh web server:
 *
 *   GET  /api/dsh-quickstart/config    read  ~/.dsh-quickstart.json
 *   POST /api/dsh-quickstart/config    write ~/.dsh-quickstart.json
 *   POST /api/dsh-quickstart/restart   restart dsh web
 *
 * The config file is the same one the `dsh-quickstart` launcher reads, so a
 * watchdog toggle here takes effect the next time dsh is started through the
 * launcher. `restart` attempts a systemd user-service restart first, and falls
 * back to exiting the current process (relying on the external supervisor —
 * systemd `Restart=always` or the launcher's watchdog — to bring it back).
 */
import { spawn, execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const name = "dsh-quickstart-plugin";
const inject = ["webServer"];

const CONFIG_PATH = join(homedir(), ".dsh-quickstart.json");
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const CONFIG_ROUTE = "/api/dsh-quickstart/config";
const RESTART_ROUTE = "/api/dsh-quickstart/restart";

function sendJson(res, status, body) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

/** Read `~/.dsh-quickstart.json`, returning `{}` when missing or invalid. */
function readConfig() {
  try {
    const value = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/** Merge `patch` into the config and write it back. Returns the new config. */
function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n");
  return next;
}

/**
 * Ask the platform to restart dsh web.
 *
 * 1. If a systemd user service named `dsh-web.service` is active, delegate to
 *    `systemctl --user restart` — the supervisor brings it back and the request
 *    completes before the restart lands.
 * 2. Otherwise schedule a self-exit: the HTTP response is flushed first, then
 *    the process exits and relies on an external supervisor (systemd
 *    `Restart=always` or the dsh-quickstart watchdog) to relaunch it.
 */
function restartDsh() {
  try {
    const active = execFileSync(
      "systemctl",
      ["--user", "is-active", "dsh-web.service"],
      { timeout: 3000, stdio: ["ignore", "pipe", "ignore"] },
    ).toString().trim();
    if (active === "active") {
      spawn("systemctl", ["--user", "restart", "dsh-web.service"], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return { ok: true, method: "systemd", message: "已请求 systemd 重启 dsh web" };
    }
  } catch {
    // systemctl unavailable or the unit is not present — fall through.
  }

  setTimeout(() => {
    try {
      process.exit(0);
    } catch {
      // ignore
    }
  }, 800);
  return { ok: true, method: "self-exit", message: "正在退出进程，等待外部守护拉起" };
}

function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "exact",
      path: CONFIG_ROUTE,
      handler: (req, res) => {
        if (req.method === "GET") {
          sendJson(res, 200, { ok: true, config: readConfig() });
          return;
        }
        if (req.method === "POST") {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => {
            let patch = {};
            try {
              patch = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            } catch {
              sendJson(res, 400, { ok: false, error: "bad-json", message: "请求体不是合法 JSON" });
              return;
            }
            if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
              sendJson(res, 400, { ok: false, error: "bad-body", message: "请求体必须是对象" });
              return;
            }
            // 只接受已知字段，避免把任意内容写进配置文件。
            const clean = {};
            if (typeof patch.watch === "boolean") clean.watch = patch.watch;
            if (Number.isFinite(patch.maxRestarts)) clean.maxRestarts = Math.floor(patch.maxRestarts);
            if (Number.isFinite(patch.restartDelayMs)) clean.restartDelayMs = Math.floor(patch.restartDelayMs);
            try {
              const config = writeConfig(clean);
              sendJson(res, 200, { ok: true, config });
            } catch (error) {
              sendJson(res, 500, { ok: false, error: "write-failed", message: error instanceof Error ? error.message : String(error) });
            }
          });
          return;
        }
        sendJson(res, 405, { ok: false, error: "method-not-allowed" });
      },
    }),
    "dsh-quickstart-plugin: config route",
  );

  ctx.effect(
    () => ctx.webServer.register({
      kind: "exact",
      path: RESTART_ROUTE,
      handler: (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "method-not-allowed" });
          return;
        }
        const result = restartDsh();
        sendJson(res, 200, result);
      },
    }),
    "dsh-quickstart-plugin: restart route",
  );
}

export { name, inject, apply };
