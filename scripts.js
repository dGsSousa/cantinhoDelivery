// Aguarda o carregamento completo da página
document.addEventListener('DOMContentLoaded', function() {
   const menuLinks = document.querySelectorAll('.opcoes a');

// Evento para os links do MENU PRINCIPAL (Pizza, Hamburguer, etc)
   menuLinks.forEach(link =>{
      link.addEventListener('click', function(e) {
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













   
});