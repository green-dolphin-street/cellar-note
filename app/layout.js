import "./globals.css";

export const metadata = {
  title: "Cellar Note AI",
  description: "사진 한 장으로 완성하는 나만의 와인 기록"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
