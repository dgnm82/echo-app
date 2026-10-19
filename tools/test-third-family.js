// Families cleanup: a dummy THIRD family plugs in from a manifest alone (no art: it borrows whimber's sprite + dialogue).
// node tools/test-third-family.js   Also checks families.js is in sync with families/*.json.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),assert=require('assert'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),FD=path.join(ROOT,'families');let n=0,ok=0;
function T(name,fn){n++;try{fn();ok++;console.log('  ok  '+name)}catch(e){console.log('  FAIL '+name+': '+e.message)}}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fam3-'));
const build=(dir,out)=>cp.execFileSync('python3',[path.join(ROOT,'tools/build_families.py')],{env:Object.assign({},process.env,{ECHO_FAMILIES_DIR:dir,ECHO_FAMILIES_OUT:out})});
const load=(file,extra)=>{const ctx={console};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);for(const f of [file].concat(extra||[]))vm.runInContext(fs.readFileSync(f,'utf8'),ctx);return ctx};
T('families.js is in sync with families/*.json (run tools/build_families.py)',()=>{const o=path.join(tmp,'now.js');build(FD,o);assert.equal(fs.readFileSync(o,'utf8'),fs.readFileSync(path.join(ROOT,'families.js'),'utf8'))});
// the dummy: a copy of the whimber manifest with new ids, labels, one animal, and its own words
const fd=path.join(tmp,'families');fs.mkdirSync(fd);for(const f of fs.readdirSync(FD))fs.copyFileSync(path.join(FD,f),path.join(fd,f));
const m=JSON.parse(fs.readFileSync(path.join(FD,'whimber.json'),'utf8'));
Object.assign(m,{id:'testfam',label:'Testling',plural:'Testlings',default_name:'Testy',kind:'testkind',look_base:'owl',look_default:'owl',looks:['owl'],
  animals:{testcat:{label:'Test cat',word:'test cat',member:'testcat',default_name:'Testy',look:'owl'}},animalOrder:['testcat'],icon_fallback:'bird',
  words:{body:['gills','fins'],home:['reef','reefs']}});
m.games=Object.assign({},m.games,{token:'testfam_token',pairNames:Object.assign({},m.games.pairNames,{testfam_token:'Testlings'})});
m.music=Object.assign({},m.music,{goodbye:{testcat:'goodbye_owl'}});
fs.writeFileSync(path.join(fd,'testfam.json'),JSON.stringify(m));
const ord=JSON.parse(fs.readFileSync(path.join(FD,'order.json'),'utf8'));ord.order.push('testfam');fs.writeFileSync(path.join(fd,'order.json'),JSON.stringify(ord));
const out3=path.join(tmp,'families3.js');build(fd,out3);
const W=load(out3,[path.join(ROOT,'config.js'),path.join(ROOT,'memory.js'),path.join(ROOT,'postcards.js')]),F=W.FAMILIES;
T('build: the dummy is appended, the shipping families unchanged',()=>{assert.deepEqual(F.order,ord.order);const W2=load(path.join(ROOT,'families.js'));
  for(const f of W2.FAMILIES.order)assert.equal(JSON.stringify(F[f]),JSON.stringify(W2.FAMILIES[f]),f)});
T('build: the new animal card, kind and id lookups',()=>{assert.equal(F.animals.testcat.family,'testfam');assert.equal(F.animals.testcat.icon,'bird');
  assert.equal(F.animalOrder[F.animalOrder.length-1],'testcat');assert.equal(F.byKind.testkind.id,'testfam');assert.equal(F.idOf('testkind'),'testfam');assert.equal(F.of('fox').id,'slyte')});
T('labels: FAMILIES.list names every family',()=>assert(F.list(', ').endsWith(', a Testling')&&F.list(', ').startsWith('a Howling, a Wingsong'),F.list(', ')));
T('config: CREATURES has the new kind with its manifest profile + talents',()=>{const c=W.CREATURES.testkind;assert(c);assert.equal(c.name,'Testling');assert.deepEqual(c.talents,m.creature.talents)});
T('memory: the deck + token come from the manifest',()=>{const g=W.MemoryEngine.create({species:'testfam',deck:F.testfam.games.memoryDeck,token:F.testfam.games.token,level:'bigkid',seed:3,disguise:true});
  assert.equal(g.cards.length,20);assert(g.cards.some(c=>c.item==='testfam_token'));assert.deepEqual(W.MemoryEngine.DECK.testfam,m.games.memoryDeck)});
T('postcards: the new family label/plural never signs; its Echo name does',()=>{const P=W.Postcards;assert.equal(P.signName('Testlings'),null);assert.equal(P.signName('testling'),null);assert.equal(P.signName('Testy'),'Testy');
  const c=P.build({kind:'testkind',child:'Mia',memories:[]});assert.equal(c.length,6)});
T('runtime extras (music, notes, games, scene, ui) are carried for the new family',()=>{for(const k of ['music','notes','games','scene','ui','profile','coats'])assert(F.testfam[k],k);assert.equal(F.testfam.music.goodbye.testcat,'goodbye_owl')});
// family words: N families from the manifests (the dummy has no dialogue file of its own; it borrows whimber's); its body words are banned elsewhere
const dd=path.join(tmp,'dialogue');fs.mkdirSync(dd);for(const f of fs.readdirSync(path.join(ROOT,'dialogue')))if(f.endsWith('.json'))fs.copyFileSync(path.join(ROOT,'dialogue',f),path.join(dd,f));
const fw=()=>cp.spawnSync('node',[path.join(ROOT,'tools/test-family-words.js'),dd,fd],{encoding:'utf8'});
T('family words: passes with the dummy added',()=>{const r=fw();assert.equal(r.status,0,r.stdout+r.stderr);assert(/slyte, whimber.*testfam/.test(r.stdout),r.stdout)});
T('family words: a Testling body word in a Howling line fails',()=>{const p=path.join(dd,'slyte.json'),d=JSON.parse(fs.readFileSync(p,'utf8'));d.barks.pet[0].text='My fins are warm.';fs.writeFileSync(p,JSON.stringify(d));
  const r=fw();assert.notEqual(r.status,0,'expected a failure');assert(/fins/.test(r.stdout+r.stderr))});
fs.rmSync(tmp,{recursive:true,force:true});
console.log(ok+'/'+n+' third-family tests passed');if(ok!==n)process.exit(1);
