import "./globals.css";

export const metadata = {
  title: "Zoom Clone",
  description: "A video conferencing web app inspired by Zoom",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
