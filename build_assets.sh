#!/usr/bin/env bash
# Collects the project-page media from the paper and the slide material. Re-run after the paper figures change.
#   GIFs    : DTWM/slides/videos (the four GIFs of the talk slides, plus the other three task-illustration GIFs)
#   figures : Paper_to_ICLR/figures/*.pdf rendered to PNG; force and train-touch charts from DTWM/slides
#   pipeline: the rendered pipeline figure of the talk slides (the paper draws it in TikZ inside the text)
set -euo pipefail
W=$(cd "$(dirname "$0")" && pwd); D=$W/..; V=$D/slides/videos; F=$D/Paper_to_ICLR/figures
G=$W/static/media/gifs; P=$W/static/media/figures
mkdir -p "$G" "$P"
for t in spray_can bathroom_items fold_shorts g_clamp_release; do cp "$V/teaser3_$t.gif" "$G/task_$t.gif"; done
cp "$V/cmp2_pick_up_power_adapter_2.gif" "$G/cmp_pick_up_power_adapter.gif"
cp "$V/cmp2_squeeze_toothpaste.gif"      "$G/cmp_squeeze_toothpaste.gif"
cp "$V/cmp2_ood_push_cart_2.gif"         "$G/cmp_ood_push_cart.gif"
for f in fig_teaser fig_horizon; do pdftoppm -r 330 -png -singlefile "$F/$f.pdf" "$P/$f"; done
pdftoppm -r 500 -png -singlefile "$F/fig_motivation.pdf" "$P/fig_motivation"
cp "$D/slides/force/force_slide.png" "$P/force_trend.png"
cp "$D/slides/train_touch/train_touch_slide.png" "$P/train_touch.png"
PIPE=${PIPELINE_PNG:-}
[ -n "$PIPE" ] && cp "$PIPE" "$P/pipeline.png"
[ -f "$P/pipeline.png" ] || echo "WARNING: static/media/figures/pipeline.png missing (set PIPELINE_PNG to the rendered pipeline figure)"
du -sh "$G" "$P"
