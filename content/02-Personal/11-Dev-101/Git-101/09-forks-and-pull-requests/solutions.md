---
title: "Chapter 9 — Forks and Pull Requests — Solutions"
aliases:
  - "11-Dev-101/Git-101/09-forks-and-pull-requests/solutions"
  - "11-Dev-101/Git-101/09-forks-and-pull-requests/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|back to the chapter]]

---

```bash
# 1
# on github: open the repo, press Fork, top right.

# 2
git clone git@github.com:mohamedattiadev/dev-101.git
cd dev-101
git remote -v
# origin  git@github.com:mohamedattiadev/dev-101.git   <- MY fork

# 3
git remote add upstream git@github.com:Mohamedattiadev/dev-101.git
git remote -v

# 4
git switch main
git fetch upstream
git merge upstream/main
git push origin main

# 5
git switch -c docs/fix-typo-in-readme

# 6
# make the change, then:
git add .
git commit -m "docs: fix the typo in the terminal chapter link"

# 7
git push -u origin docs/fix-typo-in-readme

# 8
git diff main...HEAD

# 9
gh pr create --web
# or click the link github printed in step 7

# 10
# in the PR body:
#   ## what   one line
#   ## why    fixes #<the issue number>
#   ## how to test it   the exact steps

# 11
git add .
git commit -m "docs: fix the second one too"
git push

# 12
# because i cannot push to a repo i do not own. the fork is the copy i CAN push to.
```

output of 3:

```
origin	git@github.com:mohamedattiadev/dev-101.git (fetch)
origin	git@github.com:mohamedattiadev/dev-101.git (push)
upstream	git@github.com:Mohamedattiadev/dev-101.git (fetch)
upstream	git@github.com:Mohamedattiadev/dev-101.git (push)
```

output of 7:

```
remote: Create a pull request for 'docs/fix-typo-in-readme' on GitHub by visiting:
remote:      https://github.com/mohamedattiadev/dev-101/pull/new/docs/fix-typo-in-readme
To github.com:mohamedattiadev/dev-101.git
 * [new branch]      docs/fix-typo-in-readme -> docs/fix-typo-in-readme
```

- in step 4 nothing may happen, and that is fine. `Already up to date` means ur fork was
  not behind yet. do it anyway before every new branch, it costs 4 seconds.
- in step 8, `main...HEAD` with **3 dots** means "everything on my branch that main does
  not have", which is exactly what the PR will show. with 2 dots u get a different
  comparison and it will confuse u.
- in step 11, notice u did not open a second PR. a PR follows the **branch**, so any new
  commit u push to that branch appears in it immediately.
- in step 5, if u worked on `main` in ur fork instead of a branch, everything still works,
  but ur next PR would carry these commits too. one branch per PR keeps them separate.

---

[[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|back to the chapter]]
