---
title: "Chapter 5 — Branches and Merging — Solutions"
aliases:
  - "11-Dev-101/Git-101/05-branches-and-merging/solutions"
  - "11-Dev-101/Git-101/05-branches-and-merging/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|back to the chapter]]

---

```bash
# 1
git branch

# 2
git branch -m main          # only if it was called master

# 3
git switch -c feat/colortheme
# or:  git checkout -b feat/colortheme

# 4
cat .git/HEAD
cat .git/refs/heads/feat/colortheme

# 5
echo "dark colors" >> theme.md
git add . && git commit -m "add the dark colors"
echo "more colors" >> theme.md
git add . && git commit -m "add more colors"

git switch main
cat theme.md               # No such file or directory. it lives on the other branch.

# 6
git merge feat/colortheme
# Fast-forward. main had not moved since u branched, so git only slid the pointer.

# 7
git branch -d feat/colortheme
git log --oneline --graph --all

# 8
git switch -c feat/conflict
echo "the branch version" > line.md
git add . && git commit -m "line from the branch"
git switch main
echo "the main version" > line.md
git add . && git commit -m "line from main"
git merge feat/conflict

# 9
git status
cat line.md
# above the ======= is HEAD, which is main, which is MINE
# below it is feat/conflict, which is what is coming IN

# 10
git merge --abort
git status -s              # nothing. as if u never typed merge.

# 11
git merge feat/conflict
# edit line.md by hand until it is:
#   the main version
#   the branch version
# and the <<<<<<< ======= >>>>>>> lines are gone
git add line.md
git commit

# 12
git switch -c feat/conflict2
echo "branch again" > line.md
git add . && git commit -m "branch again"
git switch main
echo "main again" > line.md
git add . && git commit -m "main again"
git merge feat/conflict2
git checkout --ours line.md
git add line.md
git commit

# 13
git worktree add -b hotfix ../practice-hotfix
git worktree list
git worktree remove ../practice-hotfix
git branch -d hotfix

# and the refusal:
git worktree add ../practice-main main
```

output of 6:

```
Updating 79e91e0..fb31aea
Fast-forward
 theme.md | 2 +
 1 file changed, 2 insertions(+)
```

output of 8:

```
Auto-merging line.md
CONFLICT (content): Merge conflict in line.md
Automatic merge failed; fix conflicts and then commit the result.
```

output of 9, the file:

```
<<<<<<< HEAD
the main version
=======
the branch version
>>>>>>> feat/conflict
```

output of 13, the list:

```
/home/ati/practice-git       fb31aea [main]
/home/ati/practice-hotfix    fb31aea [hotfix]
```

output of 13, the refusal at the end:

```
Preparing worktree (checking out 'main')
fatal: 'main' is already used by worktree at '/home/ati/practice-git'
```

- in step 6 it was a fast forward because `main` had **no commits of its own** since the
  branch was made. there was nothing to combine, so there is no merge commit. do step 8
  and u get the other kind, because both sides moved.
- in step 10, `--abort` is the command to remember. any time a conflict confuses u, this
  puts u back before it started and costs u nothing.
- in step 12, `--ours` means the branch u are standing on, which is `main`. it is not
  "the good one", it is "the one i am on", and during a rebase that flips around.
- in step 13, the refusal is the lesson, not a mistake: u are standing in the worktree
  that already has `main` checked out, and a branch can only live in one worktree at a
  time. that is also why the first half of the step made a **new** branch instead.

---

[[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|back to the chapter]]
