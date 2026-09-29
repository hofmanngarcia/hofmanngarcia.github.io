/*
 * Coreografía del sitio: cargador, relieve, desplazamiento y detalles.
 * GSAP, ScrollTrigger, SplitText y Lenis llegan como scripts clásicos con
 * defer, que se ejecutan antes que este módulo.
 */
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
// "Reducir movimiento" (Windows con las animaciones apagadas, muy común en equipos de oficina):
// modo suave. Se quitan el scroll suavizado, las secciones fijas y los desplazamientos grandes,
// pero la red sigue viva y los textos aparecen con un fundido.
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const puntero = matchMedia('(pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

if (!gsap || !ScrollTrigger || !SplitText) {
  // sin librerías de animación el sitio se muestra quieto, pero completo
  document.body.classList.remove('cargando');
  document.querySelector('.cargador').style.display = 'none';
  throw new Error('No cargaron las librerías de animación');
}
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
  lenis.stop();
}
function irA(destino) {
  const el = typeof destino === 'string' ? $(destino) : destino;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
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
function cerrarMenu() { menu.classList.remove('abierto'); abrir.setAttribute('aria-expanded', 'false'); lenis?.start(); }
abrir.addEventListener('click', () => {
  const ab = !menu.classList.contains('abierto');
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

/* ------------------------------------------------------------ la red de sistemas */
let red = null;
let introHecha = false;   // si la red llega tarde, aparece de inmediato
async function prepararRed() {
  const canvas = $('#red');
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('sin webgl');
    const mod = await import('./red.js?v=3');
    red = mod.crearRed(canvas, $('.red-capa'), { reducido });
    red.alFoco(mostrarSistema);
    if (introHecha) { red.aparecer(1); if (reducido) red.progreso(1); }
  } catch (err) {
    canvas.style.display = 'none';      // sin WebGL el sitio se lee igual, sobre fondo liso
  }
}

/* ------------------------------------------------------------ cursor que nombra el sistema */
const cursor = $('.cursor');
const estadoTxt = $('.cursor__estado');
let enPortada = true;
const ultimo = { x: 0, y: 0, sobre: false, hay: false };
function avisarRaton() {
  if (!red || !ultimo.hay) return;
  red.raton((ultimo.x / innerWidth) * 2 - 1, -(ultimo.y / innerHeight) * 2 + 1, enPortada && !ultimo.sobre, ultimo.x, ultimo.y);
}
if (puntero) {
  document.body.classList.add('cursor-propio');
  const mx = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' });
  const my = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    mx(e.clientX); my(e.clientY);
    cursor.classList.toggle('a-la-izquierda', e.clientX > innerWidth - 320);
    Object.assign(ultimo, { x: e.clientX, y: e.clientY, sobre: !!e.target.closest('a,button'), hay: true });
    avisarRaton();
  });
  document.addEventListener('pointerleave', () => red?.raton(0, 0, false, -999, -999));
  $$('a,button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('sobre-enlace'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('sobre-enlace'));
  });
} else {
  cursor.remove();
}
function mostrarSistema(f) {
  if (!cursor.isConnected) return;
  cursor.classList.toggle('con-cota', !!f);
  if (!f) return;
  if (f.centro) estadoTxt.textContent = `conecta ${f.total} sistemas`;
  else if (!f.conexiones) estadoTxt.textContent = 'aislado · datos por correo y planilla';
  else estadoTxt.textContent = `${f.conexiones} conexiones · datos al día`;
}

/* ------------------------------------------------------------ texto que se mezcla al pasar */
const signos = '0123456789+−·/°';
$$('[data-mezcla]').forEach((el) => {
  const original = el.textContent;
  let cuadro = null;
  el.addEventListener('pointerenter', () => {
    if (reducido) return;
    let i = 0;
    cancelAnimationFrame(cuadro);
    const paso = () => {
      el.textContent = original.split('').map((ch, k) => (k < i / 2 || ch === ' ' ? ch : signos[(Math.random() * signos.length) | 0])).join('');
      if (i++ < original.length * 2) cuadro = requestAnimationFrame(paso);
      else el.textContent = original;
    };
    paso();
  });
});

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

/* ------------------------------------------------------------ servicios: acordeón */
$$('.servicio__cabeza').forEach((b) => b.addEventListener('click', () => {
  const li = b.parentElement;
  const ab = !li.classList.contains('abierto');
  $$('.servicio.abierto').forEach((o) => { o.classList.remove('abierto'); $('.servicio__cabeza', o).setAttribute('aria-expanded', 'false'); });
  li.classList.toggle('abierto', ab);
  b.setAttribute('aria-expanded', String(ab));
  setTimeout(() => ScrollTrigger.refresh(), 600);
}));

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

/* ------------------------------------------------------------ portada: de sistemas aislados a una red */
function coreografiaPortada() {
  if (reducido) {
    // modo suave: la red se conecta sola, sin fijar la portada al hacer scroll
    gsap.to({ v: 0 }, { v: 1, duration: 3.4, delay: 1.4, ease: 'power1.inOut', onUpdate() { red?.progreso(this.targets()[0].v); } });
    gsap.to('#red, .red-capa', { opacity: 0.12, ease: 'none', scrollTrigger: { trigger: '.metodo', start: 'top bottom', end: 'top 30%', scrub: true } });
    gsap.to('.red-capa', { autoAlpha: 0, scrollTrigger: { trigger: '.metodo', start: 'top 60%', toggleActions: 'play none none reverse' } });
    ScrollTrigger.create({ trigger: '.servicios', start: 'top 60%', onEnter: () => red?.pausar(true), onLeaveBack: () => red?.pausar(false) });
    ScrollTrigger.create({
      trigger: '.portada', start: 'top top', end: 'bottom 40%',
      onLeave: () => { enPortada = false; avisarRaton(); }, onEnterBack: () => { enPortada = true; avisarRaton(); },
    });
    return;
  }
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.portada', start: 'top top', end: '+=150%', pin: true, scrub: 0.6,
      onUpdate: (st) => {
        red?.progreso(st.progress * 1.12);
        const antes = enPortada;
        enPortada = scrollY < innerHeight * 1.9;
        if (antes !== enPortada) avisarRaton();
      },
      onLeave: () => { enPortada = false; avisarRaton(); },
      onEnterBack: () => { enPortada = true; avisarRaton(); },
    },
  });
  tl.to('.portada__centro', { yPercent: -14, opacity: 0, ease: 'power2.in', duration: 0.4 }, 0)
    .to('.portada__arriba, .portada__abajo', { opacity: 0, duration: 0.25 }, 0)
    .to('.conectado', { opacity: 1, duration: 0.15 }, 0.72)
    .from('.conectado__frase', { y: 30, duration: 0.2 }, 0.72)
    .to('.conectado', { opacity: 0, duration: 0.1 }, 0.95);

  // después de la portada la red queda de fondo, apenas visible
  gsap.to('#red, .red-capa', {
    opacity: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.metodo', start: 'top bottom', end: 'top 20%', scrub: true },
  });
  gsap.to('.red-capa', { autoAlpha: 0, scrollTrigger: { trigger: '.metodo', start: 'top 60%', toggleActions: 'play none none reverse' } });
  ScrollTrigger.create({
    trigger: '.servicios', start: 'top 60%',
    onEnter: () => red?.pausar(true), onLeaveBack: () => red?.pausar(false),
  });
}

/* ------------------------------------------------------------ método: pista horizontal */
function coreografiaMetodo() {
  const pista = $('.metodo__pista');
  const dibujos = $$('.paso__dibujo');
  const trazar = (svg, opciones) => {
    const trazos = $$('path,circle,rect', svg);
    trazos.forEach((p) => { const L = p.getTotalLength ? p.getTotalLength() : 400; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    return gsap.to(trazos, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.12, ...opciones });
  };
  if (reducido) {
    // modo suave: los pasos se leen en vertical y sus dibujos se trazan al aparecer
    dibujos.forEach((svg) => trazar(svg, { scrollTrigger: { trigger: svg, start: 'top 85%' } }));
    return;
  }
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const recorrido = () => pista.scrollWidth - innerWidth;
    const mover = gsap.to(pista, {
      x: () => -recorrido(), ease: 'none',
      scrollTrigger: { trigger: '.metodo', start: 'top top', end: () => '+=' + recorrido(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    dibujos.forEach((svg) => trazar(svg, { scrollTrigger: { trigger: svg, containerAnimation: mover, start: 'left 85%', toggleActions: 'play none none reverse' } }));
    $$('.paso').forEach((p) => gsap.from(p, { opacity: 0.25, scrollTrigger: { trigger: p, containerAnimation: mover, start: 'left 95%', end: 'left 60%', scrub: true } }));
  });
  mm.add('(max-width: 900px)', () => {
    dibujos.forEach((svg) => trazar(svg, { scrollTrigger: { trigger: svg, start: 'top 80%' } }));
  });
}

/* ------------------------------------------------------------ títulos y apariciones */
function trazarLaminas() {
  $$('.lamina__dibujo svg').forEach((svg) => {
    const trazos = $$('path,rect,circle,ellipse', svg);
    trazos.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.to(trazos, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.1, scrollTrigger: { trigger: svg, start: 'top 85%' } });
  });
}
function coreografiaTextos() {
  if (reducido) {
    // modo suave: solo fundidos, sin desplazar nada
    $$('.titulo-seccion, .contacto__titulo, .entrada, .rotulo, .laboratorio__pie, .contacto__correo, .empresas__pie').forEach((el) =>
      gsap.from(el, { opacity: 0, duration: 0.9, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
    $$('.lista-servicios, .laminas, .ofertas, .modalidades, .ficha').forEach((g) =>
      gsap.from(g.children, { opacity: 0, duration: 0.8, stagger: 0.08, scrollTrigger: { trigger: g, start: 'top 88%' } }));
    trazarLaminas();
    return;
  }
  $$('.titulo-seccion, .contacto__titulo').forEach((h) => {
    const sp = SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'sp-linea' });
    gsap.from(sp.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  $$('.entrada, .rotulo, .laboratorio__pie').forEach((el) => gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.from('.servicio', { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.lista-servicios', start: 'top 80%' } });
  $$('.laminas, .ofertas, .modalidades').forEach((g) => gsap.from(g.children, { opacity: 0, y: 50, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: g, start: 'top 82%' } }));
  trazarLaminas();
  gsap.from('.ficha > div', { opacity: 0, duration: 0.6, stagger: 0.05, scrollTrigger: { trigger: '.ficha', start: 'top 85%' } });
  gsap.from('.contacto__correo', { opacity: 0, y: 40, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.contacto__correo', start: 'top 90%' } });
  gsap.from('.pie__cajetin > div', { opacity: 0, y: 12, stagger: 0.06, duration: 0.7, scrollTrigger: { trigger: '.pie', start: 'top 95%' } });
}

/* ------------------------------------------------------------ entrada */
async function iniciar() {
  const cifra = $('.cargador__cifra');
  const trazosHG = $$('.cargador__hg path');
  gsap.set(trazosHG, { attr: { pathLength: 1 } });
  const listo = prepararRed();

  const cuenta = { m: 0 };
  const intro = gsap.timeline();
  intro.to(trazosHG, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.12 }, 0)
    .to(cuenta, { m: 9, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { cifra.textContent = String(Math.round(cuenta.m)); } }, 0);
  // la entrada no espera más de 4 s: con una red lenta, el sitio aparece igual y la red se suma cuando llegue
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  await Promise.race([Promise.all([listo, intro.then ? intro : Promise.resolve(), document.fonts?.ready]), espera(4000)]);

  const sp = reducido ? null : SplitText.create('.portada__titulo .linea', { type: 'words', wordsClass: 'palabra' });
  const salida = gsap.timeline({ onComplete: () => { document.body.classList.remove('cargando'); lenis?.start(); saltarAlAncla(); } });
  salida.to('.cargador', reducido ? { autoAlpha: 0, duration: 0.6 } : { yPercent: -100, duration: 1, ease: 'expo.inOut' });
  if (!reducido) {
    salida.set('.cargador', { display: 'none' })
      .from(sp.words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, '-=0.45')
      .from('.portada__bajada, .portada__acciones, .portada__arriba, .portada__abajo', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', stagger: 0.08 }, '-=0.9')
      .fromTo({ v: 0 }, { v: 0 }, { v: 1, duration: 2.6, ease: 'power2.out', onUpdate() { red?.aparecer(this.targets()[0].v); }, onComplete() { introHecha = true; } }, '-=1.6');
  } else {
    salida.set('.cargador', { display: 'none' })
      .from('.portada__titulo, .portada__bajada, .portada__acciones, .portada__arriba, .portada__abajo', { opacity: 0, duration: 1, stagger: 0.1 }, '-=0.2')
      .fromTo({ v: 0 }, { v: 0 }, { v: 1, duration: 1.6, onUpdate() { red?.aparecer(this.targets()[0].v); }, onComplete() { introHecha = true; } }, '<');
  }

  coreografiaPortada();
  coreografiaMetodo();
  coreografiaTextos();
  registrarSecciones();
  ScrollTrigger.refresh();
}
function saltarAlAncla() {
  const el = anclaInicial && $(anclaInicial);
  if (!el) return;
  ScrollTrigger.refresh();
  if (lenis) lenis.scrollTo(el, { immediate: true, force: true });
  else el.scrollIntoView();
  ScrollTrigger.update();
}
iniciar();
