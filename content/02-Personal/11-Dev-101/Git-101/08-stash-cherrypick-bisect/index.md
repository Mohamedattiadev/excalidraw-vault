---
title: "Chapter 8 — Stash, Cherry-pick and Bisect"
aliases:
  - "11-Dev-101/Git-101/08-stash-cherrypick-bisect"
  - "11-Dev-101/Git-101/08-stash-cherrypick-bisect/index"
---

**Time to study:** ~75 min
**You will learn:** how to put unfinished work aside with `stash`, take one single commit from another branch with `cherry-pick`, and find the commit that broke everything with `bisect`.

[[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|← Chapter 7]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|next: Chapter 9 →]]

---

## 1. `git stash`, putting work aside

> one of the most useful commands in git. u are in the middle of something, ur files are half finished, and u need to be on another branch **right now**. u cannot commit this mess, and u do not want to lose it.

> so u `stash` it: git takes ur changes, puts them somewhere safe, and gives u a clean working directory. u do what u needed to do, u come back, u `pop` them, and everything is exactly where u left it. piece of cake.

```bash
git status -s
```

```
 M file1.txt
 M file2.txt
```

```bash
git stash
```

```
Saved working directory and index state WIP on feat/colortheme: 08e8231 2nd colortheme commit
```

```bash
git status
```

```
On branch feat/colortheme
nothing to commit, working tree clean
```

> ur changes are gone from the files, and they are safe. now u can switch branches, pull, fix whatever was urgent.

> to see what u have put aside:

```bash
git stash list
```

```
stash@{0}: WIP on feat/colortheme: 08e8231 2nd colortheme commit
```

> and to get it back:

```bash
git stash pop
```

```
On branch feat/colortheme
Changes not staged for commit:
	modified:   file1.txt
	modified:   file2.txt

Dropped refs/stash@{0} (8b0056cde40754fa7f007ea4206e693b4f657b93)
```

> `Dropped` is the important word: `pop` gives u the changes back **and removes the stash from the list**.

### name them, or u will regret it

> `WIP on feat/colortheme` tells u nothing 3 days later. give it a message:

```bash
git stash push -m "half done dark theme"
```

```
Saved working directory and index state On feat/colortheme: half done dark theme
```

- `git stash save "msg"` is the old way of writing the same thing. `push -m` is the current one.

### the stash is a stack

> every new stash goes on **top**, and `pop` always takes the top one. LIFO, last in first out:

```bash
git stash push -m "FIRST"
git stash push -m "SECOND"
git stash push -m "THIRD"
git stash list
```

```
stash@{0}: On feat/colortheme: THIRD
stash@{1}: On feat/colortheme: SECOND
stash@{2}: On feat/colortheme: FIRST
```

```
        ┌────────────────┐
        │ stash@{0} THIRD│ ← newest, and the one pop takes
        ├────────────────┤
        │ stash@{1}SECOND│
        ├────────────────┤
        │ stash@{2} FIRST│ ← oldest
        └────────────────┘
```

> the numbers are not names, they are **positions**. pop the top one and everything below it shifts up: `SECOND` becomes `stash@{0}`.

> and u are not forced to take the top one. name the one u want:

```bash
git stash pop stash@{2}
```

### `apply` keeps it, `pop` removes it

```bash
git stash apply stash@{0}
git stash list
```

```
stash@{0}: On feat/colortheme: THIRD
stash@{1}: On feat/colortheme: SECOND
stash@{2}: On feat/colortheme: FIRST
```

> the changes came back **and the stash is still in the list**. that is the whole difference:

```
pop   = give me the changes and delete the stash
apply = give me the changes and keep the stash
```

> `apply` is what u want when the same work needs to go onto 2 different branches, or when u are not sure it will apply cleanly and u want a second chance.

> and to remove one u do not need any more, without applying it:

```bash
git stash drop stash@{1}
```

```
Dropped stash@{1} (7c0d45939572975700d8fda4ee6d78a3836d2c7f)
```

```bash
git stash clear         # delete ALL of them, no confirmation, no undo
```

### the trap: untracked files are not stashed

> this one gets everyone. u have a brand new file that git is not tracking yet, and u stash:

```bash
git stash
```

```
No local changes to save
```

> git considers untracked files "not ur changes", so it saves nothing and ur new file just sits there. u need `-u`:

```bash
git stash -u
```

```
Saved working directory and index state WIP on feat/colortheme: 08e8231 2nd colortheme commit
```

- `-u` (or `--include-untracked`) stashes untracked files too. `-a` also includes ignored ones, which u almost never want.

### when not to use a stash

- **it is local.** stashes are never pushed and never cloned. a stash from 3 months ago is a thing only u can see, and u will forget it.
- a stash is not a commit on any branch, so it is easy to lose track of. if the work is worth keeping for more than a day, make a branch and commit it instead:

```bash
git switch -c wip/dark-theme
git add . && git commit -m "wip: half done dark theme"
```

- and remember [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]: a **worktree** is the other answer to the same problem. stash when u will be back in 5 minutes, worktree when u need both things open at once.

---

## 2. `git cherry-pick`, taking one commit

> u have a branch with 5 commits on it. one of them is a small fix that `main` needs **now**, and the other 4 are half finished. u cannot merge the branch, u only want that one commit.

```
main:      A───B
                \
feature:         C───D───E
                     ↑
              only this one, please
```

```bash
git log --oneline --all --graph
```

```
* fa06db2 (feat/big) huge unfinished thing
* aa2a725 the small fix i need
* c439330 (HEAD -> main) main work
* 29b6521 first commit
```

> u stand on the branch that should **receive** the commit, and name the commit u want:

```bash
git switch main
git cherry-pick aa2a725
```

```
[main 3a23b1a] the small fix i need
 1 file changed, 1 insertion(+)
 create mode 100644 fix.txt
```

```bash
git log --oneline
```

```
3a23b1a (HEAD -> main) the small fix i need
c439330 main work
29b6521 first commit
```

> notice the hash: `aa2a725` became `3a23b1a`. it is a **copy**, not a move. the original commit is still on `feat/big`, exactly where it was.

```
main:      A───B───C'          C' has the same changes as C, new hash
                    ↑
feature:   A───B───C───D───E   C is still here
```

- more than one at a time:

```bash
git cherry-pick aa2a725 fa06db2      # 2 specific commits
git cherry-pick aa2a725^..fa06db2    # a range, both ends included
```

- if the commit does not apply cleanly u get a conflict, and it is the same job as always:

```bash
git status              # see which file
# fix the file, delete the markers
git add <file>
git cherry-pick --continue
```

- and the escape hatch:

```bash
git cherry-pick --abort
```

### when to use it, honestly

> not often. u will reach for it in 2 situations:

- a hotfix that was made on `main` and also has to go into the release branch, or the other way round.
- u committed something on the wrong branch. cherry-pick it to the right one, then delete it from the wrong one.

```
cherry-pick → "i want THIS one commit here"
merge       → "i want that whole branch"
rebase      → "replay my commits on top of that branch"
```

> and be careful with it in a team. copying commits between branches makes the same change exist twice with 2 different hashes, and when those branches meet later it can confuse both u and git. it is a tool for exceptions, not a habit.

---

## 3. `git bisect`, finding what broke it

> something works, and 100 commits later it does not. u know it worked in the release from 3 weeks ago. which commit broke it?

> checking them one by one is 100 tests. **bisect does a binary search** instead: it checks the middle, u say good or bad, and half the commits are eliminated. every answer halves what is left.

```
100 commits  →  50  →  25  →  12  →  6  →  3  →  1

7 tests instead of 100
```

- if u did algorithms: linear search is `O(n)`, binary search is `O(log n)`. 1,000 commits is 10 tests, 1,000,000 commits is 20. that is the whole reason this command exists.

### a real bisect, start to finish

> here is a real repo. `price.sh` should print `120`, and today it prints `80`:

```bash
git log --oneline
```

```
953afcd (HEAD -> main) commit 10
a0fd0ae commit 9
94f4c63 commit 8
2d6f4c6 commit 7
fe90025 commit 6
2c0db80 refactor the tax line
2e1f92f commit 5
2876657 commit 4
bb8784e commit 3
53060e1 commit 2
51de53b commit 1
4928016 add price.sh
```

```bash
./price.sh
```

```
80
```

> u know it was fine at `4928016`. start the bisect and tell git what u know:

```bash
git bisect start
git bisect bad            # the commit i am on now is broken
git bisect good 4928016   # this old one was fine
```

```
Bisecting: 5 revisions left to test after this (roughly 3 steps)
[2e1f92fb992c3cb4c813dac85ced90ba20bbe828] commit 5
```

> git just checked out a commit in the middle for u. **now test it**, however u test it: run the script, run the tests, open the app:

```bash
./price.sh
```

```
120
```

> works. so the bug is somewhere **after** this one:

```bash
git bisect good
```

```
Bisecting: 2 revisions left to test after this (roughly 2 steps)
[2d6f4c62ef64387a2d1d0990ef02059fa572bfc2] commit 7
```

```bash
./price.sh
```

```
80
```

```bash
git bisect bad
```

```
Bisecting: 0 revisions left to test after this (roughly 1 step)
[fe90025386e730370db9b910ab54d5473ee433fd] commit 6
```

> keep going. test, answer `good` or `bad`, and after 4 answers:

```
2c0db802862fab33fd4f83db8d9928f0d47981fa is the first 'bad' commit
commit 2c0db802862fab33fd4f83db8d9928f0d47981fa
Author: mohamedattiadev <mohamedattia.dev@gmail.com>
Date:   Fri Aug 28 15:00:06 2026 +0300

    refactor the tax line

 price.sh | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

> **there it is**, and it even shows u the 1 line that did it. 12 commits, 4 tests.

> and now the step everyone forgets. u are standing on some old commit right now, so put urself back:

```bash
git bisect reset
```

```
Previous HEAD position was 2c0db80 refactor the tax line
Switched to branch 'main'
```

### let git do the testing

> if u can write **one command that fails when the bug is there**, u do not have to sit and answer. `git bisect run` uses the exit code: 0 means good, anything else means bad (this is exit codes from [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Terminal 101 Chapter 8]]):

```bash
git bisect start HEAD 4928016      # bad first, then good, in one line
git bisect run bash -c '[ "$(./price.sh)" = "120" ]'
```

```
running 'bash' '-c' '[ "$(./price.sh)" = "120" ]'
Bisecting: 2 revisions left to test after this (roughly 2 steps)
running 'bash' '-c' '[ "$(./price.sh)" = "120" ]'
Bisecting: 0 revisions left to test after this (roughly 1 step)
running 'bash' '-c' '[ "$(./price.sh)" = "120" ]'
2c0db802862fab33fd4f83db8d9928f0d47981fa is the first 'bad' commit

    refactor the tax line

bisect found first 'bad' commit
```

> it found it on its own, in about a second. with a real test suite it is `git bisect run npm test`, or `git bisect run pytest -x`, and u go make a coffee.

- `git bisect skip` is for a commit u cannot test (it does not build, it is half a merge). git picks another one nearby.
- bisect needs a bug u can **check reliably**. if it only breaks sometimes, ur answers will be wrong and bisect will confidently point at the wrong commit.
- and this is another reason for small commits. bisect telling u "one of these 400 lines" is a much worse day than "this 1 line".

---

## NOTES

1. **`git stash show -p`** shows the diff of a stash before u apply it, so u can check what is in it first:

```bash
git stash show -p stash@{0}
```

2. **`git stash branch <name>`** takes a stash and opens a new branch with those changes applied. it is the clean way out when the stash is older than the branch and no longer applies.

3. **`git cherry-pick` on a range** is often better done with `rebase --onto`, but do not worry about that today. u will meet it the first time u need to move a whole set of commits somewhere else.

4. **`git bisect log`** prints everything u answered, and `git bisect replay` runs it again. useful when u answered one of them wrong and do not want to start over.

5. all 3 of these commands are exception tools, not daily ones. u might use `stash` weekly, `cherry-pick` monthly, and `bisect` twice a year, and the twice a year one will save u an entire day each time.

---

## Assignment

1. Make 2 changes in a tracked file, stash them, and prove ur working directory is clean.
2. List ur stashes, then bring the changes back and show the stash list is now empty.
3. Make 3 stashes with the names FIRST, SECOND and THIRD, and list them. Which one is `stash@{0}`?
4. Get the SECOND one back **without** removing it from the list.
5. Now remove it from the list without applying it.
6. Delete every stash u have left in one command.
7. Create a brand new untracked file, and try to stash it. What happens, and what is the flag that fixes it?
8. Make a branch with 2 commits: one small useful fix, one unfinished mess. Go back to `main` and commit something there too, so `main` has moved on. Then bring **only** the fix into `main`.
9. Show that the original commit is still on the branch, and that the copy has a different hash.
10. Make a repo with 10 commits where commit 6 breaks a script, and find that commit with `bisect`, answering by hand.
11. Do it again with `git bisect run` so git finds it on its own.
12. Put urself back on `main` properly after the bisect.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|← Chapter 7]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|next: Chapter 9 →]]
