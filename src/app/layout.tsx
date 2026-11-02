import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValueIR · PSA 10 IR/SIR buy signals",
  description: "Daily buy recommendations for Pokémon Illustration Rare and Special Illustration Rare PSA 10s.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
