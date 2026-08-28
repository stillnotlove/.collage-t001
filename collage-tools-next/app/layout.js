import "./globals.css";

export const metadata = {
  title: "Collage Tools",
  description: "Interactive collage editor"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
