# Working together: Jesse and Mark

Short rules are in `AGENTS.md`. This is the detail and the why.

## Branches and owners

| Branch       | Owner | Slot                                  | Bumps version? |
| ------------ | ----- | ------------------------------------- | -------------- |
| `test-jesse` | Jesse | https://jesse.arcaneduel.duckdns.org/ | yes            |
| `test`       | Mark  | https://mark.arcaneduel.duckdns.org/  | no             |
| `test-adnan` | Adnan | https://adnan.arcaneduel.duckdns.org/ | no             |
| `main`       | both  | https://arcaneduel.duckdns.org/       | set on merge   |

Why: on 2026-10-14 Mark's AI committed a hat redesign straight onto `test-jesse` and then reverted
it. One owner per branch, and a branch check before every commit, prevents that.

## Versions

One version line (`0.x.y-z`), owned by Jesse. Two people bumping it in parallel conflicts in five
files on every merge, so Mark does not bump. His changelog entry names the version he was on:
`## Mark, on 0.2.3-0 - 2026-10-15 AWST - Wizard hats`. Jesse's merge of `test` is followed by his own
bump. `npm run check-version` (Jesse's branch) fails if the version places disagree.

## Git hooks

`npm install` points git at `.githooks/`: **pre-commit** formats the staged files with Prettier, and
**pre-push** runs Prettier's check, the typecheck and the tests, so unformatted or broken code can't
be pushed by accident. If the hooks are not running, run `npm run prepare` once. `--no-verify` skips
them; don't, except in an emergency.

## Day to day: start with a merge, end with a push

- **Start:** `git pull`, then merge the other person's branch into yours (Mark: `origin/test-jesse`;
  Jesse: `origin/test`). Use a merge, not a rebase, on a pushed branch: a rebase rewrites commits the
  other person may already have. Conflicts are resolved by whoever is merging. Expected ones: the top
  of `CHANGELOG.md` (keep both entries), the checklist (keep both sections).
- **End:** commit, run the checks, `git push`. Unpushed work is invisible to the other branch, to the
  slot and to the other AI.

## Handing Mark's work to Jesse (fast-forward when possible)

1. Mark merges `origin/test-jesse` into `test`, tests on https://mark.arcaneduel.duckdns.org/, pushes, and tells Jesse.
2. Jesse runs `git merge --ff-only origin/test`. It works if Jesse has not pushed since step 1.
3. If it refuses, Mark merges `origin/test-jesse` again (step 1), or Jesse does a normal merge.
4. Jesse then bumps the version and, for Mark's entries, only checks they read well.

Jesse pushes small and often, so Mark's base is rarely stale.

## Testing prompts

- After a push: the assistant names the slot URL for this branch and the checklist sections to run
  (new ones, plus section 7 regression). Deploy takes ~25 s.
- Before a merge: run the checklist on your own slot. Merge on no `[!]` items, or when the human
  accepts them.
- After a merge: run section 7 on the merged branch's slot, because the merged code is what ships.
- Failures are recorded, not fixed mid-test, and passed to the code owner.
- Accounts belong to a slot (each has its own database): make test accounts on your own slot. Test them off
  the work network, which intercepts HTTPS.

## Merging into `main`

Pull request, **squash merge** (one commit per release keeps `main` clean; since 2026-10-22), only
when the human asks. A squash means the branch's own commits never land on `main`, so a fast-forward
no longer works: afterwards merge `main` back into `test` and `test-jesse` (`git merge origin/main`; no conflicts, the trees are the same) so the next PR shows only new work. Never force-push or reset a branch to do this. Slot and deploy detail:
`docs/DEPLOY-ORACLE.md`.

**What `main` looks like.** One commit per feature version, oldest first, titled
`<major.minor.feature> - <title>` with no `-N` commit suffix (e.g. `0.31.2 - Spellbook demo: dummy in
Flamethrower reach, wizards stand low`). Fixes on a feature (`-1`, `-2`, ...) go in with it. Give the
squash commit that title when merging the PR; a PR that carries several feature versions becomes one
commit titled with the newest, e.g. `0.30.4 - 0.28.0 to 0.30.4: ...`. The per-commit detail stays on
the branch the PR came from and in `CHANGELOG.md`.

**History rewrite (2026-10-22).** `main` was rebuilt once into that shape: the old 889 commits became 97,
an initial import plus one commit per feature version from 0.0.0 to 0.31.2, each holding the code as it
stood when that version was finished, with its title from `CHANGELOG.md`. The final code was unchanged.
`test`, `test-jesse` and `test-adnan` were force-pushed to start from the new `main`. Consequences:
closed PRs #1 to #34 still point at the old commits; a clone made before the rewrite has the old history
and must be re-cloned (or hard-reset to `origin/<branch>`), never pushed, or the old commits come back.
0.28.0 to 0.30.4 are one commit because PR #33 had already been squashed. This was a one-off: don't
rewrite `main` again.
