import Card from "@/components/Card";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import RankPage from "@/components/LiveRank";
import UsernameInput from "@/components/UsernameInput";

export default function HomePage() {
  return (
    <div className="w-full flex flex-col items-center">
      <Hero />

      {/* Head-to-Head Arena */}
      <section className="w-full mt-2 mb-10">
        <Card />
      </section>

      {/* Enter Username Form */}
      <section className="w-full mb-12">
        <UsernameInput />
      </section>

      {/* Live Ranking Stream */}
      <section className="w-full mb-8">
        <RankPage />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
