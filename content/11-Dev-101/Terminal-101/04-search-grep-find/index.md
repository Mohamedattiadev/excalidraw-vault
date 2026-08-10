---
title: "Chapter 4 — Searching: grep and find"
---

**Time to study:** ~60 min
**You will learn:** how to search for text inside files with `grep`, and how to search for files themselves with `find`.

[[11-Dev-101/Terminal-101/03-files-and-navigation/index\|← Chapter 3]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[11-Dev-101/Terminal-101/05-permissions-sudo/index\|next: Chapter 5 →]]

---

> before we start, all the examples below are run from inside the `Terminal-101` dir, so the file tree is this one:

```
Terminal-101/
├── README.md
├── CHEATSHEET.md
├── 01-command-line-basics/
│   └── README.md
├── 02-the-linux-file-system/
│   └── README.md
├── 03-files-and-navigation/
│   └── README.md
├── 04-search-grep-find/
│   ├── README.md
│   └── fruits.txt
└── ... (chapters 5 to 9, each with a README.md)
```

---

## 1. the `grep` command (finding text)

> `grep` is when u as a normal user want to search for something and u use the keymap `ctrl+f` or the search bar at the top of ur window. `grep` basically has the same behaviour here. u can think about it like the `ctrl+f` of the terminal.

- example: i want to search for the word `Hello` in the file `01-command-line-basics/README.md`:

```bash
grep "Hello" 01-command-line-basics/README.md
```

```
echo "Hello World"
> this is basically the same as writing "Hello World" in a text editor, it prints `Hello World` to the terminal.
Hello World
echo "Hello everyone! My name is $name $surname. I am $age years old, and I work as a $job."
```

> so `grep` prints back **every line** that contains the word, not the word alone. this is the thing most people get wrong the first time.

---

> we can also use it to grep from more than one file:

```bash
grep "Hello" 01-command-line-basics/README.md 02-the-linux-file-system/README.md
```

```
01-command-line-basics/README.md:echo "Hello World"
01-command-line-basics/README.md:Hello World
01-command-line-basics/README.md:echo "Hello everyone! My name is $name $surname..."
```

> notice what changed: when u pass more than one file, `grep` puts the **file name in front of every line** so u know where each result came from. with one file it doesn't, because there is nothing to be confused about.

---

> we can also use the `-r` flag to grep from all the files in the current dir.
> the `.` here means the current dir, so it searches every file under it recursively.

```bash
grep -r "Hello" .
```

```
./01-command-line-basics/README.md:echo "Hello World"
./01-command-line-basics/README.md:Hello World
./01-command-line-basics/README.md:echo "Hello everyone! My name is $name $surname..."
./03-files-and-navigation/README.md:echo "Hello World" > hello.txt
```

---

> for the next flags we will use a small file so u can actually see what changes. this is `fruits.txt`:

```bash
cat fruits.txt
```

```
apple
Banana
cherry
apple pie
```

---

> the `-i` flag makes the search case insensitive:

```bash
grep "banana" fruits.txt
```

```
(nothing, because the file has "Banana" with a capital B)
```

```bash
grep -i "banana" fruits.txt
```

```
Banana
```

---

> the `-v` flag inverts the search, it shows all the lines that do **not** contain the thing u are searching for:

```bash
grep -v "apple" fruits.txt
```

```
Banana
cherry
```

> the two `apple` lines are gone and everything else stayed. this is very useful later when u want to filter out noise from a log file.

---

> the `-n` flag shows u the line number of every match:

```bash
grep -n "apple" fruits.txt
```

```
1:apple
4:apple pie
```

- these flags can be combined like any other flags: `grep -in "BANANA" fruits.txt` searches case insensitively **and** shows the line number.

---

## 2. the `find` command (finding files)

> previously we searched for a word inside files, but now we are trying to find the files themselves.

- example: i want to find the file `README.md` inside the `02-the-linux-file-system` dir:

```bash
find 02-the-linux-file-system/ -name "README.md"
```

```
02-the-linux-file-system/README.md
```

> the first argument is **where** to search and the `-name` is **what** to search for. so we can pass `.` to search the current dir instead if we want:

```bash
find . -name "README.md"
```

```
./README.md
./01-command-line-basics/README.md
./02-the-linux-file-system/README.md
./03-files-and-navigation/README.md
./04-search-grep-find/README.md
./05-permissions-sudo/README.md
./06-text-editors/README.md
./07-scripts-env-path/README.md
./08-io-pipes-processes/README.md
./09-bash-scripting/README.md
```

---

> now a bit more advanced searching. we can use `*` to match anything, so we can search for all the files that end with `.md`:

```bash
find . -name "*.md"
```

```
./README.md
./01-command-line-basics/README.md
./02-the-linux-file-system/README.md
./03-files-and-navigation/README.md
./04-search-grep-find/README.md
./05-permissions-sudo/README.md
./06-text-editors/README.md
./07-scripts-env-path/README.md
./08-io-pipes-processes/README.md
./09-bash-scripting/README.md
```

> or we can use `*word*` to match anything that **contains** that word:

```bash
find . -name "*fruit*"
```

```
./04-search-grep-find/fruits.txt
```

> or `word*` to match anything that **starts with** that word:

```bash
find . -name "READ*"
```

```
./README.md
./01-command-line-basics/README.md
./02-the-linux-file-system/README.md
./03-files-and-navigation/README.md
./04-search-grep-find/README.md
./05-permissions-sudo/README.md
./06-text-editors/README.md
./07-scripts-env-path/README.md
./08-io-pipes-processes/README.md
./09-bash-scripting/README.md
```

---

> there is also `?` which matches exactly **one** character, not any number of them like `*` does.

```bash
find . -name "0?-*"
```

```
./01-command-line-basics
./02-the-linux-file-system
./03-files-and-navigation
./04-search-grep-find
./05-permissions-sudo
./06-text-editors
./07-scripts-env-path
./08-io-pipes-processes
./09-bash-scripting
```

> so `0?` matched `01` up to `09`, one character after the zero. if u wrote `0??-*` it would match nothing here, because there is no folder with 3 characters before the dash.

---

> one more flag u will use a lot, `-type`, which filters files or directories only:

```bash
find . -type d
```

```
.
./01-command-line-basics
./02-the-linux-file-system
./03-files-and-navigation
./04-search-grep-find
./05-permissions-sudo
./06-text-editors
./07-scripts-env-path
./08-io-pipes-processes
./09-bash-scripting
```

```bash
find . -type f -name "*.txt"
```

```
./04-search-grep-find/fruits.txt
```

- `d` means directory and `f` means file.

- these are the most used flags and cases u need. for anything else, `man grep` and `man find` are there.

---

## NOTES

1. `grep` searches **inside** files, `find` searches **for** files. this is the whole difference and it is easy to mix them up at the beginning.

2. always put ur search pattern in quotes. if u write `find . -name *.md` without the quotes, the shell replaces the `*` before `find` even sees it, and u get a confusing error.

3. `grep` and `find` become much more powerful when u connect them with the `|` pipe, which we learn in [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]].

---

## Assignment

1. Make a dir `ch3-practice` and inside it create a file `animals.txt` containing these 4 lines: `cat`, `Dog`, `bird`, `cat food`.
2. Find all the lines that contain `cat`.
3. Find all the lines that contain `dog`, ignoring the capital letter.
4. Show all the lines that do NOT contain `cat`.
5. Show the line numbers of every line containing `cat`.
6. From ur home dir, find every file whose name ends with `.txt`.
7. From ur home dir, find every **directory** whose name starts with `ch`.

> stuck, or done and want to check? [[11-Dev-101/Terminal-101/04-search-grep-find/solutions\|the solutions are here]]

---

[[11-Dev-101/Terminal-101/03-files-and-navigation/index\|← Chapter 3]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[11-Dev-101/Terminal-101/05-permissions-sudo/index\|next: Chapter 5 →]]
