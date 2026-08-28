---
title: "Chapter 8 — Stash, Cherry-pick and Bisect — Solutions"
aliases:
  - "11-Dev-101/Git-101/08-stash-cherrypick-bisect/solutions"
  - "11-Dev-101/Git-101/08-stash-cherrypick-bisect/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|back to the chapter]]

---

```bash
# 1
echo "wip one" >> file1.txt
echo "wip two" >> file2.txt
git stash
git status

# 2
git stash list
git stash pop
git stash list             # empty

# 3
echo "a" >> file1.txt && git stash push -m "FIRST"
echo "b" >> file1.txt && git stash push -m "SECOND"
echo "c" >> file1.txt && git stash push -m "THIRD"
git stash list
# stash@{0} is THIRD. the newest is always on top.

# 4
git stash apply stash@{1}
git stash list             # SECOND is still in the list

# 5
git restore .              # clean up what apply just gave u
git stash drop stash@{1}

# 6
git stash clear

# 7
echo "brand new" > newfile.txt
git stash
# No local changes to save    <- untracked files are not "changes" to git
git stash -u

# 8
git switch -c feat/big
echo "the fix" > fix.txt && git add . && git commit -m "the small fix i need"
echo "unfinished" > big.txt && git add . && git commit -m "huge unfinished thing"
git log --oneline          # copy the hash of the fix commit
git switch main
echo "main work" >> notes.md && git add . && git commit -m "main work"
git cherry-pick <the-fix-hash>

# 9
git log --oneline          # on main: a NEW hash
git log --oneline feat/big # on the branch: the original hash, untouched

# 10
# a repo where price.sh should print 120:
git bisect start
git bisect bad
git bisect good <the-first-commit>
./price.sh                 # test whatever git checked out
git bisect good            # or: git bisect bad
# ... repeat until git names the commit

# 11
git bisect reset
git bisect start HEAD <the-first-commit>
git bisect run bash -c '[ "$(./price.sh)" = "120" ]'

# 12
git bisect reset
```

output of 1:

```
Saved working directory and index state WIP on main: 08e8231 2nd colortheme commit
On branch main
nothing to commit, working tree clean
```

output of 3:

```
stash@{0}: On main: THIRD
stash@{1}: On main: SECOND
stash@{2}: On main: FIRST
```

output of 7:

```
No local changes to save
```

output of 10 and 11, at the end:

```
2c0db802862fab33fd4f83db8d9928f0d47981fa is the first 'bad' commit

    refactor the tax line

 price.sh | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

- in step 3, remember `stash@{0}` is a **position**, not a name. pop the top one and
  everything under it renumbers.
- in step 4, `apply` left it in the list and `pop` would have removed it. that is the
  only difference between the two.
- in step 7, this is the trap worth remembering: git does not stash what it is not
  tracking, and it tells u with a message that looks like nothing is wrong. `-u`.
- in step 9, cherry-pick **copied** the commit. the same change now exists twice with 2
  different hashes, which is exactly why u use it for exceptions and not as a habit.
- the reason step 8 makes `main` move on first: a commit's id is made from its content,
  its parent, its author and its timestamps ([[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]).
  cherry-pick onto a `main` that has **not** moved gives the copy the same tree and the
  same parent as the original, and then the only thing left to tell them apart is the
  second on the clock. move `main` on first and the new parent alone guarantees a new id,
  which is the thing this step is asking u to see.
- in step 12, if u forget `git bisect reset` u are left standing on some old commit in a
  detached HEAD, and ur next commit lands nowhere. always reset out of a bisect.

---

[[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|back to the chapter]]
