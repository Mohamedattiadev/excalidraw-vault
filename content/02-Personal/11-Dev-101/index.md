---
title: "Dev 101"
aliases:
  - "11-Dev-101"
  - "11-Dev-101/index"
---

Everything I learn about building things, written down as a course while I am
learning it.

Not computer science. There is no big-O here and nothing to memorise for an
exam. This is the other half: the terminal, git, the web, deployment. The things
u touch every day and that nobody sits u down and explains.

It is not documentation and it is not a reference. It is the notes of someone
learning the thing for the first time, cleaned up enough that another beginner
can follow them. If something confused me, it gets a full explanation instead of
one line saying "this is obvious".

None of it is AI generated. I wrote every line by hand while I was learning it.

---

## The courses

| course | status | time | video | what it covers |
|---|---|---|---|---|
| [[02-Personal/11-Dev-101/Terminal-101/index\|Terminal 101]] | **finished** | ~11h 15min | [[02-Personal/11-Dev-101/Terminal-101/watch\|watch, 25 min]] | the shell, the linux file tree, permissions, editors, scripts, pipes, processes, bash scripting |
| [[02-Personal/11-Dev-101/Git-101/index\|Git 101]] | **finished** | ~11h 55min | [[02-Personal/11-Dev-101/Git-101/watch\|watch, 30 min]] | what git stores, commits, branches, merges, rebase, remotes, undoing things, pull requests, tags |
| HTML & CSS | planned | - | *when the course is* | structure and styling of a page |
| JavaScript | planned | - | *when the course is* | the language, the DOM, async |
| React | planned | - | *when the course is* | components, state, hooks |
| DevOps | planned | - | *when the course is* | docker, CI, deployment |
| DNS & Networking | planned | - | *when the course is* | how a domain actually reaches a server |

> The planned ones have no pages yet. I add a course when I have real content
> for it, not before.

A course video is a summary of that course, not a replacement for it.

---

## How every course is organized

Every course follows the same shape, so once u learn one, u know how to read all
of them:

```
Course-Name/
  index.md            the index: times, how to study, references
  CHEATSHEET.md       every command in the course on one page
  watch.md            the video, if there is one
  01-first-topic/
    index.md          the lecture, the notes and the assignment
    solutions.md      the answers, kept out of the lecture on purpose
  02-second-topic/
    ...
```

And every chapter has the same 3 parts, always in this order:

1. **The lecture.** The topics, numbered, each one with the real command and its
   real output.
2. **NOTES.** Small useful things that are not a topic on their own.
3. **The assignment.** Tasks from that chapter only. The answers live in a
   `solutions.md` next to the chapter, never inline, so u never read them by
   accident.

Each chapter starts with how long it takes and what u will learn, and ends with
links to the previous and next chapter.

---

## How to study anything here

- Go in order. The chapters build on each other.
- Type the commands, do not read them. It looks easy when u read it, and then it
  is gone in two days.
- Do the assignment before u open the solution.
- The time written on a chapter is the reading time, not the learning time. One
  chapter a day is a good pace.

---

## Where this lives

These pages are a copy. The course is its own repo, and that is where issues and
pull requests go: [dev-101](https://github.com/Mohamedattiadev/dev-101).

It is here too because a study site with the terminal missing is an incomplete
study site. If u are reading the CS notes and hit a command u do not know, the
answer should be one click away and not one repo away.
