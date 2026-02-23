# PREVENT_CONFLICTS.md

## Goal
Enable parallel agentic development on the `llm-micro` codebase with minimal merge conflicts. The strategy focuses on file decomposition, explicit typing, and granular testing to isolate changes and reduce the surface area for collisions.

## Analysis of Current State

### Monolithic Files
The codebase currently relies on large, multi-purpose files:
- `src/index.ts`: Acts as both a library entry point and a CLI application. It contains logic for the REPL, command parsing, and signal handling, alongside re-exports.
- `src/lib.ts`: A barrel-like file containing a mix of unrelated functionalities: SSE handling, HTTP client logic, stream processing, Gemini API URL construction, and general utilities.

### Mixed Responsibilities
Files mix different concerns (e.g., Browser-specific code in `src/browser.ts` importing from the generic `src/lib.ts`, which contains Node.js specific code like `process` checks). This coupling makes it hard to change one part without affecting others.

### Underutilized Typing
- `src/types.ts` is minimal, containing only the `Message` type.
- Complex types are often inferred or defined inline (e.g., in `chat`, `stream` functions), making it harder for agents to understand interfaces without deep code analysis.

### Testing
- Tests are sparse (`tests/stream.test.ts` is largely empty).
- Lack of granular tests means changes in `src/lib.ts` might break unrelated features without clear feedback.

## Action Items

### 1. Decompose `src/lib.ts` (Completed: 2025-02-17)
Split `src/lib.ts` into focused, single-responsibility modules. Suggested breakdown:
- **`src/sse.ts`**: functions `toSSE`, `asSSE`, `data` (parsing SSE lines), `sse` (generator).
- **`src/net.ts`**: `post` function and other HTTP helpers.
- **`src/stream.ts`**: `decode`, `lines`, `collect`, `tee`, `append`, `withAbort`.
- **`src/chat.ts`**: `chat`, `stream` (the high-level one), `Message` helpers (`user`, `model`), `join`.
- **`src/utils.ts`**: `env`, generic utilities.
- **`src/gemini.ts`**: `url` (API URL construction specific to Gemini).

### 2. Refactor `src/index.ts` (Completed: 2025-02-17)
Separate the CLI application from the library entry point:
- Move REPL logic to **`src/cli/repl.ts`**.
- Move command parsing to **`src/cli/commands.ts`**.
- Keep `src/index.ts` only for exporting the public library API.

### 3. Expand and Enforce Typed Specifications
- Create dedicated type definition files or co-locate types with their modules.
- Ensure all exported functions have explicit return types.
- Avoid `any` and use generics where appropriate (already partially done, but needs consistency).

### 4. Granular Testing
- Create separate test files for each new module (e.g., `tests/sse.test.ts`, `tests/chat.test.ts`).
- This allows agents to write and run tests for specific features without modifying a shared test file, reducing conflicts.

### 5. No Barrel Files for Internal Imports
- Agents and internal modules should import directly from the source file (e.g., `import { toSSE } from './sse'`) rather than from a barrel file.
- This prevents "import loops" and reduces the need to constantly update a central export file when adding new features.
