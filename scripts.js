// ========== VARIÁVEIS GLOBAIS ==========
let carrinho = [];
let carrinhoPainel, carrinhoOverlay, carrinhoHandle;
let startY = 0;
let currentY = 0;
let isDragging = false;
let painelHeight = 0;

// ========== AGUARDA CARREGAMENTO DA PÁGINA ==========
document.addEventListener('DOMContentLoaded', function () {
   
   // ========== INICIALIZA ELEMENTOS DO DOM ==========
   carrinhoPainel = document.getElementById('carrinhoPainel');
   carrinhoOverlay = document.getElementById('carrinhoOverlay');
   const fecharCarrinhoBtn = document.getElementById('fecharCarrinho');
   carrinhoHandle = document.querySelector('.carrinho-handle');
   const footerCarrinho = document.querySelector('footer a');
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
   footerCarrinho.addEventListener('click', function(e) {
      e.preventDefault();
      abrirCarrinho();
   });
   
   fecharCarrinhoBtn.addEventListener('click', fecharCarrinho);
   carrinhoOverlay.addEventListener('click', fecharCarrinho);
   
   // ========== ARRASTO - INICIAR ==========
   carrinhoHandle.addEventListener('mousedown', iniciarArrasto);
   carrinhoHandle.addEventListener('touchstart', iniciarArrasto);
   
   function iniciarArrasto(e) {
      isDragging = true;
      painelHeight = carrinhoPainel.offsetHeight;
      
      if (e.type === 'mousedown') {
         startY = e.clientY;
      } else {
         startY = e.touches[0].clientY;
      }
      
      carrinhoPainel.style.transition = 'none';
   }
   
   // ========== ARRASTO - DURANTE ==========
   document.addEventListener('mousemove', arrastar);
   document.addEventListener('touchmove', arrastar);
   
   function arrastar(e) {
      if (!isDragging) return;
      
      if (e.type === 'mousemove') {
         currentY = e.clientY;
      } else {
         currentY = e.touches[0].clientY;
      }
      
      const diffY = currentY - startY;
      
      if (diffY > 0) {
         carrinhoPainel.style.transform = `translateY(${diffY}px)`;
      }
   }
   
   // ========== ARRASTO - FINALIZAR ==========
   document.addEventListener('mouseup', finalizarArrasto);
   document.addEventListener('touchend', finalizarArrasto);
   
   function finalizarArrasto() {
      if (!isDragging) return;
      isDragging = false;
      
      carrinhoPainel.style.transition = 'transform 0.3s ease';
      
      const diffY = currentY - startY;
      
      if (diffY > painelHeight * 0.3) {
         fecharCarrinho();
      } else {
         carrinhoPainel.style.transform = 'translateY(0)';
      }
   }
   
   // ========== EVENT DELEGATION - ADICIONAR AO CARRINHO ==========
   document.body.addEventListener('click', function(e) {
      if (e.target.classList.contains('adicionar-carrinho')) {
         console.log('Botão clicado!'); // Debug
         
         const botao = e.target;
         const produtoDiv = botao.closest('.produto');
         
         if (!produtoDiv) {
            console.error('Produto não encontrado');
            return;
         }
         
         const nome = produtoDiv.querySelector('h3').textContent;
         const preco = produtoDiv.querySelector('.preco').textContent;
         const img = produtoDiv.querySelector('img').src;
         
         console.log('Produto:', nome, preco); // Debug
         
         const produto = {
            id: Date.now(),
            nome: nome,
            preco: preco,
            precoNumero: parseFloat(preco.replace('R$', '').replace(',', '.').trim()),
            img: img,
            quantidade: 1
         };
         
         const produtoExistente = carrinho.find(item => item.nome === produto.nome);
         
         if (produtoExistente) {
            produtoExistente.quantidade++;
         } else {
            carrinho.push(produto);
         }
         
         console.log('Carrinho:', carrinho); // Debug
         
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
         footerCarrinho.innerHTML = '(0) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras">';
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
      footerCarrinho.innerHTML = `(${quantidadeTotal}) Meu Carrinho <img src="icons/carrinho-icon.png" alt="icone de um carrinho de compras">`;
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
   
});