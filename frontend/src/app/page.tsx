import { Navbar } from "@/widgets/navbar/Navbar";
import { Footer } from "@/widgets/footer/Footer";
import { LandingPage } from "@/views/landing/LandingPage";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <LandingPage />
      <Footer />
    </>
  );
}
