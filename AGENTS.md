# Rules for AI assistants (Claude, ChatGPT, Codex, ...)

Two people work here at the same time: **Jesse on `test-jesse`**, **Mark on `test`**. Detail and
reasons: `docs/WORKFLOW.md`. Follow these exactly.

1. **Branch check first.** Before any edit, commit or push run `git branch --show-current`. Work only
   on your human's branch (or one off it). Wrong branch? Stop and ask. Never commit to or push
   someone else's branch, and never revert or rewrite their commits.
2. **Start of every session: pull, then merge Jesse's branch.** `git pull`, `git fetch`, then
   `git merge origin/test-jesse` (Mark; Jesse merges `origin/test` instead). Resolve conflicts, run
   the checks (rule 6), and only then start work. Do not start on a stale base.
3. **End of every session: push.** Commit, run the checks, `git push`. Never leave work only on the
   laptop. Then tell the human the slot URL to test (rule 7).
4. **Versions belong to Jesse.** Only `test-jesse` bumps the version (four places, see top of
   `CHANGELOG.md`). Mark never bumps: he adds a `CHANGELOG.md` entry headed
   `## Mark, on <version he is on> - <date> AWST - <title>`.
5. **Every feature adds its manual test items** to `docs/TEST-CHECKLIST.md` (section tagged with the
   version you are on, same commit as the code). Not finished without them.
6. **Checks before every push:** `npm test`, `npm run typecheck`, `npx prettier --check .`
   (Jesse also `npm run check-version`). Git hooks (installed by `npm install`) format staged files on
   commit and run these checks on push. Never bypass them with `--no-verify`.
7. **Test on your own slot:** `test-jesse` = http://159.13.37.255:8082/, `test` = :8081, `test-adnan` = :8083, `main` = port
   80 (deploys ~25 s after a push). After a push, name the URL and the checklist sections to run.
   Before a merge and after a merge, run the checklist there (section 7 = regression).
8. **Merging into your human's branch is fine; into `main` only by PR, only when the human says so.**
9. **Code rules:** `shared/sim` stays pure (no visuals); new snapshot fields go in
   `shared/sim/snapshot.ts`; use `game.map`, not 800x600; tuning numbers in `shared/constants.ts`.
10. **Bubbles follow one rule, written in `docs/BUBBLES.md`.** Any change to how a bubble treats a spell updates
    that file and `tests/sim/bubble-matrix.test.ts` in the same commit; exceptions must be listed there.
11. **Menu UI uses the shared components, written in `docs/UI.md`.** New or changed menu screens are built from
    `.ui-*` classes (`client/public/ui/theme.css`, `components.css`); no hard-coded colours, no new `button` rules, no
    inline `style=""` for looks. A missing component goes into `components.css` and `/ui/styleguide.html`, not the page.
12. **No AI attribution** (Co-Authored-By, "Generated with") in commits or PRs.

Working on code? Read `docs/HANDOFF.md`, then `docs/ARCHITECTURE.md`. Building or changing a menu? Read `docs/UI.md`. Asked to test the game? Follow
`docs/TEST-CHECKLIST.md`.
