---
title: "Chapter 3 — What Git Actually Stores — Solutions"
aliases:
  - "11-Dev-101/Git-101/03-git-objects/solutions"
  - "11-Dev-101/Git-101/03-git-objects/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|back to the chapter]]

---

```bash
# 1
ls -la .git
# .git/index is the staging area

# 2
git log --oneline
# 79e91e0 (HEAD -> master) 2nd commit
# 70d5c6e add Readme.md        <- the first one is the bottom line

# 3
git cat-file -p 70d5c6e
# tree, author, committer, then a blank line, then the message

# 4
git cat-file -p 58c31878
# 100644   blob   557db03...   Readme.md
#   ↑        ↑        ↑            ↑
# mode     type   the blob id    name

# 5
git cat-file -p 557db03

# 6
git cat-file -t 557db03
git cat-file -s 557db03

# 7
echo "Hello World" | git hash-object --stdin

# 8
git cat-file -p 79e91e0
# parent 70d5c6e...   <- the first commit

# 9
git cat-file -p 66e850b

# 10
git log --oneline --graph --all --decorate

# 11
git log --oneline -- Readme.md
```

output of 5:

```
Hello World
```

output of 6:

```
blob
12
```

output of 7:

```
557db03de997c86a4a028e1ebd3a1ceb225be238
```

output of 9:

```
100644 blob ff9fdcc2ecffb784e245379678b6d388b6ac5aa2	2nd-commit.md
100644 blob 557db03de997c86a4a028e1ebd3a1ceb225be238	Readme.md
```

- in step 7, the hash u got is **exactly** the blob id from step 4, and it is the same
  hash i have here, because a blob's id is made out of the content and nothing else.
- in step 9, `Readme.md` points at the same blob as in the first commit. the file did
  not change, so git did not store it twice.
- ur commit hashes are not the same as mine, and they never will be. a commit carries
  ur name, ur email and the second u made it in.

---

[[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|back to the chapter]]
