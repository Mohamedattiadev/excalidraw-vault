---
title: "Chapter 1 — Git Basics"
aliases:
  - "11-Dev-101/Git-101/01-git-basics"
  - "11-Dev-101/Git-101/01-git-basics/index"
---

**Time to study:** ~60 min
**You will learn:** what git actually is, the words everyone throws at u without explaining, and the 3 commands that are already half of git: `status`, `add`, `commit`.

[[02-Personal/11-Dev-101/Git-101/index\|← back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|next: Chapter 2 →]]

---

## 1. what is git

> git is a version control system. instead of complicating the concept, i think an example is the best way here.

- example: u have a project u are working on, and oops, u made a small mistake and now u want to go back to how it was 10 minutes ago. without git, that version is gone. u only have what is on disk right now.

- now the same scenario with git: u are working in the same project, but this time git is tracking it. the same mistake happens, and u just tell git to take u back to the last saved point. done.

> i explained it in that dummy way because a lot of students really do not get what git is or why it exists. now we can talk a bit about where it came from.

> `git` was created in 2005 by `Linus Torvalds`, the creator of the linux kernel, to track the changes in the kernel's files. he started it on 3 April 2005, and 4 days later git was already storing its own source code in itself, can u believe that. it is not the first version control system, but it is by far the most used one today, and it is the one that made identifying everything by a `SHA` hash normal.

- note: `git` is **not** github, and not gitlab either. github and gitlab are places that **host** git repositories. they use the git technology, they are not it. u can use git for years on ur own laptop and never open github once.

---

## 2. some words u will keep hearing

> u will meet all of these again later with their own commands. right now u only need the one line version, so the words stop being scary.

| word | the one line version |
|---|---|
| `repository` (repo) | a folder git is tracking, using a hidden `.git` |
| `commit` | a saved snapshot of ur project at one moment |
| `branch` | a movable pointer to a commit, so 2 jobs do not mix |
| `HEAD` | a pointer to where u are right now |
| `HEAD~1` | the commit before HEAD, and `HEAD~2` is 2 before |
| `staging area` | the waiting room, between `add` and `commit` |
| `local repository` | ur copy, on ur machine, inside `.git` |
| `remote repository` | a copy somewhere else, usually github |
| `merge` | join 2 branches, keeping both histories |
| `rebase` | replay my commits on top of another branch |
| `reset` | move HEAD back, rewriting where the branch points |
| `revert` | a new commit that undoes an old one |
| `stash` | put unfinished changes aside for a while |

> and where each one is explained properly:
> remotes in [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]],
> merge in [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]],
> rebase in [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]],
> reset and revert in [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]],
> stash in [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Chapter 8]].

> do not try to memorise this table. read it once, and come back to it when a word shows up and u forgot what it was. every row is a full section somewhere in this course.

- note: u can use git from the command line or from a GUI (vscode has one built in). this course uses the command line, because the GUI buttons are these same commands with a nicer face, and the day the GUI does something u did not expect, u need to know the command underneath.

---

## 3. install it and make a repo

> first make sure git is installed:

```bash
git --version
```

```
git version 2.55.0
```

> if that says `command not found`, install it from [git-scm.com](https://git-scm.com), or with ur package manager (`sudo pacman -S git`, `sudo apt install git`, `brew install git`).

> now, one thing to know before anything else, and it really does solve everything:

> **git is just a folder called `.git` that stores the history of ur changes.** that is it. delete that folder and the history is gone, copy it somewhere else and the history goes with it.

> so let's make a directory, go into it, and put a file inside:

```bash
mkdir git-test
cd git-test
echo "Hello World" > Readme.md
```

> right now, if we delete that file or remove a line from it, it is gone for good. so let's start tracking it:

```bash
git init
```

```
Initialized empty Git repository in /home/ati/git-test/.git/
```

- u may also see a hint above that line, saying git used `master` as the branch name and that u can change it. ignore it for now, we set it properly in [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]].

> and that is all there is to it. there is now a `.git` folder sitting next to ur file:

```bash
ls -a
```

```
.  ..  .git  Readme.md
```

---

## 4. `git status`, the one u type most

> `status` tells u where u are. u will type it more than any other git command, before and after everything else:

```bash
git status
```

```
On branch master

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	Readme.md

nothing added to commit but untracked files present (use "git add" to track)
```

> read what it is telling u. `Readme.md` is **untracked**, which means git can see the file sitting there but is not watching it. if we delete it now, git cannot bring it back.

- a file in a git repo is always in one of these states, and this is the whole model:

```
untracked  ->  git can see it, but is not watching it
modified   ->  tracked, and changed since the last commit
staged     ->  u picked it to go into the next commit
committed  ->  saved in the history, safe
```

- there is a short version of the same output, which u will start to prefer:

```bash
git status -s
```

```
?? Readme.md
```

> `??` is untracked, `M` is modified, `A` is added. same information, one line per file.

---

## 5. `git add`, the waiting room

> to make git track the file, we `add` it:

```bash
git add Readme.md
git status
```

```
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   Readme.md
```

> `Changes to be committed` means the file is now in the **staging area**.

> this is the part beginners read past, so let me draw it. `add` does not save anything. it only puts the file in a waiting room and says "this one goes in the next snapshot":

```
   Working Directory              Staging Area
   ┌──────────────┐              ┌──────────────┐
   │  Readme.md   │───git add───▶│  Readme.md   │
   │  (untracked) │              │  (staged)    │
   └──────────────┘              └──────────────┘
```

- `git add .` adds everything in the current folder and everything under it. it is what u will use most of the time, and it is also how people accidentally commit their passwords, so look at `git status` before u run it.

> why does the waiting room exist at all? because u often change 5 files and only 2 of them belong together. u stage those 2, commit them with their own message, then stage the rest. one commit, one idea.

---

## 6. `git commit`, actually save it

```bash
git commit -m "add Readme.md"
```

> but the very first time, u get this instead:

```
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: unable to auto-detect email address (got 'ati@Ati.(none)')
```

> every commit records **who** made it, and u never told git who u are. so tell it:

```bash
git config --global user.name "your name"
git config --global user.email "youremail@example.com"
```

> u only do this once per machine. that config file gets its own chapter next, so if u want to know where it went and how to set a different name for one project, that is [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]].

- i prefer to use the same email i sign in to github with, so nothing has to be fixed later. do not worry, it is ez to change.

> now run the commit again:

```bash
git commit -m "add Readme.md"
```

```
[master (root-commit) 70d5c6e] add Readme.md
 1 file changed, 1 insertion(+)
 create mode 100644 Readme.md
```

> `70d5c6e` is the id of ur commit, and it will not be the same as mine. we see exactly why in [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]. `root-commit` just means it is the first one, the one with nothing before it.

```
   Staging Area                  Local Repository
   ┌──────────────┐              ┌──────────────┐
   │  Readme.md   │───commit────▶│  Readme.md   │
   │  (staged)    │              │  (committed) │
   └──────────────┘              └──────────────┘
```

> and now:

```bash
git status
```

```
On branch master
nothing to commit, working tree clean
```

> `working tree clean` is the sentence u want to see. it means everything on disk is already saved in the history.

- the `-m` is the message. without it, `git commit` opens ur editor and waits for u to write one and save it. if that editor turns out to be vim and u are stuck inside it, [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|Terminal 101 Chapter 6]] is where u get out.

---

## 7. the whole loop, one more time

> that is the cycle, and u will do it thousands of times:

```bash
echo "This is the 2nd commit." > 2nd-commit.md
git status -s
```

```
?? 2nd-commit.md
```

```bash
git add .
git commit -m "2nd commit"
```

```
[master 79e91e0] 2nd commit
 1 file changed, 1 insertion(+)
 create mode 100644 2nd-commit.md
```

> and to see what u have so far:

```bash
git log --oneline
```

```
79e91e0 (HEAD -> master) 2nd commit
70d5c6e add Readme.md
```

> **u literally just learned half of git.** `status` → `add` → `commit`, in that loop, is what u will be doing 90% of the time for the rest of ur life. everything else in this course is either looking at that history, or fixing it when u put something in it u did not mean to.

---

## NOTES

these are small things that are not a topic of their own, but u should know them from now on.

1. **write commit messages someone can read.** a message is for the person reading `git log` in 6 months, and that person is u.

```bash
git commit -m "fix"       # useless
git commit -m "stuff"     # useless
git commit -m "fix the login button not submitting on Enter"   # good
```

> the convention u will see in most repos is a type, then a short sentence in the present tense:

```
feat: add the dark theme toggle
fix: stop the form submitting twice
docs: explain the staging area
```

2. **`git commit -am "msg"`** stages and commits every **already tracked** file in one go:

```bash
git commit -am "fix the typo in the readme"
```

> careful, it does nothing for untracked files. a brand new file still needs `git add` first.

3. **a commit is cheap, so commit often.** a small commit that is ez to undo beats a giant one u are scared to touch. and u can always tidy the history later ([[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]]).

4. **`git help <command>`** opens the manual for any git command, the same idea as `man`:

```bash
git help commit
git commit --help     # the same thing
```

5. u did not need github for any of this. everything in this chapter happened on ur own machine, inside `.git`, with no internet.

---

## Assignment

1. Make a folder `practice-git`, go into it, and turn it into a repo.
2. Prove the repo exists by listing the hidden files.
3. Create a file `notes.md` with one line in it, then check `git status`. What state is the file in?
4. Stage it, and check `git status` again. What changed in the output?
5. Commit it with a message that says what u actually did.
6. Run `git status` and get the clean tree message.
7. Add 2 more files, but stage and commit **only one** of them. Then check the status of the other one.
8. Commit the second file too, then show ur history in the short one line format.
9. Change a line in `notes.md` and commit it with a single command, without a separate `git add`.
10. Look at `git log` (the long one this time) and find ur own name and email in the output. Where did git get them from?

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/01-git-basics/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/index\|← back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|next: Chapter 2 →]]
