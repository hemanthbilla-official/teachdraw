# TeachDraw Best Input Format

Use this guide when asking an LLM to create Markdown for TeachDraw.

TeachDraw is for screen notes. The Markdown should become clean tldraw cards that a trainer can show during class and edit afterward.

The same Markdown can render as Vertical Cards, Horizontal Cards, or Whiteboard Map. Whiteboard Map is best when you want a clean live-teaching board with concept notes, visual/code content, callouts, and arrows between related ideas.

Do not ask the LLM to include oral questions, expected student answers, trainer scripts, stage directions, or teacher-only prompts. Ask questions orally during class instead.

## Core Rules

- Write practical class notes, not a dense article.
- Use `# Frame X: Title` for every board section.
- Use `## Heading` for every block inside a frame.
- Prefer 2-4 useful teaching lines for explanations.
- Keep code in fenced code blocks.
- Use normal Markdown image syntax for direct remote image URLs: `![Alt text](https://example.com/image.png)`.
- Do not use Google search URLs, image search pages, article pages, or documentation pages as image links.
- Do not use Google thumbnail/proxy URLs such as `https://encrypted-tbn0.gstatic.com/images?...`; they may appear cropped or low resolution.
- Keep real symbols exactly as written: slashes, quotes, braces, decorators, `.venv`, URLs, `localhost`, and ports.
- Use `**bold**` only for visual emphasis in text, not inside code.
- Add labels before multiple code blocks, such as `Request:` and `Response:`.
- Prefer comparison frames with a title line such as `Padding vs Margin`, followed by matching `## Padding` and `## Margin` blocks.
- Use standalone `vs` lines when the full comparison lives inside one `## Compare` block.
- Avoid oral-only blocks such as `Question`, `Ask Students`, `Expected Answer`, and `Student Activity`.

## Board Header

```md
# TLDRAW CONTENT: FastAPI Lesson

## Board Title

**FastAPI Request Body and POST API**

Subtitle:

**Request Body -> Pydantic -> POST -> Validation -> Response**

---
```

## Concept Frame

Use this for definitions, meanings, mental models, and key points.

```md
# Frame 1: Topic Big Picture
<!-- layout: horizontal -->

## Definition

POST APIs are used when the client sends new data to the backend.

The backend reads the request body, validates it, and creates or stores something.

## Meaning

GET usually reads existing data.

POST usually sends new data to the server.

## Key Point

Request body data does not come from the URL path.

It comes from the body sent by the client.
```

## Code Frame

Use this when code is the main teaching object. Put explanation text before or beside the code.

````md
# Frame 2: Pydantic Model
<!-- layout: code -->

## Meaning

Pydantic describes the shape of the data expected by the API.

FastAPI uses it to validate incoming JSON before the function logic runs.

## Example

This model expects three fields: `id`, `title`, and `author`.

```python
from pydantic import BaseModel

class Book(BaseModel):
    id: int
    title: str
    author: str
```

## Memory Line

Model class = expected request body shape.
````

## Multiple Code Blocks With Labels

Use labels directly before each fenced block.

````md
# Frame 3: Request and Response
<!-- layout: code -->

## Example

Request:

```text
POST /books
```

Body:

```json
{
  "id": 3,
  "title": "Python Basics",
  "author": "Asha"
}
```

Response:

```json
{
  "message": "Book created",
  "book_id": 3
}
```
````

## Image Frame

Use this when a screenshot, diagram export, or visual reference helps the lesson. Use remote `http` or `https` direct image URLs only.

The URL should point to the actual image resource, usually ending in `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, or `.svg`, or coming from a known image CDN.

Good:

```md
![Flexbox visual reference](https://miro.medium.com/v2/1*5WxLCnuAebfk11AyktuOew.png)
![Flexbox axes visual](https://www.samanthaming.com/flexbox30/4-flexbox-axes/flexbox-axes.jpg)
![Background size cover contain](https://www.scaler.com/topics/images/using-keyword-values.webp)
```

Bad:

```md
![Flexbox diagram](https://www.google.com/search?q=flexbox+diagram)
![Flexbox docs page](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout)
![Google thumbnail](https://encrypted-tbn0.gstatic.com/images?q=tbn:...)
```

```md
# Frame 4: FastAPI Docs Screen
<!-- layout: horizontal -->

## Meaning

FastAPI `/docs` gives a browser interface for testing API routes.

It is useful for POST APIs because it provides a request body editor.

## Image

![FastAPI docs POST request body screen](https://example.com/fastapi-docs-post.png)

## Key Point

Use images only when they clarify the screen or visual state.
```

Useful image moments for programming notes:

- Flexbox main axis and cross axis
- `flex-direction: row` vs `column`
- `justify-content` and `align-items`
- `background-size: cover` vs `contain`
- relative parent with absolute child positioning
- UI screenshots where students need to recognize the screen
- architecture diagrams exported as image files

Do not include Mermaid diagrams for now. If a diagram is needed, render it elsewhere and include it as an image URL.

## Flow Frame

Use this when the main teaching object is a process.

```md
# Frame 4: POST API Flow
<!-- layout: flow -->

## Flow

Client sends JSON -> FastAPI receives body -> Pydantic validates -> Route function runs -> Response returns

## Important

Validation happens before the route function body is executed.
```

## Decision Flow Frame

Use standalone `Yes` and `No` lines. TeachDraw renders them as branch labels, not normal flow steps.

```md
# Frame 5: Body Validation Decision
<!-- layout: flow -->

## Decision

JSON matches the `Book` model

Yes

Function receives `book`

No

FastAPI returns validation error
```

## Comparison Frame

Preferred format: put the comparison title inside `## Compare`, then use matching block headings for each column. Do not make `Compare` a column.

```md
# Frame 5: Padding vs Margin
<!-- layout: compare -->

## Compare

Padding vs Margin

## Padding

Padding is space inside the element, between content and border.

It increases the clickable or colored area of the element.

## Margin

Margin is space outside the element, between this element and nearby elements.

It separates one element from another.
```

Standalone `vs` lines also work when the whole comparison should stay inside one block.

```md
# Frame 5: Padding vs Margin
<!-- layout: compare -->

## Compare

Padding

- Space inside the element
- Increases the clickable or colored area
- Background color covers padding

vs

Margin

- Space outside the element
- Separates one element from another
- Background color does not cover margin
```

Three-column comparison:

```md
# Frame 6: Display Types
<!-- layout: compare -->

## Compare

Block

- Starts on a new line
- Takes full available width
- Example: `div`, `p`, `section`

vs

Inline

- Stays in the same line
- Width depends on content
- Example: `span`, `a`, `strong`

vs

Inline-block

- Stays inline
- Allows width and height
- Useful for button-like elements
```

## Mistake/Fix Frame

Put explanation text above each code block.

````md
# Frame 7: Route Order Mistake
<!-- layout: mistake-fix -->

## Mistake

Writing the dynamic route before the fixed route can make `/books/latest` behave like an ID.

```python
@app.get("/books/{book_id}")
def get_book(book_id: int):
    return books[book_id]

@app.get("/books/latest")
def latest_book():
    return books[-1]
```

## Correct

Put the fixed route first so FastAPI matches it before the dynamic route.

```python
@app.get("/books/latest")
def latest_book():
    return books[-1]

@app.get("/books/{book_id}")
def get_book(book_id: int):
    return books[book_id]
```
````

## Practice Frame

Use this for short implementation tasks, not oral questions.

```md
# Frame 8: Practice Task
<!-- layout: practice -->

## Practice

Create a POST API named `/books`.

Accept `id`, `title`, and `author` in the request body.

Return a success message with the created book.

## Important

Keep the Pydantic model separate from the route function.
```

## Recap Frame

Use this at the end of a topic.

```md
# Frame 9: Recap
<!-- layout: recap -->

## Recap

- Request body is data sent by the client.
- Pydantic validates the body shape.
- POST is commonly used to create new data.
- FastAPI returns a response after validation and function logic.

## Memory Line

Body -> Model -> Function -> Response
```

## CSS Example

````md
# Frame 1: CSS Box Model
<!-- layout: compare -->

## Compare

Padding

- Space between content and border
- Background color includes padding
- Useful for button comfort

vs

Margin

- Space outside the border
- Separates elements from each other
- Does not receive background color

## Example

```css
.card {
    padding: 16px;
    margin-bottom: 24px;
}
```
````

## JavaScript Example

````md
# Frame 1: Array Map
<!-- layout: code -->

## Meaning

`map()` creates a new array by transforming every item.

It does not change the original array.

## Example

```js
const prices = [100, 200, 300]

const withTax = prices.map((price) => price * 1.18)

console.log(withTax)
```

## Key Point

Use `map()` when the output has the same number of items as the input.
````

## React Example

````md
# Frame 1: React State
<!-- layout: code -->

## Meaning

State stores data that can change on the screen.

When state changes, React re-renders the component.

## Example

```jsx
import { useState } from "react"

export function Counter() {
    const [count, setCount] = useState(0)

    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    )
}
```

## Memory Line

State change -> render again.
````

## MERN Example

```md
# Frame 1: MERN Request Flow
<!-- layout: flow -->

## Flow

React form -> Express route -> Controller -> MongoDB query -> JSON response -> React state update

## Important

The frontend should not talk directly to MongoDB.

It talks to the Express API.
```

## Node and Express Example

````md
# Frame 1: Express GET API
<!-- layout: code -->

## Meaning

Express routes connect an HTTP method and path to a function.

The function receives `req` and `res`.

## Example

```js
import express from "express"

const app = express()

app.get("/students", (req, res) => {
    res.json([
        { id: 1, name: "Asha" },
        { id: 2, name: "Ravi" }
    ])
})

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000")
})
```
````

## Prompt Template For LLMs

```text
Create TeachDraw Markdown for a programming class.

Write screen notes only, not a trainer script.
Do not include oral questions, expected student answers, or teacher-only prompts.
Use # Frame X: Title for sections and ## Heading for blocks.
Use 2-4 practical teaching lines per explanation.
Use fenced code blocks and preserve code exactly.
Use labels before multiple code blocks, such as Request:, Body:, and Response:.
Use Markdown image syntax only when a direct remote image URL is useful.
Use actual image URLs, not Google search URLs, image search pages, article pages, or documentation pages.
Do not include Mermaid diagrams; use an image URL instead if a rendered diagram is needed.
For comparisons, use standalone vs lines.

Topic:
[paste topic here]

Comparison rule:
Prefer `## Compare` with `A vs B`, then matching `## A` and `## B` blocks. Use standalone `vs` lines only when writing all columns inside one Compare block.
```
