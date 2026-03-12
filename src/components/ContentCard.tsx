export default function ContentCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-mint-light/30 p-4 md:p-6 ${className}`}>
      {children}
    </div>
  );
}
