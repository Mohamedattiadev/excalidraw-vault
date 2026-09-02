---
title: "HTML & CSS 101"
aliases:
  - "11-Dev-101/HTML-CSS-101"
  - "11-Dev-101/HTML-CSS-101/index"
---

Notes I wrote while going back over html and css, turned into a course.

There are three reasons it exists. The first is to remind myself later, because
I forget things, and a page in my own words brings it back faster than a search
does. The second is that html and css get called "the easy part", so nobody
explains them properly, and u end up copying layouts u cannot debug. The third
is that once it was written well enough for me to come back to, it was already
good enough for someone else to start from.

So if something was ever unclear to me, it gets its own explanation here
instead of one line saying "this is obvious".

**Total time: about 13 hours 35 min**, split over 12 chapters, ending in a
YouTube home page u build urself.

---

## The chapters

| # | chapter | time | what u learn |
|---|---|---|---|
| 1 | [[02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/index\|HTML Basics]] | ~40 min | tags, nesting, attributes, and why html never errors |
| 2 | [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|CSS Basics]] | ~55 min | selectors, properties, borders, what a typo does |
| 3 | [[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|Colors and Sizes]] | ~35 min | `rgb` `hex` `rgba`, and `px` `%` `em` `rem` |
| 4 | [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|Classes and States]] | ~60 min | `class`, `:hover`, `transition`, `box-shadow`, devtools |
| 5 | [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|The Page Shell]] | ~50 min | head and body, filepaths, a `.css` file, images |
| 6 | [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|Text and Inputs]] | ~60 min | fonts, weights, `<span>`, text boxes, `::placeholder` |
| 7 | [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Display and the Box Model]] | ~90 min | margin, padding, `display`, nested layouts |
| 8 | [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|CSS Grid]] | ~60 min | `grid-template-columns`, `fr`, gaps, wrapping |
| 9 | [[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|Flexbox]] | ~90 min | `justify-content`, `align-items`, `flex: 1`, columns |
| 10 | [[02-Personal/11-Dev-101/HTML-CSS-101/10-position/index\|Position]] | ~75 min | `fixed`, `absolute`, `relative`, `z-index` |
| 11 | [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Responsive Design]] | ~80 min | media queries, inheritance, specificity |
| 12 | [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|The YouTube Clone]] | ~120 min | the whole course, as one real page |

And when u forget something later: **[[02-Personal/11-Dev-101/HTML-CSS-101/CHEATSHEET\|the cheat sheet]]**, every
tag and property in the course on one page.

---

## Interactive HTML & CSS

Html and css is the one subject where the browser can just show u the thing, so
this course does that as well as describing it. Everything below runs in a tab,
on the [dev-101](https://github.com/Mohamedattiadev/dev-101) pages site. Nothing
to install, nothing to sign into, no build step.

[![Open the playground](https://img.shields.io/badge/▶_open_the_playground-7B5CD6?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/)
[![Every assignment running](https://img.shields.io/badge/every_assignment,_running-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/)
[![The YouTube clone](https://img.shields.io/badge/the_youtube_clone-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/youtube-clone/Youtube.html)

### The playground

Code on the left, the page it makes on the right, redrawing while u type.

**Every lecture has its own one**, and it does not open on a blank file: it opens
on that lecture's topic with **every value applied at once**, labelled, so u can
see them against each other instead of one at a time. The chapter on
`justify-content` opens on all six values sitting in a column. The chapter on
`object-fit` opens on the same picture in five identical boxes. Next to each line
is a comment listing the other values u can put there, so trying one is a two
second edit and not a trip to the docs.

Drag the divider in the middle to make the page narrower. That is how u check a
media query without a second window, and it is the fastest way into chapter 11.

| chapter | play with the lecture | and when u have done it |
|---|---|---|
| **[[02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/index\|HTML Basics]]** | [tags, nesting and whitespace](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=01-tags) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/01-html-basics/) |
|  | [attributes](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=01-attributes) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|CSS Basics]]** | [the shape of a rule](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=02-rule) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/02-css-basics/) |
|  | [every border style, and border-radius](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=02-borders) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|Colors and Sizes]]** | [every way to write a colour](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=03-colours) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/03-colors-and-sizes/) |
|  | [px, %, em, rem, vw](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=03-units) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|Classes and States]]** | [hover, active, focus](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=04-states) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/04-classes-and-states/) |
|  | [box-shadow and transition](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=04-shadow) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|The Page Shell]]** | [object-fit, every value](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=05-objectfit) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/05-the-page-shell/) |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|Text and Inputs]]** | [every text property](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=06-text) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/06-text-and-inputs/) |
|  | [inputs, placeholder and labels](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=06-inputs) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Display and the Box Model]]** | [display, every value](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=07-display) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/07-display-and-the-box-model/) |
|  | [margin, padding, border, box-sizing](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=07-boxmodel) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|CSS Grid]]** | [grid-template-columns](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=08-columns) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/08-css-grid/) |
|  | [gaps, justify-content, align-items](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=08-align) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|Flexbox]]** | [justify-content, every value](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=09-justify) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/09-flexbox/) |
|  | [align-items, and what flips in a column](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=09-align) |  |
|  | [flex, grow and shrink](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=09-flex) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/10-position/index\|Position]]** | [static, relative, absolute, fixed, sticky](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=10-position) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/10-position/) |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Responsive Design]]** | [media queries](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=11-media) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/11-responsive-design/) |
|  | [inheritance and specificity](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=11-specificity) |  |
| **[[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|The YouTube Clone]]** | [one video card](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=12-card) | [the assignment](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/youtube-clone/Youtube.html) |

### Every assignment, running

The finished assignment from every chapter, as a page u can scroll, hover and
resize, with the code it is running printed underneath it and an **edit it**
button that drops the same code into the playground.

**Do the assignment before u open one.** They are for checking urself afterwards,
and for the parts a screenshot genuinely cannot show u: a hover, a 150ms fade, a
fixed bar staying still while the page scrolls under it.

### The YouTube clone

The page chapter 12 builds, served properly instead of sitting on my laptop.
Narrow ur window and watch the grid go from 4 across to 3 to 2. Then hit
`Ctrl+U` and read the whole thing: it is html and css and there is not one line
of javascript in it.

---

## Why this order

The chapters build on each other, and a few of them sit where they are on
purpose:

- **Colours and sizes get their own chapter** (3), because every property in
  chapter 2 takes a value, and "what can i put here" is a separate question
  from "what does this property do".
- **Classes come before the page shell** (4 before 5), because until u can
  style one button differently from another, u are not building pages, u are
  colouring elements.
- **The box model waits until chapter 7.** The reference pdf teaches it earlier.
  I moved it next to `display` and nested layouts, because margin and padding
  are layout, and chapters 1 to 6 do not need them.
- **Grid comes before flexbox** (8 before 9). Grid is the one u can see: u
  write the columns and there they are. Flexbox asks u to think about leftover
  space, which is harder before u have watched a layout work.
- **Position comes after both** (10), because it is the escape hatch from
  normal layout, and u should know what u are escaping from.
- **The project is a chapter, not an appendix** (12). It has no new properties
  in it at all, and finding that out is the point of it.

---

## How the chapters are organized

Every chapter has the same 3 parts, always in this order:

1. **The lecture.** The actual topics, numbered, each one with the real code
   and a screenshot of what it renders.
2. **NOTES.** Small things that are useful to know but are not a topic on
   their own.
3. **The assignment.** Tasks built only from what u learned in that chapter.
   The answers are in a `solutions.md` next to it, so u only see them when u
   decide to open them.

---

## How to study this

- Do them in order. Chapter 12 uses all eleven before it.
- **Type the code, do not read it.** Css looks obvious on the page and then
  does nothing when u write it from memory. Keep a file open next to this.
- Keep the browser open next to ur editor, and reload after every change. This
  course is one long loop of edit, reload, look.
- **Open devtools and leave it open.** Right click, Inspect. Chapter 4 shows u
  what to do with it. It is the difference between fixing css and guessing at
  it.
- Do the assignment **before** u open the solution.
- Ur screenshots will not match mine exactly. Fonts differ between machines, so
  text wraps in different places. The layout is what should match.
- The times assume u are typing everything and doing the assignment. One
  chapter a day is a good pace, so this is about two weeks.

---

## Before u start

- **U need a browser and a text editor.** That is genuinely all. No install, no
  build step, no framework.
- **U do not need the terminal**, but a little helps. `mkdir`, `cd` and knowing
  what a filepath is. [[02-Personal/11-Dev-101/Terminal-101/index\|Terminal 101]] chapters 1 to 3
  cover it.
- **Use Chrome, Chromium, Brave or Edge while u learn**, because the devtools
  in chapter 4 look the same in all of them. Firefox is fine, its devtools are
  just laid out differently to the screenshots.
- **The asset pack for chapter 12** is in the course repo, in
  [youtube-clone/](https://github.com/Mohamedattiadev/dev-101/tree/main/HTML-CSS-101/youtube-clone).
  Thumbnails, channel avatars and icons.

---

## References

- The video I used as the main reference:
  [supersimple.dev, HTML & CSS Full Course](https://www.youtube.com/watch?v=G3e-cpL7ofc).
  Every chapter's assignment links to the timestamp its exercises come from.
- [The reference pdf](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/html-css-reference.pdf)
  that goes with that course. It is the syllabus this one follows.
- [developer.mozilla.org](https://developer.mozilla.org) for every property. It
  is the real documentation and it is free.
- [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html),
  the clone I built before writing any of this, and the
  [live copy of it](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/youtube-clone/Youtube.html)
  if u would rather look at it than at the source. Chapter 12 section 8 goes
  through what is wrong with it.

---

## The video

**[[02-Personal/11-Dev-101/HTML-CSS-101/watch\|Watch it here]]**, 12 minutes, no narration. If u want the
player with the cheat sheet sitting beside it instead, that page is
[on the dev-101 site](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/video/watch.html).

Watch it after the chapters, or alongside them. It is a summary and not a
replacement: every page in it is rendered by a real browser while the video
plays, so when a layout moves, that is the browser doing the layout and not an
animation of one. The last chapter builds the YouTube page from nothing, a piece
at a time.

---

[[02-Personal/11-Dev-101/index\|← back to dev-101]]
