---
title: "Terminal 101 Cheat Sheet"
aliases:
  - "11-Dev-101/Terminal-101/CHEATSHEET"
---

Every command in the course, on one page. This is the page to open in 6 months when u forget something.

If a line here does not make sense, the chapter link next to it is where it was explained.

[[02-Personal/11-Dev-101/Terminal-101/index\|← back to Terminal 101]]

---

## Moving around · [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]

```bash
pwd                 # where am i
ls                  # what is here
ls -l               # long format, shows permissions
ls -la              # long format, including hidden files
cd folder           # go into it
cd ..               # go back one
cd ~                # go home
cd /                # go to the root
cd -                # go back to where i just was
```

## Files and folders · [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]

```bash
mkdir name          # make a folder
mkdir -p a/b/c      # make the whole path, no complaining
rmdir name          # remove an EMPTY folder
touch file.txt      # make an empty file
rm file.txt         # delete a file
rm -rf folder       # delete a folder and everything in it (careful)
cp a.txt b.txt      # copy
cp -R folder copy   # copy a whole folder
mv a.txt folder/    # move
mv a.txt b.txt      # rename
```

## Reading files · [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]

```bash
cat file            # print all of it
less file           # scrollable viewer, q to quit
head file           # first 10 lines
tail file           # last 10 lines
head -n 3 file      # first 3 lines
tail -n 3 file      # last 3 lines
wc -l file          # count lines
```

## Wildcards · [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]

```bash
*.txt               # anything ending in .txt
file?.txt           # exactly one character where the ? is
file[12].txt        # one character out of the list
echo *.txt          # see what the shell will expand it to FIRST
```

## Searching · [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|Chapter 4]]

```bash
grep "word" file            # find the lines containing it
grep -i "word" file         # ignore capital letters
grep -v "word" file         # the lines NOT containing it
grep -n "word" file         # show line numbers
grep -r "word" .            # search every file under here

find . -name "README.md"    # find files by name
find . -name "*.md"         # by pattern (keep the quotes)
find . -type d              # directories only
find . -type f              # files only
```

## Permissions · [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]]

```
-rw-r--r--
│└┬┘└┬┘└┬┘
│ │  │  └── others
│ │  └───── group
│ └──────── owner
└────────── type: - file, d directory
```

```bash
chmod u+x file          # add execute, owner only
chmod +x file           # add execute to ALL THREE levels
chmod u=rw,g=r,o= file  # set them exactly
chmod -R u=rwx folder/  # recursive, for folders
chown ati file          # change the owner
chown ati:ati file      # owner and group
sudo command            # run it as root
whoami                  # who am i
```

## Editors · [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|Chapter 6]]

```bash
nano file           # the easy one, shortcuts shown at the bottom
vim file            # the fast one
```

**nano**: `ctrl+o` save, `ctrl+x` exit, `ctrl+w` search, `ctrl+k` cut, `ctrl+u` paste

**vim**: `Esc` gets u to normal mode from anywhere

```
:wq     save and quit          i   insert before cursor
:q      quit                   a   insert after
:q!     quit, throw away       o   new line below
:w      save, stay             A   jump to end of line

dd  delete line     yy  copy line     p   paste
u   undo            x   delete char   3dd delete 3 lines
gg  top of file     G   bottom        5G  go to line 5
w   next word       b   back a word   /x  search for x
```

## Variables, env and PATH · [[02-Personal/11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]] and [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]

```bash
name="ati"          # no spaces around the =
echo $name          # read it back
echo "hi $name"     # double quotes: the variable IS replaced
echo 'hi $name'     # single quotes: it is NOT replaced

export VAR="x"      # make it available to other programs
echo $PATH          # where the shell looks for commands
export PATH=$PATH:/new/path     # add to it, never forget the $PATH:
which grep          # where does this command actually live
source ~/.bashrc    # reload the config without reopening the terminal
alias ll="ls -la"   # make a shortcut (put it in .bashrc to keep it)
```

## Redirection and pipes · [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]

```bash
command > file      # send output to a file (ERASES it first)
command >> file     # append to the end of the file
command 2> file     # send the ERRORS to a file
command 2>> file    # append the errors
command1 | command2 # send the output of one into the next

echo $?             # the exit code of the last command, 0 = success
a && b              # run b only if a succeeded
a || b              # run b only if a failed
a ; b               # run b either way
```

## Processes · [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]

```bash
ps aux              # every process
ps aux | grep name  # find one (one result is the grep itself)
top                 # live view, q to quit
kill PID            # ask it to stop
kill -9 PID         # make it stop

command &           # run it in the background
jobs                # what is running in the background here
fg                  # bring it back to the front
bg                  # set a paused job running again
```

**ctrl + c** kills it &nbsp;&nbsp;·&nbsp;&nbsp; **ctrl + z** pauses it &nbsp;&nbsp;·&nbsp;&nbsp; **&** runs it without blocking u

## Bash scripting · [[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|Chapter 9]]

```bash
#!/bin/bash         # the shebang, always the first line
chmod u+x script.sh
./script.sh
```

```bash
$1 $2 $3            # the arguments
$0                  # the script's own name
$#                  # how many arguments
$@                  # all of them
$?                  # exit code of the last command
$(command)          # put a command's output into a variable
$((1 + 2))          # do maths
```

```bash
if [ "$a" = "$b" ]; then      # mind the spaces inside [ ]
    echo "same"
elif [ -z "$a" ]; then
    echo "a is empty"
else
    echo "different"
fi
```

```
text:    =  !=  -z (empty)  -n (not empty)
numbers: -eq -ne -gt -lt -ge -le
files:   -f (is a file)  -d (is a dir)  -x (executable)
not:     !
```

```bash
for f in *.txt; do          while [ $n -le 3 ]; do
    echo "$f"                   echo $n
done                            n=$((n + 1))
                            done

greet() {                   read -p "name? " name
    echo "hi $1"            exit 0    # worked
}                           exit 1    # failed
greet "ati"
```

```bash
bash -x script.sh   # watch every line as it runs, the best debugging trick
set -e              # under the shebang: stop on the first error
```

## The small things that save the most time

```bash
Tab                 # complete a file or command name
Tab Tab             # show all the matches
ctrl + r            # search backwards through your history
history             # the full list
clear               # clean the screen
man command         # the manual, q to quit
whatis command      # one line about what it does
```

---

[[02-Personal/11-Dev-101/Terminal-101/index\|← back to Terminal 101]]
