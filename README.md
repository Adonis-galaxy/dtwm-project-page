# DTWM project page

Static project page for *Dexterous Tactile World Model*. No build step: `index.html` + `static/`.

## Preview locally

    python3 -m http.server 8000     # then open http://localhost:8000

## Layout

- `static/js/charts.js`: every chart is native SVG, drawn at the container width and redrawn on resize.
- `static/js/tactile.js`: the bimanual glove panel (pressure on the glove cells, finger flexion as gauges), drawn on canvas.
- `static/js/players.js`: the hero prediction-task player and the synchronised six-model comparison.
- `static/css/style.css`: all colours are theme tokens; light in `:root`, dark under `prefers-color-scheme` and `[data-theme="dark"]`.
- `static/v2/data/*.json`: the numbers behind each chart, each file naming the evaluation outputs it came from.
- `static/v2/media/`: the video clips (H.264 MP4) and stills.
- `static/media/figures/fig_teaser.png`: only used as the link-preview image.

## When the paper is posted

- Paper button in the hero (currently "coming soon").
- `#bibtex` block: add the arXiv identifier.
