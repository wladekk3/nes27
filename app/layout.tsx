import {LanguageProvider} from './language';
import type { Metadata } from "next";
import "./globals.css";
import "./release.css";
import "./scorched.css";
import "./expansion.css";
import "./upgrade-v2.css";
import "./leaderboard.css";

export const metadata: Metadata = {
  title: "NE S27 // АРХИВ ЗОНЫ",
  description:
    "Сезонный портал, исторический архив и коллекция карточек сообщества NE S27.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
