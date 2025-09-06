# Home Assistant Canvas Cards

Canvas homework display cards for Home Assistant, based on [schwartzpub's original card](https://github.com/schwartzpub) with enhancements including smart sorting, visual indicators, configurable titles, and adjustable look-ahead periods.

## Installation

### 0. Prerequisites

- Home Assistant instance
- Canvas custom integration installed (see [canvas_hassio](https://github.com/thomergil/canvas_hassio))
- Canvas Parent account with API access

### 1. Clone to Home Assistant

```bash
# SSH into your Home Assistant instance, then:
cd /config/www/
git clone https://github.com/thomergil/homeassistant-cards.git
```

### 2. Add Resource in Home Assistant

1. Go to **Settings** → **Dashboards** → **Resources**
2. Click **"+ Add Resource"**
3. **URL**: `/local/homeassistant-cards/canvas/custom-canvas-homework-card.js?v=1`
4. **Resource Type**: JavaScript Module
5. Click **Create**

> 💡 **Important**: The `/local/` path in Home Assistant maps to `/config/www/` in your file system.

### 3. Enable Advanced Mode

1. Go to your **Profile** (bottom left in HA)
2. Enable **"Advanced Mode"**
3. This allows you to use `?v=N` parameters for cache-busting

### 4. Add Card to Dashboard

```yaml
type: custom:canvas-homework
title: "My Student's Homework" # Optional, customizable
look_ahead_days: 5 # Optional, defaults to 5 days
entities:
  - entity: sensor.canvas_students
  - entity: sensor.canvas_courses
  - entity: sensor.canvas_assignments
  - entity: sensor.canvas_submissions
```

## Updating Cards

When you make changes to the card files:

### Method 1: Version Parameter (Recommended)

1. **Update the resource URL** with a new version:
   ```
   /local/homeassistant-cards/canvas/custom-canvas-homework-card.js?v=2
   ```
2. **Save** the resource configuration

### Method 2: Clear Cache

1. **Hard refresh** browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache** completely
3. **Try incognito/private window**

### Method 3: Restart HA

- **Restart Home Assistant** to clear all caches

## Related

- **Main Project**: [Canvas Parent Integration](../README.md)
- **Canvas Integration**: [canvas_hassio](https://github.com/thomergil/canvas_hassio) - Required custom component
- **Original Cards**: Based on [schwartzpub/homeassistant-cards](https://github.com/schwartzpub/homeassistant-cards)
