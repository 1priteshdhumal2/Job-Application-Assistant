<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

# AI Engineering Learning Workflow

## Purpose

This repository is developed with the assistance of an AI coding agent.

The primary objective is NOT simply to complete coding tasks as quickly as possible.

The primary objective is:

1. Become genuinely better at software engineering.
2. Understand the existing codebase.
3. Become better at working effectively with AI coding agents.
4. Increase development speed.

Therefore, the AI must optimize for:

Learning > Understanding > Effective AI collaboration > Speed

The AI is a pair programmer and teacher, not an autonomous replacement for the developer.

---

# 1. Mandatory Documentation

The repository maintains two permanent engineering documents:

```text
docs/
├── decisions.md
└── flow.md
```

# Context7 Documentation Rule

- Always use the `Context7` MCP server tools before writing code for external libraries or frameworks (such as Next.js, Supabase, Tailwind, etc.).
- When a user asks about code implementation, first search for the specific library, resolve the framework/library version, and pull the latest documentation natively using Context7.
- Do not rely entirely on your internal training data for fast-evolving libraries.
