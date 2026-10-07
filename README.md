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
assets/previews/    video preview + hero.mp4
assets/free/        file mẫu miễn phí
assets/bts/         ảnh "Behind the scene"
assets/og.png       ảnh chia sẻ mạng xã hội (1200x630)
tools/sync-fallback.py  đồng bộ JSON vào index.html (chỉ cần cho file://)
```

## Luồng chuyển đổi của trang

Hero (video) → Featured (6 clip) → Perfect for (lọc theo mục đích) → Collections → Full collection (lọc, tìm, Show more) → Stats/As used in (chỉ hiện khi có dữ liệu thật) → Free sample → Behind the scene → FAQ → About/Contact → CTA cuối.

Mọi nút mua dùng màu nhấn vàng duy nhất (`--buy` trong `style.css`). Đừng dùng màu này cho thứ khác.

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

File vẫn lớn: tăng `-crf` (30–32), giảm `scale` (960) hoặc cắt ngắn (`-t 8`). `hero.mp4` nên dưới 5MB.

## Bật GitHub Pages

1. Merge vào `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` tự deploy mỗi lần push vào `main`.

## Checklist việc cần tự điền

- [ ] `site.json`: `email`, `ownerName`, `adobeStockProfileUrl`, `social` (thay mọi `[YOUR_...]`).
- [ ] `videos.json`: thay 6 clip mẫu, `stockUrl` thật cho từng clip, xoá `"sample": true`.
- [ ] `assets/thumbs/`, `assets/previews/`, `assets/previews/hero.mp4`: file thật.
- [ ] `assets/free/free-sample-720p.mp4`: file mẫu thật (hoặc đặt `freeSample.enabled: false`).
- [ ] `assets/bts/step-1..4.svg`: ảnh chụp quy trình thật; sửa chữ 4 bước trong `index.html` cho khớp quy trình của bạn.
- [ ] `site.json → collections`: tên bộ thật, `stockUrl` nếu có.
- [ ] `index.html`: đoạn About (`[YOUR_STORY]`), poster hero, `<title>`, meta, Open Graph.
- [ ] Domain `YOUR_USERNAME.github.io/nature-footage` trong `index.html`, `robots.txt`, `sitemap.xml`.
- [ ] `assets/og.png`: ảnh chia sẻ thật.
- [ ] Khi có dữ liệu thật: `stats`, `trustedBy`, `price`.
- [ ] (Tuỳ chọn) analytics.
- [ ] Chạy `python3 tools/sync-fallback.py` nếu muốn mở `index.html` trực tiếp từ máy.
