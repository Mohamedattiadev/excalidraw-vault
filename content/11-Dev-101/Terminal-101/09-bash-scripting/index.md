---
title: "Chapter 9 — Bash Scripting Basics"
---

# Chapter 9 — Bash Scripting Basics

**Time to study:** ~120 min
**You will learn:** how to turn the commands u already know into a real program, with arguments, conditions, loops and functions.

[[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|← Chapter 8]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]]

---

> this is the last chapter and it is the one where everything else pays off.

> until now every command we learned, we typed by hand, one at a time. a script is just those same commands written in a file so u can run all of them with one word. that is the whole idea, there is nothing new to learn about the commands themselves.

> and u already made a script back in [[11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]], the `hello.sh` one with the shebang. so we start from there and we make it actually useful.

---

## 1. the shape of a script

> every script u write has the same 3 parts:

```bash
#!/bin/bash
# what this script does

echo "hello"
```

1. the **shebang** on the first line, which says which interpreter runs this file.
2. a comment saying what it does, so u still know in 3 months.
3. the commands, exactly the same ones u would type by hand.

and u already know how to run it, from [[11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]] and [[11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]:

```bash
chmod u+x hello.sh
./hello.sh
```

```
hello
```

- anything after a `#` is a comment and bash ignores it. the shebang is the one exception, because it is on the first line.

---

## 2. variables in a script

> exactly the same as [[11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]], nothing changes when u put them in a file:

```bash
#!/bin/bash

name="ati"           # put the text ati into a box called name
echo "hello $name"   # the $ takes it back out again, so this prints: hello ati
```

```
hello ati
```

> and remember the quotes from [[11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]], because in a script u will hit this every day:

```bash
echo "hello $name"    # hello ati
echo 'hello $name'    # hello $name
```

---

> and there is one new thing worth knowing: u can put the **output of a command** into a variable, with `$( )`:

```bash
#!/bin/bash

today=$(date)        # $( ) runs the command inside it and hands u back what it printed
here=$(pwd)          # so `here` ends up holding /home/ati/practice, not the word pwd
files=$(ls | wc -l)  # and this one holds a number: how many things ls listed

echo "today is $today"
echo "i am in $here and there are $files things here"
```

```
today is Sun Aug  9 16:20:11 +03 2026
i am in /home/ati/practice and there are 4 things here
```

> look at that last one. `ls | wc -l` is the pipe from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]], and now its result is sitting in a variable. this is where the chapters start connecting to each other.

---

## 3. giving the script arguments

> a script that always does the same thing is not very useful. we want to tell it what to work on, the same way `ls Documents` tells `ls` which folder to list.

> whatever u write after the script name arrives inside it as `$1`, `$2`, `$3` and so on:

```bash
#!/bin/bash
# greet.sh

# $1 is the first thing u typed after the script name, $2 is the second one.
# so with  ./greet.sh ati 23   ->  $1 is "ati" and $2 is "23"
echo "hello $1, u are $2 years old"
```

```bash
./greet.sh ati 23
```

```
hello ati, u are 23 years old
```

- `$0` is the name of the script itself.
- `$1` is the first argument, `$2` the second, and so on.
- `$#` is how many arguments u got.
- `$@` is all of them together.

```bash
#!/bin/bash

echo "the script is called $0"   # $0 is the script's own name
echo "i got $# arguments"        # $# is how many u were given, as a number
echo "they are: $@"              # $@ is all of them together
```

```bash
./info.sh one two three
```

```
the script is called ./info.sh
i got 3 arguments
they are: one two three
```

- careful: always put `"$1"` in double quotes when u use it. if someone passes u a file name with a space in it, the unquoted version breaks in exactly the way we saw in [[11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]].

---

## 4. `if`, making a decision

> now the real thing. so far a script runs top to bottom and does the same thing every time. `if` is how it starts making decisions.

```bash
#!/bin/bash

if [ "$1" = "hello" ]; then   # if the first word u typed is exactly "hello", do the next line
    echo "hello to u too"     # this runs only when the answer was yes
else                          # if it was anything else, do this instead
    echo "i don't know that word"
fi                            # closes the if. "if" spelled backwards
```

```bash
./check.sh hello
```

```
hello to u too
```

```bash
./check.sh bye
```

```
i don't know that word
```

> the shape is always the same: `if` ... `then` ... `else` ... `fi`. and yes, `fi` is `if` written backwards, that is really the reason.

let's read that script the way the computer does:

- `if` starts the question.
- `[ "$1" = "hello" ]` is the question itself: is the first argument the word `hello`?
- `; then` means "if the answer was yes, do what comes next". the `;` is just what separates the question from the `then`, exactly like writing 2 commands on one line.
- everything between `then` and `else` runs when the answer is yes.
- everything between `else` and `fi` runs when the answer is no.
- `fi` closes the whole thing. without it bash keeps waiting for more and u get a confusing error at the end of the file.

> u do not need the `else` part if u have nothing to do when the answer is no:

```bash
if [ -f "notes.txt" ]; then
    echo "the file is there"
fi
```

- careful: the spaces inside `[ ]` are not optional. `[ "$1" = "hello" ]` works, `["$1"="hello"]` gives u an error that makes no sense. this catches everyone, including me.

> the reason is that `[` is not punctuation here, it is **a command**. u can prove it:

```bash
which [
```

```
/usr/bin/[
```

> so `[ "$1" = "hello" ]` is really the command `[` being given the arguments `"$1"`, `=`, `"hello"` and `]`. and commands need spaces between their arguments, same as `ls -l`. once u see that, the spacing rule stops being something to memorise.

---

### comparing text

```bash
[ "$a" = "$b" ]     # the same
[ "$a" != "$b" ]    # not the same
[ -z "$a" ]         # $a is empty
[ -n "$a" ]         # $a is not empty
```

### comparing numbers

> numbers do not use `=` and `>`, they use letters. it looks strange at the beginning but there is a reason: `>` already means redirect, from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]], so bash could not use it here.

```bash
[ "$a" -eq "$b" ]   # equal
[ "$a" -ne "$b" ]   # not equal
[ "$a" -gt "$b" ]   # greater than
[ "$a" -lt "$b" ]   # less than
[ "$a" -ge "$b" ]   # greater or equal
[ "$a" -le "$b" ]   # less or equal
```

### checking files

> this one u will use the most, and it connects straight back to [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]] and [[11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]]:

```bash
[ -f "notes.txt" ]  # it exists and it is a file
[ -d "backup" ]     # it exists and it is a directory
[ -x "run.sh" ]     # it exists and it is executable
```

a real example, the kind u will actually write:

```bash
#!/bin/bash
# backup.sh -- copy a file, but only if it is really there

# $1 is whatever the person typed after the script name.
# -f asks: does that exist, and is it a normal file?
if [ -f "$1" ]; then

    # it exists. copy it, and stick .backup on the end of the new name.
    # so notes.txt gets copied to notes.txt.backup
    cp "$1" "$1.backup"
    echo "backed up $1"

# "else" means: the answer to the question above was no
else
    echo "there is no file called $1"

# "fi" closes the if. it is "if" spelled backwards
fi
```

> so read it as one sentence: **if the thing u gave me is a real file, copy it and say so, otherwise tell u it is not there.** that is all an `if` ever does.

```bash
./backup.sh notes.txt
```

```
backed up notes.txt
```

```bash
./backup.sh nothing.txt
```

```
there is no file called nothing.txt
```

---

### checking if a command worked

> remember `$?` from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]? this is where it earns its place:

```bash
#!/bin/bash

mkdir practice

# $? holds the exit code of the line above. -eq means "equals".
# so this reads: if the exit code of the mkdir was 0, it worked
if [ $? -eq 0 ]; then
    echo "the folder was made"
else
    echo "the folder could not be made"
fi
```

> and this is exactly what `&&` was doing for u in [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]. now u can see what was happening under it.

---

## 5. loops, doing it many times

### `for`, when u know the list

```bash
#!/bin/bash

# go through the list one at a time. each time round, `name` holds the next one
for name in ati ahmed sara; do
    echo "hello $name"    # this runs 3 times, once per name
done                      # closes the loop, same idea as fi closing an if
```

```
hello ati
hello ahmed
hello sara
```

> and now put it together with the wildcard from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]], and u have something u would actually use:

```bash
#!/bin/bash
# rename every .txt file to .md

for file in *.txt; do
    mv "$file" "${file%.txt}.md"
    echo "renamed $file"
done
```

```
renamed notes.txt
renamed old.txt
```

> this is the script everyone writes first, so let's go through it line by line. nothing here is new except one piece.

**`for file in *.txt; do`**

- `*.txt` is the wildcard from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]. remember the shell replaces it **before** the loop starts, so what the loop actually receives is `notes.txt old.txt`.
- `file` is a variable name that i chose. i could have written `for f in` or `for thing in`, it makes no difference. the loop puts one file name into it at a time.
- so the loop runs twice here. the first time `$file` is `notes.txt`, the second time it is `old.txt`.
- `do` says "here is where the body starts".

**`mv "$file" "${file%.txt}.md"`**

- this is just `mv` from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]], renaming one file.
- the first argument `"$file"` is the old name, so `notes.txt`.
- the second one is the new name, and `${file%.txt}` is the only strange bit in this whole chapter.

> `${file%.txt}` means: take what is inside `file`, and cut `.txt` off the end. so `notes.txt` becomes `notes`. then we stick `.md` on the end ourselves, and we get `notes.md`.

```bash
file="notes.txt"
echo ${file%.txt}
```

```
notes
```

- the `%` is what says "cut this off the end". there is also `#` which cuts off the front, but u will use `%` far more.
- and the quotes around `"$file"` are the ones from [[11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]]. without them, a file called `my notes.txt` would arrive as 2 separate arguments and the `mv` would fail.

**`echo "renamed $file"`**

- just so u can see it working. a script that silently does 40 things is a script u do not trust.

**`done`**

- closes the loop, same idea as `fi` closing an `if`.

- careful: run this once and ur `.txt` files are gone, they are `.md` now. put `echo` in front of the `mv` first, run it, and read what it **would** have done:

```bash
for file in *.txt; do
    echo mv "$file" "${file%.txt}.md"
done
```

```
mv notes.txt notes.md
mv old.txt old.md
```

> nothing was renamed there, u only printed the commands. this is the safest habit in the whole course: put `echo` in front, look, then take it out.

### `while`, when u don't know how many times

```bash
#!/bin/bash

# start a counter at 1
count=1

# -le means "less than or equal", so: keep going while count is 1, 2 or 3
while [ $count -le 3 ]; do

    echo "this is line $count"

    # add 1 to the counter. without this line the condition is never
    # false and the loop runs forever, which is the classic mistake
    count=$((count + 1))
done
```

```
this is line 1
this is line 2
this is line 3
```

- `$(( ))` is how u do maths in bash. `count + 1` inside it gives u a number, without it u would just get the text `count + 1`.

---

## 6. asking the user something

> `read` stops the script and waits for the person to type:

```bash
#!/bin/bash

echo "what is ur name?"
read name                 # stop, wait for the person to type, put it in `name`

echo "hello $name, nice to meet u"
```

```
what is ur name?
ati
hello ati, nice to meet u
```

- `read -p "what is ur name? " name` does the same in one line, the `-p` is the question to show.

---

## 7. functions, when the script gets long

> when u find urself writing the same 3 lines in 4 places, put them in a function and give it a name:

```bash
#!/bin/bash

# define a function called greet. nothing runs yet, we are only
# telling bash what "greet" should mean when we use it later.
greet() {
    # inside a function, $1 is the first argument given to the FUNCTION,
    # not to the script. so it is "ati" the first time and "sara" the second
    echo "hello $1, welcome"
}

# now actually use it, twice, with different arguments
greet "ati"
greet "sara"
```

```
hello ati, welcome
hello sara, welcome
```

> notice that a function takes its arguments exactly like the script does, with `$1` and `$2`. so once u learned it for the script, u already know it for functions.

---

## 8. putting it all together

> this is a real script that uses almost everything in this chapter, and almost everything in the course. read it slowly and u will recognize every single line from an earlier chapter.

```bash
#!/bin/bash
# organize.sh -- sort the files in a folder into subfolders by their type

folder="$1"                      # remember what the person gave us

if [ -z "$folder" ]; then        # -z asks: is it empty? so, did they give us nothing?
    echo "usage: ./organize.sh <folder>"
    exit 1                       # stop the whole script here, 1 means it failed
fi

if [ ! -d "$folder" ]; then      # ! means NOT, -d means is a directory
    echo "there is no folder called $folder"   # so: if it is NOT a directory
    exit 1
fi

cd "$folder" || exit 1           # go in. || means: if the cd failed, give up

mkdir -p documents images others # make the 3 folders. -p = don't complain if they exist

for file in *; do                # * is every single thing in here, one at a time

    if [ -d "$file" ]; then      # is this one a folder rather than a file?
        continue                 # skip it and jump to the next loop turn
    fi

    case "$file" in              # look at the name and pick the first pattern that fits
        *.txt|*.md|*.pdf)  mv "$file" documents/ ;;   # | here means "or"
        *.jpg|*.png|*.gif) mv "$file" images/ ;;
        *)                 mv "$file" others/ ;;      # * on its own = anything else
    esac                         # closes the case. "case" backwards
done                             # closes the for loop

# $( ) again: count what ended up in each folder and print the numbers
echo "done, $(ls documents | wc -l) documents and $(ls images | wc -l) images"
```

```bash
./organize.sh ~/Downloads
```

```
done, 12 documents and 5 images
```

what is in there, and where u learned each piece:

- `$1` and `-z` to check the user gave us something, from section 3 and 4 above
- `! -d` to check the folder is really there. the `!` means "not"
- `cd "$folder" || exit 1`, the `||` from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]
- `mkdir -p` from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]
- `for file in *` with the wildcard from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]
- `continue` skips to the next loop turn, so directories are left alone
- `case` is a shorter `if` when u are checking one thing against many patterns
- `$(ls documents | wc -l)`, the pipe from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]] inside a `$( )` from section 2
- `exit 1` sets the exit code from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]], so another script can check if this one worked

> that is a real tool. it is 25 lines and there is nothing in it u had not already seen somewhere in this course.

---

## NOTES

1. `exit` ends the script immediately. `exit 0` means it worked, `exit 1` means it failed. always use them, because the person running ur script might be checking it with `&&`.

2. put `set -e` under the shebang and the script stops the moment any command fails, instead of carrying on and making things worse:

```bash
#!/bin/bash
set -e
```

3. when a script does something strange, run it with `bash -x` and u will see every line as it runs, with the variables already replaced:

```bash
bash -x greet.sh ati
```

```
+ echo 'hello ati, u are  years old'
hello ati, u are  years old
```

> and there u can immediately see the problem, the second argument was missing. this is the fastest way to fix a script and almost nobody knows about it.

4. `shellcheck` is a program that reads ur script and tells u what is wrong with it before u run it. it catches the missing quotes and the `[ ]` spacing mistakes automatically.

```bash
sudo pacman -S shellcheck   # arch
sudo apt install shellcheck # ubuntu
```

5. u are writing bash, not python. bash is very good at running programs and moving files around, and it gets ugly fast at anything with real logic or maths. if ur script passes 100 lines or u start doing something complicated with numbers, that is bash telling u to write it in python instead.

---

## Assignment

1. Write `hello.sh` that prints `hello` and nothing else. Make it executable and run it.
2. Change it to take a name as an argument and print `hello <name>`.
3. Make it print `usage: ./hello.sh <name>` and exit with code `1` if no name was given.
4. Write `count.sh` that prints the numbers 1 to 5, each on its own line.
5. Write `check.sh` that takes a file name and says whether it is a file, a directory, or does not exist.
6. Write `backup.sh` that copies every `.txt` file in the current folder into a `backup/` folder, creating it if it is not there, and prints how many files it copied.
7. Write `ask.sh` that asks for ur name and ur city, then prints one sentence with both.
8. Take any script above and run it with `bash -x` to watch it run line by line.

> stuck, or done and want to check? [[11-Dev-101/Terminal-101/09-bash-scripting/solutions\|the solutions are here]]

---

[[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|← Chapter 8]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]]
