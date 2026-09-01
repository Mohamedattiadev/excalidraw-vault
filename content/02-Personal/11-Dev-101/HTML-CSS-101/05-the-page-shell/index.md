---
title: "Chapter 5 — The Page Shell"
aliases:
  - "11-Dev-101/HTML-CSS-101/05-the-page-shell"
  - "11-Dev-101/HTML-CSS-101/05-the-page-shell/index"
---

**Time to study:** ~50 min
**You will learn:** the real structure every html file has, how to move ur css into its own file, how filepaths work, and how to put an image on a page without stretching it.

[![Open the playground](https://img.shields.io/badge/▶_play_with_this_chapter-8FBEEA?style=for-the-badge&labelColor=0C0F16)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=05-objectfit)
[![See it running](https://img.shields.io/badge/see_the_assignment_running-2A3342?style=for-the-badge&labelColor=0C0F16)](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/05-the-page-shell/)

[[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|next: Chapter 6 →]]

---

> everything so far has been a fragment: a `<style>` block and a few elements, and the browser was kind enough to draw it. this chapter is the wrapper that goes around every page u write, and it is where ur css moves into its own file.

---

## 1. the real skeleton of a page

> here is the shape. every page has it, including every page u have ever visited:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My first real page</title>
  </head>
  <body>
    <p>everything u can see lives in the body</p>
    <button>including this</button>
  </body>
</html>
```

![the page rendered, showing only the body content](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/01-skeleton.png)

- `<!DOCTYPE html>` is not an element, it is a line saying "use the modern rules". leave it out and the browser drops into an old compatibility mode where things quietly behave differently. one line, always there, never think about it again.
- **`<head>` is everything the user cannot see:** the tab title, the links to stylesheets and fonts.
- **`<body>` is everything the user can see:** text, buttons, images.
- look at the screenshot. the title is nowhere on the page. that is the head doing its job.

---

## 2. what goes in the head

> the one u will use every time is `<title>`, and it sets the text in the browser tab:

```html
<head>
  <title>My first real page</title>
</head>
```

- **no screenshot**, because the tab is browser furniture, not part of the page. open the file and look at the top of ur window.
- with no `<title>` the tab shows the filename, which looks unfinished.
- `<style>` belongs in the head too. earlier chapters put it at the top of the file and got away with it because the browser is forgiving.

---

## 3. filepaths

> a path is how u point at another file from this one. it is read left to right, starting from the folder the html file is in:

```
href="styles.css"                 the file styles.css, sitting next to the html file
href="css/styles.css"             go into the folder css, then find styles.css
href="css/theme/styles.css"       go into css, then into theme, then find styles.css
href="../styles.css"              go UP one folder, then find styles.css
```

> get one wrong and there is no error message, u just get nothing. here are two `<img>`s, the first with a wrong path and the second with a right one:

```html
<img src="thumbnail-1.webp" alt="a video thumbnail">
<img src="thumbnails/thumbnail-1.webp" alt="a video thumbnail">
```

![a broken image icon next to a working image](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/07-broken-path.png)

- the broken one shows a torn icon and the `alt` text. that is the whole warning. a broken **stylesheet** path gives u nothing at all, just an unstyled page.
- **`../` means go up a level.** not in the reference pdf, and u need it the moment ur html is in one folder and ur images are in another.
- **on linux, paths are case sensitive.** `Thumbnail-1.webp` and `thumbnail-1.webp` are different files. on mac and windows they usually are not, which is why a site that worked on someone's laptop breaks when it reaches a real server. keep everything lowercase.
- no spaces in filenames.

---

## 4. the external stylesheet

> this is the one that changes how u work. take the css out of the html and put it in its own file, `styles.css`:

```css
.intro {
  color: rgb(60, 60, 60);
}

.cta {
  background-color: red;
  color: white;
  height: 36px;
  width: 105px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}
```

> then link it from the head:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My first real page</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <p class="intro">the css for this page is in another file</p>
    <button class="cta">Subscribe</button>
  </body>
</html>
```

![the styled page, with the css coming from a separate file](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/02-external.png)

- **no `<style>` tags inside the `.css` file.** the whole file is already css. putting `<style>` in there breaks everything, and it is the first mistake everyone makes.
- `rel="stylesheet"` is not optional. without it the file is fetched and ignored.
- why bother: one stylesheet serves 50 pages, so a colour change happens in one place, and the browser downloads it once and reuses it.
- from here on the code blocks say which file each part goes in.

---

## 5. a font from google

> the fonts u can use for free are the ones already on the reader's machine, and that is a short and boring list. google fonts is the usual way out of it:

```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap">
</head>
```

> then u can use the name. `font-family` gets its proper section in [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|chapter 6]], here it is only to prove the font arrived:

```css
.roboto {
  font-family: Roboto, Arial;
}
```

![the default font above, Roboto below](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/08-font.png)

- top line is the browser default, bottom line is Roboto. that screenshot really did fetch the font over the network.
- u do not type those `<link>` tags urself. search "google fonts", pick a font and its weights, and it hands u the block to paste.
- **pick only the weights u will use.** each one is another download. 2 is normal, 5 is a slow page.
- `Roboto, Arial` is a fallback list. if google is unreachable u get Arial, not whatever the browser picks at random.

---

## 6. `<img>`

> an image is one element with one attribute:

```html
<img src="thumbnails/thumbnail-1.webp">
```

![a full size video thumbnail](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/03-img.png)

- `<img>` has no closing tag and no content. `src` is the whole thing.
- with no css u get the image at its natural size. that file is 720 by 404, which is usually far too big.
- **always add `alt`.** it is what a screen reader reads out, and what shows when the file is missing, as u saw in section 3.

---

## 7. sizing an image

> set the `width` and the height follows on its own, keeping the shape:

```css
.thumbnail {
  width: 300px;
}
```

![the thumbnail at 300px wide, still the right shape](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/04-img-width.png)

> set **both** and u are telling the browser to ignore the shape:

```css
.thumbnail {
  width: 300px;
  height: 300px;
}
```

![the same thumbnail squashed into a square](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/05-img-stretched.png)

- the second is squashed, and a squashed image is the most obvious sign of an unfinished page.
- so **set one, not both**, unless u also do the next section. setting only `height` works the same way in reverse.

---

## 8. `object-fit`

> sometimes u genuinely need a fixed box, say a row of thumbnails that all have to line up, and the images are not all the same shape. `object-fit` says what to do with the mismatch. all 3 of these are in a 200 by 200 box:

```html
<style>
  img {
    width: 200px;
    height: 200px;
    border: 1px solid black;
  }
  .cover { object-fit: cover; }
  .contain { object-fit: contain; }
</style>
<img src="thumbnails/thumbnail-1.webp">
<img class="cover" src="thumbnails/thumbnail-1.webp">
<img class="contain" src="thumbnails/thumbnail-1.webp">
```

![squashed, cropped, and letterboxed versions of the same image](02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/img/06-object-fit.png)

- **left, no `object-fit`:** squashed to fit the box. this is the default and it is almost never what u want.
- **middle, `cover`:** the image is scaled up until it fills the box and the overflow is cut off. nothing is distorted, some of the picture is gone. this is the one u want nearly every time.
- **right, `contain`:** the image is shrunk until the whole thing fits, leaving empty space above and below. nothing is distorted, nothing is lost, but u get gaps.
- `object-position: top` / `left` / `right` / `bottom` moves which part survives the crop, which matters when `cover` keeps cutting off someone's head.

---

## NOTES

1. **`alt` is not optional.** it is what a blind user hears, what search engines read, and what shows when the file is missing. for a purely decorative image write `alt=""` on purpose, which tells a screen reader to skip it. leave the attribute out and it reads the filename out loud instead.

2. **`<meta charset="UTF-8">`** goes in the head and stops accented characters and emoji turning into rubbish. paste it in every page.

3. **`<meta name="viewport" content="width=device-width, initial-scale=1">`** also goes in the head. without it a phone pretends to be a 980px desktop and shrinks ur whole page. it does nothing on a desktop, so u will not notice it is missing until u check on a phone. always have it.

4. **image formats:** `jpeg` for photos, `png` when u need transparency, `svg` for icons and logos because it is a drawing and stays sharp at any size, `webp` for photos when u care about file size. the asset pack for [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|chapter 12]] has all 4.

5. **an `<img>` sits on the text baseline**, which leaves a few mysterious pixels of space under it. `display: block` removes them. that is [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|chapter 7]], and ur own `.thumbnail` rule in [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) already has the line.

6. **u can have more than one stylesheet.** they are read in order and the later one wins, same rule as always.

---

## Assignment

> the exercises in this chapter follow [HTML & CSS Full Course](https://youtu.be/G3e-cpL7ofc?t=6738) by supersimple.dev, and the images part follows [the same course at 2:11:08](https://youtu.be/G3e-cpL7ofc?t=7868).

1. Take any page u made in chapter 4 and rewrite it with the full skeleton: doctype, html, head, body.
2. Give it a title and check the browser tab.
3. Move every line of ur css into a `styles.css` next to it, and link it from the head.
4. Break the `href` on purpose and reload. Write down what u see, and what u do **not** see.
5. Make a folder called `css`, move `styles.css` into it, and fix the path.
6. Put one of the thumbnails from the [youtube-clone folder](https://github.com/Mohamedattiadev/dev-101/tree/main/HTML-CSS-101/youtube-clone) on the page.
7. Make it 300px wide, and check what happened to its height without u asking.
8. Now set the height to 300px as well and look at what it did to the picture.
9. Keep the 300 by 300 box, but fix the picture with `object-fit`. Try `cover` and `contain` and decide which one u would ship.
10. Load Roboto from google fonts and put it on ur `<body>`.
11. Add an `alt` to the image, then break the `src`, and reload.

> stuck, or done and want to check? [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/solutions\|the solutions are here]]

> or see it finished: [the assignment is running here](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/live/05-the-page-shell/), as a real
> page u can scroll, hover and drag narrower. the **edit it** button on it
> opens the same code in [the playground](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/interactive/?c=05-objectfit).

---

[[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|← Chapter 4]] | [[02-Personal/11-Dev-101/HTML-CSS-101/index\|back to HTML & CSS 101]] | [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|next: Chapter 6 →]]
