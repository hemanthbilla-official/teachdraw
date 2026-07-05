# TeachDraw

TeachDraw converts structured teaching Markdown into editable tldraw boards.

It is local-first: there is no AI integration, API key handling, backend generation, database, or auth. Write or generate Markdown elsewhere, paste it into TeachDraw, and generate native tldraw shapes.

## Current UI

- Markdown textarea
- Parser mode indicator
- Canvas Style dropdown: Horizontal Cards or Vertical Cards
- Spacing dropdown
- Flow dropdown
- Generate Board button
- Clear Board button

Horizontal Cards is the default layout.

## Supported Board Styles

### Horizontal Cards

Frames are stacked vertically. Each frame uses a wide card layout:

- Code-heavy frames put explanation and notes on the left, code on the right.
- Flow frames use wide flow diagrams.
- Comparison frames render two or three balanced columns.
- Mistake/fix frames render Mistake and Correct side by side.
- Callouts use semantic colors and content-based height.

### Vertical Cards

Frames are stacked vertically. Blocks render one after another with content-based height. The spacing dropdown affects this mode too.

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

## Semantic Blocks

TeachDraw recognizes headings such as:

- Definition
- Meaning
- Explanation
- Example
- Code
- Command
- Flow
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

The renderer preserves fenced code content and strips only visual Markdown markers such as `**bold**` from note text.

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
      layoutHelpers.ts
      shapeHelpers.ts
  types/
    teachdraw.ts
```
