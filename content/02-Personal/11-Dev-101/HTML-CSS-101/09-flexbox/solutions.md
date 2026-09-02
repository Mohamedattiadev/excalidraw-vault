---
title: "Chapter 9 — Flexbox — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/09-flexbox/solutions"
  - "11-Dev-101/HTML-CSS-101/09-flexbox/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/09-flexbox/)

**[▶ open the solution in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?src=%2Fdev-101%2FHTML-CSS-101%2Flive%2F09-flexbox%2Fdemo.html)**

---

```css
/* styles.css */

/* 1 */
.flexbox { display: flex; }

/* 2 */
.flexbox { display: flex; justify-content: center; }
.flexbox { display: flex; justify-content: space-between; }

/* 3 */
.tall { height: 110px; }
.flexbox { display: flex; align-items: center; }

/* 4 */
.middle { flex: 1; }

/* 5 */
.a { width: 100px; }
.b { flex: 1; }
.c { flex: 2; }

/* 6 and 7 */
.flexbox { display: flex; width: 340px; }
.icon {
  width: 60px;
  height: 60px;
  flex-shrink: 0;   /* 7 */
}

/* 8, 9, 10 */
.flexbox {
  display: flex;
  flex-direction: column;
  height: 220px;
  justify-content: space-between;   /* 9 */
}
.flexbox { align-items: center; }   /* 10 */

/* 11 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
}
.header-left,
.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.search-container {
  display: flex;
  flex: 1;
  max-width: 300px;
}
.search-bar { flex: 1; width: 0; }

/* 12 */
.cards { display: flex; gap: 15px; }
.card { flex: 1; padding: 8px; border: 1px solid rgb(60, 120, 180); }
```

output of 11:

![a header bar with a menu and logo on the left, a search box in the middle, and two buttons on the right](02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/img/13-nested.png)

output of 12:

![three cards of equal width, all the same height even though the middle one has more text](02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/img/sol-cards.png)

- in 6, measure the square in devtools and it is about **44px**, not 60. u wrote 60 and u got
  44. nothing is broken: shrinking is on by default, and a `width` is only a starting
  suggestion in a flexbox. that sentence took me far too long to accept.
- in 10, u used `align-items: center` here and `justify-content: center` in task 2, and both
  of them centred things. the container went from a row to a column in between, so the two
  words swapped jobs. that is section 8, and it is the whole difficulty of flexbox.
- in 9, if the boxes did not spread out, ur container has no `height`. a column is only as
  tall as its contents unless u say otherwise, so there is no spare space to spread into.
- in 11, if the search box pushes the right hand group off the screen when u narrow the
  window, u are missing `flex-shrink: 0` on the groups. if the search box refuses to get
  smaller, u are missing `width: 0` on the input.
- **12 is a judgement call and both answers are right.** flexbox with `flex: 1` gives u equal
  columns and equal heights, same as the grid version, in 2 rules instead of 2. but add a
  4th and 5th card and the flexbox version squeezes them all onto one line while the grid
  version wraps onto a second row. so: fixed number of things, flexbox. unknown number of
  things, grid. that is why the video page in
  [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|chapter 12]] is a grid and its header is a flexbox.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|back to the chapter]]
