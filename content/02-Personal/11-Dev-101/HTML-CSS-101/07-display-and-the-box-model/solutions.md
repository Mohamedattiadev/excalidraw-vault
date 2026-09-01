---
title: "Chapter 7 — Display and the Box Model — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/solutions"
  - "11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/07-display-and-the-box-model/)

---

```css
/* styles.css */

/* 1 */
.box {
  background-color: rgb(255, 220, 130);
  width: 200px;
  margin: 30px;
  padding: 25px;
  border: 6px solid rgb(200, 60, 60);
}

/* 3 and 4 */
.side-by-side {
  display: inline-block;
  width: 120px;
  margin-right: 30px;
}
.pulled { margin-left: -40px; }

/* 5: these 3 are all legal, they just say different things */
.a { padding: 20px; }
.b { padding: 10px 40px; }
.c { padding: 5px 10px 30px 60px; }

/* 6 */
body { margin: 0; }
p { margin-top: 0; margin-bottom: 0; }

/* 9 and 10 */
.group {
  display: inline-block;
  vertical-align: top;      /* 10 */
  width: 190px;
  border: 1px solid rgb(160, 160, 160);
  padding: 10px;
  margin-right: 10px;
}

/* 13 */
.card {
  display: inline-block;
  vertical-align: top;
  width: 150px;
  margin-right: 10px;
  padding: 8px;
  border: 1px solid rgb(60, 120, 180);
}

/* 14 */
.centred {
  width: 300px;
  margin: 0 auto;
}
```

output of 9, 10 and 13 on one page:

![two panels side by side aligned at the top, and three cards under them](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/sol.png)

output of 14:

![a box sitting in the middle of the page](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/sol-centred.png)

output of 15:

![a green box from the stylesheet and a red one from an inline style](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/sol-inline-wins.png)

- in 2, **padding gets the background colour and margin does not.** the coloured area of the
  element runs out to the border and stops. that one picture is the difference between the
  two properties and it is worth more than any definition.
- in 8, nothing happened because `width` and `height` do not apply to an inline element.
  change it to `display: inline-block` and the same line starts working. this is the single
  most common "css is broken" moment and it is never css.
- in 10, without `vertical-align: top` the short panel drops down so its text baseline lines
  up with the tall one's. with it, they both start at the top. compare it against
  [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|section 10]] where i left it out on purpose.
- **if ur boxes in 3 have a gap u did not ask for**, that is note 2. the newline between the
  two tags is a space. it is not ur margin being wrong.
- in 14, `margin: 0 auto` only centres an element that has a `width`. with no width the
  element is already as wide as the page and there is nothing left over to share out.
- in 15, red wins. an inline `style="..."` beats anything in a stylesheet, and the only way
  to beat it back is `!important`, which u should treat as a thing that exists rather than a
  thing u use.
- in 1, the devtools box model panel is at the bottom of the Styles tab. it will say
  `30` all the way round the outside, `6` on the border ring, `25` inside that, and `200`
  in the middle. those are the 5 numbers u typed, drawn back at u.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|back to the chapter]]
