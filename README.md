# Wild Frames — Website giới thiệu video thiên nhiên 4K (UE5)

Website tĩnh (HTML/CSS/JS thuần, không thư viện, không bước build). Mục tiêu duy nhất: khách xem trước clip rồi bấm sang Adobe Stock để mua license.

Địa chỉ: https://mai-dang-khoa.github.io/nature-footage/

## Chạy thử trên máy

- Chạy server tĩnh: `python3 -m http.server 8000` rồi mở http://localhost:8000 (giống GitHub Pages nhất).
- Hoặc mở thẳng `index.html`. Khi đó trang dùng bản dữ liệu dự phòng nhúng trong HTML. Sau khi sửa `videos.json` hoặc `site.json`, chạy `python3 tools/sync-fallback.py` để cập nhật bản này. Không bắt buộc với GitHub Pages.
- Nếu `videos.json` lỗi mạng hoặc sai định dạng, trang tự dùng bản dự phòng, không bao giờ trắng.

## Cấu trúc

```
index.html   style.css   script.js   motion.js   film.js
docs/design/        quy tắc thiết kế đã khóa (DESIGN.md), copy (copy.md), moodboard, bảng chữ
assets/sequence/    khung hình cho đoạn film (desktop/ và mobile/; hiện là dữ liệu mẫu)
videos.json         danh sách clip
site.json           thông tin chung: tên, email, link, collections, free sample, analytics…
assets/thumbs/      thumbnail
assets/previews/    video preview (preview của clip featured đầu tiên = footage ở hero)
assets/free/        file mẫu miễn phí
assets/bts/         ảnh Process (đang là ảnh SVG giữ chỗ)
assets/og.png       ảnh chia sẻ mạng xã hội (1200×630)
tools/sync-fallback.py   đồng bộ JSON vào index.html (chỉ cần cho file://)
tools/design-check.js    kiểm tra trang theo DESIGN.md (cho lập trình viên, cần Node + Playwright)
docs/screenshots/   ảnh trước/sau
```

## Luồng trang

Nền xen kẽ đen / xám nhạt, mỗi màn một ý, một hành động:

Hero (đen: một dòng, một câu, nút **Browse clips**, footage full-bleed) → Film (đen: khung footage đứng yên, chữ đổi khi cuộn) → Clips (sáng: lọc theo category, thẻ clip, Show more) → Free sample (đen) → Process (sáng: ảnh đứng yên, 4 bước cuộn qua) → FAQ (đen) → About (sáng) → CTA cuối (đen, căn giữa) → footer.

## Chuyển động và tương tác (apple.css + apple.js)

Bật cho mọi người, tắt hết khi người xem bật "giảm chuyển động". Chỉ dùng transform / opacity / filter / clip-path.

- **Hero:** video toàn màn hình (tắt tiếng, lặp) dưới lớp tối 35%. Tiêu đề 72px (điện thoại 40px), dòng phụ 20px màu `#86868b`. Khi tải trang: tiêu đề, dòng phụ, nút hiện lần lượt bằng spring 800ms, cách nhau 150ms. Khi cuộn: video thu lại thành khung bo góc, tiêu đề nhấc lên và mờ đi.
- **Ảnh/video trong các section:** phóng từ 0.92 lên 1 và hiện dần từ 0 lên 1, gắn với vị trí cuộn (đường cong ease-out, không tuyến tính).
- **Tiêu đề section:** từng chữ trồi lên khỏi mặt nạ, hơi mờ rồi nét (kiểu keynote).
- **Thẻ clip:** hover phóng 1.03, bóng đổ mềm, 400ms. Có chuột: thẻ nghiêng nhẹ ≤ 4° theo chuột, có vệt sáng chạy theo con trỏ.
- **Ghim và chữ sáng dần (GSAP):** section About ghim lại một màn, từng dòng sáng theo tiến độ cuộn.
- **Parallax:** ảnh trong thẻ trôi chậm khác tốc độ theo cột; ảnh Free sample cũng trôi nhẹ.
- **Nền đổi màu theo cuộn:** nền đen/trắng chuyển dần qua từng ranh giới section (chỉ khi không bật giảm chuyển động).
- **Tiêu đề có lớp bóng:** một bản mờ của tiêu đề trôi chậm hơn phía sau, tạo chiều sâu.
- **Nút và thẻ:** nút có ánh sáng theo con trỏ; thẻ clip đổ bóng ra xa con trỏ.
- **Quét sáng:** một dải sáng lướt qua mỗi ảnh clip một lần khi vào khung hình.
- **Con trỏ:** vòng tròn bám theo chuột, phình ra khi rê lên thẻ hoặc nút (chỉ máy tính).
- **Bấm vào thẻ:** ảnh "bay" thành khung video trong cửa sổ chi tiết (View Transitions); các dòng thông tin hiện lần lượt.
- **Bộ lọc:** dạng segmented control, viên chọn trượt có độ nảy kiểu Telegram. Số "Saved" nảy khi thay đổi.
- **About:** câu giới thiệu sáng dần từng chữ khi đọc tới.
- **Có chuột:** nền hero dịch chiều sâu theo chuột; nút hút nhẹ ≤ 6px về phía chuột (nút mua không bao giờ di chuyển); menu có viên sáng trượt theo mục đang rê.
- **Nút mua trên mỗi thẻ:** "Buy on Adobe Stock" (đổi tên đối tác ở `site.json → partnerName`), mở tab mới. Chưa có link thật thì nút xám, không bấm được.
- **Placeholder:** hero và từng thẻ có nhãn ghi kích thước cần thay (video hero 3840×2160 MP4 ≤ 8MB + poster 1920×1080; thẻ: ảnh 1280×720, preview 1920×1080 MP4).

## Thư viện ngoài

- **GSAP 3.12.5 + ScrollTrigger** tải từ cdnjs (`index.html`, trước `apple.js`). Nếu không tải được, trang vẫn chạy bằng CSS và JS thuần; chỉ mất phần ghim và parallax.
- Khi test trong môi trường không truy cập được cdnjs, dùng đúng file trong gói npm `gsap@3.12.5`.

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
| `featured` | Clip featured đầu tiên làm footage ở hero. |
| `collection` | `id` của một collection trong `site.json`; tên bộ hiện trong modal (dòng "Set"). |
| `fps`, `loopable` | Hiện trong modal. `loopable: true` → "Seamless". |
| `addedAt` | `YYYY-MM-DD`, dùng làm `uploadDate` cho SEO. |
| `mood`, `useCases`, `tags` | Không hiện trên trang (giữ lại cho SEO / sau này). |
| `price` | Chỉ điền giá thật, dạng chữ, ví dụ `"From $79 on Adobe Stock"`. |
| `poster` | Ảnh hiển thị trước khi video chạy (mặc định là `thumbnail`). |
| `sample` | `true` = dữ liệu mẫu, thẻ và modal ghi "Sample". **Xoá khi dùng clip thật.** |

- Tên clip nên ≤ 6 từ (caption dưới ảnh).
- Category mới tự thành chip lọc.
- Lưới hiện 9 clip, nút "Show more" tải thêm 9.
- Link mua tự gắn UTM: `utm_source=portfolio&utm_medium=site&utm_campaign=<id clip>`.
- Thứ tự link mua: `stockUrl` của clip → nếu chưa có thì link profile Adobe Stock → nếu cũng chưa có thì **ẩn nút mua**.

## Sửa `site.json`

Giá trị rỗng hoặc còn chứa `[YOUR_` được coi là **chưa có**: nút hoặc khối cần nó sẽ tự ẩn. Vì vậy trang không bao giờ hiện link gãy hay `mailto:` rỗng.

| Trường | Ý nghĩa |
|---|---|
| `brandName`, `ownerName` | Tên trên menu, tên ở footer (thiếu `ownerName` thì dùng `brandName`). |
| `story` | Thêm một đoạn ngắn ở About (thiếu thì ẩn). |
| `email` | Link Email ở footer và câu hỏi "custom scene" trong FAQ. Thiếu thì ẩn cả hai. |
| `adobeStockProfileUrl` | Nút CTA cuối trang ("License clips"; thiếu thì nút quay về "Browse clips"), link dự phòng cho clip chưa có `stockUrl`. |
| `adobeLicenseUrl` | Link điều khoản license của Adobe trong FAQ. |
| `social` | `[{ "label", "url" }]` hiện ở footer. |
| `collections` | `[{ "id", "name" }]`: tên bộ hiện trong modal. |
| `freeSample` | `{ "title", "file", "note", "thumbnail" }`. Tiêu đề ≤ 8 từ, `note` ≤ 18 từ. Thiếu `file` thì ẩn mục Free sample. |
| `sequence` | Đoạn film (xem bên dưới). Xoá khối này thì đoạn film ẩn. |
| `analytics` | Xem phần Analytics. |

Thẻ `<title>`, meta description, Open Graph trong `index.html` là HTML tĩnh (cho SEO), sửa trực tiếp trong file.

## Thiết kế (đã khóa)

Mọi quy tắc nằm ở [`docs/design/DESIGN.md`](docs/design/DESIGN.md). Tóm tắt:

- **Hướng:** product-cinematic. Nền chỉ `#000`, `#f5f5f7`, `#fff`. Chữ `#f5f5f7` trên tối, `#1d1d1f` trên sáng.
- **Một màu nhấn** `#0071e3` (trên nền đen dùng `#2997ff` cho đủ tương phản), chỉ cho link và nút pill.
- **Cấm:** icon minh họa, gradient nhiều màu, shadow, hơn 1 màu nhấn, đoạn văn trên hero, viền kẻ 1px.
- **Chữ:** Archivo semi-condensed 600 cho tiêu đề (80px hero, 48px section), Inter 17px cho chữ thường, 12–14px cho nhãn.
- **Lưới:** container 1024px, khoảng cách bội số 8px, section cách nhau 120px (mobile 64px), khối chiếm 5–7/12 cột.
- **Copy:** headline ≤ 8 từ, subline ≤ 18, nút 1–2 từ, caption ≤ 6. Xem [`docs/design/copy.md`](docs/design/copy.md).

**Đổi màu nhấn:** sửa `--accent` và `--accent-on-dark` ở đầu `style.css`. Chữ trắng trên `--accent` phải đạt ≥ 4.5:1, và `--accent-on-dark` trên nền đen cũng vậy (kiểm tra tại https://webaim.org/resources/contrastchecker/).

**Đổi font:** thay URL Google Fonts ở 2 chỗ trong `index.html` (`preload` và `noscript`), tên font trong `fontsGo` ở `<head>`, và `--font-display` / `--font-text` trong `style.css`.

## Chuyển động (chỉ 4 kiểu)

1. **Hiện khi cuộn tới:** mờ → rõ và trồi lên 20px, 700ms, chạy một lần. Gắn `data-reveal` vào phần tử; trễ thêm bằng `style="--d:100ms"`.
2. **Sticky:** khung footage đứng yên khi chữ cuộn qua (Film, Process).
3. **Crossfade:** đổi clip trong modal, đổi ảnh Process, lọc lưới clip, chữ trong Film. Không trượt ngang.
4. **Menu đổi màu** theo section tối/sáng nằm dưới nó; nền mờ (blur 20px) chỉ có khi đã cuộn.

Không có: parallax, con trỏ riêng, màn chờ, animation lặp. Hover chỉ đổi độ mờ hoặc gạch chân. Người bật "giảm chuyển động": mọi thứ hiện ngay, không video tự chạy.

`motion.js` chỉ làm 3 việc: reveal một lần, vòng `requestAnimationFrame` dùng chung (cho film), và màu menu.

### Số đo

- **Lighthouse mobile:** Performance 95–96, Accessibility / Best Practices / SEO 100, CLS 0 (trước đợt này: 88–90).
- **FPS khi cuộn hết trang:** 60fps ở 390px và 1440px (máy test không có GPU).
- **Dung lượng JS + CSS (gzip):** `script.js` 7.8KB, `style.css` 4.9KB, `film.js` 2.5KB, `motion.js` 1.6KB. Tổng ~17KB, giảm từ ~38KB.
- **Kiểm tra thiết kế** (`tools/design-check.js`) ở 1440px và 390px: tất cả quy tắc đạt (khoảng cách 8px, cỡ chữ, tương phản, số từ, một nút mỗi màn, footage ≥ 60% màn đầu, không shadow / gradient / viền / animation lặp, hover không phóng to).

## Đoạn film (cuộn để tua chuỗi khung hình)

Ngay dưới hero có một đoạn cao khoảng 4 màn hình. Khung footage đứng yên (`position: sticky`), cuộn trang sẽ tua qua chuỗi ảnh vẽ trên `<canvas>`. Chữ nằm **dưới** khung hình (không đè lên ảnh): tiêu đề bên trái, một caption bên phải đổi dần ở các mốc 12%, 37%, 62%, 84%. Cuối đoạn caption nhường chỗ cho nút "Browse clips". Có link "Skip" để nhảy qua.

- **Dữ liệu hiện tại là MẪU:** 60 khung do `tools/make-sample-sequence.py` tạo, mỗi khung có chữ "SAMPLE FRAME".
- **Cấu hình** trong `site.json → "sequence"`: `frames`, `pad`, đường dẫn desktop/mobile (`{n}` = số khung, kèm `width`/`height`), ảnh tĩnh dự phòng `fallback`, mô tả `label`.
- **Điện thoại** chỉ dùng bộ `mobile` khi khung đủ cao để ảnh còn sắc; nếu không thì dùng bộ desktop. Nên xuất bộ mobile dạng dọc 720×1080 (xem lệnh bên dưới).
- **Cách tải:** khung đầu tải ngay, phần còn lại tải theo lô (tối đa 6 yêu cầu cùng lúc), ưu tiên khung gần vị trí đang xem.
- **Dự phòng:** giảm chuyển động, Data Saver, máy yếu hoặc lỗi tải → một ảnh tĩnh kèm cả 4 caption và nút bấm.
- **Ngân sách:** bộ desktop ≤ 8MB, mobile ≤ 4MB.

### Xuất chuỗi ảnh thật từ UE5

1. Trong Sequencer, dựng một cú máy chậm, liền mạch, 4–6 giây (ví dụ dolly qua cảnh).
2. Mở **Movie Render Queue** → Output: **PNG Sequence** (hoặc EXR), độ phân giải 1920×1080, 24 hoặc 30 fps. Tên file ví dụ `shot.{frame_number}`.
3. Chọn khoảng 90–150 khung: nhiều hơn thì mượt hơn nhưng nặng hơn.
4. Chuyển sang WebP và đổi tên đúng mẫu:

```bash
# desktop 1280×720
ffmpeg -framerate 30 -i shot.%04d.png -vf "scale=1280:-2" -c:v libwebp -quality 70 -start_number 1 assets/sequence/desktop/frame_%04d.webp
# mobile dạng dọc 720×1080 (cắt giữa khung)
ffmpeg -framerate 30 -i shot.%04d.png -vf "crop=ih*2/3:ih,scale=720:1080" -c:v libwebp -quality 66 -start_number 1 assets/sequence/mobile/frame_%04d.webp
# hoặc lấy khung từ một video đã render (24 khung/giây)
ffmpeg -i shot.mp4 -vf "fps=24,scale=1280:-2" -c:v libwebp -quality 70 assets/sequence/desktop/frame_%04d.webp
```

5. Cập nhật `"frames"` trong `site.json` bằng số file vừa tạo, `"width"`/`"height"` của từng bộ (mobile: 720 / 1080); chọn một khung đẹp làm `"fallback"`.
6. Kiểm tra dung lượng: `du -sh assets/sequence/desktop` (≤ 8MB). Quá nặng thì giảm `-quality` (60–65) hoặc giảm số khung.
7. Sửa 4 caption trong `index.html` (`.film-line`, mỗi dòng ≤ 6 từ) cho đúng cảnh của bạn.

## Analytics (tuỳ chọn)

Mặc định tắt: không tải script, không cookie, không cần cookie banner.

- GoatCounter: `"analytics": { "provider": "goatcounter", "id": "<mã-site>" }`
- Plausible: `"analytics": { "provider": "plausible", "id": "<tên-miền>" }`

Sự kiện ghi nhận:
- `buy_click` (kèm id clip)
- `modal_open`
- `favorite_add`
- `filter` (category)
- `shortlist_open` (mở danh sách Saved)
- `license_all`
- `free_download`

Muốn đếm thêm nút nào, gắn `data-track="tên_sự_kiện"` (và `data-clip="..."` nếu cần).

## Ảnh và footage (quyết định 70% cảm giác "đắt")

- Render trên nền đồng màu với section (đen hoặc xám `#f5f5f7`). Không cắt PNG rồi đặt lên nền lệch màu.
- Crop chặt, không để lề chết. Ở hero, footage chiếm ≥ 60% màn đầu.
- Ảnh tĩnh xuất **AVIF hoặc WebP, gấp đôi kích thước hiển thị** (thumbnail 1280×720, poster hero 2880×1620). Poster hero ≤ 300KB mà vẫn sắc ở 1440px.
- Không phủ gradient lên ảnh để đọc chữ: chữ luôn nằm ngoài ảnh.

```bash
# poster hero AVIF ≤ 300KB (giảm -crf nếu còn nặng: tăng số)
ffmpeg -ss 2 -i input_4k.mp4 -frames:v 1 -vf "scale=2880:-2" -c:v libaom-av1 -still-picture 1 -crf 32 assets/thumbs/clip-01.avif
# thumbnail WebP 1280×720
ffmpeg -ss 2 -i input_4k.mp4 -frames:v 1 -vf "scale=1280:-2" -c:v libwebp -quality 80 assets/thumbs/clip-01.webp
```

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
- [ ] `site.json → collections`: tên bộ thật.
- [ ] Preview thật (5–10 giây, dưới 10MB) trong `assets/previews/`; thumbnail/poster thật (AVIF/WebP, gấp đôi kích thước) trong `assets/thumbs/`.
- [ ] Đường dẫn poster hero trong `index.html` (2 chỗ).
- [ ] Ảnh chụp màn hình UE5 thật cho Process: thay `assets/bts/step-1.svg` … `step-4.svg`, sửa chữ 4 bước (mỗi câu ≤ 18 từ).
- [ ] `assets/free/free-sample-720p.mp4`: file mẫu thật (hoặc xoá `freeSample.file` để ẩn mục này).
- [ ] `assets/og.png`: ảnh chia sẻ thật.
- [ ] `assets/sequence/`: chuỗi khung hình thật xuất từ UE5 (xem phần film), sửa `site.json → sequence` và 4 caption.
- [ ] Khi có giá thật: `price` trong `videos.json`.
- [ ] (Tuỳ chọn) analytics.
- [ ] Chạy `python3 tools/sync-fallback.py` sau khi sửa JSON nếu muốn mở `index.html` trực tiếp.

## Ảnh trước/sau

`docs/screenshots/before-*.jpg` là bản trên `main` trước đợt thiết kế lại này, `after-*.jpg` là bản mới (hero, lưới clip, modal; 1440px và 390px). Nút mua đang ẩn vì dữ liệu mẫu chưa có link Adobe Stock thật.
