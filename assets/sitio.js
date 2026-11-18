(() => {
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const puntero = matchMedia('(pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger, SplitText);
// el salto a un #ancla lo hacemos nosotros cuando las secciones fijas ya están armadas
const anclaInicial = location.hash.length > 1 ? location.hash : null;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ------------------------------------------------------------ desplazamiento suave */
let lenis = null;
if (!reducido && Lenis) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function irA(destino) {
  const el = typeof destino === 'string' ? $(destino) : destino;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -parseFloat(getComputedStyle(el).scrollMarginTop || 0) || 0, duration: 1.1 });
  else el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  e.preventDefault();
  cerrarMenu();
  irA(id);
  history.replaceState(null, '', id);
}));

/* ------------------------------------------------------------ menú en pantallas chicas */
const menu = $('#menu'), abrir = $('.barra__abrir');
const menuMovil = matchMedia('(max-width: 900px)');
function cerrarMenu() {
  menu.classList.remove('abierto');
  abrir.setAttribute('aria-expanded', 'false');
  menu.inert = menuMovil.matches;
  lenis?.start();
}
cerrarMenu();
menuMovil.addEventListener('change', cerrarMenu);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.classList.contains('abierto')) { cerrarMenu(); abrir.focus(); }
});
abrir.addEventListener('click', () => {
  const ab = !menu.classList.contains('abierto');
  menu.inert = !ab && menuMovil.matches;
  menu.classList.toggle('abierto', ab);
  abrir.setAttribute('aria-expanded', String(ab));
  ab ? lenis?.stop() : lenis?.start();
});

/* ------------------------------------------------------------ reloj de Temuco */
const hora = $('.reloj__hora');
const fmtHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
const tic = () => { hora.textContent = fmtHora.format(new Date()); };
tic(); setInterval(tic, 20000);
$('.pie__anio').textContent = new Date().getFullYear();

/* ------------------------------------------------------------ botones magnéticos */
if (puntero && !reducido) {
  $$('.magnetico').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.28);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
  // las láminas se inclinan apenas, como una hoja sobre la mesa
  $$('.lamina').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
      el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 6}deg`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

document.querySelectorAll('.especialidad').forEach(detalle => {
  detalle.addEventListener('toggle', () => ScrollTrigger.refresh());
});

/* ------------------------------------------------------------ barra: fondo y ocultar al bajar */
const barra = $('.barra');
let ultimoY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (st) => {
    const y = st.scroll();
    barra.classList.toggle('con-fondo', y > innerHeight * 0.6);
    barra.classList.toggle('oculta', y > innerHeight * 1.4 && y > ultimoY && !menu.classList.contains('abierto'));
    ultimoY = y;
  },
});

/* ------------------------------------------------------------ regla y menú activo */
const avance = $('.regla__avance'), laminaTxt = $('.regla__lamina'), nombreTxt = $('.regla__nombre');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => gsap.set(avance, { scaleY: st.progress }) });
// sección activa: la última cuyo borde superior ya pasó la mitad de la pantalla
function registrarSecciones() {
  const secciones = $$('main section[data-lamina]');
  let actual = null;
  const revisar = () => {
    const linea = innerHeight * 0.55;
    let activa = secciones[0];
    for (const sec of secciones) if (sec.getBoundingClientRect().top <= linea) activa = sec;
    if (activa === actual) return;
    actual = activa;
    laminaTxt.textContent = activa.dataset.lamina;
    nombreTxt.textContent = activa.dataset.nombre;
    document.body.classList.toggle('en-claro', activa.classList.contains('publico'));
    $$('.menu a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + activa.id));
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: revisar, onRefresh: revisar });
}

function coreografiaTextos() {
  if (reducido) {
    // modo suave: solo fundidos, sin desplazar nada
    $$('.titulo-seccion, .contacto__titulo, .entrada, .rotulo, .laboratorio__pie, .contacto__correo, .empresas__pie').forEach((el) =>
      gsap.from(el, { opacity: 0, duration: 0.9, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
    $$('.lista-servicios, .laminas, .ofertas, .modalidades, .ficha').forEach((g) =>
      gsap.from(g.children, { opacity: 0, duration: 0.8, stagger: 0.08, scrollTrigger: { trigger: g, start: 'top 88%' } }));

    return;
  }
  $$('.titulo-seccion, .contacto__titulo').forEach((h) => {
    const sp = SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'sp-linea' });
    gsap.from(sp.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  $$('.entrada, .rotulo, .laboratorio__pie').forEach((el) => gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  $$('.laminas, .ofertas, .modalidades').forEach((g) => gsap.from(g.children, { opacity: 0, y: 50, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: g, start: 'top 82%' } }));

  gsap.from('.ficha > div', { opacity: 0, duration: 0.6, stagger: 0.05, scrollTrigger: { trigger: '.ficha', start: 'top 85%' } });
  gsap.from('.contacto__correo', { opacity: 0, y: 40, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.contacto__correo', start: 'top 90%' } });
  gsap.from('.pie__cajetin > div', { opacity: 0, y: 12, stagger: 0.06, duration: 0.7, scrollTrigger: { trigger: '.pie', start: 'top 95%' } });
}


coreografiaTextos();
registrarSecciones();
ScrollTrigger.refresh();
function saltarAlAncla() {
  const el = anclaInicial && $(anclaInicial);
  if (!el) return;
  ScrollTrigger.refresh();
  if (lenis) lenis.scrollTo(el, { offset: -parseFloat(getComputedStyle(el).scrollMarginTop || 0) || 0, immediate: true, force: true });
  else el.scrollIntoView();
  ScrollTrigger.update();
}
saltarAlAncla();
document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
