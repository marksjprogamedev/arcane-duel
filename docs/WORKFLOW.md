# Working together: Jesse and Mark

Short rules are in `AGENTS.md`. This is the detail and the why.

## Branches and owners

| Branch       | Owner | Slot                       | Bumps version? |
| ------------ | ----- | -------------------------- | -------------- |
| `test-jesse` | Jesse | http://159.13.37.255:8082/ | yes            |
| `test`       | Mark  | http://159.13.37.255:8081/ | no             |
| `test-adnan` | Adnan | http://159.13.37.255:8083/ | no             |
| `main`       | both  | http://159.13.37.255/      | set on merge   |

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

1. Mark merges `origin/test-jesse` into `test`, tests on :8081, pushes, and tells Jesse.
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

## Merging into `main`

Pull request, regular merge (not squash), only when the human asks. Afterwards fast-forward `test`
and `test-jesse` to `main` (`git merge --ff-only origin/main`). Slot and deploy detail:
`docs/DEPLOY-ORACLE.md`.
