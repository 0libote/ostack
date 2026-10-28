# ostack redesign

Full redesign of `/`, implemented in `site/index.html` and `site/styles.css`.
New assets: `site/tokens.css`, `site/base.css`, and licensed local fonts.
No original files, routes, skill entries or functional features removed. No runtime dependencies added.

## Direction

Console, graphite colourway, dealt 1/3. Banner hero, masthead navigation,
Index-First catalog and colophon footer. Signature: interactive command specimen.
Draw 6433a5 suggested a FAQ; the existing 13-skill collection needs a searchable
index, so the index replaces that shape. There is no pricing or FAQ content to add.
Audience: developers using Claude Code or Codex. Action: browse and install skills.
Tone: technical and restrained. User confirmed there were no design preferences.

## Verification

- Final render sweep: Floor 0 FAIL, Reflex 0, WARN 0.
- Preserved: 18/18 links, 1/1 fields, 18/18 script hooks, 17/17 recorded headings.
- Screen-budget note: 128 words in the densest catalog viewport. Redesign keeps the original catalog descriptions; this is reported as a note by Hallmark.
- Existing Python catalog checks and JavaScript syntax check passed.
- Chromium interaction checks passed: all 13 previews, every category, search,
  empty/reset states, install-agent selection, copy success and failure, no-script
  catalog, font loading, no script errors, and no document overflow at eight
  widths (320, 375, 640, 768, 960, 1280, 1440, 1920).
- Hero and finish reviews ran in-thread. Hero review fixed the local font
  declarations. Finish review: ship; Console materials carry through the page.
- The previous two-column index was shorter. The new index trades that compactness
  for larger text and clearer alignment across skill names, descriptions and actions.
- No deployment or external-service testing performed.

## Copy and material

Hero before: “Thirteen skills for the work around the code. Review a change,
finish a pull request, or clean up a draft. Copy the ones you need.”

Hero after: “Thirteen editable skills for Claude Code and Codex.”

The supporting Claude Code/Codex line is folded into that sentence; Plain Markdown,
Open source and Editable move into the existing principles strip. All 13 skill
names, taglines, descriptions, commands, workflow steps, install commands,
requirements and licenses remain. The redundant “What this skill does” label and
simulated terminal window decoration are removed. No facts, figures, quotes or
photographs were invented. No image or missing-fact slots are needed. A real
recording of one skill in use would be the most useful optional future material.

## Review artifacts

`site/.hallmark/compare.html` contains before and after captures.
`site/.hallmark/shots/` contains desktop folds and full desktop/mobile captures.
These generated artifacts are ignored by Git.
