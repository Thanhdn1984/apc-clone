# DocuGen PMTT - Công Cụ Tự Động Hóa Văn Bản Word

<p align="center">
  <strong>Một ứng dụng desktop mạnh mẽ giúp bạn tự động hóa việc tạo và quản lý tài liệu Word, được xây dựng trên nền tảng Electron và React.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-desktop-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/tech-React%20%7C%20Electron%20%7C%20Tailwind-cyan" alt="Technology">
</p>

---

## 🌟 Tính Năng Nổi Bật

- **Mô Hình Dữ Liệu Động:** Người dùng có thể tự tạo, sửa, xóa các trường dữ liệu (`text`, `number`, `date`, `list`...) và nhóm chúng lại mà không cần thay đổi mã nguồn.
- **Quản Lý Trực Quan:** Giao diện kéo-thả (Drag-and-Drop) cho phép sắp xếp các trường, các nhóm, và cả các trường con bên trong một danh sách một cách dễ dàng.
- **Tạo Tài Liệu Hàng Loạt (Luồng Xuôi):** Điền dữ liệu vào các biểu mẫu và xuất ra hàng loạt file Word dựa trên các mẫu `.docx` đã định nghĩa.
- **Tạo Mẫu Tự Động (Luồng Ngược):** Một thuật toán thông minh có khả năng phân tích một file Word đã điền sẵn và tự động tạo ra một file mẫu (`.docx`) với các thẻ giữ chỗ (`{placeholder}`) tương ứng.
- **Lưu và Tải lại Hồ sơ:** Dễ dàng lưu lại toàn bộ dữ liệu đang nhập dưới dạng một hồ sơ khách hàng và tải lại để sử dụng sau này.

## Giới Thiệu

**DocuGen PMTT** là một giải pháp desktop được thiết kế để giải quyết bài toán tạo và điền tài liệu hàng loạt. Thay vì các thao tác sao chép-dán thủ công, người dùng có thể định nghĩa các mẫu, nhập dữ liệu một lần và xuất ra hàng loạt tài liệu hoàn chỉnh. Ứng dụng còn cung cấp một tính năng độc đáo: **tạo file mẫu tự động** từ một tài liệu đã được điền sẵn, giúp đẩy nhanh quá trình thiết lập ban đầu.

## Hướng Dẫn Sử Dụng Nhanh

### Luồng Xuôi: Tạo Tài Liệu

1.  **Chuẩn bị Mẫu:** Tạo file `.docx` với các thẻ giữ chỗ như `{ten_khach_hang}`.
2.  **Tải Mẫu:** Vào tab `Chọn Mẫu`, tải lên các file đã chuẩn bị.
3.  **Nhập Liệu:** Vào tab `Nhập Dữ Liệu`, điền thông tin vào các trường tương ứng.
4.  **Tạo File:** Vào tab `Tạo File`, chọn mẫu và nhấn **Bắt Đầu**. Chọn thư mục lưu.

### Luồng Ngược: Tạo Mẫu

1.  **Chuẩn bị:** Trong tab `Nhập Dữ Liệu`, điền một vài thông tin trùng khớp với file Word đã có sẵn.
2.  **Cấu hình:** Vào tab `Cấu Hình` > `Tiện ích`:
    -   **Chọn Nguồn:** Chọn file Word đã điền sẵn.
    -   **Chọn Đích:** Chọn thư mục để lưu mẫu mới.
3.  **Thực thi:** Nhấn **Bắt Đầu** để tạo file mẫu mới.

## 🛠️ Cài Đặt & Khởi Chạy

Dự án yêu cầu [Node.js](https://nodejs.org/) (v18+) và [Git](https://git-scm.com/).

1.  **Tải mã nguồn:**
    ```bash
    git clone https://github.com/Thanhdn1984/docxautomator.git
    cd docxautomator
    ```

2.  **Cài đặt các gói phụ thuộc:**
    ```bash
    npm install
    ```

3.  **Khởi chạy ứng dụng (chế độ phát triển):**
    ```bash
    npm start
    ```

4.  **Đóng gói ứng dụng (tạo file thực thi):**
    ```bash
    npm run make
    ```
    File cài đặt sẽ nằm trong thư mục `out`.

---

## 🧬 Kiến Trúc & Phân Tích Kỹ Thuật

### 1. Kiến Trúc Tổng Thể

Ứng dụng được xây dựng theo mô hình của Electron:

-   **Main Process (`electron/main.js`):** Tiến trình chính của Node.js, chịu trách nhiệm quản lý vòng đời ứng dụng, tạo cửa sổ giao diện (BrowserWindow), và xử lý các tác vụ nặng, tương tác trực tiếp với hệ điều hành (như đọc/ghi file, mở hộp thoại) thông qua các hàm được định nghĩa trong `ipcMain`.
-   **Renderer Process (Thư mục `src`):** Giao diện người dùng được xây dựng bằng **React** và render bên trong một cửa sổ trình duyệt của Electron. Toàn bộ logic giao diện, quản lý trạng thái, và tương tác người dùng nằm ở đây.
-   **Preload Script (`electron/preload.js`):** Kịch bản này chạy trong một môi trường có đặc quyền, đóng vai trò là cầu nối an toàn giữa Main Process và Renderer Process. Nó phơi bày các hàm của Main Process (ví dụ: `window.electronAPI.saveFile`) cho phía React một cách có kiểm soát.

### 2. Mô Hình Dữ Liệu & Giao Diện Người Dùng

#### Component-Based UI (React & Tailwind CSS)
Giao diện người dùng được xây dựng hoàn toàn bằng **React**, theo triết lý chia nhỏ các thành phần (components). Điều này giúp mã nguồn dễ quản lý, tái sử dụng và bảo trì. **Tailwind CSS** được sử dụng để tạo kiểu một cách nhanh chóng và nhất quán, mang lại một giao diện hiện đại và sạch sẽ.

#### Mô Hình Dữ Liệu Động (Trái Tim Của Sự Tùy Biến)
-   **Cốt lõi:** Toàn bộ cấu trúc của biểu mẫu nhập liệu được định nghĩa bởi hai mảng trong trạng thái (state) của ứng dụng: `fields` và `fieldGroups`.
-   **`fields`:** Là một mảng "phẳng" chứa tất cả các đối tượng trường. Mỗi đối tượng định nghĩa các thuộc tính như `id` (mã định danh duy nhất), `name` (tên hiển thị), `type` (kiểu dữ liệu), và `group` (mã nhóm mà nó thuộc về).
    -   **Trường Lồng Nhau:** Một trường có `type: 'list'` có thể chứa một mảng `subFields`. Cấu trúc này cho phép tạo ra các biểu mẫu có độ sâu, ví dụ: một danh sách khách hàng, trong đó mỗi khách hàng lại có một tập hợp các trường thông tin riêng.
-   **`fieldGroups`:** Một mảng đơn giản định nghĩa các nhóm để phân loại các trường, giúp giao diện nhập liệu trở nên gọn gàng và có tổ chức.
-   **Sự linh hoạt:** Bằng cách thay đổi nội dung của hai mảng này, ứng dụng có thể hiển thị một biểu mẫu nhập liệu hoàn toàn khác mà không cần thay đổi bất kỳ logic nào trong các component giao diện.

#### Giao Diện Quản Lý Trực Quan
-   **Tab "Quản Lý":** Đây là trung tâm điều khiển cho phép người dùng thao tác trực tiếp với mô hình dữ liệu động.
-   **Kéo-Thả (Drag-and-Drop):** Sử dụng thư viện `@dnd-kit`, người dùng có thể:
    1.  Sắp xếp thứ tự của các nhóm.
    2.  Di chuyển các trường giữa các nhóm khác nhau.
    3.  Sắp xếp thứ tự của các trường trong cùng một nhóm.
    4.  Sắp xếp thứ tự của các **trường con (sub-fields)** bên trong một trường kiểu `list`.
-   **Thao tác CRUD:** Người dùng có thể dễ dàng **Tạo, Xem, Sửa, Xóa** các trường và nhóm thông qua các biểu mẫu modal trực quan.

### 3. Quản Lý Trạng Thái (State Management)

-   Toàn bộ trạng thái quan trọng của ứng dụng (danh sách trường dữ liệu, dữ liệu nhập liệu, danh sách mẫu, cấu hình...) được quản lý tập trung tại component gốc là `App.jsx`.
-   Trạng thái được truyền xuống các component con thông qua cơ chế **props**.
-   Dữ liệu được lưu trữ tự động vào file `default.json` trong thư mục người dùng của ứng dụng. `useEffect` trong `App.jsx` sẽ theo dõi sự thay đổi của các state chính và gọi hàm `window.electronAPI.savePreset` sau một khoảng thời gian chờ (debounce) để tránh ghi file liên tục.

### 4. Thuật Toán Cốt Lõi: Tạo Tài Liệu (Luồng Xuôi)

Luồng này sử dụng thư viện `docxtemplater` và `pizzip`.

**Thuật toán:**
1.  **Tải Template:** File `.docx` được đọc vào dưới dạng `ArrayBuffer`.
2.  **Khởi tạo PizZip:** `new PizZip(buffer)` được sử dụng để giải nén file `.docx` trong bộ nhớ, cho phép truy cập vào cấu trúc XML bên trong (chủ yếu là `word/document.xml`).
3.  **Khởi tạo Docxtemplater:** Một thực thể của `docxtemplater` được tạo và liên kết với đối tượng zip.
4.  **Render Dữ Liệu:** Phương thức `.render(inputData)` được gọi. `docxtemplater` sẽ phân tích cây XML, tìm kiếm các thẻ (`{...}`, `{#...}`) và thay thế chúng bằng dữ liệu tương ứng.
5.  **Tạo File Đầu Ra:** Phương thức `.getZip().generate({ type: 'nodebuffer' })` được gọi để tạo lại file `.docx` dưới dạng một buffer.
6.  **Lưu File:** Buffer này được gửi đến Main Process và được ghi ra đĩa bằng module `fs` của Node.js.

### 5. Thuật Toán Cốt Lõi: Tạo Mẫu Ngược (Luồng Ngược - V40)

Đây là thuật toán phức tạp và mạnh mẽ nhất của dự án, được thiết kế để giải quyết các thách thức lớn khi làm việc với file Word: **sự phân mảnh văn bản (text fragmentation)** và **sự không nhất quán trong định dạng**.

**Vấn đề:**
-   **Phân mảnh:** MS Word thường chia một chuỗi văn bản thành nhiều mảnh XML (`<w:r>`) khác nhau nếu có sự thay đổi định dạng (in đậm, nghiêng) hoặc các lý do khác. Ví dụ, `Ông TIẾN THÀNH` có thể bị chia thành `<w:t>Ông</w:t>`, `<w:t>TIẾN</w:t>`, `<w:t>THÀNH</w:t>`.
-   **Không nhất quán:** Người dùng có thể nhập dữ liệu với số lượng khoảng trắng khác nhau (`TIẾN     THÀNH`) hoặc các định dạng số khác nhau (`1,450,000` vs `1.450.000`).

**Thuật toán V40 giải quyết:**

1.  **Giải nén & Phân tích DOM:**
    -   Sử dụng `pizzip` để giải nén file `.docx`.
    -   Sử dụng `@xmldom/xmldom` để phân tích `word/document.xml` thành một cây DOM, cho phép duyệt và chỉnh sửa cấu trúc tài liệu một cách chi tiết.

2.  **Tổng hợp văn bản:**
    -   Duyệt qua toàn bộ tài liệu để thu thập tất cả các nút chứa văn bản (`<w:t>`) theo đúng thứ tự.
    -   Nối nội dung của các nút này lại để tạo thành một chuỗi văn bản thuần túy (`fullText`) duy nhất cho mỗi đoạn văn hoặc đơn vị logic. Việc này tái tạo lại nội dung mà người dùng nhìn thấy.

3.  **Tạo Regex Linh Hoạt (`buildPatternForValue`):** Đây là "bộ não" của thuật toán.
    -   **Với văn bản** (ví dụ: `"NGUYỄN    TIẾN     THÀNH"`):
        -   Chuẩn hóa Unicode (`normalize('NFC')`).
        -   Phân tách chuỗi thành các từ dựa trên khoảng trắng và dấu câu: `["NGUYỄN", "TIẾN",  "THÀNH"]`.
        -   Nối các từ lại bằng một mẫu regex linh hoạt `[\s\p{P}]*?`. Mẫu này có nghĩa là "0 hoặc nhiều khoảng trắng hoặc dấu câu".
        -   Kết quả: `NGUYỄN[\s\p{P}]*?TIẾN[\s\p{P}]*?THÀNH`.
    -   **Với số** (ví dụ: `"1450000000"`):
        -   Phân tách chuỗi thành từng chữ số.
        -   Nối chúng lại bằng mẫu `[^\d]*?`, có nghĩa là "0 hoặc nhiều ký tự không phải là số".
        -   Kết quả: `1[^\d]*?4[^\d]*?5[^\d]*?0...`, có thể khớp với `1.450.000.000`, `1 450 000 000`, v.v.

4.  **Thay thế theo ngữ cảnh (Context-Aware Replacement):**
    -   **Ưu tiên Trường liên kết (Linked Fields):**
        -   Các trường có mối liên hệ (ví dụ: `kh_danh_xung` và `kh_ho_ten`) được xử lý trước.
        -   Thuật toán tạo ra một mẫu regex lớn để tìm kiếm toàn bộ ngữ cảnh cùng một lúc (ví dụ: `(Ông)[\s\p{P}]*?(NGUYỄN[\s\p{P}]*?THÀNH)`).
        -   Khi tìm thấy, khu vực này được đánh dấu là "vùng ưu tiên" (priority zone).
    -   **Xử lý Trường đơn (Simple Fields):**
        -   Các trường còn lại được tìm kiếm bằng `createFlexibleRegex`.
        -   Một kết quả khớp chỉ được chấp nhận nếu nó **không nằm trong vùng ưu tiên** đã được xác định ở bước trước. Điều này đảm bảo `LÂM TUYẾT` sẽ không bị thay thế riêng lẻ nếu nó là một phần của trường liên kết.

5.  **Chỉnh sửa XML chính xác:**
    -   Khi một kết quả khớp được xác nhận, thuật toán sẽ xác định chính xác các nút `<w:t>` nào đã tạo nên chuỗi đó.
    -   Nó thay thế nội dung của nút `<w:t>` **đầu tiên** bằng thẻ placeholder (ví dụ: `{kh_ho_ten}`).
    -   Nội dung của tất cả các nút `<w:t>` **còn lại** trong vùng khớp sẽ bị **xóa rỗng**.
    -   Quan trọng: Chỉ có nội dung văn bản bị thay đổi. Các thẻ cha (`<w:r>`) và các thẻ định dạng bên trong (`<w:rPr>`) được giữ nguyên, đảm bảo 100% định dạng không bị mất.

6.  **Xây dựng lại & Lưu:** Cây DOM đã sửa đổi được chuyển đổi trở lại thành chuỗi XML, ghi đè lên file `word/document.xml` cũ, và toàn bộ được nén lại thành một file `.docx` mẫu mới.

---
*Phát triển bởi PMTT.*
