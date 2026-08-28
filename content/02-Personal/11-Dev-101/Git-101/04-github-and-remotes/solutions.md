---
title: "Chapter 4 — GitHub and Remotes — Solutions"
aliases:
  - "11-Dev-101/Git-101/04-github-and-remotes/solutions"
  - "11-Dev-101/Git-101/04-github-and-remotes/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|back to the chapter]]

---

```bash
# 1
ssh-keygen -t ed25519 -C "ur_email@example.com"
cat ~/.ssh/id_ed25519.pub          # paste this on github, Settings > SSH keys
ssh -T git@github.com

# 2
# make the repo on github first (empty, no README), then:
cd practice-git
git remote add origin git@github.com:username/practice-git.git

# 3
git remote -v

# 4
git push -u origin main

# 5
git remote set-url origin git@github.com:username/wrong-name.git
git remote -v
git remote set-url origin git@github.com:username/practice-git.git

# 6
cd ..
git clone git@github.com:username/practice-git.git practice-clone

# 7
cd practice-clone
echo "from the clone" >> notes.md
git commit -am "a change from the clone"
git push

cd ../practice-git
git fetch
git status

# 8
git pull

# 9
echo "DB_PASSWORD=hunter2" > .env
mkdir node_modules && echo "junk" > node_modules/a.js
printf 'node_modules/\n.env\n' > .gitignore
git status -s

# 10
git check-ignore -v .env node_modules/a.js

# 11
git add -f .env
git commit -m "oops, committed the env file"
git rm --cached .env
git commit -m "stop tracking .env"
git status -s

# 12
echo "my-scratch.md" >> .git/info/exclude
echo "personal notes" > my-scratch.md
git status -s
```

output of 1:

```
Hi Mohamedattiadev! You've successfully authenticated, but GitHub does not provide shell access.
```

output of 7, the `git status` part:

```
On branch main
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
```

output of 10:

```
.gitignore:2:.env	.env
.gitignore:1:node_modules/	node_modules/a.js
```

output of 11, after `git rm --cached .env` and before the commit:

```
D  .env
```

output of 11, after the commit:

```
(nothing at all, and `.env` is still there in `ls -a`)
```

- in step 7, notice `fetch` changed **nothing** in ur files. it only told u the remote
  moved. `pull` in step 8 is what actually brought the commit into ur branch.
- in step 11, the `D` is a **staged deletion**, not a lost file: u are removing it
  from git, and that removal has to be committed like anything else. once it is
  committed the file is untracked, `.gitignore` finally hides it, and `git status`
  goes quiet. `ls -a` proves the file is still on ur disk. and remember: the commit
  u already made still has the password in it. in real life u change the password,
  u do not just untrack the file.
- in step 12, nothing appears in `git status` and nothing appears in `.gitignore`
  either. that rule lives in `.git/info/exclude`, and `.git` is never pushed.

---

[[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|back to the chapter]]
