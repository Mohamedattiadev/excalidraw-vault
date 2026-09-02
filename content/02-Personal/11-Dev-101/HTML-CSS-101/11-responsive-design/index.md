---
title: "Chapter 11 — Responsive Design"
aliases:
  - "11-Dev-101/HTML-CSS-101/11-responsive-design"
  - "11-Dev-101/HTML-CSS-101/11-responsive-design/index"
---

**Time to study:** ~80 min
**You will learn:** how to give a page different css at different screen widths, the selectors u have not met yet, and the rules that decide which of two conflicting styles actually wins.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-7B5CD6?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=11-media)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/11-responsive-design/)

[[02-Personal/11-Dev-101/HTML-CSS-101/10-position/index\|← Chapter 10]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|next: Chapter 12 →]]

---

> the last chapter before the project, and it is 3 things bolted together: making a page work on a phone, the selectors that are more than a class name, and the rules underneath everything u have written so far.
>
> slow down on the third one. u have been relying on specificity since [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|chapter 2]] without a name for it.

---

## 1. what responsive means

> ur page has to work on a 27 inch monitor and on a phone held in one hand. those are 2500px and 390px. the same layout cannot be right for both, and shrinking everything is not the answer, because then the text is 4px tall.

- so u write the page once and add a few blocks of css that only apply at certain widths.
- **build the desktop version, then narrow the window until it breaks.** where it breaks is where u need a media query. do not guess at device sizes, there are hundreds.
- most of the work is done already if u used `fr`, `%` and `flex: 1` instead of fixed pixels. a layout built from shares mostly resizes itself, and media queries handle the last 20%.

---

## 2. `@media`, a block of css with a condition

> a media query is a normal css rule with an `if` wrapped round it:

```css
/* styles.css */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

@media (max-width: 750px) {
  .grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 500px) {
  .grid { grid-template-columns: 1fr; }
}
```

> that is the whole responsive layout. here is the same file in a 900px window:

![four cards in three columns](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/01-media-wide.png)

> at 700px:

![the same four cards in two columns](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/01-media-medium.png)

> and at 420px:

![the same four cards stacked in one column](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/01-media-narrow.png)

- **same html, 3 layouts.** the only thing that changed between those screenshots is the width of the window.
- `max-width: 750px` means "750px **or less**". `min-width` is the other way round.
- the css inside is ordinary. anything u can write outside one u can write inside one.
- **it goes after the rule it overwrites.** put it above and it does nothing.
- ur own [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) does exactly this: 3 columns normally, 4 above 1050px, 2 below 750px.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-2)**

---

## 3. the ranges, and the .02 gap

> when u want a band rather than an open end, u chain the conditions:

```css
@media (max-width: 750px) {
  /* 0 to 750 */
}

@media (min-width: 750.02px) and (max-width: 1000px) {
  /* 750 to 1000 */
}

@media (min-width: 1000.02px) {
  /* 1000 and up */
}
```

- **why `.02` and not `1`:** a window can genuinely be 750.5px wide, on a scaled display or a zoomed page. with `max-width: 750px` and `min-width: 751px`, a window at 750.5 matches neither, and u get a broken layout at one width u will never reproduce on purpose.
- `.02` is small enough that no real window lands in the gap.
- if u only use `max-width` and let them overwrite each other, u need none of this. that is what section 2 does, and it is simpler.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-3)**

---

## 4. selectors with a comma

> a comma means "and also". one rule, several targets:

```css
/* styles.css */
.title, .subtitle, p {
  color: rgb(0, 100, 200);
}
```

![three blue lines and one black one](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/02-comma.png)

- the plain div is untouched, because it is not in the list. classes and element names mix freely.
- **a missing comma changes the meaning completely** instead of breaking. `.title .subtitle` is section 5 and means something else entirely. a real bug, and silent.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-4)**

---

## 5. selectors with a space

> a space means "inside". `.card p` is **every `<p>` that is somewhere inside an element with class card**:

```css
/* styles.css */
.card p {
  color: rgb(200, 40, 40);
  font-weight: bold;
}
```

```html
<!-- index.html -->
<div class="card">
  <p>inside the card, so it is red</p>
</div>
<div class="outside">
  <p>outside the card, so it is not</p>
</div>
```

![a red bold paragraph in the first box, a normal one in the second](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/03-space.png)

- this styles the contents of a component without giving every child a class. it is the difference between 3 classes and 15.
- it goes as deep as u like, and chains: `.sidebar .menu a` is a link inside a menu inside a sidebar.
- it combines with states: **`.card:hover .tooltip`** is "the tooltip, but only while the mouse is on the card". that is a tooltip with no javascript. no screenshot, same as every hover here.
- ur `Youtube.html` uses it twice.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-5)**

---

## 6. inheritance

> some properties pass down into the elements inside:

```css
/* styles.css */
body {
  font-family: Georgia;
  color: rgb(200, 40, 40);
}
```

![red Georgia text in a paragraph, a div and a span, and a black Arial button](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/04-inheritance.png)

- the paragraph, the div and the span are all red Georgia, and **none of them has a rule.** they inherited from `<body>`.
- **text properties inherit:** `font-family`, `font-size`, `color`, `line-height`, `text-align`.
- **box properties do not:** `background-color`, `width`, `border`, `padding`, `margin`. imagine if `border` inherited.
- so setting the font once on `<body>` really is all u need for the whole page.
- **look at the button.** still Arial, still black. form controls do not inherit, because the operating system draws them. `font-family: inherit` opts them back in, and yes, u have to remember that forever.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-6)**

---

## 7. specificity

> u have been living with this since chapter 2. when 2 rules set the same property on the same element, **specificity** decides which one wins:

```css
/* styles.css */
body { color: black; }
p { color: red; }
.title { color: green; }
```

```html
<!-- index.html -->
<p>a plain paragraph, red from the p rule</p>
<p class="title">a paragraph with class title</p>
<div>a div, black from the body</div>
```

![a red paragraph, a green paragraph, and black text](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/05-specificity.png)

> the second paragraph is hit by all 3 and it comes out green.

the order, weakest first:

```
inherited from a parent        weakest
element name        p, div, button
class               .title, .card
inline style        style="..."    strongest
```

- **a more specific selector wins whatever the order.** `.title` beats `p` even with `p` written last.
- **order only breaks ties between selectors of equal strength.** the chapter 2 rule turns out to be the tie breaker, not the main rule.
- so when a style is spelled right and still not applying, something more specific is beating it. devtools shows u exactly what, loser struck through, winner at the top.
- **`!important` beats everything.** u will meet it in other people's code, and every one u write makes the next problem harder. know it, do not reach for it.
- ids beat classes, which is why [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|chapter 4]] told u not to style with ids.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-7)**

---

## 8. semantic elements

> `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`. **they behave exactly like a `<div>`.** i rendered a page with divs and the same page with these, and compared: zero differing pixels.

```html
<!-- index.html -->
<header class="top">the top</header>
<nav class="menu">the menu</nav>
<main class="body-part">the main part</main>
```

![a red strip, a yellow strip and a blue strip](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/07-divs.png)

- so why bother: **they tell other software what part of the page it is looking at.** a screen reader can offer "skip to main content". a search engine knows the `<nav>` is navigation. reader mode knows what to keep.
- it costs nothing. u were writing a `<div>` anyway, so write `<header>` when it is a header.
- use the semantic one when the name is honestly true, `<div>` when it is just a box. a `<section>` that is not a section helps nobody.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-8)**

---

## 9. comments

```css
/* a css comment */
```

```html
<!-- an html comment -->
```

- 2 languages, 2 syntaxes, and neither works in the other's file. `<!-- -->` inside a `.css` file breaks it.
- the everyday use is not documentation, it is **switching things off**. comment out half a rule and reload to see which half was doing it. the fastest debugging tool u have that is not devtools.
- anyone can read them in the page source. nothing in there u would not say out loud.

---

## 10. `pointer-events` and `white-space`

> two odd properties that solve 2 specific problems, both of which u will hit.

```css
.tooltip {
  pointer-events: none;
  white-space: nowrap;
}
```

- **`pointer-events: none`** makes an element invisible to the mouse. clicks and hovers pass straight through to whatever is behind. that is how u put a label over a photo without stopping the photo being clicked, and how u stop a tooltip flickering when the mouse touches the tooltip.
- **`white-space: nowrap`** stops text wrapping, ever. the same text in a 120px box, without and with:

![the words on two lines, then on one line spilling out of the box](02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/img/06-nowrap.png)

- the second is **wider than its box**. that is the trade: the text will not wrap, so something has to give. use it for a menu label or a date, never for a paragraph.
- ur [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) has it on `.side-button`, so "YouTube Music" stays on one line in a 70px sidebar.

**[▶ open this in the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?s=11-10)**

---

## NOTES

1. **`<meta name="viewport" content="width=device-width, initial-scale=1">` in the `<head>`, or none of this works on a phone.** without it a phone pretends to be 980px wide and zooms the page out, so ur media queries never fire. it was note 3 of [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|chapter 5]], and this is where forgetting it costs u.

2. **devtools has a device toolbar**, the phone icon or `Ctrl+Shift+M`. a resizable frame with the width shown and preset phone sizes. test every media query there, not by dragging ur window.

3. **`@media` can ask about more than width.** `(orientation: landscape)`, `(prefers-color-scheme: dark)` for a dark mode, `(hover: none)` to detect a touchscreen, and `print` for a printer stylesheet.

4. **the `*` selector matches everything.** `* { box-sizing: border-box; }` from [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]] note 4 is the usual and almost only use.

5. **`>` means direct child**, where a space means any descendant. `.card > p` is a `<p>` that is an immediate child of `.card`, not one nested 3 levels down.

6. **do not build 6 breakpoints.** 2 or 3 is normal. every one u add is another layout to check every time u change anything.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=22066) by supersimple.dev.

1. Make a 3 column grid of 4 cards.
2. Add a media query that makes it 2 columns under 750px, and another that makes it 1 column under 500px. Check all 3 with the devtools device toolbar.
3. Move one of the media queries above the normal `.grid` rule and reload. Explain what happened.
4. Colour 3 different selectors blue in a single rule.
5. Style only the paragraphs inside one particular div, without adding a class to any of them.
6. Set the font and the text colour once on `<body>` and check what did and did not inherit it. Pay attention to the button.
7. Write `body`, `p` and `.title` rules that all set `color`, put all 3 on one paragraph, and predict the winner before u reload.
8. Now write the `p` rule **after** the `.title` rule and predict again.
9. Rewrite one of ur pages with `<header>`, `<nav>` and `<main>` instead of divs, and confirm nothing at all changed visually.
10. Put a long label in a 120px box, then stop it wrapping. Look at what it does to the box.
11. Put a `<meta name="viewport">` in the head of every page u have made so far.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/11-responsive-design/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=11-media).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/10-position/index\|← Chapter 10]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|next: Chapter 12 →]]
