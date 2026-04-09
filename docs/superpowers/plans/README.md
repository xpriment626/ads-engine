# Brandouble MVP Implementation Plans

> Spec: [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md)

## Phasing

Plans are organized into phases. Plans within the same phase have **no dependencies on each other** and can be executed in parallel by separate agent sessions.

```
Phase 1 (parallel — zero dependencies)
├── Plan A: Scene Graph Engine + Template Archetypes
├── Plan B: Device Mockup Compositor
└── Plan C: Brand Canvas / Project Model

Phase 2 (parallel — depends on Phase 1A scene graph types)
├── Plan D: Canvas Renderer
└── Plan E: Composition Agent

Phase 3 (depends on Phase 1A + Phase 2D)
└── Plan F: Editor UI

Phase 4 (depends on all above)
└── Plan G: Export + Integration
```

## Dependency graph

```
A (scene graph) ──────┬──→ D (renderer) ──┬──→ F (editor) ──→ G (export)
                      │                   │
B (device mockups) ───┤                   │
                      │                   │
C (brand canvas) ─────┴──→ E (agent) ─────┘
```

## Plan files

| Plan | File | Phase | Can parallelize with |
|------|------|-------|---------------------|
| A | `plan-a-scene-graph.md` | 1 | B, C |
| B | `plan-b-device-mockups.md` | 1 | A, C |
| C | `plan-c-brand-canvas.md` | 1 | A, B |
| D | `plan-d-canvas-renderer.md` | 2 | E |
| E | `plan-e-composition-agent.md` | 2 | D |
| F | `plan-f-editor-ui.md` | 3 | — |
| G | `plan-g-export-integration.md` | 4 | — |

## For agent sessions

Each plan is self-contained. To execute a plan:

1. Read the plan file
2. Check that prerequisite phases are complete (dependency graph above)
3. Execute tasks in order using `superpowers:subagent-driven-development` or `superpowers:executing-plans`
4. Each task ends with a commit — the plan is resumable from any task boundary
