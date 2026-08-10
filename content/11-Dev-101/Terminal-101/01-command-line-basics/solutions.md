---
title: "Chapter 1 — Command Line Basics — Solutions"
---

# Chapter 1 — Command Line Basics — Solutions

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/01-command-line-basics/index\|back to the chapter]]

---

```bash
# 1 and 2
name="Mohamed"
surname="Ati"
age="23"
job="programmer"

echo $name
echo $surname
echo $age
echo $job

# 3
echo "Hello everyone! My name is $name $surname. I am $age years old, and I work as a $job."

# 4
history

# 5
city="Istanbul"
echo "$name $surname, $age, $job, lives in $city"

# 6
echo 'my variable is called $name'

# 7
touch "my file.txt"
rm "my file.txt"

# 8
# type   cd Doc   then press Tab , it becomes   cd Documents/

# 9
# press ctrl + r , then start typing   echo
# keep pressing ctrl + r to go further back through the matches
# Enter runs it, the arrow keys let u edit it first
```

output of 3:

```
Hello everyone! My name is Mohamed Ati. I am 23 years old, and I work as a programmer.
```

output of 6:

```
my variable is called $name
```

- in step 6 the single quotes are the whole answer. with double quotes u would get `my variable is called ati`.
- in step 7, without the quotes `rm my file.txt` would try to delete 2 files called `my` and `file.txt`, and complain that neither one exists.

---

[[11-Dev-101/Terminal-101/01-command-line-basics/index\|back to the chapter]]
