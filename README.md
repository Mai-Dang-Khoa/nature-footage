# Wild Frames — Website giới thiệu video thiên nhiên 4K (UE5)

Website tĩnh (HTML/CSS/JS thuần, không thư viện, không bước build). Mục tiêu duy nhất: khách xem trước clip rồi bấm sang Adobe Stock để mua license.

Địa chỉ: https://mai-dang-khoa.github.io/nature-footage/

## Chạy thử trên máy

- Chạy server tĩnh: `python3 -m http.server 8000` rồi mở http://localhost:8000 (giống GitHub Pages nhất).
- Hoặc mở thẳng `index.html`. Khi đó trang dùng bản dữ liệu dự phòng nhúng trong HTML. Sau khi sửa `videos.json` hoặc `site.json`, chạy `python3 tools/sync-fallback.py` để cập nhật bản này. Không bắt buộc với GitHub Pages.
- Nếu `videos.json` lỗi mạng hoặc sai định dạng, trang tự dùng bản dự phòng, không bao giờ trắng.

## Cấu trúc

```
index.html   style.css   script.js   motion.js   fx.js   fx.css   film.js
assets/sequence/    khung hình cho đoạn "hero film" (desktop/ và mobile/; hiện là dữ liệu mẫu)
videos.json         danh sách clip
site.json           thông tin chung: tên, email, link, collections, mood, use case, analytics…
assets/thumbs/      thumbnail
assets/previews/    video preview (preview của clip featured đầu tiên = video nền hero)
assets/free/        file mẫu miễn phí
assets/bts/         ảnh "Behind the scene" (đang là ảnh SVG giữ chỗ)
assets/og.png       ảnh chia sẻ mạng xã hội (1200×630)
tools/sync-fallback.py   đồng bộ JSON vào index.html (chỉ cần cho file://)
docs/screenshots/   ảnh trước/sau
```

## Luồng trang

Hero (video) → Collections (hàng Featured + mỗi collection một hàng cuộn ngang) → Recently viewed (chỉ hiện khi đã xem clip) → Perfect for (marquee lọc theo mục đích) → Full collection (lọc Mood/Category, tìm kiếm, Show more) → Stats / As used in (chỉ hiện khi có dữ liệu thật) → Free sample → Behind the scene (cuộn kể chuyện) → FAQ → About → Contact → CTA cuối.

## Thêm clip mới (`videos.json`)

```json
{
  "id": "misty-forest-01",
  "title": "Misty Forest at Dawn",
  "featured": true,
  "category": "Forest",
  "collection": "forest-mornings",
  "mood": "calm",
  "tags": ["forest", "mist", "dawn"],
  "useCases": ["documentary", "wellness"],
  "resolution": "4K",
  "fps": 24,
  "duration": "0:15",
  "loopable": true,
  "addedAt": "2026-10-01",
  "thumbnail": "assets/thumbs/misty-forest-01.jpg",
  "poster": "assets/thumbs/misty-forest-01.jpg",
  "preview": "assets/previews/misty-forest-01.mp4",
  "stockUrl": "https://stock.adobe.com/video/..."
}
```

**Bắt buộc:** `id`, `title`, `category`, `resolution`, `duration`, `thumbnail`, `preview`, `stockUrl`.

**Tuỳ chọn** (bỏ trống thì không hiện):

| Trường | Ý nghĩa |
|---|---|
| `featured` | `true` = vào hàng Featured (hàng đầu tiên). Clip featured đầu tiên làm video nền hero. Đồng thời hiện chip "Featured" ở các hàng/lưới khác. |
| `collection` | `id` của một collection trong `site.json`. Clip cùng collection nằm chung một hàng. |
| `mood` | `calm`, `epic`, `moody`, `warm` hoặc `fresh`. Dùng cho bộ lọc Mood. |
| `useCases` | Mảng `id` trong `site.json` → `useCases` (`documentary`, `youtube`, `wellness`, `travel`, `presentation`). |
| `fps`, `loopable` | Hiện trong modal. `loopable: true` → "Seamless". |
| `addedAt` | `YYYY-MM-DD`. Trong 30 ngày kể từ ngày này, thẻ hiện chip "New". Cũng dùng làm `uploadDate` cho SEO. |
| `price` | Chỉ điền giá thật, dạng chữ, ví dụ `"From $79 on Adobe Stock"`. |
| `poster` | Ảnh hiển thị trước khi video chạy (mặc định là `thumbnail`). |
| `sample` | `true` = dữ liệu mẫu, hiện chip "Sample data". **Xoá khi dùng clip thật.** |

- Category hoặc mood mới tự thành chip lọc.
- Lưới đầy đủ hiện 12 clip, nút "Show more" tải thêm 12.
- Link mua tự gắn UTM: `utm_source=portfolio&utm_medium=site&utm_campaign=<id clip>`.
- Thứ tự link mua: `stockUrl` của clip → nếu chưa có thì link profile Adobe Stock → nếu cũng chưa có thì **ẩn nút mua**.

## Sửa `site.json`

Giá trị rỗng hoặc còn chứa `[YOUR_` được coi là **chưa có**: nút hoặc khối cần nó sẽ tự ẩn. Vì vậy trang không bao giờ hiện link gãy hay `mailto:` rỗng.

| Trường | Ý nghĩa |
|---|---|
| `brandName`, `tagline`, `ownerName` | Tên thương hiệu, dòng phụ ở hero, tên ở footer (thiếu thì dùng `brandName`). |
| `story` | Đoạn giới thiệu bản thân ở mục About (thiếu thì ẩn). |
| `email` | Nút Email, câu hỏi "custom scene" trong FAQ, nút "Ask for more samples". Thiếu thì ẩn cả ba; không có cách liên hệ nào thì ẩn luôn mục Contact và link Contact trên menu. |
| `adobeStockProfileUrl` | CTA cuối trang, link footer, link dự phòng cho clip chưa có `stockUrl`. |
| `adobeLicenseUrl` | Link điều khoản license của Adobe trong FAQ. |
| `social` | `[{ "label", "url" }]` hiện ở Contact. |
| `collections` | `[{ "id", "name", "description", "collectionUrl" }]`. Có `collectionUrl` thật thì hiện nút "View full set on Adobe Stock". |
| `moods`, `useCases` | Nhãn hiển thị cho bộ lọc Mood và mục "Perfect for". |
| `freeSample` | `{ "title", "file", "note", "resolution", "thumbnail" }`. Thiếu `file` thì ẩn mục Free sample. |
| `stats` | `{ "showClipCount": false, "items": [{ "value", "label" }] }`. **Chỉ điền số thật.** Trống thì ẩn. |
| `trustedBy` | `[{ "name", "url", "logo" }]` cho khối "As used in". **Chỉ điền khi có xác nhận thật.** |
| `analytics` | Xem phần Analytics. |

Thẻ `<title>`, meta description, Open Graph trong `index.html` là HTML tĩnh (cho SEO), sửa trực tiếp trong file.

## Hệ design token

Mọi màu, cỡ chữ, khoảng cách, bo góc, thời gian chuyển động nằm ở đầu `style.css` (khối `:root`). Sửa ở đó là cả trang đổi theo.

| Nhóm | Token |
|---|---|
| Màu | `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-ink` |
| Chữ | `--font-display` (Fraunces), `--font-ui` (Inter), `--fs-hero` … `--fs-micro`, `--measure` (65ch) |
| Khoảng cách | `--s-1` … `--s-8` = 4 / 8 / 16 / 24 / 40 / 64 / 96 / 140px, `--space-section` |
| Hình khối | `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`, `--tap` (48px), `--tap-lg` (56px) |

**Màu nhấn** `--accent` chỉ dùng cho: nút mua, nút chính ở hero, viền focus và thanh tiến trình cuộn. Đổi màu: sửa 3 dòng

```css
--accent: #e8b464;        /* màu nút */
--accent-hover: #f2c47c;  /* sáng hơn một chút khi rê chuột */
--accent-ink: #1a1308;    /* chữ trên nút: tương phản ≥ 4.5:1 với --accent */
```

Ví dụ xanh lá: `--accent: #9fd27a; --accent-hover: #b3e091; --accent-ink: #0d1a06;`. Kiểm tra tương phản tại https://webaim.org/resources/contrastchecker/.

**Đổi font:**
1. Chọn tối đa 2 họ font trên Google Fonts.
2. Thay URL Google Fonts ở **cả 2 chỗ** trong `index.html`: `<link rel="preload">` và `<noscript>`.
3. Sửa tên font trong đoạn script `fontsGo` ở `<head>`. Script này chờ font tải xong (tối đa 1.2s) rồi mới cho chữ hero hiện, để chữ không bị nhảy.
4. Sửa `--font-display` và `--font-ui` trong `style.css`.

## Hệ chuyển động (motion)

### Thời gian và easing (`style.css`)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--dur-instant` | 100ms | bấm nút, bật tắt |
| `--dur-fast` | 150ms | hover nhỏ, phản hồi nút |
| `--dur-med` | 250ms | modal, drawer, menu, thẻ nâng lên |
| `--dur-slow` | 400ms | chuyển clip, lọc, FLIP |
| `--dur-reveal` | 700ms | reveal khi cuộn, chữ hero |
| `--dur-hero` | 800ms | hiệu ứng vào trang dài nhất |
| `--ease-out` / `--ease-in` / `--ease-in-out` | | đi vào / đi ra / ở trên màn suốt |

- Thoát (exit) dùng khoảng 75% thời gian vào.
- Trên màn hình cảm ứng, `--dur-med`, `--dur-slow`, `--dur-reveal` chậm hơn một chút.
- Tổng stagger mỗi nhóm ≤ 500ms (tự giảm khoảng lệch khi nhiều phần tử).
- Chỉ nút ♥ có độ nảy (`--ease-pop`).

### `motion.js` và data-attribute

`motion.js` gồm: một vòng `requestAnimationFrame` dùng chung (chỉ chạy khi có việc), một IntersectionObserver chung, `lerp`/`clamp`, và các cờ:
- `Motion.reduced`: người dùng bật giảm chuyển động.
- `Motion.finePointer`: có chuột.
- `Motion.lowPower`: ≤ 4 nhân CPU, ≤ 4GB RAM hoặc bật Data Saver.
- `Motion.rich`: có chuột, không reduced, không lowPower.

Gắn hiệu ứng bằng thuộc tính HTML:

```html
<h2 data-reveal="mask">Tiêu đề</h2>            <!-- từng từ trượt lên sau mặt nạ -->
<p data-reveal="fade" data-delay="120">…</p>   <!-- mờ dần, trễ 120ms -->
<div data-reveal="up">…</div>                  <!-- trượt lên + rõ dần -->
<p class="eyebrow" data-reveal="line">…</p>    <!-- đường kẻ chạy ra -->
<div data-stagger="60">…các con có data-reveal…</div>  <!-- lệch nhau 60ms -->
```

Trình duyệt hỗ trợ `animation-timeline: view()` thì reveal chạy hoàn toàn bằng CSS theo vị trí cuộn; không hỗ trợ thì dùng IntersectionObserver. `will-change` chỉ được gắn trong lúc đang animate.

### Tắt hoặc giảm từng hiệu ứng

| Hiệu ứng | Cách tắt |
|---|---|
| Tất cả hiệu ứng nặng (nghiêng thẻ, spotlight, parallax, con trỏ phụ, magnetic) | Trong `motion.js`, đổi `const rich = …` thành `const rich = false;` |
| Video nền hero | Trong `script.js`, xoá dòng `initHero(...)` ở phần Init; trang chỉ hiện poster tĩnh |
| Zoom chậm của hero | Xoá dòng `.js .hero-media { animation: hero-zoom … }` trong `style.css` |
| Marquee "Perfect for" | Đặt `--dur-marquee` rất lớn, hoặc xoá dòng `animation: marquee …` trong `.marquee-track` |
| Vệt sáng ở CTA cuối | Xoá dòng `.finale-cta::before { animation: sheen … }` |
| View Transitions (thẻ → modal) | Trong `script.js`, cho `canVT` trả về `false` |
| Reveal khi cuộn | Xoá `data-reveal` khỏi phần tử, hoặc xoá khối "Reveal system" trong `style.css` |

Người bật "giảm chuyển động" trong hệ điều hành: không có zoom, parallax, nghiêng, marquee hay video nền tự chạy; modal và drawer chỉ mờ dần 200ms.

## Mức hiệu ứng (fxLevel): off · standard · max

| Mức | Gồm những gì |
|---|---|
| `off` | Không chuyển động trang trí; mọi thay đổi trạng thái tức thì. Không video nền tự chạy. |
| `standard` | Bản cũ: reveal khi cuộn, hero video, hover thẻ, modal, FLIP… |
| `max` | `standard` + toàn bộ tầng "cinematic" bên dưới (file `fx.js` + `fx.css`). |

**Cách chọn mức (ưu tiên từ trên xuống):**
1. Thêm `?fx=off`, `?fx=standard` hoặc `?fx=max` vào URL. Lựa chọn được lưu lại (localStorage).
2. Nút **FX** trên thanh menu. Trên điện thoại nút này ẩn, mở bằng link "Motion: …" ở footer hoặc phím **Shift+F**. Đổi mức sẽ ghi sự kiện `fx_change`.
3. Mặc định lấy `site.json → "fxLevel"` (hiện là `"max"`), rồi tự hạ theo thiết bị:
   - Bật "giảm chuyển động" → `off`.
   - Data Saver, CPU ≤ 4 nhân hoặc RAM ≤ 4GB → `standard`.
   - Màn hình cảm ứng → tắt các hiệu ứng theo chuột, giữ hiệu ứng theo cuộn.
4. **Bộ đo FPS** (3 giây đầu và trong lúc cuộn): nếu dưới 45fps hai lần liên tiếp thì tắt dần hiệu ứng nặng nhất, theo thứ tự WebGL → hạt → méo ảnh → hạt phim (grain) → về hẳn `standard` trong phiên đó. WebGL và hạt chỉ được bật sau khi trang tải xong và giữ ≥ 50fps; máy không có GPU (trình render phần mềm) không bật WebGL.
5. `?fxlock=1` giữ nguyên mức đang chọn, không tự hạ (dùng khi test hoặc demo).

### Các hiệu ứng ở mức max và nhóm để tắt riêng

| Nhóm | Hiệu ứng |
|---|---|
| `intro` | Màn kéo mở màn lần đầu vào trang (≤ 1150ms, có nút Skip, Esc; không chặn bấm; lần sau không chạy) |
| `webgl` | Nền hero WebGL: video làm texture, gợn sóng nhẹ, quầng sáng theo chuột, tán sắc màu ở rìa khi rê nhanh |
| `particles` | Hạt bụi/phấn hoa có chiều sâu trên hero (Canvas 2D), lớp sương, đom đóm CSS |
| `distort` | Nghiêng theo vận tốc cuộn (skewY ≤ 3°), gợn sóng SVG trên ảnh thẻ khi hover |
| `grain` | Vignette, hạt phim (opacity 0.05), vệt sáng ống kính |
| `cursor` | Con trỏ phụ đổi theo ngữ cảnh (Play/View, Drag, Buy) |
| `tilt` | Nghiêng thẻ 6°, parallax ảnh trong thẻ, viền sáng và bóng đổ theo hướng nghiêng |
| `magnetic` | Nút chính và ♥ hút theo chuột (≤ 10px); chỉ lớp hiển thị di chuyển, vùng bấm thật đứng yên |

Các hiệu ứng `max` khác (không thuộc nhóm nào, luôn nhẹ):
- Tiêu đề hero và tiêu đề section hiện theo từng ký tự.
- Số thứ tự section lật vào.
- Dòng chữ khổng lồ chạy theo vận tốc cuộn; tông nền đổi giữa các section.
- Process cao ~4.5 màn hình, ảnh zoom chậm, số lật.
- Modal: nền mờ dần lên 14px; mở kiểu "ống kính" khi trình duyệt không có View Transitions; vệt sáng khi đổi clip.
- Chi tiết nhỏ: tim có vòng sóng, số shortlist lật kiểu bảng chữ sân bay, chữ nút cuộn khi hover, nhãn nhỏ xáo trộn chữ một lần, bộ đếm số clip thật, chữ thương hiệu khổng lồ ở footer.

**Tắt riêng một nhóm:** trong `motion.js`, sau dòng `const off = new Set(...)`, thêm ví dụ `off.add("webgl");`. Hoặc tắt khi đang chạy bằng `Motion.fx.disable("particles")` trong console.

**Trang chậm, cần tắt nhanh:** đổi `"fxLevel": "standard"` trong `site.json`. Người xem nào đã tự chọn mức qua nút FX vẫn giữ lựa chọn của họ.

### Ngân sách và số đo

- **Dung lượng thêm cho mức max:** `fx.js` 12.8KB + `fx.css` 5.8KB (gzip), cộng khoảng 1.6KB thay đổi ở `motion.js`/`script.js`. Tổng ~20KB, dưới ngân sách 60KB. Không thêm file video nào.
- **Lighthouse mobile** (đo trên máy test):

  | Mức | Performance | Accessibility / Best Practices / SEO | CLS |
  |---|---|---|---|
  | standard | 90–91 | 100 / 100 / 100 | 0.041 |
  | max | 87–90 | 100 / 100 / 100 | 0.041 |
  | off | 90 | 100 / 100 / 100 | 0.04 |

- **FPS desktop 1440px** trên máy test **không có GPU** (render bằng CPU, 4 nhân), nên đây là trường hợp xấu nhất:

  | Mức | Đứng yên | Đang cuộn |
  |---|---|---|
  | off | 60 | 60 |
  | standard | 59 | 39 |
  | max (tự động) | ~27 lúc đầu, bộ đo FPS tự tắt dần hiệu ứng rồi về standard | — |
  | max khoá (`?fxlock=1`) | 21 | 14 |

  Trên máy có GPU thật các lớp này được card đồ hoạ xử lý; tôi chưa đo được trên thiết bị thật. Hãy thử `?fx=max` trên máy của bạn và xem nút FX có tự chuyển về Standard hay không.

## Đoạn "hero film" (cuộn để tua chuỗi khung hình)

Ngay dưới hero có một đoạn cao khoảng 4 màn hình. Khung hình dính lại (`position: sticky`) và cuộn trang sẽ tua qua chuỗi ảnh vẽ trên `<canvas>`. Bốn dòng chữ lần lượt hiện ở các mốc 15%, 40%, 65% và 90%. Ở cuối đoạn hiện nút "Browse Collection". Có nút "Skip film" để nhảy qua.

- **Dữ liệu hiện tại là MẪU:** 60 khung do `tools/make-sample-sequence.py` tạo, mỗi khung có chữ "SAMPLE FRAME". Desktop 1280×720 (552KB), mobile 640×360 (244KB).
- **Cấu hình** nằm trong `site.json → "sequence"`: số khung (`frames`), số chữ số trong tên file (`pad`), đường dẫn desktop/mobile (`{n}` = số khung), ảnh tĩnh dự phòng (`fallback`) và mô tả cho trình đọc màn hình (`label`). **Xoá cả khối `sequence` thì đoạn này ẩn đi.**
- **Cách tải ảnh:** khung đầu tải ngay. Các khung còn lại tải theo lô, tối đa 6 yêu cầu cùng lúc, ưu tiên khung gần vị trí đang xem. Trong lúc chờ, trang hiện khung gần nhất đã tải xong.
- **Dự phòng:** reduced motion, Data Saver, máy yếu hoặc lỗi tải khung đầu → chỉ hiện một ảnh tĩnh kèm cả 4 dòng chữ và nút bấm, không dùng canvas.
- **Tiếp cận:** cả 4 dòng chữ luôn nằm trong DOM (trình đọc màn hình đọc được); canvas có `aria-label`.
- **Ngân sách:** bộ ảnh desktop ≤ 8MB, mobile ≤ 4MB. WebP từ 960×540 đến 1280×720 là đủ.

### Xuất chuỗi ảnh thật từ UE5

1. Trong Sequencer, dựng một cú máy chậm, liền mạch, 4–6 giây (ví dụ dolly qua cảnh).
2. Mở **Movie Render Queue** → Output: **PNG Sequence** (hoặc EXR), độ phân giải 1920×1080, 24 hoặc 30 fps. Tên file ví dụ `shot.{frame_number}`.
3. Chọn khoảng 90–150 khung: nhiều hơn thì mượt hơn nhưng nặng hơn.
4. Chuyển sang WebP và đổi tên đúng mẫu:

```bash
# desktop 1280×720
ffmpeg -framerate 30 -i shot.%04d.png -vf "scale=1280:-2" -c:v libwebp -quality 70 -start_number 1 assets/sequence/desktop/frame_%04d.webp
# mobile 640×360
ffmpeg -framerate 30 -i shot.%04d.png -vf "scale=640:-2" -c:v libwebp -quality 66 -start_number 1 assets/sequence/mobile/frame_%04d.webp
# hoặc lấy khung từ một video đã render (24 khung/giây)
ffmpeg -i shot.mp4 -vf "fps=24,scale=1280:-2" -c:v libwebp -quality 70 assets/sequence/desktop/frame_%04d.webp
```

5. Cập nhật `"frames"` trong `site.json` bằng số file vừa tạo; chọn một khung đẹp làm `"fallback"`.
6. Kiểm tra dung lượng: `du -sh assets/sequence/desktop` (≤ 8MB). Quá nặng thì giảm `-quality` (60–65) hoặc giảm số khung.
7. Sửa 4 dòng chữ trong `index.html` (`.film-line`) cho đúng cảnh của bạn.

## Analytics (tuỳ chọn)

Mặc định tắt: không tải script, không cookie, không cần cookie banner.

- GoatCounter: `"analytics": { "provider": "goatcounter", "id": "<mã-site>" }`
- Plausible: `"analytics": { "provider": "plausible", "id": "<tên-miền>" }`

Sự kiện ghi nhận:
- `buy_click` (kèm id clip)
- `modal_open`
- `favorite_add`
- `filter` (mood / category / use case / collection / từ khoá)
- `shortlist_open`
- `license_all`
- `fx_change` (người xem đổi mức hiệu ứng), `fx_auto` (trang tự tắt bớt hiệu ứng vì chậm)
- `free_download`
- `sample_request`

Muốn đếm thêm nút nào, gắn `data-track="tên_sự_kiện"` (và `data-clip="..."` nếu cần).

## Nén file preview (5–10 giây, dưới 10MB)

```bash
# Preview 720p, 8 giây, bỏ âm thanh, tối ưu web
ffmpeg -i input_4k.mp4 -t 8 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow \
  -pix_fmt yuv420p -an -movflags +faststart assets/previews/clip-01.mp4

# Thumbnail từ giây thứ 2
ffmpeg -ss 2 -i input_4k.mp4 -frames:v 1 -vf "scale=640:-2" -q:v 4 assets/thumbs/clip-01.jpg

# File mẫu miễn phí 720p
ffmpeg -i input_4k.mp4 -t 8 -vf "scale=1280:-2" -c:v libx264 -crf 26 -an -movflags +faststart assets/free/free-sample-720p.mp4
```

File vẫn lớn thì tăng `-crf` (30–32) hoặc giảm `scale` (960). Preview của clip featured đầu tiên (video hero) nên dưới 5MB.

**Poster hero:** để ảnh hiện nhanh nhất, sửa đường dẫn trong `index.html` ở 2 chỗ (`<link rel="preload" as="image">` và `<img id="hero-poster">`) cho khớp poster của clip featured đầu tiên.

## Bật GitHub Pages

1. Merge vào `main`.
2. Vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` tự deploy mỗi lần push vào `main` (checkout@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5, đều chạy Node 24).

## Việc tôi cần tự điền

- [ ] `videos.json`: link Adobe Stock **thật** cho từng clip (`stockUrl`), thay 6 clip mẫu, xoá `"sample": true` và tag `sample`/`placeholder`.
- [ ] `site.json`: `adobeStockProfileUrl`, `email`, `ownerName`, `story`, `social`.
- [ ] `site.json → collections`: tên bộ thật, `collectionUrl` nếu có trên Adobe Stock.
- [ ] Preview thật (5–10 giây, dưới 10MB) trong `assets/previews/`; thumbnail/poster thật (JPG/WebP) trong `assets/thumbs/`.
- [ ] Đường dẫn poster hero trong `index.html` (2 chỗ).
- [ ] Ảnh chụp màn hình UE5 thật cho "Behind the scene": thay `assets/bts/step-1.svg` … `step-4.svg` (dùng ở cả ảnh lớn desktop lẫn ảnh từng bước mobile), sửa chữ 4 bước cho khớp quy trình của bạn.
- [ ] `assets/free/free-sample-720p.mp4`: file mẫu thật (hoặc xoá `freeSample.file` để ẩn mục này).
- [ ] `assets/og.png`: ảnh chia sẻ thật.
- [ ] `assets/sequence/`: chuỗi khung hình thật xuất từ UE5 (xem phần "hero film"), sửa `site.json → sequence` và 4 dòng chữ.
- [ ] Khi có số liệu thật: `stats`, `trustedBy`, `price`.
- [ ] (Tuỳ chọn) analytics.
- [ ] Chạy `python3 tools/sync-fallback.py` sau khi sửa JSON nếu muốn mở `index.html` trực tiếp.

## Ảnh trước/sau

`docs/screenshots/before-*.jpg` là bản trên `main` trước đợt nâng cấp này. `after-*.jpg` là bản mới, chụp với **link Adobe Stock thử** để thấy nút mua (với dữ liệu mẫu hiện tại, nút mua đang ẩn vì chưa có link thật).
