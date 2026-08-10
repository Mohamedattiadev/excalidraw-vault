---
title: "Chapter 7 — Scripts, Environment Variables and PATH"
aliases:
  - "11-Dev-101/Terminal-101/07-scripts-env-path"
---

**Time to study:** ~75 min
**You will learn:** the difference between compiled and interpreted languages, how to run a bash script, `export`, the `.bashrc` file, aliases, and the `PATH` variable.

[[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|next: Chapter 8 →]]

---

## 1. brief about compiled and interpreted languages

> compiled programs are programs that are translated once into machine code, and then the machine runs that machine code directly, no man in the middle is needed.

```
c app  →  c compiler  →  machine code  →  machine
```

> which means: 1- faster, 2- more secure, 3- more efficient.

- example languages: `C`, `Rust`, `Go`.

> interpreted programs are executed line by line by an interpreter at runtime. the interpreter reads the code and then translates it to machine code on the fly.

```
python app  →  python interpreter  →  machine code  →  machine
```

> which means: slower than the compiled ones.

> u may get confused, so to make it clearer:

- compiled = translating a whole book at once, then handing over the translated book.
- interpreted = translating sentence by sentence out loud, every time someone wants to read it.

```
compiled    : write → compile → run (compile happens once)
interpreted : write → run     (the translating happens every time)
```

---

## 2. the bash script

> we just learned the difference between the compiled and the interpreted languages. now we need to know that bash is also an interpreted language.

> so we need to know a bit more about how to run compiled and interpreted things in the terminal to get the whole idea.

**a compiled language**, let's say `C`. we first compile the code, then an executable file is created, and then we can run it directly with `./filename`:

```bash
# 1- compile hello.c and create the executable
gcc hello.c -o hello

# 2- run the executable
./hello
```

```
Hello World
```

> so what happened here is: `hello.c` → gcc compiler → `hello` (a real new executable file on the disk).

**an interpreted language**, let's say `python`. there is nothing to compile, we hand the file to the interpreter and it runs it:

```bash
python3 hello.py
```

```
Hello World
```

> so what happened here is: `hello.py` → python3 interpreter → the output.
> notice the difference: **no new file is created**. with `gcc` we got a `hello` file we could run again by itself, here we get nothing on the disk, only the result.

---

> so what about the bash script?

> we have a file called `hello.sh` and inside it we have:

```bash
echo "Hello World"
```

now, how do we run it?

```bash
bash hello.sh
```

```
Hello World
```

> exactly like python, we call the interpreter and give it the file: `hello.sh` → bash interpreter → the output.

> we also have another way to run the bash script, which is the `Shebang`. it basically tells the terminal which interpreter to use for this file, by writing the path of it on the very first line with `#!/.../...`:

```bash
#!/bin/bash          # the shebang: run this file with /bin/bash
echo "Hello World"   # a normal command, exactly as u would type it
```

now we can run it without writing `bash` in front of it:

```bash
chmod u+x hello.sh
./hello.sh
```

```
Hello World
```

- remember from [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]] that the file needs the execute permission first, otherwise u get `Permission denied`.
- the shebang must be the **first line** of the file, if there is even one empty line above it, it stops working.

> this is enough to know about bash and interpreted languages.

---

## 3. the `export` command

> the `export` command is used to send a variable to the environment variables, so u can use it whenever u want by calling `$VAR`. we already know how to set a variable from [[02-Personal/11-Dev-101/Terminal-101/01-command-line-basics/index\|Chapter 1]]:

```bash
var="value"
echo $var
```

```
value
```

> but now this variable is a temporary (local) one, so if we want to use it in another script we need to export it to the environment variables:

```bash
export VAR="value"
echo $VAR
```

```
value
```

> now this `VAR` variable is global and can be used in any script that ur shell starts.

- note: the global variable name should be all uppercase, `VAR` not `var`. it is a convention, not a rule, but everyone follows it so u should too.
- note: no space before or after the `=`. `export VAR = "value"` is wrong, the right one is `export VAR="value"`.
- note: this lasts only until u close the terminal. to make it permanent u put it in the `.bashrc` file, which is the next section.

---

## 4. the `.bashrc` configuration file

> `.bashrc` is a configuration file for the bash shell, and it is executed every time a new terminal is opened. for example, i made my own shell show me some random shapes when it opens:

```
     ▄▄▄
  ▄█████▄▄
 ███▀▀▀▀▀▀▀▀
 ███▄   ▀ ▀▀
  ▄  █████▄ █▄
 ▀▀▄▄   ▄▄▄▀██▀
  ██▀▀▀██▀  ▀
  ▀▀▀▀ ▀▀▀▀

 ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬
 ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬▬
```

> so u can add whatever u want to it, something like this:

```bash
# inside ~/.bashrc
echo "hi Mr.$USER"
```

```
hi Mr.ati
```

- `$USER` is an environment variable the system sets for u already, u didn't have to export it.

---

### aliases

> an `alias` is a shortcut that refers to a longer command. u write the short name, the shell runs the long thing.

> in [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]] we saw the path shortcuts `~`, `.` and `..` that the shell gives u for free. an alias is how u make ur **own** shortcuts.

```bash
alias hi="echo 'hi Mr.$USER'"
hi
```

```
hi Mr.ati
```

> for example, i created an alias for `cd ..` and made it `..`, so whenever i want to go back i just write `..` and done. also for `cd ../..` i made it `...`, so whenever i write `...` i go 2 dirs back. and so on, i have a bunch of my own aliases.

```bash
alias ..="cd .."
alias ...="cd ../.."
```

```bash
# so when i use ... in the terminal :
...
pwd
```

```
/home/ati
```

> the question is: is it necessary to create all of them? the answer is no, it is just something i prefer, u may not need it. but if u want to have a bunch of ur own aliases then u can do it.

- careful: an alias u type in the terminal disappears when u close it. to keep it forever, write the same line inside ur `.bashrc` file.

> this is enough for the `.bashrc` file. if u want to learn more u can dive into it with tutorials, but it is not really needed.

---

## 5. the `PATH` variable

> before the `PATH` itself, there is a small command that shows u why it exists: `which`. it tells u where a command actually lives on ur system.

```bash
which ls
```

```
/usr/bin/ls
```

> `/usr/bin/ls` is the full path of the `ls` command. so instead of typing `/usr/bin/ls` every time i want to use it, i just type `ls` directly, because the `/usr/bin` directory is already stored inside the `PATH` environment variable, which tells the shell where to look for programs.

> the `PATH` variable is a list of directories where all the installed programs u have on ur system are. so now to see the list of all of them:

```bash
echo $PATH
```

```
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/home/ati/.local/bin
```

- they are separated by `:` and the shell searches them **in order**, from left to right, and stops at the first match.

> and this is also the answer to the question from [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]]: why do we write `./hello.sh` and not just `hello.sh`? because the current dir is **not** in the `PATH`, so the shell would never find it. the `./` is us saying "look right here".

---

> what if we installed a new program and want to add its path to the `PATH` variable?

```bash
# we assign PATH to the old PATH "PATH=$PATH:" and then add the new path after it
export PATH=$PATH:/home/ati/my-programs

echo $PATH
```

```
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/home/ati/.local/bin:/home/ati/my-programs
```

- careful: never forget the `$PATH:` part. if u write `export PATH=/home/ati/my-programs` u have just thrown away every other directory, and almost nothing will work in that terminal anymore.

> or we can add it to the `.bashrc` file so it is not lost when we close the terminal:

```bash
# add the same line inside ~/.bashrc so it survives closing the terminal.
# $PATH: keeps everything that was already there, and we add ours on the end
export PATH=$PATH:/home/ati/my-programs
```

```bash
# then in the terminal we run this to load the file again without reopening it
source ~/.bashrc
```

> that's all, this is enough to know.

---

## NOTES

1. `source ~/.bashrc` re-reads the file in ur current terminal. u need it every time u change `.bashrc`, otherwise ur change only shows up in a terminal u open after that.

2. everything in this chapter is written for `bash`. if u are on another shell the ideas are the same but the config file has a different name, and sometimes the syntax does too. u can check which shell u are on with:

```bash
echo $SHELL
```

```
/usr/bin/fish
```

- `bash` -> `~/.bashrc`
- `zsh` -> `~/.zshrc`
- `fish` -> `~/.config/fish/config.fish`, and `export VAR="x"` becomes `set -x VAR x`

> if that came back as something other than `/bin/bash`, read the "before u start" note in the [[02-Personal/11-Dev-101/Terminal-101/index\|course README]] before u go further, because it affects every chapter and not only this one.

3. `export` without any arguments prints every environment variable u currently have. it is a long list, so it is a good place to use `less` from [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]].

---

## Assignment

1. Make a variable `city` with ur city in it, print it, then open a new terminal and try to print it again. Explain to urself why it is empty.
2. Now export it, and print it.
3. Find out where the `grep` command lives on ur system.
4. Print ur `PATH` and count how many directories are in it.
5. Create a script `whoami.sh` that prints `i am $USER and i live in $city`.
6. Run it the interpreter way, then add a shebang and run it the `./` way.
7. Make an alias `ll` that runs `ls -la`, and make it survive closing the terminal.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|next: Chapter 8 →]]
