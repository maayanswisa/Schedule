import "./globals.css";


export const metadata = {
  title: "לוח שיעורים – מורה פרטית",
  description: "שיבוץ שיעורים שבועי",
  metadataBase: new URL("http://localhost:3000"),
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <h1 className="text-xl font-semibold">לוח שיעורים – מורה פרטית</h1>
            <p className="text-sm text-gray-500">שיבוץ שיעור בלחיצה על משבצת פנויה</p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-500">
         
        </footer>
      </body>
    </html>
  );
}
