---
title: "Chapter 7 — Undoing Things"
aliases:
  - "11-Dev-101/Git-101/07-undoing-things"
  - "11-Dev-101/Git-101/07-undoing-things/index"
---

**Time to study:** ~100 min
**You will learn:** `diff`, `restore`, the 3 kinds of `reset`, `commit --amend`, `revert`, and `reflog`, the command that gets ur work back when u thought it was gone.

[[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|next: Chapter 8 →]]

---

> this is the chapter u will come back to. every command here answers one question: **"i did something i did not mean to, how do i get back"**, and the answer depends on how far the mistake got: still on disk, staged, committed, or already pushed.

```
where is the mistake?              use
─────────────────────────────────────────────────────
still just edited on disk    ->    git restore <file>
staged with git add          ->    git restore --staged <file>
in the last commit           ->    git commit --amend
in a commit, not pushed      ->    git reset
in a commit, already pushed  ->    git revert
u already did something bad  ->    git reflog
```

---

## 1. `git diff`, seeing what changed

> before undoing anything, look at what u actually changed. `diff` compares ur files on disk with the last commit:

```bash
git diff
```

```
diff --git a/Readme.md b/Readme.md
index 928e920..7250e46 100644
--- a/Readme.md
+++ b/Readme.md
@@ -1,3 +1,5 @@
 hello World

 # a second line
+
+## a new line for diff
```

> the lines with `+` are what u added, lines with `-` are what u removed, and the lines with a space in front are context, they did not change. `a/Readme.md` is the old version, `b/Readme.md` is urs.

> now stage it and run the same command again:

```bash
git add Readme.md
git diff
```

```
(nothing)
```

> that surprises everyone once. **`git diff` shows unstaged changes only**, and u just staged them all. to see what is in the staging area:

```bash
git diff --staged
```

```
diff --git a/Readme.md b/Readme.md
index 928e920..7250e46 100644
--- a/Readme.md
+++ b/Readme.md
@@ -1,3 +1,5 @@
 hello World

 # a second line
+
+## a new line for diff
```

```
git diff            ->  working dir  vs  staging area   ("what have i not staged yet")
git diff --staged   ->  staging area vs  last commit    ("what am i about to commit")
git diff HEAD       ->  working dir  vs  last commit    ("everything i changed")
```

- `--staged` and `--cached` are the same flag with 2 names.
- `git diff --stat` gives u the summary instead of every line, which is what u want on a big change:

```bash
git diff --stat
```

```
 Readme.md | 2 ++
 1 file changed, 2 insertions(+)
```

- and u can compare 2 commits or 2 branches with the same command:

```bash
git diff HEAD~1 HEAD
git diff main feat/login
```

---

## 2. `git restore`, undoing before a commit

> **unstage** something u added by mistake:

```bash
git restore --staged Readme.md
git status -s
```

```
 M Readme.md
```

> the change is still there, it is just not staged any more. and `git add .` is how u stage everything, so `git restore --staged .` is how u unstage everything.

> **throw the change away completely**, and go back to what the last commit had:

```bash
git restore Readme.md
git status -s
```

```
(nothing, clean)
```

> **careful with that one.** that change was never committed and never staged, so git has no copy of it. it is gone for real. this is the only command in this chapter that actually destroys something with no way back.

- the older way to do the same 2 things was `git reset HEAD <file>` and `git checkout -- <file>`. u will see both in every stackoverflow answer written before 2019, and they still work. `restore` exists because those 2 commands were doing far too many different jobs.

---

## 3. `git reset`, undoing commits

> reset moves ur branch pointer backwards. remember from [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]] that a branch is one line of text with a hash in it: reset rewrites that line, so the commits after it are no longer on ur branch.

> the question is what happens to the **changes** those commits contained, and that is what the 3 flags are for.

> we start with this:

```bash
git log --oneline
```

```
558b16b (HEAD -> main) will reset this
ef7712d 2nd commit
c7d7f15 add Readme.md
```

### `--soft`: undo the commit, keep everything staged

```bash
git reset --soft HEAD~1
git status
```

```
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   will_reset.md
```

> the commit is gone from the log, and ur work is sitting in the staging area, ready to be committed again. **this is the one u want when u just committed too early**, or with the wrong message, or forgot a file.

### `--mixed`: undo the commit, keep the changes, unstaged

> this is the default, so `git reset HEAD~1` with no flag means this:

```bash
git reset HEAD~1
git status
```

```
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	will_reset.md

nothing added to commit but untracked files present (use "git add" to track)
```

> same as soft, one step further back: ur work is still on disk, but it is not staged any more.

### `--hard`: undo the commit and **delete the changes**

```bash
git reset --hard HEAD~1
```

```
HEAD is now at ef7712d 2nd commit
```

```bash
git status
```

```
On branch main
nothing to commit, working tree clean
```

```bash
ls
```

```
Readme.md
```

> the file is **gone from ur disk**. this is the one that scares people, and it should:

```
--soft    commit undone, changes STAGED         safest
--mixed   commit undone, changes on disk        the default
--hard    commit undone, changes DELETED        careful
```

- `HEAD~1` is "one commit back". u can also give it a hash from `git log`, and `git reset --hard <hash>` puts u exactly at that commit.
- `--hard` is the one command in git that people genuinely lose work to. and even then, if the work was **committed**, it is not really lost: section 6 is how u get it back.

---

## 4. `git commit --amend`, fixing the last one

> u committed and immediately realised u forgot a file, or ur message has a typo. u do not need a second commit for that:

```bash
# u committed file.txt, and file2.txt should have been in it too
git add file2.txt
git commit --amend -m "file.txt && file2.txt"
```

```
[main d21883d] file.txt && file2.txt
 2 files changed, 2 insertions(+)
 create mode 100644 file.txt
 create mode 100644 file2.txt
```

```bash
git log --oneline
```

```
d21883d (HEAD -> main) file.txt && file2.txt
ef7712d 2nd commit
c7d7f15 add Readme.md
```

> still one commit, and it now contains both files.

> if the message was already fine and u only forgot a file, keep it:

```bash
git add file3.txt
git commit --amend --no-edit
```

- what actually happened: `--amend` did not edit anything. it **replaced** the commit with a new one, which has a new hash. same rule as [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]]: amend before u push, not after.

---

## 5. `git revert`, undoing a pushed commit

> `reset` rewrites history, which is fine on ur own machine and unacceptable once other people have the commits. so for a pushed commit u use **revert**, which does not delete anything: it makes a **new commit that does the opposite**.

```bash
git log --oneline
```

```
bb2f1ff (HEAD -> main) the bad commit
5abb3e2 file.txt && file2.txt
```

```bash
git revert bb2f1ff
```

> ur editor opens with a message already written (`Revert "the bad commit"`), u save it, and:

```
[main b39e36a] Revert "the bad commit"
 1 file changed, 1 deletion(-)
```

```bash
git log --oneline
```

```
b39e36a (HEAD -> main) Revert "the bad commit"
bb2f1ff the bad commit
5abb3e2 file.txt && file2.txt
```

> **both commits are in the history.** the bad one still exists, and the new one undoes what it did:

```
before:                    after:

A───B───C                  A───B───C───D
        ↑                          ↑   ↑
    the bad one           the bad one  undoes it

C: + "hello"
D: - "hello"
```

> and because it only ever adds a commit, u can push it like anything else:

```bash
git push
```

```
reset  → move the branch back, the history changes
revert → keep the history, add a commit that cancels an old one

the ez rule:
   local, not pushed  → reset
   shared, pushed     → revert
```

- `git revert` on a merge commit needs to know which side to keep: `git revert -m 1 <hash>`, where `1` means the first parent, the branch u were on. u will meet this the day u revert a merged PR.
- `git revert --no-commit <hash>` puts the undo in ur staging area without committing, so u can revert 3 commits and finish with one commit.

---

## 6. `git reflog`, the safety net

> this is the command that will save ur project one day, so read this section twice.

> `git log` shows u the history of ur **commits**. `git reflog` shows u the history of **where HEAD has been**: every commit, checkout, reset, merge, rebase and amend u did, in order:

```bash
git reflog
```

```
b39e36a HEAD@{0}: revert: Revert "the bad commit"
bb2f1ff HEAD@{1}: commit: the bad commit
5abb3e2 HEAD@{2}: commit (amend): file.txt && file2.txt
d21883d HEAD@{3}: commit (amend): file.txt && file2.txt
66ac504 HEAD@{4}: commit: file.txt
ef7712d HEAD@{5}: reset: moving to HEAD~1
558b16b HEAD@{6}: commit: will reset this
ef7712d HEAD@{7}: reset: moving to HEAD~1
558b16b HEAD@{8}: commit: will reset this
ef7712d HEAD@{9}: commit: 2nd commit
```

> read it. every mistake from this chapter is in there, including the commits i destroyed with `reset --hard`. **they were never deleted.** my branch stopped pointing at them, and they sat in `.git` waiting.

```
HEAD@{0}  = where HEAD is right now
HEAD@{1}  = where it was one move ago
HEAD@{2}  = one before that
```

> so here is the disaster, and the recovery. u wipe out 3 commits:

```bash
git reset --hard HEAD~3
```

```
HEAD is now at ef7712d 2nd commit
```

```bash
git log --oneline
```

```
ef7712d (HEAD -> main) 2nd commit
c7d7f15 add Readme.md
```

> everything gone. now:

```bash
git reflog
```

```
ef7712d HEAD@{0}: reset: moving to HEAD~3
b39e36a HEAD@{1}: revert: Revert "the bad commit"
bb2f1ff HEAD@{2}: commit: the bad commit
5abb3e2 HEAD@{3}: commit (amend): file.txt && file2.txt
```

> `HEAD@{1}` is where u were **before** the reset. so go there:

```bash
git reset --hard HEAD@{1}
```

```
HEAD is now at b39e36a Revert "the bad commit"
```

```bash
git log --oneline
```

```
b39e36a (HEAD -> main) Revert "the bad commit"
bb2f1ff the bad commit
5abb3e2 file.txt && file2.txt
ef7712d 2nd commit
c7d7f15 add Readme.md
```

> **everything is back.** in one command.

> `reflog` is `log` with steroids. when u have destroyed something and ur stomach drops, the answer is almost always: `git reflog`, find the line from before the mistake, `git reset --hard` to it.

- it works for a rebase that went wrong, a branch u deleted, an amend that ate a commit, a bad merge. anything that moved HEAD is in there.
- the 2 limits, and they are why this is a safety net and not a time machine:
  - it is **local**. ur reflog is urs, it is not pushed and it is not cloned.
  - it **expires**. entries are cleaned up after 90 days by default, and after 30 for commits nothing points at any more. it saves u today, not in a year.
- and it only records things that were **committed**. changes u never committed and then destroyed with `git restore` or `git reset --hard` are not in the reflog, because they were never an object in the first place. that is why "commit often" from Chapter 1 is not just tidiness.

---

## NOTES

1. **`git rm --cached <file>`** stops tracking a file without deleting it from ur disk. that is the `.gitignore` fix from [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]]:

```bash
git rm --cached .env
```

```
rm '.env'
```

> without `--cached`, `git rm` deletes the file for real.

2. **`git clean -n`** lists the untracked files that are cluttering ur folder, and `git clean -fd` deletes them. always run the `-n` (dry run) first, because there is no undo, ever:

```bash
git clean -n
git clean -fd
```

3. **`git checkout <hash> -- <file>`** brings one file back from an old commit, without touching anything else:

```bash
git checkout HEAD~3 -- Readme.md
```

4. **read `git status` before every undo.** it names the exact command for ur situation, every time. most of this chapter is written in that output already.

5. the fastest way to be safe with all of this: commit small and commit often, and do ur scary experiments on a branch. a commit that exists can always be found again.

---

## Assignment

1. Change a file, and show exactly what changed without opening the file.
2. Stage it, and run `git diff` again. Explain why the output is empty.
3. Show what u are about to commit.
4. Unstage it, then throw the change away entirely.
5. Make a commit u do not want, and undo it so that ur work stays staged.
6. Commit it again, and undo it so that ur work is on disk but not staged.
7. Commit it again, and undo it so that the work is **gone**.
8. Commit a file, then realise a second file belonged in it. Fix it without making a second commit.
9. Fix the message of ur last commit without changing anything else.
10. Make a commit, then undo it **without rewriting history**, the way u would if it was already pushed. Show both commits in the log.
11. Now destroy 3 commits with `reset --hard`, then bring them all back.
12. Track a file by accident, then untrack it without deleting it.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/07-undoing-things/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|next: Chapter 8 →]]
