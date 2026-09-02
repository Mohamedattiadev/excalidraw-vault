---
title: "Chapter 2 — CSS Basics — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/02-css-basics/solutions"
  - "11-Dev-101/HTML-CSS-101/02-css-basics/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/02-css-basics/)

**[▶ open the solution in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?src=%2Fdev-101%2FHTML-CSS-101%2Flive%2F02-css-basics%2Fdemo.html)**

---

```html
<style>
  /* 1, 3, 4, 5, 6 all end up in this one rule */
  button {
    background-color: red;      /* 1 */
    color: white;               /* 1 */
    height: 36px;               /* 3 */
    width: 105px;               /* 3 */
    border-color: green;        /* 5 */
    border-style: dotted;       /* 5 */
    border-width: 3px;          /* 5 */
    border-radius: 5px;         /* 6 */
    cursor: pointer;            /* 6 */
  }

  /* 8 and 9 */
  p {
    color: white;
    background-color: black;
    font-style: italic;
  }
</style>

<!-- 2: no css changed, just more html -->
<button>Subscribe</button>
<button>Join</button>
<button>Share</button>

<p>a paragraph of text</p>
```

output:

![three dotted green bordered red buttons and an italic white on black paragraph](02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/img/sol.png)

output of 7, with `colour: white;` instead of `color: white;`:

![a red button with black text](02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/img/08-typo.png)

- the answer to 2 is **one rule**, and it would still be one rule with 30 buttons. that is
  what the `button` selector means: every button, forever, including the ones u write
  tomorrow.
- in 4 u wrote `border: none;` and in 5 u replaced it with the 3 separate properties. if u
  left both in, the 3 separate ones win because they come after `border: none`, which is
  section 8 doing its job.
- in 5, leaving out `border-style` gives u no border at all, even with the colour and the
  width set. the default style is `none` and a border with no style is nothing.
- in 7, the button is red with **black** text. `background-color` was fine so it applied,
  `colour` is not a property so it was dropped without a word, and the text fell back to the
  default black. nothing else in the rule noticed.
- in 9, the property is `font-style: italic`. searching "css text italic" gets u there.
  searching "css font-style" only works if u already knew the answer, which is the whole
  point of section 9.
- ur black paragraph stretches all the way across the page and ur buttons do not, even
  though u never set a width on the paragraph. that is not a mistake, it is `display`, and
  it is [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].

---

[[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|back to the chapter]]
