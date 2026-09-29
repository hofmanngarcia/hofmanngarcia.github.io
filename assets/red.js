/*
 * La red de la portada: los sistemas de una institución cualquiera.
 *
 * Al comienzo están aislados, cada uno con sus propios registros dando
 * vueltas y el dato viajando "a mano". Al bajar, aparece una plataforma común,
 * los sistemas se ordenan a su alrededor, se trazan las conexiones y los datos
 * empiezan a circular por ellas.
 */
import * as THREE from 'three';

export const SISTEMAS = [
  'Finanzas', 'Personal', 'Oficina de partes', 'Portal ciudadano', 'Bodega',
  'Agenda', 'Documentos', 'Reportes', 'Correo',
];
const CENTRO = SISTEMAS.length;           // índice de la plataforma común
const NOMBRE_CENTRO = 'Plataforma integrada';

// posiciones "aisladas": dispersas y a distintas profundidades
const DISPERSAS = [
  [-1.7, 0.95, -0.4], [0.3, 1.2, -1.1], [1.45, 0.5, 0.3], [-0.8, -0.3, 0.8], [1.6, -0.85, -0.6],
  [-1.85, -1.0, -0.9], [0.7, -0.25, 1.0], [-0.3, -1.2, -0.2], [1.0, 1.1, 0.6],
];
// conexiones entre pares, además de cada sistema con la plataforma
const PARES = [[0, 1], [2, 6], [3, 5], [4, 0], [7, 0], [8, 2], [3, 2], [7, 1]];

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function azar(semilla) { let s = semilla; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const VERT = /* glsl */`
  attribute float aTam;
  attribute float aAlfa;
  attribute vec3 aColor;
  uniform float uPixel;
  varying float vAlfa;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aTam * uPixel / -mv.z;   // aTam: píxeles a la distancia de referencia
    gl_Position = projectionMatrix * mv;
    vAlfa = aAlfa;
    vColor = aColor;
  }
`;
const FRAG = /* glsl */`
  varying float vAlfa;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float nucleo = smoothstep(0.5, 0.0, d);
    float a = pow(nucleo, 1.6) * vAlfa;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function crearRed(canvas, capa, { reducido = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const pr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  const grupo = new THREE.Group();
  escena.add(grupo);

  const C = {
    tinta: new THREE.Color('#E9ECE9'), acento: new THREE.Color('#3FAEB4'), claro: new THREE.Color('#6FCFD2'),
    lila: new THREE.Color('#7C8FE8'), tenue: new THREE.Color('#3a4a4c'),
  };
  const rnd = azar(7);

  /* --------------------------------------------------------- posiciones ordenadas */
  const ORDENADAS = SISTEMAS.map((_, i) => {
    const a = (i / SISTEMAS.length) * Math.PI * 2 + 0.35;
    return [Math.cos(a) * 1.55, Math.sin(a) * 0.95, Math.sin(a) * 0.55];
  });
  const nodos = SISTEMAS.map((nombre, i) => ({
    nombre, a: new THREE.Vector3(...DISPERSAS[i]), b: new THREE.Vector3(...ORDENADAS[i]),
    p: new THREE.Vector3(), flota: rnd() * 10, pantalla: { x: 0, y: 0, z: 0 },
  }));
  nodos.push({ nombre: NOMBRE_CENTRO, a: new THREE.Vector3(0, 0, -0.2), b: new THREE.Vector3(0, 0, 0), p: new THREE.Vector3(), flota: 0, pantalla: { x: 0, y: 0, z: 0 }, centro: true });

  const aristas = [...SISTEMAS.map((_, i) => [i, CENTRO]), ...PARES];

  /* --------------------------------------------------------- partículas */
  const SAT = 46, PAQ = 3, POLVO = 240;
  const nSat = SISTEMAS.length * SAT;
  const nPaq = aristas.length * PAQ;
  const total = nodos.length + nSat + nPaq + POLVO;
  const pos = new Float32Array(total * 3), tam = new Float32Array(total), alfa = new Float32Array(total), col = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlfa', new THREE.BufferAttribute(alfa, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const puntos = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPixel: { value: 0 } },
  }));
  puntos.frustumCulled = false;
  grupo.add(puntos);

  // satélites: los registros de cada sistema
  const sats = [];
  for (let s = 0; s < SISTEMAS.length; s++) for (let k = 0; k < SAT; k++) {
    const anillo = k % 2;
    sats.push({
      s, r0: 0.16 + rnd() * 0.32, r1: anillo ? 0.30 : 0.21, vel: (0.25 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1),
      fase: rnd() * Math.PI * 2, eje: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
      ruido: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5),
    });
  }
  const paqs = [];
  aristas.forEach((_, e) => { for (let k = 0; k < PAQ; k++) paqs.push({ e, fase: k / PAQ + rnd() * 0.2, vel: 0.16 + rnd() * 0.14, ida: rnd() < 0.5 }); });
  const polvo = Array.from({ length: POLVO }, () => ({ p: new THREE.Vector3((rnd() - 0.5) * 7, (rnd() - 0.5) * 4.2, (rnd() - 0.5) * 4), f: rnd() * 10 }));

  /* --------------------------------------------------------- aristas y anillos */
  const lineaPos = new Float32Array(aristas.length * 6), lineaCol = new Float32Array(aristas.length * 6);
  const lineaGeo = new THREE.BufferGeometry();
  lineaGeo.setAttribute('position', new THREE.BufferAttribute(lineaPos, 3).setUsage(THREE.DynamicDrawUsage));
  lineaGeo.setAttribute('color', new THREE.BufferAttribute(lineaCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lineas = new THREE.LineSegments(lineaGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  lineas.frustumCulled = false;
  grupo.add(lineas);

  const circulo = []; for (let k = 0; k <= 64; k++) { const a = (k / 64) * Math.PI * 2; circulo.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)); }
  const circGeo = new THREE.BufferGeometry().setFromPoints(circulo);
  const anillos = nodos.map((n) => {
    const m = new THREE.LineBasicMaterial({ color: n.centro ? 0x6FCFD2 : 0x3FAEB4, transparent: true, opacity: 0.5, depthWrite: false });
    const l = new THREE.LineLoop(circGeo, m);
    grupo.add(l);
    return l;
  });

  /* --------------------------------------------------------- etiquetas en HTML */
  const etiquetas = nodos.map((n) => {
    const el = document.createElement('span');
    el.className = 'red-etiqueta' + (n.centro ? ' red-etiqueta--centro' : '');
    el.textContent = n.nombre;
    capa.appendChild(el);
    return el;
  });

  /* --------------------------------------------------------- estado */
  let progreso = reducido ? 1 : 0, aparicion = reducido ? 1 : 0, corrimiento = 0, compresion = 1, angosto = false;
  const disperso = new THREE.Vector3();
  const raton = { nx: 0, ny: 0, sx: 0, sy: 0, px: -999, py: -999, dentro: false };
  let foco = -1, alFoco = () => {}, visible = true, corriendo = true;
  let W = 1, H = 1;

  function tamano() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camara.aspect = W / H;
    camara.position.set(0, 0, W / H < 0.9 ? 7.6 : 6.4);
    // en pantallas angostas la red se achica para caber completa a lo ancho
    // sin animaciones la red se muestra ya conectada: más chica y a la derecha, para no tapar el titular
    grupo.scale.setScalar(W / H < 0.9 ? Math.max(0.5, (W / H) / 0.82) : reducido ? 0.72 : 1);
    // en pantallas anchas los sistemas aislados se agrupan a la derecha, lejos del titular
    corrimiento = W / H > 1.25 ? 1.0 : 0;
    compresion = W / H > 1.25 ? 0.6 : W / H < 0.9 ? 0.72 : 1;
    angosto = W / H < 0.9;
    camara.updateProjectionMatrix();
    puntos.material.uniforms.uPixel.value = pr * camara.position.z * Math.min(1.25, Math.max(0.7, H / 900));
  }
  tamano();
  window.addEventListener('resize', tamano);

  function conexiones(i, p) {
    if (p < 0.35) return 0;
    return aristas.filter(([a, b]) => a === i || b === i).length;
  }

  const v = new THREE.Vector3(), w = new THREE.Vector3(), q = new THREE.Quaternion();
  const reloj = new THREE.Clock();
  function cuadro() {
    if (!corriendo) return;
    requestAnimationFrame(cuadro);
    if (!visible) return;
    const t = reducido ? 12 : reloj.getElapsedTime();
    const p = suave(0, 1, progreso);
    const ap = aparicion;
    raton.sx += (raton.nx - raton.sx) * 0.05;
    raton.sy += (raton.ny - raton.sy) * 0.05;

    // cámara: leve paralaje, y el conjunto corrido a la derecha en pantallas anchas
    grupo.position.x = angosto ? -0.28 : corrimiento * (reducido ? 1.3 : 1 - p * 0.75);
    grupo.rotation.y = (reducido ? 0 : Math.sin(t * 0.08) * 0.22) + raton.sx * 0.18;
    grupo.rotation.x = -raton.sy * 0.1;
    camara.lookAt(0, 0, 0);

    // nodos
    nodos.forEach((n, i) => {
      disperso.set(n.a.x * compresion, n.a.y, n.a.z);
      n.p.lerpVectors(disperso, n.b, p);
      if (!reducido) n.p.y += Math.sin(t * 0.6 + n.flota) * 0.05 * (1 - p * 0.6);
    });
    const centroVis = suave(0.18, 0.45, p);

    let k = 0;
    // núcleos
    nodos.forEach((n, i) => {
      const esFoco = i === foco;
      pos.set([n.p.x, n.p.y, n.p.z], k * 3);
      const base = n.centro ? 58 * centroVis : 30;
      tam[k] = base * ap * (esFoco ? 1.6 : 1);
      alfa[k] = n.centro ? centroVis : 1;
      (esFoco || n.centro ? C.tinta : C.claro).toArray(col, k * 3);
      k++;
    });
    // satélites: desordenados al comienzo, en anillos al final
    for (const s of sats) {
      const n = nodos[s.s];
      const ang = s.fase + t * s.vel * (1 - p * 0.35);
      const r = THREE.MathUtils.lerp(s.r0, s.r1, p);
      v.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
      q.setFromAxisAngle(s.eje, 1.2 * (1 - p));
      v.applyQuaternion(q);
      v.addScaledVector(s.ruido, 0.35 * (1 - p) * (0.6 + 0.4 * Math.sin(t * 0.5 + s.fase)));
      pos.set([n.p.x + v.x, n.p.y + v.y, n.p.z + v.z], k * 3);
      tam[k] = 8.5 * ap;
      alfa[k] = (0.45 + 0.35 * p) * ap * (foco === s.s ? 1.8 : 1);
      (foco === s.s ? C.claro : C.acento).toArray(col, k * 3);
      k++;
    }
    // paquetes que viajan por las conexiones
    paqs.forEach((pq) => {
      const [ia, ib] = aristas[pq.e];
      const lleno = suave(0.5 + pq.e * 0.008, 0.72 + pq.e * 0.008, p);
      let f = (pq.fase + t * pq.vel) % 1;
      if (pq.ida) f = 1 - f;
      v.lerpVectors(nodos[ia].p, nodos[ib].p, f);
      pos.set([v.x, v.y, v.z], k * 3);
      const resalta = foco === ia || foco === ib;
      tam[k] = (resalta ? 15 : 11) * lleno;
      alfa[k] = lleno * (resalta ? 1 : 0.85) * Math.sin(f * Math.PI);
      (resalta ? C.tinta : C.lila).toArray(col, k * 3);
      k++;
    });
    // polvo de fondo
    for (const d of polvo) {
      pos.set([d.p.x + Math.sin(t * 0.07 + d.f) * 0.2, d.p.y + Math.cos(t * 0.05 + d.f) * 0.15, d.p.z], k * 3);
      tam[k] = 4;
      alfa[k] = 0.22 * ap * (1 - p * 0.5);
      C.tenue.toArray(col, k * 3);
      k++;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aTam.needsUpdate = true;
    geo.attributes.aAlfa.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;

    // aristas: se trazan de a una desde cada sistema hacia su destino
    aristas.forEach(([ia, ib], e) => {
      const trazo = suave(0.28 + e * 0.012, 0.52 + e * 0.012, p);
      const A = nodos[ia].p, B = nodos[ib].p;
      w.lerpVectors(A, B, trazo);
      lineaPos.set([A.x, A.y, A.z, w.x, w.y, w.z], e * 6);
      const resalta = foco === ia || foco === ib;
      const c = (resalta ? C.claro : C.acento).clone().multiplyScalar((resalta ? 0.95 : 0.42) * ap * (trazo > 0 ? 1 : 0));
      c.toArray(lineaCol, e * 6); c.toArray(lineaCol, e * 6 + 3);
    });
    lineaGeo.attributes.position.needsUpdate = true;
    lineaGeo.attributes.color.needsUpdate = true;

    // anillos mirando siempre a la cámara
    anillos.forEach((l, i) => {
      const n = nodos[i];
      l.position.copy(n.p);
      l.quaternion.copy(camara.quaternion);
      grupo.getWorldQuaternion(q); l.quaternion.premultiply(q.invert());
      const esc = (n.centro ? 0.2 * centroVis : 0.1) * (i === foco ? 1.5 : 1) * ap;
      l.scale.setScalar(Math.max(esc, 0.0001));
      l.material.opacity = (n.centro ? centroVis : 0.55) * ap;
    });

    // proyección a pantalla: etiquetas y detección del sistema bajo el cursor
    grupo.updateMatrixWorld();
    let mejor = -1, dist = 60;
    nodos.forEach((n, i) => {
      v.copy(n.p).applyMatrix4(grupo.matrixWorld).project(camara);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      n.pantalla.x = x; n.pantalla.y = y;
      const el = etiquetas[i];
      // en el teléfono los nombres esperan a que la red se conecte, para no tapar el titular
      const vis = (n.centro ? centroVis : 1) * ap * (angosto ? suave(0.3, 0.55, p) : 1);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = vis.toFixed(3);
      el.classList.toggle('foco', i === foco);
      if (raton.dentro && vis > 0.5) {
        const d = Math.hypot(raton.px - x, raton.py - y);
        if (d < dist) { dist = d; mejor = i; }
      }
    });
    if (mejor !== foco) {
      foco = mejor;
      alFoco(foco < 0 ? null : { nombre: nodos[foco].nombre, conexiones: conexiones(foco, p), centro: !!nodos[foco].centro, total: SISTEMAS.length });
    }
    renderer.render(escena, camara);
  }
  cuadro();
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  return {
    aparecer(x) { aparicion = x; },
    progreso(x) {
      progreso = Math.min(1, Math.max(0, x));
      if (foco >= 0) alFoco({ nombre: nodos[foco].nombre, conexiones: conexiones(foco, suave(0, 1, progreso)), centro: !!nodos[foco].centro, total: SISTEMAS.length });
    },
    raton(nx, ny, dentro, px, py) { Object.assign(raton, { nx, ny, dentro, px, py }); },
    alFoco(fn) { alFoco = fn; },
    pausar(x) { visible = !x && !document.hidden; },
  };
}
