---
title: "Chapter 10 — Tags, Versions and the License — Solutions"
aliases:
  - "11-Dev-101/Git-101/10-tags-and-license/solutions"
  - "11-Dev-101/Git-101/10-tags-and-license/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|back to the chapter]]

---

```bash
# 1
git tag v1.0.0

# 2
git tag
git log --oneline --decorate -n 3

# 3
git log --oneline            # take the hash of the bottom line
git tag v0.1.0 <that-hash>

# 4
git tag -d v0.1.0

# 5
git tag -a v1.1.0 -m "the first feature release"
git show v1.0.0              # starts at "commit ..."
git show v1.1.0              # starts at "tag v1.1.0" with a Tagger line

# 6
git push --tags

# 7
# fixed typo in the output   -> PATCH   v1.0.0 -> v1.0.1
# new command line flag      -> MINOR   v1.0.1 -> v1.1.0
# renamed a function         -> MAJOR   v1.1.0 -> v2.0.0

# 8
git checkout v1.0.0
# "You are in 'detached HEAD' state"
git switch main

# 9
touch LICENSE
# paste the MIT text, put ur name and the year in the Copyright line
git add LICENSE
git commit -m "add the MIT license"

# 10
git push

# 11
# because without a license the author keeps every right by default.
# public means readable, it does not mean usable.
```

output of 2:

```
953afcd (HEAD -> main, tag: v1.0.0) commit 10
a0fd0ae commit 9
94f4c63 commit 8
```

output of 5, the annotated one:

```
tag v1.1.0
Tagger: mohamedattiadev <youremail@example.com>
Date:   Fri Aug 28 15:00:22 2026 +0300

the first feature release

commit 953afcdcfb34e620893b95002ac4b3c1679704dd
```

output of 8:

```
Note: switching to 'v1.0.0'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.
```

- in step 5, the whole difference is the block on top: an annotated tag is a real object
  with a tagger, a date and a message. a lightweight one is just a name on a commit.
- in step 6, if u used `git push` on its own in step 10 and expected the tags to go too,
  they did not. tags need `--tags`, or naming one: `git push origin v1.0.0`.
- in step 8, detached HEAD is not an error. u asked to stand on a commit instead of a
  branch, and git is telling u that commits made here belong to nothing.
- in step 7, the rule to keep: does old code still work? yes and it is a fix → PATCH.
  yes and it is new → MINOR. no → MAJOR.

---

[[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|back to the chapter]]
