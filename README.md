# Wild Frames — Website giới thiệu video thiên nhiên 4K (UE5)

Website tĩnh (HTML/CSS/JS thuần, không cần build). Mục tiêu: khách xem trước clip rồi bấm sang Adobe Stock để mua license.

## Chạy thử trên máy

- Chạy server tĩnh: `python3 -m http.server 8000` rồi mở http://localhost:8000 (giống GitHub Pages nhất).
- Hoặc mở thẳng `index.html`. Khi đó trang dùng bản dữ liệu dự phòng nhúng trong HTML. Sau khi sửa `videos.json`/`site.json`, chạy `python3 tools/sync-fallback.py` để cập nhật bản này (không bắt buộc với GitHub Pages).

## Cấu trúc

```
index.html  style.css  script.js
videos.json         danh sách clip
site.json           thông tin chung: tên, email, link, collections, use case, analytics...
assets/thumbs/      thumbnail
assets/previews/    video preview (clip featured đầu tiên cũng là video nền hero)
assets/free/        file mẫu miễn phí
assets/bts/         ảnh "Behind the scene"
assets/og.png       ảnh chia sẻ mạng xã hội (1200x630)
tools/sync-fallback.py  đồng bộ JSON vào index.html (chỉ cần cho file://)
```

## Luồng chuyển đổi của trang

Hero (video) → Featured (6 clip) → Perfect for (lọc theo mục đích) → Collections → Full collection (lọc, tìm, Show more) → Stats/As used in (chỉ hiện khi có dữ liệu thật) → Free sample → Behind the scene → FAQ → About/Contact → CTA cuối.

Màu nhấn `--accent` chỉ dùng cho: nút mua, nút "Browse Collection" ở hero và viền focus. Đừng dùng cho thứ khác.

## Thiết kế: design tokens

Mọi màu, cỡ chữ, khoảng cách, bo góc, thời gian chuyển động nằm ở đầu `style.css` (khối `:root`). Sửa ở đó là cả trang đổi theo, không cần tìm từng chỗ.

| Nhóm | Token | Ghi chú |
|---|---|---|
| Màu | `--bg`, `--surface`, `--surface-2` | Nền gần đen ngả xanh lục; mỗi lớp bề mặt sáng hơn 1 bậc. |
| | `--text`, `--text-muted` | Chữ chính / chữ phụ (đạt ≥ 4.5:1 trên nền). |
| | `--border`, `--border-strong`, `--scrim`, `--glass` | Viền, lớp phủ tối, nền mờ. |
| | `--accent`, `--accent-hover`, `--accent-ink` | Màu nhấn duy nhất + màu chữ đặt trên nó. |
| Chữ | `--font-display`, `--font-ui` | Fraunces (tiêu đề), Inter (nội dung). |
| | `--fs-hero`, `--fs-h2`, `--fs-h3`, `--fs-lede`, `--fs-body`, `--fs-small`, `--fs-caption`, `--fs-micro` | Thang cỡ chữ dùng `clamp()`. |
| Khoảng cách | `--s-1` … `--s-7` | 4 / 8 / 16 / 24 / 40 / 64 / 96px. `--space-section` = khoảng cách giữa các section. |
| Hình khối | `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`, `--tap`, `--tap-lg` | Bo góc, kích thước vùng bấm tối thiểu. |
| Chuyển động | `--dur-fast`, `--dur-modal`, `--dur-reveal`, `--dur-hero-zoom`, `--stagger-hero`, `--stagger-card`, `--ease-out`, `--ease-in-out` | Thời gian và easing. |

### Đổi màu nhấn

Sửa 3 dòng trong `:root`:

```css
--accent: #e8b464;        /* màu nút */
--accent-hover: #f2c47c;  /* sáng hơn 1 chút khi rê chuột */
--accent-ink: #1a1308;    /* chữ trên nút: phải đạt tương phản ≥ 4.5:1 với --accent */
```

Ví dụ xanh lá: `--accent: #9fd27a; --accent-hover: #b3e091; --accent-ink: #0d1a06;`.
Kiểm tra tương phản tại https://webaim.org/resources/contrastchecker/.

### Đổi font

1. Chọn font trên Google Fonts (tối đa 2 họ để trang nhẹ).
2. Trong `index.html`, thay URL Google Fonts ở **cả 2 chỗ** (thẻ `<link rel="preload">` và trong `<noscript>`).
3. Trong `index.html`, sửa tên font trong đoạn script `fontsGo` (ví dụ `"300 1em Fraunces"`). Script này chờ font tải xong rồi mới hiện chữ hero, để chữ không bị nhảy.
4. Trong `style.css`, sửa `--font-display` và `--font-ui`.

### Thay video nền hero

- Video hero tự lấy `preview` của **clip đầu tiên có `"featured": true`** trong `videos.json`. Muốn đổi video: đưa clip bạn muốn lên đầu danh sách featured.
- Ảnh tĩnh (poster) hiện ngay khi mở trang: dùng `poster` (hoặc `thumbnail`) của clip đó. Để ảnh hiện nhanh nhất, sửa luôn đường dẫn trong `index.html` ở 2 chỗ: thẻ `<link rel="preload" as="image" ...>` và `<img id="hero-poster" ...>`.
- Video chỉ tải sau khi trang load xong. Không tải khi: người dùng bật giảm chuyển động (reduced motion), bật Data Saver, hoặc mạng chậm (2G/3G). Khi đó chỉ hiện poster.
- File chưa có hoặc trình duyệt không phát được: trang giữ nguyên poster.
- Nên dùng clip quay chậm, ít chi tiết nhỏ ở nửa dưới (chỗ đặt chữ), file dưới 5MB.

Ảnh trước/sau khi nâng cấp giao diện nằm trong `docs/screenshots/`.

## Thêm clip mới (videos.json)

```json
{
  "id": "misty-forest-01",
  "title": "Misty Forest at Dawn",
  "featured": true,
  "category": "Forest",
  "collection": "forest-mornings",
  "tags": ["forest", "mist", "dawn"],
  "useCases": ["documentary", "wellness"],
  "resolution": "4K",
  "fps": 24,
  "duration": "0:15",
  "loopable": true,
  "price": "",
  "thumbnail": "assets/thumbs/misty-forest-01.jpg",
  "poster": "assets/thumbs/misty-forest-01.jpg",
  "preview": "assets/previews/misty-forest-01.mp4",
  "stockUrl": "https://stock.adobe.com/video/..."
}
```

Bắt buộc: `id`, `title`, `category`, `resolution`, `duration`, `thumbnail`, `preview`, `stockUrl`.
Tuỳ chọn (bỏ trống thì không hiện):

| Trường | Ý nghĩa |
|---|---|
| `featured` | `true` = vào mục Featured (tối đa 6, theo thứ tự trong file). Không clip nào có cờ thì lấy 6 clip đầu. |
| `collection` | `id` của một collection trong `site.json`. |
| `useCases` | Mảng `id` use case trong `site.json` (`documentary`, `youtube`, `wellness`, `travel`, `presentation`). |
| `fps` | Số khung hình/giây. |
| `loopable` | `true` → hiện "Seamless loop". |
| `price` | Chỉ điền khi là giá thật, dạng chữ, ví dụ `"From $79 on Adobe Stock"`. Bỏ trống thì không hiện giá. |
| `poster` | Ảnh hiển thị trước khi video chạy (mặc định dùng `thumbnail`). |
| `uploadDate` | Ví dụ `"2025-01-31"`, giúp dữ liệu SEO (JSON-LD) đầy đủ hơn. |
| `sample` | `true` = dữ liệu mẫu, hiện nhãn "Sample data". Xoá khi dùng clip thật. |

- Category mới tự thành nút lọc.
- Mỗi trang hiện 12 clip, nút "Show more" tải thêm 12.
- Link mua tự gắn UTM: `utm_source=portfolio&utm_medium=site&utm_campaign=<id clip>`.

## Sửa site.json

| Trường | Ý nghĩa |
|---|---|
| `brandName`, `tagline`, `ownerName` | Tên thương hiệu, dòng giới thiệu ở hero, tên ở footer. |
| `email` | Dùng cho mọi link liên hệ (mailto). |
| `adobeStockProfileUrl` | Link profile, dùng ở CTA cuối trang và footer. |
| `adobeLicenseUrl` | Link điều khoản license của Adobe (dùng trong FAQ). Kiểm tra lại link còn đúng. |
| `social` | Danh sách `{label, url}` hiện ở mục Contact. |
| `stats.items` | Danh sách `{value, label}`, ví dụ `{"value": "120+", "label": "clips on Adobe Stock"}`. **Chỉ điền số thật.** Trống thì ẩn. |
| `stats.showClipCount` | `true` = hiện số clip trong `videos.json`. Chỉ bật khi đã thay hết clip mẫu. |
| `trustedBy` | Danh sách `{name, url?, logo?}` cho khối "As used in". **Chỉ điền khi có xác nhận thật.** Trống thì ẩn. |
| `freeSample` | `enabled`, `title`, `description`, `url`, `resolution`, `thumbnail`. `enabled: false` hoặc `url` trống thì ẩn. |
| `collections` | `{id, name, description, stockUrl}`. `stockUrl` (link bộ sưu tập trên Adobe Stock) có thì hiện nút "View full set on Adobe Stock". |
| `useCases` | `{id, label, description}` cho mục "Perfect for". Use case không có clip nào sẽ tự ẩn. |
| `analytics` | Xem phần dưới. |

Thẻ `<title>`, meta description, Open Graph trong `index.html` là HTML tĩnh (cho SEO), nên sửa trực tiếp trong file.

## Bật analytics (tuỳ chọn)

Mặc định tắt, không tải script nào, không dùng cookie, nên không cần cookie banner.

- GoatCounter: tạo site tại goatcounter.com, rồi đặt `"analytics": {"provider": "goatcounter", "id": "<mã-site>"}`.
- Plausible: `"analytics": {"provider": "plausible", "id": "<tên-miền-của-bạn>"}`.

Sự kiện được ghi: `buy_click` (kèm id clip), `buy_all`, `modal_open`, `favorite_add`, `filter` (category / use case / collection / từ khoá), `free_download`, `sample_request`.
Muốn đếm thêm nút nào, gắn `data-track="tên_sự_kiện"` (và `data-clip="..."` nếu cần) vào thẻ đó.

## Nén file preview (dưới 10MB)

```bash
# Preview 720p, bỏ âm thanh, tối ưu web
ffmpeg -i input_4k.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow \
  -pix_fmt yuv420p -an -movflags +faststart assets/previews/clip-01.mp4

# Thumbnail từ giây thứ 2
ffmpeg -ss 2 -i input_4k.mp4 -frames:v 1 -vf "scale=640:-2" -q:v 4 assets/thumbs/clip-01.jpg

# File mẫu miễn phí 720p, 8 giây
ffmpeg -i input_4k.mp4 -t 8 -vf "scale=1280:-2" -c:v libx264 -crf 26 -an -movflags +faststart assets/free/free-sample-720p.mp4
```

File vẫn lớn: tăng `-crf` (30–32), giảm `scale` (960) hoặc cắt ngắn (`-t 8`). Preview dùng làm video hero nên dưới 5MB.

## Bật GitHub Pages

1. Merge vào `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` tự deploy mỗi lần push vào `main`.

## Checklist việc cần tự điền

- [ ] `site.json`: `email`, `ownerName`, `adobeStockProfileUrl`, `social` (thay mọi `[YOUR_...]`).
- [ ] `videos.json`: thay 6 clip mẫu, `stockUrl` thật cho từng clip, xoá `"sample": true`.
- [ ] `assets/thumbs/`, `assets/previews/`: file thật.
- [ ] `assets/free/free-sample-720p.mp4`: file mẫu thật (hoặc đặt `freeSample.enabled: false`).
- [ ] `assets/bts/step-1..4.svg`: ảnh chụp quy trình thật; sửa chữ 4 bước trong `index.html` cho khớp quy trình của bạn.
- [ ] `site.json → collections`: tên bộ thật, `stockUrl` nếu có.
- [ ] `index.html`: đoạn About (`[YOUR_STORY]`), đường dẫn poster hero (2 chỗ), `<title>`, meta, Open Graph.
- [ ] Domain `YOUR_USERNAME.github.io/nature-footage` trong `index.html`, `robots.txt`, `sitemap.xml`.
- [ ] `assets/og.png`: ảnh chia sẻ thật.
- [ ] Khi có dữ liệu thật: `stats`, `trustedBy`, `price`.
- [ ] (Tuỳ chọn) analytics.
- [ ] Chạy `python3 tools/sync-fallback.py` nếu muốn mở `index.html` trực tiếp từ máy.
