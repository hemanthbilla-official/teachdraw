# TeachDraw

TeachDraw converts structured teaching Markdown into editable tldraw boards.

It is a local-first Next.js, TypeScript, Tailwind, and tldraw app for programming class notes. It is designed for topics such as FastAPI, Python backend, MERN, JavaScript, React, Node.js, Express, MongoDB, APIs, CSS, and HTML.

There is no AI integration inside the app, no API key handling, no backend generation, no database, and no auth. Write or generate Markdown elsewhere, paste it into TeachDraw, then generate native editable tldraw shapes locally.

## Current UI

- Markdown textarea
- Parser mode and board health indicator
- Canvas Style dropdown
  - Vertical Cards
  - Horizontal Cards
  - Whiteboard Map
- Spacing dropdown
  - Comfortable
  - Compact
  - Extra Compact
  - Extreme Compact
- Flow dropdown
- Generate Board button
- Clear Board button

Vertical Cards is the default layout. Horizontal Cards is available for wider side-by-side teaching notes. Whiteboard Map is available for live classroom explanation and concept relationships.

## Board Styles

### Vertical Cards

Frames are stacked vertically. Blocks render one after another with content-based height.

Use this when you want the cleanest screen-note format.

### Horizontal Cards

Frames are stacked vertically, but each frame uses more width.

- Code-heavy frames put explanation and notes on the left, code on the right.
- Flow frames use wide diagrams.
- Comparison frames render two or three balanced columns.
- Mistake/fix frames render Mistake and Correct side by side.
- Callouts use semantic colors and content-based height.

### Whiteboard Map

Frames are still stacked vertically, but each frame renders like a clean classroom whiteboard section.

- Explanation notes render as loose whiteboard text.
- Code, flow, comparison, and mistake/fix content stay structured.
- Important, memory, warning, and practice notes render as light callouts.
- Arrows connect related lanes only when useful.
- Content is deterministic, not randomly scattered.

## Markdown Format

Use frame-based Markdown for best results:

````md
# TLDRAW CONTENT: FastAPI Lesson

## Board Title

**FastAPI Request Body and POST API**

Subtitle:

**Request Body -> Pydantic -> POST -> Validation -> Response**

---

# Frame 1: Topic Big Picture
<!-- layout: horizontal -->

## Definition

POST APIs are used when the client sends new data to the backend.

## Example

```json
{
  "id": 3,
  "title": "Python Basics"
}
```

## Key Point

GET reads existing data.

POST sends new data.
````

See [TEACHDRAW_BEST_INPUT_FORMAT.md](./TEACHDRAW_BEST_INPUT_FORMAT.md) for detailed prompt guidance and examples.

## Supported Blocks

TeachDraw recognizes headings such as:

- Definition
- Meaning
- Explanation
- Walkthrough
- What To Notice
- Example
- Code
- Command
- Request
- Response
- Flow
- Decision
- Compare
- Mistake
- Correct
- Important
- Key Point
- Memory Line
- Warning
- Practice
- Task
- Recap

The parser preserves fenced code content, indentation, slashes, quotes, braces, decorators, URLs, `.venv`, localhost URLs, ports, terminal commands, JSON, JSX, CSS, HTML, JavaScript, and Python. It strips only visual Markdown markers such as `**bold**` from normal note text.

## Stability Guarantees

- Code card height is based on actual line count.
- Fence language tags such as `python`, `json`, and `tsx` do not appear as visible code.
- Text before code blocks stays visible.
- Request, Body, and Response labels stay attached to their own code blocks.
- Comparisons do not treat `Compare` as a fake first column.
- Decision blocks render Yes/No branches.
- Trainer-script headings such as questions and expected answers are skipped by default.
- Spacing presets affect all board styles without intentional overlap.

## Board Health

The parser badge shows:

- detected parser mode
- frame count
- block count
- code block count
- warnings for common input issues

Warnings are local-only and non-blocking. They help catch issues such as unclosed code fences, empty frames, empty code blocks, unclear comparison blocks, or trainer-script headings that will be skipped.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Project Structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    TeachDrawApp.tsx
    MarkdownEditorPanel.tsx
    GenerationOptions.tsx
    ParserModeBadge.tsx
    TldrawCanvasPanel.tsx
  lib/
    markdown/
      analyzeTeachDrawDocument.ts
      parseTeachDrawMarkdown.ts
      parseFrameBasedMarkdown.ts
      parseSectionBasedMarkdown.ts
      markdownUtils.ts
    tldraw/
      generateTeachDrawBoard.ts
      generator/
        blockRenderers.ts
        classification.ts
        codeCardRenderers.ts
        comparison.ts
        comparisonGrouping.ts
        comparisonRenderer.ts
        constants.ts
        content.ts
        flowRenderer.ts
        frameRenderers.ts
        headingRenderers.ts
        layout.ts
        measurements.ts
        mistakeFixRenderer.ts
        palette.ts
        textCardRenderers.ts
        types.ts
        whiteboardRenderer.ts
      layoutHelpers.ts
      shapeHelpers.ts
  types/
    teachdraw.ts
```
