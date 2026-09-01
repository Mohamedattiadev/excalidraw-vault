---
title: "Chapter 7 — Display and the Box Model"
aliases:
  - "11-Dev-101/HTML-CSS-101/07-display-and-the-box-model"
  - "11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index"
---

**Time to study:** ~90 min
**You will learn:** how every element is really a box with 4 layers, how to put space between things, and the one technique that most page layouts are built out of.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-8FBEEA?style=for-the-badge&labelColor=0C0F16)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=07-display)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-2A3342?style=for-the-badge&labelColor=0C0F16)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/07-display-and-the-box-model/)

[[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|next: Chapter 8 →]]

---

> here the page stops being a list of things and starts being a layout. everything before was "what does this element look like". this is "where is it, and how far from the thing next to it".
>
> it is the longest chapter in the course. take it in two sittings: sections 1 to 6 are spacing, 7 to 12 are arrangement.

---

## 1. the box model

> every element on a page is a rectangle, even the ones that do not look like one. and that rectangle has 4 layers, from the inside out:

```
+-------------------------------- margin ---------------------------------+
|                                                                         |
|   +============================ border ==========================+      |
|   |                                                              |      |
|   |   +---------------------- padding ---------------------+     |      |
|   |   |                                                    |     |      |
|   |   |                   the content                      |     |      |
|   |   |                                                    |     |      |
|   |   +----------------------------------------------------+     |      |
|   |                                                              |      |
|   +==============================================================+      |
|                                                                         |
+-------------------------------------------------------------------------+
```

here is that drawn by a real browser. blue is the page, the yellow is the element, the red ring is its border:

```css
/* styles.css */
body { background-color: rgb(215, 235, 255); }
.box {
  background-color: rgb(255, 220, 130);
  width: 200px;
  margin: 30px;
  padding: 25px;
  border: 6px solid rgb(200, 60, 60);
}
```

```html
<!-- index.html -->
<div class="box">the content</div>
```

![a yellow box with a red border, sitting away from the edges of a blue page](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/01-box-model.png)

- **margin** is the blue gap outside the border. it pushes other things away.
- **border** is the red ring.
- **padding** is the yellow space inside, between the border and the words.
- **padding gets the element's background colour, margin does not.** the yellow runs up to the red ring and outside it is blue. that is how u tell them apart on screen when something is wrong.
- these two answer nearly every "how do i move this a bit" question u will have.

---

## 2. `margin`, space on the outside

> 3 boxes with nothing between them:

![three boxes touching each other](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/02-no-margin.png)

> and the same 3 with a margin on the right of each:

```css
/* styles.css */
.box {
  width: 120px;
  display: inline-block;
  margin-right: 30px;
}
```

![the same three boxes with gaps between them](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/03-margin-right.png)

- 4 properties: `margin-top`, `margin-right`, `margin-bottom`, `margin-left`.
- margin **pushes other elements away**. it does not make the element bigger.
- a **negative** margin pulls instead:

```css
.pulled { margin-left: -40px; }
```

![the second box overlapping the first](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/04-margin-negative.png)

- the pink box has climbed 40px onto the yellow one. a real tool, and also how u accidentally hide things under other things.

---

## 3. `padding`, space on the inside

```css
/* styles.css */
.plain  { background-color: rgb(255, 220, 130); display: inline-block; }
.padded { background-color: rgb(255, 220, 130); display: inline-block; padding: 20px; }
```

![a tight box next to a roomy one, both the same colour](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/05-padding.png)

- same 4 properties: `padding-top`, `padding-right`, `padding-bottom`, `padding-left`.
- padding makes the element **bigger**. the coloured area grew, because padding is inside the background.
- **negative padding does not exist.** silently ignored, chapter 2 style. to pull something in, use a negative margin.
- the rule of thumb: **padding for space inside a button or a card, margin for space between two of them.**

---

## 4. `border`, and the shorthand

> [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|chapter 2]] did the 3 separate properties. here is the shorthand that writes all 3 on one line:

```css
border: 1px solid red;
/*      └┬┘ └─┬─┘ └┬┘
         │    │    └── colour
         │    └─────── style
         └──────────── width  */
```

- the order does not matter to the browser, but everyone writes width, style, colour.
- `border: none` removes it, which u already used on every button.
- there is a per side version: `border-bottom: 1px solid #e5e7eb` draws a line under a header without boxing it in. ur own [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) uses that on `.header-container`.
- a border **adds to the size**, like padding. a 100px box with a 5px border each side takes 110px. note 4 is the switch that turns that off.

---

## 5. the 1, 2 and 4 value shorthands

> `margin` and `padding` both take a shorthand, and how many values u give it changes what they mean:

```css
padding: 20px;                  /* all 4 sides */
padding: 10px 40px;             /* top and bottom, then left and right */
padding: 5px 10px 30px 60px;    /* top, right, bottom, left. clockwise from the top */
```

![three boxes with the three shorthand paddings applied](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/06-shorthand.png)

- the 4 value version goes **clockwise from the top**: top, right, bottom, left. everyone remembers it as TRouBLe.
- a 3 value version exists and nobody writes it on purpose.
- `margin` works the same way.
- **`margin: 0 auto` centres a block element** in its container, which is what `text-align: center` in [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|chapter 6]] could not do. it only works on an element that has a width.

---

## 6. the reset everyone writes first

> the browser puts margin on things without asking. here are two paragraphs, untouched:

![two paragraphs with a gap between them and a gap around the page](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/07-no-reset.png)

> look at the white strip around the outside. that is `<body>`, which comes with 8px of margin on all 4 sides. and the gap between the two yellow blocks is the default margin on `<p>`.

```css
/* styles.css */
body {
  margin: 0;
}
p {
  margin-top: 0;
  margin-bottom: 0;
}
```

![the same two paragraphs touching each other and the page edges](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/08-reset.png)

- both gaps are gone, and now u put space back **where u want it**.
- this is the first thing in nearly every real stylesheet, including the first 6 lines of ur own `Youtube.html`.
- then u space deliberately: `margin-bottom: 16px` on a title, `4px` on the line under it. that is a decision. the browser's 16px everywhere is not.

---

## 7. `display: block`

> every element already has a `display`. `<p>` and `<div>` are `block`:

```css
/* styles.css */
div {
  display: block;
}
```

![three boxes stacked, each filling the full width](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/09-display-block.png)

- a block element **takes the whole line**, however little is in it.
- it fills the width of its container, which is why the black paragraph in [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|chapter 2]]'s solutions stretched across the page.
- `width` and `height` work on it.
- so **block is how u stack things vertically**, and it needs no css, because it is already the default.

---

## 8. `display: inline-block`

> the same 3 divs with one word changed:

```css
/* styles.css */
div {
  display: inline-block;
}
```

![three small boxes sitting side by side](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/10-display-inline-block.png)

- it **takes only the room it needs**, and the next one sits beside it.
- `width`, `height`, `margin` and `padding` all work. that is the "block" half of the name.
- so **inline-block puts things side by side** with only what u know so far. [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|chapters 8]] and [[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|9]] are the two better ways.

---

## 9. `display: inline`

> the third one is what `<span>`, `<a>` and `<strong>` already are:

```css
/* styles.css */
span {
  display: inline;
  width: 300px;
  height: 200px;
}
```

![a highlighted phrase inside a sentence, no wider than its own words](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/11-display-inline.png)

- the css says 300px and the page says otherwise. **an inline element ignores `width` and `height` completely**, and mostly ignores top and bottom margin too.
- that is the definition, not a bug. an inline element lives **inside a line of text**, and the line decides its own height.
- this is the answer to "why is my width not working", and why that answer is so often "because it is a `<span>`, make it inline-block".

```
block          takes the whole line.        width and height work.
inline-block   takes only what it needs.    width and height work.
inline         flows inside a line of text. width and height are IGNORED.
```

---

## 10. `<div>`, the container

> `<div>` is an element that means nothing and looks like nothing. it is a box u put other things in:

```css
/* styles.css */
.container {
  display: inline-block;
  width: 200px;
  border: 1px solid rgb(160, 160, 160);
  padding: 10px;
  margin-right: 10px;
}
```

```html
<!-- index.html -->
<div class="container">
  <p>Name</p>
  <input type="text">
</div>
<div class="container">
  <p>Quantity</p>
  <div>
    <button>1</button>
    <button>2</button>
  </div>
  <button>Submit</button>
</div>
```

![two bordered panels side by side, each with its own contents](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/12-div-container.png)

- the two panels moved as units. that is what a div buys u: **one handle for a group of things**.
- divs go inside divs, as deep as u need. the second panel has one holding its two number buttons.
- div is block, span is inline. that is the only real difference between them.
- the two panels line up along their **bottoms**, not their tops. that is inline-block sitting on the text baseline. `vertical-align: top` is the fix, in note 1.

---

## 11. the nested layouts technique

> this is the idea the whole reference pdf builds towards, and it is simpler than it sounds. there are only 2 kinds of layout:

```
vertical layout                 horizontal layout

+-------------------+           +------+ +------+ +------+
|                   |           |      | |      | |      |
+-------------------+           |      | |      | |      |
+-------------------+           |      | |      | |      |
|                   |           +------+ +------+ +------+
+-------------------+
+-------------------+
|                   |
+-------------------+
```

> a vertical layout is `display: block` divs, which is free because that is the default:

![three full width rows stacked](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/13-vertical.png)

> a horizontal layout is `display: inline-block` divs:

![three narrow boxes side by side](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/14-horizontal.png)

> **and then u put one inside the other.** here is a horizontal layout of 3 cards, and each card is a vertical layout of 3 lines:

```css
/* styles.css */
.card {
  display: inline-block;
  vertical-align: top;
  width: 150px;
  margin-right: 10px;
  border: 1px solid rgb(60, 120, 180);
  padding: 8px;
}
.card p { margin-top: 0; margin-bottom: 6px; }
```

![three cards side by side, each with a bold title and two lines under it](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/15-nested.png)

- horizontal outside, vertical inside. that is the entire trick.
- **every layout u have seen is this, repeated.** a youtube page is a vertical stack (header, then content), the content is horizontal (sidebar, then videos), the videos are a horizontal row of cards, and each card is a vertical stack of thumbnail, title, channel.
- so when a layout looks impossible, do not ask "which property does this". ask **"is this row horizontal or vertical, and what is inside each cell"**, and draw it on paper.
- `inline-block` is the worst of the 3 ways to do the horizontal half, and the only one u know yet. [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|chapter 8]] and [[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|chapter 9]] are the others.

---

## 12. inline styles

> the third and last place css can live: an attribute on the element itself.

```html
<!-- index.html -->
<div style="background-color: red; color: white; padding: 10px; width: 200px;">
  styled with no selector at all
</div>
```

![a red box with white text](02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/img/16-inline-style.png)

- no selector, because there is nothing to select. it applies to that one element.
- **it beats every rule in ur stylesheet.** one day u will change a colour in `styles.css`, see nothing happen, and it will be a `style="..."` u forgot about.
- so do not build pages with it. know it because u will read other people's html, because devtools writes it when u drag things, and because it is handy for a 10 second test.

---

## NOTES

1. **`vertical-align: top`.** inline-block elements line up along the bottom of their text by default, which looks broken the moment two of them have different heights. `vertical-align: top` on all of them fixes it. u will want this every single time u use inline-block.

2. **inline-block has a whitespace gap, and it is not a bug.** a newline between two inline-block divs is a space, and a space between inline things shows. so u get a mystery 4px gap. every workaround is ugly, and the real fix is the next two chapters. the section 11 examples have their tags jammed together (`</div><div>`) for this reason.

3. **margins collapse.** a `margin-bottom: 20px` above a `margin-top: 30px` gives u 30px, not 50. the bigger one wins. it only happens vertically between block elements, and it is why people pick one direction, usually `margin-bottom`, and stick to it.

4. **`box-sizing: border-box`** makes `width` mean the whole box, padding and border included, which is what u assumed it meant. nearly every real project starts with:

```css
* {
  box-sizing: border-box;
}
```

> `*` selects every element. not in the reference pdf, worth knowing anyway.

5. **`display: none` removes an element completely.** no space, nothing. it is different from `opacity: 0` and `visibility: hidden`, which both leave the gap where the element was.

6. **devtools draws this chapter for u.** Inspect an element and the bottom of the Styles panel shows the box model with the real numbers, colour coded. when a gap is the wrong size, it tells u which of the 4 layers is doing it in about 3 seconds.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=3790) by supersimple.dev, and continue through [display](https://youtu.be/G3e-cpL7ofc?t=8742), [the div element](https://youtu.be/G3e-cpL7ofc?t=9298) and [nested layouts](https://youtu.be/G3e-cpL7ofc?t=10015).

1. Make a div with a background colour, 200px wide, and give it margin, padding and a border. Then Inspect it and find all 4 layers in the devtools box model panel.
2. Work out, from ur own page, which of margin and padding gets the background colour. Do not look it up, look at it.
3. Put 3 boxes side by side with a 30px gap between them.
4. Pull the middle one 40px to the left with a negative margin.
5. Write the same padding 3 ways: 1 value, 2 values, 4 values.
6. Set the body margin to 0 and kill the top and bottom margin on every `<p>`.
7. Put a block, an inline-block and an inline element on a page and describe in one sentence each how they behave differently.
8. Set `width: 300px` on an inline element and reload. Explain why nothing happened.
9. Group a label and a text box inside a div, then make 2 of those groups sit side by side.
10. Fix the alignment when one of the 2 groups is taller than the other.
11. Build a vertical layout of 3 rows.
12. Build a horizontal layout of 3 columns.
13. Now build a horizontal layout of 3 cards, where each card is a vertical layout of a title and 2 lines.
14. Centre a 300px wide box in the middle of the page using only margin.
15. Style one element with an inline `style="..."`, then try to overrule it from `styles.css` and see what wins.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/07-display-and-the-box-model/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=07-display).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|← Chapter 6]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|next: Chapter 8 →]]
