const instrumento = document.querySelector('.instrumento');
const vista = instrumento.querySelector('.instrumento__vista');
const desmontar = instrumento.querySelector('.desmontar');

function mostrarCapas(abierto) {
  instrumento.classList.toggle('abierto', abierto);
  desmontar.setAttribute('aria-expanded', String(abierto));
  desmontar.querySelector('b').textContent = abierto ? 'Unir capas' : 'Ver capas';
  desmontar.querySelector('span').textContent = abierto ? '−' : '＋';
}

// Después de una elección explícita, el desplazamiento respeta esa vista.
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)');
function seguirRecorrido() {
  if (movimientoReducido.matches) return;
  const caja = vista.getBoundingClientRect();
  const mostrar = caja.top < innerHeight * .21 && scrollY > 85;
  if (mostrar !== instrumento.classList.contains('abierto')) mostrarCapas(mostrar);
}
addEventListener('scroll', seguirRecorrido, { passive: true });
desmontar.addEventListener('click', () => {
  removeEventListener('scroll', seguirRecorrido);
  mostrarCapas(!instrumento.classList.contains('abierto'));
});
