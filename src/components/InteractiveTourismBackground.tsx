import { useEffect, useState } from "react";

export const InteractiveTourismBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalizar posição do mouse (-1 a 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradiente animado de fundo */}
      <div className="absolute inset-0 animated-bg" />
      
      {/* Ondas animadas no rodapé */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-40">
        <svg 
          className="wave-animation w-full h-full" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
          style={{
            transform: `translateX(${mousePosition.x * 10}px)`
          }}
        >
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
      
      {/* Ícones de turismo flutuantes COM PARALLAX */}
      <div 
        className="tourism-icon tourism-icon-1"
        style={{
          transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`
        }}
      >
        🏖️
      </div>
      <div 
        className="tourism-icon tourism-icon-2"
        style={{
          transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * 10}px)`
        }}
      >
        ✈️
      </div>
      <div 
        className="tourism-icon tourism-icon-3"
        style={{
          transform: `translate(${mousePosition.x * 25}px, ${mousePosition.y * -15}px)`
        }}
      >
        🗺️
      </div>
      <div 
        className="tourism-icon tourism-icon-4"
        style={{
          transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * 20}px)`
        }}
      >
        🏔️
      </div>
      <div 
        className="tourism-icon tourism-icon-5"
        style={{
          transform: `translate(${mousePosition.x * 18}px, ${mousePosition.y * -12}px)`
        }}
      >
        🎒
      </div>
      <div 
        className="tourism-icon tourism-icon-6"
        style={{
          transform: `translate(${mousePosition.x * -22}px, ${mousePosition.y * 18}px)`
        }}
      >
        📸
      </div>
      <div 
        className="tourism-icon tourism-icon-7"
        style={{
          transform: `translate(${mousePosition.x * 12}px, ${mousePosition.y * -20}px)`
        }}
      >
        🌴
      </div>
      <div 
        className="tourism-icon tourism-icon-8"
        style={{
          transform: `translate(${mousePosition.x * -18}px, ${mousePosition.y * 15}px)`
        }}
      >
        🚗
      </div>
      
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
      
      {/* Orbs coloridos COM PARALLAX */}
      <div 
        className="floating-orb floating-orb-1" 
        style={{ 
          opacity: 0.4,
          transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`
        }} 
      />
      <div 
        className="floating-orb floating-orb-2" 
        style={{ 
          opacity: 0.35,
          transform: `translate(${mousePosition.x * -25}px, ${mousePosition.y * 25}px)`
        }} 
      />
      <div 
        className="floating-orb floating-orb-3" 
        style={{ 
          opacity: 0.3,
          transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * -20}px)`
        }} 
      />
    </div>
  );
};
