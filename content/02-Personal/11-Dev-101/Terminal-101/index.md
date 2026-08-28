---
title: "Terminal 101"
aliases:
  - "11-Dev-101/Terminal-101"
  - "11-Dev-101/Terminal-101/index"
---

Notes I wrote while going back over the terminal, turned into a course.

There are three reasons it exists. The first is to remind myself later, because
I forget things, and a page in my own words brings it back faster than a search
does. The second is that writing a thing out by hand is what makes it stay, so
I wrote every line of this myself and none of it is AI generated. The page is
the side effect, the remembering is the point. The third is that once it was
written well enough for me to come back to, it was already good enough for
someone else to start from.

So if something was ever unclear to me, it gets its own explanation here
instead of one line saying "this is obvious".

**Total time: about 11 hours 15 min**, split over 9 chapters.

---

## The chapters

| # | chapter | time | what u learn |
|---|---|---|---|
| 1 | [[02-Personal/11-Dev-101/Terminal-101/01-command-line-basics/index\|Command Line Basics]] | ~45 min | `echo`, CLI vs GUI, terminal / emulator / shell, variables, quotes, the `Tab` key |
| 2 | [[02-Personal/11-Dev-101/Terminal-101/02-the-linux-file-system/index\|The Linux File System]] | ~45 min | what the real tree is: `/etc` `/var` `/usr` `/tmp` `/home` and the rest |
| 3 | [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Files and Navigation]] | ~90 min | `cd` `ls` `pwd` `mkdir` `touch` `rm` `cp` `mv` `cat` `less` `head` `tail`, the `*` wildcard, `man` |
| 4 | [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|Searching: grep and find]] | ~60 min | `grep` and its flags, `find` and its patterns |
| 5 | [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Permissions and sudo]] | ~75 min | root, `sudo`, reading `-rw-r--r--`, `chmod`, `chown` |
| 6 | [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|Text Editors]] | ~60 min | `nano`, and `vim` with the modes idea behind it |
| 7 | [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Scripts, Env and PATH]] | ~75 min | compiled vs interpreted, shebang, `export`, `.bashrc`, aliases, `PATH` |
| 8 | [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Input, Output and Processes]] | ~105 min | exit codes, `>` `>>` `2>`, the `\|` pipe, `&&`, background jobs, `ps` `kill` `top` |
| 9 | [[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|Bash Scripting Basics]] | ~120 min | arguments, `if`, loops, `read`, functions, and a real 25 line script |

And when u forget something later: **[[02-Personal/11-Dev-101/Terminal-101/CHEATSHEET\|the cheat sheet]]**, every
command in the course on one page.

---

## Why this order

The chapters build on each other, and a few of them sit where they are on
purpose:

- **The editors come before the scripting chapters** (6 before 7 and 9),
  because u cannot write a 30 line script with `echo` and `>>`. U need `nano`
  or `vim` first.
- **Permissions come before scripts** (5 before 7), because the first thing
  that happens when u run ur own script is `Permission denied`, and u should
  already know why.
- **Pipes and exit codes come before bash scripting** (8 before 9), because
  `if [ $? -eq 0 ]` is meaningless until u know what `$?` is.

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

- Do them in order. Chapter 9 uses things from chapter 8, and chapter 8 uses
  things from chapter 3. Skipping will not work.
- **Type the commands, do not read them.** It looks easy when u read it, and
  then it is gone in two days. Open a terminal next to the page and run every
  single block.
- Make a `practice` folder somewhere and do everything inside it, so u never
  break something u care about.
- Do the assignment **before** u open the solution. If u open it first, u are
  only reading again.
- Forgetting a command later is normal and expected. That is what `man` and the
  [[02-Personal/11-Dev-101/Terminal-101/CHEATSHEET\|cheat sheet]] are for. U are learning where to look, not
  memorising a list.
- The times assume u are actually typing everything and doing the assignment,
  not reading. One chapter a day is a good pace, so this is about two weeks.

---

## References

- The video I used as the main reference:
  [Boot.dev, Learn the Terminal](https://www.youtube.com/watch?v=v392lEyM29A)
- `man <command>` for everything else. It is already on ur machine.

---

## The video

**[[02-Personal/11-Dev-101/Terminal-101/watch\|Watch it here]]**, 25 minutes, no narration. If u want the player
with the cheat sheet sitting beside it instead, that page is
[on the dev-101 site](https://mohamedattiadev.github.io/dev-101/Terminal-101/video/watch.html).

Watch it after the chapters, or alongside them. It is a summary and not a
replacement: it shows u what happens, and these chapters are where the why is.
Every command in it was run on a real machine, and the output u see is what
actually came back.

It ends on a two page cheat sheet, and that sheet is
[[02-Personal/11-Dev-101/Terminal-101/CHEATSHEET\|CHEATSHEET.md]] here if u want to copy from it.

---

[[02-Personal/11-Dev-101/index\|← back to dev-101]]
