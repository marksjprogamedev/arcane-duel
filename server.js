'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const WebSocket=require('ws');
const PORT=Number(process.env.PORT)||3034;
const page=path.join(__dirname,'index.html');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/version'){res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Arcane Duel v27.1.3 local test');return}
 if(pathname==='/'||pathname==='/index.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(page).pipe(res);
 }else{res.writeHead(404);res.end('Not found')}
});
const wss=new WebSocket.Server({server,path:'/ws',maxPayload:350000});
const rooms=new Map();
const send=(ws,msg)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg))};
// Optional local network simulation: one-way delay on gameplay traffic only.
const delayMs=Math.max(0,Math.min(1000,Number(process.env.ARCANE_LATENCY_MS)||0));
const jitterMs=Math.max(0,Math.min(500,Number(process.env.ARCANE_JITTER_MS)||0));
const relay=(ws,msg)=>{const ms=Math.max(0,delayMs+(Math.random()*2-1)*jitterMs);if(ms===0)send(ws,msg);else setTimeout(()=>send(ws,msg),ms)};

function leave(ws){let code=ws.room;if(!code)return;let r=rooms.get(code);if(r){rooms.delete(code);const peer=r.host===ws?r.guest:r.host;send(peer,{type:'peer_left'});if(peer)peer.room=null;}ws.room=null;ws.role=null}
function code(){let s;do{s=Array.from(crypto.randomBytes(6),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[b%24]).join('')}while(rooms.has(s));return s}
wss.on('connection',ws=>{ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return}if(!m||typeof m.type!=='string')return;
 if(m.type==='ping'){send(ws,{type:'pong',stamp:m.stamp});return}
  if(m.type==='create'){leave(ws);let c=code();rooms.set(c,{host:ws,guest:null,ready:new Set(),roundId:0});ws.room=c;ws.role='host';send(ws,{type:'created',code:c});return}
 if(m.type==='join'){let c=String(m.code||'').toUpperCase(),r=rooms.get(c);if(!r||r.guest||r.host===ws){send(ws,{type:'error',message:'Room not found or already full.'});return}leave(ws);r.guest=ws;ws.room=c;ws.role='guest';send(ws,{type:'joined',code:c});r.roundId=1;send(r.host,{type:'start',role:'host',roundId:r.roundId});send(ws,{type:'start',role:'guest',roundId:r.roundId});return}
 if(m.type==='leave'){leave(ws);return}
 let r=rooms.get(ws.room);if(!r||!r.guest)return;
 if(m.type==='rematch_ready'){
  r.ready.add(ws);
  if(r.ready.has(r.host)&&r.ready.has(r.guest)){
    r.ready.clear();r.roundId++;
    send(r.host,{type:'rematch_start',role:'host',roundId:r.roundId});
    send(r.guest,{type:'rematch_start',role:'guest',roundId:r.roundId});
  }
  return;
 }
 if(m.type==='input'&&ws===r.guest){if(typeof m.action!=='string')return;relay(r.host,{type:'input',action:m.action,inputId:Number.isSafeInteger(m.inputId)?m.inputId:null,key:String(m.key||'').slice(0,20),down:!!m.down,x:Number.isFinite(m.x)?Math.max(0,Math.min(800,m.x)):0,y:Number.isFinite(m.y)?Math.max(0,Math.min(600,m.y)):0})}
 if(m.type==='input_ack'&&ws===r.host&&Number.isSafeInteger(m.inputId))relay(r.guest,{type:'input_ack',inputId:m.inputId,accepted:!!m.accepted});
 if(m.type==='death_start'&&ws===r.host)relay(r.guest,{type:'death_start',loser:m.loser,winner:!!m.winner});
 if(m.type==='state'&&ws===r.host&&m.state&&typeof m.state==='object'&&m.state.roundId===r.roundId)relay(r.guest,{type:'state',state:m.state});
 if(m.type==='finished'&&ws===r.host)relay(r.guest,{type:'finished',winner:!!m.winner});
 });ws.on('close',()=>leave(ws));ws.on('error',()=>{});});
server.on('error',err=>{console.error('Unable to start local tester on port '+PORT+': '+err.message);process.exit(1)});
server.listen(PORT,'0.0.0.0',()=>console.log('Arcane Duel v27.1.3 listening on 0.0.0.0:'+PORT));
