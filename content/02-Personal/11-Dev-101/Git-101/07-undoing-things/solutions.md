---
title: "Chapter 7 — Undoing Things — Solutions"
aliases:
  - "11-Dev-101/Git-101/07-undoing-things/solutions"
  - "11-Dev-101/Git-101/07-undoing-things/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|back to the chapter]]

---

```bash
# 1
echo "a new line" >> Readme.md
git diff

# 2
git add Readme.md
git diff
# empty. `git diff` compares the working dir with the STAGING AREA,
# and u just made them identical by staging.

# 3
git diff --staged

# 4
git restore --staged Readme.md
git restore Readme.md
git status -s              # clean. and that change is gone for good.

# 5
echo "hi" > will_reset.md
git add . && git commit -m "will reset this"
git reset --soft HEAD~1
git status                 # Changes to be committed

# 6
git commit -m "will reset this"
git reset HEAD~1           # --mixed is the default
git status                 # untracked / not staged

# 7
git add . && git commit -m "will reset this"
git reset --hard HEAD~1
ls                         # will_reset.md is gone from the disk

# 8
echo "one" > file.txt && git add . && git commit -m "file.txt"
echo "two" > file2.txt
git add file2.txt
git commit --amend --no-edit

# 9
git commit --amend -m "add file.txt and file2.txt"

# 10
echo "bad" >> file.txt && git add . && git commit -m "the bad commit"
git revert HEAD            # save the message it opens for u
git log --oneline

# 11
git reset --hard HEAD~3
git log --oneline          # 3 commits gone
git reflog                 # find the line from before the reset
git reset --hard HEAD@{1}
git log --oneline          # all back

# 12
echo "secret" > .env
git add .env && git commit -m "oops"
git rm --cached .env
git commit -m "stop tracking .env"
ls -a                      # .env is still on ur disk (plain ls hides dotfiles)
```

output of 5:

```
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   will_reset.md
```

output of 7:

```
HEAD is now at ef7712d 2nd commit
```

output of 10:

```
b39e36a (HEAD -> main) Revert "the bad commit"
bb2f1ff the bad commit
5abb3e2 add file.txt and file2.txt
```

output of 11, the reflog:

```
ef7712d HEAD@{0}: reset: moving to HEAD~3
b39e36a HEAD@{1}: revert: Revert "the bad commit"
bb2f1ff HEAD@{2}: commit: the bad commit
```

- steps 5, 6 and 7 are the same mistake undone 3 different ways. that is the whole of
  `reset`: the commit always goes away, the flag decides what happens to ur work.
- in step 4 the change is really gone, and that is the only thing in this chapter that
  cannot be recovered. it was never committed, so git never had a copy of it.
- in step 10 the bad commit is still in the log, and that is the point. u did not rewrite
  anything, so this is the safe way to undo something u already pushed.
- in step 11, `HEAD@{1}` is not a fixed name, it means "one move ago". look at ur own
  reflog and pick the line that is actually before ur mistake, then reset to that.

---

[[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|back to the chapter]]
