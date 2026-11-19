/* Electrical Basic Simulator V3 - SMK Maharati, Teknik Alat Berat */
const NS='http://www.w3.org/2000/svg',W=1400,H=850,GRID=10;
const catalog=[
 ['battery','Baterai','B','12 V'],['fuse','Fuse','F','10 A'],['switch','Switch SPST','SW','OFF'],['relay','Relay','K','12 V coil'],['lamp','Rotary lamp','L','12 V / 5 W'],['diode','Dioda','D','1N4007'],['resistor','Resistor','R','1 kΩ'],['ldr','LDR','R','10 kΩ'],['avometer','Avometer','M','DMM'],['fan','Fan / Motor DC','M','12 V'],['pot','Potensiometer','RV','10 kΩ'],['ne555','IC NE555','U','Timer'],['button','Push button','S','NO']
];
const defaults={battery:{voltage:12},fuse:{rating:10,blown:false},switch:{closed:false},relay:{closed:false,coilVoltage:12},lamp:{ratedVoltage:12,watts:5},diode:{enabled:true},resistor:{ohms:1000},ldr:{light:50},avometer:{},fan:{ratedVoltage:12,watts:2},pot:{ohms:10000,position:50},ne555:{frequency:2,duty:50,enabled:true},button:{pressed:false}};
let parts=[],wires=[],selected=null,wireStart=null,mode='wire',meterActive=false,powered=false,zoom=1,meterMode='V',probeRed=null,probeBlack=null,lastSolution=null,undoStack=[],redoStack=[],nextId=1,toastTimer;
const $=id=>document.getElementById(id),svg=$('schematic'),wireLayer=$('wireLayer'),flowLayer=$('flowLayer'),componentLayer=$('componentLayer'),overlayLayer=$('overlayLayer');
function el(tag,attrs={},parent){let n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(parent)parent.appendChild(n);return n}
function ln(g,x1,y1,x2,y2,cl='symbol-stroke'){return el('line',{x1,y1,x2,y2,class:cl},g)}
function pth(g,d,cl='symbol-stroke'){return el('path',{d,class:cl},g)}
function circ(g,x,y,r,cl='symbol-stroke'){return el('circle',{cx:x,cy:y,r,class:cl},g)}
function rect(g,x,y,w,h,cl='symbol-fill',rx=0){return el('rect',{x,y,width:w,height:h,rx,class:cl},g)}
function txt(g,x,y,s,cl='symbol-text',anchor='middle'){let n=el('text',{x,y,class:cl,'text-anchor':anchor},g);n.textContent=s;return n}
function clone(o){return JSON.parse(JSON.stringify(o))}
function snap(v){return Math.round(v/GRID)*GRID}
function toast(s){let t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300)}
function snapshot(){undoStack.push(JSON.stringify({parts,wires,nextId}));if(undoStack.length>50)undoStack.shift();redoStack=[]}
function restore(raw){let d=JSON.parse(raw);parts=d.parts;wires=d.wires;nextId=d.nextId;selected=null;powered=false;solveAndRender(false)}
function addPart(type){snapshot();let d=catalog.find(x=>x[0]===type),count=parts.length,p={id:nextId++,type,ref:d[2]+(parts.filter(x=>x.type===type).length+1),name:d[1],x:snap(300+(count%4)*210),y:snap(190+Math.floor(count/4)*155),rotation:0,...clone(defaults[type])};parts.push(p);selected=p.id;render();updateInspector();$('componentCount').textContent=parts.length;toast(p.name+' ditambahkan')}
function pinOffsets(p){if(p.type==='ne555')return [[-30,-30],[-30,-10],[-30,10],[-30,30],[30,30],[30,10],[30,-10],[30,-30]];return [[-40,0],[40,0]]}
function pinPos(p,i){let [dx,dy]=pinOffsets(p)[i];let a=(p.rotation||0)*Math.PI/180;return{x:p.x+dx*Math.cos(a)-dy*Math.sin(a),y:p.y+dx*Math.sin(a)+dy*Math.cos(a)}}
function pinName(p,i){if(p.type==='ne555')return ['GND','TRIG','OUT','RESET','CTRL','THR','DISCH','VCC'][i];return i===0?'+ / A':'− / K'}
function drawSymbol(g,p){let x=p.x,y=p.y;let a=(x1,y1,x2,y2)=>ln(g,x+x1,y+y1,x+x2,y+y2),c=(xx,yy,r,cl)=>circ(g,x+xx,y+yy,r,cl),t=(xx,yy,s,cl,anc)=>txt(g,x+xx,y+yy,s,cl,anc);
 switch(p.type){
 case'battery':a(-40,0,-12,0);a(12,0,40,0);a(-12,-20,12,-20);a(-12,20,12,20);a(-6,-29,6,-29);a(-6,29,6,29);t(0,-35,'+');t(0,43,'−');break;
 case'fuse':a(-40,0,-20,0);a(20,0,40,0);rect(g,x-20,y-10,40,20,'symbol-fill',2);if(p.blown){pth(g,`M${x-15} ${y+13} l30 -26`,'symbol-stroke')}break;
 case'switch':a(-40,0,-13,0);a(13,0,40,0);c(-13,0,3);c(13,0,3);ln(g,x-13,y,x+(p.closed?13:8),y+(p.closed?0:-17));break;
 case'relay':a(-40,0,-25,0);a(25,0,40,0);rect(g,x-25,y-19,50,38,'symbol-fill',3);pth(g,`M${x-16} ${y+9} q16 -30 32 0`);t(0,4,'K');break;
 case'lamp':a(-40,0,-24,0);a(24,0,40,0);c(0,0,24,'symbol-fill');c(0,0,31,'lamp-glow');pth(g,`M${x-12} ${y+13} Q${x-22} ${y-14} ${x} ${y-12} Q${x+22} ${y-8} ${x+12} ${y+13} Q${x} ${y+22} ${x-12} ${y+13}`);break;
 case'diode':a(-40,0,-14,0);a(14,0,40,0);pth(g,`M${x-14} ${y-15} L${x+14} ${y} L${x-14} ${y+15} Z`,'symbol-fill');a(14,-17,14,17);break;
 case'resistor':a(-40,0,-24,0);a(24,0,40,0);pth(g,`M${x-24} ${y} l6 -11 l8 22 l8 -22 l8 22 l8 -11`);break;
 case'ldr':a(-40,0,-24,0);a(24,0,40,0);c(0,0,24);pth(g,`M${x-12} ${y+12} L${x+12} ${y-12} M${x-18} ${y-24} l-9 -9 m9 9 l-1 -10 M${x} ${y-25} l-9 -9 m9 9 l-1 -10`);break;
 case'avometer':a(-40,0,-27,0);a(27,0,40,0);rect(g,x-27,y-21,54,42,'symbol-fill',4);pth(g,`M${x-17} ${y+9} Q${x} ${y-17} ${x+17} ${y+9}`);ln(g,x,y+8,x+9,y-7);break;
 case'fan':a(-40,0,-25,0);a(25,0,40,0);c(0,0,24);for(let i=0;i<4;i++){let an=i*Math.PI/2;pth(g,`M${x} ${y} Q${x+Math.cos(an)*7-Math.sin(an)*12} ${y+Math.sin(an)*7+Math.cos(an)*12} ${x+Math.cos(an)*19} ${y+Math.sin(an)*19}`)}break;
 case'pot':a(-40,0,-25,0);a(25,0,40,0);pth(g,`M${x-25} ${y} l6 -11 l8 22 l8 -22 l8 11`);ln(g,x,y-31,x,y-9);pth(g,`M${x-5} ${y-16} L${x} ${y-9} L${x+5} ${y-16}`);break;
 case'ne555':rect(g,x-30,y-36,60,72,'symbol-fill',3);t(0,5,'NE555','ref-text');break;
 case'button':a(-40,0,-13,0);a(13,0,40,0);c(-13,0,3);c(13,0,3);ln(g,x-13,y,x+13,y-16);ln(g,x+13,y-16,x+13,y-25);break;
 }}
function partValue(p){switch(p.type){case'battery':return p.voltage+' V';case'fuse':return p.rating+' A'+(p.blown?' • PUTUS':'');case'switch':return p.closed?'ON':'OFF';case'relay':return p.closed?'AKTIF':'12 V COIL';case'lamp':return p.ratedVoltage+' V / '+p.watts+' W';case'resistor':return fmtOhm(p.ohms);case'ldr':return 'Cahaya '+p.light+'%';case'pot':return fmtOhm(p.ohms)+' • '+p.position+'%';case'fan':return p.ratedVoltage+' V / '+p.watts+' W';case'ne555':return p.frequency+' Hz';case'button':return p.pressed?'PRESSED':'NO';default:return p.value||''}}
function fmtOhm(v){return v>=1000?(v/1000).toFixed(v%1000?1:0)+' kΩ':v+' Ω'}
function render(){wireLayer.innerHTML='';flowLayer.innerHTML='';componentLayer.innerHTML='';overlayLayer.innerHTML='';$('canvasEmpty').style.display=parts.length?'none':'flex';$('componentCount').textContent=parts.length;
 wires.forEach((w,i)=>{let a=parts.find(p=>p.id===w.a),b=parts.find(p=>p.id===w.b);if(!a||!b)return;let q=pinPos(a,w.ai),r=pinPos(b,w.bi),mx=snap((q.x+r.x)/2);let d=`M${q.x},${q.y} H${mx} V${r.y} H${r.x}`;let active=powered&&lastSolution?.energizedWires?.has(i);pth(wireLayer,d,'wire-line'+(active?' live':''));if(active){let dot=el('circle',{cx:q.x,cy:q.y,r:3.5,class:'flow-dot'},flowLayer);el('animateMotion',{dur:'1.3s',repeatCount:'indefinite',path:d},dot);let dot2=el('circle',{cx:r.x,cy:r.y,r:3,class:'flow-dot'},flowLayer);el('animateMotion',{dur:'1.3s',begin:'-.65s',repeatCount:'indefinite',path:d},dot2)}});
 parts.forEach(p=>{let g=el('g',{class:'component'+(selected===p.id?' selected':'')+(p.type==='lamp'&&p.on?' lamp-on':'')},componentLayer);let frame=el('rect',{x:p.x-58,y:p.y-59,width:116,height:118,rx:5,class:'select-frame'},g);let inner=el('g',{transform:`rotate(${p.rotation||0} ${p.x} ${p.y})`},g);drawSymbol(inner,p);txt(g,p.x,p.y-47,p.ref,'ref-text');txt(g,p.x,p.y+52,partValue(p),'value-text');if(p.on)txt(g,p.x,p.y+65,'● ENERGIZED','part-status');
 pinOffsets(p).forEach((_,i)=>{let q=pinPos(p,i);let n=el('circle',{cx:q.x,cy:q.y,r:5.5,class:'terminal'+(wireStart&&wireStart.id===p.id&&wireStart.pin===i?' pending':'')+(i===1?' negative':'')},g);n.addEventListener('click',e=>{e.stopPropagation();if(mode==='wire')connectPin(p.id,i);else if(meterActive)meterPick(p.id,i);else selectPart(p.id)});n.appendChild(document.createElementNS(NS,'title')).textContent=pinName(p,i)});g.addEventListener('click',()=>{if(mode==='select')selectPart(p.id)});g.addEventListener('pointerdown',e=>{if(e.target.classList.contains('terminal'))return;if(mode==='wire'&&e.target.closest('.component')){selectPart(p.id);return}dragPart(e,p,g)});});
 if(wireStart){let p=parts.find(x=>x.id===wireStart.id);if(p){let q=pinPos(p,wireStart.pin);pth(overlayLayer,`M${q.x},${q.y} L${q.x+30},${q.y} L${q.x+30},${q.y+30}`,'wire-line live')}}}
function dragPart(e,p,g){if(mode!=='select')return;snapshot();let sx=e.clientX,sy=e.clientY,ox=p.x,oy=p.y,r=svg.getBoundingClientRect(),scaleX=1400/r.width,scaleY=850/r.height;g.setPointerCapture(e.pointerId);let move=ev=>{p.x=Math.max(70,Math.min(1330,snap(ox+(ev.clientX-sx)*scaleX)));p.y=Math.max(80,Math.min(800,snap(oy+(ev.clientY-sy)*scaleY)));render()};let up=()=>{g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);};g.addEventListener('pointermove',move);g.addEventListener('pointerup',up)}
function connectPin(id,pin){if(!wireStart){wireStart={id,pin};render();toast('Pilih terminal tujuan');return}if(wireStart.id===id&&wireStart.pin===pin){wireStart=null;render();return}if(wires.some(w=>(w.a===wireStart.id&&w.ai===wireStart.pin&&w.b===id&&w.bi===pin)||(w.b===wireStart.id&&w.bi===wireStart.pin&&w.a===id&&w.ai===pin))){toast('Kabel sudah terpasang');wireStart=null;render();return}snapshot();wires.push({a:wireStart.id,ai:wireStart.pin,b:id,bi:pin});wireStart=null;powered=false;lastSolution=null;render();toast('Kabel berhasil dipasang')}
function selectPart(id){selected=id;render();updateInspector()}
function updateInspector(){let box=$('inspector'),p=parts.find(x=>x.id===selected);if(!p){box.innerHTML='<div class="empty-inspector"><div>⌖</div>Pilih komponen pada lembar kerja untuk mengatur nilainya.</div>';return}
 let h=`<div class="prop-title">${p.name}</div><div class="prop-ref">${p.ref} • ID ${p.id}</div>`;
 const field=(k,label,min=0,max=100000,step=1)=>{h+=`<div class="field"><label>${label}</label><input type="number" min="${min}" max="${max}" step="${step}" data-key="${k}" value="${p[k]}"></div>`};
 const check=(k,label)=>{h+=`<div class="field"><label><input type="checkbox" data-key="${k}" ${p[k]?'checked':''}> ${label}</label></div>`};
 if(p.type==='battery')field('voltage','Tegangan nominal (V)',1,48,.1);
 if(p.type==='fuse'){field('rating','Rating fuse (A)',.1,100,.1);check('blown','Simulasikan fuse putus')}
 if(p.type==='switch')check('closed','Kontak tertutup (ON)');
 if(p.type==='relay'){field('coilVoltage','Tegangan kumparan (V)',3,48,.1);check('closed','Paksa kontak relay tertutup (mode latihan)')}
 if(p.type==='lamp'){field('ratedVoltage','Tegangan nominal (V)',1,48,.1);field('watts','Daya nominal (W)',.1,200,.1)}
 if(p.type==='resistor')field('ohms','Hambatan (Ω)',.1,10000000,.1);
 if(p.type==='ldr')field('light','Intensitas cahaya (%)',1,100,1);
 if(p.type==='pot'){field('ohms','Hambatan total (Ω)',1,1000000,1);field('position','Posisi wiper (%)',0,100,1)}
 if(p.type==='fan'){field('ratedVoltage','Tegangan nominal (V)',1,48,.1);field('watts','Daya nominal (W)',.1,100,.1)}
 if(p.type==='ne555'){field('frequency','Frekuensi output (Hz)',.1,100000,.1);field('duty','Duty cycle (%)',1,99,1);check('enabled','Aktifkan osilator')}
 if(p.type==='button')check('pressed','Tombol ditekan');
 if(p.type==='diode')h+='<div class="field"><small class="help">Model dioda silikon dengan tegangan maju sekitar 0,7 V. Polaritas terminal mengikuti simbol.</small></div>';
 if(p.type==='avometer')h+='<div class="field"><small class="help">Gunakan tab Avometer untuk menempatkan probe pada dua titik rangkaian.</small></div>';
 h+=`<div class="field"><label>Rotasi</label><select id="rotationSelect"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div><div class="prop-buttons"><button class="secondary" id="duplicateBtn">Duplikat</button><button class="secondary" id="deletePartBtn">Hapus</button></div>`;
 box.innerHTML=h;$('rotationSelect').value=p.rotation||0;$('rotationSelect').onchange=()=>{snapshot();p.rotation=Number($('rotationSelect').value);render()};
 box.querySelectorAll('[data-key]').forEach(inp=>inp.onchange=()=>{snapshot();p[inp.dataset.key]=inp.type==='checkbox'?inp.checked:Number(inp.value);powered=false;render();updateInspector()});
 $('deletePartBtn').onclick=()=>{snapshot();parts=parts.filter(x=>x.id!==p.id);wires=wires.filter(w=>w.a!==p.id&&w.b!==p.id);selected=null;powered=false;render();updateInspector()};
 $('duplicateBtn').onclick=()=>{snapshot();let q={...clone(p),id:nextId++,x:p.x+100,y:p.y+80,ref:p.ref+' copy'};parts.push(q);selected=q.id;render();updateInspector()};
}
function unionFind(n){let par=Array.from({length:n},(_,i)=>i);return{find(x){while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x},join(a,b){a=this.find(a);b=this.find(b);if(a!==b)par[b]=a}}}
function solveLinear(A,b){let n=b.length;A=A.map((r,i)=>[...r,b[i]]);for(let i=0;i<n;i++){let max=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[max][i]))max=j;[A[i],A[max]]=[A[max],A[i]];if(Math.abs(A[i][i])<1e-12)throw Error('Matriks singular');let d=A[i][i];for(let k=i;k<=n;k++)A[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){let f=A[j][i];for(let k=i;k<=n;k++)A[j][k]-=f*A[i][k]}}return A.map(r=>r[n])}
function effectiveR(p){switch(p.type){case'resistor':return p.ohms;case'ldr':return 100000/Math.max(1,p.light);case'pot':return Math.max(1,p.ohms*p.position/100);case'lamp':return p.ratedVoltage*p.ratedVoltage/p.watts;case'fan':return p.ratedVoltage*p.ratedVoltage/p.watts;case'fuse':return p.blown?1e9:.03;case'switch':return p.closed?.02:1e9;case'button':return p.pressed?.02:1e9;case'relay':return p.closed?.02:1e9;default:return null}}
function runSolver(){let pinMap=new Map(),idx=0;parts.forEach(p=>pinOffsets(p).forEach((_,i)=>pinMap.set(p.id+':'+i,idx++)));let uf=unionFind(idx);wires.forEach(w=>{let a=pinMap.get(w.a+':'+w.ai),b=pinMap.get(w.b+':'+w.bi);if(a!==undefined&&b!==undefined)uf.join(a,b)});
 let roots=[...new Set([...pinMap.values()].map(x=>uf.find(x)))],ground=roots[0],nodes=roots.filter(x=>x!==ground),nodeIndex=new Map(nodes.map((x,i)=>[x,i]));
 const node=(p,i)=>uf.find(pinMap.get(p.id+':'+i));let sources=parts.filter(p=>p.type==='battery'),resistors=[],diodes=[];
 parts.forEach(p=>{let n1=node(p,0),n2=node(p,1);if(p.type==='diode')diodes.push({p,n1,n2});else{let r=effectiveR(p);if(r!==null&&r<1e8)resistors.push({p,n1,n2,r})}});
 let activeDiodes=new Set(),solution=null;
 for(let iter=0;iter<8;iter++){let n=nodes.length+sources.length,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);nodes.forEach((_,i)=>A[i][i]+=1e-9); // tiny reference leakage keeps unused floating parts numerically solvable
 const stampR=(n1,n2,r)=>{let g=1/Math.max(r,1e-9),i=nodeIndex.get(n1),j=nodeIndex.get(n2);if(i!==undefined)A[i][i]+=g;if(j!==undefined)A[j][j]+=g;if(i!==undefined&&j!==undefined){A[i][j]-=g;A[j][i]-=g}};
 const stampI=(n1,n2,I)=>{let i=nodeIndex.get(n1),j=nodeIndex.get(n2);if(i!==undefined)b[i]-=I;if(j!==undefined)b[j]+=I};
 const stampV=(n1,n2,V,k)=>{let row=nodes.length+k,i=nodeIndex.get(n1),j=nodeIndex.get(n2);if(i!==undefined){A[i][row]+=1;A[row][i]+=1}if(j!==undefined){A[j][row]-=1;A[row][j]-=1}b[row]=V};
 resistors.forEach(r=>stampR(r.n1,r.n2,r.r));diodes.forEach(d=>stampR(d.n1,d.n2,activeDiodes.has(d.p.id)?.12:1e9));sources.forEach((s,k)=>stampV(node(s,0),node(s,1),s.voltage,k));
 try{let x=solveLinear(A,b);solution={x,nodes,nodeIndex,ground,roots,pinMap,uf,sources,resistors,diodes};let changed=false;diodes.forEach(d=>{let v=voltageAt(solution,d.n1)-voltageAt(solution,d.n2),on=v>.65;if(on!==activeDiodes.has(d.p.id)){if(on)activeDiodes.add(d.p.id);else activeDiodes.delete(d.p.id);changed=true}});if(!changed)break}catch(e){return{error:'Rangkaian tidak dapat diselesaikan. Periksa sambungan, polaritas, dan kemungkinan sumber tegangan saling bertentangan.',roots,ground}}
 }
 function voltageAt(sol,n){let i=sol.nodeIndex.get(n);return i===undefined?0:sol.x[i]}
 solution.voltageAt=voltageAt;solution.partVoltage=p=>voltageAt(solution,node(p,0))-voltageAt(solution,node(p,1));solution.partCurrent=p=>{let r=effectiveR(p);if(r!==null&&r<1e8)return solution.partVoltage(p)/r;if(p.type==='diode')return activeDiodes.has(p.id)?solution.partVoltage(p)/.12:0;return 0};
 solution.activeDiodes=activeDiodes;solution.wireNodes=wires.map(w=>[node(parts.find(p=>p.id===w.a),w.ai),node(parts.find(p=>p.id===w.b),w.bi)]);
 let totalCurrent=sources.reduce((s,p,k)=>s+Math.abs(solution.x[nodes.length+k]),0),voltage=sources[0]?.voltage||0;
 let connected=roots.length<idx,energizedWires=new Set();if(totalCurrent>1e-7)wires.forEach((w,i)=>energizedWires.add(i));
 return{...solution,totalCurrent,voltage,totalPower:voltage*totalCurrent,energizedWires,connected};
}
function updateMeters(){if(!lastSolution){$('meterReading').textContent='0.000';return}if(meterMode==='R'){$('meterReading').textContent=probeRed&&probeBlack?'—':'OL';return}if(probeRed&&probeBlack){let a=lastSolution.pinMap.get(probeRed.id+':'+probeRed.pin),b=lastSolution.pinMap.get(probeBlack.id+':'+probeBlack.pin);if(a!==undefined&&b!==undefined){let va=lastSolution.voltageAt(lastSolution.uf.find(a)),vb=lastSolution.voltageAt(lastSolution.uf.find(b)),v=va-vb;$('meterReading').textContent=(meterMode==='V'?v:lastSolution.totalCurrent).toFixed(3);return}}$('meterReading').textContent=(meterMode==='V'?lastSolution.voltage:lastSolution.totalCurrent).toFixed(3)}
function meterPick(id,pin){if(!probeRed){probeRed={id,pin};$('probeRed').textContent='Merah: '+parts.find(p=>p.id===id).ref+' / '+pinName(parts.find(p=>p.id===id),pin)}else{probeBlack={id,pin};$('probeBlack').textContent='Hitam: '+parts.find(p=>p.id===id).ref+' / '+pinName(parts.find(p=>p.id===id),pin)}updateMeters();toast('Probe avometer diperbarui')}
function solveAndRender(show=true){powered=show;lastSolution=show?runSolver():null;if(show&&lastSolution&&!lastSolution.error){parts.forEach(p=>{p.on=false;if(['lamp','fan'].includes(p.type)){let v=Math.abs(lastSolution.partVoltage(p)),r=effectiveR(p);p.on=v>1&&r<1e8}if(p.type==='diode')p.on=lastSolution.activeDiodes.has(p.id);if(p.type==='relay')p.on=Math.abs(lastSolution.partCurrent(p))>.03;if(p.type==='ne555')p.on=p.enabled});}
 $('statusIndicator').classList.toggle('on',show&&!lastSolution?.error);$('statusText').textContent=show?(lastSolution?.error?'Analisis gagal':'Simulasi DC aktif'):'Mode desain';
 $('analysisSubtitle').textContent=show?'Analisis nodal DC • hasil perhitungan rangkaian':'Hasil simulasi akan muncul setelah Run DC';
 $('metricVoltage').innerHTML=show&&!lastSolution?.error?lastSolution.voltage.toFixed(2)+' <em>V</em>':'— <em>V</em>';$('metricCurrent').innerHTML=show&&!lastSolution?.error?lastSolution.totalCurrent.toFixed(3)+' <em>A</em>':'— <em>A</em>';$('metricPower').innerHTML=show&&!lastSolution?.error?lastSolution.totalPower.toFixed(2)+' <em>W</em>':'— <em>W</em>';
 $('metricState').textContent=!show?'Belum diuji':lastSolution?.error?'Error':lastSolution.totalCurrent<1e-6?'Tidak ada arus':'Tersimulasi';
 $('diagnostics').textContent=!show?'Tambahkan baterai dan beban, hubungkan terminal dengan kabel, lalu jalankan simulasi.':lastSolution?.error||diagnose(lastSolution);
 render();updateMeters()}
function diagnose(sol){let fuses=parts.filter(p=>p.type==='fuse'&&!p.blown&&Math.abs(sol.partCurrent(p))>p.rating);if(fuses.length)return'Peringatan: arus melebihi rating '+fuses.map(p=>p.ref).join(', ')+'. Fuse belum otomatis putus; periksa rating dan beban.';let lamps=parts.filter(p=>p.type==='lamp'&&p.on);return lamps.length?'Rangkaian terselesaikan. '+lamps.map(p=>p.ref+' menyala').join(', ')+'. Nilai dihitung menggunakan analisis nodal DC.':'Analisis selesai. Tidak ada lampu yang menyala; periksa kontinuitas kabel, sakelar, polaritas baterai, dan beban.'}
function setMode(m){mode=m;$('wireBtn').classList.toggle('active',m==='wire');$('selectBtn').classList.toggle('active',m==='select');svg.style.cursor=m==='wire'?'crosshair':'default';toast(m==='wire'?'Mode kabel: pilih dua terminal':'Mode pilih: seret komponen untuk memindahkan')}
function initLibrary(){
 const root=$('componentLibrary');
 if(!root) return;
 root.replaceChildren();
 const glyph={battery:'▤',fuse:'▱',switch:'⏻',relay:'▣',lamp:'◉',diode:'▷|',resistor:'〰',ldr:'☼',avometer:'◫',fan:'✥',pot:'◩',ne555:'▥',button:'●'};
 catalog.forEach(d=>{
   const b=document.createElement('button'); b.type='button'; b.className='lib-item';
   b.dataset.name=(d[0]+' '+d[1]+' '+d[2]+' '+d[3]).toLocaleLowerCase('id');
   b.innerHTML=`<span class="lib-symbol" aria-hidden="true">${glyph[d[0]]||'◇'}</span><span class="lib-label">${d[1]}</span>`;
   b.addEventListener('click',()=>addPart(d[0])); root.appendChild(b);
 });
 filterLibrary($('searchParts')?.value||'');
}
function filterLibrary(value){
 const query=String(value||'').trim().toLocaleLowerCase('id');
 document.querySelectorAll('#componentLibrary .lib-item').forEach(b=>{
   const name=(b.dataset.name||'').toLocaleLowerCase('id');
   const visible=!query||name.includes(query)||name.replace(/[^a-z0-9]/g,'').includes(query.replace(/[^a-z0-9]/g,''));
   b.hidden=!visible;
 });
 const visibleCount=[...document.querySelectorAll('#componentLibrary .lib-item')].filter(b=>!b.hidden).length;
 let empty=$('libraryNoResults');
 if(!empty){empty=document.createElement('div');empty.id='libraryNoResults';empty.className='library-no-results';empty.textContent='Komponen tidak ditemukan. Coba kata kunci lain.';$('componentLibrary').after(empty)}
 empty.hidden=visibleCount>0;
}
$('searchParts').addEventListener('input',e=>filterLibrary(e.target.value));
$('wireBtn').onclick=()=>setMode('wire');$('selectBtn').onclick=()=>setMode('select');$('runBtn').onclick=()=>{if(!parts.some(p=>p.type==='battery')){toast('Tambahkan baterai terlebih dahulu');return}solveAndRender(true)};$('stopBtn').onclick=()=>solveAndRender(false);
$('newBtn').onclick=()=>{if(confirm('Mulai rangkaian baru? Semua komponen pada lembar kerja akan dihapus.')){snapshot();parts=[];wires=[];selected=null;solveAndRender(false);updateInspector()}};
$('rotateBtn').onclick=()=>{let p=parts.find(x=>x.id===selected);if(p){snapshot();p.rotation=(p.rotation+90)%360;render();updateInspector()}else toast('Pilih komponen terlebih dahulu')};
$('deleteBtn').onclick=()=>{let p=parts.find(x=>x.id===selected);if(!p)return;snapshot();parts=parts.filter(x=>x.id!==p.id);wires=wires.filter(w=>w.a!==p.id&&w.b!==p.id);selected=null;solveAndRender(false);updateInspector()};
$('undoBtn').onclick=()=>{if(!undoStack.length)return;redoStack.push(JSON.stringify({parts,wires,nextId}));restore(undoStack.pop())};$('redoBtn').onclick=()=>{if(!redoStack.length)return;undoStack.push(JSON.stringify({parts,wires,nextId}));restore(redoStack.pop())};
$('zoomIn').onclick=()=>{zoom=Math.min(1.7,zoom+.1);svg.style.transform=`scale(${zoom})`};$('zoomOut').onclick=()=>{zoom=Math.max(.6,zoom-.1);svg.style.transform=`scale(${zoom})`};$('zoomFit').onclick=()=>{zoom=1;svg.style.transform='scale(1)'};
$('saveBtn').onclick=()=>{let blob=new Blob([JSON.stringify({app:'Electrical Basic Simulator',version:3,parts,wires},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rangkaian-smk-maharati.json';a.click();URL.revokeObjectURL(a.href);toast('File rangkaian disimpan')};
$('loadBtn').onclick=()=>$('fileInput').click();$('fileInput').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);if(!Array.isArray(d.parts)||!Array.isArray(d.wires))throw Error();snapshot();parts=d.parts;wires=d.wires;nextId=Math.max(0,...parts.map(p=>p.id))+1;solveAndRender(false);updateInspector();toast('Rangkaian berhasil dibuka')}catch(err){toast('File rangkaian tidak valid')}};r.readAsText(f)};
$('exportBtn').onclick=()=>{let cloneSvg=svg.cloneNode(true);cloneSvg.setAttribute('xmlns',NS);let data=new XMLSerializer().serializeToString(cloneSvg),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'})),img=new Image();img.onload=()=>{let c=document.createElement('canvas');c.width=1400;c.height=850;c.getContext('2d').drawImage(img,0,0);c.toBlob(blob=>{let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='skematik-smk-maharati.png';a.click()});URL.revokeObjectURL(url)};img.src=url};
document.querySelectorAll('.right-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.right-tab').forEach(x=>x.classList.toggle('active',x===b));meterActive=b.dataset.right==='meter';$('propertiesPane').classList.toggle('hidden',b.dataset.right!=='properties');$('meterPane').classList.toggle('hidden',b.dataset.right!=='meter')});
document.querySelectorAll('.meter-mode').forEach(b=>b.onclick=()=>{meterMode=b.dataset.mode;document.querySelectorAll('.meter-mode').forEach(x=>x.classList.toggle('active',x===b));$('meterModeLabel').textContent=meterMode==='V'?'DC VOLTAGE':meterMode==='A'?'DC CURRENT':'RESISTANCE';$('meterUnit').textContent=meterMode==='R'?'Ω':meterMode;updateMeters()});
$('clearProbes').onclick=()=>{probeRed=probeBlack=null;$('probeRed').textContent='Merah: belum dipilih';$('probeBlack').textContent='Hitam: belum dipilih';updateMeters()};
svg.addEventListener('mousemove',e=>{let r=svg.getBoundingClientRect(),x=Math.round((e.clientX-r.left)/r.width*W),y=Math.round((e.clientY-r.top)/r.height*H);$('coords').textContent=`X: ${x} • Y: ${y}`});
document.querySelectorAll('.menuitem').forEach(b=>b.onclick=()=>{document.querySelectorAll('.menuitem').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.tab==='learn')showGuide();else toast('Kembali ke lembar Schematic')});
function showGuide(){toast('Panduan: tambahkan baterai, switch, dan lampu; hubungkan terminal membentuk loop tertutup, ON-kan switch, lalu RUN DC.')}
initLibrary();render();updateInspector();