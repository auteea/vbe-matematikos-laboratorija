<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Topics and mock-exam templates live in src/config/topics.ts and src/config/examTemplates.ts; the user edits them, so read structure from there instead of hardcoding.
- Exam-paper look is built from utilities in src/styles.css (btn-primary, btn-secondary, exam-input, exam-label, double-rule, .exam-sheet); reuse them so all pages stay black-on-white with radius 0.
- Print uses window.print() with body[data-print="tasks"|"solutions"] and .no-print/.print-only classes.
- Step 1 uses mock data in src/data/mockSets.ts; replace with Lovable Cloud reads when the backend is added.
- Generation logic lives in src/lib/generation: plan.ts (task slots and topic mix, read from the config files), prompts.ts (creator/solver prompts, save_task and submit_answers tool schemas, example selection), validate.ts (structural checks), pipeline.ts (generateCheckedTask: creator → validate → solver → compare, at most 2 retries) and runner.ts (client queue, 3 calls in parallel). src/lib/answers.ts compares answers with mathjs.
- The backend generate-task must call generateCheckedTask and only supply callTool (one Lovable AI gateway call with the tool forced) plus the database reads and writes. Do not re-implement the prompts or the answer check.
- Until the backend exists, /generuoti uses createMockGenerator (src/lib/generation/mockGenerator.ts); replace it with a call to generate-task.
- Answers are AnswerItem objects {type, value, display} (src/lib/types.ts); tasks.answer stores that array.
