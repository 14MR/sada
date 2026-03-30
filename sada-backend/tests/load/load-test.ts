import http from "http";
import autocannon from "autocannon";
import { createApp } from "../../src/app";

interface BenchmarkResult {
  title: string;
  requests: { average: number; mean: number };
  latency: { average: number; p50: number; p95: number; p99: number };
  errors: number;
  timeouts: number;
  duration: number;
  "1xx": number;
  "2xx": number;
  "3xx": number;
  "4xx": number;
  "5xx": number;
}

const CONNECTIONS = 100;
const PIPELINING = 10;
const DURATION = 10;

const endpoints = [
  { title: "GET /health (baseline)", method: "GET", path: "/health" },
  { title: "GET /categories (read-heavy)", method: "GET", path: "/categories" },
  { title: "GET /rooms (list with joins)", method: "GET", path: "/rooms" },
  {
    title: "GET /creator/dashboard (complex query)",
    method: "GET",
    path: "/creator/dashboard",
  },
];

function startServer(app: Express.Application): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function getPort(server: http.Server): number {
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Invalid address");
  return addr.port;
}

function runBenchmark(
  url: string,
  title: string,
  method: string,
  path: string
): Promise<BenchmarkResult> {
  return autocannon({
    url: `${url}${path}`,
    connections: CONNECTIONS,
    pipelining: PIPELINING,
    duration: DURATION,
    method: method as "GET",
    title,
  }) as Promise<BenchmarkResult>;
}

function printResult(r: BenchmarkResult): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${r.title}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Requests/sec : ${r.requests.average.toFixed(1)}`);
  console.log(
    `  Latency (ms) : avg=${r.latency.average.toFixed(2)}  p50=${r.latency.p50.toFixed(2)}  p95=${r.latency.p95.toFixed(2)}  p99=${r.latency.p99.toFixed(2)}`
  );
  console.log(`  Duration     : ${r.duration}s`);
  console.log(
    `  Status codes : 2xx=${r["2xx"]}  4xx=${r["4xx"]}  5xx=${r["5xx"]}`
  );
  console.log(`  Errors       : ${r.errors}  Timeouts: ${r.timeouts}`);
}

async function main(): Promise<void> {
  const app = createApp();
  const server = await startServer(app as any);
  const port = getPort(server);
  const url = `http://localhost:${port}`;

  console.log(`Load test server started on port ${port}\n`);
  console.log(
    `Config: ${CONNECTIONS} connections, ${PIPELINING} pipelining, ${DURATION}s per endpoint\n`
  );

  const results: BenchmarkResult[] = [];

  for (const ep of endpoints) {
    console.log(`Running: ${ep.title} ...`);
    const result = await runBenchmark(url, ep.title, ep.method, ep.path);
    results.push(result);
    printResult(result);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log(`\n${"=".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"=".repeat(60)}`);

  let failed = false;

  for (const r of results) {
    const total = r["2xx"] + r["4xx"] + r["5xx"] + r.errors;
    const errorRate = total > 0 ? (r.errors + r["5xx"]) / total : 0;
    const status = errorRate > 0.01 || r.requests.average < 50 ? "FAIL" : "OK  ";
    if (status === "FAIL") failed = true;
    console.log(
      `  [${status}] ${r.title}  ${r.requests.average.toFixed(1)} req/s  errors=${((errorRate) * 100).toFixed(1)}%`
    );
  }

  if (failed) {
    console.log("\nLoad test FAILED (error rate >1% or throughput <50 req/s)");
    process.exit(1);
  } else {
    console.log("\nAll load tests PASSED");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Load test error:", err);
  process.exit(1);
});
