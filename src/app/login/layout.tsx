import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Devatar",
  description: "Secure admin access",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Login page has its own minimal layout without sidebar
  return <>{children}</>;
}
