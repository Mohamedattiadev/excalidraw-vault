---
title: "Chapter 12 — The YouTube Clone — Solutions"
aliases:
  - "11-Dev-101/HTML-CSS-101/12-the-youtube-clone/solutions"
  - "11-Dev-101/HTML-CSS-101/12-the-youtube-clone/solutions/index"
---

do the assignment first. reading the answer is not the same as doing it,
and u will feel like u learned it when u didn't.

[[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|back to the chapter]] &middot; [see it running](https://mohamedattiadev.github.io/dev-101/HTML-CSS-101/youtube-clone/Youtube.html)

---

the 4 stylesheets are in [[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|sections 3 to 8 of the chapter]], rule by rule, and the
finished files are [Youtube.html](https://github.com/Mohamedattiadev/dev-101/blob/main/HTML-CSS-101/youtube-clone/Youtube.html) and [styles/](https://github.com/Mohamedattiadev/dev-101/tree/main/HTML-CSS-101/youtube-clone/styles).
these are the answers to the parts u have to work out urself.

**5, the badge with `position: relative` deleted:**

![the badge has jumped to the corner of the page](02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/img/step2-badge-broken.png)

the badge jumps to the corner of the page. an absolute element measures from its
nearest positioned ancestor, and with `relative` gone there isn't one, so the page
takes the job. `.video-thumbnail-row` exists only to be that ancestor.

**9, the video grid with `padding-top` deleted:**

the first row of thumbnails goes behind the header. the header is `position: fixed`,
so it is out of the flow and the page does not know it is there. the padding is the
room u make for it by hand.

**8, the sidebar hover:**

```css
.side-button {
  transition: background-color 0.15s;
}
.side-button:hover {
  background-color: rgba(96, 97, 97, 0.2);
}
```

`transition` goes on the normal rule, not the `:hover` rule. put it on the hover and
it fades in and snaps out.

**the three layouts:**

![four cards across](02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/img/step4-sidebar.png)

![three cards across](02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/img/finished-3col.png)

![two cards across](02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/img/finished-2col.png)

---

## the things that go wrong

- **the search bar will not shrink.** it needs `width: 0` next to `flex: 1`. an
  `<input>` has a built in width that stops it collapsing.
- **the icons on the right get squashed when the window narrows.** the side groups
  need `flex-shrink: 0`.
- **the badge sits below the thumbnail instead of on it.** `bottom: 16px`, not `4px`.
  the thumbnail has `margin-bottom: 12px` and the badge measures from the bottom of
  the container, margin included.
- **there is a few pixels of grey under every thumbnail.** the image needs
  `display: block`. an `<img>` sits on the text baseline and leaves a gap under it.
- **the media queries do nothing.** they are above the `.video-grid` rule instead of
  below it, so the plain rule overwrites them.
- **it looks right on ur laptop and broken on ur phone.** no `<meta name="viewport">`.

---

[[02-Personal/11-Dev-101/HTML-CSS-101/12-the-youtube-clone/index\|back to the chapter]]
