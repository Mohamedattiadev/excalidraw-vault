---
title: "Git 101 Cheat Sheet"
aliases:
  - "11-Dev-101/Git-101/CHEATSHEET"
  - "11-Dev-101/Git-101/CHEATSHEET/index"
---

Every command in the course, on one page. This is the page to open in 6 months when u forget something.

If a line here does not make sense, the chapter link next to it is where it was explained.

[[02-Personal/11-Dev-101/Git-101/index\|← back to Git 101]]

---

## Starting a repo · [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]]

```bash
git --version           # is it installed
git init                # turn this folder into a repo
git status              # WHERE AM I. type this all the time
git status -s           # the short version
```

## The daily loop · [[02-Personal/11-Dev-101/Git-101/01-git-basics/index\|Chapter 1]]

```bash
git add file.txt        # stage one file
git add .               # stage everything under here
git commit -m "msg"     # save the staged files
git commit -am "msg"    # stage tracked files AND commit, in one
git commit              # opens ur editor for the message
git log --oneline       # what have i done
```

## Config · [[02-Personal/11-Dev-101/Git-101/02-git-config/index\|Chapter 2]]

```bash
git config --global user.name "name"     # me, on this machine
git config --global user.email "mail"
git config --local user.email "mail"     # this project only. local WINS
git config --list                        # everything git can see
git config --list --show-origin          # ...and which file it came from
git config user.email                    # what will this repo actually use
git config --global init.defaultBranch main
git config --global core.editor "nano"
git config --global rerere.enabled true
git config --global alias.st "status -s" # make ur own command
```

## Looking inside · [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]

```bash
git cat-file -p <hash>  # print any object: commit, tree or blob
git cat-file -t <hash>  # what type is it
git hash-object file    # what would this content's id be
git show                # the last commit, with its diff
git show HEAD~1         # the one before it
```

## Reading history · [[02-Personal/11-Dev-101/Git-101/03-git-objects/index\|Chapter 3]]

```bash
git log                             # the full thing
git log --oneline                   # one line each
git log --oneline --graph --all     # with the branches drawn
git log -n 5                        # last 5
git log --stat                      # which files changed
git log -p                          # with the full diff
git log --author="ati"
git log --since="2 weeks ago"
git log -- file.txt                 # only commits touching this file
```

## Remotes and github · [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]]

```bash
ssh-keygen -t ed25519 -C "mail"     # make a key
cat ~/.ssh/id_ed25519.pub           # the PUBLIC half, paste on github
ssh -T git@github.com               # did it work

git remote -v                       # what am i connected to
git remote add origin <url>
git remote set-url origin <url>     # fix a wrong url
git remote remove origin

git push -u origin main             # first push, links the branch
git push                            # every push after that
git fetch                           # get their commits, touch nothing
git pull                            # fetch AND merge into my branch
git pull --rebase                   # fetch AND rebase mine on top
git clone <url>                     # copy a repo down
git clone <url> my-folder
```

## Ignoring files · [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]]

```bash
node_modules/       # a folder and everything in it
*.log               # anything ending in .log
.env                # this exact file
!important.log      # ...except this one
```

```bash
git check-ignore -v file            # WHICH rule is ignoring this
git rm --cached file                # stop tracking, keep it on disk
echo "scratch.md" >> .git/info/exclude   # ignore it just for ME
```

## Branches · [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]

```bash
git branch                  # which branches, and where am i
git branch -v               # ...and which commit each one is on
git branch -m main          # rename this branch
git switch -c feat/thing    # create it and go there
git checkout -b feat/thing  # the same thing, older command
git switch main             # move between them
git switch -                # back to the previous one
git branch -d feat/thing    # delete it (safe)
git branch -D feat/thing    # delete it anyway
git push origin --delete feat/thing      # delete it on github
```

## Merging and conflicts · [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]

```bash
git switch main             # the branch that RECEIVES it
git merge feat/thing
git merge --abort           # put everything back, nothing happened

# in a conflict:
git status                  # which files
# edit them, delete <<<<<<< ======= >>>>>>>
git add file
git commit

git checkout --ours file    # keep MY side (the branch i am on)
git checkout --theirs file  # keep THEIR side (the one coming in)
git diff --name-only --diff-filter=U     # what is still conflicted
```

## Worktrees · [[02-Personal/11-Dev-101/Git-101/05-branches-and-merging/index\|Chapter 5]]

```bash
git worktree add ../folder main       # same repo, second folder
git worktree add -b hotfix ../folder  # ...on a new branch
git worktree list
git worktree remove ../folder
```

## Rebase and squash · [[02-Personal/11-Dev-101/Git-101/06-rebase-and-squash/index\|Chapter 6]]

```bash
git rebase main             # replay MY commits on top of main
git rebase --continue       # after fixing a conflict
git rebase --abort          # put everything back
git rebase --skip           # drop the commit it is stuck on

git rebase -i HEAD~3        # the to-do list: pick / squash / fixup / reword / drop
git push --force-with-lease # after rewriting a branch that is MINE
```

## Undoing · [[02-Personal/11-Dev-101/Git-101/07-undoing-things/index\|Chapter 7]]

```bash
git diff                    # not staged yet
git diff --staged           # what i am about to commit
git diff HEAD               # everything since the last commit
git diff --stat             # just the summary
git diff main feat/thing    # 2 branches

git restore file            # throw the change away (NO undo)
git restore --staged file   # unstage it, keep the change

git reset --soft HEAD~1     # undo the commit, keep it staged
git reset HEAD~1            # undo the commit, keep it on disk
git reset --hard HEAD~1     # undo the commit and DELETE the changes

git commit --amend -m "msg" # replace the last commit
git commit --amend --no-edit

git revert <hash>           # a NEW commit that undoes an old one
git reflog                  # everywhere HEAD has been. the safety net
git reset --hard HEAD@{1}   # go back to before the mistake

git rm --cached file        # untrack it, keep it
git clean -n                # what untracked junk is here
git clean -fd               # delete it (NO undo)
```

## Stash · [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Chapter 8]]

```bash
git stash                   # put my changes aside
git stash -u                # ...including untracked files
git stash push -m "name"    # with a name u will recognise
git stash list
git stash pop               # bring back the top one and DELETE it
git stash pop stash@{2}     # bring back a specific one
git stash apply stash@{0}   # bring it back and KEEP it in the list
git stash show -p stash@{0} # what is in it
git stash drop stash@{1}
git stash clear             # all of them, gone
git stash branch new-branch # turn a stash into a branch
```

## Cherry-pick · [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Chapter 8]]

```bash
git cherry-pick <hash>      # copy THAT commit onto this branch
git cherry-pick a^..b       # a range
git cherry-pick --continue
git cherry-pick --abort
```

## Bisect · [[02-Personal/11-Dev-101/Git-101/08-stash-cherrypick-bisect/index\|Chapter 8]]

```bash
git bisect start
git bisect bad              # now is broken
git bisect good <hash>      # this old one was fine
# test what git checks out, then say:
git bisect good             # or: git bisect bad
git bisect skip             # cannot test this one
git bisect reset            # ALWAYS do this at the end

git bisect start HEAD <good-hash>
git bisect run npm test     # let git find it on its own
```

## Forks and PRs · [[02-Personal/11-Dev-101/Git-101/09-forks-and-pull-requests/index\|Chapter 9]]

```bash
git remote add upstream <original-url>   # origin = my fork, upstream = theirs
git fetch upstream
git merge upstream/main     # keep my fork up to date
git push origin main

git switch -c fix/the-thing
git push -u origin fix/the-thing
git diff main...HEAD        # read ur own PR before u open it
```

## Tags and releases · [[02-Personal/11-Dev-101/Git-101/10-tags-and-license/index\|Chapter 10]]

```bash
git tag                     # list them
git tag v1.0.0              # tag the commit i am on
git tag v0.1.0 <hash>       # tag an older commit
git tag -a v1.1.0 -m "msg"  # annotated: use this for real releases
git show v1.0.0
git tag -d v1.0.0
git push origin v1.0.0      # tags are NOT pushed by default
git push --tags
git describe --tags         # where am i, relative to the last tag
```

```
v1.2.3
 │ │ └── PATCH  bug fix
 │ └──── MINOR  new feature, old code still works
 └────── MAJOR  breaking change
```

## The `gh` cli · [[02-Personal/11-Dev-101/Git-101/04-github-and-remotes/index\|Chapter 4]]

```bash
gh auth login
gh auth status
gh repo create name --public --source=. --push
gh repo clone owner/name
gh repo view --web
gh repo sync                # update my fork
gh pr create
gh pr list
gh pr checkout 42
gh issue list
gh issue create
```

---

## The 5 things worth memorising

```bash
git status                  # always. before and after everything
git log --oneline --graph --all      # what does my history look like
git reflog                  # i broke it. where was i before
<anything> --abort          # merge, rebase, cherry-pick. undo the mess
git commit                  # often. small. a commit that exists can be found again
```

---

[[02-Personal/11-Dev-101/Git-101/index\|← back to Git 101]]
