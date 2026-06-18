import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import OrderHistory from "@/components/order-history";

export default function OrderHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 page-container section-y">
        <OrderHistory />
      </main>
      <Footer />
    </div>
  );
}