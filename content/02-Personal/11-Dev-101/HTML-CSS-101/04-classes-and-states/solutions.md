---
title: "Chapter 4 — Classes and States — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/04-classes-and-states/solutions"
  - "11-Dev-101/HTML-CSS-101/04-classes-and-states/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/04-classes-and-states/)

**[▶ open the solution in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?src=%2Fdev-101%2FHTML-CSS-101%2Flive%2F04-classes-and-states%2Fdemo.html)**

---

```html
<style>
  /* 1 */
  button {
    cursor: pointer;
  }

  /* 3: the shared part */
  .youtube-button {
    height: 36px;
    width: 130px;
    border: none;
    background-color: rgb(230, 230, 230);
  }

  /* 2 and 4: the difference */
  .subscribe-button {
    background-color: red;
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);   /* 9 */
    transition: background-color 0.15s;           /* 8 */
  }

  /* 5 */
  .subscribe-button:hover {
    background-color: darkred;
  }

  /* 6 */
  .subscribe-button:active {
    background-color: black;
  }
</style>

<button class="youtube-button subscribe-button">SUBSCRIBE</button>
<button class="youtube-button">JOIN</button>
<button>SHARE</button>
```

output, sitting still:

![a red subscribe button with a soft shadow, a grey join button, and a default share button](02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/img/sol.png)

output of 7, `opacity` on the whole element:

![three red buttons fading out, the black text fading with them](02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/img/sol-opacity.png)

output of 7 again, the same fade done with `rgba` on the background:

![three red buttons fading out, the black text staying solid](02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/img/sol-rgba.png)

- 5, 6 and 8 have no picture here for the same reason they have none in the chapter: a
  hover, a click and a 150ms fade do not exist in a still image. run them and use ur mouse.
- **7 is the one worth staring at.** the two pictures fade the same red the same amount.
  in the `opacity` one the text goes grey with it, in the `rgba` one the text stays black.
  `opacity` dims the element and everything in it. `rgba` is just a colour that happens to
  be see-through. reach for `rgba` unless u actually want the contents to fade too.
- in 8, moving `transition` onto the `:hover` rule makes the button fade **in** and then
  snap **out**. that is the clearest possible demonstration of why it goes on the normal
  rule: on the way out the mouse has already left, the `:hover` rule no longer applies, and
  the instruction to animate left with it.
- in 4, the order of the 2 names inside `class="youtube-button subscribe-button"` changes
  nothing. swap them and the button is still red. what decides the winner is which rule is
  written later in the css.
- in 11, devtools shows the misspelled line with a strike through it and usually a little
  warning triangle. that is the same silent failure from [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|chapter 2]],
  and this is the tool that makes it loud.
- if ur hover did nothing at all, check that `.subscribe-button:hover` is written **after**
  `.subscribe-button`, and that u have no space before the colon.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|back to the chapter]]
