import Image from "next/image";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-800 px-6">
      <div className="w-full max-w-5xl text-center">
        <p className="text-lg md:text-2xl text-gray-100 mb-4">Welkom bij</p>

        <div className="flex items-center justify-center gap-3 md:gap-4">
          <Image
            src="/kunstkwartiertje-logo.png"
            alt="logo"
            width={100}
            height={100}
            className="w-40 h-40 md:w-60 md:h-10 object-contain"
          />
          <h1 className="text-2xl md:text-5xl font-bold tracking-wide text-white">
            KUNSTKWARTIERTJE
          </h1>
        </div>

        <p className="mt-6 text-sm md:text-lg text-gray-300 max-w-md md:max-w-2xl mx-auto">
          Ontdek, bewonder en deel unieke kunstwerken van talentvolle
          kunstenaars.
        </p>

        <a
          href="/register"
          className="mt-8 md:mt-10 inline-block w-full md:w-auto px-6 md:px-10 py-3 md:py-4 bg-black text-white rounded-xl text-sm md:text-lg hover:opacity-90 transition text-center"
        >
          Start hier
        </a>
      </div>
    </section>
  );
}
