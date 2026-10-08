# Thiết kế: quy tắc đã khóa

Tài liệu này khóa thẩm mỹ trước khi code. Mỗi mục có tiêu chí **đạt / loại**.

## 1. Art direction

**Đã chọn: Product-cinematic.** Không trộn với Editorial-gallery.

- Lý do: sản phẩm là video. Footage cần nền đen để có chiều sâu và cần chiếm trọn màn hình.
- Nhịp nền: xen kẽ `#000` (tối) và `#f5f5f7` (sáng). Footage full-bleed. Mỗi màn một dòng copy chính.
- Moodboard 6 khung: [`moodboard.html`](moodboard.html) → ảnh [`moodboard.png`](moodboard.png). Chọn **A**: hero đen, một dòng chữ căn giữa, footage full-bleed bên dưới, chiếm ≥ 60% màn đầu.

### 5 quy tắc cấm (vi phạm = loại)

1. Không icon minh họa.
2. Không gradient nhiều màu (kể cả lớp phủ gradient lên ảnh).
3. Không shadow đổ.
4. Không hơn 1 accent. Accent `#0071e3` chỉ dùng trên link và pill. Trên nền đen dùng sắc sáng hơn của cùng màu (`#2997ff`) để đạt độ tương phản 4.5:1.
5. Không đoạn văn trên hero. Hero chỉ có headline, một subline, một nút.

## 2. Nội dung

Xem [`copy.md`](copy.md). Headline ≤ 8 từ, subline ≤ 18 từ, CTA 1–2 từ, caption ≤ 6 từ. Phần không cắt được thì bỏ khỏi trang.

## 3. Hệ chữ

Xem [`type.html`](type.html) / [`type.png`](type.png).

| Cấp | Font | Cỡ | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| Display | Archivo semi-condensed (87.5%) | 80px desktop, ≥ 44px mobile | 600 | 1.06 | −0.025em |
| Section | Archivo semi-condensed | 48px desktop, 32px mobile | 600 | 1.08 | −0.02em |
| Body | Inter | 17px | 400 (600 cho tiêu đề nhỏ) | 1.47 | 0 |
| Label / nav | Inter | 12–14px | 400–600 | 1.33 | 0 |

- Body tối đa 560px. Headline dài xuống dòng bằng `<br>` tại chỗ ngắt ý.

## 4. Lưới và nhịp

- Container chữ 1024px. Footage được phá container ra full viewport.
- Baseline 8px: mọi khoảng cách là bội số của 8.
- Section padding: 120px desktop, 64px mobile.
- Lưới 12 cột. Khối nội dung chỉ chiếm 5–7 cột.
- Căn trái mọi thứ, trừ hero và CTA cuối trang (căn giữa).

## 5. Bề mặt

- Nền: `#000000`, `#f5f5f7`, `#ffffff` (chỉ cho tấm nổi: shortlist, chip).
- Chữ: `#f5f5f7` trên tối, `#1d1d1f` trên sáng. Chữ phụ: `#a1a1a6` trên tối, `#6e6e73` trên sáng (đều ≥ 4.5:1).
- Không kẻ viền 1px xám. Phân tách section bằng đổi nền.
- Nav 48px; chỉ có nền `rgba` + blur 20px khi đã cuộn; màu nền nav theo section đang nằm dưới nó.
- Pill: cao 44px (chip 36px), radius 980px, padding ngang 22px (chip 16px).

## 6. Ảnh

- Render trên nền đồng màu với section. Không cắt PNG lên nền lệch màu.
- Footage chiếm ≥ 60% màn đầu. Crop chặt.
- Xuất AVIF/WebP, 2x. Ảnh hero ≤ 300KB.
- Không phủ gradient để đọc chữ. Chữ nằm ngoài ảnh.

## 7. Motion (chỉ 4 kiểu)

1. Fade + translateY 20px, 700ms, ease-out, chạy một lần khi khối vào màn hình.
2. Sticky: khung footage đứng yên khi chữ/spec cuộn qua (hero film, Process).
3. Crossfade (đổi clip, đổi ảnh Process, lọc lưới clip). Không trượt ngang.
4. Nav đổi nền theo section tối/sáng.

Cấm: parallax, con trỏ custom, loader > 400ms, animation lặp. Giảm chuyển động: tắt cả 4.
