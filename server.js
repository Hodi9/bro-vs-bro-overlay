const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const PANEL_KEY = process.env.PANEL_KEY || "";
const STATE_FILE = path.join(__dirname, "state.json");

const DEFAULT_DYSTER = ["Dart", "Bowling", "Minigolf", "Brætspil", "Bordfodbold", "Wildcard"];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {
      scores: { marcelo: 0, aggo: 0 },
      round: 1,
      current: null,
      queue: DEFAULT_DYSTER.map((name) => ({ id: crypto.randomUUID(), name })),
      log: [],
    };
  }
}

let state = loadState();

function saveState() {
  fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), () => {});
}

function pushLog(entry) {
  state.log.unshift({ id: crypto.randomUUID(), at: Date.now(), entry });
  state.log = state.log.slice(0, 30);
}

function broadcast() {
  io.emit("state", state);
  saveState();
}

app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  })
);

app.get("/overlay", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(__dirname, "public", "overlay.html"));
});

app.get("/panel", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(__dirname, "public", "panel.html"));
});

app.get("/", (req, res) => {
  res.redirect("/overlay");
});

function authorized(token) {
  if (!PANEL_KEY) return true;
  return token === PANEL_KEY;
}

io.on("connection", (socket) => {
  socket.emit("state", state);
  socket.emit("config", { dysterPreset: DEFAULT_DYSTER, requiresKey: Boolean(PANEL_KEY) });

  socket.on("panel:action", (payload = {}) => {
    const { type, token } = payload;
    if (!authorized(token)) {
      socket.emit("panel:denied");
      return;
    }

    switch (type) {
      case "score:inc": {
        const p = payload.player;
        if (p === "marcelo" || p === "aggo") {
          state.scores[p] = Math.max(0, state.scores[p] + 1);
          pushLog(`${p === "marcelo" ? "Marcelo" : "Aggo"} +1 point`);
        }
        break;
      }
      case "score:dec": {
        const p = payload.player;
        if (p === "marcelo" || p === "aggo") {
          state.scores[p] = Math.max(0, state.scores[p] - 1);
          pushLog(`${p === "marcelo" ? "Marcelo" : "Aggo"} -1 point`);
        }
        break;
      }
      case "round:set": {
        const n = Number(payload.value);
        if (Number.isFinite(n) && n > 0) state.round = Math.floor(n);
        break;
      }
      case "corner:set": {
        if (payload.corner === "marcelo" || payload.corner === "aggo") {
          state.current = { name: state.current?.name || null, corner: payload.corner };
        }
        break;
      }
      case "queue:add": {
        const name = String(payload.name || "").trim();
        if (name) state.queue.push({ id: crypto.randomUUID(), name });
        break;
      }
      case "queue:remove": {
        state.queue = state.queue.filter((d) => d.id !== payload.id);
        break;
      }
      case "queue:reorder": {
        if (Array.isArray(payload.order)) {
          const byId = new Map(state.queue.map((d) => [d.id, d]));
          state.queue = payload.order.map((id) => byId.get(id)).filter(Boolean);
        }
        break;
      }
      case "dyst:next": {
        const next = state.queue.shift();
        if (next) {
          if (state.current?.name) state.queue.push({ id: crypto.randomUUID(), name: state.current.name });
          state.current = { name: next.name, corner: state.current?.corner || "marcelo" };
          state.round += 1;
          pushLog(`Ny dyst: ${next.name}`);
        }
        break;
      }
      case "dyst:setCurrent": {
        const name = String(payload.name || "").trim();
        if (name) {
          state.current = { name, corner: state.current?.corner || "marcelo" };
          pushLog(`Dyst sat til: ${name}`);
        }
        break;
      }
      case "reset:scores": {
        state.scores = { marcelo: 0, aggo: 0 };
        pushLog("Scores nulstillet");
        break;
      }
      case "reset:all": {
        state = {
          scores: { marcelo: 0, aggo: 0 },
          round: 1,
          current: null,
          queue: DEFAULT_DYSTER.map((name) => ({ id: crypto.randomUUID(), name })),
          log: [],
        };
        pushLog("Alt nulstillet");
        break;
      }
      default:
        return;
    }

    broadcast();
  });
});

server.listen(PORT, () => {
  console.log(`Bro vs Bro server kører på port ${PORT}`);
  if (!PANEL_KEY) {
    console.log("ADVARSEL: PANEL_KEY er ikke sat — panelet er ubeskyttet for alle med linket.");
  }
});
