// ========== VARIAVEIS GLOBAIS ==========
let carrinho = [];
let produtos = [];
let categorias = [];
let bairros = [];
let horarios = [];
let taxaEntregaSelecionada = 0;
let etapaAtual = 1;
let dadosPedido = { itens: [], total: 0, tipoEntrega: null, endereco: null, formaPagamento: null, troco: null };

const API_URL = 'https://script.google.com/macros/s/AKfycbxUMmAJEGSOlKBf_n950M4RD-op6vRlgcgqj_ktkjY0bct8ASIysE3DSXhXI9mm48esgg/exec';

async function buscarDados() {
   try {
      const resposta = await fetch(API_URL);
      const dados = await resposta.json();
      if (dados.sucesso) {
         produtos   = dados.dados.produtos   || [];
         categorias = dados.dados.categorias || [];
         bairros    = dados.dados.bairros    || [];
         horarios   = dados.dados.horarios   || [];
         if (produtos.length === 0) { alert('Nenhum produto encontrado na planilha.'); return false; }
         return true;
      } else { throw new Error('API retornou sucesso=false'); }
   } catch (erro) { alert('Erro ao carregar produtos. Verifique sua conexao.'); return false; }
}

function renderizarProdutos() {
   const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
   categoriasUnicas.forEach(categoria => {
      const container = document.getElementById('lista-' + categoria);
      if (!container) return;
      container.innerHTML = '';
      produtos.filter(p => p.categoria === categoria).forEach(produto => { container.innerHTML += criarCardProduto(produto); });
   });
   document.querySelectorAll('.carregando').forEach(el => el.remove());
}

function criarCardProduto(produto) {
   const precoP     = produto.preco_p     && produto.preco_p     !== "" ? Number(produto.preco_p)     : null;
   const precoM     = produto.preco_m     && produto.preco_m     !== "" ? Number(produto.preco_m)     : null;
   const precoG     = produto.preco_g     && produto.preco_g     !== "" ? Number(produto.preco_g)     : null;
   const precoUnico = produto.preco_unico && produto.preco_unico !== "" ? Number(produto.preco_unico) : null;
   let textoPreco, textoBotao;
   if (produto.tipo === 'tamanhos') {
      textoPreco = precoP ? 'A partir de R$ ' + precoP.toFixed(2).replace('.', ',') : 'Preco nao disponivel';
      textoBotao = 'Escolher Tamanho';
   } else {
      textoPreco = precoUnico ? 'R$ ' + precoUnico.toFixed(2).replace('.', ',') : 'Preco nao disponivel';
      textoBotao = 'Adicionar ao Carrinho';
   }
   const urlImagem = processarURLImagem(produto.img);
   return '<div class="produto" data-id="' + produto.id + '" data-nome="' + produto.nome + '" data-descricao="' + produto.descricao + '" data-img="' + produto.img + '" data-tipo="' + produto.tipo + '" data-preco-p="' + (precoP||'') + '" data-preco-m="' + (precoM||'') + '" data-preco-g="' + (precoG||'') + '" data-preco-unico="' + (precoUnico||'') + '"><img src="' + urlImagem + '" alt="' + produto.nome + '" onerror="this.src=\'images/placeholder.jpg\'"><h3>' + produto.nome + '</h3><p>' + produto.descricao + '</p><span class="preco">' + textoPreco + '</span><button class="adicionar-carrinho">' + textoBotao + '</button></div>';
}

function processarURLImagem(img) {
   if (!img || img.toString().trim() === '') return 'images/placeholder.jpg';
   img = img.toString().trim();
   let driveId = null;
   const matchFile = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
   if (matchFile) driveId = matchFile[1];
   if (!driveId) { const matchId = img.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (matchId) driveId = matchId[1]; }
   if (!driveId && !img.includes('/') && !img.includes('http') && img.length > 10) driveId = img;
   if (driveId) return 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w400';
   if (img.startsWith('http://') || img.startsWith('https://')) return img;
   return 'images/' + img;
}

// ============================================================
// SISTEMA DE STATUS ABERTO / FECHADO
// ============================================================

/*
 * Remove acentos e converte para lowercase para comparacao tolerante.
 * "Segunda-feira" -> "segunda-feira"
 * "Terca-feira"   -> "terca-feira"
 * Isso permite que o usuario escreva qualquer variacao na planilha.
 */
function normalizarTexto(str) {
   if (!str) return '';
   return str.toString().toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
}

/*
 * Converte "HH:MM" em total de minutos desde meia-noite.
 * "08:00" -> 480  |  "22:30" -> 1350
 * Usar numeros inteiros torna a comparacao simples e sem bugs.
 */
function horaParaMinutos(horaStr) {
   if (!horaStr) return null;
   const str = horaStr.toString().trim();
   if (!str.includes(':')) return null;
   const partes = str.split(':');
   const h = parseInt(partes[0]);
   const m = parseInt(partes[1]);
   if (isNaN(h) || isNaN(m)) return null;
   return h * 60 + m;
}

/*
 * Verifica se a loja esta aberta agora.
 *
 * Fluxo:
 *   1. Pega o dia da semana atual e normaliza (sem acentos, lowercase)
 *   2. Busca no array 'horarios' um registro cujo campo 'dia' normalize igual
 *   3. Converte abertura/fechamento para minutos e compara com hora atual
 *
 * Retorna: { aberto: boolean, texto: string }
 */
function verificarStatusLoja() {
   // Nomes normalizados dos dias (sem acentos, lowercase) para comparacao
   var diasNormalizados = [
      'domingo',
      'segunda-feira',
      'terca-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sabado'
   ];

   var agora = new Date();
   var minutosAgora = agora.getHours() * 60 + agora.getMinutes();
   var diaAtualNorm = diasNormalizados[agora.getDay()];

   // Logs para diagnostico - abra o console do navegador (F12) para ver
   console.log('[Status] horarios da API:', JSON.stringify(horarios));
   console.log('[Status] dia atual normalizado:', diaAtualNorm);
   console.log('[Status] hora atual em minutos:', minutosAgora,
               '= ' + agora.getHours() + ':' + String(agora.getMinutes()).padStart(2, '0'));

   if (!horarios || horarios.length === 0) {
      console.warn('[Status] PROBLEMA: array horarios esta vazio.');
      console.warn('[Status] Causas possiveis:');
      console.warn('[Status]   1. Apps Script nao foi reimplantado como nova versao');
      console.warn('[Status]   2. Aba da planilha nao se chama exatamente "Horarios"');
      console.warn('[Status]   3. A funcao lerAba() nao esta no seu Apps Script');
      return { aberto: false, texto: 'Fechado' };
   }

   // Procura o registro do dia de hoje
   // normalizarTexto() no campo 'dia' da planilha garante tolerancia a:
   //   maiusculas, acentos, espacos, abreviacoes
   var horarioDia = null;
   for (var i = 0; i < horarios.length; i++) {
      var h = horarios[i];
      if (!h.dia) continue;
      var diaNorm = normalizarTexto(h.dia);
      console.log('[Status] comparando "' + diaNorm + '" com "' + diaAtualNorm + '"');
      if (diaNorm === diaAtualNorm) { horarioDia = h; break; }
   }

   if (!horarioDia) {
      console.warn('[Status] PROBLEMA: nenhum registro encontrado para o dia:', diaAtualNorm);
      console.warn('[Status] Valores de "dia" na planilha:',
                   horarios.map(function(h) { return '"' + h.dia + '" -> "' + normalizarTexto(h.dia) + '"'; }));
      return { aberto: false, texto: 'Fechado' };
   }

   console.log('[Status] registro encontrado:', JSON.stringify(horarioDia));

   var minutosAbertura   = horaParaMinutos(horarioDia.abertura);
   var minutosFechamento = horaParaMinutos(horarioDia.fechamento);

   console.log('[Status] abertura:', horarioDia.abertura, '->', minutosAbertura, 'min');
   console.log('[Status] fechamento:', horarioDia.fechamento, '->', minutosFechamento, 'min');

   if (minutosAbertura === null || minutosFechamento === null) {
      console.warn('[Status] PROBLEMA: formato de hora invalido. Use HH:MM (ex: 08:00, 22:30)');
      return { aberto: false, texto: 'Fechado' };
   }

   var estaAberto = minutosAgora >= minutosAbertura && minutosAgora < minutosFechamento;
   console.log('[Status] resultado:', estaAberto ? 'ABERTO' : 'FECHADO');
   return { aberto: estaAberto, texto: estaAberto ? 'Aberto' : 'Fechado' };
}

function renderizarStatusLoja() {
   var statusEl = document.getElementById('statusLoja');
   if (!statusEl) return;
   var status = verificarStatusLoja();
   statusEl.classList.remove('status-aberto', 'status-fechado');
   statusEl.classList.add(status.aberto ? 'status-aberto' : 'status-fechado');
   statusEl.querySelector('.status-texto').textContent = status.texto;
}

// ============================================================
// SELETOR DE BAIRRO E TAXA DE FRETE
// ============================================================

function renderizarBairros() {
   var select = document.getElementById('selectBairro');
   if (!select) return;
   select.innerHTML = '<option value="">Selecione seu bairro...</option>';
   bairros.forEach(function(bairro) {
      var option = document.createElement('option');
      option.value        = Number(bairro.taxa) || 0;
      option.dataset.nome = bairro.nome;
      option.textContent  = bairro.nome + ' — R$ ' + Number(bairro.taxa).toFixed(2).replace('.', ',');
      select.appendChild(option);
   });
}

function atualizarTotalComFrete() {
   var subtotal = 0;
   carrinho.forEach(function(item) { subtotal += item.precoNumero * item.quantidade; });
   var total = subtotal + taxaEntregaSelecionada;

   var totalValorEl = document.getElementById('totalValor');
   if (totalValorEl) totalValorEl.textContent = 'R$ ' + subtotal.toFixed(2).replace('.', ',');

   var resumoSubtotalEl = document.getElementById('resumoSubtotal');
   var resumoFreteEl    = document.getElementById('resumoFrete');
   var resumoTotalEl    = document.getElementById('resumoTotal');

   if (resumoSubtotalEl) resumoSubtotalEl.textContent = 'R$ ' + subtotal.toFixed(2).replace('.', ',');
   if (resumoFreteEl) resumoFreteEl.textContent = taxaEntregaSelecionada > 0
      ? 'R$ ' + taxaEntregaSelecionada.toFixed(2).replace('.', ',') : 'Gratis';
   if (resumoTotalEl) resumoTotalEl.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

// ============================================================
// INICIALIZACAO
// ============================================================
document.addEventListener('DOMContentLoaded', function () {

   var carrinhoPainel     = document.getElementById('carrinhoPainel');
   var carrinhoOverlay    = document.getElementById('carrinhoOverlay');
   var fecharCarrinhoBtn  = document.getElementById('fecharCarrinho');
   var footerCarrinho     = document.querySelector('footer');
   var menuLinks          = document.querySelectorAll('.opcoes a');
   var modalOverlay       = document.getElementById('modalOverlay');
   var modalTamanhos      = document.getElementById('modalTamanhos');
   var modalFechar        = document.getElementById('modalFechar');
   var modalImg           = document.getElementById('modalImg');
   var modalNome          = document.getElementById('modalNome');
   var modalDescricao     = document.getElementById('modalDescricao');
   var modalAdicionar     = document.getElementById('modalAdicionar');
   var etapa1             = document.getElementById('etapa1');
   var etapa2             = document.getElementById('etapa2');
   var tituloCarrinho     = document.getElementById('tituloCarrinho');
   var voltarCarrinhoBtn  = document.getElementById('voltarCarrinho');
   var continuarPedidoBtn = document.getElementById('continuarPedido');
   var finalizarPedidoBtn = document.getElementById('finalizarPedido');
   var radioEntrega       = document.getElementById('radioEntrega');
   var radioRetirada      = document.getElementById('radioRetirada');
   var secaoEndereco      = document.getElementById('secaoEndereco');
   var radioPix           = document.getElementById('radioPix');
   var radioDebito        = document.getElementById('radioDebito');
   var radioCredito       = document.getElementById('radioCredito');
   var radioDinheiro      = document.getElementById('radioDinheiro');
   var secaoTroco         = document.getElementById('secaoTroco');
   var semTrocoCheckbox   = document.getElementById('semTroco');
   var valorTrocoInput    = document.getElementById('valorTroco');
   var selectBairro       = document.getElementById('selectBairro');

   var produtoAtual       = null;
   var tamanhoSelecionado = null;

   function abrirCarrinho() { carrinhoPainel.classList.add('aberto'); carrinhoOverlay.classList.add('ativo'); document.body.style.overflow = 'hidden'; }
   function fecharCarrinho() { carrinhoPainel.classList.remove('aberto'); carrinhoOverlay.classList.remove('ativo'); document.body.style.overflow = ''; }

   function atualizarCarrinho() {
      var carrinhoItens = document.getElementById('carrinhoItens');
      var carrinhoVazio = document.getElementById('carrinhoVazio');
      var totalValor    = document.getElementById('totalValor');
      carrinhoItens.innerHTML = '';
      if (carrinho.length === 0) {
         carrinhoVazio.style.display = 'block';
         totalValor.textContent = 'R$ 0,00';
         footerCarrinho.innerHTML = '<a href="#carrinho">(0) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras"></a>';
         return;
      }
      carrinhoVazio.style.display = 'none';
      var total = 0, quantidadeTotal = 0;
      carrinho.forEach(function(item) {
         total += item.precoNumero * item.quantidade;
         quantidadeTotal += item.quantidade;
         carrinhoItens.innerHTML += '<div class="item-carrinho" data-id="' + item.id + '"><img src="' + item.img + '" alt="' + item.nome + '" onerror="this.src=\'images/placeholder.jpg\'"><div class="item-info"><h4>' + item.nome + '</h4><p class="item-preco">' + item.preco + '</p><div class="item-quantidade"><button class="btn-quantidade" data-acao="diminuir" data-id="' + item.id + '">-</button><span class="quantidade-numero">' + item.quantidade + '</span><button class="btn-quantidade" data-acao="aumentar" data-id="' + item.id + '">+</button></div></div><button class="remover-item" data-id="' + item.id + '">🗑️</button></div>';
      });
      totalValor.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
      footerCarrinho.innerHTML = '<a href="#carrinho">(' + quantidadeTotal + ') Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras"></a>';
   }

   function abrirModalTamanhos(produtoElement) {
      produtoAtual = { id: produtoElement.dataset.id, nome: produtoElement.dataset.nome, descricao: produtoElement.dataset.descricao, img: produtoElement.dataset.img, tipo: produtoElement.dataset.tipo, precoP: parseFloat(produtoElement.dataset.precoP), precoM: parseFloat(produtoElement.dataset.precoM), precoG: parseFloat(produtoElement.dataset.precoG) };
      tamanhoSelecionado = null;
      var urlImagem = processarURLImagem(produtoAtual.img);
      modalImg.src = urlImagem; modalImg.alt = produtoAtual.nome;
      modalImg.onerror = function() { this.src = 'images/placeholder.jpg'; };
      modalNome.textContent = produtoAtual.nome; modalDescricao.textContent = produtoAtual.descricao;
      document.getElementById('precoP').textContent = 'R$ ' + produtoAtual.precoP.toFixed(2).replace('.', ',');
      document.getElementById('precoM').textContent = 'R$ ' + produtoAtual.precoM.toFixed(2).replace('.', ',');
      document.getElementById('precoG').textContent = 'R$ ' + produtoAtual.precoG.toFixed(2).replace('.', ',');
      document.querySelectorAll('.btn-tamanho').forEach(function(btn) { btn.classList.remove('selecionado'); });
      modalOverlay.classList.add('ativo'); modalTamanhos.classList.add('ativo'); document.body.style.overflow = 'hidden';
   }

   function fecharModalTamanhos() { modalOverlay.classList.remove('ativo'); modalTamanhos.classList.remove('ativo'); document.body.style.overflow = ''; produtoAtual = null; tamanhoSelecionado = null; }

   function irParaEtapa2() {
      if (carrinho.length === 0) { alert('Adicione produtos ao carrinho antes de continuar!'); return; }
      etapa1.style.display = 'none'; etapa2.style.display = 'flex';
      tituloCarrinho.textContent = 'Finalizar Pedido'; voltarCarrinhoBtn.style.display = 'flex';
      atualizarResumoPedido(); etapaAtual = 2;
   }

   function voltarParaEtapa1() { etapa2.style.display = 'none'; etapa1.style.display = 'flex'; tituloCarrinho.textContent = 'Meu Carrinho'; voltarCarrinhoBtn.style.display = 'none'; etapaAtual = 1; }

   function atualizarResumoPedido() {
      var resumoItens = document.getElementById('resumoItens');
      if (!resumoItens) return;
      resumoItens.innerHTML = '';
      carrinho.forEach(function(item) {
         var sub = item.precoNumero * item.quantidade;
         resumoItens.innerHTML += '<div class="resumo-item"><span>' + item.quantidade + 'x ' + item.nome + '</span><span>R$ ' + sub.toFixed(2).replace('.', ',') + '</span></div>';
      });
      atualizarTotalComFrete();
   }

   function limparCamposEndereco() { document.getElementById('rua').value = ''; document.getElementById('nomePessoa').value = ''; document.getElementById('referencia').value = ''; }

   function validarFormulario() {
      var valido = true; var mensagensErro = [];
      document.querySelectorAll('.erro').forEach(function(el) { el.classList.remove('erro'); });
      var tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked');
      if (!tipoEntrega) { mensagensErro.push('Selecione como deseja receber o pedido'); valido = false; }
      if (tipoEntrega && tipoEntrega.value === 'entrega') {
         var rua = document.getElementById('rua'); var nomePessoa = document.getElementById('nomePessoa');
         if (!rua.value.trim()) { rua.classList.add('erro'); mensagensErro.push('Preencha o endereco'); valido = false; }
         if (!nomePessoa.value.trim()) { nomePessoa.classList.add('erro'); mensagensErro.push('Preencha o nome de quem vai receber'); valido = false; }
         if (selectBairro && !selectBairro.value) { selectBairro.classList.add('erro'); mensagensErro.push('Selecione o bairro para entrega'); valido = false; }
      }
      var formaPagamento = document.querySelector('input[name="formaPagamento"]:checked');
      if (!formaPagamento) { mensagensErro.push('Selecione a forma de pagamento'); valido = false; }
      if (formaPagamento && formaPagamento.value === 'dinheiro') {
         var valorTroco = document.getElementById('valorTroco'); var semTroco = document.getElementById('semTroco');
         if (!semTroco.checked && !valorTroco.value) { valorTroco.classList.add('erro'); mensagensErro.push('Informe o valor do troco'); valido = false; }
      }
      if (!valido) alert('Por favor, preencha todos os campos obrigatorios:\n\n' + mensagensErro.join('\n'));
      return valido;
   }

   function coletarDadosPedido() {
      var tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
      var endereco = null;
      if (tipoEntrega === 'entrega') {
         var bairroNome = selectBairro ? selectBairro.options[selectBairro.selectedIndex].dataset.nome : '';
         endereco = { rua: document.getElementById('rua').value.trim(), nomePessoa: document.getElementById('nomePessoa').value.trim(), referencia: document.getElementById('referencia').value.trim(), bairro: bairroNome, taxaFrete: taxaEntregaSelecionada };
      }
      var formaPagamento = document.querySelector('input[name="formaPagamento"]:checked').value;
      var troco = null;
      if (formaPagamento === 'dinheiro') { troco = document.getElementById('semTroco').checked ? 'sem troco' : parseFloat(document.getElementById('valorTroco').value); }
      var subtotal = 0; carrinho.forEach(function(item) { subtotal += item.precoNumero * item.quantidade; });
      return { itens: carrinho.slice(), subtotal: subtotal, taxaFrete: taxaEntregaSelecionada, total: subtotal + taxaEntregaSelecionada, tipoEntrega: tipoEntrega, endereco: endereco, formaPagamento: formaPagamento, troco: troco };
   }

   function finalizarPedido() {
      if (!validarFormulario()) return;
      dadosPedido = coletarDadosPedido();
      alert('Pedido registrado com sucesso!\n\nEm breve voce sera redirecionado para o WhatsApp.');
      carrinho = []; taxaEntregaSelecionada = 0;
      atualizarCarrinho(); fecharCarrinho(); voltarParaEtapa1(); limparFormulario();
   }

   function limparFormulario() {
      document.querySelectorAll('input[type="radio"]').forEach(function(r) { r.checked = false; });
      document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(function(i) { i.value = ''; i.classList.remove('erro'); });
      document.getElementById('semTroco').checked = false;
      secaoEndereco.style.display = 'none'; secaoTroco.style.display = 'none';
      if (selectBairro) selectBairro.selectedIndex = 0;
      taxaEntregaSelecionada = 0; atualizarTotalComFrete();
   }

   // Event Listeners
   document.querySelectorAll('.categoria-link').forEach(link => {
   link.addEventListener('click', function(e) {
      e.preventDefault();
      const secaoId = this.getAttribute('href').substring(1);
      document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
      const secao = document.getElementById(secaoId);
      if (secao) secao.style.display = 'block';
      document.querySelectorAll('.categoria-link').forEach(l => l.classList.remove('ativo'));
      this.classList.add('ativo');
   });
});

// Subcategorias - Simplificada
document.querySelectorAll('.subcategoria-card').forEach(link => {
   link.addEventListener('click', function(e) {
      e.preventDefault();
      const produtoId = this.getAttribute('href').substring(1);
      document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
      const secao = document.getElementById(produtoId);
      if (secao) secao.style.display = 'block';
   });
});

   footerCarrinho.addEventListener('click', function(e) { e.preventDefault(); abrirCarrinho(); });
   fecharCarrinhoBtn.addEventListener('click', fecharCarrinho);
   carrinhoOverlay.addEventListener('click', fecharCarrinho);
   modalFechar.addEventListener('click', fecharModalTamanhos);
   modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) fecharModalTamanhos(); });
   modalTamanhos.addEventListener('click', function(e) { e.stopPropagation(); });

   document.querySelectorAll('.btn-tamanho').forEach(function(botao) {
      botao.addEventListener('click', function() {
         document.querySelectorAll('.btn-tamanho').forEach(function(b) { b.classList.remove('selecionado'); });
         this.classList.add('selecionado'); tamanhoSelecionado = this.dataset.tamanho;
      });
   });

   modalAdicionar.addEventListener('click', function() {
      if (!tamanhoSelecionado) { alert('Por favor, escolha um tamanho!'); return; }
      var precoNumero;
      if (tamanhoSelecionado === 'P') precoNumero = produtoAtual.precoP;
      else if (tamanhoSelecionado === 'M') precoNumero = produtoAtual.precoM;
      else precoNumero = produtoAtual.precoG;
      var produto = { id: Date.now(), nome: produtoAtual.nome + ' (' + tamanhoSelecionado + ')', tamanho: tamanhoSelecionado, preco: 'R$ ' + precoNumero.toFixed(2).replace('.', ','), precoNumero: precoNumero, img: processarURLImagem(produtoAtual.img), quantidade: 1 };
      var existente = carrinho.find(function(i) { return i.nome === produto.nome && i.tamanho === produto.tamanho; });
      if (existente) existente.quantidade++;
      else carrinho.push(produto);
      atualizarCarrinho(); fecharModalTamanhos();
   });

   document.body.addEventListener('click', function(e) {
      if (e.target.classList.contains('adicionar-carrinho')) {
         var produtoDiv = e.target.closest('.produto'); if (!produtoDiv) return;
         if (produtoDiv.dataset.tipo === 'tamanhos') { abrirModalTamanhos(produtoDiv); return; }
         var produto = { id: Date.now(), nome: produtoDiv.dataset.nome, preco: 'R$ ' + parseFloat(produtoDiv.dataset.precoUnico).toFixed(2).replace('.', ','), precoNumero: parseFloat(produtoDiv.dataset.precoUnico), img: processarURLImagem(produtoDiv.dataset.img), quantidade: 1 };
         var existente = carrinho.find(function(i) { return i.nome === produto.nome; });
         if (existente) existente.quantidade++;
         else carrinho.push(produto);
         atualizarCarrinho();
         e.target.textContent = 'Adicionado!'; e.target.style.backgroundColor = '#4CAF50';
         setTimeout(function() { e.target.textContent = 'Adicionar ao Carrinho'; e.target.style.backgroundColor = '#ff4747'; }, 1000);
      }
      if (e.target.classList.contains('btn-quantidade')) {
         var id = parseInt(e.target.dataset.id); var item = carrinho.find(function(i) { return i.id === id; }); if (!item) return;
         if (e.target.dataset.acao === 'aumentar') item.quantidade++;
         else { if (item.quantidade > 1) item.quantidade--; else carrinho = carrinho.filter(function(i) { return i.id !== id; }); }
         atualizarCarrinho();
      }
      if (e.target.classList.contains('remover-item')) { carrinho = carrinho.filter(function(i) { return i.id !== parseInt(e.target.dataset.id); }); atualizarCarrinho(); }
   });

   radioEntrega.addEventListener('change', function() { if (radioEntrega.checked) { secaoEndereco.style.display = 'block'; atualizarTotalComFrete(); } });
   radioRetirada.addEventListener('change', function() {
      if (radioRetirada.checked) {
         secaoEndereco.style.display = 'none'; limparCamposEndereco();
         taxaEntregaSelecionada = 0; if (selectBairro) selectBairro.selectedIndex = 0;
         atualizarTotalComFrete();
      }
   });

   if (selectBairro) {
      selectBairro.addEventListener('change', function() {
         taxaEntregaSelecionada = parseFloat(this.value) || 0;
         atualizarTotalComFrete();
      });
   }

   radioDinheiro.addEventListener('change', function() { if (radioDinheiro.checked) secaoTroco.style.display = 'block'; });
   [radioPix, radioDebito, radioCredito].forEach(function(radio) {
      radio.addEventListener('change', function() { if (radio.checked) { secaoTroco.style.display = 'none'; valorTrocoInput.value = ''; semTrocoCheckbox.checked = false; } });
   });
   semTrocoCheckbox.addEventListener('change', function() { valorTrocoInput.disabled = this.checked; if (this.checked) valorTrocoInput.value = ''; });

   continuarPedidoBtn.addEventListener('click', irParaEtapa2);
   voltarCarrinhoBtn.addEventListener('click', voltarParaEtapa1);
   finalizarPedidoBtn.addEventListener('click', finalizarPedido);

   // Carrega dados em segundo plano
   buscarDados().then(function(sucesso) {
      if (!sucesso) return;
      renderizarProdutos();
      renderizarBairros();
      renderizarStatusLoja();
      setInterval(renderizarStatusLoja, 60 * 1000);
   });

});