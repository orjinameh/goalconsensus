import next from "next";
import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createGoalConsensusMcpServer } from "./mcp-server/index";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const mcpServer = createGoalConsensusMcpServer();
const sessions = new Map<string, SSEServerTransport>();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/mcp/sse" && req.method === "GET") {
      const transport = new SSEServerTransport("/mcp/messages", res);
      sessions.set(transport.sessionId, transport);
      res.on("close", () => sessions.delete(transport.sessionId));
      await mcpServer.connect(transport);
      return;
    }

    if (url.pathname === "/mcp/messages" && req.method === "POST") {
      const sessionId = url.searchParams.get("sessionId") || "";
      const transport = sessions.get(sessionId);
      if (!transport) {
        res.writeHead(404);
        res.end("Session not found");
        return;
      }
      await transport.handlePostMessage(req, res);
      return;
    }

    if ((url.pathname === "/mcp" || url.pathname === "/mcp/") && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        name: "GoalConsensus MCP Server",
        version: "4.0.0",
        transport: "SSE",
        endpoints: {
          sse: "/mcp/sse",
          messages: "/mcp/messages?sessionId=<id>",
        },
        tools: [
          "analyze_match", "compare_teams", "historical_analysis",
          "market_analysis", "consensus", "player_report", "injury_report",
          "premium_report", "predict_match", "verify_result", "verify_settlement",
          "get_provider_consensus", "get_live_matches", "qualification_scenarios",
          "get_report_catalog",
        ],
      }, null, 2));
      return;
    }

    handle(req, res);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://0.0.0.0:${port}`);
    console.log(`> MCP SSE endpoint: http://0.0.0.0:${port}/mcp/sse`);
  });
});
