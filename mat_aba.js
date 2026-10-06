/* 06/10/2026 — sub-aba "Materiais (checklist)" na Página da obra.
   Mostra o checklist de materiais a pedir da obra (mat.js, carregado só quando a aba abre) e deixa o
   engenheiro registrar a conferência item a item: pedido feito / já tem na obra / não precisa + observação.
   As marcações vão para o servidor comum do painel (ENTREGAS_SRV) como {tipo:'mat', k:'obra|item', campo, v, por, quando}
   — as mesmas chaves da página materiais.html, então o que se marca num lugar aparece no outro. */
(function(){
  'use strict';
  var SRV=window.ENTREGAS_SRV||{}, QCH='fdeEntregasQuem', FCH='matFila', M={}, SY='', CARREGANDO=false, F={sit:'falta'};
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
  function agora(){ var d=new Date(); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
  function ts(q){ var m=/^(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{2}):(\d{2})/.exec(q||''); return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]).getTime():0; }
  function csv(t){ var L=[], r=[], f='', q=false; for(var i=0;i<t.length;i++){ var ch=t[i];
    if(q){ if(ch==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=ch; }
    else if(ch==='"') q=true; else if(ch===','){ r.push(f); f=''; }
    else if(ch==='\n'){ r.push(f); L.push(r); r=[]; f=''; } else if(ch!=='\r') f+=ch; }
    if(f||r.length){ r.push(f); L.push(r); } return L; }
  function fila(){ try{ return JSON.parse(ls(FCH)||'[]'); }catch(e){ return []; } }
  function aplica(m){ var id=m.k+'|'+m.campo, a=M[id]; if(!a||ts(m.quando)>=ts(a.quando)) M[id]={v:m.v,por:m.por||'',quando:m.quando||''}; }
  function val(k,c){ var a=M[k+'|'+c]; return a?a.v:null; }
  function quem(k){ var b=null; ['st','obs'].forEach(function(c){ var a=M[k+'|'+c]; if(a&&(!b||ts(a.quando)>ts(b.quando))) b=a; }); return b; }
  function cod(){ return (typeof atualCod!=='undefined'&&atualCod!=null)?atualCod:(+(document.getElementById('selObra')||{}).value||null); }
  function puxa(){
    if(!SRV.ler){ fila().forEach(aplica); SY='local'; render(); return; }
    fetch(SRV.ler+'&t='+Date.now()).then(function(r){ return r.text(); }).then(function(t){
      if(/<html/i.test(t.slice(0,200))) throw new Error('privada');
      M={}; csv(t).slice(1).forEach(function(l){ var m; try{ m=JSON.parse(l[1]); }catch(e){ return; } if(m&&m.tipo==='mat'&&m.k&&m.campo) aplica(m); });
      var l=fila().filter(function(x){ var a=M[x.k+'|'+x.campo]; return !(a&&a.quando===x.quando&&String(a.v)===String(x.v)); });
      ls(FCH,JSON.stringify(l)); l.forEach(aplica); SY=l.length?'pend':'ok'; render();
    }).catch(function(){ fila().forEach(aplica); SY='erro'; render(); });
  }
  function envia(){ var l=fila(); if(!SRV.form||!l.length) return;
    Promise.all(l.map(function(m){ var fd=new FormData(); fd.append(SRV.entry,JSON.stringify(m)); return fetch(SRV.form,{method:'POST',mode:'no-cors',body:fd}); }))
      .then(function(){ setTimeout(puxa,2500); }).catch(function(){ SY='erro'; render(); }); }
  function marca(k,campo,v){
    var q=(ls(QCH)||'').trim(); if(!q){ var e=document.getElementById('matQuem'); if(e){ e.focus(); e.style.borderColor='#b3261e'; e.placeholder='digite seu nome para registrar'; } return false; }
    var m={tipo:'mat',k:k,campo:campo,v:v,por:q,quando:agora()};
    var l=fila().filter(function(x){ return !(x.k===k&&x.campo===campo); }); l.push(m); ls(FCH,JSON.stringify(l));
    aplica(m); SY='pend'; clearTimeout(marca._t); marca._t=setTimeout(envia,700); return true; }

  function css(){ if(document.getElementById('matCSS')) return; var st=document.createElement('style'); st.id='matCSS';
    st.textContent='#matBox .mBar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:0 0 10px}'+
    '#matBox label{display:flex;flex-direction:column;font-size:12px;opacity:.85;gap:3px}'+
    '#matBox select,#matBox input{font:inherit;padding:6px 8px;border-radius:8px;border:1px solid rgba(0,0,0,.18);background:var(--surface-1,#fff);color:inherit}'+
    '#matBox .mKpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 12px}'+
    '#matBox .mKpi div{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:8px 10px}#matBox .mKpi b{display:block;font-size:20px}#matBox .mKpi span{font-size:11.5px;opacity:.75}'+
    '#matBox table{width:100%;border-collapse:collapse}#matBox th{font-size:11px;text-transform:uppercase;text-align:left;opacity:.7;padding:6px;border-bottom:1px solid rgba(0,0,0,.15)}'+
    '#matBox td{padding:6px;border-bottom:1px solid rgba(0,0,0,.08);vertical-align:middle;font-size:13px}'+
    '#matBox tr.g td{font-size:11px;font-weight:700;text-transform:uppercase;opacity:.8;background:rgba(31,78,121,.08)}'+
    '#matBox tr.feito td{opacity:.55}#matBox .mini{font-size:11px;opacity:.7}'+
    '#matBox .pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11.5px;font-weight:600;white-space:nowrap}'+
    '#matBox .p-bad{background:#fbe0de;color:#b3261e}#matBox .p-warn{background:#fdf4de;color:#9a6b00}#matBox .p-na{background:rgba(0,0,0,.07)}'+
    '#matBox .tg{border:1px solid rgba(0,0,0,.2);background:transparent;color:inherit;border-radius:8px;padding:4px 8px;font:inherit;font-size:12px;cursor:pointer;margin:1px}'+
    '#matBox .tg.on{background:#e6f4ec;border-color:#2f6f4e;color:#2f6f4e;font-weight:650}#matBox .tg.on.no{background:#fbe0de;border-color:#b3261e;color:#b3261e}'+
    '#matBox input.obs{width:100%;min-width:120px}'+
    '@media (max-width:760px){#matBox thead{display:none}#matBox table,#matBox tbody,#matBox tr,#matBox td{display:block;width:100%}#matBox tr{border-bottom:2px solid rgba(0,0,0,.12);padding:4px 0}#matBox td{border:0}}';
    document.head.appendChild(st); }
  function caixa(){ var b=document.getElementById('matBox'); if(b) return b;
    b=document.createElement('div'); b.id='matBox'; b.hidden=true; b.className='bloco';
    var ref=document.getElementById('orcBox'); if(ref&&ref.parentNode) ref.parentNode.insertBefore(b,ref.nextSibling); else document.body.appendChild(b);
    b.addEventListener('click',function(e){ var t=e.target.closest('.tg'); if(!t) return; var k=t.dataset.k, v=t.dataset.v, cur=val(k,'st'); if(marca(k,'st',cur===v?'':v)) render(); });
    b.addEventListener('change',function(e){ var t=e.target;
      if(t.id==='matSit'){ F.sit=t.value; render(); }
      else if(t.classList.contains('obs')){ if(t.value!==(val(t.dataset.k,'obs')||'')&&marca(t.dataset.k,'obs',t.value)) render(); } });
    b.addEventListener('input',function(e){ if(e.target.id==='matQuem'){ ls(QCH,e.target.value); e.target.style.borderColor=''; } });
    return b; }
  function botao(){ var nav=document.getElementById('obraNav'); if(!nav||nav.querySelector('[data-p="Mat"]')) return;
    var bt=document.createElement('button'); bt.className='tab'; bt.setAttribute('role','tab'); bt.setAttribute('aria-selected','false');
    bt.dataset.p='Mat'; bt.textContent='Materiais (checklist)'; bt.title='checklist de materiais a pedir — registrar a conferência';
    var ref=nav.querySelector('[data-p="Compras"]'); if(ref&&ref.nextSibling) nav.insertBefore(bt,ref.nextSibling); else nav.appendChild(bt); }
  var ST={falta:['Falta pedir','p-bad'],verificar:['Verificar','p-warn'],parcial:['Já pedido em parte','p-na'],comprado:['Já comprado/solicitado','p-na'],executado:['Serviço já medido','p-na']};
  function render(){
    var b=caixa(); if(b.hidden) return;
    if(!window.MAT){ b.innerHTML='<p>Carregando checklist…</p>'; carregar(); return; }
    var c=cod(), o=(window.MAT.obras||[]).filter(function(x){ return String(x.c)===String(c); })[0];
    var y=window.scrollY, foco=document.activeElement&&document.activeElement.id;
    if(!o){ b.innerHTML='<header><h2>Checklist de materiais</h2></header><p>Esta obra não tem checklist de materiais (obra sem orçamento detalhado, fora de execução ou com recebimento provisório já pedido).</p>'; return; }
    var L=o.itens.filter(function(i){ var s=val(c+'|'+i.id,'st'); return F.sit==='todos'?true:F.sit==='marc'?!!s:(i.st==='falta'&&!s); });
    var nF=0,nP=0,nT=0,nN=0; o.itens.forEach(function(i){ if(i.st!=='falta') return; var s=val(c+'|'+i.id,'st'); if(!s) nF++; else if(s==='ped') nP++; else if(s==='tem') nT++; else nN++; });
    var tot=nF+nP+nT+nN, h='<header><h2>Checklist de materiais — conferência do engenheiro</h2><p>'+
      (o.fonte==='levantamento'?'Levantamento manual da obra, revalidado contra o medido (portal) e o Sienge.':'Insumos das composições do orçamento × pedidos e solicitações do Sienge × medido no portal.')+
      ' “Falta pedir” = sem pedido nem solicitação e com o serviço ainda não medido. Cada marcação fica salva para todos (mesma lista da página Materiais a pedir).</p></header>';
    h+='<div class="mKpi"><div><b style="color:#b3261e">'+nF+'</b><span>falta conferir / pedir</span></div><div><b style="color:#2f6f4e">'+nP+'</b><span>pedido feito</span></div>'+
       '<div><b>'+nT+'</b><span>já tem na obra</span></div><div><b>'+nN+'</b><span>não precisa</span></div><div><b>'+(tot?Math.round((tot-nF)/tot*100):100)+'%</b><span>conferido</span></div></div>';
    h+='<div class="mBar"><label>Mostrar<select id="matSit"><option value="falta"'+(F.sit==='falta'?' selected':'')+'>só o que falta conferir</option><option value="marc"'+(F.sit==='marc'?' selected':'')+'>já conferidos</option><option value="todos"'+(F.sit==='todos'?' selected':'')+'>todos os itens</option></select></label>'+
       '<label>Registrando como<input id="matQuem" value="'+esc(ls(QCH)||'')+'" placeholder="seu nome"></label>'+
       '<a class="tab" href="materiais.html?obra='+c+'" target="_blank" rel="noopener" style="text-decoration:none">abrir em tela cheia ↗</a>'+
       '<span class="mini">'+(SY==='ok'?'✓ salvo para todos':SY==='erro'?'⚠ sem conexão — marcações guardadas neste aparelho':SY==='pend'?'salvando…':'')+'</span></div>';
    if(L.length){
      h+='<table><thead><tr><th>Material</th><th>Qtd. prevista</th><th>Serviço do orçamento</th><th>Situação</th><th>Conferência</th><th>Observação</th></tr></thead><tbody>'; var g='';
      L.forEach(function(i){ var k=c+'|'+i.id, s=val(k,'st'), q=quem(k), sp=ST[i.st]||['','p-na'];
        if(i.g!==g){ g=i.g; h+='<tr class="g"><td colspan="6">'+esc(g)+'</td></tr>'; }
        h+='<tr class="'+(s?'feito':'')+'"><td><b>'+esc(i.m)+'</b></td><td style="white-space:nowrap">'+esc(i.q)+' '+esc(i.un)+'</td><td class="mini">'+esc(i.sv)+'</td>'+
          '<td><span class="pill '+sp[1]+'">'+sp[0]+'</span>'+(i.det?'<div class="mini">'+esc(i.det)+'</div>':'')+'</td>'+
          '<td><button class="tg'+(s==='ped'?' on':'')+'" data-k="'+k+'" data-v="ped">'+(s==='ped'?'✓ pedido feito':'pedido feito')+'</button>'+
          '<button class="tg'+(s==='tem'?' on':'')+'" data-k="'+k+'" data-v="tem">'+(s==='tem'?'✓ já tem na obra':'já tem na obra')+'</button>'+
          '<button class="tg'+(s==='nao'?' on no':'')+'" data-k="'+k+'" data-v="nao">'+(s==='nao'?'✕ não precisa':'não precisa')+'</button></td>'+
          '<td><input class="obs" id="mo_'+k.replace(/[|.]/g,'_')+'" data-k="'+k+'" value="'+esc(val(k,'obs')||'')+'" placeholder="ex.: pedir p/ 15/10">'+(q?'<div class="mini">'+esc(q.por)+' · '+esc(q.quando)+'</div>':'')+'</td></tr>'; });
      h+='</tbody></table>';
    } else h+='<p class="mini">Nenhum item com esse filtro.</p>';
    h+='<p class="mini" style="margin-top:8px">Dados do checklist de '+esc(window.MAT.ger)+'.</p>';
    b.innerHTML=h;
    if(foco){ var f=document.getElementById(foco); if(f){ f.focus(); if(f.setSelectionRange&&f.value) f.setSelectionRange(f.value.length,f.value.length); } }
    window.scrollTo(0,y);
  }
  function carregar(){ if(CARREGANDO) return; CARREGANDO=true; var s=document.createElement('script'); s.src='mat.js?v='+Date.now();
    s.onload=function(){ render(); puxa(); envia(); }; s.onerror=function(){ var b=caixa(); b.innerHTML='<p>Não foi possível carregar o checklist (mat.js).</p>'; }; document.body.appendChild(s); }

  css();
  var _abrir=window.abrirObra;
  if(typeof _abrir==='function') window.abrirObra=function(c){ botao(); var r=_abrir.apply(this,arguments); try{ render(); }catch(e){} return r; };
  var _painel=window.obraPainel;
  window.obraPainel=function(p){
    botao(); var b=caixa();
    if(p==='Mat'){
      var nav=document.getElementById('obraNav');
      nav.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-selected', x.dataset.p==='Mat'?'true':'false'); });
      var pg=document.getElementById('paginaObra'); if(pg) pg.classList.add('oculto');
      var irmaos=b.parentNode?b.parentNode.children:[];
      for(var i=0;i<irmaos.length;i++){ var e=irmaos[i]; if(e!==b&&/Box$/.test(e.id||'')) e.hidden=true; }
      ['orcBox','fechBox','siengeBox','loBox','segBox','raoBox','fiscBox'].forEach(function(id){ var e=document.getElementById(id); if(e) e.hidden=true; });
      b.hidden=false; render(); if(window.MAT) puxa();
      return;
    }
    b.hidden=true;
    if(typeof _painel==='function') return _painel.apply(this,arguments);
  };
  botao();
  setInterval(function(){ var nav=document.getElementById('obraNav'); if(!nav) return; botao(); var bt=nav.querySelector('[data-p="Mat"]'); if(bt){ bt.disabled=false; bt.style.opacity=''; } },800);
  try{ if(window.SEC&&window.SEC.push) window.SEC.push({p:'Mat',rot:'Materiais (checklist)'}); }catch(e){}
})();
