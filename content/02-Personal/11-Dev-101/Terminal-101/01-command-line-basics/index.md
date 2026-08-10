---
title: "Chapter 1 — Command Line Basics"
aliases:
  - "11-Dev-101/Terminal-101/01-command-line-basics"
  - "11-Dev-101/Terminal-101/01-command-line-basics/index"
---

**Time to study:** ~45 min
**You will learn:** `echo`, the difference between CLI and GUI, the terminal words everyone mixes up, how to make variables, the two kinds of quotes, and the `Tab` key that makes all of it faster.

[[02-Personal/11-Dev-101/Terminal-101/index\|← back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/02-the-linux-file-system/index\|next: Chapter 2 →]]

---

## 1. the very basic command u can ever use

```bash
echo "Hello World"
```

> this is basically the same as writing "Hello World" in a text editor, it prints `Hello World` to the terminal.

```
Hello World
```

---

## 2. why do i really need to learn the CLI

> to get the idea of how to use the terminal we should first understand what is the CLI and what is the difference between the CLI and the GUI.

> `GUI` (Graphical User Interface): we all already know what it is. when u open any application u have a window opened with a navbar, buttons and a scrolling bar, which is something u can navigate with ur mouse.

on the other hand,

> `CLI` (Command Line Interface): is a way to interact with the computer, it is a text based interface, we can type commands in the terminal and execute them.

- example: let's say we have a python file we need to run. with the GUI we open vscode → we click the `run` button → the terminal opens and done.

if we want to do the same work with the terminal, we `cd` to the directory where the py file is located → then we type `python filename.py` → then Enter and we are done.

> note: the `cd` command is used to change the directory, we will learn it in [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]].

this is the main difference between the CLI and the GUI. the CLI is a text based interface where we type commands and execute them, the GUI is graphic based and can be navigated with the mouse.

---

## 3. some words that need to be differentiated

- `Terminal`: the first time the word Terminal was used, it was for a physical device (a too old device). it was like a computer that had its own keyboard u can use to interact with it, and on the screen the very familiar black terminal screen with its white command line. but nowadays we use the word Terminal to refer to the terminal emulator programs.

- `Terminal Emulator`: is basically a software program that emulates the behaviour of the old physical terminal device. the most known ones are `Alacritty` and `ghostty`. it can accept commands and render text on the screen.

- `Shell`: is what happens behind the scenes. when we write a command in the terminal emulator, the shell interprets it and executes it then returns the result. it works with a very basic idea called `REPL` which is Read → Eval → Print → Loop, too ez. examples of shells: `Bash`, `Zsh` and `Fish`.

---

> and this is the right moment to say it, because the next section is where it starts to matter: **there is more than one shell, and they do not all speak the same language.** this course teaches `bash`.

```bash
echo $SHELL
```

```
/usr/bin/fish
```

> if that does not say `bash`, type `bash` and press Enter before u continue. u are now inside a bash session and everything in this course works as written. `exit` puts u back to ur normal shell.

- i use `fish` myself, and in fish the very next section already fails. `name="ati"` gives u `fish: Unsupported use of '='`. so this is not something to skip.
- the full explanation is in the [[02-Personal/11-Dev-101/Terminal-101/index\|course README]], under "before u start".

---

## 4. how to write variables in the terminal

> in python we can use `=` to assign a value to a variable, the same in the terminal.

```bash
name="ati"
echo $name
```

```
ati
```

> so we assign the value with `=` and we read it back by putting `$` in front of the name.

- note: no space before or after the `=`. `name = "ati"` is wrong, the right one is `name="ati"`.

---

## 5. the two kinds of quotes

> u just saw that `$name` gets replaced by its value. so now there is one thing u need to know before it bites u, because it will.

> **double quotes let the `$` work. single quotes do not.**

```bash
name="ati"
echo "hello $name"
```

```
hello ati
```

```bash
echo 'hello $name'
```

```
hello $name
```

> look at the second one. with the single quotes nothing was replaced, u got `$name` back exactly as u typed it. with the double quotes u got the value.

- so the rule is short: **double quotes when u want the variable, single quotes when u want the text itself.**

> it looks like a small detail now. it is not, and u will meet it again in almost every chapter after this one.

---

> and one more thing about quotes while we are here. if a file name has a space in it, u have to quote it, otherwise the terminal thinks u are talking about 2 different things:

```bash
touch my file.txt
ls
```

```
file.txt  my
```

> that made 2 files, `my` and `file.txt`, which is not what we wanted. so:

```bash
touch "my file.txt"
ls
```

```
my file.txt
```

- this is also the reason u will see developers avoid spaces in file names completely and write `my-file.txt` or `my_file.txt` instead. it is just less to think about.

---

## NOTES

these are small commands and tricks u will use all the time, they are not a topic on their own but u should know them.

1. **the `Tab` key**: this is the most useful key in the whole terminal and nobody tells u about it.

> u start typing a file or a folder name, u press `Tab`, and the terminal finishes it for u.

```bash
cd Doc<Tab>
```

```bash
cd Documents/
```

> u don't type long paths. u type 3 letters and press `Tab`.

- if more than one thing matches, nothing happens on the first press. press `Tab` again and it shows u the choices:

```bash
cd Do<Tab><Tab>
```

```
Documents/  Downloads/
```

> then u type one more letter to make it clear which one, and press `Tab` again.

- it works on commands too, not only files. type `chm` then `Tab` and u get `chmod`.
- and it saves u from typos. if `Tab` does not complete the name, that usually means the file is not there or u are not in the folder u think u are in. it is a free spell check.

2. **`ctrl + r`**: search backwards in ur history.

> the arrow keys are fine for the last 3 commands. but when the command u want was 40 commands ago, u press `ctrl + r` and start typing any part of it:

```
(reverse-i-search)`grep': grep -rn "hello" ./notes
```

> keep pressing `ctrl + r` to go further back through the matches, and press Enter to run the one u found, or the arrow keys to edit it first.

3. `history`: shows u the last commands u used in ur terminal.

```bash
history
```

```
  1  echo "Hello World"
  2  name="ati"
  3  echo $name
  4  whoami
  5  history
```

4. `whoami`: shows u the username of the current user.

```bash
whoami
```

```
ati
```

5. the arrow keys: u can use the up and down arrows to go through the previous commands in ur history, so u don't type the same long command again.

6. `clear`: clears the screen of the terminal.

```bash
clear
```

---

## Assignment

1. Assign ur name, surname, age and ur job to variables.
2. Print each variable with `echo`.
3. Try to write this sentence in the terminal using ur variables:
   *"Hello everyone! My name is Mohamed Ati. I am 23 years old, and I work as a programmer."*
4. Use `history` to find the first command u typed in this chapter.
5. Add more variables and print them together in one line.
6. Print the sentence `my variable is called $name` on the screen, with the `$name` showing as text and not being replaced.
7. Create a file with a space in its name, then delete it. Both times, quote it properly.
8. Use `Tab` to move into ur `Documents` folder without typing the whole word.
9. Use `ctrl + r` to find and re-run a command u typed earlier in this chapter.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/01-command-line-basics/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/index\|← back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/02-the-linux-file-system/index\|next: Chapter 2 →]]
