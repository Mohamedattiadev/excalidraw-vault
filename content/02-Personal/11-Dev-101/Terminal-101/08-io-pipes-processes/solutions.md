---
title: "Chapter 8 — Input, Output, Pipes and Processes — Solutions"
aliases:
  - "11-Dev-101/Terminal-101/08-io-pipes-processes/solutions"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|back to the chapter]]

---

```bash
# 1
ls ~
echo $?
ls ~/nope
echo $?

# 2
echo "first line" > notes.log

# 3
echo "second line" >> notes.log
cat notes.log

# 4
cat missing.txt 2> errors.log
cat errors.log

# 5
ls ~ | wc -l

# 6
ls ~ | grep "D" | wc -l

# 7
ps aux | grep "bash"

# 8
mkdir practice && cd practice

# 9
sleep 30 &
jobs
fg
# then ctrl + c to kill it

# 10
sleep 30
# press ctrl + z
bg
jobs
```

output of 1:

```
0
2
```

output of 3:

```
first line
second line
```

output of 4:

```
cat: missing.txt: No such file or directory
```

output of 9:

```
[1] 4517
[1]+  Running                 sleep 30 &
sleep 30
```

- in step 3, if u used `>` instead of `>>` u would have lost `first line` completely.
- in step 4, notice that nothing appeared on ur screen when u ran the `cat`. that is the point, the error went into the file instead.
- in step 7, remember one of the lines u see is the `grep` itself.
- in step 8, `&&` is the answer and `;` is the wrong one. if the `mkdir` fails because the folder already exists, `;` would still run the `cd`.
- in step 10, if u stop after `ctrl + z` and never type `bg`, that `sleep` is paused and not running. `jobs` would say `Stopped` instead of `Running`. try it both ways and look at the difference.

---

[[02-Personal/11-Dev-101/Terminal-101/08-io-pipes-processes/index\|back to the chapter]]
