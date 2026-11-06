---
name: rich-chat
description: Produce rich output in T3 Code chat using Markdown tables, math, Mermaid, and inline HTML charts or interactive examples. Use when asked for formatting examples, a chat visual, or when a comparison or explanation benefits from rich output.
---

# Rich chat

Deliver the requested content in the user's current thread. A plan, report, saved file, or render in a child thread alone does not deliver a requested chat example.

## Fast path

- Markdown needs no tool discovery. Emit tables, task lists, code fences, math (`$...$` / `$$...$$`), or Mermaid fences directly when they fit. Use blank lines around blocks. Don't wrap the whole example in a code fence unless the user requests source.
- Use inline HTML for custom visuals and interaction. For a requested demo, produce a small working example immediately; research renderer internals only if troubleshooting is requested.
- Do small formatting tasks yourself. Avoid delegation, high-effort investigations, dependency setup, servers, and exhaustive feature tests for a basic example. Respect any explicit model/delegation request.
- For a mixed Markdown/HTML demo, deliver both. Keep the final explanation short. Ordinary text answers need no decorative visual.

## Discover HTML tools only when needed

Use available `html_preview` and `html_render` directly after reading their schemas. Tool prefixes vary by environment; do not copy a namespace from a transcript.

If OpenCode exposes tools through `execute`/`search`, search for `html_render` with a generous result limit (e.g. 50). If missing, broaden once to `t3` with limit 100 and follow pagination as needed, then use the actual returned paths. Namespace filtering is optional and must use the discovered namespace. Stop searching once both tools are found.

With Codex deferred tools, find names ending in `html_preview` / `html_render` in the available tool metadata. Do not assume OpenCode's `search` exists on other providers.

Generic `browser.preview` opens a file pane; browser `preview_*` tools automate tabs. Neither substitutes for `html_render` displaying content in chat. If tools remain unavailable after the expanded discovery attempt, state the limitation and deliver Markdown plus requested HTML source/file. Do not claim an inline render succeeded.

## Produce and show HTML

1. Build a complete self-contained HTML document with inline CSS and any needed JS. Prefer a small SVG/CSS visual over new libraries for simple examples.
2. Call `html_preview` with the HTML. Inspect the returned image, content height, and console output. Fix visible failures before proceeding. Check a narrow width too if responsive behavior matters.
3. Call `html_render` with the same checked HTML, a descriptive title, and the preview height within the tool's accepted range. Preview alone does not show the final interactive visual to the user. Do not end with only a screenshot path or an HTML code fence when an inline visual was requested.
4. Link saved artifacts when files were requested. A saved HTML file and an inline render serve different needs; provide both when asked for both.

Follow current tool schema over remembered details. Leave html/body and the outer wrapper transparent with no outer card, banner, border, or side padding. Use fluid widths, fixed pixel chart heights, and theme variables such as `--foreground`, `--border`, `--chart-1`, `--radius`, and `--font-sans`. Avoid `vh` and root `height:100%`. Add labels for controls and visible keyboard focus.

No server is needed. Browser-tab automation is separate and should be used only when the user requests browser work; follow its status/open/cleanup rules then.

## Finish honestly

A successful screenshot or empty console is not proof that buttons work. State unverified interactions briefly when relevant; don't call them broken without evidence. Emitted Markdown is not independent proof of its visual rendering. Do not inspect client bundles merely to justify ordinary Markdown.

When delegating a visual task, give the child a concrete artifact and completion criterion. Before handing back, inspect its files and render its HTML in the parent thread; emit the requested Markdown here. Do not assume child attachments appear in the parent conversation.

For small reusable syntax examples, read [references/examples.md](references/examples.md) only if useful. Adapt them to the user's content.
