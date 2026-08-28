import "./globals.css";

export const metadata = {
  title: "Collage Tool",
  description: "Parametric collage and poster editor"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
