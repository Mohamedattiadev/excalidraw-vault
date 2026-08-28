---
title: "Chapter 4 — GitHub and Remotes"
aliases:
  - "11-Dev-101/Git-101/04-github-and-remotes"
  - "11-Dev-101/Git-101/04-github-and-remotes/index"
---

**Time to study:** ~90 min
**You will learn:** what a remote really is, the SSH key, `push` `pull` `fetch` `clone`, why a push gets rejected, `.gitignore`, and the `gh` command line tool.

[[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|← Chapter 3]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|next: Chapter 5 →]]

---

## 1. what is github

> github was created in `2008` by Tom Preston-Werner, Chris Wanstrath, PJ Hyett and Scott Chacon, and went live on 10 April 2008.

> it is a code hosting platform for version control and collaboration. think of it as instagram but for code: u post ur projects, u share them with people, and if they like what u did they give ur repo a star.

- and no, github is not the only one. there is `GitLab`, `Bitbucket`, `SourceForge`, self hosted ones like `Gitea`, and even AWS and Google have their own. github is just the most popular by a lot.
- gitlab is the other big one, especially inside companies, because u can self host it for free and it is fully open source. it started in 2011 as an open source alternative to github, and it packs everything in one box (CI/CD, security, issue tracking), where github leans more on third party integrations.

---

## 2. a remote is not github

> before the sign up steps, get this straight, because it is the thing that makes the whole chapter make sense:

> **a remote is just another copy of ur repository that ur repo knows the address of.** that is the entire definition. it is usually on github, but nothing says it has to be.

> example: i have a `~/Attia/work/` directory with a git repo in it. i want a second copy in `~/Attia/work_clone` to experiment in without risking the real one:

```bash
cd ~/Attia/work_clone
git init
git remote add origin ~/Attia/work
```

> that is a real remote. it is a folder on my own laptop, no internet involved, and `push` and `pull` work with it exactly the way they work with github. github is popular, not special.

- `origin` is just a **name** for that address. it is the default name everyone uses for "the main remote", it is not a keyword, and u can call it whatever u want.

---

## 3. connecting ur machine to github

1. go to [github.com](https://github.com) and create an account with ur email, username and password.
2. verify ur email, and u are in.
3. make sure git is installed (`git --version`). if u did [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]] it already is.
4. set ur identity, which we also already did in [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]] and [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]]:

```bash
git config --global user.name "ur name"
git config --global user.email "ur_email@example.com"
```

5. create an `SSH` key. this is the important step:

```bash
ssh-keygen -t ed25519 -C "ur_email@example.com"
```

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/ati/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/ati/.ssh/id_ed25519
Your public key has been saved in /home/ati/.ssh/id_ed25519.pub
```

> press Enter 3 times to accept the defaults. what is an SSH key? it is how github knows this laptop is yours. think of it like this: ur account is a **house**, ur laptop wants to get in, and the SSH key is the key that proves it is allowed. u keep the private half (`id_ed25519`) and u never show it to anyone. u give github the public half (`id_ed25519.pub`).

6. copy the **public** key:

```bash
cat ~/.ssh/id_ed25519.pub
```

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ur_email@example.com
```

7. go to `GitHub → Settings → SSH and GPG keys → New SSH key`, paste it, save.

8. check that it worked:

```bash
ssh -T git@github.com
```

```
Hi Mohamedattiadev! You've successfully authenticated, but GitHub does not provide shell access.
```

> that sentence looks like an error and it is not. "does not provide shell access" is normal, u are not supposed to get a terminal on github's servers. the part that matters is **Hi \<ur name\>**.

---

## 4. pushing ur project up

> from [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]] we have: untracked → `add` → staged → `commit` → local repo. `push` is the step after that:

```
   Local Repo                    Remote Repo
   ┌──────────────┐              ┌──────────────┐
   │  Readme.md   │───push──────►│  Readme.md   │
   │  (committed) │              │  (remote)    │
   └──────────────┘              │    GITHUB    │
                                 └──────────────┘
```

> to push, u first need a remote to push to. so:

1. on github, click **New repository**, give it a name.
2. choose `public` (anyone can see it) or `private` (only u and who u invite).
3. **do not tick "add a README"** for now. an empty repo is easier for ur first push.
4. github shows u 2 addresses:

```text
https://github.com/username/repo-name.git      <- the https one
git@github.com:username/repo-name.git          <- the ssh one
```

> use the **ssh** one, that is what the key we just made is for.

5. back in ur terminal, inside ur project:

```bash
git remote add origin git@github.com:username/repo-name.git
git remote -v
```

```
origin	git@github.com:username/repo-name.git (fetch)
origin	git@github.com:username/repo-name.git (push)
```

6. and push:

```bash
git push -u origin main
```

```
To git@github.com:username/repo-name.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

> refresh the github page and ur files are there.

- what is the `-u`? it links ur local `main` to `origin/main` once, so that from then on plain `git push` and plain `git pull` know where to go. u only need it the first time.

```bash
git push        # from now on, this is enough
```

- if u forget the remote entirely, git tells u exactly this:

```bash
git push
```

```
fatal: No configured push destination.
Either specify the URL from the command-line or configure a remote repository using

    git remote add <name> <url>
```

- and if u typed the url wrong, u do not start over, u fix it:

```bash
git remote set-url origin git@github.com:username/the-right-name.git
git remote -v          # check it
```

- to see the remote branch in ur status, `git status` now says something new:

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

---

## 5. `clone`, `fetch` and `pull`

> **clone** takes a repo that exists somewhere and makes a full copy on ur machine, history and all:

```bash
git clone git@github.com:username/repo-name.git
```

```
Cloning into 'repo-name'...
done.
```

```bash
# or put it where u want, with the name u want
git clone git@github.com:username/repo-name.git ~/Desktop/my-copy
```

> u do not run `git init` after a clone. the clone **is** the repo, and `origin` is already set for u:

```bash
cd repo-name
git remote -v
```

```
origin	git@github.com:username/repo-name.git (fetch)
origin	git@github.com:username/repo-name.git (push)
```

> **fetch** downloads what is new on the remote but does **not** touch ur files:

```bash
git fetch
```

```
From github.com:username/repo-name
   47200d3..1893de3  main       -> origin/main
```

```bash
git status
```

```
On branch main
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)
```

> **pull** is fetch **plus** merging it into ur branch. it is the one u will use:

```bash
git pull
```

```
Updating 1893de3..cdfc65d
Fast-forward
 Readme.md | 1 +
 1 file changed, 1 insertion(+)
```

- so the rule: `fetch` = "show me what happened, do not touch my work". `pull` = "and put it into my branch now".

---

## 6. the rejected push, and why it happens

> this is the first github error that will scare u, so let's cause it on purpose. someone else pushed (or u pushed from another laptop), and then u push:

```bash
git push
```

```
To github.com:username/repo-name.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:username/repo-name.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
```

> git is protecting u. the remote has a commit u have never seen, and pushing would throw it away. so:

```bash
git pull        # bring their work into yours
git push        # now u are on top of it, and it works
```

> if u both edited the same lines, the `pull` gives u a **conflict**. that is not a disaster and it is the whole of [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]], section 6.

- **never fix a rejected push with `git push --force`.** force means "delete whatever is on the remote and put mine there instead", and what u delete is someone else's work. there is a safer version, `--force-with-lease`, and the one time u will legitimately need it is after rewriting ur own history in [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]].

---

## 7. `.gitignore`, the files u keep out

> u will notice that when u run a real project u get a `node_modules` folder with thousands of files in it, or a `venv`, or a `build` folder. that stuff does not belong in git: it is huge, it is generated from ur code anyway, and everyone who clones ur repo regenerates it with one command.

> and worse than huge, some files are **secret**. a `.env` with ur database password does not belong on github, ever.

> so u make a file called `.gitignore` and list what git should pretend it cannot see:

```bash
git status -s
```

```
?? .env
?? debug.log
?? node_modules/
?? src/
```

```bash
cat > .gitignore <<'END'
node_modules/
*.log
.env
END
git status -s
```

```
?? .gitignore
?? src/
```

> the noise is gone. `node_modules/`, `debug.log` and `.env` are still on disk, git just stopped offering them to u.

> the patterns u need:

```
node_modules/     a folder and everything in it (the trailing / means folder)
*.log             ANY file ending in .log, anywhere
.env              this exact name
build/            the build output
*.zip             every zip
!important.log    an EXCEPTION: ignore all .log, but keep this one
```

- `*.thing` is the one u will use most: the `*` means "anything", so `*.log` catches `debug.log`, `error.log` and `whatever.log` in one line.
- when u cannot work out **why** a file is being ignored, ask git, it tells u the exact file and line number of the rule:

```bash
git check-ignore -v node_modules/a.js debug.log .env
```

```
.gitignore:1:node_modules/	node_modules/a.js
.gitignore:2:*.log	debug.log
.gitignore:3:.env	.env
```

> and u commit the `.gitignore` itself, so everyone who clones the project ignores the same things.

### the trap: ignoring does not untrack

> `.gitignore` only works on files git is **not already tracking**. if u committed `.env` last week and add it to `.gitignore` today, git keeps tracking it and keeps showing ur password to everyone:

```bash
git status -s
```

```
 M .env      <- still tracked, .gitignore did nothing
```

> u have to tell git to stop tracking it, **without deleting ur file**:

```bash
git rm --cached .env
```

```
rm '.env'
```

```bash
git status -s
```

```
D  .env
```

> read that `D`. it is a **staged deletion**: u told git to stop tracking the file, and that removal is now waiting to be committed like any other change. so commit it:

```bash
git commit -m "stop tracking .env"
git status -s
```

```
(nothing)
```

> and nothing is exactly right. the file is still sitting on ur disk, git is no longer tracking it, and `.gitignore` is now free to hide it:

```bash
ls -a
```

```
.  ..  .env  .git  .gitignore  node_modules  src
```

> `--cached` is the whole trick: "remove it from git, leave it on my disk". without that flag, `git rm` deletes the actual file.

- and a warning that matters: this stops it from now on, it does **not** remove it from the commits u already pushed. if a real password was in there, change the password. that is the only real fix.

### a `.gitignore` per folder

> u can put a `.gitignore` in any folder, not only the root:

```
my-project/
├── .gitignore          <- rules for the whole repo
└── src/
    └── .gitignore      <- extra rules, only for src/ and under it
```

> the root one applies everywhere. the one inside `src/` adds rules that only exist inside `src/`. git checks both:

```bash
git check-ignore -v src/app.js
```

```
src/.gitignore:1:*.js	src/app.js
```

### `.git/info/exclude`, the one that is only urs

> this one i really like. `.gitignore` is committed, so its rules apply to **everyone**. sometimes u want to ignore something that is only ur business: ur own scratch file, ur editor's junk, a personal `todo.md`.

> putting that in `.gitignore` means pushing ur personal habits into everyone else's repo. so instead, u write it in a file that is inside `.git` and therefore never leaves ur machine:

```bash
echo "my-scratch.md" >> .git/info/exclude
```

```bash
git check-ignore -v my-scratch.md
```

```
.git/info/exclude:7:my-scratch.md	my-scratch.md
```

> same behaviour, invisible to everyone else. u never have to explain to ur team why `ati-notes.md` is in their ignore file.

```
.gitignore            -> committed, applies to everyone who clones
.git/info/exclude     -> local, only u, never pushed
```

---

## 8. pull requests, the short version

> u pushed to ur own repo, so u pushed straight to `main`. on any project with more than one person, u do not do that. u push a **branch**, and then u open a **pull request**: "here is my work, please look at it and merge it".

```
u make a branch  ->  push the branch  ->  open a PR  ->  someone reviews it
                                                              ↓
                                                      they merge it into main
```

> the shape of it, with the branch commands from [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]:

```bash
git switch -c feat/dark-theme      # a branch for this one job
# ... work, add, commit ...
git push -u origin feat/dark-theme
```

```
remote:
remote: Create a pull request for 'feat/dark-theme' on GitHub by visiting:
remote:      https://github.com/username/repo-name/pull/new/feat/dark-theme
remote:
To github.com:username/repo-name.git
 * [new branch]      feat/dark-theme -> feat/dark-theme
```

> github prints the link in ur terminal. open it, write what u changed and why, and create the PR.

> a PR is 3 things at once: a diff people can read, a place to discuss it line by line, and the button that merges it. that is why teams work this way instead of everyone pushing to `main` at the same time.

- doing this on **someone else's** project needs one extra step first, called a fork, and that is the whole of [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|Chapter 9]], together with how to write a PR that actually gets accepted.

---

## 9. `gh`, github from ur terminal

> `gh` is github's own command line tool, and it is genuinely easier than the website for the things u do 20 times a day. install it (`sudo pacman -S github-cli`, `sudo apt install gh`, `brew install gh`), then log in once:

```bash
gh auth login
```

> it asks u 4 questions (github.com, SSH, use ur key, log in with a browser) and it opens ur browser with a code. after that:

```bash
gh auth status
```

```
github.com
  ✓ Logged in to github.com account Mohamedattiadev
  - Active account: true
  - Git operations protocol: https
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

> now the things u actually want:

```bash
# create a repo FROM the folder u are standing in, and push it, in one command
gh repo create my-project --public --source=. --push

# clone without typing the full url
gh repo clone Mohamedattiadev/dev-101

# open the current repo's page in ur browser
gh repo view --web

# open a pull request from the branch u are on, and fill it in interactively
gh pr create

# see the PRs waiting, and check one out locally to test it
gh pr list
gh pr checkout 42

# the issues
gh issue list
gh issue create
```

- `gh repo create --source=. --push` replaces the whole of section 4: no clicking on the website, no copying the url, no `git remote add`. it makes the repo, adds the remote and pushes.
- `gh` is a convenience on top of git, not a replacement. every one of those commands is something u can do without it, and u should know how, which is why it comes at the end of the chapter and not the start.

---

## NOTES

1. **https vs ssh.** the https url asks for a token every time (github stopped accepting passwords in 2021). the ssh one uses the key u made and never asks. use ssh.

2. **`origin` is a name u chose.** u can have more than one remote, and u will in [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|Chapter 9]], where `origin` is ur fork and `upstream` is the original project:

```bash
git remote add upstream git@github.com:someone-else/the-project.git
git remote -v
```

3. **`git remote remove origin`** deletes the link. it does not touch ur commits or the remote repo, it only forgets the address.

4. **a repo with no commits cannot be pushed.** `git push` on an empty repo pushes nothing and looks broken. commit first.

5. **README.md is not a git feature.** github just renders the file called `README.md` on the repo's front page. that is the whole trick, and it is why every project has one.

---

## Assignment

1. Make an SSH key if u do not have one, and prove github recognises u with it.
2. Create a repo on github, empty, and connect ur `practice-git` folder from Chapter 1 to it.
3. Show the remote address ur repo is now pointing at.
4. Push ur `main` branch, and set it up so that plain `git push` works from then on.
5. Change the remote url to something wrong, check it, then set it back.
6. Clone ur own repo into a different folder under a different name.
7. In the clone, make a commit and push it. Then, in the original folder, run `git fetch` and read what `git status` says.
8. Pull it in properly.
9. Create a `.env` file with a fake password in it, and a `node_modules` folder with a junk file. Make git ignore both of them.
10. Prove which line of which file is doing the ignoring.
11. Commit `.env` **by accident** (`git add -f .env`), then stop tracking it without deleting the file.
12. Ignore a personal scratch file in a way that is not visible to anyone who clones ur repo.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/solutions\|the solutions are here]]

---

[[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|← Chapter 3]] | [[02-Personal/11-Dev-101/Git-101/index\|back to Git 101]] | [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|next: Chapter 5 →]]
