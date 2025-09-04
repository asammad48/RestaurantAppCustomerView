import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import OrderHistory from "@/components/order-history";

export default function OrderHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <OrderHistory />
      </main>
      <Footer />
    </div>
  );
}