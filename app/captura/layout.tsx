import type { ReactNode } from "react";

export default function CapturaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-gray-900 antialiased">
      {children}
    </div>
  );
}
