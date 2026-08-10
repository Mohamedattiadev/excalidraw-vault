---
title: "Chapter 6 — Text Editors"
aliases:
  - "11-Dev-101/Terminal-101/06-text-editors"
---

**Time to study:** ~60 min
**You will learn:** `nano` for when u just want to edit a file, and `vim` for when u want to be fast, including the modes idea that makes vim make sense.

[[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|next: Chapter 7 →]]

---

## 1. why we need an editor at all

> until now, every time we wanted to see what was inside a file we used `cat`, `less`, `head` or `tail` from [[02-Personal/11-Dev-101/Terminal-101/03-files-and-navigation/index\|Chapter 3]]. all of those only **read** the file.

> and for writing into a file there is `>` and `>>`, which are coming in [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]]. they do work, but try writing a 40 line script with `echo` and `>>` and u will see the problem after the third line.

> so we need something in between. something that opens the file, lets us move around inside it and change any line we want, and saves it. that is a text editor.

> `nano`, `vim` and `emacs` are the most common ones u can use in the terminal.

```bash
nano notes.md
vim notes.md
emacs notes.md
```

> all three take the file name as the argument, and if the file doesn't exist yet they create it for u when u save.

- u will meet these on a server one day where there is no GUI at all, and then this chapter stops being optional.
- we will do `nano` and `vim` here. `emacs` is a whole world of its own and u don't need it to get started.

---

## 2. `nano`, the easy one

> `nano` is the one to start with. it works the way u expect: u open it, u type, the letters appear. there is no mode and no trick.

```bash
nano notes.md
```

```
  GNU nano 7.2                    notes.md

hello, this is my file.
i can just type here like a normal editor.



^G Help      ^O Write Out   ^W Where Is   ^K Cut
^X Exit      ^R Read File   ^\ Replace    ^U Paste
```

> look at the bottom of the screen. that is the whole reason to use `nano`, it tells u the shortcuts while u are working, so u are never stuck.

> the `^` means the `ctrl` key. so `^X` means `ctrl + x`.

- `ctrl + o` : save the file. it asks u the name, press Enter to keep it.
- `ctrl + x` : exit. if u have unsaved changes it asks u first, press `y` then Enter.
- `ctrl + w` : search for something.
- `ctrl + k` : cut the line u are standing on.
- `ctrl + u` : paste it back.
- the arrow keys move u around, exactly like u expect.

> that is really all of `nano`. u already know it now.

---

## 3. `vim` and the modes idea

> now `vim`. the first time everyone opens it, they type some letters, weird things happen, and then they can not even close it. so before any command, u need one idea:

> **in vim, ur keyboard does two different jobs, and u switch between them.**

> in a normal editor the letter keys always type letters. so to do anything else, like copy or delete a line, u need `ctrl` or the mouse or a menu.

> vim made a different choice. most of the time u are **not** typing, u are moving around and changing things. so vim gives the letter keys to those jobs, and typing becomes the thing u switch into.

these are the modes:

- **normal mode**: where u start. the letters are commands, not text. `d` deletes, `y` copies. this is where u live.
- **insert mode**: the letters are letters. this is a normal editor. u get here with `i`.
- **visual mode**: for selecting text. u get here with `v`.

> and one key gets u back to normal mode from anywhere: `Esc`.

- if u are ever lost, press `Esc`. press it twice, it costs nothing. u are back in normal mode and u can start again.

---

### getting out, first

> this is the part that traps everyone, so we do it before anything else.

> press `Esc` first, always. then:

```
:q      quit. only works if u changed nothing
:wq     write and quit. this is the normal one
:q!     quit and throw away everything u changed
:w      write, but stay in the file
```

> the `:` puts u on the last line of the screen where u type the command, and Enter runs it.

- `:q!` is the escape hatch. u opened a file by accident, u typed junk into it, u want out with no damage. `Esc` then `:q!` and u are safe.

---

### typing something

```bash
vim notes.md
```

> u are in normal mode. press `i` and look at the bottom of the screen:

```
-- INSERT --
```

> now type whatever u want, it works like any editor. when u are done, press `Esc` and the `-- INSERT --` disappears. u are back in normal mode.

there is more than one way in, and the small differences save u a lot of time:

- `i` : insert **before** the character u are on
- `a` : insert **after** it
- `o` : open a new line **below** and start typing on it
- `O` : open a new line **above**
- `A` : jump to the **end of the line** and start typing there

> `o` and `A` are the two u will use the most, once u notice u keep pressing `i` then moving to where u actually wanted to be.

---

### moving around

> in normal mode, these move the cursor:

```
h  left        j  down        k  up        l  right
```

> the arrow keys also work, so don't fight this on ur first day. `hjkl` is faster later because ur hand never leaves the middle of the keyboard, but it is not the point right now.

the ones that actually save time:

- `w` : jump forward one word
- `b` : jump back one word
- `0` : start of the line
- `$` : end of the line
- `gg` : top of the file
- `G` : bottom of the file
- `5G` : go to line 5

> `gg` and `G` are worth learning today. jumping to the top or the bottom of a 500 line file instantly is the moment vim starts to feel good.

---

### changing things

> all of these are in normal mode, no `ctrl` needed:

- `x` : delete one character
- `dd` : delete the whole line
- `yy` : copy ("yank") the line
- `p` : paste it after the cursor
- `u` : undo
- `ctrl + r` : redo

> and now the actual idea behind vim. these commands take a **number** and a **target**, and u can combine them freely:

```
dd     delete a line
3dd    delete 3 lines
dw     delete a word
d$     delete from here to the end of the line
yy     copy a line
3yy    copy 3 lines
```

> so u are not memorizing a list of shortcuts. u learn `d` means delete, u learn `w` means word, and `dw` is free. u learn `y` means copy, and `3yy` is free too. that is why people who use vim get fast, and it is the only reason it is worth the ugly first day.

---

### searching

> same as `grep` from [[02-Personal/11-Dev-101/Terminal-101/04-search-grep-find/index\|Chapter 4]] but inside the file u have open:

```
/hello      search forward for "hello"
n           jump to the next result
N           jump to the previous one
```

- press `Esc` when u are done searching.

---

## 4. so which one do i use

> `nano` when u want to change 2 lines in a config file and get out. no thinking, no modes, the shortcuts are on the screen.

> `vim` when u are going to be in the file for a while, or when u are on a server, because `vim` is installed on basically every linux machine in the world and `nano` sometimes is not.

- i prefer `vim` over `emacs` because it has more features and is more powerful.
- be honest with urself on the first week. use `nano` for real work and practise `vim` on a copy of a file. trying to learn vim while u are in a hurry is how people end up hating it.

---

## NOTES

1. `vimtutor`: vim ships with its own tutorial and it is genuinely good. 30 minutes, hands on, inside vim itself.

```bash
vimtutor
```

2. `nvim` (neovim) is a newer version of vim, and it comes up again in [[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]] with the package managers. everything in this chapter works exactly the same in it.

```bash
sudo pacman -S neovim   # arch
sudo apt install neovim # ubuntu
```

3. some commands open an editor for u instead of taking an argument, like `git commit`. which editor they open is decided by the `EDITOR` environment variable, and u set it with `export`, which is the next chapter, [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]:

```bash
echo $EDITOR
```

```
vim
```

> if that comes back empty, u can set it in ur `.bashrc`:

```bash
export EDITOR=nano
```

> this is a real thing worth doing early, because the first time `git` drops u into vim with no warning is exactly the moment u don't want to be learning `:wq`.

4. vim has its own config file, `~/.vimrc`, same idea as the `.bashrc` file we get to in [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]. u don't need it yet, but that is where people's setups come from.

---

## Assignment

1. Create a file `about-me.md` using `nano`, write 3 lines about urself, save and exit.
2. Read the file back without opening an editor.
3. Open it with `vim`, use `o` to add a 4th line at the bottom, save and quit.
4. Read it back again and confirm ur new line is there.
5. Open it with `vim`, delete a whole line with `dd`, then quit **without saving** and confirm the line is still there.
6. Open it with `vim` and copy the first line, then paste it 3 times at the bottom. Save.
7. Open it with `vim`, jump straight to the last line without pressing the arrow keys, then jump back to the first.
8. Set ur `EDITOR` variable to `vim` and make it survive closing the terminal.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Terminal-101/06-text-editors/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/Terminal-101/index\|back to Terminal 101]] | [[02-Personal/11-Dev-101/Terminal-101/07-scripts-env-path/index\|next: Chapter 7 →]]
