# Wild Frames — một cú bay, thời tiết đổi theo cuộn

Website tĩnh (HTML/CSS/JS thuần, không framework, không bước build) cho stock video thiên nhiên 4K render bằng Unreal Engine 5, bán qua Adobe Stock.

Địa chỉ: https://mai-dang-khoa.github.io/nature-footage/

> **Chưa xong:** toàn bộ hình ảnh, video và link hiện là **PLACEHOLDER** (có ghi nhãn trên ảnh). Xem mục "Việc cần tự làm".

## Trang hoạt động thế nào

Cả trang là **một cú máy bay không cắt**. Cuộn chuột là thanh thời gian (progress `p` từ 0 đến 1):

- **Đường bay:** sát đất (lá, mưa) → đường mòn → tán rừng → sông → núi → trên mây → trời sao. Khung hình đứng yên (`position: sticky`), cuộn sẽ tua qua chuỗi ảnh vẽ trên canvas.
- **Chữ** đứng trong cảnh, mỗi câu chỉ hiện trong một khoảng `p` rồi trôi ra:

  | p | Chữ |
  |---|---|
  | 0–0.12 | Nature, rendered. |
  | 0.18–0.28 | Heavy rain. No people. |
  | 0.40–0.50 | Seamless loop. First frame matches the last. |
  | 0.62–0.72 | 4K, rendered in Unreal Engine 5. |
  | 0.88–1 | Find the shot. License it. |

- **Thời tiết** đổi trên cùng đường bay: đêm mưa (0–0.30) → một nhịp chớp (0.30–0.42, chỉ một lần mỗi lượt cuộn qua, dưới 120ms) → mưa tạnh có hơi (0.42–0.62) → giờ vàng (0.62–0.84) → sao (0.84–1).
- **Clip tách ra:** khi `p` tới `weatherAt` của một clip (±0.03), một khung 16:9 nổi ra giữa màn hình, preview tự chạy (tắt tiếng). Trong khung: tên cảnh, dòng thông số (`4K · seamless loop · no people`), nút **License on Adobe Stock** (mở tab mới). Clip có bản free thêm nút viền **Download 720p** (tải thẳng, không form).
- **Bằng chứng dùng được:** góc phải dưới hiện timeline giả kiểu phần mềm dựng phim: preview nằm 2 lần liền nhau trên track V1, đầu đọc chạy theo video, đánh dấu chỗ nối loop. Không logo.
- **Cuối trang** (`p > 0.9`): giữ clip cuối, nút mua to nhất màn hình. Không kết bằng footer.
- **Máy tính có chuột:** lớp sương nghiêng tối đa 12px về phía chuột, tự về chỗ cũ sau 0.6s chuột đứng yên. Bấm giữ chuột trên cảnh = bay tiếp nhẹ nhàng; thả là dừng.
- **Điện thoại** (dưới 800px hoặc màn cảm ứng): đường bay ngắn hơn (300vh), vẫn đổi thời tiết, không có gió. Clip xếp dọc bên dưới, mỗi clip một nút mua.
- **Giảm chuyển động** (cài đặt hệ điều hành): không tua, không chớp, không gió. Hiện 4 ảnh tĩnh cùng góc máy (mưa, sau mưa, giờ vàng, sao), mỗi ảnh kèm clip và nút mua của nó.
- **Âm thanh:** mặc định tắt. Chỉ khi có file âm thanh thì nút loa mới hiện (sau 2 giây). Gần đất là mưa trên lá, lên cao là gió, chuyển dần theo `p`. Không nhạc.

Không có: pop-up, đếm ngược, "còn 1 suất", số liệu bán hàng, đánh giá, logo khách. Không nút nào trỏ `#` hay `mailto:` rỗng.

## Cấu trúc

```
index.html    khung trang (logo + nút loa, sân khấu, các dòng chữ)
style.css     giao diện
data.js       TOÀN BỘ nội dung: link, email, clip, đường dẫn ảnh — chỉ cần sửa file này
flight.js     logic: cuộn → khung hình, thời tiết, chữ, clip, gió, âm thanh
assets/flight/desktop/   chuỗi khung đường bay 1280×720 (PLACEHOLDER)
assets/flight/mobile/    chuỗi khung dọc 720×1080 cho điện thoại (PLACEHOLDER)
assets/flight/weather/   4 ảnh thời tiết cùng góc máy (PLACEHOLDER)
assets/previews/         preview từng clip (PLACEHOLDER)
assets/posters/          ảnh đầu của từng preview
assets/free/             file free 720p (PLACEHOLDER)
tools/make-flight-placeholders.py   tạo lại toàn bộ placeholder
docs/screenshots/        ảnh chụp trang
```

## Sửa nội dung (`data.js`)

Giá trị rỗng hoặc còn chứa `[YOUR_` được coi là **chưa có**:
- Clip chưa có `stockUrl` thật → nút hiện **Listing soon** và không bấm được.
- Chưa có `email` → ẩn link Email ("Need a custom scene?").
- Chưa có `audio` → ẩn nút loa.

Mỗi clip:

```js
{ id: "rain-on-leaves", title: "Rain on forest leaves", use: "sleep loop",
  weatherAt: 0.15,          // vị trí trên đường bay (0–1) mà clip tách ra
  weather: "rain",          // rain | after | golden | stars — ảnh tĩnh nào chứa clip này (chế độ giảm chuyển động)
  resolution: "4K", loop: true, people: false,   // tạo dòng "4K · seamless loop · no people" — chỉ điền đúng sự thật
  free: false,              // true = thêm nút "Download 720p" (file ở site.freeFile)
  placeholder: true,        // XOÁ khi đã có clip thật (bỏ nhãn "Placeholder")
  preview: "assets/previews/rain-on-leaves.mp4", poster: "assets/posters/rain-on-leaves.webp",
  stockUrl: "https://stock.adobe.com/video/..." }
```

- `final: true` = clip giữ lại ở cuối trang với nút mua lớn nhất. Chỉ một clip.
- Đặt `weatherAt` cách nhau ≥ 0.06 và tránh các khoảng chữ ở bảng trên, để khung clip không đè chữ.
- Link mua tự gắn UTM: `utm_source=portfolio&utm_medium=site&utm_campaign=<id clip>`.

## Thay placeholder bằng tài sản thật

1. **Chuỗi khung đường bay:** một cú máy liên tục trong Sequencer (cùng tiêu cự, cùng hướng), đi qua ít nhất 8 mốc: đất, lá, đường mòn, tán, sông, núi, mây, trời. Render bằng Movie Render Queue (PNG sequence), rồi:

   ```bash
   # desktop 1280×720, ~72–120 khung
   ffmpeg -framerate 30 -i shot.%04d.png -vf "scale=1280:-2" -c:v libwebp -quality 62 -start_number 1 assets/flight/desktop/f_%04d.webp
   # điện thoại: khung dọc 720×1080 cắt giữa
   ffmpeg -framerate 30 -i shot.%04d.png -vf "crop=ih*2/3:ih,scale=720:1080" -c:v libwebp -quality 60 -start_number 1 assets/flight/mobile/f_%04d.webp
   ```

   Sửa `frames` trong `data.js` cho đúng số file. Ngân sách: desktop ≤ 8MB, mobile ≤ 4MB.
   Khung nên có ánh sáng **trung tính** (trời đục, ban ngày): trang tự phủ màu đêm mưa / sau mưa / giờ vàng / sao lên trên.
2. **4 ảnh thời tiết** cùng một góc máy (đoạn giữa đường bay): đêm mưa, mưa tạnh có hơi, giờ vàng, sao → `assets/flight/weather/rain.webp`, `after.webp`, `golden.webp`, `stars.webp` (1280×720, WebP).
3. **Preview clip:** 5–8 giây, tắt tiếng, H.264, 16:9, tối đa 2MB:

   ```bash
   ffmpeg -i clip_4k.mp4 -t 6 -vf "scale=960:-2,fps=24" -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -an -movflags +faststart assets/previews/rain-on-leaves.mp4
   ffmpeg -i assets/previews/rain-on-leaves.mp4 -frames:v 1 -c:v libwebp -quality 75 assets/posters/rain-on-leaves.webp
   ```

4. **File free 720p:** `assets/free/free-sample-720p.mp4`.
5. **Âm thanh (tuỳ chọn):** hai file lặp (mưa trên lá, gió) → `data.js → site.audio.ground` và `site.audio.high`.

Muốn tạo lại bộ placeholder: `python3 tools/make-flight-placeholders.py` (cần Pillow và ffmpeg).

## Hiệu năng và kiểm tra

- Khung đường bay không tải hết lúc đầu: khung đầu tải ngay, sau đó chỉ tải đoạn kế tiếp (khoảng 18% đường bay quanh vị trí đang xem), tối đa 6 yêu cầu cùng lúc.
- Preview chỉ tải khi clip sắp tới (±0.08). Mưa và gió chỉ chạy khi đường bay đang hiện và tab đang mở.
- Lighthouse mobile: Performance 87–99 (dao động theo lần đo), Accessibility / Best Practices / SEO 100, LCP khoảng 2 giây. Desktop: 100 ở cả 4 mục. Không lỗi tương phản.
- Đã kiểm tra: chớp chỉ 1 lần mỗi lượt cuộn qua; gió về chỗ cũ khi chuột đứng; bấm giữ thì bay tiếp, thả là dừng; không link `#`; file free tải được; với link thật, nút mua mở đúng trang Adobe Stock có UTM ở cả máy tính, điện thoại và chế độ giảm chuyển động.

## Analytics (tuỳ chọn)

Mặc định tắt. Bật trong `data.js → site.analytics`: `{ provider: "goatcounter", id: "<mã-site>" }` hoặc `{ provider: "plausible", id: "<tên-miền>" }`.
Sự kiện: `buy_click`, `free_download`, `clip_view` (clip tách ra trên màn hình).

## Bật GitHub Pages

1. Merge vào `main`.
2. **Settings → Pages → Source: GitHub Actions** (đã bật).
3. Workflow `.github/workflows/deploy.yml` tự deploy mỗi lần push vào `main`.

## Việc cần tự làm

- [ ] Chuỗi khung đường bay thật (desktop + mobile).
- [ ] 4 ảnh thời tiết thật cùng góc máy.
- [ ] 6–12 preview thật + poster; sửa tên, `use`, `weatherAt` trong `data.js`; xoá `placeholder: true`.
- [ ] Link Adobe Stock thật cho từng clip (`stockUrl`) và `adobeStockProfileUrl`.
- [ ] File free 720p thật.
- [ ] Email thật (nếu nhận làm cảnh riêng).
- [ ] (Tuỳ chọn) âm thanh, analytics.
- [ ] Kiểm tra lại câu chữ: chỉ ghi "seamless loop", "no people", "4K" khi đúng với clip đó.
