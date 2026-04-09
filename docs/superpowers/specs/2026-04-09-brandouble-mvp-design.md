# Brandouble MVP Design Spec

> Agent-native static ad creation for startups and solopreneurs.

---

## Product thesis

Content design is broken. The describe-wait-iterate loop between founders and designers costs days for assets that should take minutes. Brandouble is built from the ground up with agent-native UX — not a conventional app with AI bolted on.

**Target segment:** Small startups and personal brands in tech, starting with crypto/web3 where the bar for content quality is low but the need for volume is high.

**Key differentiation:** Brandouble is not a prompt box that generates images. It is a composition engine where AI agents generate components (illustrations, SVGs, backgrounds, device mockups) and assemble them into finished, layered banner ads — with the user maintaining direct manipulation over the result.

**Parity principle (Shipper):** Every capability available to a user through the editor is also available to an agent through MCP tools, and vice versa. The API is the UX for agent-driven workflows; the editor is the UX for human-driven workflows. Both operate on the same data structure.

---

## Project model

A Brandouble project ("brand double") is the top-level scope. Everything is scoped to it — no global state.

### Project contains

- **Identity** — name, description (e.g. "Acme Protocol — DeFi lending launching Q2")
- **Brand canvas** — spatial collection of brand assets. Each asset is a node with a system-inferred type (logo, screenshot, illustration, color swatch, reference creative). Users never categorize assets manually.
- **Generation history** — every banner produced for this project, with the brief, agent reasoning, and generated components. Scoped to the project, never global. The agent uses history to improve subsequent generations (what was kept vs rejected).
- **Output specs** — target channel dimensions. Set per project, used for every generation. Dimension-flexible from day one: Twitter/X (1200x675), LinkedIn (1200x627), Instagram (1080x1080), custom dimensions.

### Home view

List of projects. Click into one to open the brand canvas.

---

## Brand canvas

The canvas is a spatial context-assembly surface. Users tell the system "this is what my brand looks like" by showing it, not describing it.

### What goes on the canvas

- **Any file** — images, SVGs, PDFs, screenshots, Figma exports. Drop them in.
- **Color values** — pasted hex codes, or extracted automatically from uploaded assets.
- **Text notes** — freeform context ("premium but approachable", "avoid gradients, our brand is flat/minimal").
- **URLs** — link to a live product page; the agent can screenshot it for visual context.
- **Reference creative** — ads or banners from other brands for inspiration, not copying.

### What the canvas is NOT

- A design editor — no layers, shapes, or resize handles. The editor is for banner outputs, not brand inputs.
- A chat thread — no conversation history. Persistent spatial context, not dialogue.
- Categorized — the system infers asset roles from content. No "upload your logo here" buckets.

### How it feeds the pipeline

On generation, the entire canvas is serialized as the agent's context. The agent sees all assets, notes, and colors simultaneously. More on the canvas = better output. Minimum viable canvas: a logo and a prompt.

---

## Scene graph engine

The core data structure is a Figma-compatible JSON scene graph — a typed node tree where each node represents a layer in the banner composition.

### Node types

Modeled as a subset of Figma's public REST API node types for near-lossless Figma export.

| Node type | Properties | Use in banners |
|-----------|-----------|----------------|
| **Frame** | position, size, fills (solid/gradient/image), corner radius, auto-layout (horizontal/vertical), padding, item spacing, constraints, effects, opacity, clip content | Root banner, content groups, CTA buttons |
| **Text** | content, font family, size, weight, color, alignment, line height, letter spacing | Headlines, body copy, CTAs |
| **Rectangle** | position, size, fills, strokes, corner radius, effects, opacity | Background shapes, color blocks, decorative elements |
| **Image** | source URL/data, fit mode (cover/contain/fill), opacity, effects | Generated illustrations, product screenshots, logos, device mockups |
| **Vector** | SVG path data, fills, strokes, opacity | Generated SVG illustrations, icons |
| **Ellipse** | position, size, fills, strokes, arc data, effects | Circular elements, avatars |
| **Group** | children, opacity, blend mode | Logical grouping of related elements |

### Auto-layout

Frames support auto-layout (flexbox-equivalent) with:
- Direction: horizontal, vertical, none (absolute positioning)
- Alignment: min, center, max, space-between (primary and counter axis)
- Spacing: item spacing, padding (top/right/bottom/left)
- Sizing: fixed, hug contents, fill container

This maps 1:1 to Figma's auto-layout and enables responsive banner composition — the same layout adapts to different channel dimensions.

### Scene graph example

```json
{
  "type": "FRAME",
  "name": "Banner",
  "width": 1200,
  "height": 675,
  "fills": [{ "type": "GRADIENT_LINEAR", "stops": [...] }],
  "layoutMode": "HORIZONTAL",
  "primaryAxisAlignItems": "SPACE_BETWEEN",
  "paddingLeft": 60,
  "paddingRight": 60,
  "children": [
    {
      "type": "FRAME",
      "name": "Copy",
      "layoutMode": "VERTICAL",
      "itemSpacing": 16,
      "children": [
        { "type": "TEXT", "name": "Headline", "characters": "Ship Faster", "style": { "fontFamily": "Inter", "fontSize": 48, "fontWeight": 700 } },
        { "type": "TEXT", "name": "Subtext", "characters": "DeFi lending, simplified", "style": { "fontSize": 20 } },
        { "type": "FRAME", "name": "CTA", "fills": [{ "type": "SOLID", "color": "#6C5CE7" }], "cornerRadius": 8, "children": [
          { "type": "TEXT", "characters": "Launch App →", "style": { "fontSize": 16, "fontWeight": 600 } }
        ]}
      ]
    },
    {
      "type": "IMAGE",
      "name": "DeviceMockup",
      "source": "output/composited-phone-mockup.png",
      "width": 400,
      "height": 500,
      "fit": "contain"
    }
  ]
}
```

### Operations on the scene graph

Both the agent (via MCP tools) and the user (via editor UI) perform the same operations:

- **Insert** — add a node to a parent frame
- **Update** — change node properties (color, text, position, size, opacity)
- **Move** — reorder or reparent a node in the tree
- **Delete** — remove a node
- **Replace** — swap a node with a different one (e.g. swap illustration)

### Storage

JSON files per banner, scoped to the project directory. No database for MVP.

---

## Composition pipeline

Takes brand canvas context + a text brief and produces finished banner scene graphs.

### Steps

1. **Brief interpretation** — agent reads the user's prompt + full canvas context, produces a creative spec: layout archetype, required elements (illustration, device mockup, text overlay, background), model selections.

2. **Asset generation** — agent calls the appropriate MCP tool servers:
   - Image models (Replicate MCP server) for illustrations, backgrounds, hero images
   - Recraft V4 SVG for vector illustrations and icons
   - Background removal for compositing product screenshots onto new backgrounds
   - Device mockup compositing (Mockupgen approach — pre-built device frames + programmatic perspective warp + composite) for product screen-on-device shots

3. **Layout composition** — agent selects a template archetype (pre-built scene graph), customizes all properties from brand canvas context (colors, fonts, sizing), and inserts generated assets into the appropriate node positions.

4. **Render** — the scene graph is rendered in the browser via the React renderer, then Playwright screenshots it at each target dimension. Produces final image files.

5. **Self-evaluation** — agent reviews the rendered output against the brief and canvas context. Checks text readability, brand color presence, composition balance, device mockup cleanliness. Loops back to the relevant step on failure.

### Template archetypes

6-8 style-neutral layout archetypes implemented as pre-built scene graphs. Each defines structural slot positions but no colors, fonts, or style. The agent customizes everything from brand context.

| Archetype | Structure | Common use |
|-----------|-----------|------------|
| **Hero device** | Device mockup centered, headline above, CTA below | App launch announcements |
| **Split** | Image/mockup one side, copy + CTA other side | Feature highlights |
| **Feature grid** | 3-4 icon/text pairs, headline spanning top | Product capability overview |
| **Stats banner** | Large numbers with supporting text | Metrics announcements (TVL, users, volume) |
| **Announcement** | Gradient background, centered headline, logo, date | Event/launch announcements |
| **Quote/testimonial** | Avatar, quote text, attribution | Social proof |
| **Comparison** | Before/after or side-by-side split | Differentiation messaging |
| **Minimal** | Logo, single headline, accent illustration, CTA | Brand awareness |

Adding new archetypes is adding a JSON scene graph file.

### Generative tools (not editor tools)

The agent generates creative assets. The user doesn't draw or photograph — they generate.

| Capability | How it works |
|-----------|--------------|
| Generate illustration | Agent calls image model → inserts Image node |
| Generate SVG element | Agent calls Recraft V4 SVG → inserts Vector node |
| Generate background | Agent calls image model → sets root Frame fill |
| Remove background | Agent calls bg removal tool → updates Image node source |
| Device mockup | Agent composites screenshot into pre-built device frame → inserts Image node |

---

## Editor UI

The editor renders the scene graph visually and provides direct manipulation for human refinement.

### Layout

- **Layer panel (left)** — node tree with reordering via drag. Shows node type icons, names, visibility toggles.
- **Canvas (center)** — visual render of the scene graph. Selection, drag-to-reposition, resize handles, multi-select.
- **Properties panel (right)** — edit selected node's properties: fills (color picker, gradient editor), text (content, font, size, weight, alignment), dimensions, spacing, opacity, effects (shadow, blur), corner radius.

### Interactions

- **Select** — click a node on canvas or layer panel. Shows selection handles and loads properties.
- **Move** — drag selected node on canvas. Updates position in scene graph.
- **Resize** — drag handles. Respects constraints and auto-layout rules.
- **Inline text edit** — double-click a Text node to edit content directly on canvas.
- **Reorder** — drag in layer panel to change z-order or reparent into a different frame.
- **Swap asset** — drop a new image onto an Image node to replace its source.

### What the editor is NOT

- Not Figma — no pen tool, boolean operations, vector editing, prototyping, or component system.
- Not a design tool — no drawing, no creation from scratch. Creation is generative (agent-driven). Editing is direct manipulation (human-driven).

---

## Output and variations

### Generation output

- **3 variations per generation** — agent explores different layout archetypes and creative directions, not near-identical outputs.
- Each variation rendered at every target dimension the project specifies.
- Results appear in the project view alongside the brief and agent reasoning.
- Generated components (illustrations, SVGs, mockups) stored individually for reuse across future generations.

### User response actions

- **Keep** — saves to project, available for download and future reference.
- **Reject** — agent notes what was rejected, feeds future generation context.
- **Refine** — user provides a text note ("bigger headline", "darker background", "use the other product screenshot"). Agent re-runs the relevant pipeline step, not the full pipeline.
- **Edit** — user opens the scene graph in the editor for direct manipulation.
- **Regenerate** — full re-run with a different creative direction.

### Export

- **Image export** — Playwright screenshots at target dimensions → PNG/WebP.
- **Figma export** — scene graph maps to Figma node types via Figma REST API or Figma MCP tools. Near-lossless: Frame → Figma Frame, Text → Figma Text, Image → Figma Rectangle with image fill, Vector → Figma Vector. Users who need full design tool control get it without re-building from scratch.
- **Scene graph JSON** — raw format for programmatic access and agent consumption (parity principle).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                       Brandouble                          │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Projects    │  │ Scene Graph  │  │  Generation    │  │
│  │   & Canvas    │  │   Engine     │  │   History      │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                   │           │
│  ┌──────┴─────────────────┴───────────────────┴────────┐  │
│  │                Editor UI (React)                     │  │
│  │  Layer panel  │  Canvas renderer  │  Properties panel│  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│  ┌─────────────────────────┴───────────────────────────┐  │
│  │            Composition Agent (AI SDK)                │  │
│  │  Brief → spec → asset gen → layout → render → eval  │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                            │                              │
│  ┌─────────────────────────┴───────────────────────────┐  │
│  │                MCP Tool Servers                      │  │
│  │  Replicate  │  fal.ai  │  Together  │  Mockupgen    │  │
│  │  (image gen, SVG, device composite, bg removal)     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Export                            │  │
│  │  Screenshot (Playwright)  │  Figma API  │  PNG/SVG  │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key architectural decisions

- **Scene graph JSON is the single source of truth.** Agent writes via MCP tools. User writes via editor UI. Same data structure, no sync problem.
- **Figma-compatible node types.** Scene graph nodes map to Figma REST API node types by design. Export is a mapping, not a conversion.
- **MCP tool servers are infrastructure-agnostic.** Replicate today, fal.ai and Together AI as future additions. Same tool interface regardless of provider.
- **Single composition agent for MVP.** Decomposition into specialized agents (prompt refiner, router, QA) happens when the single agent's limitations become concrete, not theoretical.
- **Dimension-flexible from day one.** Templates use auto-layout. Same scene graph renders at any target dimension.

### Technology stack

| Layer | Technology |
|-------|-----------|
| Editor UI | React, canvas renderer mapping scene graph → DOM |
| Agent | Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) |
| MCP servers | `@modelcontextprotocol/sdk` (existing Replicate server, future fal.ai + Together) |
| Image generation | Replicate SDK (7 models wired), future fal.ai client, Together client |
| Device mockups | Mockupgen approach (pre-built frames + OpenCV/sharp warp + composite) |
| Render/export | Playwright for screenshots, Figma REST API for design export |
| Storage | Filesystem (JSON scene graphs, project assets) — no database for MVP |
| LLM providers | Anthropic (Claude) for composition agent, OpenAI-compatible for flexibility |

---

## Minimum demoable state

The first thing anyone sees:

1. Create a project, drop in a logo + brand colors + product screenshot
2. Type a brief: "Twitter banner announcing our mainnet launch, show the app on a phone"
3. See 3 variations appear — different layouts, different generated backgrounds, same brand identity
4. Click into one, tweak the headline text in the editor
5. Export as PNG

This demonstrates: brand context → agent composition → direct manipulation → finished output. Under 5 minutes.

### What's in vs out for MVP

| In | Out |
|----|-----|
| Project creation with brand canvas | User accounts / auth |
| 3-4 template archetypes (hero device, split, announcement, minimal) | All 8 archetypes |
| Scene graph with Frame, Text, Image, Rectangle nodes | Vector, Ellipse, Group nodes |
| Editor: select, move, resize, inline text edit, color change | Layer reorder, effects editor, gradient editor |
| Replicate MCP server (existing 7 models) | fal.ai, Together AI MCP servers |
| Device mockup compositing (iPhone, MacBook) | Full device library |
| PNG export at target dimensions | Figma export, SVG export |
| Single composition agent | Multi-agent pipeline |
| Filesystem storage | Database, cloud storage |
| Local development | Deployment, hosting |
