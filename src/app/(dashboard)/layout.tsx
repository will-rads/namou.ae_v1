import Sidebar from "@/components/Sidebar";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col md:flex-row h-dvh w-dvw bg-gradient-to-br from-mint-white via-mint-bg to-mint-light/20 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-mint-light/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-mint/10 blur-3xl pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <main className="flex-1 flex flex-col px-3 sm:px-4 lg:px-5 pt-2 sm:pt-3 lg:pt-3 pb-1 sm:pb-2 lg:pb-2 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
