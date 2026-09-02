---
title: "Chapter 6 — Text and Inputs"
aliases:
  - "11-Dev-101/HTML-CSS-101/06-text-and-inputs"
  - "11-Dev-101/HTML-CSS-101/06-text-and-inputs/index"
---

**Time to study:** ~60 min
**You will learn:** every text property u will actually use, the small elements that style one word in the middle of a sentence, and how to make a text box that does not look like 1998.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-7B5CD6?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=06-text)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/06-text-and-inputs/)

[[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|next: Chapter 7 →]]

---

> most of a web page is text. that is easy to forget while u are moving coloured boxes around. this chapter is the properties that make the words look deliberate.

---

## 1. `font-family`, and why u write a list

```css
/* styles.css */
.a { font-family: Arial; font-size: 24px; }
.b { font-family: Georgia; font-size: 24px; }
.c { font-family: "Courier New"; font-size: 24px; }
```

```html
<!-- index.html -->
<p class="a">Arial, the safe one</p>
<p class="b">Georgia, a serif</p>
<p class="c">Courier New, fixed width</p>
```

![three paragraphs in three different fonts](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/01-font-family.png)

- a font name with a space goes in quotes: `"Courier New"`.
- **u can only use a font the reader already has**, unless u load one ([[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|chapter 5]]). Arial, Georgia, Courier New, Times New Roman and Verdana are on nearly every machine.
- so u write a **font stack**, a list of fallbacks in order:

```css
body {
  font-family: Roboto, Verdana, Arial;
}
```

> that means: use Roboto. if it is not there, Verdana. if that is not there either, Arial. the browser walks the list until something works.

- put the font on `<body>` and every element on the page inherits it. that is one line instead of thirty, and [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|chapter 11]] explains why it works.

---

## 2. `font-size` and `font-weight`

```css
/* styles.css */
.big  { font-size: 30px; }
.bold { font-weight: bold; }
.w300 { font-weight: 300; }
.w500 { font-weight: 500; }
.w900 { font-weight: 900; }
```

![the same sentence at different sizes and weights](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/02-font-size-weight.png)

- `font-size: 16px` is the browser default. that is where `rem` in [[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|chapter 3]] gets its number.
- `font-weight` takes `bold`, or 100 to 900 in hundreds. `400` is normal, `700` is `bold`, `500` is the half step for a slightly heavier title.
- **look at the 300 line. it is identical to the normal one**, and 900 is identical to bold. **a weight only exists if the font file has it.** Arial ships regular and bold, so every number rounds to one of those. that is what `wght@400;500` in the chapter 5 google fonts block is choosing.

---

## 3. `font-style`, `text-decoration` and `text-align`

```css
/* styles.css */
.italic { font-style: italic; }
.under  { text-decoration: underline; }
.none   { text-decoration: none; }
.center { text-align: center; }
.right  { text-align: right; }
p { width: 400px; }
```

![italic, underlined, centred and right aligned text, and a link with no underline](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/03-style-decoration-align.png)

- `text-decoration: none` kills the underline on a link. every navigation menu on the internet has that line somewhere.
- **`text-align` moves the text inside the element, not the element.** those paragraphs are 400px wide and every one still starts at the left edge of the page. only the words moved. centring the element itself is [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].
- values: `left`, `right`, `center`, `justify`. `justify` stretches the spaces so both edges line up, and on a narrow column it looks terrible.

---

## 4. `line-height`

> the space between the lines **inside** one paragraph. here is a paragraph with the browser default, on a grey background so u can see the block:

![a paragraph with tight default line spacing](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/04-line-height-default.png)

> and the same paragraph with the line height turned up:

```css
/* styles.css */
p {
  font-size: 16px;
  width: 380px;
  line-height: 28px;
}
```

![the same paragraph with more air between the lines](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/05-line-height-set.png)

- same words, and the second is easier to read. that is the whole property.
- aim for about 1.5 times the font size, so 16px text wants 24 to 28px. the default is about 1.2, too tight for anything longer than a sentence.
- written with no unit, `line-height: 1.5`, it scales with whatever font size the element ends up with. usually the better version.

---

## 5. text elements, styling part of a line

> everything so far styles a whole element. to style **part** of a sentence u need an element around just that part, and there are small ones made for the job:

```html
<!-- index.html -->
<p>this is a <strong>strong</strong> word</p>
<p>this is an <u>underlined</u> word</p>
<p>this is a <span>span</span>, which looks like nothing</p>
<p>this is a <a href="https://youtube.com">link</a> in a sentence</p>
```

![four sentences, each with one word styled differently](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/06-text-elements.png)

- these are **text elements**, or **inline elements**. they sit inside a line of text instead of taking a line of their own, so the sentence flows around them.
- `<strong>` is bold, `<u>` is underlined, `<a>` is a link, built in.
- `<strong>` also tells a screen reader "this is important", which is why it exists as well as css bold.

---

## 6. `<span>`, the one with no opinions

> look at the third line of that screenshot again. the `<span>` is invisible: it looks exactly like the text around it. **that is the point of it.**

```css
/* styles.css */
.shop-link {
  color: rgb(0, 100, 200);
  text-decoration: underline;
  font-weight: bold;
}
```

```html
<!-- index.html -->
<p>go and look at the <span class="shop-link">shop</span> before u decide</p>
```

![one word in a sentence coloured, bold and underlined](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/07-span-class.png)

- `<span>` has no styles of its own. it exists as **something to hang a class on**, so u can reach one word in the middle of a sentence.
- the pattern: `<span class="...">` around the bit u want, then a rule for the class.
- `<span>` is to a line of text what `<div>` is to a block of the page. `<div>` opens [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].

---

## 7. `<input>`, a text box

```html
<!-- index.html -->
<input type="text">
<input type="text" placeholder="Search">
```

![an empty text box and one with grey placeholder text](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/08-input.png)

- `<input>` has no closing tag, same family as `<img>` and `<link>`.
- `type` decides which control u get: `text`, `checkbox`, `password`, `email`, `number`, `date`, `color`, `file`.
- **`placeholder` is not a label.** it is a grey hint that disappears the moment someone types, so it is gone exactly when they need it. nothing important goes in there.

---

## 8. styling the box, and `::placeholder`

```css
/* styles.css */
.search-bar {
  font-family: Arial;
  font-size: 20px;
  height: 36px;
  width: 300px;
  border: 1px solid rgb(190, 190, 190);
  border-radius: 2px;
}
.search-bar::placeholder {
  color: rgb(150, 150, 150);
  font-size: 14px;
  font-style: italic;
}
```

```html
<!-- index.html -->
<input class="search-bar" type="text" placeholder="Search">
```

![a wide bordered search box with small grey italic placeholder text](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/09-input-styled.png)

- `font-size` on `.search-bar` sets the size of what the **user types**. the placeholder ignores it.
- `::placeholder` has **2 colons**, so it is a pseudo-**element**: a piece of the element with no tag of its own. `:hover` had one colon and is a pseudo-**class**, a state. the extra colon is how u tell them apart.
- in the screenshot the box is 20px and the placeholder is 14px italic. 2 rules, 2 different things, on purpose.

---

## 9. checkboxes and labels

```html
<!-- index.html -->
<input type="checkbox"> a plain checkbox

<input type="checkbox" id="agree">
<label for="agree">a checkbox with a label u can click</label>
```

![two checkboxes with text next to them](02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/img/10-checkbox.png)

- they look almost the same and behave differently. on the first, only the square is clickable. on the second, clicking the **words** ticks the box.
- `<label for="...">` matches the input's `id` and the two become one control. it is the one place ids earn their keep, and it makes a form far less annoying on a phone.
- ur operating system draws the checkbox itself. u can move it and size it, and mostly not recolour it. that is normal.

---

## NOTES

1. **`<p>` comes with space above and below it** that u never asked for. every screenshot in this chapter has it. it is a default margin, and switching it off is the first thing most real stylesheets do. that is [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].

2. **`<b>` and `<i>` still work** and do the same thing as `<strong>` and `<em>` visually. the difference is meaning: `<strong>` says important, `<b>` just says bold. use `<strong>` and `<em>`.

3. **`<br>` forces a line break.** it is fine for an address or a poem and wrong for spacing things out. if u are typing 3 `<br>`s in a row, u wanted margin.

4. **text properties are inherited.** set `font-family` on `<body>` and everything inside gets it, without a single other rule. `background-color` and `width` do not work that way. [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|chapter 11]] explains which do and which do not.

5. **`<h1>` to `<h6>` are the headings.** big and bold by default, restyle them to anything. use `<h1>` once for the real title, then `<h2>` for sections, in order. search engines and screen readers read that order as the outline of ur page.

6. **`text-transform: uppercase`** shouts without u typing caps. worth knowing, because SUBSCRIBE typed in caps reads badly to a screen reader, and this way the html still says Subscribe.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=4650) by supersimple.dev, and the inputs part follows [the same course at 2:11:08](https://youtu.be/G3e-cpL7ofc?t=7868).

1. Put 3 paragraphs on a page in 3 different fonts.
2. Set a font stack on `<body>` with 3 names in it, and delete the `font-family` from the individual paragraphs. Check that they all still changed.
3. Make one paragraph 30px, one bold, and one `font-weight: 300`. Look hard at the 300 one and explain why it looks the way it does.
4. Make a link with no underline.
5. Write a paragraph long enough to wrap over 4 lines, give it a width, and open up the space between the lines.
6. Centre the text inside that paragraph. Then check whether the paragraph itself moved.
7. Take one word out of the middle of a sentence and make it blue and bold, without touching the rest of the sentence.
8. Put a text box on the page with a placeholder that says Search.
9. Make the box 36px tall and 300px wide with a thin grey border, and make the placeholder text smaller and grey.
10. Add a checkbox with a label u can click on to tick it.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/06-text-and-inputs/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=06-text).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|← Chapter 5]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|next: Chapter 7 →]]
