---
title: "Chapter 6 — Rebase and Squash"
aliases:
  - "11-Dev-101/Git-101/06-rebase-and-squash"
  - "11-Dev-101/Git-101/06-rebase-and-squash/index"
---

**Time to study:** ~80 min
**You will learn:** what rebase actually does, merge vs rebase, fixing a rebase conflict, cleaning up ur commits with interactive rebase and `squash`, and `rerere`.

[[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|next: Chapter 7 →]]

---

> everything in this chapter **rewrites history**, which means it makes new commits with new hashes to replace old ones. that is fine on ur own branch and dangerous on a shared one. the rule is at the end of section 3 and it is the most important line in the chapter.

---

## 1. what is a rebase

> this one is easier to see than to explain, so here is the picture first.

> u branched off `main` and made 3 commits. while u were working, `main` got a new commit too:

```
before:

      ●───●───●  feat/login
     /
●───●───●  main
```

> **rebase takes ur 3 commits and replays them, one by one, on top of the latest `main`**, as if u had branched off it 5 minutes ago instead of yesterday:

```
after  git rebase main :

              ●───●───●  feat/login
             /
●───●───●───●  main
```

> and now ur history is a straight line, with no fork in it at all. that is the whole point of it.

> the commands. u stand on **ur** branch, and u name the branch u want to sit on top of:

```bash
git switch feat/login
git rebase main
```

```
Successfully rebased and updated refs/heads/feat/login.
```

> (while it works u see a `Rebasing (1/3)` counter go past, one line per commit, because it really is replaying them one at a time.)

> before and after, for real:

```bash
git log --oneline --graph --all
```

```
* c3b48e5 (HEAD -> feat/login) fix the login typo
* e234045 style the login form
* 6f248d7 add login form
| * 34cbc09 (main) main moved on
|/
* 5d221c6 second commit
* cd86704 first commit
```

```bash
git rebase main
git log --oneline --graph --all
```

```
* 440ee6a (HEAD -> feat/login) fix the login typo
* d38d285 style the login form
* 47b352d add login form
* 34cbc09 (main) main moved on
* 5d221c6 second commit
* cd86704 first commit
```

> **look at the hashes.** `6f248d7` became `47b352d`. same changes, same message, same author, **different commit**. and that is not a detail, it is the whole thing u need to understand about rebase.

> why? [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]: a commit contains its parent's hash. u gave those commits a new parent, so they are new objects with new ids. the old ones are still in `.git` for a while, but ur branch does not point at them any more.

---

## 2. merge or rebase

> both answer the same question, "how do i get main's new work into my branch", and they answer it differently:

```
merge  = "join the 2 histories, and record that they were joined"
rebase = "rewrite my branch as if i had started from the latest main"
```

| | merge | rebase |
|---|---|---|
| history | keeps exactly what happened | rewrites it into a straight line |
| extra commit | yes, a merge commit | no |
| commit hashes | unchanged | **all new** |
| the graph | forks and joins | one line |
| safe on a shared branch | yes | **no** |
| conflicts | once, all at the end | possibly once **per commit** |
| good for | merging a finished branch into main | tidying ur own branch before u share it |

> what most teams actually do: **rebase ur own branch** onto main while u work, so it stays up to date and readable, then **merge it into main** at the end, so there is one clear commit that says the feature landed.

> **the rule: never rebase a branch someone else is using.** rebase gives every commit a new hash. anyone who already pulled the old ones now has 2 copies of ur work and a mess that takes an hour to untangle. rebase ur own unpushed branch freely, and leave `main` alone.

---

## 3. when a rebase hits a conflict

> it is the same conflict u learned in [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]], with different words around it, because git stops **at each commit** as it replays them:

```bash
git rebase main
```

```
Auto-merging app.txt
CONFLICT (content): Merge conflict in app.txt
error: could not apply 078785c... other edits app
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
```

> git is telling u the 3 options. `status` says it again:

```bash
git status
```

```
interactive rebase in progress; onto d1e8e9c
Last command done (1 command done):
   pick 078785c # other edits app
No commands remaining.
You are currently rebasing branch 'feat/other' on 'd1e8e9c'.
  (fix conflicts and then run "git rebase --continue")
  (use "git rebase --skip" to skip this patch)
  (use "git rebase --abort" to check out the original branch)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   app.txt
```

> the file looks exactly like a merge conflict, with one difference worth knowing:

```bash
cat app.txt
```

```
line 1
line 2
line 3
<<<<<<< HEAD
main version
=======
other version
>>>>>>> 078785c (other edits app)
```

> **careful here.** during a rebase, `HEAD` is **main**, the branch u are replaying onto, and the part at the bottom is **ur own commit**. it is the opposite way round from a merge, because git is applying ur commits on top of theirs, one at a time. this is exactly why i told u in Chapter 5 to read the markers instead of trusting the words "ours" and "theirs".

> u fix it the same way: edit the file, delete the markers, `git add`, and then **continue** instead of commit:

```bash
git add app.txt
git rebase --continue
```

```
[detached HEAD 03daa4f] other edits app
 1 file changed, 1 insertion(+)
Successfully rebased and updated refs/heads/feat/other.
```

- if there are more commits after that one, git stops again on the next conflict. keep doing fix → `add` → `--continue` until it says `Successfully rebased`.
- `git rebase --abort` puts everything back exactly as it was before u started. same escape hatch as `merge --abort`, and u should use it the moment u feel lost.
- `git rebase --skip` throws away the commit it is stuck on. do not use it unless u actually mean "this commit should not exist".

---

## 4. `squash`: many commits into one

> while working, ur commits look like this and that is normal:

```
add login form
style the login form
fix the login typo
```

> nobody needs those 3 lines in `main` forever. they are one piece of work: "add the login form". squashing combines them into a single clean commit.

```
before:                 after:

A───B───C───D           A───X
    ↑   ↑   ↑               ↑
   add fix final        "add the login form"
```

> the command is an **interactive** rebase, and the number is how many commits back u want to work on:

```bash
git rebase -i HEAD~3
```

> ur editor opens with a to-do list. this is git asking u what to do with each commit:

```
pick 47b352d # add login form
pick d38d285 # style the login form
pick 440ee6a # fix the login typo

# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup <commit> = like "squash" but keep only the previous commit's message
# d, drop <commit> = remove commit
#
# These lines can be re-ordered; they are executed from top to bottom.
#
# If you remove a line here THAT COMMIT WILL BE LOST.
```

> **the oldest commit is at the top**, which is the opposite of `git log`, and it catches everyone once.

> u change the word at the start of the lines u want to fold into the one above:

```
pick   47b352d # add login form
squash d38d285 # style the login form
squash 440ee6a # fix the login typo
```

> save and close. git does the work and then opens a second editor, with all 3 messages in it, asking what the single commit should be called:

```
# This is a combination of 3 commits.
# This is the 1st commit message:

add login form

# This is the commit message #2:

style the login form

# This is the commit message #3:

fix the login typo
```

> delete all of that and write one good message. save and close:

```
Successfully rebased and updated refs/heads/feat/login.
```

```bash
git log --oneline
```

```
2ee7a49 (HEAD -> feat/login) add the login form
34cbc09 (main) main moved on
5d221c6 second commit
cd86704 first commit
```

> 3 commits became 1, and the changes in it are exactly the same as before. nothing was lost.

- **`fixup` instead of `squash`** does the same thing but throws that commit's message away without asking. it is what u want for commits called "typo" and "oops", and it saves u the second editor.
- **`reword`** just changes a message. **`drop`** deletes a commit and its changes. and u can **reorder the lines** to reorder the commits.
- if u get a conflict in the middle of an interactive rebase, it is section 3 again: fix, `git add`, `git rebase --continue`.
- and this is history rewriting, so the same rule applies: squash **before** u share the branch, not after.

### if u already pushed the branch

> after a rebase or a squash, ur local branch and the pushed one have different commits, so a normal push is rejected. the honest fix, on a branch that is **urs alone**:

```bash
git push --force-with-lease
```

> `--force-with-lease` means "overwrite it, but only if nobody else has pushed since i last looked". plain `--force` skips that check and will happily delete someone's work. use the lease one, always.

---

## 5. `rerere`: solve a conflict once

> `rerere` = **Re**use **Re**corded **Re**solution. it remembers how u resolved a conflict, and if the exact same conflict shows up again, git applies ur old answer by itself.

> when does the same conflict show up twice? all the time, once u rebase: a long lived branch rebased onto a moving `main` hits the same 2 lines again every single time. it is the most boring work in git.

> turn it on once, globally, and forget it:

```bash
git config --global rerere.enabled true
```

> now the first time u hit a conflict, u see one extra line:

```bash
git rebase main
```

```
Auto-merging app.txt
CONFLICT (content): Merge conflict in app.txt
Recorded preimage for 'app.txt'
Automatic merge failed; fix conflicts and then commit the result.
```

> u fix it by hand as usual and `git add` it. git quietly writes down what the conflict was and what u turned it into:

```
Recorded resolution for 'app.txt'.
```

> and next time that same conflict appears:

```
Auto-merging app.txt
CONFLICT (content): Merge conflict in app.txt
Resolved 'app.txt' using previous resolution.
Automatic merge failed; fix conflicts and then commit the result.
```

> read that middle line. the conflict still happened, git just filled the answer in for u.

> the file is already fixed. u still check it and still `git add` it, but u did not have to think.

- it only fires on a conflict it has seen **exactly** before. it never guesses.
- it is per machine and lives in `.git/rr-cache`, so it is not pushed and it is not shared.
- `git rerere forget <file>` throws away a recorded answer, for when u resolved it wrong the first time and it keeps happily repeating ur mistake.

---

## NOTES

1. **`git pull --rebase`** is a pull that rebases ur local commits on top of what u fetched, instead of making a merge commit. it keeps the history of a shared branch clean, and many teams set it as the default:

```bash
git pull --rebase
git config --global pull.rebase true      # make it the default
```

2. **the golden rule again, because it is the one that costs people a day:** do not rebase, squash or amend anything that other people have already pulled.

3. **`git rebase -i` with no `HEAD~n`** also works if u name a commit or a branch: `git rebase -i main` gives u every commit ur branch has that `main` does not, which is usually exactly the list u wanted.

4. **nothing here can really destroy ur work.** every commit u rewrote is still in `.git`, and `git reflog` finds it. that is [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]], and it is the chapter that makes this one safe to practise.

5. squashing is a habit, not a law. some teams squash every branch into 1 commit, some keep every commit. look at `git log` in the project u joined and do what it does.

---

## Assignment

1. In `practice-git`, make a branch `feat/login` and put 3 small commits on it.
2. Go back to `main`, make 1 commit there, and look at the graph. It forks, right?
3. Rebase `feat/login` onto `main`, and look at the graph again.
4. Compare the commit hashes on ur branch before and after. What happened, and why?
5. Now squash those 3 commits into 1, with a message that describes the whole job.
6. Show that the file contents are exactly what they were before the squash.
7. Cause a rebase conflict on purpose: change the same line on `main` and on a new branch, then rebase the branch onto main.
8. During the conflict, read `git status` and say which of the 2 versions is under `HEAD`, and why it is not the one u would expect.
9. Resolve it and continue the rebase to the end.
10. Do the same conflict again, and this time abort it instead.
11. Turn `rerere` on, cause the same conflict twice, and watch git resolve the second one for u.
12. Look at `git log --oneline --graph --all` at the end and describe the shape of ur history in one sentence.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|next: Chapter 7 →]]
