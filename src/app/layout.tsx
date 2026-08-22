import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDV Freezer",
  description: "PDV",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="min-h-full flex flex-col" style={{margin:0}}>
        {children}
      </body>
    </html>
  );
}