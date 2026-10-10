/* ===========================================================================
   V2 · Liquid Glass — comportamento das paginas irmas (10/10/2026)

   1) Rolagem da tabela. O V2 deixou o cabecalho em caixa alta com espacamento
      e a celula mais folgada, e com isso a tabela larga passou a empurrar a
      PAGINA de lado (conferido: antes 796px de rolagem, depois 1240 numa tela
      de 1024). Cada tabela ganha um envoltorio que rola sozinho. Como o
      conteudo e redesenhado por innerHTML a cada marcacao, um MutationObserver
      reembrulha as que nascem depois.

   2) Nada abre aba nova. Quando a pagina esta DENTRO do painel (html.emb), um
      link para outro documento da mesma origem sobe para o painel, que o abre
      na gaveta. Fora do painel o link segue normal.
=========================================================================== */
(function(){
  'use strict';

  /* ---------- 1) envoltorio de rolagem ---------- */
  function embrulha(t){
    if(!t || t.parentElement && t.parentElement.classList.contains('v2rol')) return;
    if(t.closest('.v2rol')) return;
    var d=document.createElement('div'); d.className='v2rol';
    t.parentNode.insertBefore(d,t); d.appendChild(t);
  }
  function varre(){ document.querySelectorAll('table').forEach(embrulha); }
  varre();
  if(window.MutationObserver){
    var pend=null;
    new MutationObserver(function(){
      clearTimeout(pend); pend=setTimeout(varre,60);
    }).observe(document.body,{childList:true,subtree:true});
  }

  /* ---------- 2) link vai para a gaveta do painel ---------- */
  if(window.parent===window) return;          /* fora do painel, nada a fazer */
  var FORA=/\.(xlsx|xls|csv|zip|docx?)($|\?)/i;
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]'); if(!a) return;
    var h=a.getAttribute('href')||'';
    if(/^(#|mailto:|tel:|sms:|javascript:)/i.test(h)) return;
    if(a.hasAttribute('download')||FORA.test(h)) return;
    var u; try{ u=new URL(a.href,location.href); }catch(err){ return; }
    if(u.origin!==location.origin) return;
    e.preventDefault();
    var t=(a.textContent||'').trim().replace(/\s+/g,' ').slice(0,70)||'Documento';
    try{
      if(parent.v2Gaveta) parent.v2Gaveta(u.pathname+u.search,t,u.pathname.split('/').pop());
      else location.href=u.href;
    }catch(err){ location.href=u.href; }
  },true);
})();
