// ========== VARIÁVEIS GLOBAIS ==========
let carrinho = [];
let produtos = [];
let categorias = [];
let etapaAtual = 1;
let dadosPedido = {
   itens: [],
   total: 0,
   tipoEntrega: null,
   endereco: null,
   formaPagamento: null,
   troco: null
};

// ========== CONFIGURAÇÃO DA API ==========
const API_URL = 'https://script.google.com/macros/s/AKfycbxB1NiaxCyZOVzJx2PRgFTbHTOzZuVvDo9Pn6TiDX7v3eDlozt3u-V4-bImCKMkjGSk7w/exec';

// ========== FUNÇÃO: BUSCAR DADOS DA API ==========
async function buscarDados() {
   try {
      const resposta = await fetch(API_URL);
      const dados = await resposta.json();
      
      if (dados.sucesso) {
         produtos = dados.dados.produtos || [];
         categorias = dados.dados.categorias || [];
         
         if (produtos.length === 0) {
            alert('Nenhum produto encontrado na planilha.');
            return false;
         }
         
         return true;
      } else {
         throw new Error('API retornou sucesso=false');
      }
   } catch (erro) {
      alert('Erro ao carregar produtos. Verifique sua conexão.');
      return false;
   }
}

// ========== FUNÇÃO: RENDERIZAR PRODUTOS ==========
function renderizarProdutos() {
   const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
   
   categoriasUnicas.forEach(categoria => {
      const container = document.getElementById(`lista-${categoria}`);
      if (!container) return;
      
      container.innerHTML = '';
      
      const produtosCategoria = produtos.filter(p => p.categoria === categoria);
      
      produtosCategoria.forEach(produto => {
         container.innerHTML += criarCardProduto(produto);
      });
   });

   // Remove qualquer mensagem de "Carregando..." que ainda esteja visível
   document.querySelectorAll('.carregando').forEach(el => el.remove());
}

// ========== FUNÇÃO: CRIAR CARD DO PRODUTO ==========
function criarCardProduto(produto) {
   const precoP = produto.preco_p && produto.preco_p !== "" ? Number(produto.preco_p) : null;
   const precoM = produto.preco_m && produto.preco_m !== "" ? Number(produto.preco_m) : null;
   const precoG = produto.preco_g && produto.preco_g !== "" ? Number(produto.preco_g) : null;
   const precoUnico = produto.preco_unico && produto.preco_unico !== "" ? Number(produto.preco_unico) : null;
   
   let textoPreco, textoBotao;
   
   if (produto.tipo === 'tamanhos') {
      textoPreco = precoP ? `A partir de R$ ${precoP.toFixed(2).replace('.', ',')}` : 'Preço não disponível';
      textoBotao = 'Escolher Tamanho';
   } else {
      textoPreco = precoUnico ? `R$ ${precoUnico.toFixed(2).replace('.', ',')}` : 'Preço não disponível';
      textoBotao = 'Adicionar ao Carrinho';
   }

   const urlImagem = processarURLImagem(produto.img);
   
   return `
      <div class="produto" 
           data-id="${produto.id}"
           data-nome="${produto.nome}"
           data-descricao="${produto.descricao}"
           data-img="${produto.img}"
           data-tipo="${produto.tipo}"
           data-preco-p="${precoP || ''}"
           data-preco-m="${precoM || ''}"
           data-preco-g="${precoG || ''}"
           data-preco-unico="${precoUnico || ''}">
         <img src="${urlImagem}" alt="${produto.nome}" onerror="this.src='images/placeholder.jpg'">
         <h3>${produto.nome}</h3>
         <p>${produto.descricao}</p>
         <span class="preco">${textoPreco}</span>
         <button class="adicionar-carrinho">${textoBotao}</button>
      </div>
   `;
}

// ========== FUNÇÃO: PROCESSAR URL DA IMAGEM ==========
function processarURLImagem(img) {
   if (!img || img.toString().trim() === '') {
      return 'images/placeholder.jpg';
   }

   img = img.toString().trim();

   // Extrai o ID do Google Drive de qualquer formato de link
   let driveId = null;

   // Formato: /file/d/ID/view  ou  /file/d/ID
   const matchFile = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
   if (matchFile) driveId = matchFile[1];

   // Formato: id=ID  (links de uc?export=view&id=ID ou thumbnail?id=ID)
   if (!driveId) {
      const matchId = img.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId) driveId = matchId[1];
   }

   // Formato: somente o ID puro (sem barras, sem http)
   if (!driveId && !img.includes('/') && !img.includes('http') && img.length > 10) {
      driveId = img;
   }

   // Se encontrou um ID do Drive, usa o endpoint de thumbnail (sem bloqueio CORS)
   if (driveId) {
      return `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`;
   }

   // Se é qualquer outra URL válida, retorna como está
   if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
   }

   // Fallback: nome de arquivo local
   return `images/${img}`;
}


// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function () {

   // ========== ELEMENTOS DO DOM ==========
   const carrinhoPainel = document.getElementById('carrinhoPainel');
   const carrinhoOverlay = document.getElementById('carrinhoOverlay');
   const fecharCarrinhoBtn = document.getElementById('fecharCarrinho');
   const footerCarrinho = document.querySelector('footer');
   const menuLinks = document.querySelectorAll('.opcoes a');
   
   const modalOverlay = document.getElementById('modalOverlay');
   const modalTamanhos = document.getElementById('modalTamanhos');
   const modalFechar = document.getElementById('modalFechar');
   const modalImg = document.getElementById('modalImg');
   const modalNome = document.getElementById('modalNome');
   const modalDescricao = document.getElementById('modalDescricao');
   const modalAdicionar = document.getElementById('modalAdicionar');
   
   const etapa1 = document.getElementById('etapa1');
   const etapa2 = document.getElementById('etapa2');
   const tituloCarrinho = document.getElementById('tituloCarrinho');
   const voltarCarrinhoBtn = document.getElementById('voltarCarrinho');
   const continuarPedidoBtn = document.getElementById('continuarPedido');
   const finalizarPedidoBtn = document.getElementById('finalizarPedido');
   
   const radioEntrega = document.getElementById('radioEntrega');
   const radioRetirada = document.getElementById('radioRetirada');
   const secaoEndereco = document.getElementById('secaoEndereco');
   const radioPix = document.getElementById('radioPix');
   const radioDebito = document.getElementById('radioDebito');
   const radioCredito = document.getElementById('radioCredito');
   const radioDinheiro = document.getElementById('radioDinheiro');
   const secaoTroco = document.getElementById('secaoTroco');
   const semTrocoCheckbox = document.getElementById('semTroco');
   const valorTrocoInput = document.getElementById('valorTroco');
   
   let produtoAtual = null;
   let tamanhoSelecionado = null;
   
   // ========== FUNÇÕES DO CARRINHO ==========
   
   function abrirCarrinho() {
      carrinhoPainel.classList.add('aberto');
      carrinhoOverlay.classList.add('ativo');
      document.body.style.overflow = 'hidden';
   }
   
   function fecharCarrinho() {
      carrinhoPainel.classList.remove('aberto');
      carrinhoOverlay.classList.remove('ativo');
      document.body.style.overflow = '';
   }
   
   function atualizarCarrinho() {
      const carrinhoItens = document.getElementById('carrinhoItens');
      const carrinhoVazio = document.getElementById('carrinhoVazio');
      const totalValor = document.getElementById('totalValor');
      
      carrinhoItens.innerHTML = '';
      
      if (carrinho.length === 0) {
         carrinhoVazio.style.display = 'block';
         totalValor.textContent = 'R$ 0,00';
         footerCarrinho.innerHTML = '<a href="#carrinho">(0) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras"></a>';
         return;
      }
      
      carrinhoVazio.style.display = 'none';
      
      let total = 0;
      let quantidadeTotal = 0;
      
      carrinho.forEach(item => {
         total += item.precoNumero * item.quantidade;
         quantidadeTotal += item.quantidade;
         
         carrinhoItens.innerHTML += `
            <div class="item-carrinho" data-id="${item.id}">
               <img src="${item.img}" alt="${item.nome}" onerror="this.src='images/placeholder.jpg'">
               <div class="item-info">
                  <h4>${item.nome}</h4>
                  <p class="item-preco">${item.preco}</p>
                  <div class="item-quantidade">
                     <button class="btn-quantidade" data-acao="diminuir" data-id="${item.id}">−</button>
                     <span class="quantidade-numero">${item.quantidade}</span>
                     <button class="btn-quantidade" data-acao="aumentar" data-id="${item.id}">+</button>
                  </div>
               </div>
               <button class="remover-item" data-id="${item.id}">🗑️</button>
            </div>
         `;
      });
      
      totalValor.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
      footerCarrinho.innerHTML = `<a href="#carrinho">(${quantidadeTotal}) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras"></a>`;
   }
   
   // ========== FUNÇÕES DO MODAL ==========
   
   function abrirModalTamanhos(produtoElement) {
      produtoAtual = {
         id: produtoElement.dataset.id,
         nome: produtoElement.dataset.nome,
         descricao: produtoElement.dataset.descricao,
         img: produtoElement.dataset.img,
         tipo: produtoElement.dataset.tipo,
         precoP: parseFloat(produtoElement.dataset.precoP),
         precoM: parseFloat(produtoElement.dataset.precoM),
         precoG: parseFloat(produtoElement.dataset.precoG)
      };
      
      tamanhoSelecionado = null;
      
      const urlImagem = processarURLImagem(produtoAtual.img);
      
      modalImg.src = urlImagem;
      modalImg.alt = produtoAtual.nome;
      modalImg.onerror = function() { this.src = 'images/placeholder.jpg'; };
      modalNome.textContent = produtoAtual.nome;
      modalDescricao.textContent = produtoAtual.descricao;
      
      document.getElementById('precoP').textContent = `R$ ${produtoAtual.precoP.toFixed(2).replace('.', ',')}`;
      document.getElementById('precoM').textContent = `R$ ${produtoAtual.precoM.toFixed(2).replace('.', ',')}`;
      document.getElementById('precoG').textContent = `R$ ${produtoAtual.precoG.toFixed(2).replace('.', ',')}`;
      
      document.querySelectorAll('.btn-tamanho').forEach(btn => btn.classList.remove('selecionado'));
      
      modalOverlay.classList.add('ativo');
      modalTamanhos.classList.add('ativo');
      document.body.style.overflow = 'hidden';
   }
   
   function fecharModalTamanhos() {
      modalOverlay.classList.remove('ativo');
      modalTamanhos.classList.remove('ativo');
      document.body.style.overflow = '';
      produtoAtual = null;
      tamanhoSelecionado = null;
   }
   
   // ========== FUNÇÕES DO PEDIDO ==========
   
   function irParaEtapa2() {
      if (carrinho.length === 0) {
         alert('Adicione produtos ao carrinho antes de continuar!');
         return;
      }
      etapa1.style.display = 'none';
      etapa2.style.display = 'flex';
      tituloCarrinho.textContent = 'Finalizar Pedido';
      voltarCarrinhoBtn.style.display = 'flex';
      atualizarResumoPedido();
      etapaAtual = 2;
   }
   
   function voltarParaEtapa1() {
      etapa2.style.display = 'none';
      etapa1.style.display = 'flex';
      tituloCarrinho.textContent = 'Meu Carrinho';
      voltarCarrinhoBtn.style.display = 'none';
      etapaAtual = 1;
   }
   
   function atualizarResumoPedido() {
      const resumoItens = document.getElementById('resumoItens');
      const resumoTotal = document.getElementById('resumoTotal');
      
      resumoItens.innerHTML = '';
      let total = 0;
      
      carrinho.forEach(item => {
         const subtotal = item.precoNumero * item.quantidade;
         total += subtotal;
         
         resumoItens.innerHTML += `
            <div class="resumo-item">
               <span>${item.quantidade}x ${item.nome}</span>
               <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
         `;
      });
      
      resumoTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
   }
   
   function limparCamposEndereco() {
      document.getElementById('rua').value = '';
      document.getElementById('nomePessoa').value = '';
      document.getElementById('referencia').value = '';
   }
   
   function validarFormulario() {
      let valido = true;
      let mensagensErro = [];
      
      document.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
      
      const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked');
      if (!tipoEntrega) {
         mensagensErro.push('Selecione como deseja receber o pedido');
         valido = false;
      }
      
      if (tipoEntrega && tipoEntrega.value === 'entrega') {
         const rua = document.getElementById('rua');
         const nomePessoa = document.getElementById('nomePessoa');
         
         if (!rua.value.trim()) {
            rua.classList.add('erro');
            mensagensErro.push('Preencha o endereço');
            valido = false;
         }
         
         if (!nomePessoa.value.trim()) {
            nomePessoa.classList.add('erro');
            mensagensErro.push('Preencha o nome de quem vai receber');
            valido = false;
         }
      }
      
      const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked');
      if (!formaPagamento) {
         mensagensErro.push('Selecione a forma de pagamento');
         valido = false;
      }
      
      if (formaPagamento && formaPagamento.value === 'dinheiro') {
         const valorTroco = document.getElementById('valorTroco');
         const semTroco = document.getElementById('semTroco');
         
         if (!semTroco.checked && !valorTroco.value) {
            valorTroco.classList.add('erro');
            mensagensErro.push('Informe o valor do troco ou marque "Não preciso de troco"');
            valido = false;
         }
      }
      
      if (!valido) {
         alert('Por favor, preencha todos os campos obrigatórios:\n\n' + mensagensErro.join('\n'));
      }
      
      return valido;
   }
   
   function coletarDadosPedido() {
      const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
      
      let endereco = null;
      if (tipoEntrega === 'entrega') {
         endereco = {
            rua: document.getElementById('rua').value.trim(),
            nomePessoa: document.getElementById('nomePessoa').value.trim(),
            referencia: document.getElementById('referencia').value.trim()
         };
      }
      
      const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked').value;
      
      let troco = null;
      if (formaPagamento === 'dinheiro') {
         const semTroco = document.getElementById('semTroco').checked;
         troco = semTroco ? 'sem troco' : parseFloat(document.getElementById('valorTroco').value);
      }
      
      let total = 0;
      carrinho.forEach(item => total += item.precoNumero * item.quantidade);
      
      return {
         itens: [...carrinho],
         total: total,
         tipoEntrega: tipoEntrega,
         endereco: endereco,
         formaPagamento: formaPagamento,
         troco: troco
      };
   }
   
   function finalizarPedido() {
      if (!validarFormulario()) return;
      
      dadosPedido = coletarDadosPedido();
      
      alert('Pedido registrado com sucesso!\n\nEm breve você será redirecionado para o WhatsApp.');
      
      carrinho = [];
      atualizarCarrinho();
      fecharCarrinho();
      voltarParaEtapa1();
      limparFormulario();
   }
   
   function limparFormulario() {
      document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
      document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
         input.value = '';
         input.classList.remove('erro');
      });
      document.getElementById('semTroco').checked = false;
      secaoEndereco.style.display = 'none';
      secaoTroco.style.display = 'none';
   }
   
   // ========== EVENT LISTENERS ==========
   
   // Navegação
   menuLinks.forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         const secaoId = this.getAttribute('href').substring(1);
         document.querySelectorAll('.secoes').forEach(s => s.style.display = 'none');
         const secao = document.getElementById(secaoId);
         if (secao) secao.style.display = 'block';
         menuLinks.forEach(l => l.classList.remove('ativo'));
         this.classList.add('ativo');
      });
   });
   
   document.querySelectorAll('.subcategorias a').forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         const produtoId = this.getAttribute('href').substring(1);
         document.querySelectorAll('.secoes').forEach(s => s.style.display = 'none');
         const secao = document.getElementById(produtoId);
         if (secao) secao.style.display = 'block';
      });
   });
   
   // Carrinho
   footerCarrinho.addEventListener('click', (e) => { e.preventDefault(); abrirCarrinho(); });
   fecharCarrinhoBtn.addEventListener('click', fecharCarrinho);
   carrinhoOverlay.addEventListener('click', fecharCarrinho);
   
   // Modal
   modalFechar.addEventListener('click', fecharModalTamanhos);
   modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) fecharModalTamanhos(); });
   modalTamanhos.addEventListener('click', (e) => e.stopPropagation());
   
   document.querySelectorAll('.btn-tamanho').forEach(botao => {
      botao.addEventListener('click', function() {
         document.querySelectorAll('.btn-tamanho').forEach(b => b.classList.remove('selecionado'));
         this.classList.add('selecionado');
         tamanhoSelecionado = this.dataset.tamanho;
      });
   });
   
   modalAdicionar.addEventListener('click', function() {
      if (!tamanhoSelecionado) {
         alert('Por favor, escolha um tamanho!');
         return;
      }
      
      let precoNumero;
      if (tamanhoSelecionado === 'P') precoNumero = produtoAtual.precoP;
      else if (tamanhoSelecionado === 'M') precoNumero = produtoAtual.precoM;
      else precoNumero = produtoAtual.precoG;
      
      const produto = {
         id: Date.now(),
         nome: `${produtoAtual.nome} (${tamanhoSelecionado})`,
         tamanho: tamanhoSelecionado,
         preco: `R$ ${precoNumero.toFixed(2).replace('.', ',')}`,
         precoNumero: precoNumero,
         img: processarURLImagem(produtoAtual.img),
         quantidade: 1
      };
      
      const existente = carrinho.find(i => i.nome === produto.nome && i.tamanho === produto.tamanho);
      if (existente) existente.quantidade++;
      else carrinho.push(produto);
      
      atualizarCarrinho();
      fecharModalTamanhos();
   });
   
   // Adicionar produtos
   document.body.addEventListener('click', function(e) {
      if (e.target.classList.contains('adicionar-carrinho')) {
         const produtoDiv = e.target.closest('.produto');
         if (!produtoDiv) return;
         
         if (produtoDiv.dataset.tipo === 'tamanhos') {
            abrirModalTamanhos(produtoDiv);
            return;
         }

         const produto = {
            id: Date.now(),
            nome: produtoDiv.dataset.nome,
            preco: `R$ ${parseFloat(produtoDiv.dataset.precoUnico).toFixed(2).replace('.', ',')}`,
            precoNumero: parseFloat(produtoDiv.dataset.precoUnico),
            img: processarURLImagem(produtoDiv.dataset.img),
            quantidade: 1
         };
         
         const existente = carrinho.find(i => i.nome === produto.nome);
         if (existente) existente.quantidade++;
         else carrinho.push(produto);
         
         atualizarCarrinho();
         
         e.target.textContent = 'Adicionado!';
         e.target.style.backgroundColor = '#4CAF50';
         setTimeout(() => {
            e.target.textContent = 'Adicionar ao Carrinho';
            e.target.style.backgroundColor = '#ff4747';
         }, 1000);
      }
      
      // Botões do carrinho
      if (e.target.classList.contains('btn-quantidade')) {
         const id = parseInt(e.target.dataset.id);
         const item = carrinho.find(i => i.id === id);
         if (!item) return;
         
         if (e.target.dataset.acao === 'aumentar') {
            item.quantidade++;
         } else {
            if (item.quantidade > 1) item.quantidade--;
            else carrinho = carrinho.filter(i => i.id !== id);
         }
         atualizarCarrinho();
      }
      
      if (e.target.classList.contains('remover-item')) {
         carrinho = carrinho.filter(i => i.id !== parseInt(e.target.dataset.id));
         atualizarCarrinho();
      }
   });
   
   // Formulário
   radioEntrega.addEventListener('change', () => { if (radioEntrega.checked) secaoEndereco.style.display = 'block'; });
   radioRetirada.addEventListener('change', () => { if (radioRetirada.checked) { secaoEndereco.style.display = 'none'; limparCamposEndereco(); } });
   radioDinheiro.addEventListener('change', () => { if (radioDinheiro.checked) secaoTroco.style.display = 'block'; });
   
   [radioPix, radioDebito, radioCredito].forEach(radio => {
      radio.addEventListener('change', () => {
         if (radio.checked) {
            secaoTroco.style.display = 'none';
            valorTrocoInput.value = '';
            semTrocoCheckbox.checked = false;
         }
      });
   });
   
   semTrocoCheckbox.addEventListener('change', function() {
      valorTrocoInput.disabled = this.checked;
      if (this.checked) valorTrocoInput.value = '';
   });
   
   continuarPedidoBtn.addEventListener('click', irParaEtapa2);
   voltarCarrinhoBtn.addEventListener('click', voltarParaEtapa1);
   finalizarPedidoBtn.addEventListener('click', finalizarPedido);

   // ========== CARREGA PRODUTOS EM SEGUNDO PLANO ==========
   // Os listeners já estão registrados acima, então a navegação
   // funciona imediatamente. Os produtos aparecem assim que a API responder.
   buscarDados().then(sucesso => {
      if (sucesso) renderizarProdutos();
   });

});