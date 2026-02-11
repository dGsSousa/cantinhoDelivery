// ========== VARIÁVEIS GLOBAIS ==========
let etapaAtual = 1; // Controla em qual etapa está
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

// ========== VARIÁVEIS GLOBAIS ==========
let carrinho = [];
let produtos = []; // Array que armazenará os produtos da API
let categorias = []; // Array que armazenará as categorias

// ========== FUNÇÃO: BUSCAR DADOS DA API ==========
async function buscarDados() {
   try {
      console.log('Buscando dados da API...');
      console.log('URL:', API_URL);
      
      // Faz requisição para a API
      const resposta = await fetch(API_URL);
      
      console.log('Status da resposta:', resposta.status);
      console.log('Resposta OK?', resposta.ok);
      
      // Converte resposta para JSON
      const dados = await resposta.json();
      
      console.log('Dados recebidos:', dados);
      
      // Verifica se deu sucesso
      if (dados.sucesso) {
         produtos = dados.dados.produtos || [];
         categorias = dados.dados.categorias || [];
         
         console.log(`${produtos.length} produtos carregados`);
         console.log('Produtos:', produtos);
         console.log(`${categorias.length} categorias carregadas`);
         
         // Verifica se tem produtos
         if (produtos.length === 0) {
            console.warn('⚠️ ATENÇÃO: Nenhum produto foi retornado pela API!');
            console.warn('Verifique se a planilha tem dados e se a coluna "ativo" está como TRUE');
            alert('Nenhum produto encontrado na planilha. Verifique os dados no Google Sheets.');
            return false;
         }
         
         return true;
      } else {
         throw new Error('API retornou sucesso=false');
      }
      
   } catch (erro) {
      console.error('❌ Erro ao buscar dados:', erro);
      console.error('Detalhes:', erro.message);
      alert('Erro ao carregar produtos. Verifique o console (F12) para mais detalhes.');
      return false;
   }
}

// ========== FUNÇÃO: RENDERIZAR PRODUTOS POR CATEGORIA ==========
function renderizarProdutos() {
   console.log('Renderizando produtos...');
   
   // Para cada categoria única nos produtos
   const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
   
   categoriasUnicas.forEach(categoria => {
      // Busca o container dessa categoria
      const container = document.getElementById(`lista-${categoria}`);
      
      if (!container) {
         console.warn(`Container não encontrado para categoria: ${categoria}`);
         return;
      }
      
      // Limpa mensagem de carregamento
      container.innerHTML = '';
      
      // Filtra produtos dessa categoria
      const produtosCategoria = produtos.filter(p => p.categoria === categoria);
      
      // Para cada produto, cria o HTML
      produtosCategoria.forEach(produto => {
         const produtoHTML = criarCardProduto(produto);
         container.innerHTML += produtoHTML;
      });
   });
   
   console.log('Produtos renderizados!');
}

// ========== FUNÇÃO: CRIAR HTML DO CARD DO PRODUTO ==========
function criarCardProduto(produto) {
   let textoPreco;
   let textoBotao;
   
   // Converte strings vazias em null e garante que sejam números
   const precoP = produto.preco_p && produto.preco_p !== "" ? Number(produto.preco_p) : null;
   const precoM = produto.preco_m && produto.preco_m !== "" ? Number(produto.preco_m) : null;
   const precoG = produto.preco_g && produto.preco_g !== "" ? Number(produto.preco_g) : null;
   const precoUnico = produto.preco_unico && produto.preco_unico !== "" ? Number(produto.preco_unico) : null;
   
   if (produto.tipo === 'tamanhos') {
      // Produto com tamanhos (pizza)
      if (precoP) {
         textoPreco = `A partir de R$ ${precoP.toFixed(2).replace('.', ',')}`;
      } else {
         textoPreco = 'Preço não disponível';
      }
      textoBotao = 'Escolher Tamanho';
   } else {
      // Produto com preço único
      if (precoUnico) {
         textoPreco = `R$ ${precoUnico.toFixed(2).replace('.', ',')}`;
      } else {
         textoPreco = 'Preço não disponível';
      }
      textoBotao = 'Adicionar ao Carrinho';
   }
   
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
         
         <img src="images/${produto.img}" alt="${produto.nome}">
         <h3>${produto.nome}</h3>
         <p>${produto.descricao}</p>
         <span class="preco">${textoPreco}</span>
         <button class="adicionar-carrinho">${textoBotao}</button>
      </div>
   `;
}

// ========== AGUARDA CARREGAMENTO DA PÁGINA ==========
document.addEventListener('DOMContentLoaded', async function () {

   console.log('Página carregada, iniciando script...');
   
   // Busca dados da API
   const dadosCarregados = await buscarDados();

   if (!dadosCarregados) {
      console.error('Falha ao carregar dados');
      return;
   }

   // Renderiza produtos na página
   renderizarProdutos();
   
   // ========== INICIALIZA ELEMENTOS DO DOM ==========
   const carrinhoPainel = document.getElementById('carrinhoPainel');
   const carrinhoOverlay = document.getElementById('carrinhoOverlay');
   const fecharCarrinhoBtn = document.getElementById('fecharCarrinho');
   const footerCarrinho = document.querySelector('footer');
   const menuLinks = document.querySelectorAll('.opcoes a');
   
   // ========== NAVEGAÇÃO DO MENU ==========
   menuLinks.forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         
         const secaoId = this.getAttribute('href').substring(1);
         
         // Esconde todas as seções
         document.querySelectorAll('.secoes').forEach(secao => {
            secao.style.display = 'none';
         });
         
         // Mostra a seção selecionada
         const secaoSelecionada = document.getElementById(secaoId);
         if (secaoSelecionada) {
            secaoSelecionada.style.display = 'block';
         }
         
         // Atualiza menu ativo
         menuLinks.forEach(l => l.classList.remove('ativo'));
         this.classList.add('ativo');
      });
   });
   
   // ========== NAVEGAÇÃO DE SUBCATEGORIAS ==========
   const subcategoriaLinks = document.querySelectorAll('.subcategorias a');
   
   subcategoriaLinks.forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault();
         
         const produtoId = this.getAttribute('href').substring(1);
         
         // Esconde todas as seções
         document.querySelectorAll('.secoes').forEach(secao => {
            secao.style.display = 'none';
         });
         
         // Mostra a seção de produtos
         const secaoProduto = document.getElementById(produtoId);
         if (secaoProduto) {
            secaoProduto.style.display = 'block';
         }
      });
   });
   
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
   
   // ========== EVENTOS DE ABRIR/FECHAR ==========
   
   // Clicar no footer abre o carrinho
   footerCarrinho.addEventListener('click', function(e) {
      e.preventDefault();
      abrirCarrinho();
   });
   
   // Clicar no X fecha o carrinho
   fecharCarrinhoBtn.addEventListener('click', fecharCarrinho);
   
   // Clicar no overlay (fundo escuro) fecha o carrinho
   carrinhoOverlay.addEventListener('click', fecharCarrinho);
   
  // ========== EVENT DELEGATION - ADICIONAR AO CARRINHO ==========
document.body.addEventListener('click', function(e) {
   if (e.target.classList.contains('adicionar-carrinho')) {
      
      const botao = e.target;
      const produtoDiv = botao.closest('.produto');
      
      if (!produtoDiv) {
         console.error('Produto não encontrado');
         return;
      }
      
      const tipo = produtoDiv.dataset.tipo;
      
      // ========== SE TEM TAMANHOS, ABRE MODAL ==========
      if (tipo === 'tamanhos') {
         console.log('🍕 Produto com tamanhos - abrindo modal');
         abrirModalTamanhos(produtoDiv);
         return; // Para aqui
      }
      
      // ========== SE NÃO TEM TAMANHOS, ADICIONA DIRETO ==========
      console.log('🍔 Produto sem tamanhos - adicionando direto');
      
      const nome = produtoDiv.dataset.nome;
      const precoUnico = parseFloat(produtoDiv.dataset.precoUnico);
      const img = produtoDiv.dataset.img;
      
      const produto = {
         id: Date.now(),
         nome: nome,
         preco: `R$ ${precoUnico.toFixed(2).replace('.', ',')}`,
         precoNumero: precoUnico,
         img: `images/${img}`,
         quantidade: 1
      };
      
      const produtoExistente = carrinho.find(item => item.nome === produto.nome);
      
      if (produtoExistente) {
         produtoExistente.quantidade++;
      } else {
         carrinho.push(produto);
      }
      
      atualizarCarrinho();
      
      // Feedback visual
      botao.textContent = 'Adicionado!';
      botao.style.backgroundColor = '#4CAF50';
      
      setTimeout(() => {
         botao.textContent = 'Adicionar ao Carrinho';
         botao.style.backgroundColor = '#ff4747';
      }, 1000);
   }
});
   
   // ========== ATUALIZAR CARRINHO ==========
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
         
         const itemHTML = `
            <div class="item-carrinho" data-id="${item.id}">
               <img src="${item.img}" alt="${item.nome}">
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
         
         carrinhoItens.innerHTML += itemHTML;
      });
      
      totalValor.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
      footerCarrinho.innerHTML = `<a href="#carrinho">(${quantidadeTotal}) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras"></a>`;
}
   
   // ========== BOTÕES DO CARRINHO ==========
   document.body.addEventListener('click', function(e) {
      const target = e.target;
      
      // Aumentar quantidade
      if (target.classList.contains('btn-quantidade') && target.dataset.acao === 'aumentar') {
         const id = parseInt(target.dataset.id);
         const item = carrinho.find(i => i.id === id);
         if (item) {
            item.quantidade++;
            atualizarCarrinho();
         }
      }
      
      // Diminuir quantidade
      if (target.classList.contains('btn-quantidade') && target.dataset.acao === 'diminuir') {
         const id = parseInt(target.dataset.id);
         const item = carrinho.find(i => i.id === id);
         if (item) {
            if (item.quantidade > 1) {
               item.quantidade--;
            } else {
               carrinho = carrinho.filter(i => i.id !== id);
            }
            atualizarCarrinho();
         }
      }
      
      // Remover item
      if (target.classList.contains('remover-item')) {
         const id = parseInt(target.dataset.id);
         carrinho = carrinho.filter(i => i.id !== id);
         atualizarCarrinho();
      }
   });
   
      // Elementos da etapa 2
   const etapa1 = document.getElementById('etapa1');
   const etapa2 = document.getElementById('etapa2');
   const tituloCarrinho = document.getElementById('tituloCarrinho');
   const voltarCarrinhoBtn = document.getElementById('voltarCarrinho');
   const continuarPedidoBtn = document.getElementById('continuarPedido');
   const finalizarPedidoBtn = document.getElementById('finalizarPedido');

   // Elementos do formulário
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

// FUNÇÃO: IR PARA ETAPA 2

function irParaEtapa2() {
   // Verifica se o carrinho não está vazio
   if (carrinho.length === 0) {
      alert('Adicione produtos no carrinho antes de continuar!');
      return;
   }
   // Esconte etapa 1, mostra etapa 2
   etapa1.style.display = 'none';
   etapa2.style.display = 'flex';

   // Muda título
   tituloCarrinho.textContent = 'Finalizar Pedido';

   // Mostra botão voltar
   voltarCarrinhoBtn.style.display = 'flex';

   // Atualizar resumo do pedido
   atualizarResumoPedido();

   // Marca etapa atual
   etapaAtual = 2;
}

// FUNÇÃO: VOLTAR PARA ETAPA 1
function voltarParaEtapa1() {
   // Esconde etapa 2, mostra etapa 1
   etapa2.style.display = 'none';
   etapa1.style.display = 'flex';

   // Muda título
   tituloCarrinho.textContent = 'Meu Carrinho';

   // Esconde botão voltar
   voltarCarrinhoBtn.style.display = 'none';

   // Marca etapa atual
   etapaAtual = 1;
}

// FUNÇÃO: ATUALIZAR RESUMO DO PEDIDO
function atualizarResumoPedido() {
   const resumoItens = document.getElementById('resumoItens');
   const resumoTotal = document.getElementById('resumoTotal');

   // Limpa resumo
   resumoItens.innerHTML = '';

   // Adiciona cada item
   let total = 0;
   carrinho.forEach(item =>{
      const subtotal = item.precoNumero * item.quantidade;
      total += subtotal;

      const itemHTML = `
         <div class="resumo-item">
            <span>${item.quantidade}x ${item.nome}</span>
            <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
         </div>
      `;
      resumoItens.innerHTML += itemHTML;
   });

   // Atualiza total
   resumoTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// MOSTRAR/ESCONDER SEÇÃO DE ENDEREÇO
   radioEntrega.addEventListener('change', function() {
      if (this.checked) {
         secaoEndereco.style.display = 'block';
      }
   });

   radioRetirada.addEventListener('change', function() {
      if (this.checked) {
         secaoEndereco.style.display = 'none';
         // Limpa campos de endereço quando seleciona retirada
         limparCamposEndereco();
      }
   });

   // MOSTRAR/ESCONDER SEÇÃO DE TROCO
   radioDinheiro.addEventListener('change', function() {
      if (this.checked) {
         secaoTroco.style.display = 'block';
      }
}  );

radioPix.addEventListener('change', esconderTroco);
radioDebito.addEventListener('change', esconderTroco);
radioCredito.addEventListener('change', esconderTroco);

function esconderTroco() {
   if (this.checked){
      secaoTroco.style.display = 'none';
      valorTrocoInput.value = '';
      semTrocoCheckbox.checked = false;
   }
}

// ========== CHECKBOX "SEM TROCO" ==========
semTrocoCheckbox.addEventListener('change', function() {
   if (this.checked) {
      valorTrocoInput.value = '';
      valorTrocoInput.disabled = true;
   } else {
      valorTrocoInput.disabled = false;
   }
});

// ========== FUNÇÃO: LIMPAR CAMPOS DE ENDEREÇO ==========
function limparCamposEndereco() {
   document.getElementById('rua').value = '';
   document.getElementById('numero').value = '';
   document.getElementById('bairro').value = '';
   document.getElementById('complemento').value = '';
   document.getElementById('referencia').value = '';
}

// ========== FUNÇÃO: VALIDAR FORMULÁRIO ==========
function validarFormulario() {
   let valido = true;
   let mensagensErro = [];
   
   // Remove erros anteriores
   document.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
   document.querySelectorAll('.mensagem-erro').forEach(el => el.remove());
   
   // 1. Valida tipo de entrega
   const tipoEntregaSelecionado = document.querySelector('input[name="tipoEntrega"]:checked');
   if (!tipoEntregaSelecionado) {
      mensagensErro.push('Selecione como deseja receber o pedido');
      valido = false;
   }
   
   // 2. Se entrega, valida endereço
   if (tipoEntregaSelecionado && tipoEntregaSelecionado.value === 'entrega') {
      const rua = document.getElementById('rua');
      const numero = document.getElementById('numero');
      const bairro = document.getElementById('bairro');
      
      if (!rua.value.trim()) {
         rua.classList.add('erro');
         mensagensErro.push('Preencha o nome da rua');
         valido = false;
      }
      
      if (!numero.value.trim()) {
         numero.classList.add('erro');
         mensagensErro.push('Preencha o número');
         valido = false;
      }
      
      if (!bairro.value.trim()) {
         bairro.classList.add('erro');
         mensagensErro.push('Preencha o bairro');
         valido = false;
      }
   }
   
   // 3. Valida forma de pagamento
   const formaPagamentoSelecionada = document.querySelector('input[name="formaPagamento"]:checked');
   if (!formaPagamentoSelecionada) {
      mensagensErro.push('Selecione a forma de pagamento');
      valido = false;
   }
   
   // 4. Se dinheiro, valida troco
   if (formaPagamentoSelecionada && formaPagamentoSelecionada.value === 'dinheiro') {
      const valorTroco = document.getElementById('valorTroco');
      const semTroco = document.getElementById('semTroco');
      
      if (!semTroco.checked && !valorTroco.value) {
         valorTroco.classList.add('erro');
         mensagensErro.push('Informe o valor do troco ou marque "Não preciso de troco"');
         valido = false;
      }
   }
   
   // Mostra erros se houver
   if (!valido) {
      alert('Por favor, preencha todos os campos obrigatórios:\n\n' + mensagensErro.join('\n'));
   }
   
   return valido;
}

// ========== FUNÇÃO: COLETAR DADOS DO PEDIDO ==========
function coletarDadosPedido() {
   // Tipo de entrega
   const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
   
   // Endereço (se for entrega)
   let endereco = null;
   if (tipoEntrega === 'entrega') {
      endereco = {
         rua: document.getElementById('rua').value.trim(),
         numero: document.getElementById('numero').value.trim(),
         bairro: document.getElementById('bairro').value.trim(),
         complemento: document.getElementById('complemento').value.trim(),
         referencia: document.getElementById('referencia').value.trim()
      };
   }
   
   // Forma de pagamento
   const formaPagamento = document.querySelector('input[name="formaPagamento"]:checked').value;
   
   // Troco (se for dinheiro)
   let troco = null;
   if (formaPagamento === 'dinheiro') {
      const semTroco = document.getElementById('semTroco').checked;
      if (!semTroco) {
         troco = parseFloat(document.getElementById('valorTroco').value);
      } else {
         troco = 'sem troco';
      }
   }
   
   // Calcula total
   let total = 0;
   carrinho.forEach(item => {
      total += item.precoNumero * item.quantidade;
   });
   
   // Monta objeto completo
   dadosPedido = {
      itens: [...carrinho], // Copia array do carrinho
      total: total,
      tipoEntrega: tipoEntrega,
      endereco: endereco,
      formaPagamento: formaPagamento,
      troco: troco
   };
   
   return dadosPedido;
}

// ========== FUNÇÃO: FINALIZAR PEDIDO ==========
function finalizarPedido() {
   // Valida formulário
   if (!validarFormulario()) {
      return; // Não continua se houver erros
   }
   
   // Coleta dados
   const pedido = coletarDadosPedido();
   
   // Por enquanto, apenas mostra no console
   console.log('Pedido finalizado:', pedido);
   
   // Mostra mensagem de sucesso
   alert('Pedido registrado com sucesso!\n\nEm breve você será redirecionado para o WhatsApp.');
   
   // Aqui no futuro você vai gerar a mensagem do WhatsApp
   // gerarMensagemWhatsApp(pedido);
   
   // Limpa carrinho e fecha
   carrinho = [];
   atualizarCarrinho();
   fecharCarrinho();
   voltarParaEtapa1();
   limparFormulario();
}

// ========== FUNÇÃO: LIMPAR FORMULÁRIO ==========
function limparFormulario() {
   // Desmarca radio buttons
   document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
   
   // Limpa inputs
   document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
      input.value = '';
      input.classList.remove('erro');
   });
   
   // Desmarca checkbox
   document.getElementById('semTroco').checked = false;
   
   // Esconde seções condicionais
   secaoEndereco.style.display = 'none';
   secaoTroco.style.display = 'none';
}

// ========== EVENTOS DOS BOTÕES ==========

// Botão "Continuar" (etapa 1 → etapa 2)
continuarPedidoBtn.addEventListener('click', irParaEtapa2);

// Botão "Voltar" (etapa 2 → etapa 1)
voltarCarrinhoBtn.addEventListener('click', voltarParaEtapa1);

// Botão "Finalizar Pedido" (etapa 2)
finalizarPedidoBtn.addEventListener('click', finalizarPedido);

})

// ========== MODAL DE TAMANHOS ==========

// Elementos do modal
const modalOverlay = document.getElementById('modalOverlay');
const modalTamanhos = document.getElementById('modalTamanhos');
const modalFechar = document.getElementById('modalFechar');
const modalImg = document.getElementById('modalImg');
const modalNome = document.getElementById('modalNome');
const modalDescricao = document.getElementById('modalDescricao');
const modalAdicionar = document.getElementById('modalAdicionar');
const botoesTaganho = document.querySelectorAll('.btn-tamanho');

// Variável para armazenar dados do produto atual
let produtoAtual = null;
let tamanhoSelecionado = null;

// ========== FUNÇÃO: ABRIR MODAL DE TAMANHOS ==========
function abrirModalTamanhos(produtoElement) {
   // Coleta dados do produto
   const dados = {
      id: produtoElement.dataset.id,
      nome: produtoElement.dataset.nome,
      descricao: produtoElement.dataset.descricao,
      img: produtoElement.dataset.img,
      tipo: produtoElement.dataset.tipo,
      precoP: parseFloat(produtoElement.dataset.precoP),
      precoM: parseFloat(produtoElement.dataset.precoM),
      precoG: parseFloat(produtoElement.dataset.precoG),
      precoUnico: parseFloat(produtoElement.dataset.precoUnico)
   };
   
   console.log('📦 Abrindo modal para:', dados.nome);
   
   // Armazena produto atual
   produtoAtual = dados;
   tamanhoSelecionado = null;
   
   // Preenche modal
   modalImg.src = `images/${dados.img}`;
   modalImg.alt = dados.nome;
   modalNome.textContent = dados.nome;
   modalDescricao.textContent = dados.descricao;
   
   // Preenche preços
   document.getElementById('precoP').textContent = `R$ ${dados.precoP.toFixed(2).replace('.', ',')}`;
   document.getElementById('precoM').textContent = `R$ ${dados.precoM.toFixed(2).replace('.', ',')}`;
   document.getElementById('precoG').textContent = `R$ ${dados.precoG.toFixed(2).replace('.', ',')}`;
   
   // Remove seleção anterior
   document.querySelectorAll('.btn-tamanho').forEach(btn => {
      btn.classList.remove('selecionado');
   });
   
   // Abre modal
   modalOverlay.classList.add('ativo');
   modalTamanhos.classList.add('ativo');
   document.body.style.overflow = 'hidden';
}

// ========== FUNÇÃO: FECHAR MODAL ==========
function fecharModalTamanhos() {
   modalOverlay.classList.remove('ativo');
   modalTamanhos.classList.remove('ativo');
   document.body.style.overflow = '';
   produtoAtual = null;
   tamanhoSelecionado = null;
}

// ========== EVENTOS DO MODAL ==========

// Fechar ao clicar no X
modalFechar.addEventListener('click', fecharModalTamanhos);

// Fechar ao clicar no overlay
modalOverlay.addEventListener('click', fecharModalTamanhos);

// Impedir fechar ao clicar dentro do modal
modalTamanhos.addEventListener('click', function(e) {
   e.stopPropagation();
});

// ========== SELECIONAR TAMANHO ==========
document.querySelectorAll('.btn-tamanho').forEach(botao => {
   botao.addEventListener('click', function() {
      // Remove seleção anterior
      document.querySelectorAll('.btn-tamanho').forEach(btn => {
         btn.classList.remove('selecionado');
      });
      
      // Adiciona seleção no botão clicado
      this.classList.add('selecionado');
      
      // Armazena tamanho selecionado
      tamanhoSelecionado = this.dataset.tamanho;
      
      console.log('✅ Tamanho selecionado:', tamanhoSelecionado);
   });
});

// ========== ADICIONAR AO CARRINHO DO MODAL ==========
modalAdicionar.addEventListener('click', function() {
   // Valida se tamanho foi selecionado
   if (!tamanhoSelecionado) {
      alert('Por favor, escolha um tamanho!');
      
      // Pisca os botões para chamar atenção
      document.querySelectorAll('.btn-tamanho').forEach(btn => {
         btn.style.animation = 'shake 0.5s';
         setTimeout(() => btn.style.animation = '', 500);
      });
      
      return;
   }
   
   // Pega preço do tamanho selecionado
   let preco, precoNumero;
   
   if (tamanhoSelecionado === 'P') {
      precoNumero = produtoAtual.precoP;
   } else if (tamanhoSelecionado === 'M') {
      precoNumero = produtoAtual.precoM;
   } else {
      precoNumero = produtoAtual.precoG;
   }
   
   preco = `R$ ${precoNumero.toFixed(2).replace('.', ',')}`;
   
   // Cria objeto do produto
   const produto = {
      id: Date.now(),
      nome: `${produtoAtual.nome} (${tamanhoSelecionado})`,
      tamanho: tamanhoSelecionado,
      preco: preco,
      precoNumero: precoNumero,
      img: `images/${produtoAtual.img}`,
      quantidade: 1
   };
   
   console.log('➕ Adicionando ao carrinho:', produto);
   
   // Verifica se já existe no carrinho (mesmo nome E mesmo tamanho)
   const produtoExistente = carrinho.find(item => 
      item.nome === produto.nome && item.tamanho === produto.tamanho
   );
   
   if (produtoExistente) {
      produtoExistente.quantidade++;
      console.log('✅ Quantidade aumentada:', produtoExistente);
   } else {
      carrinho.push(produto);
      console.log('✅ Produto adicionado ao carrinho');
   }
   
   // Atualiza carrinho
   atualizarCarrinho();
   
   // Fecha modal
   fecharModalTamanhos();
   
   // Feedback visual (opcional)
   const footer = document.querySelector('footer');
   footer.style.animation = 'pulse 0.5s';
   setTimeout(() => footer.style.animation = '', 500);
});