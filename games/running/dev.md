# Nano Banana (White Tiger Edition) - 에셋 생성 가이드 (v3)

이 문서는 게임 개발에 필요한 **모든 에셋**의 목록, 파일명, 그리고 고품질 생성을 위한 **상세 프롬프트**를 담고 있습니다.
"Nano Banana" AI에 아래 프롬프트를 입력하여 이미지를 생성하고, 지정된 파일명으로 저장해주세요.

## 🎨 공통 스타일 (Global Style)
**배경 제거를 쉽게 하기 위해 진한 녹색 배경을 사용합니다.**
모든 프롬프트 뒤에 다음을 붙여주세요 (Suffix):
> `, cute chibi style, vector art, flat design, vibrant colors, solid dark green background, high quality, mobile game asset, 4k resolution`

---

## 🐯 1. 플레이어 (Player) - 백호 (White Tiger)
| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`tiger_run.png`** | 달리기 모션 (4프레임) | `sprite sheet of a side view cute chibi white tiger running, dynamic motion, fast legs, 4 frames sequence, solid dark green background` | 스프라이트 시트 (가로) |
| **`tiger_jump.png`** | 점프 (공중 포즈) | `side view of a cute chibi white tiger jumping high, paws tucked in, happy expression, floating in air, full body, solid dark green background` | 단일 이미지 |
| **`tiger_slide.png`** | 슬라이딩 (납작함) | `side view of a cute chibi white tiger sliding on huge banana peel, low profile, funny expression, speed lines, solid dark green background` | 단일 이미지 |
| **`tiger_hurt.png`** | 충돌/게임오버 | `cute chibi white tiger crying, dizzy eyes, stars circling head, sitting pose, sad expression, solid dark green background` | 단일 이미지 |

---

## 🏞️ 2. 배경 (Backgrounds)
**배경 이미지는 녹색 배경(Chroma Key)을 사용하지 않고, 꽉 찬 이미지를 생성합니다.**

| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`bg_sky.png`** | 하늘 (가장 뒤) | `vertical game background, clear blue sky with fluffy white clouds, soft gradient, pixel perfect, no green background` | 세로형 (9:16) |
| **`bg_mountain.png`** | 원경 산 (중간) | `game asset, cute panoramic mountains range, pastel blue and purple colors, simple vector art, isolated on white background` | 가로로 긴 형태 (반복) |
| **`bg_forest.png`** | 근경 숲/나무 (앞) | `game asset, layer of jungle trees and bushes, vibrant green, simple shapes, parallax scrolling layer, isolated on white background` | 가로로 긴 형태 (반복) |

*참고: `bg_mountain.png`와 `bg_forest.png`는 투명 처리가 필요하므로 `white background` 혹은 `solid dark green background` 중 편한 것을 사용하세요. (위 예시는 `white` 유지)*

---

## 🧱 3. 지형 및 플랫폼 (Ground & Platforms)
| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`ground_main.png`** | 메인 바닥 타일 | `seamless cartoon grass ground tile, side view cross section, green grass on top, brown soil with stones below, flat vector style, solid dark green background` | 256x256 패턴 |
| **`platform_floating.png`** | 공중 발판 | `floating wooden platform with vines, jungle theme, cartoon style, game asset, side view, solid dark green background` | 가로형 |

---

## ⚠️ 4. 장애물 (Obstacles)
| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`obs_rock_small.png`** | 작은 바위 (점프용) | `cute round gray rock with moss patches, cartoon style, game obstacle, vector art, solid dark green background` | 단일 이미지 |
| **`obs_stump.png`** | 나무 그루터기 (높음) | `old tree stump with roots, cartoon style, game obstacle, vector art, solid dark green background` | 세로형 |
| **`obs_bird.png`** | 날아오는 새 (슬라이딩용) | `cute colorful tropical bird flying, side view, cartoon style, angry eyes, game enemy, solid dark green background` | 단일 이미지 |

---

## 🍪 5. 아이템 (Items)
| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`item_meat.png`** | 점수 아이템 (고기) | `delicious raw meat steak, cartoon style, shiny, game item, vector art, solid dark green background` | 단일 이미지 |
| **`item_gem.png`** | 고득점 아이템 (레어) | `shiny blue diamond gem, sparkling magical glow, cartoon style, game item, vector art, solid dark green background` | 단일 이미지 |
| **`item_potion.png`** | 스피드업/무적 (특수) | `magic potion bottle with bubbling red liquid, cartoon style, game powerup, vector art, solid dark green background` | 단일 이미지 |

---

## 👆 6. UI 요소 (UI Elements)
| 파일명 (Filename) | 설명 (Description) | 상세 프롬프트 (Prompt) | 규격 |
| :--- | :--- | :--- | :--- |
| **`ui_play_btn.png`** | 시작 버튼 | `glossy green play button, rounded rectangle, white triangle icon, game ui, cartoon style, solid dark green background` | 버튼 |
| **`ui_pause_btn.png`** | 일시정지 버튼 | `glossy orange pause button, circle shape, two white bars, game ui, cartoon style, solid dark green background` | 버튼 |
| **`ui_panel.png`** | 결과창 배경 | `wooden sign board, cartoon style, UI panel container, empty center, game interface, solid dark green background` | 패널 |

---

**Tip**: 생성된 이미지는 [Remove.bg](https://remove.bg) 등을 이용해 배경을 투명하게 만든 후 `games/running/assets/` 폴더에 저장하세요.
