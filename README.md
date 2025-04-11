# Twitter Auto Comment Bot

Bot tự động bình luận trên Twitter sử dụng OpenAI để tạo nội dung bình luận thông minh.

## Yêu cầu

- Node.js (phiên bản 22 trở lên)
- Tài khoản Twitter
- API key từ OpenAI hoặc Grok

## Cài đặt
1. Clone repository:
```bash
git clone [repository-url]
cd x-comment
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` và cấu hình từ .env.sample

4. Chạy file thực thi đã build

## Cách sử dụng

1. Chạy bot:
```bash
# Nếu dùng file thực thi
./x-comment

# Nếu build từ source
node index.js
```

2. Bot sẽ:
- Đăng nhập vào Twitter
- Theo dõi tài khoản được chỉ định
- Tự động bình luận vào các tweet mới
- Lưu lại các tweet đã bình luận để tránh bình luận trùng lặp

## Lưu ý
- Bot sử dụng cơ chế retry với exponential backoff để xử lý lỗi
- Cookies được lưu lại để tránh phải đăng nhập lại nhiều lần
- Các tweet đã bình luận được lưu trong file `commented_tweets.txt`
- Mặc định bot sẽ bình luận vào các tweet của tài khoản `QuoteChain_AI`
- Có thể thay đổi model AI bằng cách cấu hình `AI_MODEL` trong file `.env`

## Bảo mật

- Không chia sẻ file `.env` và các thông tin xác thực
- Không commit các file chứa thông tin nhạy cảm
- Sử dụng 2FA cho tài khoản Twitter để tăng bảo mật 