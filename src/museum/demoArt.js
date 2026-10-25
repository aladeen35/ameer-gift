// Built-in demo paintings (used by trial museums and the template previews). Drawn on canvas, no image files.
/* eslint-disable */
const F_D = "600 %spx 'Reem Kufi','IBM Plex Sans Arabic',Tahoma,sans-serif";
const F_B = "500 %spx 'IBM Plex Sans Arabic',Tahoma,sans-serif";
export const fd = s => F_D.replace("%s", s), fb = s => F_B.replace("%s", s);
export function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
export function star(g,x,y,r,col){g.fillStyle=col;g.beginPath();for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath();g.fill()}
function rnd(seed){let s=seed;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0)>>>0)%10000/10000}
const EMPTY = { text: "صورتك القادمة هنا", dir: "rtl" };
export function setEmptyText(text, dir) { EMPTY.text = text; EMPTY.dir = dir; }
export const PAINT={
  sea(g,w,h){let gr=g.createLinearGradient(0,0,0,h*.6);gr.addColorStop(0,'#1E3D6E');gr.addColorStop(.6,'#C77F4A');gr.addColorStop(1,'#F2C46D');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#FFE3A1';g.beginPath();g.arc(w*.5,h*.6,h*.12,0,7);g.fill();
    gr=g.createLinearGradient(0,h*.6,0,h);gr.addColorStop(0,'#2B4F7E');gr.addColorStop(1,'#13294B');g.fillStyle=gr;g.fillRect(0,h*.6,w,h*.4);
    g.strokeStyle='rgba(255,220,150,.55)';g.lineWidth=3;for(let i=0;i<9;i++){const y=h*.64+i*h*.035,l=w*(.08+.04*(9-i)*.3);g.beginPath();g.moveTo(w*.5-l,y);g.lineTo(w*.5+l,y);g.stroke()}
    g.fillStyle='#0E1B33';g.beginPath();g.moveTo(w*.18,h*.72);g.lineTo(w*.32,h*.72);g.lineTo(w*.29,h*.76);g.lineTo(w*.21,h*.76);g.fill();g.fillRect(w*.245,h*.6,3,h*.12);
    g.beginPath();g.moveTo(w*.25,h*.6);g.lineTo(w*.31,h*.7);g.lineTo(w*.25,h*.7);g.fill()},
  eid(g,w,h){const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0F2140');gr.addColorStop(1,'#1E3D6E');g.fillStyle=gr;g.fillRect(0,0,w,h);
    const r=rnd(7);for(let i=0;i<60;i++){g.fillStyle=`rgba(255,240,200,${.3+r()*.6})`;g.fillRect(r()*w,r()*h*.7,2,2)}
    g.fillStyle='#F3D68A';g.beginPath();g.arc(w*.72,h*.26,h*.13,0,7);g.fill();g.fillStyle='#14284A';g.beginPath();g.arc(w*.76,h*.22,h*.12,0,7);g.fill();
    [[.2,.28],[.38,.42],[.55,.3]].forEach(([x,l])=>{const X=w*x,Y=h*l;g.strokeStyle='#C9A24B';g.lineWidth=2;g.beginPath();g.moveTo(X,0);g.lineTo(X,Y-30);g.stroke();
      g.fillStyle='#C9A24B';g.beginPath();g.moveTo(X-16,Y-30);g.lineTo(X+16,Y-30);g.lineTo(X+22,Y+10);g.lineTo(X,Y+40);g.lineTo(X-22,Y+10);g.closePath();g.fill();
      g.fillStyle='#FFE9B0';g.beginPath();g.moveTo(X-9,Y-20);g.lineTo(X+9,Y-20);g.lineTo(X+12,Y+8);g.lineTo(X,Y+26);g.lineTo(X-12,Y+8);g.closePath();g.fill()});
    g.fillStyle='#0B1730';g.fillRect(0,h*.84,w,h*.16);for(let i=0;i<6;i++){g.fillStyle='#FFD98A';g.fillRect(w*(.1+i*.15),h*.87,10,14)}},
  desert(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0E1B33');gr.addColorStop(.55,'#2B4F7E');gr.addColorStop(1,'#6F86A8');g.fillStyle=gr;g.fillRect(0,0,w,h);
    const r=rnd(3);for(let i=0;i<120;i++){g.fillStyle=`rgba(255,255,255,${r()*.8})`;const s=r()<.1?2.5:1.3;g.fillRect(r()*w,r()*h*.6,s,s)}
    star(g,w*.22,h*.18,9,'#F6E3A8');g.fillStyle='#F8EFD4';g.beginPath();g.arc(w*.78,h*.2,h*.07,0,7);g.fill();
    [['#B8873F',.62,.9],['#9B6E33',.7,.6],['#7D5628',.8,.3]].forEach(([c,y,o])=>{g.fillStyle=c;g.beginPath();g.moveTo(0,h);g.lineTo(0,h*y);
      g.bezierCurveTo(w*.3,h*(y-.12*o),w*.55,h*(y+.06),w,h*(y-.05));g.lineTo(w,h);g.fill()});
    g.fillStyle='#3B2914';g.beginPath();g.moveTo(w*.42,h*.66);g.lineTo(w*.5,h*.6);g.lineTo(w*.58,h*.66);g.fill()},
  garden(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#DCE9F5');gr.addColorStop(1,'#FFF5DE');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#F6D47E';g.beginPath();g.arc(w*.8,h*.22,h*.09,0,7);g.fill();
    g.fillStyle='#8EA35A';g.fillRect(0,h*.78,w,h*.22);g.fillStyle='#6E8443';g.fillRect(0,h*.86,w,h*.14);
    [[.22,.36,1],[.48,.26,1.15],[.7,.42,.85]].forEach(([x,t,s])=>{const X=w*x,top=h*t;g.strokeStyle='#6B4A2E';g.lineWidth=10*s;g.beginPath();g.moveTo(X,h*.82);g.quadraticCurveTo(X+12*s,(h*.82+top)/2,X+4,top);g.stroke();
      g.fillStyle='#3F6B3A';for(let k=0;k<7;k++){const a=-Math.PI+k*Math.PI/6;g.beginPath();g.ellipse(X+4+Math.cos(a)*48*s,top+Math.sin(a)*22*s+10,52*s,11*s,a,0,7);g.fill()}
      g.fillStyle='#B07A2A';for(let k=0;k<4;k++){g.beginPath();g.arc(X-6+k*5,top+16,5,0,7);g.fill()}})},
  grad(g,w,h){g.fillStyle='#EDF1F7';g.fillRect(0,0,w,h);const r=rnd(11);
    for(let i=0;i<70;i++){g.save();g.translate(r()*w,r()*h);g.rotate(r()*3);g.fillStyle=['#C9A24B','#1E3D6E','#4F86C6','#E5C77A'][i%4];g.fillRect(-5,-2.5,10,5);g.restore()}
    const X=w*.5,Y=h*.48;g.fillStyle='#13294B';g.beginPath();g.moveTo(X-130,Y);g.lineTo(X,Y-56);g.lineTo(X+130,Y);g.lineTo(X,Y+56);g.closePath();g.fill();
    g.beginPath();g.moveTo(X-74,Y+24);g.lineTo(X-74,Y+86);g.quadraticCurveTo(X,Y+120,X+74,Y+86);g.lineTo(X+74,Y+24);g.lineTo(X,Y+56);g.closePath();g.fill();
    g.strokeStyle='#C9A24B';g.lineWidth=5;g.beginPath();g.moveTo(X,Y);g.lineTo(X+108,Y+18);g.lineTo(X+108,Y+92);g.stroke();g.fillStyle='#C9A24B';g.beginPath();g.arc(X+108,Y+100,10,0,7);g.fill()},
  school(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#BFD6EE');gr.addColorStop(.6,'#F7E7C3');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#F2B950';g.beginPath();g.arc(w*.5,h*.34,h*.07,0,7);g.fill();
    g.fillStyle='#9DB86D';g.beginPath();g.moveTo(0,h*.55);g.quadraticCurveTo(w*.3,h*.46,w*.55,h*.55);g.quadraticCurveTo(w*.8,h*.62,w,h*.5);g.lineTo(w,h);g.lineTo(0,h);g.fill();
    g.fillStyle='#7F9C53';g.beginPath();g.moveTo(0,h*.66);g.quadraticCurveTo(w*.5,h*.58,w,h*.7);g.lineTo(w,h);g.lineTo(0,h);g.fill();
    g.fillStyle='#EFD9AE';g.beginPath();g.moveTo(w*.46,h*.56);g.lineTo(w*.54,h*.56);g.lineTo(w*.8,h);g.lineTo(w*.2,h);g.closePath();g.fill();
    g.fillStyle='#13294B';g.beginPath();g.arc(w*.5,h*.72,9,0,7);g.fill();g.fillRect(w*.5-7,h*.72+8,14,26);g.fillStyle='#C9A24B';g.fillRect(w*.5-11,h*.72+10,22,18)},
  smile(g,w,h){g.fillStyle='#F7EFE0';g.fillRect(0,0,w,h);const r=rnd(5);
    for(let i=0;i<14;i++){const x=r()*w,y=h*.3+r()*h*.7,s=18+r()*22;g.strokeStyle='#5F7B3E';g.lineWidth=3;g.beginPath();g.moveTo(x,y+s);g.lineTo(x+r()*16-8,h);g.stroke();
      const col=['#C9A24B','#E7A0A0','#4F86C6','#F1F1EC','#D46B5B'][i%5];g.fillStyle=col;for(let k=0;k<6;k++){const a=k*Math.PI/3;g.beginPath();g.ellipse(x+Math.cos(a)*s*.6,y+Math.sin(a)*s*.6,s*.45,s*.28,a,0,7);g.fill()}
      g.fillStyle='#13294B';g.beginPath();g.arc(x,y,s*.25,0,7);g.fill()}},
  family(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#F6D9A8');gr.addColorStop(1,'#FBEFD8');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#F2B950';g.beginPath();g.arc(w*.5,h*.42,h*.2,Math.PI,0);g.fill();g.fillStyle='#C9A24B';g.fillRect(0,h*.42,w,h*.58);g.fillStyle='#B48C3A';g.fillRect(0,h*.62,w,h*.38);
    const fig=(x,s)=>{g.fillStyle='#13294B';g.beginPath();g.arc(x,h*.62-118*s,15*s,0,7);g.fill();g.beginPath();g.moveTo(x-17*s,h*.62-98*s);g.lineTo(x+17*s,h*.62-98*s);g.lineTo(x+21*s,h*.62-36*s);g.lineTo(x-21*s,h*.62-36*s);g.fill();g.fillRect(x-12*s,h*.62-38*s,9*s,40*s);g.fillRect(x+3*s,h*.62-38*s,9*s,40*s)};
    const P=[[.26,1],[.42,.66],[.58,.62],[.74,.95]];g.strokeStyle='#13294B';g.lineWidth=5;g.beginPath();P.forEach(([x,s],i)=>{const X=w*x,Y=h*.62-80*s;i?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke();P.forEach(([x,s])=>fig(w*x,s))},
  kite(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#4F86C6');gr.addColorStop(1,'#CFE0F2');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,255,255,.9)';[[.2,.25,1],[.75,.4,.8]].forEach(([x,y,s])=>{[0,1,2].forEach(i=>{g.beginPath();g.arc(w*x+i*34*s,h*y-(i%2)*14*s,30*s,0,7);g.fill()})});
    const X=w*.62,Y=h*.3;g.fillStyle='#C9A24B';g.beginPath();g.moveTo(X,Y-70);g.lineTo(X+48,Y);g.lineTo(X,Y+80);g.lineTo(X-48,Y);g.closePath();g.fill();g.strokeStyle='#13294B';g.lineWidth=3;g.beginPath();g.moveTo(X,Y-70);g.lineTo(X,Y+80);g.moveTo(X-48,Y);g.lineTo(X+48,Y);g.stroke();
    g.beginPath();g.moveTo(X,Y+80);for(let i=1;i<9;i++)g.lineTo(X+Math.sin(i)*18,Y+80+i*14);g.stroke();g.lineWidth=1.5;g.beginPath();g.moveTo(X,Y+80);g.quadraticCurveTo(w*.4,h*.8,w*.25,h);g.stroke();
    g.fillStyle='#7F9C53';g.fillRect(0,h*.88,w,h*.12)},
  home(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1A2C55');gr.addColorStop(.7,'#5B4C7A');gr.addColorStop(1,'#C98A5B');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#F8EFD4';g.beginPath();g.arc(w*.8,h*.18,26,0,7);g.fill();g.fillStyle='#1A2C55';g.beginPath();g.arc(w*.83,h*.16,24,0,7);g.fill();
    g.fillStyle='#0F1B33';g.fillRect(0,h*.82,w,h*.18);const X=w*.42,Y=h*.82;g.fillStyle='#E9DCC0';g.fillRect(X-130,Y-170,260,170);g.fillStyle='#8A5A3A';g.beginPath();g.moveTo(X-150,Y-170);g.lineTo(X,Y-260);g.lineTo(X+150,Y-170);g.fill();
    g.fillStyle='#FFD98A';[[-80,-120],[40,-120]].forEach(([dx,dy])=>g.fillRect(X+dx,Y+dy,46,46));g.fillStyle='#13294B';g.fillRect(X-22,Y-80,44,80)},
  cake(g,w,h){g.fillStyle='#EDF1F7';g.fillRect(0,0,w,h);const r=rnd(19);for(let i=0;i<40;i++){g.fillStyle=['#C9A24B','#4F86C6','#E7A0A0'][i%3];g.beginPath();g.arc(r()*w,r()*h*.45,3+r()*3,0,7);g.fill()}
    const X=w*.5,B=h*.86;g.fillStyle='#D9D2C4';g.fillRect(X-170,B,340,12);[[150,90,'#13294B'],[110,80,'#C9A24B'],[72,60,'#1E3D6E']].reduce((y,[hw,hh,c])=>{g.fillStyle=c;g.fillRect(X-hw,y-hh,hw*2,hh);g.fillStyle='rgba(255,255,255,.75)';for(let k=-hw;k<hw;k+=22){g.beginPath();g.arc(X+k+11,y-hh,11,0,Math.PI);g.fill()}return y-hh},B);
    for(let i=-2;i<=2;i++){const cx=X+i*24,top=B-230-20;g.fillStyle='#F1F1EC';g.fillRect(cx-4,top,8,22);g.fillStyle='#F2B950';g.beginPath();g.ellipse(cx,top-8,5,10,0,0,7);g.fill()}},
  heart(g,w,h){g.fillStyle='#0F2140';g.fillRect(0,0,w,h);const r=rnd(23);for(let i=0;i<90;i++){g.fillStyle=`rgba(255,255,255,${r()*.5})`;g.fillRect(r()*w,r()*h,1.5,1.5)}
    for(let i=0;i<46;i++){const t=i/46*Math.PI*2;const x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);star(g,w/2+x*11,h*.48-y*11,4+r()*5,i%3?'#F3DFA6':'#C9A24B')}},
  rain(g,w,h){let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#6F86A8');gr.addColorStop(1,'#B9C7DA');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;const r=rnd(31);for(let i=0;i<110;i++){const x=r()*w,y=r()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x-6,y+18);g.stroke()}
    g.fillStyle='#55657E';g.fillRect(0,h*.84,w,h*.16);const X=w*.5,Y=h*.46;g.fillStyle='#C9A24B';g.beginPath();g.arc(X,Y,120,Math.PI,0);g.fill();g.fillStyle='#6F86A8';for(let k=-3;k<3;k++){g.beginPath();g.arc(X-100+k*0+ (k+3)*40,Y,20,Math.PI,0);g.fill()}
    g.strokeStyle='#13294B';g.lineWidth=5;g.beginPath();g.moveTo(X,Y-120);g.lineTo(X,Y+110);g.arc(X+14,Y+110,14,Math.PI,0,true);g.stroke();
    g.fillStyle='#13294B';[[X-46,.9],[X+40,.62]].forEach(([x,s])=>{g.beginPath();g.arc(x,h*.84-150*s,16*s,0,7);g.fill();g.fillRect(x-18*s,h*.84-130*s,36*s,130*s)})},
  empty(g,w,h){g.fillStyle='#F5F7FB';g.fillRect(0,0,w,h);g.setLineDash([14,10]);g.strokeStyle='#C9A24B';g.lineWidth=4;g.strokeRect(26,26,w-52,h-52);g.setLineDash([]);
    g.strokeStyle='#13294B';g.lineWidth=5;g.strokeRect(w/2-50,h/2-62,100,70);g.beginPath();g.arc(w/2,h/2-27,20,0,7);g.stroke();
    g.fillStyle='#13294B';g.textAlign='center';g.direction=EMPTY.dir;g.font=fd(30);g.fillText(EMPTY.text,w/2,h/2+60)}
};
export const DEMO_ARTS=[
  {k:'school',t:'أول يوم في المدرسة',y:2018,p:true,c:'حقيبة أكبر مني، ويدك تمسك يدي حتى باب الفصل.'},
  {k:'sea',t:'رحلة العائلة إلى البحر',y:2020,c:'غروب طويل، وأنتِ تقولين: لن ننسى هذا اليوم أبدًا.'},
  {k:'eid',t:'عيد الفطر في البيت',y:2021,c:'فوانيس صغيرة علّقناها معًا، ورائحة الكعك في كل الغرف.'},
  {k:'desert',t:'ليلة في الصحراء',y:2022,c:'عددنا النجوم حتى نمنا، وغطّيتِني بشالك.'},
  {k:'garden',t:'حديقة جدّي',y:2023,c:'تحت النخلة نفسها التي جلستِ تحتها وأنتِ صغيرة.'},
  {k:'grad',t:'يوم تخرّجي',y:2024,c:'كل سهرة ذاكرتِ فيها معي كانت في هذه القبعة.'},
  {k:'smile',t:'ضحكتك',y:2025,p:true,c:'أجمل ما في البيت، وأجمل ما في هذا المعرض.'},
  {k:'empty',t:'ذكرى لم نصنعها بعد',y:2026,c:'هذا المكان محجوز لصورتنا القادمة معًا.'},
  {k:'family',t:'صورة العائلة الكاملة',y:2019,c:'أول صورة جمعتنا كلنا، وأنتِ في المنتصف كالعادة.'},
  {k:'kite',t:'طائرة الورق',y:2017,p:true,c:'صنعتِها لي من ورق الجرائد، وطارت أعلى من كل الطائرات.'},
  {k:'home',t:'بيتنا القديم',y:2016,c:'النافذة المضاءة كانت تعني أنكِ تنتظرينني.'},
  {k:'cake',t:'عيد ميلادي العاشر',y:2019,p:true,c:'كعكة بالشوكولاتة خبزتِها رغم التعب.'},
  {k:'heart',t:'سماء من أجلك',y:2025,c:'لو جمعتُ كل النجوم لما وفّت حقك.'},
  {k:'rain',t:'يوم المطر',y:2022,c:'نسيتُ المظلة، فجئتِ بها إلى باب المدرسة.'}
];
export const DEMO_EN={"school": ["First day of school", "A bag bigger than me, and your hand holding mine to the classroom door."], "sea": ["Family trip to the sea", "A long sunset, and you saying: we will never forget this day."], "eid": ["Eid al-Fitr at home", "Little lanterns we hung together, and the smell of kahk in every room."], "desert": ["A night in the desert", "We counted stars until we fell asleep, and you covered me with your shawl."], "garden": ["Grandpa's garden", "Under the same palm tree you sat beneath as a little girl."], "grad": ["My graduation day", "Every late night you studied with me is in this cap."], "smile": ["Your smile", "The most beautiful thing at home, and in this museum."], "empty": ["A memory we haven't made yet", "This spot is saved for our next photo together."], "family": ["The whole family", "The first photo of all of us, with you in the middle as always."], "kite": ["The paper kite", "You made it from newspaper, and it flew higher than all the others."], "home": ["Our old house", "A lit window meant you were waiting for me."], "cake": ["My tenth birthday", "A chocolate cake you baked even though you were tired."], "heart": ["A sky for you", "Even all the stars would not be enough to thank you."], "rain": ["The rainy day", "I forgot my umbrella, so you brought it to the school gate."]};
// Demo memories become the same shape as customer photos: {id, title, titleEn, caption, captionEn, date, paint}
export function demoPhotos() {
  return DEMO_ARTS.map(a => ({ id: a.k, paint: a.k, portrait: !!a.p, title: a.t, titleEn: DEMO_EN[a.k][0], caption: a.c, captionEn: DEMO_EN[a.k][1], date: a.y + "-06-01" }))
    .sort((x, y) => x.date.localeCompare(y.date));
}
export function paintCanvas(key, portrait) {
  const W = portrait ? 480 : 640, H = portrait ? 640 : 480; const [c, g] = cv(W, H); PAINT[key](g, W, H);
  g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2); return c;
}
