<p align="center">
  <h1 align="center">🧖‍♀️ FIXY – SPA TẠI NHÀ</h1>
  <p align="center"><strong>Nền tảng kết nối Kỹ thuật viên Spa & Khách hàng</strong></p>
</p>

---

> **Tài liệu mô tả dự án & Đặc tả yêu cầu chức năng**
>
> | | |
> |---|---|
> | 📌 **Phiên bản** | `1.0` |
> | 📅 **Ngày** | Tháng 23/07/2026 |
> | 🛠️ **Công nghệ** | `.NET Core 8` · `Next.js 14` |

---

## 📋 Mục lục

1. [Mô tả dự án](#1--mô-tả-dự-án)
2. [Mô hình hoạt động](#2--mô-hình-hoạt-động)
3. [Client 1 – Kỹ thuật viên (KTV)](#3--đặc-tả-yêu-cầu-chức-năng--client-1-kỹ-thuật-viên)
4. [Client 2 – Khách hàng](#4--đặc-tả-yêu-cầu-chức-năng--client-2-khách-hàng)
5. [Admin Panel](#5--đặc-tả-yêu-cầu-chức-năng--admin-panel)
6. [Yêu cầu phi chức năng](#6--yêu-cầu-phi-chức-năng)
7. [Kiến trúc hệ thống](#7--kiến-trúc-hệ-thống)
8. [Lộ trình phát triển](#8--lộ-trình-phát-triển-mvp)
9. [So sánh với mô hình Vua Thợ](#9--so-sánh-với-mô-hình-vua-thợ)

---

## 1. 📖 Mô tả dự án

### 1.1. Tổng quan

**FIXY** là nền tảng trung gian *(marketplace)* kết nối **Kỹ thuật viên Spa (KTV)** với **khách hàng** có nhu cầu sử dụng dịch vụ spa, massage, làm đẹp và chăm sóc sức khỏe tại nhà.

Hệ thống hoạt động theo mô hình **ba bên**:

```
🏢 Nền tảng (Fixy)  ←→  👩‍🔧 Kỹ thuật viên  ←→  👤 Khách hàng
```

Dự án được xây dựng với mục tiêu **số hóa và chuẩn hóa** thị trường dịch vụ spa tại nhà tại Việt Nam, giải quyết bài toán thiếu minh bạch về giá cả, chất lượng và độ tin cậy trong lĩnh vực chăm sóc sức khỏe & làm đẹp.

### 1.2. Mục tiêu dự án

| #   | Mục tiêu                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| 🎯   | Tạo ra một hệ sinh thái số giúp **KTV spa tự do** dễ dàng tiếp cận khách hàng và tăng thu nhập                   |
| 🎯   | Cung cấp cho khách hàng một kênh đặt dịch vụ spa tại nhà **nhanh chóng, minh bạch và an toàn**                   |
| 🎯   | Nền tảng Fixy đóng vai trò trung gian, đảm bảo **chất lượng dịch vụ**, xử lý thanh toán và giải quyết tranh chấp |
| 🎯   | Xây dựng hệ sinh thái **đánh giá, xếp hạng KTV** nhằm nâng cao chất lượng dịch vụ liên tục                       |

> ✅ **Cam kết Fixy:** Không mất tiền tip · Không phí di chuyển · Không cung cấp dịch vụ nhạy cảm

### 1.3. Phạm vi hệ thống

Hệ thống bao gồm **3 thành phần chính**:

|         Thành phần          |                        Đối tượng                         | Mô tả                                                                                       |
| :-------------------------: | :------------------------------------------------------: | ------------------------------------------------------------------------------------------- |
|    📱 **Client 1 – KTV**     |      KTV massage, nails, skincare, wax, trị liệu...      | Ứng dụng cho phép KTV đăng ký hồ sơ, quản lý dịch vụ, nhận booking và theo dõi thu nhập     |
| 📱 **Client 2 – Khách hàng** | Người dùng cuối có nhu cầu spa, massage, làm đẹp tại nhà | Ứng dụng cho phép khách hàng đăng ký, tìm kiếm và đặt KTV phù hợp theo vị trí, dịch vụ      |
|      💻 **Admin Panel**      |                    Quản trị viên Fixy                    | Giao diện quản trị nội bộ: duyệt KTV, quản lý danh mục dịch vụ, theo dõi giao dịch, báo cáo |

### 1.4. Nhóm dịch vụ hỗ trợ

#### 🩺 1.4.1. Sức khỏe tại nhà
> *Lấy ráy tai, massage & trị liệu*

| #   | Dịch vụ                | Ghi chú           |
| --- | ---------------------- | ----------------- |
| 1   | Massage dầu            | Oil Massage       |
| 2   | Massage Thái           | Thai Massage      |
| 3   | Massage đá nóng        | Hot Stone Massage |
| 4   | Lấy ráy tai            | —                 |
| 5   | Giác hơi               | —                 |
| 6   | Giác hơi lửa           | —                 |
| 7   | Trị liệu cổ vai gáy    | —                 |
| 8   | Bấm huyệt              | —                 |
| 9   | Massage chân           | Foot Massage      |
| 10  | Massage body toàn thân | —                 |

#### 💅 1.4.2. Làm đẹp tại nhà
> *Nails, wax, tẩy tế bào chết*

| #   | Dịch vụ                   | Ghi chú                       |
| --- | ------------------------- | ----------------------------- |
| 1   | Nails                     | Sơn gel, đắp bột, vẽ nail art |
| 2   | Wax lông                  | Tay, chân, nách, bikini       |
| 3   | Tẩy tế bào chết toàn thân | —                             |
| 4   | Chăm sóc da mặt           | Facial                        |
| 5   | Combo cạo mặt             | —                             |
| 6   | Masa mặt                  | Face Massage                  |
| 7   | Nối mi, uốn mi            | —                             |
| 8   | Phun xăm thẩm mỹ          | Chân mày, môi                 |

#### 🏪 1.4.3. Dịch vụ tại cửa hàng / spa
> *Ưu đãi giờ thấp điểm*

- Trải nghiệm dịch vụ trực tiếp tại cửa hàng spa đối tác
- Ưu đãi giờ thấp điểm tại spa
- Và các dịch vụ spa mở rộng khác *(mở rộng qua Admin)*

### 1.5. Công nghệ sử dụng

|     Tầng      |             Công nghệ              | Mục đích                                       |
| :-----------: | :--------------------------------: | ---------------------------------------------- |
| 🖥️ Backend API |  `.NET Core 8` (ASP.NET Web API)   | REST API, xử lý nghiệp vụ, bảo mật, thanh toán |
|  🌐 Frontend   |     `Next.js 14` (App Router)      | SSR/SSG, tối ưu SEO, giao diện người dùng      |
|  🗄️ Database   |    `PostgreSQL` / `SQL Server`     | Lưu trữ dữ liệu chính của hệ thống             |
|    ⚡ Cache    |              `Redis`               | Session, cache dữ liệu tìm kiếm, rate limiting |
|  🔄 Real-time  |             `SignalR`              | Chat, thông báo trạng thái booking real-time   |
|    🗺️ Maps     |    `Google Maps API` / `Mapbox`    | Tìm KTV theo vị trí địa lý, hiển thị bản đồ    |
|   📦 Storage   |      `AWS S3` / `Azure Blob`       | Lưu ảnh profile, ảnh chứng chỉ, hóa đơn        |
|   💳 Payment   |    `VNPay` / `MoMo` / `Stripe`     | Thanh toán đơn dịch vụ, nạp/rút ví             |
|    🔐 Auth     | `JWT` + `OAuth2` (Google/Facebook) | Xác thực và phân quyền người dùng              |

---

## 2. 🔄 Mô hình hoạt động

### 2.1. Quy trình tổng quát

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QUY TRÌNH ĐẶT DỊCH VỤ                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ① KTV đăng ký → ② Admin duyệt → ③ Khách tìm KTV                  │
│        ↓                                                            │
│  ④ Khách đặt lịch → ⑤ KTV xác nhận → ⑥ Thanh toán                  │
│        ↓                                                            │
│  ⑦ KTV thực hiện dịch vụ → ⑧ Khách đánh giá → ⑨ Giải ngân         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Bước  | Mô tả                                                                             |
| :---: | --------------------------------------------------------------------------------- |
|   ①   | KTV đăng ký tài khoản, điền thông tin hồ sơ, chứng chỉ nghề và chờ duyệt từ Admin |
|   ②   | Admin xem xét, xác minh và phê duyệt hồ sơ KTV *(hoặc từ chối kèm lý do)*         |
|   ③   | Khách hàng đăng ký tài khoản và tìm kiếm KTV theo dịch vụ, vị trí, đánh giá       |
|   ④   | Khách hàng chọn dịch vụ, chọn KTV *(hoặc để hệ thống ghép)* và đặt lịch           |
|   ⑤   | KTV nhận thông báo, xác nhận hoặc từ chối đơn hàng                                |
|   ⑥   | Khách hàng thanh toán *(tiền mặt hoặc online tùy cấu hình)*                       |
|   ⑦   | KTV di chuyển đến nhà khách, thực hiện dịch vụ và cập nhật trạng thái hoàn thành  |
|   ⑧   | Khách hàng xác nhận hoàn thành và để lại đánh giá, sao                            |
|   ⑨   | Nền tảng giải ngân cho KTV sau khi trừ phí hoa hồng                               |

### 2.2. Mô hình kinh doanh

|       💰 Nguồn thu        | Mô tả                                                                           |
| :----------------------: | ------------------------------------------------------------------------------- |
|  **Hoa hồng giao dịch**  | Fixy thu phí `%` trên mỗi đơn hàng hoàn thành thành công                        |
|   **Gói KTV nổi bật**    | KTV trả phí để hiển thị ưu tiên trong kết quả tìm kiếm *(badge "Chất lượng")*   |
| **Gói xác minh KTV Pro** | Tăng độ tin cậy với huy hiệu xác minh cao cấp                                   |
| **Doanh thu quảng cáo**  | Các spa đối tác, thương hiệu mỹ phẩm quảng cáo trên nền tảng                    |
|     **Hợp tác spa**      | Kết nối khách hàng đến spa đối tác với ưu đãi giờ thấp điểm, thu phí giới thiệu |

---

## 3. 👩‍🔧 Đặc tả yêu cầu chức năng – Client 1 (Kỹ thuật viên)

> *Ứng dụng dành riêng cho KTV – những người cung cấp dịch vụ spa trên nền tảng Fixy.*

### 3.1. 🔐 Đăng ký & Xác thực

#### 3.1.1. Đăng ký tài khoản KTV

- KTV đăng ký bằng **số điện thoại** hoặc **email**
- Xác thực **OTP** qua SMS hoặc email
- Đăng ký nhanh bằng tài khoản **Google / Facebook** (OAuth2)
- Nhập thông tin cơ bản: họ tên, ngày sinh, giới tính, địa chỉ thường trú

#### 3.1.2. Hoàn thiện hồ sơ KTV

- Chọn **nhóm dịch vụ chính** và **dịch vụ phụ** *(đa chọn từ danh mục hệ thống)*
- Nhập mô tả bản thân, kinh nghiệm làm việc *(số năm, mô tả tự do)*

  > 💡 *Ví dụ: "Kinh nghiệm 5 năm làm việc, các bài massage dầu, thái, đá nóng, Giác hơi, combo cạo mặt, masa mặt, lấy Ráy tai, Giác hơi lửa, tẩy tế bào chết toàn thân"*

- Hỗ trợ mô tả **đa ngôn ngữ** *(Tiếng Việt, Tiếng Hàn, Tiếng Anh...)* để phục vụ khách quốc tế
- Upload **ảnh đại diện** và ảnh profile chuyên nghiệp *(tối đa 7 ảnh, JPG/PNG, ≤ 5MB/ảnh)*
- Upload ảnh **CCCD/CMND** mặt trước và mặt sau
- Upload **chứng chỉ nghề spa**, bằng cấp liên quan *(chứng chỉ massage, chăm sóc da, nails...)*
- Upload ảnh **portfolio** *(ảnh khách hàng trước/sau, tối đa 20 ảnh)*
- Khai báo **khu vực hoạt động** *(quận/huyện, tỉnh/thành phố)*. Ví dụ: Đà Nẵng, TP.HCM, Hà Nội
- Khai báo **phạm vi di chuyển tối đa** (km)
- Thiết lập **danh sách dịch vụ** cung cấp kèm giá và thời gian thực hiện

  > 💡 *Ví dụ: "Massage Dầu – 60 phút – 500.000đ"*

#### 3.1.3. Trạng thái hồ sơ

|         Trạng thái          |      Badge       | Mô tả                                                           |
| :-------------------------: | :--------------: | --------------------------------------------------------------- |
|         ⏳ Chờ duyệt         |        —         | Sau khi nộp hồ sơ lần đầu                                       |
| ✅ Đã duyệt / Đang hoạt động |  `🟢 Chất lượng`  | Admin phê duyệt. Có thể đạt badge "Chất lượng" khi đủ điều kiện |
|        ❌ Bị từ chối         |        —         | Admin từ chối kèm lý do, KTV được phép chỉnh sửa và nộp lại     |
|         🔒 Tạm khóa          |        —         | Admin tạm khóa tài khoản do vi phạm                             |
|         🆕 Mới duyệt         |   `🟠 Mới đến`    | Hiển thị khi vừa được duyệt                                     |
|         🔄 Cập nhật          | `🟡 Mới cập nhật` | Hiển thị khi KTV vừa cập nhật hồ sơ/dịch vụ mới                 |

### 3.2. 💆 Quản lý Dịch vụ

#### 3.2.1. Danh sách dịch vụ cá nhân

- KTV tự thiết lập danh sách **"Dịch vụ của tôi"** từ danh mục hệ thống
- Mỗi dịch vụ gồm: **tên dịch vụ**, mô tả chi tiết, **thời gian thực hiện** (phút), **giá tiền** (VNĐ)
- Bật/tắt từng dịch vụ mà không cần xóa
- Có thể tạo **combo dịch vụ** với giá ưu đãi

  > 💡 *Ví dụ: "Combo Massage + Giác hơi – 90 phút – 700.000đ"*

#### 3.2.2. Quản lý giá dịch vụ

- Thiết lập giá theo từng dịch vụ
- Giá hiển thị trên hồ sơ KTV cho khách hàng xem trước khi đặt
- Admin có thể thiết lập **giá sàn/giá trần** cho từng loại dịch vụ

### 3.3. 📋 Quản lý Đơn hàng (Booking)

#### 3.3.1. Nhận thông báo đơn mới

- 🔔 **Push notification** khi có yêu cầu mới từ khách hàng phù hợp khu vực và dịch vụ
- 📱 Thông báo trong ứng dụng **(in-app)** và qua **SMS**
- Hiển thị chi tiết: loại dịch vụ, địa chỉ, thời gian hẹn, ghi chú của khách, ảnh đính kèm *(nếu có)*

#### 3.3.2. Xác nhận / Từ chối đơn

- KTV xem chi tiết đơn và **chấp nhận** hoặc **từ chối** *(kèm lý do)*
- ⏱️ Thời gian phản hồi tối đa: cấu hình bởi Admin *(mặc định 15 phút)*
- Nếu KTV từ chối hoặc không phản hồi → hệ thống **tự động chuyển đơn** cho KTV khác
- KTV có thể **đề xuất thời gian hoặc giá khác** trước khi xác nhận

#### 3.3.3. Quản lý lịch làm việc

- 📅 Lịch công việc theo **ngày/tuần/tháng**
- Hiển thị **"Sớm nhất HH:mm"** – khung giờ sớm nhất KTV có thể nhận đơn *(Ví dụ: "Sớm nhất 12:00")*
- Cài đặt giờ làm việc *(thứ, giờ bắt đầu – kết thúc)*
- Chế độ **bận / sẵn sàng** *(toggle nhanh)*
- Chặn ngày nghỉ, lễ, tết

#### 3.3.4. Cập nhật trạng thái đơn

```
🚗 Đang di chuyển đến  →  📍 Đã đến nơi  →  💆 Đang thực hiện  →  ✅ Hoàn thành
                                                                    ⚠️ Gặp sự cố
```

|      Trạng thái      | Mô tả                                                                                  |
| :------------------: | -------------------------------------------------------------------------------------- |
| 🚗 Đang di chuyển đến | KTV bấm khi xuất phát                                                                  |
|     📍 Đã đến nơi     | KTV bấm khi tới địa điểm khách                                                         |
|   💆 Đang thực hiện   | Cập nhật khi bắt đầu thực hiện dịch vụ                                                 |
|     ✅ Hoàn thành     | KTV xác nhận hoàn thành, gửi ảnh nghiệm thu *(tùy chọn)*                               |
|     ⚠️ Gặp sự cố      | Báo cáo vấn đề phát sinh *(khách không có mặt, địa chỉ sai, yêu cầu ngoài phạm vi...)* |

### 3.4. 💬 Chat & Liên lạc

- 💬 Chat trực tiếp với khách hàng trong đơn hàng *(text, ảnh, voice message)*
- 📞 Gọi điện qua **số ẩn danh** *(số trung gian – tránh lộ thông tin cá nhân)*
- 📂 Lịch sử trò chuyện lưu trữ theo đơn hàng

### 3.5. 💰 Ví & Thanh toán

- 💳 **Ví KTV**: xem số dư hiện tại, lịch sử giao dịch
- 🏦 Rút tiền về **tài khoản ngân hàng** / ví điện tử *(MoMo, ZaloPay)*
- 📊 Xem chi tiết hoa hồng đã bị trừ trên từng đơn
- 📈 Báo cáo doanh thu theo **ngày/tuần/tháng**
- 📄 Xuất sao kê giao dịch *(PDF/Excel)*

### 3.6. ⭐ Đánh giá & Uy tín

- Xem **điểm đánh giá trung bình** và lịch sử nhận xét từ khách hàng
- Hiển thị chi tiết **phân bổ sao**: phần trăm mỗi mức *(5⭐: 98%, 4⭐: 0%, ... 1⭐: 2%)*
- **Phản hồi** lại đánh giá của khách *(1 lần/đánh giá)*
- Hệ thống **badge uy tín**:

|      Badge       | Điều kiện                                                      |
| :--------------: | -------------------------------------------------------------- |
|   🟠 `Mới đến`    | KTV vừa được duyệt, chưa có nhiều đơn                          |
| 🟡 `Mới cập nhật` | KTV vừa cập nhật hồ sơ/dịch vụ                                 |
|  🟢 `Chất lượng`  | KTV có điểm đánh giá cao, nhiều đơn hoàn thành, tỷ lệ hủy thấp |
|   🥇 `KTV Vàng`   | Top KTV trên nền tảng dựa trên điểm tích lũy và đánh giá       |

### 3.7. 🔔 Thông báo & Cài đặt

- Quản lý thông báo: bật/tắt từng loại *(đơn mới, thanh toán, khuyến mãi...)*
- Đổi mật khẩu, xác minh **2 bước (2FA)**
- Xóa tài khoản *(soft delete, giữ lịch sử giao dịch)*

---

## 4. 👤 Đặc tả yêu cầu chức năng – Client 2 (Khách hàng)

> *Ứng dụng dành cho khách hàng – những người có nhu cầu sử dụng dịch vụ spa, massage, làm đẹp tại nhà.*

### 4.1. 🔐 Đăng ký & Xác thực

- Đăng ký bằng **số điện thoại** hoặc **email** + xác thực OTP
- Đăng nhập nhanh bằng **Google / Facebook**
- Đổi mật khẩu, kích hoạt **xác thực 2 bước**
- Chọn **thành phố/khu vực** hiện tại *(ví dụ: Đà Nẵng, TP.HCM)*

#### 4.1.1. Thông tin tài khoản

Màn hình **"Thông tin tài khoản"** cho phép khách xem và chỉnh sửa hồ sơ cá nhân:

```
┌─────────────────────────────────────────────────┐
│            📋 THÔNG TIN TÀI KHOẢN                │
├─────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────┐                        │
│              │  📷 Ảnh  │                        │
│              │ đại diện │                        │
│              └──────────┘                        │
│                                                  │
│  Họ và tên              Tấn Đại                  │
│  Số điện thoại          09xxxxxxxx               │
│  Email                  email@gmail.com          │
│  Giới tính              Nam                      │
│  Quốc tịch              Việt Nam                 │
│                                                  │
│  🔴 Xoá tài khoản                                │
└─────────────────────────────────────────────────┘
```

|       Trường        | Mô tả                                        |
| :-----------------: | -------------------------------------------- |
| 📷 **Ảnh đại diện**  | Upload/thay đổi ảnh đại diện *(icon camera)* |
|   👤 **Họ và tên**   | Họ tên đầy đủ                                |
| 📱 **Số điện thoại** | Số điện thoại đăng ký                        |
|     📧 **Email**     | Địa chỉ email                                |
|   ⚧️ **Giới tính**   | Nam / Nữ / Khác                              |
|   🌍 **Quốc tịch**   | Quốc tịch. Ví dụ: *Việt Nam*                 |
| 🔴 **Xoá tài khoản** | Soft delete, giữ lại lịch sử giao dịch       |

### 4.2. 🏠 Trang chủ – Khám phá

#### 4.2.1. Giao diện trang chủ

- Hiển thị **khu vực hiện tại** của khách hàng tại header *(ví dụ: "Đà Nẵng")*
- Danh sách nhóm dịch vụ dạng **banner card lớn**:

| Banner |       Tiêu đề        | Mô tả ngắn                                     |
| :----: | :------------------: | ---------------------------------------------- |
|   🩺    | **Sức khoẻ tại nhà** | Lấy ráy tai, massage & trị liệu                |
|   💅    | **Làm đẹp tại nhà**  | Nails, wax, tẩy tế bào chết                    |
|   🏪    |   **Địa điểm spa**   | Ưu đãi giờ thấp điểm, trải nghiệm tại cửa hàng |

- Mỗi banner card có **hình ảnh minh họa**, tiêu đề, mô tả ngắn và nút điều hướng `→`
- 🆘 Nút **hỗ trợ khách hàng** *(floating button)* luôn hiển thị

#### 4.2.2. Thanh điều hướng (Bottom Navigation)

| Icon  |      Tab      | Chức năng                                  |
| :---: | :-----------: | ------------------------------------------ |
|   🔍   | **Khám phá**  | Trang chủ, duyệt dịch vụ và KTV            |
|   📋   | **Hoạt động** | Danh sách đơn hàng đang diễn ra và lịch sử |
|   🎟️   |  **Voucher**  | Danh sách mã giảm giá khả dụng             |
|   👤   | **Tài khoản** | Hồ sơ cá nhân, cài đặt, hỗ trợ             |

### 4.3. 🔍 Tìm kiếm & Khám phá KTV

#### 4.3.1. Tìm KTV

- Tìm kiếm theo **loại dịch vụ** *(danh mục dịch vụ spa)*
- Tìm kiếm theo **từ khóa tự do** *(Ví dụ: "Tìm kiếm kỹ thuật viên...")*
- **Bộ lọc:**

|       Lọc        | Mô tả                          |
| :--------------: | ------------------------------ |
|   📍 `Gần tôi`    | Theo vị trí, khu vực, bán kính |
|  🔥 `Đặt nhiều`   | Sắp xếp theo số lượng đơn      |
| 📂 `Loại dịch vụ` | Lọc theo danh mục dịch vụ      |

- **Sắp xếp theo:** gần nhất · đánh giá cao nhất · đặt nhiều nhất · giá thấp nhất

#### 4.3.2. Hiển thị KTV

Danh sách KTV dạng **card ngang** *(horizontal card)*:

```
┌─────────────────────────────────────────────────┐
│ ┌──────┐                                        │
│ │ 📷   │  Kim Hằng            Sớm nhất 12:00   │
│ │ Ảnh  │  ⭐ 4.9 (135 đánh giá)                 │
│ │ KTV  │  📍 100m                                │
│ │🟢Chất│                          [ Đặt ]       │
│ │lượng │                                        │
│ └──────┘                                        │
└─────────────────────────────────────────────────┘
```

|   Thông tin    | Mô tả                                                           |
| :------------: | --------------------------------------------------------------- |
| 📷 Ảnh đại diện | Hiển thị bên trái card                                          |
|    🏷️ Badge     | `🟢 Chất lượng` · `🟠 Mới đến` · `🟡 Mới cập nhật`                 |
|   ⭐ Đánh giá   | Điểm sao trung bình + số lượng. Ví dụ: *"⭐ 4.9 (135 đánh giá)"* |
| 📍 Khoảng cách  | Từ khách. Ví dụ: *"100m"*, *"1 km"*                             |
|  🕐 Khung giờ   | Sớm nhất có thể phục vụ. Ví dụ: *"Sớm nhất 12:00"*              |
|   🟩 Nút Đặt    | Đặt lịch nhanh                                                  |

#### 4.3.3. Trang hồ sơ KTV (chi tiết)

- 🖼️ **Gallery ảnh** *(swipe, hiển thị số thứ tự: "1/7")*
- 🏅 **Badge uy tín**: "Chất lượng", cam kết của nền tảng
- ✅ **Cam kết Fixy** hiển thị nổi bật:
  - ✅ Không mất tiền tip, không phí di chuyển
  - ✅ Không cung cấp nhạy cảm
- 📋 Thông tin cơ bản: tên, khoảng cách, điểm sao, số đánh giá
- 📝 Mô tả bản thân và kinh nghiệm *(hỗ trợ đa ngôn ngữ, nút "Hiển thị thêm")*
- 💆 Danh sách **"Dịch vụ của tôi"**: tên dịch vụ, thời gian, giá tiền
- ⭐ **Đánh giá từ khách hàng**: phân bổ sao *(biểu đồ ngang)*, danh sách review chi tiết
- ❤️ Nút **"Yêu thích"** và 🔗 **"Chia sẻ"** hồ sơ

### 4.4. 📝 Đặt dịch vụ (Booking)

#### 4.4.1. Chọn dịch vụ

- Từ hồ sơ KTV, chọn **một hoặc nhiều dịch vụ** muốn đặt
- Mỗi dịch vụ hiển thị: tên, thời gian (phút), giá (VNĐ)

  > 💡 *Ví dụ: "Massage Dầu – ⏱ 60 phút | 500.000 đ"*

- Có thể bỏ chọn dịch vụ *(nút ✕)*

#### 4.4.2. Thông tin đặt lịch

```
┌─────────────────────────────────────────────────┐
│          📋 THÔNG TIN ĐẶT LỊCH                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  📍 Địa chỉ của tôi                              │
│     Cris · 0123456789                            │
│     302, Đường Trần Hưng Đạo, Đà Nẵng           │
│                                                  │
│  💆 Massage Dầu                                   │
│     ⏱ 60 phút | 500.000 đ               ✕      │
│     👩 Kim Hằng  ⭐ 4.9 (135 đánh giá)           │
│                                                  │
│  💳 Phương thức thanh toán                        │
│     💵 Tiền mặt                    Xem tất cả >  │
│                                                  │
│  🎟️ Mã giảm giá                                   │
│     WELCOME                     Chọn voucher >   │
│                                                  │
│  ─────────────────────────────────────────────   │
│  Tạm tính                          500.000 đ     │
│  Giảm giá                          -50.000 đ     │
│  ─────────────────────────────────────────────   │
│  Tổng: 1 dịch vụ                   450.000 đ     │
│  🎉 Bạn đã tiết kiệm được 50.000 đ              │
│                                                  │
│            ┌───────────────────┐                 │
│            │     ĐẶT NGAY      │                 │
│            └───────────────────┘                 │
└─────────────────────────────────────────────────┘
```

|             Mục              | Mô tả                                                                               |
| :--------------------------: | ----------------------------------------------------------------------------------- |
|    📍 **Địa chỉ của tôi**     | Chọn hoặc nhập địa chỉ thực hiện dịch vụ *(tên, SĐT, địa chỉ chi tiết)*. Hỗ trợ GPS |
|    💆 **Dịch vụ đã chọn**     | Tóm tắt dịch vụ + KTV + giá                                                         |
| 💳 **Phương thức thanh toán** | Chọn 1 trong các phương thức *(xem bảng bên dưới)*                                  |
|      🎟️ **Mã giảm giá**       | Nhập mã voucher hoặc chọn từ danh sách. Ví dụ: `WELCOME` giảm 50.000đ               |
|  📊 **Chi tiết thanh toán**   | Tạm tính → Giảm giá → **Tổng thanh toán** + "Bạn đã tiết kiệm được X đ"             |
|       🕐 **Thời gian**        | Ngay bây giờ hoặc hẹn lịch *(ngày/giờ cụ thể)*                                      |

**💳 Phương thức thanh toán** *(radio select – chọn 1)*:

```
┌─────────────────────────────────────────────────┐
│            💳 PHƯƠNG THỨC THANH TOÁN              │
├─────────────────────────────────────────────────┤
│                                                  │
│  💵 Tiền mặt                              🟢     │
│  ─────────────────────────────────────────────   │
│  💳 Thẻ Visa/MasterCard/JCB               ○      │
│  ─────────────────────────────────────────────   │
│  🏦 Chuyển khoản                           ○      │
│  ─────────────────────────────────────────────   │
│  🏧 Thanh toán qua thẻ ATM                ○      │
│                                                  │
└─────────────────────────────────────────────────┘
```

|   #   |          Phương thức          | Mô tả                                                                |
| :---: | :---------------------------: | -------------------------------------------------------------------- |
|   1   |        💵 **Tiền mặt**         | Thanh toán trực tiếp cho KTV sau khi hoàn thành dịch vụ *(mặc định)* |
|   2   | 💳 **Thẻ Visa/MasterCard/JCB** | Thanh toán qua thẻ quốc tế                                           |
|   3   |      🏦 **Chuyển khoản**       | Chuyển khoản ngân hàng                                               |
|   4   | 🏧 **Thanh toán qua thẻ ATM**  | Thanh toán qua thẻ ATM nội địa                                       |

#### 4.4.3. Theo dõi đơn hàng

```
⏳ Chờ KTV xác nhận  →  🚗 KTV đang đến  →  💆 Đang thực hiện  →  ✅ Hoàn thành
```

- Xem trạng thái **real-time**
- 🗺️ Theo dõi **vị trí KTV trên bản đồ** *(sau khi KTV xác nhận di chuyển)*
- ❌ Hủy đơn *(trong thời gian cho phép, có chính sách hoàn tiền rõ ràng)*

### 4.5. 📜 Lịch sử & Đánh giá

- Tab **"Hoạt động"**: Danh sách tất cả đơn hàng – đang diễn ra, đã hoàn thành, đã hủy
- Xem chi tiết từng đơn: thông tin KTV, dịch vụ, chi phí, ảnh nghiệm thu
- 🔄 **Đặt lại dịch vụ** *(re-order)* với KTV cũ
- ⭐ **Đánh giá KTV**: điểm sao (1-5) + nhận xét văn bản + ảnh tùy chọn
- 🌐 Hỗ trợ **dịch đánh giá** sang ngôn ngữ khác *(nút "Dịch" – hỗ trợ khách quốc tế)*
- Hiển thị "Đang hiển thị bản gốc" / "Dịch" cho review đa ngôn ngữ
- 🚨 **Báo cáo vấn đề** / khiếu nại *(kết nối với bộ phận hỗ trợ Admin)*

### 4.6. 🎟️ Voucher & Khuyến mãi

- Tab **"Voucher"**: Danh sách voucher khả dụng
- Mỗi voucher hiển thị: mã, mô tả, điều kiện áp dụng, hạn sử dụng
- Áp dụng voucher khi đặt lịch
- Nhận voucher từ khuyến mãi, sự kiện hoặc chương trình **giới thiệu bạn bè**

### 4.7. 💰 Ví & Giao dịch

- 💳 **Ví Fixy**: nạp tiền, xem số dư, lịch sử giao dịch
- 💸 Hoàn tiền vào ví khi hủy đơn đủ điều kiện
- 🧾 Xuất **hóa đơn điện tử** cho từng đơn hàng

### 4.8. 🔔 Thông báo

- 🔔 Thông báo khi KTV xác nhận đơn, cập nhật trạng thái, hoàn thành
- ⏰ Nhắc nhở lịch hẹn đã đặt trước *(trước 1 giờ)*
- 🎁 Thông báo khuyến mãi, voucher mới
- 📲 **Push notification** + **in-app** + **SMS**

### 4.9. ❤️ Yêu thích & Chia sẻ

- ❤️ Danh sách KTV yêu thích
- 🔗 Chia sẻ hồ sơ KTV qua link / mạng xã hội
- 💬 Nút chat hỗ trợ *(Messenger-style)* trên trang chủ

### 4.10. 👤 Tab Tài khoản

Màn hình **"Tài khoản"** là trung tâm quản lý cá nhân của khách hàng:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  ┌────┐  Tấn Đại                                │
│  │ 📷 │                                          │
│  └────┘                                          │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │  Đăng ký trở thành hội viên       VIP  │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌──────────────┐  ┌──────────────────┐          │
│  │ Trở thành    │  │ Giới thiệu       │          │
│  │ Đối tác Fixy │  │ bạn bè  🎁       │          │
│  └──────────────┘  └──────────────────┘          │
│                                                  │
│  📋 Lịch sử hoạt động                    >      │
│  👤 Thông tin cá nhân                     >      │
│  🌐 Ngôn ngữ                  Tiếng Việt  >      │
│  🌍 Quốc gia                  🇻🇳 Vietnam  >      │
│  ℹ️  Về chúng tôi                          >      │
│  🚪 Đăng xuất                              >      │
│                                                  │
├─────────────────────────────────────────────────┤
│  🔍        📋        🎟️        👤               │
│ Khám phá  Hoạt động  Voucher  Tài khoản         │
└─────────────────────────────────────────────────┘
```

#### 4.10.1. Các mục chính

|   #   |            Mục             | Mô tả                                                                                                                      |
| :---: | :------------------------: | -------------------------------------------------------------------------------------------------------------------------- |
|   👑   |  **Đăng ký hội viên VIP**  | Banner CTA nổi bật – Đăng ký trở thành hội viên VIP với quyền lợi ưu đãi đặc biệt *(giảm giá, ưu tiên đặt, voucher riêng)* |
|   🤝   | **Trở thành Đối tác Fixy** | Card điều hướng – Khách hàng đăng ký trở thành KTV/đối tác trên nền tảng                                                   |
|   🎁   |   **Giới thiệu bạn bè**    | Card điều hướng – Chương trình referral, nhận voucher/ưu đãi khi giới thiệu người mới                                      |
|   📋   |   **Lịch sử hoạt động**    | Xem lại toàn bộ đơn hàng đã đặt                                                                                            |
|   👤   |   **Thông tin cá nhân**    | Xem/chỉnh sửa hồ sơ *(họ tên, SĐT, email, giới tính, quốc tịch)*                                                           |
|   🌐   |        **Ngôn ngữ**        | Chuyển đổi ngôn ngữ ứng dụng: `Tiếng Việt` · `English` · `한국어`                                                          |
|   🌍   |        **Quốc gia**        | Chọn quốc gia/khu vực: `🇻🇳 Vietnam` · `🇰🇷 Korea` · ...                                                                       |
|   ℹ️   |      **Về chúng tôi**      | Giới thiệu Fixy, điều khoản sử dụng, chính sách bảo mật                                                                    |
|   🚪   |       **Đăng xuất**        | Đăng xuất tài khoản                                                                                                        |

#### 4.10.2. Chương trình VIP

> 👑 Khách hàng có thể đăng ký **hội viên VIP** để nhận quyền lợi:

- 💎 Giảm giá đặc biệt trên mỗi lần đặt dịch vụ
- ⚡ Ưu tiên xếp lịch với KTV chất lượng cao
- 🎟️ Voucher riêng cho hội viên VIP
- 🏅 Badge VIP hiển thị trên hồ sơ

#### 4.10.3. Chương trình Giới thiệu bạn bè (Referral)

- Mỗi khách hàng có **mã giới thiệu riêng**
- Khi bạn bè đăng ký và hoàn thành đơn đầu tiên → **cả hai đều nhận voucher**
- Theo dõi số lượng bạn bè đã giới thiệu thành công

#### 4.10.4. Trở thành Đối tác Fixy

- Khách hàng có thể đăng ký **trở thành KTV/đối tác** trực tiếp từ app
- Điều hướng đến flow đăng ký KTV *(Client 1 – mục 3.1)*
- Giúp mở rộng nguồn cung KTV từ chính cộng đồng người dùng

---

## 5. 🛡️ Đặc tả yêu cầu chức năng – Admin Panel

> *Giao diện quản trị nội bộ của Fixy, truy cập qua web browser (Next.js).*

### 5.1. 👩‍🔧 Quản lý KTV

- Danh sách KTV đăng ký, lọc theo trạng thái: `chờ duyệt` · `đã duyệt` · `bị khóa`
- Xem hồ sơ KTV đầy đủ: thông tin, CCCD, chứng chỉ spa, portfolio ảnh
- ✅ Phê duyệt hoặc ❌ từ chối hồ sơ KTV *(kèm lý do từ chối)*
- 🔒 Khóa / 🔓 mở khóa tài khoản KTV
- 🏅 Chỉnh sửa cấp độ badge thủ công *("Chất lượng", "KTV Vàng")*
- 💰 Quản lý giá sàn/giá trần cho từng dịch vụ

### 5.2. 👤 Quản lý Khách hàng

- Danh sách tài khoản khách hàng, tìm kiếm theo tên, SĐT, email
- Xem lịch sử đơn hàng của khách
- 🔒 Khóa / 🔓 mở khóa tài khoản

### 5.3. 📋 Quản lý Đơn hàng (Booking)

- Xem toàn bộ đơn hàng hệ thống, lọc theo trạng thái, ngày, khu vực, loại dịch vụ
- ⚖️ Can thiệp đơn hàng đang xảy ra tranh chấp
- 💸 Hoàn tiền thủ công cho khách khi cần

### 5.4. 📂 Quản lý Danh mục Dịch vụ

- Thêm, sửa, xóa danh mục dịch vụ *(nhóm cha/con)*

  > 💡 *Ví dụ: "Sức khỏe tại nhà" > "Massage dầu"*

- Upload icon/ảnh minh họa cho danh mục
- Sắp xếp thứ tự hiển thị
- Quản lý giá tham khảo theo từng dịch vụ

### 5.5. 💰 Quản lý Tài chính

- 📊 Theo dõi tổng doanh thu nền tảng, hoa hồng thu được
- 🏦 Xem yêu cầu rút tiền của KTV và duyệt giải ngân
- 📈 Báo cáo tài chính theo **ngày/tuần/tháng** *(biểu đồ + bảng số liệu)*

### 5.6. 🎟️ Quản lý Khuyến mãi

- Tạo, sửa, xóa mã voucher: giảm `%`, giảm tiền cố định

  > 💡 *Ví dụ: "WELCOME" giảm 50.000đ*

- Thiết lập điều kiện: thời hạn, số lần dùng, loại dịch vụ áp dụng, giá trị đơn tối thiểu
- 📊 Theo dõi lượt sử dụng voucher

### 5.7. 🏪 Quản lý Spa đối tác

- Danh sách spa đối tác đăng ký hiển thị trên nền tảng
- Quản lý **ưu đãi giờ thấp điểm** của từng spa
- 📊 Theo dõi lượt giới thiệu khách đến spa

### 5.8. 🆘 Hỗ trợ & Khiếu nại

- 📩 Danh sách **ticket hỗ trợ** từ KTV và khách hàng
- 💬 Chat nội bộ giữa Admin và người dùng để giải quyết vấn đề
- 🏷️ Đóng/mở ticket, phân loại và gắn nhãn ưu tiên

### 5.9. 📊 Thống kê & Báo cáo

- 📊 **Dashboard**: tổng KTV, tổng khách, tổng đơn, doanh thu hôm nay
- 📈 **Biểu đồ xu hướng**: đơn hàng theo thời gian, dịch vụ phổ biến nhất, khu vực sôi động
- 🏆 **Thống kê KTV**: top KTV theo doanh thu, đánh giá, số đơn
- 📄 Xuất báo cáo **CSV / Excel / PDF**

---

## 6. ⚙️ Yêu cầu phi chức năng

|       Nhóm        |     Chỉ tiêu      | Mô tả                                                            |
| :---------------: | :---------------: | ---------------------------------------------------------------- |
|  ⚡ **Hiệu năng**  | Response time API | ≤ `300ms` cho 95% request trong điều kiện bình thường            |
|                   | Concurrent users  | Hỗ trợ ≥ `5.000` người dùng đồng thời                            |
|   🔐 **Bảo mật**   |     Xác thực      | JWT + Refresh Token, hỗ trợ 2FA bằng TOTP/OTP SMS                |
|                   |  Mã hóa dữ liệu   | HTTPS/TLS 1.3, mã hóa thông tin nhạy cảm trong DB (AES-256)      |
|                   |       OWASP       | Tuân thủ OWASP Top 10, chống SQL Injection, XSS, CSRF            |
|                   | Bảo vệ thông tin  | SĐT của KTV và khách được ẩn danh qua số trung gian khi liên lạc |
|  🟢 **Khả dụng**   |      Uptime       | SLA ≥ `99.5%` / tháng                                            |
|                   |      Backup       | Sao lưu dữ liệu mỗi `6 giờ`, lưu trữ `30 ngày`                   |
|   📐 **Mở rộng**   |     Kiến trúc     | Microservices-ready, horizontal scaling, stateless API           |
|  ⚖️ **Tuân thủ**   |      Pháp lý      | Tuân thủ Luật An ninh mạng Việt Nam, PDPA dữ liệu cá nhân        |
| 🌐 **Đa ngôn ngữ** |       i18n        | Hỗ trợ Tiếng Việt *(mặc định)*, Tiếng Anh, Tiếng Hàn             |

---

## 7. 🏗️ Kiến trúc hệ thống

### 7.1. Sơ đồ thành phần

```
┌──────────────────────────────────────────────────────────────────┐
│                        🌐 FRONTEND LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Next.js App  │  │  Next.js App  │  │  Next.js App  │          │
│  │  Client 1     │  │  Client 2     │  │  Admin Panel  │          │
│  │  (KTV)        │  │  (Khách hàng) │  │               │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └────────────┬────┴────────────────┘                    │
│                      ▼                                           │
│  ┌──────────────────────────────────────────┐                    │
│  │     🔀 API Gateway (NGINX / Kong)         │                    │
│  │     Routing · Rate Limiting · Load Balance│                    │
│  └──────────────────┬───────────────────────┘                    │
│                      ▼                                           │
├──────────────────────────────────────────────────────────────────┤
│                    🖥️ BACKEND SERVICES (.NET Core)                │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ 🔐 Auth    │ │ 👤 User    │ │ 📋 Booking │ │ 💳 Payment │    │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │ 🔔 Notif.  │ │ ⭐ Review  │ │ 💬 Chat    │ │ 📂 Catalog │    │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                       🗄️ DATA LAYER                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ 🐘 PostgreSQL │  │ ⚡ Redis      │  │ 📦 AWS S3    │           │
│  │ Primary DB    │  │ Cache/Session │  │ File Storage │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                    🔌 EXTERNAL INTEGRATIONS                      │
│                                                                  │
│  Google Maps · VNPay/MoMo · Twilio SMS · Firebase FCM            │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2. Nguyên tắc thiết kế API

|    Nguyên tắc    | Mô tả                                                               |
| :--------------: | ------------------------------------------------------------------- |
|    🔗 RESTful     | API với versioning `/api/v1/...`                                    |
| 📦 Response chuẩn | `{ success, data, message, errors, pagination }`                    |
| 📚 Documentation  | Swagger / OpenAPI cho toàn bộ endpoints                             |
| 🛡️ Rate Limiting  | Theo user/IP để chống abuse                                         |
|    📝 Logging     | Ghi log đầy đủ *(request, response, error)* qua Serilog / ELK Stack |

---

## 8. 🗓️ Lộ trình phát triển (MVP)

|   Giai đoạn   |  Thời gian  | Nội dung                                                                                                    |
| :-----------: | :---------: | ----------------------------------------------------------------------------------------------------------- |
| 🔵 **Phase 1** | Tháng 1 – 2 | Thiết lập kiến trúc, Auth Service, User Service, DB schema, CI/CD pipeline cơ bản                           |
| 🟢 **Phase 2** | Tháng 3 – 4 | **Client 1**: đăng ký KTV, hồ sơ, danh sách dịch vụ, admin duyệt. **Client 2**: đăng ký khách, tìm kiếm KTV |
| 🟡 **Phase 3** | Tháng 5 – 6 | Booking Service hoàn chỉnh, Payment Service, thông báo real-time, chat                                      |
| 🟠 **Phase 4** | Tháng 7 – 8 | Review & Rating, Ví KTV, báo cáo Admin, voucher, tối ưu hiệu năng, hỗ trợ đa ngôn ngữ                       |
| 🔴 **Phase 5** |   Tháng 9   | UAT, kiểm thử bảo mật (Pentest), soft launch beta, thu thập phản hồi                                        |
| 🚀 **Launch**  |  Tháng 10   | Chính thức ra mắt, marketing, onboard KTV đầu tiên theo khu vực thí điểm *(Đà Nẵng, TP.HCM)*                |

---

## 9. 🔄 So sánh với mô hình Vua Thợ

|       Hạng mục       |                 🔧 Vua Thợ                  |              🧖 Fixy – Spa Tại Nhà              |
| :------------------: | :----------------------------------------: | :--------------------------------------------: |
|  **Đối tượng KTV**   |      Thợ điện, nước, xe, điều hòa...       |      KTV massage, nails, skincare, wax...      |
|     **Dịch vụ**      |             Sửa chữa, bảo trì              |    Spa, massage, làm đẹp, chăm sóc sức khỏe    |
|   **Mô hình giá**    |        Giá dịch vụ cơ bản theo nghề        |      Giá theo dịch vụ + thời gian (phút)       |
|    **Portfolio**     |           Ảnh công trình đã sửa            |      Ảnh trước/sau, gallery chuyên nghiệp      |
|  **Badge hệ thống**  | Thợ Mới → Thợ Tốt → Thợ Xuất Sắc → Thợ Vua | Mới đến → Mới cập nhật → Chất lượng → KTV Vàng |
| **Cam kết nền tảng** |          Minh bạch giá, bảo hành           | Không tip, không phí di chuyển, không nhạy cảm |
|     **Mở rộng**      |                 Thêm nghề                  |         Thêm dịch vụ spa + Spa đối tác         |
|   **Đa ngôn ngữ**    |                  ❌ Không                   |            ✅ Có *(Việt, Anh, Hàn)*             |

---

> 📝 **Ghi chú**
>
> Tài liệu này là **phiên bản 1.0** và sẽ được cập nhật liên tục trong quá trình phát triển. Mọi thay đổi về yêu cầu chức năng cần được phê duyệt bởi **Product Owner** và cập nhật vào tài liệu với số phiên bản mới.

---

<p align="center">
  <em>© 2026 Fixy – Spa Tại Nhà. All rights reserved.</em>
</p>
