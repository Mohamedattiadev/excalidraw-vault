---
title: "Chapter 3 — Files and Navigation — Solutions"
---

# Chapter 3 — Files and Navigation — Solutions

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/03-files-and-navigation/index\|back to the chapter]]

---

```bash
# 1
cd ~
pwd

# 2
mkdir ch3-practice
cd ch3-practice

# 3
touch one.txt two.txt three.txt

# 4
echo "Mohamed Ati" > one.txt
cat one.txt

# 5
mv two.txt renamed.txt

# 6
mkdir backup
cp *.txt backup/

# 7
head -n 2 one.txt

# 8
echo *.txt

# 9
touch file1.txt file2.txt file10.txt
ls file?.txt

# 10
cd ~
rm -rf ch3-practice
```

output of 6, to check it worked:

```bash
ls backup
```

```
one.txt  renamed.txt  three.txt
```

output of 8:

```
one.txt renamed.txt three.txt
```

output of 9:

```
file1.txt  file2.txt
```

- in step 4 the `>` is redirecting the output of `echo` into the file instead of the screen, we learn it properly in [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]].
- in step 8, look at what came back. `echo` knows nothing about files, it only printed what the shell handed it. that is the wildcard being expanded before the command runs.
- in step 9, `file10.txt` is missing from the result on purpose. `?` is exactly one character and `10` is two.
- in step 10 notice we go out of the dir first with `cd ~`, u can not delete the dir u are standing inside.

---

[[11-Dev-101/Terminal-101/03-files-and-navigation/index\|back to the chapter]]
