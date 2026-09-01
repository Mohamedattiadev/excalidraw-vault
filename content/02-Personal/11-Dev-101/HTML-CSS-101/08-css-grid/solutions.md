---
title: "Chapter 8 — CSS Grid — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/08-css-grid/solutions"
  - "11-Dev-101/HTML-CSS-101/08-css-grid/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/08-css-grid/)

---

```css
/* styles.css */

/* 1 */
.grid { display: grid; grid-template-columns: 100px 100px; }

/* 3 */
.grid { column-gap: 20px; row-gap: 40px; }

/* 4 */
.grid { grid-template-columns: 1fr 1fr; }

/* 5 */
.grid { grid-template-columns: 1fr 2fr; }

/* 6 */
.grid { grid-template-columns: 80px 1fr; }

/* 7 */
.grid { grid-template-columns: 100px 100px; justify-content: center; }
.grid { grid-template-columns: 100px 100px; justify-content: space-between; }

/* 8 */
.tall { height: 120px; }
.grid { align-items: center; }

/* 9 */
.grid { display: grid; grid-template-columns: 1fr; row-gap: 10px; }

/* 10 and 11: the rebuilt chapter 7 cards */
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 15px;
  row-gap: 15px;
}
.card {
  border: 1px solid rgb(60, 120, 180);
  padding: 8px;
}
```

`index.html`, and notice there is nothing clever in it:

```html
<div class="cards">
  <div class="card">
    <p class="title">first card</p>
    <p>a line</p>
    <p>another line</p>
  </div>
  <div class="card">...</div>
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

output of 11, with a 4th card added and no css touched:

![three cards on the first row all the same height, and a fourth card on a second row](02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/img/sol.png)

- in 2, u got **3 rows** and u never wrote a row rule. that is grid deciding for itself.
- in 4, the `1fr` version keeps filling the container as u drag the window and the `100px`
  version does not move at all. that is the whole difference between the two units.
- in 7, if `justify-content` appeared to do nothing, ur columns were still `1fr`. `fr`
  columns eat all the space, so there is none left to justify. put them back to `100px`.
- **in 11, look at the first row.** all 3 cards are the same height even though the middle
  one has more text. u did not write a height. that is the default `align-items: stretch`
  doing the thing u used to fake with `vertical-align: top`, and doing it better.
- also in 11: no `vertical-align`, no `margin-right`, and the closing and opening tags do
  not have to be jammed together any more. grid ignores whitespace between children. that
  is 3 chapter 7 problems gone in one property.
- in 10, the 6th and 7th boxes just appear on a new row. u will never write layout code that
  counts items again.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|back to the chapter]]
