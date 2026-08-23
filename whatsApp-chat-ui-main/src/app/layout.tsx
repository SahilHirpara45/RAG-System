import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "RAG Chatbot — Train & Chat with Your Data",
  description:
    "An intelligent AI chatbot powered by Retrieval-Augmented Generation. Train it with PDFs, web URLs, and Q&A pairs, then chat with your data.",
  openGraph: {
    title: "RAG Chatbot — Train & Chat with Your Data",
    description:
      "An intelligent AI chatbot powered by Retrieval-Augmented Generation.",
    siteName: "RAG Chatbot",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(224 71% 8%)",
              color: "hsl(213 31% 91%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
