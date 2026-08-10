---
title: "Chapter 6 — Text Editors — Solutions"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/06-text-editors/index\|back to the chapter]]

---

```bash
# 1
nano about-me.md
# type ur 3 lines, then ctrl+o , Enter , then ctrl+x

# 2
cat about-me.md

# 3
vim about-me.md
# G      -> jump to the last line
# o      -> open a new line below and go into insert mode
# type ur line
# Esc    -> back to normal mode
# :wq    -> write and quit

# 4
cat about-me.md

# 5
vim about-me.md
# dd     -> delete the line u are on
# Esc
# :q!    -> quit and throw the change away
cat about-me.md

# 6
vim about-me.md
# gg     -> jump to the first line
# yy     -> copy it
# G      -> jump to the last line
# p p p  -> paste it 3 times
# :wq

# 7
vim about-me.md
# G      -> last line
# gg     -> first line
# :q

# 8
echo 'export EDITOR=vim' >> ~/.bashrc
source ~/.bashrc
echo $EDITOR
```

- in step 5, `dd` then `:q!` is the whole safety net of vim in two commands. do it on purpose once now, so the day u do it by accident u already know the way out.
- in step 6 u could also press `3p` instead of `p p p`, which is the number + command idea from section 3.
- in step 8 notice `>>` and not `>`, exactly like the alias in [[11-Dev-101/Terminal-101/07-scripts-env-path/index\|Chapter 7]]. with `>` u would erase ur whole `.bashrc`.

---

[[11-Dev-101/Terminal-101/06-text-editors/index\|back to the chapter]]
