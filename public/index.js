const header = document.querySelector('.header');
const toggler = header.querySelector('.header__toggler');

function toggleNav(e) {
  e.preventDefault();

  header.classList.toggle('active');
}

toggler.addEventListener('click', toggleNav);
