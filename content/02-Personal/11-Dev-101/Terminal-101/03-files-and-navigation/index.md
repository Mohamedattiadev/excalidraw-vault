---
title: "Chapter 3 — Files and Navigation"
aliases:
  - "11-Dev-101/Terminal-101/03-files-and-navigation"
  - "11-Dev-101/Terminal-101/03-files-and-navigation/index"
---

**Time to study:** ~90 min
**You will learn:** how to move around the tree and how to create, copy, move, delete and read files, plus the `*` wildcard that makes all of them faster.

[[02-Personal/11-Dev-101/Terminal-101/02-the-linux-file-system/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|next: Chapter 4 →]]

---

## 1. commands for navigating the file system

> previously we wanted to enter the `Terminal-101` dir and we explained it in human words. in order to do it in the terminal we use `cd` (change directory).

```bash
# we can use it step by step :
cd /
cd home
cd ati
cd Attia-Pro
cd Projects
cd Terminal-101

# or we can do it in one command :
cd /home/ati/Attia-Pro/Projects/Terminal-101
```

- note: the `/` at the beginning means "start from the root". without it, `cd home` means "the `home` folder inside where i am standing right now", which is not the same thing.

---

> after we go into the `Terminal-101` dir we can see what is inside by using `ls` (list).

```bash
ls
```

```
01-command-line-basics  02-the-linux-file-system  03-files-and-navigation  README.md
```

---

> let's say we forgot where we are in the file system, we can use `pwd` (print working directory) to find our current path.

```bash
pwd
```

```
/home/ati/Attia-Pro/Projects/Terminal-101
```

---

> now i found that i am in the wrong dir and i want to go back to the `Projects` dir, so i use `cd ..`.

```bash
cd ..
pwd
```

```
/home/ati/Attia-Pro/Projects
```

> and let's say i want to go back more than one step, i just repeat it:

```bash
cd ../../../
pwd
```

```
/home
```

> and if i want to go to the root dir there is a too ez command:

```bash
cd /
pwd
```

```
/
```

---

> i am in the right path right now and i want to create a new directory, i can use `mkdir` (make directory).

```bash
cd /home/ati/Attia-Pro/Projects/Terminal-101
mkdir practice
ls
```

```
01-command-line-basics  02-the-linux-file-system  03-files-and-navigation  practice  README.md
```

> it is created in the current dir, so always check `pwd` first if u are not sure where u are standing.

---

> let's say i wrongly created a dir with the name `practise` with the wrong spelling and i want to remove it, i can use `rmdir` (remove directory).

```bash
mkdir practise
rmdir practise
ls
```

```
01-command-line-basics  02-the-linux-file-system  03-files-and-navigation  practice  README.md
```

- note: `rmdir` only works on an **empty** directory. if there is anything inside it, it will refuse:

```bash
rmdir practice
```

```
rmdir: failed to remove 'practice': Directory not empty
```

> for that case we have `rm -rf` which is at the end of this section.

---

> now i want to create a new markdown file with the name `notes`, i can use `touch`.

```bash
cd practice
touch notes.md
ls
```

```
notes.md
```

---

> now i want to remove the file i created since i made it in the wrong dir, i use `rm` (remove).

```bash
rm notes.md
ls
```

```
(nothing, the dir is empty now)
```

---

> also there is a command which i mostly use to remove a directory: `rm -rf`.
> the `-r` means recursive and the `-f` means force, so it will remove the dir and whatever is inside it.

- this command is a very powerful one, because sometimes we have folders which contain corrupted data or files that do not want to be deleted, and with this command u can do it like a piece of cake.

- careful: it never asks u to confirm and there is no trash bin to get it back from. always run `pwd` and `ls` before u run it, and never run it on `/`.

```bash
cd ..
mkdir -p old-stuff/inside
touch old-stuff/inside/file.txt
rm -rf old-stuff
ls
```

```
01-command-line-basics  02-the-linux-file-system  03-files-and-navigation  practice  README.md
```

---

> now i want to copy a file into one of the dirs, we can use `cp` (copy).

```bash
cp README.md practice/
ls practice
```

```
README.md
```

> u can also copy a whole directory with the `-R` flag, which means copy the directory and its content recursively.

```bash
cp -R practice practice-backup
ls
```

```
01-command-line-basics  02-the-linux-file-system  03-files-and-navigation  practice  practice-backup  README.md
```

---

> oops, i put the file in the wrong dir, i want to move it to another dir, i can use `mv` (move).

```bash
mv practice/README.md practice-backup/
ls practice-backup
```

```
README.md
```

---

> i added some text inside my file and i want to see it without opening a GUI editor, i can use `cat`.

```bash
cd practice-backup
cat README.md
```

```
# Terminal 101

a course about the terminal, written while going back over it.

## Chapters

1. Command Line Basics
2. The File System
3. Search
4. Permissions
5. Scripts and PATH
6. Input, Output and Processes
7. Text Editors

## How to study

read the chapter, then do the assignment at the end of it.
before u move to the next chapter, make sure u can do the
assignment without looking at the solution.
```

---

> now we have another command which is similar to `cat`, which is `less`.

```bash
less README.md
```

```
# Terminal 101

a course about the terminal, written while going back over it.

## Chapters

1. Command Line Basics
2. The File System
3. Search
4. Permissions
5. Scripts and PATH
6. Input, Output and Processes
7. Text Editors

## How to study

read the chapter, then do the assignment at the end of it.
before u move to the next chapter, make sure u can do the
assignment without looking at the solution.
:
```

- note: the difference between `cat` and `less` is that `cat` concatenates the file and prints it all at once in the terminal, while `less` opens an interactive viewer which enables u to scroll up and down to see the content. `less` is preferred for larger files.
- to get out of `less` press `q`.

---

> now i want to print the first 10 lines of the file or the last 10 lines, i can use `head` and `tail`.

```bash
head README.md
```

```
# Terminal 101

a course about the terminal, written while going back over it.

## Chapters

1. Command Line Basics
2. The File System
3. Search
4. Permissions
```

```bash
tail README.md
```

```
4. Permissions
5. Scripts and PATH
6. Input, Output and Processes
7. Text Editors

## How to study

read the chapter, then do the assignment at the end of it.
before u move to the next chapter, make sure u can do the
assignment without looking at the solution.
```

- note: this file is 19 lines, and 10 + 10 is more than 19, so the two outputs overlap in the middle. that is why `4. Permissions` is the last line of `head` and the first line of `tail`. on a file longer than 20 lines they would not touch at all.

> we can also add the `-n` flag which means how many lines will be printed.

```bash
head -n 3 README.md
```

```
# Terminal 101

a course about the terminal, written while going back over it.
```

```bash
tail -n 3 README.md
```

```
read the chapter, then do the assignment at the end of it.
before u move to the next chapter, make sure u can do the
assignment without looking at the solution.
```

---

## 2. the `*` wildcard

> everything above works on one file at a time. but most of the time u want to do the same thing to 20 files, and typing 20 names is not realistic.

> so we have the wildcards. `*` means "anything, any number of characters".

let's say this is what we have:

```bash
ls
```

```
notes.md  notes.txt  old.txt  photo.jpg  readme.md
```

```bash
ls *.txt
```

```
notes.txt  old.txt
```

```bash
ls *.md
```

```
notes.md  readme.md
```

> and it works with every command we learned above, not only `ls`:

```bash
cp *.txt backup/       # copy every txt file into backup
rm *.jpg               # delete every jpg file
mv *.md notes/         # move every md file into notes
```

---

> now the part that matters, and it is the thing that confuses everyone including me:

> **the `*` is not a feature of `ls` or `cp` or `rm`. it is the shell.**

> before `ls` even starts, the shell looks at `*.txt`, finds the files that match, and replaces the `*.txt` with their names. so `ls` never sees a star at all. it just receives a list of file names as if u typed them by hand.

> u don't have to believe me, u can see it happen. `echo` just prints what it is given, so let's give it a star:

```bash
echo *.txt
```

```
notes.txt old.txt
```

> `echo` has nothing to do with files. it printed the file names because the shell had already replaced the `*.txt` before `echo` ran. that is the whole idea, and once u see it once u never forget it.

- careful: this is also why `rm *` is so dangerous. u are not asking `rm` to be clever, the shell hands it every single file name in the folder and `rm` deletes all of them, exactly as told. always run `ls *` first to see what u are about to hit, then change `ls` to `rm`.

---

> the other wildcards, u will use them less but u should recognize them:

- `?` matches exactly **one** character:

```bash
ls file?.txt
```

```
file1.txt  file2.txt
```

> so `file1.txt` and `file2.txt` match, but `file10.txt` does not, because that is 2 characters where the `?` allows one.

- `[...]` matches one character out of a list. so `[12]` means "either a 1 or a 2", not "12":

```bash
ls file[12].txt
```

```
file1.txt  file2.txt
```

> and now, when we get to `find` in [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|Chapter 4]] and it tells u to put ur pattern in quotes, u will know exactly why. the quotes stop the shell from eating the star, so that `find` gets to see it and use it itself.

---

## NOTES

1. `man`: it is used to show the manual of a command.

> since we have learned the most important basic commands in the terminal, i want u to know also a very useful command which is `man`.

- let's say u learned all the commands above or other ones, doesn't matter, but u did not use them for a long time so u are not able to remember all of them, which is expected. so u can use the `man` command which shows u the manual of a command.

- example: u have this powerful and dangerous command `rm -rf` but u can not remember what the `-r` or the `-f` are, so u can check the `man` page of it.

```bash
man rm
```

```
RM(1)                        User Commands                       RM(1)

NAME
       rm - remove files or directories

SYNOPSIS
       rm [OPTION]... [FILE]...

DESCRIPTION
       This manual page documents the GNU version of rm. rm removes
       each specified file. By default, it does not remove directories.

OPTIONS
       -f, --force
              ignore nonexistent files and arguments, never prompt

       -r, -R, --recursive
              remove directories and their contents recursively
...
```

> by reading this manual u can basically know what is what and remind urself of the commands. press `q` to get out of it, same as `less`.

2. the `flags`:

- u saw them already: `ls -l`, `ls -a`, `ls -la`. what comes after the `-` is the flag, and it may be a small or a big letter, they are not the same thing.
- most commands have a **short version** and a **long version** of the same flag. `ls -a` is the short one and `ls --all` is the long one, they do exactly the same. the long one is easier to read in a script, the short one is faster to type.
- u can stack short flags together, `ls -la` is the same as `ls -l -a`.
- if u check the `man` page u will find both versions listed next to each other for every command.

3. the path shortcuts:

these are not commands, they are shortcuts u can use anywhere u would write a path.

- `~` means ur home dir:

```bash
cd ~
pwd
```

```
/home/ati
```

- `.` means the current dir. u may already have seen it used by most developers when they write something like `code .` which basically means open vscode with the current dir.
- `..` means the parent dir, one step back. that is why `cd ..` works.

> in [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]] we will learn how to make ur own shortcuts with `alias`, and how to keep them forever in the `.bashrc` file.

4. the positional arguments matter:

> which means which argument u write first and which one u write last changes what happens.

```bash
mv notes.md ../
# or
mv file1.md file2.md ../
```

> so we start with the file names and the directory name goes last.

- small but important note:

```bash
mv file1.md file2.md
```

> if we use `mv` with only two file names and no directory at the end, we are taking the content of `file1.md` and putting it in `file2.md` and removing `file1.md`. basically it is renaming `file1.md` to be `file2.md`.

---

---

## Assignment

1. Go to ur home dir using the shortcut, then print where u are to prove it.
2. Create a dir called `ch3-practice` and go inside it.
3. Create 3 files: `one.txt`, `two.txt`, `three.txt`.
4. Write ur name inside `one.txt` and read it back without opening an editor.
5. Rename `two.txt` to `renamed.txt`.
6. Make a dir called `backup` and copy all 3 files into it **using a wildcard**, not by typing the 3 names.
7. Print only the first 2 lines of `one.txt`.
8. Use `echo` to prove to urself what `*.txt` expands to before the command runs.
9. Create `file1.txt`, `file2.txt` and `file10.txt`, then list only the two with a single digit.
10. Delete the whole `ch3-practice` dir in one command.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/02-the-linux-file-system/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|next: Chapter 4 →]]
