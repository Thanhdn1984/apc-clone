import React from 'react';
import { X, FileText, Settings, FolderOpen, Download, CheckCircle, Star, Sparkles, ListPlus, Calculator } from 'lucide-react';

function Feature({ icon, title, children }) {
  return (
    <div className="flex">
      <div className="flex-shrink-0 mr-4">{icon}</div>
      <div>
        <h4 className="text-lg font-semibold text-banking-navy">{title}</h4>
        <p className="mt-1 text-gray-600">{children}</p>
      </div>
    </div>
  );
}

function WelcomeGuide({ onClose, onStartTour }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-banking-teal p-2 rounded-lg text-white">
              <Sparkles size={24} />
            </div>
            <h2 className="text-xl font-bold text-banking-navy">Chào mừng đến với Trợ lý Tạo Tài liệu</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
            <X size={24} />
          </button>
        </header>

        <main className="overflow-y-auto p-8">
          <p className="text-center text-lg text-gray-700 mb-8">
            Đây là công cụ mạnh mẽ giúp bạn tự động hóa việc tạo hàng loạt tài liệu Word từ các mẫu có sẵn. Hãy khám phá các tính năng chính để bắt đầu.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Feature icon={<CheckCircle className="text-green-500" size={24} />} title="Tạo Form Nhập Liệu Động">
              Tổ chức thông tin một cách khoa học bằng cách tạo các <strong>Nhóm</strong> (ví dụ: Thông tin khách hàng) và các <strong>Trường</strong> dữ liệu tùy chỉnh.
            </Feature>

            <Feature icon={<Star className="text-amber-500" size={24} />} title="Lưu & Tải Lại Cấu Hình">
              Lưu toàn bộ cấu trúc Form của bạn ra file JSON và tái sử dụng cho các lần làm việc sau, tiết kiệm tối đa thời gian thiết lập.
            </Feature>
            
            <Feature icon={<ListPlus className="text-sky-500" size={24} />} title="Trường Dữ Liệu Dạng 'Danh Sách'">
              Tính năng nâng cao cho phép tạo các danh sách đối tượng phức tạp (vd: danh sách người thừa kế, tài sản), mỗi mục có các trường thông tin riêng.
            </Feature>

            <Feature icon={<Calculator className="text-rose-500" size={24} />} title="Công Thức Thông Minh 'docso'">
              Tự động chuyển đổi giá trị của một trường số thành chữ. Trong một trường văn bản, nhập trực tiếp <code>docso(id_của_trường_số)</code> để sử dụng.
            </Feature>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
             <h3 className="text-xl font-bold text-banking-navy mb-4 text-center">Luồng Làm Việc Cơ Bản</h3>
            <ol className="relative border-l border-gray-300 space-y-6 ml-4">
              <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">
                  <Settings className="w-4 h-4 text-blue-600" />
                </span>
                <h4 className="font-semibold">1. Thiết lập Form</h4>
                <p className="text-sm text-gray-600">Vào "Quản lý Trường & Nhóm" để tạo các trường và nhóm dữ liệu bạn cần.</p>
              </li>
              <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                </span>
                <h4 className="font-semibold">2. Chọn mẫu Word (.docx)</h4>
                <p className="text-sm text-gray-600">Tải lên file mẫu chứa các thẻ định danh như <code>{'{{id_truong}}'}</code>.</p>
              </li>
              <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">
                  <FileText className="w-4 h-4 text-blue-600" />
                </span>
                <h4 className="font-semibold">3. Nhập Dữ Liệu</h4>
                <p className="text-sm text-gray-600">Điền thông tin vào form nhập liệu bạn vừa thiết lập.</p>
              </li>
              <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">
                  <Download className="w-4 h-4 text-blue-600" />
                </span>
                <h4 className="font-semibold">4. Tạo và Xuất File</h4>
                <p className="text-sm text-gray-600">Hệ thống sẽ tự động điền dữ liệu vào mẫu và tạo ra các file Word hoàn chỉnh.</p>
              </li>
            </ol>
          </div>
        </main>
        
        <footer className="px-6 py-4 bg-gray-50 border-t rounded-b-xl flex justify-end">
            <button onClick={onStartTour} className="bg-banking-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200">
              Bắt đầu Hướng dẫn nhanh
            </button>
        </footer>
      </div>
    </div>
  );
}

export default WelcomeGuide;
