---
title: "HTML & CSS 101 Cheat Sheet"
aliases:
  - "11-Dev-101/HTML-CSS-101/CHEATSHEET"
  - "11-Dev-101/HTML-CSS-101/CHEATSHEET/index"
---

Every tag and property in the course, on one page. This is the page to open in 6 months when u forget something.

If a line here does not make sense, the chapter link next to it is where it was explained.

[[02-Personal/11-Dev-101/HTML-CSS-101/index\|← back to HTML & CSS 101]]

---

## The page shell · [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|Chapter 5]]

```html
<!DOCTYPE html>                 <!-- use the modern rules. always line 1 -->
<html>
  <head>                        <!-- everything the user cannot see -->
    <meta charset="UTF-8">                  <!-- accents and emoji survive -->
    <meta name="viewport"
      content="width=device-width, initial-scale=1">   <!-- or no phone support -->
    <title>Text in the tab</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>                        <!-- everything the user can see -->
  </body>
</html>
```

## Filepaths · [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|Chapter 5]]

```
styles.css            next to the html file
css/styles.css        into the folder css, then the file
../styles.css         up one folder, then the file
```

## Elements · [[02-Personal/11-Dev-101/HTML-CSS-101/01-html-basics/index\|Chapter 1]] · [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|Chapter 6]]

```html
<p>a paragraph</p>
<button>a button</button>
<div>a block container. means nothing, holds things</div>
<span>an inline container, for one word in a sentence</span>
<a href="https://x.com">a link</a>
<a href="https://x.com" target="_blank">...opened in a new tab</a>
<img src="pics/cat.jpg" alt="a cat">          <!-- no closing tag -->
<input type="text" placeholder="Search">      <!-- no closing tag -->
<input type="checkbox" id="agree">
<label for="agree">clicking these words ticks the box</label>
<strong>important, and bold</strong>
<h1>page title</h1>   <!-- down to <h6>. one <h1> per page -->
<br>                  <!-- a line break. not for spacing -->
<!-- an html comment -->
```

## Semantic elements · [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Chapter 11]]

```html
<header> <nav> <main> <section> <article> <aside> <footer>
```

> they behave exactly like `<div>`. the difference is that screen readers and
> search engines can tell what part of the page they are looking at.

---

## Where css goes · [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|Chapter 2]] · [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Chapter 7]]

```html
<style> button { color: red; } </style>       <!-- in the head -->
<link rel="stylesheet" href="styles.css">     <!-- a separate file. use this -->
<div style="color: red;">                     <!-- inline. beats everything -->
```

```css
/* a css comment. <!-- --> does not work in a .css file */
```

## Selectors · [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|Chapter 2]] · [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|Chapter 4]] · [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Chapter 11]]

```css
p            { }      /* every <p> on the page */
.title       { }      /* every element with class="title" */
#thing       { }      /* the element with id="thing". avoid for styling */
*            { }      /* everything */
.a, .b, p    { }      /* all three of them */
.card p      { }      /* every <p> anywhere inside .card */
.card > p    { }      /* only a <p> that is a direct child of .card */
.btn:hover   { }      /* while the mouse is on it */
.btn:active  { }      /* while the mouse is held down */
.btn:focus   { }      /* while it is selected by keyboard */
.card:hover .tip { }  /* .tip, but only while the mouse is on .card */
input::placeholder { }/* the grey hint text. 2 colons = a pseudo-ELEMENT */
```

> **who wins:** inline style, then class, then element name, then inherited.
> more specific beats less specific whatever the order. order is only the tie
> breaker. [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Chapter 11]]

---

## Colour values · [[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|Chapter 3]]

```css
color: red;                     /* about 150 names exist */
color: rgb(0, 150, 255);        /* red, green, blue. each 0 to 255 */
color: #0096FF;                 /* the same 3 numbers in base 16 */
color: #FFF;                    /* short form of #FFFFFF */
color: rgba(0, 0, 0, 0.5);      /* the 4th number is how see-through */
color: transparent;
```

## Measurement values · [[02-Personal/11-Dev-101/HTML-CSS-101/03-colors-and-sizes/index\|Chapter 3]]

```css
width: 200px;      /* fixed. dots on the screen */
width: 50%;        /* of the container, not the screen */
width: 10em;       /* 10 x THIS element's font-size */
width: 10rem;      /* 10 x the PAGE's font-size, 16px by default */
height: 100vh;     /* exactly one screen tall */
```

> a number with no unit is a dead line, silently. `0` is the one exception.

---

## The properties u start with · [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|Chapter 2]]

```css
background-color: red;
color: white;              /* the TEXT colour */
height: 36px;
width: 105px;
border: none;
border-radius: 2px;        /* half the height = fully round ends */
cursor: pointer;           /* the hand. put it on anything clickable */
opacity: 0.5;              /* the whole element, text included */
```

## Borders · [[02-Personal/11-Dev-101/HTML-CSS-101/02-css-basics/index\|Chapter 2]] · [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Chapter 7]]

```css
border-width: 1px;
border-style: solid;       /* or dotted, dashed. NO style = no border */
border-color: red;
border: 1px solid red;     /* the shorthand for all 3 */
border-bottom: 1px solid #e5e7eb;    /* one side only */
```

## Text · [[02-Personal/11-Dev-101/HTML-CSS-101/06-text-and-inputs/index\|Chapter 6]]

```css
font-family: Roboto, Verdana, Arial;  /* a fallback list, in order */
font-size: 30px;
font-weight: bold;         /* or 100..900. only weights the font HAS */
font-style: italic;
text-align: center;        /* moves the words, NOT the element */
text-decoration: none;     /* kills the underline on a link */
line-height: 1.5;          /* space between lines. ~1.5 reads well */
text-transform: uppercase;
white-space: nowrap;       /* never wrap. it will overflow instead */
```

> text properties inherit from the parent. box properties do not. form controls
> do not inherit the font: `font-family: inherit` opts them back in.

## Images · [[02-Personal/11-Dev-101/HTML-CSS-101/05-the-page-shell/index\|Chapter 5]]

```css
width: 300px;              /* set ONE of width/height and the shape is kept */
object-fit: cover;         /* fill the box, crop the overflow. usually right */
object-fit: contain;       /* fit the whole image, leave gaps */
display: block;            /* kills the mystery gap under an <img> */
```

---

## The box model · [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Chapter 7]]

```
margin  |  border  |  padding  |  content
outside    the line   inside      the words
```

```css
margin: 10px;                    /* all 4 sides */
margin: 10px 20px;               /* top+bottom, then left+right */
margin: 5px 10px 15px 20px;      /* top, right, bottom, left. clockwise */
margin-right: -20px;             /* negative pulls. padding cannot */
margin: 0 auto;                  /* centres a block that HAS a width */
padding: 10px;                   /* same 4 shorthands */

body { margin: 0; }              /* the reset. first line of most stylesheets */
p { margin-top: 0; margin-bottom: 0; }

* { box-sizing: border-box; }    /* width means the WHOLE box */
```

> padding gets the background colour. margin does not. that is how u tell them
> apart on screen.

## Display · [[02-Personal/11-Dev-101/HTML-CSS-101/07-display-and-the-box-model/index\|Chapter 7]]

```css
display: block;         /* takes the whole line. width and height work */
display: inline-block;  /* takes what it needs. width and height work */
display: inline;        /* flows in a line of text. width is IGNORED */
display: none;          /* gone. no space left behind */
vertical-align: top;    /* stops inline-blocks sitting on the text baseline */
```

---

## Grid · [[02-Personal/11-Dev-101/HTML-CSS-101/08-css-grid/index\|Chapter 8]]

```css
.container {
  display: grid;
  grid-template-columns: 100px 100px;   /* 2 fixed columns */
  grid-template-columns: 1fr 1fr;       /* 2 equal, filling the space */
  grid-template-columns: 1fr 2fr;       /* the 2nd gets twice as much */
  grid-template-columns: 100px 1fr;     /* fixed sidebar, flexible rest */
  grid-template-columns: repeat(3, 1fr);
  column-gap: 20px;
  row-gap: 40px;
  gap: 20px;                            /* both at once */
  justify-content: center;              /* across. only if there is spare room */
  align-items: center;                  /* down. default is stretch */
}
```

> u never say how many rows. items wrap onto new ones by themselves, which is
> why a grid of unknown things is a grid and not a flexbox.

## Flexbox · [[02-Personal/11-Dev-101/HTML-CSS-101/09-flexbox/index\|Chapter 9]]

```css
.container {
  display: flex;
  flex-direction: row;        /* the default. a line of things */
  flex-direction: column;     /* a stack. justify and align now SWAP jobs */
  justify-content: space-between;   /* along the direction */
  align-items: center;              /* across the direction */
  gap: 20px;
  flex-wrap: wrap;            /* drop onto a new line instead of shrinking */
}

.child {
  flex: 1;             /* take the leftover space. 2 takes twice as much */
  flex-shrink: 0;      /* never squash me. for icons, avatars, logos */
  width: 0;            /* with flex: 1, lets an <input> actually shrink */
  align-self: center;  /* override align-items for this one child */
  margin-left: auto;   /* push me and everything after me to the far end */
}
```

> **in a row:** justify is horizontal, align is vertical.
> **in a column:** they swap. this is the whole difficulty of flexbox.

---

## Position · [[02-Personal/11-Dev-101/HTML-CSS-101/10-position/index\|Chapter 10]]

```css
position: static;    /* the default. top/right/bottom/left do NOTHING */
position: fixed;     /* pinned to the WINDOW. survives scrolling */
position: absolute;  /* pinned to the PAGE. scrolls away */
position: relative;  /* stays in the flow, then nudge it */
position: sticky;    /* relative, then fixed once u scroll past it */

top: 0;  right: 10px;  bottom: 0;  left: 50px;
                     /* set 2 OPPOSITE sides and it stretches to reach both */
z-index: 100;        /* higher is in front. needs a position to work */
```

> **the corner trick:** `position: relative` on the parent,
> `position: absolute` on the child. that is a badge on a thumbnail, a close
> button on a dialog, a dot on an icon.

> a fixed header is out of the flow, so nothing makes room for it. add
> `padding-top` to whatever is underneath.

---

## Responsive · [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Chapter 11]]

```css
.grid { grid-template-columns: 1fr 1fr 1fr; }

@media (max-width: 750px) {          /* 750px and narrower */
  .grid { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1050px) {         /* 1050px and wider */
  .grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
}
@media (min-width: 750.02px) and (max-width: 1000px) { }   /* a band */
```

> media queries go **after** the rule they overwrite, or they lose. and they do
> nothing on a phone without the `<meta name="viewport">` tag.

## States and motion · [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|Chapter 4]]

```css
.btn {
  transition: background-color 0.15s;          /* on the NORMAL rule */
  transition: background-color 0.15s, color 0.15s;
  box-shadow: 3px 4px 5px black;               /* right, down, blur, colour */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);  /* the floating look */
}
.btn:hover { background-color: darkred; }
```

## The two odd ones · [[02-Personal/11-Dev-101/HTML-CSS-101/11-responsive-design/index\|Chapter 11]]

```css
pointer-events: none;   /* the mouse passes straight through */
white-space: nowrap;    /* never wrap this text */
```

---

## Devtools · [[02-Personal/11-Dev-101/HTML-CSS-101/04-classes-and-states/index\|Chapter 4]]

```
right click > Inspect     open it
Ctrl+Shift+M              phone sizes, for testing media queries
Ctrl+U                    the raw html of any page on the internet
Ctrl+R  /  F5             reload. the browser does not notice u saved
```

- a declaration with a **line through it** is dead: misspelled, or beaten by a
  more specific rule.
- click any number and arrow-key it up and down to find the value u want.
- the **box model diagram** at the bottom of the Styles panel names which of
  the 4 layers is making ur gap the wrong size.
- **`:hov`** forces `:hover` on and holds it, so u can style a hover without
  keeping ur mouse still.
- the **`grid`** and **`flex`** badges next to a container draw its lines and
  its free space on the page.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/index\|← back to HTML & CSS 101]]
