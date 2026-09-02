---
title: "Chapter 1 — HTML Basics"
aliases:
  - "11-Dev-101/HTML-CSS-101/01-html-basics"
  - "11-Dev-101/HTML-CSS-101/01-html-basics/index"
---

**Time to study:** ~40 min
**You will learn:** what a web page actually is, how to write ur first elements, and the 3 rules of html syntax that stop u writing broken pages later.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-7B5CD6?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=01-tags)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-4A3D6B?style=for-the-badge&labelColor=2A1F47)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/01-html-basics/)

[[02-Personal/11-Dev-101/HTML-CSS-101/index\|← back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|next: Chapter 2 →]]

---

> html is the structure of a page: the words, the buttons, the images. what is there. css is what it looks like, and that is chapter 2. html comes first because there is nothing to style until something exists.

---

## 1. a web page is just a text file

> nobody says this out loud, so u assume a web page must be complicated. it is a text file with `.html` on the end. no install, no build step. any editor writes it, any browser opens it.

make a folder to work in and a file inside it:

```bash
mkdir html-test
cd html-test
```

open `index.html` in ur editor and put one line in it, no tags at all:

```html
hello, this is my first page
```

open that file in ur browser (double click it, or drag it into a browser window):

![plain text in the browser](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/01-plain-text.png)

- the `.html` on the end is what makes it a page. save the same content as `hello.txt` and the browser prints the tags as text instead of drawing them. a `.txt` file is text, an `.html` file is instructions.
- from here on the whole course is one loop: change the file, reload, look.

---

## 2. `<button>` and `<p>`, ur first two elements

> u draw things on the page by wrapping ur text in tags. here are the two the reference starts with:

```html
<button>Hello</button>
<p>paragraph of text</p>
```

![a button and a paragraph](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/02-first-elements.png)

- `<p>` is a paragraph. `<button>` is a button.
- the button already looks like a button and u did not ask for that. every element comes with default styles. chapter 2 is mostly about replacing them.
- the paragraph took its own line and the button did not. that is another default, called `display`, and it gets [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].

---

## 3. what an element is made of

> every element is 3 parts: the opening tag, the content, the closing tag.

```
<p>paragraph of text</p>
└┬┘└───────┬───────┘└┬─┘
 │         │         └── closing tag
 │         └──────────── the content
 └────────────────────── opening tag
```

- the only difference between the two tags is the `/`. that slash is the whole "this one ends it".
- the word in the angle brackets (`p`, `button`) is the **tag name**, and it decides what the thing is.
- **element** is the whole thing. **tag** is just the `<p>` bit. people mix the words up and nothing bad happens, but now u know.

---

## 4. what happens when u forget the closing tag

> u will forget one. better to see it now at 2 lines than at 200. here the first `<p>` is never closed:

```html
<p>the first paragraph
<p>the second paragraph</p>
```

![two paragraphs, rendered normally](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/04-forgot-closing.png)

> two paragraphs. it looks completely fine.

- that is the problem, not the good news. **html never shows u an error.** no red screen, no line number. the browser guesses and draws something.
- here it guessed right: it saw a new `<p>` open and closed the old one for u.
- it will not always guess what u meant. forget to close an `<a>` and the rest of the page turns into one giant link.
- so close every tag. the browser staying quiet is not the same as the code being right.

---

## 5. spaces and newlines get squashed

> write the same sentence 3 different ways:

```html
<p>paragraph of text</p>
<p>paragraph         of      text</p>
<p>
  paragraph
  of
  text
</p>
```

![all three paragraphs render identically](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/03-whitespace.png)

> all 3 come out the same.

- the rule: **any run of spaces, tabs and newlines becomes one space.** 10 spaces is one space. a newline is one space.
- so u can indent however u like. the indenting is for u, the browser throws it away.
- and u cannot push things around with the spacebar. space on the page is css, in [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]].

---

## 6. putting elements inside elements

> elements go inside other elements. this is called nesting, and once u have the tags and the attributes, it is basically all html is:

```html
<p>go to <a href="https://youtube.com">youtube</a> and then come back</p>
```

![a sentence with one word as a link](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/05-nesting.png)

- the `<a>` sits inside the `<p>`, so only that word is a link.
- the one rule: **close the inner element before the outer one.** `<p><a>...</a></p>` is right, `<p><a>...</p></a>` is crossed over and wrong. section 4 covers how loudly the browser complains about that (it does not).
- deeper nesting gets indented 2 spaces a level, so u can see what is inside what.

---

## 7. attributes, and the `<a>` link

> an attribute goes inside the opening tag and changes how the element behaves. `<a>` is the link element, and on its own it does nothing useful, because a link needs somewhere to go:

```html
<a href="https://youtube.com">Link to YouTube</a>
```

![a blue underlined link](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/06-link.png)

> `href` is the attribute that says where the link goes. blue and underlined is, again, just the browser's default style for a link.

here is the shape of it:

```
<a href="https://youtube.com" target="_blank">
 ┬ └┬─┘ └─────────┬─────────┘ └─┬──┘ └──┬───┘
 │  │             │             │       └── value
 │  │             │             └────────── name
 │  │             └──────────────────────── value
 │  └────────────────────────────────────── name
 └───────────────────────────────────────── tag name
```

> `target="_blank"` is a second attribute, and it opens the link in a new tab. put both links on a page and compare them:

```html
<a href="https://youtube.com">same tab</a>
<a href="https://youtube.com" target="_blank">new tab</a>
```

![two identical looking links](02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/img/07-two-links.png)

> they look exactly the same, and that is the reason i put both on the page. an attribute changes how the element **behaves**, not how it looks. click the second one and it opens a new tab, and nothing on the page told u it would.

- attributes live in the opening tag only, never the closing one, and more than one is separated by a space.
- the value goes in straight quotes `"`, the ones ur keyboard makes. paste from a word processor and u get curly ones, which the browser does not understand.
- different elements take different attributes. `href` means nothing on a `<p>`. look them up as u need them.

---

## NOTES

1. **some elements have no closing tag.** `<br>` is a line break, `<img>` is an image, `<input>` is a text box. they have no content inside them, so there is nothing to close. u meet `<img>` in [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|chapter 5]] and `<input>` in [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|chapter 6]].

2. **tag names are not case sensitive.** `<P>` and `<p>` are the same element. write them lowercase anyway, because everyone does and mixed case looks like a mistake.

3. **`index.html` is a special name.** when a folder gets served as a real website, `index.html` is the file u get when nobody asks for a specific page. name ur main file that from the start and u never have to think about it again.

4. **opening the file from the terminal:** `xdg-open index.html` on linux, `open index.html` on mac. if u did [[02-Personal/11-Dev-101/Terminal-101/index\|Terminal 101]] this is the same `cd` and `ls` u already know, just pointed at a browser.

5. **the browser does not notice u saved.** it is showing the copy it loaded. hit reload, `Ctrl+R` or `F5`, every time. i lost a stupid amount of time on my first page staring at an old render, wondering why nothing changed.

6. **`Ctrl+U` shows u the html of any page on the internet.** not just urs. find a page u like the look of, open the source, read it. it is the cheapest way to learn there is.

7. **`<!-- like this -->` is a comment.** the browser skips it. use it for notes, or to switch a chunk of html off without deleting it, which is the fastest way to find which part of a page is causing a problem.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=62) by supersimple.dev.

1. Make a folder for this course, and an `index.html` inside it. Put one line of plain text in it, no tags at all, and open it in ur browser.
2. Add a paragraph and a button underneath it.
3. Write the same sentence 3 times: once normally, once with 10 spaces in the middle of it, once split over 4 lines. Say out loud what u expect to see, then reload and check.
4. Break one closing tag on purpose and reload. Write down, in ur own words, what the browser did with it.
5. Make a link to any website.
6. Make the same link open in a new tab instead.
7. Put a link in the middle of a sentence so that only one word is clickable.
8. Make an `<a>` with no `href` at all and reload. Look at what u get, then say in one sentence what `href` was doing.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/01-html-basics/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=01-tags).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/index\|← back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|next: Chapter 2 →]]
