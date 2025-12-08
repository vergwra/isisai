import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientLayout } from "./clientLayout";
import ProtectedRoute from "@/components/protected-route";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LogiPredict - Previsão de Custos Logísticos",
  description: "Sistema de predição de custos logísticos baseado em IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ProtectedRoute>
              <ClientLayout>
                {children}
              </ClientLayout>
            </ProtectedRoute>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Componente cliente separado para lógica condicional da sidebar
