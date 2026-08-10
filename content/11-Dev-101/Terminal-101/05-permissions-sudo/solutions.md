---
title: "Chapter 5 — Permissions and sudo — Solutions"
---

# Chapter 5 — Permissions and sudo — Solutions

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/05-permissions-sudo/index\|back to the chapter]]

---

```bash
# 1
whoami
sudo whoami

# 2
touch secret.txt
ls -l secret.txt

# 3
chmod u=rw,g=,o= secret.txt
ls -l secret.txt

# 4
echo 'echo "Hello from my script"' > hello.sh

# 5
./hello.sh

# 6
chmod u+x hello.sh
./hello.sh

# 7
chmod u-x hello.sh
ls -l hello.sh
```

output of 3:

```
-rw------- 1 ati ati 0 Aug 9 14:20 secret.txt
```

output of 5:

```
bash: ./hello.sh: Permission denied
```

output of 6:

```
Hello from my script
```

output of 7:

```
-rw-r--r-- 1 ati ati 34 Aug 9 14:22 hello.sh
```

- in step 3 notice that `g=` and `o=` with nothing after the `=` is how u say "no permission at all".
- in step 4 the outer quotes are single `'` so that the inner double quotes survive into the file.

---

[[11-Dev-101/Terminal-101/05-permissions-sudo/index\|back to the chapter]]
