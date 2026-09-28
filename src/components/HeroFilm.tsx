export function HeroFilm() {
  return (
    <>
      <video
        className="hero-film-media hero-film-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/landing/hero-poster.webp"
        aria-label="Demonstração animada: preferências, geração de roteiro e mapa"
      >
        <source src="/landing/explorasc-hero.mp4" type="video/mp4" />
        <source src="/landing/explorasc-hero.webm" type="video/webm" />
        Seu navegador não conseguiu reproduzir a demonstração do ExploraSC.
      </video>

      <picture className="hero-film-media hero-film-poster">
        <source media="(max-width: 640px)" srcSet="/landing/hero-poster-mobile.webp" />
        <img
          src="/landing/hero-poster.webp"
          alt="Prévia do ExploraSC criando um roteiro turístico personalizado"
          width="1280"
          height="800"
        />
      </picture>
    </>
  );
}
