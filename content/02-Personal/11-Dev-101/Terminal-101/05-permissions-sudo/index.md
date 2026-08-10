---
title: "Chapter 5 — Permissions and sudo"
aliases:
  - "11-Dev-101/Terminal-101/05-permissions-sudo"
---

**Time to study:** ~75 min
**You will learn:** what root and `sudo` are, how to read the permission string, and how to change permissions and owners.

[[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|next: Chapter 6 →]]

---

## 1. the root user and the `sudo` privilege

> while u are configuring ur machine for the first time, if u are installing a linux distribution or setting up a macOS system, u are asked to make at least 1 user, right? for example mine is `ati`. but before u make ur own user account, the system already has the `root` one, which leads us to the main topic: permissions and `sudo`.

> as a normal user u don't have the permission to do everything. so by using the `sudo` command u can ask the root user to do that thing for u.

> before we continue, to make it clearer, try these commands on ur terminal:

```bash
whoami
```

```
ati
```

> and then try this:

```bash
sudo whoami
```

```
[sudo] password for ati:
root
```

> so with that small `sudo` command u can see that u are root and u can do everything. but u need to be careful, if u do something wrong u can break ur system, so be careful with the `sudo` command.

- note: the first time u run `sudo` it asks for **ur own** password, not the root password. after that it remembers u for a few minutes and stops asking.

---

## 2. the permission

> every file, to do an action on it, must have some permission. so we have 3 permission types: `read`, `write` and `execute`.

and before we dive into that, let's see what the permission of a file looks like:

```bash
# the `l` here is "long" which means the output will be in long format
ls -l
```

```
-rw-r--r-- 1 ati ati 12 Oct 11 2021 notes.md
```

> u will see a very weirdo thing showing as `-rw-r--r--`. what does this really mean?

> we have 1 part for the type of the file and 3 permission levels. before we continue u need to know that `read = r`, `write = w` and `execute = x`, and every permission level has these 3 actions in the order `rwx`. so if a level has the three permissions, that level's user can read, write and execute the file.

> if it is just `rw-` it means can read and write but can not execute the file.

> if it is just `r--` it means can read but can not write and can not execute the file.

so with all that said, check the diagram below:

```
-rw-r--r--
│└┬┘└┬┘└┬┘
│ │  │  └──── 4. Others  : r-- (read only)
│ │  └─────── 3. Group   : r-- (read only)
│ └────────── 2. Owner   : rw- (read + write)
└──────────── 1. File type : `-` means a normal file, `d` means a directory
```

1. **File type**: shows u what the thing is, a file or a dir or a link. `-` means file, `d` means dir.
2. **Owner**: the permission of the owner. in this case it is `rw-`, so the owner can read and modify the file but not execute it.
3. **Group**: the permission of the group. in this case it is `r--`, so other users who are in the same group as the owner can only read the file.
4. **Others**: the permission of everyone else. in this case it is `r--`, so anyone who is not the owner and not in the group can only read the file.

- `Owner` is the person who owns the file (usually the one who created it) and has the most control over it.
- `Group` is a set of users who share the same permission level on the file.
- `Others` is everyone on the machine who is not the owner and not in the group.

> scenario: Alice creates a file, so she is the owner and with `rw-` she can read and write it. Bob and Charlie are in the same group as Alice, so with `r--` they can open it and read it but they can not change it. Dave is not the owner and not in that group, so he falls in "others", and with `r--` he can also read it but not change it.

> if Alice wanted Dave to not even open the file, she would have to set the others level to `---`, and we will see how to do exactly that in the next section.

- note: let's say we have 5 users on my machine. only the `root` (the administrator) can put them into groups. so root puts 2 of the users into the same group and those 2 share whatever the Group level allows. the other 3 users are not in that group, so they get whatever the Others level allows. and the user who created the file gets the Owner level.

> that may be too much for u but it is really too ez, just try to understand it once and u are done.

---

## 3. how to give permission to a file

> to change the permission of a file u use the `chmod` command (change mode).

```bash
chmod
```

```
chmod: missing operand
Try 'chmod --help' for more information.
```

> so it needs to know **what** to change and **on which file**. there are two ways to write it.

**the first way** is to set the levels directly with `=`:

```bash
chmod u=rwx,g=rwx,o= notes.md
ls -l
```

```
-rwxrwx--- 1 ati ati 12 Oct 11 2021 notes.md
```

> which means: give read, write and execute to the owner and the group, and nothing at all to the others.

- `u` = user (the owner), `g` = group, `o` = others, `a` = all of them together.

**the second way** is to add or remove one permission with `+` and `-`:

> `chmod +x` using `+` means add the permission, and `x` means the permission we want to add.
> `chmod -x` using `-` means remove the permission, and `x` means the permission we want to remove.

```bash
# start again from a normal file
chmod u=rw,g=r,o=r notes.md
ls -l
```

```
-rw-r--r-- 1 ati ati 12 Oct 11 2021 notes.md
```

```bash
chmod +x notes.md
ls -l
```

```
-rwxr-xr-x 1 ati ati 12 Oct 11 2021 notes.md
```

> look carefully at what happened. `chmod +x` added the `x` to **all three levels**, not only to the owner. if u want it only for urself u have to say which level u mean:

```bash
chmod u+x notes.md
ls -l
```

```
-rwxr--r-- 1 ati ati 12 Oct 11 2021 notes.md
```

```bash
chmod -x notes.md
ls -l
```

```
-rw-r--r-- 1 ati ati 12 Oct 11 2021 notes.md
```

- u can make combinations like `o-r` which means remove the read permission from the others, or `g+w` which means add the write permission to the group, or `u+rwx` which adds read, write and execute to the owner.

- the `-R` flag makes `chmod` recursive, which is for **directories**, so it applies to everything inside them:

```bash
# -R    do it to everything inside the folder too
# u=rwx me: read, write and go into it
# g=rx  my group: read and go into it, but not change it
# o=    everyone else: nothing at all
chmod -R u=rwx,g=rx,o= my-folder/
```

---

## 4. how to run an executable file

> we have a file `ati.sh` which contains one line, `echo "Hello World"`. it is not executable yet, so let's try to run it:

```bash
./ati.sh
```

```
bash: ./ati.sh: Permission denied
```

> that is the permission system stopping us, exactly what we learned above. so we give it the execute permission with `chmod`:

```bash
chmod u+x ati.sh
ls -l ati.sh
```

```
-rwxr--r-- 1 ati ati 20 Oct 11 2021 ati.sh
```

- and now we can run it. it is actually too simple, just write `./` then the name of the file if u are in the same dir:

```bash
./ati.sh
```

```
Hello World
```

> the `./` is there because of the path shortcuts we learned in [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]], `.` is the current dir. we will see why it is needed at all when we learn the `PATH` variable in [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]].

---

## 5. changing the owner and the group

> some other commands like `chown` can be used to change the owner of a file.

```bash
chown
```

```
chown: missing operand
Try 'chown --help' for more information.
```

```bash
# usage: chown [OPTION]... [OWNER][:[GROUP]] FILE...
sudo chown ati notes.md

# we can also change the owner and the group at the same time :
sudo chown ati:ati notes.md
```

> and u can use the `chgrp` command to change only the group of a file.

```bash
# usage: chgrp [OPTION]... GROUP FILE...
sudo chgrp ati notes.md

# changing only the group with chown instead, same result :
sudo chown :ati notes.md
```

- note: these need `sudo` most of the time, because giving ur file away to another user is not something a normal user is allowed to do freely.

---

## NOTES

1. `whatis`: is a command which gives u a brief description of what a command is used for.

```bash
whatis ls
```

```
ls (1)               - list directory contents
```

> most of the time this will not work directly and may show a `command not found` or `nothing appropriate` error. u need to build the manual database first by using `sudo mandb`, and then the `whatis` command works.

2. `whatis` gives u one line, `man` gives u the whole manual. use `whatis` when u only want to remember what a command does, and `man` when u need the flags.

---

## Assignment

1. Print ur username, then print it again as root.
2. Create a file `secret.txt` and look at its permission with `ls -l`.
3. Make it readable and writable by u only, and nothing for the group and the others.
4. Create a file `hello.sh` containing `echo "Hello from my script"`.
5. Try to run it with `./hello.sh` and read the error u get.
6. Give it the execute permission for the owner only, then run it.
7. Remove the execute permission again and confirm with `ls -l`.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/index\|next: Chapter 6 →]]
