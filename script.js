
/* =====================================================
   ELECTRICAL BASIC SIMULATOR
   TEKNIK ALAT BERAT - SMK MAHARATI
   Version 1.0
===================================================== */

const $ = id => document.getElementById(id);

const svgNS = 'http://www.w3.org/2000/svg';

const svg = $('circuitCanvas');
const componentLayer = $('componentLayer');
const wireLayer = $('wireLayer');
const terminalLayer = $('terminalLayer');

const W = 1600;
const H = 1000;
const GRID = 20;

let parts = [];
let wires = [];
let selected = null;
let pendingTerminal = null;
let nextId = 1;
let running = false;
let zoom = 1;
let meterMode = 'V';

/* =====================================================
   1. COMPONENT LIBRARY
===================================================== */

const catalog = [
  {
    type:'battery', name:'Baterai', ref:'B',
    symbol:'battery', terminals:[[-50,0],[50,0]],
    defaults:{voltage:12}
  },
  {
    type:'fuse', name:'Fuse', ref:'F',
    terminals:[[-40,0],[40,0]],
    defaults:{rating:10,blown:false}
  },
  {
    type:'switch', name:'Switch', ref:'SW',
    terminals:[[-40,0],[40,0]],
    defaults:{closed:false}
  },
  {
    type:'relay', name:'Relay', ref:'K',
    terminals:[[-55,-25],[-55,25],[55,0]],
    defaults:{voltage:12,closed:false}
  },
  {
    type:'rotary', name:'Rotary Lamp', ref:'RL',
    terminals:[[-45,0],[45,0]],
    defaults:{voltage:12,resistance:24}
  },
  {
    type:'lamp', name:'Lamp', ref:'L',
    terminals:[[-45,0],[45,0]],
    defaults:{voltage:12,resistance:24}
  },
  {
    type:'led', name:'LED', ref:'D',
    terminals:[[-45,0],[45,0]],
    defaults:{color:'red',voltage:2,resistance:470}
  },
  {
    type:'diode', name:'Dioda', ref:'D',
    terminals:[[-45,0],[45,0]],
    defaults:{forwardVoltage:0.7}
  },
  {
    type:'resistor', name:'Resistor', ref:'R',
    terminals:[[-45,0],[45,0]],
    defaults:{resistance:1000}
  },
  {
    type:'ldr', name:'LDR', ref:'LDR',
    terminals:[[-45,0],[45,0]],
    defaults:{resistance:10000,light:50}
  },
  {
    type:'avometer', name:'Avometer', ref:'M',
    terminals:[[-45,0],[45,0]],
    defaults:{mode:'V'}
  },
  {
    type:'fan', name:'Fan', ref:'FAN',
    terminals:[[-45,0],[45,0]],
    defaults:{voltage:12,resistance:30}
  },
  {
    type:'pot', name:'Potensiometer', ref:'VR',
    terminals:[[-50,0],[50,0],[0,-45]],
    defaults:{resistance:10000,position:50}
  },
  {
    type:'ne555', name:'IC NE555', ref:'IC',
    terminals:[
      [-55,-35],[-55,-12],[-55,12],[-55,35],
      [55,-35],[55,-12],[55,12],[55,35]
    ],
    defaults:{voltage:5,frequency:1,duty:50}
  },
  {
    type:'button', name:'Button', ref:'PB',
    terminals:[[-40,0],[40,0]],
    defaults:{pressed:false}
  }
];

const partNames = Object.fromEntries(
  catalog.map(c => [c.type,c.name])
);

const paletteSymbols = {
  battery:'<path d="M-15 -12 H15 M-8 -4 H8 M-15 5 H15 M-8 13 H8" />',
  fuse:'<rect x="-19" y="-9" width="38" height="18" rx="3"/>',
  switch:'<path d="M-20 0 H-5 M-5 0 L15 -13 M15 0 H20"/>',
  relay:'<rect x="-19" y="-15" width="38" height="30"/><path d="M-15 0 L15 -10"/>',
  rotary:'<circle r="17"/><path d="M-12 0 Q0 -15 12 0 Q0 15 -12 0"/>',
  lamp:'<circle r="17"/><path d="M-10 -10 L10 10 M10 -10 L-10 10"/>',
  led:'<path d="M-15 -12 L10 0 L-15 12 Z M10 -12 V12 M-3 -20 L8 -28 M8 -28 L5 -21 M8 -28 L1 -28"/>',
  diode:'<path d="M-15 -12 L10 0 L-15 12 Z M10 -13 V13"/>',
  resistor:'<path d="M-20 0 L-15 -9 L-7 9 L1 -9 L9 9 L15 -9 L20 0"/>',
  ldr:'<circle r="15"/><path d="M-8 -23 L-20 -35 M-20 -35 L-10 -33 M-20 -35 L-18 -25 M0 -25 L-10 -37"/>',
  avometer:'<rect x="-18" y="-18" width="36" height="36" rx="4"/><path d="M-10 5 Q0 -13 10 5"/>',
  fan:'<circle r="16"/><path d="M0 0 Q-15 -22 -4 -13 Q8 -5 0 0 M0 0 Q22 -15 13 -4 Q5 8 0 0 M0 0 Q15 22 4 13 Q-8 5 0 0"/>',
  pot:'<rect x="-17" y="-10" width="34" height="20"/><path d="M0 -25 V-10 M-5 -16 L0 -10 L5 -16"/>',
  ne555:'<rect x="-20" y="-20" width="40" height="40" rx="3"/><text x="0" y="5" text-anchor="middle" font-size="11">555</text>',
  button:'<circle r="14"/><path d="M-8 -8 L8 8 M-8 8 L8 -8"/>'
};

/* =====================================================
   2. BASIC HELPERS
===================================================== */

function snap(n) {
  return Math.round(n / GRID) * GRID;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getDefinition(type) {
  return catalog.find(c => c.type === type);
}

function makeSVG(tag, attrs={}) {
  const el = document.createElementNS(svgNS,tag);

  Object.entries(attrs).forEach(([key,value]) => {
    el.setAttribute(key,value);
  });

  return el;
}

function addSVG(parent,tag,attrs={}) {
  const el = makeSVG(tag,attrs);
  parent.appendChild(el);
  return el;
}

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    t.classList.remove('show');
  },2200);
}

function getPart(id) {
  return parts.find(p => p.id === id);
}

function getSelected() {
  return getPart(selected);
}

/* =====================================================
   3. LIBRARY DRAG AND DROP
===================================================== */

function initLibrary() {
  const root = $('componentLibrary');
  root.innerHTML = '';

  catalog.forEach(def => {
    const card = document.createElement('div');
    card.className = 'lib-item';
    card.dataset.type = def.type;

    const symbol = document.createElement('div');
    symbol.className = 'lib-symbol';

    symbol.innerHTML = `
      <svg viewBox="-35 -40 70 80"
           xmlns="http://www.w3.org/2000/svg"
           fill="none"
           stroke="#173957"
           stroke-width="2.5"
           stroke-linecap="round"
           stroke-linejoin="round">
        ${paletteSymbols[def.type]}
      </svg>`;

    const label = document.createElement('div');
    label.className = 'lib-label';
    label.textContent = def.name;

    const hint = document.createElement('small');
    hint.className = 'lib-hint';
    hint.textContent = 'SERET KE AREA KERJA';

    card.append(symbol,label,hint);

    card.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();

      const ghost = card.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.width = card.offsetWidth + 'px';
      ghost.style.height = card.offsetHeight + 'px';
      ghost.style.zIndex = '99999';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '.9';
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      ghost.style.transform = 'translate(-50%,-50%)';

      document.body.appendChild(ghost);

      $('canvasShell').classList.add('drop-ready');

      const move = ev => {
        ghost.style.left = ev.clientX + 'px';
        ghost.style.top = ev.clientY + 'px';
      };

      const end = ev => {
        document.removeEventListener('pointermove',move);
        document.removeEventListener('pointerup',end);
        document.removeEventListener('pointercancel',cancel);

        ghost.remove();
        $('canvasShell').classList.remove('drop-ready');

        const rect = svg.getBoundingClientRect();

        if (
          ev.clientX >= rect.left &&
          ev.clientX <= rect.right &&
          ev.clientY >= rect.top &&
          ev.clientY <= rect.bottom
        ) {
          const x = (ev.clientX - rect.left) / rect.width * W;
          const y = (ev.clientY - rect.top) / rect.height * H;

          addPart(def.type,x,y);
        }
      };

      const cancel = () => {
        document.removeEventListener('pointermove',move);
        document.removeEventListener('pointerup',end);
        ghost.remove();
        $('canvasShell').classList.remove('drop-ready');
      };

      document.addEventListener('pointermove',move);
      document.addEventListener('pointerup',end);
      document.addEventListener('pointercancel',cancel);
    });

    root.appendChild(card);
  });

  $('partCount').textContent = catalog.length;
}

/* =====================================================
   4. ADD COMPONENT
===================================================== */

function addPart(type,x=300,y=200) {
  const def = getDefinition(type);
  if (!def) return;

  const index = parts.filter(p => p.type === type).length + 1;

  const p = {
    id:nextId++,
    type,
    name:def.name,
    ref:def.ref + index,
    x:snap(x),
    y:snap(y),
    rotation:0,
    ...clone(def.defaults)
  };

  parts.push(p);
  selected = p.id;

  render();
  updateInspector();

  toast(def.name + ' ditambahkan');
}

/* =====================================================
   5. COMPONENT SYMBOL DRAWING
===================================================== */

function drawPart(group,p) {
  const line = (x1,y1,x2,y2) => addSVG(group,'line',{
    x1,y1,x2,y2,class:'part-shape'
  });

  const rect = (x,y,w,h,rx=0) => addSVG(group,'rect',{
    x,y,width:w,height:h,rx,class:'part-shape'
  });

  const circle = (cx,cy,r) => addSVG(group,'circle',{
    cx,cy,r,class:'part-shape'
  });

  const path = d => addSVG(group,'path',{
    d,class:'part-shape'
  });

  switch(p.type) {

    case 'battery':
      line(-50,0,-12,0);
      line(12,0,50,0);
      line(-12,-19,-12,19);
      line(12,-10,12,10);
      addSVG(group,'text',{x:-17,y:-25,'font-size':12}).textContent='+';
      addSVG(group,'text',{x:7,y:29,'font-size':12}).textContent='−';
      break;

    case 'fuse':
      line(-40,0,-19,0);
      line(19,0,40,0);
      rect(-19,-11,38,22,3);
      line(-12,0,12,0);
      break;

    case 'switch':
      line(-40,0,-7,0);
      line(7,0,40,0);
      circle(-7,0,3);
      circle(7,0,3);

      if(p.closed) {
        line(-7,0,7,0);
      } else {
        line(-7,0,12,-20);
      }
      break;

    case 'relay':
      rect(-30,-22,60,44,3);
      path('M-18 -7 L18 -16');
      line(-55,-25,-30,-25);
      line(-55,25,-30,25);
      line(30,0,55,0);
      addSVG(group,'text',{
        x:0,y:5,'text-anchor':'middle','font-size':10
      }).textContent='COIL';
      break;

    case 'rotary':
    case 'lamp':
      line(-45,0,-18,0);
      line(18,0,45,0);
      circle(0,0,18);
      path('M-11 -11 L11 11 M11 -11 L-11 11');
      break;

    case 'led':
      line(-45,0,-15,0);
      line(12,0,45,0);
      path('M-15 -14 L12 0 L-15 14 Z');
      line(12,-14,12,14);
      path('M-2 -22 L8 -32 M8 -32 L3 -31 M8 -32 L6 -26');
      path('M7 -17 L17 -27 M17 -27 L12 -26 M17 -27 L15 -21');
      break;

    case 'diode':
      line(-45,0,-15,0);
      line(12,0,45,0);
      path('M-15 -15 L12 0 L-15 15 Z');
      line(12,-16,12,16);
      break;

    case 'resistor':
      line(-45,0,-25,0);
      line(25,0,45,0);
      path('M-25 0 L-18 -12 L-7 12 L4 -12 L15 12 L25 0');
      break;

    case 'ldr':
      line(-45,0,-18,0);
      line(18,0,45,0);
      circle(0,0,18);
      path('M-11 -11 L11 11 M11 -11 L-11 11');
      path('M-14 -27 L-25 -39 M-25 -39 L-15 -37 M-25 -39 L-23 -29');
      path('M1 -29 L-9 -41 M-9 -41 L1 -39 M-9 -41 L-7 -31');
      break;

    case 'avometer':
      line(-45,0,-20,0);
      line(20,0,45,0);
      rect(-20,-24,40,48,4);
      path('M-12 9 Q0 -17 12 9');
      line(0,0,8,-11);
      addSVG(group,'text',{
        x:0,y:20,'text-anchor':'middle','font-size':9
      }).textContent='V/A';
      break;

    case 'fan':
      line(-45,0,-18,0);
      line(18,0,45,0);
      circle(0,0,18);
      path('M0 0 Q-15 -25 -4 -13 Q7 -7 0 0');
      path('M0 0 Q25 -15 13 -4 Q7 7 0 0');
      path('M0 0 Q15 25 4 13 Q-7 7 0 0');
      circle(0,0,3);
      break;

    case 'pot':
      line(-50,0,-20,0);
      line(20,0,50,0);
      line(0,-45,0,-13);
      rect(-20,-13,40,26);
      path('M-5 -30 L0 -20 L5 -30');
      break;

    case 'ne555':
      rect(-38,-48,76,96,4);

      for(let i=0;i<4;i++) {
        line(-55,-35+i*23,-38,-35+i*23);
        line(38,-35+i*23,55,-35+i*23);
      }

      addSVG(group,'text',{
        x:0,y:-5,'text-anchor':'middle',
        'font-size':17,'font-weight':'bold'
      }).textContent='NE555';

      addSVG(group,'text',{
        x:0,y:13,'text-anchor':'middle',
        'font-size':10
      }).textContent='TIMER';
      break;

    case 'button':
      line(-40,0,-9,0);
      line(9,0,40,0);
      circle(0,0,10);
      line(0,-10,0,-25);
      if(p.pressed) line(-9,0,9,0);
      break;
  }

  // Component reference and value
  addSVG(group,'text',{
    x:0,y:48,
    class:'part-label',
    'text-anchor':'middle'
  }).textContent=p.ref;

  addSVG(group,'text',{
    x:0,y:65,
    class:'part-value',
    'text-anchor':'middle'
  }).textContent=getPartValue(p);

  if(p.type === 'ne555') {
    const labels = ['GND','TRIG','OUT','RESET',
                    'VCC','DISCH','THR','CTRL'];

    labels.forEach((label,i) => {
      const left = i < 4;
      const n = i % 4;

      addSVG(group,'text',{
        x:left?-58:58,
        y:-31+n*23,
        'text-anchor':left?'end':'start',
        'font-size':8
      }).textContent=label;
    });
  }
}

function getPartValue(p) {
  if(p.type === 'battery') return p.voltage+' V';
  if(p.type === 'resistor') return p.resistance+' Ω';
  if(p.type === 'fuse') return p.rating+' A';
  if(p.type === 'lamp' || p.type === 'rotary') return p.voltage+' V';
  if(p.type === 'led') return p.color+' LED';
  if(p.type === 'ldr') return p.resistance+' Ω';
  if(p.type === 'fan') return p.voltage+' V';
  if(p.type === 'pot') return p.resistance+' Ω';
  if(p.type === 'ne555') return p.frequency+' Hz';
  if(p.type === 'switch') return p.closed?'CLOSED':'OPEN';
  if(p.type === 'button') return p.pressed?'PRESSED':'OPEN';
  return '';
}

/* =====================================================
   6. COMPONENT TERMINALS
===================================================== */

function terminalPosition(p,index) {
  const def = getDefinition(p.type);
  const t = def.terminals[index];

  const angle = p.rotation * Math.PI / 180;

  const x = t[0] * Math.cos(angle) - t[1] * Math.sin(angle);
  const y = t[0] * Math.sin(angle) + t[1] * Math.cos(angle);

  return {x:p.x+x,y:p.y+y};
}

/* =====================================================
   7. RENDER COMPONENTS
===================================================== */

function render() {
  componentLayer.innerHTML = '';
  terminalLayer.innerHTML = '';
  wireLayer.innerHTML = '';

  wires.forEach((w,index) => drawWire(w,index));

  parts.forEach(p => {
    const g = addSVG(componentLayer,'g',{
      class:'component-group'+(p.id===selected?' selected':''),
      transform:`translate(${p.x} ${p.y}) rotate(${p.rotation})`,
      'data-id':p.id
    });

    addSVG(g,'rect',{
      x:-65,y:-55,width:130,height:130,rx:5,
      class:'selection-outline'
    });

    drawPart(g,p);

    const def = getDefinition(p.type);

    def.terminals.forEach((t,index) => {
      const pos = terminalPosition(p,index);

      const terminal = addSVG(terminalLayer,'circle',{
        cx:pos.x,cy:pos.y,r:6,
        class:'terminal',
        'data-part':p.id,
        'data-terminal':index
      });

      if(pendingTerminal &&
         pendingTerminal.part===p.id &&
         pendingTerminal.terminal===index) {
        terminal.classList.add('pending');
      }
    });

    g.addEventListener('pointerdown',e => {
      if(e.button!==0) return;

      e.stopPropagation();

      if(e.target.classList.contains('terminal')) return;

      selected = p.id;
      updateInspector();
      render();

      const startX = e.clientX;
      const startY = e.clientY;
      const originalX = p.x;
      const originalY = p.y;
      let moved = false;

      const move = ev => {
        const dx = (ev.clientX-startX) / svg.getBoundingClientRect().width * W;
        const dy = (ev.clientY-startY) / svg.getBoundingClientRect().height * H;

        if(Math.abs(dx)+Math.abs(dy)>3) moved=true;

        if(moved) {
          p.x = snap(originalX+dx);
          p.y = snap(originalY+dy);
          render();
        }
      };

      const up = () => {
        document.removeEventListener('pointermove',move);
        document.removeEventListener('pointerup',up);

        if(moved) {
          updateInspector();
        }
      };

      document.addEventListener('pointermove',move);
      document.addEventListener('pointerup',up);
    });
  });

  $('partCount').textContent = catalog.length;
  $('wireStatus').textContent = 'Wire: '+wires.length;
  $('selectionStatus').textContent = selected
    ? (getSelected()?.ref || 'Komponen')
    : 'Tidak ada komponen dipilih';
}

/* =====================================================
   8. WIRING SYSTEM
===================================================== */

terminalLayer.addEventListener('click',e => {
  const target = e.target.closest('.terminal');
  if(!target) return;

  const part = Number(target.dataset.part);
  const terminal = Number(target.dataset.terminal);

  if(!pendingTerminal) {
    pendingTerminal = {part,terminal};
    render();
    toast('Pilih terminal tujuan');
    return;
  }

  if(
    pendingTerminal.part===part &&
    pendingTerminal.terminal===terminal
  ) {
    pendingTerminal=null;
    render();
    return;
  }

  const duplicate = wires.some(w =>
    (w.a.part===pendingTerminal.part &&
     w.a.terminal===pendingTerminal.terminal &&
     w.b.part===part && w.b.terminal===terminal) ||
    (w.b.part===pendingTerminal.part &&
     w.b.terminal===pendingTerminal.terminal &&
     w.a.part===part && w.a.terminal===terminal)
  );

  if(!duplicate) {
    wires.push({
      id:Date.now()+Math.random(),
      a:{...pendingTerminal},
      b:{part,terminal}
    });
    toast('Kabel berhasil disambungkan');
  }

  pendingTerminal=null;
  render();
});

function drawWire(w,index) {
  const a = getPart(w.a.part);
  const b = getPart(w.b.part);

  if(!a || !b) return;

  const p1 = terminalPosition(a,w.a.terminal);
  const p2 = terminalPosition(b,w.b.terminal);

  const midX = snap((p1.x+p2.x)/2);

  const d = `M ${p1.x} ${p1.y}
             L ${midX} ${p1.y}
             L ${midX} ${p2.y}
             L ${p2.x} ${p2.y}`;

  const path = addSVG(wireLayer,'path',{
    d,
    class:'wire-path'+(running?' powered':''),
    'data-wire':index
  });

  path.addEventListener('click',e => {
    e.stopPropagation();
    if(confirm('Hapus kabel ini?')) {
      wires.splice(index,1);
      render();
    }
  });
}

/* =====================================================
   9. SIMULATION CONTROL
===================================================== */

function runSimulation() {
  if(running) return;

  running=true;

  $('simulationStatus').textContent='SIMULASI BERJALAN';
  $('simulationStatus').classList.add('running');
  $('runBtn').classList.add('active');

  const battery = parts.find(p=>p.type==='battery');

  $('voltageStatus').textContent =
    'DC: '+(battery ? battery.voltage : 0)+' V';

  render();
  updateMeter();

  toast('Simulasi dijalankan');
}

function stopSimulation() {
  running=false;

  $('simulationStatus').textContent='SIMULASI BERHENTI';
  $('simulationStatus').classList.remove('running');
  $('runBtn').classList.remove('active');

  render();
  updateMeter();

  toast('Simulasi dihentikan');
}

/* =====================================================
   10. INSPECTOR / PROPERTIES
===================================================== */

function updateInspector() {
  const p = getSelected();
  const root = $('inspectorContent');

  if(!p) {
    root.innerHTML=`
      <div class="empty-inspector">
        <div>⚙</div>
        Pilih komponen untuk mengatur nilainya.
      </div>`;
    return;
  }

  const fields = {
    battery:[
      ['voltage','Tegangan (V)','number']
    ],
    fuse:[
      ['rating','Rating Fuse (A)','number'],
      ['blown','Fuse putus','checkbox']
    ],
    switch:[
      ['closed','Kontak tertutup','checkbox']
    ],
    relay:[
      ['voltage','Tegangan coil (V)','number'],
      ['closed','Kontak tertutup','checkbox']
    ],
    rotary:[
      ['voltage','Tegangan (V)','number'],
      ['resistance','Hambatan (Ω)','number']
    ],
    lamp:[
      ['voltage','Tegangan (V)','number'],
      ['resistance','Hambatan (Ω)','number']
    ],
    led:[
      ['color','Warna LED','select'],
      ['voltage','Tegangan maju (V)','number'],
      ['resistance','Resistor seri (Ω)','number']
    ],
    diode:[
      ['forwardVoltage','Tegangan maju (V)','number']
    ],
    resistor:[
      ['resistance','Hambatan (Ω)','number']
    ],
    ldr:[
      ['resistance','Hambatan gelap (Ω)','number'],
      ['light','Intensitas cahaya (%)','range']
    ],
    avometer:[
      ['mode','Mode pengukuran','select']
    ],
    fan:[
      ['voltage','Tegangan (V)','number'],
      ['resistance','Hambatan (Ω)','number']
    ],
    pot:[
      ['resistance','Hambatan total (Ω)','number'],
      ['position','Posisi (%)','range']
    ],
    ne555:[
      ['voltage','Supply (V)','number'],
      ['frequency','Frekuensi (Hz)','number'],
      ['duty','Duty Cycle (%)','range']
    ],
    button:[
      ['pressed','Tombol ditekan','checkbox']
    ]
  };

  let html=`
    <div class="property-form">
      <div>
        <strong>${p.name}</strong>
        <div style="font-size:11px;color:#8495a6">${p.ref}</div>
      </div>`;

  (fields[p.type]||[]).forEach(([key,label,type])=>{
    const value=p[key];

    html+=`<label>${label}`;

    if(type==='checkbox') {
      html+=`
        <input type="checkbox" data-prop="${key}"
          ${value?'checked':''}>`;
    } else if(type==='select') {
      const opts = key==='color'
        ? ['red','green','yellow','blue','white']
        : ['V','A','R'];

      html+=`<select data-prop="${key}">`;

      opts.forEach(o=>{
        html+=`<option value="${o}" ${o===value?'selected':''}>${o}</option>`;
      });

      html+='</select>';
    } else {
      html+=`
        <input type="${type}" data-prop="${key}"
          value="${value}"
          ${type==='range'?'min="0" max="100"':''}
          ${type==='number'?'min="0" step="any"':''}>`;
    }

    html+='</label>';
  });

  html+=`
    <label>Referensi
      <input value="${p.ref}" id="refInput">
    </label>
    <button id="applyProperties">TERAPKAN</button>
    <button id="deleteSelected" class="danger">HAPUS KOMPONEN</button>
  </div>`;

  root.innerHTML=html;

  $('applyProperties').onclick=()=>{
    root.querySelectorAll('[data-prop]').forEach(input=>{
      const key=input.dataset.prop;

      p[key]=input.type==='checkbox'
        ? input.checked
        : input.type==='number'||input.type==='range'
          ? Number(input.value)
          : input.value;
    });

    p.ref=$('refInput').value.trim()||p.ref;

    stopSimulation();
    render();
    updateInspector();
    toast('Properties diperbarui');
  };

  $('deleteSelected').onclick=deleteSelected;
}

/* =====================================================
   11. DELETE COMPONENT
===================================================== */

function deleteSelected() {
  if(!selected) return;

  parts=parts.filter(p=>p.id!==selected);
  wires=wires.filter(w=>
    w.a.part!==selected && w.b.part!==selected
  );

  selected=null;
  pendingTerminal=null;

  render();
  updateInspector();

  toast('Komponen dihapus');
}

/* =====================================================
   12. ROTATION
===================================================== */

function rotateSelected() {
  const p=getSelected();
  if(!p) return;

  p.rotation=(p.rotation+90)%360;

  render();
  updateInspector();
}

/* =====================================================
   13. METER
===================================================== */

function updateMeter() {
  const battery=parts.find(p=>p.type==='battery');

  let value=0;
  let unit='V DC';
  let info='Belum ada pengukuran.';

  if(meterMode==='V') {
    value=running && battery ? battery.voltage : 0;
    unit='V DC';
    info=running
      ? 'Tegangan sumber baterai.'
      : 'Jalankan simulasi untuk membaca tegangan.';
  }

  if(meterMode==='A') {
    value=0;
    unit='A DC';
    info='Pengukuran arus membutuhkan rangkaian tertutup dan analisis jalur.';
  }

  if(meterMode==='R') {
    value=0;
    unit='Ω';
    info='Pilih titik ukur untuk pengukuran resistansi.';
  }

  $('meterValue').textContent=Number(value).toFixed(2);
  $('meterUnit').textContent=unit;
  $('meterInfo').textContent=info;
}

document.querySelectorAll('[data-meter]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    meterMode=btn.dataset.meter;

    document.querySelectorAll('[data-meter]').forEach(b=>
      b.classList.toggle('active',b===btn)
    );

    updateMeter();
  });
});

/* =====================================================
   14. TOOLBAR EVENTS
===================================================== */

$('runBtn').onclick=runSimulation;
$('stopBtn').onclick=stopSimulation;
$('deleteBtn').onclick=deleteSelected;
$('rotateBtn').onclick=rotateSelected;

$('wireBtn').onclick=()=>{
  pendingTerminal=null;
  toast('Klik terminal pertama, lalu terminal kedua');
};

$('clearBtn').onclick=()=>{
  if(!confirm('Hapus semua komponen dan kabel?')) return;

  parts=[];
  wires=[];
  selected=null;
  pendingTerminal=null;

  stopSimulation();
  render();
  updateInspector();

  toast('Lembar kerja dibersihkan');
};

/* =====================================================
   15. ZOOM
===================================================== */

function applyZoom() {
  svg.style.width=(100*zoom)+'%';
  $('zoomValue').textContent=Math.round(zoom*100)+'%';
}

$('zoomIn').onclick=()=>{
  zoom=Math.min(zoom+.1,2);
  applyZoom();
};

$('zoomOut').onclick=()=>{
  zoom=Math.max(zoom-.1,.5);
  applyZoom();
};

$('zoomReset').onclick=()=>{
  zoom=1;
  applyZoom();
};

/* =====================================================
   16. SAVE AND OPEN
===================================================== */

$('saveBtn').onclick=()=>{
  const data={
    version:1,
    parts,
    wires,
    nextId
  };

  const blob=new Blob(
    [JSON.stringify(data,null,2)],
    {type:'application/json'}
  );

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');

  a.href=url;
  a.download='Maharati-Electrical-Circuit.json';
  a.click();

  URL.revokeObjectURL(url);

  toast('Rangkaian disimpan');
};

$('openBtn').onclick=()=>{
  $('fileInput').click();
};

$('fileInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file) return;

  const reader=new FileReader();

  reader.onload=()=>{
    try {
      const data=JSON.parse(reader.result);

      if(!Array.isArray(data.parts)||!Array.isArray(data.wires)) {
        throw new Error('Format file tidak sesuai');
      }

      parts=data.parts;
      wires=data.wires;
      nextId=data.nextId||1;

      selected=null;
      pendingTerminal=null;

      stopSimulation();
      render();
      updateInspector();

      toast('Rangkaian berhasil dibuka');
    } catch(err) {
      alert('File rangkaian tidak valid.');
    }
  };

  reader.readAsText(file);
  e.target.value='';
};

/* =====================================================
   17. EXPORT SVG
===================================================== */

$('exportBtn').onclick=()=>{
  const copy=svg.cloneNode(true);

  copy.setAttribute('xmlns',svgNS);
  copy.setAttribute('width',W);
  copy.setAttribute('height',H);

  copy.querySelectorAll('.selection-outline').forEach(e=>e.remove());

  const blob=new Blob(
    [new XMLSerializer().serializeToString(copy)],
    {type:'image/svg+xml'}
  );

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');

  a.href=url;
  a.download='SMK-Maharati-Schematic.svg';
  a.click();

  URL.revokeObjectURL(url);

  toast('Skematik diekspor');
};

/* =====================================================
   18. CANVAS EVENTS
===================================================== */

svg.addEventListener('click',e=>{
  if(e.target===svg || e.target.tagName==='rect' &&
     e.target.parentNode===svg) {
    selected=null;
    pendingTerminal=null;
    render();
    updateInspector();
  }
});

/* =====================================================
   19. INITIALIZATION
===================================================== */

function initialize() {
  initLibrary();
  render();
  updateInspector();
  updateMeter();

  document.querySelector('[data-meter="V"]')
    .classList.add('active');

  $('simulationStatus').textContent='SIMULASI BERHENTI';

  console.log('Electrical Basic Simulator - SMK Maharati Ready');
}

initialize();
