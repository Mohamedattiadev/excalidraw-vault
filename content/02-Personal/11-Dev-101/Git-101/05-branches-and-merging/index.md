---
title: "Chapter 5 — Branches and Merging"
aliases:
  - "11-Dev-101/Git-101/05-branches-and-merging"
  - "11-Dev-101/Git-101/05-branches-and-merging/index"
---

**Time to study:** ~105 min
**You will learn:** what a branch really is, how to make and switch them, `HEAD` and `refs/heads`, merging, fixing conflicts without panicking, and worktrees.

[[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|next: Chapter 6 →]]

---

## 1. what is a branch

> a branch is a pointer to a commit. that is it, that is the whole thing. but let's give it an example so it sits in ur head:

> i have a project with a `main` branch that i am working on, and i want to change the colour theme. i do not want to touch `main` while i am experimenting, because `main` is the version that works. so i open a new branch, call it `feat/colortheme`, and do the work there. when it is finished and tested, i **merge** it back into `main`.

```
                         feat/colortheme
                              │
                              ●───●───●
                             /         \
●───●───●───●───────────────●───────────●─────────● ...
   main commits          branched      merged back      main continues
```

> and remember [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]: a commit already knows its parent. so a branch does not have to copy anything. it is one file with one hash in it, saying "this branch is currently here". that is why making a branch in git is instant, even on a huge project.

---

## 2. the branch commands

> to see which branches exist and which one u are on:

```bash
git branch
```

```
* main
```

> the `*` is u. if the default branch of ur repo is still called `master`, u can rename it:

```bash
git branch -m main       # -m = move / rename
git branch
```

```
* main
```

- and to make `main` the default for every **new** repo, so u never do this again (this was [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]]):

```bash
git config --global init.defaultBranch main
```

> to create a branch:

```bash
git branch feat/colortheme
```

> but that only creates it, it does not take u there, so it is not what u actually want. the good way is to create it **and** switch to it in one command:

```bash
git checkout -b feat/colortheme
```

```
Switched to a new branch 'feat/colortheme'
```

> or the newer command that does exactly the same thing:

```bash
git switch -c feat/colortheme
```

```
Switched to a new branch 'feat/colortheme'
```

- `checkout` is the old command that does about 8 different jobs, and `switch` and `restore` are the newer ones that split those jobs up. both work, pick one. i learned `checkout` first and still type it.

> once the branch exists, u just move between them, no flag:

```bash
git switch main
git switch feat/colortheme

# or the checkout version
git checkout main
git checkout feat/colortheme
```

> and `git branch -v` shows u where each branch is pointing right now:

```bash
git branch -v
```

```
* feat/colortheme fb31aea adding colortheme
  main            79e91e0 2nd commit
```

- **name ur branches properly.** `feat/colortheme`, `fix/login-button`, `docs/readme`. the `/` is not a folder, it is just a naming habit everyone follows, and it keeps a repo with 40 branches readable.

---

## 3. `HEAD` and `refs/heads`

> now let's prove that a branch is just a file with a hash in it. we are on `feat/colortheme`:

```bash
cat .git/HEAD
```

```
ref: refs/heads/feat/colortheme
```

> **HEAD answers "which branch am i on".** it does not hold a commit, it holds the name of a branch. and the branch itself:

```bash
cat .git/refs/heads/main
```

```
79e91e04f6fb4309c982a0107af75cd239dfd261
```

> **a branch is one line of text containing one commit hash.** that is a branch. that is all a branch has ever been.

```
                     git repository
                         │
            ┌────────────┴────────────┐
            │                         │
          HEAD                 .git/refs/heads/
            │                         │
            ▼                         ├── main
   "which branch am i on?"            │    └──► 79e91e0
                                      │
                                      └── feat/colortheme
                                           └──► fb31aea
```

> when u commit, git writes the new commit and then rewrites that one line to point at it. when u switch branches, git reads the other branch's line and puts those files in ur folder. everything else in this chapter is built on those 2 sentences.

---

## 4. merging

> merging is combining 2 branches into one. we finished `feat/colortheme` and tested it, and we want it in `main`.

> **the branch that receives the merge is the branch u are standing on**, so switch to `main` first. this is the mistake everyone makes once:

```bash
git switch main
git merge feat/colortheme
```

```
Updating 79e91e0..fb31aea
Fast-forward
 Readme.md | 1 +
 1 file changed, 1 insertion(+)
```

```bash
git log --oneline
```

```
fb31aea (HEAD -> main, feat/colortheme) adding colortheme
79e91e0 2nd commit
70d5c6e add Readme.md
```

> **fast forward**: `main` had not moved at all since we branched, so there was nothing to combine. git just slid the `main` pointer forward to the same commit. no merge commit, nothing to think about.

```
before:                    after fast forward:

●───●  main                ●───●───●   main, feat/colortheme
       \                            (same commit)
        ●  feat/colortheme
```

> when `main` **has** moved on, git cannot slide anything, so it makes a **merge commit**: a commit with 2 parents, one from each side.

```bash
git merge feat/theme2
```

```
Merge made by the 'ort' strategy.
 Readme.md | 1 +
 1 file changed, 1 insertion(+)
```

```bash
git log --oneline --graph
```

```
*   9834467 (HEAD -> main) Merge branch 'feat/theme2'
|\
| * e7a199a (feat/theme2) dark theme
* | e837085 light theme
|/
* fb31aea adding colortheme
```

> u can see both lines of work in the graph, and the commit at the top that joins them. that is what "keeps the history" means.

> when the branch is merged and u are done with it, delete it:

```bash
git branch -d feat/colortheme
```

```
Deleted branch feat/colortheme (was fb31aea).
```

- `-d` is the safe one, it refuses if the branch has commits that were never merged anywhere. `-D` deletes it anyway. use `-d` and only reach for `-D` when u are sure u are throwing work away on purpose.
- deleting a branch deletes a **pointer**, not the commits. the commits are still there, and [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]] shows u how to find them again with `reflog`.

---

## 5. merge conflicts

> a conflict happens for exactly one reason: **2 branches changed the same lines of the same file**, and git will not guess which one u meant.

> everything else it merges silently. different files, different parts of the same file, no problem. the same line, 2 different ways, it stops and asks.

> let's cause one on purpose. on `feat/theme2` the last line of `Readme.md` is `# dark theme`, and on `main` the same line is `# light theme`:

```bash
git switch main
git merge feat/theme2
```

```
Auto-merging Readme.md
CONFLICT (content): Merge conflict in Readme.md
Automatic merge failed; fix conflicts and then commit the result.
```

> **do not panic and do not close the terminal.** ask git where u are, it will literally tell u what to do next:

```bash
git status
```

```
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   Readme.md

no changes added to commit (use "git add" and/or "git commit -a")
```

> now open the file:

```bash
cat Readme.md
```

```
Hello World
# added colortheme
<<<<<<< HEAD
# light theme
=======
# dark theme
>>>>>>> feat/theme2
```

### how to read those markers

> this is the thing that scares people, and it is 3 markers:

```
<<<<<<< HEAD
   ↑ everything from here to the ======= is what is on the branch u are ON.
     u are on main, so this is YOUR side, main's version.
=======
   ↑ the divider. above = yours, below = theirs.
   below is what is coming IN, from the branch u named in the merge command.
>>>>>>> feat/theme2
   ↑ and this tells u exactly which branch that was.
```

> so `HEAD` is always where u are standing, and the name at the bottom is what u are pulling in. if this happened during a `git pull`, the bottom part is what ur teammate pushed.

### how to fix it

> u edit the file until it says what u want, and **u delete all 3 marker lines**. that is the whole job. there is no magic command, u are the one who decides.

> say we want both lines:

```bash
# after editing, the file is:
cat Readme.md
```

```
Hello World
# added colortheme
# light theme
# dark theme
```

> then u tell git it is resolved, and commit:

```bash
git add Readme.md
git commit
```

```
[main 9834467] Merge branch 'feat/theme2'
```

> `git commit` on a merge already has the message written for u, so u just save and close the editor. that is it, the conflict is over.

- **`git merge --abort`** is the escape hatch. it puts everything back exactly as it was before u typed `merge`, as if it never happened. when u are lost, use it, look at the branches again, and start over:

```bash
git merge --abort
git status -s        # clean, nothing happened
```

### when u just want one side

> sometimes u do not want to merge the lines at all, u know one of the 2 versions is simply correct:

```bash
git checkout --ours Readme.md     # keep MY version (the branch i am on)
git checkout --theirs Readme.md   # keep THEIR version (the branch coming in)
git add Readme.md
git commit
```

> and for every conflicted file at once:

```bash
git checkout --ours .
git add .
git commit
```

- careful with `--ours` and `--theirs`: "ours" is whatever branch u are standing on, and during a **rebase** ([[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]]) those 2 words swap meaning, because rebase replays ur commits onto the other branch. when in doubt, open the file and look at the `HEAD` marker instead of trusting the words.

### more than one file

> nothing changes, it is the same job N times. `git status` lists every conflicted file under `Unmerged paths`, u fix them one by one, and u `git add` each one as u finish it. the merge is done when nothing is left unmerged:

```bash
git status -s
```

```
UU Readme.md
UU src/app.js
AA config.json
```

> `UU` means both sides modified it, `AA` means both sides added a file with that name. same fix for both: open, decide, delete the markers, `git add`.

- u can list only the files still in conflict:

```bash
git diff --name-only --diff-filter=U
```

---

## 6. how to have fewer conflicts

> conflicts are not a git problem, they are a "2 people edited the same lines" problem. so:

- **pull often.** a conflict against 1 commit is small, a conflict against 3 weeks of commits is a day of ur life.
- **keep branches short.** a branch alive for 2 days conflicts far less than one alive for 2 months.
- **one job per branch.** the colour theme branch changes the colour theme, nothing else.
- and when u are working alone on 2 machines, this is the same problem with 1 person, so pull before u start on the other machine.

---

## 7. `worktree`, one repo in two folders

> u are working on `feat/colortheme` with unfinished changes on disk. someone says `main` is broken and needs a fix **now**. u cannot switch cleanly, so u either stash ([[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Chapter 8]]) or u make a mess.

> the other answer is a **worktree**: a second folder on ur disk, checked out to a different branch, sharing the same repository.

```bash
git worktree add ../git-test-main main
```

```
Preparing worktree (checking out 'main')
HEAD is now at 953afcd commit 10
```

> now:

```
~/projects/
├── git-test/          → feat/colortheme   (ur unfinished work, untouched)
└── git-test-main/     → main              (clean, ready for the hotfix)
```

> both folders are the same repo. commit in one, and `git log` in the other sees it immediately. no stashing, no switching, and ur editor keeps its open files in both.

> a branch and a worktree at the same time:

```bash
git worktree add -b hotfix ../git-test-hotfix
```

```
Preparing worktree (new branch 'hotfix')
HEAD is now at 953afcd commit 10
```

> see them all:

```bash
git worktree list
```

```
/home/ati/projects/git-test        953afcd [feat/colortheme]
/home/ati/projects/git-test-hot    953afcd [hotfix]
```

> and when u are done, remove the folder properly (do not just `rm -rf` it, git keeps a record of it):

```bash
git worktree remove ../git-test-hotfix
git branch -d hotfix        # if u also want the branch gone
```

| | branch | worktree |
|---|---|---|
| what it is | a pointer to a commit | a folder on disk, checked out to a branch |
| how many at once | as many as u want | as many as u want |
| how many **visible** | 1, the one u switched to | all of them, side by side |
| switching cost | ur files change under u | none, u `cd` |
| unfinished work | blocks the switch | stays where it is |
| disk cost | nothing | a second copy of ur files (the history is shared) |
| when | always | when u need 2 branches **at the same time** |

- a branch can only be checked out in one worktree at a time, and git tells u so:

```bash
git worktree add ../another-copy main
```

```
fatal: 'main' is already used by worktree at '/home/ati/projects/git-test'
```

- u do not need this on day one. u will need it the first time a hotfix arrives while ur branch is half finished, and on that day u will remember this section.

---

## NOTES

1. **`git switch -` goes back to the branch u were just on**, exactly like `cd -` in [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Terminal 101]]:

```bash
git switch -
```

2. **branches on the remote are their own thing.** deleting a branch locally leaves it on github. to delete it there:

```bash
git push origin --delete feat/colortheme
```

3. **`git branch --merged`** lists branches whose work is already in the branch u are on. those are the ones that are safe to delete:

```bash
git branch --merged
```

4. **a detached HEAD** happens when u check out a commit instead of a branch (`git checkout 79e91e0`). HEAD then points at a commit directly, with no branch name on it. u can look around, but commits u make there belong to nothing and are ez to lose. get out with `git switch main`, or keep the work with `git switch -c a-new-branch`.

5. never delete a branch to "cancel" a merge. the merge already happened in the branch u merged into. u undo a merge, not the branch, and that is [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]].

---

## Assignment

1. In `practice-git`, list ur branches and see which one u are on.
2. Make sure ur main branch is called `main`, renaming it if it is not.
3. Create a branch `feat/colortheme` and switch to it in one command.
4. Prove with `cat` which branch u are on and which commit it points to, using the files inside `.git`.
5. Make 2 commits on that branch, then switch back to `main` and show that ur file does not have them.
6. Merge the branch into `main`, and read the first word of the output. Was it a fast forward? Why?
7. Delete the branch, then show ur history as a graph.
8. Now cause a conflict on purpose: make a branch, change line 1 of a file on it and commit, go back to `main`, change the same line differently, commit, and merge.
9. Read `git status` during the conflict, then open the file and say out loud which part is yours and which is theirs.
10. Abort the merge and prove nothing changed.
11. Do the merge again, resolve it by keeping **both** lines, and commit it.
12. Do a third conflict, and this time resolve it by keeping only ur side, with one command instead of an editor.
13. Add a worktree in a second folder, on a new branch called `hotfix`, list ur worktrees, then remove it. Then try to add a second worktree for `main` while u are standing in the folder that already has `main` checked out, and read the refusal.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|next: Chapter 6 →]]
