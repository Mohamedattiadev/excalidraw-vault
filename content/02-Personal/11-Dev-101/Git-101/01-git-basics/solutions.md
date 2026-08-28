---
title: "Chapter 1 — Git Basics — Solutions"
aliases:
  - "11-Dev-101/Git-101/01-git-basics/solutions"
  - "11-Dev-101/Git-101/01-git-basics/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|back to the chapter]]

---

```bash
# 1
mkdir practice-git
cd practice-git
git init

# 2
ls -a          # the .git folder is the whole repo

# 3
echo "my first note" > notes.md
git status
# it is UNTRACKED. git can see it, but is not watching it.

# 4
git add notes.md
git status
# it moved from "Untracked files" to "Changes to be committed".
# it is STAGED now, sitting in the waiting room. still not saved.

# 5
git commit -m "add notes.md with the first note"

# 6
git status
# On branch main
# nothing to commit, working tree clean

# 7
echo "one" > one.md
echo "two" > two.md
git add one.md
git commit -m "add one.md"
git status -s
# ?? two.md      <- still untracked, the commit did not touch it

# 8
git add two.md
git commit -m "add two.md"
git log --oneline

# 9
echo "a second line" >> notes.md
git commit -am "add a second line to notes.md"

# 10
git log
```

output of 10:

```
commit 8c1f0a2e3d5b7a9c4f6e8d0b2a4c6e8f0a2c4e6d (HEAD -> main)
Author: mohamedattiadev <youremail@example.com>
Date:   Fri Aug 28 15:12:03 2026 +0300

    add a second line to notes.md
```

- git got the name and the email from the config u set with `git config --global`
  in section 6. it is stored in `~/.gitconfig`, and that is the whole of
  [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]].
- in step 9, `-am` worked only because `notes.md` was **already tracked**. if u try
  the same thing on a brand new file, nothing happens, it stays untracked.
- in step 7, notice that committing `one.md` did not touch `two.md` at all. that is
  the point of the staging area: u choose what goes in.

---

[[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|back to the chapter]]
