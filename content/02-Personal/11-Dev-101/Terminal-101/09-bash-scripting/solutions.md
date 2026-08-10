---
title: "Chapter 9 — Bash Scripting Basics — Solutions"
aliases:
  - "11-Dev-101/Terminal-101/09-bash-scripting/solutions"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|back to the chapter]]

---

## 1 and 2 and 3 — `hello.sh`

```bash
#!/bin/bash
# hello.sh -- say hello to someone

if [ -z "$1" ]; then                 # -z means "is it empty?", so: was no name given?
    echo "usage: ./hello.sh <name>"  # tell them how to use it
    exit 1                           # stop here. 1 means it did not work
fi                                   # closes the if

echo "hello $1"                      # only gets here if a name was given
```

```bash
chmod u+x hello.sh
./hello.sh ati
```

```
hello ati
```

```bash
./hello.sh
echo $?
```

```
usage: ./hello.sh <name>
1
```

- check that exit code. that `1` is what lets someone else write `./hello.sh ati && echo "it worked"`.

---

## 4 — `count.sh`

```bash
#!/bin/bash

count=1                      # a counter to keep track of where we are
while [ $count -le 5 ]; do   # -le is "less than or equal". keep going while it is 1..5
    echo $count              # print whatever the counter holds right now
    count=$((count + 1))     # add 1. $(( )) is how u do maths in bash.
                             # forget this line and the loop never ends
done                         # closes the while
```

> or the shorter way with a `for`, both are correct:

```bash
#!/bin/bash

for count in 1 2 3 4 5; do   # go through the list, one number at a time
    echo $count              # `count` holds a different one each time round
done
```

```
1
2
3
4
5
```

---

## 5 — `check.sh`

```bash
#!/bin/bash
# check.sh -- is this a file, a directory, or nothing

if [ -f "$1" ]; then           # -f asks: does it exist AND is it a normal file?
    echo "$1 is a file"
elif [ -d "$1" ]; then         # elif is "else if". -d asks: is it a directory?
    echo "$1 is a directory"
else                           # neither, so it is not there at all
    echo "$1 does not exist"
fi
```

```bash
./check.sh notes.txt
./check.sh backup
./check.sh nothing
```

```
notes.txt is a file
backup is a directory
nothing does not exist
```

- `elif` is `else if` written short. u can have as many as u want between the `if` and the `else`.
- the order matters. `-f` has to be checked before `-d`, otherwise nothing breaks here, but in general the first branch that matches is the one that runs and the rest are never looked at.

---

## 6 — `backup.sh`

```bash
#!/bin/bash
# backup.sh -- copy every txt file into backup/

mkdir -p backup              # -p means: do not complain if it is already there

count=0                      # count how many we actually copied
for file in *.txt; do        # the shell turns *.txt into the real names first

    if [ -f "$file" ]; then  # is this a real file? see the note below
        cp "$file" backup/   # copy it in
        count=$((count + 1)) # and add one to the tally
    fi

done

echo "copied $count files into backup/"
```

```bash
./backup.sh
```

```
copied 3 files into backup/
```

- `mkdir -p` does not complain if the folder is already there, which is exactly what u want in a script u run more than once.
- the `if [ -f "$file" ]` inside the loop looks pointless but it is not. if there is no `.txt` file at all, bash hands the loop the text `*.txt` itself, and without that check u would try to copy a file with that name and get an error.

---

## 7 — `ask.sh`

```bash
#!/bin/bash

read -p "what is ur name? " name       # -p prints the question, then waits.
read -p "what city do u live in? " city # whatever they type lands in the variable

echo "$name lives in $city"
```

```
what is ur name? ati
what city do u live in? Istanbul
ati lives in Istanbul
```

---

## 8 — watching it run

```bash
bash -x hello.sh ati
```

```
+ '[' -z ati ']'
+ echo 'hello ati'
hello ati
```

> every line starting with `+` is a command about to run, with the variables already replaced. so u are not guessing what the script saw, u are looking at it.

> try it on the one that fails too:

```bash
bash -x hello.sh
```

```
+ '[' -z '' ']'
+ echo 'usage: ./hello.sh <name>'
usage: ./hello.sh <name>
+ exit 1
```

- there it is: `-z ''` was true because there was no argument, so it went into the `if` and exited. this is how u debug a script, and it beats putting `echo` everywhere.

---

[[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|back to the chapter]]
