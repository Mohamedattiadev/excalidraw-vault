---
title: "Chapter 3 — Colors and Sizes"
aliases:
  - "11-Dev-101/HTML-CSS-101/03-colors-and-sizes"
  - "11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index"
---

**Time to study:** ~35 min
**You will learn:** the 4 ways to write a colour and what the numbers in them mean, plus the 4 units u measure things in and which one to reach for.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-7B5CD6?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=03-colours)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/03-colors-and-sizes/)

[[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|next: Chapter 4 →]]

---

> chapter 2 was the properties. this one is the **values**, and it is short on purpose. every property accepts certain kinds of value: `background-color` wants a colour, `width` wants a measurement. those are the two u type a hundred times a day.

---

## 1. a colour name

> the easiest one, and the one u start with:

```css
button {
  background-color: red;
}
```

![a red button](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/01-name.png)

- about 150 names are built in: `red`, `white`, `black`, `grey`, `tomato`, `steelblue`.
- fine for testing, almost never what u ship. ur red and a designer's red are different reds, and only one of them has a name.
- so u use them for 10 minutes while a layout comes together, then replace them with the next two.

---

## 2. `rgb`, mixing 3 numbers

> every colour a screen can show is red, green and blue light added together. that is what a pixel physically is. `rgb()` lets u say how much of each:

```css
button {
  background-color: rgb(0, 150, 255);
}
```

![a blue button](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/02-rgb.png)

> each number goes from **0 (none of that light) to 255 (all of it)**. so:

```css
rgb(0, 0, 0);         /* no light at all, black */
rgb(255, 255, 255);   /* all 3 at full, white */
rgb(255, 0, 0);       /* only red, red */
```

- `rgb(255, 0, 0)` and the word `red` are the same colour. not similar, the same. i rendered both and compared them pixel by pixel: no difference.
- black is no light and white is all of it, which is backwards from mixing paint and catches everyone once.
- why 255 and not 100: each number is one byte, and a byte holds 256 values.
- nobody works these out in their head. u pick a colour in a picker and copy what it gives u.

---

## 3. hex, the same numbers written shorter

> hex is rgb wearing a different hat. same 3 numbers, same 0 to 255, written in base 16 and glued together after a `#`:

```css
button {
  background-color: #0096FF;
}
```

![the same blue button](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/03-hex.png)

> that is the same blue as section 2. i compared those two renders as well: zero differing pixels.

base 16 means each character has 16 possible values instead of 10:

```
0 1 2 3 4 5 6 7 8 9 A  B  C  D  E  F
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
```

> two characters together give u 16 * 16 = 256 values, which is exactly the 0 to 255 that rgb uses. so the 6 characters split into 3 pairs:

```
#0096FF
 │ │ └── blue  = FF = (15 * 16) + 15 = 255
 │ └──── green = 96 = (9 * 16) + 6 = 150
 └────── red   = 00 = 0
```

- so `#0096FF` is `rgb(0, 150, 255)` in 7 characters instead of 18. that is the whole reason it exists.
- u never do this arithmetic. every picker gives u both. i worked it out once here so the format stops looking like magic.
- hex is not case sensitive.
- **hex cannot be see-through.** that is the next one.

---

## 4. `rgba`, and see-through colours

> `rgba` is `rgb` with a 4th number on the end, the **alpha**, and it controls how see-through the colour is. `0` is invisible, `1` is solid.

here is a black paragraph on a blue page, at 3 different alphas. first `1`:

```css
body {
  background-color: rgb(0, 150, 255);
}
p {
  background-color: rgba(0, 0, 0, 1);
  color: white;
  width: 220px;
}
```

![solid black on blue](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/07-alpha-1.png)

> then `0.5`:

![half see-through black on blue](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/07-alpha-0.5.png)

> then `0.15`:

![barely visible black on blue](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/07-alpha-0.15.png)

- the black never changes. what changes is how much blue comes through it.
- `rgba(0, 0, 0, 1)` and `rgb(0, 0, 0)` are identical. alpha defaults to 1.
- reach for this for a shadow, a dim overlay, or a hover that darkens slightly. a faint black at `0.05` looks right over **any** background, where a specific grey only looks right over one.
- ur own [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) uses `rgba(96, 97, 97, 0.05)` behind the videos for exactly that reason.

---

## 5. `px`, the pixel

> a pixel is a dot on the screen, and `px` is the unit u will use most:

```css
p {
  background-color: black;
  color: white;
  width: 200px;
}
```

![a 200px wide black bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/08-px.png)

- i measured that bar in the screenshot: 200 pixels across. `px` means what it says.
- a 4K screen is 3840px wide and a phone is about 400px. that gap is the whole reason [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|chapter 11]] exists.
- `px` is **fixed** and does not care how big the window is. that is why it is easy, and why a page built only in `px` breaks on a phone.

---

## 6. `%`, a share of the container

> a percentage is measured against whatever the element is sitting inside:

```css
p {
  background-color: black;
  color: white;
  width: 50%;
}
```

![a black bar filling half the window](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/09-percent.png)

- that window is 600px and the bar came out 292px, not 300px. the missing 8px is the default margin around `<body>`, so the container is 584px and half is 292. [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]] switches that margin off, and it is the first line of css in most real pages.
- percentages resize with the window, which is why a `%` width is usually a better default than a `px` one.
- `50%` of **what** is the thing to keep straight. it is the parent element, not the screen.

---

## 7. `em` and `rem`

> these two are measured against a font size, which sounds strange for a width until u see it. both paragraphs below have `font-size: 20px` and a width of `10`, one in `em` and one in `rem`:

```css
p {
  font-size: 20px;
  width: 10em;
}
```

![a 200px wide bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/10-em.png)

```css
p {
  font-size: 20px;
  width: 10rem;
}
```

![a 160px wide bar](02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/img/11-rem.png)

> the first is 200px, the second is 160px. i measured both.

- **`em` multiplies this element's font size.** it is 20px, so `10em` is 200px.
- **`rem` multiplies the page's font size**, 16px unless someone changed it. so `10rem` is 160px and the element's own 20px is ignored.
- the `r` is for root. that is the only difference, and it is worth saying out loud a few times.
- why bother: if someone has set a bigger default text size, everything in `rem` grows with them and everything in `px` does not. that is a real accessibility argument.
- use `px` while u are learning, because u can see what u typed. move to `rem` once the layout has stopped fighting u.

---

## NOTES

1. **u do not pick colours by typing numbers.** right click a page, Inspect, and devtools has a colour picker with an eyedropper in it ([[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|chapter 4]]). Or search "color picker" and use the first result. Copy the hex out of it.

2. **hex has a 3 character short form.** `#FFF` is `#FFFFFF`, `#000` is `#000000`, `#F00` is `#FF0000`. each character is just doubled. it only works when the 3 pairs are each a repeated character.

3. **`transparent` is a colour value.** `background-color: transparent` is the same as `rgba(0, 0, 0, 0)` and reads better. it is how u remove a background someone else set.

4. **`opacity` is not `rgba`.** `rgba` makes one colour see-through. `opacity` makes the whole element see-through, text and all. that is [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|chapter 4]].

5. **`vw` and `vh` exist too.** 1vw is 1% of the window width, 1vh is 1% of its height, so `height: 100vh` is exactly one screen tall. that is how a landing page fills the screen. not in the reference pdf, and u will meet them within a week.

6. **a number without a unit is ignored.** `width: 200` is not 200px, it is a dropped line, silently, the same as chapter 2's typo. `0` is the one exception, `0` needs no unit.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=1062) by supersimple.dev.

1. Make a red button 3 times over: once with the name, once with `rgb`, once with hex. Check that all 3 look the same.
2. Open any colour picker, choose a colour u actually like, and use its rgb value on the button.
3. Convert that same colour to hex and use that instead.
4. Give the `<body>` a blue background and put a paragraph on it with a black background that is 50% see-through.
5. Take the same paragraph down to 15% see-through.
6. Make the paragraph 300px wide.
7. Now make it 50% wide, and drag ur browser window narrower and wider while u watch it.
8. Give the paragraph `font-size: 20px` and `width: 10em`. Reload, then change `em` to `rem` and reload again. Work out from the two widths what each unit was measuring against.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/03-colors-and-sizes/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=03-colours).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|← Chapter 2]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|next: Chapter 4 →]]
