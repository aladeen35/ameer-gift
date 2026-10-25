# Credits

Every third-party library and asset shipped with Ameer Gift. The same list is shown in the app at `credits.html`.

## 3D assets

| Asset | Author | Source | License | Used for |
|---|---|---|---|---|
| Microsoft Rocketbox Avatar Library (13 avatars: Male_Adult_08/14/15/19/21, Female_Adult_06/09/10/14, Male_Child_01/02, Female_Child_01/02) | Microsoft Research, Rocketbox | https://github.com/microsoft/Microsoft-Rocketbox | MIT | Realistic avatars (`public/models/avatars/`) |
| Rocketbox animation library (idle, look around, walk, slow run, wave, clap, sit; male and female) | Microsoft Research, Rocketbox | https://github.com/microsoft/Microsoft-Rocketbox/tree/master/Assets/Animations | MIT | Motion-capture clips (`public/models/anims-*.glb`) |
| Ultimate Modular Men / Women | Quaternius | https://quaternius.com | CC0 1.0 | Light characters for low-end phones (`public/models/lite/`) |

All textures in the museum hall (marble, stone, wood, light pools, plaques) and the demo paintings are drawn in code at runtime; there are no image downloads for them. Environment reflections use three.js `RoomEnvironment` (procedural, MIT), so no HDRI file is needed.

## Libraries

| Library | Version | License | Source |
|---|---|---|---|
| three.js | 0.186.1 | MIT | https://github.com/mrdoob/three.js |
| Firebase JS SDK | 13.1.0 | Apache-2.0 | https://github.com/firebase/firebase-js-sdk |
| Vite | 8.3.5 | MIT | https://github.com/vitejs/vite |
| meshoptimizer (build + decoder) | 1.x | MIT | https://github.com/zeux/meshoptimizer |
| glTF-Transform (build only) | 4.5.1 | MIT | https://github.com/donmccurdy/glTF-Transform |
| sharp (build only) | 0.35 | Apache-2.0 | https://github.com/lovell/sharp |
| Playwright (tests only) | 1.64.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| ESLint / Prettier (dev only) | 10.13 / 3.9 | MIT | https://eslint.org, https://prettier.io |
| Firebase CLI + rules-unit-testing (tests only) | latest | MIT / Apache-2.0 | https://github.com/firebase/firebase-tools |
| Bubblewrap CLI (Android build) | 1.27.0 | Apache-2.0 | https://github.com/GoogleChromeLabs/bubblewrap |

## Fonts

| Font | Author | License |
|---|---|---|
| Reem Kufi | Khaled Hosny, Santiago Orozco | SIL OFL 1.1 (Google Fonts) |
| IBM Plex Sans Arabic | IBM | SIL OFL 1.1 (Google Fonts) |

## Brand

`logo-full.png` and `logo-icon.png` belong to Ameer Gift. The white/gold variants (`*-light.png`) and transparent copies (`*-clear.png`) are generated from them by `tools/make-logo.mjs`.
