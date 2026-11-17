---
title: Prop Outline
description: Outline props along their visible contour, or with a rectangle or ellipse. Pick the color, line width, padding, opacity and dash style.
author: stastriada
image: https://stastriada1995-rgb.github.io/prop-outline/screenshot.png
icon: https://stastriada1995-rgb.github.io/prop-outline/icon.svg
tags:
  - tool
  - drawing
manifest: https://stastriada1995-rgb.github.io/prop-outline/manifest.json
learn-more: https://github.com/stastriada1995-rgb/prop-outline
---

# Prop Outline

Highlight important props on your map (levers, chests, clues, interactive objects) with a configurable outline.

![Props with outlines](https://stastriada1995-rgb.github.io/prop-outline/screenshot.png)

## Features

- **Contour outline:** the line follows the visible (non-transparent) pixels of a PNG, so you get an outline of the object itself instead of a square around the image.
- **Rectangle or ellipse** outlines when you need a simple frame.
- **Customizable:** color, line width, padding from the edge, opacity, and solid, dashed or dotted lines.
- **Attached to the prop:** the outline moves, rotates, resizes, hides, copies and deletes together with its prop.
- **Click-through:** you can't select the outline by accident.
- **Batch editing:** outline several props at once.

## How to use

1. Select one or more items on the **Props** layer.
2. Right-click and choose **Outline…** (Обводка…).
3. Pick the shape, color and width, then press **Apply**.

![Settings window](https://stastriada1995-rgb.github.io/prop-outline/settings.png)

To change an outline, open **Outline…** again: changes apply live. To remove it, use the **Remove** button or the **Remove outline** context menu item.

## Notes

- The interface is in Russian.
- Width and padding are in scene pixels (one grid cell is 150 px by default).
- After a prop is resized, the GM's client refits its outline. Moving and rotating work for everyone immediately.
- If an image doesn't allow its pixels to be read (for example, an image hotlinked from a site that forbids it), a rectangular outline is drawn instead.

## Support

Report problems or suggest features on [GitHub Issues](https://github.com/stastriada1995-rgb/prop-outline/issues).
