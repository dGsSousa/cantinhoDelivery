// ========== VARIÁVEIS GLOBAIS ==========
let carrinho = [];
let produtos = [];
let bairros = [];
let horarios = [];
let taxaEntregaSelecionada = 0;
let termoPesquisaGlobal = '';
let modoPesquisaGlobal = false;

const API_URL = 'https://script.google.com/macros/s/AKfycbxUMmAJEGSOlKBf_n950M4RD-op6vRlgcgqj_ktkjY0bct8ASIysE3DSXhXI9mm48esgg/exec';
const NUMERO_WHATSAPP = '5588981676002';

// ========== FUNÇÕES DE API ==========
async function buscarDados() {
   try {
      const resposta = await fetch(API_URL);
      const dados = await resposta.json();
      if (dados.sucesso) {
         produtos = dados.dados.produtos || [];
         bairros  = dados.dados.bairros  || [];
         horarios = dados.dados.horarios || [];
         if (produtos.length === 0) { alert('Nenhum produto encontrado.'); return false; }
         return true;
      }
      throw new Error('API retornou erro');
   } catch (erro) {
      alert('Erro ao carregar produtos.');
      return false;
   }
}

function renderizarProdutos() {
   const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
   categoriasUnicas.forEach(categoria => {
      const container = document.getElementById('lista-' + categoria);
      if (!container) return;
      container.innerHTML = '';
      produtos.filter(p => p.categoria === categoria).forEach(p => {
         container.innerHTML += criarCardProduto(p);
      });
   });
   document.querySelectorAll('.carregando').forEach(el => el.remove());
}

function obterNomeCompleto(categoria, nome) {
   if (!categoria) return nome;
   const categoriaNorm = categoria.toLowerCase().trim();
   const categoriasExcluidas = ['hamburguer', 'combos', 'combinados', 'bebidas'];
   if (categoriasExcluidas.includes(categoriaNorm)) return nome;
   const prefixos = {
      'pizza-salgada': 'Pizza',
      'pizza-doce':    'Pizza',
      'yakisoba':      'Yakisoba',
      'porcoes':       'Porção',
      'temaki':        'Temaki',
      'makimono':      'Makimono',
      'harumaki':      'Harumaki'
   };
   const prefixo = prefixos[categoriaNorm];
   return prefixo ? prefixo + ' de ' + nome : nome;
}

function criarCardProduto(produto) {
   const precoP     = produto.preco_p     && produto.preco_p     !== '' ? Number(produto.preco_p)     : null;
   const precoM     = produto.preco_m     && produto.preco_m     !== '' ? Number(produto.preco_m)     : null;
   const precoG     = produto.preco_g     && produto.preco_g     !== '' ? Number(produto.preco_g)     : null;
   const precoUnico = produto.preco_unico && produto.preco_unico !== '' ? Number(produto.preco_unico) : null;

   let textoPreco;
   if (produto.tipo === 'tamanhos') {
      textoPreco = precoP ? 'A partir de R$ ' + precoP.toFixed(2).replace('.', ',') : 'Preço indisponível';
   } else {
      textoPreco = precoUnico ? 'R$ ' + precoUnico.toFixed(2).replace('.', ',') : 'Preço indisponível';
   }

   const urlImagem   = processarURLImagem(produto.img);
   const nomeCompleto = obterNomeCompleto(produto.categoria, produto.nome);

   return (
      '<div class="produto"' +
         ' data-id="'         + produto.id          + '"' +
         ' data-categoria="'  + produto.categoria    + '"' +
         ' data-nome="'       + produto.nome         + '"' +
         ' data-descricao="'  + produto.descricao    + '"' +
         ' data-img="'        + produto.img          + '"' +
         ' data-tipo="'       + produto.tipo         + '"' +
         ' data-preco-p="'    + (precoP     || '')   + '"' +
         ' data-preco-m="'    + (precoM     || '')   + '"' +
         ' data-preco-g="'    + (precoG     || '')   + '"' +
         ' data-preco-unico="'+ (precoUnico || '')   + '">' +
         '<div class="produto-topo">' +
            '<img src="' + urlImagem + '" alt="' + nomeCompleto + '" class="produto-img" onerror="this.src=\'images/placeholder.jpg\'">' +
            '<div class="produto-texto">' +
               '<h3>' + nomeCompleto  + '</h3>' +
               '<p>'  + produto.descricao + '</p>' +
            '</div>' +
         '</div>' +
         '<div class="produto-rodape">' +
            '<span class="preco">' + textoPreco + '</span>' +
            '<button class="adicionar-carrinho" aria-label="Adicionar ao carrinho">+</button>' +
         '</div>' +
      '</div>'
   );
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

// ========== ANIMAÇÕES (sem clone no DOM — fim do quadrado preto) ==========

/**
 * Aplica o feedback visual no botão "+" do card ou no botão do modal.
 * Usa apenas CSS animation — sem clone, sem position:fixed dinâmico.
 */
function feedbackBotaoAdicionar(botao) {
   botao.classList.add('btn-feedback');
   botao.addEventListener('animationend', () => {
      botao.classList.remove('btn-feedback');
   }, { once: true });
}

/**
 * Bounce suave no footer para confirmar que o item entrou no carrinho.
 */
function feedbackCarrinho(footerEl) {
   footerEl.classList.add('carrinho-bounce');
   footerEl.addEventListener('animationend', () => {
      footerEl.classList.remove('carrinho-bounce');
   }, { once: true });
}

// ========== STATUS DA LOJA ==========
function normalizarTexto(str) {
   if (!str) return '';
   return str.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

function verificarStatusLoja() {
   const diasNormalizados = ['domingo','segunda-feira','terca-feira','quarta-feira','quinta-feira','sexta-feira','sabado'];
   const agora         = new Date();
   const minutosAgora  = agora.getHours() * 60 + agora.getMinutes();
   const diaAtualNorm  = diasNormalizados[agora.getDay()];
   const horarioDia    = horarios.find(h => normalizarTexto(h.dia) === diaAtualNorm);
   if (!horarioDia) return { aberto: false, texto: 'Fechado' };
   const minutosAbertura   = horaParaMinutos(horarioDia.abertura);
   const minutosFechamento = horaParaMinutos(horarioDia.fechamento);
   if (minutosAbertura === null || minutosFechamento === null) return { aberto: false, texto: 'Fechado' };
   const estaAberto = minutosAgora >= minutosAbertura && minutosAgora < minutosFechamento;
   return { aberto: estaAberto, texto: estaAberto ? 'Aberto' : 'Fechado' };
}

function renderizarStatusLoja() {
   const statusEl = document.getElementById('statusLoja');
   if (!statusEl) return;
   const status = verificarStatusLoja();
   statusEl.classList.remove('status-aberto', 'status-fechado');
   statusEl.classList.add(status.aberto ? 'status-aberto' : 'status-fechado');
   statusEl.querySelector('.status-texto').textContent = status.texto;
}

// ========== PESQUISA GLOBAL ==========
function pesquisarProdutosGlobal(termo) {
   if (!termo || termo.trim() === '') return [];
   const termoNormalizado = normalizarTexto(termo);
   return produtos.filter(produto => {
      return (
         normalizarTexto(produto.nome).includes(termoNormalizado) ||
         normalizarTexto(produto.descricao).includes(termoNormalizado)
      );
   });
}

function renderizarResultadosGlobais() {
   const container     = document.getElementById('listaPesquisaGlobal');
   const termoParagrafo = document.querySelector('.pesquisa-global-termo');
   termoParagrafo.textContent = 'Buscando por: "' + termoPesquisaGlobal + '"';
   const resultados = pesquisarProdutosGlobal(termoPesquisaGlobal);
   container.innerHTML = '';
   if (resultados.length === 0) {
      container.innerHTML =
         '<div class="pesquisa-vazia">' +
            '<div class="pesquisa-vazia-icone">🔍</div>' +
            '<h3>Nenhum item encontrado</h3>' +
            '<p>Não encontramos nenhum produto com "' + termoPesquisaGlobal + '".<br>Tente buscar por outro termo ou explore nossas categorias.</p>' +
         '</div>';
      return;
   }
   resultados.forEach(produto => { container.innerHTML += criarCardProduto(produto); });
}

function alternarVisualizacao() {
   const todasSecoes         = document.querySelectorAll('.secao');
   const secaoPesquisaGlobal = document.getElementById('resultadosPesquisaGlobal');
   const temTexto            = termoPesquisaGlobal.trim().length > 0;

   if (temTexto) {
      modoPesquisaGlobal = true;
      todasSecoes.forEach(secao => { secao.style.display = 'none'; });
      secaoPesquisaGlobal.style.display = 'block';
      renderizarResultadosGlobais();
      window.scrollTo({ top: 0, behavior: 'smooth' });
   } else {
      modoPesquisaGlobal = false;
      secaoPesquisaGlobal.style.display = 'none';
      const linkAtivo = document.querySelector('.categoria-link.ativo');
      if (linkAtivo) {
         const secaoId = linkAtivo.getAttribute('href').substring(1);
         const secao   = document.getElementById(secaoId);
         if (secao) secao.style.display = 'block';
      } else {
         const primeiraSecao = document.getElementById('pizza');
         if (primeiraSecao) primeiraSecao.style.display = 'block';
      }
   }
}

// ========== BAIRROS E FRETE ==========
function renderizarBairros() {
   const select = document.getElementById('selectBairro');
   if (!select) return;
   select.innerHTML = '<option value="">Selecione seu bairro...</option>';
   bairros.forEach(b => {
      const option       = document.createElement('option');
      option.value       = Number(b.taxa) || 0;
      option.dataset.nome = b.nome;
      option.textContent  = b.nome + ' — R$ ' + Number(b.taxa).toFixed(2).replace('.', ',');
      select.appendChild(option);
   });
}

function atualizarTotalComFrete() {
   let subtotal = 0;
   carrinho.forEach(item => { subtotal += item.precoNumero * item.quantidade; });
   const total = subtotal + taxaEntregaSelecionada;

   const totalValorEl    = document.getElementById('totalValor');
   const resumoSubtotalEl = document.getElementById('resumoSubtotal');
   const resumoFreteEl    = document.getElementById('resumoFrete');
   const resumoTotalEl    = document.getElementById('resumoTotal');

   if (totalValorEl)     totalValorEl.textContent     = 'R$ ' + subtotal.toFixed(2).replace('.', ',');
   if (resumoSubtotalEl) resumoSubtotalEl.textContent  = 'R$ ' + subtotal.toFixed(2).replace('.', ',');
   if (resumoFreteEl)    resumoFreteEl.textContent     = taxaEntregaSelecionada > 0 ? 'R$ ' + taxaEntregaSelecionada.toFixed(2).replace('.', ',') : 'Grátis';
   if (resumoTotalEl)    resumoTotalEl.textContent     = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function limparCamposFormulario() {
   document.getElementById('rua').value        = '';
   document.getElementById('nomePessoa').value = '';
   document.getElementById('referencia').value = '';

   // CORREÇÃO: campo que estava sem correspondência no HTML
   const nomeRetirada = document.getElementById('nomeRetirada');
   if (nomeRetirada) nomeRetirada.value = '';

   document.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
   const selectBairro = document.getElementById('selectBairro');
   if (selectBairro) selectBairro.selectedIndex = 0;
   taxaEntregaSelecionada = 0;
}

function gerarMensagemWhatsApp() {
   const sep = '\n- - - - - - - - - - - - - - - - - - - - \n';
   let mensagem = '🔔 *----- NOVO PEDIDO -----* 🔔';
   mensagem += sep;
   mensagem += '📝 *Itens do pedido:*\n';

   let subtotal = 0;
   carrinho.forEach(item => {
      mensagem += `  • ${item.nome} x${item.quantidade} - ${item.preco}\n`;
      subtotal += item.precoNumero * item.quantidade;
   });

   mensagem += `💵 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}`;
   mensagem += sep;

   const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked');
   if (tipoEntrega.value === 'entrega') {
      const bairroSelect = document.getElementById('selectBairro');
      const bairroNome   = bairroSelect.options[bairroSelect.selectedIndex].dataset.nome;
      mensagem += '📍 *ENTREGA*\n';
      mensagem += `  🏘️ Bairro: ${bairroNome}\n`;
      mensagem += `  🚚 Taxa: R$ ${taxaEntregaSelecionada.toFixed(2).replace('.', ',')}\n`;
      mensagem += `  🏠 Endereço: ${document.getElementById('rua').value}\n`;
      mensagem += `  👤 Quem recebe: ${document.getElementById('nomePessoa').value}\n`;
      const referencia = document.getElementById('referencia').value;
      if (referencia) mensagem += `  📌 Referência: ${referencia}`;
   } else {
      mensagem += '🏪 *RETIRADA NO LOCAL*\n';
      mensagem += `   👤 Quem retira: ${document.getElementById('nomeRetirada').value}`;
   }

   mensagem += sep;
   const total = subtotal + taxaEntregaSelecionada;
   mensagem += `💰 *TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}`;
   mensagem += sep;

   const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked');
   const formaTexto = {
      pix:     ' 📲 PIX',
      debito:  ' 💳 Cartão de Débito',
      credito: ' 💳 Cartão de Crédito',
      dinheiro:' 🪙 Dinheiro'
   };
   mensagem += `💵 *Pagamento:* ${formaTexto[formaPagamento.value]}`;

   if (formaPagamento.value === 'dinheiro') {
      const semTroco   = document.getElementById('semTroco').checked;
      const valorTroco = document.getElementById('valorTroco').value;
      mensagem += semTroco
         ? ' (Sem troco)'
         : ` (Troco: R$ ${parseFloat(valorTroco).toFixed(2).replace('.', ',')})`;
   }

   mensagem += sep;
   mensagem += '✅ _Aguardando confirmação do estabelecimento_';
   return mensagem;
}

function enviarParaWhatsApp() {
   const mensagem         = gerarMensagemWhatsApp();
   const mensagemCodificada = encodeURIComponent(mensagem);
   window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensagemCodificada}`, '_blank');
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function () {

   // --- Referências DOM ---
   const carrinhoPainel   = document.getElementById('carrinhoPainel');
   const carrinhoOverlay  = document.getElementById('carrinhoOverlay');
   const footerCarrinho   = document.querySelector('footer');
   const inputPesquisa    = document.getElementById('pesquisar');
   const btnLimparPesquisa= document.getElementById('limparPesquisa');
   const modalOverlay     = document.getElementById('modalOverlay');
   const modalTamanhos    = document.getElementById('modalTamanhos');
   const modalImg         = document.getElementById('modalImg');
   const modalNome        = document.getElementById('modalNome');
   const modalDescricao   = document.getElementById('modalDescricao');
   const selectBairro     = document.getElementById('selectBairro');

   let produtoAtual     = null;
   let tamanhoSelecionado = null;

   // --- Carrinho ---
   function abrirCarrinho() {
      carrinhoPainel.classList.add('aberto');
      carrinhoOverlay.classList.add('ativo');
      document.body.style.overflow = 'hidden';
      atualizarCarrinho();
   }

   function fecharCarrinho() {
      carrinhoPainel.classList.remove('aberto');
      carrinhoOverlay.classList.remove('ativo');
      document.body.style.overflow = '';
      voltarParaEtapa1();
   }

   function atualizarCarrinho() {
      const carrinhoItens = document.getElementById('carrinhoItens');
      const carrinhoVazio = document.getElementById('carrinhoVazio');
      const totalValor    = document.getElementById('totalValor');
      carrinhoItens.innerHTML = '';

      if (carrinho.length === 0) {
         carrinhoVazio.style.display  = 'block';
         totalValor.textContent       = 'R$ 0,00';
         footerCarrinho.innerHTML     = '<a href="#carrinho">(0) Meu Carrinho <img src="icons/carrinho-icon.png"></a>';
         return;
      }

      carrinhoVazio.style.display = 'none';
      let total = 0, quantidadeTotal = 0;

      carrinho.forEach(item => {
         total           += item.precoNumero * item.quantidade;
         quantidadeTotal += item.quantidade;
         carrinhoItens.innerHTML +=
            '<div class="item-carrinho" data-id="' + item.id + '">' +
               '<img src="' + item.img + '" alt="' + item.nome + '" onerror="this.src=\'images/placeholder.jpg\'">' +
               '<div class="item-info">' +
                  '<h4>' + item.nome + '</h4>' +
                  '<p class="item-preco">' + item.preco + '</p>' +
                  '<div class="item-quantidade">' +
                     '<button class="btn-quantidade" data-acao="diminuir" data-id="' + item.id + '">-</button>' +
                     '<span class="quantidade-numero">' + item.quantidade + '</span>' +
                     '<button class="btn-quantidade" data-acao="aumentar" data-id="' + item.id + '">+</button>' +
                  '</div>' +
               '</div>' +
               '<button class="remover-item" data-id="' + item.id + '">🗑️</button>' +
            '</div>';
      });

      totalValor.textContent   = 'R$ ' + total.toFixed(2).replace('.', ',');
      footerCarrinho.innerHTML = '<a href="#carrinho">(' + quantidadeTotal + ') Meu Carrinho <img src="icons/carrinho-icon.png"></a>';
   }

   // --- Modal de Tamanhos ---
   function abrirModalTamanhos(produtoElement) {
      produtoAtual = {
         id:        produtoElement.dataset.id,
         categoria: produtoElement.dataset.categoria,
         nome:      produtoElement.dataset.nome,
         descricao: produtoElement.dataset.descricao,
         img:       produtoElement.dataset.img,
         precoP:    parseFloat(produtoElement.dataset.precoP) || null,
         precoM:    parseFloat(produtoElement.dataset.precoM) || null,
         precoG:    parseFloat(produtoElement.dataset.precoG) || null
      };
      tamanhoSelecionado = null;

      const todosTamanhos = [
         { letra: 'P', preco: produtoAtual.precoP },
         { letra: 'M', preco: produtoAtual.precoM },
         { letra: 'G', preco: produtoAtual.precoG }
      ];
      const tamanhosValidos = todosTamanhos.filter(t => t.preco && !isNaN(t.preco) && t.preco > 0);

      const urlImagem = processarURLImagem(produtoAtual.img);
      modalImg.src    = urlImagem;
      modalImg.alt    = produtoAtual.nome;
      modalImg.onerror = function () { this.src = 'images/placeholder.jpg'; };
      modalNome.textContent      = produtoAtual.nome;
      modalDescricao.textContent = produtoAtual.descricao;

      const containerOpcoes = document.querySelector('.modal-tamanho-opcoes');
      containerOpcoes.innerHTML = '';
      tamanhosValidos.forEach(tamanho => {
         const botao     = document.createElement('button');
         botao.className = 'btn-tamanho';
         botao.dataset.tamanho = tamanho.letra;
         botao.innerHTML =
            '<span class="tamanho-letra">' + tamanho.letra + '</span>' +
            '<span class="tamanho-preco">R$ ' + tamanho.preco.toFixed(2).replace('.', ',') + '</span>';
         botao.addEventListener('click', function () {
            document.querySelectorAll('.btn-tamanho').forEach(b => b.classList.remove('selecionado'));
            this.classList.add('selecionado');
            tamanhoSelecionado = this.dataset.tamanho;
         });
         containerOpcoes.appendChild(botao);
      });

      modalOverlay.classList.add('ativo');
      modalTamanhos.classList.add('ativo');
      document.body.style.overflow = 'hidden';
   }

   function fecharModalTamanhos() {
      modalOverlay.classList.remove('ativo');
      modalTamanhos.classList.remove('ativo');
      document.body.style.overflow = '';
      produtoAtual       = null;
      tamanhoSelecionado = null;
   }

   // --- Etapas do Checkout ---
   function irParaEtapa2() {
      if (carrinho.length === 0) { alert('Adicione produtos ao carrinho!'); return; }
      document.getElementById('etapa1').style.display          = 'none';
      document.getElementById('etapa2').style.display          = 'flex';
      document.getElementById('tituloCarrinho').textContent    = 'Finalizar Pedido';
      document.getElementById('voltarCarrinho').style.display  = 'flex';
      atualizarResumoPedido();
   }

   function voltarParaEtapa1() {
      document.getElementById('etapa2').style.display          = 'none';
      document.getElementById('etapa1').style.display          = 'flex';
      document.getElementById('tituloCarrinho').textContent    = 'Meu Carrinho';
      document.getElementById('voltarCarrinho').style.display  = 'none';
   }

   function atualizarResumoPedido() {
      const resumoItens = document.getElementById('resumoItens');
      if (!resumoItens) return;
      resumoItens.innerHTML = '';
      carrinho.forEach(item => {
         const sub = item.precoNumero * item.quantidade;
         resumoItens.innerHTML +=
            '<div class="resumo-item">' +
               '<span>' + item.quantidade + 'x ' + item.nome + '</span>' +
               '<span>R$ ' + sub.toFixed(2).replace('.', ',') + '</span>' +
            '</div>';
      });
      atualizarTotalComFrete();
   }

   // --- Validação ---
   function validarFormulario() {
      let erros = [];
      document.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));

      const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked');
      if (!tipoEntrega) { alert('Selecione o tipo de entrega'); return false; }

      if (tipoEntrega.value === 'entrega') {
         const rua        = document.getElementById('rua');
         const nomePessoa = document.getElementById('nomePessoa');
         const sb         = document.getElementById('selectBairro');
         if (!rua.value.trim())        { rua.classList.add('erro');        erros.push('Preencha o endereço'); }
         if (!nomePessoa.value.trim()) { nomePessoa.classList.add('erro'); erros.push('Preencha o nome de quem vai receber'); }
         if (sb && !sb.value)          { sb.classList.add('erro');         erros.push('Selecione o bairro'); }
      }

      // CORREÇÃO: validação do campo de retirada agora funciona porque o elemento existe no HTML
      if (tipoEntrega.value === 'retirada') {
         const nomeRetirada = document.getElementById('nomeRetirada');
         if (!nomeRetirada.value.trim()) {
            nomeRetirada.classList.add('erro');
            erros.push('Preencha o nome do responsável pela retirada');
         }
      }

      const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked');
      if (!formaPagamento) {
         erros.push('Selecione a forma de pagamento');
      } else if (formaPagamento.value === 'dinheiro') {
         const valorTroco = document.getElementById('valorTroco');
         const semTroco   = document.getElementById('semTroco');
         if (!semTroco.checked && !valorTroco.value) {
            valorTroco.classList.add('erro');
            erros.push('Informe o valor do troco ou marque "Não preciso de troco"');
         }
      }

      if (erros.length > 0) { alert('Preencha todos os campos:\n\n' + erros.join('\n')); return false; }
      return true;
   }

   function finalizarPedido() {
      if (!validarFormulario()) return;
      enviarParaWhatsApp();

      carrinho = [];
      taxaEntregaSelecionada = 0;
      atualizarCarrinho();
      fecharCarrinho();
      voltarParaEtapa1();

      document.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
      document.getElementById('semTroco').checked          = false;
      document.getElementById('secaoEndereco').style.display = 'none';
      document.getElementById('secaoRetirada').style.display = 'none'; // agora funciona
      document.getElementById('secaoTroco').style.display    = 'none';

      limparCamposFormulario();
      atualizarTotalComFrete();
   }

   // --- Pesquisa ---
   inputPesquisa.addEventListener('input', function (e) {
      termoPesquisaGlobal = e.target.value;
      btnLimparPesquisa.style.display = termoPesquisaGlobal.length > 0 ? 'flex' : 'none';
      alternarVisualizacao();
   });

   btnLimparPesquisa.addEventListener('click', function () {
      inputPesquisa.value     = '';
      termoPesquisaGlobal     = '';
      btnLimparPesquisa.style.display = 'none';
      alternarVisualizacao();
      inputPesquisa.focus();
   });

   // --- Navegação por categorias ---
   document.querySelectorAll('.categoria-link').forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         if (modoPesquisaGlobal) {
            inputPesquisa.value = '';
            termoPesquisaGlobal = '';
            btnLimparPesquisa.style.display = 'none';
         }
         const secaoId = this.getAttribute('href').substring(1);
         document.querySelectorAll('.secao').forEach(s => { s.style.display = 'none'; });
         document.getElementById('resultadosPesquisaGlobal').style.display = 'none';
         const secao = document.getElementById(secaoId);
         if (secao) { secao.style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
         document.querySelectorAll('.categoria-link').forEach(l => { l.classList.remove('ativo'); });
         this.classList.add('ativo');
      });
   });

   document.querySelectorAll('.subcategoria-card').forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         if (modoPesquisaGlobal) {
            inputPesquisa.value = '';
            termoPesquisaGlobal = '';
            btnLimparPesquisa.style.display = 'none';
         }
         const produtoId = this.getAttribute('href').substring(1);
         document.querySelectorAll('.secao').forEach(s => { s.style.display = 'none'; });
         document.getElementById('resultadosPesquisaGlobal').style.display = 'none';
         const secao = document.getElementById(produtoId);
         if (secao) { secao.style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
      });
   });

   // --- Eventos: carrinho e modal ---
   footerCarrinho.addEventListener('click', e => { e.preventDefault(); abrirCarrinho(); });
   document.getElementById('fecharCarrinho').addEventListener('click', fecharCarrinho);
   carrinhoOverlay.addEventListener('click', fecharCarrinho);
   document.getElementById('modalFechar').addEventListener('click', fecharModalTamanhos);
   modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) fecharModalTamanhos(); });
   modalTamanhos.addEventListener('click', e => { e.stopPropagation(); });

   // --- Adicionar ao carrinho via modal de tamanhos ---
   document.getElementById('modalAdicionar').addEventListener('click', function () {
      if (!tamanhoSelecionado) { alert('Escolha um tamanho!'); return; }

      let precoNumero;
      if (tamanhoSelecionado === 'P') precoNumero = produtoAtual.precoP;
      else if (tamanhoSelecionado === 'M') precoNumero = produtoAtual.precoM;
      else precoNumero = produtoAtual.precoG;

      const produto = {
         id:          Date.now(),
         nome:        obterNomeCompleto(produtoAtual.categoria, produtoAtual.nome) + ' (' + tamanhoSelecionado + ')',
         tamanho:     tamanhoSelecionado,
         preco:       'R$ ' + precoNumero.toFixed(2).replace('.', ','),
         precoNumero: precoNumero,
         img:         processarURLImagem(produtoAtual.img),
         quantidade:  1
      };

      const existente = carrinho.find(i => i.nome === produto.nome && i.tamanho === produto.tamanho);
      if (existente) existente.quantidade++;
      else carrinho.push(produto);

      atualizarCarrinho();

      // NOVO: feedback limpo, sem clone no DOM
      feedbackBotaoAdicionar(this);
      feedbackCarrinho(footerCarrinho);

      // Fecha o modal após a animação do botão terminar
      setTimeout(() => fecharModalTamanhos(), 520);
   });

   // --- Delegação: botões "+" do cardápio, quantidade e remover ---
   document.body.addEventListener('click', function (e) {

      // Botão "+" do card
      if (e.target.classList.contains('adicionar-carrinho')) {
         const produtoDiv = e.target.closest('.produto');
         if (!produtoDiv) return;

         if (produtoDiv.dataset.tipo === 'tamanhos') {
            abrirModalTamanhos(produtoDiv);
            return;
         }

         const produto = {
            id:          Date.now(),
            nome:        obterNomeCompleto(produtoDiv.dataset.categoria, produtoDiv.dataset.nome),
            preco:       'R$ ' + parseFloat(produtoDiv.dataset.precoUnico).toFixed(2).replace('.', ','),
            precoNumero: parseFloat(produtoDiv.dataset.precoUnico),
            img:         processarURLImagem(produtoDiv.dataset.img),
            quantidade:  1
         };

         const existente = carrinho.find(i => i.nome === produto.nome);
         if (existente) existente.quantidade++;
         else carrinho.push(produto);

         atualizarCarrinho();

         // NOVO: feedback limpo, sem clone no DOM
         feedbackBotaoAdicionar(e.target);
         feedbackCarrinho(footerCarrinho);
      }

      // Botões de quantidade no painel do carrinho
      if (e.target.classList.contains('btn-quantidade')) {
         const id   = parseInt(e.target.dataset.id);
         const item = carrinho.find(i => i.id === id);
         if (!item) return;
         if (e.target.dataset.acao === 'aumentar') item.quantidade++;
         else {
            if (item.quantidade > 1) item.quantidade--;
            else carrinho = carrinho.filter(i => i.id !== id);
         }
         atualizarCarrinho();
      }

      // Remover item
      if (e.target.classList.contains('remover-item')) {
         carrinho = carrinho.filter(i => i.id !== parseInt(e.target.dataset.id));
         atualizarCarrinho();
      }
   });

   // --- Tipo de entrega: alternar blocos ---
   document.getElementById('radioEntrega').addEventListener('change', function () {
      if (this.checked) {
         document.getElementById('secaoEndereco').style.display = 'block';
         document.getElementById('secaoRetirada').style.display = 'none';
         limparCamposFormulario();
         atualizarTotalComFrete();
      }
   });

   // CORREÇÃO: agora exibe corretamente o bloco de retirada que existia só no JS
   document.getElementById('radioRetirada').addEventListener('change', function () {
      if (this.checked) {
         document.getElementById('secaoEndereco').style.display = 'none';
         document.getElementById('secaoRetirada').style.display = 'block';
         limparCamposFormulario();
         atualizarTotalComFrete();
      }
   });

   if (selectBairro) {
      selectBairro.addEventListener('change', function () {
         taxaEntregaSelecionada = parseFloat(this.value) || 0;
         atualizarTotalComFrete();
      });
   }

   // --- Forma de pagamento ---
   document.getElementById('radioDinheiro').addEventListener('change', function () {
      if (this.checked) document.getElementById('secaoTroco').style.display = 'block';
   });

   ['radioPix', 'radioDebito', 'radioCredito'].forEach(id => {
      document.getElementById(id).addEventListener('change', function () {
         if (this.checked) {
            document.getElementById('secaoTroco').style.display = 'none';
            document.getElementById('valorTroco').value         = '';
            document.getElementById('semTroco').checked         = false;
         }
      });
   });

   document.getElementById('semTroco').addEventListener('change', function () {
      document.getElementById('valorTroco').disabled = this.checked;
      if (this.checked) document.getElementById('valorTroco').value = '';
   });

   // --- Botões de etapa ---
   document.getElementById('continuarPedido').addEventListener('click', irParaEtapa2);
   document.getElementById('voltarCarrinho').addEventListener('click', voltarParaEtapa1);
   document.getElementById('finalizarPedido').addEventListener('click', finalizarPedido);

   // --- Bootstrap ---
   buscarDados().then(sucesso => {
      if (!sucesso) return;
      renderizarProdutos();
      renderizarBairros();
      renderizarStatusLoja();
      setInterval(renderizarStatusLoja, 60000);
   });
});