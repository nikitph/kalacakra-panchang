# Kālacakra Pañcāṅga

An interactive Hindu pañcāṅga that shows *how* the almanac is made, not just its answers. Every limb is computed live in the browser from the positions of the Sun and Moon.

**Live:** https://nikitph.github.io/kalacakra-panchang/

![Kālacakra Pañcāṅga](docs/screenshot.png)

## What's on the page

- **Kālacakra, the sky-wheel.** Rings for the 27 nakṣatras (with all 108 pādas), the 12 sidereal rāśis and the 27 yogas. The tithi ring turns with the Sun, because a tithi is the Moon's lead over the Sun in 12° steps. Each cell is shaded by how lit the Moon is, so the ring doubles as the lunar phase cycle. Karaṇa ticks sit inside it, with Viṣṭi (Bhadrā) in red. A gold wedge from the centre spans the elongation.
- **Ahorātra, the day ribbon.** Runs sunrise to sunrise, because the Hindu day begins at sunrise. Rows show the 30 muhūrtas (Abhijit and Brahma marked), Rāhu kāla, Yamagaṇḍa and Gulika, every limb's change time, and the planetary horās. Times are given in IST along the top and in ghaṭī from sunrise along the bottom. Drag across it to scrub through the day.
- **The five limbs.** Each limb's card shows its own working (for example `☾ − ☉ = 154°31′ ÷ 12° → tithi 13`), progress, start and end times, deity and class.
- **The month weave.** The lunar month's 30 tithis are set against the civil days whose sunrise falls in each one. This exposes kṣaya tithis, which never meet a sunrise, and vṛddhi tithis, which span two. Festivals are placed by their own rule: the tithi at sunrise, midday, afternoon, dusk or midnight.
- **Live mode.** The page follows the clock, counting time since sunrise in ghaṭī · pala · vipala. *Run time* plays a day every ten seconds.

Also shown: adhika māsa detection, amānta and pūrṇimānta month names, saṅkrānti times, samvatsara, ṛtu and ayana, and twelve Indian cities, with Ujjain as the default.

## How it's calculated

- **Sun:** a low-precision solar theory.
- **Moon:** a truncated lunar theory (about 45 periodic terms).
- **Zodiac:** the Lahiri (Citrāpakṣa) ayanāṁśa.
- **Sunrise:** the standard sunrise equation.

Change times are good to a few minutes. Local traditions differ on festival dates and samvatsara reckoning.

## Running it

It's one self-contained `index.html` with no build step and no dependencies beyond Google Fonts. Open it in a browser, or serve the folder:

```bash
python3 -m http.server
```
