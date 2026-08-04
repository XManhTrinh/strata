import { createServer, Server } from "node:http";

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT) || 3002;

let server: Server | null = null;

export function startHealthCheck(): void {
  server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`Health check listening on port ${HEALTH_PORT}`);
  });
}

export function stopHealthCheck(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}
