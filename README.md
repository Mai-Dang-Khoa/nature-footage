# Wild Frames — Website giới thiệu video thiên nhiên 4K (UE5)

Website tĩnh (HTML/CSS/JS thuần, không cần build) để khách xem trước clip và chuyển sang trang bán stock.

## Chạy thử trên máy

- Mở thẳng `index.html` (dùng bản dữ liệu dự phòng nhúng trong HTML), **hoặc**
- Chạy server tĩnh để giống thực tế: `python3 -m http.server 8000` rồi mở http://localhost:8000

> Khi chạy bằng server/GitHub Pages, trang đọc `videos.json`. Bản dự phòng trong `index.html` (thẻ `#videos-fallback`) chỉ dùng khi mở bằng `file://`. Hãy cập nhật cả hai nếu bạn muốn xem đúng dữ liệu mới khi mở file trực tiếp.

## Cấu trúc

```
index.html  style.css  script.js  videos.json
assets/thumbs/     ảnh thumbnail (SVG/JPG/WebP)
assets/previews/   video preview (MP4) + hero.mp4
assets/og.png      ảnh chia sẻ mạng xã hội (1200x630)
```

## Thêm clip mới

1. Đặt thumbnail vào `assets/thumbs/` (khuyến nghị 640x360, JPG/WebP dưới 100KB).
2. Đặt preview vào `assets/previews/`.
3. Thêm một mục vào `videos.json`:

```json
{
  "id": "misty-forest-01",
  "title": "Misty Forest at Dawn",
  "category": "Forest",
  "tags": ["forest", "mist", "dawn"],
  "resolution": "4K",
  "duration": "0:15",
  "thumbnail": "assets/thumbs/misty-forest-01.jpg",
  "preview": "assets/previews/misty-forest-01.mp4",
  "stockUrl": "https://stock.adobe.com/..."
}
```

- `category` mới sẽ tự thành nút lọc.
- `duration` dạng `m:ss`.
- Tuỳ chọn: thêm `"uploadDate": "2025-01-31"` để JSON-LD đầy đủ hơn.

## Nén file preview (dưới 10MB)

```bash
# Preview 720p, bỏ âm thanh, tối ưu web
ffmpeg -i input_4k.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow \
  -pix_fmt yuv420p -an -movflags +faststart assets/previews/clip-01.mp4

# Tạo thumbnail từ giây thứ 2
ffmpeg -ss 2 -i input_4k.mp4 -frames:v 1 -vf "scale=640:-2" -q:v 4 assets/thumbs/clip-01.jpg
```

Nếu file vẫn lớn: tăng `-crf` (30–32), giảm `scale` (960) hoặc cắt ngắn clip (`-t 8`).
Video nền hero: đặt tại `assets/previews/hero.mp4` (nên dưới 5MB).

## Bật GitHub Pages

1. Push code lên GitHub, merge vào `main`.
2. Vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` tự deploy mỗi lần push vào `main`.
4. Site có tại `https://<username>.github.io/<repo>/`.

## Những chỗ cần tự sửa

- Link Adobe Stock: `stockUrl` trong `videos.json` và link `YOUR_ID` trong `index.html` (Contact, Footer).
- Email: `you@example.com` trong `index.html` (mục Contact).
- Link Shutterstock/nền tảng khác: mục Contact.
- Tên thương hiệu "Wild Frames", "Your Name" ở footer, nội dung About.
- Domain `YOUR_USERNAME.github.io/nature-footage` trong: `index.html` (canonical, og:url, og:image), `robots.txt`, `sitemap.xml`.
- Thay `assets/og.png` bằng ảnh đẹp hơn nếu muốn.
- Thay 6 clip mẫu (`sample-*`) và các file placeholder trong `assets/`.
