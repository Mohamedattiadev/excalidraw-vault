---
title: "Chapter 9 — Forks and Pull Requests"
aliases:
  - "11-Dev-101/Git-101/09-forks-and-pull-requests"
  - "11-Dev-101/Git-101/09-forks-and-pull-requests/index"
---

**Time to study:** ~60 min
**You will learn:** what a fork is and when u actually need one, `upstream`, the full contribution flow from fork to merged PR, and how to write a PR that gets accepted.

[[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|← Chapter 8]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|next: Chapter 10 →]]

---

## 1. what is a fork

> a **fork** is ur own copy of someone else's repo, sitting under ur github account. it is not a git command, it is a github (or gitlab) button.

> u press it on a public repo, and 3 seconds later `github.com/someone/project` also exists at `github.com/u/project`. it is yours: u can push to it, break it, do whatever u want, and the original is untouched.

```
github.com/TusharKesarwani/Front-End-Projects     the original ("upstream")
              │
              │  u press Fork
              ▼
github.com/mohamedattiadev/Front-End-Projects     ur copy ("origin")
              │
              │  git clone
              ▼
        ~/projects/Front-End-Projects             ur laptop
```

> and then u clone **ur fork**, not the original:

```bash
git clone git@github.com:mohamedattiadev/Front-End-Projects.git
cd Front-End-Projects
```

---

## 2. do u even need a fork

> this is the part nobody explains, and it is the only thing u need to decide:

```
just want to read it / run it / learn from it   ->  git clone. no fork.
want to change it, and u have push access       ->  git clone. no fork.
want to change it, and u do NOT have access     ->  fork it.
```

> u cannot push to a repo u do not own. that is the entire reason forks exist. u fork so u have somewhere u **can** push to, and then u ask the owner to take those commits.

- and if u are only borrowing the code for urself and never sending anything back, `git clone` is enough. a fork is for **giving something back**.

---

## 3. the whole flow, start to finish

> u found a bug in a project and u want to fix it.

**1. fork it** on github, then clone ur fork:

```bash
git clone git@github.com:mohamedattiadev/the-project.git
cd the-project
```

**2. add the original as a second remote**, called `upstream` by convention:

```bash
git remote add upstream git@github.com:the-owner/the-project.git
git remote -v
```

```
origin	git@github.com:mohamedattiadev/the-project.git (fetch)
origin	git@github.com:mohamedattiadev/the-project.git (push)
upstream	git@github.com:the-owner/the-project.git (fetch)
upstream	git@github.com:the-owner/the-project.git (push)
```

> now u have 2 remotes and each one has a job:

```
origin    = ur fork.      u PUSH here.
upstream  = the original. u PULL from here. u cannot push to it.
```

**3. make a branch.** do not work on `main`, even in ur own fork. one branch per fix, named after the fix ([[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]):

```bash
git switch -c fix/login-button
```

**4. do the work, and commit it** the way u learned in [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]]:

```bash
git add .
git commit -m "fix: stop the login button submitting twice"
```

**5. push the branch to ur fork:**

```bash
git push -u origin fix/login-button
```

```
remote: Create a pull request for 'fix/login-button' on GitHub by visiting:
remote:      https://github.com/mohamedattiadev/the-project/pull/new/fix/login-button
To github.com:mohamedattiadev/the-project.git
 * [new branch]      fix/login-button -> fix/login-button
```

**6. open the pull request.** click that link, or use `gh` from [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]]:

```bash
gh pr create --web
```

> github shows u: **from** `mohamedattiadev:fix/login-button` **into** `the-owner:main`. check those 2 lines before u click, it is the one thing people get wrong.

**7. and then u wait.** the maintainer reviews it, maybe asks for changes. if they do, u fix it on the **same branch** and push again, and the PR updates itself. u do not open a new one:

```bash
# after their review
git add .
git commit -m "use the disabled attribute instead, as reviewed"
git push
```

**8. when it is merged**, delete ur branch and sync ur fork (next section).

---

## 4. keeping ur fork up to date

> ur fork does not update itself. the day after u fork it, the real project has moved on and ur `main` is behind. before u start anything new, sync it:

```bash
git switch main
git fetch upstream
git merge upstream/main      # or: git rebase upstream/main
git push origin main
```

> read those 4 lines, they are just [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]] and [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]] again: get their work, put it into my main, push my main to my fork.

- there is a shortcut with `gh`:

```bash
git switch main
gh repo sync
```

- **always sync before u make a new branch.** a PR built on a 3 month old `main` is full of conflicts that are not even ur fault, and that is the fastest way to have it ignored.

---

## 5. writing a PR that gets accepted

> the code is half of it. the other half is that a maintainer, who is a volunteer and has 40 open PRs, can understand urs in 30 seconds.

**before u click create:**

1. **read ur own diff.** `git diff main...HEAD`. u will find a debug `console.log`, a commented out block, a whole file u did not mean to add. everyone does, every time.
2. **check that the thing u are fixing is wanted.** look at the issues. a PR nobody asked for, that changes 40 files, gets closed. and this is the real advice: if u found something worth fixing, **open an issue first** and ask. when the maintainer says "yes please", ur PR is already half accepted before u write a line.
3. **one PR, one thing.** a fix and a refactor and a rename in one PR cannot be reviewed, so it will not be.
4. **make sure it builds and the tests pass.** on ur machine, before u push.

**the description:**

```markdown
## what
one or two lines. what does this change.

## why
the issue number, or the bug. "fixes #142".

## how
the approach, if it is not obvious from the diff.

## how to test it
the exact steps to see it working. this is the part maintainers love,
because it saves them the 10 minutes of working out how to check it.
```

- **be nice to the review.** "can u explain why u did it this way" is not an attack, it is someone doing u the favour of reading ur code. answer it, change it if they are right, and say so if u disagree, politely.
- **and be patient.** days is normal. weeks is normal. a polite "any thoughts on this?" after a week is fine, 5 comments in 2 days is not.

---

## 6. issues

> an **issue** is a bug report or a request, and it is where a contribution should usually start.

```bash
gh issue list
gh issue create
```

> a useful issue has: what u expected, what happened, the exact steps to reproduce it, and ur version. an issue that says "it doesn't work" gets closed and it deserves to be.

- most projects label some issues `good first issue`, and that is genuinely the door in. those are chosen to be small and self contained, on purpose, for people exactly where u are now.

---

## NOTES

1. **fork vs clone, one line each:**

```
clone = a copy on MY MACHINE       (a git command)
fork  = a copy on MY GITHUB        (a github button)
```

2. **a PR from ur fork is still just a branch.** everything u learned in Chapter 5 and 6 works on it: u can rebase it, squash it, and force push it with `--force-with-lease` before it is reviewed. many maintainers will ask u to squash 12 commits into 1 before they merge, and now u know how.

3. **`git pull upstream main` into ur feature branch** is how u fix a PR that has gone stale and shows conflicts on github. resolve them locally, push, and the PR goes green again.

4. **look at CONTRIBUTING.md.** if the repo has one, it tells u the branch naming, the commit style and the tests they expect. reading it takes 2 minutes and it is the difference between a merged PR and an ignored one.

5. contributing to open source is not about being an expert. fixing a typo in a README is a real, accepted, merged contribution, and it teaches u this whole flow with nothing on the line.

---

## Assignment

1. Fork a public repo on github. Any small one, or [dev-101](https://github.com/Mohamedattiadev/dev-101) if u want.
2. Clone **ur fork**, not the original, and show what `origin` points to.
3. Add the original as `upstream` and show both remotes.
4. Sync ur `main` with `upstream` and push it to ur fork, even if nothing changed.
5. Make a branch for one small change, with a name that says what it does.
6. Make the change and commit it with a message someone else could understand.
7. Push the branch **to ur fork**, and find the pull request link in the output.
8. Read ur own diff against `main` before u open anything. Is there anything in it u did not mean to include?
9. Open the PR, and check the "from" and "into" lines before u create it.
10. Write the description with what, why and how to test it.
11. Push one more commit onto the same branch and watch the PR update itself.
12. Say in one sentence why u could not have done any of this without a fork.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|← Chapter 8]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|next: Chapter 10 →]]
