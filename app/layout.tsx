import "./globals.css";


export const metadata = {
  title: "לוח שיעורים – מורה פרטית",
  description: "שיבוץ שיעורים שבועי",
  metadataBase: new URL("http://localhost:3000"),
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {children}
      </body>
    </html>
  );
}
