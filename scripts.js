// Aguarda o carregamento completo da página
document.addEventListener('DOMContentLoaded', function () {
   const menuLinks = document.querySelectorAll('.opcoes a');

   // Evento para os links do MENU PRINCIPAL (Pizza, Hamburguer, etc)
   menuLinks.forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault(); // Impede o comportamento padrão do link

         const secaoId = this.getAttribute('href').substring(1);
         const tipo = this.getAttribute('data-tipo');

         // Esconde TODAS as seções (subcategorias e produtos)
         document.querySelectorAll('.secoes').forEach(secao => {
            secao.style.display = 'none';
         });

         // Mostra a seção selecionada
         const secaoSelecionada = document.getElementById(secaoId);
         if (secaoSelecionada) {
            secaoSelecionada.style.display = 'block';
         }

         // Atualiza a classe 'ativo' no menu
         menuLinks.forEach(l => l.classList.remove('ativo'));
         this.classList.add('ativo');
      });
   });

   // Evento para os links de SUBCATEGORIAS (Salgadas, Doces)
   const subcategoriaLinks = document.querySelectorAll('.subcategorias a');

   subcategoriaLinks.forEach(link => {
      link.addEventListener('click', function (e) {
         e.preventDefault(); // Impede o comportamento padrão do link

         const produtoId = this.getAttribute('href').substring(1);

         // Esconde TODAS as seções de produtos
         document.querySelectorAll('.secoes').forEach(secao => {
            secao.style.display = 'none';
         });

         // Mostra a seção de produtos correspondente ao link clicado
         const secaoProduto = document.getElementById(produtoId);
         if (secaoProduto) {
            secaoProduto.style.display = 'block';
         }
      });
   });
});

// Aguarda carregamento da página
document.addEventListener('DOMContentLoaded', function() {
   
   // ========== ELEMENTOS DO DOM ==========
   const carrinhoPainel = document.getElementById('carrinhoPainel');
   const carrinhoOverlay = document.getElementById('carrinhoOverlay');
   const fecharCarrinhoBtn = document.getElementById('fecharCarrinho');
   const carrinhoHandle = document.querySelector('.carrinho-handle');
   const footerCarrinho = document.querySelector('footer a'); // Botão "Meu Carrinho" do footer
   
   // ========== ABRIR CARRINHO ==========
   function abrirCarrinho() {
      carrinhoPainel.classList.add('aberto');
      carrinhoOverlay.classList.add('ativo');
      document.body.style.overflow = 'hidden'; // Bloqueia scroll da página
   }
   
   // ========== FECHAR CARRINHO ==========
   function fecharCarrinho() {
      carrinhoPainel.classList.remove('aberto');
      carrinhoOverlay.classList.remove('ativo');
      document.body.style.overflow = ''; // Restaura scroll da página
   }
   
   // ========== EVENTOS DE CLIQUE ==========
   
   // Clicar no botão do footer abre o carrinho
   footerCarrinho.addEventListener('click', function(e) {
      e.preventDefault();
      abrirCarrinho();
   });});