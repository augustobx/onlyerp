// Real HTTP + real MySQL, exclusively against the restored, isolated QA stack.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
assert.equal(process.env.HUB_MANAGEMENT_TEST_ALLOW_MUTATIONS,'isolated-only');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'hub-test-db');
assert.equal(process.env.PLATFORM_HOST,'onlyerp.fixture.invalid');
const {PrismaClient}=require('/app/node_modules/@prisma/client'),db=new PrismaClient();
const base='http://127.0.0.1:3000',path='/api/integrations/nanolabs/management',key=process.env.HUB_MANAGEMENT_TOKEN,actor='isolated-qa';
let assertions=0;
const check=(value,message)=>{assert(value,message);assertions++;};
async function wire(method,query='',command,overrides={}){
 const body=command?JSON.stringify(command):'',timestamp=String(Date.now()),suffix=query?'?'+query:'';
 const headers={Host:'onlyerp.fixture.invalid',Authorization:'Bearer '+key,'Content-Type':'application/json','X-NanoLabs-Timestamp':timestamp,'X-NanoLabs-Actor':actor,'X-NanoLabs-Signature':crypto.createHmac('sha256',key).update([timestamp,method,path+suffix,actor,body].join('\n')).digest('hex'),...overrides};
 const r=await fetch(base+path+suffix,{method,headers,...(command?{body}:{})});return {status:r.status,wire:await r.json()};
}
async function get(resource,extra={}){const r=await wire('GET',new URLSearchParams({resource,...extra}).toString());assert.equal(r.status,200,JSON.stringify(r.wire));assertions++;return r.wire.data;}
function cmd(operation,input,requestId=crypto.randomUUID()){return {requestId,actor,operation,input};}
async function execute(command,status=200){const r=await wire('POST','',command);assert.equal(r.status,status,JSON.stringify({operation:command.operation,...r.wire}));assertions++;return r.wire;}
async function change(id,operation,extra={}){const t=await get('tenant',{tenantId:id});return execute(cmd(operation,{tenantId:id,version:t.version,...extra}));}
function jwt(user,version=0){const head=Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url'),body=Buffer.from(JSON.stringify({id:user.id,tenantId:user.tenantId,rol:user.rol,nombre:user.nombre,permisos:JSON.parse(user.permisos),sessionVersion:version,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return head+'.'+body+'.'+crypto.createHmac('sha256',process.env.SESSION_SECRET).update(head+'.'+body).digest('base64url');}
async function native(url,user,expected,host='onlyerp.fixture.invalid',version=0){const r=await fetch(base+url,{headers:{Host:host,'X-Forwarded-Host':host,Cookie:'onlyerp_session='+jwt(user,version)},redirect:'manual'});assert.equal(r.status,expected,url+" host="+host+" version="+version);assertions++;return r;}
(async()=>{
 const catalog=await get('catalog');check(catalog.operations.length===11&&catalog.currency==='ARS'&&catalog.adminIdentity==='username','Native catalog');
 const anon=await fetch(base+path,{headers:{Host:'onlyerp.fixture.invalid'}});check(anon.status===401,'Anonymous rejected');
 check((await wire('GET','resource=catalog',undefined,{'X-NanoLabs-Actor':'forged'})).status===401,'Actor signature binding');
 check((await wire('GET','resource=catalog',undefined,{'X-NanoLabs-Timestamp':'1000000000000'})).status===401,'Expired signature');
 const beforeNative=await db.tenant.count();
 const nonce=crypto.randomBytes(4).toString('hex'),start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+30*86400000).toISOString();
 const planData={code:'QA-'+nonce.toUpperCase(),name:'QA isolated plan',description:'Fixture',priceCents:12345,currency:'ARS',active:true,modules:Object.fromEntries(catalog.modules.map(k=>[k,true])),limits:{maxUsers:2,maxLocations:2,maxWarehouses:2}};
 const createdPlan=await execute(cmd('plan.create',planData)),planId=createdPlan.data.planId;
 const create=cmd('tenant.create',{name:'QA isolated tenant',slug:'qa-'+nonce,planId,ownerName:'Owner QA',ownerUsername:'qa-owner',password:'Fixture-only-password-2026',status:'ACTIVE',start,end});
 const created=await execute(create),id=created.data.tenantId;check(/^[1-9][0-9]*$/.test(id),'Native numeric identity');
 const replay=await execute(create);assert.deepEqual(replay.data,created.data);assertions++;
 await execute({...create,input:{...create.input,name:'Altered'}},409);
 check(await db.tenant.count()===beforeNative+1,'Create replay has no duplicate tenant');
 check(await db.suscripcionSaaS.count({where:{tenantId:Number(id)}})===0,'Provisioning never invents payment');
 for(const model of ['empresaConfig','sucursal','deposito','listaPrecio','secuenciaPedido','secuenciaPresupuesto','secuenciaHojaDeRuta'])check(await db[model].count({where:{tenantId:Number(id)}})===1,'Native provisioning '+model);
 let t=await get('tenant',{tenantId:id});check(t.admins[0].username==='qa-owner'&&!JSON.stringify(t).includes('Fixture-only-password'),'Sanitized username detail');
 check(!/password|certificado_crt|clave_privada|SESSION_SECRET/.test(JSON.stringify(t)),'No secret fields');
 const owner=await db.usuario.findFirstOrThrow({where:{tenantId:Number(id),rol:'ADMIN'}});
 await native('/ventas',owner,200);await native('/portal-b2b',owner,200);
 const duplicate=cmd('tenant.update',{tenantId:id,version:t.version,name:'Concurrent replay',slug:t.slug});
 const concurrent=await Promise.all([execute(duplicate),execute(duplicate)]);assert.deepEqual(concurrent[0].data,concurrent[1].data);assertions++;
 check(await db.hubCommand.count({where:{id:duplicate.requestId}})===1,'Single atomic receipt');
 t=await get('tenant',{tenantId:id});const race=await Promise.all(['Race A','Race B'].map(name=>wire('POST','',cmd('tenant.update',{tenantId:id,version:t.version,name,slug:t.slug}))));
 check(race.map(r=>r.status).sort().join(',')==='200,409','Concurrent version conflict');
 await execute(cmd('tenant.update',{tenantId:id,version:t.version,name:'Stale',slug:t.slug}),409);
 await change(id,'tenant.update',{name:'Updated QA',slug:'changed-slug'}).then(()=>assert.fail('Slug change allowed')).catch(e=>{check(/422/.test(e.message),'Historical slug immutable');});
 const second=await execute(cmd('tenant.create',{...create.input,name:'Other QA',slug:'other-'+nonce}));const otherId=second.data.tenantId,otherOwner=await db.usuario.findFirstOrThrow({where:{tenantId:Number(otherId),rol:'ADMIN'}});
 t=await get('tenant',{tenantId:id});await execute(cmd('admin.revoke',{tenantId:id,version:t.version,userId:String(otherOwner.id)}),403);
 await native('/ventas',owner,307,'other-'+nonce+'.fixture.invalid');
 // Every advertised route gate is exercised against real membership data.
 const routes={VENTAS:'/ventas',COMPRAS:'/compras',INVENTARIO:'/inventario',CLIENTES:'/clientes',PROVEEDORES:'/proveedores',LISTAS_PRECIO:'/listas-precio',PRESUPUESTOS:'/presupuestos',CAJA:'/caja',CUENTAS_CORRIENTES:'/cuentas-corrientes',LOGISTICA:'/logistica/hojas-de-ruta',CHEQUES:'/finanzas/cartera-valores',COMISIONES:'/reportes/comisiones',PORTAL_B2B:'/portal-b2b',VENDEDORES_PWA:'/vendedor'};
 for(const [module,url] of Object.entries(routes)){
  await change(id,'module.set',{key:module,enabled:false,limit:null});await native(url,owner,403);
  await change(id,'module.set',{key:module,enabled:null,limit:null});
 }
 await change(id,'module.set',{key:'AFIP',enabled:false,limit:null});
 check((await get('tenant',{tenantId:id})).modules.AFIP.enabled===false,'Fiscal module disabled without editing certificates');
 await change(id,'module.set',{key:'AFIP',enabled:null,limit:null});
 await change(id,'admin.revoke',{userId:String(owner.id)});await native('/ventas',owner,307);await native('/ventas',owner,200,'onlyerp.fixture.invalid',1);
 await change(id,'admin.update',{userId:String(owner.id),name:'Updated Owner',username:'updated-'+nonce,password:'Fixture-new-password-2026'});
 await native('/ventas',owner,307,'onlyerp.fixture.invalid',1);await native('/ventas',owner,200,'onlyerp.fixture.invalid',2);
 const stored=await db.usuario.findUniqueOrThrow({where:{id:owner.id}});check(stored.password.includes(':')&&stored.password!=='Fixture-new-password-2026'&&stored.sessionVersion===2,'Native password hashing and revocation');
 const paymentsBefore=await db.suscripcionSaaS.count({where:{tenantId:Number(id)}});
 await change(id,'subscription.renew',{days:30});check(await db.suscripcionSaaS.count({where:{tenantId:Number(id)}})===paymentsBefore,'Renewal never creates a payment');
 const expiry=(await db.tenant.findUniqueOrThrow({where:{id:Number(id)}})).fecha_vencimiento.toISOString();
 await change(id,'tenant.status',{status:'SUSPENDED'});await native('/ventas',owner,307,'onlyerp.fixture.invalid',2);
 await change(id,'payment.record',{amountCents:12345,currency:'ARS',method:'Transferencia',reference:'QA-HIST-'+nonce,notes:'Isolated',month:1,year:2020,dueAt:'2020-02-10T00:00:00Z',paidAt:'2020-01-15T00:00:00Z',applySubscription:false});
 const suspended=await db.tenant.findUniqueOrThrow({where:{id:Number(id)}});check(suspended.estado==='SUSPENDIDO'&&suspended.fecha_vencimiento.toISOString()===expiry,'Historical payment preserves suspension/expiry');
 t=await get('tenant',{tenantId:id});const duplicatePay=await wire('POST','',cmd('payment.record',{tenantId:id,version:t.version,amountCents:12345,currency:'ARS',method:'Transferencia',reference:'QA-HIST-'+nonce,notes:'',month:1,year:2020,dueAt:'2020-02-10T00:00:00Z',applySubscription:false}));check(duplicatePay.status===409,'Duplicate payment reference rejected');
 await change(id,'subscription.update',{planId,status:'ACTIVE',start,end});await native('/ventas',owner,200,'onlyerp.fixture.invalid',2);
 const p=(await get('plans')).items.find(p=>p.id===planId);await execute(cmd('plan.update',{...planData,code:undefined,planId,version:p.version,name:'QA retired',active:false}));
 await execute(cmd('tenant.create',{...create.input,slug:'inactive-'+nonce}),422);
 await change(id,'subscription.update',{planId,status:'ACTIVE',start,end});
 const audit=await get('audit',{tenantId:id});check(audit.items.length>20&&!/hash|password|Fixture-new-password/.test(JSON.stringify(audit)),'Sanitized durable audit');
 await native('/api/pedidos/pendientes',owner,200,'onlyerp.fixture.invalid',2);
 console.log(JSON.stringify({success:true,assertions,tenantId:id,otherTenantId:otherId,planId,ownerId:String(owner.id),ownerUsername:'updated-'+nonce,ownerPassword:'Fixture-new-password-2026',sessionVersion:2,sourceMutations:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
