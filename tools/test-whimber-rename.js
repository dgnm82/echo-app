// Whimber rename: the silent save migration w1Names() in game.js (owl -> Hoosa, duck -> Quackaby; ids stay whimber).
// node tools/test-whimber-rename.js   (reads families.js + game.js; no browser)
const fs=require('fs'),assert=require('assert'),R=__dirname+'/..';
const src=fs.readFileSync(R+'/families.js','utf8'),window={FAMILIES:JSON.parse(src.slice(src.indexOf('{'),src.indexOf('};')+1))};
const g=fs.readFileSync(R+'/game.js','utf8'),i=g.indexOf('function w1Names(s)');assert(i>0,'w1Names in game.js');
let j=g.indexOf('\n',g.indexOf("'— '+nn):m)}",i));const w1Names=new Function('window','return ('+g.slice(i,j)+')')(window);
assert(/c6Names\(s\);w1Names\(s\)\}return s\}/.test(g),'load() calls w1Names after c6Names');
let n=0,ok=0;const T=(name,f)=>{n++;try{f();ok++;console.log('  ok ',name)}catch(e){console.log('  FAIL',name,e.message)}};
const owl=()=>({kind:'owl',origin:{family:'whimber',animal:'owl'},g:{name:'Whimber'},vars:{default_name:'Whimber',origin_animal:'owl'},keepsake:{type:'songfeather',name:'Song feather from Whimber'},memories:['We stargazed — Whimber','The day we met']});
T('owl save: name, default, keepsake, memory sign -> Hoosa',()=>{const s=owl();w1Names(s);assert.equal(s.g.name,'Hoosa');assert.equal(s.vars.default_name,'Hoosa');assert.equal(s.keepsake.name,'Song feather from Hoosa');assert.equal(s.memories[0],'We stargazed — Hoosa');assert(!s.nameChanged)});
T('duck save -> Quackaby (from origin.animal)',()=>{const s=owl();s.origin.animal='duck';s.vars.origin_animal='duck';w1Names(s);assert.equal(s.g.name,'Quackaby');assert.equal(s.vars.default_name,'Quackaby');assert.equal(s.keepsake.name,'Song feather from Quackaby')});
T('duck save with only vars.origin_animal -> Quackaby',()=>{const s=owl();delete s.origin.animal;s.vars.origin_animal='duck';w1Names(s);assert.equal(s.g.name,'Quackaby')});
T('typed names and other birds are untouched',()=>{const s=owl();s.g.name='Pip';s.vars.default_name='Trilli';s.origin.animal='bird';w1Names(s);assert.equal(s.g.name,'Pip');assert.equal(s.vars.default_name,'Trilli')});
T('fox saves are untouched',()=>{const s={kind:'fox',origin:{family:'slyte',animal:'fox'},g:{name:'Whimber'},vars:{default_name:'Pipsong'}};w1Names(s);assert.equal(s.g.name,'Whimber')});
T('old save with no origin (legacy owl) -> Hoosa; re-run is a no-op',()=>{const s={kind:'owl',g:{name:'Whimber'},vars:{}};w1Names(s);w1Names(s);assert.equal(s.g.name,'Hoosa')});
T('families.js: owl Hoosa, duck Quackaby, family default Hoosa, no "Whimber"',()=>{assert.equal(window.FAMILIES.animals.owl.default_name,'Hoosa');assert.equal(window.FAMILIES.animals.duck.default_name,'Quackaby');assert.equal(window.FAMILIES.whimber.default_name,'Hoosa');assert(!/Whimber/.test(fs.readFileSync(R+'/families.js','utf8')))});
console.log(ok+'/'+n+' whimber rename tests passed');if(ok!==n)process.exit(1);
