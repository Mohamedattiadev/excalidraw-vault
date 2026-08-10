---
title: "Chapter 8 — Input, Output, Pipes and Processes"
aliases:
  - "11-Dev-101/Terminal-101/08-io-pipes-processes"
---

**Time to study:** ~105 min
**You will learn:** exit codes, redirecting output and errors, the `|` pipe, chaining with `&&`, running things in the background, how to kill a stuck program, and package managers.

[[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|← Chapter 7]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|next: Chapter 9 →]]

---

## 1. the exit codes

> an exit code is a number returned by a program to show if it was successful or not.
> `0` means success, and `1` or any other number means failure.

> u may ask why do i need something like this, since the apps or the commands already return an error message like `there was an error` or `command not found` or `permission denied`. so why?

> the reason is that they are needed in scripting and automation. u may write a script that does a couple of things, but when u run it, it does not print those messages for u, so u have to handle it urself using the exit code. for now, understanding why and what it is, is enough.

```bash
# if we run a normal command like
ls ~
# it works and shows us a result, not the exit code.
# so in order to see the exit code we use `$?` which holds the exit code of the last command,
# and we print it with echo
echo $?
```

```
0
```

> and now a command that fails:

```bash
ls ~/not-exist-file
```

```
ls: cannot access '/home/ati/not-exist-file': No such file or directory
```

```bash
echo $?
```

```
2
```

- note: `$?` only holds the code of the **last** command u ran. if u run `echo $?` twice in a row, the second one gives u the exit code of the first `echo`, which is `0`. so read it immediately.
- different programs use different numbers for different problems. `ls` uses `2` for "file not found". u don't have to memorize them, u only need to know that `0` is success and anything else is not.

---

## 2. the standard output and the standard error

> we already used the standard output, `echo`, which prints a message. in python it is `print`.

> but what about the standard error, `stderr`? we already mentioned it briefly in the first section, it is the error message that appears after a wrong or non-existing thing tries to execute, like `ls: cannot access '/home/ati/not-exist-file': No such file or directory`. it goes directly to the terminal as an error message.

> what if we want to redirect it to a file, to save it there and use it later, instead of a message that appears only once? and not only the error, we can also redirect the normal output.

> the `>` is used to redirect the output to a file:

```bash
echo "Hello World" > hello.txt
cat hello.txt
```

```
Hello World
```

> we can also use `>>` to append the output to the end of the file:

```bash
echo "Hello Again" >> hello.txt
cat hello.txt
```

```
Hello World
Hello Again
```

- careful: this is the difference that costs people their files: `>` **erases** the file and writes from zero, `>>` **adds** to the end of it.

---

> and now the error. we use `2>` to redirect the error to a file:

```bash
cat not_exist.txt 2> error.txt
cat error.txt
```

```
cat: not_exist.txt: No such file or directory
```

> and `2>>` to append the error instead of erasing:

```bash
cat also_not_exist.txt 2>> error.txt
cat error.txt
```

```
cat: not_exist.txt: No such file or directory
cat: also_not_exist.txt: No such file or directory
```

- important thing to understand: `>` and `2>` are two **different channels**. if a command succeeds there is no error to save, and if it fails there is no normal output to save. so:

```bash
echo "Hello World" 2> out.txt
```

```
Hello World
```

```bash
cat out.txt
```

```
(empty, because echo succeeded so it produced no error at all)
```

> the `Hello World` still went to ur screen, because `2>` only catches the error channel and `echo` never used it.

- the `2` is the number of the error channel. the normal output is channel `1`, so `>` is really just a short way of writing `1>`. and there is a `0` as well, the input channel, which is what the `|` pipe is really feeding.

> so if u ever see `2>&1` in someone's script, u can now read it: send channel 2 to wherever channel 1 is already going. that is how u get the errors and the normal output into the same file.

```bash
./my-script.sh > everything.log 2>&1
```

---

## 3. the `|` pipe

> the `|` pipe operator is used to redirect the output of one command into the input of another command. it is super useful when u want to chain more than one command together and the current command takes something from the previous one, instead of writing the first command, storing its output in a file, then using that file as input for the second one, and so on.

```bash
ls
```

```
Documents  Downloads  Music  Pictures  text.txt  text2.txt  text3.txt
```

```bash
ls | grep ".txt"
```

```
text.txt
text2.txt
text3.txt
```

> what this command is doing: we run `ls` first, then we use the `|` to take the output of `ls` and use it as the input of `grep`, and `grep` searches for the file names that contain `.txt`.

> another example:

```bash
ls | grep ".txt" | wc -l
```

```
3
```

> it is the same as before, we take the output of `ls` and use it as input to `grep`, so we get the 3 files with the `.txt` extension. then with `wc -l`, which means "word count" with the `-l` flag meaning "count the number of lines", we get `3` as a result. which means 3 lines contained `.txt`.

- `wc` counts what comes into it. `-l` counts lines, `-w` counts words, `-c` counts characters.

- u can chain as many as u want, the output of each one becomes the input of the next. this is the single most useful idea in the whole terminal.

---

## 4. running more than one command: `;` and `&&`

> the `|` pipe connects two commands by their **output**. but sometimes u just want to run 2 commands one after the other, and the second one doesn't care what the first one printed.

> `;` runs them one after the other, no matter what happened:

```bash
mkdir practice ; cd practice ; pwd
```

```
/home/ati/practice
```

> `&&` runs the next one **only if the previous one succeeded**:

```bash
mkdir practice && cd practice
```

> and here the exit codes from section 1 stop being theory. `&&` is literally checking if the exit code was `0` before it continues.

> so look at the difference, this is why `&&` is the one u should use:

```bash
# with ;  the mkdir fails, but the cd runs anyway
mkdir /etc/practice ; cd /etc/practice
```

```
mkdir: cannot create directory '/etc/practice': Permission denied
bash: cd: /etc/practice: No such file or directory
```

```bash
# with && the mkdir fails, so the cd never runs at all
mkdir /etc/practice && cd /etc/practice
```

```
mkdir: cannot create directory '/etc/practice': Permission denied
```

> `/etc` needs root, which we learned in [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]], so the `mkdir` is guaranteed to fail and it is a safe thing to try.

- there is also `||` which is the opposite, it runs the next one **only if the previous one failed**:

```bash
cd practice || echo "that folder is not there"
```

```
that folder is not there
```

> u will see `&&` everywhere, in tutorials, in install instructions, in scripts. now u know it is not decoration, it is a real check on the exit code.

---

## 5. running things in the background

> until now every command took the terminal until it finished. if the command needs 10 minutes, u sit and wait 10 minutes. that is not realistic.

> putting `&` at the end sends it to the background and gives u ur terminal back straight away:

> before that, a command we have not used yet: `sleep`. it does nothing at all for the number of seconds u give it, which makes it perfect for practising this without breaking anything.

```bash
sleep 60 &
```

```
[1] 4517
```

> and u get ur prompt back immediately instead of waiting a minute. so what are those 2 numbers?

- `[1]` is the **job number**. it counts the things running in the background **of this terminal only**, so the first one is 1, the next is 2. u use it with a `%` in front, like `kill %1`.
- `4517` is the **PID**, the process id. that one is given by the whole system, not by ur terminal, and it is the same number u would find with `ps aux` in the next section.

> so the same running program has 2 names: a short one that only ur terminal knows, and a long one that the whole machine knows.

```bash
jobs
```

```
[1]+  Running                 sleep 60 &
```

- if u close the terminal, the job numbers are gone with it. the PID belongs to the system, which is why `kill` uses it.

> and if u already started something and only then realised it will take forever, u don't have to kill it and start again. press `ctrl + z` to pause it:

```bash
sleep 60
# now press ctrl + z
```

```
[1]+  Stopped                 sleep 60
```

> reading that line: `[1]` is the job number again, and **`Stopped`** is the important word. the program is still there in memory, it is just frozen and doing nothing. it is not finished and it is not killed.

- the `+` next to the number means "this is the one u are working on right now", so a bare `fg` or `bg` with no number will pick this one.

```bash
bg
```

```
[1]+ sleep 60 &
```

- `jobs` shows u everything running in the background of this terminal:

```bash
jobs
```

```
[1]+  Running                 sleep 60 &
```

- `fg` brings it back to the front, so u can watch it or stop it with `ctrl + c`:

```bash
fg
```

```
sleep 60
```

- careful: `ctrl + z` **pauses** the program, it does not keep it running. if u press `ctrl + z` and then forget about it, that program is frozen, not working. `bg` is what actually starts it moving again.

> so the three of them are easy to mix up, and the difference is simple:

- `ctrl + c` kills it
- `ctrl + z` pauses it
- `&` runs it without blocking u

---

## 6. the interrupt and killing a process

> normally, if we have an app which is running for too long and we would like to stop it, we can use `ctrl + c`, which is called `SIGINT` (Signal Interrupt). but what if the app is not responding at all?

> so here comes the kill signal, `SIGKILL`, which is used to kill the app. if we want to stop it we use the `kill` command:
> `kill PID`, which means kill + the id of the running process that will be killed.

> so how can we get the PID of the running process?

```bash
# in order to see the PID we use the `ps` command which stands for process status.
# a = all processes of all users
# u = display in a user-oriented format, which basically adds columns to make it easier to read
# x = show the processes running in the background too
ps aux
```

```
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1 168860 13360 ?        Ss   Aug08   0:32 /sbin/init splash
root       789  0.0  0.0  71308  3280 ?        Ss   Aug08   0:00 /usr/sbin/cron -f
root      1024  0.1  0.5 1023456 45200 ?       Ssl  Aug08   2:34 /usr/bin/dockerd
ati       1500  0.5  1.2 2345678 98760 ?       Sl   09:15   0:45 /usr/bin/gnome-shell
ati       1602  0.0  0.0  12876  4580 tty2     S    09:15   0:00 /bin/my-stuck-script.sh
```

> the list is usually hundreds of lines long, so reading it with ur eyes is not realistic. this is where the `|` from the previous section becomes useful:

```bash
ps aux | grep "my-stuck-script.sh"
```

```
ati       1602  0.0  0.0  12876  4580 tty2     S    09:15   0:00 /bin/my-stuck-script.sh
ati       1789  0.0  0.0   9032  2140 pts/0    S+   09:22   0:00 grep my-stuck-script.sh
```

> so we got 2 lines, one is the script we are looking for and the other one is the `grep` command itself, because `grep` is also a running process at that moment and its own name contains the word we searched for. this confuses everyone the first time.

> we take the PID of the real one, `1602`, and use it in the `kill` command:

```bash
kill 1602
```

```
(no output, and that is the normal case)
```

> `kill` says nothing when it works. to check, run the `ps aux | grep` again and u will see the script is gone.

- if the process still refuses to die, `kill -9 1602` is the hard version that the program can not ignore. use it only when the normal `kill` did not work.

---

## 7. the `top` command

> `top` is a command which shows u the programs running on ur machine and their status, live and updating by itself.

```bash
top
```

```
top - 11:15:32 up 2 days,  4:23,  3 users,  load average: 1.85, 1.42, 1.23
Tasks: 287 total,   2 running, 285 sleeping,   0 stopped,   0 zombie
%Cpu(s): 12.5 us,  3.2 sy,  0.8 ni, 82.5 id,  0.5 wa,  0.2 hi,  0.3 si,  0.0 st
MiB Mem :  15982.5 total,   2345.6 free,   9876.3 used,   3760.6 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   5123.4 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   2200 ati       20   0 4567890 267890 123456 R  18.5   1.7   3:45.23 brave --tab
   1100 ati       20   0 3456789 145600  98765 S   8.3   0.9   4:32.12 brave-browser
   1600 ati       20   0 2345678  98760  45678 S   4.2   0.6   0:32.45 gnome-shell
   1850 root      20   0 1567890  45200  23456 S   1.5   0.3   2:34.12 dockerd
   1500 ati       20   0   10328   1384    890 S   0.3   0.0   0:02.34 bash
      1 root      20   0  168860  14320   8900 S   0.0   0.1   0:28.56 systemd
```

- press `q` to get out of it, same as `less` and `man`.
- the difference from `ps aux`: `ps` gives u one snapshot and gives u the terminal back, `top` keeps running and refreshing until u quit it. use `ps` when u want to pipe it into `grep`, use `top` when u want to watch what is eating ur CPU right now.

---

## 8. the package manager

> a package manager is the software that installs apps and programs onto ur system, and keeps track of what is installed.

> i really prefer not using any external package managers, just use ur system's official one. for example, if we want to install something like `nvim`, which is a better and more configurable version of `vim`:

```bash
# ubuntu / debian
sudo apt install neovim

# arch linux
sudo pacman -S neovim

# fedora
sudo dnf install neovim
```

> there are some other ones like `flatpak`, `snap` and `appimage`. these external ones u should ONLY use as a last resort, if the app isn't in the official ones.

> but what happens when u write the command to install an app?

1. it checks the system to see if the app is already installed or not.
2. if it is, it will not install it again.
3. if it is not, it downloads it and installs its relevant dependencies too.
4. then it puts the program in a directory that is already in the `PATH`, which is why u can type `nvim` directly instead of the full path. this is exactly the `PATH` variable from [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]].

---

## NOTES

1. `/tmp` is a temporary directory, it is used to store temporary files and data that does not need to be saved permanently. most systems empty it when u restart the machine, so never put anything u care about there.

2. `.log` is the extension of a log file, it is used to store the logs of a program or the system. so most of the time, when u are saving the output of something to read later, save it as a `.log` file and not as `.txt` or `.md`.

```bash
# >    the normal output goes into run.log, erasing it first
# 2>>  the errors go onto the end of errors.log, keeping what was there
./my-script.sh > run.log 2>> errors.log
```

> this line puts the normal output in one file and the errors in another one, which is exactly how u would run a real script in the background.

---

## Assignment

1. Run a command that works and print its exit code. Then run one that fails and print its exit code.
2. Create a file `notes.log` containing the line `first line` using redirection.
3. Add a second line `second line` to it **without** erasing the first one.
4. Run `cat missing.txt` and save only the error message into `errors.log`.
5. List ur home dir and count how many things are in it, in one command.
6. Find how many of them contain the letter `D`, in one command.
7. Find the PID of ur own `bash` process.
8. Make a dir and go into it in one line, in a way that does not `cd` if the `mkdir` failed.
9. Run `sleep 30` in the background, check it with `jobs`, then bring it to the front and kill it.
10. Start `sleep 30` normally, pause it with `ctrl + z`, then set it running in the background again.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|← Chapter 7]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/09-bash-scripting/index\|next: Chapter 9 →]]
