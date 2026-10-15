const N=require('../needs.js');let ok=0,n=0;const A=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const T=(d,h)=>new Date(2026,9,d,h).getTime();
A(Math.abs(N.awakeHours(T(13,19),T(14,8))-2)<1e-9,'quiet 20-07: 19->08 is 2 awake h');A(N.awakeHours(T(13,8),T(13,10))===2,'awake');
let s={food:95,play:90,comfort:90,rest:90};N.drain(s,T(13,7)+18e5,T(13,15)+18e5);A(Math.abs(s.food-55)<1e-9,'7:30 95 -> 15:30 55');
s={food:70,play:70,comfort:70,rest:70};N.drain(s,T(13,19)+18e5,T(14,7));A(Math.abs(s.food-67.5)<1e-9,'night: only 19:30-20:00 drains');
s={food:30,play:30,comfort:30,rest:30};N.drain(s,T(13,8),T(20,8));A(s.food===1&&s.rest===1,'floor 1');
A(N.want({food:55,play:80,comfort:80,rest:80})===null,'no bubble at 55');A(N.want({food:55,play:80,comfort:80,rest:80},{},'food')==='food','hysteresis to 60');
A(N.want({food:40,play:40,comfort:80,rest:80},{food:5,play:2})==='play','tie: met longest ago');A(N.want({food:90,play:30,comfort:80,rest:80})==='play','lowest');
A(N.meter({food:12,play:30,comfort:60,rest:90}).food.step===1&&N.meter({food:90,play:1,comfort:1,rest:1}).food.step===4,'meter steps');
A(N.reqCap(10)===3&&N.reqCap(40)===2&&N.reqCap(60)===0&&N.reqGapMs(1)===120e3&&N.reqGapMs(49)===300e3,'request pacing');
let st={},se={};const g=s=>N.bondGrant(st,se,s,'d1');A([1,2,3,4].map(()=>g('feed')).join()==='3,3,3,0','3 snacks a day');
A([1,2,3].map(()=>g('reply')).join()==='3,3,0','2 replies a session');
for(let i=0;i<9;i++)g('game');A(se.bond===30,'30 a session '+se.bond);se={};for(let i=0;i<9;i++)g('visit');g('pet');g('pet');g('pet');g('sit');A(st.bondDay.n<=80,'80 a day');
st={};{const r=[];for(let i=0;i<7;i++){se={};r.push(N.bondGrant(st,se,'game','d4'))}A(r.join()==='8,8,8,8,8,8,0','game +8, 6 a day '+r.join())}
st={bondDay:{d:'d5',n:75,c:{}}};se={};A(N.bondGrant(st,se,'game','d5')===5&&N.bondGrant(st,{},'game','d5')===0,'day cap 80');
se={};A(g('hello')>=0&&N.bondGrant({},{},'nap','d')===0,'no nap bond');
A([10,30,50,80].map(N.awayStage).join()==='0,1,2,3','away stages');
st={};se={};A([1,2,3,4].map((_,i)=>N.bondGrant(st,se,i%2?'feedFav':'feed','d2')).join()==='3,6,3,0','3 snacks a day in total');
st={};se={bond:28};A(N.bondGrant(st,se,'choice','d3',5)===2,'choice counts toward caps');
A(N.led({food:10,play:80,comfort:80,rest:80}).hex==='#FFB070'&&N.led({food:10,play:80,comfort:80,rest:80}).level===.2&&N.led({food:30,play:80,comfort:80,rest:80}).level===.4&&N.led({food:60,play:80,comfort:80,rest:80}).level===.7&&N.led({food:80,play:80,comfort:80,rest:80}).hex==='#FFF6E6','led');
A([24,25,49,50,74,75].map(N.step).join()==='1,2,2,3,3,4','step boundaries');
console.log(`${ok}/${n} needs tests passed`);if(ok<n)process.exit(1)
