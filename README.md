# TeachDraw

Convert structured Markdown lesson content into an editable tldraw whiteboard. Built for educators, technical trainers, and anyone who wants to turn written notes into visual diagrams.

## How It Works

1. Write Markdown in the editor panel (or load a template)
2. Choose a layout style and options
3. Click **Generate Board** — TeachDraw parses the Markdown and builds a fully laid-out tldraw canvas with frames, cards, code blocks, flow diagrams, callouts, and arrows
4. Edit the board directly in the tldraw editor, export as `.tldr`, or start over

## Features

- **Two parsing modes** — Frame-based (`# Frame 1: Title`) for explicit control, or section-based (using `##` headings) for simpler content
- **13 semantic block types** — automatically detected from headings: Concepts, Definitions, Examples, Key Points, Warnings, Code Blocks, Commands, Flow Diagrams, Lists, Tasks, Assignments, Comparisons, Recaps
- **Three layout modes**
  - **Whiteboard Notes** — masonry-style freeform layout with color-coded cards and callouts
  - **Frame Grid** — grid layout using tldraw frames (configurable 2/3/4 columns)
  - **Vertical Cards** — single-column card layout
- **Flow diagram generation** — parses arrow notation (`Step 1 -> Step 2 -> Step 3`) into connected shapes
- **Auto color-coded cards** — block types get distinct visual treatments (definitions are blue, warnings are red/orange, code is dark, examples are green, etc.)
- **LocalStorage persistence** — markdown and layout options are saved automatically
- **Import/Export** — save and load boards as `.tldr` files
- **Next.js App Router** — modern React architecture with TypeScript

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Whiteboard | [tldraw](https://tldraw.dev) v4 |
| Styling | Tailwind CSS v3 |
| Linting | ESLint (next/core-web-vitals) |
| Storage | Browser localStorage |
| Package Manager | npm |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

### Lint & Type Check

```bash
npm run lint
npm run typecheck
```

## Usage

1. **Write Markdown** — Type or paste lesson content into the textarea. Use `# Title`, `## Section`, and optionally `# Frame 1: Title` for frame-based mode.
2. **Select a template** (if available) — Pre-built templates load example content.
3. **Configure layout**
   - **Canvas Style**: `Whiteboard Notes`, `Frame Grid`, or `Vertical Cards`
   - **Columns**: 2–4 (only for Frame Grid)
   - **Flow**: `Auto`, `Vertical`, or `Horizontal`
4. **Click Generate Board** — The canvas populates with parsed content.
5. **Edit freely** — All shapes are native tldraw shapes; move, resize, recolor, or delete them.
6. **Clear** — Removes only the generated shapes, leaving any manually drawn content.

### Markdown Format

#### Section-based (simple)

```
# Lesson Title

## Definition
A definition is a statement of the exact meaning of a word.

## Example
Here is a concrete example illustrating the concept.

## Key Point
This is the most important takeaway.
```

#### Frame-based (explicit)

```
# Board Title

## Frame 1: Getting Started

### Definition
What is this concept?

### Code
```python
print("hello")
```
```

#### Flow Diagrams

Use arrows to create connected flow steps:

```
## Flow: Authentication Flow

User submits credentials -> Server validates -> Token issued -> Access granted
```

#### Block Type Detection

Headings containing these keywords are auto-styled:

| Keyword | Block Type | Visual Style |
|---------|-----------|-------------|
| Concept, Overview | `concept` | Blue |
| Definition, What is | `definition` | Blue |
| Example | `example` | Green |
| Key Point, Note, Important | `keypoint` | Orange highlight |
| Warning, Error, Caution | `warning` | Red |
| Code, Syntax | `code` | Dark card |
| Command, Terminal | `command` | Dark card |
| Flow, Process, Pipeline | `flow` | Blue with arrows |
| List, Items, Steps | `list` | Bulleted |
| Task, Practice, Exercise | `task` | Purple |
| Assignment, Homework | `assignment` | Purple |
| Compare, vs, versus | `compare` | Side-by-side |
| Recap, Summary, Review | `recap` | Gray |
| Teach, Guide, Learn | `title` | Title block |

## Project Structure

```
teachdraw/
  src/
    app/
      globals.css              # Tailwind directives + global styles
      layout.tsx               # Root layout (tldraw CSS imports, metadata)
      page.tsx                 # Entry page
    components/
      TeachDrawApp.tsx         # Main orchestrator (state, parsing, generation)
      MarkdownEditorPanel.tsx  # Left panel: editor + controls
      TldrawCanvasPanel.tsx    # Right panel: tldraw canvas
      GenerationOptions.tsx    # Layout mode/columns/flow dropdowns
      TemplateButtons.tsx      # Template selection grid
      ParserModeBadge.tsx      # Shows detected parsing mode
    lib/
      markdown/
        markdownUtils.ts              # Core parsing: block detection, bullet/flow parsing
        parseTeachDrawMarkdown.ts      # Top-level dispatcher (frame vs section detection)
        parseFrameBasedMarkdown.ts     # Frame-mode parser
        parseSectionBasedMarkdown.ts   # Section-mode parser
      tldraw/
        generateTeachDrawBoard.ts     # Board generation engine (1813 lines)
        layoutHelpers.ts              # Height estimation, flow orientation
        shapeHelpers.ts               # tldraw shape factory functions
        exportTldr.ts                 # Export board to .tldr file
        importTldr.ts                 # Import board from .tldr file
      filename.ts              # File name sanitizer
      storage.ts               # localStorage wrapper (SSR-safe)
      templates.ts             # Template definitions (extensible)
    types/
      teachdraw.ts             # TypeScript type definitions
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  eslint.config.mjs
```

## Type System

The core data model flows through these types:

```
Markdown string
  -> parseTeachDrawMarkdown()
  -> TeachDrawDocument { mode, rawTitle, boardTitle, boardSubtitle, frames[] }
       -> TeachDrawFrame { id, frameNumber, frameTitle, blocks[] }
            -> TeachDrawBlock { id, heading, kind, text, bullets, codeBlocks, ... }
                 -> kind: 13 semantic types (title, flow, code, definition, etc.)
  -> generateTeachDrawBoard()
  -> tldraw shapes on canvas
```

## Contributing

This is a personal project. Feel free to open issues or fork.

## License

MIT
