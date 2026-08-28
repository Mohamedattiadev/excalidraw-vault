---
title: "Git 101"
aliases:
  - "11-Dev-101/Git-101"
  - "11-Dev-101/Git-101/index"
---

Notes I wrote while going back over git, turned into a course.

There are three reasons it exists. The first is to remind myself later, because
I forget things, and a page in my own words brings it back faster than a search
does. The second is that git is the tool everyone tells u to "just use", and
almost nobody explains what it is actually doing, so u end up copying commands
u do not understand and being scared of the ones u do not know. The third is
that once it was written well enough for me to come back to, it was already
good enough for someone else to start from.

Writing a thing out by hand is what makes it stay, so I wrote every line of
this myself and none of it is AI generated. The page is the side effect, the
remembering is the point.

So if something was ever unclear to me, it gets its own explanation here
instead of one line saying "this is obvious".

**Total time: about 11 hours 55 min**, split over 10 chapters.

---

## The chapters

| # | chapter | time | what u learn |
|---|---|---|---|
| 1 | [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Git Basics]] | ~60 min | what git is, the words, `init` `status` `add` `commit` `log` |
| 2 | [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|The Config File]] | ~35 min | global vs local, sections and keys, ur editor, aliases |
| 3 | [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|What Git Actually Stores]] | ~60 min | `blob` `tree` `commit`, the SHA, `cat-file`, `git log` |
| 4 | [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|GitHub and Remotes]] | ~90 min | ssh keys, `remote` `push` `pull`, `.gitignore`, `gh` |
| 5 | [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Branches and Merging]] | ~105 min | `branch` `switch`, HEAD and refs, `merge`, conflicts |
| 6 | [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Rebase and Squash]] | ~80 min | `rebase`, merge vs rebase, `squash`, `rerere` |
| 7 | [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Undoing Things]] | ~100 min | `diff` `restore` `reset` `amend` `revert` `reflog` |
| 8 | [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Stash, Cherry-pick and Bisect]] | ~75 min | `stash` and its stack, `cherry-pick`, `bisect` |
| 9 | [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|Forks and Pull Requests]] | ~60 min | forks, `upstream`, the PR flow, getting one accepted |
| 10 | [[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|Tags, Versions and the License]] | ~50 min | `tag`, SemVer, and choosing a `LICENSE` |

And when u forget something later: **[[02-Personal/11-Dev-101/Git-101/CHEATSHEET\|the cheat sheet]]**, every
command in the course on one page.

---

## Why this order

The chapters build on each other, and a few of them sit where they are on
purpose:

- **The config chapter comes second** (2 right after 1), because the first
  thing that happens when u try to commit is git refusing until u tell it who
  u are. U should know where that setting went, not just paste the command.
- **The objects chapter comes before branches** (3 before 5), because a branch
  is a pointer to a commit, and that sentence is meaningless until u have seen
  a commit with ur own eyes and know it points to a tree.
- **Remotes come before branches** (4 before 5), because pushing a branch is
  half of why branches exist, and because everyone wants their code on github
  early.
- **Rebase comes after merging** (6 after 5), because rebase is the other
  answer to a question u have to feel first, and because a rebase conflict is
  a merge conflict with different words around it.
- **The undo chapter comes late** (7), because u cannot undo a merge, a rebase
  or a commit u have not learned to make yet. It is also the one u will come
  back to the most.

---

## How the chapters are organized

Every chapter has the same 3 parts, always in this order:

1. **The lecture.** The actual topics, numbered, each one with the command and
   its real output.
2. **NOTES.** Small things that are useful to know but are not a topic on
   their own. Sometimes they relate to the chapter and sometimes they do not,
   they are just things u should know by that point.
3. **The assignment.** Tasks built only from what u learned in that chapter.
   The answers are in a `solutions.md` next to it, so u only see them when u
   decide to open them.

---

## How to study this

- Do them in order. Chapter 6 uses things from chapter 5, and chapter 5 uses
  things from chapter 3. Skipping will not work.
- **Type the commands, do not read them.** It looks easy when u read it, and
  then it is gone in two days. Open a terminal next to the page and run every
  single block.
- Make a `git-test` folder somewhere and do everything inside it, so u never
  break something u care about. Every chapter here was written from a folder
  exactly like that.
- Do the assignment **before** u open the solution. If u open it first, u are
  only reading again.
- **Ur hashes will not match mine.** Every commit id in these pages came from
  my machine, and yours will be different, because a commit contains ur name
  and the second u made it in. Chapter 3 explains exactly why, and shows u the
  one kind of hash that *will* match.
- The times assume u are actually typing everything and doing the assignment,
  not reading. One chapter a day is a good pace, so this is about two weeks.

---

## Before u start

- **U need a terminal.** Not much of one: `cd`, `ls`, `mkdir`, `echo`, and
  editing a file. If any of that is unfamiliar, do
  [[02-Personal/11-Dev-101/Terminal-101/index\|Terminal 101]] first, at least chapters 1 to 3.
- **U need git installed.** `git --version` should answer. If it does not,
  [git-scm.com](https://git-scm.com) or ur package manager.
- **U do not need a github account for chapters 1 to 3.** Git works entirely on
  ur own machine. Chapter 4 is where u will want one.

---

## References

- The video I used as the main reference:
  [Boot.dev, Learn Git](https://www.youtube.com/watch?v=rH3zE7VlIMs)
- [Boot.dev, Learn Git](https://www.boot.dev/courses/learn-git), the interactive
  course that video comes from.
- `git help <command>` for everything. It is already on ur machine.
- [git-scm.com/book](https://git-scm.com/book/en/v2), the Pro Git book, free
  and written by the people who build git. Chapter 10 of it is where to go
  when u want more than this course gives u.
- [choosealicense.com](https://choosealicense.com) for chapter 10.

---

## The video

**[[02-Personal/11-Dev-101/Git-101/watch\|Watch it here]]**, 30 minutes, no narration. If u want the player
with the cheat sheet sitting beside it instead, that page is
[on the dev-101 site](https://mohamedattiadev.github.io/dev-101/Git-101/video/watch.html).

Watch it after the chapters, or alongside them. It is a summary and not a
replacement: it shows u what happens, and these chapters are where the why is.
Every command in it was run on a real repo, and the output u see is what
actually came back.

---

[[02-Personal/11-Dev-101/index\|← back to dev-101]]
