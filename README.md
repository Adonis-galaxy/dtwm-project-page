# DTWM project page

Static project page for *Dexterous Tactile World Model*. No build step: `index.html` + `static/`.

## Preview locally

    cd website && python3 -m http.server 8000     # then open http://localhost:8000

## Publish on GitHub Pages

1. Push the contents of this folder to a repository (for example `dtwm.github.io` or a `gh-pages` branch).
2. In the repository settings, Pages → deploy from the branch and folder that holds `index.html`.
3. `.nojekyll` is included so GitHub serves every file as is.

Media total about 29 MB (largest file 7.6 MB), well within GitHub limits.

## Before making it public (TODO)

- Paper link: the Paper button in the hero (currently "coming soon").
- BibTeX: add the arXiv identifier to the `#bibtex` block once the paper is posted.
- Check the venue's anonymity policy before the page goes public while the paper is under review.

## Updating the media

`build_assets.sh` copies the GIFs and videos from `DTWM/slides/videos`, renders the paper figures from
`Paper_to_ICLR/figures/*.pdf`, and copies the force and train-touch charts from `DTWM/slides`. Re-run it after
the paper figures change:

    bash build_assets.sh

The pipeline figure (`static/media/figures/pipeline.png`) comes from the talk slides because the paper draws it in
TikZ inline; pass `PIPELINE_PNG=/path/to/pipeline.png` to replace it.

## Contents

| Section | Wording from | Media |
|---|---|---|
| Hero | slide 40 | `gifs/task_*.gif`, the prediction task on four held-out clips |
| Predict the future with touch | slide 41 | none |
| Pipeline | slide 44 | `figures/pipeline.png` |
| Better visual quality, hand location and motion | slides 45 to 47 | `figures/fig_teaser.png` (paper Figure 1), `gifs/cmp_pick_up_power_adapter.gif`, `gifs/cmp_squeeze_toothpaste.gif` |
| Better generalization to unseen objects & tasks | slide 48 | `gifs/cmp_ood_push_cart.gif` |
| Why touch helps? | paper Figure 6, slide 50 | `figures/fig_motivation.png`, `figures/force_trend.png` |
| Training with touch helps | slide 51 | `figures/train_touch.png` |
| Prediction horizon | paper abstract | `figures/fig_horizon.png` (paper Figure 7) |
