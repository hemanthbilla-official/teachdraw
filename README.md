# TeachDraw

TeachDraw converts structured teaching Markdown into editable tldraw boards.

It is a local-first Next.js, TypeScript, Tailwind, and tldraw app for programming class notes. It is designed for topics such as FastAPI, Python backend, MERN, JavaScript, React, Node.js, Express, MongoDB, APIs, CSS, and HTML.

There is no AI integration inside the app, no API key handling, no backend generation, no database, and no auth. Write or generate Markdown elsewhere, paste it into TeachDraw, then generate native editable tldraw shapes locally.

## Current UI

- Markdown textarea
- Parser mode and board health indicator
- Fixed, stable Vertical Cards layout
- Automatic flow direction by default, with Vertical and Horizontal overrides
- Generate Board button
- Clear Board button
- Download Board button

The workspace uses one predictable classroom layout: Vertical Cards. Spacing is tuned and fixed by the renderer; only flow direction is configurable.

## Board Layout

### Vertical Cards

Frames are stacked vertically. Blocks render one after another with content-based height.

Comparison frames render as unified two- or three-column panels with title bands, source labels, explanatory text, and code kept inside the relevant column. Mistake/fix, callout, image, and code blocks use the same fixed vertical rhythm.

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
- Image
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

## Images

TeachDraw supports normal Markdown image syntax with remote `http` or `https` URLs:

```md
## Image

![FastAPI docs screenshot](https://example.com/fastapi-docs.png)
```

Use direct image URLs only. A direct image URL points to the actual image resource, usually ending in `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`, or coming from a known image CDN.

Good:

```md
![Flexbox visual reference](https://miro.medium.com/v2/1*5WxLCnuAebfk11AyktuOew.png)
![Flexbox axes visual](https://www.samanthaming.com/flexbox30/4-flexbox-axes/flexbox-axes.jpg)
![Background size cover contain](https://www.scaler.com/topics/images/using-keyword-values.webp)
```

Avoid search result links and normal article/page links:

```md
![Bad image link](https://www.google.com/search?q=flexbox+diagram)
![Bad image link](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout)
![Bad thumbnail link](https://encrypted-tbn0.gstatic.com/images?q=tbn:...)
```

Use image frames only when a visual reference helps the lesson: Flexbox main/cross axes, `row` vs `column`, `justify-content`, `align-items`, `background-size: cover` vs `contain`, relative/absolute positioning, browser screenshots, UI states, or architecture diagrams exported as images.

Images render as native tldraw image shapes. The app references the remote URL directly; it does not download images to disk or upload them anywhere. TeachDraw centers images inside a light reference frame and caps very wide diagrams so they stay inspectable on screen. If an image URL is malformed, looks like a search/page URL, times out, or cannot load, TeachDraw renders a fallback card with the alt text and URL instead of failing the whole board.

Mermaid diagrams are not rendered yet. Keep Mermaid content as normal code for now, or convert it to an image URL before pasting it into TeachDraw.

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
- image count, when images are present
- warnings for common input issues

Warnings are local-only and non-blocking. They help catch issues such as unclosed code fences, empty frames, empty code blocks, malformed image URLs, search/page image links, Google thumbnail/proxy image links, unclear comparison blocks, or trainer-script headings that will be skipped.

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
    FlowOptions.tsx
    ParserModeBadge.tsx
    TldrawCanvasPanel.tsx
  lib/
    imageUrlRules.ts
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
        imageRenderer.ts
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
