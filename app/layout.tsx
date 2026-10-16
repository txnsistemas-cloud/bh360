import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BH 360° | Belo Horizonte em Transformação",
  description:
    "Explore o território real de Belo Horizonte com dados oficiais e fontes transparentes.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
