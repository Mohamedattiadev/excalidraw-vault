/*

# About the slideshow script
The script will convert your drawing into a slideshow presentation.
![Slideshow 3.0](https://www.youtube.com/JwgtCrIVeEU)

![](https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/images/scripts-slideshow-2.jpg)
## Presentation options
- If you select an arrow or line element, the script will use that as the presentation path.
- If you select nothing, but the file has a hidden presentation path, the script will use that for determining the slide sequence.
- If there are frames, the script will use the frames for the presentation. Frames are played in alphabetical order of their titles.
# Keyboard shortcuts and modifier keys
**Forward**: Arrow Down, Arrow Right, or SPACE
**Backward**: Arrow Up, Arrow Left
**Finish presentation**: Backspace, ESC (I had issues with ESC not working in full screen presentation mode on Mac)

**Run presentation in a window**: Hold down the ALT/OPT modifier key when clicking the presentation script button
**Continue presentation**: Hold down SHIFT when clicking the presentation script button. (The feature also works in combination with the ALT/OPT modifier to start the presentation in a window). The feature will only resume while you are within the same Obsidian session (i.e. if you restart Obsidian, slideshow will no longer remember where you were). I have two use cases in mind for this feature: 
1) When you are designing your presentation you may want to test how a slide looks. Using this feature you can get back to where you left off by starting the presentation with SHIFT.
2) During presentation you may want to exit presentation mode to show something additional to your audience. You stop the presentation, show the additional thing you wanted, now you want to continue from where you left off. Hold down SHIFT when clicking the slideshow button.

```javascript
*/
if(!ea.verifyMinimumPluginVersion || !ea.verifyMinimumPluginVersion("2.8.0")) {
  new Notice("This script requires a newer version of Excalidraw. Please install the latest version.");
  return;
}

if(ea.targetView.isDirty()) {
  ea.targetView.forceSave(true);
}

const hostLeaf = ea.targetView.leaf;
const hostView = hostLeaf.view;
const statusBarElement = document.querySelector("div.status-bar");
const ctrlKey = ea.targetView.modifierKeyDown.ctrlKey || ea.targetView.modifierKeyDown.metaKey;
const altKey = ea.targetView.modifierKeyDown.altKey || ctrlKey;
const shiftKey = ea.targetView.modifierKeyDown.shiftKey;
const shouldStartWithLastSlide = shiftKey && window.ExcalidrawSlideshow &&
      (window.ExcalidrawSlideshow.script === utils.scriptFile.path) && (typeof window.ExcalidrawSlideshow.slide?.[ea.targetView.file.path] === "number")
//-------------------------------
//constants
//-------------------------------
const TRANSITION_STEP_COUNT = 100;
const TRANSITION_DELAY = 500;   // Phase 1: was 1000ms — snappier feel
const FRAME_SLEEP = 1; //milliseconds
const EDIT_ZOOMOUT = 0.7; //70% of original slide zoom, set to a value between 1 and 0
const FADE_LEVEL = 0.55;        // Phase 1: was 0.1 — keep panel readable
const PRINT_SLIDE_WIDTH = 1920;
const PRINT_SLIDE_HEIGHT = 1080;
const MAX_ZOOM = 30; //3000%
//using outerHTML because the SVG object returned by Obsidin is in the main workspace window
//but excalidraw might be open in a popout window which has a different document object
const SVG_COG = ea.obsidian.getIcon("lucide-settings").outerHTML;
const SVG_FINISH = ea.obsidian.getIcon("lucide-x").outerHTML;
const SVG_RIGHT_ARROW = ea.obsidian.getIcon("lucide-arrow-right").outerHTML;
const SVG_LEFT_ARROW = ea.obsidian.getIcon("lucide-arrow-left").outerHTML;
const SVG_EDIT = ea.obsidian.getIcon("lucide-pencil").outerHTML;
const SVG_MAXIMIZE = ea.obsidian.getIcon("lucide-maximize").outerHTML;
const SVG_MINIMIZE = ea.obsidian.getIcon("lucide-minimize").outerHTML;
const SVG_LASER_ON = ea.obsidian.getIcon("lucide-hand").outerHTML;
const SVG_LASER_OFF = ea.obsidian.getIcon("lucide-wand").outerHTML;
const SVG_PRINTER = ea.obsidian.getIcon("lucide-printer").outerHTML;
const SVG_REFOCUS = ea.obsidian.getIcon("lucide-scan-eye").outerHTML;
const SVG_NOTES = ea.obsidian.getIcon("lucide-sticky-note").outerHTML;
const SVG_THUMBS = ea.obsidian.getIcon("lucide-layout-grid").outerHTML;
const SVG_INK = ea.obsidian.getIcon("lucide-pen-line").outerHTML;
const SVG_INK_OFF = ea.obsidian.getIcon("lucide-eraser").outerHTML;
const SVG_HELP = ea.obsidian.getIcon("lucide-keyboard").outerHTML;
// Fallback chain — some Obsidian builds don't ship every icon. Guard so
// .outerHTML on null doesn't crash the whole script.
const safeIcon = (...names) => {
  for (const n of names) {
    try { const i = ea.obsidian.getIcon(n); if (i) return i.outerHTML; } catch (_) {}
  }
  return "";
};
const SVG_TRASH = safeIcon("lucide-trash-2", "lucide-trash");
const SVG_STICKY = safeIcon("lucide-message-square", "lucide-message-square-text", "lucide-square-pen");
const SVG_PEN_COLOR = safeIcon("lucide-palette", "lucide-paint-bucket", "lucide-droplet") || "<span>▾</span>";
const SVG_QR = safeIcon("lucide-qr-code", "lucide-scan-line", "lucide-smartphone") || "<span>QR</span>";

//-------------------------------
//utility & convenience functions
//-------------------------------
let shouldSaveAfterThePresentation = false;
let isLaserOn = false;
let slide = shouldStartWithLastSlide ? window.ExcalidrawSlideshow.slide?.[ea.targetView.file.path] : 0;
let isFullscreen = false;
const ownerDocument = ea.targetView.ownerDocument;
// Never auto-fullscreen. User toggles with 'f' or fullscreen button.
const startFullscreen = false;

//The plugin and Obsidian App run in the window object
//When Excalidraw is open in a popout window, the Excalidraw component will run in the ownerWindow
//and in this case ownerWindow !== window
//For this reason event handlers are distributed between window and owner window depending on their role
const ownerWindow = ea.targetView.ownerWindow;
const excalidrawAPI = ea.getExcalidrawAPI();
const frameRenderingOriginalState = excalidrawAPI.getAppState().frameRendering;
const contentEl = ea.targetView.contentEl;
const sleep = async (ms) => new Promise((resolve) => ownerWindow.setTimeout(resolve, ms));
const getFrameName = (name, index) => name ?? `Frame ${(index+1).toString().padStart(2, '0')}`;
// Mount target for all slideshow overlays. .excalidraw scopes theme CSS
// vars (--island-bg-color etc.) — mounting on body strips them. Fallback
// to body if not yet present (very early init).
const getMountRoot = () => contentEl.querySelector(".excalidraw") || ownerDocument.body;
// Honor reduced-motion at runtime (CSS handles most; this gates JS RAF
// transitions to ~instant).
const prefersReducedMotion = ownerWindow.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

//-------------------------------
//clean up potential clutter from previous run
//-------------------------------
window.removePresentationEventHandlers?.();

//1. check if line or arrow is selected, if not check if frames are available, if not inform the user and terminate presentation
let presentationPathLineEl = ea.getViewElements()
  .filter(el=>["line","arrow"].contains(el.type) && el.customData?.slideshow)[0];

const frameClones = [];
ea.getViewElements().filter(el=>el.type==="frame").forEach(f=>frameClones.push(ea.cloneElement(f)));
for(i=0;i<frameClones.length;i++) {
  frameClones[i].name = getFrameName(frameClones[i].name,i);
}
let frames = frameClones
  .sort((el1,el2)=> el1.name > el2.name ? 1:-1); 

let presentationPathType = "line"; // "frame"
const selectedEl = ea.getViewSelectedElement();
let shouldHideArrowAfterPresentation = true; //this controls if the hide arrow button is available in settings
if(presentationPathLineEl && selectedEl && ["line","arrow"].contains(selectedEl.type)) {
  excalidrawAPI.setToast({
    message:"Using selected line instead of hidden line. Note that there is a hidden presentation path for this drawing. Run the slideshow script without selecting any elements to access the hidden presentation path",
    duration: 5000,
    closable: true
  })
  shouldHideArrowAfterPresentation = false;
  presentationPathLineEl = selectedEl;
}
if(!presentationPathLineEl) presentationPathLineEl = selectedEl;
if(!presentationPathLineEl || !["line","arrow"].contains(presentationPathLineEl.type)) {
	if(frames.length > 0) {
	  presentationPathType = "frame";
	} else {
	  excalidrawAPI.setToast({
	    message:"Please select the line or arrow for the presentation path or add frames.",
	    duration: 3000,
	    closable: true
	  })
	  return;
	}
}

//---------------------------------------------
// generate slides[] array
//---------------------------------------------
let slides = [];

if(presentationPathType === "line") {
	const getLineSlideRect = ({pointA, pointB}) => {
	  const x1 = presentationPathLineEl.x+pointA[0];
	  const y1 = presentationPathLineEl.y+pointA[1];
	  const x2 = presentationPathLineEl.x+pointB[0];
	  const y2 = presentationPathLineEl.y+pointB[1];
	  return { x1, y1, x2, y2};
	}
	
	const slideCount = Math.floor(presentationPathLineEl.points.length/2)-1;
	for(i=0;i<=slideCount;i++) {
	  slides.push(getLineSlideRect({
	    pointA:presentationPathLineEl.points[i*2],
	    pointB:presentationPathLineEl.points[i*2+1]
	  }))
	}
}

if(presentationPathType === "frame") {
	for(frame of frames) {
		slides.push({
		  x1: frame.x,
		  y1: frame.y,
		  x2: frame.x + frame.width,
		  y2: frame.y + frame.height
		});
	}
	if(frameRenderingOriginalState.enabled) {
  	excalidrawAPI.updateScene({
	    appState: {
	      frameRendering: {
	        ...frameRenderingOriginalState,
	        enabled: false
	      }
	    }
	  });
	}
}

//---------------------------------------
// Toggle fullscreen
//---------------------------------------
let toggleFullscreenButton;
let controlPanelEl;
let selectSlideDropdown;

const resetControlPanelElPosition = ({ refit = false } = {}) => {
  if(!controlPanelEl) return;
  const top = contentEl.innerHeight;
  const left = contentEl.innerWidth/2;
  // Width-independent centering: translateX(-50%) means new buttons
  // (notes, thumbs) don't shift the panel off-center.
  controlPanelEl.style.top = `calc(${top}px - var(--default-button-size)*2.4)`;
  controlPanelEl.style.left = `${left}px`;
  controlPanelEl.style.transform = "translateX(-50%)";
  // Re-fit only when caller explicitly asks (entering fullscreen so the
  // slide rect re-fits the new viewport). On exit we keep the current
  // viewport untouched so the user doesn't get an unwanted pan/zoom.
  if (refit) {
    slide--;
    navigate("fwd");
  }
}

const waitForExcalidrawResize = async () => {
  await sleep(100);
	const deltaWidth = () => Math.abs(contentEl.clientWidth-excalidrawAPI.getAppState().width);
	const deltaHeight = () => Math.abs(contentEl.clientHeight-excalidrawAPI.getAppState().height);
	let watchdog = 0;
	while ((deltaWidth()>50 || deltaHeight()>50) && watchdog++<20) await sleep(50); //wait for Excalidraw to resize to fullscreen
}

let preventFullscreenExit = true;
const gotoFullscreen = async () => {
  if(isFullscreen) return;
  preventFullscreenExit = true;
	if(ea.DEVICE.isMobile) {
	  ea.viewToggleFullScreen();
	} else {
		await contentEl.webkitRequestFullscreen();
	}
	await waitForExcalidrawResize();
	// Keyboard Lock: take ownership of Escape so the browser doesn't
	// auto-exit fullscreen when the user presses it. Our handler stays
	// in control and can pop overlays / deactivate tools first.
	try { await ownerWindow.navigator.keyboard?.lock?.(["Escape"]); } catch (_) {}
	const layerUIWrapper = contentEl.querySelector(".layer-ui__wrapper");
	if(!layerUIWrapper?.hasClass("excalidraw-hidden")) layerUIWrapper.addClass("excalidraw-hidden");
	if(toggleFullscreenButton) toggleFullscreenButton.innerHTML = SVG_MINIMIZE;
	resetControlPanelElPosition({ refit: true });
	isFullscreen = true;
}

const exitFullscreen = async () => {
  if(!isFullscreen) return;
  preventFullscreenExit = true;
  try { ownerWindow.navigator.keyboard?.unlock?.(); } catch (_) {}
  if(!ea.DEVICE.isMobile && ownerDocument?.fullscreenElement) await ownerDocument.exitFullscreen();
  if(ea.DEVICE.isMobile) ea.viewToggleFullScreen();
  if(toggleFullscreenButton) toggleFullscreenButton.innerHTML = SVG_MAXIMIZE;
  await waitForExcalidrawResize();
  resetControlPanelElPosition();
  isFullscreen = false;
}

const toggleFullscreen = async () => {
 if (isFullscreen) {
   await exitFullscreen();
 } else {
	 await gotoFullscreen();
 }
}

//-----------------------------------------------------
// hide the arrow for the duration of the presentation
// and save the arrow color before doing so
//-----------------------------------------------------
let isHidden;
let originalProps;
const toggleArrowVisibility = async (setToHidden) => {
	ea.clear();
	ea.copyViewElementsToEAforEditing(ea.getViewElements().filter(el=>el.id === presentationPathLineEl.id));
	const el = ea.getElement(presentationPathLineEl.id);
	el.strokeColor = "transparent";
	el.backgroundColor = "transparent";
	const customData = el.customData;
	if(setToHidden && shouldHideArrowAfterPresentation) {
		el.locked = true;
		el.customData = {
			...customData,
			slideshow: {
				originalProps,
				hidden: true
			}
		}
		isHidden = true;
	} else {
		if(customData) delete el.customData.slideshow;
		isHidden = false;
	}
	await ea.addElementsToView();
}

if(presentationPathType==="line") {
	originalProps = presentationPathLineEl.customData?.slideshow?.hidden
	  ? presentationPathLineEl.customData.slideshow.originalProps
	  : {
		  strokeColor: presentationPathLineEl.strokeColor,
		  backgroundColor: presentationPathLineEl.backgroundColor,
		  locked: presentationPathLineEl.locked,
	  };
	isHidden = presentationPathLineEl.customData?.slideshow?.hidden ?? false;
}

//-----------------------------
// scroll-to-location functions
//-----------------------------
const getNavigationRect = ({ x1, y1, x2, y2, printDimensions }) => {
  const { width, height } = printDimensions ? printDimensions : excalidrawAPI.getAppState();
  const ratioX = width / Math.abs(x1 - x2);
  const ratioY = height / Math.abs(y1 - y2);
  let ratio = Math.min(Math.max(ratioX, ratioY), MAX_ZOOM);

  const scaledWidth = Math.abs(x1 - x2) * ratio;
  const scaledHeight = Math.abs(y1 - y2) * ratio;

  if (scaledWidth > width || scaledHeight > height) {
    ratio = Math.min(width / Math.abs(x1 - x2), height / Math.abs(y1 - y2));
  }

  const deltaX = (width / ratio - Math.abs(x1 - x2)) / 2;
  const deltaY = (height / ratio - Math.abs(y1 - y2)) / 2;

  return {
    left: (x1 < x2 ? x1 : x2) - deltaX,
    top: (y1 < y2 ? y1 : y2) - deltaY,
    right: (x1 < x2 ? x2 : x1) + deltaX,
    bottom: (y1 < y2 ? y2 : y1) + deltaY,
    nextZoom: ratio,
  };
};

const getNextSlideRect = (forward) => {
  slide = forward
    ? slide < slides.length-1 ? slide + 1     : 0
    : slide <= 0            ? slides.length-1 : slide - 1;
	return getNavigationRect(slides[slide]);
}

let busy = false;
// Phase 1 (2026-06-04): rAF-driven transition with cubic ease-in-out.
// The original 100-step setTimeout cascade was visibly clucky on heavy
// scenes. Hand off to requestAnimationFrame for vsynced updates with
// a proper easing curve.
//
// IMPORTANT: cancellation must resolve the pending promise, otherwise
// `busy` stays true and the next navigation blocks until a 750 ms
// watchdog kicks in. We track the current transition's resolve fn in
// a module-level handle and call it from cancelCurrentTransition()
// before starting a new one.
let currentTransition = null;
const easeInOutCubic = (t) => t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2;
const cancelCurrentTransition = () => {
  if (!currentTransition) return;
  try { ownerWindow.cancelAnimationFrame(currentTransition.handle); } catch (_) {}
  const fn = currentTransition.resolve;
  currentTransition = null;
  busy = false;
  try { fn?.(); } catch (_) {}
};
const scrollToNextRect = async ({left,top,right,bottom,nextZoom}) => {
  cancelCurrentTransition();
  busy = true;
  excalidrawAPI.updateScene({appState:{shouldCacheIgnoreZoom:true}});
  const {scrollX:startSX, scrollY:startSY, zoom:startZoom} = excalidrawAPI.getAppState();
  const startZ = startZoom.value;
  const endSX = startSX - (left + startSX);
  const endSY = startSY - (top  + startSY);
  const dSX  = endSX - startSX;
  const dSY  = endSY - startSY;
  const dZ   = nextZoom - startZ;
  const t0   = performance.now();
  const ctx = { handle: 0, resolve: null, done: false };
  currentTransition = ctx;
  const duration = prefersReducedMotion ? 1 : TRANSITION_DELAY;
  await new Promise((resolve) => {
    ctx.resolve = resolve;
    const step = (now) => {
      if (ctx.done) return;
      const elapsed = now - t0;
      const tRaw = Math.min(1, elapsed / duration);
      const t = easeInOutCubic(tRaw);
      excalidrawAPI.updateScene({
        appState: {
          scrollX: startSX + dSX * t,
          scrollY: startSY + dSY * t,
          zoom:    { value: startZ + dZ * t },
        }
      });
      if (tRaw < 1) {
        ctx.handle = ownerWindow.requestAnimationFrame(step);
      } else {
        ctx.done = true;
        currentTransition = null;
        resolve();
      }
    };
    ctx.handle = ownerWindow.requestAnimationFrame(step);
  });
  excalidrawAPI.updateScene({appState:{shouldCacheIgnoreZoom:false}});
  if(isLaserOn) {
    excalidrawAPI.setActiveTool({type: "laser"});
  }
  busy = false;
}

const navigate = async (dir) => {
  const forward = dir === "fwd";
  const prevSlide = slide;
  const nextRect = getNextSlideRect(forward);

  //exit if user navigates from last slide forward or first slide backward
  const shouldExit = forward
    ? slide<=prevSlide
    : slide>=prevSlide;
  if(shouldExit) {
    // Revert wrap-around; stay on the boundary slide and prompt.
    slide = prevSlide;
    showEndConfirm(dir);
    return;
  }
  closeEndConfirm();
  if(selectSlideDropdown) selectSlideDropdown.value = slide+1;
  if(notesVisible && notesEl) {
    notesEl.querySelector(".notes-label").textContent = `Speaker notes — slide ${slide+1}`;
    renderNotes();
  }
  if (thumbsVisible) highlightActiveThumb();
  // Ink follows the slide: stash current strokes under the slide we're
  // leaving, restore the strokes for the slide we're entering. User
  // explicitly opts to wipe via 'c' / trash button.
  swapInkForSlide(prevSlide, slide);
  await scrollToNextRect(nextRect);
  if(window.ExcalidrawSlideshow && (typeof window.ExcalidrawSlideshow.slide?.[ea.targetView.file.path] === "number")) {
    window.ExcalidrawSlideshow.slide[ea.targetView.file.path] = slide;
  }
}

const navigateToSlide = (slideNumber) => {
  if(slideNumber > slides.length) slideNumber = slides.length;
  if(slideNumber < 1) slideNumber = 1;
  slide = slideNumber - 2;
  navigate("fwd");
}

//--------------------------------------
// Slideshow control panel
//--------------------------------------
let controlPanelFadeTimeout = 0;
const setFadeTimeout = (delay) => {
  delay = delay ?? TRANSITION_DELAY;
  controlPanelFadeTimeout = ownerWindow.setTimeout(()=>{
    controlPanelFadeTimeout = 0;
    if(ownerDocument.activeElement === selectSlideDropdown) {
      setFadeTimeout(delay);
      return;
    }
	  controlPanelEl.style.opacity = FADE_LEVEL;
  },delay);
}
const clearFadeTimeout = () => {
  if(controlPanelFadeTimeout) {
	  ownerWindow.clearTimeout(controlPanelFadeTimeout);
	  controlPanelFadeTimeout = 0;
  }
  controlPanelEl.style.opacity = 1;
}

// Phase 1 (2026-06-04): inject one-shot polish stylesheet for the
// control panel. Targets the existing markup so we don't have to
// rewrite createPresentationNavigationPanel — just upgrade the look.
const STYLE_PANEL_ID = "excalidraw-slideshow-panel-polish";
if (!ownerDocument.getElementById(STYLE_PANEL_ID)) {
  const s = ownerDocument.createElement("style");
  s.id = STYLE_PANEL_ID;
  s.textContent = `
    @keyframes excali-slideshow-panel-in {
      from { opacity: 0; transform: translate(-50%, 8px); }
      to   { opacity: 1; transform: translate(-50%, 0);   }
    }
    @keyframes excali-slideshow-overlay-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .excalidraw-presentation-panel {
      transition: opacity 220ms cubic-bezier(.4,0,.2,1);
      will-change: opacity;
      animation: excali-slideshow-panel-in 260ms cubic-bezier(.16,1,.3,1) both;
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.28));
      contain: layout style;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-presentation-panel { animation-duration: 1ms !important; transition: none !important; }
    }
    .excalidraw-presentation-panel .panelColumn { width: 100%; }
    /* Native-style island. Mirrors canvasActions / zoom-actions sizing
       using Excalidraw's own CSS vars so it tracks theme density. */
    .excalidraw-presentation-panel .Island.buttonList {
      height: auto !important;
      gap: 0 !important;
      padding: 4px !important;
      border-radius: 8px !important;
      background: var(--island-bg-color) !important;
      box-shadow: var(--shadow-island, 0 1px 4px rgba(0,0,0,0.14)) !important;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 12%, transparent)) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: var(--icon-fill-color) !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 100ms ease;
    }
    .excalidraw-presentation-panel .Island.buttonList button:hover {
      background: var(--button-hover-bg,
        color-mix(in srgb, var(--icon-fill-color) 12%, transparent)) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button:active {
      background: color-mix(in srgb, var(--icon-fill-color) 20%, transparent) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button.is-active {
      background: var(--color-primary, var(--interactive-accent, var(--icon-fill-color))) !important;
      color: var(--color-on-primary, var(--text-on-accent, #fff)) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button.is-active svg {
      stroke: var(--color-on-primary, var(--text-on-accent, #fff)) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button.is-armed {
      background: color-mix(in srgb, #d83a3a 80%, transparent) !important;
      color: #fff !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button.is-armed svg {
      stroke: #fff !important;
    }
    .excalidraw-presentation-panel .Island.buttonList button svg {
      width: 15px;
      height: 15px;
      stroke: var(--icon-fill-color);
    }
    /* Secondary buttons live inside the main panel only as a holding pen.
       Hidden until the overflow popover moves them out. */
    .excalidraw-presentation-panel .Island.buttonList button[data-secondary] {
      display: none !important;
    }
    .excalidraw-slideshow-overflow {
      position: fixed;
      z-index: 99997;
      display: inline-flex;
      gap: 2px;
      padding: 6px;
      background: var(--island-bg-color, var(--background-primary));
      border: 1px solid var(--default-border-color);
      border-radius: 10px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.35);
      animation: excali-slideshow-overlay-in 160ms cubic-bezier(.16,1,.3,1) both;
    }
    .excalidraw-slideshow-overflow button {
      width: 30px !important;
      height: 30px !important;
      min-width: 30px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: var(--text-normal, var(--icon-fill-color)) !important;
      cursor: pointer;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      transition: background 100ms ease;
    }
    .excalidraw-slideshow-overflow button[data-secondary] {
      display: inline-flex !important;
    }
    .excalidraw-slideshow-overflow button:hover {
      background: color-mix(in srgb, var(--icon-fill-color) 14%, transparent) !important;
    }
    .excalidraw-slideshow-overflow button.is-active {
      background: var(--interactive-accent, var(--icon-fill-color)) !important;
      color: var(--text-on-accent, #fff) !important;
    }
    .excalidraw-slideshow-overflow button svg {
      width: 16px !important;
      height: 16px !important;
      stroke: var(--text-normal, var(--icon-fill-color)) !important;
      fill: none !important;
    }
    .excalidraw-slideshow-overflow button.is-active svg {
      stroke: var(--text-on-accent, #fff) !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-overflow { animation-duration: 1ms !important; }
    }
    .excalidraw-presentation-panel .excali-slide-select-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      margin: 0 4px;
    }
    .excalidraw-presentation-panel .excali-slide-select-wrap::after {
      /* CSS-mask chevron so the color always tracks --icon-fill-color */
      content: "";
      position: absolute;
      right: 7px;
      top: 50%;
      width: 10px;
      height: 10px;
      transform: translateY(-50%);
      pointer-events: none;
      background-color: var(--icon-fill-color);
      -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 5l3 3 3-3'/></svg>") center / contain no-repeat;
              mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 5l3 3 3-3'/></svg>") center / contain no-repeat;
    }
    .excalidraw-presentation-panel .Island.buttonList select {
      height: 24px;
      min-width: 96px;
      max-width: 160px;
      padding: 0 24px 0 10px !important;
      border-radius: 6px !important;
      background-color: var(--background-secondary, color-mix(in srgb, var(--icon-fill-color) 18%, transparent)) !important;
      background-image: none !important;
      color: var(--text-normal, #1a1a1a) !important;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 28%, transparent)) !important;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
      cursor: pointer;
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      text-align: center;
      text-align-last: center;
      text-overflow: ellipsis;
      transition: background-color 120ms ease, border-color 120ms ease;
    }
    .excalidraw-presentation-panel .Island.buttonList select:hover {
      background-color: var(--background-modifier-hover, color-mix(in srgb, var(--icon-fill-color) 28%, transparent)) !important;
      border-color: color-mix(in srgb, var(--icon-fill-color) 40%, transparent) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList select:focus {
      outline: none !important;
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--interactive-accent, var(--icon-fill-color)) 36%, transparent) !important;
    }
    .excalidraw-presentation-panel .Island.buttonList select option {
      background: var(--background-primary, #ffffff) !important;
      color: var(--text-normal, #1a1a1a) !important;
      padding: 6px;
      font-weight: 600;
    }
    .excalidraw-presentation-panel .Island.buttonList > div[style*="background-color: var(--default-border-color)"] {
      width: 1px !important;
      height: 18px !important;
      opacity: 0.35;
      margin: 0 4px !important;
      background: var(--icon-fill-color) !important;
    }
  `;
  ownerDocument.head.appendChild(s);
}

const createPresentationNavigationPanel = () => {
  //create slideshow controlpanel container
  const top = contentEl.innerHeight; 
  const left = contentEl.innerWidth/2; 
  controlPanelEl = contentEl.querySelector(".excalidraw").createDiv({
    cls: ["excalidraw-presentation-panel"],
    attr: {
      style: `
        width: fit-content;
        z-index:5;
        position: absolute;
        top:calc(${top}px - var(--default-button-size)*2);
        left:calc(${left}px - var(--default-button-size)*5);`
    }
  });
  setFadeTimeout(TRANSITION_DELAY*3);
  
  const panelColumn = controlPanelEl.createDiv({
    cls: "panelColumn",
  });
  
	panelColumn.createDiv({
	  cls: ["Island", "buttonList"],
	  attr: {
	    style: `
	      max-width: unset;
	      justify-content: space-between;
	      height: calc(var(--default-button-size)*1.5);
	      width: 100%;
	      background: var(--island-bg-color);
	      display: flex;
	      align-items: center;`,
	  }
	}, el=>{
	  el.createEl("style", 
	    { text: ` select:focus { box-shadow: var(--input-shadow);} `});
	  el.createEl("button",{
	    attr: {
	      style: `
	        margin-left: calc(var(--default-button-size)*0.25);`,
	      "aria-label": "Previous slide",
	      title: "Previous slide"
	    }
	  }, button => {
	    button.innerHTML = SVG_LEFT_ARROW;
	    button.onclick = () => navigate("bkwd")
	  });
    const selectWrap = el.createDiv({ cls: "excali-slide-select-wrap" });
    selectSlideDropdown = selectWrap.createEl("select", {
      attr: {
        title: "Navigate to slide"
      }
    }, selectEl => {
	    for (let i = 0; i < slides.length; i++) {
	      const option = document.createElement("option");
        option.text = (presentationPathType === "frame")
          ? `${frames[i].name}/${slides.length}`
          : option.text = `Slide ${i + 1}/${slides.length}`;
	      option.value = i + 1;
	      selectEl.add(option);
	    }
	    selectEl.addEventListener("change", () => {
	      const selectedSlideNumber = parseInt(selectEl.value);
	      selectEl.blur();
	      navigateToSlide(selectedSlideNumber);
	    });
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Next slide"
	    },
	  }, button => {
	    button.innerHTML = SVG_RIGHT_ARROW;
	    button.onclick = () => navigate("fwd");
	  });
	  el.createDiv({
		  attr: {
	      style: `
	        width: 1px;
	        height: var(--default-button-size);
	        background-color: var(--default-border-color);
	        margin: 0px auto;`
	      }
	    });
	    
	  el.createEl("button",{
	    attr: {
	      title: "Toggle Laser Pointer and Panning Mode",
	      "data-role": "laser-toggle"
	    }
	  }, button => {
	    button.innerHTML = isLaserOn ? SVG_LASER_ON : SVG_LASER_OFF;
	    button.onclick = () => {
		    // Tool mutex: enabling laser must disable ink so freehand isn't
		    // capturing pointer events on top of laser mode.
		    if (!isLaserOn && inkActive) toggleInk();
		    isLaserOn = !isLaserOn;
		    excalidrawAPI.setActiveTool({
		      type: isLaserOn ? "laser" : "selection"
		    });
		    button.innerHTML = isLaserOn ? SVG_LASER_ON : SVG_LASER_OFF;
		    updateInkButtonStates();
	    }
	  });
	  
	  el.createEl("button",{
	    attr: {
	      title: "Re-focus current slide (shortcut: HOME)",
	      "data-secondary": "1"
	    }
	  }, button => {
	    button.innerHTML = SVG_REFOCUS;
	    button.onclick = () => {
	      slide--;
        navigate("fwd");
	    }
	  });
	  
 	  el.createEl("button",{
	    attr: {
	      title: "Toggle fullscreen. If you hold ALT/OPT when starting the presentation it will not go fullscreen. (shortcut: f)"
	    },
	  }, button => {
	    toggleFullscreenButton = button;
	    button.innerHTML = isFullscreen ? SVG_MINIMIZE : SVG_MAXIMIZE;
	    button.onclick = () => toggleFullscreen();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle speaker notes (shortcut: n). Notes pulled from frame.customData.notes or arrow.customData.notes[slide]."
	    },
	  }, button => {
	    button.innerHTML = SVG_NOTES;
	    button.onclick = () => toggleNotes();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle thumbnails sidebar (shortcut: t)"
	    },
	  }, button => {
	    button.innerHTML = SVG_THUMBS;
	    button.onclick = () => toggleThumbs();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle ink (a). Shift-click / right-click for color picker."
	    },
	  }, button => {
	    button.innerHTML = SVG_INK;
	    button.dataset.role = "ink-toggle";
	    button.onclick = (e) => {
	      if (e.shiftKey) { openPenPopover(); return; }
	      // Direct switch from eraser → pen without dead-toggle middle step.
	      if (inkActive && inkEraseMode) {
	        inkEraseMode = false;
	        ownerDocument.body.classList.remove("excali-ink-erase");
	        try {
	          // Must actually switch the Excalidraw tool too — otherwise
	          // the canvas keeps the eraser cursor and the user can't draw.
	          setExcaliColor(inkColor);
	          excalidrawAPI.setActiveTool({ type: "freedraw" });
	        } catch (_) {}
	      } else {
	        toggleInk();
	      }
	      updateInkButtonStates();
	    };
	    button.addEventListener("contextmenu", (e) => {
	      e.preventDefault(); e.stopPropagation();
	      openPenPopover();
	    });
	  });
	  // Chevron affordance for color popover — discoverable without modifier keys.
	  el.createEl("button",{
	    attr: {
	      title: "Pick pen color",
	      "data-role": "ink-color-chevron",
	      style: "min-width:22px;padding:0 4px;"
	    }
	  }, button => {
	    button.innerHTML = SVG_PEN_COLOR;
	    button.onclick = (e) => {
	      e.stopPropagation();
	      // Toggle: if already open, close.
	      if (penPopoverEl) { closePenPopover(); return; }
	      openPenPopover();
	    };
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle eraser (shortcut: x). Activates while in ink mode."
	    },
	  }, button => {
	    button.innerHTML = SVG_INK_OFF;
	    button.dataset.role = "ink-eraser";
	    button.onclick = () => {
	      if (inkActive && inkEraseMode) {
	        // Eraser was on — turn off everything (not just erase mode,
	        // otherwise pen silently re-activates).
	        toggleInkEraser();
	        if (inkActive) toggleInk();
	      } else {
	        if (!inkActive) toggleInk();
	        toggleInkEraser();
	      }
	      updateInkButtonStates();
	    };
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Clear all ink (shortcut: c). Click twice to confirm."
	    },
	  }, button => {
	    button.innerHTML = SVG_TRASH || "";
	    if (!SVG_TRASH) button.textContent = "Clr";
	    let clearArmed = false;
	    let armTimer = 0;
	    const hasSessionInk = () => {
	      try {
	        return excalidrawAPI.getSceneElements()
	          .some(el => el.type === "freedraw" && !preExistingLockState.has(el.id));
	      } catch (_) { return false; }
	    };
	    button.onclick = () => {
	      if (!hasSessionInk()) return;
	      if (clearArmed) {
	        clearInk();
	        clearArmed = false;
	        button.classList.remove("is-armed");
	        if (armTimer) { ownerWindow.clearTimeout(armTimer); armTimer = 0; }
	        return;
	      }
	      clearArmed = true;
	      button.classList.add("is-armed");
	      try { new ea.obsidian.Notice("Click again to clear ink", 1500); } catch (_) {}
	      if (armTimer) ownerWindow.clearTimeout(armTimer);
	      armTimer = ownerWindow.setTimeout(() => {
	        clearArmed = false;
	        button.classList.remove("is-armed");
	        armTimer = 0;
	      }, 1800);
	    };
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle spotlight — dim everything except a circle at the cursor (shortcut: s)",
	      "data-role": "spotlight",
	      "data-secondary": "1"
	    }
	  }, button => {
	    button.textContent = "◉";
	    button.style.fontSize = "16px";
	    button.onclick = () => toggleSpotlight();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle floating sticky note (shortcut: m)",
	      "data-secondary": "1"
	    },
	  }, button => {
	    button.innerHTML = SVG_STICKY || "";
	    if (!SVG_STICKY) button.textContent = "M";
	    button.onclick = () => toggleStickyNote();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Toggle timer (shortcut: T)",
	      "data-role": "timer",
	      "data-secondary": "1"
	    }
	  }, button => {
	    button.textContent = "⏱";
	    button.style.fontSize = "14px";
	    button.onclick = () => toggleTimer();
	  });
	  el.createEl("button",{
	    attr: {
	      title: "Keyboard shortcuts (shortcut: ?)",
	      "data-secondary": "1"
	    },
	  }, button => {
	    button.innerHTML = SVG_HELP;
	    button.onclick = () => toggleHelp();
	  });
	  // Slide Remote — phone control via QR. Sits BEFORE "more tools" so it
	  // stays primary/visible; only sensible while a slideshow runs.
	  el.createEl("button",{
	    attr: {
	      title: "Phone remote (QR) — needs Slide Remote plugin",
	      "data-role": "slide-remote"
	    }
	  }, button => {
	    button.innerHTML = SVG_QR;
	    button.onclick = (e) => {
	      e.stopPropagation();
	      openSlideRemoteQR();
	    };
	  });
	  // Overflow / "more tools" menu. Built after secondary buttons so it
	  // sits next to them. Click moves secondaries into a popover; close
	  // restores them to original positions.
	  el.createEl("button",{
	    attr: {
	      title: "More tools",
	      "data-role": "overflow"
	    }
	  }, button => {
	    button.textContent = "⋯";
	    button.style.fontSize = "18px";
	    button.style.fontWeight = "700";
	    button.style.lineHeight = "1";
	    button.onclick = (e) => { e.stopPropagation(); toggleOverflowPopover(); };
	  });
	  if(presentationPathType === "line") {
	    if(shouldHideArrowAfterPresentation) {
		    new ea.obsidian.ToggleComponent(el)
		      .setValue(isHidden)
		      .onChange(value => {
            shouldSaveAfterThePresentation = true;
		        if(value) {
		          excalidrawAPI.setToast({
						    message:"The presentation path remain hidden after the presentation. No need to select the line again. Just click the slideshow button to start the next presentation.",
						    duration: 5000,
						    closable: true
						  })
		        }
		        toggleArrowVisibility(value);
		      })
		      .toggleEl.setAttribute("title","Arrow visibility. ON: hidden after presentation, OFF: visible after presentation");
		  }
		  el.createEl("button",{
		    attr: {
		      title: "Edit slide"
		    },
		  }, button => {
		    button.innerHTML = SVG_EDIT;
		    button.onclick = () => {
		      if(shouldHideArrowAfterPresentation) toggleArrowVisibility(false);
		      exitPresentation(true);
		    }
		  });
		}
		if(ea.DEVICE.isDesktop) {
      el.createEl("button",{
        attr: {
          style: `
            margin-right: calc(var(--default-button-size)*0.25);`,
          "data-secondary": "1",
          title: `Print to PDF\nClick to print slides at ${PRINT_SLIDE_WIDTH}x${
            PRINT_SLIDE_HEIGHT}\nHold SHIFT to print the presentation as displayed`
            //${!presentationPathLineEl ? "\nHold ALT/OPT to clip frames":""}`
        }
      }, button => {
        button.innerHTML = SVG_PRINTER;
        button.onclick = (e) => printToPDF(e);
      });
		}
	  el.createEl("button",{
	    attr: {
	      style: `
	        margin-right: calc(var(--default-button-size)*0.25);`,
	      title: "End presentation"
	    }
	  }, button => {
	    button.innerHTML = SVG_FINISH;
	    button.onclick = () => exitPresentation();
	  });
	});
}

// Spotlight: dim everything except a soft circle that follows cursor.
// Built as a single fixed overlay using a radial-gradient mask. Pointer
// events pass through so canvas / panel still interact normally.
let spotlightEl = null;
let spotlightHud = null;
let spotlightVisible = false;
let spotlightRaf = 0;
let spotlightRadius = 160;
let spotlightDim = 0.7;
let spotlightShape = "circle"; // "circle" | "rect"
const SPOT_R_MIN = 60, SPOT_R_MAX = 480, SPOT_R_STEP = 24;
const applySpotlightVars = () => {
  if (!spotlightEl) return;
  spotlightEl.style.setProperty("--spot-r", `${spotlightRadius}px`);
  spotlightEl.style.setProperty("--spot-dim", String(spotlightDim));
  spotlightEl.dataset.shape = spotlightShape;
  if (spotlightHud) {
    spotlightHud.querySelector(".label").textContent = `${spotlightRadius}px`;
    const shapeBtn = spotlightHud.querySelector('[data-act="shape"]');
    if (shapeBtn) shapeBtn.textContent = spotlightShape === "circle" ? "▢" : "◯";
  }
};
const onSpotlightWheel = (e) => {
  if (!spotlightVisible) return;
  // Allow scroll-wheel resizing of the spotlight. preventDefault stops
  // the canvas/zoom from also reacting.
  e.preventDefault();
  e.stopPropagation();
  spotlightRadius = Math.max(SPOT_R_MIN, Math.min(SPOT_R_MAX, spotlightRadius + (e.deltaY < 0 ? SPOT_R_STEP : -SPOT_R_STEP)));
  applySpotlightVars();
};
const SPOTLIGHT_STYLE_ID = "excalidraw-slideshow-spotlight-style";
const ensureSpotlightStyle = () => {
  if (ownerDocument.getElementById(SPOTLIGHT_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = SPOTLIGHT_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-spotlight {
      position: fixed;
      inset: 0;
      z-index: 99996;
      pointer-events: none;
      background: rgba(0,0,0, var(--spot-dim, 0.7));
      will-change: mask-position;
      transition: background 120ms ease;
    }
    .excalidraw-slideshow-spotlight[data-shape="circle"] {
      -webkit-mask: radial-gradient(circle var(--spot-r, 160px) at var(--x,50%) var(--y,50%), transparent 0, transparent calc(var(--spot-r, 160px) - 30px), black var(--spot-r, 160px));
              mask: radial-gradient(circle var(--spot-r, 160px) at var(--x,50%) var(--y,50%), transparent 0, transparent calc(var(--spot-r, 160px) - 30px), black var(--spot-r, 160px));
    }
    .excalidraw-slideshow-spotlight[data-shape="rect"] {
      -webkit-mask:
        linear-gradient(to right,  black 0, black calc(var(--x,50%) - var(--spot-r,160px)), transparent calc(var(--x,50%) - var(--spot-r,160px) + 30px), transparent calc(var(--x,50%) + var(--spot-r,160px) - 30px), black calc(var(--x,50%) + var(--spot-r,160px)), black 100%),
        linear-gradient(to bottom, black 0, black calc(var(--y,50%) - var(--spot-r,160px)), transparent calc(var(--y,50%) - var(--spot-r,160px) + 30px), transparent calc(var(--y,50%) + var(--spot-r,160px) - 30px), black calc(var(--y,50%) + var(--spot-r,160px)), black 100%);
      -webkit-mask-composite: source-over;
              mask:
        linear-gradient(to right,  black 0, black calc(var(--x,50%) - var(--spot-r,160px)), transparent calc(var(--x,50%) - var(--spot-r,160px) + 30px), transparent calc(var(--x,50%) + var(--spot-r,160px) - 30px), black calc(var(--x,50%) + var(--spot-r,160px)), black 100%),
        linear-gradient(to bottom, black 0, black calc(var(--y,50%) - var(--spot-r,160px)), transparent calc(var(--y,50%) - var(--spot-r,160px) + 30px), transparent calc(var(--y,50%) + var(--spot-r,160px) - 30px), black calc(var(--y,50%) + var(--spot-r,160px)), black 100%);
              mask-composite: add;
    }
    .excalidraw-slideshow-spotlight-hud {
      position: fixed;
      bottom: 96px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99997;
      display: flex; gap: 4px; align-items: center;
      padding: 6px 10px;
      background: var(--background-primary);
      color: var(--text-normal);
      border: 1px solid var(--default-border-color);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 6px 16px rgba(0,0,0,0.28);
      user-select: none;
    }
    .excalidraw-slideshow-spotlight-hud button {
      width: 22px; height: 22px;
      padding: 0;
      border-radius: 4px;
      border: 1px solid var(--default-border-color);
      background: transparent;
      color: var(--text-normal);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .excalidraw-slideshow-spotlight-hud button:hover { background: color-mix(in srgb, var(--icon-fill-color) 14%, transparent); }
    .excalidraw-slideshow-spotlight-hud button.is-active {
      background: var(--interactive-accent, var(--icon-fill-color));
      color: var(--text-on-accent, #fff);
      border-color: transparent;
    }
    .excalidraw-slideshow-spotlight-hud .label { padding: 0 6px; min-width: 38px; text-align: center; }
    .excalidraw-slideshow-spotlight-hud .sep { width: 1px; align-self: stretch; background: var(--default-border-color); margin: 2px 4px; }
  `;
  ownerDocument.head.appendChild(s);
};
const toggleSpotlight = () => {
  ensureSpotlightStyle();
  if (spotlightVisible) {
    if (spotlightRaf) ownerWindow.cancelAnimationFrame(spotlightRaf);
    spotlightRaf = 0;
    spotlightEl?.remove();
    spotlightHud?.remove();
    spotlightEl = null;
    spotlightHud = null;
    spotlightVisible = false;
    ownerDocument.removeEventListener("pointermove", trackSpotlight, true);
    ownerDocument.removeEventListener("wheel", onSpotlightWheel, { capture: true });
    controlPanelEl?.querySelector('[data-role="spotlight"]')?.classList.remove("is-active");
    return;
  }
  // Mutex with ink/laser: spotlight is a presentation focus tool; drawing
  // tools fight with the dim layer for clarity.
  if (inkActive) toggleInk();
  if (isLaserOn) {
    isLaserOn = false;
    try { excalidrawAPI.setActiveTool({ type: "selection" }); } catch (_) {}
    const laserBtn = controlPanelEl?.querySelector('[data-role="laser-toggle"]');
    if (laserBtn) laserBtn.innerHTML = SVG_LASER_OFF;
    updateInkButtonStates();
  }
  spotlightEl = ownerDocument.createElement("div");
  spotlightEl.className = "excalidraw-slideshow-spotlight";
  contentEl.appendChild(spotlightEl);
  // HUD: lets user adjust radius via buttons too, without remembering wheel.
  spotlightHud = ownerDocument.createElement("div");
  spotlightHud.className = "excalidraw-slideshow-spotlight-hud";
  spotlightHud.innerHTML = `
    <button data-act="shrink" title="Shrink (wheel down)">−</button>
    <span class="label">${spotlightRadius}px</span>
    <button data-act="grow" title="Grow (wheel up)">+</button>
    <span class="sep"></span>
    <button data-act="lighter" title="Lighter dim">☀</button>
    <button data-act="darker" title="Darker dim">☾</button>
    <span class="sep"></span>
    <button data-act="shape" title="Toggle shape (circle/rect)">${spotlightShape === "circle" ? "▢" : "◯"}</button>
  `;
  contentEl.appendChild(spotlightHud);
  spotlightHud.querySelector('[data-act="shrink"]').onclick = (e) => { e.stopPropagation(); spotlightRadius = Math.max(SPOT_R_MIN, spotlightRadius - SPOT_R_STEP); applySpotlightVars(); };
  spotlightHud.querySelector('[data-act="grow"]').onclick = (e) => { e.stopPropagation(); spotlightRadius = Math.min(SPOT_R_MAX, spotlightRadius + SPOT_R_STEP); applySpotlightVars(); };
  spotlightHud.querySelector('[data-act="lighter"]').onclick = (e) => { e.stopPropagation(); spotlightDim = Math.max(0.2, spotlightDim - 0.1); applySpotlightVars(); };
  spotlightHud.querySelector('[data-act="darker"]').onclick = (e) => { e.stopPropagation(); spotlightDim = Math.min(0.92, spotlightDim + 0.1); applySpotlightVars(); };
  spotlightHud.querySelector('[data-act="shape"]').onclick = (e) => {
    e.stopPropagation();
    spotlightShape = spotlightShape === "circle" ? "rect" : "circle";
    applySpotlightVars();
  };
  spotlightVisible = true;
  applySpotlightVars();
  ownerDocument.addEventListener("pointermove", trackSpotlight, { capture: true, passive: true });
  ownerDocument.addEventListener("wheel", onSpotlightWheel, { capture: true, passive: false });
  controlPanelEl?.querySelector('[data-role="spotlight"]')?.classList.add("is-active");
};
// rAF-coalesced — pointermove fires faster than 60Hz, no need to repaint each.
let spotlightPending = null;
const trackSpotlight = (e) => {
  if (!spotlightEl) return;
  spotlightPending = [e.clientX, e.clientY];
  if (spotlightRaf) return;
  spotlightRaf = ownerWindow.requestAnimationFrame(() => {
    spotlightRaf = 0;
    if (!spotlightEl || !spotlightPending) return;
    const [x, y] = spotlightPending;
    spotlightEl.style.setProperty("--x", `${x}px`);
    spotlightEl.style.setProperty("--y", `${y}px`);
  });
};

// Presentation timer — start/pause counter shown bottom-right.
let timerEl = null;
let timerVisible = false;
let timerStart = 0;
let timerAccum = 0;
let timerIntervalId = 0;
let timerRunning = false;
const TIMER_STYLE_ID = "excalidraw-slideshow-timer-style";
const ensureTimerStyle = () => {
  if (ownerDocument.getElementById(TIMER_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = TIMER_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-timer {
      position: fixed;
      right: 20px;
      bottom: 92px;
      padding: 6px 10px;
      background: var(--background-primary, #fff);
      color: var(--text-normal, #1a1a1a);
      border: 1px solid var(--default-border-color);
      border-radius: 8px;
      font-family: var(--font-monospace, ui-monospace, monospace);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.28);
      z-index: 99990;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    }
    .excalidraw-slideshow-timer button {
      width: 20px; height: 20px;
      padding: 0;
      border-radius: 4px;
      border: 1px solid var(--default-border-color);
      background: transparent;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .excalidraw-slideshow-timer button:hover { background: color-mix(in srgb, var(--icon-fill-color) 14%, transparent); }
  `;
  ownerDocument.head.appendChild(s);
};
const formatTimer = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};
const tickTimer = () => {
  if (!timerEl) return;
  const elapsed = timerAccum + (timerRunning ? (Date.now() - timerStart) : 0);
  timerEl.querySelector(".time").textContent = formatTimer(elapsed);
};
const toggleTimer = () => {
  ensureTimerStyle();
  if (timerVisible) {
    if (timerIntervalId) ownerWindow.clearInterval(timerIntervalId);
    timerIntervalId = 0;
    timerRunning = false;
    timerEl?.remove();
    timerEl = null;
    timerVisible = false;
    controlPanelEl?.querySelector('[data-role="timer"]')?.classList.remove("is-active");
    return;
  }
  timerEl = ownerDocument.createElement("div");
  timerEl.className = "excalidraw-slideshow-timer";
  timerEl.innerHTML = `<span class="time">00:00</span><button data-act="toggle">▶</button><button data-act="reset">↺</button>`;
  contentEl.appendChild(timerEl);
  timerVisible = true;
  controlPanelEl?.querySelector('[data-role="timer"]')?.classList.add("is-active");
  const startStop = timerEl.querySelector('[data-act="toggle"]');
  const reset = timerEl.querySelector('[data-act="reset"]');
  startStop.onclick = (e) => {
    e.stopPropagation();
    if (timerRunning) {
      timerAccum += Date.now() - timerStart;
      timerRunning = false;
      startStop.textContent = "▶";
      if (timerIntervalId) ownerWindow.clearInterval(timerIntervalId);
      timerIntervalId = 0;
      tickTimer();
    } else {
      timerStart = Date.now();
      timerRunning = true;
      startStop.textContent = "⏸";
      tickTimer();
      timerIntervalId = ownerWindow.setInterval(tickTimer, 500);
    }
  };
  reset.onclick = (e) => {
    e.stopPropagation();
    timerAccum = 0;
    timerStart = Date.now();
    tickTimer();
  };
};

//--------------------
// keyboard navigation
//--------------------
// Tiered Esc to exit — mirrors Vim Mode UX. 3 consecutive Escs close
// the slideshow (after any open overlay has been popped first). Decays
// after ~1.8s so a stray Esc doesn't leak into the next session.
const ESC_EXIT_THRESHOLD = 3;
const ESC_FS_THRESHOLD = 2;
let escExitCount = 0;
let escFsCount = 0;
let escExitTimer = 0;
let escHintEl = null;
let escHintTimer = 0;
const ESC_HINT_STYLE_ID = "excalidraw-slideshow-esc-hint";
const ensureEscHintStyle = () => {
  if (ownerDocument.getElementById(ESC_HINT_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = ESC_HINT_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-esc-hint {
      position: fixed;
      left: 50%;
      top: 24px;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: var(--background-primary, #ffffff);
      color: var(--text-normal, #1a1a1a);
      border: 1px solid var(--default-border-color, rgba(0,0,0,0.18));
      border-radius: 8px;
      font-family: var(--font-interface, system-ui, sans-serif);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      z-index: 99999;
      pointer-events: none;
      animation: excali-slideshow-overlay-in 140ms cubic-bezier(.16,1,.3,1) both;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-esc-hint { animation-duration: 1ms !important; }
    }
  `;
  ownerDocument.head.appendChild(s);
};
const showEscHint = (text) => {
  ensureEscHintStyle();
  if (!escHintEl) {
    escHintEl = ownerDocument.createElement("div");
    escHintEl.className = "excalidraw-slideshow-esc-hint";
    contentEl.appendChild(escHintEl);
  }
  escHintEl.textContent = text;
  if (escHintTimer) ownerWindow.clearTimeout(escHintTimer);
  escHintTimer = ownerWindow.setTimeout(clearEscHint, 1800);
};
const clearEscHint = () => {
  if (escHintTimer) { ownerWindow.clearTimeout(escHintTimer); escHintTimer = 0; }
  if (escHintEl) { escHintEl.remove(); escHintEl = null; }
};
const keydownListener = (e) => {
  if(hostLeaf !== app.workspace.activeLeaf) return;
  if(hostLeaf.width === 0 && hostLeaf.height === 0) return;
  e.preventDefault();
  switch(e.key) {
    case "Backspace":
    case "Escape": {
      // Backspace exits immediately (legacy behavior). Escape uses a
      // vim-style tiered approach: first Esc closes any active overlay
      // OR starts an exit countdown, subsequent Escs progress toward
      // exit. Threshold = 3 presses to exit slideshow itself.
      if (e.key === "Backspace") { exitPresentation(); break; }
      // Pre-emptively guard against browser fullscreen-exit if there's
      // something else for Esc to do. If we end up exiting at threshold
      // we reset the flag below before calling exitPresentation.
      preventFullscreenExit = true;
      // Timer intentionally excluded — user wants it persistent across Esc.
      const escChain = [
        () => helpEl        && (closeHelp(), true),
        () => endConfirmEl  && (closeEndConfirm(), true),
        () => penPopoverEl  && (closePenPopover(), true),
        () => spotlightVisible && (toggleSpotlight(), true),
        () => inkEraseMode  && (toggleInkEraser(), true),
        () => inkActive     && (toggleInk(), true),
        () => stickyNoteVisible && (toggleStickyNote(), true),
        () => notesVisible  && (toggleNotes(), true),
        () => thumbsVisible && (toggleThumbs(), true),
      ];
      if (escChain.some(fn => fn())) { escExitCount = 0; escFsCount = 0; clearEscHint(); break; }
      // Nothing open. If we're in fullscreen, run a fullscreen-exit tier
      // first (mirrors the slideshow-exit tier UX) before letting Esc
      // count toward exiting the whole slideshow.
      if (isFullscreen) {
        escFsCount++;
        if (escFsCount < ESC_FS_THRESHOLD) {
          showEscHint(`Esc ×${ESC_FS_THRESHOLD} to exit fullscreen (${escFsCount}/${ESC_FS_THRESHOLD})`);
          if (escExitTimer) ownerWindow.clearTimeout(escExitTimer);
          escExitTimer = ownerWindow.setTimeout(() => { escFsCount = 0; escExitCount = 0; clearEscHint(); }, 1800);
          break;
        }
        escFsCount = 0;
        clearEscHint();
        // Let our own code drive the fullscreen exit rather than browser silently.
        preventFullscreenExit = false;
        toggleFullscreen();
        // Don't fall through to exit-slideshow tier on same press.
        break;
      }
      // Nothing open — count Escs toward exit.
      escExitCount++;
      if (escExitCount < ESC_EXIT_THRESHOLD) {
        showEscHint(`Esc ×${ESC_EXIT_THRESHOLD} to exit (${escExitCount}/${ESC_EXIT_THRESHOLD})`);
        if (escExitTimer) ownerWindow.clearTimeout(escExitTimer);
        escExitTimer = ownerWindow.setTimeout(() => { escExitCount = 0; clearEscHint(); }, 1800);
        break;
      }
      escExitCount = 0;
      clearEscHint();
      // Threshold reached — let exitPresentation drive the fullscreen
      // exit through our own code path, not the browser's silent one.
      preventFullscreenExit = false;
      exitPresentation();
      break;
    }
    case "Space":
    case "ArrowRight":
    case "ArrowDown": 
      navigate("fwd");
      break;
    case "ArrowLeft":
    case "ArrowUp":
      navigate("bkwd");
      break;
    case "End":
      slide = slides.length - 2;
      navigate("fwd");
      break;
    case "Home":
      // Re-focus current slide (legacy behavior — Excalidraw slideshow
      // documentation calls Home "refocus").
      slide--;
      navigate("fwd");
      break;
    case "PageUp":
      // Jump to first slide. Bound on PageUp so the Slide Remote phone
      // app can dispatch it without conflicting with the existing Home
      // behavior.
      slide = -1;
      navigate("fwd");
      break;
    case "PageDown":
      // Jump to last slide.
      slide = slides.length - 2;
      navigate("fwd");
      break;
    case "e": 
      if(presentationPathType !== "line") return;
      (async ()=>{
        await toggleArrowVisibility(false);
        exitPresentation(true);
      })()
      break;
    case "f":
      toggleFullscreen();
      break;
    case "n":
      toggleNotes();
      break;
    case "t":
      toggleThumbs();
      break;
    case "a":
      toggleInk();
      break;
    case "c":
      clearInk();
      break;
    case "x":
      toggleInkEraser();
      break;
    case "m":
      toggleStickyNote();
      break;
    case "k":
      cycleInkColor();
      break;
    case "s":
      toggleSpotlight();
      break;
    case "T":
      toggleTimer();
      break;
    case "?":
    case "/":
      toggleHelp();
      break;
  }
}

//---------------------
// slideshow panel drag
//---------------------
let posX1 = posY1 = posX2 = posY2 = 0;

const updatePosition = (deltaY = 0, deltaX = 0) => {
  const {
    offsetTop,
    offsetLeft,
    clientWidth: width,
    clientHeight: height,
   } = controlPanelEl;
  controlPanelEl.style.top = (offsetTop - deltaY) + 'px';
  controlPanelEl.style.left = (offsetLeft - deltaX) + 'px';
}
   
const onPointerUp = () => {
  ownerWindow.removeEventListener('pointermove', onDrag, true);
}

const onPointerDown = (e) => {
	clearFadeTimeout();
	setFadeTimeout();
  const now = Date.now();
  posX2 = e.clientX;
  posY2 = e.clientY;
  ownerWindow.addEventListener('pointermove', onDrag, true);
}

const onDrag = (e) => {
  e.preventDefault();
  posX1 = posX2 - e.clientX;
  posY1 = posY2 - e.clientY;
  posX2 = e.clientX;
  posY2 = e.clientY;
  updatePosition(posY1, posX1);
}

const onMouseEnter = () => {
	clearFadeTimeout();
}

const onMouseLeave = () => {
	setFadeTimeout();
}

const fullscreenListener = (e) => {
  if(preventFullscreenExit) {
	  preventFullscreenExit = false;
    return;
  }
  e.preventDefault();
  exitPresentation();
}

// Slide Remote — fullscreen-safe QR overlay. Obsidian's Modal mounts on
// document.body, which is invisible while contentEl is the browser
// fullscreen element. We mount our own overlay inside contentEl and
// pull the QR PNG from the plugin's /api/qr endpoint over localhost.
let slideRemoteOverlayEl = null;
const SLIDE_REMOTE_OVERLAY_ID = "excalidraw-slideshow-slide-remote-overlay";
const SLIDE_REMOTE_STYLE_ID = "excalidraw-slideshow-slide-remote-style";
const ensureSlideRemoteStyle = () => {
  if (ownerDocument.getElementById(SLIDE_REMOTE_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = SLIDE_REMOTE_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-qr-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      z-index: 99995;
      display: flex; align-items: center; justify-content: center;
      animation: excali-slideshow-overlay-in 160ms cubic-bezier(.16,1,.3,1) both;
    }
    .excalidraw-slideshow-qr-card {
      background: var(--background-primary, #fff);
      color: var(--text-normal, #1a1a1a);
      border: 1px solid var(--default-border-color, #ccc);
      border-radius: 12px;
      padding: 20px;
      max-width: 380px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
      text-align: center;
    }
    .excalidraw-slideshow-qr-card h3 {
      margin: 0 0 12px 0; font-size: 16px; font-weight: 700;
      display: flex; justify-content: space-between; align-items: center;
    }
    .excalidraw-slideshow-qr-card .close {
      cursor: pointer; opacity: 0.7; font-size: 18px; line-height: 1;
    }
    .excalidraw-slideshow-qr-card .close:hover { opacity: 1; }
    .excalidraw-slideshow-qr-card img {
      width: 320px; max-width: 70vw; height: auto;
      border-radius: 8px; background: #fff; padding: 6px;
      display: block; margin: 0 auto;
    }
    .excalidraw-slideshow-qr-card .url {
      font-family: var(--font-monospace, ui-monospace, monospace);
      font-size: 11px; word-break: break-all;
      background: var(--background-secondary, #eee);
      padding: 6px 8px; border-radius: 4px; margin-top: 12px;
      user-select: all;
    }
    .excalidraw-slideshow-qr-card .actions {
      display: flex; gap: 8px; justify-content: center; margin-top: 14px;
    }
    .excalidraw-slideshow-qr-card button {
      padding: 8px 14px; border-radius: 6px;
      border: 1px solid var(--default-border-color);
      background: transparent; color: var(--text-normal);
      font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .excalidraw-slideshow-qr-card button.primary {
      background: var(--interactive-accent, #6965db);
      color: var(--text-on-accent, #fff); border-color: transparent;
    }
    .excalidraw-slideshow-qr-card button.danger {
      background: #2a1f24; color: #f8d7d7; border-color: #5c2c2c;
    }
    .excalidraw-slideshow-qr-card .help {
      font-size: 11px; color: var(--text-muted); margin-top: 10px;
    }
  `;
  ownerDocument.head.appendChild(s);
};
const closeSlideRemoteOverlay = () => {
  if (!slideRemoteOverlayEl) return;
  slideRemoteOverlayEl.remove();
  slideRemoteOverlayEl = null;
};
const openSlideRemoteQR = async () => {
  // 1. Ensure plugin available + server running.
  const plugin = app?.plugins?.plugins?.["slide-remote"];
  if (!plugin) {
    new ea.obsidian.Notice("Slide Remote plugin not installed.", 2400);
    return;
  }
  try {
    if (!plugin.server?.isRunning?.()) {
      await plugin.startServer?.();
    }
  } catch (e) {
    console.warn("[slideshow] failed to start slide-remote:", e);
  }
  const url = plugin.server?.getRemoteURL?.();
  if (!url) {
    new ea.obsidian.Notice("Slide Remote: server not running.", 2400);
    return;
  }
  // 2. Build overlay inside contentEl so browser fullscreen renders it.
  ensureSlideRemoteStyle();
  closeSlideRemoteOverlay();
  slideRemoteOverlayEl = ownerDocument.createElement("div");
  slideRemoteOverlayEl.className = "excalidraw-slideshow-qr-backdrop";
  slideRemoteOverlayEl.innerHTML = `
    <div class="excalidraw-slideshow-qr-card">
      <h3>Slide Remote <span class="close" data-act="close">×</span></h3>
      <img alt="Scan with your phone" />
      <div class="url"></div>
      <div class="actions">
        <button data-act="copy" class="primary">Copy URL</button>
        <button data-act="stop" class="danger">Stop server</button>
        <button data-act="close">Done</button>
      </div>
      <div class="help">Phone + laptop on the same Wi-Fi. Open URL or scan QR.</div>
    </div>
  `;
  // Build /api/qr URL by replacing path of the remote URL.
  try {
    const u = new URL(url);
    u.pathname = "/api/qr";
    u.search = ""; // QR endpoint is unauthenticated; query not needed
    slideRemoteOverlayEl.querySelector("img").src = u.toString();
  } catch (_) {}
  slideRemoteOverlayEl.querySelector(".url").textContent = url;
  slideRemoteOverlayEl.addEventListener("click", async (e) => {
    const act = e.target?.dataset?.act;
    if (act === "close" || e.target === slideRemoteOverlayEl) {
      closeSlideRemoteOverlay();
      return;
    }
    if (act === "copy") {
      try { await navigator.clipboard.writeText(url); new ea.obsidian.Notice("URL copied", 1200); }
      catch (_) { new ea.obsidian.Notice("Clipboard unavailable", 1500); }
      return;
    }
    if (act === "stop") {
      try { await plugin.stopServer?.(); } catch (_) {}
      new ea.obsidian.Notice("Slide Remote server stopped.", 1500);
      closeSlideRemoteOverlay();
    }
  });
  contentEl.appendChild(slideRemoteOverlayEl);
};

// Custom DOM event channel — used by the Slide Remote plugin (and any
// other tool) to drive the slideshow without simulating keystrokes.
// Synthetic KeyboardEvents are dropped or mis-routed by some Electron
// builds, which is why timer / shift-keyed actions silently failed when
// dispatched from the phone. This channel is direct + unambiguous.
const slideshowCmdListener = (e) => {
  const action = e?.detail?.action;
  if (!action) return;
  switch (action) {
    case "next":         navigate("fwd"); break;
    case "prev":         navigate("bkwd"); break;
    case "first":        slide = -1; navigate("fwd"); break;
    case "last":         slide = slides.length - 2; navigate("fwd"); break;
    case "notes":        toggleNotes(); break;
    case "sticky":       toggleStickyNote(); break;
    case "thumbs":       toggleThumbs(); break;
    case "pen":          toggleInk(); break;
    case "clear-ink":    clearInk(); break;
    case "help":         toggleHelp(); break;
    case "spotlight":    toggleSpotlight(); break;
    case "timer":        toggleTimer(); break;
    case "fullscreen":   toggleFullscreen(); break;
    case "exit":         exitPresentation(); break;
    default: return; // unknown action — don't preventDefault so callers can know
  }
  // Signal to the dispatcher (Slide Remote plugin) that we handled this
  // command so it doesn't also send a synthetic key — which would
  // re-trigger the same toggle and cancel it out.
  try { e.preventDefault?.(); } catch (_) {}
};
const initializeEventListners = () => {
	ownerWindow.addEventListener('keydown',keydownListener);
	ownerWindow.addEventListener('slideshow:cmd', slideshowCmdListener);
  controlPanelEl.addEventListener('pointerdown', onPointerDown, false);
  controlPanelEl.addEventListener('mouseenter', onMouseEnter, false);
  controlPanelEl.addEventListener('mouseleave', onMouseLeave, false);
  ownerWindow.addEventListener('pointerup', onPointerUp, false);

	//event listners for terminating the presentation
	window.removePresentationEventHandlers = () => {
	  ea.onLinkClickHook = null;
	  controlPanelEl.removeEventListener('pointerdown', onPointerDown, false);
	  controlPanelEl.removeEventListener('mouseenter', onMouseEnter, false);
	  controlPanelEl.removeEventListener('mouseleave', onMouseLeave, false);
	  controlPanelEl.parentElement?.removeChild(controlPanelEl);
	  ownerDocument.getElementById(STYLE_PANEL_ID)?.remove();
	  // Kill in-flight slide animation so it doesn't keep panning after
	  // the user hits ESC / × — that's what caused the "auto-fit first
	  // frame on exit" bug. cancelCurrentTransition also clears `busy`.
	  cancelCurrentTransition();
	  if(!ea.DEVICE.isMobile) {
	    contentEl.removeEventListener('webkitfullscreenchange', fullscreenListener);
	    contentEl.removeEventListener('fullscreenchange', fullscreenListener);
	  }
	  ownerWindow.removeEventListener('keydown',keydownListener);
	  ownerWindow.removeEventListener('slideshow:cmd', slideshowCmdListener);
	  ownerWindow.removeEventListener('pointerup',onPointerUp);
	  contentEl.querySelector(".layer-ui__wrapper")?.removeClass("excalidraw-hidden");
	  delete window.removePresentationEventHandlers;
	}

	ea.onLinkClickHook = () => {
    exitPresentation();
    return true;
  };
  
  if(!ea.DEVICE.isMobile) {
    contentEl.addEventListener('webkitfullscreenchange', fullscreenListener);
    contentEl.addEventListener('fullscreenchange', fullscreenListener);
  }
}

//----------------------------
// Exit presentation
//----------------------------
let _exitInFlight = false;
const exitPresentation = async (openForEdit = false) => {
  // Idempotent guard: ESC fires both keydownListener and fullscreenchange
  // listener; without this the cleanup ran twice and threw on already-
  // removed nodes. If a previous attempt threw mid-way the flag would
  // get stuck — the try/finally below guarantees release on any path.
  if (_exitInFlight) return;
  _exitInFlight = true;
  try {
    await _doExit(openForEdit);
  } catch (err) {
    console.error("[slideshow] exit failed:", err);
  } finally {
    // Allow a fresh exit attempt if the user presses Esc again after a
    // failure (e.g., the canvas tool API throwing on a half-broken view).
    _exitInFlight = false;
  }
};
const _doExit = async (openForEdit) => {
  hostView._slideshowCursorHide?.();
  if (notesEl) { try { notesEl._cleanup?.(); } catch (_) {} notesEl.remove(); notesEl = null; notesVisible = false; }
  ownerDocument.getElementById(NOTES_STYLE_ID)?.remove();
  if (thumbsEl) { try { thumbsEl._io?.disconnect(); } catch (_) {} thumbsEl.remove(); thumbsEl = null; thumbsVisible = false; }
  ownerDocument.getElementById(THUMBS_STYLE_ID)?.remove();
  if (stickyNoteEl) {
    try { stickyNoteEl._winResizeCleanup?.(); } catch (_) {}
    stickyNoteEl.remove(); stickyNoteEl = null; stickyNoteVisible = false; stickyNoteEditing = false;
  }
  ownerDocument.getElementById(STICKY_STYLE_ID)?.remove();
  clearEscHint();
  ownerDocument.getElementById(ESC_HINT_STYLE_ID)?.remove();
  if (escExitTimer) { ownerWindow.clearTimeout(escExitTimer); escExitTimer = 0; }
  escExitCount = 0;
  escFsCount = 0;
  if (spotlightVisible) toggleSpotlight();
  ownerDocument.getElementById(SPOTLIGHT_STYLE_ID)?.remove();
  if (timerVisible) toggleTimer();
  ownerDocument.getElementById(TIMER_STYLE_ID)?.remove();
  closePenPopover();
  ownerDocument.getElementById(PEN_POPOVER_STYLE_ID)?.remove();
  closeOverflowPopover();
  closeSlideRemoteOverlay();
  ownerDocument.getElementById(SLIDE_REMOTE_STYLE_ID)?.remove();
  cachedSceneSVG = null;
  closeEndConfirm();
  ownerDocument.getElementById(END_STYLE_ID)?.remove();
  hostView._slideshowInkCleanup?.();
  closeHelp();
  ownerDocument.getElementById(HELP_STYLE_ID)?.remove();
  //this is a hack, not sure why ea loses target view when other scripts are executed while the presentation is running
  ea.targetView = hostView; 
  isLaserOn = false;
  statusBarElement.style.display = "inherit";
  if(openForEdit) ea.targetView.preventAutozoom();
  await exitFullscreen();
  await waitForExcalidrawResize();
  ea.setViewModeEnabled(false);
  // Wipe any freedraw drawn during the session. The user may have used
  // the "Clear" button already; if they didn't, exit is the right moment.
  // Pre-existing freedraw is preserved (tracked in preExistingLockState).
  try {
    const all = excalidrawAPI.getSceneElements();
    const next = all.filter(el => {
      if (el.type !== "freedraw") return true;
      return preExistingLockState.has(el.id);
    });
    if (next.length !== all.length) {
      excalidrawAPI.updateScene({ elements: next, commitToHistory: false });
    }
  } catch (e) {
    console.warn("[slideshow] auto-clear session ink failed:", e);
  }
  // Restore the original `locked` flag for every element that existed
  // before the slideshow. Elements added during the session (drawn ink)
  // keep their default unlocked state.
  restorePreExistingLocks();
  if(presentationPathType === "line") {
	  ea.clear();
	  ea.copyViewElementsToEAforEditing(ea.getViewElements().filter(el=>el.id === presentationPathLineEl.id));
	  const el = ea.getElement(presentationPathLineEl.id);
	  if(!isHidden) {
	    el.strokeColor = originalProps.strokeColor;
	    el.backgroundProps = originalProps.backgroundColor;
	    el.locked = openForEdit ? false : originalProps.locked;
	  }
	  await ea.addElementsToView();
	  if(!isHidden) ea.selectElementsInView([el]);
	  if(openForEdit) {
	    let nextRect = getNextSlideRect(--slide);
	    const offsetW = (nextRect.right-nextRect.left)*(1-EDIT_ZOOMOUT)/2;
	    const offsetH = (nextRect.bottom-nextRect.top)*(1-EDIT_ZOOMOUT)/2
	    nextRect = {
	      left: nextRect.left-offsetW,
	      right: nextRect.right+offsetW,
	      top: nextRect.top-offsetH,
	      bottom: nextRect.bottom+offsetH,
	      nextZoom: nextRect.nextZoom*EDIT_ZOOMOUT > 0.1 ? nextRect.nextZoom*EDIT_ZOOMOUT : 0.1 //0.1 is the minimu zoom value
	    };
	    await scrollToNextRect(nextRect,1);
	    excalidrawAPI.startLineEditor(
	      ea.getViewSelectedElement(),
	      [slide*2,slide*2+1]
	    );
	  }
	} else {
	  if(frameRenderingOriginalState.enabled) {
	  	excalidrawAPI.updateScene({
		    appState: {
		      frameRendering: {
		        ...frameRenderingOriginalState,
		        enabled: true
		      }
		    }
		  });
		}
	}
  window.removePresentationEventHandlers?.();
  // Phase 1.5: restore the UI elements we hid on start. Original script
  // only handled the .layer-ui__wrapper hide and forgot the help /
  // zoom buttons + Vim badge — they stayed gone after exit.
  const hidden = hostView._slideshowHidden;
  if (hidden) {
    if (hidden.helpButton)  hidden.helpButton.style.display  = "";
    if (hidden.zoomButton)  hidden.zoomButton.style.display  = "";
    if (hidden.undoRedo)    hidden.undoRedo.style.display    = hidden.undoRedo.dataset._slideshowPrev || "";
    delete hostView._slideshowHidden;
  }
  ownerDocument.body.classList.remove("excali-slideshow-active");
  ownerDocument.getElementById("excalidraw-slideshow-suppress")?.remove();
  ownerWindow.setTimeout(()=>{
    //Resets pointer offsets. Ugly solution. 
    //During testing offsets were wrong after presentation, but don't know why.
    //This should solve it even if they are wrong.
    hostView.refreshCanvasOffset();
    excalidrawAPI.setActiveTool({type: "selection"});
  })
  if(!shouldSaveAfterThePresentation) {
    ea.targetView.clearDirty();
  }
  // If the Slide Remote plugin is installed AND the server is running,
  // stop it so the phone session ends with the slideshow. Best-effort:
  // silent no-op if the command isn't registered.
  try {
    if (app?.commands?.commands?.["slide-remote:stop-server"]) {
      app.commands.executeCommandById("slide-remote:stop-server");
    }
  } catch (_) {}
}

//--------------------------
// Print to PDF
//--------------------------
let notice;
let noticeEl;
function setSingleNotice(message) {
  if(noticeEl?.parentElement) {
    notice.setMessage(message);
    return;
  }
  notice = new Notice(message, 0);
  noticeEl = notice.containerEl ?? notice.noticeEl;
}

function hideSingleNotice() {
  if(noticeEl?.parentElement) {
    notice.hide();
  }
}

const translateToZero = ({ top, left, bottom, right }, padding) => {
  const {topX, topY, width, height} = ea.getBoundingBox(ea.getViewElements());
  const newTop = top - (topY - padding);
  const newLeft = left - (topX - padding);
  const newBottom = bottom - (topY - padding);
  const newRight = right - (topX - padding);

  return {
    top: newTop,
    left: newLeft,
    bottom: newBottom,
    right: newRight,
  };
}

const getElementPlaceholdersForMarkerFrames = () => {
  const viewMarkerFrames = ea.getViewElements().filter(el=>el.type === "frame" && el.frameRole === "marker");
  if(viewMarkerFrames.length === 0) return;
  ea.clear();
  ea.style.opacity = 0;
  ea.style.roughness = 0;
	ea.style.fillStyle = "solid";
	ea.style.backgroundColor = "black"
	ea.style.strokeWidth = 0.01;

  for (const frame of viewMarkerFrames) {
	  ea.addRect(frame.x, frame.y, frame.width, frame.height);
  }
  return ea.getViewElements().concat(ea.getElements());
}

const printToPDF = async (e) => {
  const slideWidth = e.shiftKey ? excalidrawAPI.getAppState().width : PRINT_SLIDE_WIDTH;
  const slideHeight = e.shiftKey ? excalidrawAPI.getAppState().height : PRINT_SLIDE_HEIGHT;
  //const shouldClipFrames = !presentationPathLineEl && e.altKey;
  const shouldClipFrames = false;
  //huge padding to ensure the HD window always fits the width
  //no padding if frames are clipped
  const padding =  shouldClipFrames ? 0 : Math.round(Math.max(slideWidth,slideHeight)/2)+10;
  const st = ea.getExcalidrawAPI().getAppState();
  setSingleNotice("Generating image. This can take a longer time depending on the size of the image and speed of your device");
  const elementsOverride = getElementPlaceholdersForMarkerFrames();
  const svg = await ea.createViewSVG({
    withBackground: true,
    theme: st.theme,
    frameRendering: { enabled: shouldClipFrames, name: false, outline: false, clip: shouldClipFrames },
    padding,
    selectedOnly: false,
    skipInliningFonts: false,
    embedScene: false,
    elementsOverride,
  });
  const pages = [];
  for(i=0;i<slides.length;i++) {
    setSingleNotice(`Generating slide ${i+1}`);
    const s = slides[i];
    const  { top, left, bottom, right } = translateToZero(
      getNavigationRect({
        ...s,
        printDimensions: {width: slideWidth, height: slideHeight}
      }), padding
    );
    //always create the new SVG in the main Obsidian workspace (not the popout window, if present)
    const host = window.createDiv();
    host.innerHTML = svg.outerHTML;
    const clonedSVG = host.firstElementChild;
    const width = Math.abs(left-right);
    const height = Math.abs(top-bottom);
    clonedSVG.setAttribute("viewBox", `${left} ${top} ${width} ${height}`);
    clonedSVG.setAttribute("width", `${width}`);
    clonedSVG.setAttribute("height", `${height}`);
    pages.push(clonedSVG);
  }
  const bgColor = ea.getExcalidrawAPI().getAppState().viewBackgroundColor;
  setSingleNotice("Creating PDF Document");
  ea.createPDF({
    SVG: pages,
    scale: { fitToPage: true },
    pageProps: {
      dimensions: { width: slideWidth, height: slideHeight },
      backgroundColor: bgColor,
      margin: { left: 0, right: 0, top: 0, bottom: 0 },
      alignment: "center"
    }, 
    filename: ea.targetView.file.basename + ".pdf",
  }).then(()=>hideSingleNotice());
}

//--------------------------
// Start presentation or open presentation settings on double click
//--------------------------
// Phase 3c: keyboard shortcuts cheat sheet overlay ('?' key).
let helpEl = null;
const HELP_STYLE_ID = "excalidraw-slideshow-help-style";
const ensureHelpStyle = () => {
  if (ownerDocument.getElementById(HELP_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = HELP_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-help-backdrop {
      position: fixed; inset: 0; z-index: 99995;
      background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      animation: excali-slideshow-overlay-in 180ms cubic-bezier(.16,1,.3,1) both;
      backdrop-filter: blur(3px);
      contain: layout style paint;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-help-backdrop { animation-duration: 1ms !important; backdrop-filter: none !important; }
    }
    .excalidraw-slideshow-help-card {
      min-width: 360px;
      max-width: 480px;
      padding: 22px 26px;
      background: var(--background-primary, var(--island-bg-color, #ffffff));
      color: var(--text-normal, #1a1a1a);
      border-radius: 12px;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 28%, transparent));
      box-shadow: var(--shadow-island, 0 16px 48px rgba(0,0,0,0.55));
      position: relative;
      z-index: 1;
    }
    .excalidraw-slideshow-help-card h3 {
      margin: 0 0 14px 0;
      font-size: 15px;
      font-weight: 700;
      display: flex; justify-content: space-between; align-items: center;
    }
    .excalidraw-slideshow-help-card h3 .close {
      cursor: pointer; opacity: 0.6; font-weight: 400;
    }
    .excalidraw-slideshow-help-card h3 .close:hover { opacity: 1; }
    .excalidraw-slideshow-help-card table {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .excalidraw-slideshow-help-card td {
      padding: 4px 0;
    }
    .excalidraw-slideshow-help-card td.k {
      width: 1%; white-space: nowrap; padding-right: 12px;
    }
    .excalidraw-slideshow-help-card kbd {
      display: inline-block;
      padding: 3px 8px;
      font-family: var(--font-monospace, ui-monospace, monospace);
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      border-radius: 4px;
      background: var(--background-secondary, color-mix(in srgb, var(--icon-fill-color) 18%, transparent));
      border: 1px solid var(--default-border-color);
      color: var(--text-normal) !important;
      min-width: 18px;
      text-align: center;
    }
    .excalidraw-slideshow-help-card td.d { color: var(--text-normal); opacity: 0.95; }
  `;
  ownerDocument.head.appendChild(s);
};
const closeHelp = () => { if (helpEl) { helpEl.remove(); helpEl = null; } };
const toggleHelp = () => {
  ensureHelpStyle();
  if (helpEl) { closeHelp(); return; }
  const rows = [
    ["→ / ↓ / Space", "Next slide"],
    ["← / ↑", "Previous slide"],
    ["Home", "Re-focus current slide"],
    ["End", "Jump to last slide"],
    ["f", "Toggle fullscreen"],
    ["e", "Edit current slide (line mode)"],
    ["n", "Toggle speaker notes"],
    ["t", "Toggle thumbnails sidebar"],
    ["a", "Toggle ink annotation"],
    ["x", "Toggle eraser (within ink mode)"],
    ["c", "Clear ink on current slide"],
    ["k", "Cycle ink color"],
    ["m", "Toggle floating sticky note"],
    ["s", "Toggle spotlight"],
    ["T", "Toggle timer"],
    ["?", "Toggle this help"],
    ["Esc / Backspace", "Exit presentation"],
  ];
  helpEl = ownerDocument.createElement("div");
  helpEl.className = "excalidraw-slideshow-help-backdrop";
  helpEl.innerHTML = `
    <div class="excalidraw-slideshow-help-card">
      <h3>Slideshow shortcuts <span class="close" data-act="close">×</span></h3>
      <table>${rows.map(([k, d]) =>
        `<tr><td class="k">${k.split(" / ").map(x => `<kbd>${x}</kbd>`).join(" / ")}</td><td class="d">${d}</td></tr>`
      ).join("")}</table>
    </div>`;
  helpEl.addEventListener("click", (e) => {
    if (e.target === helpEl || e.target?.dataset?.act === "close") closeHelp();
  });
  // Mount on body so position:fixed escapes any ancestor with
  // transform/filter (Excalidraw root sometimes traps fixed). Theme
  // vars inherit via :root regardless.
  contentEl.appendChild(helpEl);
};

// Annotation overlay. Sized to the .excalidraw__canvas-wrapper (NOT
// viewport) so UI elements above/around the canvas keep their native
// hover/pointer behavior — no elementFromPoint hit-test gymnastics.
// Strokes stored as objects so we can support per-stroke erase and
// re-render on resize without losing data.
let inkLayerEl = null;
let inkCtx = null;
let inkActive = false;
let inkEraseMode = false;
let inkDrawing = false;
let inkCurrentStroke = null;
const inkStrokes = []; // current slide's strokes — [{color, width, points: [[x,y], ...]}]
const inkStrokesPerSlide = new Map(); // slideIdx → strokes[]
const INK_STROKE_CAP_PER_SLIDE = 800; // soft cap to bound memory on long sessions
const swapInkForSlide = (fromIdx, toIdx) => {
  if (fromIdx === toIdx) return;
  // Save outgoing slide's strokes (only if any exist, to avoid Map bloat).
  if (fromIdx != null && fromIdx >= 0) {
    if (inkStrokes.length > 0) inkStrokesPerSlide.set(fromIdx, inkStrokes.slice());
    else inkStrokesPerSlide.delete(fromIdx);
  }
  // Load incoming slide.
  inkStrokes.length = 0;
  const restored = inkStrokesPerSlide.get(toIdx);
  if (restored) inkStrokes.push(...restored);
  redrawInk();
};
const INK_STYLE_ID = "excalidraw-slideshow-ink-style";
const INK_DEFAULT_COLOR = "#ff3860";
const INK_PALETTE = ["#ff3860", "#ffd000", "#3fb950", "#3a8ade", "#111111", "#ffffff"];
let inkColorIdx = 0;
let inkColor = INK_PALETTE[inkColorIdx];
const cycleInkColor = () => {
  inkColorIdx = (inkColorIdx + 1) % INK_PALETTE.length;
  inkColor = INK_PALETTE[inkColorIdx];
  refreshInkColorDot();
};
const refreshInkColorDot = () => {
  const dot = controlPanelEl?.querySelector('[data-role="ink-color"] span');
  if (dot) dot.style.background = inkColor;
};
// Overflow ("more tools") popover. Hosts secondary panel buttons that
// would otherwise crowd the main bar (laser, spotlight, sticky, timer,
// help, refocus, print). We physically move them in/out so their event
// handlers + state stay intact — no proxy buttons, no duplicated logic.
let overflowPopoverEl = null;
const outsideOverflowPopover = (e) => {
  if (!overflowPopoverEl) return;
  if (overflowPopoverEl.contains(e.target)) return;
  if (e.target.closest?.('[data-role="overflow"]')) return;
  closeOverflowPopover();
};
const closeOverflowPopover = () => {
  if (!overflowPopoverEl) return;
  const restores = overflowPopoverEl._origPositions || [];
  for (const r of restores) {
    try {
      if (r.next && r.next.parentNode === r.parent) r.parent.insertBefore(r.btn, r.next);
      else r.parent.appendChild(r.btn);
    } catch (_) {}
  }
  overflowPopoverEl.remove();
  overflowPopoverEl = null;
  ownerDocument.removeEventListener("pointerdown", outsideOverflowPopover, true);
};
const toggleOverflowPopover = () => {
  if (overflowPopoverEl) { closeOverflowPopover(); return; }
  if (!controlPanelEl) return;
  const secs = Array.from(controlPanelEl.querySelectorAll('button[data-secondary]'));
  if (secs.length === 0) return;
  overflowPopoverEl = ownerDocument.createElement("div");
  overflowPopoverEl.className = "excalidraw-slideshow-overflow";
  overflowPopoverEl._origPositions = secs.map(b => ({ btn: b, parent: b.parentElement, next: b.nextSibling }));
  for (const b of secs) overflowPopoverEl.appendChild(b);
  // Mount on contentEl — body mount is invisible in browser fullscreen.
  contentEl.appendChild(overflowPopoverEl);
  const r = controlPanelEl.getBoundingClientRect();
  const popW = overflowPopoverEl.offsetWidth || 240;
  const popH = overflowPopoverEl.offsetHeight || 40;
  let left = r.right - popW;
  // Lift well clear of the toolbar so the popover does not overlap it.
  // Same 36px gap pattern as the pen color popover for visual consistency.
  let top  = r.top - popH - 36;
  left = Math.max(8, Math.min(ownerWindow.innerWidth - popW - 8, left));
  if (top < 8) top = r.bottom + 8;
  overflowPopoverEl.style.left = `${left}px`;
  overflowPopoverEl.style.top  = `${top}px`;
  ownerDocument.addEventListener("pointerdown", outsideOverflowPopover, true);
};

// Pen color popover — small palette anchored under the pen button.
let penPopoverEl = null;
const PEN_POPOVER_STYLE_ID = "excalidraw-slideshow-pen-popover-style";
const ensurePenPopoverStyle = () => {
  if (ownerDocument.getElementById(PEN_POPOVER_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = PEN_POPOVER_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-pen-popover {
      position: fixed;
      z-index: 99992;
      min-width: 240px;
      background: var(--background-primary);
      border: 1px solid var(--default-border-color);
      border-radius: 8px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.35);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      animation: excali-slideshow-overlay-in 140ms cubic-bezier(.16,1,.3,1) both;
    }
    .excalidraw-slideshow-pen-popover .swatch {
      width: 22px; height: 22px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid var(--default-border-color);
      box-sizing: border-box;
      transition: transform 100ms ease;
    }
    .excalidraw-slideshow-pen-popover .swatch:hover { transform: scale(1.12); }
    .excalidraw-slideshow-pen-popover .swatch.is-active {
      box-shadow: 0 0 0 2px var(--color-primary, var(--interactive-accent));
    }
  `;
  ownerDocument.head.appendChild(s);
};
const closePenPopover = () => {
  if (!penPopoverEl) return;
  penPopoverEl.remove();
  penPopoverEl = null;
  ownerDocument.removeEventListener("pointerdown", outsidePenPopover, true);
};
const outsidePenPopover = (e) => {
  if (!penPopoverEl) return;
  if (penPopoverEl.contains(e.target) || e.target.closest?.('[data-role="ink-toggle"], [data-role="ink-color-chevron"]')) return;
  closePenPopover();
};
const openPenPopover = () => {
  ensurePenPopoverStyle();
  closePenPopover();
  const btn = controlPanelEl?.querySelector('[data-role="ink-toggle"]');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  penPopoverEl = ownerDocument.createElement("div");
  penPopoverEl.className = "excalidraw-slideshow-pen-popover";
  const swatchRow = ownerDocument.createElement("div");
  swatchRow.style.cssText = "display:flex;gap:6px;align-items:center;";
  for (let i = 0; i < INK_PALETTE.length; i++) {
    const sw = ownerDocument.createElement("span");
    sw.className = "swatch" + (i === inkColorIdx ? " is-active" : "");
    sw.style.background = INK_PALETTE[i];
    sw.title = INK_PALETTE[i];
    sw.addEventListener("click", (e) => {
      e.stopPropagation();
      inkColorIdx = i;
      inkColor = INK_PALETTE[i];
      refreshInkColorDot();
      try {
        excalidrawAPI.updateScene({ appState: { currentItemStrokeColor: inkColor } });
      } catch (_) {}
      // If pen is off, picking a color also activates it. Most intuitive:
      // tap a swatch → start drawing in that color.
      if (!inkActive) {
        toggleInk();
      } else if (inkEraseMode) {
        // Picking a color implies the user wants the pen, not eraser.
        inkEraseMode = false;
        ownerDocument.body.classList.remove("excali-ink-erase");
        try { excalidrawAPI.setActiveTool({ type: "freedraw" }); } catch (_) {}
        updateInkButtonStates();
      }
      swatchRow.querySelectorAll(".swatch").forEach((s, idx) => {
        s.classList.toggle("is-active", idx === inkColorIdx);
      });
    });
    swatchRow.appendChild(sw);
  }
  penPopoverEl.appendChild(swatchRow);
  // Thickness slider — writes currentItemStrokeWidth. Excalidraw freedraw
  // accepts any number; 1-8 covers the useful range.
  const thickRow = ownerDocument.createElement("div");
  thickRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;font-weight:700;color:var(--text-muted);";
  thickRow.innerHTML = `<span>SIZE</span>`;
  const slider = ownerDocument.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "8";
  slider.step = "0.5";
  // Pull current width from Excalidraw — fallback to 2.
  try { slider.value = String(excalidrawAPI.getAppState().currentItemStrokeWidth ?? 2); }
  catch (_) { slider.value = "2"; }
  slider.style.cssText = "flex:1;accent-color: var(--interactive-accent);";
  const valueEl = ownerDocument.createElement("span");
  valueEl.style.cssText = "min-width:24px;text-align:right;color:var(--text-normal);";
  valueEl.textContent = `${slider.value}px`;
  slider.addEventListener("input", (e) => {
    e.stopPropagation();
    const v = parseFloat(slider.value);
    valueEl.textContent = `${v}px`;
    try {
      excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: v } });
    } catch (_) {}
  });
  thickRow.appendChild(slider);
  thickRow.appendChild(valueEl);
  penPopoverEl.appendChild(thickRow);
  contentEl.appendChild(penPopoverEl);
  // Anchor above the bottom panel — easier reach than micro-popover under a
  // small button. Falls back to button anchor if panel not measurable.
  const popW = penPopoverEl.offsetWidth || 220;
  const popH = penPopoverEl.offsetHeight || 40;
  const panelR = controlPanelEl?.getBoundingClientRect?.();
  let left, top;
  if (panelR && panelR.width > 0) {
    left = panelR.left + panelR.width / 2 - popW / 2;
    top  = panelR.top - popH - 36;
  } else {
    left = r.left + r.width / 2 - popW / 2;
    top  = r.top - popH - 8;
  }
  left = Math.max(8, Math.min(ownerWindow.innerWidth - popW - 8, left));
  if (top < 8) top = (panelR?.bottom ?? r.bottom) + 8;
  penPopoverEl.style.left = `${left}px`;
  penPopoverEl.style.top = `${top}px`;
  ownerDocument.addEventListener("pointerdown", outsidePenPopover, true);
};
const ensureInkStyle = () => {
  if (ownerDocument.getElementById(INK_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = INK_STYLE_ID;
  // Layer always non-interactive (pointer-events: none). All input goes
  // to document; we filter UI hits and forward to canvas for native
  // hover. Crosshair shown on the .excalidraw canvas via body class.
  s.textContent = `
    .excalidraw-slideshow-ink {
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      z-index: 5;
      pointer-events: none;
      touch-action: none;
      contain: layout paint;
    }
    body.excali-ink-active .excalidraw canvas { cursor: crosshair !important; }
    body.excali-ink-active.excali-ink-erase .excalidraw canvas { cursor: cell !important; }
  `;
  ownerDocument.head.appendChild(s);
};
const positionInkLayer = () => {
  if (!inkLayerEl) return;
  // CSS handles position/size (position:absolute, 100%/100% inside the
  // .excalidraw parent). We just need to keep the canvas BITMAP in sync
  // with the rendered size + dpr so strokes stay crisp.
  const r = inkLayerEl.getBoundingClientRect();
  const rw = r.width, rh = r.height;
  const dpr = ownerWindow.devicePixelRatio || 1;
  inkLayerEl.width = Math.max(1, Math.round(rw * dpr));
  inkLayerEl.height = Math.max(1, Math.round(rh * dpr));
  inkCtx = inkLayerEl.getContext("2d");
  inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  redrawInk();
};
// Strokes stored in SCENE coords so they survive pan/zoom. Width stored
// as base pixels at zoom=1; rendered = base * zoom for visual constancy.
const sceneFromClient = (clientX, clientY) => {
  const s = excalidrawAPI.getAppState();
  const z = s.zoom?.value ?? 1;
  const oL = s.offsetLeft ?? 0, oT = s.offsetTop ?? 0;
  return [(clientX - oL) / z - s.scrollX, (clientY - oT) / z - s.scrollY];
};
const clientFromScene = (sx, sy) => {
  const s = excalidrawAPI.getAppState();
  const z = s.zoom?.value ?? 1;
  const oL = s.offsetLeft ?? 0, oT = s.offsetTop ?? 0;
  return [(sx + s.scrollX) * z + oL, (sy + s.scrollY) * z + oT];
};
const getZoomScaledWidth = (base = 3) => {
  const z = excalidrawAPI.getAppState().zoom?.value ?? 1;
  return Math.max(1.2, base * Math.max(0.3, z));
};
const redrawInk = () => {
  if (!inkCtx || !inkLayerEl) return;
  const w = parseFloat(inkLayerEl.style.width) || 0;
  const h = parseFloat(inkLayerEl.style.height) || 0;
  inkCtx.clearRect(0, 0, w, h);
  const z = excalidrawAPI.getAppState().zoom?.value ?? 1;
  // Layer parent may have transform → position:fixed escapes to that
  // ancestor, not viewport. Account for layer rect offset so drawn pixels
  // land under cursor regardless of where the layer sits.
  const lr = inkLayerEl.getBoundingClientRect();
  const oxLayer = lr.left, oyLayer = lr.top;
  const cx = (sx, sy) => {
    const p = clientFromScene(sx, sy);
    return [p[0] - oxLayer, p[1] - oyLayer];
  };
  for (const stroke of inkStrokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    inkCtx.strokeStyle = stroke.color;
    inkCtx.lineWidth = Math.max(1.2, (stroke.baseWidth ?? 3) * z);
    inkCtx.beginPath();
    const pts = stroke.points;
    const [x0, y0] = cx(pts[0][0], pts[0][1]);
    inkCtx.moveTo(x0, y0);
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, ay] = cx(pts[i][0], pts[i][1]);
      const [bx, by] = cx(pts[i+1][0], pts[i+1][1]);
      inkCtx.quadraticCurveTo(ax, ay, (ax+bx)/2, (ay+by)/2);
    }
    if (pts.length > 1) {
      const [lx, ly] = cx(pts[pts.length-1][0], pts[pts.length-1][1]);
      inkCtx.lineTo(lx, ly);
    }
    inkCtx.stroke();
  }
  // Cut out UI rects so strokes never visibly cover them. clearRect on
  // the canvas-2D bitmap is cheap and matches the live UI exactly.
  const cutouts = [
    controlPanelEl,
    notesEl, thumbsEl, stickyNoteEl,
    timerEl, helpEl, endConfirmEl,
    penPopoverEl, overflowPopoverEl, spotlightHud,
  ];
  for (const node of cutouts) {
    if (!node) continue;
    const r = node.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const pad = 6;
    inkCtx.clearRect(
      r.left - oxLayer - pad,
      r.top  - oyLayer - pad,
      r.width  + pad * 2,
      r.height + pad * 2,
    );
  }
};
// Point-to-segment distance in SCENE coords for eraser hit-test.
const pointNearStroke = (x, y, stroke, tolerance) => {
  const pts = stroke.points;
  const tol2 = tolerance * tolerance;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i+1];
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx*dx + dy*dy || 1;
    let t = ((x - x1) * dx + (y - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx, py = y1 + t * dy;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 <= tol2) return true;
  }
  return false;
};
const eraseAt = (sx, sy) => {
  const z = excalidrawAPI.getAppState().zoom?.value ?? 1;
  // 8 screen px → scene px = 8 / zoom; never below 2 in scene.
  const tol = Math.max(2, 10 / Math.max(0.3, z));
  let removed = false;
  for (let i = inkStrokes.length - 1; i >= 0; i--) {
    if (pointNearStroke(sx, sy, inkStrokes[i], tol)) {
      inkStrokes.splice(i, 1);
      removed = true;
    }
  }
  if (removed) redrawInk();
};
const installInkLayer = () => {
  ensureInkStyle();
  if (inkLayerEl) return;
  inkLayerEl = ownerDocument.createElement("canvas");
  inkLayerEl.className = "excalidraw-slideshow-ink";
  // Mount inside .excalidraw (position:absolute relative to it). Body
  // mount disappears in browser fullscreen (which only renders descendants
  // of the fullscreen element). Sizing math uses getBoundingClientRect
  // so transform-trapping doesn't break cursor alignment.
  const excaliMount = contentEl.querySelector(".excalidraw") || ownerDocument.body;
  excaliMount.appendChild(inkLayerEl);
  positionInkLayer();
  const onWinResize = () => positionInkLayer();
  ownerWindow.addEventListener("resize", onWinResize, { passive: true });
  // Track .excalidraw size changes too — sidebar toggles, layout swaps
  // don't fire window resize but do change the board bounding rect.
  let inkResizeObs = null;
  try {
    const excaliEl = hostView?.excalidrawContainer || contentEl.querySelector(".excalidraw");
    if (excaliEl && typeof ResizeObserver !== "undefined") {
      inkResizeObs = new ResizeObserver(() => positionInkLayer());
      inkResizeObs.observe(excaliEl);
    }
  } catch (_) {}
  // Layer is pointer-events: none always. Pointer input flows to native
  // UI underneath (panel/modals/canvas). We listen on the document at
  // capture phase: if the event target is one of our overlays, skip it
  // — native code handles. Otherwise treat as a canvas draw event.
  const isUIElement = (target) => {
    if (!target || !target.closest) return false;
    return !!target.closest(
      ".excalidraw-presentation-panel," +
      ".excalidraw-slideshow-notes," +
      ".excalidraw-slideshow-thumbs," +
      ".excalidraw-slideshow-sticky," +
      ".excalidraw-slideshow-help-backdrop," +
      ".excalidraw-slideshow-end-backdrop," +
      ".excalidraw-slideshow-esc-hint," +
      ".excalidraw-slideshow-timer," +
      ".excalidraw-slideshow-pen-popover"
    );
  };
  // Returns SCENE coords so strokes anchor to canvas (survive pan/zoom).
  const sceneAt = (e) => sceneFromClient(e.clientX, e.clientY);
  const insideLayer = (e) => {
    if (!inkLayerEl) return false;
    const r = inkLayerEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  const onDown = (e) => {
    if (!inkActive) return;
    if (isUIElement(e.target)) return; // native UI handles it
    if (!insideLayer(e)) return; // outside the board — let host UI handle
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    const [sx, sy] = sceneAt(e);
    if (inkEraseMode) {
      inkDrawing = true;
      eraseAt(sx, sy);
      return;
    }
    inkDrawing = true;
    inkCurrentStroke = {
      color: inkColor,
      baseWidth: 3,
      points: [[sx, sy]],
    };
    inkStrokes.push(inkCurrentStroke);
    while (inkStrokes.length > INK_STROKE_CAP_PER_SLIDE) inkStrokes.shift();
    redrawInk();
  };
  let rafPending = false;
  let pendingPoint = null;
  const flushMove = () => {
    rafPending = false;
    if (!inkDrawing || !pendingPoint) return;
    const [sx, sy] = pendingPoint;
    pendingPoint = null;
    if (inkEraseMode) { eraseAt(sx, sy); return; }
    if (!inkCurrentStroke) return;
    inkCurrentStroke.points.push([sx, sy]);
    redrawInk();
  };
  const onMove = (e) => {
    if (!inkActive) return;
    if (isUIElement(e.target)) return;
    if (!inkDrawing) return;
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    pendingPoint = sceneAt(e);
    if (!rafPending) {
      rafPending = true;
      ownerWindow.requestAnimationFrame(flushMove);
    }
  };
  const onUp = (e) => {
    if (inkDrawing) {
      try { e.stopPropagation(); e.stopImmediatePropagation?.(); } catch (_) {}
    }
    inkDrawing = false;
    inkCurrentStroke = null;
  };
  // Document-level capture-phase listeners. Layer is pointer-events:none
  // so it never intercepts; native UI keeps full hover/click. Drawing
  // events are filtered via target test.
  ownerDocument.addEventListener("pointerdown", onDown, true);
  ownerDocument.addEventListener("pointermove", onMove, { capture: true, passive: true });
  ownerDocument.addEventListener("pointerup", onUp, true);
  ownerDocument.addEventListener("pointercancel", onUp, true);
  // Re-render when canvas pans/zooms — points are in scene coords.
  let scrollRaf = 0;
  const unsubScroll = excalidrawAPI.onScrollChange?.(() => {
    if (scrollRaf) return;
    scrollRaf = ownerWindow.requestAnimationFrame(() => {
      scrollRaf = 0;
      redrawInk();
    });
  });
  hostView._slideshowInkCleanup = () => {
    try { unsubScroll?.(); } catch (_) {}
    try { inkResizeObs?.disconnect(); } catch (_) {}
    if (scrollRaf) ownerWindow.cancelAnimationFrame(scrollRaf);
    ownerWindow.removeEventListener("resize", onWinResize);
    ownerDocument.removeEventListener("pointerdown", onDown, true);
    ownerDocument.removeEventListener("pointermove", onMove, { capture: true });
    ownerDocument.removeEventListener("pointerup", onUp, true);
    ownerDocument.removeEventListener("pointercancel", onUp, true);
    inkLayerEl?.remove();
    inkLayerEl = null;
    inkCtx = null;
    inkActive = false;
    inkEraseMode = false;
    inkStrokes.length = 0;
    inkStrokesPerSlide.clear();
    ownerDocument.body.classList.remove("excali-ink-active", "excali-ink-erase");
    ownerDocument.getElementById(INK_STYLE_ID)?.remove();
    delete hostView._slideshowInkCleanup;
  };
};
// ---- Pen now uses NATIVE Excalidraw freedraw tool ----
// Strokes become real scene elements: anchored, deletable via Excalidraw's
// own eraser, perform-fast (no JS canvas redraw), survive pan/zoom natively.
// This matches the experience of pressing '7' (freedraw) in Excalidraw.
const setExcaliColor = (color) => {
  try {
    excalidrawAPI.updateScene({ appState: { currentItemStrokeColor: color } });
  } catch (_) {}
};
const clearInk = () => {
  // Delete only freedraw drawn DURING the slideshow. Pre-existing
  // elements (tracked in preExistingLockState) are preserved.
  try {
    const all = excalidrawAPI.getSceneElements();
    const next = all.filter(el => {
      if (el.type !== "freedraw") return true;
      // Pre-existing? keep. Drawn-during? drop.
      return preExistingLockState.has(el.id);
    });
    if (next.length !== all.length) {
      excalidrawAPI.updateScene({ elements: next, commitToHistory: true });
    }
  } catch (e) {
    console.warn("[slideshow] clearInk failed:", e);
  }
};
const toggleInk = () => {
  inkActive = !inkActive;
  if (!inkActive) inkEraseMode = false;
  // Mutex with laser.
  if (inkActive && isLaserOn) {
    isLaserOn = false;
    const laserBtn = controlPanelEl?.querySelector('[data-role="laser-toggle"]');
    if (laserBtn) laserBtn.innerHTML = SVG_LASER_OFF;
  }
  // Mutex with spotlight.
  if (inkActive && spotlightVisible) toggleSpotlight();
  ownerDocument.body.classList.toggle("excali-ink-active", inkActive);
  ownerDocument.body.classList.toggle("excali-ink-erase", inkActive && inkEraseMode);
  // Mark scene dirty so freedraw strokes survive presentation exit save.
  if (inkActive) shouldSaveAfterThePresentation = true;
  try {
    if (inkActive) {
      // View mode locks every tool to selection. Drop it so freedraw works.
      ea.setViewModeEnabled(false);
      setExcaliColor(inkColor);
      excalidrawAPI.setActiveTool({ type: inkEraseMode ? "eraser" : "freedraw" });
    } else {
      excalidrawAPI.setActiveTool({ type: "selection" });
      // Re-enable view mode so nothing else can be edited accidentally.
      ea.setViewModeEnabled(true);
    }
  } catch (e) {
    console.warn("[slideshow] setActiveTool failed:", e);
  }
  if (inkActive) {
    new ea.obsidian.Notice("Pen ON — native Excalidraw freedraw", 1200);
  }
  updateInkButtonStates();
};
const toggleInkEraser = () => {
  if (!inkActive) return;
  inkEraseMode = !inkEraseMode;
  ownerDocument.body.classList.toggle("excali-ink-erase", inkActive && inkEraseMode);
  try {
    excalidrawAPI.setActiveTool({ type: inkEraseMode ? "eraser" : "freedraw" });
  } catch (_) {}
  updateInkButtonStates();
};
// Reflect tool state in panel buttons (active highlight).
const updateInkButtonStates = () => {
  if (!controlPanelEl) return;
  const inkBtn    = controlPanelEl.querySelector('[data-role="ink-toggle"]');
  const eraserBtn = controlPanelEl.querySelector('[data-role="ink-eraser"]');
  const laserBtn  = controlPanelEl.querySelector('[data-role="laser-toggle"]');
  inkBtn?.classList.toggle("is-active", inkActive && !inkEraseMode);
  eraserBtn?.classList.toggle("is-active", inkActive && inkEraseMode);
  laserBtn?.classList.toggle("is-active", isLaserOn);
};

// End-of-slideshow confirm overlay. Forward past last (or backward
// before first) used to silently exit. Show modal asking to confirm.
let endConfirmEl = null;
const END_STYLE_ID = "excalidraw-slideshow-end-style";
const ensureEndStyle = () => {
  if (ownerDocument.getElementById(END_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = END_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-end-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(2px);
      z-index: 99994;
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 16vh;
      animation: excali-slideshow-overlay-in 180ms cubic-bezier(.16,1,.3,1) both;
      contain: layout style paint;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-end-backdrop { animation-duration: 1ms !important; backdrop-filter: none !important; }
    }
    .excalidraw-slideshow-end-card {
      min-width: 300px;
      max-width: 380px;
      padding: 22px 24px;
      background: var(--background-primary, var(--island-bg-color, #ffffff));
      color: var(--text-normal, #1a1a1a);
      border-radius: 12px;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 28%, transparent));
      box-shadow: var(--shadow-island, 0 16px 48px rgba(0,0,0,0.5));
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .excalidraw-slideshow-end-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-normal);
    }
    .excalidraw-slideshow-end-card p {
      margin: 0 0 18px 0;
      font-size: 13px;
      color: var(--text-normal);
      opacity: 0.85;
    }
    .excalidraw-slideshow-end-actions {
      display: flex; gap: 8px; justify-content: center;
    }
    .excalidraw-slideshow-end-actions button {
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--icon-fill-color) 18%, transparent);
      background: transparent;
      color: var(--text-normal);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 120ms ease;
    }
    .excalidraw-slideshow-end-actions button:hover {
      background: color-mix(in srgb, var(--icon-fill-color) 12%, transparent);
    }
    .excalidraw-slideshow-end-actions button.primary {
      background: var(--interactive-accent, var(--icon-fill-color));
      color: var(--text-on-accent, var(--background-primary));
      border-color: transparent;
    }
    .excalidraw-slideshow-end-actions button.primary:hover {
      filter: brightness(1.1);
    }
    .excalidraw-slideshow-end-actions button.danger {
      color: color-mix(in srgb, #e53935 80%, var(--text-normal));
      border-color: color-mix(in srgb, #e53935 28%, transparent);
    }
    .excalidraw-slideshow-end-actions button.danger:hover {
      background: color-mix(in srgb, #e53935 14%, transparent);
    }
  `;
  ownerDocument.head.appendChild(s);
};
const closeEndConfirm = () => {
  if (endConfirmEl) { endConfirmEl.remove(); endConfirmEl = null; }
};
const showEndConfirm = (direction) => {
  ensureEndStyle();
  closeEndConfirm();
  const backdrop = ownerDocument.createElement("div");
  backdrop.className = "excalidraw-slideshow-end-backdrop";
  const isEnd = direction === "fwd";
  backdrop.innerHTML = `
    <div class="excalidraw-slideshow-end-card">
      <h3>${isEnd ? "End of slideshow" : "Start of slideshow"}</h3>
      <p>${isEnd ? "You're on the last slide." : "You're on the first slide."} What next?</p>
      <div class="excalidraw-slideshow-end-actions">
        <button class="primary" data-act="restart">${isEnd ? "Restart" : "Go to end"}</button>
        <button data-act="stay">Stay</button>
        <button class="danger" data-act="exit">Exit</button>
      </div>
    </div>`;
  backdrop.addEventListener("click", (e) => {
    const act = e.target?.dataset?.act;
    if (act === "exit") { closeEndConfirm(); exitPresentation(); }
    else if (act === "restart") {
      closeEndConfirm();
      slide = isEnd ? -1 : slides.length;
      navigate(isEnd ? "fwd" : "bkwd");
    }
    else if (act === "stay" || e.target === backdrop) closeEndConfirm();
  });
  contentEl.appendChild(backdrop);
  endConfirmEl = backdrop;
};

// Phase 2c: thumbnails sidebar. Lazy: full-scene SVG cached once on
// first open, each thumb is a cheap clone w/ adjusted viewBox.
let thumbsEl = null;
let thumbsVisible = false;
let cachedSceneSVG = null;
const THUMBS_STYLE_ID = "excalidraw-slideshow-thumbs-style";
const ensureThumbsStyle = () => {
  if (ownerDocument.getElementById(THUMBS_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = THUMBS_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-thumbs {
      position: absolute;
      contain: layout style;
      left: 12px;
      top: 12px;
      bottom: 64px;
      width: var(--thumbs-w, 196px);
      min-width: 130px;
      max-width: 360px;
      display: flex; flex-direction: column;
      background: var(--background-primary, var(--island-bg-color, #fff));
      border-radius: 10px;
      border: 1px solid var(--default-border-color);
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
      z-index: 99990;
      animation: excali-slideshow-overlay-in 220ms cubic-bezier(.16,1,.3,1) both;
    }
    .excalidraw-slideshow-thumbs .thumbs-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--default-border-color);
      flex-shrink: 0;
    }
    .excalidraw-slideshow-thumbs .thumbs-header .title {
      font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--text-normal);
    }
    .excalidraw-slideshow-thumbs .thumbs-header .actions { display: inline-flex; gap: 4px; }
    .excalidraw-slideshow-thumbs .thumbs-header button {
      width: 22px; height: 20px;
      padding: 0;
      border-radius: 4px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-normal);
      font-size: 12px;
      cursor: pointer;
    }
    .excalidraw-slideshow-thumbs .thumbs-header button:hover { background: color-mix(in srgb, var(--icon-fill-color) 14%, transparent); }
    .excalidraw-slideshow-thumbs .thumbs-body {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .excalidraw-slideshow-thumbs .resize-handle {
      position: absolute;
      right: -3px; top: 0; bottom: 0;
      width: 6px;
      cursor: ew-resize;
      background: transparent;
    }
    .excalidraw-slideshow-thumbs .resize-handle:hover { background: color-mix(in srgb, var(--interactive-accent) 30%, transparent); }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-thumbs { animation-duration: 1ms !important; }
      .excalidraw-slideshow-thumb { transition: none !important; }
    }
    .excalidraw-slideshow-thumbs::-webkit-scrollbar { width: 6px; }
    .excalidraw-slideshow-thumbs::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--icon-fill-color) 20%, transparent);
      border-radius: 3px;
    }
    .excalidraw-slideshow-thumb {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      margin-bottom: 8px;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid var(--default-border-color);
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
    }
    .excalidraw-slideshow-thumb:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
    .excalidraw-slideshow-thumb:hover { transform: scale(1.02); }
    .excalidraw-slideshow-thumb.active {
      border-color: var(--interactive-accent, var(--icon-fill-color));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--interactive-accent, var(--icon-fill-color)) 35%, transparent), 0 4px 12px rgba(0,0,0,0.25);
    }
    .excalidraw-slideshow-thumb.active .thumb-num {
      background: var(--interactive-accent, #6965db);
      color: var(--text-on-accent, #fff);
    }
    .excalidraw-slideshow-thumb svg {
      width: 100%; height: 100%; display: block;
    }
    .excalidraw-slideshow-thumb .thumb-num {
      position: absolute;
      left: 4px; bottom: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(0,0,0,0.55);
      color: #fff;
      pointer-events: none;
    }
    .excalidraw-slideshow-thumb .reorder {
      position: absolute;
      right: 4px; top: 4px;
      display: flex; flex-direction: column; gap: 2px;
      opacity: 0;
      transition: opacity 100ms ease;
    }
    .excalidraw-slideshow-thumb:hover .reorder { opacity: 1; }
    .excalidraw-slideshow-thumb .reorder button {
      width: 20px; height: 16px;
      padding: 0;
      border-radius: 3px;
      border: 1px solid var(--default-border-color);
      background: rgba(255,255,255,0.92);
      color: #111;
      font-size: 11px;
      line-height: 1;
      font-weight: 700;
      cursor: pointer;
    }
    .excalidraw-slideshow-thumb .reorder button:hover { background: var(--interactive-accent, #6965db); color: #fff; }
    .excalidraw-slideshow-thumb .reorder button:disabled { opacity: 0.35; cursor: not-allowed; }
  `;
  ownerDocument.head.appendChild(s);
};
const buildThumbSVG = (slideRect) => {
  if (!cachedSceneSVG) return null;
  const host = ownerDocument.createElement("div");
  host.innerHTML = cachedSceneSVG.outerHTML;
  const svg = host.firstElementChild;
  const padding = 40;
  const { width: vw, height: vh } = excalidrawAPI.getAppState();
  const nav = getNavigationRect({
    ...slideRect,
    printDimensions: { width: vw, height: vh }
  });
  const w = Math.abs(nav.right - nav.left);
  const h = Math.abs(nav.bottom - nav.top);
  const { topX, topY } = ea.getBoundingBox(ea.getViewElements());
  svg.setAttribute("viewBox", `${nav.left - (topX - padding)} ${nav.top - (topY - padding)} ${w} ${h}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return svg;
};
const highlightActiveThumb = () => {
  if (!thumbsEl) return;
  thumbsEl.querySelectorAll(".excalidraw-slideshow-thumb").forEach((t, i) => {
    t.classList.toggle("active", i === slide);
    if (i === slide) t.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  const title = thumbsEl.querySelector(".thumbs-header .title");
  if (title) title.textContent = `Slide ${slide+1} / ${slides.length}`;
};
// Reorder a slide by swapping with neighbor. Frame mode only — line mode
// would require rewriting the path arrow points which is destructive.
const reorderSlide = (i, dir) => {
  if (presentationPathType !== "frame") return;
  const j = i + dir;
  if (j < 0 || j >= slides.length) return;
  [slides[i], slides[j]] = [slides[j], slides[i]];
  [frames[i], frames[j]] = [frames[j], frames[i]];
  // Swap per-slide ink — Map keyed by index, so re-bind.
  const a = inkStrokesPerSlide.get(i);
  const b = inkStrokesPerSlide.get(j);
  if (b !== undefined) inkStrokesPerSlide.set(i, b); else inkStrokesPerSlide.delete(i);
  if (a !== undefined) inkStrokesPerSlide.set(j, a); else inkStrokesPerSlide.delete(j);
  // Track current slide.
  if (slide === i) slide = j;
  else if (slide === j) slide = i;
  rebuildThumbsBody();
};
// Rebuild only the .thumbs-body without tearing down the sidebar.
const rebuildThumbsBody = () => {
  if (!thumbsEl) return;
  const body = thumbsEl.querySelector(".thumbs-body");
  if (!body) return;
  try { thumbsEl._io?.disconnect(); } catch (_) {}
  body.innerHTML = "";
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const t = entry.target;
      if (t._rendered) continue;
      t._rendered = true;
      const i = Number(t.dataset.idx);
      const svg = buildThumbSVG(slides[i]);
      if (svg) t.insertBefore(svg, t.firstChild);
      io.unobserve(t);
    }
  }, { root: body, rootMargin: "200px 0px" });
  thumbsEl._io = io;
  for (let i = 0; i < slides.length; i++) {
    body.appendChild(makeThumbEl(i));
    io.observe(body.lastChild);
  }
  highlightActiveThumb();
  const title = thumbsEl.querySelector(".thumbs-header .title");
  if (title) title.textContent = `Slide ${slide+1} / ${slides.length}`;
};
const makeThumbEl = (i) => {
  const t = ownerDocument.createElement("div");
  t.className = "excalidraw-slideshow-thumb";
  t.dataset.idx = String(i);
  const num = ownerDocument.createElement("div");
  num.className = "thumb-num";
  num.textContent = presentationPathType === "frame"
    ? (frames[i].name || `${i+1}`)
    : `${i+1}`;
  t.appendChild(num);
  if (presentationPathType === "frame") {
    const reorder = ownerDocument.createElement("div");
    reorder.className = "reorder";
    const up = ownerDocument.createElement("button");
    up.textContent = "▲"; up.title = "Move up";
    up.disabled = i === 0;
    up.onclick = (e) => { e.stopPropagation(); reorderSlide(i, -1); };
    const dn = ownerDocument.createElement("button");
    dn.textContent = "▼"; dn.title = "Move down";
    dn.disabled = i === slides.length - 1;
    dn.onclick = (e) => { e.stopPropagation(); reorderSlide(i, +1); };
    reorder.appendChild(up); reorder.appendChild(dn);
    t.appendChild(reorder);
  }
  t.onclick = () => navigateToSlide(i + 1);
  return t;
};
const toggleThumbs = async () => {
  ensureThumbsStyle();
  if (thumbsVisible && thumbsEl) {
    try { thumbsEl._io?.disconnect(); } catch (_) {}
    thumbsEl.remove();
    thumbsEl = null;
    thumbsVisible = false;
    return;
  }
  thumbsEl = ownerDocument.createElement("div");
  thumbsEl.className = "excalidraw-slideshow-thumbs";
  thumbsEl.innerHTML = `
    <div class="thumbs-header">
      <span class="title">Slide ${slide+1} / ${slides.length}</span>
      <span class="actions">
        <button data-act="refresh" title="Rebuild thumbnails">↻</button>
        <button data-act="close" title="Close (t)">×</button>
      </span>
    </div>
    <div class="thumbs-body"></div>
    <div class="resize-handle"></div>
  `;
  getMountRoot().appendChild(thumbsEl);
  thumbsVisible = true;
  thumbsEl.querySelector('[data-act="close"]').onclick = (e) => { e.stopPropagation(); toggleThumbs(); };
  thumbsEl.querySelector('[data-act="refresh"]').onclick = async (e) => {
    e.stopPropagation();
    cachedSceneSVG = null;
    if (thumbsVisible) { await toggleThumbs(); await toggleThumbs(); }
  };
  thumbsEl.addEventListener("pointerdown", (e) => e.stopPropagation(), true);
  // Drag-resize via right-edge handle.
  const handle = thumbsEl.querySelector(".resize-handle");
  let resizing = false, startX = 0, startW = 0;
  handle.addEventListener("pointerdown", (e) => {
    resizing = true;
    startX = e.clientX;
    startW = thumbsEl.offsetWidth;
    handle.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const w = Math.max(130, Math.min(360, startW + dx));
    thumbsEl.style.setProperty("--thumbs-w", `${w}px`);
  });
  const stopResize = (e) => { resizing = false; try { handle.releasePointerCapture?.(e.pointerId); } catch (_) {} };
  handle.addEventListener("pointerup", stopResize);
  handle.addEventListener("pointercancel", stopResize);
  if (!cachedSceneSVG) {
    const padding = 40;
    const st = excalidrawAPI.getAppState();
    cachedSceneSVG = await ea.createViewSVG({
      withBackground: true,
      theme: st.theme,
      frameRendering: { enabled: false, name: false, outline: false, clip: false },
      padding,
      selectedOnly: false,
      skipInliningFonts: true,
      embedScene: false,
    });
  }
  // Lazy thumbnail render via IntersectionObserver. Cloning the full
  // scene SVG for every slide upfront is the slow path — we now only
  // build a thumb's SVG when it scrolls into the sidebar viewport.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const t = entry.target;
      if (t._rendered) continue;
      t._rendered = true;
      const i = Number(t.dataset.idx);
      const svg = buildThumbSVG(slides[i]);
      if (svg) t.insertBefore(svg, t.firstChild);
      io.unobserve(t);
    }
  }, { root: thumbsEl.querySelector(".thumbs-body"), rootMargin: "200px 0px" });
  thumbsEl._io = io;
  const body = thumbsEl.querySelector(".thumbs-body");
  for (let i = 0; i < slides.length; i++) {
    const t = makeThumbEl(i);
    body.appendChild(t);
    io.observe(t);
  }
  highlightActiveThumb();
};

// Speaker notes overlay. Sources:
//   frame mode → frames[slide].customData?.notes (string)
//   line mode  → presentationPathLineEl.customData?.notes?.[slide]
// Toggle with 'n'. Editable inline — saves back to the element's
// customData via ea.copyViewElementsToEAforEditing.
const getSlideNotes = (idx) => {
  if (presentationPathType === "frame") return frames[idx]?.customData?.notes ?? "";
  return presentationPathLineEl?.customData?.notes?.[idx] ?? "";
};
const saveSlideNotes = async (idx, text) => {
  try {
    shouldSaveAfterThePresentation = true;
    // Resolve actual view element. frames[] are clones via cloneElement
    // which can regenerate ids — match by index after re-sorting live
    // frames the same way the slideshow originally did.
    let targetId = null;
    if (presentationPathType === "frame") {
      const liveFrames = ea.getViewElements()
        .filter(e => e.type === "frame")
        .map((e, i) => ({ e, name: getFrameName(e.name, i) }))
        .sort((a, b) => a.name > b.name ? 1 : -1);
      const hit = liveFrames[idx]?.e;
      if (!hit) { console.warn("[slideshow] saveSlideNotes: no live frame at idx", idx, "of", liveFrames.length); return; }
      targetId = hit.id;
    } else {
      targetId = presentationPathLineEl?.id;
    }
    if (!targetId) { console.warn("[slideshow] saveSlideNotes: target not found"); return; }
    ea.clear();
    ea.copyViewElementsToEAforEditing(ea.getViewElements().filter(e => e.id === targetId));
    const el = ea.getElement(targetId);
    if (!el) { console.warn("[slideshow] saveSlideNotes: ea.getElement returned nothing for", targetId); return; }
    const customData = el.customData || {};
    if (presentationPathType === "frame") {
      el.customData = { ...customData, notes: text };
      if (frames[idx]) frames[idx].customData = el.customData;
    } else {
      const existing = customData.notes;
      const notesArr = Array.isArray(existing) ? [...existing]
                     : existing && typeof existing === "object" ? { ...existing }
                     : [];
      notesArr[idx] = text;
      el.customData = { ...customData, notes: notesArr };
      if (presentationPathLineEl) presentationPathLineEl.customData = el.customData;
    }
    await ea.addElementsToView();
  } catch (err) {
    console.error("[slideshow] saveSlideNotes failed:", err);
    new ea.obsidian.Notice("Could not save notes — see console.", 2400);
  }
};
let notesEl = null;
let notesVisible = false;
const NOTES_STYLE_ID = "excalidraw-slideshow-notes-style";
const ensureNotesStyle = () => {
  if (ownerDocument.getElementById(NOTES_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = NOTES_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-notes {
      position: fixed;
      contain: layout style;
      left: 16px;
      bottom: 80px;
      width: 340px;
      min-width: 240px;
      max-width: 80vw;
      max-height: 50vh;
      display: flex;
      flex-direction: column;
      padding: 0;
      background: color-mix(in srgb, var(--background-primary, #fff) calc(var(--notes-opacity, 1) * 100%), transparent);
      color: var(--text-normal, #1a1a1a);
      border-radius: 10px;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 28%, transparent));
      box-shadow: 0 10px 28px rgba(0,0,0,0.35);
      font-size: 14px;
      line-height: 1.55;
      z-index: 99990;
      animation: excali-slideshow-overlay-in 220ms cubic-bezier(.16,1,.3,1) both;
      resize: both;
      overflow: hidden;
      backdrop-filter: blur(6px);
    }
    .excalidraw-slideshow-notes.font-s .notes-body { font-size: 12px; }
    .excalidraw-slideshow-notes.font-m .notes-body { font-size: 14px; }
    .excalidraw-slideshow-notes.font-l .notes-body { font-size: 17px; }
    .excalidraw-slideshow-notes.font-xl .notes-body { font-size: 21px; }
    .excalidraw-slideshow-notes .notes-toolbar {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 10px;
      border-bottom: 1px solid var(--default-border-color);
      background: color-mix(in srgb, var(--icon-fill-color) 8%, transparent);
      flex-shrink: 0;
    }
    .excalidraw-slideshow-notes .notes-toolbar button {
      width: 24px; height: 22px;
      padding: 0;
      border-radius: 4px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .excalidraw-slideshow-notes .notes-toolbar button:hover {
      background: color-mix(in srgb, var(--icon-fill-color) 16%, transparent);
    }
    .excalidraw-slideshow-notes .notes-toolbar button.is-active {
      background: var(--color-primary, var(--interactive-accent));
      color: var(--color-on-primary, var(--text-on-accent, #fff));
    }
    .excalidraw-slideshow-notes .notes-toolbar input[type=range] {
      width: 70px;
      accent-color: var(--interactive-accent);
    }
    .excalidraw-slideshow-notes .notes-toolbar .sep {
      width: 1px; height: 16px;
      background: var(--default-border-color);
      margin: 0 4px;
    }
    .excalidraw-slideshow-notes .notes-body-wrap {
      padding: 12px 14px;
      overflow-y: auto;
      flex: 1;
    }
    .excalidraw-slideshow-notes .notes-edit-btn {
      float: right;
      margin-top: -4px;
      padding: 2px 8px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      background: color-mix(in srgb, var(--interactive-accent, var(--icon-fill-color)) 24%, transparent);
      color: var(--text-normal);
      border: 1px solid color-mix(in srgb, var(--icon-fill-color) 22%, transparent);
      cursor: pointer;
    }
    .excalidraw-slideshow-notes .notes-edit-btn:hover {
      background: color-mix(in srgb, var(--interactive-accent, var(--icon-fill-color)) 40%, transparent);
    }
    .excalidraw-slideshow-notes textarea.notes-editor {
      width: 100%;
      min-height: 120px;
      box-sizing: border-box;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid var(--default-border-color);
      background: var(--background-secondary, color-mix(in srgb, var(--icon-fill-color) 6%, transparent));
      color: var(--text-normal);
      font-family: var(--font-text, inherit);
      font-size: 13px;
      line-height: 1.5;
      resize: vertical;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-notes { animation-duration: 1ms !important; }
    }
    .excalidraw-slideshow-notes .notes-body p { margin: 0 0 6px 0; }
    .excalidraw-slideshow-notes .notes-body pre,
    .excalidraw-slideshow-notes .notes-body code {
      font-size: 12px;
      background: color-mix(in srgb, var(--icon-fill-color) 8%, transparent);
      border-radius: 4px;
    }
    .excalidraw-slideshow-notes .notes-body pre { padding: 6px 8px; }
    .excalidraw-slideshow-notes .notes-body code { padding: 1px 4px; }
    .excalidraw-slideshow-notes .notes-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--default-border-color);
    }
    .excalidraw-slideshow-notes .notes-body {
      color: var(--text-normal);
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .excalidraw-slideshow-notes .notes-body * {
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 100%;
    }
    .excalidraw-slideshow-notes .notes-body pre,
    .excalidraw-slideshow-notes .notes-body code {
      white-space: pre-wrap;
    }
    .excalidraw-slideshow-notes .notes-body { min-height: 28px; }
    .excalidraw-slideshow-notes .notes-label { cursor: grab; user-select: none; }
    .excalidraw-slideshow-notes.is-dragging .notes-label { cursor: grabbing; }
  `;
  ownerDocument.head.appendChild(s);
};
let notesEditing = false;
const openNotesEditor = () => {
  if (!notesEl || notesEditing) return;
  notesEditing = true;
  const body = notesEl.querySelector(".notes-body");
  const current = getSlideNotes(slide);
  body.innerHTML = "";
  const ta = ownerDocument.createElement("textarea");
  ta.className = "notes-editor";
  ta.value = current;
  ta.placeholder = "Markdown supported. Esc cancel, Ctrl+Enter save.";
  body.appendChild(ta);
  // Capture-phase listener guarantees we see textarea keys before the
  // slideshow window listener does. Block all keys except our save/
  // cancel triggers from propagating to the slideshow nav handler.
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); cancel(); return; }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.stopPropagation(); e.preventDefault(); save(); return; }
    // Don't let the slideshow keydown listener prevent typing.
    e.stopPropagation();
  };
  let saved = false;
  const cancel = () => { notesEditing = false; cleanup(); renderNotes(); };
  const save = async () => {
    if (saved) return;
    saved = true;
    notesEditing = false;
    cleanup();
    await saveSlideNotes(slide, ta.value);
    renderNotes();
  };
  const cleanup = () => {
    ta.removeEventListener("keydown", onKey, true);
    ta.removeEventListener("blur", save);
  };
  ta.addEventListener("keydown", onKey, true);
  ta.addEventListener("blur", save);
  // Defer focus past any in-progress focus-rebroadcast from Excalidraw.
  ownerWindow.setTimeout(() => {
    try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) {}
  }, 0);
};
const renderNotes = () => {
  if (!notesEl) return;
  if (notesEditing) return; // editor open — don't trample
  const body = notesEl.querySelector(".notes-body");
  const md = getSlideNotes(slide);
  body.empty?.() ?? (body.innerHTML = "");
  // Edit button always present in render path
  const editBtn = ownerDocument.createElement("button");
  editBtn.className = "notes-edit-btn";
  editBtn.textContent = md ? "Edit" : "Add";
  editBtn.onclick = (e) => { e.stopPropagation(); openNotesEditor(); };
  body.appendChild(editBtn);
  if (!md) return;
  // Markdown render via Obsidian's renderer — supports wiki-links,
  // embeds, code blocks. Source path = current file so relative links
  // resolve. Fallback to plain text if renderer missing.
  try {
    const MarkdownRenderer = ea.obsidian.MarkdownRenderer;
    const sourcePath = ea.targetView?.file?.path ?? "";
    if (MarkdownRenderer?.renderMarkdown) {
      MarkdownRenderer.renderMarkdown(md, body, sourcePath, ea.targetView);
    } else if (MarkdownRenderer?.render) {
      MarkdownRenderer.render(app, md, body, sourcePath, ea.targetView);
    } else {
      body.textContent = md;
    }
  } catch (_) {
    body.textContent = md;
  }
};
let notesOpacity = 1;
let notesFontSize = "m";
const applyNotesOpacity = (val) => {
  if (!notesEl) return;
  notesEl.style.setProperty("--notes-opacity", String(val));
};
const applyNotesFontSize = (key) => {
  if (!notesEl) return;
  notesEl.classList.remove("font-s", "font-m", "font-l", "font-xl");
  notesEl.classList.add("font-" + key);
  notesEl.querySelectorAll('.notes-toolbar [data-fs]').forEach(b => {
    b.classList.toggle("is-active", b.dataset.fs === key);
  });
};
const toggleNotes = () => {
  ensureNotesStyle();
  if (notesVisible && notesEl) {
    try { notesEl._cleanup?.(); } catch (_) {}
    notesEl.remove();
    notesEl = null;
    notesVisible = false;
    return;
  }
  notesEl = ownerDocument.createElement("div");
  notesEl.className = "excalidraw-slideshow-notes";
  notesEl.innerHTML = `
    <div class="notes-label" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:color-mix(in srgb, var(--interactive-accent, var(--icon-fill-color)) 22%, transparent);border-bottom:1px solid var(--default-border-color);">
      <span>Speaker notes — slide ${slide+1}</span>
      <span class="close" title="Close (n)" style="cursor:pointer;opacity:0.7;font-size:16px;line-height:1;">×</span>
    </div>
    <div class="notes-toolbar">
      <button data-act="edit" title="Edit (click Add/Edit)">✎</button>
      <span class="sep"></span>
      <button data-fs="s"  title="Small">S</button>
      <button data-fs="m"  title="Medium">M</button>
      <button data-fs="l"  title="Large">L</button>
      <button data-fs="xl" title="Extra large">XL</button>
      <span class="sep"></span>
      <span title="Opacity" style="font-size:10px;font-weight:700;letter-spacing:0.5px;">α</span>
      <input type="range" min="20" max="100" value="${Math.round(notesOpacity*100)}" data-act="opacity">
    </div>
    <div class="notes-body-wrap"><div class="notes-body"></div></div>
  `;
  contentEl.appendChild(notesEl);
  notesVisible = true;
  applyNotesOpacity(notesOpacity);
  applyNotesFontSize(notesFontSize);
  renderNotes();
  notesEl.querySelector(".close").onclick = (e) => { e.stopPropagation(); toggleNotes(); };
  notesEl.querySelector('[data-act="edit"]').onclick = (e) => { e.stopPropagation(); openNotesEditor(); };
  notesEl.querySelectorAll('[data-fs]').forEach(b => {
    b.onclick = (e) => { e.stopPropagation(); notesFontSize = b.dataset.fs; applyNotesFontSize(notesFontSize); };
  });
  const opa = notesEl.querySelector('[data-act="opacity"]');
  opa.addEventListener("input", (e) => { e.stopPropagation(); notesOpacity = parseInt(opa.value, 10) / 100; applyNotesOpacity(notesOpacity); });
  // (No capture-phase stopPropagation here — it would swallow the header
  // drag handler below. Ink is already blocked via isUIElement which
  // matches .excalidraw-slideshow-notes.)
  // Draggable via header (notes-label). Clamped to viewport so it can't
  // be lost off-screen — mirrors Paper Mode pattern.
  const header = notesEl.querySelector(".notes-label");
  let dragging = false, ox = 0, oy = 0;
  const clampPanel = () => {
    if (!notesEl) return;
    const r = notesEl.getBoundingClientRect();
    const m = 8;
    if (r.right  > ownerWindow.innerWidth  - m) notesEl.style.setProperty("left", `${Math.max(m, ownerWindow.innerWidth  - r.width  - m)}px`, "important");
    if (r.bottom > ownerWindow.innerHeight - m) notesEl.style.setProperty("top",  `${Math.max(m, ownerWindow.innerHeight - r.height - m)}px`, "important");
    if (r.left < m) notesEl.style.setProperty("left", `${m}px`, "important");
    if (r.top  < m) notesEl.style.setProperty("top",  `${m}px`, "important");
    notesEl.style.setProperty("bottom", "auto", "important");
    notesEl.style.setProperty("right",  "auto", "important");
  };
  header.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".close")) return;
    const r = notesEl.getBoundingClientRect();
    dragging = true; ox = e.clientX - r.left; oy = e.clientY - r.top;
    notesEl.classList.add("is-dragging");
    notesEl.style.setProperty("left",   `${r.left}px`, "important");
    notesEl.style.setProperty("top",    `${r.top}px`,  "important");
    notesEl.style.setProperty("bottom", "auto", "important");
    notesEl.style.setProperty("right",  "auto", "important");
    e.preventDefault();
  });
  const onMove = (e) => {
    if (!dragging) return;
    const w = notesEl.offsetWidth, h = notesEl.offsetHeight, m = 8;
    const left = Math.max(m, Math.min(ownerWindow.innerWidth  - w - m, e.clientX - ox));
    const top  = Math.max(m, Math.min(ownerWindow.innerHeight - h - m, e.clientY - oy));
    notesEl.style.setProperty("left", `${left}px`, "important");
    notesEl.style.setProperty("top",  `${top}px`,  "important");
  };
  const onUp = () => { if (dragging) { dragging = false; notesEl.classList.remove("is-dragging"); } };
  ownerWindow.addEventListener("pointermove", onMove);
  ownerWindow.addEventListener("pointerup", onUp);
  ownerWindow.addEventListener("resize", clampPanel);
  notesEl._cleanup = () => {
    ownerWindow.removeEventListener("pointermove", onMove);
    ownerWindow.removeEventListener("pointerup", onUp);
    ownerWindow.removeEventListener("resize", clampPanel);
  };
};

// Floating sticky note — live markdown scratch pad. Persists in-memory
// during the slideshow. Draggable (clamped to viewport). Resizable via
// CSS resize handle. Colors + font sizes via inline toolbar.
let stickyNoteEl = null;
let stickyNoteVisible = false;
let stickyNoteText = "";
let stickyNoteEditing = false;
let stickyNoteColor = "default";   // default | yellow | pink | green | blue
let stickyNoteFontSize = "m";       // s | m | l | xl
const STICKY_COLORS = {
  default: { bg: "var(--background-primary, #ffffff)", accent: "var(--interactive-accent)" },
  yellow:  { bg: "#fff8c5", accent: "#e3b341" },
  pink:    { bg: "#ffd6e0", accent: "#e35d8e" },
  green:   { bg: "#d4f7d4", accent: "#3fb950" },
  blue:    { bg: "#d6ecff", accent: "#3a8ade" },
};
const STICKY_STYLE_ID = "excalidraw-slideshow-sticky-style";
const ensureStickyStyle = () => {
  if (ownerDocument.getElementById(STICKY_STYLE_ID)) return;
  const s = ownerDocument.createElement("style");
  s.id = STICKY_STYLE_ID;
  s.textContent = `
    .excalidraw-slideshow-sticky {
      position: fixed;
      right: 20px;
      top: 90px;
      width: 320px;
      min-width: 220px;
      min-height: 160px;
      max-width: 90vw;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      background: var(--sticky-bg, var(--background-primary, #fff8c5));
      color: var(--text-normal, #1a1a1a);
      border-radius: 10px;
      border: 1px solid var(--default-border-color, color-mix(in srgb, var(--icon-fill-color) 28%, transparent));
      box-shadow: 0 12px 32px rgba(0,0,0,0.35);
      z-index: 99991;
      animation: excali-slideshow-overlay-in 220ms cubic-bezier(.16,1,.3,1) both;
      contain: layout style;
      resize: both;
      overflow: hidden;
    }
    @media (prefers-reduced-motion: reduce) {
      .excalidraw-slideshow-sticky { animation-duration: 1ms !important; }
    }
    .excalidraw-slideshow-sticky .sticky-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: color-mix(in srgb, var(--sticky-accent, var(--interactive-accent, var(--icon-fill-color))) 22%, transparent);
      border-bottom: 1px solid var(--default-border-color);
      border-radius: 10px 10px 0 0;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    .excalidraw-slideshow-sticky .sticky-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-bottom: 1px solid var(--default-border-color);
      background: color-mix(in srgb, var(--icon-fill-color) 6%, transparent);
      flex-shrink: 0;
    }
    .excalidraw-slideshow-sticky .sticky-toolbar button {
      width: 24px; height: 24px;
      padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-normal);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      transition: background 100ms ease;
    }
    .excalidraw-slideshow-sticky .sticky-toolbar button:hover {
      background: color-mix(in srgb, var(--icon-fill-color) 14%, transparent);
    }
    .excalidraw-slideshow-sticky .sticky-toolbar button.is-active {
      background: var(--color-primary, var(--interactive-accent));
      color: var(--color-on-primary, var(--text-on-accent, #fff));
    }
    .excalidraw-slideshow-sticky .sticky-toolbar .swatch {
      width: 16px; height: 16px;
      border-radius: 50%;
      border: 1.5px solid var(--default-border-color);
      cursor: pointer;
      box-sizing: border-box;
    }
    .excalidraw-slideshow-sticky .sticky-toolbar .swatch.is-active {
      box-shadow: 0 0 0 2px var(--color-primary, var(--interactive-accent));
    }
    .excalidraw-slideshow-sticky .sticky-toolbar .sep {
      width: 1px; height: 16px;
      background: var(--default-border-color);
      margin: 0 4px;
    }
    .excalidraw-slideshow-sticky.font-s .sticky-body { font-size: 12px; }
    .excalidraw-slideshow-sticky.font-m .sticky-body { font-size: 14px; }
    .excalidraw-slideshow-sticky.font-l .sticky-body { font-size: 17px; }
    .excalidraw-slideshow-sticky.font-xl .sticky-body { font-size: 20px; }
    .excalidraw-slideshow-sticky .sticky-header .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-normal);
    }
    .excalidraw-slideshow-sticky .sticky-header .close {
      cursor: pointer;
      opacity: 0.7;
      padding: 0 4px;
      font-size: 16px;
      line-height: 1;
      color: var(--text-normal);
    }
    .excalidraw-slideshow-sticky .sticky-header .close:hover { opacity: 1; }
    .excalidraw-slideshow-sticky .sticky-body {
      padding: 12px 14px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.55;
      flex: 1;
      min-height: 80px;
      cursor: text;
    }
    .excalidraw-slideshow-sticky .sticky-body:empty::before {
      content: "Double-click to add a note…";
      color: var(--text-muted);
      font-style: italic;
    }
    .excalidraw-slideshow-sticky textarea.sticky-editor {
      width: 100%;
      min-height: 140px;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 0 0 10px 10px;
      border: 0;
      border-top: 1px solid var(--default-border-color);
      background: transparent;
      color: var(--text-normal);
      font-family: var(--font-text, inherit);
      font-size: 14px;
      line-height: 1.55;
      resize: vertical;
      outline: none;
    }
  `;
  ownerDocument.head.appendChild(s);
};
const renderSticky = () => {
  if (!stickyNoteEl) return;
  const body = stickyNoteEl.querySelector(".sticky-body");
  if (!body) return;
  body.empty?.() ?? (body.innerHTML = "");
  if (!stickyNoteText) return;
  try {
    const MarkdownRenderer = ea.obsidian.MarkdownRenderer;
    const sourcePath = ea.targetView?.file?.path ?? "";
    if (MarkdownRenderer?.renderMarkdown) {
      MarkdownRenderer.renderMarkdown(stickyNoteText, body, sourcePath, ea.targetView);
    } else if (MarkdownRenderer?.render) {
      MarkdownRenderer.render(app, stickyNoteText, body, sourcePath, ea.targetView);
    } else {
      body.textContent = stickyNoteText;
    }
  } catch (_) {
    body.textContent = stickyNoteText;
  }
};
const openStickyEditor = () => {
  if (!stickyNoteEl || stickyNoteEditing) return;
  stickyNoteEditing = true;
  const body = stickyNoteEl.querySelector(".sticky-body");
  body.innerHTML = "";
  const ta = ownerDocument.createElement("textarea");
  ta.className = "sticky-editor";
  ta.value = stickyNoteText;
  ta.placeholder = "Markdown supported. Esc cancel, Ctrl+Enter save.";
  body.appendChild(ta);
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    stickyNoteEditing = false;
    if (commit) stickyNoteText = ta.value;
    ta.removeEventListener("keydown", onKey, true);
    ta.removeEventListener("blur", onBlur);
    renderSticky();
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); finish(false); return; }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.stopPropagation(); e.preventDefault(); finish(true); return; }
    e.stopPropagation();
  };
  const onBlur = () => finish(true);
  ta.addEventListener("keydown", onKey, true);
  ta.addEventListener("blur", onBlur);
  ownerWindow.setTimeout(() => {
    try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) {}
  }, 0);
};
const installStickyDrag = (el) => {
  const header = el.querySelector(".sticky-header");
  if (!header) return;
  let dx = 0, dy = 0, dragging = false;
  const clampPos = (x, y) => {
    const vw = ownerWindow.innerWidth;
    const vh = ownerWindow.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Keep at least 40px of header visible on each edge so user can
    // always drag it back.
    return [
      Math.max(-w + 40, Math.min(vw - 40, x)),
      Math.max(0, Math.min(vh - 40, y)),
    ];
  };
  header.addEventListener("pointerdown", (e) => {
    if (e.target?.closest?.(".close, .sticky-toolbar, button, .swatch")) return;
    dragging = true;
    dx = e.clientX - el.offsetLeft;
    dy = e.clientY - el.offsetTop;
    header.setPointerCapture?.(e.pointerId);
  });
  header.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const [x, y] = clampPos(e.clientX - dx, e.clientY - dy);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.right = "auto";
  });
  const stop = (e) => {
    dragging = false;
    try { header.releasePointerCapture?.(e.pointerId); } catch (_) {}
  };
  header.addEventListener("pointerup", stop);
  header.addEventListener("pointercancel", stop);
  // Window resize → re-clamp so the note doesn't end up off-screen.
  const onWinResize = () => {
    const cur = el.getBoundingClientRect();
    const [x, y] = clampPos(cur.left, cur.top);
    if (x !== cur.left || y !== cur.top) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.right = "auto";
    }
  };
  ownerWindow.addEventListener("resize", onWinResize, { passive: true });
  el._winResizeCleanup = () => ownerWindow.removeEventListener("resize", onWinResize);
};
const applyStickyColor = (el, key) => {
  const c = STICKY_COLORS[key] || STICKY_COLORS.default;
  el.style.setProperty("--sticky-bg", c.bg);
  el.style.setProperty("--sticky-accent", c.accent);
  el.querySelectorAll(".sticky-toolbar .swatch").forEach(sw => {
    sw.classList.toggle("is-active", sw.dataset.key === key);
  });
};
const applyStickyFontSize = (el, key) => {
  el.classList.remove("font-s", "font-m", "font-l", "font-xl");
  el.classList.add("font-" + key);
  el.querySelectorAll('.sticky-toolbar [data-fs]').forEach(b => {
    b.classList.toggle("is-active", b.dataset.fs === key);
  });
};
const toggleStickyNote = () => {
  ensureStickyStyle();
  if (stickyNoteVisible && stickyNoteEl) {
    try { stickyNoteEl._winResizeCleanup?.(); } catch (_) {}
    stickyNoteEl.remove();
    stickyNoteEl = null;
    stickyNoteVisible = false;
    stickyNoteEditing = false;
    return;
  }
  stickyNoteEl = ownerDocument.createElement("div");
  stickyNoteEl.className = "excalidraw-slideshow-sticky";
  stickyNoteEl.innerHTML = `
    <div class="sticky-header">
      <span class="title">Sticky note</span>
      <span class="close" title="Close (m)">×</span>
    </div>
    <div class="sticky-toolbar">
      <button data-act="edit" title="Edit (dblclick)">✎</button>
      <button data-act="clear" title="Clear">⌫</button>
      <span class="sep"></span>
      <span class="swatch" data-key="default" title="Default" style="background:var(--background-primary,#fff)"></span>
      <span class="swatch" data-key="yellow"  title="Yellow"  style="background:#fff8c5"></span>
      <span class="swatch" data-key="pink"    title="Pink"    style="background:#ffd6e0"></span>
      <span class="swatch" data-key="green"   title="Green"   style="background:#d4f7d4"></span>
      <span class="swatch" data-key="blue"    title="Blue"    style="background:#d6ecff"></span>
      <span class="sep"></span>
      <button data-fs="s"  title="Small">S</button>
      <button data-fs="m"  title="Medium">M</button>
      <button data-fs="l"  title="Large">L</button>
      <button data-fs="xl" title="Extra large">XL</button>
    </div>
    <div class="sticky-body" tabindex="0"></div>
  `;
  contentEl.appendChild(stickyNoteEl);
  stickyNoteVisible = true;
  applyStickyColor(stickyNoteEl, stickyNoteColor);
  applyStickyFontSize(stickyNoteEl, stickyNoteFontSize);
  renderSticky();
  installStickyDrag(stickyNoteEl);
  stickyNoteEl.querySelector(".close").onclick = (e) => { e.stopPropagation(); toggleStickyNote(); };
  // Toolbar wiring
  stickyNoteEl.querySelectorAll(".sticky-toolbar .swatch").forEach(sw => {
    sw.addEventListener("click", (e) => {
      e.stopPropagation();
      stickyNoteColor = sw.dataset.key;
      applyStickyColor(stickyNoteEl, stickyNoteColor);
    });
  });
  stickyNoteEl.querySelectorAll('.sticky-toolbar [data-fs]').forEach(b => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      stickyNoteFontSize = b.dataset.fs;
      applyStickyFontSize(stickyNoteEl, stickyNoteFontSize);
    });
  });
  stickyNoteEl.querySelector('[data-act="edit"]')?.addEventListener("click", (e) => {
    e.stopPropagation(); openStickyEditor();
  });
  stickyNoteEl.querySelector('[data-act="clear"]')?.addEventListener("click", (e) => {
    e.stopPropagation(); stickyNoteText = ""; renderSticky();
  });
  const body = stickyNoteEl.querySelector(".sticky-body");
  body.addEventListener("dblclick", (e) => { e.stopPropagation(); openStickyEditor(); });
  body.addEventListener("click", (e) => {
    if (!stickyNoteText && !stickyNoteEditing) { e.stopPropagation(); openStickyEditor(); }
  });
};

// Phase 2a: cursor auto-hide after idle. Resets on any pointermove.
// Stored on hostView so exit can clean up even after DOM swaps.
const installCursorIdleHide = () => {
  const root = contentEl.querySelector(".excalidraw");
  if (!root) return;
  const STYLE_ID = "excalidraw-slideshow-cursor-hide";
  if (!ownerDocument.getElementById(STYLE_ID)) {
    const s = ownerDocument.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .excalidraw.excali-cursor-idle,
      .excalidraw.excali-cursor-idle * { cursor: none !important; }
      .excalidraw.excali-cursor-idle .excalidraw-presentation-panel,
      .excalidraw.excali-cursor-idle .excalidraw-presentation-panel *,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-notes,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-notes *,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-sticky,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-sticky *,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-thumbs,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-thumbs *,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-help-backdrop,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-help-backdrop *,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-end-backdrop,
      .excalidraw.excali-cursor-idle .excalidraw-slideshow-end-backdrop * { cursor: default !important; }
    `;
    ownerDocument.head.appendChild(s);
  }
  let idleTimer = 0;
  let lastArmTs = 0;
  const arm = () => {
    root.classList.remove("excali-cursor-idle");
    if (idleTimer) ownerWindow.clearTimeout(idleTimer);
    idleTimer = ownerWindow.setTimeout(() => {
      root.classList.add("excali-cursor-idle");
    }, 2200);
  };
  // Throttle to ~10Hz — pointermove fires at hundreds of Hz on some
  // devices, and we only need to know "user moved recently".
  const onMove = () => {
    const now = ownerWindow.performance?.now?.() ?? Date.now();
    if (now - lastArmTs < 100) return;
    lastArmTs = now;
    arm();
  };
  root.addEventListener("pointermove", onMove, { passive: true, capture: true });
  root.addEventListener("pointerdown", onMove, { passive: true, capture: true });
  arm();
  hostView._slideshowCursorHide = () => {
    if (idleTimer) ownerWindow.clearTimeout(idleTimer);
    root.removeEventListener("pointermove", onMove, { capture: true });
    root.removeEventListener("pointerdown", onMove, { capture: true });
    root.classList.remove("excali-cursor-idle");
    ownerDocument.getElementById(STYLE_ID)?.remove();
    delete hostView._slideshowCursorHide;
  };
};

// Tracks which scene elements existed BEFORE the slideshow started, plus
// their original `locked` flag. Anything drawn during the session is NOT
// in this map. Used so:
//   - eraser button (native Excalidraw eraser) skips locked = pre-existing.
//   - clearInk only deletes freedraw elements added during the session.
//   - exit restores original `locked` flags so nothing is permanently sealed.
const preExistingLockState = new Map(); // id → boolean(original-locked)
const lockPreExistingElements = () => {
  try {
    const all = excalidrawAPI.getSceneElements();
    preExistingLockState.clear();
    const next = all.map(el => {
      preExistingLockState.set(el.id, !!el.locked);
      return el.locked ? el : { ...el, locked: true };
    });
    excalidrawAPI.updateScene({ elements: next, commitToHistory: false });
  } catch (e) {
    console.warn("[slideshow] lockPreExistingElements failed:", e);
  }
};
const restorePreExistingLocks = () => {
  try {
    const all = excalidrawAPI.getSceneElements();
    let touched = false;
    const next = all.map(el => {
      if (!preExistingLockState.has(el.id)) return el; // newly drawn — leave as-is
      const originalLocked = preExistingLockState.get(el.id);
      if (!!el.locked === originalLocked) return el;
      touched = true;
      return { ...el, locked: originalLocked };
    });
    if (touched) excalidrawAPI.updateScene({ elements: next, commitToHistory: false });
    preExistingLockState.clear();
  } catch (e) {
    console.warn("[slideshow] restorePreExistingLocks failed:", e);
  }
};

const start = async () => {
  statusBarElement.style.display = "none";
  // Lock existing elements BEFORE entering view mode so freedraw can't
  // mutate them later when the user toggles the pen.
  lockPreExistingElements();
  ea.setViewModeEnabled(true);
  const helpButton = ea.targetView.excalidrawContainer?.querySelector(".ToolIcon__icon.help-icon");
  if(helpButton) {
    helpButton.style.display = "none";
  }
  const zoomButton = ea.targetView.excalidrawContainer?.querySelector(".Stack.Stack_vertical.zoom-actions");
  if(zoomButton) {
    zoomButton.style.display = "none";
  }
  // Hide Vim Mode badge + companion UI while slideshow runs. The vim
  // badge has its own rAF that overrides inline display:none, so we
  // use a body class + !important rule that beats inline style.
  const SUPPRESS_STYLE_ID = "excalidraw-slideshow-suppress";
  if (!ownerDocument.getElementById(SUPPRESS_STYLE_ID)) {
    const s = ownerDocument.createElement("style");
    s.id = SUPPRESS_STYLE_ID;
    // Use visibility:hidden + pointer-events:none for 3rd-party overlays
    // so plugin-stored positions aren't reset on display:none reflow.
    // Our own UI uses display:none since we recreate them each run.
    s.textContent = `
      body.excali-slideshow-active .excali-vim-status,
      body.excali-slideshow-active .excali-resize-minus,
      body.excali-slideshow-active .excali-resize-plus,
      body.excali-slideshow-active .excali-export-bar { display: none !important; }
      /* Hide Excalidraw's native UI bars even when freedraw / eraser are
         active. Without this, picking the pen pops the shape toolbar and
         the selected-shape-actions panel, which covers our slideshow
         controls and the exit (×) button. */
      body.excali-slideshow-active .App-toolbar,
      body.excali-slideshow-active .HintViewer,
      body.excali-slideshow-active .selected-shape-actions,
      body.excali-slideshow-active .App-menu__left,
      body.excali-slideshow-active .App-menu__top,
      body.excali-slideshow-active .App-bottom-bar,
      body.excali-slideshow-active .undo-redo-buttons { display: none !important; }
      body.excali-slideshow-active .workspace-leaf-content[data-type*="minimap" i],
      body.excali-slideshow-active [class*="minimap" i]:not(.excalidraw-slideshow-thumbs):not(.excalidraw-slideshow-thumb),
      body.excali-slideshow-active .workspace-leaf-content[data-type*="map" i]:not([data-type="markdown"]):not([data-type*="excalidraw"]),
      body.excali-slideshow-active .obsidian-minimap-container,
      body.excali-slideshow-active .canvas-minimap-container,
      body.excali-slideshow-active .mod-left-split,
      body.excali-slideshow-active .mod-right-split,
      body.excali-slideshow-active .status-bar { visibility: hidden !important; pointer-events: none !important; }
    `;
    ownerDocument.head.appendChild(s);
  }
  ownerDocument.body.classList.add("excali-slideshow-active");
  const vimBadges = ownerDocument.querySelectorAll(".excali-vim-status");
  const undoRedo  = ea.targetView.excalidrawContainer?.querySelector(".undo-redo-buttons");
  if (undoRedo) { undoRedo.dataset._slideshowPrev = undoRedo.style.display; undoRedo.style.display = "none"; }
  // Stash references on the host view so exit can restore even if the
  // DOM selectors change mid-presentation.
  hostView._slideshowHidden = { helpButton, zoomButton, vimBadges, undoRedo };
  
  createPresentationNavigationPanel();
  initializeEventListners();
  installCursorIdleHide();
  // Pre-cache scene SVG so the first 't' (thumbs) press doesn't block.
  // createViewSVG is expensive — kick it off async during start; by the
  // time the user opens the sidebar it's likely ready.
  (async () => {
    try {
      if (cachedSceneSVG) return;
      const st = excalidrawAPI.getAppState();
      cachedSceneSVG = await ea.createViewSVG({
        withBackground: true,
        theme: st.theme,
        frameRendering: { enabled: false, name: false, outline: false, clip: false },
        padding: 40,
        selectedOnly: false,
        skipInliningFonts: true,
        embedScene: false,
      });
    } catch (_) { /* user may exit before this finishes; fine */ }
  })();
  if(startFullscreen) {
    await gotoFullscreen();
  } else {
    resetControlPanelElPosition({ refit: true });
  }
  if(presentationPathType === "line") await toggleArrowVisibility(isHidden);
  ea.targetView.clearDirty();
}

const timestamp = Date.now();
if(
  window.ExcalidrawSlideshow &&
  (window.ExcalidrawSlideshow.script === utils.scriptFile.path) &&
  (timestamp - window.ExcalidrawSlideshow.timestamp <400)
) {
  if(window.ExcalidrawSlideshowStartTimer) {
    window.clearTimeout(window.ExcalidrawSlideshowStartTimer);
    delete window.ExcalidrawSlideshowStartTimer;
  }
  await start();
} else {
  if(window.ExcalidrawSlideshowStartTimer) {
    window.clearTimeout(window.ExcalidrawSlideshowStartTimer);
    delete window.ExcalidrawSlideshowStartTimer;
  }
  if(!window.ExcalidrawSlideshow) {
    window.ExcalidrawSlideshow = {
      script: utils.scriptFile.path,
      slide: {},
    };
  }
  window.ExcalidrawSlideshow.timestamp = timestamp;
  window.ExcalidrawSlideshow.slide[ea.targetView.file.path] = 0;
  
  window.ExcalidrawSlideshowStartTimer = window.setTimeout(start,500);
}
