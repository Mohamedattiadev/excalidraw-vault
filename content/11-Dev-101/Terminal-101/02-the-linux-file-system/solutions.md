---
title: "Chapter 2 — The Linux File System — Solutions"
---

# Chapter 2 — The Linux File System — Solutions

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/02-the-linux-file-system/index\|back to the chapter]]

---

```bash
# 1
cd /
ls

# 2
cat /etc/hostname

# 3
ls /home

# 4
ls /var/log

# 5
ls /usr/bin | grep -E "^chmod$"
# or the short way, which we learn properly in chapter 7 :
which chmod

# 6
cat /proc/uptime
```

output of 1:

```
bin   boot  dev  etc   home  lib  lib64  lost+found  mnt
opt   proc  root  run  sbin  srv  sys    tmp         usr  var
```

> urs will not be exactly the same as mine and that does not matter. i have `lib64` and `lost+found` because of how my disk is set up, and i have no `/media` because arch puts usb sticks in `/run/media` instead.

output of 5:

```
chmod
```

> and with `which` instead, u get the full path:

```
/usr/bin/chmod
```

- look at the difference between those two. `ls | grep` searched the **list of names** in that one folder, so it gives u back a name. `which` searched the whole `PATH` for u, so it gives u back a path. same answer, two different questions.

output of 6:

```
183422.51 1467893.22
```

> the first number is how many seconds ur machine has been on. the second one is how many seconds the cpu cores spent doing nothing, added together.

- in step 3, if u see only one folder that is normal, most people have one user on their own machine.
- in step 6, remember that this file is not on ur disk. the kernel makes it up the moment u read it, so the number is different every single time u run the command. try it twice.

---

[[11-Dev-101/Terminal-101/02-the-linux-file-system/index\|back to the chapter]]
