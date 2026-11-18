(() => {
  const id = nombre => document.getElementById(nombre);
  const pesos = valor => '$' + new Intl.NumberFormat('es-CL').format(valor);

  // La distancia al centro representa los días que faltan para el cierre.
  const oportunidades = [
    {titulo:'Portal de trámites municipales', rubro:'Tecnología', region:'La Araucanía', plazo:2, monto:18400000, angulo:-118},
    {titulo:'Reposición de luminarias', rubro:'Equipamiento', region:'Los Lagos', plazo:3, monto:6900000, angulo:13},
    {titulo:'Mejora de sede comunitaria', rubro:'Construcción', region:'Los Ríos', plazo:4, monto:25500000, angulo:126},
    {titulo:'Soporte de redes y servidores', rubro:'Tecnología', region:'Los Ríos', plazo:5, monto:8200000, angulo:-82},
    {titulo:'Habilitación de sala técnica', rubro:'Construcción', region:'La Araucanía', plazo:7, monto:12700000, angulo:158},
  ];
  const guardadas = new Set();
  let seguimiento = false;
  let activa = oportunidades[0];
  function dibujarRadar() {
    const foco = document.activeElement.id;
    const visibles = oportunidades.filter(o =>
      (id('rubro').value === 'Todos' || o.rubro === id('rubro').value) &&
      (id('region').value === 'Todas' || o.region === id('region').value) &&
      (!seguimiento || guardadas.has(o)));
    if (!visibles.includes(activa)) activa = visibles[0];
    id('detectar').setAttribute('aria-pressed', String(!seguimiento));
    id('ver-guardadas').setAttribute('aria-pressed', String(seguimiento));
    id('n-guardadas').textContent = guardadas.size;
    id('conteo-radar').textContent = visibles.length + (visibles.length === 1 ? ' señal' : ' señales');
    const lista = id('lista-radar'), senales = id('senales'), ficha = id('ficha-radar');
    lista.replaceChildren(); senales.replaceChildren(); ficha.replaceChildren();
    for (const oportunidad of visibles) {
      const indice = oportunidades.indexOf(oportunidad);
      const numero = '0' + (indice + 1);
      const boton = document.createElement('button');
      boton.type = 'button'; boton.id = 'resultado-' + indice;
      boton.innerHTML = '<small>' + numero + '</small><span>' + oportunidad.titulo + '</span><i aria-hidden="true">' + (guardadas.has(oportunidad) ? '✓' : '↗') + '</i>';
      const punto = document.createElement('button');
      punto.type = 'button'; punto.id = 'senal-' + indice; punto.className = 'senal';
      const angulo = oportunidad.angulo * Math.PI / 180;
      const radio = 5 + oportunidad.plazo * 4.7;
      punto.style.left = (50 + radio * Math.cos(angulo)) + '%';
      punto.style.top = (50 + radio * Math.sin(angulo)) + '%';
      punto.textContent = numero; punto.setAttribute('aria-label', 'Señal ' + numero + ', ' + oportunidad.titulo);
      for (const control of [boton,punto]) {
        control.setAttribute('aria-pressed', String(activa === oportunidad));
        control.addEventListener('click', () => { activa = oportunidad; dibujarRadar(); });
      }
      lista.append(boton); senales.append(punto);
    }
    if (activa) {
      ficha.innerHTML = '<strong>' + activa.titulo + '</strong><p>' + activa.region + ' · ' + activa.rubro + '</p><p>Cierra en ' + activa.plazo + ' días · ' + pesos(activa.monto) + '</p>';
      const guardar = document.createElement('button');
      guardar.id = 'guardar-oportunidad'; guardar.type = 'button'; guardar.className = 'accion-demo';
      guardar.textContent = guardadas.has(activa) ? 'Quitar de seguimiento' : 'Guardar en seguimiento';
      guardar.onclick = () => { if (guardadas.has(activa)) guardadas.delete(activa); else guardadas.add(activa); dibujarRadar(); };
      ficha.append(guardar);
    } else {
      ficha.textContent = seguimiento && !guardadas.size ? 'Guarde una oportunidad desde Detectadas para hacerle seguimiento.' : 'Sin coincidencias. Pruebe con otro rubro o región.';
    }
    if (foco && !document.activeElement.id) (id(foco) || id(seguimiento ? 'ver-guardadas' : 'detectar')).focus({preventScroll:true});
  }
  for (const selector of ['rubro','region']) id(selector).addEventListener('change', () => {
    dibujarRadar();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelector('.barrido').animate([{transform:'rotate(0turn)'},{transform:'rotate(1turn)'}],{duration:800,easing:'ease-out'});
    }
  });
  id('detectar').onclick = () => { seguimiento = false; dibujarRadar(); };
  id('ver-guardadas').onclick = () => { seguimiento = true; dibujarRadar(); };
  dibujarRadar();

  const cabanas = [
    {nombre:'Coigüe', tarifa:55000, ocupadas:[8,9]},
    {nombre:'Arrayán', tarifa:68000, ocupadas:[6,7,11]},
    {nombre:'Lenga', tarifa:49000, ocupadas:[5,10,11]},
    {nombre:'Canelo', tarifa:59000, ocupadas:[4,5]},
    {nombre:'Raulí', tarifa:63000, ocupadas:[7,8]},
    {nombre:'Maitén', tarifa:61000, ocupadas:[9,10]},
    {nombre:'Ulmo', tarifa:72000, ocupadas:[6,11]},
  ];
  let unidad = 0;
  const reservas = cabanas.map(() => new Set());
  const llegada = id('llegada'), noches = id('noches');
  for (let dia=4; dia<=10; dia++) llegada.add(new Option(dia + ' de enero',dia));
  llegada.value = '6';
  const selectorCabana = id('elegir-cabana');
  cabanas.forEach((c,i) => selectorCabana.add(new Option((i+1) + ' · ' + c.nombre, i)));
  selectorCabana.onchange = () => { unidad = Number(selectorCabana.value); dibujarCalendario(); };
  function estadia() {
    return Array.from({length:Number(noches.value)}, (_,i) => Number(llegada.value) + i);
  }
  function ocupada(dia) { return cabanas[unidad].ocupadas.includes(dia) || reservas[unidad].has(dia); }
  function dibujarCalendario(mensaje = '') {
    const cabana = cabanas[unidad], dias = estadia(), libre = dias.every(d => !ocupada(d));
    id('nombre-cabana').textContent = 'Cabaña ' + cabana.nombre;
    selectorCabana.value = String(unidad);
    document.querySelectorAll('[data-cabana]').forEach((btn,i) => {
      const disponible = dias.every(d => !cabanas[i].ocupadas.includes(d) && !reservas[i].has(d));
      btn.textContent = (disponible ? '● ' : '× ') + (i+1);
      btn.title = cabanas[i].nombre;
      btn.classList.toggle('sin-cupo', !disponible);
      btn.setAttribute('aria-pressed',String(i===unidad));
      btn.setAttribute('aria-label', cabanas[i].nombre + (disponible ? ', disponible' : ', ocupada') + ' para las fechas elegidas');
    });
    const calendario = id('calendario'); calendario.replaceChildren();
    for (let dia=4; dia<=12; dia++) {
      const celda = document.createElement('span');
      celda.textContent = dia;
      celda.classList.toggle('ocupada',ocupada(dia));
      celda.classList.toggle('elegida',dias.includes(dia));
      celda.setAttribute('aria-label', dia + ' de enero, ' + (ocupada(dia) ? 'ocupada' : 'libre') + (dias.includes(dia) ? ', seleccionada' : ''));
      calendario.append(celda);
    }
    id('reservar').disabled = !libre;
    id('estado-cabana').textContent = mensaje || (libre ?
      'Salida el ' + (dias.at(-1)+1) + ' de enero · Total ' + pesos(dias.length*cabana.tarifa) :
      'La noche del ' + dias.find(ocupada) + ' está ocupada. Cambie la llegada o elija otra cabaña.');
    id('reiniciar-reservas').hidden = !reservas.some(set => set.size);
  }
  for (const pin of document.querySelectorAll('[data-cabana]')) pin.onclick = () => { unidad = Number(pin.dataset.cabana); dibujarCalendario(); };
  llegada.onchange = noches.onchange = () => dibujarCalendario();
  id('reservar').onclick = () => {
    const dias = estadia();
    if (dias.some(ocupada)) return;
    dias.forEach(dia => reservas[unidad].add(dia));
    dibujarCalendario('Reserva simulada en ' + cabanas[unidad].nombre + ' del ' + dias[0] + ' al ' + (dias.at(-1)+1) + ' de enero. Calendario actualizado.');
  };
  id('reiniciar-reservas').onclick = () => { reservas.forEach(s => s.clear()); dibujarCalendario(); id('llegada').focus({preventScroll:true}); };
  dibujarCalendario();

  const servicios = [
    {nombre:'Visita técnica', precio:35000, cantidad:1},
    {nombre:'Hora de instalación', precio:18000, cantidad:2},
    {nombre:'Prueba de equipos', precio:24000, cantidad:0}
  ];
  document.querySelectorAll('input[name="plantilla"]').forEach(radio => {
    radio.addEventListener('change', () => { id('hoja-comercial').dataset.estilo = radio.value; });
  });
  // Como en un visor de impresión, la página conserva su composición al reducirse.
  const visor = document.querySelector('.visor-a4');
  const ajustarPapel = () => visor.style.setProperty('--escala-papel', visor.clientWidth / 350);
  ajustarPapel();
  new ResizeObserver(ajustarPapel).observe(visor);
  let convertida = false;
  function dibujarDocumento() {
    const filas = id('lineas-doc'); filas.replaceChildren();
    let suma = 0;
    servicios.forEach((item,i) => {
      id('menos-' + i).disabled = convertida || item.cantidad===0;
      id('mas-' + i).disabled = convertida || item.cantidad===99;
      id('cantidad-' + i).textContent = item.cantidad;
      if (!item.cantidad) return;
      const importe = item.cantidad*item.precio;
      suma += importe;
      const tr = document.createElement('tr');
      for (const dato of [item.nombre,item.cantidad,pesos(importe)]) tr.insertCell().textContent = dato;
      filas.append(tr);
    });
    id('importe-doc').textContent = pesos(suma);
    id('tipo-doc').textContent = convertida ? 'Orden de venta' : 'Cotización';
    id('folio-doc').textContent = convertida ? 'OV–024' : 'C–024';
    id('sello-doc').hidden = !convertida;
    id('nota-doc').textContent = convertida ? 'Referencia de origen: cotización C–024.' : 'Vigencia de la cotización: 15 días.';
    id('estado-doc').textContent = convertida ? 'Orden creada desde C–024 con los mismos ítems y cantidades.' : suma ? 'Modifique las cantidades para actualizar la cotización.' : 'Agregue al menos un servicio.';
    id('convertir').disabled = suma === 0;
    id('convertir').textContent = convertida ? 'Volver a la cotización' : 'Convertir en orden de venta';
  }
  servicios.forEach((item,i) => {
    const fila = document.createElement('div'); fila.className = 'item-catalogo';
    fila.innerHTML = '<div><b>' + item.nombre + '</b><small>' + pesos(item.precio) + ' por unidad</small></div><div class="stepper"><button id="menos-' + i + '" type="button" aria-label="Quitar una unidad de ' + item.nombre + '">−</button><output id="cantidad-' + i + '"></output><button id="mas-' + i + '" type="button" aria-label="Agregar una unidad de ' + item.nombre + '">+</button></div>';
    id('catalogo-demo').append(fila);
    id('menos-' + i).onclick = () => { item.cantidad--; dibujarDocumento(); };
    id('mas-' + i).onclick = () => { item.cantidad++; dibujarDocumento(); };
  });
  id('convertir').onclick = () => { convertida = !convertida; dibujarDocumento(); };
  dibujarDocumento();
})();
