import "./globals.css";
export const metadata = { title: "CDC Support Desk", description: "CrepDog Crew support dashboard" };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
