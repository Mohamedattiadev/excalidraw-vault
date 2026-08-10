---
title: "Chapter 4 — Searching: grep and find — Solutions"
---

# Chapter 4 — Searching: grep and find — Solutions

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/04-search-grep-find/index\|back to the chapter]]

---

```bash
# 1
mkdir ch3-practice
cd ch3-practice
echo "cat" > animals.txt
echo "Dog" >> animals.txt
echo "bird" >> animals.txt
echo "cat food" >> animals.txt

# 2
grep "cat" animals.txt

# 3
grep -i "dog" animals.txt

# 4
grep -v "cat" animals.txt

# 5
grep -n "cat" animals.txt

# 6
find ~ -type f -name "*.txt"

# 7
find ~ -type d -name "ch*"
```

output of 2:

```
cat
cat food
```

output of 4:

```
Dog
bird
```

output of 5:

```
1:cat
4:cat food
```

- notice in step 1 the first line uses `>` and the rest use `>>`. the first one creates the file, the rest append to it. if u used `>` every time u would end up with only the last line. this is [[11-Dev-101/Terminal-101/08-io-pipes-processes/index\|Chapter 8]] material, u are just seeing it early.

---

[[11-Dev-101/Terminal-101/04-search-grep-find/index\|back to the chapter]]
