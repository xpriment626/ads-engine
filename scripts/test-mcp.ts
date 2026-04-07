/**
 * Test the Replicate MCP server by connecting as a client.
 *
 * Start the MCP server first: npx tsx src/mcp-server.ts
 * Then run: npx tsx scripts/test-mcp.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.MCP_URL ?? "http://127.0.0.1:3101/mcp";

async function main() {
  console.log(`\n  Connecting to MCP server at ${MCP_URL}...\n`);

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: "test-client", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);

  // 1. List available tools
  console.log("  === Tools ===\n");
  const { tools } = await client.listTools();
  for (const t of tools) {
    console.log(`  ${t.name}: ${t.description}`);
  }
  console.log();

  // 2. Call list_models
  console.log("  === list_models ===\n");
  const modelsResult = await client.callTool({ name: "list_models", arguments: {} });
  const modelsText = (modelsResult.content as { type: string; text: string }[])[0]?.text;
  const modelsList = JSON.parse(modelsText) as { name: string; id: string; costPerImage: string }[];
  for (const m of modelsList) {
    console.log(`  ${m.name} (${m.costPerImage})`);
  }
  console.log();

  // 3. Call generate_image with flux-schnell (cheapest)
  console.log("  === generate_image (flux-schnell) ===\n");
  const start = Date.now();
  const genResult = await client.callTool({
    name: "generate_image",
    arguments: {
      model: "flux-schnell",
      prompt: "A minimalist product shot of a candle on a marble surface, soft natural lighting, editorial style",
      aspectRatio: "1:1",
    },
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const genText = (genResult.content as { type: string; text: string }[])[0]?.text;
  const genData = JSON.parse(genText);

  if (genResult.isError) {
    console.log(`  ERROR: ${genData.error}`);
  } else {
    console.log(`  Done in ${elapsed}s`);
    console.log(`  URL: ${genData.urls[0]}`);
  }

  // 4. Test validation error
  console.log("\n  === Validation test (bad aspect ratio) ===\n");
  const badResult = await client.callTool({
    name: "generate_image",
    arguments: {
      model: "gpt-image",
      prompt: "test",
      aspectRatio: "16:9", // GPT Image only supports 1:1, 3:2, 2:3
    },
  });
  const badText = (badResult.content as { type: string; text: string }[])[0]?.text;
  const badData = JSON.parse(badText);
  console.log(`  isError: ${badResult.isError}`);
  console.log(`  message: ${badData.error}`);

  console.log("\n  All tests passed.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
