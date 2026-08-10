---
title: "Chapter 2 — The Linux File System"
---

# Chapter 2 — The Linux File System

**Time to study:** ~45 min
**You will learn:** what a file system is, and what every folder in the real linux tree is actually for.

[[11-Dev-101/Terminal-101/01-command-line-basics/index\|← Chapter 1]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|next: Chapter 3 →]]

---

## 1. what is the file system

> it is a hierarchical data structure which organizes our system like a tree.

```
/
└── home
    └── ati
        └── Attia-Pro
            └── Projects
                └── Terminal-101
                    ├── README.md
                    ├── 01-command-line-basics
                    │   └── README.md
                    └── 02-the-linux-file-system
                        └── README.md
```

> so in order to go to the `01-command-line-basics/README.md` file, i start from the root `/` and i go down step by step: enter `home` → then `ati` → then `Attia-Pro` → then `Projects` → then `Terminal-101` → then `01-command-line-basics` → then `README.md`.

> it may seem too complex, but in the normal GUI file explorer u already do exactly this with the mouse, u just don't think about it.

---

---

## 2. the whole real linux file system

> above we made up a small tree to explain the idea. now let's look at the real one on ur machine. go to the root and list what is there:

```bash
cd /
ls
```

```
bin   boot  dev  etc   home  lib  lib64  lost+found  mnt
opt   proc  root  run  sbin  srv  sys    tmp         usr  var
```

> the first time u see this it looks like too much. it is not. every one of these folders has one job, and u only really care about 5 of them. the rest u should just recognize so u don't panic when u see them.

> and one important thing before we start: in windows u have `C:` and `D:` and every disk gets its own letter. linux does not work like that. there is **one** tree that starts at `/` and everything is somewhere inside it, including ur usb stick and ur second hard disk. that is the whole idea.

---

### the ones u will actually use

**`/home`** is where ur stuff lives. every user gets a folder here with their name on it.

```bash
ls /home
```

```
ati  boot  help  lost+found  timeshift
```

> so my files are in `/home/ati`, and that is exactly what the `~` shortcut points to. ur documents, ur downloads, ur projects, ur `.bashrc` file, all of it is here. this is the only folder u will be working in 95% of the time.

- one folder here per user, and by default they can not write inside each other's one. that is the permission system from [[11-Dev-101/Terminal-101/05-permissions-sudo/index\|Chapter 5]] doing its job.
- not everything here is a user though. on my machine `lost+found` and `timeshift` are there because of how i partitioned the disk, they are not people. `ls /home` is a good guess at the user list, `cat /etc/passwd` is the real answer.

---

**`/etc`** is where the settings of the system live. all of them are plain text files.

```bash
ls /etc
```

```
alsa      anacrontab  apparmor.d  arch-release  fstab
hostname  hosts       locale.conf pacman.conf   pacman.d
passwd    profile     shells      ssh           sudoers
systemd   ...
```

> the real list is a few hundred entries long, that is just a slice of it from my own machine. the ones worth recognizing are in there: `hostname`, `passwd`, `ssh`, `sudoers`.

- ur list will not be identical to mine, and that is normal. i am on arch, so i have `pacman.conf`. on ubuntu u would see `apt` instead. the important names are the same everywhere.

> this is one of the nicest things about linux. there is no registry, there is no settings app hiding things from u. if u want to change how something works, u open a text file in `/etc` and u edit it. that's it.

- example: `/etc/hostname` is a file with one line in it, the name of ur machine.

```bash
cat /etc/hostname
```

```
Ati
```

- careful: u need `sudo` to change anything in here, and a wrong line in the wrong file can stop ur machine from booting. read before u write.

---

**`/var`** is for data that **var**ies, meaning it keeps growing and changing while the system runs. logs are the main thing u will go there for.

```bash
ls /var/log
```

```
archinstall  audit  auto-cpufreq.log  boot.log  btmp
cups         journal  lastlog  lightdm  old  pacman.log
```

> so when something breaks and u want to know why, this is where u look. remember the `.log` files we talked about? this is the folder they were named after.

- careful: on arch and on most new systems, most of the logs are **not** plain text files anymore, they are inside `journal/` in a binary format. so u read them with `journalctl` and not with `cat`:

```bash
journalctl -n 5
```

> on older systems, and on many servers, u will still find `syslog` and `auth.log` sitting there as normal text files u can `cat`.

- these files get long, so `less` and `tail` from [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]] are the right way to read them, not `cat`.

---

**`/tmp`** is temporary. programs drop files here that they only need for a minute.

```bash
ls /tmp
```

```
systemd-private-8f2a-ModemManager.service-Xk9pQr
tracker-extract-3-files.1000
```

> the important part: this folder gets emptied when u restart ur machine. so it is perfect for a scratch file and terrible for anything u care about.

---

**`/usr`** is where the programs u installed live. this is the biggest folder on most systems.

```bash
ls /usr
```

```
bin  games  include  lib  local  sbin  share  src
```

> the one u will meet the most is `/usr/bin`:

> it holds a few thousand files, so instead of listing all of them let's look for the ones we already know:

```bash
ls /usr/bin | grep -E "^(awk|bash|cat|chmod|grep|ls)$"
```

```
awk
bash
cat
chmod
grep
ls
```

- don't worry about the `|` and the `grep` in that command, they are [[11-Dev-101/Terminal-101/04-search-grep-find/index\|Chapter 4]] and [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]. u are just seeing them early.

> look at that list. `cat`, `chmod`, `grep`, `ls`. every command we learned in this course is a real file sitting in this folder. that is what a command actually is, a small program on ur disk.

> and this is why `which` works the way it does, which we will see properly in [[11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]:

```bash
which grep
```

```
/usr/bin/grep
```

- `/usr/local` is the same idea but for programs u installed by hand instead of through the package manager. keeping them apart means an update can never overwrite ur own stuff.

---

### the ones u only need to recognize

u will not open these often, but u should know what they are so they stop looking scary.

- **`/bin`** and **`/sbin`**: the same idea as `/usr/bin`, but for the core commands the system needs very early while it is starting up. the `s` in `/sbin` means system, those are the ones only root should run. on most modern distributions these are just links pointing into `/usr` anyway.

- **`/lib`**: the shared code that programs need to run. when 20 programs all need the same piece of code, it is stored once here instead of 20 times. u never touch this folder by hand.

- **`/boot`**: what the machine needs to actually start, including the kernel itself. do not delete things here, u will not be able to boot.

- **`/dev`**: every device on ur machine, shown as a file. ur disk, ur keyboard, ur webcam.

```bash
ls /dev
```

```
acpi_thermal_rel  autofs  block  bsg   btrfs-control
bus               disk    null   random  sda   sda1
sda2              sda3    shm    stdin   stdout
tty               tty0    zero   ...
```

> `sda` is a whole hard disk and `sda1` is one partition on it. `null` and `zero` are fake devices that are genuinely useful later.

> this is a very linux idea, and it is worth stopping on it for one second. ur hard disk is a file. ur keyboard is a file. so a program that knows how to read a file already knows how to read ur disk, and nothing special had to be invented for it.

- **`/proc`** and **`/sys`**: these two are not real folders on ur disk at all. the kernel builds them in memory while the machine runs, so u can read what is going on right now by just reading a file. the `ps` and `top` commands from [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]] get their information from here.

```bash
cat /proc/uptime
```

```
183422.51 1467893.22
```

> two numbers and no labels, which is very typical of `/proc`. the first is how many seconds the machine has been on. the second is how many seconds the cpu cores spent doing nothing, added together, which is why it can be bigger than the first one on a multi core machine.

> run it twice and u get a different answer, because the kernel makes the file up at the moment u read it. that is the whole point of `/proc`.

- **`/root`**: the home folder of the root user. it is **not** the same as `/`, and this catches everyone once. `/` is the top of the whole tree, `/root` is just one user's home.

- **`/mnt`** and **`/media`**: where other disks get attached to the tree. when u plug in a usb stick it shows up under one of these, and then u can `cd` into it like any normal folder. this is that "one tree" idea from the top of this section, actually happening.

> on my arch machine there is no `/media` at all, the usb sticks land in `/run/media/ati/` instead. so if u plug something in and can not find it, `lsblk` will tell u where it went.

- **`/opt`**: for big programs that want to keep everything in one folder of their own instead of spreading themselves around. some third party apps install here.

- **`/srv`** and **`/run`**: data for services, and temporary runtime state. u can safely ignore both for now.

---

### the short version

if u remember nothing else from this section, remember these:

| folder | what is in it |
|---|---|
| `/home/ati` | my files. this is where i work. same as `~` |
| `/etc` | settings, all of them plain text |
| `/var/log` | logs, where u look when something breaks |
| `/tmp` | scratch space, emptied on restart |
| `/usr/bin` | the commands themselves, as real files |

> everything else u can look up the day u need it. and in the next chapter, when u run `pwd`, the output will mean something, u are not reading a random string anymore, u can see where u are standing in the tree.

---

---

## Assignment

1. Go to the root of ur system and list what is in it.
2. Print the name of ur machine by reading the right file in `/etc`.
3. Look inside `/home` and see how many users ur machine has.
4. Show what is inside `/var/log` and pick one file that looks interesting.
5. Prove to urself that a command is really just a file: find `chmod` inside `/usr/bin`.
6. Read `/proc/uptime` and remember that this file does not exist on ur disk.
7. Without looking back at the table, say out loud what `/etc`, `/var/log` and `/tmp` are for.

> stuck, or done and want to check? [[11-Dev-101/Terminal-101/02-the-linux-file-system/solutions\|the solutions are here]]

---

[[11-Dev-101/Terminal-101/01-command-line-basics/index\|← Chapter 1]] | [[11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[11-Dev-101/Terminal-101/03-files-and-navigation/index\|next: Chapter 3 →]]
