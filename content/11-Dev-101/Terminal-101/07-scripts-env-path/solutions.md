---
title: "Chapter 7 — Scripts, Environment Variables and PATH — Solutions"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[11-Dev-101/Terminal-101/07-scripts-env-path/index\|back to the chapter]]

---

```bash
# 1
city="Istanbul"
echo $city
# open a new terminal, then :
echo $city      # prints nothing, the variable was local to the old terminal

# 2
export city="Istanbul"
echo $city

# 3
which grep

# 4
echo $PATH

# 5
echo 'echo "i am $USER and i live in $city"' > whoami.sh

# 6
bash whoami.sh
# now add the shebang as the first line, then :
chmod u+x whoami.sh
./whoami.sh

# 7
echo 'alias ll="ls -la"' >> ~/.bashrc
source ~/.bashrc
ll
```

`whoami.sh` after step 6 should look like this:

```bash
#!/bin/bash
echo "i am $USER and i live in $city"
```

output of 3:

```
/usr/bin/grep
```

output of 6:

```
i am ati and i live in Istanbul
```

- in step 5 the outer quotes are single `'` on purpose. with double quotes the `$USER` and `$city` would be replaced **before** the file is written, and u would end up with the values baked in instead of the variable names.
- in step 7 notice `>>` and not `>`. with `>` u would erase ur whole `.bashrc` file.

---

[[11-Dev-101/Terminal-101/07-scripts-env-path/index\|back to the chapter]]
