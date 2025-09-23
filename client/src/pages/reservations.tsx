import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Reservations from "@/components/reservations";

export default function ReservationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 page-container section-y">
        <Reservations />
      </main>
      <Footer />
    </div>
  );
}