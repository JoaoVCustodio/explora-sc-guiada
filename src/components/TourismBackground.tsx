export const TourismBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradiente animado de fundo */}
      <div className="absolute inset-0 animated-bg" />
      
      {/* Ondas animadas no rodapé */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-40">
        <svg className="wave-animation w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path 
            d="M0,50 C150,80 350,0 600,50 C850,100 1050,20 1200,50 L1200,120 L0,120 Z" 
            fill="hsl(var(--primary))"
            opacity="0.5"
          />
          <path 
            d="M0,70 C200,100 400,30 600,70 C800,110 1000,40 1200,70 L1200,120 L0,120 Z" 
            fill="hsl(var(--primary))"
            opacity="0.3"
          />
        </svg>
      </div>
      
      {/* Ícones de turismo flutuantes */}
      <div className="tourism-icon tourism-icon-1">🏖️</div>
      <div className="tourism-icon tourism-icon-2">✈️</div>
      <div className="tourism-icon tourism-icon-3">🗺️</div>
      <div className="tourism-icon tourism-icon-4">🏔️</div>
      <div className="tourism-icon tourism-icon-5">🎒</div>
      <div className="tourism-icon tourism-icon-6">📸</div>
      <div className="tourism-icon tourism-icon-7">🌴</div>
      <div className="tourism-icon tourism-icon-8">🚗</div>
      
      {/* Partículas sutis */}
      <div className="particles-container">
        {Array.from({length: 20}).map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>
      
      {/* Orbs coloridos */}
      <div className="floating-orb floating-orb-1" style={{ opacity: 0.4 }} />
      <div className="floating-orb floating-orb-2" style={{ opacity: 0.35 }} />
      <div className="floating-orb floating-orb-3" style={{ opacity: 0.3 }} />
    </div>
  );
};
