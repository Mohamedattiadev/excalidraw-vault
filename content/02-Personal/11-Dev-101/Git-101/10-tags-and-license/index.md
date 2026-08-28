---
title: "Chapter 10 — Tags, Versions and the License"
aliases:
  - "11-Dev-101/Git-101/10-tags-and-license"
  - "11-Dev-101/Git-101/10-tags-and-license/index"
---

**Time to study:** ~50 min
**You will learn:** how to mark a release with a `tag`, how version numbers actually work (SemVer), and how to choose a `LICENSE` so people know what they may do with ur code.

[[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|← Chapter 9]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]]

---

## 1. what is a tag

> a tag is a **name stuck on one specific commit**, and it does not move. u use it to mark the versions u release.

> compare it to a branch, because that is the whole idea:

```
branch → moves forward every time u commit
tag    → stays on the commit u put it on, forever
```

```
A───B───C───D───E   ← main keeps moving with u
    ↑       ↑
  v1.0.0  v1.1.0    ← these 2 do not move, ever
```

> so 6 months later, "what exactly did we ship as 1.0.0" has an exact answer, instead of a guess about which commit it was.

---

## 2. the tag commands

> tag the commit u are on:

```bash
git tag v1.0.0
```

> tag an **older** commit, by giving its hash:

```bash
git tag v0.1.0 4928016
```

> see them all:

```bash
git tag
```

```
v0.1.0
v1.0.0
v1.1.0
```

> and they show up in the log next to the commits they are on:

```bash
git log --oneline --decorate
```

```
953afcd (HEAD -> main, tag: v1.1.0, tag: v1.0.0) commit 10
a0fd0ae commit 9
...
4928016 (tag: v0.1.0) add price.sh
```

> look at one:

```bash
git show v1.0.0
```

```
commit 953afcdcfb34e620893b95002ac4b3c1679704dd
Author: mohamedattiadev <mohamedattia.dev@gmail.com>
Date:   Fri Aug 28 15:00:06 2026 +0300

    commit 10
```

> delete one:

```bash
git tag -d v0.1.0
```

```
Deleted tag 'v0.1.0' (was 4928016)
```

### the 2 kinds of tag

> what we did above is a **lightweight** tag: literally a name pointing at a commit, nothing else. an **annotated** tag is a real object in `.git` with its own author, date and message:

```bash
git tag -a v1.1.0 -m "first feature release"
git show v1.1.0
```

```
tag v1.1.0
Tagger: mohamedattiadev <mohamedattia.dev@gmail.com>
Date:   Fri Aug 28 15:00:22 2026 +0300

first feature release

commit 953afcdcfb34e620893b95002ac4b3c1679704dd
Author: mohamedattiadev <mohamedattia.dev@gmail.com>
Date:   Fri Aug 28 15:00:06 2026 +0300
```

> u can see the extra block on top: who tagged it, when, and why.

- **use `-a` for anything u release.** lightweight tags are fine for a private bookmark, annotated ones are what a release should be, because "who cut this release and when" is information u will want.

### tags are not pushed by default

> this catches everyone once. u tag, u push, and github shows no release:

```bash
git push origin v1.0.0        # push one tag
git push --tags               # push all of them
```

> once it is pushed, the tag shows up on ur repo's **Tags** page, and github lets u turn it into a **Release** from there: a title, notes, and files people can download.

- to delete a tag that is already pushed, u have to delete it in both places:

```bash
git tag -d v1.0.0                    # local
git push origin --delete v1.0.0      # remote
```

---

## 3. SemVer, what the numbers mean

> tags are usually named with **Semantic Versioning**, which is 3 numbers with actual rules behind them:

```
   v1.2.3
    │ │ │
    │ │ └── PATCH → bug fixes. nothing about how it is used changed.
    │ └──── MINOR → new features, and old code still works.
    └────── MAJOR → breaking changes. old code has to be updated.
```

> reading it as a story:

```
v1.0.0  →  the first stable release
v1.0.1  →  fixed a bug. safe to update, nothing else changed.
v1.1.0  →  added a feature. safe to update, ur old code still works.
v2.0.0  →  something was removed or renamed. ur code may break.
```

> so the ez rule:

```
bug fix          → PATCH
new feature      → MINOR
breaking change  → MAJOR
```

> and this is not decoration. when a project u depend on goes from `1.4.2` to `1.4.3`, u update without thinking. when it goes to `2.0.0`, u read the changelog first. that one number is a promise about how much of ur day it is going to cost.

- `v0.x.x` means "not stable yet, anything can change". that is why so many projects sit on `0.` for a long time, and why going to `1.0.0` is a real decision, not a celebration.

---

## 4. what is a LICENSE

> a `LICENSE` file tells people **what they are allowed to do with ur code**. can they use it, change it, ship it in something they sell.

> and here is the part that surprises people: **code with no license is not free to use.** "public on github" does not mean "u may use it". without a license, the default is that u keep all rights and nobody else may legally do anything with it. so if u actually want people to use ur project, the license is not paperwork, it is the whole point.

> git does not care and will never mention it. it is a file u put in the repo, and github reads it and shows the license name on the front page.

---

## 5. the ones u need to know

```
MIT
→ do anything, just keep my copyright notice in there.
→ the most common one in the world, and the simplest to read.

Apache 2.0
→ like MIT, plus an explicit patent grant.
→ what companies prefer, because of that patent clause.

GPL
→ "copyleft". u can use and change it, but if u distribute ur version,
   it must also be GPL, with the source available.

BSD
→ basically MIT with slightly different wording.

MPL 2.0
→ copyleft per FILE. the files u changed stay MPL,
   the rest of ur project can be whatever u want.
```

> as one line each:

```
MIT     → simple and permissive
Apache  → permissive + patent protection
BSD     → permissive
MPL     → file level copyleft
GPL     → strong copyleft
```

### so which one do i pick

- **"i wrote a small library and i want people to just use it."** → **MIT**. it is 20 lines, everyone understands it, and nobody has to ask their lawyer.

- **"same, but a company might use it and their legal team is careful."** → **Apache 2.0**. same freedom, plus the patent grant that makes company lawyers comfortable.

- **"i built something and i do not want a company taking it, closing it and selling it."** → **GPL**. if they ship ur code, they have to ship their source too. that is the deal, and it is the reason linux is GPL.

- **"i want my files to stay open but not force anything on the project using them."** → **MPL 2.0**. the middle ground.

- **"it is my personal notes / my portfolio, and i do not want people reusing it as their own."** → then say so. no license means all rights reserved by default, and u can add a short line in the README saying u are happy for people to read and learn from it.

- **"it is a course / writing / images, not code."** → licenses like MIT are written for **software**. for writing, look at Creative Commons, for example `CC BY 4.0` (use it, credit me).

---

## 6. adding one

> the ez way, on github: when u create a repo, there is an **Add a license** dropdown. pick one, github writes the file. and on an existing repo, `Add file → Create new file`, type `LICENSE` as the name, and github offers u a license template button.

> by hand, it is just a file:

```bash
touch LICENSE
# paste the license text into it, and put ur name and the year in the copyright line
git add LICENSE
git commit -m "add the MIT license"
git push
```

> the MIT one is short enough to see all of it, and the only thing u change is that first line:

```text
MIT License

Copyright (c) 2026 Mohamed Attia

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, ...
```

> check it into the repo like any other file:

```bash
cat LICENSE
git add LICENSE
git commit -m "add the license"
```

- get the full text from [choosealicense.com](https://choosealicense.com), which is github's own site and asks u 2 questions instead of making u read 5 licenses.
- **important:** a license is a legal document. this section is a beginner's summary to get u started on ur own projects, not legal advice. if ur project has real commercial or legal weight, do not choose one from a short summary in a course.

---

## NOTES

1. **`git describe`** gives u a readable name for where u are, based on the nearest tag. build scripts love it:

```bash
git describe --tags
```

```
v1.1.0-3-g953afcd
```

> "3 commits after v1.1.0, at commit 953afcd".

2. **check out a tag** to see the code exactly as it was released:

```bash
git checkout v1.0.0
```

> u land in a detached HEAD ([[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]). that is expected, u are visiting a commit, not a branch. `git switch main` to come back.

3. **a CHANGELOG.md** next to ur tags is what makes them useful to other people: one section per version, what changed, in words. the tag says where, the changelog says what.

4. **tag `main`, not a feature branch.** a tag on a branch that later gets rebased or deleted is a tag pointing at a commit nobody can find.

5. this is the last chapter, so: nothing here is required to use git. u can write code for years without a single tag. but the day u put something out for other people, these 2 small files, a tag and a LICENSE, are the difference between a project and a folder.

---

## Assignment

1. In `practice-git`, tag ur latest commit `v1.0.0`.
2. List ur tags, and show the tag next to its commit in the log.
3. Tag ur **first** commit as `v0.1.0`, using its hash.
4. Delete `v0.1.0`.
5. Make an **annotated** tag `v1.1.0` with a message, and show the difference in `git show` between it and `v1.0.0`.
6. Push ur tags to github and find them under Releases.
7. Say which number u would change for: a fixed typo in the output, a new command line flag, and a renamed function everyone uses.
8. Check out `v1.0.0`, notice what git says about HEAD, and get back to `main`.
9. Add an MIT LICENSE to ur repo with ur name in it, and commit it.
10. Push it, and check that github now shows the license name on the repo page.
11. In one sentence, say why a public repo with no LICENSE is not actually free to use.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/10-tags-and-license/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|← Chapter 9]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]]
