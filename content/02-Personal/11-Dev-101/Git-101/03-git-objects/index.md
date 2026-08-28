---
title: "Chapter 3 — What Git Actually Stores"
aliases:
  - "11-Dev-101/Git-101/03-git-objects"
  - "11-Dev-101/Git-101/03-git-objects/index"
---

**Time to study:** ~60 min
**You will learn:** what is inside `.git`, the 3 objects git is made of (`blob`, `tree`, `commit`), how to walk them with ur own hands, and how to read the history with `git log`.

[[02-Personal/11-Dev-101/Git-101/02-git-config/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|next: Chapter 4 →]]

---

> this is the chapter that turns git from magic into a thing u understand. after it, commands like `reset` and `rebase` stop being scary, because u will know what they are moving around.

> u need the `git-test` repo from [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]] with its 2 commits in it. if u do not have it, make it now, it is 5 lines.

---

## 1. what is inside `.git`

> git is made of **objects**, and every object has a unique id. let's go and look at them:

```bash
cd git-test
ls -la .git
```

```
drwxr-xr-x   - ati 16 Aug 02:18 hooks
drwxr-xr-x   - ati 16 Aug 02:18 info
drwxr-xr-x   - ati 16 Aug 03:05 logs
drwxr-xr-x   - ati 16 Aug 03:05 objects      <- this is where everything lives
drwxr-xr-x   - ati 16 Aug 02:18 refs
.rw-r--r-- 157 ati 16 Aug 03:07 COMMIT_EDITMSG
.rw-r--r--  92 ati 16 Aug 02:18 config       <- chapter 2 was in here
.rw-r--r--  73 ati 16 Aug 02:18 description
.rw-r--r--  23 ati 16 Aug 02:18 HEAD         <- where u are (chapter 5)
.rw-r--r-- 137 ati 16 Aug 02:51 index        <- the staging area, as a file
```

- the **staging area** from Chapter 1 is not an idea, it is that `index` file. when u `git add`, git writes into it.

---

## 2. the `SHA`, and the 2 letter folders

> every object git stores gets an id: a 40 character `SHA` hash.

```
557db03de997c86a4a028e1ebd3a1ceb225be238
```

> and git stores the object in `objects/`, using the **first 2 characters as the folder name** and the other 38 as the file name:

```
.git/objects/
└── 55/
    └── 7db03de997c86a4a028e1ebd3a1ceb225be238
```

```
55 + 7db03de997c86a4a028e1ebd3a1ceb225be238
↑                    ↑
folder               file name
```

> so if u see 3 folders in there:

```bash
ls .git/objects
```

```
53  55  58  66  6b  ff  info  pack
```

> some of those will match mine and some will not, and section 5 explains why. but the point here is different: u **cannot** say `55` is a commit and `58` is a file. the folder name tells u nothing about the type. it is only the first 2 characters of some object's SHA, and splitting them into folders is just so one directory does not end up with 400,000 files in it.

---

## 3. the 3 objects

> there are more, but these are the 3 that matter and the ones u will meet every day:

```
blob    ->  the CONTENT of a file. only the content, not even its name
tree    ->  a folder listing: names, permissions, and which blob each name points to
commit  ->  a snapshot: which tree, which commit came before, who, when, and the message
```

> and they point at each other in one direction:

```
Commit
  │  points to
  ▼
Tree
  │  points to
  ▼
Blob
  │  stores
  ▼
"Hello World"
```

> so when we committed `Readme.md` containing `Hello World`, 3 things were created:

1. a **blob** holding the text `Hello World`.
2. a **tree** saying "the name `Readme.md` points to that blob".
3. a **commit** saying "this snapshot is that tree, made by ati, at this time, with this message".

> that is the whole design. **git is pointers pointing at pointers**, and that is also why a repo with a thousand commits is so tiny.

---

## 4. `cat-file`, following the chain

> this is the part that makes it click, so actually type it. the command we need is `cat-file`, which prints any object if u give it the id:

```bash
git cat-file -p <hash>
```

> and we get the first hash from the log:

```bash
git log --oneline
```

```
79e91e0 (HEAD -> master) 2nd commit
70d5c6e add Readme.md
```

> take the **first commit**, `70d5c6e`, and print it. u do not need the whole 40 characters, the first 4 to 7 are enough for git to find it:

```bash
git cat-file -p 70d5c6e
```

```
tree 58c31878a99ff474aba5a0ad3cc751285003acc7
author mohamedattiadev <youremail@example.com> 1787918299 +0300
committer mohamedattiadev <youremail@example.com> 1787918299 +0300

add Readme.md
```

> look at what a commit really is. it is 5 lines of text: a tree, who wrote it, who committed it, and the message. now follow the `tree` line:

```bash
git cat-file -p 58c31878
```

```
100644 blob 557db03de997c86a4a028e1ebd3a1ceb225be238	Readme.md
```

> there it is, the folder listing. `100644` is the file permission ([[02-Personal/11-Dev-101/Terminal-101/05-permissions-sudo/index\|Terminal 101 Chapter 5]] if u want to know why it looks like that), then the type, then the blob's id, then the name. now follow the blob:

```bash
git cat-file -p 557db03
```

```
Hello World
```

> and there is ur file. u just walked the whole chain by hand:

```
commit 70d5c6e ──► tree 58c3187 ──► blob 557db03 ──► "Hello World"
```

> isn't that really cool?

- `git cat-file -t <hash>` tells u the **type** of an object, and `-s` its size in bytes:

```bash
git cat-file -t 557db03
git cat-file -s 557db03
```

```
blob
12
```

---

## 5. where a blob id comes from

> this is the part that surprised me. run this:

```bash
echo "Hello World" | git hash-object --stdin
```

```
557db03de997c86a4a028e1ebd3a1ceb225be238
```

> **the exact same hash i have.** that is not a coincidence and it is not ur repo: the id of a blob is made *from the content itself*. same content, same id, on every machine on earth, forever.

- ur **commit** hash is different from mine, because a commit also contains ur name, ur email and the time u made it. change one character of any of those and u get a completely different commit id, which is exactly why rewriting history (Chapter 6 and 7) always produces new hashes.

> and this is where the trick lives: if 2 files anywhere in ur project have the same content, git stores **one** blob and points at it twice. u will see it happen in the next section.

---

## 6. the parent, and reusing blobs

> we made a second commit in Chapter 1. let's look at it:

```bash
git cat-file -p 79e91e0
```

```
tree 66e850b547ac29f8501686db13a47a4e1d0cc5c3
parent 70d5c6eb6ac6e35f223eae7b01abce5021d4df12
author mohamedattiadev <youremail@example.com> 1787918299 +0300
committer mohamedattiadev <youremail@example.com> 1787918299 +0300

2nd commit
```

> a new line appeared: **`parent`**, and it holds the id of the commit before it.

```
(parent) 70d5c6e  add Readme.md
              ↓
(child)  79e91e0  2nd commit
```

> that single line is the entire history. a commit knows its parent, that parent knows its own parent, and following that chain backwards **is** what `git log` does.

> now the tree of this second commit:

```bash
git cat-file -p 66e850b
```

```
100644 blob ff9fdcc2ecffb784e245379678b6d388b6ac5aa2	2nd-commit.md
100644 blob 557db03de997c86a4a028e1ebd3a1ceb225be238	Readme.md
```

> **look at the second line.** `Readme.md` still points at `557db03`, the same blob as the first commit. we did not change that file, so git did not store it again. it just pointed at the one it already had.

```
OLD COMMIT                              NEW COMMIT

70d5c6e                                 79e91e0
   │                                       │
   ▼                                       ▼
old tree                                new tree
   │                                       │
   │                                       ├── 2nd-commit.md
   │                                       │       ↓
   │                                       │   ff9fdcc
   │                                       │
   └── Readme.md                           └── Readme.md
           │                                       │
           └───────────────┬───────────────────────┘
                           ▼
                        557db03
                         blob
                     "Hello World"
```

> to wrap up: **every commit points to a tree that describes the whole project at that moment.** the tree changes between commits, but a blob is reused as long as the content did not change. that is why a snapshot per commit does not mean a copy of ur project per commit.

---

## 7. reading the history with `git log`

> now that u know what is in there, the log flags make sense. these are the ones worth knowing:

```bash
git log
```

```
commit 79e91e04f6fb4309c982a0107af75cd239dfd261 (HEAD -> master)
Author: mohamedattiadev <youremail@example.com>
Date:   Fri Aug 28 14:58:19 2026 +0300

    2nd commit
```

```bash
# the one i use most, the whole history one line each
git log --oneline
```

```
79e91e0 (HEAD -> master) 2nd commit
70d5c6e add Readme.md
```

```bash
# only the last 3 commits
git log -n 3

# with the graph, all the branches, and the names on them
git log --oneline --graph --all --decorate
```

```
*   9834467 (HEAD -> main) Merge branch 'feat/theme2'
|\
| * e7a199a (feat/theme2) dark theme
* | e837085 light theme
|/
* fb31aea adding colortheme
* 79e91e0 2nd commit
* 70d5c6e add Readme.md
```

> that last one will make full sense after [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]], and it is the command worth putting in an alias (we did exactly that in [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]], `git lg`).

- more flags u will actually reach for:

```bash
git log --stat                    # which files changed, and by how many lines
git log -p                        # the full diff of every commit
git log --author="ati"            # only my commits
git log --since="2 weeks ago"     # only recent ones
git log -- Readme.md              # only commits that touched this file
git log --oneline -5              # last 5, short
```

---

## NOTES

1. `git show` prints one commit with its diff. with no argument it means HEAD:

```bash
git show
git show 70d5c6e
git show HEAD~1        # the commit before this one
```

2. **`HEAD~1` and `HEAD^`** both mean "the parent of HEAD". they only differ on merge commits, which have 2 parents: `HEAD^1` is the first parent, `HEAD^2` is the second. u can go further with `HEAD~3`, meaning 3 commits back.

3. **objects are never edited.** git only ever writes new ones. that is why almost nothing in git is truly lost, and why [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]] can bring back a commit u thought u destroyed.

4. `git count-objects -v` tells u how many loose objects u have. after a while git packs them into `.git/objects/pack`, which is why the 2 letter folders sometimes disappear. nothing was lost, it was just compressed.

5. u will not use `cat-file` in ur daily work, and that is fine. u did it once so that "a commit points to a tree" is something u have seen with ur eyes instead of something u read.

---

## Assignment

1. In `git-test`, list what is inside `.git` and find the file that holds the staging area.
2. Get the SHA of ur first commit in the short one line format.
3. Print that commit object. What are the lines inside it?
4. Follow the `tree` line and print the tree. What does each column mean?
5. Follow the blob and print the content of ur file.
6. Ask git for the **type** and the **size** of that blob.
7. Compute the hash of the text `Hello World` without committing anything, and compare it to the blob id.
8. Print ur second commit and find the `parent` line. Which commit does it point to?
9. Print the tree of the second commit, and show that the unchanged file still points at the same blob.
10. Show ur history with the graph, all branches, and the names, in one line per commit.
11. Show only the commits that touched `Readme.md`.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/03-git-objects/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/02-git-config/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|next: Chapter 4 →]]
