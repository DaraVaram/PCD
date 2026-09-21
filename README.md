# Priority-Constrained Descent — project page

Source of [daravaram.github.io/PCD](https://daravaram.github.io/PCD/), the project page for *Not All
Objectives Are Born Equal: Priority-Constrained Descent for Hierarchical Multi-Objective Optimization*
(Dara Varam and Mohamed I. AlHajri, TMLR 2026). The code is at
[DaraVaram/priority-constrained-descent](https://github.com/DaraVaram/priority-constrained-descent).

A static page: HTML, CSS and vanilla JS, with no build step. GitHub Pages serves the `main` branch, so
pushing to `main` publishes it. External requests: Google Fonts (with system-font fallbacks), KaTeX
from jsDelivr for the equations, and a hidden MapMyVisitors visitor counter.

```
index.html          the page
css/style.css       design system
js/vectors.js       the interactive vector figure (draggable g1/g2, τ slider, auto-tour)
js/main.js          scroll reveals, navigation, BibTeX copy, and the button links
assets/             web-sized figures from the paper, the video, its captions and poster
```

## Links

The Paper, OpenReview, arXiv and Code buttons take their URLs from `LINKS` at the top of `js/main.js`.
A link left empty shows a "coming soon" message instead of leading nowhere.

## Video

The Video section plays `assets/pcd-video.mp4` (the web cut, 1080p60 H.264, about 40 MB) with English
captions from `assets/pcd-video.vtt` and `assets/video-poster.jpg` as the still. Both come from the
Manim project (`PCD-Video/out/`): replace the MP4 with a new `-web.mp4` render and regenerate the
captions from its `.srt` (add a `WEBVTT` header, use `.` instead of `,` in the timestamps).
The narration voice is ElevenLabs text-to-speech, credited in a footnote under the video.

## Preview locally

Serve the folder rather than opening `index.html` directly:

```bash
python -m http.server 8000     # then visit http://localhost:8000
```

Figures in `assets/` are downscaled copies of the accepted paper's figures. The interactive vector
figure is a formula-faithful remake of the paper's method-comparison figure and runs a self-test in the
browser console.
