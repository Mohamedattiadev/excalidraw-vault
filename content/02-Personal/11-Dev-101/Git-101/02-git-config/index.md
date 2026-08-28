---
title: "Chapter 2 — The Config File"
aliases:
  - "11-Dev-101/Git-101/02-git-config"
  - "11-Dev-101/Git-101/02-git-config/index"
---

**Time to study:** ~35 min
**You will learn:** where git keeps ur name and email, the difference between global and local config, how a config file is actually shaped, and aliases.

[[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|← Chapter 1]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|next: Chapter 3 →]]

---

## 1. what is the config file

> it is a plain text file where git keeps its settings, and the most important setting in it is **who u are**, so that every commit u make can say who made it.

> we already used its command in [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]], when git refused to commit until we told it our name:

```bash
git config --global user.name "your name"
git config --global user.email "youremail@example.com"
```

> the `--global` flag means "for me, on this machine, in every repo". it writes to a file in ur home directory called `~/.gitconfig`, and u can just open it and look:

```bash
cat ~/.gitconfig
```

```
[user]
	name = mohamedattiadev
	email = mohamedattia.dev@gmail.com
```

> that is all the command did. there is no database and no magic, it wrote 3 lines into a text file. u could have opened it with `nano` and typed them urself.

---

## 2. global vs local

> `--global` is for u. `--local` is for **one project only**, and it writes into that project's own `.git/config`:

```bash
# inside the repo u want it in
git config --local user.name "your work name"
git config --local user.email "you@company.com"
```

```bash
cat .git/config
```

```
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
[user]
	name = your work name
	email = you@company.com
```

> when git needs a setting, it reads the local one first, and only falls back to the global one if the local file does not have it. so **local wins**.

```
git looks for a setting in this order:

  .git/config      (local)   -> this project only        WINS
        ↓  not there?
  ~/.gitconfig     (global)  -> u, on this machine
        ↓  not there?
  /etc/gitconfig   (system)  -> everyone on this machine
```

> and this is not a made up scenario. it is exactly what u do when ur personal projects are signed with ur personal email, and ur work repos have to be signed with the company one. global = personal, local = the work repo. u set it once per work project and forget it.

- note: `--local` with no repo around it fails, because there is no `.git/config` to write into:

```bash
git config --local user.name "ati"
```

```
fatal: --local can only be used inside a git repository
```

---

## 3. section, key, value

> the file has exactly 3 things in it, and once u see them u can read any gitconfig:

```
[user]                             <- section
	name = mohamedattiadev         <- key = value
	email = mohamedattia.dev@gmail.com
```

1. **section**: the thing in the square brackets. `[user]`, `[core]`, `[alias]`.
2. **key**: the name on the left of the `=`.
3. **value**: whatever is on the right of the `=`.

> and that is also how u write it on the command line. the command is always `section.key`, with a dot:

```bash
git config --global user.name "ati"
#                   ↑     ↑    ↑
#                section  key  value
```

---

## 4. reading, adding and removing settings

> u can make ur own sections too. git does not care, it will store anything u put in there:

```bash
git config --local --add examplesection.name Mohamed
git config --local --add examplesection.surname ATI
```

> to see everything that is set:

```bash
git config --list --local
```

```
core.repositoryformatversion=0
core.filemode=true
core.bare=false
core.logallrefupdates=true
examplesection.name=Mohamed
examplesection.surname=ATI
```

> to get one single value:

```bash
git config --local --get examplesection.name
```

```
Mohamed
```

> to remove one key:

```bash
git config --local --unset examplesection.name
```

> and to remove the whole section with everything in it:

```bash
git config --local --remove-section examplesection
```

- `git config --list` with no flag shows u **everything** git can see, all 3 files merged together, which is usually what u actually want when something is set and u cannot find where.
- `git config --list --show-origin` shows the file each line came from. this is the one that ends the argument about which config is winning.

---

## 5. the settings worth setting today

> u will meet all of these later in the course, but they are settings, so they belong here. set them now and ur life gets easier from Chapter 5 onwards:

```bash
# the default branch name for new repos. `master` is the old default,
# `main` is what everyone uses now, and it is what github creates.
git config --global init.defaultBranch main

# ur editor, the one that opens when a command needs a message from u
git config --global core.editor "nano"      # or "vim", or "code --wait"

# colored output. usually on already, but make sure
git config --global color.ui auto

# remember how u solved a conflict, and solve it the same way next time
# (this one gets explained properly in Chapter 6)
git config --global rerere.enabled true
```

---

## 6. aliases, ur own git commands

> an alias is a shortcut u define once and then use forever. it lives in the `[alias]` section:

```bash
git config --global alias.st "status -s"
git config --global alias.lg "log --oneline --graph --all --decorate"
```

> now these work like real git commands:

```bash
git st
```

```
?? notes.md
```

```bash
git lg
```

```
* 79e91e0 (HEAD -> main) 2nd commit
* 70d5c6e add Readme.md
```

> and in the file it looks like this:

```bash
cat ~/.gitconfig
```

```
[user]
	name = mohamedattiadev
	email = mohamedattia.dev@gmail.com
[init]
	defaultBranch = main
[alias]
	st = status -s
	lg = log --oneline --graph --all --decorate
```

- `git lg` is the one i actually use. that long log command is impossible to remember and u want it 20 times a day.
- do not go crazy with aliases early. u are still learning the real commands, and typing them is how they stick. add an alias when u have typed the same long thing 10 times.

---

## NOTES

1. **u can edit the file by hand.** `git config --global --edit` opens it in ur editor, and typing the section by hand is often faster than 4 `--add` commands.

2. **the config is not committed.** `.git/config` lives inside `.git`, and `.git` is never part of ur project's files. so ur local settings never travel to github and never reach anyone who clones ur repo.

3. **checking what a repo will sign ur commits with**, before u commit into a repo u forgot the settings of:

```bash
git config user.email
```

```
mohamedattia.dev@gmail.com
```

4. this is a chapter u read once and then only come back to when something is set wrong. that is normal. u are learning **where** the setting lives, not memorising a list of them.

---

## Assignment

1. Print ur global name and email using a git command, not `cat`.
2. Find the file the global config lives in, and print it with `cat`.
3. Inside `practice-git` from Chapter 1, set a **local** email different from ur global one.
4. Prove the local one wins, using a git command that prints just the email.
5. Show all the settings git can see, with the file each one came from.
6. Add a section `course` with a key `name` set to `git-101`, locally.
7. Read that key back, then delete the whole section.
8. Set the default branch for new repos to `main`.
9. Make an alias `git st` that runs the short status, and use it.
10. Make an alias `git last` that shows only the most recent commit in one line, and use it.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/02-git-config/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|← Chapter 1]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|next: Chapter 3 →]]
