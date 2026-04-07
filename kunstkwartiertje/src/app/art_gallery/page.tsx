import Image from "next/image";

export default function Home() {
  return (
    // Witte achtergrond rondom
    <div className="flex min-h-screen items-center justify-center p-4 bg-white">
      
      {/* Content */}
      <div className="flex flex-col items-center justify-start max-w-6xl w-full px-6 py-6">
        
        {/* Logo bovenin */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-2">
          <Image
            src="/logo.png"
            alt="Kunstkwartiertje logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        
        {/* EERSTE TEKST */}
        <p className="text-gray-700 text-sm leading-relaxed mb-8 max-w-md text-center">
          Bekijk de laatst toegevoegde kunstwerken.
        </p>

        {/* SCHILDERIJEN - 3 OP EEN RIJ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          
          {/* Schilderij 1 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full h-64 mb-3">
              <Image
                src="/Schilderij1.png"
                alt="Zeilboot bij zonsondergang"
                fill
                className="object-cover rounded-xl"
              />
            </div>
            <p className="text-gray-600 text-xs leading-relaxed text-center">
               Dit schilderij toont een zeilboot op rustig water tijdens een vurige zonsondergang. 
              Met brede penseelstreken en intense kleuren – rood, oranje, geel en paars – wordt 
              de lucht omgetoverd tot een dramatisch en bijna magisch tafereel. Het zonlicht 
              weerkaatst in het water en creëert een spel van glanzende kleuren die de boot omringen.
            </p>
          </div>
          
          {/* Schilderij 2 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full h-64 mb-3">
              <Image
                src="/Schilderij2.png"
                alt="Modern kunstwerk"
                fill
                className="object-cover rounded-xl"
              />
            </div>
            <p className="text-gray-600 text-xs leading-relaxed text-center">
              Dit moderne kunstwerk speelt met licht en schaduw. De kunstenaar gebruikt 
              contrastrijke tinten om diepte en beweging te creëren. Een intrigerend stuk 
              dat de kijker uitnodigt om steeds nieuwe details te ontdekken.
            </p>
          </div>
          
          {/* Schilderij 3 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full h-64 mb-3">
              <Image
                src="/schilderij3.png"
                alt="Abstract kunstwerk"
                fill
                className="object-cover rounded-xl"
              />
            </div>
            <p className="text-gray-600 text-xs leading-relaxed text-center">
             Dit schilderij vangt een serene natuur in een moment van rust. 
             Met levendige kleuren en vloeiende penseelstreken brengt de kunstenaar het landschap tot leven. 
             De weerspiegeling in het water en het zachte licht zorgen voor een harmonieuze en bijna dromerige sfeer 
             die de kijker uitnodigt om even stil te staan.
            </p>
          </div>
          
        </div>
        
      </div>
    </div>
  );
}