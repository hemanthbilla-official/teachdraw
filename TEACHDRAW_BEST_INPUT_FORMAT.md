# TeachDraw Screen-Ready Markdown Format

Use this file as the instruction prompt for generating TeachDraw Markdown.

The generated Markdown will be shown directly on a projected screen as whiteboard notes. It must look like polished teaching notes, not a spoken script.

## Master Prompt

```text
Create TeachDraw Markdown for screen-ready programming whiteboard notes.

Return only Markdown.
Use frame-based TeachDraw format.
Each `# Frame X: Title` is one whiteboard section.

Target level:
- Beginner to intermediate programming.
- Bootcamp-style pacing.
- Clear, direct, visual board notes.

Writing style:
- Write direct whiteboard notes.
- Keep text screen-friendly.
- Use short paragraphs with complete meaning.
- Prefer 3-6 useful teaching lines per explanation block.
- Explain what the concept means.
- Explain why the concept matters.
- Include concrete examples.
- Include code walkthroughs after code.
- Include important points and memory lines.
- Preserve all programming symbols exactly.
- Use ASCII punctuation.

Content rules:
- No oral teaching script.
- No questions.
- No audience answers.
- No Q&A prompts.
- No planning notes.
- No references to the person teaching.
- No references to the audience.
- No references to the current day or session.
- No broken encoding characters.

Frame quality:
- Every frame teaches one clear idea.
- Concept frames include topic context, core idea, meaning, example, important point, and memory line when useful.
- Code frames include before-code context, code, code walkthrough, what to notice, test step, and important point when useful.
- Flow frames include a clear process flow, meaning, and important point.
- Comparison frames include balanced columns and clear use cases.
- Mistake/fix frames include wrong version, correct version, why the fix works, and important point.
- Practice frames include task, requirements, test steps, expected output, and debug checklist.

Frame count:
- Short topic: 8-12 frames.
- Full lesson: 18-30 frames.
```

## Supported Layout Comments

Place one layout comment immediately after every frame heading.

```md
# Frame 1: Topic Big Picture
<!-- layout: concept-focus -->
```

Use these layout comments:

```md
<!-- layout: concept-focus -->
<!-- layout: code-focus -->
<!-- layout: flow-focus -->
<!-- layout: mistake-fix -->
<!-- layout: practice-grid -->
<!-- layout: comparison -->
<!-- layout: recap -->
```

## Best Heading Names

TeachDraw works best with these headings:

```md
## Topic Context
## Core Idea
## Problem
## Meaning
## Why It Matters
## Definition
## Example
## Flow
## Decision
## Before Code
## Code
## Commands
## Code Walkthrough
## What To Notice
## Request
## Response
## Test In Docs
## Compare
## Mistake
## Correct
## Why The Fix Works
## Important
## Key Point
## Memory Line
## Warning
## Practice Task
## Requirements
## Test Steps
## Expected Output
## Debug Checklist
## Final Instruction
## Assignment
## Recap
## Next Topic
```

## Recommended Lesson Shape

Use this shape for a full programming lesson:

```md
# Frame 1: Topic Big Picture
# Frame 2: Topic Flow
# Frame 3: Recap Of Required Knowledge
# Frame 4: Problem To Solve
# Frame 5: Core Concept
# Frame 6: Visual Flow
# Frame 7: Starter Code
# Frame 8: Main Code Step 1
# Frame 9: Main Code Step 2
# Frame 10: Request Example
# Frame 11: Response Example
# Frame 12: Code Meaning
# Frame 13: Common Mistake
# Frame 14: Correct Version
# Frame 15: Validation Or Debug Case
# Frame 16: Practice Task
# Frame 17: Recap
# Frame 18: Next Topic
```

For larger topics, repeat this pattern:

```text
Concept -> Flow -> Code -> Meaning -> Mistake/Fix -> Test -> Practice
```

## Concept Frame Format

```md
# Frame 1: Request Body Big Picture
<!-- layout: concept-focus -->

## Topic Context

GET APIs read existing backend data.

POST APIs send new data to the backend.

Request body is used when the data has multiple fields.

A full object should travel as JSON inside the request body.

## Core Idea

Request body carries data from the client to the backend.

For POST APIs, the request body usually contains JSON.

FastAPI reads that JSON and passes it to the route function.

Pydantic checks the structure before the function logic runs.

## Why It Matters

Real applications send form data to the backend.

Create account, add product, create post, and submit profile are POST-style actions.

The URL selects the API.

The request body carries the object data.

## Example

```json
{
  "id": 3,
  "title": "Python Basics",
  "author": "Code Team",
  "genre": "Technology",
  "language": "English"
}
```

## Important

GET reads existing data.

POST sends new data.

## Memory Line

URL selects the API.

Request body carries the data.
```

## Flow Frame Format

```md
# Frame 2: POST Request Flow
<!-- layout: flow-focus -->

## Flow

Client sends JSON body
->
FastAPI receives POST request
->
FastAPI matches route
->
Pydantic checks required fields
->
Pydantic checks data types
->
Route function receives `book`
->
Backend stores the data
->
JSON response returns

## Meaning

The request body is not trusted blindly.

FastAPI first connects the request to the correct route.

Pydantic validates the incoming JSON against the model.

Only valid data reaches the function as a usable object.

## Important

Validation happens before the main route logic finishes.
```

## Code Frame Format

````md
# Frame 6: Create Book Model
<!-- layout: code-focus -->

## Before Code

The backend needs a clear shape for incoming book data.

The model lists required fields.

Each field also has a data type.

FastAPI uses this model to validate the request body.

## Code

```python
from pydantic import BaseModel

class Book(BaseModel):
    id: int
    title: str
    author: str
    genre: str
    language: str
```

## Code Walkthrough

`Book` is the model name.

`BaseModel` gives the model Pydantic validation behavior.

`id: int` means the request body should send a number.

`title`, `author`, `genre`, and `language` should be text values.

## What To Notice

The model does not create an API by itself.

It defines the expected request body structure.

The route function uses this model as a parameter type.

## Important

The request body should match the Pydantic model.
````

## API Route Frame Format

````md
# Frame 9: Create POST Books API
<!-- layout: code-focus -->

## Before Code

The route receives one new book from the request body.

FastAPI converts the JSON body into the `book` parameter.

The data is converted to a normal dictionary.

The dictionary is added to the temporary `books` list.

## Code

```python
@app.post("/books")
def create_book(book: Book):
    new_book = book.model_dump()
    books.append(new_book)

    return {
        "message": "Book added successfully",
        "book": new_book
    }
```

## Code Walkthrough

`@app.post("/books")` creates a POST endpoint.

`book: Book` tells FastAPI to read the request body using the `Book` model.

`book.model_dump()` converts the Pydantic object into a Python dictionary.

`books.append(new_book)` adds the new book to the list.

The returned dictionary becomes the JSON response.

## Test In Docs

Open `/docs`.

Choose `POST /books`.

Click `Try it out`.

Paste valid JSON.

Click `Execute`.

## Important

The model must exist before the route uses it.
````

## Request And Response Frame Format

````md
# Frame 10: POST Request And Response
<!-- layout: code-focus -->

## Request

```json
{
  "id": 3,
  "title": "Python Basics",
  "author": "Code Team",
  "genre": "Technology",
  "language": "English"
}
```

## Response

```json
{
  "message": "Book added successfully",
  "book": {
    "id": 3,
    "title": "Python Basics",
    "author": "Code Team",
    "genre": "Technology",
    "language": "English"
  }
}
```

## Meaning

The request body enters the backend as the `book` parameter.

The backend stores the new book in the list.

The response confirms the saved data.

## Important

JSON uses double quotes.

The request body should not use Python dictionary syntax.
````

## Comparison Frame Format

```md
# Frame 5: GET vs POST
<!-- layout: comparison -->

## Compare

GET

- Reads existing data
- Commonly tested in the browser
- Data can come from path parameters
- Data can come from query parameters
- Example: `GET /books`

vs

POST

- Sends new data to the backend
- Usually needs request body
- Request body usually contains JSON
- Commonly tested using `/docs`, Postman, or frontend forms
- Example: `POST /books`

## Important

GET asks the backend for data.

POST gives the backend new data.

## Memory Line

GET = read.

POST = create or send.
```

## Three-Column Comparison Format

```md
# Frame 7: Path, Query, Body
<!-- layout: comparison -->

## Compare

Path Parameter

- Part of the URL path
- Identifies one resource
- Example: `/books/3`
- Best for selecting one item by ID

vs

Query Parameter

- Comes after `?` in the URL
- Filters a collection
- Example: `/books?genre=Fiction`
- Best for searching and filtering

vs

Request Body

- Sent inside the request
- Carries full object data
- Example: JSON for a new book
- Best for POST and form submissions

## Important

Path identifies.

Query filters.

Body sends object data.
```

## Mistake/Fix Frame Format

````md
# Frame 13: Missing BaseModel Import
<!-- layout: mistake-fix -->

## Mistake

`BaseModel` is used before it is imported.

Python cannot create the model because `BaseModel` is unknown.

```python
from fastapi import FastAPI

class Book(BaseModel):
    id: int
    title: str
```

## Correct

`BaseModel` is imported from Pydantic before the model is created.

```python
from fastapi import FastAPI
from pydantic import BaseModel

class Book(BaseModel):
    id: int
    title: str
```

## Why The Fix Works

`BaseModel` comes from Pydantic.

The model can inherit from `BaseModel` only after the import exists.

## Important

Request body models need `BaseModel`.
````

## Practice Frame Format

```md
# Frame 16: Practice Task
<!-- layout: practice-grid -->

## Practice Task

Create and test a POST API for adding books.

## Requirements

- Keep the existing `books` list
- Create a `Book` Pydantic model
- Add fields: `id`, `title`, `author`, `genre`, `language`
- Create `POST /books`
- Convert the model using `model_dump()`
- Append the new book to the list
- Return a success message and the added book

## Test Steps

- Open `/docs`
- Click `POST /books`
- Click `Try it out`
- Send one valid book JSON
- Click `Execute`
- Run `GET /books`
- Confirm the new book appears

## Expected Output

`GET /books` returns old books plus the newly added book.

The POST response shows a success message.

## Debug Checklist

- Check the imports
- Check JSON double quotes
- Check all required fields
- Check `id` is a number
```

## Recap Frame Format

```md
# Frame 17: Recap
<!-- layout: recap -->

## Recap

GET reads existing backend data.

POST sends new data to the backend.

Request body carries JSON data.

Pydantic models define the expected body structure.

FastAPI validates incoming data before route logic runs.

`model_dump()` converts a Pydantic object into a Python dictionary.

## Important

Request body is the main idea of POST APIs.

Pydantic makes request body data safer and predictable.

## Memory Line

Request body sends data.

Pydantic checks data.

POST creates data.
```

## Code Fence Rules

Use code fences like this:

````md
```python
from fastapi import FastAPI
```
````

The code block content should contain only real code.

The language name belongs only after the opening fence.

## FastAPI POST Checklist

Include these parts for request-body lessons:

- `from fastapi import FastAPI`
- `from pydantic import BaseModel`
- `app = FastAPI()`
- Starter data list
- Pydantic model
- `POST /books` route
- `book: Book` parameter
- `book.model_dump()`
- `books.append(new_book)`
- Request JSON example
- Response JSON example
- `/docs` testing steps
- Validation mistake/fix examples
- Practice task

## Final Output Checklist

```text
1. The output is only Markdown.
2. Every frame has one layout comment.
3. Every frame has one clear teaching idea.
4. No questions are included.
5. No Q&A script is included.
6. No planning notes are included.
7. Code blocks contain only real code.
8. Code examples include walkthrough notes.
9. Important points are short and strong.
10. The notes are ready to show on screen.
```
