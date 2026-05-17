# Scene — Data-Driven Presentation Engine

One renderer. One JSON per role. Infinite presentations.

No HTML templates to copy. No build step. Just a `?role=` parameter and a data file.

## Quick Start

```bash
# Serve locally
python3 -m http.server 8000
# Open in browser
open http://localhost:8000/?role=sample
open http://localhost:8000/?role=sample_alternative
```

*Or use a VSC extension like Live Server*

Drop a new `data/presentation.json` in and load change `?role=presentation` in `renderer.js`

## The AI-Friendly Bit

The whole presentation is one JSON file. That means **an AI (or you, or your AI assistant) can generate a complete presentation** without touching HTML, CSS, or JS.

```json
{
  "title": "My Thing",
  "theme": { "--color-accent": "#ff6600" },
  "scenes": [
    { "id": "hero", "type": "hero", "headline": "Hello World" }
  ],
  "modals": {
    "modal-detail": { "title": "Details", "body": "Stuff" }
  }
}
```

Scene types, theme variables (light/dark), watermarks, modals — all data, all swappable
- Tested with fresh agent on two samples, see `data/` for samples.

## Scene Types

| Type | Layout | Use |
|------|--------|-----|
| `hero` | Full-screen | Title card |
| `standard` | 3-column | Highlight + text + media |
| `reversed` | 3-column flipped | Same but media on left |
| `pipeline` | Wide full-width | Process flow with connecting line |
| `tree` | Wide full-width | Hierarchy / org chart |
| `credits` | 2-column | Closing text + image (*amazing placeholder art by yours truley*) |

## Theme Variables

Override any or all in the JSON `theme` block:

```json
"--color-bg": "#f5f7fa",
"--color-surface": "#2c3e50",
"--color-primary": "#3498db",
"--color-accent": "#e67e22",
"--color-hover": "#6c9ebd",
"--color-text": "#2c3e50",
"--bg-gradient": "linear-gradient(...)"
```

Add custom SVG watermarks as `--svg-{name}` and reference them with `"mask": "{name}"` on any scene.

## Making Your Own

1. Copy `data/sample.json` to `data/my-thing.json`
2. Change the title, theme colors, and scene content
3. Run the server and load `?role=my-thing`

The hardest part is deciding your accent color. Everything else is just JSON.

---

*No frameworks were harmed in the making of this engine.*
