import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "http";
import { generate } from "./generate.js";
import { models, listModels, getModel } from "./models/registry.js";
import { ValidationError } from "./models/types.js";

// Load .env
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const envPath = resolve(import.meta.dirname, "../.env");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found
}

const modelKeys = Object.keys(models);

function createReplicateServer(): McpServer {
  const server = new McpServer({
    name: "replicate-image-engine",
    version: "0.1.0",
  });

  server.tool(
    "list_models",
    "List all available image generation models with their capabilities and pricing",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify(listModels(), null, 2) }],
    })
  );

  server.tool(
    "get_model",
    "Get detailed info about a specific model",
    {
      model: z.enum(modelKeys as [string, ...string[]]).describe("Model key"),
    },
    async ({ model }) => ({
      content: [{ type: "text", text: JSON.stringify(getModel(model), null, 2) }],
    })
  );

  server.tool(
    "generate_image",
    "Generate an image using a specified model. Returns the output image URL(s).",
    {
      model: z
        .enum(modelKeys as [string, ...string[]])
        .describe(
          "Model to use: flux-2-pro, flux-kontext-pro, recraft-v4, recraft-v4-svg, nano-banana-pro, gpt-image, flux-schnell"
        ),
      prompt: z.string().describe("Text prompt describing the desired image"),
      aspectRatio: z.string().optional().describe("Aspect ratio (e.g. 1:1, 16:9, 3:2). Defaults vary by model"),
      width: z.number().optional().describe("Width in px (only for custom aspect ratio on flux-2-pro)"),
      height: z.number().optional().describe("Height in px (only for custom aspect ratio on flux-2-pro)"),
      resolution: z.string().optional().describe("Resolution — flux-2-pro: 0.5-4 MP, nano-banana: 1K/2K/4K, schnell: 1/0.25"),
      referenceImages: z.array(z.string()).optional().describe("Reference image URLs. Support varies by model"),
      outputFormat: z.string().optional().describe("Output format: webp, jpg, png. Varies by model"),
      numOutputs: z.number().optional().describe("Number of images (schnell: 1-4, gpt-image: 1-10)"),
      quality: z.string().optional().describe("Quality level (gpt-image only: low, medium, high, auto)"),
      background: z.string().optional().describe("Background mode (gpt-image only: auto, transparent, opaque)"),
    },
    async (params) => {
      try {
        const result = await generate(params.model, {
          prompt: params.prompt,
          aspectRatio: params.aspectRatio,
          width: params.width,
          height: params.height,
          resolution: params.resolution,
          referenceImages: params.referenceImages,
          outputFormat: params.outputFormat,
          numOutputs: params.numOutputs,
          quality: params.quality,
          background: params.background,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ urls: result.urls, model: result.model }, null, 2),
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: message,
              type: err instanceof ValidationError ? "validation" : "generation",
            }, null, 2),
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Stateless HTTP — fresh server+transport per request
const PORT = parseInt(process.env.MCP_PORT ?? "3101", 10);

const httpServer = createServer(async (req, res) => {
  try {
    const server = createReplicateServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("[mcp] Error handling request:", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  replicate-image-engine MCP server on http://127.0.0.1:${PORT}/mcp`);
  console.log(`  tools: list_models, get_model, generate_image`);
  console.log(`  models: ${modelKeys.join(", ")}\n`);
});
