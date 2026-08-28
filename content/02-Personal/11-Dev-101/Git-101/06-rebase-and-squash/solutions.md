---
title: "Chapter 6 — Rebase and Squash — Solutions"
aliases:
  - "11-Dev-101/Git-101/06-rebase-and-squash/solutions"
  - "11-Dev-101/Git-101/06-rebase-and-squash/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|back to the chapter]]

---

```bash
# 1
git switch -c feat/login
echo "the form"  > login.md && git add . && git commit -m "add login form"
echo "the style" >> login.md && git add . && git commit -m "style the login form"
echo "the fix"   >> login.md && git add . && git commit -m "fix the login typo"

# 2
git switch main
echo "main work" >> notes.md && git add . && git commit -m "main moved on"
git log --oneline --graph --all

# 3
git switch feat/login
git log --oneline          # write these 3 hashes down somewhere
git rebase main
git log --oneline --graph --all

# 4
git log --oneline          # every hash is different
# the commits got a new parent, and a commit contains its parent's hash,
# so they are new objects. same changes, new ids.

# 5
git rebase -i HEAD~3
# in the editor, leave the first line as pick, change the other 2 to squash:
#   pick   47b352d add login form
#   squash d38d285 style the login form
#   squash 440ee6a fix the login typo
# save, then in the second editor delete everything and write:
#   add the login form

# 6
cat login.md               # all 3 lines are still there
git log --oneline          # but it is 1 commit now

# 7
git switch -c feat/clash main
echo "the branch line" > shared.md && git add . && git commit -m "branch edits shared"
git switch main
echo "the main line" > shared.md && git add . && git commit -m "main edits shared"
git switch feat/clash
git rebase main

# 8
git status
cat shared.md
# HEAD is MAIN here, not my branch. rebase replays my commits ON TOP of main,
# so main is already checked out and mine is the one being applied.

# 9
# edit shared.md, keep what u want, delete the markers
git add shared.md
git rebase --continue

# 10
git reset --hard HEAD~1        # put the branch back into a clashing state
git rebase main
git rebase --abort
git status -s                  # clean

# 11
git config --global rerere.enabled true
# cause the conflict, fix it, commit
# then undo and cause the exact same conflict again:
git reset --hard HEAD~1
git rebase main

# 12
git log --oneline --graph --all
```

output of 3, after the rebase:

```
Successfully rebased and updated refs/heads/feat/login.
```

output of 5, after the squash:

```
2ee7a49 (HEAD -> feat/login) add the login form
34cbc09 (main) main moved on
```

output of 8, the file:

```
<<<<<<< HEAD
the main line
=======
the branch line
>>>>>>> 078785c (branch edits shared)
```

output of 11, the second time:

```
Auto-merging shared.md
CONFLICT (content): Merge conflict in shared.md
Resolved 'shared.md' using previous resolution.
```

- in step 4, this is the single most important idea in the chapter. rebase does not move
  ur commits, it **rebuilds** them. that is why u never do it to something other people
  already pulled.
- in step 8, `HEAD` is `main`. during a merge, `HEAD` is u. during a rebase, it is the
  branch u are landing on. read the markers, not the words "ours" and "theirs".
- in step 11, git still stopped and still made u `git add` it. `rerere` fills in the
  answer, it does not finish the job for u.
- answer for 12: one straight line, no forks, because everything u did in this chapter
  was rewriting the branch instead of joining it.

---

[[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|back to the chapter]]
