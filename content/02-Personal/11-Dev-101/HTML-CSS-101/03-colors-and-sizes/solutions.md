---
title: "Chapter 3 — Colors and Sizes — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/03-colors-and-sizes/solutions"
  - "11-Dev-101/HTML-CSS-101/03-colors-and-sizes/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/03-colors-and-sizes/)

---

```css
/* 1: all 3 of these are the same red */
button { background-color: red; }
button { background-color: rgb(255, 0, 0); }
button { background-color: #FF0000; }

/* 2: whatever ur picker gave u. mine was crimson */
button { background-color: rgb(220, 20, 60); }

/* 3: the same colour in hex */
button { background-color: #DC143C; }

/* 4 */
body {
  background-color: rgb(0, 150, 255);
}
p {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  width: 220px;
}

/* 5 */
p { background-color: rgba(0, 0, 0, 0.15); }

/* 6 */
p { width: 300px; }

/* 7 */
p { width: 50%; }

/* 8 */
p { font-size: 20px; width: 10em; }    /* comes out 200px */
p { font-size: 20px; width: 10rem; }   /* comes out 160px */
```

output of 2, the colour i picked:

![a crimson button](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/sol-crimson.png)

output of 3, the same colour written in hex:

![an identical crimson button](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/sol-crimson.png)

output of 4:

![half see-through black on blue](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/07-alpha-0.5.png)

output of 5:

![barely visible black on blue](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/07-alpha-0.15.png)

output of 6:

![a 300px wide black bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/sol-300px.png)

output of 8, `10em` then `10rem`:

![a 200px wide bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/10-em.png)

![a 160px wide bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/11-rem.png)

- in 1 and 3 the same picture is shown twice on purpose, and it is genuinely the same
  file. i rendered `rgb(220, 20, 60)` and `#DC143C` separately and compared them, and
  there are zero differing pixels. hex is not a different colour system, it is rgb
  written shorter.
- in 5, the paragraph almost disappears. `0.15` is a very faint colour, and that is the
  range u actually want for shadows and hover states, not `0.5`.
- in 7, the bar changes width as u drag the window and the one in 6 does not. that is
  the whole difference between `px` and `%` in one move.
- in 8, `10em` is 200px because `em` multiplies **this element's** font size, which u
  set to 20px. `10rem` is 160px because `rem` multiplies the **page's** font size, which
  is 16px and which u never touched. if u got 200px both times, check that ur `rem` line
  actually replaced the `em` line instead of sitting above it, because
  [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|chapter 2 section 8]] says the last one wins.
- if ur 50% bar is not exactly half the window, it is not wrong. the `<body>` has 8px of
  default margin on each side, so 50% is half of what is left after that.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|back to the chapter]]
