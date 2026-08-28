---
title: "Chapter 2 — The Config File — Solutions"
aliases:
  - "11-Dev-101/Git-101/02-git-config/solutions"
  - "11-Dev-101/Git-101/02-git-config/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/02-git-config/index\|back to the chapter]]

---

```bash
# 1
git config --global --get user.name
git config --global --get user.email

# 2
cat ~/.gitconfig

# 3
cd practice-git
git config --local user.email "work@company.com"

# 4
git config user.email
# work@company.com     <- no --global and no --local means "whatever wins here"

# 5
git config --list --show-origin

# 6
git config --local --add course.name git-101

# 7
git config --local --get course.name
git config --local --remove-section course

# 8
git config --global init.defaultBranch main

# 9
git config --global alias.st "status -s"
git st

# 10
git config --global alias.last "log -1 --oneline"
git last
```

output of 4:

```
work@company.com
```

output of 10:

```
8c1f0a2 (HEAD -> main) add a second line to notes.md
```

- in step 4, the whole point is that u asked without `--global` or `--local`. that is
  git answering "which one am i actually going to use in this repo", and the local
  one wins.
- in step 5, `--show-origin` prints the path of the file in front of every line. this
  is the command that settles it when a setting is not what u expect.
- if u want ur global email back as the one this repo uses, remove the local key:
  `git config --local --unset user.email`.

---

[[02-Personal/11-Dev-101/Git-101/02-git-config/index\|back to the chapter]]
